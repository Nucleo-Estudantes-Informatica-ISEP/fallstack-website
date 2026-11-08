# Fallstack

Fallstack is NEI-ISEP's annual event connecting ISEP students with technology
companies. Editions share this repository and are tagged `<year>-edition`; see
[CHANGELOG.md](CHANGELOG.md).

## Stack

Next.js 15, React 18, TypeScript, Tailwind CSS 4, PostgreSQL 16 with
Prisma 6, MinIO, and AuthNEI/ZITADEL OIDC. See the
[architecture guide](docs/architecture.md) for application boundaries.

## Run locally

Requires Node.js 24+, pnpm 10 (via Corepack or a local install), PostgreSQL 16,
MinIO, authenticated Redis 7.4, and a development AuthNEI/ZITADEL OIDC client. Ask a maintainer for the
client credentials and register `http://localhost:3000/api/auth/callback/zitadel`
as its callback. Use development credentials and data only.

1. Clone and install:

   ```bash
   git clone https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website.git
   cd fallstack-website
   corepack enable
   pnpm install
   ```

2. Start isolated local PostgreSQL and MinIO, or point `.env` at dedicated
   development services. One Docker setup matching `.env.example` is:

   ```bash
   docker run -d --name fallstack-postgres -p 54322:5432 -e POSTGRES_PASSWORD=postgres postgres:16
   docker run -d --name fallstack-minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=fallstack_local -e MINIO_ROOT_PASSWORD=replace-with-local-minio-secret coollabsio/minio:RELEASE.2025-10-15T17-29-55Z server /data --console-address ':9001'
   export REDIS_PASSWORD="$(openssl rand -hex 32)"
   docker run -d --name fallstack-redis -p 127.0.0.1:6379:6379 redis:7.4.12-alpine redis-server --requirepass "$REDIS_PASSWORD" --maxmemory 96mb --maxmemory-policy noeviction
   ```

   Open the MinIO console at `http://localhost:9001` and create three buckets:
   `fallstack-dev-avatars`, `fallstack-dev-logos`, and `fallstack-dev-cvs`.
   Use the same names and credentials in `.env`. A local database uses the
   default `public` schema; shared environments use `?schema=fallstack`.
   This pinned Coolify image matches the deployment's MinIO distribution;
   avoid silently switching the local setup to a different upstream image.

