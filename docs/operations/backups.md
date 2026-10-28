# PostgreSQL and MinIO backup coverage audit

Audit date: **2026-10-28** (Europe/Lisbon). Tracks
[Task05-A1 #465](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/465),
under [Task05-A #464](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/464).

**Result: recurring backup coverage is not established.** The inspected Coolify
configuration has no backup schedule for shared PostgreSQL or either shared data
volume, and no S3 backup destination. No current off-VPS recovery point or failed
backup delivery to the designated contact was verified. Keep #465 open.

## Ownership

The task requester identified **Tech User — tech.user@nei-isep.org** as the NEI
shared PostgreSQL/MinIO backup owner on 2026-10-28. This is the contact for
confirming backup policy and resolving the gaps below; it is not evidence that
backup jobs or notifications exist.

Dinis Correia (`dinisjcorreia`) is the Fallstack audit issue assignee, per #465.
Issue assignment does not transfer shared-platform backup ownership.

## Coverage inventory

The [shared-data guide](../SHARED_DATA.md) defines the environment boundaries.
Read-only host inspection confirmed both databases contain the `fallstack`
schema and `_prisma_migrations` (25 development / 21 production records at audit
time). All six named bucket directories exist in the shared MinIO data volume;
this filesystem check does not verify object completeness or backup contents.

| Data requiring coverage                                                | Scheduled backup observed                           | Backup retention                      | Backup location                    |
| ---------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------- | ---------------------------------- |
| `fallstack_dev.fallstack`, including `_prisma_migrations`              | None in Coolify for shared PostgreSQL or its volume | Not configured in inspected schedules | No current recovery point verified |
| `fallstack_prod.fallstack`, including `_prisma_migrations`             | None in Coolify for shared PostgreSQL or its volume | Not configured in inspected schedules | No current recovery point verified |
| `fallstack-dev-avatars`, `fallstack-dev-logos`, `fallstack-dev-cvs`    | None in Coolify for the shared MinIO volume         | Not configured in inspected schedules | No current recovery point verified |
| `fallstack-prod-avatars`, `fallstack-prod-logos`, `fallstack-prod-cvs` | None in Coolify for the shared MinIO volume         | Not configured in inspected schedules | No current recovery point verified |

The live volumes are `gbheij1ljds8nrhfgdf9teeo_postgres-data` and
`gbheij1ljds8nrhfgdf9teeo_minio-data`, mounted at
`/var/lib/postgresql/data` and `/data` inside their respective containers.
Both use the VPS's local Docker volume driver. These are primary data, not
independent backups; losing the VPS can lose both.

## Evidence inspected

Repository inspection used `dev` revision
`9e1b56ab083b14a366867234393edc8981078024`. The host audit used existing SSH
access and read-only queries against Coolify 4.5.0's metadata database, plus
container mount and directory checks. No backup, restore, scheduling, deployment,
notification test, or data mutation was performed.

- Shared service `gbheij1ljds8nrhfgdf9teeo`: PostgreSQL is Coolify
  `ServiceDatabase` ID 8; MinIO is `ServiceApplication` ID 79. Their persistent
  volume records are IDs 40 and 41 respectively.
- `scheduled_database_backups`: zero rows for PostgreSQL ID 8 with resource type
  `ServiceDatabase`. `scheduled_volume_backups`: no schedules linked to either
  volume. Consequently there is no associated scheduled-run evidence, cadence,
  timezone, retention policy, or successful off-VPS upload to report.
- `s3_storages`: zero configured destinations across the inspected Coolify
  instance. This does not rule out an independently managed external backup.
- Host systemd timers showed no PostgreSQL/MinIO backup job; root's only active
  cron entry ran Docker cleanup. The cron directory inventory showed no named
  backup job. Coolify had no scheduled task for the shared service, and no other
  task matched backup names or common dump/copy tools. This bounded search can
  miss custom jobs; it cannot prove that no external backup exists.
- The on-VPS `/data/coolify/backups/storage-retention-389/` directory exists.
  The [cleanup runbook](../storage-cleanup.md#validation-evidence--2026-10-08)
  identifies it as a copy of original MinIO policies, not a scheduled backup of
  Fallstack rows and object bytes. Six-month CV cleanup is data retention, not
  backup retention.
- [Migration PR #377](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/pull/377)
  records that no scheduled shared-service backups were added.
  [Release PR #379](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/pull/379)
  records a one-time off-server production archive,
  `final-prod-20260923T130159Z.tar.gz`, checksum verification and a restore test.
  That historical PR evidence was inspected; the archive's current availability,
  access and retention were not rechecked. It does not establish ongoing coverage.

### Failure notifications

For the shared resource's Coolify team (ID 0), SMTP and Resend are disabled and
instance email settings are not selected. The backup-failure email event flag is
enabled, but the configured recipient field is null.
An event flag alone cannot deliver email without a configured transport.

Discord and its backup-failure event are enabled. Slack, Telegram, Pushover and
webhook channels are disabled. The Discord recipient membership, Tech User's
access, and actual delivery were not verified. With no backup job for these
resources, no failed-run notification for them could be inspected.

Coolify's [notification event documentation](https://coolify.io/docs/core/notifications/events)
describes backup-failure events, including failure to upload an S3 copy. It
describes capability, not evidence of successful delivery on this instance.

## Evidence required to close #465

Tech User must supply or arrange the following evidence for both environments.
Store credentials, private destinations and full logs in the restricted platform
runbook; link a redacted record here with its verification date.

1. **Schedule and retention:** identify each actual job, its operator, enabled
   schedule and timezone, retention in count/days, and most recent successful
   run. Show that PostgreSQL selection includes both Fallstack schemas and
   migration history, and that object backup selection includes all six buckets.
   A PostgreSQL dump alone cannot recover MinIO object bytes.
2. **Outside the VPS:** identify the backup provider/location and independent
   failure boundary, then verify a recent recoverable database and object copy
   there. An S3 endpoint backed by this same VPS does not meet this criterion.
   Include how authorized operators retrieve the backup and any required keys
   after losing the VPS; keep secrets out of this public repository.
3. **Failure reaches a named contact:** route failed jobs and failed off-VPS
   uploads to Tech User (`tech.user@nei-isep.org`) or record an explicitly
   confirmed alternative channel reaching that contact. Safely simulate a
   failure in an isolated test job; record job/run ID, failure time, delivery
   time and recipient acknowledgement. Do not break a production backup to test
   alerts. Confirm how a missed scheduled run is detected as well.
4. **Update this audit:** replace missing fields with verified values and
   evidence references. Until then, owner identification alone does not satisfy
   the owner/schedule/retention/location criterion; off-VPS coverage and named
   recipient delivery also remain unverified.

Full restore rehearsal and team acceptance of maximum data loss/restore time
belong to parent #464. Coordinate database/object recovery points and the
[cleanup recovery rules](../storage-cleanup.md) so restoration does not silently
reattach expired or deleted CVs.

## Scope limits and re-audit

External provider snapshots, independently managed off-host jobs, private
platform runbooks, object contents and historical backup archives were not
accessible through the inspected evidence. Do not infer their existence or
absence from this audit. No new backup system or alert route was configured.

To repeat the audit, use read-only Coolify API/metadata access: resolve the
shared resource and volume IDs again, inspect their database/volume backup
schedules and execution records, inspect off-VPS destination settings without
printing credentials, then inspect the owning team's enabled notification
channels. Check host timers (`systemctl list-timers --all`) and cron jobs for
independent scheduling. Ask Tech User for external-job/provider evidence and
record any gaps explicitly. IDs and configuration can change after this date.
