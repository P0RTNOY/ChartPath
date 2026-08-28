#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TEST_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/chartpath-native-tools.XXXXXX")

cleanup() {
  chmod -R u+w "$TEST_ROOT" 2>/dev/null || true
  rm -rf "$TEST_ROOT"
}

trap cleanup EXIT HUP INT TERM

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_contains() {
  file=$1
  expected=$2
  grep -Fq "$expected" "$file" || fail "expected $file to contain: $expected"
}

assert_not_contains() {
  file=$1
  forbidden=$2
  if grep -Fq "$forbidden" "$file"; then
    fail "expected $file not to contain: $forbidden"
  fi
}

command -v sqlite3 >/dev/null 2>&1 || fail 'sqlite3 is required'
sh -n "$SCRIPT_DIR/run-ios-maestro-flow.sh"
sh -n "$SCRIPT_DIR/inspect-ios-sqlite-checkpoint.sh"

# Every automated flow must fail validation before command discovery or any simulator/device process
# can run when given the ambiguous target selector.
for flow in \
  m7/candidate-route-smoke \
  m7/management-pending-relaunch \
  m7/management-terminal-relaunch \
  m7/quarantine-recovery \
  m8/reviewer-isolation \
  m8/no-trade-relaunch \
  m8/terminal-state-relaunch \
  m8/recovery-fail-closed \
  m8-native-closure/accessible-chart-pan-zoom \
  m8-native-closure/candidate-04-no-trade-relaunch \
  m8-native-closure/candidate-09-unfilled-expiry \
  m8-native-closure/candidate-11-long-lifecycle \
  m8-native-closure/candidate-12-short-gap-lifecycle \
  m8-native-closure/recovery-export-ui \
  m8-native-closure/reviewer-isolation
do
  flow_label=$(printf '%s' "$flow" | tr / -)
  wrapper_stderr="$TEST_ROOT/wrapper-$flow_label.stderr"
  if CHARTPATH_IOS_SIMULATOR_UDID=booted \
    CHARTPATH_NATIVE_APP_ID=org.example.ChartPath \
    CHARTPATH_NATIVE_ROUTE_URL=chartpath://test \
    "$SCRIPT_DIR/run-ios-maestro-flow.sh" "$flow" \
    >"$TEST_ROOT/wrapper-$flow_label.stdout" 2>"$wrapper_stderr"; then
    fail "the journey wrapper accepted booted for $flow"
  fi
  assert_contains "$wrapper_stderr" 'must be an exact simulator UUID, never booted'
done

if CHARTPATH_IOS_SIMULATOR_UDID=booted \
  CHARTPATH_NATIVE_APP_ID=org.example.ChartPath \
  "$SCRIPT_DIR/run-ios-maestro-flow.sh" accessible-chart-pan-zoom \
  >"$TEST_ROOT/bare-closure.stdout" 2>"$TEST_ROOT/bare-closure.stderr"; then
  fail 'the journey wrapper accepted a bare native-closure flow name'
fi
assert_contains "$TEST_ROOT/bare-closure.stderr" 'Usage: run-ios-maestro-flow.sh'

EXACT_TEST_UDID=01234567-89AB-CDEF-0123-456789ABCDEF
STUB_BIN="$TEST_ROOT/stub-bin"
MAESTRO_LOG="$TEST_ROOT/maestro-arguments.txt"
mkdir "$STUB_BIN"

cat >"$STUB_BIN/xcrun" <<'SH'
#!/bin/sh
set -eu
if [ "$*" = 'simctl list devices available' ]; then
  printf 'ChartPath test simulator (%s) (Booted)\n' "$CHARTPATH_STUB_UDID"
  exit 0
fi
if [ "$1" = simctl ] && [ "$2" = get_app_container ] &&
  [ "$3" = "$CHARTPATH_STUB_UDID" ] && [ "$5" = app ]; then
  exit 0
fi
exit 99
SH
cat >"$STUB_BIN/maestro" <<'SH'
#!/bin/sh
set -eu
: "${CHARTPATH_STUB_MAESTRO_LOG:?}"
printf '%s\n' "$@" >"$CHARTPATH_STUB_MAESTRO_LOG"
SH
chmod 0755 "$STUB_BIN/xcrun" "$STUB_BIN/maestro"

