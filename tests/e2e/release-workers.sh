#!/usr/bin/env bash
# Check production replica counts/dependencies without shared DB, S3 or app builds.
set -euo pipefail
cd "$(dirname "$0")/../.."
scratch="$(mktemp -d)"
project="fallstack-release-check-$$"
compose=(docker compose -p "$project" -f "$scratch/check.json")
cleanup() {
  status=$?
  if [ -f "$scratch/check.json" ]; then
    if [ "$status" -ne 0 ]; then "${compose[@]}" logs --tail 30 || true; fi
    "${compose[@]}" down --volumes --remove-orphans || true
  fi
  rm -rf "$scratch"
}
trap cleanup EXIT

# Stock Compose rejects this Coolify-only extension.
sed '/^[[:space:]]*exclude_from_hc:/d' docker-compose.app.yml > "$scratch/source.yml"
# A stale/mistaken environment knob must not change the Coolify-facing counts.
WEB_REPLICAS=3 REDIS_PASSWORD=release-check REDIS_KEY_PREFIX=fallstack:check: \
  docker compose --env-file .env.example -p "$project" \
  -f "$scratch/source.yml" config --format json > "$scratch/rendered.json"
node - "$scratch/rendered.json" "$scratch/check.json" <<'NODE'
const fs = require('node:fs');
const assert = require('node:assert/strict');
const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const commands = {
  migrate: 'sleep 2; echo migrated >> /audit/events',
  web: 'test -s /audit/events; echo web >> /audit/events; exec sleep infinity',
  'storage-cleanup': 'test -s /audit/events; echo cleanup >> /audit/events; exec sleep infinity',
};
const services = {};
for (const [name, command] of Object.entries(commands)) {
  const service = config.services[name];
  assert.equal(service.deploy.replicas, 1);
  services[name] = {
    image: 'alpine:3.23',
    command: ['sh', '-ec', command],
    deploy: service.deploy,
    restart: service.restart,
    depends_on: service.depends_on,
    volumes: ['audit:/audit'],
    network_mode: 'none',
  };
}
fs.writeFileSync(process.argv[3], JSON.stringify({ services, volumes: { audit: {} } }));
NODE

assert_counts() {
  "${compose[@]}" ps --all --format json > "$scratch/containers.jsonl"
  node - "$scratch/containers.jsonl" <<'NODE'
const fs = require('node:fs');
const assert = require('node:assert/strict');
const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(JSON.parse);
for (const [name, count] of [['web', 3], ['storage-cleanup', 1], ['migrate', 1]]) {
  const containers = rows.filter(row => row.Service === name);
  assert.equal(containers.length, count);
  for (const row of containers) {
    assert.equal(row.State, name === 'migrate' ? 'exited' : 'running');
    if (name === 'migrate') assert.equal(row.ExitCode, 0);
  }
}
NODE
}

# Scaling is an explicit stock-Compose test override, never production env config.
"${compose[@]}" up -d --scale web=3 --wait
assert_counts
events="$("${compose[@]}" exec -T --index 1 web cat /audit/events)"
test "$(head -n 1 <<< "$events")" = migrated
test "$(grep -cx migrated <<< "$events")" = 1
test "$(grep -cx web <<< "$events")" = 3
test "$(grep -cx cleanup <<< "$events")" = 1
"${compose[@]}" restart web
assert_counts
events="$("${compose[@]}" exec -T --index 1 web cat /audit/events)"
test "$(grep -cx migrated <<< "$events")" = 1
test "$(grep -cx cleanup <<< "$events")" = 1

"${compose[@]}" up -d --scale web=3 --force-recreate --wait
assert_counts
events="$("${compose[@]}" exec -T --index 1 web cat /audit/events)"
test "$(grep -cx migrated <<< "$events")" = 2
test "$(grep -cx cleanup <<< "$events")" = 2
test "$(tail -n 5 <<< "$events" | head -n 1)" = migrated
"${compose[@]}" down --volumes

node - "$scratch/check.json" <<'NODE'
const fs = require('node:fs');
const file = process.argv[2];
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
config.services.migrate.command = ['sh', '-ec', 'exit 42'];
fs.writeFileSync(file, JSON.stringify(config));
NODE
if "${compose[@]}" up -d --scale web=3 --wait; then
  echo 'Failed migration unexpectedly permitted startup' >&2
  exit 1
fi
test -z "$("${compose[@]}" ps --status running -q web storage-cleanup)"
"${compose[@]}" ps --all --format json > "$scratch/containers.jsonl"
node - "$scratch/containers.jsonl" <<'NODE'
const fs = require('node:fs');
const assert = require('node:assert/strict');
const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(JSON.parse);
assert.equal(rows.find(row => row.Service === 'migrate').ExitCode, 42);
for (const row of rows.filter(row => row.Service !== 'migrate')) assert.equal(row.State, 'created');
NODE
echo 'Singleton jobs, web-only scaling, release ordering and migration failure passed.'
