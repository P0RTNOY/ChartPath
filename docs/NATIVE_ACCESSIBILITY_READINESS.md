# Native and accessibility readiness

Updated: 2026-08-25 (Asia/Jerusalem)

This document defines the native-runtime and assistive-technology evidence required for the curated
scenario milestone. It records what is actually available in the current local environment and
keeps planned verification separate from completed results. It does not supersede the release
decision in `docs/RELEASE_READINESS.md` and does not claim app-store, physical-device, VoiceOver, or
TalkBack readiness.

## Evidence taxonomy

The following labels are intentionally not interchangeable:

| Evidence label            | What it establishes                                                                                                          | What it does not establish                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Pure/component test       | Deterministic domain behavior, validation, persistence contracts, rendered roles and labels under the test renderer          | Native layout, gestures, operating-system lifecycle, SQLite on a device, or screen-reader speech/focus                            |
| Browser E2E               | The production web export works through browser interactions and web local storage at the tested viewports                   | React Native behavior, Expo SQLite, native focus order, native gestures, VoiceOver, TalkBack, or process termination recovery     |
| Hermes export             | Expo can produce an iOS or Android JavaScript bundle and its declared assets                                                 | Installation, launch, native UI behavior, database recovery, signing, hardware behavior, or accessibility-service behavior        |
| Native smoke              | A named build/runtime launches and renders the specifically recorded route/state                                             | A complete journey, terminate/relaunch recovery, screen-reader usability, or physical-device readiness unless separately recorded |
| Native lifecycle journey  | The named runtime completes specified learner actions, is terminated, relaunches, and restores exact persisted state         | Behavior on another OS, device class, standalone build profile, or assistive technology                                           |
| Assistive-technology pass | A human records actual focus order, names, values, actions, announcements, and gesture completion with a named screen reader | The other platform's screen reader or physical-device ergonomics unless those are also tested                                     |
| Physical-device pass      | The named signed build completes the recorded matrix on named hardware and OS                                                | Other hardware, OS versions, screen readers, or distribution configuration                                                        |

Screenshots support visual inspection only. Automated accessibility properties and component tests
are valuable prerequisites, but they are not relabeled as a VoiceOver or TalkBack pass.

## Environment available for this milestone

The readiness audit found the following local capabilities:

- Xcode command-line tooling and `simctl` are installed.
- An iPhone 17 Pro simulator with iOS `26.5` is available and was booted during the audit. Its UDID
  was `5A9AC632-0924-4BBF-ADF4-170831DC5A9E`.
- Expo Go `57.0.9` (`host.exp.Exponent`) is installed in that simulator.
- A prior ChartPath Expo Go experience has a real `chartpath.db` in the simulator application
  container. The final read-only audit found `PRAGMA integrity_check=ok`, payload schema 5, native
  SQLite migrations 1 through 4 with expected checksums, 21 attempts, and zero Guided or paper
  sessions. This establishes database integrity and ledger presence only; no Milestone 5 journey
  reached the database.
- `simctl` can terminate and relaunch Expo Go, open an `exp://` URL, locate the application
  container, capture screenshots, switch light/dark appearance, enable increased contrast, and set
  the OS content size through `accessibility-extra-extra-extra-large`.
- `adb` is installed, but no Android device or emulator is connected. No usable Android emulator,
  Android SDK/AVD, or local Android runtime was found during the audit.
- Maestro `2.8.0` is installed. Its syntax check passed and it selected the intended simulator using
  alternate driver port `22088`, but the target XCTest runner never opened that socket. Detox,
  `idb`, `applesimutils`, and another usable semantic native UI driver were not available.
- A physical iPhone named `Portnoy (26.6)` appeared in the Xcode device inventory as offline. It is
  not an available physical-device target. No physical Android device is available.

Environment availability is not a test result. Exact final commands, runtime versions, device IDs,
and observed results belong in the final-evidence section below.

## Browser and native persistence boundary

ChartPath uses platform-specific persistence adapters behind the same repository contract:

