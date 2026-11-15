# 0041: Run CI on a dedicated runner

Status: Accepted
Date: 2026-11-15

## Context

The project needs dedicated CI capacity independent of GitHub-hosted runner
concurrency. The repository is public and CI executes pull request code.

## Decision

Run the CI quality and Docker jobs on a repository-scoped Linux runner labelled
`fallstack-david`. The runner operates inside a dedicated virtual machine with
its own Docker daemon. Other workflows keep their existing runner selection.

The VM is persistent and handles one job at a time. Its operator maintains
Docker, BuildKit, Compose, available disk space, the runner, and VM availability.
The quality job removes its named test Redis container before and after use.

## Consequences

Jobs queue while the runner is busy or unavailable; they do not automatically
fall back to GitHub-hosted capacity. CI depends on the host remaining online.
Build artifacts and software installed by one job can persist into later jobs.

Code from a public pull request can compromise the runner VM and affect later
CI jobs. VM and network restrictions reduce access to the host but do not
eliminate this risk. Do not place production credentials in this VM or route
privileged workflows through it. Review pull request workflow approvals and
rebuild the VM if compromise is suspected. A disposable VM per job would provide
stronger isolation.
