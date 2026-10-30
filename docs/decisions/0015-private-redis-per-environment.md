# 0015: Private Redis per Coolify environment

Status: Superseded by [0021](0021-standalone-redis-per-environment.md)
Date: 2026-10-28
Source: [Issue #455](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/455)

## Context

The shared-state epic (#454) needs a Redis deployment before #413 can replace
the per-process rate limiter. Both `dev` and `main` already deploy the same
Coolify Compose definition and share a PostgreSQL/MinIO network, which must
not expose Redis to unrelated services or the other environment.

## Decision

Deploy one password-protected Redis 7.4 service per Coolify resource, pinned
to a patch tag and multi-platform manifest digest. SAD refreshes security
patches explicitly; the runbook defines backup, staged upgrade and rollback.
Only Redis and that resource's web copies join its Compose-scoped internal network;
publish no port or domain. Bind Redis to loopback and that network's dedicated
DNS alias so Coolify's injected resource network cannot expose the listener to
the migrator, cleanup worker or proxy. Keep predefined-network attachment off.
Require separate passwords and explicit
`fallstack:dev:` / `fallstack:main:` key prefixes. The #413 client will validate
and enforce the `REDIS_URL` / required `REDIS_KEY_PREFIX` contract; no client is
added here. Passwords use URL-safe letters, digits, underscore or hyphen and
are read from an owner-only config file instead of process arguments.

For this infrastructure-only phase, explicitly defer `serverEnv` entries for
`REDIS_URL` and `REDIS_KEY_PREFIX` until #413 adds their first application
consumer. `.env.example` documents the future contract; Compose requires the
values now. This is a temporary exception to the env-schema synchronization
rule, owned by the #413 implementer. `REDIS_PASSWORD` remains a Compose-only
input used to construct the URL and Redis config, not a separate app setting.
No Redis value belongs in `clientEnv` or `NEXT_PUBLIC_*`.

Provision both runtime variables in **both** Coolify resources before merge or
deployment; missing either prevents the entire Compose stack from rendering.
SAD records the merge/deploy gate in the runbook. Web waits for DB migrations
only, not Redis health, while no app code uses Redis. #413 must decide whether
to add a Redis readiness dependency alongside its bounded outage policy;
Redis retains its independent authenticated healthcheck.

Use a persistent named volume with AOF/every-second fsync, a 96 MiB
`noeviction` dataset limit and a 256 MiB container budget. Restart failed
containers with `unless-stopped`, allowing SAD's intentional off-season stop
to persist across Docker restarts. SAD disables dependent flows and deployment
automation before stopping Redis; retains volumes; verifies both resources
before resuming. See the [runbook](../operations/redis.md).

## Consequences

Web copies share one instance within their environment without attaching
Redis to shared infrastructure networks. This adds required Compose configuration,
secret provisioning, disk/memory monitoring and explicit seasonal operations.
It is not HA: a crash can lose roughly one second of writes, and host/volume
loss loses state. #413 must settle bounded request timeout, outage handling
and crash-loss policy before Redis gates live requests. General caching and
queues remain outside this decision.
