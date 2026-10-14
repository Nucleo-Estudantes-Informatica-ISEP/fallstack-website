# Auto-unblock GitHub Projects

This automation runs every 10 minutes from the default branch and covers Projects 11, 13, and 10 in Nucleo-Estudantes-Informatica-ISEP and Project 2305 in Departamento-de-Engenharia-Informatica. Board 10 includes all issues from any repository included in the board, not just antirecurso.

It only updates open issues with a single-select Status field currently equal to `Blocked`, when they have at least one native GitHub **Blocked by** relationship and every blocker is **closed as completed**. Drafts, PRs, archived entries, and items without dependencies are ignored. It sets Status to `Todo` (or `To do`). An API failure is treated as a failure and never as a completed dependency.

## Setup

1. Create an Actions secret named `PROJECT_AUTOMATION_TOKEN` on `fallstack-website`. The credential must have Projects write permission and read access to all issues linked by dependencies, in both organizations. One option is a classic PAT with `project` scope and `repo` for private repos, granted to an appropriately authorized automation account; follow your organizations' SSO and credential policies. Prefer an appropriately scoped GitHub App token for a long-term setup where possible.
2. Verify each board has a **Status** single-select field, a **Blocked** value, and a **Todo** or **To do** value; verify blockers use GitHub's native issue dependency relations.
3. Merge the workflow PR into `main`. Scheduled runs only run on the default branch.
4. On the Actions tab, manually run **Auto-unblock GitHub Projects tasks** with `dry_run` enabled first, and inspect the logs. Once satisfied, leave it to its schedule.

The built-in Actions `GITHUB_TOKEN` is not sufficient for cross-organization Projects. GitHub may delay scheduled runs. Missing access to a board is reported as a failed run, while other boards are still checked.

API docs: https://docs.github.com/en/rest/issues/issue-dependencies
