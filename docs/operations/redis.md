# Redis in Coolify

Each environment (`dev`, `main`) has its own standalone Redis database resource
in its own Coolify destination. The app Compose file does not define Redis. See
[ADR 0020](../decisions/0020-standalone-redis-per-environment.md).

## Configuration

Set these **runtime-only** values in each web resource, with **Available at
Buildtime** disabled:

| Variable             | Value                                                    |
| -------------------- | -------------------------------------------------------- |
| `REDIS_URL`          | `redis://default:<password>@<redis-container-name>:6379` |
| `REDIS_NETWORK_NAME` | Docker network name of this environment's Redis network  |
| `REDIS_KEY_PREFIX`   | `fallstack:dev:` for `dev`, `fallstack:main:` for `main` |

Missing any of them makes Compose interpolation fail for the whole stack. Use a
different password and network for each environment. Keep passwords out of
Git, build arguments, logs, tickets and `NEXT_PUBLIC_*` variables.

Configure the Redis resource:

- Do not enable "Make it publicly available". Publish no port or domain.
- Create it in a dedicated destination. Do not attach other applications to
  that destination.
- Pin the image to a Redis 7.4 patch tag.
- Set a 256 MiB memory limit and a persistent volume mounted at `/data`.
- Set Custom Docker Options so Telegraf collects it
  (`main` on the production Redis):

  ```
  --label metrics_environment=dev --label metrics_service=redis
  ```

- Use this `redis.conf`:

  ```
  maxmemory 96mb
  maxmemory-policy noeviction
  appendonly yes
  appendfsync everysec
  save ""
  ```

Only `web` joins the external `redis_shared` network. Do not use "Connect to
Predefined Network" on the web resource for this.

## Verification

Run on the Docker host for each environment. Type the password into
`redis-cli` so it stays out of shell history.

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | grep <redis-container>
# Expected: 6379/tcp only, no 0.0.0.0: or :::
docker inspect <redis-container> --format '{{json .Mounts}}'
# Expected: a volume mounted at /data
docker inspect <redis-container> --format '{{json .Config.Labels}}'
# Expected: metrics_environment and metrics_service=redis
docker run --rm -it --network <redis-network> \
  redis:7.4-alpine redis-cli -h <redis-container>
# Type: AUTH <password>   then: PING   Expected: OK, PONG
```

Inside the Redis container, `CONFIG GET` must return `maxmemory 100663296`,
`maxmemory-policy noeviction`, `appendonly yes`, `appendfsync everysec` and an
empty `save`. `INFO persistence` must show `aof_enabled:1` and
`aof_last_write_status:ok`.

After deploying web, confirm it can reach Redis with its deployed `REDIS_URL`.
A container on another destination must not resolve or reach the Redis host.
Record the evidence on the rollout issue. Do not print passwords or full
connection URLs.

## Upgrades

SAD owns updates.

1. Review upstream release notes and support status for the new patch tag.
2. Stop dependent web flows and Redis gracefully. Back up the whole `/data`
   volume, including `appendonlydir` and its manifest.
3. Change the image tag on `dev` first. Verify authentication, AOF status and
   unexpired key and TTL survival, then repeat on `main`.
4. To roll back, stop flows and Redis, restore the backup, then start the
   previous tag. Older Redis may not read files rewritten by newer versions.
   Writes after the backup are lost. Never flush coordination keys to work
   around an upgrade issue.

## Restart, persistence and capacity

- AOF with `appendfsync everysec` keeps keys and their absolute TTLs across
  restarts. A host crash can lose about one second of writes.
- Redis holds short-lived coordination state only, never student, account or
  Wallet data. One Redis per environment is not HA. Volume or host loss loses
  its state. Do not delete the volume on redeploy.
- The dataset limit is 96 MiB with `noeviction`; at capacity writes fail
  instead of evicting limiter keys. The container limit is 256 MiB for AOF
  buffers and rewrite copy-on-write. SAD monitors memory, disk space and
  health. #413 must handle write errors and define the acceptable outage
  budget.

## Off-season lifecycle (SAD)

After the event, for both environments:

1. Stop web copies or disable flows that depend on Redis first.
2. Disable automatic deployments in Coolify for the stopped resources.
3. Stop the Redis resource gracefully. Keep its volume. Do not delete it or
   stop shared PostgreSQL or MinIO.

Before the next event, start Redis in `dev`, run the verification above, then
repeat in `main`. Resume web only after Redis passes. Expired keys stay
expired. If you change the key prefix, change it on every web copy.
