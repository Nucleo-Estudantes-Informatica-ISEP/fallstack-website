# Observability setup

Fallstack uses Pino for structured server logs and Sentry for error monitoring and centralized log search. Monitoring is optional: the application still starts when Sentry variables are absent. The Sentry SDK also works unmodified against a self-hosted Sentry-compatible backend (e.g. GlitchTip) — set `NEXT_PUBLIC_SENTRY_DSN` to that instance's DSN and `SENTRY_URL` to its base URL (see below); no SDK code changes are needed either way.

## Architecture

```text
Next.js server code ──> Pino JSON ──> stdout ──> Docker/platform log collector
                         │
                         └──────────> Sentry Logs

Browser, server, and edge errors ──> Sentry Issues
```

Tracing and Session Replay are disabled. The application does not intentionally send user identity, request bodies, cookies, query strings, full URLs, or original exception messages to Sentry.

## 1. Create the Sentry project

1. Sign in to [Sentry](https://sentry.io/) and create or select an organization.
2. Create a project with the **JavaScript / Next.js** platform.
3. Open **Project Settings → Client Keys (DSN)** and copy the DSN. This is the value for `NEXT_PUBLIC_SENTRY_DSN`.
4. Copy the organization slug from **Organization Settings → General Settings**.
5. Copy the project slug from **Project Settings → General Settings**.

The DSN contains a public ingestion key and may be included in the browser bundle. It does not grant access to Sentry data. Organization tokens are secrets.

For a self-hosted Sentry-compatible backend (e.g. GlitchTip) instead of sentry.io, create the equivalent organization/project in that instance's own UI and copy the same three values (DSN, org slug, project slug) from there. Menu paths and exact terminology may differ from Sentry's — check your instance's docs. Also set `SENTRY_URL` to the instance's base URL (e.g. `https://glitchtip.your-domain.example/`); without it, source-map upload still targets sentry.io regardless of which DSN the app uses at runtime (see below).

## 2. Create the source-map token

Source maps make minified production stack traces readable. Upload occurs during `next build`, not while the application is running.

1. Open **Organization Settings → Custom Integrations**.
2. Create an **Internal Integration**, for example `fallstack-ci`.
3. Grant only the **Organization: CI (`org:ci`)** permission needed for CI workflows and source-map uploads.
4. Save the integration and copy its organization token.
5. Store it as `SENTRY_AUTH_TOKEN` in the CI secret store or pass it to Docker as a BuildKit secret.

Never place this token in Git, `.env.example`, a Docker build argument, an image environment variable, or application runtime logs. Rotate it immediately if exposed. This applies the same way whether the token comes from sentry.io or a self-hosted instance.

## 3. Environment variables

| Variable                 | Secret  | Phase           | Required         | Purpose                                                                                   |
| ------------------------ | ------- | --------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | No      | Build + runtime | No               | Enables browser, server, and edge event delivery. Browser value is embedded during build. |
| `SENTRY_URL`             | No      | Build           | Self-hosted only | Base URL of a self-hosted Sentry-compatible backend (e.g. GlitchTip). Unset uploads source maps to sentry.io regardless of DSN. |
| `SENTRY_ORG`             | No      | Build           | Source maps only | Sentry (or GlitchTip) organization slug.                                                  |
| `SENTRY_PROJECT`         | No      | Build           | Source maps only | Sentry (or GlitchTip) project slug.                                                       |
| `SENTRY_AUTH_TOKEN`      | **Yes** | Build only      | Source maps only | Authenticates release/source-map upload.                                                  |
| `LOG_LEVEL`              | No      | Runtime         | No               | Pino threshold: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`.          |

Defaults: `LOG_LEVEL=debug` outside production and `LOG_LEVEL=info` in production. Sentry stays disabled when `NEXT_PUBLIC_SENTRY_DSN` is empty.

## 4. Local setup

Copy the environment template:

```bash
cp .env.example .env
```

For local Sentry delivery, add only the public DSN:

```dotenv
NEXT_PUBLIC_SENTRY_DSN="https://public-key@o0.ingest.sentry.io/project-id"
LOG_LEVEL="debug"
```

Start the application:

```bash
pnpm dev
```

Server logs remain newline-delimited JSON. Pipe them into a JSON-aware local viewer if desired; no pretty-print transport is installed in production code.

To work without Sentry, remove or comment out `NEXT_PUBLIC_SENTRY_DSN`. Local stdout logging continues.

## 5. Production build

### Direct build

Set build variables in the CI secret/environment store, then run:

```bash
NEXT_PUBLIC_SENTRY_DSN="$NEXT_PUBLIC_SENTRY_DSN" \
SENTRY_URL="$SENTRY_URL" \
SENTRY_ORG="$SENTRY_ORG" \
SENTRY_PROJECT="$SENTRY_PROJECT" \
SENTRY_AUTH_TOKEN="$SENTRY_AUTH_TOKEN" \
pnpm build
```

Only `SENTRY_AUTH_TOKEN` is secret. The Sentry build plugin uploads source maps and removes uploaded maps from the generated output. Leave `SENTRY_URL` unset when using sentry.io.

### Docker without source maps

`docker-compose.app.yml` passes public build values from the shell or `.env`:

```bash
docker compose -f docker-compose.app.yml build
docker compose -f docker-compose.app.yml up -d
```

The application builds and runs when all Sentry values are absent.

### Docker with source maps

BuildKit passes the auth token through a temporary secret mount. It is unavailable after the build step and is not stored in image history:

Allocate at least 4 GB of memory to the Docker builder. The Next.js builder uses a 2 GB Node heap to compile the application reliably.

```bash
export NEXT_PUBLIC_SENTRY_DSN="https://public-key@o0.ingest.sentry.io/project-id"
export SENTRY_URL="" # set to e.g. https://glitchtip.your-domain.example/ for a self-hosted backend
export SENTRY_ORG="your-organization-slug"
export SENTRY_PROJECT="your-project-slug"
export SENTRY_AUTH_TOKEN="sntrys_your-token"

docker build \
  --build-arg NEXT_PUBLIC_SENTRY_DSN="$NEXT_PUBLIC_SENTRY_DSN" \
  --build-arg SENTRY_URL="$SENTRY_URL" \
  --build-arg SENTRY_ORG="$SENTRY_ORG" \
  --build-arg SENTRY_PROJECT="$SENTRY_PROJECT" \
  --secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
  -t fallstack-app .
```

Run the built image with the DSN and log level available at runtime:

```bash
docker run --env-file .env -p 4000:4000 fallstack-app
```

Do not pass `SENTRY_AUTH_TOKEN` to `docker run`.

## 6. Pino usage

Import the shared server logger or use `reportError` for caught failures:

```ts
import logger, { reportError } from "@/lib/logger";

logger.info(
  { operation: "refresh_cache", route: "/api/companies", durationMs: 42 },
  "Company cache refreshed"
);

try {
  await doWork();
} catch (error) {
  reportError(
    error,
    { operation: "do_work", route: "/api/example", method: "POST" },
    "Operation failed"
  );
}
```

### Levels

- `trace`: extremely detailed temporary diagnostics.
- `debug`: development diagnostics; disabled by default in production.
- `info`: meaningful successful lifecycle or operational events.
- `warn`: degraded but recoverable conditions.
- `error`: failures needing investigation.
- `fatal`: process cannot continue safely.

Routine successful requests should remain silent. Prefer one structured event per operation over several progress messages.

### Safe fields

Use fixed messages and low-cardinality operational context:

- `operation`
- route templates such as `/api/saved`, never concrete URLs
- HTTP `method` and `status`
- `durationMs`, counts, feature names, and safe provider error codes

Never log sessions, request/response payloads, tokens, passwords, cookies, authorization headers, emails, student codes, database records, or user/company/student/employee identifiers. Never interpolate those values into the message string because field redaction cannot sanitize arbitrary prose.

Configured sensitive fields are replaced with `[REDACTED]` at common nesting levels:

```json
{
  "level": 30,
  "operation": "example",
  "token": "[REDACTED]",
  "msg": "Operation completed"
}
```

Error serializers retain error type and stack frames but remove the original message, which may contain provider-returned PII.

## 7. Sentry privacy controls

Application safeguards:

- `sendDefaultPii` is disabled in browser, server, and edge SDKs.
- Request bodies, cookies, query strings, full request URLs, and user objects are removed.
- Authorization, cookie, email, code, token, session, and identifier attributes are redacted recursively.
- Navigation breadcrumb URLs are redacted.
- Exception messages are replaced with exception types; stack frames remain available.
- Pino performs its own redaction before logs reach stdout or Sentry.

Configure defense-in-depth in Sentry:

1. Open **Project Settings → Security & Privacy**.
2. Enable server-side data scrubbing and the default sensitive-data rules.
3. Add custom sensitive field names: `authorization`, `cookie`, `cookies`, `email`, `password`, `token`, `session`, `code`, `studentCode`, `companyId`, `userId`, `studentId`, and `employeeId`.
4. Do not enable “Send Default PII” in project onboarding snippets.
5. Review one test Issue and Log before enabling production alerts.

## 8. Sentry operations and alerts

After deployment:

1. Open **Issues**, select the Fallstack project, and filter environment to `production`.
2. Open **Explore → Logs** and confirm Pino records contain structured attributes.
3. Confirm source-mapped stack frames point to application source files rather than minified chunks.
4. Create issue alerts for:
   - a new issue;
   - a regressed issue;
   - an issue exceeding the chosen event-volume threshold.
5. Route alerts to the maintained team email, Slack, or incident destination.
6. Start with conservative volume alerts, then tune them from observed production traffic.

Sentry receiving no events while DSN is unset is expected, not an application failure.

## 9. Verification runbook

Use a non-production environment or short maintenance window.

1. Temporarily throw a server-side `Error` from a test-only code path.
2. Trigger it once and confirm a Sentry Issue appears.
3. Confirm environment, exception type, and source-mapped frames are correct.
4. Confirm user data, request body, query string, cookies, full URL, and original error message are absent.
5. Temporarily emit one Pino `error` record with a fake `token`, `email`, and nested `studentCode`.
6. Confirm stdout and Sentry Logs contain `[REDACTED]`, not fake values.
7. Remove all temporary triggers and rebuild before release.

Automated equivalents run with:

```bash
pnpm test
```

## 10. Troubleshooting

### No Sentry events

- Confirm `NEXT_PUBLIC_SENTRY_DSN` exists during both build and runtime.
- Rebuild after changing any `NEXT_PUBLIC_*` value.
- Check project ingestion filters, quotas, and rate limits.
- Confirm the event is generated by application code; browser developer-console exceptions may be isolated.

### Pino logs appear in stdout but not Sentry

- Confirm the server Sentry SDK is enabled with a valid DSN.
- Confirm the record meets `LOG_LEVEL`.
- Check **Explore → Logs**, project, environment, and time filters.
- Check Sentry ingestion quotas and log filters.

### Source-map upload fails

- Confirm `SENTRY_ORG` and `SENTRY_PROJECT` are slugs, not display names.
- Confirm `SENTRY_AUTH_TOKEN` has `org:ci` permission and access to the project.
- Confirm the token is present during `pnpm build` or mounted as BuildKit secret.
- Review build output; runtime configuration cannot retroactively upload source maps.
- On a self-hosted backend, confirm `SENTRY_URL` is set. Without it, the upload silently targets sentry.io using the self-hosted org token, which will fail auth there even though `NEXT_PUBLIC_SENTRY_DSN` correctly points events at the self-hosted instance.

### Docker secret is unavailable

- Use Docker BuildKit and the exact secret ID `sentry_auth_token`.
- Export `SENTRY_AUTH_TOKEN` in the invoking shell.
- Do not replace the secret with a Docker `ARG`.

### Rotate credentials

1. Create a replacement organization token.
2. Update the CI/BuildKit secret store.
3. Run a successful production build and source-map upload.
4. Revoke the old token in Sentry.

Changing the DSN requires a rebuild because the browser value is compiled into client assets.

## References

- [Sentry Next.js manual setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
- [Sentry Logs for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/logs/)
- [Sentry API permissions](https://docs.sentry.io/api/permissions/)
- [Pino documentation](https://getpino.io/)
- [Pino redaction](https://github.com/pinojs/pino/blob/main/docs/redaction.md)
- [Docker build secrets](https://docs.docker.com/build/building/secrets/)
