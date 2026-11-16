# Production library remediation (#543)

The lockfile contained three distinct dependency paths:

- Sentry → bundler plugins → glob → minimatch → brace-expansion 5.0.9.
- Sentry / webpack / next-pwa → schema-utils → ajv → fast-uri 3.1.5.
- Next.js → sharp 0.34.5, forced by an old override to 0.35.3,
  while the direct sharp dependency already resolved to 0.35.5.

Overrides now resolve brace-expansion to patched releases on the existing
1.x, 2.x and 5.x lines, fast-uri to 3.1.9, and sharp to 0.35.5. The existing
4.x-to-5.x brace-expansion override and 0.34.5-to-0.35.x Sharp override are
preserved. Prisma’s deepmerge-ts dependency is overridden from 7.x to 8.0.0 because [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) affects all versions below 8.0.0. CI run 43226106369 passed the compose migration smoke test at fc502c6; other Prisma configuration shapes remain unverified. Vite is overridden to 8.1.6.

Undici 6 is absent from the application lockfile on the reviewed dev base;
its installed Undici is overridden to 7.30.1. A bounded 6.x override protects that line
if it returns. The production base image also carries npm's independent
bundled dependency tree, which pnpm overrides cannot patch. Remove npm/npx
from the runner, migrator and storage-cleanup images. The runner starts `node server.js`; the migrator invokes Prisma directly with Node. The builder retains its tooling.

CI's existing Trivy 0.76.2 gate now scans both OS and library packages with
HIGH/CRITICAL failures enabled for fixable vulnerabilities (`--ignore-unfixed`).
The gate also scans the migrator and storage-cleanup images, which retain
build tooling and development dependencies.

The maintainers triaging security alerts should review unfixed HIGH/CRITICAL
findings when alerts appear and at least weekly, track each finding in an issue,
and update or mitigate it when a fix becomes available. Run the same scan
without `--ignore-unfixed` to see those findings.

## Reproduce

Build the final runner and scan that exact image:

```sh
docker build --target runner --build-arg NEXT_PUBLIC_BASE_URL=http://localhost:4000/api -t fallstack-security-543 .
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.76.2 image --scanners vuln --pkg-types os,library --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 fallstack-security-543
```

Scan results must come from the final image, not the source lockfile alone.
The blocking gate excludes unfixed findings; triage them as described above.

## Local verification (11 November 2026)

At implementation commit `6408268`, frozen install, lint, typecheck, production
build and Prisma validation passed. Full suite on an isolated migrated
PostgreSQL database at that revision: 915 passed, 8 skipped. Later test counts
in the PR describe separate runs on newer revisions. Production pnpm audit reported
zero HIGH/CRITICAL and two MODERATE findings.

The final Docker runner build was attempted, but BuildKit failed during Next.js
compilation with `ResourceExhausted: cannot allocate memory`. Host has 8 GiB
RAM; after failure, swap usage was 3.58 GiB and memory_pressure reported 41%
free. No heap limits or host settings were changed, and the build was not
blindly retried. Consequently no final-image Trivy result is claimed locally.
CI run [43422446866](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/actions/runs/43422446866) passed the production Docker image job at `58f4e4a`, including the three image scans and Compose smoke test. Changes after that revision require fresh CI verification.
