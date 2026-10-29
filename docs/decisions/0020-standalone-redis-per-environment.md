# 0020: Standalone Redis per environment

Status: Accepted
Date: 2026-10-29
Supersedes: [ADR 0015](0015-private-redis-per-environment.md)

## Context

ADR 0015 defined Redis inside `docker-compose.app.yml`. Every Coolify resource
deployed from that file, including a clone, got its own Redis, network and
volume. A clone therefore could not share rate-limit state with its source, and
Redis lifecycle was tied to every app deployment.

## Decision

Run Redis as a standalone Coolify database resource, one for `dev` and one for
`main`. Each lives in its own dedicated Coolify destination, so its Docker
network is separate per environment. The resource is never made public and
publishes no host port. Only `web` joins that network, through an external
network named by `REDIS_NETWORK_NAME`. `migrate` and `storage-cleanup` do not
join it.

Each web deployment receives `REDIS_URL` and `REDIS_KEY_PREFIX` as required
runtime variables. Copies and clones of an environment that point at the same
Redis share state. Prefixes stay `fallstack:dev:` and `fallstack:main:`. The
Redis settings that Compose used to enforce move into the resource's
`redis.conf`: password, `maxmemory 96mb`, `maxmemory-policy noeviction`,
`appendonly yes`, `appendfsync everysec` and `save ""`.

The monitoring labels `metrics_environment` and `metrics_service=redis` move to
the resource's Custom Docker Options, so the existing Telegraf filter and Redis
alerts keep working.

The temporary `serverEnv` exception from ADR 0015 remains: #413 adds URL and
prefix validation with the first application client. `REDIS_NETWORK_NAME` is
Compose-only and never reaches the application.

## Consequences

- Redis can outlive and be shared across app deployments of one environment.
- The app no longer pins the Redis image, healthcheck or memory limit. SAD sets
  them on the Coolify resource and records them in the runbook.
- Network isolation depends on a dedicated destination per environment and on
  the resource staying non-public. Reachability is limited to containers on that
  network, plus the password.
- The monitoring labels are no longer in version control. If a Redis redeploy
  drops them, `FallstackDependencyMetricsMissing` fires.
- Dev and prod require different `REDIS_NETWORK_NAME` values.
