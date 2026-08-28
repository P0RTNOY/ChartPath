# Native journey and SQLite evidence tools

These host-side tools support reviewable Milestone 7 and Milestone 8 native evidence. They do not
seed storage, bypass production persistence, choose a simulator, or manufacture a lifecycle state.
The journey wrapper requires one exact simulator UUID and one exact installed bundle ID. The SQLite
inspector requires exact app-container and database-directory paths and inspects a copied checkpoint.

## Run one native journey

`run-ios-maestro-flow.sh` accepts a suite-qualified flow name. Legacy bare names are also accepted,
but a suite-qualified name is clearer in evidence commands.

Milestone 7 flows:

- `m7/candidate-route-smoke`
- `m7/management-pending-relaunch`
- `m7/management-terminal-relaunch`
- `m7/quarantine-recovery`

Milestone 8 flows:

- `m8/reviewer-isolation`
- `m8/no-trade-relaunch`
- `m8/terminal-state-relaunch`
- `m8/recovery-export-privacy`
- `m8/recovery-fail-closed`

Milestone 8 native-closure top-level flows:

- `m8-native-closure/accessible-chart-pan-zoom`
- `m8-native-closure/candidate-04-no-trade-relaunch`
- `m8-native-closure/candidate-09-unfilled-expiry`
- `m8-native-closure/candidate-11-long-lifecycle`
- `m8-native-closure/candidate-12-short-gap-lifecycle`
- `m8-native-closure/recovery-export-ui`
- `m8-native-closure/recovery-import-apply`
- `m8-native-closure/recovery-import-dry-run-cancel`
- `m8-native-closure/reviewer-isolation`

Native-closure names must be suite-qualified exactly as listed. Bare aliases are not accepted.

Every automated flow requires:

- `CHARTPATH_IOS_SIMULATOR_UDID`: the exact 36-character simulator UUID. `booted` is rejected.
- `CHARTPATH_NATIVE_APP_ID`: the exact installed application bundle ID.
- `CHARTPATH_NATIVE_EVIDENCE_DIR`: an optional absolute output root. It defaults to
  `/tmp/chartpath-native-evidence`.
- Legacy M7/M8 flows use `CHARTPATH_NATIVE_ROUTE_URL` plus their documented assertion variables.

The five native-closure candidate/chart flows require only `CHARTPATH_REVIEWER_ROUTE_URL` in addition
to the common target variables. Candidate keys, test IDs, analysis decisions, paper values, and
management values are fixed inside their reviewed top-level flows and are not external runner input.
The native-closure `reviewer-isolation` flow requires exactly these three route values:

- `CHARTPATH_REVIEWER_ROUTE_URL`
- `CHARTPATH_REVIEWER_UNAUTHORIZED_ROUTE_URL`
- `CHARTPATH_SCENARIO_LIBRARY_ROUTE_URL`

The native-closure `recovery-export-ui` flow is a password-free pre-secret checkpoint. It verifies
the native route, default category privacy, explicit sensitive consent, keyboard dismissal, and that
creation stays disabled with an empty password. Supply `CHARTPATH_RECOVERY_ROUTE_URL`; the runner
never accepts or forwards a password. Password-bearing export/import work remains manual-only, as do
the two native import definitions that require a prepared encrypted file and direct password entry.
The wrapper refuses those flows before invoking Maestro so secrets cannot enter command or artifact
metadata.

Example candidate smoke against one explicitly selected simulator:

```sh
CHARTPATH_IOS_SIMULATOR_UDID=5A9AC632-0924-4BBF-ADF4-170831DC5A9E \
CHARTPATH_NATIVE_APP_ID=host.exp.Exponent \
CHARTPATH_NATIVE_ROUTE_URL='exp://192.168.1.114:8091/--/historical-scenario-qa?developer=1' \
CHARTPATH_EXPECTED_TEST_ID=scenario-qa-gate \
CHARTPATH_NATIVE_EVIDENCE_DIR=/absolute/path/to/native-evidence \
scripts/native/run-ios-maestro-flow.sh m7/candidate-route-smoke
```

Example native-closure lifecycle command:

