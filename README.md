````markdown
# Fallstack 2025

## Hello there! 👋

Welcome to the Fall Stack event's GitHub repository. Here you'll find everything you need to contribute with your amazing code and ideas!

This is a Núcleo de Estudantes de Informática project, made by students from ISEP.

---

## Description

Fall Stack is a tech event that happens every year with the intention of presenting tech companies to students that are looking for an internship.

This is also a great place for networking and really getting to know the market.

The event takes place in ISEP (Instituto Superior de Engenharia do Porto) in the **25th and 26th of November**.

---

## Tech stack

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/)

---

# Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/<org>/fallstack2025.git
cd fallstack2025
```
````

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

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY` (service role)

### Storage setup (Supabase hosted)

Create two storage buckets:

| Bucket  | Access  |
| ------- | ------- |
| avatars | public  |
| cvs     | private |

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

This container is NOT required for Fallstack 2025.

### Option A — Remove vector automatically after start

You may run:

```bash
docker rm -f supabase_vector_fallstack2025
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

## Sync schema

```bash
pnpm prisma db push
```

or, using migrations:

```bash
pnpm prisma migrate dev
```

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
pnpm wipe
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

In order to contribute to the project, you should look into the board provided in the team's ClickUp. All the information's related to branches naming and code styling is in there.
