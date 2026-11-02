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

Missing `REDIS_URL` or `REDIS_KEY_PREFIX` makes Compose interpolation fail for
the whole stack. Coolify rejects `:?` in network names, so a missing
`REDIS_NETWORK_NAME` falls back to the sentinel `redis_network_name_not_set` and
the deployment fails because that external network does not exist. Use a
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
   values, and `docker compose config` shows your network name, not
   `redis_network_name_not_set`.
4. Record the evidence on the rollout issue. Merge to `dev` first and verify
   `dev` before promoting to `main`.

Configure the Redis resource:

- Do not enable "Make it publicly available". Publish no port or domain.
- Create it in a dedicated destination. Do not attach other applications to
  that destination.
- Pin the image to a Redis 7.4 patch tag.
- Set a 256 MiB memory limit and a persistent volume mounted at `/data`.
- Do not set `--label` or `--health-cmd` in Custom Docker Options. Coolify
  v4.5.0 and v4.5.3 drop both, and its generated healthcheck is
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
inside the container, requires a successful command and exact `PONG`, and
writes `/var/lib/fallstack-probes/redis.influx`. The
password never leaves Redis. Telegraf mounts that directory read-only.
`FallstackRedisUnhealthy` fires on `healthy=0`, and `FallstackRedisProbeStale`
fires if the timer stops. The probe does not depend on Telegraf, so
`FallstackRedisDockerMetricsMissing` fires when an environment has no Redis
Docker series, for example after a wrong `METRICS_REDIS_*_CONTAINER` value or a
changed Coolify label, even while the probe stays healthy.

Negative check on `dev`, after any change to the probe:

```bash
docker exec <redis-container> sh -c \
  'reply=$(REDISCLI_AUTH=wrong redis-cli --raw -e ping) && [ "$reply" = PONG ]; echo $?'
# Expected: 1
```

Replacing `monitoring/redis-probe.sh` at its installed path updates the next
timer run without restarting Redis. Verify fresh timestamps and `healthy=1i`
in the probe output after installation. `/api/ready` also probes authenticated
access from each web copy; see [health checks](health-checks.md). This does not
replace the host probe for Redis lifecycle and monitoring.

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

## Shared upload limits (#413)

CV/avatar each consume five accepted checks per authenticated student per
60-second window, shared by all web copies. Windows start at the first request;
429 uses the remaining TTL rounded up in `Retry-After`. Rejected requests never
extend the window. File validation/storage failures still consume a check.
Employee preview issuance remains process-local under #393/ADR 0014; coordinate
its separate adoption before claiming distributed preview protection.

The server-only schema validates authenticated redis/rediss URLs and explicit
prefixes. Only `fallstack:dev:`/`fallstack:main:` are accepted by deployed web
flows. They must match `METRICS_ENVIRONMENT` when it is set. Native development
uses `fallstack:local:`; automated tests use `fallstack:test:`. Non-web workers
and builds need no connection. Limited uploads require both variables; missing
configuration returns 503. Explicitly invalid values fail `serverEnv` validation.
Never add per-copy IDs or change the prefix to escape an exhausted allowance.

`redis://` is permitted only on the private bridge/loopback. For encrypted
connections use `rediss://`; certificate/hostname verification is enforced.
Provide private CA trust with a read-only CA file and `NODE_EXTRA_CA_CERTS` at
Node startup. No insecure TLS switch or URL query option is supported. Keep the
existing standalone resource/network; do not reintroduce an in-stack Redis.

The limiter has a 200ms connection timeout and 300ms total operation deadline
including authentication/command replies. There are no command retries,
automatic reconnects or offline command queues. One connection attempt is shared
by concurrent callers, with at most 128 pending checks per process. A failed
connection is destroyed; the next connection attempt is allowed after a
one-second cooldown. Saturation rejects excess requests. All these failures
return 503, `{ error: "Rate limiter unavailable" }`, and `Retry-After: 1` before
reading/writing the upload. **No fallback upload capacity is granted**, regardless
of replica count. Already admitted uploads may finish; a lost Redis reply can
consume an allowance even when the app returns 503. Never replay that operation.

