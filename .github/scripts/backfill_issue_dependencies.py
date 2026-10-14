#!/usr/bin/env python3
"""One-time, idempotent backfill of documented native GitHub issue dependencies.

The mapping below comes from the "Dependencies" sections of existing issues.
External approvals and calendar-based gates are intentionally not represented
as fabricated issue-to-issue relationships.

Usage: GH_TOKEN=... python3 .github/scripts/backfill_issue_dependencies.py --dry-run
       GH_TOKEN=... python3 .github/scripts/backfill_issue_dependencies.py
"""

import argparse
import json
import os
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ORG = "Nucleo-Estudantes-Informatica-ISEP"

# issue -> native "Blocked by" issue numbers (within the same repository).
# Includes already-completed prerequisites to preserve a complete dependency graph.
DEPENDENCIES = {
    f"{ORG}/fallstack-website": {
        282: [283, 346],
        369: [367],
        344: [346, 342, 287, 341, 3, 340, 369, 367],
        # #367: organizer-supplied content, not a GitHub issue.
        # #368: scheduled after the event, not blocked by a specified issue.
    },
    f"{ORG}/unclassed": {
        102: [100, 101],
        109: [66, 81, 171],
        173: [109, 171, 172],
        174: [172, 173],
        175: [169, 170, 171, 172, 173, 174],
    },
}


def api(token, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(
        "https://api.github.com" + path,
        data=data,
        method="GET" if payload is None else "POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "fallstack-projects-dependency-backfill",
            **({"Content-Type": "application/json"} if data is not None else {}),
        },
    )
    try:
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"{path} returned HTTP {exc.code}: {body}") from exc
    except (URLError, TimeoutError) as exc:
        raise RuntimeError(f"Request failed at {path}: {exc}") from exc


def issue_path(repo, issue):
    owner, repository = repo.split("/")
    return f"/repos/{quote(owner, safe='')}/{quote(repository, safe='')}/issues/{issue}"


def list_blocker_ids(token, repo, issue):
    existing = set()
    page = 1
    while True:
        path = f"{issue_path(repo, issue)}/dependencies/blocked_by?per_page=100&page={page}"
        items = api(token, path)
        if not isinstance(items, list):
            raise RuntimeError(f"Unexpected dependency listing for {repo}#{issue}")
        existing.update(item["id"] for item in items)
        if len(items) < 100:
            break
        page += 1
    return existing


def create_plan(token):
    """Preflight all issue references, so permission/missing-issue errors happen before writes."""
    plan = []
    cache = {}
    for repo, tasks in DEPENDENCIES.items():
        for issue_number, blocker_numbers in tasks.items():
            key = (repo, issue_number)
            target = cache.setdefault(key, api(token, issue_path(repo, issue_number)))
            if target.get("state") != "open":
                print(f"Skipping closed target {repo}#{issue_number}", flush=True)
                continue
            existing = list_blocker_ids(token, repo, issue_number)
            for blocker_number in blocker_numbers:
                if blocker_number == issue_number:
                    raise RuntimeError(f"Self-dependency rejected: {repo}#{issue_number}")
                blocker_key = (repo, blocker_number)
                if blocker_key not in cache:
                    cache[blocker_key] = api(token, issue_path(repo, blocker_number))
                blocker = cache[blocker_key]
                if blocker.get("pull_request"):
                    raise RuntimeError(f"Not an issue: {repo}#{blocker_number}")
                blocker_id = blocker["id"]
                if blocker_id in existing:
                    print(f"Already linked {repo}#{issue_number} <- #{blocker_number}", flush=True)
                else:
                    plan.append((repo, issue_number, blocker_number, blocker_id))
    return plan


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    token = os.environ.get("GH_TOKEN")
    if not token:
        parser.error("Missing GH_TOKEN (Actions secret PROJECT_AUTOMATION_TOKEN)")
    try:
        plan = create_plan(token)
        print(f"\nNative dependencies to add: {len(plan)}", flush=True)
        for repo, issue_number, blocker_number, blocker_id in plan:
            print(f"{'Would add' if args.dry_run else 'Adding'} "
                  f"{repo}#{issue_number} blocked by #{blocker_number}", flush=True)
            if not args.dry_run:
                api(token, issue_path(repo, issue_number) + "/dependencies/blocked_by",
                    {"issue_id": blocker_id})
                time.sleep(0.3)
        print(f"Backfill {'dry run complete' if args.dry_run else 'complete'}", flush=True)
        return 0
    except (RuntimeError, KeyError, TypeError) as exc:
        print(f"Backfill failed: {exc}", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
