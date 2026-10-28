# 0016: Collect private capacity metrics

Status: Accepted
Date: 2026-10-28
Source: [Task01-B / #448](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/448)

## Context

The 24 October capacity runs recorded replica and proxy resources manually.
Pino/Sentry cover logs and exceptions, but cannot show standing per-copy
resources, HTTP performance or shared dependencies, including login.

## Decision

Expose an opt-in Prometheus listener on private port 9464 in each Next.js
process. Observe Node HTTP lifecycle events so pages and plain routes are
included without rewriting route handlers. Keep only method/status labels.
Use the maintained Prometheus Node client for histograms/process metrics.

Run one optional Prometheus/Telegraf pair per Linux Docker host. Discover web
copies from Docker labels; collect allowlisted container resources, aggregate
DB connections, per-environment Redis authenticated Docker healthchecks and MinIO/AuthNEI readiness. Require explicit
`dev`/`main` identity; shared services use `shared`. Keep collectors on loopback,
store seven days/1 GB of history, and do not collect request data or arbitrary
Docker labels. Details: [operations runbook](../operations/capacity-metrics.md).

## Consequences

No session, database schema or public API changes. Monitoring startup failure
leaves the app available and makes the scrape target fail. Operators must deploy
the separate stack, label shared services, supply scoped monitoring credentials
and verify live inventory/privacy before accepting the setup.

Docker socket access is a privileged trust boundary, including read-only
mounts. HTTP aggregates include health/static requests and origin timing;
scenario-specific and CDN latency still require k6/browser evidence. Readiness
does not prove a complete OIDC login. Resource limits bound collector overhead,
but capacity tests must measure it. Prometheus shows alerts; external alert
notifications and a separate Grafana deployment are outside this task.
