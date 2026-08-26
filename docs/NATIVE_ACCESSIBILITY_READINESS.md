# Native and accessibility readiness

Updated: 2026-08-26 (Asia/Jerusalem)

This document defines the native-runtime and assistive-technology evidence required for curated
scenarios and position management. It records what is actually available in the current local environment and
keeps planned verification separate from completed results. It does not supersede the release
decision in `docs/RELEASE_READINESS.md` and does not claim app-store, physical-device, VoiceOver, or
TalkBack readiness.

This document preserves the detailed Milestone 5 and 6 readiness history. The current Milestone 7
environment, signing boundary, whole-SQLite backup-exclusion decision, exact-target commands, and
open evidence gates are recorded in `docs/NATIVE_ACCESSIBILITY_VERIFICATION.md`. Milestone 7 added a
standalone simulator build and backup-resource readback plus a signed physical-device installation;
it did not complete the standalone candidate lifecycle, physical launch, VoiceOver, Android, or
TalkBack passes. The historical Milestone 5 and 6 results below remain unchanged.

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

The Milestone 6 audit and bounded lifecycle verification found the following local capabilities:

- macOS `26.5.1` (`25F80`) on arm64, Xcode `26.6` (`17F113`), CocoaPods `1.16.2`, Expo `57.0.15`
  and `simctl` are installed. Watchman is not installed; prior Expo bundling works without it.
- The only installed simulator runtime is iOS `26.5` (`23F77`). The ChartPath iPhone 17 Pro target,
  UDID `5A9AC632-0924-4BBF-ADF4-170831DC5A9E`, was selected by exact ID for the native run.
- A different booted simulator, `Shiftty Beta Verification Clone` with UDID
  `73B7FFB2-1EC0-470C-B7E5-38D401BA4255`, was running an unrelated Maestro/XCTest journey. It must
  not be terminated, reused or targeted as `booted`. Later ChartPath automation must wait for that
  run to finish and use its exact owned UDID.
- Expo Go `57.0.9` (`host.exp.Exponent`) is installed in that simulator.
- The existing ChartPath Expo Go experience migrated its real `chartpath.db` from payload schema 5
  to schema 6 and applied native SQLite migration 5. Final readback found
  `PRAGMA integrity_check=ok`, the expected migration ledger/checksums, 21 pre-existing attempts,
  one analysis, one paper session, one management aggregate and one journal row.
- `simctl` can terminate and relaunch Expo Go, open an `exp://` URL, locate the application
  container, capture screenshots, switch light/dark appearance, enable increased contrast, and set
  the OS content size through `accessibility-extra-extra-extra-large`.
- `adb` platform-tools `37.0.0` is installed, but no Android device is connected. `emulator`,
  `avdmanager` and `sdkmanager` are unavailable; `ANDROID_HOME`/`ANDROID_SDK_ROOT` are unset and no
  local Android SDK/AVD was found. No physical Android device is available.
- Maestro `2.8.0` is installed. During the audit the unrelated Shiftty job successfully opened its
  XCTest driver on a dynamic localhost port. This establishes that the installed Maestro/XCTest
  stack can run; it does not establish a ChartPath journey.
- A paired and available physical iPhone named `Portnoy`, iPhone 15 Pro Max (`iPhone16,2`) on iOS
  `26.6` (`23G71`), is visible to `devicectl`. It is a possible later signed-build/VoiceOver target,
  not completed evidence. A physical device requires LAN Metro or a signed build, not host
  `localhost`.
- The successful run used an owned Metro LAN URL at `192.168.1.114:8091`. The app has no
  `expo-dev-client` dependency and no generated native `ios`/`android` project; Expo Go remains the
  current native route.

CoreSimulator logs from the Milestone 5 failure window show the exact ChartPath simulator repeatedly
shutting down or losing its host connection: `Unable to lookup in current state: Shutting Down`,
`Invalid connection`, and a host-support lookup after shutdown. Milestone 6 then succeeded by using
the host's LAN address rather than the prior loopback URL: Metro received the request, Expo Go loaded
the exact QA route, and SQLite transitions completed. This resolves the practical activation
blocker for the bounded run, but the retained evidence does not prove one exclusive root cause for
the earlier Code 60 failure.

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
11. Management begins only from the exact open paper handoff and exact scenario permission. Resume
    retains policy, rubric checksum, frozen original 1R, lots, fills, cutoff and pending action.
