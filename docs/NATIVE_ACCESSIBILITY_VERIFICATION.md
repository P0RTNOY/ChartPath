# Native, accessibility, and backup verification

Updated: 2026-08-26 (Asia/Jerusalem)

This is the current Milestone 7 native evidence record. A standalone ChartPath development build
compiled and ran on the named iOS simulator, and the actual standalone `Documents/SQLite` directory
returned `isExcludedFromBackup=true` through an independent Foundation readback. A separately
signed development build also compiled and installed on the connected iPhone 15 Pro Max. The phone
was locked when launch was attempted, so no physical-device runtime, lifecycle, touch, persistence,
or accessibility pass is claimed. VoiceOver, Android runtime, TalkBack, and the complete standalone
candidate lifecycle remain open. Native distribution is therefore **NO-GO**.

`docs/NATIVE_ACCESSIBILITY_READINESS.md` preserves the Milestone 5 and 6 history. This document is
the authoritative current boundary; source code, component tests, browser screenshots, Expo Go,
and simulator automation must not be relabeled as evidence they cannot establish.

## Evidence boundary

| Evidence class                    | What is established                                                                                                                  | What is not established                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Source/configuration verification | The checked-in identifiers, config plugin, local Expo module, adapter ordering, fail-closed behavior, and automation contracts agree | Native compilation, code signing, installation, runtime resource values, or OS accessibility behavior                 |
| Expo Go simulator journey         | React Native UI and Expo SQLite behavior in `host.exp.Exponent` on the named simulator                                               | Inclusion of the local native module, standalone app identity, signing, backup exclusion, or physical-device behavior |
| Standalone simulator journey      | Behavior of one generated ChartPath build on one named simulator                                                                     | Physical hardware, signed distribution, another OS version, VoiceOver, or TalkBack unless separately exercised        |
| Physical-device journey           | Behavior of one named signed build on the recorded hardware and OS                                                                   | Another platform, OS, device class, or assistive technology unless separately exercised                               |
| Screen-reader pass                | Human-observed focus, speech, values, actions, announcements, and gesture completion with the named service                          | The other screen reader, visual-only checks, or merely having accessibility props in source                           |

Screenshots establish only what is visible in the captured frame. Maestro assertions establish only
the asserted route and state on their exact target. Neither is a substitute for listening to a
screen reader or independently reading the filesystem backup resource value.

## Exact audited environment

The following facts were read locally on 2026-08-26. Availability is not a test result.