PATH="$STUB_BIN:$PATH" \
CHARTPATH_STUB_UDID="$EXACT_TEST_UDID" \
CHARTPATH_STUB_MAESTRO_LOG="$MAESTRO_LOG" \
CHARTPATH_IOS_SIMULATOR_UDID="$EXACT_TEST_UDID" \
CHARTPATH_NATIVE_APP_ID=org.example.ChartPath \
CHARTPATH_NATIVE_EVIDENCE_DIR="$TEST_ROOT/journey-evidence" \
CHARTPATH_RECOVERY_ROUTE_URL=chartpath://data-recovery \
  "$SCRIPT_DIR/run-ios-maestro-flow.sh" m8-native-closure/recovery-export-ui
assert_contains "$MAESTRO_LOG" 'CHARTPATH_RECOVERY_ROUTE_URL=chartpath://data-recovery'
assert_not_contains "$MAESTRO_LOG" CHARTPATH_RECOVERY_TEST_PASSWORD

for flow in \
  m8-native-closure/accessible-chart-pan-zoom \
  m8-native-closure/candidate-04-no-trade-relaunch \
  m8-native-closure/candidate-09-unfilled-expiry \
  m8-native-closure/candidate-11-long-lifecycle \
  m8-native-closure/candidate-12-short-gap-lifecycle
do
  PATH="$STUB_BIN:$PATH" \
  CHARTPATH_STUB_UDID="$EXACT_TEST_UDID" \
  CHARTPATH_STUB_MAESTRO_LOG="$MAESTRO_LOG" \
  CHARTPATH_IOS_SIMULATOR_UDID="$EXACT_TEST_UDID" \
  CHARTPATH_NATIVE_APP_ID=org.example.ChartPath \
  CHARTPATH_NATIVE_EVIDENCE_DIR="$TEST_ROOT/journey-evidence" \
  CHARTPATH_REVIEWER_ROUTE_URL='chartpath://historical-scenario-qa?developer=1' \
  CHARTPATH_EXPECTED_TEST_ID=must-not-leak-from-an-older-suite \
    "$SCRIPT_DIR/run-ios-maestro-flow.sh" "$flow"
  assert_contains "$MAESTRO_LOG" "$EXACT_TEST_UDID"
  assert_contains "$MAESTRO_LOG" 'CHARTPATH_NATIVE_APP_ID=org.example.ChartPath'
  assert_contains "$MAESTRO_LOG" 'CHARTPATH_REVIEWER_ROUTE_URL=chartpath://historical-scenario-qa?developer=1'
  assert_contains "$MAESTRO_LOG" "m8-native-closure/${flow#*/}.yaml"
  assert_not_contains "$MAESTRO_LOG" CHARTPATH_EXPECTED_TEST_ID
  assert_not_contains "$MAESTRO_LOG" CHARTPATH_NATIVE_ROUTE_URL
  assert_not_contains "$MAESTRO_LOG" CHARTPATH_REVIEWER_UNAUTHORIZED_ROUTE_URL
  assert_not_contains "$MAESTRO_LOG" CHARTPATH_SCENARIO_LIBRARY_ROUTE_URL
done

PATH="$STUB_BIN:$PATH" \
CHARTPATH_STUB_UDID="$EXACT_TEST_UDID" \
CHARTPATH_STUB_MAESTRO_LOG="$MAESTRO_LOG" \
CHARTPATH_IOS_SIMULATOR_UDID="$EXACT_TEST_UDID" \
CHARTPATH_NATIVE_APP_ID=org.example.ChartPath \
CHARTPATH_NATIVE_EVIDENCE_DIR="$TEST_ROOT/journey-evidence" \
CHARTPATH_REVIEWER_ROUTE_URL='chartpath://historical-scenario-qa?developer=1' \
CHARTPATH_REVIEWER_UNAUTHORIZED_ROUTE_URL=chartpath://historical-scenario-qa \
CHARTPATH_SCENARIO_LIBRARY_ROUTE_URL=chartpath://historical-scenarios \
  "$SCRIPT_DIR/run-ios-maestro-flow.sh" \
  m8-native-closure/reviewer-isolation
assert_contains "$MAESTRO_LOG" 'CHARTPATH_REVIEWER_ROUTE_URL=chartpath://historical-scenario-qa?developer=1'
assert_contains "$MAESTRO_LOG" 'CHARTPATH_REVIEWER_UNAUTHORIZED_ROUTE_URL=chartpath://historical-scenario-qa'
assert_contains "$MAESTRO_LOG" 'CHARTPATH_SCENARIO_LIBRARY_ROUTE_URL=chartpath://historical-scenarios'

assert_not_contains "$SCRIPT_DIR/run-ios-maestro-flow.sh" CHARTPATH_RECOVERY_TEST_PASSWORD
for flow in \
  m8/recovery-export-privacy \
  m8-native-closure/recovery-import-apply \
  m8-native-closure/recovery-import-dry-run-cancel