12. An action submitted at cutoff N remains pending across termination and executes exactly once on
    N+1. A stop/target replacement takes effect before N+1 threshold checks; voluntary/opening and
    same-candle stop/target conflicts remain explicitly ambiguous.
13. Journal entries retain exact order, cutoff, linked action and correction references. Relaunch
    cannot duplicate, rewrite or omit the action rationale, event, fill or processed candle.
14. Original no-trade, unfilled and unauthorized scenarios expose no management controls. All
    current management QA remains no-credit and projection-independent.

Checksum and stale-data fault injection must use a disposable simulator experience or a copied test
database. The primary evidence database must never be modified directly to manufacture a pass.

## iOS simulator verification plan and bounded result

The preparation and full target matrix below remain the reproducible plan. Milestone 6 completed a
bounded subset through one pending partial exit and its N+1 fill; it did not reach a terminal
debrief, complete the alternate management actions, or exercise assistive technology.

### Preparation

1. Wait for unrelated simulator/automation work to end. Record exact branch, commit,
   Node/pnpm/Expo/Expo Go versions, simulator model, OS and UDID. Never use the selector `booted`.
2. Start Metro first on an owned port and verify both its listening socket and `/status` response.
   Then boot only `5A9AC632-0924-4BBF-ADF4-170831DC5A9E` and wait for
   `xcrun simctl bootstatus <UDID> -b` before opening the fully quoted `exp://` URL.
3. Capture a dedicated simulator/Expo log. Probe simulator-to-Metro HTTP reachability separately
   from deep-link dispatch so a networking failure is not conflated with LaunchServices activation.
4. Terminate Expo Go before inspecting or copying its database. Locate the data container with
   `xcrun simctl get_app_container <UDID> host.exp.Exponent data`, then copy the relevant
   `ExponentExperienceData/.../SQLite/chartpath.db` to an evidence backup.
5. Record the pre-run SQLite integrity result, migration ledger/checksums, canonical repository
   payload version, and counts of attempts, Guided sessions, paper sessions, and learning
   projections. Treat prior local learner data as pre-existing state rather than milestone output.

### Lifecycle checkpoints

Run at least one deterministic trade-capable scenario and one no-trade scenario if both paths exist
in the implemented candidate set. At each applicable checkpoint, record the session identity and
visible state, terminate Expo Go with
`xcrun simctl terminate 5A9AC632-0924-4BBF-ADF4-170831DC5A9E host.exp.Exponent`, relaunch it on
that same exact UDID, open the same experience URL, and verify the exact resume:

1. Scenario selected and Guided Analysis created.
2. Partially completed rationale/analysis draft after an autosave boundary.
3. Finalized no-trade decision before opening its debrief.
4. Trade decision linked to paper execution, before any eligible fill.
5. Working order after advancing the replay.
6. Open position after a deterministic fill.
7. Terminal or ambiguous execution debrief.
8. Read-only reopen from catalog/history.
9. Open-position handoff into management with exact scenario authority and frozen original 1R.
10. Submitted management action plus automatic action-rationale journal entry at cutoff N.
11. Terminate/relaunch while the action is pending; verify the exact pending action and journal
    prefix, then advance once and verify exactly one N+1 fill/replacement/rejection.
12. Partial-exit or scale-in state with exact lots, open quantity and integer accounting; terminate
    and relaunch again before reaching terminal/ambiguous/open-at-end debrief.
13. Record an observation and a correction while active; verify append-only order and accessible
    correction linkage. Confirm a persisted terminal session is read-only.

If a checkpoint is not reachable in the authored scenarios, record it as not applicable with the
authoring reason. Do not replace it with a synthetic success claim.

### SQLite readback

With Expo Go terminated after the journey, inspect the database read-only and record:

