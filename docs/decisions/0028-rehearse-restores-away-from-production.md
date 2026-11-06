# 0028: Rehearse restores away from production

Status: Accepted

Date: 2026-11-05

## Context

The 3 November restore rehearsal used isolated containers on the production VPS.
An internal network, separate volumes and container resource limits do not
isolate disk exhaustion, Docker daemon access or a compromised host. The
retained evidence contains no owner acceptance of these risks and no exact
image pins. [ADR 0018](0018-back-up-fallstack-data-outside-the-vps.md) governs
backup creation; this decision governs future restore rehearsals.

## Decision

Run future rehearsals on a non-production host with a separate Docker daemon,
disk and kernel. Transfer only encrypted backup material from the backup host;
use authorized access to the separately retained off-VPS recovery identity.
Do not copy the production-host private key. Preserve backup scheduling,
request-budget accounting and source services.

Follow the [restore runbook](../operations/restore-rehearsal.md): record immutable
image references and platform before execution, plan resource names and plaintext
paths durably before creation, and retain recovery state until cleanup is
verified. Keep production personal data restricted even on the separate host.

## Consequences

- A separate authorized host, recovery-key access and sufficient disk space are
  prerequisites to a future rehearsal. None is claimed provisioned here.
- The historical snapshot results remain evidence of that run only. They do not
  demonstrate exact reproducibility, VPS-loss recovery or accepted RPO/RTO.
- Abrupt interruption requires operator cleanup from the retained state and
  resource labels; an exit trap alone cannot guarantee cleanup after host loss.
- The coordinated #464 exercise, authenticated application checks and team
  acceptance remain outstanding. This decision records no human risk sign-off.
