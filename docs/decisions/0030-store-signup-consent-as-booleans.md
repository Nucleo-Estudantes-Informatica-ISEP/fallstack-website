# 0030: Store signup consent as booleans for now

Status: Accepted

Date: 2026-11-11

## Context

Student signup shows a privacy policy checkbox that only the browser enforces.
Issue #404 asks to persist consent. The `Student` table gets two columns,
`privacyPolicyAccepted` and `termsAccepted`, both `BOOLEAN NOT NULL DEFAULT
false`.

A boolean does not record which policy version a student accepted or when. The
policy documents and their version identifiers are not agreed yet, so a richer
design would rest on guesses.

## Decision

Keep the two boolean columns as the stored form of consent for now. Existing
students read as `false`, meaning no recorded consent.

Do not add a policy version or acceptance time until the team agrees on the
policy documents and how they are versioned. When that happens, add a new
ADR that supersedes this one.

## Consequences

- The columns carry no evidence of when or to which policy text a student
  consented. Treat them as a record that the checkbox was ticked, not as proof
  of consent.
- Existing students have `false`. Do not read this as a refusal.
- Server-side enforcement on `POST /api/students` is not decided here. Until
  it is, a client that skips the form can create a profile without consent.
- Moving to version and time later needs a new migration. Rows written as
  `true` before then cannot be given a version retroactively.
