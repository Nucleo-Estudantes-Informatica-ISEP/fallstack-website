# Production library remediation (#543)

The lockfile contained three distinct dependency paths:

- Sentry → bundler plugins → glob → minimatch → brace-expansion 5.0.9.
- Sentry / webpack / next-pwa → schema-utils → ajv → fast-uri 3.1.5.
- Next.js → sharp 0.34.5, forced by an old override to 0.35.3,
  while the direct sharp dependency already resolved to 0.35.5.

Overrides now resolve brace-expansion to patched releases on the existing
1.x, 2.x and 5.x lines, fast-uri to 3.1.9, and sharp to 0.35.5. The existing
4.x-to-5.x brace-expansion override and 0.34.5-to-0.35.x Sharp override are
preserved; no additional major migration is introduced.

Undici 6 is absent from the application lockfile on the reviewed dev base;
its installed Undici is 7.29.0. A bounded 6.x override protects that line
if it returns. The production base image also carries npm's independent
bundled dependency tree, which pnpm overrides cannot patch. Remove npm/npx
from the runner only: it starts `node server.js` and does not install packages.
Build and migration stages retain their tooling.

CI's existing Trivy 0.76.2 gate now scans both OS and library packages with
HIGH/CRITICAL failures enabled for fixable vulnerabilities (`--ignore-unfixed`).
The migrator and storage-cleanup images are outside this runner scan; they
retain build tooling and require separate vulnerability assessment.

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
PostgreSQL database: 915 passed, 8 skipped. Production pnpm audit reported
zero HIGH/CRITICAL and two MODERATE findings.

The final Docker runner build was attempted, but BuildKit failed during Next.js
compilation with `ResourceExhausted: cannot allocate memory`. Host has 8 GiB
RAM; after failure, swap usage was 3.58 GiB and memory_pressure reported 41%
free. No heap limits or host settings were changed, and the build was not
blindly retried. Consequently no final-image Trivy result is claimed locally.
The expanded CI image gate must pass before this remediation is accepted.
