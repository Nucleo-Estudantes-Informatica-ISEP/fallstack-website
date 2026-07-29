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

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (service role)
- `JWT_SECRET`

Defaulted (override only if you need something other than local dev defaults):

- `NEXT_PUBLIC_BASE_URL` (defaults to `http://localhost:3000/api`)
- `NODE_ENV` (defaults to `development`)

Only needed to run `pnpm seed`:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

See `.env.example` for the full list, including optional docker compose overrides and Sentry/Pino observability variables (covered below).

### Observability

Production logging and error monitoring use Pino and Sentry. See [`docs/OBSERVABILITY.md`](./docs/OBSERVABILITY.md) for Sentry project creation, environment variables, privacy controls, Docker source-map uploads, alerts, verification, and troubleshooting.

### Storage setup (Supabase hosted)

Create two storage buckets:

| Bucket  | Access  | Allowed MIME types        | Max file size |
| ------- | ------- | ------------------------- | ------------- |
| avatars | public  | `image/png`, `image/jpeg` | 5 MB          |
| cvs     | private | `application/pdf`         | 10 MB         |

After creating the buckets, run
[`supabase/storage-bucket-limits.sql`](./supabase/storage-bucket-limits.sql)
in the Supabase SQL editor for **every Supabase project** (including staging
and production). It fails if either bucket is missing and configures the MIME
and size restrictions without changing the bucket access policy.

Student uploads use a short-lived signed upload URL, so file bytes go directly
from browser to Storage rather than through the Next.js server. Browser file
signature checks are UX only; the bucket restrictions are the enforcement
boundary for direct uploads.

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

Schema changes are tracked with **Prisma Migrate** (`prisma/migrations/`), not `db push`. See [`docs/database-workflow.md`](./docs/database-workflow.md) for creating and applying migrations, the one-time baseline-adoption note, resetting a local database, seeding, and wiping the database.

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
