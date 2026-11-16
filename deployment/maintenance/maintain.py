#!/usr/bin/env python3
"""Scoped Docker retention. Dry run by default; never deletes containers or volumes."""
import argparse
import datetime
import fcntl
import json
import os
import re
import shutil
import subprocess
from pathlib import Path


def docker(*args):
    return subprocess.check_output(["docker", *args], text=True)


def image_candidates(images, containers, repositories, keep):
    protected = {c["Image"] for c in containers}
    allowed = set(repositories)
    by_repo = {}
    for image in images:
        tags = image.get("RepoTags") or []
        repos = {tag.rsplit(":", 1)[0] for tag in tags}
        if not tags or not repos.issubset(allowed):
            protected.add(image["Id"])
        for repo in repos & allowed:
            by_repo.setdefault(repo, []).append(image)
    for entries in by_repo.values():
        protected.update(i["Id"] for i in sorted(entries, key=lambda i: i["Created"], reverse=True)[:keep])
    return sorted({tag for i in images if i["Id"] not in protected for tag in i.get("RepoTags") or []})


def byte_size(value):
    match = re.fullmatch(r"([0-9.]+)([kMGT]?B)", value)
    if not match:
        raise ValueError("Unknown Docker size unit")
    return int(float(match[1]) * {"B": 1, "kB": 1000, "MB": 1000**2, "GB": 1000**3, "TB": 1000**4}[match[2]])


def cache_candidates(records, budget):
    chosen, total = [], 0
    for row in sorted(records, key=lambda r: r["CreatedAt"]):
        size = byte_size(row["Size"])
        if row["Reclaimable"] and not row["Shared"] and total + size <= budget:
            chosen.append(row["ID"])
            total += size
    return chosen, total


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    assert config["repositories"] and all(isinstance(x, str) and x and ":" not in x for x in config["repositories"])
    assert 3 <= config["keep_images"] <= 10
    assert 0 < config["max_cache_delete_bytes"] <= 8 * 1024**3
    with open("/run/lock/fallstack-maintenance.lock", "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        ids = docker("ps", "-aq").split()
        containers = json.loads(docker("inspect", *ids)) if ids else []
        ids = list(set(docker("image", "ls", "-q").split()))
        images = json.loads(docker("image", "inspect", *ids)) if ids else []
        tags = image_candidates(images, containers, config["repositories"], config["keep_images"])
        # Docker enforces last-use age and refuses active records; do not infer idleness from creation time.
        records = [json.loads(s) for s in docker("buildx", "du", "--filter", "until=1h", "--format", "json").splitlines()]
        cache, selected_bytes = cache_candidates(records, config["max_cache_delete_bytes"])
        before = shutil.disk_usage(config["disk_path"]).free
        removed = 0
        if args.apply:
            for tag in tags:
                # Recheck references immediately before each non-forced removal.
                current = docker("image", "inspect", tag)
                image_id = json.loads(current)[0]["Id"]
                if docker("ps", "-aq", "--filter", "ancestor=" + image_id).strip():
                    continue
                subprocess.run(["docker", "image", "rm", tag], check=True, stdout=subprocess.DEVNULL)
                removed += 1
            for record_id in cache:
                if shutil.disk_usage(config["disk_path"]).free >= config["min_free_bytes"]:
                    break
                subprocess.run(["docker", "buildx", "prune", "--force", "--filter", "id=" + record_id, "--filter", "until=1h"], check=True, stdout=subprocess.DEVNULL)
        after = shutil.disk_usage(config["disk_path"]).free
        print(json.dumps({"time": datetime.datetime.now(datetime.UTC).isoformat(), "mode": "apply" if args.apply else "dry-run", "oldImageTags": len(tags), "imageTagsRemoved": removed, "idleCacheRecords": len(cache), "cacheSelectionUpperBoundBytes": selected_bytes, "freeBytesBefore": before, "freeBytesAfter": after, "containersAndVolumesPreserved": True}))
        if args.apply and after < config["min_free_bytes"]:
            raise SystemExit(2)


if __name__ == "__main__":
    main()
