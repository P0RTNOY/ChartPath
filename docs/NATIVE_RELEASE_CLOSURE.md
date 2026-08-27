# Milestone 8 native release closure

Updated: 2026-08-27 (Asia/Jerusalem)

**Status:** `INTERNAL_REVIEW_BUILD_READY / EXTERNAL_REVIEW_PENDING / PUBLICATION_NO_GO`

This record distinguishes completed evidence from configuration, browser, export, simulator,
physical-device, and human assistive-technology claims. Machine-resolvable release work may close
while external review, licensing, VoiceOver, Android/TalkBack, physical-device runtime, signing,
upload, and store submission remain open. No candidate is approved or published, no learner credit
is enabled, and no Milestone 8 build is uploaded.

## 1. Exact app and environment identities

| Item          | Exact identity                                                                                                | Evidence boundary                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| App           | `ChartPath` `0.1.0` build `1`                                                                                 | Local development identity only                                     |
| iOS bundle    | `com.omerportnoy.chartpath`                                                                                   | No App Store or TestFlight identity is claimed                      |
| Apple team    | `9R9UQ6GTQW`                                                                                                  | Local Apple Development signing; not distribution signing           |
| iOS simulator | iPhone 17 Pro, iOS `26.5`, UDID `5A9AC632-0924-4BBF-ADF4-170831DC5A9E`                                        | The only authorized ChartPath simulator target in this audit        |
| Physical iOS  | iPhone 15 Pro Max (`iPhone16,2`), iOS `26.6` build `23G71`, CoreDevice `69DD73EC-5E11-54E7-AE07-1CD1D565DC7C` | App installation is confirmed; runtime remains blocked while locked |
| Android       | Existing SDK path belongs to an unrelated Shiftty workload; no ChartPath-owned AVD or device is authorized    | Export is not runtime or TalkBack evidence                          |

Never select an ambiguous `booted` simulator, stop or reuse the unrelated Shiftty simulator/AVD,
or repeatedly retry the physical iPhone while it is locked.

## 2. Backup and recovery closure

Opaque native backup remains excluded:

- iOS must set and independently read back `isExcludedFromBackup=true` on the complete mutable
  `Documents/SQLite` directory before opening the standalone database.
- Android remains configured with `android:allowBackup=false`.

The exact post-Milestone 8 simulator container was read independently after launch. The complete
`Documents/SQLite` directory carried
`com.apple.metadata:com_apple_backup_excludeItem: com.apple.MobileBackup` while containing the
database, WAL and shared-memory files. This closes the bounded simulator readback only; it is not a
physical-device or Android policy readback.

Milestone 8 adds a user-controlled logical recovery path instead of copying SQLite, WAL, caches, or
internal QA artifacts. The format is password-encrypted and authenticated, defaults to portable
settings plus attempts, requires explicit selection for simulated histories, and requires a second
privacy consent for management/journal and quarantine data. Import is dry-run-first, additive,
stable-ID bound, conflict-reporting, transactional, idempotent, and fail-closed. See
`RECOVERY_POLICY.md` for the cryptographic, schema, privacy, and transaction contract.

Native backup exclusion and logical recovery are separate gates. A successful encrypted bundle
test does not prove native filesystem policy, and a successful backup-resource readback does not
prove export/import usability.

## 3. Lifecycle matrix

The following table is updated only from exact named evidence. Browser and reducer coverage is
listed separately and never relabelled as native lifecycle evidence.

| Journey                                                                                             | Machine/browser evidence                                                                   | Standalone iOS evidence                             | Physical iPhone        | Android                        |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------- | ---------------------- | ------------------------------ |
| Long analysis → order → fill → management → pending relaunch → terminal debrief → terminal relaunch | Deterministic domain, persistence, Jest, Playwright, and versioned Maestro contracts       | Open; app build/launch is not this lifecycle        | Not run; device locked | Not run; no authorized runtime |
| Short adverse-gap/management → terminal debrief                                                     | Deterministic domain, persistence, Jest, Playwright, and versioned Maestro contracts       | Open; app build/launch is not this lifecycle        | Not run                | Not run                        |
| No-trade rationale → relaunch → debrief with no paper/management session and no hindsight regrade   | Deterministic domain, persistence, Jest, Playwright, and versioned Maestro contracts       | Open; app build/launch is not this lifecycle        | Not run                | Not run                        |
| Working order → expiry → terminal relaunch                                                          | Deterministic domain, persistence, Jest, Playwright, and versioned Maestro contracts       | Open; app build/launch is not this lifecycle        | Not run                | Not run                        |
| Dataset/checksum mismatch                                                                           | Unit/integration fail-closed coverage                                                      | Open                                                | Not run                | Not run                        |
| Scenario-version mismatch                                                                           | Unit/integration fail-closed coverage                                                      | Open                                                | Not run                | Not run                        |
| Corrupt-state quarantine/recovery                                                                   | Unit/integration coverage; never corrupt a primary evidence database to manufacture a pass | Open on a disposable app container                  | Not run                | Not run                        |
| Unsupported schema                                                                                  | Unit/integration fail-closed coverage                                                      | Open                                                | Not run                | Not run                        |
| Missing dataset                                                                                     | Unit/integration fail-closed coverage                                                      | Open                                                | Not run                | Not run                        |
| Duplicate callback/retry                                                                            | Deterministic idempotency coverage                                                         | Open                                                | Not run                | Not run                        |
| Encrypted export/import, dry-run, tamper rejection, duplicate import, sensitive opt-in              | Recovery unit/component/browser coverage                                                   | Recovery route opened and inspected; full flow open | Not run                | Not run                        |

