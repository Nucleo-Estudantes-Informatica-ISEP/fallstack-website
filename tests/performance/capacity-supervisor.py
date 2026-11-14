"""Fail closed on co-hosted AuthNEI readiness, latency or stale/missing samples."""
import datetime
import json
import os
import pathlib
import signal
import subprocess
import sys
import tempfile
import time

ORIGINS = ("auth_dev_origin", "auth_prod_origin")
SSH = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=3", "-o",
       "ControlMaster=auto", "-o", "ControlPersist=3600", "-o",
       "ServerAliveInterval=30", "-o", "ControlPath=" + os.environ.get(
           "CAPACITY_SSH_CONTROL_PATH", "/tmp/capacity453-ssh-%C"), "nei"]
SAMPLE = "/tmp/fallstack-capacity-v3/resources.jsonl"


def validate(sample, now):
    age = (now - datetime.datetime.fromisoformat(sample["utc"])).total_seconds()
    if not 0 <= age <= 15:
        raise ValueError("AuthNEI sample is stale or from the future")
    for origin in ORIGINS:
        probe = sample[origin]
        if probe["status"] != 200 or not 0 <= probe.get("ms", 1000) < 1000:
            raise ValueError(f"AuthNEI health gate failed: {origin}")


def read_sample():
    result = subprocess.run(SSH + [f"tail -n 1 {SAMPLE}"], check=True,
                            capture_output=True, text=True, timeout=8)
    sample = json.loads(result.stdout)
    return sample


def percentile(values, fraction):
    values = sorted(values)
    return values[round((len(values) - 1) * fraction)] if values else None


def run(command):
    report_path = pathlib.Path(os.environ["CAPACITY_GUARD_REPORT"])
    samples = []
    process = None
    reason = None
    exit_code = 1
    try:
        samples.append(read_sample())
        validate(samples[-1], datetime.datetime.now(datetime.timezone.utc))
        process = subprocess.Popen(command, env={**os.environ, "CAPACITY_AUTHNEI_GUARD": "active"})
        while process.poll() is None:
            sample = read_sample()
            if sample["utc"] != samples[-1]["utc"]:
                samples.append(sample)
            validate(sample, datetime.datetime.now(datetime.timezone.utc))
            time.sleep(2)
        exit_code = process.returncode
    except (Exception, KeyboardInterrupt) as error:
        reason = str(error) or type(error).__name__
    finally:
        if process and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        report = {"aborted": reason is not None, "reason": reason, "exit": exit_code,
                  "max_readiness_ms": 1000, "max_sample_age_seconds": 15,
                  "samples": samples, "origins": {},
                  "workload_exit": process.returncode if process else None}
        for origin in ORIGINS:
            values = [s[origin]["ms"] for s in samples if "ms" in s.get(origin, {})]
            report["origins"][origin] = {"count": len(values), "p95_ms": percentile(values, .95),
                                         "p99_ms": percentile(values, .99), "max_ms": max(values, default=None)}
        report_path.write_text(json.dumps(report, indent=2) + "\n")
    return exit_code


def interrupted(_signal, _frame):
    raise KeyboardInterrupt("Supervisor interrupted; stopping its workload")


def self_test():
    now = datetime.datetime.now(datetime.timezone.utc)
    good = {"utc": now.isoformat(), **{o: {"status": 200, "ms": 10} for o in ORIGINS}}
    validate(good, now)
    cases = [{**good, "auth_prod_origin": {"status": 503, "ms": 10}},
             {**good, "auth_dev_origin": {"status": 200, "ms": 1000}},
             {**good, "utc": (now - datetime.timedelta(seconds=16)).isoformat()},
             {"utc": now.isoformat()}]
    for sample in cases:
        try:
            validate(sample, now)
        except (ValueError, KeyError):
            continue
        raise AssertionError("Unsafe AuthNEI sample accepted")
    global read_sample
    original_reader = read_sample
    previous_report = os.environ.get("CAPACITY_GUARD_REPORT")
    try:
        sequence = iter([good, cases[0]])
        read_sample = lambda: next(sequence)
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "guard.json"
            os.environ["CAPACITY_GUARD_REPORT"] = str(path)
            assert run([sys.executable, "-c", "import time; time.sleep(60)"]) == 1
            report = json.loads(path.read_text())
            assert report["aborted"] and report["workload_exit"] is not None
    finally:
        read_sample = original_reader
        if previous_report is None:
            os.environ.pop("CAPACITY_GUARD_REPORT", None)
        else:
            os.environ["CAPACITY_GUARD_REPORT"] = previous_report
    print("AuthNEI supervisor validation and actual child-stop self-checks passed")


if __name__ == "__main__":
    if sys.argv[1:] == ["--self-test"]:
        self_test()
    else:
        signal.signal(signal.SIGTERM, interrupted)
        command = sys.argv[1:]
        if command[:1] == ["--"]:
            command = command[1:]
        if not command:
            raise SystemExit("Pass the workload command after --")
        raise SystemExit(run(command))
