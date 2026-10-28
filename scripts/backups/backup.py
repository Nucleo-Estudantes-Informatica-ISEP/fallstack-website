#!/usr/bin/env python3
"""Daily Fallstack-only PostgreSQL/MinIO snapshots with bounded R2 usage."""

import base64
import datetime as dt
from email.message import EmailMessage
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import resource
import shutil
import smtplib
import ssl
import subprocess
import sys
import tarfile
import tempfile
from zoneinfo import ZoneInfo


MAX_STORED_BYTES = 8_000_000_000
MAX_ARCHIVE_BYTES = 250_000_000
MAX_SOURCE_BYTES = 200_000_000
KEEP_COPIES = 30
RECEIPT_HEADROOM = 1024
REQUEST_LIMITS = {"A": 1000, "B": 1000}
DATABASES = ("fallstack_dev", "fallstack_prod")
BUCKETS = tuple(f"fallstack-{env}-{kind}" for env in ("dev", "prod")
                for kind in ("avatars", "logos", "cvs"))
POSTGRES = "postgres-gbheij1ljds8nrhfgdf9teeo"
MINIO = "minio-gbheij1ljds8nrhfgdf9teeo"
ARCHIVE_KEY = re.compile(r"fallstack/\d{8}T\d{12}Z\.tar\.gz\.age\Z")


class SafetyLimit(RuntimeError):
    """Only fixed, non-sensitive messages may be included in operational logs."""


def portugal_time(instant=None):
    instant = instant or dt.datetime.now(dt.timezone.utc)
    return instant.astimezone(ZoneInfo("Europe/Lisbon")).strftime("%d/%m/%Y %H:%M:%S %Z")


def atomic_json(path, value):
    temporary = path.with_suffix(".tmp")
    with temporary.open("w") as stream:
        json.dump(value, stream)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)
    directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


class Budget:
    def __init__(self, path):
        self.path = path
        # Missing/corrupt state must not silently reset a previously used budget.
        self.state = json.loads(path.read_text())
        if not isinstance(self.state, dict):
            raise ValueError("Invalid request ledger")

    def reserve(self, category):
        month = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m")
        counts = self.state.setdefault(month, {"A": 0, "B": 0})
        if set(counts) != set(REQUEST_LIMITS) or any(
            type(value) is not int or value < 0 for value in counts.values()
        ):
            raise ValueError("Invalid request counters")
        if counts[category] >= REQUEST_LIMITS[category]:
            raise SafetyLimit(f"R2 class {category} request safety limit reached")
        counts[category] += 1
        atomic_json(self.path, self.state)


def client(endpoint, key, secret):
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3", endpoint_url=endpoint, aws_access_key_id=key,
        aws_secret_access_key=secret, region_name="auto",
        config=Config(signature_version="s3v4", connect_timeout=15,
                      read_timeout=120, retries={"total_max_attempts": 1},
                      request_checksum_calculation="when_required",
                      response_checksum_validation="when_required"),
    )


def r2_call(s3, budget, category, operation, **arguments):
    budget.reserve(category)
    return getattr(s3, operation)(**arguments)


def inventory(s3, budget, bucket):
    result = r2_call(s3, budget, "A", "list_objects_v2", Bucket=bucket, MaxKeys=1000)
    if result.get("IsTruncated"):
        raise SafetyLimit("R2 bucket object-count safety limit reached")
    objects = result.get("Contents", [])
    if any(type(obj["Size"]) is not int or obj["Size"] < 0 for obj in objects):
        raise ValueError("Invalid R2 object size")
    return objects


def check_size(objects, new_size):
    if not 0 < new_size <= MAX_ARCHIVE_BYTES:
        raise SafetyLimit("Encrypted archive exceeds 250 MB safety limit")
    if sum(obj["Size"] for obj in objects) + new_size + RECEIPT_HEADROOM > MAX_STORED_BYTES:
        raise SafetyLimit("R2 retained storage would exceed 8 GB safety limit")


