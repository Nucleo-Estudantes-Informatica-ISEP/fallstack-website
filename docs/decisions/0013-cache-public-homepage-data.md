# 0013: Cache public homepage data

Status: Accepted
Date: 2026-10-19
Source: [Public read caching](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/415), [Server-loaded homepage](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/416)

## Context

Four homepage sections fetched their data after hydration. Each public API read
also resolved an optional session. The public schedule, FAQs, sponsors and
company roster change infrequently, but remain editable in the backoffice.
Private recruiting and account data must never enter a shared cache.

## Decision

Use a small process-local cache of **mapped public DTOs**, shared by the homepage
server loader and four public GET routes. Keys contain edition year, dataset and
resolved PT/EN language. Sponsors use one language-independent entry. There are
seven possible entries; each process/environment owns its own cache and a restart
clears it. No Redis, new service, environment variable or migration is required.

Entries have a hard 60-second TTL, measured from completion of the DB load. Expired
reads wait for a fresh load; errors do not extend stale data. Concurrent misses
share a promise. Failed loads share the same rejection for one second before
retrying. Callers receive cloned DTOs. Invalidation deletes pending entries too,
so a pre-edit read cannot repopulate a newer cache generation.

Service write attempts invalidate the relevant dataset after the write or
transaction settles, even on rejection because the commit outcome may be unknown, in both languages. This includes reorder, activation,
company rank/style/profile and translated interest changes. Admin reads remain
uncached. Local edits become visible on the next read; other processes/replicas
and direct SQL edits converge within 60 seconds, plus any in-flight and fresh DB request time.
Already-running responses may finish with the pre-edit snapshot. This is bounded
freshness, not distributed immediate invalidation.

The homepage resolves language on the server and loads all four services in
parallel, without fetching its own API. Interactive components receive DTO props;
day tabs, FAQ accordions and animations remain client-side. A failed section logs
an error and renders empty, preserving the previous per-section fallback; this
fallback is never cached as a successful empty dataset. Optional login state
continues separately through the existing AuthContext request.

Public JSON responses use `Cache-Control: no-store`. This prevents a second
browser/CDN cache from hiding edits. Workbox uses `NetworkOnly` for these four
JSON paths before its default rules, so installed PWAs cannot serve stale JSON
from an earlier worker cache. Existing offline HTML behavior is unchanged; the
60-second freshness bound applies to online origin reads. The nonce-bearing HTML remains dynamic under
the existing CSP. This change does not enable static HTML export or Cloudflare.

### Alternatives

- **HTTP/CDN caching:** saves origin requests, but does not cache direct server DB
  reads. It needs a separate purge/freshness contract and careful HTML/CSP handling.
- **Next.js Data Cache:** supports tagged DB caching, but its time-based
  stale-while-revalidate and stale-on-error behavior does not supply this hard
  freshness bound. Self-hosted replicas still need a shared cache handler for
  immediate distributed invalidation.
- **Redis:** adds network and operational dependencies for seven small public
  values. Revisit if measured replica count/load or stricter edit freshness
  warrants shared storage and invalidation. No claimed Redis benchmark was run.

## Evidence and limits

`tests/e2e/publicEdition.test.ts` repeats uncached service reads and cached
homepage reads against the same PostgreSQL fixtures. A Prisma query extension
counts model operations before I/O, avoiding asynchronous SQL-log delivery races.
On the local PG16 instance, 30 uncached reads issued 120 Prisma read operations
(p50 1.857ms, p95 3.760ms); 30 warm cached reads issued zero (p50 0.066ms,
p95 0.113ms). A 100-reader cold burst used exactly the same four operations as
one cold homepage load. Relation loading can emit multiple SQL statements per
Prisma operation; these counters are not SQL statement counts. These are local
data-loading timings, not hosted capacity, HTTP latency or LCP.
Unit tests also cover failure recovery, both languages, independent replica TTLs,
identity-cookie independence, invalidation races and public-field filtering.

## Consequences

Warm requests avoid these DB reads and public API requests no longer query login
state. Initial HTML contains first-day schedule, company roster, sponsors and FAQ
questions, rather than waiting for four client API calls. HTML/RSC grows by the
public DTO payload; no client-JS reduction or LCP improvement is assumed without
matched browser measurements. There is no guarantee of serving content during a
DB outage after TTL expiry. Up to one cold load per dataset/language/process can
run per TTL window; no distributed stampede lock is provided.

See the [operations runbook](../operations/public-data-cache.md) for freshness
checks, recovery and the threshold for replacing this bounded local cache.
