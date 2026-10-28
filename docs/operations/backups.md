# PostgreSQL and MinIO backups

Owner: **Tech User — tech.user@nei-isep.org**, identified by the requester on
2026-10-28. Fallstack implementation/audit: Dinis Correia (`dinisjcorreia`),
assignee of [Task05-A1 #465](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/465).
Team acceptance of maximum data loss/restore time remains
[Task05-A #464](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/464).

## Live policy

| Setting          | Value                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schedule         | Daily **02:15 Europe/Lisbon**, including automatic winter/summer time changes                                                                                     |
| Scheduler        | `fallstack-backup.timer` on `nei`; enabled, persistent across reboot                                                                                              |
| Backup job       | `fallstack-backup.service`, source [backup.py](../../scripts/backups/backup.py) installed at `/opt/fallstack-backup/backup.py`                                    |
| Retention        | Last **30 successful, read-back-verified copies**; normally about 30 days. Failed runs preserve existing copies; they are not deleted merely because time passed. |
| Off-VPS location | Cloudflare account `Systems@nei-isep.org`, **EU jurisdiction**, private R2 bucket `nei-fallstack-backups`, Standard class, prefix `fallstack/`                    |
| Encryption       | age encryption before upload, TLS in transit; decryption key excluded from backups                                                                                |
| Failure contact  | **Tech User — tech.user@nei-isep.org**, through NEI SMTP over verified TLS on port 465                                                                            |
| Failure trigger  | systemd `OnFailure=fallstack-backup-alert.service`, covering failed jobs, guard refusals, timeouts and resource-limit exits                                       |
| Alert time       | `DD/MM/YYYY HH:MM:SS WET/WEST (Europe/Lisbon)`; regression coverage checks both DST transitions                                                                   |

Backups run independently of web/cleanup services and must remain enabled
off-season. Nothing stops or redeploys shared PostgreSQL/MinIO services.
These are Fallstack backups, not backups of every shared-platform application.
See [ADR 0017](../decisions/0017-back-up-fallstack-data-outside-the-vps.md).

## Data covered

| Environment | Database selection                                                   | MinIO selection                                                        |
| ----------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Development | `fallstack_dev`, schema `fallstack`, including `_prisma_migrations`  | `fallstack-dev-avatars`, `fallstack-dev-logos`, `fallstack-dev-cvs`    |
| Production  | `fallstack_prod`, schema `fallstack`, including `_prisma_migrations` | `fallstack-prod-avatars`, `fallstack-prod-logos`, `fallstack-prod-cvs` |

Each archive contains two PostgreSQL custom-format dumps, current objects from
all six buckets, and a manifest mapping original keys to numbered files with
SHA-256, byte counts and response metadata (content type, cache/content headers
and user metadata). Empty buckets are explicitly listed. Conditional object
reads fail if an object changes after listing. Historical object versions,
deleted objects and IAM/bucket configuration are not included.

Each dump has PostgreSQL's consistent snapshot. Objects and the two databases
are copied while live; their snapshots are **not one cross-service transaction**.
Recovery must reconcile references and deletion/retention rules. Keep infrastructure
configuration and credentials in restricted platform records; dumps do not cover
cluster-wide roles, unrelated schemas, AuthNEI or Coolify.

## Usage guards

Before reading source data, the job inventories the dedicated R2 bucket and
reserves headroom for its maximum archive. Before upload it checks actual bytes.

- Maximum **8,000,000,000 bytes** retained in the bucket, counting unrelated
  objects as well as backup archives, **including** the proposed upload.
- Maximum **250,000,000 bytes** per encrypted archive, using a single PUT.
- Maximum **200,000,000 bytes / 10,000 source objects** per snapshot, bounded
  dump outputs, and at least 2 GB of staging space before starting (covering
  plaintext, packed and encrypted files at their configured maximum sizes).
- Maximum **1,000 Class A / 1,000 Class B requests per UTC month** from this
  job. Each request is counted and persisted before the SDK call, even on
  failure. SDK retries are disabled. Corrupt/missing counters or truncated
  inventory fail closed. A process lock prevents overlapping backups.
- The uploaded archive is downloaded and SHA-256 checked. Only then can the
  job remove its oldest matching archives to retain 30 copies. Unrelated keys
  and older verified backups survive a failed upload or checksum check.

A small `.verified.json` receipt marks each successful archive. Unverified
leftovers never count toward the 30 retained successful copies; all objects
still count toward the storage guard. Receipt bytes have reserved headroom.

These are conservative job limits, **not an account-wide cap**. Another bucket,
client or compromised key can consume usage outside these counters. Never reset
the ledger to bypass a refusal. Inspect account usage and resolve the cause with
Tech User before changing limits or resuming. Over-limit runs alert rather than
claiming success.

## Host files and operations

`/etc/fallstack-backup/` and `/var/lib/fallstack-backup/` are root-only directories.
Credentials, keys and ledger files use mode 0600:

- `/etc/fallstack-backup/config.json`: scoped R2 key, endpoint, public age
  recipient and state directory; [example](../../scripts/backups/config.example.json).
- `/etc/fallstack-backup/smtp.json`: working NEI SMTP credentials;
  [example](../../scripts/backups/smtp.example.json). Other applications' and
  Coolify's mail settings were not modified.
- `/etc/fallstack-backup/recovery.agekey`: private decryption key. An off-VPS
  copy was saved on the requester's Mac under
  `~/.local/share/fallstack-backup-recovery/recovery.agekey` (directory 0700,
  file 0600). Preserve it in the team's restricted recovery/password vault too.
- `/var/lib/fallstack-backup/requests.json`: request ledger. Created once as
  `{}` at initial installation, never silently recreated by the job.
- `/var/lib/fallstack-backup/last-success.json`: verified archive key, bytes,
  SHA-256, snapshot start and verification times; machine timestamps UTC.

Runtime dependencies: Python 3 with `boto3`/`botocore`, age, Docker CLI and
systemd with timezone data. The job reads PostgreSQL/MinIO administrative
credentials from their running containers, selects only the fixed Fallstack
scope, and never logs credentials. Host root/Docker access is required; do not
grant web containers these files or the Docker socket.

Install reviewed Python files under `/opt/fallstack-backup/` and the three
[unit files](../../scripts/backups/fallstack-backup.service) under
`/etc/systemd/system/`. Preserve existing private configuration, key and ledger
when updating. Then:

```bash
sudo python3 -B -m unittest discover -s /opt/fallstack-backup -v
sudo systemctl daemon-reload
sudo systemctl start fallstack-backup.service
sudo systemctl enable --now fallstack-backup.timer
sudo systemctl list-timers fallstack-backup.timer
sudo journalctl -u fallstack-backup.service -u fallstack-backup-alert.service
```

A successful run records `last-success.json` only after remote read-back. Normal
exits remove staging files; a forced kill may leave a root-only `snapshot-*`
directory. Stop the service and confirm no active run before removing abandoned
staging files. Preserve the ledger.

Pause scheduling with `sudo systemctl stop fallstack-backup.timer`; this does
not cancel an active backup. Resume with `sudo systemctl start fallstack-backup.timer`.
This host cannot email if the entire VPS, scheduler or SMTP service is unavailable.
Check the timer/latest success during operations and keep host monitoring active.

## Verification — 28/10/2026, Portugal time

- Initial audit found no shared-service Coolify backup schedules, S3 destination,
  or proved named-recipient delivery. Historical migration archives in
  [PR #379](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/pull/379)
  and on-VPS policy copies were not recurring coverage.
- Created the private EU R2 bucket and an account-owned object read/write key
  restricted to it. Public access is disabled. The guarded host timer owns
  these backups; there is no parallel unguarded Coolify upload job.
- First live backup verified at **18:56:18 WET**:
  `fallstack/20261028T185617752847Z.tar.gz.age`, **4,164,890 bytes**,
  SHA-256 `9970d24ee3e3086cd162b95443a553e2115b7182efb881501ea256e02aa0c043`.
  systemd recorded exit 0 and about 79 MB peak RAM.
- Downloaded that R2 archive, matched SHA-256, decrypted it and restored both
  dumps into disposable DBs: **25 successful migrations / 20 tables each**.
  Restored all **8 objects** (6 production avatars, 2 production CVs), verifying
  bytes and metadata. Other selected buckets were empty. Removed disposable
  restore databases/bucket and files; no production rows/objects were changed.
- An isolated configuration attempted unauthorized R2 bucket access and failed.
  systemd triggered the alert; SMTP accepted delivery to Tech User at
  **19:00:04 WET**. The requester explicitly confirmed **Received**. Initial
  Coolify SMTP authentication failed; the final alert uses independently
  verified working NEI SMTP settings, with failures surfaced as nonzero exits.
- Updated alert formatting to Portugal time and sent a format-verification alert
  at **19:02:10 WET**. Seven regression tests pass locally and on-host, including
  DST changes, budgets, malformed/missing ledger, low disk space, source changes and retention.
- Timer is enabled and active; next run observed as **29/10/2026 02:15 WET**.
  No unattended scheduled run after installation is claimed yet.
- A subsequent run at **19:08:44 WET** also exited 0, verified its archive and
  saved its receipt. Two archives plus receipts occupied **8,330,094 bytes**;
  recorded October job requests were **9 Class A / 4 Class B** at inspection.

## Recovery

Browse/download archives through the private
[R2 bucket](https://dash.cloudflare.com/20602e5f96f2ffb928dbaa44fe90b0d9/r2/eu/buckets/nei-fallstack-backups).
Archive names contain their UTC creation timestamp; each `.verified.json` receipt
contains the archive's SHA-256 and byte count. The bucket has no public URL.

Retrieve the selected archive from private R2 using authorized account access,
independently of the VPS. Compare its recorded SHA-256, then decrypt with the
off-VPS key:

```bash
sha256sum SELECTED.tar.gz.age
age -d -i /secure/path/recovery.agekey -o SELECTED.tar.gz SELECTED.tar.gz.age
tar -tzf SELECTED.tar.gz
```

Extract into an isolated, restricted directory. Restore each dump to a **new
isolated PostgreSQL 16 database** with `pg_restore --exit-on-error --no-owner
--no-privileges`. Recreate scoped roles/grants from the private platform procedure.
Verify `_prisma_migrations` and application tables before applying later
migrations or switching deployments.

Use `data/manifest.json` to restore bytes under original bucket/key names and
metadata, then verify each SHA-256. Check application references before returning
files to production. Follow [cleanup recovery rules](../storage-cleanup.md): do
not silently reattach deleted/expired CVs or reset tombstones. Never restore over
live shared services or import Supabase `auth`/`storage` schemas. This isolated
rehearsal does not replace #464's coordinated recovery exercise, accepted RPO/RTO,
or post-restore authenticated application checks.

### Recover one record or file

For one database record, first restore the appropriate environment's dump into
an isolated database as above, then select that record there. For example, in
the restored production copy:

```sql
SELECT id, code, cv
FROM fallstack."Student"
WHERE code = 'REPLACE_WITH_STUDENT_CODE';
```

Export only the needed fields/related rows from that isolated copy. Review
foreign keys and current data before applying a narrowly scoped correction;
do not replay an entire table or database over production to recover one row.

For one avatar/logo/CV, find its original bucket and object key in the decrypted
manifest. This example runs inside the extracted archive directory:

```python
import json

manifest = json.load(open("data/manifest.json"))
bucket = "fallstack-prod-cvs"
key = "REPLACE_WITH_ORIGINAL_OBJECT_KEY"
for item in manifest["objects"]:
    if item["bucket"] == bucket and item["key"] == key:
        print(item["file"], item["sha256"], item["metadata"])
```

The actual file is `data/<file>` from that result. Verify its SHA-256 before
opening/exporting it. To return it to the application, use the normal authorized
upload flow with a new key and follow cleanup/privacy rules. A record/object
can only be recovered if it existed in a retained snapshot. Protect and remove
decrypted working copies when recovery finishes.