- Web and production-export Playwright journeys use browser local storage.
- iOS and Android React Native runtimes use Expo SQLite.
- Expo Go on the iOS simulator exercises the native SQLite adapter. It is meaningful native
  persistence evidence, but it is still an Expo Go simulator rather than a standalone signed build
  or physical-device test.

A browser reload test cannot satisfy the native terminate/relaunch gate. Likewise, a successful iOS
or Android Hermes export cannot satisfy any runtime, SQLite, screen-reader, or gesture gate.

## Scenario identity and persistence expectations

Curated scenarios intentionally reuse immutable Guided Analysis sessions and the established
historical-session recovery path. Native verification must demonstrate the behavior that is
implemented; it must not assume a new persistence schema or claim a migration that was not needed.

The required invariants are:

1. A saved scenario session retains its exact scenario ID/version and exact historical dataset
   ID/version/checksum, together with its replay boundary and decision-time evidence.
2. Resume resolves those exact pinned values. It must not silently substitute the latest scenario,
   repair a checksum, repin a dataset, move a decision boundary, or recreate a different session.
3. A missing, retired, stale, metadata-mismatched, or checksum-mismatched dependency fails closed.
   The learner receives an explicit recovery/read-only state; no grading, reveal, execution, or
   credit is inferred from a different version.
4. Structurally corrupt stored sessions follow the existing explicit quarantine/recovery path.
   Unrelated append-only attempts, finalized sessions, and projections remain intact. Clearing all
   local data remains an explicit learner action rather than an automatic repair.
5. Finalized Guided sessions and ordinary attempts remain immutable. Retrying a finalization or
   reopening history must not duplicate a session, attempt, completion, XP, mastery, streak, review,
   or daily-activity effect.
6. A first-class no-trade decision persists and resumes as no-trade. It does not create a working
   order, position, or paper-execution session, and its debrief does not convert future price action
   into a claim that the decision was profitable or unprofitable.
7. Candidate, internal, retired, or otherwise no-credit scenarios do not mutate ordinary learning
   attempts or projections. Catalog practice state must not be presented as course credit.
8. A trade-path scenario may enter paper execution only through the exact finalized analysis that
   authorized it. The established paper session remains bound to that analysis and to its exact
   scenario/dataset identity.
9. Autosave/background flush is verified at meaningful draft boundaries. A clean reload and a
   process termination must restore the last confirmed persisted state, not merely React memory.
10. SQLite migration checksums are immutable. A final native run records the applied migration
    ledger and checksums and confirms `PRAGMA integrity_check`; it does not edit an already-applied
    migration.

Checksum and stale-data fault injection must use a disposable simulator experience or a copied test
database. The primary evidence database must never be modified directly to manufacture a pass.

## iOS simulator verification plan

This is the smallest locally realistic native lifecycle plan. The final attempt stopped before the
first checkpoint because Expo Go activation timed out, so the checkpoints remain open.

### Preparation

1. Record the exact branch, commit, Node/pnpm/Expo versions, Expo Go version, simulator model, OS,
   and UDID.
2. Start the current Metro bundle under the same stable Expo experience identity used throughout
   the run. Record the exact `exp://` URL without exposing credentials or private tokens.
3. Terminate Expo Go before inspecting or copying its database. Locate the data container with
   `xcrun simctl get_app_container booted host.exp.Exponent data`, then copy the relevant
   `ExponentExperienceData/.../SQLite/chartpath.db` to an evidence backup.
4. Record the pre-run SQLite integrity result, migration ledger/checksums, canonical repository
   payload version, and counts of attempts, Guided sessions, paper sessions, and learning
   projections. Treat prior local learner data as pre-existing state rather than milestone output.

### Lifecycle checkpoints

Run at least one deterministic trade-capable scenario and one no-trade scenario if both paths exist
in the implemented candidate set. At each applicable checkpoint, record the session identity and
visible state, terminate Expo Go with `xcrun simctl terminate booted host.exp.Exponent`, relaunch it,
open the same experience URL, and verify the exact resume:

