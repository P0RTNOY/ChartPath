#!/bin/sh
set -eu

REQUESTED_FLOW=${1:-}
IOS_UDID=${CHARTPATH_IOS_SIMULATOR_UDID:-}
NATIVE_APP_ID=${CHARTPATH_NATIVE_APP_ID:-}
NATIVE_ROUTE_URL=${CHARTPATH_NATIVE_ROUTE_URL:-}
REVIEWER_ROUTE_URL=${CHARTPATH_REVIEWER_ROUTE_URL:-}
REVIEWER_UNAUTHORIZED_ROUTE_URL=${CHARTPATH_REVIEWER_UNAUTHORIZED_ROUTE_URL:-}
SCENARIO_LIBRARY_ROUTE_URL=${CHARTPATH_SCENARIO_LIBRARY_ROUTE_URL:-}
RECOVERY_ROUTE_URL=${CHARTPATH_RECOVERY_ROUTE_URL:-}
EVIDENCE_DIR=${CHARTPATH_NATIVE_EVIDENCE_DIR:-/tmp/chartpath-native-evidence}
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)

usage() {
  printf '%s\n' \
    'Usage: run-ios-maestro-flow.sh <flow-name>' \
    'M7 flows:' \
    '  m7/candidate-route-smoke (legacy bare name is also accepted)' \
    '  m7/management-pending-relaunch' \
    '  m7/management-terminal-relaunch' \
    '  m7/quarantine-recovery' \
    'M8 flows:' \
    '  m8/reviewer-isolation' \
    '  m8/no-trade-relaunch' \
    '  m8/terminal-state-relaunch' \
    '  m8/recovery-export-privacy' \
    '  m8/recovery-fail-closed' \
    'M8 native-closure flows:' \
    '  m8-native-closure/accessible-chart-pan-zoom' \
    '  m8-native-closure/candidate-04-no-trade-relaunch' \
    '  m8-native-closure/candidate-09-unfilled-expiry' \
    '  m8-native-closure/candidate-11-long-lifecycle' \
    '  m8-native-closure/candidate-12-short-gap-lifecycle' \
    '  m8-native-closure/recovery-export-ui (pre-secret UI checkpoint)' \
    '  m8-native-closure/recovery-import-apply (manual-only secret input)' \
    '  m8-native-closure/recovery-import-dry-run-cancel (manual-only secret input)' \
    '  m8-native-closure/reviewer-isolation' \
    'Required environment:' \
    '  CHARTPATH_IOS_SIMULATOR_UDID  exact simulator UUID; booted is rejected' \
    '  CHARTPATH_NATIVE_APP_ID       exact installed application bundle ID' \
    '  CHARTPATH_NATIVE_EVIDENCE_DIR optional absolute evidence directory' \
    'Route and assertion variables are validated per flow; see scripts/native/README.md.'
}

FLOW_SUITE=
FLOW_NAME=
case "$REQUESTED_FLOW" in
  m7/candidate-route-smoke|candidate-route-smoke)
    FLOW_SUITE=m7
    FLOW_NAME=candidate-route-smoke
    ;;
  m7/management-pending-relaunch|management-pending-relaunch)
    FLOW_SUITE=m7
    FLOW_NAME=management-pending-relaunch
    ;;
  m7/management-terminal-relaunch|management-terminal-relaunch)
    FLOW_SUITE=m7
    FLOW_NAME=management-terminal-relaunch
    ;;
  m7/quarantine-recovery|quarantine-recovery)
    FLOW_SUITE=m7
    FLOW_NAME=quarantine-recovery
    ;;
  m8/reviewer-isolation|reviewer-isolation)
    FLOW_SUITE=m8
    FLOW_NAME=reviewer-isolation
    ;;
  m8/no-trade-relaunch|no-trade-relaunch)
    FLOW_SUITE=m8
    FLOW_NAME=no-trade-relaunch
    ;;
  m8/terminal-state-relaunch|terminal-state-relaunch)
    FLOW_SUITE=m8
    FLOW_NAME=terminal-state-relaunch
    ;;
  m8/recovery-export-privacy|recovery-export-privacy)
    FLOW_SUITE=m8
    FLOW_NAME=recovery-export-privacy
    ;;
  m8/recovery-fail-closed|recovery-fail-closed)
    FLOW_SUITE=m8
    FLOW_NAME=recovery-fail-closed
    ;;
  m8-native-closure/accessible-chart-pan-zoom)
    FLOW_SUITE=m8-native-closure
    FLOW_NAME=accessible-chart-pan-zoom
    ;;
  m8-native-closure/candidate-04-no-trade-relaunch)
    FLOW_SUITE=m8-native-closure
    FLOW_NAME=candidate-04-no-trade-relaunch
    ;;
  m8-native-closure/candidate-09-unfilled-expiry)
    FLOW_SUITE=m8-native-closure
    FLOW_NAME=candidate-09-unfilled-expiry
    ;;
  m8-native-closure/candidate-11-long-lifecycle)
    FLOW_SUITE=m8-native-closure
    FLOW_NAME=candidate-11-long-lifecycle
    ;;
  m8-native-closure/candidate-12-short-gap-lifecycle)
    FLOW_SUITE=m8-native-closure
    FLOW_NAME=candidate-12-short-gap-lifecycle
    ;;
  m8-native-closure/recovery-export-ui)
    FLOW_SUITE=m8-native-closure
    FLOW_NAME=recovery-export-ui
    ;;
  m8-native-closure/recovery-import-apply)
    FLOW_SUITE=m8-native-closure
    FLOW_NAME=recovery-import-apply
    ;;
  m8-native-closure/recovery-import-dry-run-cancel)
    FLOW_SUITE=m8-native-closure
    FLOW_NAME=recovery-import-dry-run-cancel
    ;;
  m8-native-closure/reviewer-isolation)
    FLOW_SUITE=m8-native-closure
    FLOW_NAME=reviewer-isolation
    ;;
  *)
    usage >&2
    exit 64
    ;;
