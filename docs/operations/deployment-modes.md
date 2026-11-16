# Independent deployment modes

`EVENT_MODE` remains the existing app registration policy. It does **not**
isolate the public deployment. `DEPLOYMENT_MODE` selects delivery explicitly;
no timer starts or stops infrastructure. Keep production unchanged until the
staging and real-device gates below pass. This supersedes the infrastructure
advice in `docs/offseason-mode.md` for independent delivery only.

## Build and public boundary

Run `DEPLOYMENT_MODE=OFF-SEASON pnpm build:deployment` (or PREPARATION).
`static-output/` is the entire artifact. `EVENT` invokes the normal Next build.
Missing/unknown modes fail. Supply `EDITION_STARTS_AT` as an ISO timestamp with
seconds and timezone; use the edition timestamp from `src/edition/branding.ts` when targeting that
edition (shared with the merged Wallet work), or supply the approved future
edition timestamp at deployment. Missing, blank, invalid or elapsed values show
generic next-edition text. Rebuild to change a date. Dates never activate routes.

Create a separate Coolify resource using `docker-compose.static.yml`. Public
DNS/proxy points only at its port 8080 through `public_only`; attach the reverse
proxy to that internal network. This template does not automatically configure
Coolify routing: the operator must configure a hostname/router targeting port
8080 and attach the proxy to the resolved `<project>_public_only` network.
Verify a 200 through the actual public hostname before switching DNS. The dated
staging evidence proves this explicit proxy attachment, not an automatic
Coolify resource deployment; that deployment remains an activation gate. There is no host-published port. Do not join shared-data or Redis networks, inject app credentials,
mount app files/volumes, or add a Next fallback/upstream. Deny outbound access
to PostgreSQL, MinIO, AuthNEI and the internet in the serving network, including
new connections through the reverse proxy. Apply the egress policy before
publishing ingress and reapply it to every replacement serving instance. The
internal network and credential-free image are deliberate. The container is
read-only; only `/tmp` is writable. The serving config allows only `/`, two
brand images, CSS, JS and the replacement worker; all other paths return 404,
and all methods except GET/HEAD return 405, including Server Action POSTs.

No account controls or authentication CTAs exist, regardless of cookies. The
landing uses shared seasonal copy/branding and displays no database sections
or MinIO logos. Do not export private records to this artifact.

## PREPARATION staff boundary

Keep the public resource in PREPARATION. On a separate private Coolify app
resource merge `docker-compose.app.yml` and `docker-compose.preparation.yml`.
The cleanup daemon is excluded from the default PREPARATION profile; activate
the verified daily batch before stopping any existing daemon. Remove every public domain/router and direct web port from that app resource;
only the staff gateway may reach web. Bind its ingress to the staff VPN or
loopback. Use a distinct staff hostname, with OIDC callback/logout URIs updated
and allowlisted in AuthNEI. Do not reuse public cookies/domain settings.

Provision `STAFF_TLS_DIRECTORY` outside the checkout: server `tls.crt`, private
`tls.key`, dedicated `staff-ca.crt`, and its current PEM `staff-ca.crl` (including
an empty signed CRL before the first revocation). Missing CRLs fail gateway
startup; expired CRLs reject clients. Issue client certificates only to the
authorized staff roster. NEI identity operators own issuance and revocation:
revoke compromised/departed staff certificates in that dedicated CA, regenerate
the CRL, replace the mounted file and restart the gateway to terminate existing
TLS connections as well as load the CRL. TLS session tickets are disabled.
Renew the CRL before its `nextUpdate`; monitor expiry and verify a revoked client
is rejected while a retained staff client can connect. Ensure image UID 101 can read
the mounted TLS key without making it world-readable. TLS must
terminate at the gateway: use TCP passthrough, never an outer HTTP TLS proxy
that bypasses client verification. Missing/untrusted client certificates are rejected before any upstream
request. App authorization remains required after this boundary.
Sign in through `/api/auth/login?next=%2Foverview`. The gateway allowlists the
existing admin page roots and staff attendance scanner, `/api/admin/`, required
OIDC/session calls, scanner check-in calls, and backoffice media/assets. Shared
action QR endpoints permit GET/HEAD/PATCH, blocking student completion POSTs;
student CV download is GET/HEAD only and retains app authorization. `/` redirects
to `/overview`. Guest pages, student/company profiles, dashboards, signup, Wallet,
and other APIs return 404, including Server Action POSTs to those paths. New
backoffice routes must explicitly extend this allowlist and its boundary probes.
Do not attach public static ingress to the staff network. Verify the actual
web listening port (the existing image uses 4000) before deployment.

