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

| Dependency      | Probe                                                                        | Scope                                                           |
| --------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| PostgreSQL      | `SELECT 1` through the dedicated one-slot probe pool and runtime credentials | Connection acquisition and query execution; no application data |
| Redis           | Authenticated `PING` through `REDIS_URL`, requiring exact `PONG`             | Network and credentials from this web copy                      |
| MinIO           | HTTP 200 from `/minio/health/ready`                                          | Storage server readiness                                        |
| AuthNEI/ZITADEL | HTTP 200 from `/debug/ready` on `AUTH_ISSUER_URL`                            | Identity provider readiness                                     |

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
Docker liveness. Under #458 (ADR 0027), proxy removal of unready copies and
shutdown draining are wired: Traefik's loadbalancer healthcheck monitors `/api/proxy-ready`
on port 4000, which returns 200 during normal execution and 503 during graceful
shutdown. This ensures stopping copies get no traffic from the proxy, while protecting
single-replica environments from total blackouts during third-party dependency hiccups.
Deep infrastructure readiness is exposed at `/api/ready` for metrics, dashboards,
and operators. When a web copy receives SIGTERM/SIGINT, it marks itself unready
immediately across both probes, injects `Connection: close` into response headers, and
finishes active requests first before terminating cleanly within Docker's 90-second
stop grace period (accounting for the 10-second deregistration grace delay, 65-second drain, and 10-second cleanup margin).

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
