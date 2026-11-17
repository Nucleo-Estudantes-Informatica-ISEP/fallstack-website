# 0048 — Separate student contact email from AuthNEI identity

Status: Accepted

## Decision

Store the editable institutional contact in `Student.institutionalEmail`.
Require an ISEP email during onboarding and validate edits on the server.
`User.email` remains the verified AuthNEI identity and is never changed by
profile edits. Existing profiles receive their current email in the migration;
legacy rows without a contact retain their previous display fallback.
Student DTOs expose the contact through their existing `user.email` field to
preserve profile consumers. Admin email/number lookup refuses ambiguous contacts. Attendance exports use that contact too; this is
self-declared contact information, not proof of institutional ownership.

Admin-only accounts may complete student onboarding and upload its media.
Creation assigns the student role in the same transaction as the profile;
the independent admin grant remains intact. The top bar offers separate links
to the personal student profile and administration. Employee accounts retain
their company role and cannot create a student profile, including employee
admins. Offseason registration restrictions still apply.