## Ownership, data and jobs

| Resource                                                   | Accountable owner                                        | Preserve / operation                                                                                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Fallstack web, staff gateway, event Redis, release workers | Fallstack maintainers / NEI infrastructure operators     | Stop web and event-only Redis in OFF-SEASON; start only required services in PREPARATION                                              |
| Shared PostgreSQL                                          | NEI shared-data operators                                | Keep running for other apps; `fallstack_dev`/`fallstack_prod`, schema `fallstack`; preserve backing volume and migration history      |
| Shared MinIO                                               | NEI shared-data operators                                | Keep running; preserve volume, `fallstack-{dev,prod}-{avatars,logos,cvs}` buckets, policies and restricted identities                 |
| AuthNEI/ZITADEL                                            | NEI identity operators                                   | Keep running for all owners; preserve app registrations, signing keys and callbacks                                                   |
| Backups and restore target                                 | Tech User (`tech.user@nei-isep.org`), per backup runbook | Keep off-VPS schedules, encryption keys, repository access and monitoring from the backup runbook                                     |
| Storage cleanup batch                                      | Fallstack storage owner                                  | Daily 03:00 UTC, alert on missed/nonzero run; restricted runtime DB/S3 identity                                                       |
| Wallet revocation                                          | Fallstack Wallet owner                                   | Preserve recorded issuance, restricted Google service account and revocation access; complete pending revocations before web shutdown |

Before changing services, record actual Coolify resource IDs, named volume IDs,
bucket names, named on-call people and scheduler job IDs in the restricted
operations inventory. These assignments describe responsibility, not evidence
that a particular operator has accepted a handoff. Never guess volume IDs or
stop shared services. Never run `down -v` or delete Redis persistence blindly.

Replace the cleanup daemon with a host/Coolify scheduled **one-shot** using the
existing worker image/credentials and network: override its daemon command with
`node --conditions=react-server --import tsx scripts/storage-cleanup.ts --apply`.
Run its documented dry-run first (omit `--apply`), review candidates and verify
recovery semantics in [storage cleanup](../storage-cleanup.md). Schedule daily
03:00 UTC, enforce one running batch, retain sanitized summaries, alert on
failure or >26 hours without success. `STORAGE_CLEANUP_MODE` does not enable
apply for one-shot runs; `--apply` is required. Do not stop the daemon until a
successful scheduled run and next-run monitoring are verified. No Redis needed
for cleanup. Keep six-month CV retention, orphan grace, durable queue retries
and backup retention unchanged. A plain app stop without this schedule is not
an approved OFF-SEASON transition.

## Staging transitions and rollback

1. Inventory owners, volumes, credentials and jobs. Record current image SHA,
   domains, replica counts and baseline resource usage. Verify fresh scheduled
   backups and perform isolated [restore rehearsal](restore-rehearsal.md):
   migration history, row counts, object checksums, restricted access and app
   smoke. Keep restore access available with web stopped.
2. Build/publish static artifact; deny its serving process backend access.
   Switch staging public ingress to it. Stop staging web, event Redis and
   continuous workers only after batch retention and Wallet obligations pass.
3. Verify GET `/` with and without a real old cookie. Assert no account/session
   controls or auth CTA and no requests to `/api`, `/_next/image`, DB/S3/IdP.
   Probe `/login`, `/signup`, `/student`, `/company`, `/admin`, `/overview`,
   `/api/auth/session`, `/api/media/logo/test`, and `/_next/image`: all 404.
   POST each and `/` with `Next-Action: stale`: all 405, no app upstream.
4. On a **real device with an existing installed PWA**, launch cached `/`,
   student/company/admin/auth deep links online and offline, then reconnect.
   Observe the replacement `/sw.js` update, cache removal and return to `/`;
   repeat with existing cookies. Confirm dynamic requests cannot reach web.
   Offline cached UI may persist until reconnection/update; document that limit.
