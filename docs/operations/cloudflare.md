# Cloudflare account and CDN

The whole `nei-isep.org` domain uses Cloudflare DNS since 24 Oct 2026, so a change
here affects every NEI service. Only `fallstack.nei-isep.org` and one test subdomain
go through the CDN. Everything else, including login and mail, is DNS only. The
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

Last checked: 28 Oct 2026. Keep this table in sync with the dashboard.

| Setting                       | Value                      | Where                            |
| ----------------------------- | -------------------------- | -------------------------------- |
| SSL/TLS mode                  | Full (strict)              | SSL/TLS → Overview               |
| Rocket Loader                 | Off                        | Speed → Optimization             |
| Email Address Obfuscation     | Off                        | Scrape Shield                    |
| Web Analytics automatic setup | Off                        | Analytics & Logs → Web Analytics |
| Cache Rules and Page Rules    | None. Default caching only | Caching → Cache Rules            |

Script injection stays off because the Content Security Policy only allows
scripts with the per-request nonce (`script-src 'self' 'nonce-…' 'strict-dynamic'`).
Never add a rule that caches the HTML either: its nonce changes on every request.

### Proxied records

Proxy only what the site needs. Everything else stays DNS only.

| Record                               | Mode     |
| ------------------------------------ | -------- |
| `fallstack.nei-isep.org`             | Proxied  |
| Test subdomain                       | Proxied  |
| `nei-isep.org`, `www.nei-isep.org`   | DNS only |
| Login (AuthNEI), mail and MX records | DNS only |

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
4. cPanel may create DNS entries: **TBD (decision)**. Since cPanel no longer
   manages this DNS, the default is **no**.

## Rollback

To stop using the CDN for a record, set it back to DNS only:

1. In Cloudflare, open **DNS → Records**.
2. For the record, change **Proxied** to **DNS only** and save.
3. Wait for DNS to propagate (a few minutes). Confirm with
   `dig +short fallstack.nei-isep.org`: it must return the origin address, not a
   Cloudflare one.

Rehearsed on the test subdomain on: **TBD (date)**.

## Test through the CDN

Before the event, test these on the proxied site with at least two web copies,
after the multi-copy checks:

- Login
- QR scanning
- CV upload

Result and date: **TBD**.
