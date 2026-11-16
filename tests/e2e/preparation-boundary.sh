#!/usr/bin/env bash
# Synthetic TLS credentials and upstream only; never contact shared services.
set -euo pipefail
scratch=$(mktemp -d)
project="preparation-check-$$"
image=nginxinc/nginx-unprivileged:1.28-alpine
cleanup() {
  docker rm -f "$project-gateway" "$project-web" >/dev/null 2>&1 || true
  docker network rm "$project" >/dev/null 2>&1 || true
  rm -rf "$scratch"
}
trap cleanup EXIT
# Stock Compose does not support Coolify's health metadata.
sed '/exclude_from_hc:/d' docker-compose.app.yml > "$scratch/app.yml"
STAFF_TLS_DIRECTORY="$scratch" docker compose --profile "*" --env-file .env.example \
  -f "$scratch/app.yml" -f docker-compose.preparation.yml config --format json > "$scratch/config.json"
node - "$scratch/config.json" <<'NODE'
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const {services} = JSON.parse(fs.readFileSync(process.argv[2]));
assert.equal(services.web.labels['traefik.enable'], 'false');
assert.equal(services.web.ports?.length ?? 0, 0);
assert.deepEqual(services['storage-cleanup'].profiles, ['retention-daemon']);
assert.equal(services['staff-gateway'].ports[0].host_ip, '127.0.0.1');
const unit = fs.readFileSync('deployment/retention/fallstack-retention.service', 'utf8');
assert(!unit.includes('--apply'));
const guard = unit.match(/^ExecStartPost=\/bin\/sh -c '([^']+)'$/m)?.[1];
assert(guard, 'Audit-only retention must fail loudly');
const audit = spawnSync('/bin/sh', ['-c', guard], {encoding: 'utf8'});
assert.equal(audit.status, 1);
assert.match(audit.stderr, /ERROR: retention is audit-only/);
const apply = fs.readFileSync('deployment/retention/apply.conf', 'utf8');
assert(apply.includes('--apply'));
assert.match(apply, /^ExecStartPost=$/m);
NODE
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=test-ca \
  -addext basicConstraints=critical,CA:TRUE \
  -keyout "$scratch/ca.key" -out "$scratch/staff-ca.crt" 2>/dev/null
touch "$scratch/index"
echo 1000 > "$scratch/serial"
cat > "$scratch/ca.conf" <<EOF
[ca]
default_ca = staff
[staff]
database = $scratch/index
serial = $scratch/serial
new_certs_dir = $scratch
certificate = $scratch/staff-ca.crt
private_key = $scratch/ca.key
default_md = sha256
default_days = 1
default_crl_days = 1
policy = names
[names]
commonName = supplied
EOF
for name in tls client revoked; do
  openssl req -newkey rsa:2048 -nodes -subj "/CN=$name" \
    -keyout "$scratch/$name.key" -out "$scratch/$name.csr" 2>/dev/null
  openssl ca -batch -notext -config "$scratch/ca.conf" -in "$scratch/$name.csr" \
    -out "$scratch/$name.crt" 2>/dev/null
done
openssl ca -config "$scratch/ca.conf" -gencrl -out "$scratch/staff-ca.crl" 2>/dev/null
# Disposable test keys only; gateway UID 101 must read its server key.
chmod 755 "$scratch"
chmod 644 "$scratch/tls.key"
printf 'server { listen 4000; location / { return 200 "staff-upstream"; } }\n' > "$scratch/web.conf"
docker network create "$project" >/dev/null
docker run -d --name "$project-web" --network "$project" --network-alias web \
  -v "$scratch/web.conf:/etc/nginx/conf.d/default.conf:ro" "$image" >/dev/null
mv "$scratch/staff-ca.crl" "$scratch/held.crl"
if docker run --rm --network "$project" -v "$PWD/deployment/staff.nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$scratch:/run/staff:ro" "$image" nginx -t > "$scratch/missing-crl.log" 2>&1; then
  echo 'Gateway unexpectedly accepted a missing CRL' >&2
  exit 1
fi
mv "$scratch/held.crl" "$scratch/staff-ca.crl"
docker run --rm --network "$project" -v "$PWD/deployment/staff.nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$scratch:/run/staff:ro" "$image" nginx -t
docker run -d --name "$project-gateway" --network "$project" \
  -p 127.0.0.1::8443 -v "$PWD/deployment/staff.nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$scratch:/run/staff:ro" "$image" >/dev/null