The post-Milestone 8 standalone iOS Release build completed for arm64 with signing disabled,
installed and launched on the exact named simulator, and opened the Hebrew RTL recovery route. Its
bundle tree contains 92 files, occupies 51,580 KiB, and has digest
`71dd294e8b32ee9ece4ebec410653b7c00e7cbce2095e00d1c73f42dcb187a7d`. The exact recovery frame is
`1206×2622`, SHA-256
`4a07a19a2fa993fc28ff820aef0266b03dbf3294fb3d1a5696c3a89f48138829`, and is recorded as
`screenshots/m8-native-ios-recovery-light.png`. It verifies one light-mode route presentation only;
it is not an export/import, relaunch, VoiceOver, OS-setting, physical-device, signing or
distribution pass. A bounded terminate/relaunch returned to the normal home route after the splash,
as expected; no recovery-flow persistence claim is made.

## 4. Physical-device check actually performed

The exact signed development app is installed on the connected iPhone. The bounded recheck
confirmed:

- name `ChartPath`;
- bundle ID `com.omerportnoy.chartpath`;
- marketing version `0.1.0`, build `1`;
- developer app `true`; and
- the device had been unlocked since boot but currently required the passcode.

No launch, termination, reinstall, lifecycle interaction, screenshot, touch, orientation,
persistence, large-text, dark-mode, or accessibility result is claimed for Milestone 8. The exact
user action required is to unlock the phone, keep it awake, and authorize one bounded launch and
relaunch window. Device security must not be bypassed and launch must not be retried while locked.

## 5. VoiceOver and TalkBack boundary

No human VoiceOver speech/focus pass has been completed. Accessibility labels, roles, automated
queries, browser screenshots, and Accessibility Inspector availability do not close this gate. A
valid pass requires a human to listen to and record focus order, spoken Hebrew names, values, hints,
actions, announcements, errors, dialog focus/restoration, and completion without pointer-only
gestures across:

- onboarding, home, the explicitly gated reviewer catalog, and Settings;
- blind chart and visible-only chart summary;
- Guided Analysis, no-trade, order ticket, position and management actions;
- before/after risk, journal, replay, event history, validation errors and debrief; and
- encrypted recovery, import confirmation, conflicts, quarantine and deletion.

The pass must confirm that speech never reveals hidden ticker/date, future candles/extremes, the
correct decision, private grader geometry, expected fill, stop/target outcome, or future P&L.

No authorized ChartPath Android runtime exists, so Android SQLite, lifecycle, backup-policy
readback, and real TalkBack focus/speech/actions remain open. Installing a large SDK/emulator image
or reusing another project's AVD requires separate authorization.

## 6. Native OS accessibility matrix

| Setting or behavior                | Current evidence                                                                   | Remaining action                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Light/dark                         | Existing standalone frames; post-M8 recovery light frame and browser coverage      | Recheck exact post-M8 native dark/reviewer states        |
| Largest OS text                    | Existing standalone simulator layout frames; post-M8 largest-text browser coverage | Recheck exact post-M8 native recovery flow               |
| Increased contrast                 | Existing standalone simulator visual frame                                         | Recheck exact post-M8 native states                      |
| Bold text                          | Not run                                                                            | Enable in native Settings and inspect full critical path |
| Reduced transparency               | Not run                                                                            | Enable in native Settings and inspect                    |
| Reduced motion                     | App/browser contract coverage only                                                 | Enable at OS level and inspect native behavior           |
| Portrait/landscape/tablet          | Browser phone/tablet layout; app orientation is `default`                          | Complete exact native orientation checks                 |
| RTL focus/reading order            | Automated structure/browser evidence                                               | Complete human VoiceOver/TalkBack pass                   |
| LTR numeric isolation              | Component/browser evidence                                                         | Listen to mixed Hebrew/numeric speech natively           |
| Touch targets/gesture alternatives | Static/component/browser evidence                                                  | Complete physical ergonomics and screen-reader actions   |
| Focus restoration/dialogs          | Component/browser evidence                                                         | Complete real screen-reader pass                         |

## 7. Internal reviewer configuration

The reviewer surface requires all of:

1. a development build (`__DEV__`);
2. compile-time `EXPO_PUBLIC_CHARTPATH_REVIEWER_MODE=1`; and
3. the explicit `developer=1` route flag and in-app acknowledgement gate.

Production exports omit this access because `__DEV__` is false. The surface remains synthetic,
internal, no-credit, and outside the ordinary learner catalog. It shows candidate/checksum/provenance
evidence only after explicit reveal; it cannot trust a key, sign an attestation, approve, publish,
upload, or grant credit. `pnpm mobile:reviewer:web` starts the local development configuration and
`pnpm reviewer:export:web` creates a local development export for evidence only.

## 8. Release decision

Machine gates can be closed while native verification remains partial. The deterministic preflight
uses `publication-preflight-policy-v2`, reports category-specific gates and side effects, and must
remain `PUBLICATION_NO_GO` until every required external and runtime gate is legitimately closed.
The current valid summary is:

```text
MACHINE_GATES_CLOSED
NATIVE_VERIFICATION_PARTIAL
EXTERNAL_REVIEW_PENDING
INTERNAL_REVIEW_BUILD_READY
PUBLICATION_NO_GO
```

The production reviewer registry remains empty, all eight candidate review scopes remain missing,
licensing/redistribution authorization is absent, distribution is unauthorized, and no real
promotion command exists or was run.

The authoritative uncontended final `pnpm check` passed formatting, lint, every workspace
typecheck, 67 suites / 704 tests, content validation and exact packet verification. The only test
output caveat was the existing pair of non-failing overlapping React `act()` warnings.
