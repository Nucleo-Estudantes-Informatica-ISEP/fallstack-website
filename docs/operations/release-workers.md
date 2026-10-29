# Release migrations and cleanup

Use one Coolify Compose resource per environment, pointing at
`/docker-compose.app.yml`. Web, migration and cleanup have literal
`deploy.replicas: 1`. There is no `WEB_REPLICAS` environment knob; setting a
stale value has no effect. Multiple web copies are **unverified on Coolify**.
Coolify's generated Compose may inject a per-service `container_name`, which
conflicts with Compose scaling; the deployed version's behavior remains
unverified. Support requires a reviewed configuration change under
[#419](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/419)
after the prerequisites in [ADR 0017](../decisions/0017-scale-web-with-singleton-release-jobs.md).

The single `migrate` service runs
`prisma migrate deploy` with no restart, and every new web copy and the single
`storage-cleanup` daemon wait for its successful exit. A failed migration blocks
both services. The web image starts only `node server.js`; it starts neither
migrations nor cleanup. Redis stays in the same environment resource too.

Singleton ownership is **operator-enforced**. `deploy.replicas: 1` is a default
count, not an upper limit: `docker compose up --scale` overrides it. Do not
scale migration/cleanup, use extra `compose run` cleanup daemons or duplicate
the entire Coolify resource. Counts are project-scoped, not a cross-project
lock. Two resources
targeting the same DB/buckets would create two cleanup daemons. Do not use
Coolify whole-stack duplication or scale `migrate`/`storage-cleanup` explicitly.
Serialize releases for each environment; this does not coordinate concurrent
independent deployments or provide a distributed scheduler.

## Rollout and verification

1. Leave production configuration at one web copy until #419 verifies a staging
   Coolify deployment with two web copies using a reviewed config change.
   Inspect Coolify's
   generated Compose and actual container names for injected `container_name`;
   confirm two web containers, one successful migration and one cleanup daemon.
   Record the Coolify version and deployment evidence. If scaling is rejected,
   leave it at one and resolve the supported topology in #419. That task must
   also close these concrete process-local prerequisites before scaling:
   - `src/lib/rateLimit.ts`: counters are in-process; N copies can admit N times
     the per-key budget. Shared atomic enforcement under #413 must pass.
   - `src/application/services/publicDataCache.ts`: cross-copy invalidation is
     absent; public data can stay stale for its 60-second TTL. Explicitly
     accept/test this bound or add shared invalidation for stricter freshness.
   - `src/application/services/googleWalletService.ts`: `activeWalletOperations`
     admission is process-local. DB row locks still serialize transactions, but
     admission on another copy can consume a pool connection while waiting.
     Verify shared admission/pool limits and issuance/deletion races under #414.
   - Validate proxy/readiness/draining, identical immutable builds and Server
     Action keys, cross-copy session/QR/media flows, rollback and connection
     budgets; select capacity using #411 measurements.
2. Deploy through the existing `dev` / `main` Coolify workflow. Use a full
   Compose deployment so the migration prerequisite runs; do not start new
   release containers using `--no-deps`. Confirm exactly one successful
   migration container before new web/cleanup containers start.
3. In the same resource, confirm one running `storage-cleanup` daemon, one
   Redis service and one web container. Inspect cleanup
   logs/health using the [cleanup runbook](../storage-cleanup.md); preserve its
   dry-run/apply setting. A web restart must not spawn another cleanup daemon.
4. In staging, fail a migration deliberately against a disposable DB. Confirm
   no new web or cleanup container starts; repair the migration before retry.
   Already-running containers from an earlier release are not stopped by
   `depends_on`; backward-compatible migrations remain required.

`bash tests/e2e/release-workers.sh` first checks the rendered production counts
remain one even with `WEB_REPLICAS=3`. It then uses an explicit stock-Compose
`--scale web=3` override with disposable tiny containers: singleton jobs, web restart,
a second release and migration failure. Commands are replaced with markers;
this checks stock Compose orchestration, not Prisma/S3, Coolify's Compose
rewriting, generated container names or live proxy behavior.

For failed rollout notifications, resource UUIDs and duplicate deployment
triggers, use the [deployment triage runbook](deployment-triage.md). Its
inventory distinguishes canonical releases from older whole-stack clones.
