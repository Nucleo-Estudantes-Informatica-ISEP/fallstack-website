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

## Published-tag correction required

The existing annotated `2026-edition` tag object is
`d71aa93c37f6354b77fcf2cf49a6da1ea998c542`, pointing to July commit
`94691019eea7dfd5bb9580da0a1ac37d89864dc8`. Its GitHub Release was published on
18 July 2026 at 23:06:33 UTC. It predates the event and omits event-day fixes.

Replacing this published tag changes the source archives at an existing public
URL. Explicit maintainer approval is required before moving it. Preserve the
July revision and release notes before replacement, then point `2026-edition`
to the verified production commit above and update the matching Release with
the event edition changelog. Verify the remote tag's peeled commit and both
GitHub source archive links afterward. Do not tag the later changelog commit:
the edition archive must preserve the code actually deployed during the event.

Until that correction is approved and verified, issue #368 is incomplete.
The changelog update must follow the normal PR into `dev` and reviewed
promotion to `main`; no runtime change or new SemVer tag is needed for it.