port=$(docker port "$project-gateway" 8443/tcp | head -1 | cut -d: -f2)
url="https://127.0.0.1:$port"
for _attempt in $(seq 1 30); do
  if curl -ks --cert "$scratch/client.crt" --key "$scratch/client.key" "$url/overview" | grep -q staff-upstream; then break; fi
  sleep 1
done
for path in /overview /companies/new /students/test/edit /attendance/scan /attendance \
  /actions/test /admin-saved /admins/new /employees /faqs /giveaway /interests \
  /scans /schedule /sponsors /statistics /storage/cvs \
  /api/admin/students /api/auth/login /api/auth/logout /api/auth/callback/zitadel /api/auth/session \
  /login /_next/static/test.js /_next/image /assets/images/logo_white.svg \
  /api/media/logo/test /api/admin/storage/cv/test /api/students/test/cv/file \
  /api/actions/test /api/sessions/test/check-ins/count; do
  test "$(curl -ks --cert "$scratch/client.crt" --key "$scratch/client.key" "$url$path")" = staff-upstream
  test "$(curl -ks -o /dev/null -w '%{http_code}' "$url$path")" = 400
done
test "$(curl -ks --cert "$scratch/client.crt" --key "$scratch/client.key" -o /dev/null -w '%{http_code}' "$url/")" = 302
test "$(curl -ks -o /dev/null -w '%{http_code}' "$url/")" = 400
for path in /event/pt /student/test /company/test /dashboard /signup /about \
  /api/students /api/companies /api/wallet /api/auth/signup/employee \
  /api/auth/password-reset /api/auth/login/extra /api/administer/test \
  /overview-other /_next/data/test/student.json /assets/../../api/students; do
  for method in GET POST; do
    test "$(curl -ks --cert "$scratch/client.crt" --key "$scratch/client.key" \
      -X "$method" -H 'Next-Action: stale' -o /dev/null -w '%{http_code}' "$url$path")" = 404
  done
done
test "$(curl -ks --cert "$scratch/client.crt" --key "$scratch/client.key" -X PATCH "$url/api/actions/test")" = staff-upstream
test "$(curl -ks --cert "$scratch/client.crt" --key "$scratch/client.key" -X POST -o /dev/null -w '%{http_code}' "$url/api/actions/test")" = 403
test "$(curl -ks --cert "$scratch/client.crt" --key "$scratch/client.key" -X POST "$url/api/sessions/test/check-ins")" = staff-upstream
for path in /api/students/test/cv/file /api/media/logo/test /_next/image /_next/static/test.js; do
  test "$(curl -ks --cert "$scratch/client.crt" --key "$scratch/client.key" -X POST -o /dev/null -w '%{http_code}' "$url$path")" = 403
done
# A certificate outside the dedicated staff CA must also fail.
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=outsider \
  -keyout "$scratch/outsider.key" -out "$scratch/outsider.crt" 2>/dev/null
test "$(curl -ks --cert "$scratch/outsider.crt" --key "$scratch/outsider.key" -o /dev/null -w '%{http_code}' "$url/overview")" = 400
# Revoke a previously accepted client and reload the updated CRL.
test "$(curl -ks --cert "$scratch/revoked.crt" --key "$scratch/revoked.key" "$url/overview")" = staff-upstream
openssl ca -config "$scratch/ca.conf" -revoke "$scratch/revoked.crt" 2>/dev/null
openssl ca -config "$scratch/ca.conf" -gencrl -out "$scratch/staff-ca.crl" 2>/dev/null
docker exec "$project-gateway" nginx -s reload
for _attempt in $(seq 1 30); do
  if [ "$(curl -ks --cert "$scratch/revoked.crt" --key "$scratch/revoked.key" -o /dev/null -w '%{http_code}' "$url/overview")" = 400 ]; then break; fi
  sleep 1
done
test "$(curl -ks --cert "$scratch/revoked.crt" --key "$scratch/revoked.key" -o /dev/null -w '%{http_code}' "$url/overview")" = 400
test "$(curl -ks --cert "$scratch/client.crt" --key "$scratch/client.key" "$url/overview")" = staff-upstream
echo 'Preparation boundary: staff paths only; missing/untrusted/revoked clients rejected; audit-only retention fails.'
