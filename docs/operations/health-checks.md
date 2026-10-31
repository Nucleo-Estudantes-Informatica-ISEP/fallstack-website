# Fallstack health checks

## Liveness and restart decisions

`GET /api/health` returns HTTP 200 and `{ "status": 200 }` when the Next.js
process can answer requests. The web Dockerfile uses this endpoint every
30 seconds with a three-second timeout, three retries and a five-second start
period. Keep it as the process signal for any future restart watchdog.
Dependency outages must not restart every web copy in a loop.

Docker's `unless-stopped` policy handles exited processes. A failed Docker
healthcheck alone does not restart a container. No watchdog is installed by
this change.

## Dependency readiness

`GET /api/ready` returns HTTP 200 and `{ "status": "ready" }` only when all
configured probes pass. Otherwise it returns HTTP 503 and
`{ "error": "Service unavailable" }`. Responses include `Cache-Control:
no-store`; the endpoint does not resolve a session or expose errors,
connection strings or dependency addresses.

Probes run concurrently with a two-second response deadline:

| Dependency      | Probe                                                            | Scope                                                           |
| --------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| PostgreSQL      | `SELECT 1` through the app's Prisma pool and credentials         | Connection acquisition and query execution; no application data |
| Redis           | Authenticated `PING` through `REDIS_URL`, requiring exact `PONG` | Network and credentials from this web copy                      |
| MinIO           | HTTP 200 from `/minio/health/ready`                              | Storage server readiness                                        |
| AuthNEI/ZITADEL | HTTP 200 from `/debug/ready` on `AUTH_ISSUER_URL`                | Identity provider readiness                                     |

PostgreSQL uses a 500 ms transaction-acquisition timeout, 1500 ms transaction
timeout and 1000 ms local statement timeout. The outer deadline does not cancel
the Prisma transaction; if the driver wedges beyond those limits, readiness stays
false until it settles or the process restarts. HTTP requests abort at the
response deadline; Redis destroys its socket and disables reconnect/offline queues.
Concurrent requests share probes; results are cached for five seconds per
process. If a driver has not settled after the response deadline, new requests
remain unready without accumulating more work until that attempt settles.

`REDIS_URL` accepts `redis://` and `rediss://` URLs and is validated lazily and independently by
the Redis readiness probe. It is optional for native development while Redis is unused in
request flows. Compose already requires it, so deployed dev resources and clones
probe their configured Redis. Readiness sends no writes or key commands.
#413 still owns shared limiter behavior and key-prefix validation.

These probes do not prove bucket permissions, database migrations, usable
application content, a complete login or end-to-end browser behavior. Keep
staging smoke tests for those flows. Dependency readiness stays separate from
Docker liveness; proxy removal of unready copies and shutdown draining remain
under #458/#419. Do not claim automatic traffic removal from this endpoint alone.
Before enabling proxy removal, #458 must decide dependency gates and pool budget
to avoid removing every copy during a shared outage or saturation.

## Verify and roll out

1. Run `pnpm dev`, then request `/api/health` and `/api/ready`. Liveness must
   retain its existing body. With all local dependencies ready, readiness
   returns 200; with a missing dependency it returns 503 within two seconds
   after compilation, allowing five seconds for the previous result to expire.
2. Use disposable local/staging dependencies to reject credentials, stop a
   dependency and simulate a nonresponsive connection. Confirm bounded 503
   responses while liveness stays 200. Restore the dependency and verify
   readiness recovers after the cache expires. Do not interrupt shared services.
3. Merge/deploy to `dev` through the usual workflow. Verify migration success,
   then request readiness from each app copy. Promote through the release PR
   before expecting this endpoint in `main`.
4. For standalone Redis, install the updated
   [host probe](../../monitoring/redis-probe.sh) using the
   [Redis runbook](redis.md#health-probe). Its authenticated result, not Coolify's
   default green status, is the health signal. No Redis restart or data change
   is required to replace the host script.

`bash tests/e2e/redis-probe.sh` exercises the real host script with disposable
CLI fixtures: authentication, exact PONG, NOAUTH, misleading PONG substrings,
extra output and command failures. No Docker daemon or live credentials are
needed. CI runs it in the normal quality job.
