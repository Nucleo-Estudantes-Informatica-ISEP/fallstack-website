# 0016: Private Redis per Coolify environment

Status: Accepted
Date: 2026-10-28
Source: [Issue #455](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/455)

## Context

The shared-state epic (#454) needs a Redis deployment before #413 can replace
the per-process rate limiter. Both `dev` and `main` already deploy the same
Coolify Compose definition and share a PostgreSQL/MinIO network, which must
not expose Redis to unrelated services or the other environment.

## Decision

Deploy one password-protected Redis 7.4 service per Coolify resource. Only
Redis and that resource's web copies join its Compose-scoped internal network;
publish no port or domain. Bind Redis to loopback and that network's dedicated
DNS alias so Coolify's injected resource network cannot expose the listener to
the migrator, cleanup worker or proxy. Keep predefined-network attachment off.
Require separate passwords and explicit
`fallstack:dev:` / `fallstack:main:` key prefixes. The #413 client will validate
and enforce the `REDIS_URL` / required `REDIS_KEY_PREFIX` contract; no client is
added here. Passwords use URL-safe letters, digits, underscore or hyphen and
are read from an owner-only config file instead of process arguments.

Use a persistent named volume with AOF/every-second fsync, a 96 MiB
`noeviction` dataset limit and a 256 MiB container budget. Restart failed
containers with `unless-stopped`, allowing SAD's intentional off-season stop
to persist across Docker restarts. SAD disables dependent flows and deployment
automation before stopping Redis; retains volumes; verifies both resources
before resuming. See the [runbook](../operations/redis.md).

## Consequences

Web copies share one instance within their environment without attaching
Redis to shared infrastructure networks. This adds a startup dependency,
secret provisioning, disk/memory monitoring and explicit seasonal operations.
It is not HA: a crash can lose roughly one second of writes, and host/volume
loss loses state. #413 must settle bounded request timeout, outage handling
and crash-loss policy before Redis gates live requests. General caching and
queues remain outside this decision.
