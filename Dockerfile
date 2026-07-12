# Multi-stage build for Next.js application
FROM node:20-alpine AS base

# Add required packages for Prisma, healthcheck, sharp, etc.
RUN apk add --no-cache libc6-compat curl openssl && corepack enable

FROM base AS deps
WORKDIR /app

# Copy package files and Prisma schema (needed for postinstall prisma generate)
COPY package.json package-lock.json* pnpm-lock.yaml* ./
COPY prisma ./prisma

# Install dependencies based on the preferred package manager
RUN \
  if [ -f pnpm-lock.yaml ]; then \
    pnpm install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
    npm ci; \
  else \
    echo "Lockfile not found." && exit 1; \
  fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Selective copy (smaller context)
COPY package.json package-lock.json* pnpm-lock.yaml* ./
COPY next.config.js eslint.config.mjs prettier.config.js postcss.config.js tailwind.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public
COPY prisma ./prisma
COPY supabase ./supabase
COPY README.md ./README.md

# Generate Prisma client (after copying all files)
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN \
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
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

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
