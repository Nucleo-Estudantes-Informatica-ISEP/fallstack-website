# syntax=docker/dockerfile:1
# Multi-stage build for Next.js application
FROM node:20-alpine AS base

# Add required packages for Prisma, healthcheck, sharp, etc.
RUN apk add --no-cache libc6-compat curl openssl && corepack enable

# Create the non-root user here so every stage descending from `base`
# (both builder -> migrator and runner) inherits it without duplication.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

FROM base AS deps
WORKDIR /app

# Copy package files and Prisma schema (needed for postinstall prisma generate)
COPY package.json package-lock.json* pnpm-lock.yaml* ./
COPY prisma ./prisma

# Install dependencies based on the preferred package manager.
# The pnpm store is content-addressable, so persisting it across builds via a
# BuildKit cache mount lets pnpm skip re-downloading unchanged packages —
# `store-dir` is pinned explicitly so pnpm actually writes into the mounted
# path instead of whatever its platform default would otherwise resolve to.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  if [ -f pnpm-lock.yaml ]; then \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
    npm ci; \
  else \
    echo "Lockfile not found." && exit 1; \
  fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml ./

ARG NEXT_PUBLIC_SENTRY_DSN=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
# Public (non-secret) Supabase values: Next.js inlines these into the
# browser bundle at build time, so the builder stage needs them directly —
# unlike JWT_SECRET/SUPABASE_SERVICE_ROLE_KEY, which stay runtime-only via
# env_file (see docker-compose.app.yml).
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ARG NEXT_PUBLIC_BASE_URL=""
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Selective copy (smaller context)
COPY package.json package-lock.json* pnpm-lock.yaml* ./
COPY next.config.js eslint.config.mjs prettier.config.js postcss.config.js sentry.edge.config.ts sentry.server.config.ts tailwind.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public
COPY prisma ./prisma
COPY supabase ./supabase
COPY README.md ./README.md

# Generate Prisma client (after copying all files)
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=secret,id=sentry_auth_token,required=false \
  if [ -f /run/secrets/sentry_auth_token ]; then \
    export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)"; \
  fi; \
  if [ -f pnpm-lock.yaml ]; then \
    pnpm run build; \
  else \
    npm run build; \
  fi

# Standalone stage to apply pending migrations against DATABASE_URL before
# the app starts. Reuses `builder` (full node_modules incl. the Prisma CLI,
# generated client, schema, and migrations) rather than the pruned runner
# image. See docker-compose.app.yml's `migrate` service.
FROM builder AS migrator
USER nextjs
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 4000
ENV PORT=4000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["node", "server.js"]
