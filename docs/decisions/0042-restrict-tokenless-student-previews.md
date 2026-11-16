# 0042: Restrict tokenless student previews

Status: Accepted
Date: 2026-11-16
Source: [Issue #606](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/606)

## Context

Company employees open `/student/<token-or-code>/preview` while reviewing a
student. A signed preview JWT is minted by the employee-only
`POST /api/students/token` route and expires after the preview lifetime described
in the architecture documentation. The route also accepts a student code so
employees can recover when scanning a QR code is not possible.

The signed token proves that an employee passed the protected token endpoint.
A raw code does not, so the employee-facing fallback must be paired with the
company’s existing saved-student relationship.

## Decision

Keep both preview forms, with these rules:

- A valid signed preview JWT may preview a student before the employee’s company
  saves that student.
- A tokenless preview using a raw student code is allowed in the employee flow
  only when that employee’s company has already saved the student. The page
  returns the normal not-found response otherwise.
- Administrators use the ordinary full student profile, whose existing admin
  authorization remains the source of truth; they do not need tokenless preview
  access.

This keeps the fallback useful for an employee who has an established business
relationship with the student while preventing a raw code from becoming a
general employee profile-enumeration mechanism. The check is performed against
the company, not only the employee, because `SavedStudent` is unique at the
student/company level and employee attribution is separate. The page still
requires an authenticated session; non-employee roles follow their existing
profile paths rather than this employee fallback.

## Consequences

An employee can still preview an unsaved profile for the short period covered by
a signed token, so the token endpoint’s employee authentication, input
validation, rate limit, and JWT expiry remain security boundaries. A leaked raw
student code does not grant an employee access to an unsaved profile; a leaked
signed token remains usable until expiry, as documented for other short-lived
preview tokens.

The fallback is unavailable before the company saves the student, which is an
intentional usability tradeoff in favor of reducing accidental disclosure and
code-guessing impact. No schema or migration is required. The implementation is
the `isSaved` company check and tokenless-preview guard in the student profile
page; the employee-only token endpoint remains unchanged.
