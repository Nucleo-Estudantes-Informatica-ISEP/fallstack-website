# Legacy Supabase local stack

This page preserves local-development commands from before the shared PostgreSQL
and MinIO cutover. The current app does not use Supabase Auth or Storage. The
old `docker compose` profile commands below require the retired Compose file;
this repository now has only `docker-compose.app.yml` for Coolify. Use the
[README](../README.md) for the current local setup.

## Supabase CLI local development

You can run a full Supabase stack locally (Auth, Storage, DB, Studio, Realtime, Gateway).

---

### Installing Supabase CLI (Windows via Scoop)

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Verify installation:

```bash
supabase --version
```

---

### Starting Supabase locally

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

### Windows Vector Container Issue (harmless but annoying)

Supabase CLI sometimes starts a **vector** container that repeatedly fails on Windows.

This container is NOT required to run the app.

#### Option A — Remove vector automatically after start

You may run:

```bash
docker rm -f supabase_vector_fallstack-website
```

If the name differs, check:

```bash
docker ps -a
```

#### Option B — Clean all Supabase containers before starting

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

### Stopping Supabase

```bash
supabase stop
```

To also remove local data volumes:

```bash
docker compose --profile supabase down -v
```

## Historical Docker profiles

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
