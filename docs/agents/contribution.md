# Contribution workflow

This is the repository's branch, commit, issue, PR, and verification workflow.
[`AGENTS.md`](../../AGENTS.md) is the short operational index.

## Issues

Use the [task issue template](../../.github/ISSUE_TEMPLATE/task.md). Issues use
**Description**, optional **Why**, **Scope**, **Acceptance Criteria**, and
optional **Dependencies**. List each dependency as its own checkbox; remove
optional sections when they do not apply.

## Branches, commits, and pull requests

1. Branch from `dev` as `<type>/<short-kebab-case-description>` using
   [Conventional Branch](https://conventionalbranch.org/). Use `feature/` or
   `feat/` for functionality, `bugfix/` or `fix/` for fixes, `hotfix/` for
   urgent production fixes, `release/` for release preparation, `docs/` for
   documentation-only work, and `chore/` for other non-code work.
2. Commit with [Conventional Commits](https://www.conventionalcommits.org/).
   Keep subjects under 72 characters, split unrelated work into separate
   commits, and omit AI co-author trailers.
3. Update from `dev`, push the task branch, and open a PR into `dev` using the
   [PR template](../../.github/PULL_REQUEST_TEMPLATE.md). Reference its issue,
   summarize the change, report tests and manual steps, and state any Prisma
   migration, environment, storage, or deployment configuration change.

`Closes #N` links the issue, but GitHub closes it only when the change reaches
the default branch (`main`) through the promotion PR.

`main` is the release branch. A reviewed `dev` to `main` promotion PR ships a
release; Coolify deploys that production branch. Do not add a competing deploy
workflow. A PR that settles a meaningful design decision should add or update
an [ADR](../decisions/README.md).

## Checks and test-first work

Prefer a focused failing test first for bug fixes and business rules. Every
behavior change needs a regression test at the lowest useful level; use
integration or browser smoke coverage where unit tests cannot prove the
boundary. If a pre-fix test is impractical, explain why and give a repeatable
staging check.

Before requesting review, run `pnpm lint`, `pnpm test`, `pnpm typecheck`,
`pnpm build`, and `pnpm exec prisma validate`. For deployment-sensitive changes,
build the affected Docker target. Start `pnpm dev` and exercise the changed
route or page; for API routes check body and status. Report any part that
could not be exercised. CI also runs frozen install, production and migrator
Docker builds, non-root assertions, and Gitleaks. Do not weaken checks to make
them pass.

Commit Prisma migrations with schema changes. The migrator service applies
them before the app becomes healthy; report deployment only after observing
it. Dependency PRs use the same gates. Major upgrades need a migration plan.