esac

manual_secret_flow() {
  printf 'Flow %s is manual-only: the runner will not pass a recovery password through Maestro environment or artifact metadata.\n' "$REQUESTED_FLOW" >&2
  printf '%s\n' 'Use a reviewed secret-safe procedure with manual disposable-password entry; no password variable is accepted by this runner.' >&2
  exit 78
}

case "$FLOW_SUITE/$FLOW_NAME" in
  m8/recovery-export-privacy)
    manual_secret_flow
    ;;
  m8-native-closure/recovery-import-apply)
    manual_secret_flow
    ;;
  m8-native-closure/recovery-import-dry-run-cancel)
    manual_secret_flow
    ;;
esac

case "$IOS_UDID" in
  ''|booted)
    printf '%s\n' 'CHARTPATH_IOS_SIMULATOR_UDID must be an exact simulator UUID, never booted.' >&2
    exit 64
    ;;
  *[!0-9A-Fa-f-]*)
    printf '%s\n' 'CHARTPATH_IOS_SIMULATOR_UDID contains invalid characters.' >&2
    exit 64
    ;;
esac
if [ "${#IOS_UDID}" -ne 36 ]; then
  printf '%s\n' 'CHARTPATH_IOS_SIMULATOR_UDID must be a 36-character simulator UUID.' >&2
  exit 64
fi
case "$NATIVE_APP_ID" in
  ''|*[!A-Za-z0-9._-]*)
    printf '%s\n' 'CHARTPATH_NATIVE_APP_ID must be an explicit bundle identifier.' >&2
    exit 64
    ;;
