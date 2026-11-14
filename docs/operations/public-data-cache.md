# Public data cache

The homepage and `/api/faqs`, `/api/schedule`, `/api/sponsors`,
`/api/companies/roster` share public DTO caches per Node process. The homepage HTML has an additional
ISR cache, covered below.
Private/admin reads and login state are excluded. See [ADR 0013](../decisions/0013-cache-public-homepage-data.md).

## Check freshness

1. Read each endpoint with `?lang=PT` and `?lang=EN`; sponsors have no translation.
   Repeat without cookies, with an invalid app cookie and with a real session.
   Body must be identical for the same language, status 200, `Cache-Control: no-store`, no private fields or `Set-Cookie` from these handlers.
2. Edit a FAQ/schedule translation, reorder entries, activate/deactivate a sponsor
   or company, or change a company's rank/style/interests/profile. The writer's
   process must show the edit on its next read in both languages. Rejected writes also invalidate: a lost DB reply can hide a successful commit.
   The next read must reflect the actual committed DB state.
3. With multiple replicas, direct requests to each replica after an edit. All
   must show the edit within 60 seconds plus in-flight and fresh DB latency. Repeat after a direct
   SQL edit. Normal load-balancer requests alone cannot prove every replica.
4. Repeat public API checks with the updated service worker controlling the page
   (including an installed PWA). These paths must use NetworkOnly and fail
   offline instead of serving old JSON. Also check `/`, `/?lang=PT`,
   `/?lang=EN`, `/event/pt`, `/event/en` and homepage RSC requests: these must use NetworkOnly. Offline
   document navigation must show `/offline.html`; JSON/RSC reads must fail,
   even when old `start-url`, `pages` or `pages-rsc` entries exist.
   Wait for the new worker to activate; a previously installed worker retains
   its old behavior until then. Other pages keep their existing offline rules.
5. Open `/?lang=PT` and `/?lang=EN` in a clean browser session. The redirected document's initial
   HTML must contain public content. Day tabs and FAQ accordion must work after
   hydration. Network must show no initial requests to the four content APIs;
   the existing optional `/api/auth/session` request is expected.

## Diagnose and recover

- Production alert delivery: **TBD — human confirmation required before rollout.**
  Each failed public dataset load calls `reportError` once, which logs at error level
  and calls Sentry `captureException` with `extra.operation` set to
  `homepage_faqs`, `homepage_schedule`, `homepage_sponsors` or
  `homepage_companies`. Concurrent readers, the one-second settled-failure cooldown,
  and retained timed-out work do not repeat these events; the next failed load reports again.
  SDK capture alone does not confirm ingestion or notifications: monitoring is
  disabled without a DSN. Follow the [observability runbook](../observability.md#8-sentry-operations-and-alerts)
  to configure new/regressed issue alerts and volume alerts for ongoing outages.
  In a non-production environment, exercise each section's failure path and
  confirm the operation in the received event's additional data and delivery to
  the maintained incident destination. Record the alert owner, destination and
  delivery evidence before rollout; automated tests only verify SDK capture.
- Check existing structured logs/Sentry for `homepage_faqs`, `homepage_schedule`,
  `homepage_sponsors`, `homepage_companies` or `unhandled_route_error`. Check the public API status and the origin
  response before attributing stale HTML to the CDN.
- Monitor existing DB query metrics and HTTP p95/errors during the event. Warm
  requests within the TTL should not add public-content SELECTs. The repeatable
  regression benchmark is
  `pnpm exec vitest run tests/e2e/publicEdition.test.ts --maxWorkers=1` against a
  migrated test DB with DATABASE_URL/DIRECT_URL set.
  It creates and removes its own fixtures; never point tests at production.
- There is no cache backend to become unavailable. A cold/expired entry reads the
  DB; a DB failure gives API 500 and a logged, empty homepage section. Settled
  failures share a one-second retry cooldown. Timed-out work that remains pending
  continues returning the timeout rejection until settlement or the 30-second
  pending limit; it does not retry after just one second. Each load has a two-second deadline,
  bounding the homepage data wait even if a DB query hangs. Timeout does not
  cancel underlying database work: a key shares pending work for at most 30
  seconds from its start, including after invalidation. The next read at that
  limit replaces it even if it never settles. This allows another uncancellable
  query per key every 30 seconds during a hang. No DB-side statement timeout
  is configured by this application, so abandoned queries can accumulate. Before
  enabling a deployment-specific PostgreSQL `statement_timeout` below 30 seconds,
  assess its impact on migrations, transactions and other application queries;
  the two-second reader deadline is not a database cancellation mechanism.
  Investigate stuck queries and pool health. A failed ISR generation preserves the
  last good document when available. Requests after a cold-start failure can recover
  after the one-second cooldown once the underlying load has settled, or after
  the 30-second pending limit.
  Late results cannot overwrite a newer cache entry. Restore DB connectivity; the next
  retry recovers. A cache restart is unnecessary for ordinary edits.
- To purge all entries operationally, restart each application replica through
  the existing Coolify deployment controls. This clears only process memory.
  Do not add a public purge endpoint or cache personalized HTML.
- If an API edit stays stale beyond the data TTL, check the serving build,
  DB/schema, load-balancer target and any upstream cache overriding `no-store`.
  For HTML, check the origin ISR status and edge `Age` separately.

Use shared invalidation/storage only if replica count or a requirement for
immediate cross-replica edits makes the documented 60-second bound unacceptable.

## Cloudflare HTML cache

Next generates `/event/pt` and `/event/en` on first request and revalidates every
60 seconds. The origin ISR cache, per-process data cache and edge cache all affect
freshness. Warm both languages directly on the origin after deployment. Purge the
five cached URLs after every deploy or urgent change, once the origin serves the
updated HTML. If needed, warm each web copy separately.

On the staging zone, create a [Cache Rule](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/) with the following expression, scoped
to the staging hostname. Set **Eligible for cache** and use the origin cache
headers for edge TTL. Keep the default full-URL cache key. Disable or narrow any
overlapping broader HTML rule before using this rule.

```text
(http.host eq "staging.example.org"
 and http.request.method in {"GET" "HEAD"}
 and http.request.uri.path in {"/event/pt" "/event/en" "/about" "/privacy-policy" "/terms"}
 and http.request.uri.query eq ""
 and not http.request.headers.truncated
 and not any(lower(http.request.headers.names[*])[*] in {
   "rsc" "next-router-state-tree" "next-router-prefetch"
   "next-router-segment-prefetch" "next-url" "authorization"
 }))
```

1. Confirm each origin response is HTML with no `Set-Cookie` or CSP. Compare the
   public document with and without a synthetic authenticated session. The
   navigation can hydrate differently via the private session API.
2. Repeat a GET through Cloudflare and observe `CF-Cache-Status: HIT`. Verify the
   RSC and login routes bypass the HTML cache. Also test `/` with explicit and
   negotiated languages. It should keep returning the correct uncached redirect.
3. Verify homepage sections, login navigation and the PWA after the worker
   activates. To roll back, disable the Cache Rule and purge the five URLs
   before reverting the application.

## Release handoff

Carry the unchecked rollout items into the dev-to-main release PR: real AuthNEI
login and role flows, an installed-device PWA with the updated worker, requests
to each hosted replica after edits, and matched browser LCP/client-JS measurements.
Production alert delivery remains TBD as described above. Record human evidence
there before rollout; automated checks do not complete author verification.
