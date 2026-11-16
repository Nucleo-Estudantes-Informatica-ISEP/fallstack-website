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
const {services} = JSON.parse(fs.readFileSync(process.argv[2]));
assert.equal(services.web.labels['traefik.enable'], 'false');
assert.equal(services.web.ports?.length ?? 0, 0);
assert.deepEqual(services['storage-cleanup'].profiles, ['retention-daemon']);
assert.equal(services['staff-gateway'].ports[0].host_ip, '127.0.0.1');
const unit = fs.readFileSync('deployment/retention/fallstack-retention.service', 'utf8');
assert(!unit.includes('--apply'));
assert(fs.readFileSync('deployment/retention/apply.conf', 'utf8').includes('--apply'));
NODE
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=test-ca \
  -keyout "$scratch/ca.key" -out "$scratch/staff-ca.crt" 2>/dev/null
for name in tls client; do
  openssl req -newkey rsa:2048 -nodes -subj "/CN=$name" \
    -keyout "$scratch/$name.key" -out "$scratch/$name.csr" 2>/dev/null
  openssl x509 -req -days 1 -in "$scratch/$name.csr" \
    -CA "$scratch/staff-ca.crt" -CAkey "$scratch/ca.key" -CAcreateserial \
    -out "$scratch/$name.crt" 2>/dev/null
done
# Disposable test keys only; gateway UID 101 must read its server key.
chmod 755 "$scratch"
chmod 644 "$scratch/tls.key"
printf 'server { listen 4000; location / { return 200 "staff-upstream"; } }\n' > "$scratch/web.conf"
docker network create "$project" >/dev/null
docker run -d --name "$project-web" --network "$project" --network-alias web \
  -v "$scratch/web.conf:/etc/nginx/conf.d/default.conf:ro" "$image" >/dev/null
docker run --rm --network "$project" -v "$PWD/deployment/staff.nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$scratch:/run/staff:ro" "$image" nginx -t
docker run -d --name "$project-gateway" --network "$project" \
  -p 127.0.0.1::8443 -v "$PWD/deployment/staff.nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$scratch:/run/staff:ro" "$image" >/dev/null
port=$(docker port "$project-gateway" 8443/tcp | head -1 | cut -d: -f2)
url="https://127.0.0.1:$port/"
for attempt in $(seq 1 30); do
  if curl -ks --cert "$scratch/client.crt" --key "$scratch/client.key" "$url" | grep -q staff-upstream; then break; fi
  sleep 1
done
test "$(curl -ks --cert "$scratch/client.crt" --key "$scratch/client.key" "$url")" = staff-upstream
test "$(curl -ks -o /dev/null -w '%{http_code}' "$url")" = 400
# A certificate outside the dedicated staff CA must also fail.
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=outsider \
  -keyout "$scratch/outsider.key" -out "$scratch/outsider.crt" 2>/dev/null
test "$(curl -ks --cert "$scratch/outsider.crt" --key "$scratch/outsider.key" -o /dev/null -w '%{http_code}' "$url")" = 400
echo 'Preparation boundary: trusted client accepted; missing/untrusted clients rejected.'
