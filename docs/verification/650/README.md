# FallStack security audit

19 November 2026. Audited `dev` at `0a3cc7faed6c211f3034288931c99b84f57383d0`
and `main` at `034e317f7a66f1a252c02fe43a816bbd48294dba`. A tree comparison
showed only changelog and release evidence differences. The
[2026 release record](../../evidence/2026-edition-release.md) identifies the
audited `main` commit as the last recorded event-day production deployment.
The audit fixes and local verification cover runtime revision `776f2483ec50f25797b3dec777823046f24dcd21`. The next commit adds this report and the route matrix.

The [route and access matrix](route-matrix.md) accounts for all 75 route
handlers, 102 explicit HTTP method exports, 56 rendered pages, one server
action, and framework/operational entry points. Coverage combines source
review, existing tests, regression tests, and selected loopback HTTP checks.
The earlier [cutover audit #207](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/207)
is historical context. Its follow-ups #215–#222 were closed on GitHub.
Current code independently confirms session-gated CV/avatar uploads, scoped
student statistics, CSPRNG-generated codes, non-root runtime stages, breadcrumb
message redaction and exact owner comparisons. The old Supabase storage
dashboard check does not establish the permissions of today's MinIO buckets.

## Access and lifecycle

- **OIDC.** AuthNEI uses authorization code with PKCE S256, 256-bit state and
  nonce and a 384-bit verifier. The callback checks browser state before
  exchanging the code, verifies the asymmetric ID token using issuer, audience
  and JWKS, and requires nonce, a matching UserInfo subject and a verified
  email. First sign-in can link a pre-provisioned local account by verified
  email. Future sign-ins resolve the stable provider subject. Student,
  employee, admin and NEI membership checks are evaluated at different
  boundaries. The audit patch applies one same-origin return-path validator at
  login and callback.
- **App session.** HS256 requires the application issuer, audience, secret and
  subject. New cookies and app JWTs last 12 hours. Cookies are host-scoped,
  path-wide, HTTP-only and SameSite=Lax. Production adds Secure. The browser
  receives a reduced session DTO, and the app reads the account's active
  status and configured local admin tier at session resolution. The patch
  strips employee membership from the resolved session when the grant is
  missing or the company is inactive. The independent global admin grant
  still permits backoffice access. Admin management pages and API routes
  require the Super Admin tier. Staff attendance checks the original
  issuance deadline in addition to the staff role.
- **Logout and grant removal.** Logout clears the local cookie and can direct
  the browser to the IdP's end-session endpoint with the OIDC hint. There is
  no server-side session store or per-session denylist. A copied valid cookie
  can last until expiry. Local deactivation is checked on later requests;
  the AuthNEI grants in a valid cookie can lag a provider-side change by up to
  12 hours, as accepted in [ADR 0047](../../decisions/0047-daily-attendance-periods.md).
  Deactivated companies also block employee sessions. The AuthNEI discovery
  failure path has a follow-up because the local logout currently waits for
  discovery.
- **Resource scope.** Staff check-in uses the authenticated scanner and
  server-defined periods. Company history, ZIP exports and saved-student
  mutations take company scope from the employee session. The student
  profile GET, statistics, CV URL and CV stream use ownership, administered
  access or a recruiting relationship. Student mutations check the exact
  owner, and CV attach, finalize, cancel and multipart part signing additionally
  check upload ownership. The backoffice layout, each admin API and the
  giveaway server action have their own authorization boundaries.
- **Cross-origin requests.** Cookie Lax limits cross-site credential
  inclusion and permits OIDC's top-level return. The App Router server
  action has its own role check. App responses have no permissive CORS
  headers. Signed uploads use a separate, documented storage CORS policy.
  Baseline security headers include HSTS, framing denial, nosniff, narrow
  Permissions-Policy and an origin-only cross-origin referrer policy.
  Dynamic HTML uses nonce-based CSP. Public cached HTML and API/prefetch
  exceptions are defined by the middleware and public-cache design.
  Private follow-ups cover mutation origin and browser-cache hardening.

## Identifiers and sensitive data

| Identifier                               | Source and controls                                                                                                                                                                                                          | Lifetime and replay                                                                                                                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OIDC authorization code and flow cookies | AuthNEI issues the code. Local state/nonce/verifier use CSPRNG. Code and verifier are checked through the provider exchange.                                                                                                 | Flow cookies last 10 minutes and are cleared at callback. Code single use is enforced by AuthNEI.                                                                                                                |
| App session                              | HS256 with a separate server secret and explicit issuer/audience. DB user must still be active.                                                                                                                              | 12 hours for new sessions. Local logout clears the browser copy; provider claims are a snapshot and bearer copies can survive until expiry.                                                                      |
| Action QR                                | HMAC over action ID and time bucket. The action must be live at redemption and the student must have an authenticated profile.                                                                                               | 30-second JWT limit and timestamp window. Reusable across students as a shared presentation code. Each student can complete the action once.                                                                     |
| Attendance QR                            | HMAC purpose, expiry and permanent code. Attendance API requires eligible staff and an open event period.                                                                                                                    | 30 minutes. Database uniqueness prevents repeat credit for a student within one day/period.                                                                                                                      |
| Recruiting preview/save token            | HMAC purpose and student code. Employee exchange looks up a permanent code or verifies a signed pass. Profile and save paths have separate authorization gates.                                                              | 15 minutes. Bearer within the accepted access path. Company/student save uniqueness prevents duplicate recruiting records.                                                                                       |
| Permanent student code                   | New codes draw six symbols with `crypto.randomInt` from 36 characters, about 31 bits before exclusions and collisions. Four-character compatibility permits about 21 bits at most. Admin-entered codes need not be random.   | Static and remains readable after app deactivation by design. Delete the account to stop code lookup. Fallback lookup requires staff or employee context.                                                        |
| Offline PNG and Wallet                   | Both contain the permanent identifier. The PNG can embed name and email. The app signs the Wallet save URL with its Google service-account key. It references a recorded object whose ID derives from the class and student. | PNG is a static copy. Wallet object's validity is bounded to the edition. App save JWT has no explicit expiry. Account deletion revokes/anonymizes the recorded Wallet object before dropping the local account. |
| Employee invite                          | Admin creates a secret with 160 random bits; only its SHA-256 digest is persisted. Enrolling requires an app session for the employee's own verified identity.                                                               | Company-scoped, reusable until rotation, with no time expiry implemented. Rotation invalidates the previous candidate.                                                                                           |
| Direct CV upload                         | CSPRNG UUID ticket, session owner, constrained S3 signature and exact quarantine/part scope. Finalize validates content before a fenced publish.                                                                             | Configured signing TTL, 300 seconds by default. A valid storage signature can be used within that window; ticket ownership and state gate finalization and attachment.                                           |
| Asset and database IDs                   | Media uses random UUIDs and fixed keys; anonymous media is intentionally public. Private CVs, student/company data and upload tickets apply role/ownership checks in addition to IDs.                                        | Public media URLs may be cached. Ordinary UUIDs and slugs have no bearer expiry and are treated as identifiers.                                                                                                  |

CVs stay behind authenticated endpoints and private object prefixes. The
private download stream uses an attachment and `private, no-store`. Company
ZIP exports contain that company's saved CVs and an accompanying CSV. Media
delivery allowlists avatar/logo/video. SVG logos use the approved static
subset on upload and read, with an isolated response CSP. Public videos
add an active-company reference check. Receipts and response DTOs limit
PII to the relevant workflow; the account pass, student profile, recruiting
history and admin exports remain sensitive. Operational redaction covers
structured authorization, cookies and key identifiers, exception messages
and Sentry breadcrumbs. OIDC callback codes, AuthNEI logout hints, student
preview credentials, Wallet links and S3 signatures still cross URL or
redirect boundaries and require access-log care.

## Input, deployment, and supply chain

- **Server-side requests.** Traced AuthNEI discovery/JWKS/token/UserInfo and
  role assignment, Google Wallet/OAuth, MinIO and readiness. Base destinations
  come from server configuration, trusted provider metadata or fixed Google
  endpoints. Readiness blocks redirects. The Next image proxy allowlists Google
  Storage/Firebase hosts and paths. YouTube embeds normalize to a fixed origin
  or a tracked local video. No other request-controlled server-fetch
  destination was identified in these reviewed paths.
- **Injection and upload handling.** Runtime SQL uses Prisma query objects and
  tagged parameterization for the small raw SQL set. Admin list ordering uses
  allowed fields, storage keys have fixed prefixes, and file inputs use size and
  signature/content checks. CV promotion checks the PDF envelope, scoped ETag
  and status under owner-bound ticket state, and delivery is as an attachment.
  The HTML injection sinks in the public event page are serialization of
  structured JSON-LD. CSV cells are quoted and a formula-prefix guard exists.
  Excel export creates workbooks from app data. It does not import uploads.
- **Secret boundaries.** Server schemas own signing, Postgres, S3, Redis,
  AuthNEI client/PAT and Wallet credentials. The client config exposes the API
  base, public DSN and logs-dashboard URL. The CI source map upload token uses
  a build secret. Compose wires runtime secrets separately. Request handlers
  return generic errors for internal failures.
- **Jobs and ingress.** There is no app cron/webhook HTTP handler and no
  `CRON_SECRET` consumer. Repo timers, cleanup and host jobs run as
  operator processes with scoped DB/S3 or Docker access. The project automation
  workflow stores its token as a GitHub Actions secret. Deployment webhook
  authentication belongs to Coolify, outside the app. The metrics listener is
  network-scoped. The private preparation gateway uses client certificate and
  revocation-list checks plus app guards; the standalone public modes have no
  live app routes.
- **Dependencies.** Frozen pnpm install and `pnpm audit --prod --json` checked
  the locked registry graph (383 production dependencies). Two moderate
  findings were reported on the Sentry bundler path. Source review identified
  no untrusted FallStack request feeding these glob calls. The SheetJS
  dependency is a separately pinned upstream tarball with lockfile integrity.
  The production Docker workflow includes a fixable high/critical scan for the
  runner, migrator and worker. [glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)
  and [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).
- **Reachable compatibility.** `/auth/confirm` redirects to login and the
  public password-reset API returns 410. The existing password UI directs
  account recovery to AuthNEI. Legacy bcrypt helpers and a password service
  remain in source without a caller serving local password login/reset.
  The old Supabase provisioning helper name now allocates local UUIDs only.
  Four-character codes and the manual attendance request aliases remain
  accepted. The student CV attach endpoint retains an `id` request shape
  behind an owner-bound finalized upload. The former Firebase `uploadId`
  variant is parsed and rejected. Company invite enrollment reads only the
  hash and does not use the legacy plaintext column.

## Disposition

- Fixed in the audit PR with regression coverage. Redirect validation across
  the AuthNEI return path and company membership projection at session
  resolution.
- Filed three public follow-ups.
  [#651 glob](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/651),
  [#652 minimatch](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/652)
  and [#653 local logout availability](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/653).
- Filed eight individual draft repository advisories with severity,
  source evidence and defensive acceptance checks. Maintainers can access the
  [private advisories list](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/security/advisories).
  The audit report omits confidential finding details.

## Verification and limits

- macOS arm64, Node 26.13.1 and pnpm 10.23.0. Disposable loopback PostgreSQL
  16, Redis 7.4.12 and MinIO on the repository's pinned release. PostgreSQL
  connectivity, all 37 migrations and Prisma validation succeeded.
- `pnpm lint` completed with 32 warnings and zero errors. `pnpm test`
  passed 1,956 tests across 281 files, including isolated PostgreSQL,
  authenticated Redis and direct CV MinIO integration. The default run
  skipped two optional page-frame benchmarks and two single-connection Wallet
  scenarios. Targeted one-slot Wallet runs passed with default enforcement
  (one test) and explicit opt-in (three tests), covering the gated scenarios.
  Auth, cache, redaction, account deletion, content and ownership
  evidence comes from the code and tests identified above.
- `pnpm typecheck` succeeded. `pnpm build` succeeded with the production
  service worker enabled. Scanned 194 client build assets including the
  worker for the configured synthetic DB, Redis, S3, JWT, OIDC secret and PAT
  values. No marker matched. Inspected the generated worker's cache groups.
- `pnpm dev` passed loopback HTTP checks with a synthetic AuthNEI issuer
  and isolated account records. Verified the OIDC round trip, S256 request,
  missing-state rejection, accepted in-app return, fallback for an external
  return URL, local HTTP-only/Lax cookie flags and max ages, and local
  logout cookie removal. Status and response checks covered anonymous
  session, admin and recruiting requests (401), a student on admin or
  recruiting routes (403), reads of another student's statistics/CV and an
  unsaved company profile lookup (404), the owner's statistics and authorized
  company history (200), public liveness (200), and generic readiness
  failure (503) when the fixture issuer omitted readiness.
- Gitleaks scanned 1,175 commits reachable from the audited `dev` HEAD with
  redaction enabled. Two hits were prose in historical release workflow
  descriptions. The two JWT hits in the early local Supabase template
  verified against its checked-in development signing key. No live
  credential was confirmed. No raw matches were recorded in this report.
- Used synthetic data and isolated services. Active testing covered the local
  application only. Hosted AuthNEI role settings, Google Wallet behavior,
  live MinIO ACL/CORS and Coolify, edge/access logs and private dashboards
  were not independently verified. Production CSP and cache config were
  inspected as source and built output. Installed-device behavior was left to
  the follow-up for that control. Docker image assurance remains CI coverage.
