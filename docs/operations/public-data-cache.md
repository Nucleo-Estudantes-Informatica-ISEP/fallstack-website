# Public data cache

The homepage and `/api/faqs`, `/api/schedule`, `/api/sponsors`,
`/api/companies/roster` share public DTO caches per Node process.
Private/admin reads and login state are excluded. See [ADR 0013](../decisions/0013-cache-public-homepage-data.md).

## Check freshness

1. Read each endpoint with `?lang=PT` and `?lang=EN`; sponsors have no translation.
   Repeat without cookies, with an invalid app cookie and with a real session.
   Body must be identical for the same language, status 200, `Cache-Control: no-store`, no private fields or `Set-Cookie` from these handlers.
2. Edit a FAQ/schedule translation, reorder entries, activate/deactivate a sponsor
   or company, or change a company's rank/style/interests/profile. The writer's
   process must show the edit on its next read in both languages. Failed writes
   must leave the previous data visible.
3. With multiple replicas, direct requests to each replica after an edit. All
   must show the edit within 60 seconds plus DB latency. Repeat after a direct
   SQL edit. Normal load-balancer requests alone cannot prove every replica.
4. Repeat public API checks with the updated service worker controlling the page
   (including an installed PWA). These paths must use NetworkOnly and fail
   offline instead of serving old JSON; wait for the new worker to activate.
5. Open `/?lang=PT` and `/?lang=EN` in a clean browser session. Initial response
   HTML must contain public content. Day tabs and FAQ accordion must work after
   hydration. Network must show no initial requests to the four content APIs;
   the existing optional `/api/auth/session` request is expected.

## Diagnose and recover

- Production alert delivery: **TBD — human confirmation required before rollout.**
  Each failed homepage section calls `reportError`, which logs at error level
  and calls Sentry `captureException` with `extra.operation` set to
  `homepage_faqs`, `homepage_schedule`, `homepage_sponsors` or
  `homepage_companies`, including failures served from the one-second cooldown.
  SDK capture alone does not confirm ingestion or notifications: monitoring is
  disabled without a DSN. Follow the [observability runbook](../observability.md#8-sentry-operations-and-alerts)
  to configure new/regressed issue alerts and volume alerts for ongoing outages.
  In a non-production environment, exercise each section's failure path and
  confirm the operation in the received event's additional data and delivery to
  the maintained incident destination. Record the alert owner, destination and
  delivery evidence before rollout; automated tests only verify SDK capture.
- Check existing structured logs/Sentry for `homepage_faqs`, `homepage_schedule`,
  `homepage_sponsors`, `homepage_companies` or `unhandled_route_error`. An empty
  section can indicate a DB error; check the public API's status/body too.
- Monitor existing DB query metrics and HTTP p95/errors during the event. Warm
  requests within the TTL should not add public-content SELECTs. The repeatable
  regression benchmark is
  `pnpm exec vitest run tests/e2e/publicEdition.test.ts --maxWorkers=1` against a
  migrated test DB with DATABASE_URL/DIRECT_URL set.
  It creates and removes its own fixtures; never point tests at production.
- There is no cache backend to become unavailable. A cold/expired entry reads the
  DB; a DB failure gives API 500 and a logged, empty homepage section. Concurrent
  failures share a one-second retry cooldown. Restore DB connectivity; the next
  retry recovers. A cache restart is unnecessary for ordinary edits.
- To purge all entries operationally, restart each application replica through
  the existing Coolify deployment controls. This clears only process memory.
  Do not add a public purge endpoint or cache personalized HTML.
- If an edit stays stale beyond 60 seconds, check the serving build, DB/schema,
  load-balancer target and any upstream cache overriding `no-store`. Reproduce
  directly against each origin before increasing cache complexity.

Use shared invalidation/storage only if replica count or a requirement for
immediate cross-replica edits makes the documented 60-second bound unacceptable.
No Redis or Cloudflare configuration is required by this change.
