# Fallstack

## Hello there! 👋

Welcome to the Fall Stack event's GitHub repository. Here you'll find everything you need to contribute with your amazing code and ideas!

This is a Núcleo de Estudantes de Informática project, made by students from ISEP.

---

## Description

Fall Stack is a tech event that happens every year with the intention of presenting tech companies to students that are looking for an internship.

This is also a great place for networking and really getting to know the market.

The event takes place at ISEP (Instituto Superior de Engenharia do Porto). Each year's edition is tracked as a `<year>-edition` git tag on this repo — see [`CHANGELOG.md`](./CHANGELOG.md) for the current edition's dates and what changed.

---

## Tech stack

Next.js, TypeScript, Tailwind CSS, HeroUI, PostgreSQL/Prisma, and Supabase (Auth + Storage). See [`AGENTS.md`](./AGENTS.md)'s Stack table for the full, authoritative list.

### Authentication

All authentication, including password recovery and password updates, goes
through Supabase Auth. Application tables must not store passwords or password
reset tokens, and application routes must not provide separate password-change
flows.

---

# Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/<org>/fallstack-website.git
cd fallstack-website
```

## 2. Install dependencies

```bash
pnpm install
```

## 3. Environment Variables

Copy:

```bash
cp .env.example .env
```

### Required values (hosted Supabase)

- `NEXT_PUBLIC_BASE_URL`
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (service role)
- `JWT_SECRET`
- `NODE_ENV`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

See `.env.example` for the full list, including optional docker compose overrides and Sentry/Pino observability variables (covered below).

### Observability

Production logging and error monitoring use Pino and Sentry. See [OBSERVABILITY.md](./OBSERVABILITY.md) for Sentry project creation, environment variables, privacy controls, Docker source-map uploads, alerts, verification, and troubleshooting.

### Storage setup (Supabase hosted)

Create two storage buckets:

| Bucket  | Access  |
| ------- | ------- |
| avatars | public  |
| cvs     | private |

### Orphaned-file garbage collection

Student media uploads are reconciled daily at 03:00 UTC. Objects are eligible
only when they are under the app-managed avatar/CV prefixes, are unreferenced by
`Student.avatar`/`Student.cv`, and are at least 48 hours old.

1. In Supabase Vault, create `storage_gc_project_url` with the project URL and
   `storage_gc_service_role_key` with the service-role key.
2. Run [`supabase/storage-gc.sql`](./supabase/storage-gc.sql) manually in the
   hosted Supabase SQL editor. Do not add the service-role key to the SQL file.
   Its final query is non-destructive and returns the exact candidate set.
3. Check every returned bucket/path against `Student.avatar`/`Student.cv`. The
   installer intentionally does not schedule deletion.
4. Only after confirming the dry run, run
   [`supabase/storage-gc-enable.sql`](./supabase/storage-gc-enable.sql) manually.
5. Confirm the job exists with:

   ```sql
   select jobid, schedule, command, active
   from cron.job
   where jobname = 'storage-orphan-gc';
   ```

The job reads `storage.objects` but deletes through the Storage API; direct SQL
deletion would remove only metadata and leave the billed blob behind. Failed API
deletions remain in `storage.objects`, so the next daily run retries them.

Monitor runs and asynchronous deletion failures after 03:00 UTC:

```sql
select status, return_message, start_time, end_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'storage-orphan-gc')
order by start_time desc
limit 10;

select id, status_code, timed_out, error_msg, created
from net._http_response
where timed_out or error_msg is not null or status_code not between 200 and 299
order by created desc;

