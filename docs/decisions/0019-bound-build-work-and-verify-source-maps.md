# 0019: Bound build work and verify source maps

Status: Accepted
Date: 2026-10-28

## Context

Local builds repeatedly exhausted a 1.5 GiB JavaScript heap. PWA and Sentry
webpack hooks disabled Next's automatic compiler worker, and source maps were
generated even without upload credentials. Production builds logged upload
failures but still deployed with broken monitoring configuration.

## Decision

Explicitly enable the webpack build worker and Next's memory optimizations.
Optimize the `@mynaui/icons-react` barrel import rather than loading its
entire export graph. Reuse Next's on-disk cache across Docker builds and honor
the existing heap build argument.

Generate source maps only when all upload credentials are present. Use Sentry's
supported post-compilation hook to upload once after compiler workers finish,
then delete the maps. Configured upload failures fail the build. Keep runtime
error reporting and its privacy filters enabled independently through the DSN.

## Consequences

No lint, type, test, minification, PWA, or monitoring checks are disabled.
Memory optimizations can slightly increase compilation time; import and cache
optimizations remove work. Heap ceilings apply per process, so total build RAM
must still be monitored. Source-map uploads require a reachable backend and
valid credentials during deployment. Post-compilation debug-ID injection is
incompatible with integrity hashes; revisit this choice if SRI is introduced.
