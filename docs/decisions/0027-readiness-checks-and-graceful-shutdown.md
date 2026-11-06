# 0027: Readiness checks and graceful shutdown

Status: Accepted
Date: 2026-11-04
Source: [Task04-A #458](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/458)
Supersedes: [ADR 0024](0024-separate-liveness-and-dependency-readiness.md) (in part regarding proxy wiring and shutdown draining)

## Context

Under ADR 0024, `/api/health` was retained as a process liveness signal returning HTTP 200, while session-free `/api/ready` was introduced for bounded dependency checks (PostgreSQL, Redis, MinIO, AuthNEI). However, ADR 0024 explicitly deferred proxy readiness wiring and shutdown draining to #458, warning:

> "Before routing traffic based on readiness, #458 must decide which dependencies gate traffic and how to avoid removing every copy during a shared outage or application pool saturation."

If Traefik's proxy loadbalancer were wired directly to `/api/ready`, any transient 2-second timeout on an external dependency (such as MinIO or AuthNEI) would cause the proxy to eject the single production replica (`replicas: 1`), returning 503 Bad Gateway/Service Unavailable from Traefik for all domain traffic (including public cached pages and static assets).

Furthermore, without graceful shutdown draining, stopping a web copy immediately terminates the process, dropping active requests in flight. Intercepting and cutting off requests inside `diagnostics_channel` causes `ERR_HTTP_HEADERS_SENT` in Next.js internal handlers and leaks unhandled exceptions.

## Decision

1. **Proxy Readiness Probe (`/api/proxy-ready`)**:
   - Provide a dedicated, session-free endpoint `/api/proxy-ready` for Traefik's loadbalancer healthcheck (`interval: 5s`, `timeout: 2s`).
   - It returns HTTP 200 during normal execution and HTTP 503 (`{ "error": "Service unavailable" }`) only when the process is stopping (`isShuttingDown() === true`).
   - This isolates Traefik routing from external dependency blips, preventing total domain blackouts on single-replica environments while ensuring stopping copies are evicted from the proxy pool.
2. **Explicit Loadbalancer Port**:
   - Configure `traefik.http.services.web.loadbalancer.server.port: 4000` explicitly in `docker-compose.app.yml`, avoiding ambiguity with Prometheus port `9464` also exposed by the Dockerfile.
3. **Liveness / Deep Dependency Readiness Separation**:
   - Docker container healthcheck continues to monitor `/api/health` (process liveness).
   - `/api/ready` remains the deep infrastructure dependency readiness endpoint for Telegraf, Prometheus, capacity metrics, and operators (checking PostgreSQL, Redis, MinIO, AuthNEI, and shutdown state).
   - Neither probe performs session lookup.
4. **Shutdown Draining via Diagnostics Channel & Shared Global Lifecycle State**:
   - Next.js compiles `src/instrumentation.ts` and route handlers (e.g. `src/app/api/proxy-ready/route.ts`) into separate server bundles. To guarantee the shutdown lifecycle state is shared across all entrypoints in the Node.js process, state is anchored on `globalThis.fallstackShutdownState`.
   - Upon receiving `SIGTERM` or `SIGINT`, `shuttingDown` is set to `true`.
   - `/api/proxy-ready` and `/api/ready` immediately observe `shuttingDown === true` and return 503 so proxies and orchestrators detect unreadiness.
   - Incoming and in-flight requests are not forcibly terminated in `diagnostics_channel`. Instead, `response.writeHead` is sanitized to ensure `Connection: close` is injected (overriding any keep-alive request args), instructing the client/proxy to close the connection after the response completes.
   - Introduce a 10-second deregistration grace delay (`deregistrationDelayMs = 10000`, 0 in test environments). Given Traefik's healthcheck interval of 5s and timeout of 2s, a worst-case probe cycle plus network and eviction jitter spans up to 7–10 seconds. This 10-second delay ensures Traefik successfully probes `/api/proxy-ready`, receives 503, and removes the copy from routing before the socket on port 4000 is closed, even when `activeRequests === 0`.
   - Active in-flight requests are tracked and allowed to finish first, bounded by a 65-second drain timeout (`DEFAULT_DRAIN_TIMEOUT_MS = 65000`).
   - To account for the 10-second deregistration delay, 65-second drain timeout, and 10-second cleanup/buffer margin (total budget 85s), Docker Compose `stop_grace_period` on `web` is set to `90s`.
   - After draining, resources (e.g. database client pool) disconnect cleanly and the process exits with code 0.
   - Guard signal handler registration with `process.env.NEXT_PHASE !== "phase-production-build"` to prevent interference during `next build`.
   - `NEXT_MANUAL_SIG_HANDLE=true` is enabled in the runtime environment.

## Consequences

- Stopping copies finish active requests cleanly without `ERR_HTTP_HEADERS_SENT` or dropped in-flight operations.
- Single-replica topologies do not suffer domain-wide blackouts during transient third-party service hiccups.
- Stopping copies are promptly evicted by Traefik without receiving new traffic.
- Compilation and build processes in CI are not polluted with runtime signal handlers.
