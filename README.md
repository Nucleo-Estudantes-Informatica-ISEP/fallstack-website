# Fallstack

Fallstack is NEI-ISEP's annual event connecting ISEP students with technology
companies. Editions share this repository and are tagged `<year>-edition`; see
[CHANGELOG.md](CHANGELOG.md).

## Stack

Next.js 15, React 18, TypeScript, Tailwind CSS 4, HeroUI, PostgreSQL 16 with
Prisma 6, MinIO, and AuthNEI/ZITADEL OIDC. See the
[architecture guide](docs/architecture.md) for application boundaries.

## Run locally

Requires Node.js 24+, pnpm 10 (via Corepack or a local install), PostgreSQL 16,
MinIO, and a development AuthNEI/ZITADEL OIDC client. Ask a maintainer for the
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
   docker run -d --name fallstack-minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=fallstack_local -e MINIO_ROOT_PASSWORD=replace-with-local-minio-secret quay.io/minio/minio server /data --console-address ':9001'
   ```

   Open the MinIO console at `http://localhost:9001` and create three buckets:
   `fallstack-dev-avatars`, `fallstack-dev-logos`, and `fallstack-dev-cvs`.
   Use the same names and credentials in `.env`. A local database uses the
   default `public` schema; shared environments use `?schema=fallstack`.

3. Configure the app:

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL`, `DIRECT_URL` (use the same URL locally), `S3_*`, and
   the `AUTH_*`/`ZITADEL_*` values in `.env`. Change `JWT_SECRET` and
   `AUTH_SECRET` from example values. Keep `NEXT_PUBLIC_BASE_URL` at
   `http://localhost:3000/api` for this setup. `.env.example` lists all keys.
   Do not use production credentials locally.

4. Apply migrations, then start the app:

   ```bash
   pnpm migrate:deploy
   pnpm dev
   ```

   Open `http://localhost:3000`. Existing databases created before Prisma
   Migrate need the [one-time baseline step](docs/database-workflow.md#one-time-adoption-note)
   before applying migrations. Login requires the configured OIDC client.

## More documentation

- [Contribution workflow](docs/agents/contribution.md): issues, branches, PRs,
  and checks.
- [Database workflow](docs/database-workflow.md): migrations, seed, and local
  reset.
- [Shared data and deployment](docs/SHARED_DATA.md): shared PostgreSQL,
  MinIO, and Coolify Compose. Current deployment uses
  [`docker-compose.app.yml`](docker-compose.app.yml), not a local service profile.
- [Observability](docs/observability.md), [security](docs/SECURITY.md), and
  [architecture decisions](docs/decisions/README.md).
- [Legacy Supabase operations](docs/legacy-supabase-operations.md): orphaned-file
  GC and CV retention purge for source Supabase projects only.
- [Legacy Supabase local setup](docs/legacy-supabase-local.md): CLI, Windows
  Vector workaround, and retired Docker profile commands.

Task tracking is on the [GitHub Projects board](https://github.com/orgs/Nucleo-Estudantes-Informatica-ISEP/projects/11).