- `PRAGMA integrity_check` returns `ok`.
- The applied migration versions, names, and checksums exactly match the current source ledger.
- The canonical repository payload has schema 6.
- SQLite migration 5 is named `create_position_management_and_journal` and has checksum
  `sha256:ddfdc6589ba3ea48862156293c60bb904a3a781fd4c3a73400a193fd1d25eb8a`.
- The expected Guided and paper sessions exist once, with exact pinned scenario and dataset
  identity/checksum fields and the expected terminal/draft status.
- Finalized records did not change after read-only reopen.
- Event histories contain no skipped or duplicated events.
- Retried finalization/resume did not duplicate session or attempt IDs.
- The no-trade and other no-credit journeys created no paper order/position and did not change the
  append-only attempt stream or learning projections.
- The expected management session and journal rows exist once; their handoff, policy, rubric,
  permissions, original 1R, cutoff, lots, fills, events and journal order match the canonical
  payload. No N+1 action or reload produced a duplicate.

The final report should give counts and stable IDs/checksums where safe, while avoiding raw learner
answers or machine-specific paths that add no verification value.

## Native visual and interaction matrix

The following checks require the native UI. A browser screenshot may be retained as supporting
comparison but cannot fill these rows.

| Check                 | Required native evidence                                                                                                                                                 | Current milestone status                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hebrew RTL hierarchy  | Scenario, management action/preview, risk warning, pending state, journal, timeline and debrief; explicit LTR isolation for prices, quantities, dates, IDs and checksums | **PARTIAL PASS.** Open dashboard, risk, pending state, journal rationale and post-fill timeline inspected; terminal debrief not reached.                     |
| Phone layout          | Original-resolution iPhone simulator captures with no clipping, overlap, hidden action, journal obstruction or bottom-navigation obstruction                             | **PARTIAL PASS.** Open, pending, restored-pending and post-fill timeline states inspected on iPhone 17 Pro simulator.                                        |
| Dark appearance       | Native appearance switched through the OS; contrast and non-color state cues inspected                                                                                   | **NOT RUN — OPEN GATE**                                                                                                                                      |
| Largest OS text       | `accessibility-extra-extra-extra-large`; content remains reachable and actions do not truncate ambiguously                                                               | **NOT RUN — OPEN GATE**                                                                                                                                      |
| Increased contrast    | Native OS setting enabled; status, focus, chart overlays, and validation remain distinguishable without color alone                                                      | **NOT RUN — OPEN GATE**                                                                                                                                      |
| Reduced motion        | Native OS or app setting used as implemented; no required information depends on animation                                                                               | **NOT RUN — OPEN GATE**                                                                                                                                      |
| Gestures and controls | Scenario selection, replay, management drafting/preview/acknowledgement/cancellation, journal correction, recovery and debrief with native controls                      | **PARTIAL PASS.** QA launch, partial-exit draft/review/submit and one replay advance used native controls; cancellation, correction and debrief remain open. |
| Terminate/relaunch    | Exact state restored at the applicable checkpoints above from SQLite                                                                                                     | **PASS FOR ONE PENDING-ACTION CHECKPOINT.** Expo Go was terminated/relaunched, the exact pending action restored, then filled once on N+1.                   |

## Screen-reader gates

### VoiceOver

VoiceOver remains an open gate until a human performs and records the run on iOS. At minimum, the
pass must cover:

- logical Hebrew focus order and predictable return focus after navigation or validation;
- names, roles, values, selected/disabled state, hints, and available actions for scenario cards,
  replay controls, analysis fields, trade/no-trade choices, management actions, risk warnings,
  pending-action cancellation, journal/correction linkage, timeline and debrief history;
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

Store submission, distribution privacy forms, a complete standalone lifecycle, physical-device
runtime, and a wider device/OS matrix remain separate release work. The exact partial Milestone 7
native results are described in `docs/NATIVE_ACCESSIBILITY_VERIFICATION.md`; nothing in this
historical milestone closes those remaining runtime gates.

## Milestone 5 final evidence status