### Observe and troubleshoot

Use the existing private `:9464/metrics` listener with `METRICS_ENABLED=true`.
`environment`, `service`, and collector `copy` identify the deployment; limiter
labels are fixed endpoint/outcome/reason values only.

- 429s: `sum by (environment, endpoint) (increase(fallstack_rate_limit_requests_total{outcome="limited"}[5m]))`.
- Failure counts: `sum by (environment, reason) (increase(fallstack_rate_limit_requests_total{outcome="unavailable"}[5m]))`.
- p95: `histogram_quantile(0.95, sum by (environment, le) (rate(fallstack_rate_limit_duration_seconds_bucket[5m])))`.
- `fallstack_rate_limit_degraded` records the last observed unavailable/recovered
  state; it updates on upload checks, not background probes.
- `fallstack_rate_limit_transitions_total{state="degraded"|"recovered"}` and
  sanitized `rate_limit.degraded`/`rate_limit.recovered` log events show transitions.
  No keys, identities, hashes, cookies, connection URLs or tokens are logged.

`FallstackSharedLimiterDegraded` alerts after one minute degraded;
`FallstackSharedLimiterSlow` alerts when p95 exceeds 200ms for five minutes.
After repairing Redis, make a synthetic upload check to verify recovery and
clear the last-observed gauge. PING readiness alone cannot prove write/script
permissions or recovery of the actual limiter client.

For 503s check private network attachment/DNS, saved credentials, TLS trust,
script/GET/SET/INCR/PTTL permissions, Redis noeviction capacity, AOF write status
and disk space. A 429 is allowance exhaustion, not an infrastructure error.
Do not flush keys, disable TLS verification or deploy a local-map fallback.
Graceful web restarts preserve counters. Redis graceful restart retains keys
and expiry with AOF. After suspected AOF/volume loss, prefix changes or restoring
an older backup, stop uploads on every copy for at least 60 seconds before
resuming. A crash can lose roughly one second of writes, admitting up to five
extra requests per affected user/endpoint per state-loss event; repeated losses
repeat that risk. The limiter is not durable abuse accounting.

### Enablement evidence (SAD)

This implementation activates on deployment; there is no permissive fallback
flag. Before merging/deploying into each environment, stage a candidate web copy
without public traffic and verify authenticated access with the exact runtime
URL/prefix/network. Record copy names, commit, Redis settings, timestamps and
sanitized status/latency results on #413. Never publish credentials/session data.

1. Verify **every** candidate web copy in dev, then main, with authenticated
   `/api/ready` and a synthetic upload check. PING is necessary, not sufficient.
2. Alternate and concurrently send the same synthetic student's requests across
   at least two copies: exactly five admissions total, then 429/Retry-After.
   Confirm another endpoint/student/environment is independent.
3. On isolated staging, pause/stop Redis: all affected upload checks must return
   bounded 503, no storage writes and no budget inflation. Restore Redis and
   record recovery with the pre-existing allowance. Check telemetry and alerts.
4. Verify AOF settings and graceful restart/expiry retention. Complete the
   normal-paced upload/preview-scan scenario in
   [limiter validation](../rate-limiter-load-validation.md); no local result is
   evidence of Coolify throughput or authenticated scan usability.
5. Drain old map-based copies, quiesce uploads for 60 seconds, then route only
   the shared-limiter version. Mixed versions do not enforce one budget.
   Rollback requires stopping/quiescing flows first; do not route multiple
   replicas to the older local-map limiter. Keep the existing #419 scaling gate.

Off-season: stop dependent web flows/copies and automatic deployments first,
then stop Redis gracefully while preserving `/data`. Resume Redis, verify access
and AOF/expiry on all candidate copies, then resume traffic. Expired keys stay
expired. No live Coolify evidence is supplied by repository tests.
