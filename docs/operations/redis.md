# Private Redis in Coolify

Both Coolify applications (`dev` and `main`) deploy `/docker-compose.app.yml`.
Each resource gets its own Redis 7.4 service, Compose-scoped `redis_private`
network and `redis_data` volume. Do not set global container/network/volume
names or share these resources between environments.

## Configuration and rollout

Set these **runtime-only** values separately in each Coolify resource before
deploying this Compose change. Clear **Available at Buildtime** for both;
Coolify can otherwise inject environment values as build arguments:

| Variable           | `dev` resource       | `main` resource         |
| ------------------ | -------------------- | ----------------------- |
| `REDIS_PASSWORD`   | Unique random secret | Different random secret |
| `REDIS_KEY_PREFIX` | `fallstack:dev:`     | `fallstack:main:`       |

Generate each password with `openssl rand -hex 32` (URL-safe hex). Redis rejects
characters outside letters, digits, underscore and hyphen, so the derived
connection URL and config file cannot be misparsed. Store it in that resource's
secret environment configuration, and keep it out of Git, build arguments,
logs and public `NEXT_PUBLIC_*` variables. Compose refuses to deploy without
both settings. Compose derives `REDIS_URL=redis://:<password>@redis-private:6379`
and passes it with the required prefix at runtime. Do not configure a separate
URL override pointing at another instance. All web copies within one resource
must receive identical values. Redis reads its password from an owner-only
`/tmp/redis.conf`, not process arguments; Docker administrators and Redis
administrators with `CONFIG GET` access remain trusted.
The future #413 client must validate these through `serverEnv` and prepend the
prefix to every key; this infrastructure change does not yet use Redis in app
requests or change the existing per-process limiter.

Only `web` and `redis` join `redis_private`, which has `internal: true`.
Redis binds to loopback and the `redis-private` alias defined **only** on that
network, rather than listening on every interface. This matters because
[Coolify managed Compose adds a resource network to every service](https://github.com/coollabsio/coolify/blob/v4.5.0/bootstrap/helpers/shared.php#L4092-L4118).
The smoke test reproduces that injection and checks that neither Redis's
resource-network address nor its private address accepts requests from that
network. Keep **Advanced → Predefined network → Isolated network only**.
Preserve web's existing proxy and shared-data connectivity. Redis has no host
port, public domain or proxy route; do not attach it to `shared_data` or add
the `redis-private` alias on another network. Inspect Coolify's rendered
Compose and actual bindings after deployment before enabling #413.
Docker-host administrators remain trusted: network isolation does not prevent
root/Docker administrators from inspecting containers or credentials.

Deploy `dev` first, run the checks below, then promote the reviewed change to
`main` and repeat. Web startup waits for Redis's authenticated `PONG` health
check and for successful DB migrations. A later Redis failure does not
automatically stop/restart web; #413 owns bounded timeouts and outage policy.

## Restart, persistence and capacity

- `restart: unless-stopped` restarts failed Redis containers and running
  containers after a Docker/host restart. An explicitly stopped container
  remains stopped across daemon restarts. A Coolify redeploy can start it again.
- `/data` uses the resource's persistent named volume. AOF is enabled with
  `appendfsync everysec`; standalone scheduled RDB snapshots are disabled.
  Graceful stop gets 30 seconds to flush. Restart/recreation preserves keys
  and their absolute TTLs; downtime does not extend rate-limit windows.
- A host crash can lose roughly the last second of writes. Redis is
  short-lived coordination state, never the source of truth for student,
  account or Wallet data. This is one Redis per resource, not HA; volume/host
  loss loses coordination state. Do not delete the volume during redeploy.
- Dataset limit is 96 MiB with `noeviction`; container limit is 256 MiB to
  leave additional headroom for AOF buffers and rewrite copy-on-write. This
  is a conservative starting budget, not a proof that every write load fits.
  At capacity writes fail instead of
  silently evicting limiter keys. SAD monitors memory, AOF disk space,
  persistence errors and health; adjust limits from observed event load.
  #413 must handle write errors and define the acceptable crash/outage budget.

## Verification

Local/CI disposable deployment smoke test (Docker and Node required):

```bash
bash tests/e2e/redis-deployment.sh
```

This smoke test runs inside the required **Test, typecheck, lint & build** CI
job, so an isolation failure blocks that existing merge gate.

It renders the production Redis definition into temporary `dev`/`main`
projects, checks authenticated network access, rejection of missing/wrong
credentials, separate state, no published ports, isolation even with Coolify's
injected resource network, restart policy, and key survival after restart and
container recreation.
It removes only its own test containers, networks and volumes on exit.
It does not deploy either Coolify resource or build the app.

SAD owns the following deployment checks in each environment. Use Coolify's
generated project name and environment, not a fresh local Compose project.

1. In Redis's container terminal, run:

   ```sh
   redis-cli ping
   # Expected: NOAUTH Authentication required.
   REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping
   # Expected: PONG
   REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli INFO persistence
   ```

2. Confirm `aof_enabled:1`, `aof_last_write_status:ok` and
   `aof_last_bgrewrite_status:ok`. Inspect the actual Redis container with
   `docker inspect`: the private network and Coolify's resource network, no
   port bindings, persistent `/data`, and `unless-stopped`. The listener must
   bind only loopback and the private address. Failed private-alias resolution
   must fail startup; making that bind optional could leave a loopback-only
   service reporting healthy while every web connection fails.
3. SAD verifies TCP access from **each** web copy using its deployed
   `REDIS_URL`; a container on the resource/shared-data/proxy network must not
   reach either Redis address. Record restart/recreation persistence and
   dev/main credential isolation evidence on #455 before closing rollout.
4. The #413 implementer owns client-level validation of the required URL/prefix,
   per-copy authenticated connections and bounded outage/recovery behavior;
   SAD executes those acceptance checks during #413 rollout. See
   [#413 acceptance criteria](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/413).
   The startup health gate stays mandatory until that failure policy has been
   reviewed; a later Redis failure does not automatically restart web.

Do not print passwords, full connection URLs or container environments in tickets.

## Off-season lifecycle (SAD)

SAD owns shutdown/resume for **both** Coolify resources. After the event:

1. Disable flows that depend on Redis or stop web copies first. Once #413
   lands, use its documented off-season mode; do not leave distributed
   limiters pointing at a stopped service or silently switch to per-process
   allowances. The current app has no Redis caller yet.
2. Disable automatic deployments/restarts in Coolify for the stopped
   resources. A push, webhook, redeploy or `compose up` can undo manual stop.
3. Stop Redis gracefully through Coolify, or run
   `docker compose stop redis` using the resource's generated Compose file.
   Verify its container is stopped in both resources. Retain `redis_data`;
   never use `down -v`, delete volumes, or stop shared PostgreSQL/MinIO.

Before the next event, SAD starts Redis in `dev`, verifies health/persistence
and network isolation, then repeats in `main`. Resume web flows only after
Redis passes checks; restore deployment automation afterwards. Expired keys
stay expired on resume. If a new namespace is needed, coordinate prefix
changes across every web copy; never flush another environment's keys.
