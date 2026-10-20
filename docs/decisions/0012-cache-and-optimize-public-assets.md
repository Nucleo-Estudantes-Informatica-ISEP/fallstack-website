# 0012: Cache and optimize public assets

Status: Accepted
Date: 2026-10-19

## Context

Five decorative SVG backgrounds contain embedded raster images rather than
only vector paths. Together they occupy 9,727,689 bytes. The authentication
images also ship unnecessarily large sources (7200 and 15120 pixels wide).
Next.js defaults unversioned `public/` assets to `max-age=0`.

## Decision

Convert those five backgrounds and two authentication images to WebP using
the installed Sharp dependency: quality 85, alpha quality 100, effort 6.
Rasterize SVGs at density 144 and width 3024 (twice their 1512-pixel viewBox
width); resize authentication images to width 1920 without enlarging. Preserve
aspect ratios and transparency. Keep vector logos and the official Wallet
button as SVG.

| Original source           | Original bytes |  WebP bytes |
| ------------------------- | -------------: | ----------: |
| `bgHero.svg`              |      1,118,577 |      32,582 |
| `bgDates.svg`             |      1,119,270 |       5,954 |
| `bgInterview.svg`         |      1,119,285 |       9,816 |
| `bgHeadsUp.svg`           |      1,119,317 |      17,450 |
| `card_bg.svg`             |      5,251,240 |      99,728 |
| `auth-component.png`      |      2,018,417 |     113,922 |
| `hero_privacy_policy.png` |      1,443,018 |      15,180 |
| **Total**                 | **13,289,124** | **294,632** |

Store converted images under `public/assets/optimized/` with names
`<name>.<first-12-hex-characters-of-SHA256>.webp`. Every file in this directory
must use a hash of its final bytes. Serve this directory with
`public, max-age=31536000, immutable`. When an image changes, generate a new
hash and update every reference; never overwrite bytes at an existing hashed
URL. Original sources remain recoverable from Git history.

Serve other `/assets/`, `/icons/`, and `/google-wallet/` files with
`public, max-age=3600, must-revalidate`. Their stable URLs can be reused across
deployments, so HTTP caches may reuse content for one hour before revalidation.
These rules apply only to public asset namespaces. Keep HTML,
APIs, private CVs, service workers, the manifest, and Next.js-owned cache
policies outside these overrides. Reverse proxies/CDNs must respect the
origin's cache directives; enabling Cloudflare is a separate operator action.

## Consequences

The seven source assets are 97.8% smaller in aggregate. This is a file-size
comparison, not measured page-load latency or server-capacity improvement;
Next.js already optimizes raster images rendered through `next/image`.

Lossy conversion and finite raster dimensions trade some zoom/high-DPI detail
for smaller transfers. Compare new images against their originals at intended
display sizes before replacing them. A regression test checks file hashes,
WebP signatures and cache-policy isolation. HTTP smoke tests check real file
responses and conditional revalidation.

Nonce-based CSP continues to require dynamic HTML rendering as described in
[ADR 0008](0008-enforce-content-security-policy.md). Public-data caching,
Redis, static landing modes, and replica scaling retain their separate scopes.