```sh
CHARTPATH_IOS_SIMULATOR_UDID=5A9AC632-0924-4BBF-ADF4-170831DC5A9E \
CHARTPATH_NATIVE_APP_ID=org.example.ChartPath \
CHARTPATH_REVIEWER_ROUTE_URL='chartpath://historical-scenario-qa?developer=1' \
CHARTPATH_NATIVE_EVIDENCE_DIR=/absolute/path/to/native-evidence \
scripts/native/run-ios-maestro-flow.sh m8-native-closure/candidate-11-long-lifecycle
```

Legacy M7/M8 relaunch and failure-recovery flows require the operator to prepare the documented state
through application UI or reviewed test setup. Native-closure candidate flows clear their own app
state and create their lifecycle state through ordinary UI. Every relaunch flow stops and relaunches
only the supplied app ID on the exact supplied simulator UUID.

Before running a quarantine or recovery flow, prepare a disposable ChartPath simulator/container
through reviewed tooling. Never edit the primary evidence database to manufacture a recovery pass.

## Capture and inspect a SQLite checkpoint

`inspect-ios-sqlite-checkpoint.sh` is intentionally unable to discover, boot, stop, or otherwise
control a simulator or device. The operator must stop the exact ChartPath app first and independently
resolve its exact data-container path. Pass both that path and its canonical `Documents/SQLite`
directory. The inspector rejects a SQLite directory that is not inside the supplied container.

The stopped-app confirmation is a safety acknowledgement, not an app-control mechanism. Use it only
after the exact target application has stopped and its SQLite files are quiescent.

```sh
CHARTPATH_IOS_APP_DATA_CONTAINER=/exact/app/data/container \
CHARTPATH_IOS_SQLITE_DIRECTORY=/exact/app/data/container/Documents/SQLite \
CHARTPATH_NATIVE_EVIDENCE_DIR=/absolute/path/to/native-evidence \
CHARTPATH_SQLITE_CHECKPOINT_NAME=long-filled-closed \
CHARTPATH_IOS_APP_STOPPED_CONFIRMATION=I-confirm-the-exact-ChartPath-app-is-stopped \
scripts/native/inspect-ios-sqlite-checkpoint.sh
```

Each checkpoint is immutable-by-convention and must use a new name. The tool:

1. Copies `chartpath.db` and any present `chartpath.db-wal` and `chartpath.db-shm` sidecars into a
   dedicated read-only `sqlite/` directory.
2. Verifies source hashes did not change during the copy and copied hashes match the source.
3. Makes the copied files and their directory read-only, then opens only the copy with SQLite's
   read-only flag. This prevents the read connection from creating or updating WAL shared memory.
4. Checks integrity, foreign keys, WAL journal mode, the five expected migrations and checksums, the
   expected append-only/terminal immutability triggers, and JSON validity.
5. Writes `checkpoint-summary.tsv` containing only file metadata, schema evidence, table counts,
   session-status counts, event-type counts, journal-kind counts, and the repository payload schema.

The summary never selects session IDs, payload JSON, journal text, candidate identity, or exported
recovery content. The copied database can still contain private application data, so keep the whole
checkpoint under the same access controls as other native evidence and do not publish it.

The inspector is suitable for simulator containers and filesystem-visible development-device
containers only when the exact stopped container has already been resolved. It does not establish a
physical-device, VoiceOver, TalkBack, signing, backup-exclusion, or release-readiness pass.

The iOS backup gate is closed only by a generated standalone ChartPath build containing the local
`ChartPathBackupPolicy` Expo module. The SQLite adapter asks that module to set and read back
`URLResourceValues.isExcludedFromBackup` on durable `Documents/SQLite` before opening the database.
Expo Go lacks the local module and is reported as unavailable evidence; a standalone build without
the module fails closed. Android remains configured with `android:allowBackup="false"`.

## Host-only regression test

Run `scripts/native/test-native-tools.sh`. It syntax-checks both scripts, verifies every supported
flow rejects ambiguous targets, uses local stubs to verify native-closure environment forwarding and
manual-only secret handling without device access, creates a disposable WAL fixture, exercises the
checkpoint inspector, and checks that journal text is absent from its report.
