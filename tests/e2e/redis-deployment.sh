#!/usr/bin/env bash
# Exercise the production Redis definition with disposable dev/main projects.
set -euo pipefail
cd "$(dirname "$0")/../.."
scratch="$(mktemp -d)"
cleanup() {
  for stage in dev main; do
    if [ -f "$scratch/$stage.json" ]; then
      docker compose -f "$scratch/$stage.json" down --volumes --remove-orphans || true
    fi
  done
  rm -rf "$scratch"
}
trap cleanup EXIT

# Docker failures stay nonzero; the same nc command must first pass a live control.
tcp_probe() {
  docker run --rm --network "$1" --entrypoint sh "$image" -ec '
    command -v nc >/dev/null
    test -n "$1"
    status=0
    nc -z -w 3 "$1" 6379 >/dev/null 2>&1 || status=$?
    case "$status" in
      0) echo OPEN ;;
      1) echo BLOCKED ;;
      *) exit "$status" ;;
    esac
  ' sh "$2"
}

# Coolify consumes this service extension; stock Compose rejects it.
sed '/^[[:space:]]*exclude_from_hc:/d' docker-compose.app.yml > "$scratch/compose.yml"

for stage in dev main; do
  project="fallstack-redis-check-$$-$stage"
  REDIS_PASSWORD="check-$stage-$$" REDIS_KEY_PREFIX="fallstack:$stage:" \
    docker compose --env-file .env.example -p "$project" \
    -f "$scratch/compose.yml" config --format json > "$scratch/rendered.json"
  # Keep the real Redis service/network/volume; avoid building web or touching shared data.
  node - "$scratch/rendered.json" "$scratch/$stage.json" <<'NODE'
const fs = require("node:fs");
const assert = require("node:assert/strict");
const config = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const url = new URL(config.services.web.environment.REDIS_URL);
assert.equal(url.hostname, "redis-private");
assert.equal(url.port, "6379");
assert.equal(url.password, config.services.redis.environment.REDIS_PASSWORD);
assert.match(config.services.web.environment.REDIS_KEY_PREFIX, /^fallstack:(dev|main):$/);
// Emulate Coolify managed Compose adding its resource network to every service.
config.services.redis.networks.coolify_resource = {};
fs.writeFileSync(process.argv[3], JSON.stringify({
  name: config.name,
  services: { redis: config.services.redis },
  networks: { redis_private: config.networks.redis_private, coolify_resource: {} },
  volumes: { redis_data: config.volumes.redis_data },
}));
NODE
  invalid_password="$(docker compose -f "$scratch/$stage.json" run --rm --no-deps \
    -e 'REDIS_PASSWORD=invalid"password' redis 2>&1 || true)"
  [[ "$invalid_password" == *'REDIS_PASSWORD must contain only URL-safe'* ]]
  docker compose -f "$scratch/$stage.json" up -d --wait
done

for stage in dev main; do
  compose=(docker compose -f "$scratch/$stage.json")
  container="$("${compose[@]}" ps -q redis)"
  project="fallstack-redis-check-$$-$stage"
  network="${project}_redis_private"
  image="$(docker inspect -f '{{.Config.Image}}' "$container")"
  cli=(docker run --rm --network "$network" -e "REDISCLI_AUTH=check-$stage-$$" "$image" redis-cli -h redis-private --raw)
  test "$("${cli[@]}" ping)" = PONG
  for setting in 'appendonly yes' 'appendfsync everysec' 'maxmemory 100663296' 'maxmemory-policy noeviction' 'protected-mode yes'; do
    read -r key expected <<< "$setting"
    test "$("${cli[@]}" config get "$key" | tail -n 1)" = "$expected"
  done
  test -z "$("${cli[@]}" config get save | tail -n 1)"
  "${compose[@]}" exec -T redis sh -ec '
    ! tr "\000" " " < /proc/1/cmdline | grep -q -- --requirepass
    test "$(stat -c %a /tmp/redis.conf)" = 600
  '
  test "$("${compose[@]}" exec -T redis redis-cli ping)" = 'NOAUTH Authentication required.'
  other=main
  if [ "$stage" = main ]; then other=dev; fi
  wrong_password="$("${compose[@]}" exec -T -e "REDISCLI_AUTH=check-$other-$$" redis redis-cli ping 2>&1 || true)"
  [[ "$wrong_password" == *WRONGPASS* ]]
  test -z "$("${cli[@]}" get "fallstack:$other:smoke")"
  test "$("${cli[@]}" set "fallstack:$stage:smoke" retained EX 600)" = OK
  test "$(docker inspect -f '{{json .HostConfig.PortBindings}}' "$container")" = '{}'
  test "$(docker network inspect -f '{{.Internal}}' "$network")" = true
  test "$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$container")" = unless-stopped
  address="$(docker inspect -f "{{(index .NetworkSettings.Networks \"$network\").IPAddress}}" "$container")"
  resource_network="${project}_coolify_resource"
  resource_address="$(docker inspect -f "{{(index .NetworkSettings.Networks \"$resource_network\").IPAddress}}" "$container")"
  test "$(tcp_probe "$network" "$address")" = OPEN
  if tcp_probe "${project}_missing" "$address" >/dev/null 2>&1; then
    echo 'TCP probe accepted a Docker network error' >&2
    exit 1
  fi
  for target in "$resource_address" "$address"; do
    test "$(tcp_probe "$resource_network" "$target")" = BLOCKED
  done
  "${compose[@]}" restart redis
  "${compose[@]}" up -d --wait
  test "$("${cli[@]}" get "fallstack:$stage:smoke")" = retained
  "${compose[@]}" up -d --force-recreate --wait
  test "$("${cli[@]}" get "fallstack:$stage:smoke")" = retained
done
echo 'Redis auth, environment isolation, private networking and persistence passed.'
