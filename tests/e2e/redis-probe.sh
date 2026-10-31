#!/bin/sh
# Exercise the production host probe without Docker or real credentials.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
fixture_root=${TMPDIR:-/tmp}
fixture=$(mktemp -d "$fixture_root/fallstack-redis-probe.XXXXXX")
cleanup() {
  # Check the absolute test-owned directory before recursively removing it.
  case "$fixture" in
    "$fixture_root"/fallstack-redis-probe.*) rm -rf -- "$fixture" ;;
    *) printf 'Refusing cleanup outside test fixture directory\n' >&2; exit 1 ;;
  esac
}
trap cleanup EXIT
mkdir "$fixture/bin"

cat >"$fixture/bin/docker" <<'SH'
#!/bin/sh
set -eu
[ "$1" = exec ]
[ "$2" = test-dev ] || [ "$2" = test-main ]
shift 2
if [ "$PROBE_CASE" = missing-password ]; then
  unset REDIS_PASSWORD
else
  export REDIS_PASSWORD=synthetic-probe-secret
fi
exec "$@"
SH

cat >"$fixture/bin/redis-cli" <<'SH'
#!/bin/sh
set -eu
# Fail if the real probe does not authenticate or enable CLI error exit codes.
[ "${REDISCLI_AUTH:-}" = synthetic-probe-secret ]
[ "$*" = '--raw -e ping' ]
case "$PROBE_CASE" in
  good) printf 'PONG\n' ;;
  noauth) printf 'NOAUTH Authentication required.\n' ;;
  substring) printf 'ERR expected PONG but failed\n' ;;
  extra) printf 'PONG\nextra\n' ;;
  failed) printf 'PONG\n'; exit 1 ;;
  refused) exit 1 ;;
esac
SH
chmod +x "$fixture/bin/docker" "$fixture/bin/redis-cli"

for probe_case in good noauth substring extra failed refused missing-password; do
  PATH="$fixture/bin:$PATH" PROBE_CASE="$probe_case" PROBE_DIR="$fixture/output" \
    REDIS_DEV_CONTAINER=test-dev REDIS_MAIN_CONTAINER=test-main \
    sh "$root/monitoring/redis-probe.sh"
  expected=0
  if [ "$probe_case" = good ]; then expected=1; fi
  for environment in dev main; do
    grep -Eq "^redis_probe,environment=$environment,service=redis,copy=test-$environment healthy=${expected}i,timestamp_seconds=[0-9]+i$" \
      "$fixture/output/redis.influx"
  done
  [ "$(wc -l <"$fixture/output/redis.influx")" -eq 2 ]
  if grep -Eq 'secret|NOAUTH|PONG|ERR' "$fixture/output/redis.influx"; then exit 1; fi
done
printf 'Redis probe authentication and exact-PONG regression checks passed.\n'
