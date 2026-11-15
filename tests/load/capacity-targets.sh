#!/usr/bin/env bash
# Run the Task01-F matrix. Scaling the deployment is deliberately outside this
# script: the same command must work through the CDN and against a private copy.
set -euo pipefail

: "${E2E_BASE_URL:?Set E2E_BASE_URL to the staging/CDN URL}"
: "${STAGING_BASE_URL:?Set STAGING_BASE_URL to the same non-production URL}"
[[ ${CONFIRM_NON_PRODUCTION:-} == yes ]] || {
  echo 'Set CONFIRM_NON_PRODUCTION=yes.' >&2
  exit 2
}

k6_bin=${K6_BIN:-k6}
result_dir=${CAPACITY_RESULT_DIR:-test-results/capacity}
homepage_path=${HOMEPAGE_PATH:-/event/pt}
cells=${CAPACITY_CELLS:-"2c-homepage-80,2c-homepage-160,2c-homepage-1200,2c-heavy-200,2c-failure-boundary,2c-failure-qr,3c-homepage-80,3c-homepage-160,3c-homepage-1200,3c-heavy-200,3c-failure-boundary,3c-failure-qr"}
mkdir -p "$result_dir"

run() {
  local name=$1 scenario=$2 vus=$3
  echo "== $name: $scenario, $vus VUs =="
  local -a args=(
    run
    "--summary-export=$result_dir/$name.json"
    tests/load/event-readiness.js
    -e CONFIRM_NON_PRODUCTION=yes
    -e "E2E_BASE_URL=$E2E_BASE_URL"
    -e "STAGING_BASE_URL=$STAGING_BASE_URL"
    -e K6_PROFILE=peak
    -e "K6_SCENARIO=$scenario"
    -e "VUS=$vus"
    -e "HOMEPAGE_PATH=$homepage_path"
    -e "REQUEST_INTERVAL_SECONDS=${REQUEST_INTERVAL_SECONDS:-1}"
  )
  [[ -n ${STUDENT_COOKIES:-} ]] && args+=(-e "STUDENT_COOKIES=$STUDENT_COOKIES")
  [[ -n ${ACTION_ID:-} ]] && args+=(-e "ACTION_ID=$ACTION_ID")
  "$k6_bin" "${args[@]}"
}

IFS=, read -r -a cell_list <<< "$cells"
for cell in "${cell_list[@]}"; do
  case "$cell" in
    *-homepage-80) run "$cell" homepage 80 ;;
    *-homepage-160) run "$cell" homepage 160 ;;
    *-homepage-1200) run "$cell" homepage-target "${TARGET_PREALLOCATED_VUS:-200}" ;;
    *-heavy-200)
      : "${STUDENT_COOKIES:?Set synthetic STUDENT_COOKIES for the heavy-user run}"
      run "$cell" upload-tickets 200
      ;;
    *-failure-boundary)
      : "${STUDENT_COOKIES:?Set synthetic STUDENT_COOKIES for the boundary probe}"
      run "$cell" upload-tickets-boundary "$(awk -F, '{print NF}' <<< "$STUDENT_COOKIES")"
      ;;
    *-failure-qr)
      : "${ACTION_ID:?Set ACTION_ID for the QR failure probe}"
      run "$cell" qr 200
      ;;
    *) echo "Unknown CAPACITY_CELLS entry: $cell" >&2; exit 2 ;;
  esac
done

echo "Results (including p95/p99): $result_dir"