def digest(path, algorithm="sha256"):
    value = hashlib.new(algorithm)
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value


def publish(s3, budget, bucket, objects, archive, key):
    check_size(objects, archive.stat().st_size)
    checksum = digest(archive).hexdigest()
    with archive.open("rb") as stream:
        r2_call(s3, budget, "A", "put_object", Bucket=bucket, Key=key, Body=stream,
                ContentLength=archive.stat().st_size,
                ContentMD5=base64.b64encode(digest(archive, "md5").digest()).decode(),
                ContentType="application/octet-stream", Metadata={"sha256": checksum},
                IfNoneMatch="*")
    result = r2_call(s3, budget, "B", "get_object", Bucket=bucket, Key=key)
    actual = hashlib.sha256()
    size = 0
    with result["Body"] as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            size += len(chunk)
            if size > MAX_ARCHIVE_BYTES:
                raise SafetyLimit("R2 download exceeds safety limit")
            actual.update(chunk)
    if actual.hexdigest() != checksum or size != archive.stat().st_size:
        raise RuntimeError("R2 read-back checksum mismatch")
    receipt = json.dumps({"key": key, "bytes": size, "sha256": checksum}).encode()
    r2_call(s3, budget, "A", "put_object", Bucket=bucket, Key=key + ".verified.json",
            Body=receipt, ContentType="application/json", IfNoneMatch="*")
    # Retire only our old archives, and only after the new copy verifies.
    keys = {obj["Key"] for obj in objects}
    old = sorted(key for key in keys if ARCHIVE_KEY.fullmatch(key)
                 and key + ".verified.json" in keys)
    for expired in old[:max(0, len(old) + 1 - KEEP_COPIES)]:
        r2_call(s3, budget, "A", "delete_object", Bucket=bucket, Key=expired)
        r2_call(s3, budget, "A", "delete_object", Bucket=bucket, Key=expired + ".verified.json")
    return {"key": key, "bytes": size, "sha256": checksum}


def run(arguments, **options):
    return subprocess.run(arguments, check=True, stderr=subprocess.DEVNULL,
                          timeout=600, **options)


def source_client():
    container = json.loads(run(["docker", "inspect", MINIO],
                               stdout=subprocess.PIPE).stdout)[0]
    env = dict(item.split("=", 1) for item in container["Config"]["Env"] if "=" in item)
    ip = container["NetworkSettings"]["Networks"]["gbheij1ljds8nrhfgdf9teeo"]["IPAddress"]
    return client(f"http://{ip}:9000", env["MINIO_ROOT_USER"], env["MINIO_ROOT_PASSWORD"])


