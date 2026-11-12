# 0033: Sanitize SVG only in the logo pipeline

Status: Accepted
Date: 2026-11-11
Amends: [ADR 0008](0008-enforce-content-security-policy.md) (SVG deferral only; CSP unchanged), [ADR 0026](0026-bound-upload-memory-streaming-transport.md) (bounded logo XML parsing)
Source: [Task21 #282](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/282)

## Context

Company and sponsor logos need scalable artwork. Avatars do not. The dedicated
logo bucket and enforced CSP are already deployed in the source baseline.
SVG is untrusted active XML; MIME and signature checks cannot establish safety.

## Decision

Parse UTF-8 XML using the strict namespace-aware saxes parser. Rebuild a static
allowlist of geometry, groups, gradients, clipping and descriptive text. Reject
malformed XML, DTDs, processing instructions, non-SVG roots, excessive depth
(64) and element counts (10,000). Keep the existing 5 MiB upload limit.
Reject scripts, event handlers, foreignObject and external references; drop
other unknown elements with their descendants and unknown attributes. Drop CSS,
animation, use/image nodes, namespaced attributes and escaped CSS. Only local fragment paint and
clip references survive. Logos exported with CSS must use presentation attributes
or paths instead. No rasterization replaces the stored vector artwork.

Sanitize before writing the private logo bucket and again when serving SVG media.
Avatars retain their independent raster allowlist. Next Image renders these
extensionless app logo URLs unoptimized as ordinary img elements; this also
serves original PNG/WebP bytes for this pipeline. Existing immutable media
caching remains in place. Do not enable dangerouslyAllowSVG globally.

## Security policy audit

No amendment to ADR 0008 or the document CSP is required. Logos are served via
same-origin /api/media/logo URLs; img-src 'self' covers them. The private bucket
origin is never requested by the browser. script-src, object-src and frame-src
stay unchanged. There is no object/embed/iframe/inline SVG or foreignObject rendering path.

## Consequences

Static path logos and gradients remain vector images. Embedded fonts, CSS,
filters, animation and linked images are deliberately unsupported. Administrators
must preview artwork after upload. Stored SVGs cannot rely on outside resources.

Sanitization runs synchronously on uncached public requests. The existing size
and complexity limits bound each parse; repeated cache-bypassing requests remain
an accepted availability risk. Revisit caching or rate limiting if abuse occurs.