| Area                 | Exact fact                                                                                                                                                                   | Current evidence consequence                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Host                 | macOS `26.5.1` build `25F80`, arm64                                                                                                                                          | Host is available for local iOS work                                                                                   |
| Apple toolchain      | Xcode `26.6` build `17F113`; iOS simulator SDK `26.5`; CocoaPods `1.16.2`; Xcode license and first-launch checks succeeded                                                   | Exact simulator and physical-device Debug builds completed                                                             |
| JavaScript toolchain | Node `22.23.2`; pnpm `11.21.0`; project Expo dependency `57.0.15`; local Expo CLI reports `57.0.17`                                                                          | Config, Jest, and Expo introspection can run                                                                           |
| iOS simulator        | iPhone 17 Pro, iOS `26.5`, UDID `5A9AC632-0924-4BBF-ADF4-170831DC5A9E`, booted                                                                                               | Exact target for ChartPath simulator automation                                                                        |
| Expo Go              | `57.0.9`, app ID `host.exp.Exponent`                                                                                                                                         | Supports bounded UI/SQLite evidence but cannot load the local backup-policy module                                     |
| Unrelated simulator  | `Shiftty Beta Verification Clone`, UDID `73B7FFB2-1EC0-470C-B7E5-38D401BA4255`, also booted during the audit                                                                 | Never use `booted`; never stop, reuse, or inspect that unrelated workload                                              |
| Physical iOS device  | `Portnoy`, iPhone 15 Pro Max (`iPhone16,2`), iOS `26.6` build `23G71`, CoreDevice ID `69DD73EC-5E11-54E7-AE07-1CD1D565DC7C`; paired, wired, Developer Mode enabled           | Signed ChartPath build installed; launch was blocked because the phone was locked                                      |
| Signing identity     | Apple Development identity for team `9R9UQ6GTQW`, expiring 2027-08-10; automatic signing created a ChartPath development profile                                             | Physical build signing and installation passed; this is not distribution signing                                       |
| Installed profile    | `iOS Team Provisioning Profile: com.omerportnoy.chartpath`, expires `2026-09-02T14:12:37Z`                                                                                   | Exact app entitlement/profile was embedded in the installed development build                                          |
| Maestro              | `2.8.0`; Accessibility Inspector is installed with Xcode                                                                                                                     | Syntax validation and exact-target flows are available; no M7 ChartPath flow has been recorded as passed               |
| Android tools        | `adb` `37.0.0` is installed; `adb devices -l` is empty; `emulator`, `avdmanager`, and `sdkmanager` are absent; `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and `JAVA_HOME` are unset | No Android runtime or TalkBack evidence is possible in this environment without separately authorized tooling/hardware |

The stable native identity is `com.omerportnoy.chartpath` with Apple team `9R9UQ6GTQW`. The physical
development app carried application identifier `9R9UQ6GTQW.com.omerportnoy.chartpath`, team ID
`9R9UQ6GTQW`, and `get-task-allow=true`. This proves only the local development artifact: no archive,
distribution profile, upload, TestFlight build, store submission, or release entitlement exists.

## Backup and recovery decision

The privacy-first policy excludes the **entire mutable ChartPath SQLite directory** from platform
backup. Android retains `android:allowBackup="false"`. On iOS, a local Expo module creates the durable
`Documents/SQLite` directory, sets `URLResourceValues.isExcludedFromBackup = true`, reads that value
back, and fails if it is not true. The SQLite adapter performs this check before opening the
database in a standalone iOS build. The config plugin also pins
`ChartPathBackupPolicyVersion=ios-sqlite-exclusion-v1` in the generated Info.plist.

This is deliberately one whole-store decision. The data classes below coexist in the same mutable
database and cannot be honestly described as selectively backed up. Exclusion improves privacy but
means OS backup or device migration is not a recovery mechanism. A learner may lose local history
after uninstall, app-data removal, device loss, or device replacement. The ordinary supported
control is in-app local deletion; there is no account, cloud sync, remote recovery, telemetry, or
production export service.

| Data class                                                                      | Backup decision                                       | Recovery/retention consequence                                                          |
| ------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Attempts, answers, deterministic results, hints, and misconception history      | Exclude with all mutable SQLite                       | Retained locally until reset/app-data removal; may be lost with the device              |
| Progress, mastery, XP, streaks, daily activity, and review projections          | Exclude                                               | Rebuildable only while their local append-only source attempts survive                  |
| Theme, RTL, text, motion, goal, disclaimer, and other local settings            | Exclude when stored in the mutable app store          | Reset or reconfigure after data loss                                                    |
| Guided-analysis drafts and finalized analyses                                   | Exclude                                               | Local resume/history can be lost; finalized records remain immutable only while present |
| Paper-execution plans, events, fills, and debrief state                         | Exclude                                               | Fictional sessions do not restore from OS backup                                        |
| Position-management lots, actions, events, fills, accounting, and debrief state | Exclude                                               | Local deterministic history can be lost; no brokerage record is affected                |
| Journal free text, corrections, and linkage                                     | Exclude                                               | Privacy-sensitive learner text stays out of OS backup but has no cloud recovery         |
| Candidate/internal-QA state                                                     | Exclude                                               | Developer-only state is disposable and grants no learner credit                         |
| Quarantine records and rejected raw payloads                                    | Exclude                                               | Potentially malformed or learner-authored content is not copied into OS backup          |
| Installation ID, idempotency keys, schema/migration state, and checksums        | Exclude                                               | Reset together with the data they protect; no cross-app/device tracking                 |
| Bundled synthetic datasets and authored curriculum                              | Not mutable learner SQLite; no OS restore requirement | Reinstalled from a reviewed application build                                           |
| Developer screenshots, logs, and evidence packets                               | Never production app data                             | Governed as repository/developer artifacts, not by the app database policy              |

Static and config tests currently verify the plugin assertions, exact bundle/team IDs, Android
`allowBackup=false`, generated-manifest value, Info.plist policy version, iOS module discovery,
JavaScript validation, and the adapter's backup-check-before-open ordering. The native Swift source
and podspec also pass module-resolution and podspec introspection.

The standalone simulator build compiled the local module, created the application-owned
`Documents/SQLite` directory, and an independent Foundation script read
`isExcludedFromBackup=true` from that exact URL. The application integration also fails closed before
opening SQLite when the standalone iOS policy result is missing, stale, or false. This closes the
simulator runtime-resource-value check. A terminate/relaunch readback tied to a complete candidate
lifecycle and an independent physical-device readback were not completed, so cross-launch,
physical-device backup behavior, OS restore behavior, and distribution entitlements remain open.

## Current native and accessibility evidence

| Required journey                                        | Actual 2026-08-26 status                                                                                                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prior pending action across terminate/relaunch          | **Limited pass from Milestone 6 only.** Expo Go on the exact iPhone 17 Pro simulator restored one pending partial exit and filled it exactly once on N+1; this was not a standalone M7 build |
| M7 standalone route smoke                               | **PASS, bounded.** The generated ChartPath app launched on the exact simulator and rendered Hebrew onboarding; it did not execute a candidate lifecycle                                      |
| Pending-action relaunch flow                            | Automation is versioned and syntax-checked; prior manual bounded evidence exists, but the M7 flow itself is **not run**                                                                      |
| Terminal management relaunch/debrief                    | **Not run**                                                                                                                                                                                  |
| No-trade and unfilled paper/management recovery         | **Not run natively**                                                                                                                                                                         |
| Checksum mismatch/quarantine recovery                   | Automation contract exists; **not run**, and no primary evidence database may be corrupted to manufacture a pass                                                                             |
| Light/dark, OS largest content size, increased contrast | **PASS for visual layout only.** Four standalone simulator frames were inspected at `1206×2622`; no horizontal clipping was found and largest text remained scrollable                       |
| Reduced motion and bold text                            | No suitable `simctl ui` toggle was found; require controlled Settings/manual evidence; **not run**                                                                                           |
| VoiceOver on simulator or physical iPhone               | **Not run**                                                                                                                                                                                  |
| Physical iPhone installation/lifecycle/accessibility    | **PARTIAL.** Exact signed development build compiled and installed; launch failed because the phone was locked, so runtime/lifecycle/accessibility remain unperformed                        |
| Android runtime and TalkBack                            | **Blocked by no device/emulator/toolchain; not run**                                                                                                                                         |
| Signed standalone ChartPath build                       | **PARTIAL PASS.** Debug artifact compiled, signed and installed; bundle tree SHA-256 is recorded below; no launch or lifecycle pass                                                          |

The simulator Debug `.app` bundle-tree digest was
`4ffe18130a38dbfa3470f66ea90929e23f762c2317c23ead0f1a5381b1504b05`. The signed physical-device
Debug `.app` bundle-tree digest was
`d12561c5269fa6ef1308562ce85fc4ac8e5ebd6c76b1b7b77d07e70282af71b7`. These are deterministic
tree digests of the built artifacts used in this verification, not App Store package checksums.

## Exact verification and evidence commands

The checked-in foundation can be reverified without generating native projects:

```sh
node --test apps/mobile/plugins/with-chartpath-native-policy.test.cjs
pnpm --filter @chartpath/mobile test -- --runInBand \
  src/lib/persistence/native-backup-policy.test.ts \
  src/lib/persistence/sqlite-adapter.test.ts