This historical table preserves the completed Milestone 5 report. Current Milestone 6 availability
and open gates are recorded above and in the placeholder table below; in particular, the physical
iPhone is now paired and available but remains untested.

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

The later Milestone 6 audit observed the same Maestro installation successfully serving an
unrelated simulator on a dynamic driver port. The earlier socket failure is therefore retained as
an M5 run result, not treated as a permanent Maestro installation blocker.

### Milestone 6 final evidence

The implementation/evidence checkpoint is `7cb8dd2`; the documentation commit and final clean HEAD
are reported in the milestone handoff because a document cannot contain its own commit SHA.

| Evidence                                                     | Milestone 6 result                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS/Android Hermes exports                                   | **PASS AS BUNDLE EVIDENCE.** iOS: 1,905 modules, 23 assets, 25 files, 5,699,979 bytes. Android: 1,994 modules, 27 assets, 29 files, 6,873,653 bytes.                                                                                                                  |
| Management browser lifecycle                                 | **PASS.** Full QA 40/40 in 11.0 minutes; focused management 24/24 across phone/tablet; production 16/16; no retries.                                                                                                                                                  |
| Native management launch                                     | **PASS FOR BOUNDED EXPO GO SCOPE.** Exact internal QA route loaded on iPhone 17 Pro / iOS 26.5 through LAN Metro.                                                                                                                                                     |
| Pending action N → N+1 across terminate/relaunch             | **PASS FOR ONE PARTIAL EXIT.** Quantity 1 submitted after candle 65, eligible at 66, restored pending after cold Expo Go relaunch and executed exactly once at price 106.37.                                                                                          |
| Partial/scale-in lots and integer accounting across relaunch | **PARTIAL PASS.** Partial-exit state restored and filled; final aggregate revision 3, cutoff index 65, open quantity 9, one fill/four events. Scale-in across native relaunch was not run.                                                                            |
| Journal order/correction/duplicate readback                  | **PARTIAL PASS.** One `action-rationale` row with the exact linked action and cutoff survived relaunch; one management row/one journal row remained after fill. Native correction flow was not run.                                                                   |
| Payload schema 6 / SQLite migration 5 / integrity            | **PASS.** `PRAGMA integrity_check=ok`; migration 5 checksum `sha256:ddfdc6589ba3ea48862156293c60bb904a3a781fd4c3a73400a193fd1d25eb8a`; no management quarantines; direct migration readback reported no further migration.                                            |
| No-credit/no-duplicate readback                              | **PASS FOR THE MANAGEMENT RUN.** The aggregate is `learning_credit=none`; existing ordinary ledger remained 21 attempts/366 XP and the management run appended no attempt. Physical/payload mirrors contained one management aggregate, one journal row and one fill. |
| Terminal debrief                                             | **NOT RUN — OPEN GATE.** The bounded run stopped after the first post-relaunch partial fill and timeline inspection.                                                                                                                                                  |
| No-management no-trade/unfilled path                         | **NOT RUN NATIVELY — OPEN GATE.** Browser/domain/persistence coverage passes.                                                                                                                                                                                         |
| Native management visual matrix                              | **PARTIAL PASS.** Open dashboard/chart/risk, pending before/after relaunch and post-fill timeline inspected; dark, OS-largest-text, increased-contrast and terminal-debrief native views remain open.                                                                 |
| VoiceOver / largest OS text / increased contrast             | **NOT RUN — OPEN GATE.** Browser largest in-app text/reduced-motion evidence is not relabeled as native evidence.                                                                                                                                                     |
| Android runtime / TalkBack                                   | **BLOCKED LOCALLY.** No Android SDK, emulator or device; Hermes export only.                                                                                                                                                                                          |
| Physical iPhone                                              | **NOT RUN.** A paired iPhone 15 Pro Max was visible, but ChartPath/Expo was not installed and no signed build was authorized or available.                                                                                                                            |
| Signed standalone builds                                     | **NOT RUN — OPEN GATE.**                                                                                                                                                                                                                                              |

Until the open native, screen-reader, and physical-device rows have recorded passing evidence, the
existing native-distribution decision remains **NO-GO**.
