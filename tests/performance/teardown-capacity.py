"""Dry-run by default; remove only the explicitly owned #453 v3 test resources."""
import json
import pathlib
import subprocess
import sys

PROJECT = "capacity453v3"
PROXY = pathlib.Path("/data/coolify/proxy/dynamic/capacity453v3.yaml")


def docker(*args):
    return subprocess.check_output(["docker", *args], text=True).strip()


def owned(name, labels):
    if labels.get("com.docker.compose.project") != PROJECT or not name.startswith((PROJECT + "-", PROJECT + "_")):
        raise ValueError("Refusing to remove a resource outside the task project")


def plan():
    result = {"containers": [], "container_names": [], "volumes": [], "networks": [], "proxy": None}
    for kind, listing in [("containers", ["ps", "-aq"]), ("volumes", ["volume", "ls", "-q"]),
                          ("networks", ["network", "ls", "-q"])]:
        ids = docker(*listing, "--filter", f"label=com.docker.compose.project={PROJECT}").split()
        if not ids:
            continue
        command = ["inspect"] if kind == "containers" else [kind[:-1], "inspect"]
        for resource in json.loads(docker(*command, *ids)):
            name = resource["Name"].lstrip("/")
            labels = resource["Config"]["Labels"] if kind == "containers" else resource["Labels"]
            owned(name, labels)
            result[kind].append(resource["Id"] if kind == "containers" else name)
            if kind == "containers":
                result["container_names"].append(name)
    if PROXY.exists():
        config = json.loads(PROXY.read_text())["http"]
        if set(config["services"]) != {PROJECT} or not all(n.startswith(PROJECT + "-") for n in config["routers"]):
            raise ValueError("Proxy override is not owned by this test")
        result["proxy"] = str(PROXY)
    return result


def self_test():
    owned(PROJECT + "-web-1", {"com.docker.compose.project": PROJECT})
    for name, labels in [("shared-web-1", {"com.docker.compose.project": PROJECT}),
                         (PROJECT + "-web-1", {"com.docker.compose.project": "shared"})]:
        try:
            owned(name, labels)
        except ValueError:
            continue
        raise AssertionError("Foreign resource accepted")
    print("Teardown ownership self-check passed")


if __name__ == "__main__":
    if sys.argv[1:] == ["--self-test"]:
        self_test()
    else:
        if sys.argv[1:] not in ([], ["--apply"]):
            raise SystemExit("Use no arguments for dry-run, or --apply")
        removal = plan()
        print(json.dumps({"project": PROJECT, "apply": "--apply" in sys.argv, **removal}), flush=True)
        if "--apply" in sys.argv:
            if removal["proxy"]:
                PROXY.unlink()
            if removal["containers"]:
                docker("stop", "--timeout", "90", *removal["containers"])
                docker("rm", "-v", *removal["containers"])
            for kind, command in [("volumes", "volume"), ("networks", "network")]:
                if removal[kind]:
                    docker(command, "rm", *removal[kind])