3. Configure the app:

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL`, `DIRECT_URL` (use the same URL locally), `S3_*`, and
   the `AUTH_*`/`ZITADEL_*` values in `.env`. Change `JWT_SECRET` and
   `AUTH_SECRET` from example values. Keep `NEXT_PUBLIC_BASE_URL` at
   `http://localhost:3000/api` for this setup. `.env.example` lists all keys.
   Do not use production credentials locally.

   Set `REDIS_URL` in `.env` to the local authenticated instance using the
   generated `REDIS_PASSWORD` (do not print or commit it), and keep
   `REDIS_KEY_PREFIX=fallstack:local:`. CV/avatar uploads return 503 if shared
   limits cannot be checked. Local Redis above is disposable; deployed Redis
   uses AOF and a persistent volume as described in the [runbook](docs/operations/redis.md).

   For a local, staging, or CI installation that has **never issued Wallet
   passes**, set `GOOGLE_WALLET_NEVER_ENABLED=true` and leave all three Wallet
   credentials unset. Without that explicit declaration, missing credentials
   block student deletion with 503. Clear the declaration before enabling
   Wallet. Environments that have issued passes must keep valid credentials;
   see [Wallet setup](docs/GOOGLE_WALLET.md#pass-validity-and-account-deletion).

4. Apply migrations, then start the app:

   ```bash
   pnpm migrate:deploy
   pnpm dev
   ```

   Open `http://localhost:3000`. Existing databases created before Prisma
   Migrate need the [one-time baseline step](docs/database-workflow.md#one-time-adoption-note)
   before applying migrations. Login requires the configured OIDC client.

## Docker Compose files

Use `docker-compose.app.yml` in Coolify. `docker-compose.local.yml` is a
separate, self-contained development stack: it provisions local PostgreSQL,
Redis and MinIO, creates the app buckets, and uses Compose-managed networking
instead of Coolify's external networks. It is intentionally not a literal copy
of the deployment file. Keep the application runtime contract aligned when
changing services or environment configuration in either file.

## Run the full stack with Docker Compose

Requires Docker Engine/Desktop and Docker Compose v2. The local Compose file
starts isolated PostgreSQL, Redis and MinIO services, creates the three S3
buckets, applies Prisma migrations, then starts the web app and the dry-run
storage-cleanup worker.

Optionally copy `.env.example` to `.env` and configure a **development**
AuthNEI/ZITADEL client. Without real OIDC credentials the containers still
start, but login will not work. Register this callback on that development
client (the Compose setup uses port 4000, not the native `pnpm dev` port 3000):

```
http://localhost:4000/api/auth/callback/zitadel
```

Start the stack from the repository root:

```bash
docker compose -f docker-compose.local.yml up --build
```

Open `http://localhost:4000`. Compose connects containers through its own
managed network using the service names `postgres`, `redis` and `minio`;
it does not use the external Coolify networks or the host-facing URLs in
`.env.example`. The infrastructure ports are also bound to loopback for
local tools: PostgreSQL `54322`, Redis `6379`, MinIO API `9000` and MinIO
console `9001`. The web port defaults to `4000`. If you override
`FALLSTACK_LOCAL_WEB_PORT`, register the matching port in the OIDC callback
URL as well.

If one of those host ports is already in use (for example, by the standalone
containers in the native-development instructions below), stop that local
service or override the corresponding `FALLSTACK_LOCAL_*_PORT` variable in
your shell or `.env`. MinIO credential overrides must use URL-safe characters
because the one-shot bucket setup passes them through an `MC_HOST` URL. The
available overrides are listed at the bottom of `.env.example`. The local
services use named Docker volumes and survive
`docker compose down`; `docker compose -f docker-compose.local.yml down -v`
deletes the local database, Redis state and MinIO objects.

The app runs its production-built Node server in the container. Its Redis
prefix is `fallstack:dev:` because the production runtime validates the
deployed prefix set; the Redis instance itself is local and isolated. Never
point this Compose stack at NEI's shared Redis or production data.

## Production builds on limited RAM

Run one build at a time. To use a 1.5 GiB JavaScript heap ceiling:

```bash
NODE_OPTIONS=--max-old-space-size=1536 pnpm build
```

Next isolates compiler workers and optimizes the icon barrel import. Docker
reuses its dependency stage and preserves `.next/cache` between builds, avoiding
a second dependency copy and Prisma generation. Unused legacy UI dependencies are removed
from the install graph. The experimental webpack memory mode stays disabled:
bounded comparison favored the faster default mode at a similar anonymous-memory
peak, with a slightly higher total peak including filesystem cache.
Builds without complete Sentry upload credentials skip source maps; configured
builds upload once after compilation and fail if that upload fails. Runtime
error reporting only needs the DSN. See [observability](docs/observability.md).
The heap ceiling is per Node process, not a limit on total build RAM.
Full source-map builds need more memory than credential-free local builds;
verify those in CI or on the deployment builder when the local ceiling is too low.

## More documentation

- [Contribution workflow](docs/agents/contribution.md): issues, branches, PRs,
  and checks.
- [Database workflow](docs/database-workflow.md): migrations, seed, and local
  reset.
- [Shared data and deployment](docs/SHARED_DATA.md): shared PostgreSQL,
  MinIO, and Coolify Compose. Current deployment uses
  [`docker-compose.app.yml`](docker-compose.app.yml), not a local service profile.
- [ZITADEL role claims](docs/operations/zitadel-roles.md): project settings,
  cross-project admin roles, and login verification.
- [Google Wallet infrastructure](docs/GOOGLE_WALLET.md): issuer, service-account,
  Generic Pass, publishing access, and runtime configuration.
- [MinIO cleanup](docs/storage-cleanup.md): six-month CV retention, orphan cleanup,
  dry-run rollout, retries and operator audit.
- [Backups](docs/operations/backups.md): PostgreSQL/MinIO ownership, schedule,
  encrypted off-VPS copies, usage guards, recovery and alert evidence.
- [Observability](docs/observability.md), [security](docs/SECURITY.md), and
  [architecture decisions](docs/decisions/README.md).
- [Health checks](docs/operations/health-checks.md): process liveness,
  dependency readiness, bounded probes and rollout verification.
- [Legacy Supabase operations](docs/legacy-supabase-operations.md): orphaned-file
  GC and CV retention purge for source Supabase projects only.
- [Legacy Supabase local setup](docs/legacy-supabase-local.md): CLI, Windows
  Vector workaround, and retired Docker profile commands.
- [Pre-event staging checks](tests/e2e/README.md): load and end-to-end checks;
  read the `CONFIRM_NON_PRODUCTION` guard before running them.

Delete accounts through the admin backoffice so application relationships and
permissions are handled together.

Task tracking is on the [GitHub Projects board](https://github.com/orgs/Nucleo-Estudantes-Informatica-ISEP/projects/11).
