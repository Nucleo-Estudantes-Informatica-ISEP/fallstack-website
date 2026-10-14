#!/usr/bin/env python3
"""Move GitHub Projects issues from Blocked to Todo when every native blocker is completed.

This scans all project items, including issues from repositories other than the host
repository. No project fields are modified unless explicitly in the Blocked status.
"""

import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

API_BASE = "https://api.github.com"
GRAPHQL_QUERY = """
query($owner: String!, $number: Int!, $cursor: String) {
  organization(login: $owner) {
    projectV2(number: $number) {
      id
      title
      field(name: "Status") {
        ... on ProjectV2SingleSelectField {
          id
          options { id name }
        }
      }
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isArchived
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          content {
            ... on Issue {
              number
              state
              url
              repository { nameWithOwner }
            }
          }
        }
      }
    }
  }
}
"""
GRAPHQL_UPDATE = """
mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $project
    itemId: $item
    fieldId: $field
    value: { singleSelectOptionId: $option }
  }) {
    projectV2Item { id }
  }
}
"""


def request_api(path, token, *, payload=None):
    """Fail closed on errors; never assume dependencies are complete after an API error."""
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = Request(
        f"{API_BASE}{path}",
        data=body,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "github-projects-auto-unblock",
            **({"Content-Type": "application/json"} if payload is not None else {}),
        },
        method="POST" if body is not None else "GET",
    )
    try:
        with urlopen(req, timeout=30) as response:
            return json.load(response)
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")[:1000]
        raise RuntimeError(f"GitHub API {path} returned HTTP {exc.code}: {error_body}") from exc
    except (URLError, TimeoutError) as exc:
        raise RuntimeError(f"GitHub API {path} unavailable: {exc}") from exc


def graphql(token, query, variables):
    response = request_api("/graphql", token, payload={"query": query, "variables": variables})
    if response.get("errors"):
        raise RuntimeError(f"GitHub GraphQL error: {response['errors']}")
    if "data" not in response:
        raise RuntimeError("GitHub GraphQL did not return data")
    return response["data"]


def list_blockers(token, repository, number):
    owner, repo = repository.split("/", maxsplit=1)
    blockers = []
    page = 1
    while True:
        path = (
            f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}/issues/{number}"
            f"/dependencies/blocked_by?per_page=100&page={page}"
        )
        results = request_api(path, token)
        if not isinstance(results, list):
            raise RuntimeError(f"Unexpected blockers response for {repository}#{number}")
        blockers.extend(results)
        if len(results) < 100:
            return blockers
        page += 1


def find_todo_option(status_field):
    if not status_field or not status_field.get("id"):
        raise RuntimeError("Project has no single-select Status field")
    for option in status_field.get("options", []):
        if option["name"].strip().casefold() in {"todo", "to do"}:
            return option["id"]
    raise RuntimeError("Project Status field has no 'Todo' or 'To do' option")


def process_project(token, owner, number, *, dry_run=False):
    print(f"\nChecking {owner} project #{number}", flush=True)
    cursor = None
    checked = 0
    moved = 0
    while True:
        data = graphql(token, GRAPHQL_QUERY, {"owner": owner, "number": number, "cursor": cursor})
        org = data.get("organization")
        project = org.get("projectV2") if org else None
        if not project:
            raise RuntimeError(f"Project {owner}#{number} is missing or inaccessible")
        option_id = find_todo_option(project["field"])
        print(f"Project: {project['title']}", flush=True)
        for item in project["items"]["nodes"]:
            status = item.get("fieldValueByName") or {}
            issue = item.get("content") or {}
            if item.get("isArchived") or status.get("name", "").strip().casefold() != "blocked":
                continue
            if issue.get("state") != "OPEN" or "repository" not in issue:
                continue
            repository = issue["repository"]["nameWithOwner"]
            number_issue = issue["number"]
            checked += 1
            blockers = list_blockers(token, repository, number_issue)
            if not blockers:
                print(f"  Skip {issue['url']}: no native blockers", flush=True)
                continue
            incomplete = [
                dep.get("html_url", dep.get("url", "unknown"))
                for dep in blockers
                if dep.get("state") != "closed" or dep.get("state_reason") != "completed"
            ]
            if incomplete:
                print(f"  Keep {issue['url']} blocked: {len(incomplete)}/{len(blockers)} blocker(s) incomplete", flush=True)
                continue
            if dry_run:
                print(f"  DRY RUN: would move {issue['url']} to Todo", flush=True)
            else:
                graphql(token, GRAPHQL_UPDATE, {
                    "project": project["id"],
                    "item": item["id"],
                    "field": project["field"]["id"],
                    "option": option_id,
                })
                print(f"  Moved {issue['url']} to Todo", flush=True)
            moved += 1
        page_info = project["items"]["pageInfo"]
        if not page_info["hasNextPage"]:
            break
        if not page_info["endCursor"] or page_info["endCursor"] == cursor:
            raise RuntimeError("Project pagination cursor did not advance")
        cursor = page_info["endCursor"]
    print(f"Result for {owner}#{number}: checked {checked} blocked issues; "
          f"{'would move' if dry_run else 'moved'} {moved}", flush=True)
    return moved


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", action="append", required=True, metavar="OWNER/NUMBER",
                        help="Repeat for each organization Project v2")
    parser.add_argument("--dry-run", action="store_true", help="Log actions without editing Projects")
    args = parser.parse_args()
    token = os.environ.get("GH_TOKEN")
    if not token:
        parser.error("Set GH_TOKEN using the PROJECT_AUTOMATION_TOKEN Actions secret")
    failed = []
    for entry in args.project:
        try:
            owner, number = entry.rsplit("/", 1)
            if not owner or not number.isdecimal():
                raise ValueError("expected OWNER/NUMBER")
            process_project(token, owner, int(number), dry_run=args.dry_run)
        except (ValueError, RuntimeError) as exc:
            print(f"ERROR for {entry}: {exc}", file=sys.stderr, flush=True)
            failed.append(entry)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