1. Scenario selected and Guided Analysis created.
2. Partially completed rationale/analysis draft after an autosave boundary.
3. Finalized no-trade decision before opening its debrief.
4. Trade decision linked to paper execution, before any eligible fill.
5. Working order after advancing the replay.
6. Open position after a deterministic fill.
7. Terminal or ambiguous execution debrief.
8. Read-only reopen from catalog/history.

If a checkpoint is not reachable in the authored scenarios, record it as not applicable with the
authoring reason. Do not replace it with a synthetic success claim.

### SQLite readback

With Expo Go terminated after the journey, inspect the database read-only and record:

- `PRAGMA integrity_check` returns `ok`.
- The applied migration versions, names, and checksums exactly match the current source ledger.
- The canonical repository payload has the current supported version.
- The expected Guided and paper sessions exist once, with exact pinned scenario and dataset
  identity/checksum fields and the expected terminal/draft status.
- Finalized records did not change after read-only reopen.
- Event histories contain no skipped or duplicated events.
- Retried finalization/resume did not duplicate session or attempt IDs.
- The no-trade and other no-credit journeys created no paper order/position and did not change the
  append-only attempt stream or learning projections.

The final report should give counts and stable IDs/checksums where safe, while avoiding raw learner
answers or machine-specific paths that add no verification value.

## Native visual and interaction matrix

The following checks require the native UI. A browser screenshot may be retained as supporting
comparison but cannot fill these rows.

| Check                 | Required native evidence                                                                                                                                       | Current milestone status |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Hebrew RTL hierarchy  | Scenario catalog, analysis, no-trade/trade decision, recovery, and debrief screens; explicit LTR isolation for tickers, dates, prices, versions, and checksums | **NOT RUN — OPEN GATE**  |
| Phone layout          | Original-resolution iPhone simulator captures with no clipping, overlap, hidden action, or bottom-navigation obstruction                                       | **NOT RUN — OPEN GATE**  |
| Dark appearance       | Native appearance switched through the OS; contrast and non-color state cues inspected                                                                         | **NOT RUN — OPEN GATE**  |
| Largest OS text       | `accessibility-extra-extra-extra-large`; content remains reachable and actions do not truncate ambiguously                                                     | **NOT RUN — OPEN GATE**  |
| Increased contrast    | Native OS setting enabled; status, focus, chart overlays, and validation remain distinguishable without color alone                                            | **NOT RUN — OPEN GATE**  |
| Reduced motion        | Native OS or app setting used as implemented; no required information depends on animation                                                                     | **NOT RUN — OPEN GATE**  |
| Gestures and controls | Scenario selection, scrolling, replay advance, chart interaction, decision controls, recovery, and debrief tested with native controls                         | **NOT RUN — OPEN GATE**  |
| Terminate/relaunch    | Exact state restored at the applicable checkpoints above from SQLite                                                                                           | **NOT RUN — OPEN GATE**  |

## Screen-reader gates

### VoiceOver

VoiceOver remains an open gate until a human performs and records the run on iOS. At minimum, the
pass must cover:

- logical Hebrew focus order and predictable return focus after navigation or validation;
- names, roles, values, selected/disabled state, hints, and available actions for scenario cards,
  replay controls, analysis fields, trade/no-trade choices, and debrief history;
- announcements for validation errors, save/recovery state, deterministic result, and any
  fail-closed checksum/stale-data state;
- an accessible alternative for chart information and interactions without exposing future candles
  or answer-bearing evidence before the decision boundary;
- explicit, understandable reading of LTR dates, tickers, versions, quantities, prices, and checksum
  fragments inside the Hebrew interface;
- completion of no-trade and recovery paths without relying on color, spatial position, or a
  pointer-only gesture.

Simulator screenshots, accessibility labels in source, and test-renderer assertions do not establish
VoiceOver focus or speech. Record the device/runtime, screen-reader settings, exact routes, issues,
and retest result.

### TalkBack

TalkBack remains an open gate because there is no usable Android runtime in the audited environment.
It requires an Android emulator or physical device with the current native build, followed by the
same focus, speech, action, chart-alternative, mixed-direction, no-trade, recovery, and lifecycle
matrix. An Android Hermes export is not a TalkBack result.

