# Isolated PostgreSQL and MinIO restore rehearsal

Scope: [Task05-A2 #466](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/466).
Use the [backup recovery procedure](backups.md#recovery) to select, verify and
decrypt a retained archive. This exercise proves snapshot recovery, not live
AuthNEI recovery, a production cutover, or team acceptance of RPO/RTO (#464).

## Isolation and repeat procedure

Future rehearsals must run on a non-production host with a separate Docker
daemon, disk and kernel, Python/boto3, age and sufficient free space. Do not
repeat the production-host placement recorded below: an internal Docker network
does not isolate disk pressure, daemon access or a compromised host. See
[ADR 0029](../decisions/0029-rehearse-restores-away-from-production.md).
Use the separately retained off-VPS recovery identity through authorized recovery
access; do not copy `/etc/fallstack-backup/recovery.agekey` from production.
Protect plaintext production personal data with `umask 077` and a mode-0700
working directory. Before transferring the archive, record the host and the
named data owner who approved access and placement of production personal
data. Restrict shell and Docker access to authorized operators. Use dedicated
encrypted rehearsal storage for plaintext files, Docker data and both named
volumes. Disable swap and crash dumps for the rehearsal or protect them with
the same ephemeral encryption. Keep plaintext out of host backups and
snapshots. Never run web, migrations, cleanup or email jobs against the restored
copy.

Before creating any resources, choose a unique rehearsal ID and write a durable,
mode-0600 state file in a pre-existing restricted operator state directory. Record
all intended container, network and **new named volume** names and the absolute
plaintext working path before creating any of them. Use exclusively reserved
names/paths; abort on any collision, never adopt or delete an existing resource.
Register cleanup before `mkdir` or any Docker creation. Label every Docker
resource with the rehearsal ID and mount only the planned new volumes at each
image's data directory; do not allow implicit anonymous volumes. Keep credentials
out of the state file. The state file must survive until cleanup is verified.
For the selected archive key, record expected completed migration and
application table counts for each database and their source before restoring.
Use counts from a contemporaneous source schema record tied to that snapshot,
or derive them by applying the schema revision known to be deployed when that
database was dumped to an empty reference database. If the baseline cannot be
established independently of the dump, record the gate as unverified and stop
before reporting a pass.

1. Read `last-success.json` and the selected archive's R2 `.verified.json`
   receipt. Download the archive and match **both** SHA-256 and byte count
   against the receipt before decrypting. When using the host R2 credentials,
   take `/var/lib/fallstack-backup/lock` with nonblocking exclusive `flock` and
   use `backup.Budget` / `backup.r2_call` for both GETs. Each attempt costs two
   Class B requests. Hold the lock only for those two GETs and their ledger
   updates; release it immediately after both downloads, before checksum
   verification, decryption or restore. Release it on download failure too.
   Preserve the request ledger. If the lock is busy, stop and retry later;
   never hold it through the rehearsal or pause the scheduled backup. Transfer
   only the encrypted archive and receipt to the non-production host using an
   authorized secure channel; keep host R2 credentials and the ledger on `nei`.
   Check checksum and byte count again after transfer. No plaintext restore
   work runs on the backup host.
2. Decrypt on the non-production host using the off-VPS identity and inspect/extract safely
   (`tarfile.extractall(..., filter="data")` with supported Python). Validate
   manifest scope against the two databases and six buckets in the backup
   runbook. Restrict manifest file paths to the extracted `data/` directory;
   object keys are S3 keys, never filesystem paths.
3. Before starting containers, select PostgreSQL 16 and a compatible MinIO
   release, resolve both to immutable `repository@sha256:...` image references
   and record them with the platform/architecture and tool versions. Run those
   exact references, never floating tags. Record resource limits and readiness
   results for this run; the historical one-CPU/384-MiB observation below is
   not a validated sizing recommendation for another image or snapshot.
   Create the planned `docker network create --internal` network and two
   **new** containers with random throwaway credentials, no host ports, only
   the planned new volumes and no shared-data network. Check host pressure
   before starting. Pass initialization credentials via mode-0600
   `docker run --env-file` files inside the plaintext working directory and
   remove them in cleanup. Docker operators can still inspect container
   environment variables. Wait for `pg_isready` and authenticated MinIO readiness.
4. Create `fallstack_dev` and `fallstack_prod` only inside the new PostgreSQL
   container with `POSTGRES_USER=postgres`. Set `isolated_pg` to its verified
   rehearsal container name and `plaintext_dir` to the planned working path.
   Run this block and stop the rehearsal on a nonzero exit.

   ```bash
   (
     set -e
     for db in fallstack_dev fallstack_prod; do
       docker exec -i "${isolated_pg:?}" pg_restore -U postgres --exit-on-error \
         --no-owner --no-privileges -d "$db" < "${plaintext_dir:?}/data/$db.dump"
     done
   )
   ```

   Do not use shared PostgreSQL credentials or a configurable live database URL.

5. Create all six original bucket names only inside the new MinIO container.
   Its endpoint comes from that container's IP on the isolated network. Use
   the throwaway credentials. For every manifest object, validate local size
   and SHA-256, PUT original key/metadata, GET it back and compare size,
   SHA-256 and all saved response metadata. Explicitly account for empty buckets.
6. Run the account/CV checks below in **each isolated database**. Report only
   aggregate counts; never publish emails, subject IDs, student codes, object
   keys or decrypted files. A missing reference fails recovery consistency even
   if every archived object was restored correctly.
7. In `finally`/a shell exit trap, attempt removal of every planned task-owned
   container with `docker rm -fv`, then every planned volume, network and the
   plaintext working directory, even if creation/startup failed partway. Destroy
   the rehearsal storage encryption key and verify that the storage cannot be
   reopened. Verify
   resource ownership labels before removal. An already absent resource must
   not prevent the remaining cleanup attempts. Verify all planned names/paths
   and resources bearing this rehearsal ID are gone; only then remove the
   state file. Preserve the encrypted archive, source services, backup timer,
   credentials and request ledger. Traps cannot handle SIGKILL, host failure or
   power loss: after interruption, use the retained state file and label sweep
   to finish cleanup before starting another rehearsal. Surface cleanup
   failures and retain state for operator recovery; do not report success.

The internal network has no application or shared-service attachments. Neither
restore command can address a shared PostgreSQL database or shared MinIO bucket.
Only the download step on the backup host reads R2 and updates its existing
request ledger. The backup timer is not paused or reconfigured.

### Budgeted download on the backup host

Run as an authorized backup operator. Set `archive_key` to the selected
`fallstack/…tar.gz.age` key from the private inventory or local
`last-success.json`. Use a new, empty mode-0700 staging directory with space for
the archive (up to 250 MB), and set `download_dir` to its absolute path. Transfer
files only if this command succeeds. Remove partial downloads after failure and
use a new directory on retry.

```bash
sudo python3 -B - "${archive_key:?}" "${download_dir:?}" <<'PY'
import fcntl
import json
import os
from pathlib import Path
import shutil
import sys

sys.path.insert(0, "/opt/fallstack-backup")
import backup

key, destination = sys.argv[1:]
if not backup.ARCHIVE_KEY.fullmatch(key):
    raise SystemExit("Invalid Fallstack archive key")

os.umask(0o077)
output = Path(destination)
config = json.loads(Path("/etc/fallstack-backup/config.json").read_text())
state = Path(config["state_dir"])
archive = output / Path(key).name
receipt = archive.with_name(archive.name + ".verified.json")
with (state / "lock").open("a") as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    budget = backup.Budget(state / "requests.json")
    s3 = backup.client(config["endpoint"], config["access_key_id"],
                       config["secret_access_key"])
    for path, object_key, limit in (
        (receipt, key + ".verified.json", backup.RECEIPT_HEADROOM),
        (archive, key, backup.MAX_ARCHIVE_BYTES),
    ):
        with path.open("xb") as target:
            response = backup.r2_call(s3, budget, "B", "get_object",
                                      Bucket=config["bucket"], Key=object_key)
            with response["Body"] as body:
                if not 0 < response["ContentLength"] <= limit:
                    raise SystemExit("Unexpected download size")
                shutil.copyfileobj(body, target, 1024 * 1024)

verified = json.loads(receipt.read_text())
if (verified["key"] != key or verified["bytes"] != archive.stat().st_size
        or verified["sha256"] != backup.digest(archive).hexdigest()):
    raise SystemExit("Archive does not match the verification receipt")
PY
```

## Account and CV consistency checks

Successful `pg_restore --exit-on-error` recreates and validates dumped foreign
keys, uniqueness constraints, cleanup triggers and migration history. Record
finished, non-rolled-back migration counts and application table counts. Also
require zero unvalidated constraints in the `fallstack` schema.

Run these queries in each isolated database. Migration and application table
counts must match each database's baseline recorded in the rehearsal state
file (26 and 20 for the 3 November snapshot below). Both failure counts
must be zero; stop and investigate any mismatch before recording a pass.

```sql
SELECT count(*) AS completed_migrations
FROM fallstack._prisma_migrations
WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;

SELECT count(*) AS unfinished_migrations
FROM fallstack._prisma_migrations
WHERE finished_at IS NULL AND rolled_back_at IS NULL;

SELECT count(*) AS application_tables
FROM information_schema.tables
WHERE table_schema = 'fallstack' AND table_type = 'BASE TABLE'
  AND table_name <> '_prisma_migrations';

SELECT count(*) AS unvalidated_constraints
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'fallstack' AND NOT c.convalidated;
```

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
Run both queries below and require both counts to be zero. The first catches
unparseable references that cannot match the tombstone join; the second uses
the same case-insensitive key comparison as the attachment guard trigger.

```sql
SELECT count(*) AS unparseable_cv_references
FROM fallstack."Student"
WHERE cv IS NOT NULL AND fallstack.storage_object_key('cv', cv) IS NULL;

SELECT count(*) AS tombstoned_cv_references
FROM fallstack."Student" s
JOIN fallstack."StorageDeletion" d
  ON d.kind = 'cv'
 AND lower(d.key) = fallstack.storage_object_key('cv', s.cv);
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
- Exact PostgreSQL and MinIO image tags/digests, platform and tool versions were
  not recorded in the retained evidence. This historical run cannot be
  reproduced exactly, including its resource-limit behavior. No image pin is
  inferred from today's source configuration; future runs must record pins
  before execution as required above.
- This run shared the production VPS's daemon, disk and kernel. Network and
  volume isolation did not cover host compromise, daemon access or disk
  pressure. No owner acceptance of that residual risk is recorded. This is
  historical evidence, not permission to repeat that placement; a new run on
  a non-production host remains unperformed.
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
