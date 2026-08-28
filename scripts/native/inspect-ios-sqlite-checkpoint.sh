#!/bin/sh
set -eu

APP_DATA_CONTAINER=${CHARTPATH_IOS_APP_DATA_CONTAINER:-}
SQLITE_DIRECTORY=${CHARTPATH_IOS_SQLITE_DIRECTORY:-}
EVIDENCE_ROOT=${CHARTPATH_NATIVE_EVIDENCE_DIR:-}
CHECKPOINT_NAME=${CHARTPATH_SQLITE_CHECKPOINT_NAME:-}
STOPPED_CONFIRMATION=${CHARTPATH_IOS_APP_STOPPED_CONFIRMATION:-}
DATABASE_NAME=${CHARTPATH_SQLITE_DATABASE_NAME:-chartpath.db}

usage() {
  printf '%s\n' \
    'Usage: inspect-ios-sqlite-checkpoint.sh' \
    'Required environment:' \
    '  CHARTPATH_IOS_APP_DATA_CONTAINER          exact absolute ChartPath app data container' \
    '  CHARTPATH_IOS_SQLITE_DIRECTORY            exact absolute <container>/Documents/SQLite' \
    '  CHARTPATH_NATIVE_EVIDENCE_DIR             exact absolute evidence root' \
    '  CHARTPATH_SQLITE_CHECKPOINT_NAME          unique [A-Za-z0-9._-] checkpoint name' \
    '  CHARTPATH_IOS_APP_STOPPED_CONFIRMATION    I-confirm-the-exact-ChartPath-app-is-stopped' \
    'Optional environment:' \
    '  CHARTPATH_SQLITE_DATABASE_NAME            defaults to chartpath.db' \
    '' \
    'This tool never calls simctl or devicectl. Stop the exact app first, resolve the exact' \
    'container separately, and pass both paths explicitly. It inspects only a copied checkpoint.'
}

