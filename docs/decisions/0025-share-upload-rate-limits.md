# 0025: Share upload rate limits across web copies

Status: Accepted
Date: 2026-11-02
Source: [Issue #413](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/413)

## Context

CV/avatar uploads each accept five requests per authenticated student per
60-second window. Process-local maps multiply that allowance with every web
copy. Redis is already provided by [ADR 0021](0021-standalone-redis-per-environment.md);
PostgreSQL need not take coordination writes or gain a new table. The existing
`@redis/client` dependency also serves readiness. No general cache, queue,
database migration or global Next.js cache is required.

## Decision

Use one short Redis Lua script to read/create/increment an endpoint-specific
counter and read its remaining TTL atomically. The first accepted request starts
a 60-second fixed window; accepted requests increment up to five, including
requests whose file later fails validation/storage. Denials neither increment nor
refresh TTL. Keep the accepted adjacent-window burst of five on either side;
do not adopt token buckets, sliding windows or calendar-aligned windows.
Redis expiry is the clock authority. Return 429 with the existing JSON and
`Retry-After = ceil(remainingTTL / 1000)`, at least one second on a denial.

Keys are `<REDIS_KEY_PREFIX>ratelimit:v1:<endpoint>:<sha256(userId)>`.
They exclude deployment-copy IDs so all copies share budgets. CV/avatar and
users are independent; environment prefixes are `fallstack:dev:` and
`fallstack:main:`. Native development/tests use `fallstack:local:`/`fallstack:test:`.
Hashes are coordination keys, not anonymous telemetry, and are never logged.

The application service depends on a small asynchronous store interface.
The repository owns Redis I/O and the script; routes await the service after
authentication and before consuming multipart bodies. Keep one lazy shared
limiter client/service per Node runtime. Reuse the existing private metrics
listener; it records decisions, latency, error classes and state transitions
without user/key/request labels.

Bound TCP connection establishment to 200ms and the complete limiter operation,
including authentication and command response, to 300ms. Disable automatic
reconnect, command retries and offline queuing. At most 128 checks can be pending
per process. A failed/timed-out check closes that connection, rejects pending
checks and suppresses reconnect attempts for one second. After cooldown the
next request starts one shared connection attempt. Never replay ambiguous EVALs:
they may already have consumed capacity. Saturation rejects new checks without
discarding a healthy connection.

Fail closed with `{ error: "Rate limiter unavailable" }`, status 503 and
`Retry-After: 1` on missing configuration, Redis errors, timeouts or admission
saturation. There is no local fallback: **zero upload requests are admitted by
fallback across any number of copies**. Requests already admitted before an
outage can finish. A lost reply can conservatively consume capacity despite
the request receiving 503. Recovery preserves Redis's existing counters/TTLs.
Liveness stays independent; readiness remains an observational authenticated
PING and does not exercise script permissions or write capacity.

Validate connection URL/prefix through `serverEnv` when consumed, using shared
server-only Redis schemas. Both fields stay optional at general schema level
for builds/non-web workers, but uploads require the pair. An explicitly invalid
value fails server configuration validation. Readiness still validates its URL
independently. Require a host/password, accept only redis/rediss, and reject URL
options/fragments. `rediss` explicitly verifies certificates and hostnames;
private CAs use Node's startup `NODE_EXTRA_CA_CERTS`. Cleartext connections are
limited operationally to loopback or the authenticated private Docker bridge.
Production-runtime prefixes must be dev/main and match `METRICS_ENVIRONMENT`
when supplied. NODE_ENV cannot distinguish Coolify environments; SAD must verify
the correct prefix, network and resource on every copy.

## Consequences

Uploads depend on Redis availability. Missing credentials, NOAUTH, TLS errors,
noeviction/OOM and disk/write failures deny traffic rather than inflate budgets.
The 300ms deadline bounds limiter I/O, not session lookup, body upload or storage.
Event-loop scheduling can add delay; integration tests allow scheduling slack.

Keep ADR 0021's AOF/everysec, noeviction and persistent-volume settings. Web
restarts retain budgets. Graceful Redis restarts retain unexpired keys and TTLs;
host crashes can lose about one second of writes. One loss of an endpoint/user
counter can grant up to five extra admissions during its former window, shared
across all copies; repeated state losses repeat that risk. This is not durable
abuse accounting or HA. After suspected persistence/volume loss or prefix
changes, quiesce uploads on **all** copies for at least 60 seconds before resume.
Never automatically flush/recreate keys as a recovery strategy.

Employee preview issuance remains under [ADR 0014](0014-bound-student-token-verification.md)
and #393's separately owned policy. Its local reservation/refund and per-employee
serialization are not equivalent to upload counting. That endpoint remains
process-local and is not made distributed by this change; coordinate a separate
adoption review before claiming cross-copy security for preview issuance.

SAD must record authenticated per-copy access, environment isolation and
outage/recovery evidence before routing traffic to this implementation in either
Coolify environment. Drain old map-based copies during cutover; mixed versions
cannot share a strict allowance. See the [Redis runbook](../operations/redis.md).
