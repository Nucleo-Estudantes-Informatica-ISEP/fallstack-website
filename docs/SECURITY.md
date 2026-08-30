# Security Policy

## Table of Contents
1. [Best Practices](#1-best-practices)
2. [Scope and Assumptions](#2-scope-and-assumptions)
3. [Security Controls](#3-security-controls)
   - [SQL Injection](#sql-injection)
   - [XSS](#xss)
   - [CSRF](#csrf)
   - [Content Security Policy (CSP)](#content-security-policy-csp)
   - [Cookies and Session Handling](#cookies-and-session-handling)
   - [Global Security Headers](#global-security-headers)
   - [Authentication and Authorization](#authentication-and-authorization)
4. [Developer Guidelines](#4-developer-guidelines)
5. [Report Vulnerabilities](#5-report-vulnerabilities)

---

## 1. Best Practices
- **Input Validation:** Always use Zod for request validation, located in `src/schemas/`. All new API routes must declare and reuse Zod schemas, returning a consistent error shape (`{ error: string }`).
- **Environment Variables:** Validate environment variables with Zod via `src/config/env.server.ts` and `src/config/env.client.ts`. Never read `process.env` directly.
- **Secrets Management:** Never commit secrets to git. Update `.env.example` when adding keys.
- **Secure by Default:** Prefer same-origin defaults and minimal privileges.
- **Database Access:** Query the database only through Prisma repositories under `src/application/repositories/`. Do not build raw SQL strings.
- **Dependencies:** Regularly check for known vulnerabilities and review breaking changes before updating.

## 2. Scope and Assumptions
- This document centralizes the project's security practices, controls, and reporting processes.
- The current CSP is intentionally restrictive and is set to `Content-Security-Policy-Report-Only` in development, while production uses the enforced `Content-Security-Policy` header.
- Authentication relies heavily on Supabase; do not modify session providers without extensive review.
- The project uses a layered approach: Zod validation, Prisma query building, server-side session checks, strict cookies, and a narrow CSP. No single control replaces the others.

## 3. Security Controls

### SQL Injection
The application does not rely on string concatenation for database queries. Every database read/write is performed through Prisma in `src/application/repositories/` and through typed query input objects.

This is crucial because the main defense against SQL injection is not a single regex or filter — it is the use of a parameterized query system that binds values separately from the SQL structure. Prisma does this for us automatically.

Examples of the pattern used in the codebase:
- `prisma.user.findUnique({ where: { email } })`
- `prisma.student.findMany({ where: { user: { role: "STUDENT" } } })`
- `prisma.savedStudent.findFirst({ where: { studentId, employeeId } })`

The important idea is that the filter values are passed as data, not injected into SQL text. If an attacker submits `admin' OR 1=1 --` as a string, Prisma will treat it as a value, not as executable SQL logic.

What we do to defend against this class of vulnerability:
- Keep all Prisma access inside repository files.
- Validate user input with Zod before it reaches the database layer.
- Do not use raw SQL for application logic.
- Do not interpolate untrusted strings into SQL fragments or dynamic `where` conditions.
- Keep a clear separation between the repository layer and route/service logic.

This is one of the biggest reasons the project prefers `application/repositories/*` instead of ad hoc database code in routes.

### XSS
XSS is prevented by several layers, not by a single setting.

1. React escaping by default
- In React, values rendered as text are escaped by default.
- This prevents a string like `<script>alert(1)</script>` from being executed when it is rendered as normal text in JSX.

2. Avoiding unsafe HTML rendering
- The project avoids pattern-based HTML injection in UI code.
- We do not rely on `dangerouslySetInnerHTML` for regular user-facing rendering.
- If a future feature really needs rich HTML, it must be sanitized with a dedicated library and a clear threat model.

3. CSP hardening
- The `Content-Security-Policy` restricts script execution to trusted origins.
- The policy explicitly sets `script-src 'self'`, which blocks remote scripts from unapproved domains.
- `object-src 'none'` disables plugin execution, reducing the impact of a malicious payload that attempts to execute embedded components.

4. Safe redirect handling
- A redirect helper like `sanitizeNext()` ensures that the application only redirects to internal paths.
- It rejects `null`, malformed paths, external hosts, and backslash tricks such as `/\evil.com` that may normalize to external URLs in browser URL parsing.
- This protects against open redirect issues, which are often a precursor to phishing or XSS-driven user confusion.

5. Data minimization in observability
- Sensitive values are stripped before sending events to Sentry.
- The sanitization layer removes request bodies, headers, cookies, and other PII-like fields.
- This reduces the blast radius if a malicious payload reaches logs or monitoring tools.

The key principle is: even if unsanitized data reaches the frontend, the browser must not execute it as code, and the CSP must not allow it.

### CSRF
Cross-Site Request Forgery relies on the browser automatically attaching cookies to requests initiated by another site.

This project reduces the risk by using server-side session cookies configured with strict browser semantics:
- `httpOnly: true` prevents JavaScript access to the cookie.
- `sameSite: "lax"` or `sameSite: "strict"` helps the browser ignore cross-site requests for cookies.
- `secure: true` in production ensures the cookie is only sent over HTTPS.

Examples in the codebase:
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/signup/employee/route.ts`
- `src/app/api/auth/callback/zitadel/route.ts`
- `src/application/services/authService.ts`

This does not replace a dedicated anti-CSRF token in every single mutation flow, but it does reduce the attack surface by making browser cookie sending behave more like a same-site-only policy. The project also relies on server-side session validation and auth checks in `defineHandler` for route-level authorization.

Important caveat: ideally, any future state-changing action that is intentionally cross-site accessible should get an explicit CSRF token or a custom same-site-safe flow. Until then, the current pattern remains conservative and relies on same-site cookie semantics plus strong server-side auth checks.

### Content Security Policy (CSP)
CSP is a browser-enforced allowlist for where resources may come from and what types of resources are allowed to execute.

In practice, it blocks scripts, styles, frames, and network requests unless the policy explicitly permits them.

The project builds the policy in `src/security/csp.js` and applies it through `next.config.js`.

Current policy is intentionally minimal and explicit:
- `default-src 'self'` — only same-origin resources by default.
- `script-src 'self'` — JavaScript may only come from the current origin.
- `style-src 'self' 'unsafe-inline' https://rsms.me` — same-origin CSS plus the Inter font stylesheet origin.
- `img-src 'self' data: blob: <supabase-origin>` — local images, inline data URIs, blobs, and Supabase storage are allowed.
- `connect-src 'self' <supabase-origin> <sentry-origin>` — API calls and telemetry are restricted to the app, Supabase, and Sentry.
- `font-src 'self' https://rsms.me` — only local fonts and the specific font host.
- `object-src 'none'` — disables plugin/object execution.
- `base-uri 'self'` — prevents changing the document base URL to an attacker-controlled origin.
- `form-action 'self'` — form submissions are restricted to the current origin.
- `frame-src 'self' https://www.youtube.com` — iframes are allowed only to the app itself and YouTube embeds.
- `frame-ancestors 'none'` — prevents the site from being framed by another website.

#### Current allowlist of external origins
The following table reflects the current explicit origins defined in `src/security/csp.js` and the reason they are enabled.

| Origin / source | Used in directive(s) | Why it is allowed | Why this is safe |
| --- | --- | --- | --- |
| `'self'` | all relevant directives | Same-origin app assets and endpoints | Keeps the application within its own domain unless explicitly approved |
| `NEXT_PUBLIC_SUPABASE_URL` | `img-src`, `connect-src` | Supabase storage and API access for avatars, files, and authenticated requests | This is a single, known backend dependency; it is not a generic wildcard |
| `NEXT_PUBLIC_SENTRY_DSN` origin | `connect-src` | Browser crash/telemetry reporting to Sentry | Only the exact Sentry origin is allowed; no arbitrary remote endpoint is permitted |
| `https://rsms.me` | `style-src`, `font-src` | Inter font stylesheet and font files | Required only for typography; no script execution is allowed from this host |
| `https://www.youtube.com` | `frame-src` | Embedded YouTube videos in public/company content | The application allows a specific embed target instead of arbitrary iframe content |
| `data:` | `img-src` | Inline images/data-URI resources | Needed only for image rendering; it does not permit script execution |
| `blob:` | `img-src` | In-browser generated blobs (e.g. temporary images or file previews) | Restricts blob usage to image resources and not to script or plugin execution |

This is intentionally stricter than a permissive `*` policy. A wildcard would allow any host to become a script, stylesheet, image, or frame source, which would undermine the browser's ability to protect the app.

Why this matters:
- It makes browser-based script injection harder, even if an attacker does manage to inject a malicious payload into a page.
- It reduces the damage of malware-style payloads that rely on remote scripts, trackers, or `iframe` embedding.
- It provides a defense-in-depth layer on top of input validation and server-side auth.

Policy source handling: when adding a new external source, do it explicitly and intentionally in `src/security/csp.js`.

For example, a new source would be added in the `sources` object and then only whitelisted in the specific directive that needs it:
- `supabase` is allowed only in `img-src` and `connect-src` because the app uses it for storage and API access.
- `youtube` is allowed only in `frame-src` because the app embeds YouTube content.
- `rsms` is allowed only in `style-src` and `font-src` because the app loads the Inter font from that provider.

#### Rules

- Never add `*` as a shortcut.
- Never use `'unsafe-inline'` or `'unsafe-eval'` unless there is a documented and reviewed reason.
- Never allow a third-party origin in multiple directives if only one directive needs it.
- Add the exact origin, not a broad wildcard, and explain why it is necessary.
- Validate the changed behavior in staging after adding a new origin.

#### Development vs production:
- The project chooses the header name dynamically:
  - production: `Content-Security-Policy`
  - development: `Content-Security-Policy-Report-Only`
- This is deliberate: in development, the team can detect violations without accidentally breaking the local experience while tuning the policy.

Related file: `src/security/csp.js`
Related config: `next.config.js`

### Cookies and Session Handling
Cookies are configured with restrictive browser flags to minimize exposure:
- `httpOnly: true` prevents JavaScript access to the cookie value.
- `secure: true` in production ensures the cookie is only sent over HTTPS.
- `sameSite: "lax"` or `sameSite: "strict"` limits browser behavior for cross-site requests.
- session cookies are issued only after authentication and route authorization is checked.

This is important for both session integrity and CSRF resistance. The app does not store session identifiers in local storage or plain client-side state; the browser keeps them in HTTP-only cookies, and the server reads them on the request.

### Global Security Headers
The following headers are applied globally via `next.config.js`:
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
- `Content-Security-Policy` or `Content-Security-Policy-Report-Only`

These headers reduce the risk of MIME confusion, framing abuse, information leakage, and over-broad browser permissions.

### Authentication and Authorization
- Supabase Auth is used for session-based identity.
- Short-lived JWTs are used for QR/action tokens and preview flows.
- Authorization is enforced server-side, not only on the client.
- The route layer uses auth strategies and explicit validation before running business logic.
- Redirects are sanitized to avoid open redirect abuse.

### Data Access and Migrations
- Prisma is the system of record for database access.
- Schema changes go through Prisma Migrate rather than ad hoc DB editing.
- The application keeps repository code in `src/application/repositories` and prevents direct SQL generation from routes.
- This keeps the data layer predictable and reduces injection risk.

## 4. Developer Guidelines
- **Third-party scripts:** Prefer explicit CSP whitelisting over using broad domains.
- **Inline execution:** Avoid `unsafe-inline` and `unsafe-eval` unless there is a strong, documented reason and a reviewed mitigation.
- **External resources:** Prefer HTTPS and exact origins, not wildcard domains.
- **Database queries:** Keep all queries in Prisma repositories, not route files.
- **User input:** Treat every request field as untrusted until validated with Zod.
- **Redirects:** Restrict to internal routes only.
- **Logging:** Never log secrets, tokens, cookies, or raw PII without redaction.
- **Images and remote media:** Use the explicit list in `src/config/imageRemotePatterns.js` instead of allowing all origins.
- **New CSP sources:** Add only the required domain, only in the required directive, and document the reason.

Do not use `*` in CSP allowlists for application security. `*` means “accept everything”, which is the opposite of the defensive posture the project is trying to enforce.

## 5. Report Vulnerabilities
If you discover a potential security vulnerability, please follow the responsible disclosure process below:

**How to Report:**
To help us reproduce and fix the issue quickly, you must provide clear evidence of the vulnerability. Please submit:
- A **video recording** demonstrating the exploit step-by-step.
- OR a **document with screenshots (prints)** detailing the exact execution and reproduction steps.

**Where to Report:**
Send your report (video or document) directly to the **current coordinators of the Infraestruturas Informáticas department**.

**Timeline and Expectations:**
- Reports are treated as confidential.
- Maintainers will aim to respond within 72 hours.
- For critical issues, mitigation and patches are prioritized based on impact.
