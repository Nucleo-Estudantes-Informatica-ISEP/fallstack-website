# 0038: Issue offline downloadable student passes

Status: Accepted
Date: 2026-11-16
Source: [Issue #406](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/406)

## Context

Students attending the event may encounter poor or non-existent network
connectivity at the venue. The web pass dashboard displays a rotating preview
token (`/qrcode`), which is intentionally short-lived and unsuitable for offline
caching. While Google Wallet provides persistent on-device storage, attendees
without Google Play Services or compatible devices cannot use it.

[ADR 0022](0022-six-character-student-codes.md) established the permanent
six-character student code (`Student.code`) for scan verification and manual
typed fallback. A downloadable, offline-usable pass was requested under
[Issue #406](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/406).

## Decision

Provide a client-rendered downloadable PNG pass (1000 × 1500) generated from the
authenticated pass view (`PassMenuContent`).

1. **Permanent identifier:** The pass embeds the permanent `Student.code` in
   both the high-contrast QR code (quiet zone of 40 px) and a dedicated fallback
   validation code box, alongside student identity (name and optional email) and
   approved event branding (`branding.ts`, 2026 landing composite, NEI logo).
2. **Offline validity model:**
   - The downloaded PNG is an attendee identifier, not an access credential or
     session token. It resides statically on the student's device storage.
   - Company and staff interactions verify the permanent code against the
     database at `/api/students/token` or lookup endpoints.
   - Deactivation (`User.active=false`) blocks active web sessions and new pass
     downloads, but intentionally does not invalidate the permanent code for
     attendee identification (consistent with Google Wallet semantics in
     [ADR 0010](0010-expire-and-revoke-wallet-passes.md)).
   - Account deletion removes the student record from the database. When the
     account is deleted, code lookups will fail to recognize the student, and the
     Google Wallet pass is revoked. The downloaded image cannot be purged
     remotely from the student device, but its code ceases to resolve upon check.
3. **Resilient generation and feedback:** Asset and canvas initialization
   failures (background image, logo, QR SVG conversion, canvas context) reject
   instead of downloading partial or unbranded assets. Failures display an
   accessible error alert and keep the download button actionable for immediate
   retry.

## Consequences

Students can reliably identify themselves at booths and sessions without internet
access. Because the permanent code is static, possession of the downloaded image
provides attendee identification equivalent to a physical badge. Remote
revocation is enforced server-side upon code verification.
