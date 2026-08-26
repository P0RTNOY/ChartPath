#!/bin/sh
set -eu

FLOW_NAME=${1:-}
IOS_UDID=${CHARTPATH_IOS_SIMULATOR_UDID:-}
NATIVE_APP_ID=${CHARTPATH_NATIVE_APP_ID:-}
NATIVE_ROUTE_URL=${CHARTPATH_NATIVE_ROUTE_URL:-}
EVIDENCE_DIR=${CHARTPATH_NATIVE_EVIDENCE_DIR:-/tmp/chartpath-m7-native-evidence}
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
FLOW_DIRECTORY="$REPOSITORY_ROOT/apps/mobile/.maestro/m7"

usage() {
  printf '%s\n' \
    'Usage: run-ios-maestro-flow.sh <flow-name>' \
    'Required environment:' \
    '  CHARTPATH_IOS_SIMULATOR_UDID  exact simulator UDID; the alias booted is rejected' \
    '  CHARTPATH_NATIVE_APP_ID       host.exp.Exponent or the signed ChartPath bundle ID' \
    '  CHARTPATH_NATIVE_ROUTE_URL    exact exp:// or chartpath:// URL including pinned session' \
    'Flow-specific environment:' \
    '  candidate-route-smoke: CHARTPATH_EXPECTED_TEST_ID' \
    '  quarantine-recovery: CHARTPATH_EXPECTED_RECOVERY_TEXT and CHARTPATH_FORBIDDEN_MUTATION_TEXT'
}

case "$FLOW_NAME" in
  candidate-route-smoke|management-pending-relaunch|management-terminal-relaunch|quarantine-recovery)
    ;;
  *)
    usage >&2
    exit 64
    ;;
esac

if [ -z "$IOS_UDID" ] || [ "$IOS_UDID" = 'booted' ]; then
  printf '%s\n' 'CHARTPATH_IOS_SIMULATOR_UDID must be an exact simulator UDID, never booted.' >&2
  exit 64
fi
if [ -z "$NATIVE_APP_ID" ] || [ -z "$NATIVE_ROUTE_URL" ]; then
  usage >&2
  exit 64
fi
if [ "$FLOW_NAME" = 'candidate-route-smoke' ] && [ -z "${CHARTPATH_EXPECTED_TEST_ID:-}" ]; then
  printf '%s\n' 'CHARTPATH_EXPECTED_TEST_ID is required for candidate-route-smoke.' >&2
  exit 64
fi
if [ "$FLOW_NAME" = 'quarantine-recovery' ] &&
  { [ -z "${CHARTPATH_EXPECTED_RECOVERY_TEXT:-}" ] ||
    [ -z "${CHARTPATH_FORBIDDEN_MUTATION_TEXT:-}" ]; }; then
  printf '%s\n' 'Both quarantine text assertions are required.' >&2
  exit 64
fi

command -v xcrun >/dev/null 2>&1 || { printf '%s\n' 'xcrun is unavailable.' >&2; exit 69; }
command -v maestro >/dev/null 2>&1 || { printf '%s\n' 'Maestro is unavailable.' >&2; exit 69; }

if ! xcrun simctl list devices available | grep -Fq "($IOS_UDID)"; then
  printf 'Simulator %s is not an available exact target.\n' "$IOS_UDID" >&2
  exit 69
fi
if ! xcrun simctl get_app_container "$IOS_UDID" "$NATIVE_APP_ID" app >/dev/null 2>&1; then
  printf 'Application %s is not installed on simulator %s.\n' "$NATIVE_APP_ID" "$IOS_UDID" >&2
  exit 69
fi

mkdir -p "$EVIDENCE_DIR"

set -- maestro --no-ansi --udid "$IOS_UDID" test \
  --test-output-dir "$EVIDENCE_DIR/$FLOW_NAME" \
  -e "CHARTPATH_NATIVE_APP_ID=$NATIVE_APP_ID" \
  -e "CHARTPATH_NATIVE_ROUTE_URL=$NATIVE_ROUTE_URL"

if [ -n "${CHARTPATH_EXPECTED_TEST_ID:-}" ]; then
  set -- "$@" -e "CHARTPATH_EXPECTED_TEST_ID=$CHARTPATH_EXPECTED_TEST_ID"
fi
if [ -n "${CHARTPATH_EXPECTED_RECOVERY_TEXT:-}" ]; then
  set -- "$@" -e "CHARTPATH_EXPECTED_RECOVERY_TEXT=$CHARTPATH_EXPECTED_RECOVERY_TEXT"
fi
if [ -n "${CHARTPATH_FORBIDDEN_MUTATION_TEXT:-}" ]; then
  set -- "$@" -e "CHARTPATH_FORBIDDEN_MUTATION_TEXT=$CHARTPATH_FORBIDDEN_MUTATION_TEXT"
fi

set -- "$@" "$FLOW_DIRECTORY/$FLOW_NAME.yaml"
"$@"
