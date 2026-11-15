# Cloudflare account and CDN

The whole `nei-isep.org` domain uses Cloudflare DNS since 24 Oct 2026, so a change
here affects every NEI service. `fallstack.nei-isep.org` and its explicit test hostnames
go through the CDN. AuthNEI and mail settings are managed by their operators;
this capacity task does not propose changes to those services. The
cPanel server no longer manages this DNS.

## Owners

- Owner: Dinis Correia (`@dinisjcorreia`)
- Second administrators: David Valente (`@david-fs-valente`) and Hugo Almeida
  (`@hugo2006alm`)
- The owner and the second administrators are the repository codeowners. All
  three use individual accounts with the Super Administrator role and
  two-factor authentication.

### Emergency access

A shared emergency login exists. Only the three administrators know it. Its
credentials and procedure are kept in the team password manager, not in this
repository. Use it only when none of the administrators can log in. After each
use, comment on the infrastructure issue with the date and the reason, and never
include credentials.

## Settings

The general settings below were last checked on 28 October 2026. The scoped
staging cache exception was added for the 14 November capacity tests.

| Setting                       | Value                                    | Where                            |
| ----------------------------- | ---------------------------------------- | -------------------------------- |
| SSL/TLS mode                  | Full (strict)                            | SSL/TLS → Overview               |
| Rocket Loader                 | Off                                      | Speed → Optimization             |
| Email Address Obfuscation     | Off                                      | Scrape Shield                    |
| Web Analytics automatic setup | Off                                      | Analytics & Logs → Web Analytics |
| Cache Rules and Page Rules    | Default caching; staging exception below | Caching → Cache Rules            |

Script injection stays off because the Content Security Policy only allows
scripts with the per-request nonce (`script-src 'self' 'nonce-…' 'strict-dynamic'`).
Protected HTML with per-request nonces must never enter the shared cache.
The public language-document allowlist from ADR 0038 has a narrow staging-only
cache rule; follow [its rollout checks](public-data-cache.md) before enabling it.
Keep production settings outside the capacity test unchanged.

### Proxied records

Proxy only the explicitly approved Fallstack hostnames. Other NEI services
remain outside this capacity test's configuration scope.

| Record                             | Mode                                          |
| ---------------------------------- | --------------------------------------------- |
| `fallstack.nei-isep.org`           | Proxied                                       |
| `fallstack-cdn.nei-isep.org`       | Proxied                                       |
| `staging-fallstack.nei-isep.org`   | Proxied                                       |
| `nei-isep.org`, `www.nei-isep.org` | DNS only                                      |
| AuthNEI, mail and MX records       | Outside this capacity task; no setting change |

The explicit `staging-fallstack.nei-isep.org` record was added for #453 on
14 November 2026. Its hostname is covered by Cloudflare Universal SSL; the
nested `staging.fallstack.nei-isep.org` hostname remains DNS-only through the
existing wildcard. The staging proxy route must target the same staging
copies on both names. See [the capacity test guide](../testing/capacity-targets.md).

### Expected cache behavior

Check with `curl -sI <url>` and the `cf-cache-status` header. Last checked: 28 Oct 2026.

| Request                                     | Expected                                              |
| ------------------------------------------- | ----------------------------------------------------- |
| `https://fallstack.nei-isep.org/`           | `DYNAMIC`, with a different CSP nonce on each request |
| `/_next/static/…` and `/assets/optimized/…` | `MISS` on the first request, then `HIT`               |

## Change process

1. Request a new subdomain or a change in an issue, with the name, the target and
   whether it needs the proxy.
2. One of the three administrators makes the change in Cloudflare. New records are **DNS only** by
   default. Proxy a record only when it needs the CDN.
3. Record the change in the issue, and add it to the tables above if it is a
   proxied record or a setting.

## Rollback

To stop using the CDN for a record, set it back to DNS only:

1. In Cloudflare, open **DNS → Records**.
2. For the record, change **Proxied** to **DNS only** and save.
3. Wait for DNS to propagate (a few minutes). Confirm with
   `dig +short <record-name>`, where `<record-name>` is the record you changed in
   step 2 (for example `fallstack.nei-isep.org` or the test subdomain). It must
   return that record's configured origin address, not a Cloudflare one.

## Test through the CDN

Before the event, test these on the proxied site with at least two web copies,
after the multi-copy checks:

- Login
- QR scanning
- CV upload
