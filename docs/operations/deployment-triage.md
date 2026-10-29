# Coolify deployment failure triage

Check the deployment result separately from resource health. A failed rollout
can leave older containers running and reporting `running:healthy`.

## Resource ownership

The `event:fallstack` project uses these canonical resources:

| Environment | Resource             | UUID                       | Push deployments |
| ----------- | -------------------- | -------------------------- | ---------------- |
| development | `fallstack-web:dev`  | `wyczj05hmzzp9gcih9vzf8th` | Enabled          |
| production  | `fallstack-web:main` | `vkkw880k40kwk8s8c8800404` | Enabled          |

Two older development clones remain present with push deployments disabled:

- `clone-of-fallstack-web:dev-rw2rssuxn4tf47fdgvsqqehh`
- `clone-of-fallstack-web:dev-7w8fkwznx6crualbn8pv4dse`

These are whole-stack copies, not verified web replicas. Keep their automatic
deployments disabled while they share the canonical environment's database
and storage. Before manually deploying or re-enabling a clone, either isolate
its database, buckets, authentication and Redis configuration as a separate
environment, or implement the reviewed web-only topology required by
[ADR 0017](../decisions/0017-scale-web-with-singleton-release-jobs.md).
Sharing Redis alone does not remove duplicated migration and cleanup jobs.

## Incident on 2026-10-29

Tracked in [#508](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/508).
Coolify v4.5.3 queued all three development resources for commit `fb601f2`.
Canonical dev deployment `gmhcjfbhmprxkikumh8h6lot` finished successfully.
Clone deployments `dvuszzjjvmmpt2zqldwq6ydu` and
`8apgysmjkmcouo2yjnvtfhcj` failed during Compose interpolation, before image
compilation, because `REDIS_PASSWORD` and `REDIS_KEY_PREFIX` had no values.
Having a variable key saved in Coolify does not establish that it has a value.

The fix disabled `is_auto_deploy_enabled` on both clone resources through
Coolify. A separate API read verified both flags were `false`; canonical dev
and production retained `true` and reported `running:healthy`. No containers
were stopped or redeployed by this change. Disabling push deployments does not
stop older containers, disable manual/API deployments, or prove that existing
worker counts are correct. Inventory those containers before retiring clones
or enabling additional copies.

[PR #509](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/pull/509)
separately moves Redis into a standalone resource per environment. It changes
the required Compose inputs to `REDIS_URL`, `REDIS_NETWORK_NAME` and
`REDIS_KEY_PREFIX`; it does not fix clone deployment triggers or singleton job
ownership. Follow the Redis runbook matching the deployed revision. Do not add
fallback credentials, weaken required interpolation, or provision obsolete
`REDIS_PASSWORD` settings to address alerts from an older revision.

## Verification procedure

1. Match the notification's resource and deployment UUIDs against the inventory.
   Inspect that exact deployment's commit, status and log summary. Do not infer
   rollout success from the resource's current health.
2. For interpolation errors, inspect variable names, non-empty configuration,
   preview scope and runtime/build flags against the Compose file at that
   commit. Keep credentials and complete connection URLs out of logs and issues.
3. Read back each clone's **Advanced / Auto Deploy** setting, or
   `settings.is_auto_deploy_enabled` from `GET /api/v1/applications/{uuid}`.
   Both must be `false`; canonical resources must retain their intended flags.
4. Check canonical deployment history and `/api/health` in development and
   production. For the next normal merge into `dev`, verify that canonical dev
   receives a new deployment and neither clone receives a push deployment.
   Keep the old failures as incident history; do not redeploy clones merely to
   replace a red entry with a green one.
5. For a genuine canonical rollout failure, fix the configuration or source
   first, then deploy through the normal environment workflow. Observe a
   successful migration before reporting the new release healthy, as described
   in the [release worker runbook](release-workers.md).
