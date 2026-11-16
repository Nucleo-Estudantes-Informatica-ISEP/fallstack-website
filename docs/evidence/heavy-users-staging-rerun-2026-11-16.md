
## Fast-network retry result

The first Mac run was invalidated as a generator-path failure: five simultaneous
10 MiB uploads took 25.5 s from the original network, while the same VPS-side
probe took 1.28 s. After moving to the user's fast Wi-Fi, the official k6 v2.4.0
Mac generator completed the unchanged scenario through all three staging
containers: 200 VUs, 4,257 iterations and 17,172 requests. It exited 99 because
8 thresholds failed:

- HTTP failures: 1,029/17,172 (5.99%); checks: 17,181 passed and 1,026 failed (94.36%).
- p95 limits failed for dashboard page/history, QR pass, CV authorization, CV
  attach and check-in.
- Functional workload was present: 1,360 accepted CV uploads (1,107 realistic,
  253 exactly 10 MiB), 2,774 successful downloads (1,103 realistic QR,
  253 near-limit QR, 1,418 dashboard), 139 new check-ins and 1,027 expected
  duplicate check-ins. The near-limit upload/download requirements passed.
- The complete failure and latency metrics are in [the k6 summary](heavy-users-staging-rerun-2026-11-16/heavy-200.json).

The retry remains a failed capacity result, but it is valid staging traffic from
the fast-Wi-Fi Mac generator rather than the earlier slow-path artifact.

## Josimar's follow-up test

After the load, `tests/load/heavy-users.test.ts` ran against the task-owned local
PostgreSQL database with Prisma validation already completed: **1 test file,
64 tests passed, exit 0**. This includes Josimar Bazílio's URL-origin sanitization
change (`new URL(request.url).origin === STORAGE_ORIGIN`).

## Final restoration and host cleanup

All 200 retry synthetic users, test relations and retry-owned objects were
removed; the first cleanup reported 842 keys verified absent, and the retry
cleanup was completed before restoration. The three staging containers now use
`9371efdd8bec4e6ee59e49ecaf3afd3ea5442ae4`, are healthy, and retain
`S3_PUBLIC_ENDPOINT=https://origin-111aa7.example.invalid`. Production's
endpoint remains `https://origin-7b176b.example.invalid`. The MinIO bucket remains
private and unversioned with quota `0 B`; MinIO now has a 2 GiB memory limit.

Docker image and build-cache pruning removed only unused images/cache (3.2 GiB
reported directly by image prune plus 8.5 GiB build cache). Volumes were not
pruned. VPS free space improved from about 4 GiB during load to
32,685,404,160 bytes after cleanup. Existing shared data volumes were preserved.