do
  flow_label=$(printf '%s' "$flow" | tr / -)
  rm -f "$MAESTRO_LOG"
  if CHARTPATH_RECOVERY_TEST_PASSWORD=SECRET_MUST_NOT_APPEAR \
    "$SCRIPT_DIR/run-ios-maestro-flow.sh" "$flow" \
    >"$TEST_ROOT/manual-$flow_label.stdout" 2>"$TEST_ROOT/manual-$flow_label.stderr"; then
    fail "the journey wrapper automated secret-input flow $flow"
  fi
  assert_contains "$TEST_ROOT/manual-$flow_label.stderr" 'manual-only'
  assert_not_contains "$TEST_ROOT/manual-$flow_label.stderr" SECRET_MUST_NOT_APPEAR
  assert_not_contains "$TEST_ROOT/manual-$flow_label.stdout" SECRET_MUST_NOT_APPEAR
  test ! -e "$MAESTRO_LOG" || fail "Maestro was invoked for manual-only flow $flow"
done

APP_CONTAINER="$TEST_ROOT/app-container"
SQLITE_DIRECTORY="$APP_CONTAINER/Documents/SQLite"
EVIDENCE_DIRECTORY="$TEST_ROOT/evidence"
mkdir -p "$SQLITE_DIRECTORY" "$EVIDENCE_DIRECTORY"
DATABASE="$SQLITE_DIRECTORY/chartpath.db"

sqlite3 "$DATABASE" >/dev/null <<'SQL'
PRAGMA journal_mode = WAL;
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL
);
CREATE TABLE repository_state (
  singleton_id INTEGER PRIMARY KEY,
  payload_json TEXT NOT NULL
);
CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL
);
CREATE TABLE analysis_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE TABLE paper_execution_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE TABLE position_management_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE TABLE management_journal_entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

INSERT INTO schema_migrations VALUES
  (1, 'create_local_learning_store', 'sha256:b71ddc422c78200f5b15b416aee6f07595fef159ae4cb0d80740f50c2fa3902d'),
  (2, 'create_guided_analysis_sessions', 'sha256:5a5c057716114c61e925393653a1d11fb9ed4d3a1d50ce14434f06720b00836b'),
  (3, 'pin_historical_analysis_session_evidence', 'sha256:da1ca5901e6cc9574c0366c258b6f1dc55895bd482b83439765c820b35ed8fe4'),
  (4, 'create_paper_execution_sessions', 'sha256:69b340db961bc3b8e26e8e70544ae5dbe62cb5f0b9e72a9f83ab6ea715e64016'),
  (5, 'create_position_management_and_journal', 'sha256:ddfdc6589ba3ea48862156293c60bb904a3a781fd4c3a73400a193fd1d25eb8a');

INSERT INTO repository_state VALUES (1, '{"metadata":{"schemaVersion":6}}');
INSERT INTO attempts VALUES ('attempt-private-id', '{"result":"private-attempt-payload"}');
INSERT INTO analysis_sessions VALUES ('analysis-private-id', 'completed', '{"private":"analysis-payload"}');
INSERT INTO paper_execution_sessions VALUES
  ('paper-long-private-id', 'closed', '{"events":[{"type":"order-filled"},{"type":"position-closed-target"}],"private":"long-payload"}'),
  ('paper-short-private-id', 'unfilled', '{"events":[{"type":"order-expired"}],"private":"short-payload"}'),
  ('paper-wait-private-id', 'no-trade', '{"events":[{"type":"no-trade-recorded"}],"private":"wait-payload"}');
INSERT INTO position_management_sessions VALUES
  ('management-private-id', 'completed', '{"events":[{"type":"management-action-submitted"},{"type":"position-closed"}],"private":"management-payload"}');
INSERT INTO management_journal_entries VALUES
  ('journal-private-id', 'review', '{"text":"SECRET_JOURNAL_TEXT","candidateIdentity":"SECRET_CANDIDATE"}');

