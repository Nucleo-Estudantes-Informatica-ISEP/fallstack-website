# Release migrations and cleanup

Use one Coolify Compose resource per environment, pointing at
`/docker-compose.app.yml`. Keep `WEB_REPLICAS=1` in Coolify.
`WEB_REPLICAS>1` is verified only with stock Docker Compose and is **unverified
on Coolify**. Coolify's generated Compose may inject a per-service
`container_name`, which conflicts with Compose scaling. This PR does not
establish whether the deployed Coolify version does that; support is deferred
to [#419](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/419).
`WEB_REPLICAS` is deployment configuration, not application configuration, so
it does not belong in the Next.js env schema or build args.

In stock Compose, only `web.deploy.replicas` varies. The single `migrate` service runs
`prisma migrate deploy` with no restart, and every new web copy and the single
`storage-cleanup` daemon wait for its successful exit. A failed migration blocks
both services. The web image starts only `node server.js`; it starts neither
migrations nor cleanup. Redis stays in the same environment resource too.

Do not duplicate the entire Coolify resource to add web copies: Compose
singleton counts are project-scoped, not a cross-project lock. Two resources
targeting the same DB/buckets would create two cleanup daemons. Do not use
Coolify whole-stack duplication or scale `migrate`/`storage-cleanup` explicitly.
Serialize releases for each environment; this does not coordinate concurrent
independent deployments or provide a distributed scheduler.

## Rollout and verification

1. Keep `WEB_REPLICAS=1` until [#419](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/419)
   verifies a staging Coolify deployment with `WEB_REPLICAS=2`. Inspect Coolify's
   generated Compose and actual container names for injected `container_name`;
   confirm two web containers, one successful migration and one cleanup daemon.
   Record the Coolify version and deployment evidence. If scaling is rejected,
   leave it at one and resolve the supported topology in #419. That task must
   also validate the deployed proxy, readiness, shared state, immutable builds
   and connection budget before production scaling.
2. Deploy through the existing `dev` / `main` Coolify workflow. Use a full
   Compose deployment so the migration prerequisite runs; do not start new
   release containers using `--no-deps`. Confirm exactly one successful
   migration container before new web/cleanup containers start.
3. In the same resource, confirm one running `storage-cleanup` daemon, one
   Redis service and the requested number of web containers. Inspect cleanup
   logs/health using the [cleanup runbook](../storage-cleanup.md); preserve its
   dry-run/apply setting. A web restart must not spawn another cleanup daemon.
4. In staging, fail a migration deliberately against a disposable DB. Confirm
   no new web or cleanup container starts; repair the migration before retry.
   Already-running containers from an earlier release are not stopped by
   `depends_on`; backward-compatible migrations remain required.

`bash tests/e2e/release-workers.sh` checks the actual Compose dependency graph
with disposable tiny containers: three web copies, singleton jobs, web restart,
a second release and migration failure. Commands are replaced with markers;
this checks stock Compose orchestration, not Prisma/S3, Coolify's Compose
rewriting, generated container names or live proxy behavior.
