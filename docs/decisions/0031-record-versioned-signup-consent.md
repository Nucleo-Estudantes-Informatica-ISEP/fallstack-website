# 0031: Record versioned signup consent

Status: Accepted

Date: 2026-11-11

Supersedes [ADR 0030](0030-store-signup-consent-as-booleans.md).

## Context

Issue #404 requires independent course capture and server-side privacy and terms
acceptance. Boolean defaults alone cannot identify the text or acceptance time.
The privacy policy has an effective date of 31 October 2026. Terms of use are
introduced in this change at `/terms`, version `2026-11-11`.

## Decision

New student signup requires a nonempty course, two explicit acceptance booleans,
and the currently displayed privacy and terms versions. The server validates
these values before writes and records both versions and its own UTC timestamp
in the same transaction as profile creation. Client timestamps are ignored.
Course is stored separately from the existing year/degree enum and returned in
profile DTOs. Terms acceptance and privacy consent use separate unchecked inputs.

Existing accounts retain nullable course/version/time fields and false consent
defaults. Do not backfill consent, block existing logins, or interpret absent
records as refusal. Admin-created accounts retain the existing defaults and are
not evidence of student acceptance. Existing profile edits cannot change consent
records through the profile schema. Evidence is not added to public profile DTOs.

## Consequences

The displayed policy and modal must share a privacy version. Any policy or terms
text change requires a new version and preservation of the previous text in Git
history; do not reuse an identifier for different text. Deploy signup UI and API
from the same revision: stale clients must reload before accepting changed text.

The terms introduce platform-use rules and preserve statutory rights; they do not
replace the privacy policy or claim legal approval. Consent withdrawal/account
closure continues through the existing account controls and organisation contact.
The migration adds only nullable evidence fields; it invents no historical consent.

Reference: [GDPR Article 7](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/) for distinct consent and its evidencing; this ADR records implementation, not a legal-compliance certification.
