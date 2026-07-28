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
# `sharing=locked` serializes access to the mount so two overlapping builds
# on the same host (e.g. Coolify deploying two branches at once) can't race
# on writes to the store.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store,sharing=locked \
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
COPY prisma ./prisma

# Only needs node_modules + the schema/migrations, not the rest of the app
# source - deliberately kept minimal so `migrator` (which branches off here)
# never pays for the Next.js build in `app-builder` below.
RUN npx prisma generate

# Standalone stage to apply pending migrations against DATABASE_URL before
# the app starts. Branches off `builder` *before* the Next.js build below,
# so `migrate` only pays for `prisma generate`, not a full webpack compile -
# Docker Compose builds `web`/`migrate` concurrently, and two full builds at
# once was a real build-time memory-pressure incident. See
# docker-compose.app.yml's `migrate` service.
FROM builder AS migrator
USER nextjs
CMD ["npx", "prisma", "migrate", "deploy"]

FROM builder AS app-builder
ARG NEXT_PUBLIC_SENTRY_DSN=""
ARG SENTRY_URL=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
# Public (non-secret) Supabase values: Next.js inlines these into the
# browser bundle at build time, so the builder stage needs them directly —
# unlike JWT_SECRET/SUPABASE_SERVICE_ROLE_KEY, which stay runtime-only via
# env_file (see docker-compose.app.yml).
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ARG NEXT_PUBLIC_BASE_URL=""
# Links the admin backoffice's Logs nav item out to GlitchTip/Sentry -
# NEXT_PUBLIC_*, so (like the others above) it must be supplied as a build
# arg to actually land in the compiled bundle; declaring it only in
# env.client.ts/.env doesn't reach a Docker build (see the
# NEXT_PUBLIC_BASE_URL incident this same gap already caused once).
ARG NEXT_PUBLIC_LOGS_DASHBOARD_URL=""
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV SENTRY_URL=$SENTRY_URL
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_LOGS_DASHBOARD_URL=$NEXT_PUBLIC_LOGS_DASHBOARD_URL
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Selective copy (smaller context) - package.json/lockfiles and prisma/
# already present from `builder`
COPY next.config.js eslint.config.mjs prettier.config.js postcss.config.js sentry.edge.config.ts sentry.server.config.ts tailwind.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public
COPY supabase ./supabase
COPY README.md ./README.md

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

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application
COPY --from=app-builder /app/public ./public
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=app-builder /app/prisma ./prisma

USER nextjs
EXPOSE 4000
ENV PORT=4000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["node", "server.js"]
