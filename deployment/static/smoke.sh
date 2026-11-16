#!/bin/sh
set -eu
wget -qO /tmp/landing http://127.0.0.1:8080/
! grep -E '/api/|/_next/|login|signup|dashboard' /tmp/landing
for path in login signup student company admin overview api/auth/session api/media/logo/test _next/image; do
  wget -S -O /dev/null "http://127.0.0.1:8080/$path" 2>/tmp/headers && exit 1
  grep -q 'HTTP/1.1 404' /tmp/headers
  wget -S --header='Next-Action: stale' --post-data='' -O /dev/null "http://127.0.0.1:8080/$path" 2>/tmp/headers && exit 1
  grep -q 'HTTP/1.1 405' /tmp/headers
done
wget -S --post-data='' -O /dev/null http://127.0.0.1:8080/ 2>/tmp/headers && exit 1
grep -q 'HTTP/1.1 405' /tmp/headers
wget -qO /tmp/cookie-landing --header='Cookie: @Fallstack26:auth=stale' http://127.0.0.1:8080/
cmp /tmp/landing /tmp/cookie-landing
printf 'Static boundary probes passed (network disabled, cookies ignored)\n'
