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
