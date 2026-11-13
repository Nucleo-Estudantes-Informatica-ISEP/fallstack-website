# 0035: Gate fixable image vulnerabilities

Status: Accepted
Date: 2026-11-12

## Context

Deployed images include operating system and library dependencies. Unfixed advisories can block unrelated changes without an available upgrade.

## Decision

CI blocks fixable HIGH and CRITICAL OS and library findings in the runner, migrator and storage-cleanup images. Excluded unfixed findings require regular security triage as described in the verification guide.

## Consequences

New fixable findings block CI until addressed. Unfixed findings do not block CI and require separate monitoring and mitigation; a passing gate does not mean an image has no vulnerabilities.
