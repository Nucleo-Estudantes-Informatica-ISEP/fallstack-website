# Shared rate limiter validation (#413)

Run `pnpm exec vitest run tests/e2e/rateLimiterBoundary.test.ts` for both real
upload routes with mocked limiter decisions/session/storage: 201, 429 with
rounded Retry-After, 503 before file processing and 401 before Redis access.

The distributed suite requires **disposable loopback Redis only**:

```bash
limiter_password="$(openssl rand -hex 32)"
docker run -d --name limiter-check -p 127.0.0.1:16379:6379 redis:7.4.12-alpine redis-server --requirepass "$limiter_password" --appendonly yes --appendfsync everysec --maxmemory-policy noeviction
TEST_REDIS_URL="redis://default:${limiter_password}@127.0.0.1:16379" pnpm exec vitest run tests/e2e/distributedRateLimit.test.ts tests/e2e/redisRateLimitFailure.test.ts
docker rm -fv limiter-check
unset limiter_password
```

CI always supplies TEST_REDIS_URL. Without it the Redis integration suite skips;
the TCP failure fixtures still run. The suite starts two independent Node HTTP
processes executing the production service/repository/response mapping. It
checks alternating/concurrent admission, users/endpoints/prefix isolation,
expiry, adjacent-window bursts, 429/Retry-After, corrupt state and a real Redis
pause followed by recovery. The boundary fixture shortens only a synthetic
key's TTL; it validates expiry semantics rather than a deployed 60-second load
measurement. No Next session or object storage runs in those worker hosts.

The TCP RESP fixtures use the real Redis client against hanging handshakes and
commands, bad authentication, disconnects, OOM and malformed replies. They check
bounded failure, closed sockets, bounded pending work, cooldown and recovery
without command replay. They do not substitute for deployed outage evidence.

## Normal-paced staging uploads and employee preview scans

Use synthetic, disposable accounts and a non-production target. Securely supply
STUDENT_COOKIES, EMPLOYEE_COOKIES and STUDENT_CODES as comma-separated values,
one distinct student and employee account and valid code per VU. Do not put
cookies/codes in command history, logs or reports. After securely exporting them:

```bash
CONFIRM_NON_PRODUCTION=yes E2E_ALLOW_UPLOADS=yes \
STAGING_BASE_URL=https://staging.example.org E2E_BASE_URL=https://staging.example.org \
VUS=2 REQUEST_INTERVAL_SECONDS=20 \
k6 run tests/load/upload-qr-interactions.js
```

For three minutes each VU uploads one CV and avatar and obtains an employee
preview token, then waits at least 15 seconds. This exercises the real
`POST /api/students/token`; existing `K6_SCENARIO=qr` exercises public action-QR
generation instead. Valid preview traffic must remain successful and uploads
must return 201, without 429 or limiter 503 under normal conditions. Clean up
test accounts/uploads using supported application/storage procedures.

Use the existing `upload-tickets-boundary` scenario for full 60-second boundaries
and `qr` separately/concurrently for action-QR traffic. See
[load harness](../tests/e2e/README.md). Record topology/copy coverage, commit,
configuration, VUs/interval, sanitized commands, timestamps, HTTP status counts,
per-endpoint latency and limiter metrics. The existing p95<750ms load threshold
is provisional until a staging baseline is recorded; do not treat it as an
established capacity limit.

## Evidence boundary

No authenticated Coolify traffic or normal-paced staging run has been executed
for this implementation. Historical shim-based #287 throughput claims remain
withdrawn. Local tests establish code behavior only. SAD must record authenticated
access from every deployed copy in dev/main, actual outage/recovery and paced
upload/preview usability before enabling shared limits. Follow
[the enablement gate](operations/redis.md#enablement-evidence-sad).
