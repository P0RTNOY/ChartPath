# Native Milestone 7 evidence runner

These flows are bounded simulator evidence helpers. They require an exact simulator UDID, exact app
bundle ID and exact route URL. The wrapper rejects the ambiguous `booted` selector and never selects,
terminates or modifies another simulator.

The flows do not seed or corrupt storage. Before running `quarantine-recovery`, prepare a disposable
ChartPath simulator/container through reviewed test tooling and provide both the expected recovery
copy and text that must remain absent. Never edit the primary evidence database to manufacture a
quarantine pass.

Example Expo Go candidate smoke:

```sh
CHARTPATH_IOS_SIMULATOR_UDID=5A9AC632-0924-4BBF-ADF4-170831DC5A9E \
CHARTPATH_NATIVE_APP_ID=host.exp.Exponent \
CHARTPATH_NATIVE_ROUTE_URL='exp://192.168.1.114:8091/--/historical-scenario-qa?developer=1' \
CHARTPATH_EXPECTED_TEST_ID=scenario-qa-gate \
scripts/native/run-ios-maestro-flow.sh candidate-route-smoke
```

For pending or terminal restoration, pass the exact persisted `paper-execution` route and run
`management-pending-relaunch` or `management-terminal-relaunch`. Those flows stop and relaunch only
the supplied app ID on the supplied simulator, then require the same persisted state to reappear.

Evidence is written beneath `/tmp/chartpath-m7-native-evidence` by default. Override it with an
explicit `CHARTPATH_NATIVE_EVIDENCE_DIR`. A successful flow is simulator evidence only. It is not a
physical-device, VoiceOver, TalkBack, signing, backup-exclusion or release-readiness pass.

The iOS backup gate is closed only by a generated standalone ChartPath build containing the local
`ChartPathBackupPolicy` Expo module. The SQLite adapter asks that module to set and read back
`URLResourceValues.isExcludedFromBackup` on durable `Documents/SQLite` before opening the database.
Expo Go lacks the local module and is reported as unavailable evidence; a standalone build without
the module fails closed. Android remains configured with `android:allowBackup="false"`.
