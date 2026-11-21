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

case ${CAPACITY_COPIES:-} in
  2|3) ;;
  *) echo 'Set CAPACITY_COPIES=2 or 3 after verifying the deployment.' >&2; exit 2 ;;
esac

case ${CAPACITY_CANARY:-yes} in
  yes|no) ;;
  *) echo 'Set CAPACITY_CANARY=yes or no.' >&2; exit 2 ;;
esac

k6_bin=${K6_BIN:-k6}
result_dir=${CAPACITY_RESULT_DIR:-test-results/capacity}
homepage_path=${HOMEPAGE_PATH:-/event/pt}
cells=${CAPACITY_CELLS:-"${CAPACITY_COPIES}c-homepage-80,${CAPACITY_COPIES}c-homepage-160,${CAPACITY_COPIES}c-homepage-200,${CAPACITY_COPIES}c-homepage-1200"}
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
  # Session values stay in the inherited environment, never process arguments.
  "$k6_bin" "${args[@]}"
}

IFS=, read -r -a cell_list <<< "$cells"
session_count=
validate_sessions() {
  if [[ -z $session_count ]]; then
    if ! session_count=$(awk '
      BEGIN { RS = "," }
      {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "")
        if ($0 != "") {
          if (seen[$0]++) duplicate = 1
          count++
        }
      }
      END { if (duplicate) exit 2; print count + 0 }
    ' <<< "${STUDENT_COOKIES:-}"); then
      echo 'STUDENT_COOKIES must contain distinct student sessions.' >&2
      exit 2
    fi
  fi
  if (( session_count < $1 )); then
    echo "STUDENT_COOKIES needs at least $1 distinct student sessions for $cell." >&2
    exit 2
  fi
}

# Validate every cell before sending any traffic.
seen_cells=,
heavy_selected=no
for cell in "${cell_list[@]}"; do
  [[ $seen_cells != *",$cell,"* ]] || {
    echo "Duplicate capacity cell: $cell" >&2
    exit 2
  }
  seen_cells+="$cell,"
  case "$cell" in
    "${CAPACITY_COPIES}c-"homepage-1200) ;;
    "${CAPACITY_COPIES}c-"homepage-80|"${CAPACITY_COPIES}c-"homepage-160|"${CAPACITY_COPIES}c-"homepage-200)
      validate_sessions "$(( ${cell##*-} / 2 ))"
      ;;
    "${CAPACITY_COPIES}c-"heavy-200)
      validate_sessions 1
      heavy_selected=yes
      ;;
    "${CAPACITY_COPIES}c-"failure-boundary)
      validate_sessions 1
      ;;
    "${CAPACITY_COPIES}c-"failure-qr) : "${ACTION_ID:?Set ACTION_ID}" "${ACTION_PRESENTER_COOKIE:?Set ACTION_PRESENTER_COOKIE}" ;;
    *) echo "Unknown cell or mismatched CAPACITY_COPIES: $cell" >&2; exit 2 ;;
  esac
  [[ ! -e "$result_dir/$cell.json" ]] || {
    echo "Result already exists: $cell; choose a fresh CAPACITY_RESULT_DIR." >&2
    exit 2
  }
done

# Match event-readiness.js numeric parsing and upload budget before any k6 call.
node -e '
  const interval = Number(process.argv[1]);
  if (!Number.isFinite(interval) || interval <= 0) {
    console.error("REQUEST_INTERVAL_SECONDS must be a positive number.");
    process.exit(2);
  }
  if (process.argv[3] === "yes" && Math.ceil(200 / Number(process.argv[2])) * (60 / interval) > 5) {
    console.error("Upload-ticket load exceeds five tickets/minute per student. Add STUDENT_COOKIES or raise REQUEST_INTERVAL_SECONDS.");
    process.exit(2);
  }
' -- "${REQUEST_INTERVAL_SECONDS:-1}" "${session_count:-0}" "$heavy_selected"

# Read-only canary fails fast before the selected load, with its own summary.
if [[ ${CAPACITY_CANARY:-yes} == yes ]]; then
  TARGET_RATE=2 TARGET_DURATION=30s TARGET_VISITS=60 TARGET_PREALLOCATED_VUS=20 \
    run "canary-$(date -u +%Y%m%dT%H%M%SZ)" homepage-target 20
fi

for cell in "${cell_list[@]}"; do
  case "$cell" in
    *-homepage-80) run "$cell" homepage 80 ;;
    *-homepage-160) run "$cell" homepage 160 ;;
    *-homepage-200) run "$cell" homepage 200 ;;
    *-homepage-1200) run "$cell" homepage-target "${TARGET_PREALLOCATED_VUS:-200}" ;;
    *-heavy-200)
      : "${STUDENT_COOKIES:?Set synthetic STUDENT_COOKIES for the heavy-user run}"
      run "$cell" upload-tickets 200
      ;;
    *-failure-boundary)
      : "${STUDENT_COOKIES:?Set synthetic STUDENT_COOKIES for the boundary probe}"
      run "$cell" upload-tickets-boundary "$session_count"
      ;;
    *-failure-qr)
      : "${ACTION_ID:?Set ACTION_ID for the QR failure probe}"
      run "$cell" qr 200
      ;;
    *) echo "Unknown CAPACITY_CELLS entry: $cell" >&2; exit 2 ;;
  esac
done

echo "Results (including p95/p99): $result_dir"