def snapshot(directory):
    s3 = source_client()
    manifest = {"started_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                "databases": list(DATABASES), "buckets": list(BUCKETS), "objects": []}
    total = 0
    for bucket in BUCKETS:
        for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket):
            for obj in page.get("Contents", []):
                total += obj["Size"]
                if total > MAX_SOURCE_BYTES or len(manifest["objects"]) >= 10000:
                    raise SafetyLimit("MinIO snapshot exceeds source safety limit")
                # Numbered local files avoid interpreting untrusted object keys as paths.
                filename = f"object-{len(manifest['objects']):06d}"
                response = s3.get_object(Bucket=bucket, Key=obj["Key"], IfMatch=obj["ETag"])
                copied = 0
                with response["Body"] as stream, (directory / filename).open("wb") as target:
                    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                        copied += len(chunk)
                        if copied > obj["Size"]:
                            raise RuntimeError("MinIO object changed during backup")
                        target.write(chunk)
                if copied != obj["Size"]:
                    raise RuntimeError("Incomplete MinIO object download")
                metadata = {field: response[field] for field in (
                    "ContentType", "ContentDisposition", "ContentEncoding",
                    "ContentLanguage", "CacheControl", "Metadata",
                ) if field in response}
                manifest["objects"].append({"bucket": bucket, "key": obj["Key"],
                    "file": filename, "bytes": copied, "metadata": metadata,
                    "sha256": digest(directory / filename).hexdigest()})
    for database in DATABASES:
        with (directory / f"{database}.dump").open("wb") as output:
            run(["docker", "exec", POSTGRES, "sh", "-c",
                 'exec pg_dump -U "$POSTGRES_USER" -Fc --schema=fallstack --dbname="$1"',
                 "backup", database], stdout=output,
                preexec_fn=lambda: resource.setrlimit(resource.RLIMIT_FSIZE,
                                                      (MAX_ARCHIVE_BYTES, MAX_ARCHIVE_BYTES)))
    manifest["finished_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    (directory / "manifest.json").write_text(json.dumps(manifest))
    return manifest


def notify(message):
    settings = json.loads(Path("/etc/fallstack-backup/smtp.json").read_text())
    email = EmailMessage()
    email["From"] = settings["from"]
    email["To"] = "tech.user@nei-isep.org"
    email["Subject"] = "Fallstack backup: ACTION REQUIRED"
    email.set_content(message)
    with smtplib.SMTP_SSL(settings["host"], settings["port"],
                          context=ssl.create_default_context(), timeout=30) as smtp:
        smtp.login(settings["username"], settings["password"])
        rejected = smtp.send_message(email)
        if rejected:
            raise RuntimeError("Backup notification recipient rejected")
    print("Failure notification accepted by SMTP for Tech User.")


def main(config_path):
    os.umask(0o077)
    config = json.loads(Path(config_path).read_text())
    state = Path(config["state_dir"])
    with (state / "lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        budget = Budget(state / "requests.json")
        s3 = client(config["endpoint"], config["access_key_id"], config["secret_access_key"])
        objects = inventory(s3, budget, config["bucket"])
        # Leave enough headroom for the maximum accepted upload before reading source data.
        check_size(objects, MAX_ARCHIVE_BYTES)
        if shutil.disk_usage(state).free < 2_000_000_000:
            raise SafetyLimit("Less than 2 GB staging space available")
        with tempfile.TemporaryDirectory(prefix="snapshot-", dir=state) as work:
            work = Path(work)
            data = work / "data"
            data.mkdir()
            manifest = snapshot(data)
            packed = work / "snapshot.tar.gz"
            with tarfile.open(packed, "w:gz") as archive:
                archive.add(data, arcname="data")
            check_size(objects, packed.stat().st_size + 65536)
            encrypted = work / "snapshot.tar.gz.age"
            run(["age", "-r", config["age_recipient"], "-o", str(encrypted), str(packed)])
            key = "fallstack/" + dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".tar.gz.age"
            result = publish(s3, budget, config["bucket"], objects, encrypted, key)
            result["snapshot_started_at"] = manifest["started_at"]
            result["verified_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
            atomic_json(state / "last-success.json", result)
            print(json.dumps(result))


if __name__ == "__main__":
    try:
        if len(sys.argv) > 1 and sys.argv[1] == "--notify-failure":
            notify("Fallstack backup failed or was skipped. No successful backup is claimed. "
                   "Check journalctl -u fallstack-backup.service on nei. "
                   f"Alert time (Portugal): {portugal_time()} (Europe/Lisbon).")
        else:
            main(sys.argv[1] if len(sys.argv) > 1 else "/etc/fallstack-backup/config.json")
    except Exception as error:
        # Keep object keys, source credentials and SDK error payloads out of email/journal.
        reason = str(error) if isinstance(error, SafetyLimit) else type(error).__name__
        message = f"Fallstack daily backup failed or was skipped at {portugal_time()} (Europe/Lisbon). Reason: {reason}. Check fallstack-backup.service on nei. No successful backup is claimed."
        print(message, file=sys.stderr)
        sys.exit(1)
