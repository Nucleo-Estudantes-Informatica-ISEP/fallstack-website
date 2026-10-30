# Redis in Coolify

Each environment (`dev`, `main`) has its own standalone Redis database resource
in its own Coolify destination. The app Compose file does not define Redis. See
[ADR 0021](../decisions/0021-standalone-redis-per-environment.md).

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

### Pre-merge rollout gate

A merge can trigger a deployment, and a deployment without these values fails
for the whole stack, including migrations and `web`. For each environment,
complete all of these **before** merging or triggering a deployment:

1. The standalone Redis resource exists, is running and passes the
   [verification](#verification) below.
2. `REDIS_URL`, `REDIS_NETWORK_NAME` and `REDIS_KEY_PREFIX` are set on the web
   resource, runtime-only.
3. `docker compose config --quiet` renders the web Compose file with those
   values.
4. Record the evidence on the rollout issue. Merge to `dev` first and verify
   `dev` before promoting to `main`.

Configure the Redis resource:

- Do not enable "Make it publicly available". Publish no port or domain.
- Create it in a dedicated destination. Do not attach other applications to
  that destination.
- Pin the image to a Redis 7.4 patch tag.
- Set a 256 MiB memory limit and a persistent volume mounted at `/data`.
- Do not set `--label` or `--health-cmd` in Custom Docker Options. Coolify
  v4.5.0 silently drops both, and its generated healthcheck is
  `redis-cli ping` without authentication, which exits 0 on `NOAUTH`. The
  Coolify environment must be named `development` for `dev` and `production`
  for `main`; Telegraf and the probe read that label.
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

## Health probe

Authenticated health comes from a host-side timer, not from Coolify. Install it
once on the Docker host that runs the Redis resources:

```bash
sudo mkdir -p /opt/fallstack/monitoring /var/lib/fallstack-probes /etc/fallstack
sudo install -m 755 monitoring/redis-probe.sh /opt/fallstack/monitoring/
sudo install -m 644 monitoring/redis-probe.service monitoring/redis-probe.timer \
  /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now redis-probe.timer
```

Create the root-owned `/etc/fallstack/redis-probe.env` (mode 600) with
`REDIS_DEV_CONTAINER` and `REDIS_MAIN_CONTAINER` set to the Coolify resource
UUIDs, which are the container names. Set the same UUIDs as
`METRICS_REDIS_DEV_CONTAINER` and `METRICS_REDIS_MAIN_CONTAINER` in
`monitoring/.env`, then restart Telegraf. Update both files whenever a Redis
resource is recreated.

Every 15 seconds it runs `PING` with each container's own `REDIS_PASSWORD`
inside the container and writes `/var/lib/fallstack-probes/redis.influx`. The
password never leaves Redis. Telegraf mounts that directory read-only.
`FallstackRedisUnhealthy` fires on `healthy=0`, and `FallstackRedisProbeStale`
fires if the timer stops. The probe does not depend on Telegraf, so
`FallstackRedisDockerMetricsMissing` fires when an environment has no Redis
Docker series, for example after a wrong `METRICS_REDIS_*_CONTAINER` value or a
changed Coolify label, even while the probe stays healthy.

Negative check on `dev`, after any change to the probe:

```bash
docker exec <redis-container> sh -c \
  'REDISCLI_AUTH=wrong redis-cli ping | grep -q PONG; echo $?'
# Expected: 1
```

## Verification

Run on the Docker host for each environment. Type the password into
`redis-cli` so it stays out of shell history.

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | grep <redis-container>
# Expected: 6379/tcp only, no 0.0.0.0: or :::
docker inspect <redis-container> --format '{{json .Mounts}}'
# Expected: a volume mounted at /data
docker inspect <redis-container> --format '{{json .Config.Labels}}'
# Expected: coolify.database.subType=standalone-redis and coolify.environmentName
cat /var/lib/fallstack-probes/redis.influx
# Expected: a line with environment=<dev|main> and healthy=1i
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
