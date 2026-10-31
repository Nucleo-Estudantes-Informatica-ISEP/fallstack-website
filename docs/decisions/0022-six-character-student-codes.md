# 0022: Issue six-character student codes

Status: Accepted
Date: 2026-10-30
Source: [Issue #405](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/405)

## Context

The event plan asked for a six-digit fallback code that people type when a QR
scan is not possible. The implementation issues four-character alphanumeric
student codes (`A-Z0-9`, 36⁴ ≈ 1.68 million values). Organizers chose six
alphanumeric characters over both the plan's six digits (10⁶ values) and the
current length.

[ADR 0014](0014-bound-student-token-verification.md) bounds guessing through
the employee preview-token endpoint with five invalid attempts per employee per
minute. A longer code reduces the chance that any single guess succeeds.

## Decision

Issue new student codes with six characters from the existing `A-Z0-9`
alphabet (36⁶ = 2,176,782,336 values). Keep the alphabet, case-insensitive
normalization and the unique `Student.code` column.

Do not re-issue codes. Accept both four-character and six-character codes on
lookup, so QR codes, wallet passes and printed material that carry an existing
code keep working. Only newly created students receive six characters.

Capacity and collisions, for an illustrative 5,000 students:

- Chance that a new random code equals an existing one: about 2.3 × 10⁻⁶
  (5,000 / 36⁶), against about 3 × 10⁻³ with four characters.
- Chance that one blind guess hits an existing six-character code: the same
  2.3 × 10⁻⁶. Five guesses a minute per employee under ADR 0014 need about
  60 days of continuous guessing from one account to expect one hit.
- Generation keeps the existing retry loop that regenerates on a lookup hit.
  The unique constraint stays the final guard against a concurrent insert.

## Consequences

Typing is slightly longer. The alphabet still contains look-alike characters
(`0`/`O`, `1`/`I`); this decision does not change it.

Existing four-character codes stay guessable at the old rate. The ADR 0014 limit
remains their only protection. If that risk is not acceptable, a later ADR must
re-issue them and drop four-character acceptance.

The implementation change is separate from this record. It raises
`STUDENT_CODE_LENGTH` to six for generation, makes `isStudentCode` accept both
lengths, and removes the `maxLength={4}` limits on the typed-code inputs in
`CompanyTab` and `CompanySavedProfilesSection`. Typed-code entry and
QR-unavailable flows for company/booth, employee/staff and talk interactions
are verified under #405 and the final rehearsal in #344.