5. Move to PREPARATION: start Redis, apply migrations once with migrator
   credentials, start web and staff gateway. Confirm public still static,
   unauthenticated/no-cert staff access denied, authorized staff can sign in,
   and nonstaff app authorization remains enforced. Verify no alternate public
   router or direct container port bypasses the gateway.
6. Move to EVENT: validate backups, start Redis, migrations, required singleton
   jobs, then web; wait for readiness and run event readiness/rollback checks
   (#344) before explicitly switching public ingress. Restore EVENT_MODE and
   registration presentation only according to approved reopening timing.
7. Roll back ingress to the previous static image/config; stop only event-owned
   resources after verifying batch retention. Preserve DB/object data and
   migrations; never roll schemas back destructively. Recheck counts/checksums,
   backup access, cleanup schedule, and staff restrictions after every switch.

## Evidence and measured savings

This repository does not contain live credentials or authority to stop shared
resources. Staging transitions, actual service inventory, restore results,
real-device PWA checks and live savings remain release gates. Record date,
operator, image SHA, mode, device/OS, probe results, backup IDs, object/count
comparison and scheduled cleanup run ID for every transition.

Measure the same staging host over 15 idle minutes in EVENT and OFF-SEASON
using `docker stats --no-stream`, process RSS/CPU, web/worker replica count,
Redis memory, DB connection counts and host memory pressure/swap deltas.
Report baseline, static value and difference, excluding shared services.
No savings figures are claimed until measured; stopping app/Redis alone does
not prove host savings. Repeat after PREPARATION to quantify staff overhead.

The [systemd timer](../../deployment/retention/fallstack-retention.timer) and
[one-shot service](../../deployment/retention/fallstack-retention.service) are
installable schedule templates. Adjust checkout, docker binary and protected
env-file paths to the host inventory; the env file supplies only the DB/S3 values required by
`docker-compose.retention.yml`; it needs no event Redis or identity credentials. Restrict it to operators. Install the
units in `/etc/systemd/system`. The service defaults to dry-run, including timer
runs. Its `ExecStartPost` emits an audit-only error and exits 1: a dry-run must
never count as successful retention. Connect this failed unit to existing NEI
alerting before enabling the timer. To audit without this intentional service
failure, run the documented one-shot without `--apply` directly. After reviewing
a successful audit, explicitly install
[`apply.conf`](../../deployment/retention/apply.conf) as
`/etc/systemd/system/fallstack-retention.service.d/apply.conf`, reload systemd,
and enable/start the timer. The drop-in enables deletion and clears the audit-only
failure guard. Remove it and reload to return to dry-run with failed-unit alerts;
keep or restore the verified daemon until apply is active. No retention suspension
is approved by installing these templates. The drop-in, rather than
`STORAGE_CLEANUP_MODE`, opts this one-shot into deletes. `Persistent=true` catches missed runs after host
restart and systemd prevents overlapping instances of this unit. Connect failed
units and last-success age to existing NEI alerting; no monitoring destination
is assumed here. Inspect `systemctl list-timers` and the sanitized journal to
verify the next run and successful exit before stopping the daemon.

See the [dated verification and live volume inventory](../evidence/deployment-modes-2026-11-16.md). Coordinate the existing host replica-sync timer before scaling down; do not disable another task's reconciliation.

### Measured isolated serving footprint — 16 November 2026

Seven same-host samples over 190 seconds compared a task-owned Next seasonal
instance with the independent static artifact. Median Docker container memory
was **158.0 MiB for Next** and **6.309 MiB for static**, a measured serving-unit
difference of **151.691 MiB (96.0%)**. The Next instance served the seasonal
page with synthetic configuration and no shared backend access; private TLS
probes occurred during sampling. Both instances used production images. The
Next process was then stopped while static delivery remained available.

This is a bounded serving-process comparison, not a host-wide or event-load
benchmark. Existing clones, Redis and workers were preserved at the user's
request, so no savings from those shared resources are claimed. PREPARATION
adds the private app/gateway cost. Repeat the longer idle-window procedure
above for production planning. [Raw samples](../evidence/deployment-footprint-2026-11-16.json).
