import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({ db: {} }));
vi.mock('next-auth', () => ({
  default: () => ({
    auth: async () => null,
    handlers: { GET: async () => {}, POST: async () => {} },
  }),
}));
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }));
vi.mock('next-auth/providers/nodemailer', () => ({
  default: (opts: unknown) => ({ id: 'nodemailer', options: opts }),
}));
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: async () => {} }) },
}));

describe('NEXTAUTH_SECRET boot guard', () => {
  const original = process.env.NEXTAUTH_SECRET;
  const originalMode = process.env.AUTH_MODE;
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;
    // The guard only runs when self-hosted OTP mode is active. In local mode
    // (AUTH_MODE=none) auth is disabled and the encryption layer enforces the
    // secret lazily when a key is actually stored.
    process.env.AUTH_MODE = 'email_otp';
    warnSpy.mockClear();
  });

  afterEach(() => {
    if (original !== undefined) process.env.NEXTAUTH_SECRET = original;
    if (originalMode !== undefined) process.env.AUTH_MODE = originalMode;
    else delete process.env.AUTH_MODE;
  });

  it('skips the guard entirely in AUTH_MODE=none', async () => {
    delete process.env.NEXTAUTH_SECRET;
    process.env.AUTH_MODE = 'none';
    await expect(import('@/lib/auth/config')).resolves.toBeDefined();
  });

  it('throws when NEXTAUTH_SECRET is the documented placeholder', async () => {
    process.env.NEXTAUTH_SECRET = 'change-me-in-production';
    await expect(import('@/lib/auth/config')).rejects.toThrow(/NEXTAUTH_SECRET/);
  });

  it('throws when NEXTAUTH_SECRET is empty', async () => {
    process.env.NEXTAUTH_SECRET = '';
    await expect(import('@/lib/auth/config')).rejects.toThrow(/NEXTAUTH_SECRET/);
  });

  it('throws when NEXTAUTH_SECRET is missing entirely', async () => {
    await expect(import('@/lib/auth/config')).rejects.toThrow(/NEXTAUTH_SECRET/);
  });

  it('throws on common low-effort placeholders', async () => {
    for (const ph of ['placeholder', 'changeme', 'secret']) {
      process.env.NEXTAUTH_SECRET = ph;
      await expect(import('@/lib/auth/config')).rejects.toThrow(/NEXTAUTH_SECRET/);
      vi.resetModules();
    }
  });

  it('warns but does not throw when secret is shorter than 32 chars', async () => {
    process.env.NEXTAUTH_SECRET = 'a'.repeat(16);
    await expect(import('@/lib/auth/config')).resolves.toBeDefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/shorter than 32 chars/));
  });

  it('passes silently with a 32-char secret', async () => {
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
    await expect(import('@/lib/auth/config')).resolves.toBeDefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('AUTH_MODE boot guard', () => {
  beforeEach(() => {
    vi.resetModules();
    // Satisfy the NEXTAUTH_SECRET guard so failures isolate to AUTH_MODE.
    vi.stubEnv('NEXTAUTH_SECRET', 'a'.repeat(32));
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.NEXT_PHASE;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.NEXT_PHASE;
  });

  it('accepts explicit AUTH_MODE=none in production', async () => {
    vi.stubEnv('AUTH_MODE', 'none');
    await expect(import('@/lib/auth/config')).resolves.toBeDefined();
  });

  it('accepts AUTH_MODE=email_otp', async () => {
    vi.stubEnv('AUTH_MODE', 'email_otp');
    await expect(import('@/lib/auth/config')).resolves.toBeDefined();
  });

  it('throws when AUTH_MODE is unset in production (fail closed)', async () => {
    delete process.env.AUTH_MODE;
    await expect(import('@/lib/auth/config')).rejects.toThrow(/AUTH_MODE is not set/);
  });

  it('allows unset AUTH_MODE during the build phase', async () => {
    delete process.env.AUTH_MODE;
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    await expect(import('@/lib/auth/config')).resolves.toBeDefined();
  });

  it('allows unset AUTH_MODE outside production (dev/test)', async () => {
    delete process.env.AUTH_MODE;
    vi.stubEnv('NODE_ENV', 'development');
    await expect(import('@/lib/auth/config')).resolves.toBeDefined();
  });

  it('throws on an unrecognized AUTH_MODE value', async () => {
    vi.stubEnv('AUTH_MODE', 'disabled');
    await expect(import('@/lib/auth/config')).rejects.toThrow(/AUTH_MODE="disabled" is invalid/);
  });

  it('trims whitespace before validating', async () => {
    vi.stubEnv('AUTH_MODE', '  email_otp  ');
    await expect(import('@/lib/auth/config')).resolves.toBeDefined();
  });
});