pnpm --filter @chartpath/mobile exec expo config --type introspect --json
pnpm --filter @chartpath/mobile exec expo-modules-autolinking search --platform apple --json
pnpm --filter @chartpath/mobile exec expo-modules-autolinking resolve --platform apple --json
pod ipc spec apps/mobile/modules/chartpath-backup-policy/ios/ChartPathBackupPolicy.podspec
```

The config test has four passing assertions; the focused Jest run has two passing suites and 14
passing tests. Introspection reports the exact iOS bundle/team values, the Info.plist policy version,
and Android `allowBackup=false`; autolinking finds exactly one non-duplicate local module. These are
source/configuration results only.

The versioned simulator wrapper requires explicit environment input and rejects `booted`:

```sh
CHARTPATH_IOS_SIMULATOR_UDID=5A9AC632-0924-4BBF-ADF4-170831DC5A9E \
CHARTPATH_NATIVE_APP_ID=host.exp.Exponent \
CHARTPATH_NATIVE_ROUTE_URL='exp://<LAN-HOST>:<PORT>/--/<exact-route>' \
CHARTPATH_EXPECTED_TEST_ID='<exact-test-id>' \
scripts/native/run-ios-maestro-flow.sh candidate-route-smoke
```

Available flow names are `candidate-route-smoke`, `management-pending-relaunch`,
`management-terminal-relaunch`, and `quarantine-recovery`. Each requires its documented state and
environment inputs. For a standalone build, use `CHARTPATH_NATIVE_APP_ID=com.omerportnoy.chartpath`.
Evidence defaults to `/tmp/chartpath-m7-native-evidence`; a successful flow remains evidence only
for that exact app, simulator, route, and state.

The completed native verification used an isolated temporary worktree, Expo prebuild, CocoaPods,
and exact Xcode destinations. In reproducible outline:

```sh
pnpm --filter @chartpath/mobile exec expo prebuild --platform ios --pnpm
pod install --project-directory=apps/mobile/ios
xcodebuild -workspace ios/ChartPath.xcworkspace -scheme ChartPath \
  -configuration Debug -destination 'platform=iOS Simulator,id=<EXACT_UDID>' \
  CODE_SIGNING_ALLOWED=NO build
