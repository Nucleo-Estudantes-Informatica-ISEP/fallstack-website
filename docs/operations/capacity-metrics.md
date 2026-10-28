# Per-copy and dependency metrics

Implements the repository setup for [Task01-B / #448](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/448).
Deployment and the live acceptance checklist below are still required. Do not
use this configuration as evidence of measured event capacity.

## What is collected

One Prometheus and one Telegraf agent run per **Linux Docker host**. They cover
both Fallstack environments and shared services, including AuthNEI and the
proxy. This is an optional operations stack; it does not replace Coolify deploys
or Pino/Sentry. No application database migration is needed.

| Signal                                                                | Source                                          | Dimensions                                      |
| --------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| Container CPU %, RAM bytes/limit, restart count, OOM flag, start time | Docker stats/inspect via Telegraf               | environment, service, copy                      |
| HTTP count, duration histogram, status, aborted responses             | Each Next.js process on private `:9464/metrics` | environment, service, copy, method, status_code |
| Process CPU/RSS, heap, GC, event loop                                 | Standard Prometheus Node collector              | environment, service, copy                      |
| DB connections, commits/rollbacks, deadlocks                          | Aggregate `pg_stat_database` via Telegraf       | dev/main/shared, database, service              |
| Redis authenticated PONG health, RAM and restarts                     | Docker healthcheck/stats via Telegraf           | dev/main, service, copy                         |
| MinIO readiness, AuthNEI readiness, status and probe latency          | HTTP readiness probes                           | shared, service, probe                          |

`copy` is the Docker container name, automatically refreshed every 15 seconds;
new/replaced replicas need no target edits. Docker restart counts reset when a
container is replaced. They are gauges, not monotonic Prometheus counters.
For shared services use `environment=shared`; do not duplicate their resource
usage under both dev and main. Label every replica of AuthNEI and the proxy too. Each Fallstack resource has
its own private Redis; its dev/main labels are wired in app Compose.

HTTP timing runs at Node's server boundary, including SSR/pages, APIs,
static responses, health checks, streaming until finish, and disconnected
clients (`status_code=aborted`). Scrapes are excluded. It measures origin
responses, including request upload time, not browser latency or Cloudflare
cache hits. Use k6/browser results for end-to-end scenario latency. No route
label is recorded, so this aggregate cannot prove homepage-only p95.

## Enable on the event host

1. Inventory running containers (`docker ps`) and existing listeners. Reuse any
   existing monitoring stack rather than start duplicate collectors. Check host
   memory/CPU/disk headroom first; defaults cap Prometheus at 384 MiB / 0.5 CPU,
   Telegraf at 128 MiB / 0.25 CPU, retention at seven days or 1 GB. Measure this
   overhead during capacity runs. WAL/head chunks can exceed the retention size.
2. On each Fallstack Coolify resource set `METRICS_ENABLED=true`,
   `METRICS_ENVIRONMENT=dev` or `main`, and `METRICS_HOST=0.0.0.0`, then redeploy.
   Keep the **public service port explicitly set to 4000**. Port 9464 is exposed
   for Docker discovery only: no host port publication, proxy route, Cloudflare
   route, or public firewall access. Native development defaults to loopback.
   Both deployed branches run `NODE_ENV=production`, so it cannot identify them.
3. Add persistent Docker labels to shared containers in their owning Coolify
   Compose resources: `metrics_environment=shared` and `metrics_service` equal to
   `proxy`, `authnei`, `postgresql`, or `minio`. Every AuthNEI/proxy copy
   needs labels. Fallstack web, Redis and storage-cleanup labels are already wired.
   Include other co-hosted services in the `inputs.docker.metricpass` service
   allowlist and label them with a fixed, non-personal service name. Reconcile
   inventory against collected copies; unlabeled containers are intentionally
   not stored. Do not edit or restart unrelated services during a capacity run.
4. Create a dedicated PostgreSQL monitoring login with `CONNECT` and
   `pg_read_all_stats` only, no application table grants. Redis health reuses the
   authenticated PONG check from [its owning Compose resource](redis.md), so
   the collector needs neither Redis credentials nor access to its private
   network. In `monitoring/`, copy `.env.example` to `.env` (ignored), set
   `DOCKER_GID` from `stat -c '%g' /var/run/docker.sock`, scoped PostgreSQL
   credentials, actual dev/main/AuthNEI database names and host-reachable HTTP
   dependency endpoints. If AuthNEI uses a separate DB host, change only its
   `inputs.postgresql.address` to a separate monitoring DSN.
   Probe `/minio/health/ready` and ZITADEL `/debug/ready`, not a login page that
   could return 200 while authentication is broken. This probe does not test a
   complete OIDC login. No tokens in probe URLs.
5. Run from the repository root:

   ```sh
   docker compose --env-file monitoring/.env -f monitoring/compose.yml config --quiet
   docker compose --env-file monitoring/.env -f monitoring/compose.yml up -d
   ```

   Host networking lets collectors reach Docker bridge IPs and loopback-only
   dependency ports without joining unrelated application networks. Existing
   listeners on 9090/9273 must be resolved before startup. Do not publish new
   database or Redis ports publicly to make collection work.

6. Access Prometheus through an SSH tunnel:

   ```sh
   ssh -L 9090:127.0.0.1:9090 <event-host>
   ```

   Query UI: `http://127.0.0.1:9090/query`; targets: `/targets`; alerts: `/alerts`.
   Both Prometheus and Telegraf listen on host loopback only. Alert rules are
   visible there; no notification receiver/Alertmanager is configured.

**Security boundary:** Docker socket access grants powerful host access even
when the mount says `:ro`; only trusted operators should control this stack.
Keep its config and private listeners inaccessible to application users.
Do not expose either socket or exporters through the public proxy.

## During tests and the event

Filter by `environment="dev"` or `environment="main"`, retain `copy`, and select
exact UTC test start/end times. Use at least five minutes of warm samples for
five-minute rates; idle p95 with no requests is undefined, not zero.

| View / PromQL                                                                                                  | Meaning                                                                       |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `fallstack:copy_cpu_percent{environment="dev"}`                                                                | Docker CPU %, 100 = one fully used core; can exceed 100                       |
| `fallstack:copy_memory_bytes{environment="dev"}`                                                               | Container memory usage, including cache; compare `docker_container_mem_limit` |
| `fallstack:copy_restarts`                                                                                      | Restart count for each copy; compare before/after test                        |
| `fallstack:copy_http_requests_per_second`                                                                      | Origin HTTP throughput per copy                                               |
| `fallstack:copy_http_p95_seconds`                                                                              | Per-copy origin p95 across all responses                                      |
| `fallstack:copy_http_error_ratio`                                                                              | Fraction of 4xx/5xx/aborts; 429 excluded from numerator and denominator       |
| `sum by (environment, copy, status_code) (rate(fallstack_http_request_duration_seconds_count{status_code=~"429 | 5..                                                                           | aborted"}[5m]))` | Separate throttling, server failures and disconnects |
| `postgresql_numbackends`                                                                                       | Current connections for each configured database, including monitors          |
| `docker_container_health_healthy{service="redis"}`                                                             | 1 = authenticated PONG healthcheck healthy; 0 = starting/unhealthy            |
| `http_response_response_status_code_match`                                                                     | 1 = expected readiness HTTP 200; 0 = mismatch                                 |
| `http_response_result_code` / `http_response_response_time`                                                    | Probe result (0 = success) / seconds                                          |
| `up` / `ALERTS`                                                                                                | Scrape failures, missing metrics, readiness failures, restarts                |

Telegraf expires samples after 45 seconds: failed DB/Docker collection becomes
missing data and then `FallstackDependencyMetricsMissing`, never stale green.
The first minute is startup grace. `up{job="dependencies"}=1` alone proves only
that Telegraf can be scraped; check dependency series and alerts too.
A stopped/replaced container may disappear from discovery, so compare Docker
inventory/expected replica count with targets and resource series after deploys.
Docker access failure also drops resource samples; inspect Telegraf health/logs
if resource series vanish while HTTP targets stay up.

Save query CSVs/screenshots with UTC interval, revision, web copy count, host
inventory, and k6 scenario in the capacity report for #446/#344. Shared services
must be included in the same interval. Never infer extra replica capacity from
configuration alone.

## Privacy and acceptance checks

Only numeric operational fields and fixed labels enter storage. Request URLs,
paths, query strings, bodies, headers, cookies, session/user/student identifiers,
trace IDs, exception text, Docker environment values and arbitrary Docker labels
are never emitted by this setup. SQL collects aggregate statistics, not query
text or rows; Redis exposes only numeric Docker health/resource fields, not
keys/values or healthcheck output; HTTP response bodies are not
stored. DB names and container names must remain infrastructure names without
personal data. Prometheus has a second label allowlist before ingestion.

Before accepting the live setup:

- Confirm dev/main targets separately, all web copies, all AuthNEI/proxy copies,
  PostgreSQL, Redis, MinIO and storage-cleanup against Docker inventory.
- Hit each web copy directly on the private network with synthetic traffic;
  verify count/duration/status increases for that copy. Send a fake token in
  URL/header/cookie and verify it never appears in `/metrics` or stored series.
- Exercise an authenticated scenario separately using the staging harness;
  confirm real traffic and readiness are distinguishable.
- In staging, restart one copy: observe restart count. Scaling/replacing creates
  a new copy with a fresh count; record that distinction.
- Point an isolated probe at a controlled 503 and stop a staging Redis/DB
  collector: verify failed/missing alerts, then restore. Do not stop shared
  production dependencies.
- Verify public origin/CDN cannot reach 9464, 9273 or 9090. Inspect stored label
  names and sample values. No credentials, PII or complete request URLs.

Local tests cover real Node HTTP responses/aborts/privacy plus configuration
invariants. Prometheus rule validation:

```sh
promtool check config monitoring/prometheus.yml
promtool test rules monitoring/rules.test.yml
```

Stop only this task's monitoring stack with
`docker compose --env-file monitoring/.env -f monitoring/compose.yml down`.
The named volume preserves history; delete it only when the retention policy
and capacity evidence no longer require it.
