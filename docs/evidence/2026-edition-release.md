# 2026 edition release evidence

## Production revision

Inspected the existing authenticated Helium Coolify session on 19 November 2026.
The `event:fallstack` project, `production` environment, `fallstack-web:main`
resource showed Running. Its deployment history recorded:

- Commit: `034e317f7a66f1a252c02fe43a816bbd48294dba` (PR #647).
- Trigger: Webhook; status: Success.
- Deployment timestamp: 18 November 2026, 15:32:37 UTC; duration: 4m 33s.
- Deployment ID: `nhyzzkdu9ut6tkl2unc0nvl2`.
- Earlier successful event-day deployments included #646, #645, #644, #643,
  #642 and #639.

This verifies the final recorded event-day production deployment, rather than
inferring deployment from a GitHub Release. No deployment or configuration was
changed during inspection. It does not prove every individual attendee request
or snapshot external database/storage content.

GitHub and fetched Git history confirm `main` points to the same commit and
`v2.10.10` identifies it. PR #635 promoted `dev` to `main` on 17 November at
11:59:30 UTC, following promotions #620 and #623. Later event-day fixes landed
on `main`; PR #648 synchronized that history back into `dev`. At inspection,
`dev` was `bbdd2f5a02578cf3f05877b475e27143245ee111`, with no additional runtime
changes beyond `main`.

## Published-tag correction

The original annotated `2026-edition` tag object was
`d71aa93c37f6354b77fcf2cf49a6da1ea998c542`, pointing to July commit
`94691019eea7dfd5bb9580da0a1ac37d89864dc8`. Its GitHub Release was published on
18 July 2026 at 23:06:33 UTC. It predates the event and omits event-day fixes.

The maintainer explicitly approved preserving the July release and moving the
edition tag after reviewing the production revision and the public-archive risk.
The original annotated tag object is preserved under `2026-pre-event-july`;
its matching GitHub Release retains the original July notes (verified equal,
ignoring trailing whitespace). Existing SemVer tags were not changed.

The corrected annotated `2026-edition` tag object is
`61064ba01d4bcddb981707076e93b5f268a62c0d`, pointing to the verified production
commit `034e317f7a66f1a252c02fe43a816bbd48294dba`. The matching GitHub Release
contains the event edition changelog and explicitly identifies the corrected
freeze and July archive. The archive is separate from the published SemVer
maintenance series.

Verification after publication:

- Remote annotated tag peels to the verified event-day commit; the July archival
  tag still peels to `94691019eea7dfd5bb9580da0a1ac37d89864dc8`.
- Release is published (`draft=false`, `prerelease=false`) and its target is the
  full event-day SHA. Published release notes match the prepared notes.
- Downloaded both source archives through GitHub's Release archive URLs. Every
  one of the 1,321 files in each ZIP/tar.gz matches the corresponding Git blob
  in the event-day commit; filenames and file contents were compared, not only
  the archive directory name.

The later documentation commit is intentionally outside the edition tag:
the archive preserves the source actually deployed during the event. It does
not include this retrospective changelog or deployment evidence.

The release promotion also carries runtime maintenance changes. GitHub’s
`release:patch` label is expected to publish `v2.10.11` after `v2.10.10`
when the promotion merges. The `2026-edition` archive remains at the
event-day revision.
