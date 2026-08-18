import crypto from 'crypto';
import NextAuth, { type Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Nodemailer from 'next-auth/providers/nodemailer';
import Credentials from 'next-auth/providers/credentials';
import nodemailer from 'nodemailer';
import { headers } from 'next/headers';
import { db } from '@/lib/db/client';
import { generateOtp, verifyOtp } from './otp';
import { checkAndIncrement } from './rate-limit';

const PLACEHOLDER_SECRETS = new Set([
  'change-me-in-production',
  'placeholder',
  'changeme',
  'secret',
  '',
]);

function assertAuthMode(): void {
  const raw = process.env.AUTH_MODE?.trim();
  if (raw && raw !== 'none' && raw !== 'email_otp') {
    throw new Error(
      `[boot] AUTH_MODE="${raw}" is invalid. Use "none" (local, no auth) or "email_otp" (self-hosted, OTP login).`
    );
  }

  // Fail closed: an unset AUTH_MODE historically defaulted to "none" (auth
  // disabled), which is fine on a personal machine but dangerous on an
  // internet-facing server. The build phase is exempt — `next build` runs
  // before deploy-time env vars exist.
  if (
    !raw &&
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    throw new Error(
      '[boot] AUTH_MODE is not set. In production, set AUTH_MODE="email_otp" (self-hosted) ' +
        'or "none" (local machine only). Refusing to start with auth disabled by default.'
    );
  }
}

function assertNextauthSecret(): void {
  // Only required for self-hosted OTP mode. In local mode (AUTH_MODE=none) auth
  // is fully disabled and the secret is never read.
  if (process.env.AUTH_MODE !== 'email_otp') return;

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret || PLACEHOLDER_SECRETS.has(secret.trim().toLowerCase())) {
    throw new Error(
      '[boot] NEXTAUTH_SECRET is missing or placeholder. Generate one with:\n' +
        '  openssl rand -base64 32\n' +
        'Then set it in your .env (or docker-compose env).'
    );
  }
  if (secret.length < 32) {
    console.warn(
      `[boot] NEXTAUTH_SECRET is shorter than 32 chars (got ${secret.length}). ` +
        'Recommend regenerating with: openssl rand -base64 32'
    );
  }
}

assertAuthMode();
assertNextauthSecret();

const authMode = process.env.AUTH_MODE ?? 'none';

const emailOtpConfig = {
  trustHost: true,
  adapter: PrismaAdapter(db),
  providers: [
    Nodemailer({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? '587'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      from: process.env.SMTP_FROM ?? process.env.EMAIL_FROM ?? 'noreply@example.com',
      sendVerificationRequest: async ({ identifier: email }: { identifier: string }) => {
        // Reject emails outside the allow-list without leaking which emails
        // are registered. Return early so the request appears identical to
        // the non-existent-user case.
        if (email !== process.env.ALLOWED_EMAIL) return;

        // Rate limit: 10 OTPs/hour per IP, 5/hour per email. Prevents email
        // bombing and brute-force pressure on the 6-digit space.
        const h = await headers();
        const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
        const ISSUE_LIMIT_IP = { max: 10, windowMs: 60 * 60 * 1000 };
        const ISSUE_LIMIT_EMAIL = { max: 5, windowMs: 60 * 60 * 1000 };
        if (!(await checkAndIncrement(`otp:ip:${ip}`, ISSUE_LIMIT_IP))) {
          throw new Error('Too many OTP requests from this IP. Try again later.');
        }
        if (!(await checkAndIncrement(`otp:email:${email}`, ISSUE_LIMIT_EMAIL))) {
          throw new Error('Too many OTP requests for this email. Try again later.');
        }

        // Bootstrap the User row on first OTP request. The allow-list check
        // above guarantees only ALLOWED_EMAIL can reach this point.
        const user = await db.user.upsert({
          where: { email },
          update: {},
          create: { email },
        });

        const code = generateOtp();
        const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

        await db.otpCode.create({
          data: {
            userId: user.id,
            hashedCode,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        });

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? '587'),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM ?? process.env.EMAIL_FROM ?? 'noreply@example.com',
          to: email,
          subject: 'Your verification code',
          text: `Your verification code is: ${code}. It expires in 10 minutes.`,
        });
      },
    }),
    Credentials({
      id: 'otp',
      name: 'One-time code',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(creds) {
        const email = creds?.email;
        const code = creds?.code;
        if (typeof email !== 'string' || typeof code !== 'string') return null;
        if (email !== process.env.ALLOWED_EMAIL) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await verifyOtp(user.id, code);
        if (!ok) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  session: {
    // Credentials provider does not trigger adapter.createSession in
    // Auth.js v5 — database strategy silently drops the session, logging
    // the user out immediately. JWT strategy keeps the session in a
    // signed cookie; the adapter is still wired up for future OAuth use.
    strategy: 'jwt' as const,
    maxAge: Number(process.env.SESSION_DURATION_DAYS ?? 30) * 86400,
  },
  cookies: {
    sessionToken: {
      name: 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: (process.env.NEXTAUTH_URL ?? '').startsWith('https'),
      },
    },
  },
  callbacks: {
    async signIn({ user }: { user: { email?: string | null } }) {
      if (user.email && user.email !== process.env.ALLOWED_EMAIL) {
        return false;
      }
      return true;
    },
    // Persist user.id onto the JWT on initial sign-in so the session
    // callback can expose it. Required for the app's `session.user.id`
    // reads under the jwt strategy.
    async jwt({ token, user }: { token: JWT; user?: { id?: string } | null }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export const authConfig = authMode === 'email_otp' ? emailOtpConfig : {};

const nextAuthResult = authMode === 'email_otp' ? NextAuth(emailOtpConfig) : null;

export const auth = nextAuthResult ? nextAuthResult.auth : async () => null;

export const handlers = nextAuthResult
  ? nextAuthResult.handlers
  : {
      GET: async () => new Response('Auth disabled', { status: 404 }),
      POST: async () => new Response('Auth disabled', { status: 404 }),
    };
