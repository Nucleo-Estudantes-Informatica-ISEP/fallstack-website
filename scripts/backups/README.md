# Fallstack backups

The complete [operations and recovery runbook](../../docs/operations/backups.md)
is stored in this repository. It covers ownership, the deployed schedule,
retention, R2 access, usage guards, private file locations, failure alerts and
verified restore evidence. [ADR 0018](../../docs/decisions/0018-back-up-fallstack-data-outside-the-vps.md)
records the design.

## What runs automatically

The host job is already installed and enabled on `nei`. Merging PR #504 does
not activate it: it runs daily at **02:15 Europe/Lisbon**, including Portugal's
winter/summer clock changes, independently of application deployments.

Each successful encrypted archive covers **both development and production**:
their `fallstack` PostgreSQL schemas, migration histories, and avatar/logo/CV
buckets. The job retains the last **30 verified successful copies**, normally
about 30 days. It removes the oldest eligible copy only after a new upload has
passed read-back verification. Failed runs preserve previous copies.

## Check the live service

```bash
ssh nei
sudo systemctl list-timers fallstack-backup.timer
sudo systemctl show fallstack-backup.service -p Result -p ExecMainStatus
sudo cat /var/lib/fallstack-backup/last-success.json
sudo journalctl -u fallstack-backup.service -u fallstack-backup-alert.service
```

Failure alerts go to **Tech User — tech.user@nei-isep.org**. The JSON success
record uses UTC timestamps; human-readable alerts and the schedule use Portugal
time. Job-specific storage/request limits reduce usage; they do not cap all
Cloudflare account activity.

## Access or recover data

Use the private [R2 bucket](https://dash.cloudflare.com/20602e5f96f2ffb928dbaa44fe90b0d9/r2/eu/buckets/nei-fallstack-backups)
to download an archive and its `.verified.json` receipt. Follow the runbook's
[recovery procedure](../../docs/operations/backups.md#recovery) to verify its
checksum and decrypt it. It also explains how to
[recover one record or file](../../docs/operations/backups.md#recover-one-record-or-file).
Restore database dumps into an isolated database before selecting individual
rows; use the object manifest to locate one original file.

Decryption requires the private age identity. Its existing off-VPS copy is
`~/.local/share/fallstack-backup-recovery/recovery.agekey` on the requester's Mac;
the host copy is `/etc/fallstack-backup/recovery.agekey`. Keep an additional copy
in NEI's restricted recovery/password vault. Without that key, encrypted
archives cannot be recovered.

## Source files and private configuration

| File                                                             | Purpose                                                                            |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [backup.py](backup.py)                                           | Snapshot, encryption, usage guards, verified upload and retention                  |
| [test_backup.py](test_backup.py)                                 | Regression tests; run with `python3 -B -m unittest discover -s scripts/backups -v` |
| [fallstack-backup.service](fallstack-backup.service)             | Host backup service and failure handler                                            |
| [fallstack-backup.timer](fallstack-backup.timer)                 | Daily Portugal-time schedule                                                       |
| [fallstack-backup-alert.service](fallstack-backup-alert.service) | Failure email service                                                              |
| [config.example.json](config.example.json)                       | Non-secret template for root-only R2 configuration                                 |
| [smtp.example.json](smtp.example.json)                           | Non-secret template for root-only mail configuration                               |

The host runs installed copies under `/opt/fallstack-backup/`; a Git merge does
not automatically update those files. Future runtime changes must be installed
and verified using the runbook. Preserve the existing key, credentials and
request ledger during updates.

This repository stores instructions, source and safe configuration examples.
Private keys, real credentials, archives and decrypted data remain outside Git.