## Physical-device and standalone-build gates

The current iOS target is Expo Go on a simulator. Before native distribution, run a release-profile
standalone build on at least one supported physical iPhone and one supported physical Android
device. Record installation, cold launch, background/foreground and OS termination, SQLite resume,
offline behavior, largest text, screen readers, gesture ergonomics, and the intended backup policy.

Signing, store submission, distribution privacy forms, iOS backup exclusion, and a wider device/OS
matrix remain separate release work. Nothing in this milestone closes those gates.

## Current final evidence status

The two build-result cells below are filled by the parent verification pass. Every native result is
recorded explicitly rather than left as an implied future pass.

| Evidence                                          | Exact result                                                                                                                                                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final branch and commit                           | `codex/curated-scenarios-native-readiness`; exact clean HEAD is reported in the milestone handoff                                                                                                                      |
| iOS/Android Hermes exports                        | **PASS AS BUNDLE EVIDENCE.** iOS: 1,894 modules, 23 assets, 25 files, 5,425,349 bytes. Android: 1,983 modules, 27 assets, 29 files, 6,598,035 bytes.                                                                   |
| iOS simulator environment                         | iPhone 17 Pro, iOS `26.5`, UDID `5A9AC632-0924-4BBF-ADF4-170831DC5A9E`, Expo Go `57.0.9`; not a completed M5 scenario journey                                                                                          |
| Native scenario smoke                             | **BLOCKED / NOT RUN.** Expo Go handled the correct `exp://127.0.0.1:8091/--/historical-scenario-qa?developer=1` URL but activation timed out with `NSPOSIXErrorDomain Code=60` before Metro received a bundle request. |
| Native trade lifecycle                            | **NOT RUN — OPEN GATE**                                                                                                                                                                                                |
| Native no-trade lifecycle                         | **NOT RUN — OPEN GATE**                                                                                                                                                                                                |
| SQLite migration/integrity readback               | **PASS WITHIN READ-ONLY SCOPE.** `integrity_check=ok`; migrations 1–4/checksums and immutability triggers present; payload schema 5, 21 attempts, zero analysis/paper sessions. No M5 lifecycle claim.                 |
| Exact identity/checksum recovery                  | **NOT RUN NATIVELY — OPEN GATE**                                                                                                                                                                                       |
| No-credit/no-duplicate verification               | **AUTOMATED COVERAGE ONLY; NATIVE BEFORE/AFTER READBACK NOT RUN**                                                                                                                                                      |
| Native visual matrix                              | **NOT RUN — OPEN GATE**                                                                                                                                                                                                |
| Largest OS text/increased contrast/reduced motion | **NOT RUN FOR M5 — OPEN GATE**                                                                                                                                                                                         |
| VoiceOver                                         | **NOT RUN — OPEN GATE**                                                                                                                                                                                                |
| Android runtime                                   | **BLOCKED LOCALLY — NO DEVICE/EMULATOR AVAILABLE**                                                                                                                                                                     |
| TalkBack                                          | **NOT RUN — OPEN GATE**                                                                                                                                                                                                |
| Physical iOS device                               | **NOT RUN — AUDITED DEVICE OFFLINE**                                                                                                                                                                                   |
| Physical Android device                           | **NOT RUN — NO DEVICE AVAILABLE**                                                                                                                                                                                      |
| Standalone signed build                           | **NOT RUN — EXPO GO SIMULATOR IS THE AVAILABLE TARGET**                                                                                                                                                                |

Maestro `2.8.0` selected the exact simulator and alternate port `22088`, but its XCTest runner never
opened the driver socket. The inspected `1206×2622` capture
`docs/screenshots/m5-native-expo-launch-timeout.png` shows only the black Expo foreground and iOS
status bar. It is blocker evidence, not ChartPath rendering or accessibility evidence. The owned
Metro process was stopped and the target simulator returned to Shutdown after the audit.

Until the open native, screen-reader, and physical-device rows have recorded passing evidence, the
existing native-distribution decision remains **NO-GO**.