xcodebuild -workspace ios/ChartPath.xcworkspace -scheme ChartPath \
  -configuration Debug -destination 'platform=iOS,id=<EXACT_DEVICE_ID>' \
  DEVELOPMENT_TEAM=9R9UQ6GTQW -allowProvisioningUpdates build
```

The generated directory was not committed. The physical build was installed locally and never
uploaded. Never substitute `booted` or the unrelated Shiftty simulator for the exact destination.

The exact simulator supports these controlled OS-mode inputs:

```sh
xcrun simctl ui 5A9AC632-0924-4BBF-ADF4-170831DC5A9E appearance dark
xcrun simctl ui 5A9AC632-0924-4BBF-ADF4-170831DC5A9E increase_contrast enabled
xcrun simctl ui 5A9AC632-0924-4BBF-ADF4-170831DC5A9E \
  content_size accessibility-extra-extra-extra-large
```

The light, dark, largest-content-size, and increased-contrast commands were executed against the
standalone app. The simulator was restored to light, large content size, and disabled increased
contrast afterward. `simctl` exposed no reliable reduced-motion, bold-text, or reduced-transparency
toggle; those modes remain supported by application tests/browser evidence but are not native OS
passes.

## VoiceOver, TalkBack, and physical-device exit criteria

A VoiceOver pass requires a human to listen to and record focus order, Hebrew labels, roles, state,
values, hints, custom actions, announcements, errors, dialog focus, chart alternatives, mixed RTL/LTR
speech, and successful completion without relying on sight or pointer-only gestures. Exercise
candidate gating, paper execution, wait/no-trade, pending and terminal management, journal
correction, quarantine/recovery, deletion, and terminate/relaunch. Repeat the critical path on the
named physical iPhone with the standalone ChartPath build.

TalkBack requires an authorized Android emulator or physical device and a generated build with
`android:allowBackup="false"`, followed by the equivalent focus, speech, action, mixed-direction,
largest-text, gesture, recovery, and lifecycle matrix. An Android JavaScript/Hermes export cannot
satisfy this gate.

The no-claim boundary is final: the exact results prove simulator compilation/runtime/resource
readback and physical development compilation/signing/installation only. They do not prove a full
standalone candidate lifecycle, physical-device runtime, VoiceOver speech/focus, Android/TalkBack,
distribution signing, OS restore, or native release readiness. Each remains open until exact named
evidence is captured and reviewed.