select bucket_id, count(*)
from public.storage_gc_candidates()
group by bucket_id;
```

`pg_net` responses expire after six hours by default, so inspect them soon after
the run. A candidate count that does not shrink indicates persistent failures.

---

# Supabase CLI (Local Development)

You can run a full Supabase stack locally (Auth, Storage, DB, Studio, Realtime, Gateway).

---

## Installing Supabase CLI (Windows via Scoop)

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Verify installation:

```bash
supabase --version
```

---

## Starting Supabase locally

Run from the project root:

```bash
supabase start
```

This launches:

| Service         | URL                                                                    |
| --------------- | ---------------------------------------------------------------------- |
| API Gateway     | [http://127.0.0.1:54321](http://127.0.0.1:54321)                       |
| GraphQL API     | [http://127.0.0.1:54321/graphql/v1](http://127.0.0.1:54321/graphql/v1) |
| Supabase Studio | [http://127.0.0.1:54323](http://127.0.0.1:54323)                       |
| SMTP Inbox      | [http://127.0.0.1:54324](http://127.0.0.1:54324)                       |
| Database        | postgresql://postgres:postgres@127.0.0.1:54322                         |

---

## Windows Vector Container Issue (harmless but annoying)

Supabase CLI sometimes starts a **vector** container that repeatedly fails on Windows.

This container is NOT required to run the app.

### Option A — Remove vector automatically after start

You may run:

```bash
docker rm -f supabase_vector_fallstack-website
```

If the name differs, check:

```bash
docker ps -a
```

### Option B — Clean all Supabase containers before starting

After stopping:

```bash
supabase stop
docker rm -f $(docker ps -aq --filter "name=supabase")
```

Then:

```bash
supabase start
```

---

## Stopping Supabase

```bash
supabase stop
```

To also remove local data volumes:

```bash
docker compose --profile supabase down -v
```

---

# Database Workflow (Prisma)

Schema changes are tracked with **Prisma Migrate** (`prisma/migrations/`), not `db push`. Every schema change must go through a migration so it has a versioned, reviewable history and a rollback path.

## Creating a new migration

After editing `prisma/schema.prisma`, generate and apply the migration locally:

```bash
pnpm migrate --name <describe-the-change>
```

This runs `prisma migrate dev`, which diffs your schema against the migration history, writes a new `prisma/migrations/<timestamp>_<name>/migration.sql`, and applies it to your local database. If you omit `--name`, Prisma will prompt you for one interactively. Commit the generated migration folder along with your schema change.

## Applying migrations elsewhere (deploy)

`docker-compose.app.yml` runs this automatically: a `migrate` service builds the `migrator` Dockerfile target (the full toolchain image, before it's pruned down to the standalone runtime) and runs `prisma migrate deploy` once against `DATABASE_URL`; the `web` service only starts after `migrate` exits successfully (`depends_on: migrate: condition: service_completed_successfully`). `docker compose up` (or Coolify running the same compose file) always applies pending migrations before the app starts serving traffic — no manual step required.

To run it by hand (e.g. outside Docker, against a remote DB):

```bash
pnpm migrate:deploy
```

This runs `prisma migrate deploy` directly, which applies any pending migrations without prompting or generating new ones.

## One-time adoption note

This project previously used `prisma db push`, so `prisma/migrations/` didn't exist until a baseline migration (`20260712000000_init`) capturing the current schema was added. For any environment where the tables **already exist** from a prior `db push` (e.g. an existing local or shared dev database), mark that baseline as already applied instead of running it for real:

```bash
pnpm exec prisma migrate resolve --applied 20260712000000_init
```

For a genuinely empty database, just run `pnpm migrate:deploy` (or `pnpm migrate` locally) as usual — it will create the tables from the baseline migration.

## Resetting a local database

```bash
pnpm exec prisma migrate reset
```

Drops the local database, reapplies all migrations from scratch, and reseeds. Local development only — never run against a shared or production database.

Generate Prisma Client:

```bash
pnpm generate
```

---

## Seeding

```bash
pnpm seed
```

---

## Wipe the database (local only)

```bash
NODE_ENV=development pnpm wipe -- --confirm
```

---

# Running the App

Start the Next.js dev server:

```bash
pnpm dev
```

App runs on:

```
http://localhost:3000
```

---

# Local Supabase Tools

| Tool            | URL                                              |
| --------------- | ------------------------------------------------ |
| Supabase Studio | [http://127.0.0.1:54323](http://127.0.0.1:54323) |
| API Gateway     | [http://127.0.0.1:54321](http://127.0.0.1:54321) |
| SMTP Inbox      | [http://127.0.0.1:54324](http://127.0.0.1:54324) |

---

# Docker Profiles

### PostgreSQL only (no Supabase)

```bash
docker compose up -d db
```

### Full Supabase stack

```bash
docker compose --profile supabase up -d
```

Stop:

```bash
docker compose --profile supabase down
```

---

# Contributing

See [`AGENTS.md`](./AGENTS.md)'s Contribution workflow section for branch naming (Conventional Branch), commit style (Conventional Commits), and the PR-into-`dev` process. Task tracking lives on the repository's [GitHub Projects board](https://github.com/orgs/Nucleo-Estudantes-Informatica-ISEP/projects/11).
