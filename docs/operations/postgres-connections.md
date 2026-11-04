# PostgreSQL connection budget

Scope: [#414](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/414).
Decision: [ADR 0026](../decisions/0026-bound-runtime-postgres-pools.md).
This is a connection ceiling, not event-capacity approval (#411) or permission
to scale Coolify (#419). No production PostgreSQL configuration was changed.

## Inventory and budget

Keep per-consumer names, hostnames, observed connection counts and negotiated
allowances in the private operator inventory, not this public repository.
Repeat the [read-only inventory SQL](../../scripts/postgres-connections.sql)
through an authorized monitoring session before each rollout; retain its output
privately. Do not print database URLs or container environments. Observed idle
counts are not pool maxima or agreements about peak use.

For the **whole shared PostgreSQL cluster**, require:

```text
sum(web processes per resource × (request pool + readiness pool))
+ sum(cleanup processes per resource × cleanup pool)
+ additional rollout web processes × (request pool + readiness pool)
+ other transient jobs/probes
+ other applications' privately agreed connection allowance
+ ordinary administration/migration reserve
<= max_connections - superuser_reserved_connections - reserved_connections
```

Example capacity: 100 maximum slots minus 3 superuser-reserved slots and zero
other reserved slots leaves 97 ordinary slots. Keep 6 ordinary slots for
administration/migration, separate from emergency superuser access. These
reserve numbers are not permission to consume another application's capacity.

Selected per-process ceilings: web requests **3**, web readiness **1**, cleanup
**1**, standalone seed/wipe/test fixture clients **1** each. A web copy therefore
costs **4** slots, including every extra rollout copy. The readiness client is
lazy but its full capacity must always be reserved. Inventory every environment,
resource, job and rollout overlap; compare the formula with the private agreed
allowances before deploying. No role quota enforces another team's allowance.

Checked-in web/migrate/cleanup replicas remain literal `1`. Scaling is not
enabled by this budget: #411 must establish workload capacity and #419 must
verify rollout behavior. Serialize rollouts to stay within the private budget.
Cleanup overlap is **zero**: stop/drain the old owner before replacement, as in
the [release-worker runbook](release-workers.md). Do not run concurrent cleanup
`apply` owners against the same database. New jobs/resources require recalculation.

Prisma 6's default Rust-engine pool is physical CPUs × 2 + 1 per process and
grows lazily. CPU quotas alone do not reliably size it. Inspect pool startup
logs in isolation and use explicit ceilings rather than idle snapshots.

## Runtime and deployment settings

`PRISMA_CONNECTION_LIMIT` defaults to **3**, validated integer **1–3**.
`PRISMA_POOL_TIMEOUT_SECONDS` defaults to **5**, validated integer **1–10**;
zero/infinite waits are rejected. `runtimeDatabaseUrl` sets these authoritative
Prisma URL parameters while retaining runtime identity, schema, TLS and other
parameters. Old URL `connection_limit`/`pool_timeout` values are replaced,
including duplicates. Never log the resulting URL.

Compose pins cleanup to **1 / 5s**, web uses the validated settings above.
Seed, wipe and direct test fixture clients use `singleConnectionDatabaseUrl`,
which pins capacity to **1 / 5s** regardless of web settings or URL overrides.
Standalone/manual cleanup importing the request singleton must still set
`PRISMA_CONNECTION_LIMIT=1`; count every separate client in the budget. The cleanup image copies the narrow DB schema; it needs no OIDC
secrets. The environment example and lazy server schema expose both settings.

`DIRECT_URL` remains the migration identity and direct PostgreSQL endpoint.
The runtime helper never reads or rewrites it. Only the migrator receives its
credentials; web/cleanup retain their runtime-identity override. No new grants,
role limits, PostgreSQL settings, migration or pooler are required.

Readiness uses a separate, one-connection runtime-identity client with the same
bounded transaction/statement timeouts. Saturated request slots do not prevent
its dependency query; this does not prove request capacity. Docker liveness
continues to use `/api/health`, not `/api/ready`. This repository introduces no
readiness-driven routing or restart rule (ADR 0024); the deployed platform's
configuration must be verified separately before wiring readiness into routing.

## Workload, measurements and repeat checks

- Cleanup (#389/#402) holds one connection for its transaction; S3 calls happen
  outside that transaction. Apply mode takes table locks with a **5s** lock
  timeout. Count daemon pools even when idle and budget manual jobs separately.
- In this revision, `createGoogleWalletSaveUrl` in `googleWalletService.ts`
  calls `withLockedUser` around `syncGenericObject`; the helper in
  `userRepository.ts` opens a Prisma transaction with a **60s** timeout.
  This code is already present; no prerequisite Wallet branch is assumed.
  Wallet (#394/#403) holds one interactive transaction across external Google
  I/O to preserve issuance/deletion ordering. Each fetch has a **10s** timeout;
  multiple sequential calls can occupy the connection until the transaction's
  **60s** deadline. Transaction admission has Prisma's separate default
  **2s maxWait**; URL `pool_timeout` does not replace that timeout. Same-user
  advisory admission returns 429. Process-wide admission also limits combined
  issuance/deletion to request pool size minus one, returning 429 before DB
  access when full. The default pool admits two operations and leaves one
  connection for other requests even during slow Google I/O. A two-slot pool
  admits one operation; a one-slot pool admits none. Configure at least two
  slots for Wallet issuance/deletion. This reserves capacity, not a latency SLA.
- Do not increase timeouts/pools to hide `P2024` or transaction-acquisition
  failures. Reduce admitted Wallet concurrency or use #411 workload evidence to
  review the budget. A three-slot pool is a bounded safety setting, not proof
  of acceptable event latency.

Use `scripts/check-postgres-pools.mjs` with installed/generated Prisma 6.19.3,
only on an empty disposable database named `pool_test`. It fails closed unless
`CONFIRM_ISOLATED_POOL_TEST=yes` and the host is loopback or an explicitly allowed disposable container hostname
(`POOL_TEST_ALLOWED_HOST`). Set that variable to the exact task-owned hostname
only when loopback is unavailable; it does not establish database isolation. It creates/drops one audit table; never use a restored/live database.
For native testing, use the isolated PostgreSQL port:

```sh
POOL_TEST_DATABASE_URL='postgresql://postgres:TEST_PASSWORD@127.0.0.1:15414/pool_test' \
CONFIRM_ISOLATED_POOL_TEST=yes node scripts/check-postgres-pools.mjs
```

The assert-based harness uses two web processes (3 slots each), one cleanup
process (1), then an overlapping web process (3). It records active/idle samples,
controlled query/queue latency and expected saturation errors, then sends
SIGTERM while each process holds a two-second transaction simulating external
I/O. All four transactions must commit and tagged connections return to zero.
Use Docker stats/host memory-pressure tools alongside it; do not infer host
resource use from one Node process. Existing
[HTTP/dependency telemetry](capacity-metrics.md) complements these checks but
has no native Prisma pool-wait gauge; the harness queue estimate is end-to-end
query latency minus its controlled 50ms SQL sleep, not a production pool metric.

Initial isolated run on the deployed six-CPU host / Prisma 6.19.3:

- **56 normal queries**, zero errors, p95 **448ms**, maximum estimated queue
  overhead **404ms** at eight queries per slot (deliberate queuing).
- **Six expected P2024** errors when two excess queries per process wait behind
  six-second holders with the selected five-second pool timeout.
- **80 overlap queries**; peak **10 connections**, **10 active**, **8 idle**
  across 96 samples. Idle-in-transaction state appeared during simulated I/O.
- SIGTERM allowed **four commits**, then **zero tagged connections**; no stranded
  transactions. Monitor's single connection is separate and is disconnected too.
- During the run, Docker sample: harness **3.99% CPU / 79.27 MiB**, isolated
  PostgreSQL **0.52% CPU / 55.32 MiB**. Host available RAM **7,046 MiB**;
  instantaneous swap-in/out **0/0**. These are samples, not measured peaks.

Final source verification:

- Source harness over the Mac's SSH tunnel: **56 successful normal queries**,
  p95 **833ms**, engine-reported SQL maximum **120ms** for the controlled 50ms
  query; maximum queue/network/client overhead estimate **834ms**. Six expected
  P2024 errors, 80 overlap queries, peak 10 connections, four drain commits and
  zero remaining tagged connections. These tunnel measurements are not event
  host latency targets. CI repeats the assert-based harness on its isolated DB.
- Built production Next.js 15.5.28 runner and non-root migrator/cleanup images.
  Applied all **26 migrations** to a new `drain_test` DB through a dedicated
  migrator identity while `DATABASE_URL` used a separate runtime identity.
- Actual production Next.js server, two fresh-container cycles: held an
  exclusive `Company` table lock, began public roster HTTP, observed its DB lock
  wait, then sent SIGTERM. Server stayed alive until lock release; each response
  completed **200** with all **15** migration-seeded active companies. Exit 0;
  tagged DB connections returned to **zero**, in **0.814s / 0.834s** after signal.
  This validates Node drain, not live Coolify/Traefik removal ordering.
- Actual cleanup image against isolated PostgreSQL/MinIO: dry run completed,
  **one** idle DB connection observed; SIGTERM exited 0 in **0.355s**, with
  **zero** remaining connections. Task-owned MinIO/worker containers and volumes
  were removed. No shared endpoint or production cleanup action was used.
- `pnpm dev`: homepage **200**, `/api/health` **200** / `{"status":200}`,
  `/api/ready` **503** / `{"error":"Service unavailable"}` with intentionally
  absent S3/Auth dependencies. Runtime logged a **three-connection** pool.
  Dev server auto-restarted at its 2 GiB heap threshold after the homepage;
  probes passed after restart, then the task-owned server was stopped.
- Full suite: **827 tests / 151 files passed** with isolated PostgreSQL/Redis;
  focused environment and safe diagnostic-code tests also passed.

Event HTTP mix, sustained production peak and real Google latency remain
#411/#419 checks; no live load was sent to shared PostgreSQL.

## Draining, alerts and rollback

Before replacing a web copy, remove it from proxy routing, allow routing updates
to propagate and existing requests to finish, then send **SIGTERM to Node**.
Next.js 15.5.28's production server closes its HTTP listener, awaits active
requests/`after` work, then exits. Keep its default signal handling enabled;
do not set `NEXT_MANUAL_SIG_HANDLE` or add an early Prisma-disconnect handler.
Prisma connections close at process exit; the worker explicitly disconnects in
`finally` after stopping/aborting cleanup work. Compose gives both services
**90s** before SIGKILL, covering the existing 60s transaction deadline plus drain margin.
Stop grace does not configure the proxy: verify Coolify/Traefik removal ordering,
request timeout and rollout overlap in staging before #419 scaling. A forced
kill/crash closes sockets and rolls back outstanding transactions; it cannot
promise completion of in-flight requests.

During load/rollout, sample the SQL inventory and Docker stats every 1–5s, plus
HTTP latency/status and acquisition error logs. Pino preserves only allowlisted
`err.databaseErrorCode` values **P2024 / P2028 / P2037** for pool wait,
transaction failure and connection exhaustion; messages, SQL and arbitrary
error codes remain excluded. P2028 also covers transaction timeouts, so correlate
with the observed transaction duration. Check PostgreSQL's own logs for 53300.
Alert/stop conditions:

- **Any unexpected P2024, transaction acquisition failure or SQLSTATE 53300**:
  stop scale-out/load increase, inspect active versus idle consumers and long
  transactions. Investigate queue overhead above **1s p95 for 60s**.
- **80 ordinary client connections** for 60s: warn/reconcile budget. **90** or
  rising toward 97: stop rollout and new load immediately; preserve admin access.
  Treat consumption or rollout overlap above the private agreed budget as a
  budget breach.
- Any idle transaction **over 65s**, surviving connections after **90s** drain,
  forced-kill/OOM, sustained CPU **over 80% of allocated CPU** or memory
  **over 80% of allocation**: fail the run. Existing uncapped containers require
  host pressure/swap monitoring; do not interpret zero configured limits as
  resource headroom. Never benchmark into active host memory pressure.

Roll back by routing to the last healthy copy, draining failed copies and
returning to one web owner per resource; keep cleanup singleton ownership.
Preserve runtime/migration identity separation and finite pool caps. Rolling
back the source change restores CPU-derived pools, so apply equivalent explicit
`connection_limit=3&pool_timeout=5` URL parameters first (cleanup needs 1) or
stop affected resources until the total fits. No PostgreSQL restart, global
`max_connections` increase, blind backend termination or PgBouncer deployment
is part of rollback. Rerun inventory and ensure connections return to baseline.

## Pooler decision

Keep direct PostgreSQL now: bounded pools fit the conditional budget, the
isolated test returns to baseline, and no measured production exhaustion or
cross-team ceiling requires a pooler. Revisit if #411 shows connection churn,
required replicas no longer fit, or other apps consume the allowance. PgBouncer
does not shorten Wallet's open transactions; those occupy a backend throughout.

If selected later, test transaction pooling, interactive transactions, current
transaction-scoped advisory/row/table locks, prepared statements and every
session feature. Session pooling preserves session affinity but does not provide
the same multiplexing. Prisma 6 needs version-appropriate prepared-statement/
`pgbouncer` settings; migrate via direct `DIRECT_URL`, never the transaction
pooler. Require concurrency, migration and drain compatibility evidence in a new
ADR before switching. No untested pooler configuration is supplied here.

References consulted through Context7: [Prisma 6 pool behavior](https://github.com/prisma/web/blob/v6/content/200-orm/200-prisma-client/000-setup-and-configuration/050-databases-connections/115-connection-pool.mdx),
[PostgreSQL 16 reserved connections](https://www.postgresql.org/docs/16/runtime-config-connection.html),
[Next.js 15.5.28 self-hosting](https://github.com/vercel/next.js/blob/v15.5.28/docs/01-app/02-guides/self-hosting.mdx).
