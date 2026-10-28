# Release migrations and cleanup

Use one Coolify Compose resource per environment, pointing at
`/docker-compose.app.yml`. Additional web copies belong to that same resource:
set the build/runtime Compose variable `WEB_REPLICAS` to the approved positive
count. It defaults to `1`; it is deployment configuration, not application
configuration, so it does not belong in the Next.js env schema or build args.

Only `web.deploy.replicas` varies. The single `migrate` service runs
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
   validates the deployed proxy, readiness, shared state, immutable builds and
   connection budget. This change defines job ownership, not traffic admission.
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
this checks orchestration, not Prisma/S3 or Coolify's live proxy behavior.
