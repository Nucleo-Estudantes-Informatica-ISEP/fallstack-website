# 0024: Separate liveness and dependency readiness

Status: Accepted
Date: 2026-10-30
Source: [Dependency readiness and Redis probes #520](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/520), related to [#458](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/458)

## Context

The web Docker healthcheck uses `/api/health`, which only proves that Next.js
can answer a request. A dependency outage can leave it green while user flows
fail. Restarting all copies during a shared database, storage or identity outage
does not repair the dependency. Standalone Redis also needs an authenticated
probe because Coolify's generated bare `redis-cli ping` can exit zero on NOAUTH.

## Decision

Keep `/api/health` and Docker liveness unchanged. Add session-free `/api/ready`
for PostgreSQL, configured Redis, MinIO and AuthNEI with a two-second response
deadline, shared concurrent work and five-second per-process cache.
An unsuccessful dependency produces a generic 503 with no sensitive diagnostics.
Retain stalled driver work until settled so repeated probes do not accumulate
queries or connections. Readiness is an observation, not a trigger to restart
web during a dependency outage.

The deadline aborts HTTP and Redis I/O, but does not cancel a Prisma transaction.
The database probe relies on Prisma transaction and PostgreSQL statement timeouts.
If the driver never settles, readiness remains false until it settles or the
process restarts; retaining that work prevents repeated requests from creating
more stuck transactions.

Use the app's PostgreSQL pool for a bounded `SELECT 1`, an authenticated Redis
PING with exact PONG, and lightweight MinIO/ZITADEL readiness endpoints. Redis
probe sockets close after every attempt and do not retry. Add optional
`REDIS_URL` validation to `serverEnv` now that readiness consumes it; the
ADR 0021 exception continues only for the unconsumed key prefix and Compose-only
network name. Native development can omit unused Redis; Compose requires its URL.

Retain the ADR 0021 host timer workaround for standalone Redis and tighten it
to require successful CLI execution and an exact PONG. Coolify v4.5.3 still
does not map `--health-cmd` in its custom Docker option converter; saving that
option does not establish an authenticated Docker healthcheck.

## Consequences

Operators can distinguish a live process from unavailable dependencies without
logging credentials or tying liveness to shared services. Results may lag an
outage or recovery by five seconds. Readiness checks service availability, not
bucket access, schema compatibility, full login or application correctness.

No proxy readiness wiring, shutdown draining or restart watchdog is introduced.
Those parts of #458/#419 remain separate work. Main receives this behavior only
after the normal release promotion. Host probe installation remains an operator
step; changing the repository script does not update an installed timer.
Before routing traffic based on readiness, #458 must decide which dependencies
gate traffic and how to avoid removing every copy during a shared outage or
application pool saturation.
