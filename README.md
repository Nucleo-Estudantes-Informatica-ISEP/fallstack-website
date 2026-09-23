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

Next.js, TypeScript, Tailwind CSS, HeroUI, PostgreSQL/Prisma, MinIO and
ZITADEL/AuthNEI. See [`AGENTS.md`](./AGENTS.md) for architecture and
[`docs/SHARED_DATA.md`](./docs/SHARED_DATA.md) for deployment.

### Authentication

Institutional OIDC handles login and password recovery. The application keeps
its own signed session and `User` rows. PostgreSQL and MinIO do not provide
login sessions. Delete accounts through the admin backoffice to preserve app
relationships and permissions.

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

### Required values

Set `DATABASE_URL` for the runtime PostgreSQL identity and `DIRECT_URL` for the
migration identity. Both require the environment's `?schema=fallstack` on
shared services. Set `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`S3_BUCKET_AVATARS`, `S3_BUCKET_CVS`, and the AuthNEI/ZITADEL and JWT values
listed in [`.env.example`](./.env.example). `NEXT_PUBLIC_BASE_URL` defaults to
`http://localhost:3000/api` during local development. For local storage, use
an isolated MinIO instance and the same bucket names or environment-specific
local equivalents. Never use production credentials locally.

### Observability

Production logging and error monitoring use Pino and Sentry. See [`docs/OBSERVABILITY.md`](./docs/OBSERVABILITY.md) for Sentry project creation, environment variables, privacy controls, Docker source-map uploads, alerts, verification, and troubleshooting.

### Pre-event load validation

Run staging load checks only with `CONFIRM_NON_PRODUCTION=yes`. Uploads now pass
through authenticated application routes, with per-student rate limits and
server-side size, MIME and file-signature checks. See
[`tests/e2e/README.md`](./tests/e2e/README.md) for browser checks. Remove
staging upload objects created during verification.

### Storage and retention

Avatars and logos uploaded by admins are public through same-origin
`/api/media/avatar/<id>`. CVs remain private; download routes recheck the
student/company/admin policy on every request. S3 credentials stay server-side.
Legacy [`supabase/`](./supabase/) SQL and bucket policies belong only to
pre-cutover source stacks and must not be copied into shared PostgreSQL or
MinIO. Source production has a Supabase-specific orphan GC job; S3-aware
cleanup is a separate reviewed migration step. Scheduled backups of the shared
services must be configured and restore-tested independently of one-time
migration archives.

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

# Local data services

Run PostgreSQL and MinIO locally or connect to dedicated development services.
Create the two environment buckets and use scoped credentials. The deployed
Coolify Compose file is [`docker-compose.app.yml`](./docker-compose.app.yml)
and expects the shared external network; it is not a local database service
Compose file. See [`docs/SHARED_DATA.md`](./docs/SHARED_DATA.md).

---

# Contributing

See [`AGENTS.md`](./AGENTS.md)'s Contribution workflow section for branch naming (Conventional Branch), commit style (Conventional Commits), and the PR-into-`dev` process. Task tracking lives on the repository's [GitHub Projects board](https://github.com/orgs/Nucleo-Estudantes-Informatica-ISEP/projects/11).