canonical_directory() {
  input_path=$1
  label=$2
  case "$input_path" in
    /*) ;;
    *)
      printf '%s must be an absolute path.\n' "$label" >&2
      exit 64
      ;;
  esac
  if [ ! -d "$input_path" ]; then
    printf '%s does not exist or is not a directory.\n' "$label" >&2
    exit 66
  fi
  (CDPATH= cd -- "$input_path" && pwd -P)
}

if [ -z "$APP_DATA_CONTAINER" ] || [ -z "$SQLITE_DIRECTORY" ] ||
  [ -z "$EVIDENCE_ROOT" ] || [ -z "$CHECKPOINT_NAME" ]; then
  usage >&2
  exit 64
fi
if [ "$STOPPED_CONFIRMATION" != 'I-confirm-the-exact-ChartPath-app-is-stopped' ]; then
  printf '%s\n' 'Explicit app-stopped confirmation is required before copying SQLite/WAL/SHM.' >&2
  exit 64
fi
case "$CHECKPOINT_NAME" in
  *[!A-Za-z0-9._-]*|'')
    printf '%s\n' 'CHARTPATH_SQLITE_CHECKPOINT_NAME contains invalid characters.' >&2
    exit 64
    ;;
esac
case "$DATABASE_NAME" in
  *[!A-Za-z0-9._-]*|'')
    printf '%s\n' 'CHARTPATH_SQLITE_DATABASE_NAME contains invalid characters.' >&2
    exit 64
    ;;
esac

command -v sqlite3 >/dev/null 2>&1 || { printf '%s\n' 'sqlite3 is unavailable.' >&2; exit 69; }
command -v shasum >/dev/null 2>&1 || { printf '%s\n' 'shasum is unavailable.' >&2; exit 69; }
command -v od >/dev/null 2>&1 || { printf '%s\n' 'od is unavailable.' >&2; exit 69; }

CANONICAL_CONTAINER=$(canonical_directory "$APP_DATA_CONTAINER" CHARTPATH_IOS_APP_DATA_CONTAINER)
CANONICAL_SQLITE=$(canonical_directory "$SQLITE_DIRECTORY" CHARTPATH_IOS_SQLITE_DIRECTORY)
EXPECTED_SQLITE=$(canonical_directory "$CANONICAL_CONTAINER/Documents/SQLite" expected-SQLite-directory)
if [ "$CANONICAL_SQLITE" != "$EXPECTED_SQLITE" ]; then
  printf '%s\n' 'The SQLite directory is not the exact Documents/SQLite directory of the supplied app container.' >&2
  exit 64
fi

case "$EVIDENCE_ROOT" in
  /*) ;;
  *)
    printf '%s\n' 'CHARTPATH_NATIVE_EVIDENCE_DIR must be absolute.' >&2
    exit 64
    ;;
esac
mkdir -p "$EVIDENCE_ROOT"
CANONICAL_EVIDENCE=$(canonical_directory "$EVIDENCE_ROOT" CHARTPATH_NATIVE_EVIDENCE_DIR)
if [ "$CANONICAL_EVIDENCE" = / ]; then
  printf '%s\n' 'CHARTPATH_NATIVE_EVIDENCE_DIR must not be the filesystem root.' >&2
  exit 64
fi
case "$CANONICAL_EVIDENCE/" in
  "$CANONICAL_CONTAINER/"*|"$CANONICAL_SQLITE/"*)
    printf '%s\n' 'Evidence output must be outside the application data container.' >&2
    exit 64
    ;;
esac

SOURCE_DATABASE="$CANONICAL_SQLITE/$DATABASE_NAME"
if [ ! -f "$SOURCE_DATABASE" ] || [ -L "$SOURCE_DATABASE" ]; then
  printf '%s\n' 'The exact SQLite database is missing or is a symbolic link.' >&2
  exit 66
fi

CHECKPOINT_DIRECTORY="$CANONICAL_EVIDENCE/$CHECKPOINT_NAME"
if [ -e "$CHECKPOINT_DIRECTORY" ]; then
  printf '%s\n' 'The checkpoint target already exists; choose a unique name.' >&2
  exit 73
fi
mkdir "$CHECKPOINT_DIRECTORY"
DATABASE_DIRECTORY="$CHECKPOINT_DIRECTORY/sqlite"
mkdir "$DATABASE_DIRECTORY"

source_manifest() {
  for suffix in '' '-wal' '-shm'; do
    source_file="$SOURCE_DATABASE$suffix"
    if [ -e "$source_file" ]; then
      if [ ! -f "$source_file" ] || [ -L "$source_file" ]; then
        printf 'unsafe\t%s\n' "$DATABASE_NAME$suffix"
        continue
      fi
      file_hash=$(shasum -a 256 "$source_file" | awk '{print $1}')
      file_size=$(wc -c < "$source_file" | tr -d ' ')
      printf 'present\t%s\t%s\t%s\n' "$DATABASE_NAME$suffix" "$file_size" "$file_hash"
    else
      printf 'absent\t%s\n' "$DATABASE_NAME$suffix"
    fi
  done
}

SOURCE_MANIFEST_BEFORE=$(source_manifest)
if printf '%s\n' "$SOURCE_MANIFEST_BEFORE" | grep -q '^unsafe'; then
  printf '%s\n' 'A SQLite sidecar is not a regular file or is a symbolic link.' >&2
  exit 66
fi

for suffix in '' '-wal' '-shm'; do
  source_file="$SOURCE_DATABASE$suffix"
  if [ -f "$source_file" ]; then
    cp -p "$source_file" "$DATABASE_DIRECTORY/$DATABASE_NAME$suffix"
  fi
done

SOURCE_MANIFEST_AFTER=$(source_manifest)
if [ "$SOURCE_MANIFEST_BEFORE" != "$SOURCE_MANIFEST_AFTER" ]; then
  printf '%s\n' 'SQLite files changed while being copied; the checkpoint is not consistent.' >&2
  exit 75
fi

COPIED_DATABASE="$DATABASE_DIRECTORY/$DATABASE_NAME"
COPIED_MANIFEST=$(
  for suffix in '' '-wal' '-shm'; do
    copied_file="$COPIED_DATABASE$suffix"
    if [ -f "$copied_file" ]; then
      copied_hash=$(shasum -a 256 "$copied_file" | awk '{print $1}')
      copied_size=$(wc -c < "$copied_file" | tr -d ' ')
      printf 'present\t%s\t%s\t%s\n' "$DATABASE_NAME$suffix" "$copied_size" "$copied_hash"
    else
      printf 'absent\t%s\n' "$DATABASE_NAME$suffix"
    fi
  done
)
if [ "$SOURCE_MANIFEST_BEFORE" != "$COPIED_MANIFEST" ]; then
  printf '%s\n' 'The copied SQLite checkpoint does not match the stopped source files.' >&2
  exit 74
fi

# SQLite read-only connections may still coordinate through a WAL shared-memory file when their
# directory is writable. Lock both the copied files and their dedicated directory before opening
# the checkpoint so inspection cannot create or update any database sidecar.
chmod 0444 "$COPIED_DATABASE"
for suffix in '-wal' '-shm'; do
  if [ -f "$COPIED_DATABASE$suffix" ]; then chmod 0444 "$COPIED_DATABASE$suffix"; fi
done
chmod 0555 "$DATABASE_DIRECTORY"

# Opening a WAL-header database whose stopped-app checkpoint has no sidecars can require SQLite to
# create coordination files even for a read-only connection. Keep the evidence copy byte-locked,
# validate its WAL header directly, and normalize a separate disposable working copy before
# querying. SQLite may write only inside that disposable directory; evidence hashes stay stable.
HEADER_MODES=$(od -An -t u1 -j 18 -N 2 "$COPIED_DATABASE" | awk '{$1=$1; print}')
if [ "$HEADER_MODES" != '2 2' ]; then
  printf 'SQLite header modes are %s, expected WAL read/write versions 2 2.\n' "$HEADER_MODES" >&2
  exit 65
fi
INSPECTION_DIRECTORY=$(mktemp -d "${TMPDIR:-/tmp}/chartpath-sqlite-inspection.XXXXXX")
cleanup_inspection() {
  chmod -R u+w "$INSPECTION_DIRECTORY" 2>/dev/null || true
  rm -rf "$INSPECTION_DIRECTORY"
}
trap cleanup_inspection EXIT HUP INT TERM
INSPECTION_DATABASE="$INSPECTION_DIRECTORY/$DATABASE_NAME"
for suffix in '' '-wal' '-shm'; do
  copied_file="$COPIED_DATABASE$suffix"
  if [ -f "$copied_file" ]; then cp "$copied_file" "$INSPECTION_DATABASE$suffix"; fi
done
chmod -R u+w "$INSPECTION_DIRECTORY"
NORMALIZED_MODE=$(sqlite3 -batch -noheader "$INSPECTION_DATABASE" 'PRAGMA journal_mode=DELETE;')
if [ "$NORMALIZED_MODE" != 'delete' ]; then
  printf 'The disposable SQLite inspection copy did not normalize from WAL mode: %s.\n' "$NORMALIZED_MODE" >&2
  exit 65
fi

sqlite_query() {
  sqlite3 -batch -noheader -separator "$(printf '\t')" "$INSPECTION_DATABASE" "$1"
}

INTEGRITY_RESULT=$(sqlite_query 'PRAGMA integrity_check;')
if [ "$INTEGRITY_RESULT" != 'ok' ]; then
  printf '%s\n' 'SQLite integrity_check did not return ok.' >&2
  exit 65
fi
FOREIGN_KEY_VIOLATIONS=$(sqlite_query 'SELECT COUNT(*) FROM pragma_foreign_key_check;')
if [ "$FOREIGN_KEY_VIOLATIONS" != '0' ]; then
  printf 'SQLite foreign_key_check found %s violations.\n' "$FOREIGN_KEY_VIOLATIONS" >&2
  exit 65
fi
JOURNAL_MODE=wal

EXPECTED_TABLES='analysis_sessions
attempts
management_journal_entries
paper_execution_sessions
position_management_sessions
repository_state
schema_migrations'
ACTUAL_TABLES=$(sqlite_query "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('analysis_sessions','attempts','management_journal_entries','paper_execution_sessions','position_management_sessions','repository_state','schema_migrations') ORDER BY name;")
if [ "$ACTUAL_TABLES" != "$EXPECTED_TABLES" ]; then
  printf '%s\n' 'The SQLite checkpoint is missing one or more required tables.' >&2
  exit 65
fi

EXPECTED_MIGRATIONS='1\tcreate_local_learning_store\tsha256:b71ddc422c78200f5b15b416aee6f07595fef159ae4cb0d80740f50c2fa3902d
2\tcreate_guided_analysis_sessions\tsha256:5a5c057716114c61e925393653a1d11fb9ed4d3a1d50ce14434f06720b00836b
3\tpin_historical_analysis_session_evidence\tsha256:da1ca5901e6cc9574c0366c258b6f1dc55895bd482b83439765c820b35ed8fe4
4\tcreate_paper_execution_sessions\tsha256:69b340db961bc3b8e26e8e70544ae5dbe62cb5f0b9e72a9f83ab6ea715e64016
5\tcreate_position_management_and_journal\tsha256:ddfdc6589ba3ea48862156293c60bb904a3a781fd4c3a73400a193fd1d25eb8a'
ACTUAL_MIGRATIONS=$(sqlite_query 'SELECT version, name, checksum FROM schema_migrations ORDER BY version;')
if [ "$ACTUAL_MIGRATIONS" != "$(printf '%b' "$EXPECTED_MIGRATIONS")" ]; then
  printf '%s\n' 'The SQLite migration ledger or checksum set is not the expected ChartPath v5 ledger.' >&2
  exit 65
fi

EXPECTED_TRIGGERS='analysis_sessions_reject_delete
analysis_sessions_reject_finalized_update
attempts_reject_delete
attempts_reject_update
management_journal_entries_reject_delete
management_journal_entries_reject_update
paper_execution_sessions_reject_delete
paper_execution_sessions_reject_terminal_update
position_management_sessions_reject_delete
position_management_sessions_reject_terminal_update'
ACTUAL_TRIGGERS=$(sqlite_query "SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name;")
if [ "$ACTUAL_TRIGGERS" != "$EXPECTED_TRIGGERS" ]; then
  printf '%s\n' 'The SQLite immutability trigger set is incomplete or unexpected.' >&2
  exit 65
fi

INVALID_JSON_COUNT=$(sqlite_query "SELECT
  (SELECT COUNT(*) FROM repository_state WHERE NOT json_valid(payload_json)) +
  (SELECT COUNT(*) FROM attempts WHERE NOT json_valid(payload_json)) +
  (SELECT COUNT(*) FROM analysis_sessions WHERE NOT json_valid(payload_json)) +
  (SELECT COUNT(*) FROM paper_execution_sessions WHERE NOT json_valid(payload_json)) +
  (SELECT COUNT(*) FROM position_management_sessions WHERE NOT json_valid(payload_json)) +
  (SELECT COUNT(*) FROM management_journal_entries WHERE NOT json_valid(payload_json));")
if [ "$INVALID_JSON_COUNT" != '0' ]; then
  printf 'The SQLite checkpoint contains %s invalid JSON payloads.\n' "$INVALID_JSON_COUNT" >&2
  exit 65
fi

sanitize_expression() {
  printf "replace(replace(replace(%s, char(9), ' '), char(10), ' '), char(13), ' ')" "$1"
}
SAFE_STATUS=$(sanitize_expression status)
SAFE_EVENT_TYPE=$(sanitize_expression "json_extract(event.value, '\$.type')")
SAFE_KIND=$(sanitize_expression kind)

SUMMARY_FILE="$CHECKPOINT_DIRECTORY/checkpoint-summary.tsv"
{
  printf 'check\tintegrity_check\t%s\n' "$INTEGRITY_RESULT"
  printf 'check\tforeign_key_violations\t%s\n' "$FOREIGN_KEY_VIOLATIONS"
  printf 'check\tjournal_mode\t%s\n' "$JOURNAL_MODE"
  printf '%s\n' "$COPIED_MANIFEST" | while IFS="$(printf '\t')" read -r state file size hash; do
    if [ "$state" = present ]; then
      printf 'file\t%s\tpresent\t%s\tsha256:%s\n' "$file" "$size" "$hash"
    else
      printf 'file\t%s\tabsent\n' "$file"
    fi
  done
  sqlite_query "SELECT 'migration', version, name, checksum FROM schema_migrations ORDER BY version;"
  sqlite_query "SELECT 'trigger', name FROM sqlite_master WHERE type='trigger' ORDER BY name;"
  sqlite_query "SELECT 'table_count', 'repository_state', COUNT(*) FROM repository_state
    UNION ALL SELECT 'table_count', 'attempts', COUNT(*) FROM attempts
    UNION ALL SELECT 'table_count', 'analysis_sessions', COUNT(*) FROM analysis_sessions
    UNION ALL SELECT 'table_count', 'paper_execution_sessions', COUNT(*) FROM paper_execution_sessions
    UNION ALL SELECT 'table_count', 'position_management_sessions', COUNT(*) FROM position_management_sessions
    UNION ALL SELECT 'table_count', 'management_journal_entries', COUNT(*) FROM management_journal_entries;"
  sqlite_query "SELECT 'analysis_status', $SAFE_STATUS, COUNT(*) FROM analysis_sessions GROUP BY status ORDER BY status;"
  sqlite_query "SELECT 'paper_status', $SAFE_STATUS, COUNT(*) FROM paper_execution_sessions GROUP BY status ORDER BY status;"
  sqlite_query "SELECT 'management_status', $SAFE_STATUS, COUNT(*) FROM position_management_sessions GROUP BY status ORDER BY status;"
  sqlite_query "SELECT 'paper_event_type', $SAFE_EVENT_TYPE, COUNT(*) FROM paper_execution_sessions, json_each(paper_execution_sessions.payload_json, '\$.events') AS event GROUP BY json_extract(event.value, '\$.type') ORDER BY json_extract(event.value, '\$.type');"
  sqlite_query "SELECT 'management_event_type', $SAFE_EVENT_TYPE, COUNT(*) FROM position_management_sessions, json_each(position_management_sessions.payload_json, '\$.events') AS event GROUP BY json_extract(event.value, '\$.type') ORDER BY json_extract(event.value, '\$.type');"
  sqlite_query "SELECT 'journal_kind', $SAFE_KIND, COUNT(*) FROM management_journal_entries GROUP BY kind ORDER BY kind;"
  sqlite_query "SELECT 'payload_schema', COALESCE(json_extract(payload_json, '\$.metadata.schemaVersion'), json_extract(payload_json, '\$.schemaVersion')) FROM repository_state WHERE singleton_id = 1;"
} > "$SUMMARY_FILE"

COPIED_MANIFEST_AFTER=$(
  for suffix in '' '-wal' '-shm'; do
    copied_file="$COPIED_DATABASE$suffix"
    if [ -f "$copied_file" ]; then
      copied_hash=$(shasum -a 256 "$copied_file" | awk '{print $1}')
      copied_size=$(wc -c < "$copied_file" | tr -d ' ')
      printf 'present\t%s\t%s\t%s\n' "$DATABASE_NAME$suffix" "$copied_size" "$copied_hash"
    else
      printf 'absent\t%s\n' "$DATABASE_NAME$suffix"
    fi
  done
)
if [ "$COPIED_MANIFEST" != "$COPIED_MANIFEST_AFTER" ]; then
  printf '%s\n' 'Read-only inspection unexpectedly changed the copied SQLite files.' >&2
  exit 74
fi

chmod 0444 "$SUMMARY_FILE"
chmod 0555 "$CHECKPOINT_DIRECTORY"

SUMMARY_HASH=$(shasum -a 256 "$SUMMARY_FILE" | awk '{print $1}')
printf 'checkpoint\t%s\n' "$CHECKPOINT_NAME"
printf 'summary_sha256\t%s\n' "$SUMMARY_HASH"
sed -n '1,240p' "$SUMMARY_FILE"
