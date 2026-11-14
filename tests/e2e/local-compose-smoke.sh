#!/usr/bin/env bash
# Exercise the complete standalone local stack using isolated CI ports and data.
set -euo pipefail
cd "$(dirname "$0")/../.."

project="fallstack-local-smoke-$$"
compose=(docker compose -p "$project" -f docker-compose.local.yml)

export FALLSTACK_LOCAL_POSTGRES_PORT=15432
export FALLSTACK_LOCAL_REDIS_PORT=16379
export FALLSTACK_LOCAL_MINIO_API_PORT=19000
export FALLSTACK_LOCAL_MINIO_CONSOLE_PORT=19001
export FALLSTACK_LOCAL_WEB_PORT=14000
export FALLSTACK_LOCAL_GOOGLE_WALLET_NEVER_ENABLED=true
export STORAGE_CLEANUP_MODE=dry-run
# Use a real issuer URL, but deliberately fake client credentials: this smoke
# test verifies app startup, not an interactive AuthNEI login.
export AUTH_ISSUER_URL=https://auth.nei-isep.org

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    "${compose[@]}" logs --tail 60 || true
  fi
  "${compose[@]}" down --volumes --remove-orphans || true
}
trap cleanup EXIT

timeout 300s "${compose[@]}" up --build -d

ready=false
for attempt in $(seq 1 90); do
  if curl --fail --silent http://127.0.0.1:14000/api/health >/dev/null; then
    ready=true
    break
  fi
  sleep 2
done

if [ "$ready" != true ]; then
  echo "The local web service did not become healthy within 180 seconds" >&2
  exit 1
fi

# The migration and all bucket initializers must complete successfully; the
# database, Redis, MinIO, web and cleanup services must remain running.
"${compose[@]}" ps --all --format json | node -e '
const fs = require("node:fs");
const assert = require("node:assert/strict");
const rows = fs.readFileSync(0, "utf8").trim().split("\n").map(JSON.parse);

for (const name of [
  "migrate",
  "minio-init-avatars",
  "minio-init-logos",
  "minio-init-cvs",
]) {
  const service = rows.find((row) => row.Service === name);
  assert.ok(service, "Missing one-shot service: " + name);
  assert.equal(service.State, "exited", name + " did not exit");
  assert.equal(service.ExitCode, 0, name + " did not complete successfully");
}

for (const name of ["postgres", "redis", "minio", "web", "storage-cleanup"]) {
  const service = rows.find((row) => row.Service === name);
  assert.ok(service, "Missing running service: " + name);
  assert.equal(service.State, "running", name + " is not running");
}
'

# The cleanup worker must finish its initial dry-run, not merely stay running.
cleanup_container_id="$("${compose[@]}" ps -q storage-cleanup)"
cleanup_ready=false
for attempt in $(seq 1 30); do
  if docker exec "$cleanup_container_id" test -f /tmp/storage-cleanup-success; then
    cleanup_ready=true
    break
  fi
  sleep 2
done
if [ "$cleanup_ready" != true ]; then
  echo "storage-cleanup did not complete its initial dry-run" >&2
  exit 1
fi

# Confirm that the bucket initializer created all required buckets.
buckets="$("${compose[@]}" run --rm --no-deps minio-init-avatars ls local)"
for bucket in fallstack-dev-avatars fallstack-dev-logos fallstack-dev-cvs; do
  if ! grep -Fq "$bucket" <<< "$buckets"; then
    echo "MinIO bucket was not created: $bucket" >&2
    exit 1
  fi
done

# Wait for the four services with healthchecks, not just the HTTP liveness probe.
for service in postgres redis minio web; do
  container_id="$("${compose[@]}" ps -q "$service")"
  healthy=false
  for attempt in $(seq 1 30); do
    health="$(docker inspect --format '{{.State.Health.Status}}' "$container_id")"
    if [ "$health" = healthy ]; then
      healthy=true
      break
    fi
    sleep 2
  done
  if [ "$healthy" != true ]; then
    echo "$service did not become healthy" >&2
    exit 1
  fi
done

echo "Standalone local Compose stack started; migrations, Redis, PostgreSQL, MinIO buckets and web health passed."