CREATE TRIGGER analysis_sessions_reject_delete BEFORE DELETE ON analysis_sessions BEGIN SELECT RAISE(ABORT, 'immutable'); END;
CREATE TRIGGER analysis_sessions_reject_finalized_update BEFORE UPDATE ON analysis_sessions BEGIN SELECT RAISE(ABORT, 'immutable'); END;
CREATE TRIGGER attempts_reject_delete BEFORE DELETE ON attempts BEGIN SELECT RAISE(ABORT, 'immutable'); END;
CREATE TRIGGER attempts_reject_update BEFORE UPDATE ON attempts BEGIN SELECT RAISE(ABORT, 'immutable'); END;
CREATE TRIGGER management_journal_entries_reject_delete BEFORE DELETE ON management_journal_entries BEGIN SELECT RAISE(ABORT, 'immutable'); END;
CREATE TRIGGER management_journal_entries_reject_update BEFORE UPDATE ON management_journal_entries BEGIN SELECT RAISE(ABORT, 'immutable'); END;
CREATE TRIGGER paper_execution_sessions_reject_delete BEFORE DELETE ON paper_execution_sessions BEGIN SELECT RAISE(ABORT, 'immutable'); END;
CREATE TRIGGER paper_execution_sessions_reject_terminal_update BEFORE UPDATE ON paper_execution_sessions BEGIN SELECT RAISE(ABORT, 'immutable'); END;
CREATE TRIGGER position_management_sessions_reject_delete BEFORE DELETE ON position_management_sessions BEGIN SELECT RAISE(ABORT, 'immutable'); END;
CREATE TRIGGER position_management_sessions_reject_terminal_update BEFORE UPDATE ON position_management_sessions BEGIN SELECT RAISE(ABORT, 'immutable'); END;
SQL

INSPECTOR_OUTPUT="$TEST_ROOT/inspector.stdout"
CHARTPATH_IOS_APP_DATA_CONTAINER="$APP_CONTAINER" \
CHARTPATH_IOS_SQLITE_DIRECTORY="$SQLITE_DIRECTORY" \
CHARTPATH_NATIVE_EVIDENCE_DIR="$EVIDENCE_DIRECTORY" \
CHARTPATH_SQLITE_CHECKPOINT_NAME=fixture-checkpoint \
CHARTPATH_IOS_APP_STOPPED_CONFIRMATION=I-confirm-the-exact-ChartPath-app-is-stopped \
  "$SCRIPT_DIR/inspect-ios-sqlite-checkpoint.sh" >"$INSPECTOR_OUTPUT"

SUMMARY="$EVIDENCE_DIRECTORY/fixture-checkpoint/checkpoint-summary.tsv"
test -f "$SUMMARY" || fail 'the checkpoint summary was not created'
assert_contains "$SUMMARY" "check$(printf '\t')integrity_check$(printf '\t')ok"
assert_contains "$SUMMARY" "check$(printf '\t')foreign_key_violations$(printf '\t')0"
assert_contains "$SUMMARY" "check$(printf '\t')journal_mode$(printf '\t')wal"
assert_contains "$SUMMARY" "table_count$(printf '\t')paper_execution_sessions$(printf '\t')3"
assert_contains "$SUMMARY" "paper_status$(printf '\t')closed$(printf '\t')1"
assert_contains "$SUMMARY" "paper_status$(printf '\t')no-trade$(printf '\t')1"
assert_contains "$SUMMARY" "paper_status$(printf '\t')unfilled$(printf '\t')1"
assert_contains "$SUMMARY" "paper_event_type$(printf '\t')order-filled$(printf '\t')1"
assert_contains "$SUMMARY" "management_event_type$(printf '\t')management-action-submitted$(printf '\t')1"
assert_contains "$SUMMARY" "journal_kind$(printf '\t')review$(printf '\t')1"
assert_not_contains "$SUMMARY" SECRET_JOURNAL_TEXT
assert_not_contains "$SUMMARY" SECRET_CANDIDATE
assert_not_contains "$SUMMARY" private-id
assert_not_contains "$INSPECTOR_OUTPUT" SECRET_JOURNAL_TEXT
assert_not_contains "$INSPECTOR_OUTPUT" SECRET_CANDIDATE

mkdir -p "$APP_CONTAINER/not-the-sqlite-directory"
if CHARTPATH_IOS_APP_DATA_CONTAINER="$APP_CONTAINER" \
  CHARTPATH_IOS_SQLITE_DIRECTORY="$APP_CONTAINER/not-the-sqlite-directory" \
  CHARTPATH_NATIVE_EVIDENCE_DIR="$EVIDENCE_DIRECTORY" \
  CHARTPATH_SQLITE_CHECKPOINT_NAME=wrong-directory \
  CHARTPATH_IOS_APP_STOPPED_CONFIRMATION=I-confirm-the-exact-ChartPath-app-is-stopped \
  "$SCRIPT_DIR/inspect-ios-sqlite-checkpoint.sh" \
  >"$TEST_ROOT/mismatch.stdout" 2>"$TEST_ROOT/mismatch.stderr"; then
  fail 'the inspector accepted a SQLite directory outside Documents/SQLite'
fi
assert_contains "$TEST_ROOT/mismatch.stderr" 'is not the exact Documents/SQLite directory'

printf '%s\n' 'native tool host tests passed'
