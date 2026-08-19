# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* .npmrc* ./
# Fail the build on high or critical vulnerabilities
RUN npm ci && npm audit --audit-level=high

# =============================================================================
# Stage 2: Build application
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# prisma.config.ts resolves env('DATABASE_URL') at config load; generate
# never connects to a database, so a placeholder satisfies it at build time.
# Runtime containers get the real value via Coolify's environment config.
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

# Generate Prisma client
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# =============================================================================
# Stage 3: Production runtime
# =============================================================================
FROM node:20-alpine AS runner

# Puppeteer dependencies (for PDF export)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use installed Chromium instead of downloading its own
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