esac
case "$EVIDENCE_DIR" in
  /*) ;;
  *)
    printf '%s\n' 'CHARTPATH_NATIVE_EVIDENCE_DIR must be absolute.' >&2
    exit 64
    ;;
esac

require_value() {
  variable_name=$1
  variable_value=$2
  if [ -z "$variable_value" ]; then
    printf '%s is required for %s/%s.\n' "$variable_name" "$FLOW_SUITE" "$FLOW_NAME" >&2
    exit 64
  fi
}

case "$FLOW_SUITE/$FLOW_NAME" in
  m8-native-closure/recovery-export-ui)
    require_value CHARTPATH_RECOVERY_ROUTE_URL "$RECOVERY_ROUTE_URL"
    ;;
  m8-native-closure/reviewer-isolation)
    require_value CHARTPATH_REVIEWER_ROUTE_URL "$REVIEWER_ROUTE_URL"
    require_value CHARTPATH_REVIEWER_UNAUTHORIZED_ROUTE_URL "$REVIEWER_UNAUTHORIZED_ROUTE_URL"
    require_value CHARTPATH_SCENARIO_LIBRARY_ROUTE_URL "$SCENARIO_LIBRARY_ROUTE_URL"
    if [ "$REVIEWER_ROUTE_URL" = "$REVIEWER_UNAUTHORIZED_ROUTE_URL" ] ||
      [ "$REVIEWER_ROUTE_URL" = "$SCENARIO_LIBRARY_ROUTE_URL" ] ||
      [ "$REVIEWER_UNAUTHORIZED_ROUTE_URL" = "$SCENARIO_LIBRARY_ROUTE_URL" ]; then
      printf '%s\n' 'Reviewer isolation requires three distinct route URLs.' >&2
      exit 64
    fi
    case "$REVIEWER_ROUTE_URL" in
      *developer=1*) ;;
      *)
        printf '%s\n' 'The authorized reviewer route must contain developer=1.' >&2
        exit 64
        ;;
    esac
    case "$REVIEWER_UNAUTHORIZED_ROUTE_URL" in
      *developer=1*)
        printf '%s\n' 'The unauthorized reviewer route must not contain developer=1.' >&2
        exit 64
        ;;
    esac
    ;;
  m8-native-closure/*)
    require_value CHARTPATH_REVIEWER_ROUTE_URL "$REVIEWER_ROUTE_URL"
    ;;
  *)
    require_value CHARTPATH_NATIVE_ROUTE_URL "$NATIVE_ROUTE_URL"
    ;;
esac

case "$FLOW_SUITE/$FLOW_NAME" in
  m7/candidate-route-smoke)
    require_value CHARTPATH_EXPECTED_TEST_ID "${CHARTPATH_EXPECTED_TEST_ID:-}"
    ;;
  m7/quarantine-recovery)
    require_value CHARTPATH_EXPECTED_RECOVERY_TEXT "${CHARTPATH_EXPECTED_RECOVERY_TEXT:-}"
    require_value CHARTPATH_FORBIDDEN_MUTATION_TEXT "${CHARTPATH_FORBIDDEN_MUTATION_TEXT:-}"
    ;;
  m8/reviewer-isolation)
    require_value CHARTPATH_REVIEWER_SELECT_TEST_ID "${CHARTPATH_REVIEWER_SELECT_TEST_ID:-}"
    require_value CHARTPATH_REVIEWER_REVEAL_TEST_ID "${CHARTPATH_REVIEWER_REVEAL_TEST_ID:-}"
    require_value CHARTPATH_EXPECTED_CANDIDATE_IDENTITY "${CHARTPATH_EXPECTED_CANDIDATE_IDENTITY:-}"
    ;;
  m8/terminal-state-relaunch)
    require_value CHARTPATH_EXPECTED_TERMINAL_TEST_ID "${CHARTPATH_EXPECTED_TERMINAL_TEST_ID:-}"
    ;;
  m8/recovery-fail-closed)
    require_value CHARTPATH_EXPECTED_RECOVERY_TEST_ID "${CHARTPATH_EXPECTED_RECOVERY_TEST_ID:-}"
    require_value CHARTPATH_FORBIDDEN_MUTATION_TEST_ID "${CHARTPATH_FORBIDDEN_MUTATION_TEST_ID:-}"
    ;;
esac

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

FLOW_DIRECTORY="$REPOSITORY_ROOT/apps/mobile/.maestro/$FLOW_SUITE"
FLOW_FILE="$FLOW_DIRECTORY/$FLOW_NAME.yaml"
if [ ! -f "$FLOW_FILE" ]; then
  printf 'Flow file is missing: %s/%s.yaml\n' "$FLOW_SUITE" "$FLOW_NAME" >&2
  exit 66
fi

mkdir -p "$EVIDENCE_DIR"

set -- maestro --no-ansi --udid "$IOS_UDID" test \
  --test-output-dir "$EVIDENCE_DIR/$FLOW_SUITE-$FLOW_NAME" \
  -e "CHARTPATH_NATIVE_APP_ID=$NATIVE_APP_ID"

if [ "$FLOW_SUITE/$FLOW_NAME" = 'm8-native-closure/recovery-export-ui' ]; then
  set -- "$@" -e "CHARTPATH_RECOVERY_ROUTE_URL=$RECOVERY_ROUTE_URL"
elif [ "$FLOW_SUITE" = 'm8-native-closure' ]; then
  set -- "$@" -e "CHARTPATH_REVIEWER_ROUTE_URL=$REVIEWER_ROUTE_URL"
  if [ "$FLOW_NAME" = reviewer-isolation ]; then
    set -- "$@" \
      -e "CHARTPATH_REVIEWER_UNAUTHORIZED_ROUTE_URL=$REVIEWER_UNAUTHORIZED_ROUTE_URL" \
      -e "CHARTPATH_SCENARIO_LIBRARY_ROUTE_URL=$SCENARIO_LIBRARY_ROUTE_URL"
  fi
else
  set -- "$@" \
    -e "CHARTPATH_NATIVE_ROUTE_URL=$NATIVE_ROUTE_URL"
fi

if [ "$FLOW_SUITE" != 'm8-native-closure' ]; then
  for variable_name in \
    CHARTPATH_EXPECTED_TEST_ID \
    CHARTPATH_EXPECTED_RECOVERY_TEXT \
    CHARTPATH_FORBIDDEN_MUTATION_TEXT \
    CHARTPATH_REVIEWER_SELECT_TEST_ID \
    CHARTPATH_REVIEWER_REVEAL_TEST_ID \
    CHARTPATH_EXPECTED_CANDIDATE_IDENTITY \
    CHARTPATH_EXPECTED_TERMINAL_TEST_ID \
    CHARTPATH_EXPECTED_RECOVERY_TEST_ID \
    CHARTPATH_FORBIDDEN_MUTATION_TEST_ID
  do
    eval "variable_value=\${$variable_name:-}"
    if [ -n "$variable_value" ]; then
      set -- "$@" -e "$variable_name=$variable_value"
    fi
  done
fi

set -- "$@" "$FLOW_FILE"
"$@"
