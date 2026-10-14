#!/usr/bin/env python3
"""Temporary all-board issue dependency integration test. Modes: setup, complete, verify, cleanup."""
import json
import os
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BOARDS = [
    ("Fallstack", "Nucleo-Estudantes-Informatica-ISEP", "fallstack-website", 11),
    ("Unclassed", "Nucleo-Estudantes-Informatica-ISEP", "unclassed", 13),
    ("Antirecurso", "Nucleo-Estudantes-Informatica-ISEP", "antirecurso", 10),
    ("DEI", "Departamento-de-Engenharia-Informatica", "LEI-SEM5-PI-2026-27-3DJ-01", 2305),
]
TAG = "[AUTO-UNBLOCK E2E TEST]"
TOKEN = os.environ["GH_TOKEN"]

def api(path, method="GET", payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = Request("https://api.github.com" + path, method=method, data=data, headers={
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "auto-unblock-integration-test",
        **({"Content-Type": "application/json"} if data else {}),
    })
    try:
        with urlopen(req, timeout=30) as result:
            raw = result.read()
            return json.loads(raw) if raw else {}
    except HTTPError as exc:
        raise RuntimeError(f"{method} {path}: HTTP {exc.code} {exc.read().decode(errors='replace')[:500]}") from exc

def gql(query, variables):
    data = api("/graphql", "POST", {"query": query, "variables": variables})
    if data.get("errors"):
        raise RuntimeError(f"GraphQL error: {data['errors']}")
    return data["data"]

def base(owner, repo):
    return f"/repos/{owner}/{repo}/issues"

def stamp(owner, repo, number):
    return f"{TAG} {owner}/{repo} project #{number}"

def title(number, kind):
    return f"{TAG} project #{number} {kind}"

def lookup(owner, repo, number):
    """Never touch issues without an exact test title AND unique marker in the body."""
    out = {"task": [], "blocker": []}
    for page in range(1, 6):
        issues = api(base(owner,repo) + f"?state=all&sort=created&direction=desc&per_page=100&page={page}")
        for item in issues:
            if "pull_request" in item or stamp(owner, repo, number) not in (item.get("body") or ""):
                continue
            for kind in out:
                if item.get("title") == title(number, kind):
                    out[kind].append(item)
        if len(issues) < 100:
            break
    return out

def project(owner, number):
    query = 'query($o:String!,$n:Int!){organization(login:$o){projectV2(number:$n){id field(name:"Status"){... on ProjectV2SingleSelectField{id options{id name}}}}}}'
    data = gql(query, {"o": owner, "n": number})
    p = (data.get("organization") or {}).get("projectV2")
    if not p or not p.get("field"):
        raise RuntimeError("Project inaccessible or has no single-select Status field")
    opts = {o["name"].lower().strip().replace(" ", ""): o["id"] for o in p["field"]["options"]}
    if not {"blocked", "todo"} <= opts.keys():
        raise RuntimeError(f"Missing Blocked/Todo Status option: {list(opts)}")
    return p, opts

def mutation(query, **vars):
    return gql(query, vars)

def project_item(issue, project_id):
    query = 'query($id:ID!){node(id:$id){... on Issue{projectItems(first:100){nodes{id project{id} fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}}}}}}}}'
    items = ((gql(query, {"id": issue["node_id"]).get("node") or {}).get("projectItems") or {}).get("nodes", [])
    matches = [i for i in items if i["project"]["id"] == project_id]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one board item, found {len(matches)}")
    return matches[0]

def create(owner, repo, number, kind, body):
    issue = api(base(owner,repo), "POST", {"title": title(number, kind), "body": body})
    print("  Created:", issue["html_url"], flush=True)
    return issue

def get_pair(issues):
    tasks = [i for i in issues["task"] if i["state"] == "open"]
    if len(tasks) != 1:
        raise RuntimeError(f"Expected one open test task, found {len(tasks)}")
    task = tasks[0]
    blockers = [i for i in issues["blocker"] if f"E2E_BLOCKER_FOR={task['number']}" in (i.get("body") or "")]
    if len(blockers) != 1:
        raise RuntimeError(f"Expected one linked test blocker, found {len(blockers)}")
    return task, blockers[0]

def setup(owner, repo, number, issues):
    if any(i["state"] == "open" for i in issues["task"]):
        raise RuntimeError("An active test task already exists. Run cleanup before setting up again.")
    p, opts = project(owner, number)
    blocker = create(owner, repo, number, "blocker", stamp(owner, repo, number) + "\nTemporary blocker.")
    task = create(owner, repo, number, "task", stamp(owner, repo, number) + f"\nTemporary blocked task. Blocker: {blocker['html_url']}")
    api(base(owner,repo) + f"/{blocker['number']}", "PATCH",
        {"body": stamp(owner,repo,number) + f"\nE2E_BLOCKER_FOR={task['number']}"})
    api(base(owner,repo) + f"/{task['number']}/dependencies/blocked_by", "POST", {"issue_id": blocker["id"]})
    added = mutation('mutation($p:ID!,$i:ID!){addProjectV2ItemById(input:{projectId:$p,contentId:$i}){item{id}}}', p=p["id"], i=task["node_id"])
    item_id = added["addProjectV2ItemById"]["item"]["id"]
    mutation('mutation($p:ID!,$i:ID!,$f:ID!,$v:String!){updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$v}}){projectV2Item{id}}}',
        p=p["id"], i=item_id, f=p["field"]["id"], v=opts["blocked"])
    item = project_item(task, p["id"])
    if (item.get("fieldValueByName") or {}).get("name") != "Blocked":
        raise RuntimeError("Initial Status not Blocked")
    deps = api(base(owner,repo) + f"/{task['number']}/dependencies/blocked_by")
    if blocker["id"] not in [d["id"] for d in deps]:
        raise RuntimeError("Native Blocked by relation was not established")
    print("  READY. Task Blocked:", task["html_url"], " | Open blocker:", blocker["html_url"], flush=True)

def complete(owner, repo, number, issues):
    task, blocker = get_pair(issues)
    p, _ = project(owner, number)
    item = project_item(task, p["id"])
    if (item.get("fieldValueByName") or {}).get("name") not in ("Blocked", "Todo", "To do"):
        raise RuntimeError("Unexpected task status")
    deps = api(base(owner,repo) + f"/{task['number']}/dependencies/blocked_by")
    if blocker["id"] not in [d["id"] for d in deps]:
        raise RuntimeError("Native dependency absent")
    if blocker["state"] == "open":
        api(base(owner,repo) + f"/{blocker['number']}", "PATCH", {"state": "closed", "state_reason": "completed"})
    print("  Completed blocker:", blocker["html_url"], "| Target:", task["html_url"], flush=True)

def verify(owner, repo, number, issues):
    task, blocker = get_pair(issues)
    p, _ = project(owner, number)
    item = project_item(task, p["id"])
    value = (item.get("fieldValueByName") or {}).get("name")
    blocker_now = api(base(owner,repo) + f"/{blocker['number']}")
    success = value in ("Todo", "To do") and blocker_now.get("state") == "closed" and blocker_now.get("state_reason") == "completed"
    print(f"  {'PASS' if success else 'FAIL'}: {task['html_url']} Status={value} | blocker={blocker_now.get('state')}/{blocker_now.get('state_reason')}", flush=True)
    if not success:
        raise RuntimeError("Task has not yet moved to Todo")

def cleanup(owner, repo, number, issues):
    p, _ = project(owner, number)
    all_issues = issues["task"] + issues["blocker"]
    if not all_issues:
        print("  No matching test issues found", flush=True)
    for issue in all_issues:
        if issue in issues["task"]:
            try:
                item = project_item(issue, p["id"])
                mutation('mutation($p:ID!,$i:ID!){deleteProjectV2Item(input:{projectId:$p,itemId:$i}){deletedItemId}}', p=p["id"], i=item["id"])
                print("  Removed from board:", issue["html_url"], flush=True)
            except RuntimeError as exc:
                print("  Board cleanup note:", str(exc)[:250], flush=True)
        try:
            mutation('mutation($id:ID!){deleteIssue(input:{issueId:$id}){repository{id}}}', id=issue["node_id"])
            print("  PERMANENTLY DELETED:", issue["html_url"], flush=True)
        except RuntimeError:
            if issue["state"] == "open":
                api(base(owner,repo) + f"/{issue['number']}", "PATCH", {"state":"closed","state_reason":"not_planned"})
            print("  Closed, not deleted (repo admin and org deletion policy required):", issue["html_url"], flush=True)

def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("setup","complete","verify","cleanup"):
        raise SystemExit("Usage: python e2e_auto_unblock.py setup|complete|verify|cleanup")
    mode = sys.argv[1]
    errors = []
    for label, owner, repo, number in BOARDS:
        print(f"\n== {label}, Project #{number}, {owner}/{repo} ==", flush=True)
        try:
            issues = lookup(owner, repo, number)
            globals()[mode](owner, repo, number, issues)
        except Exception as exc:
            print(f"  ERROR: {exc}", file=sys.stderr, flush=True)
            errors.append(label)
    print(f"\nMODE {mode} | Boards with errors: {errors or 'none'}", flush=True)
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
