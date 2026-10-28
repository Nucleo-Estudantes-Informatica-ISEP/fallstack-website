# Event stress scenario

Decisions for the Fallstack 2026 capacity tests (#447, Task01-A).

## Targets

- 1,200 homepage users and 200 heavy users (QR scans, CV uploads, check-in).
- All arrive within 1 minute, about 20 homepage loads per second.
- 4 web copies behind the CDN. The capacity of 4 copies is an estimate until Task01-F measures it.

## Pass limits

- Speed: the slowest 5% of homepage loads under 0.75 s.
- Errors: under 1% for homepage and heavy users. Rate-limit responses (429) do not count.

## Uploads

- CV limit is 10 MB (PDF). Test with a realistic mix of sizes, including some at the limit.

## Above capacity

Users wait for their page. Worst case, all 1,200 arrive in the same second and the last user waits about 30 s. This is an accepted risk.

- CDN, proxy and Coolify timeouts must be at least 30 s.
- Revisit only if the heavy-user test (Task01-C2) fails.
