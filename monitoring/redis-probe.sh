#!/bin/sh
# Authenticated Redis health probe for standalone Coolify Redis resources.
# Coolify cannot set a custom healthcheck, so run PING with the container's own
# REDIS_PASSWORD and write one influx line per Redis for Telegraf's inputs.file.
# The password never leaves the Redis container.
set -eu

out_dir=${PROBE_DIR:-/var/lib/fallstack-probes}
mkdir -p "$out_dir"
tmp=$(mktemp "$out_dir/.redis.XXXXXX")
trap 'rm -f "$tmp"' EXIT
now=$(date +%s)

docker ps -a --filter label=coolify.database.subType=standalone-redis \
  --format '{{.Names}}' | while read -r name; do
  case $(docker inspect "$name" --format '{{ index .Config.Labels "coolify.environmentName" }}') in
    development) environment=dev ;;
    production) environment=main ;;
    *) continue ;;
  esac
  # Stopped or unreachable Redis fails the exec and counts as unhealthy.
  if timeout 5 docker exec "$name" sh -c \
    'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping | grep -q PONG' \
    >/dev/null 2>&1; then
    healthy=1
  else
    healthy=0
  fi
  printf 'redis_probe,environment=%s,service=redis,copy=%s healthy=%si,timestamp_seconds=%si\n' \
    "$environment" "$name" "$healthy" "$now"
done >"$tmp"

chmod 644 "$tmp"
mv "$tmp" "$out_dir/redis.influx"
