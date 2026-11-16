# Scoped host image and cache retention

Install `deployment/maintenance/maintain.py` under
`/opt/fallstack-maintenance/`, the service/timer under `/etc/systemd/system/`,
and a root-owned mode-0600 configuration at `/etc/fallstack/maintenance.json`.
Use the example JSON, replacing its repository list from inspected live image
references, including the same application projects' migrator and cleanup-worker
repositories. Restrict expansion to inspected project/service labels; a web-only
allowlist misses large worker images. Keep internal resource names in that restricted inventory, not Git.

Run without `--apply` first. Review selected counts against the exact private
inventory, then run with `--apply` and enable the timer. It runs daily at 04:20
UTC plus up to 15 minutes of jitter, under a non-blocking exclusive lock.

The script protects all container image references (including stopped
containers), the newest three images in each configured repository, and every
image with a tag outside that allowlist. Deletion is non-forced and rechecks
container references immediately before removing a tag. Never use a broad image
or volume prune as a replacement. Volumes and containers are never deleted.

Cache selection uses Docker's last-use age filter, at least one hour, and excludes
active and image-shared records. The example bounds selected records to 4 GiB
per run and stops when free space reaches 20 GiB. Selected bytes are an upper
bound, not a promise of recovered filesystem space: layer sharing and cache
relationships can prevent recovery. A failed space target requires operator
inspection; never delete persistent data to make the target green.

Inspect system journal/container log size before changing retention. Preserve
existing bounded rotation; an initial target for this host is at least 20 GiB free.
Maintain deployment rollback images and verify active services after cleanup.
Audit unattached volumes against labels, contents, historical mounts and backups;
PostgreSQL data and unidentified contents remain protected even when unattached.

The public-safe result records only counts and disk totals. Repository names,
image IDs, container/volume identifiers and infrastructure paths belong in the
restricted inventory. Never include environment dumps in reports.

For a separately configured, inactive BuildKit builder, inspect its last activity
and cache records first. Bootstrap only that existing builder if its daemon is
absent, use its native `buildx prune --builder …` API with a bounded byte budget,
then stop it again. Preserve its state volume. Do not delete BuildKit databases
or snapshot directories by hand, and do not prune a builder with active jobs.
