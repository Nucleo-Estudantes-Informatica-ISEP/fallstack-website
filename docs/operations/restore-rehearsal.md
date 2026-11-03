# Isolated PostgreSQL and MinIO restore rehearsal

Scope: [Task05-A2 #466](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/466).
Use the [backup recovery procedure](backups.md#recovery) to select, verify and
decrypt a retained archive. This exercise proves snapshot recovery, not live
AuthNEI recovery, a production cutover, or team acceptance of RPO/RTO (#464).

## Isolation and repeat procedure

Run on an authorized Docker host with Python/boto3, age and sufficient disk
space. Keep decrypted data in a mode-0700 temporary directory; use `umask 077`.
Never run web, migrations, cleanup or email jobs against the restored copy.

1. Read `last-success.json` and the selected archive's R2 `.verified.json`
   receipt. Download the archive and match **both** SHA-256 and byte count
   against the receipt before decrypting. When using the host R2 credentials,
   take `/var/lib/fallstack-backup/lock` with nonblocking exclusive `flock` and
   use `backup.Budget` / `backup.r2_call` for both GETs. Each attempt costs two
   Class B requests; preserve the request ledger and release the lock afterward.
2. Decrypt using the recovery identity and inspect/extract the archive safely
   (`tarfile.extractall(..., filter="data")` with supported Python). Validate
   manifest scope against the two databases and six buckets in the backup
   runbook. Restrict manifest file paths to the extracted `data/` directory;
   object keys are S3 keys, never filesystem paths.
3. Create a uniquely named `docker network create --internal` network and two
   **new** containers: PostgreSQL 16 and the source MinIO release. Use random
   throwaway credentials, no host ports, no existing volumes and no shared-data
   network. For the small current snapshot, each container used `--cpus 1
--memory 384m`. Check host pressure before starting. Wait for `pg_isready`
   and authenticated MinIO readiness.
4. Create `fallstack_dev` and `fallstack_prod` only inside the new PostgreSQL
   container. Restore their dumps through `docker exec -i <isolated-pg>
pg_restore -U postgres --exit-on-error --no-owner --no-privileges -d <db>`.
   A restore error fails the rehearsal. Do not use shared PostgreSQL credentials
   or a configurable live database URL for this step.
5. Create all six original bucket names only inside the new MinIO container.
   Its endpoint comes from that container's IP on the isolated network. Use
   the throwaway credentials. For every manifest object, validate local size
   and SHA-256, PUT original key/metadata, GET it back and compare size,
   SHA-256 and all saved response metadata. Explicitly account for empty buckets.
6. Run the account/CV checks below in **each isolated database**. Report only
   aggregate counts; never publish emails, subject IDs, student codes, object
   keys or decrypted files. A missing reference fails recovery consistency even
   if every archived object was restored correctly.
7. In `finally`/a shell exit trap, remove only the recorded task-owned containers
   with `docker rm -fv`, then their network and decrypted working directory.
   Verify all names/paths are gone. Preserve the source services, original
   archive, backup timer, credentials and request ledger.

The internal network has no application or shared-service attachments. Neither
restore command can address a shared PostgreSQL database or shared MinIO bucket.
The host only reads R2 and updates the existing request ledger. The backup timer
is not paused or reconfigured.

## Account and CV consistency checks

Successful `pg_restore --exit-on-error` recreates and validates dumped foreign
keys, uniqueness constraints, cleanup triggers and migration history. Record
finished, non-rolled-back migration counts and application table counts. Also
require zero unvalidated constraints in the `fallstack` schema.

Check profile ownership and role consistency (zero rows expected):

```sql
SELECT count(*) AS invalid_students
FROM fallstack."Student" s LEFT JOIN fallstack."User" u USING (id)
WHERE u.id IS NULL OR u.role IS DISTINCT FROM 'STUDENT';

SELECT count(*) AS invalid_employees
FROM fallstack."Employee" e LEFT JOIN fallstack."User" u USING (id)
WHERE u.id IS NULL OR u.role IS DISTINCT FROM 'EMPLOYEE';
```

Normalize every non-null CV reference with the restored database's existing
`fallstack.storage_object_key('cv', cv)` function. References can be app URLs;
comparing their raw value with S3 keys gives false missing-file reports. Require
non-null normalized keys and one matching manifest object in that environment's
CV bucket. Every matching restored object must pass the byte/metadata check.
Require zero references to deletion tombstones:

```sql
SELECT count(*) AS tombstoned_cv_references
FROM fallstack."Student" s
JOIN fallstack."StorageDeletion" d
  ON d.kind = 'cv'
 AND d.key = fallstack.storage_object_key('cv', s.cv);
```

Retain existing `cvUploadedAt`, `cvPurgedAt` and deletion records. Do not clear
or reattach expired/deleted CVs. Extra archived CVs can be legitimate orphans
because database and object snapshots are not atomic; record their count and
review them before any actual cutover. Do not start cleanup to hide mismatches.

## Evidence — 3 November 2026 (Europe/Lisbon)

- Source revision: `cc10dd80ae00832033194bb2eb4e0d19bab12a1d` (current `dev`).
- Selected R2 archive: `fallstack/20261103T111933588551Z.tar.gz.age`,
  **150,896,847 bytes**; receipt and archive matched SHA-256
  `271817b1c8e5d54ff8e1b5b3c4b6e4657a954f46f85e9511951c2271782800cf`.
  Snapshot started **11:19:22 WET**, backup verified **11:19:47 WET**.
- Rehearsal started **11:24:35 WET** on `nei`. Download, decryption, isolated
  container startup, restore and verification took **9.82 seconds**, excluding
  final resource removal. This is an observed small-snapshot rehearsal time,
  not an accepted disaster-recovery RTO or proof of VPS-independent recovery.
- Fresh PostgreSQL 16 and source-release MinIO containers used a new internal
  network, random credentials, one CPU/384 MiB each and no published ports.
  No shared service was a restore target; no shared DB/S3 credential was used
  by restore operations. R2 access was read-only (four Class B calls across
  two attempts, including the initial raw-reference comparison correction).
- Development: **2 users / 1 student / 0 employees / 0 CV references**.
  Production: **13 users / 10 students / 0 employees / 2 CV references**.
  Both DBs restored **26 completed migrations / 20 tables**. Zero orphan
  profiles, invalid profile roles, unvalidated constraints, missing CV objects
  or tombstoned CV references. Both referenced CVs matched restored bytes.
- All **21 objects / 151,161,881 bytes** passed SHA-256, length and metadata
  read-back: dev logos **1**, prod logos **18**, prod CVs **2**; other buckets
  were explicitly restored empty. Zero extra CV objects required reconciliation.
- First attempt compared raw CV URLs to S3 keys and correctly stopped on two
  apparent missing files. Repeated with the existing canonical-key SQL function;
  no backup data or source records were changed. Both attempts removed their
  task-owned containers/anonymous volumes, network and plaintext directories.
- Final cleanup verified all recorded Docker resource names absent. Shared
  services and the scheduled backup configuration were left running unchanged.

Not exercised: AuthNEI login, authenticated CV HTTP download, scoped application
role grants, loss of the VPS, recovery-key availability from the team's vault,
production traffic cutover, or accepted RPO/RTO. These belong to the coordinated
#464 recovery plan; no production recovery or team acceptance is claimed.
