# Milestone 8 native release closure

Updated: 2026-08-28 (Asia/Jerusalem)

**Status:** `M8_NATIVE_MACHINE_OPEN / PHYSICAL_IOS_PARTIAL / VOICEOVER_PENDING / EXTERNAL_REVIEW_PENDING / PUBLICATION_NO_GO`

This record separates completed standalone-iOS and SQLite evidence from physical-device,
password-bearing recovery, human assistive-technology, external-review, licensing, Android-runtime,
and distribution claims. The closure branch remains an internal, unpublished, no-credit review
build. No candidate was approved or published, and no build was uploaded.

## 1. Exact identities and evidence boundary

| Item         | Exact identity                                                                                                | Result boundary                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Branch start | `codex/external-review-native-release-closure` at `0b7909e24a229e2fa8fe5dcd7cef5cf6280b1e10`                  | Authorized base remains `b8a0c8a7e202aa4c0fcd95e6858b635f19f126e1`                                 |
| App          | `ChartPath` `0.1.0` build `1`; bundle `com.omerportnoy.chartpath`                                             | Local development identity only                                                                    |
| Apple team   | `9R9UQ6GTQW`                                                                                                  | Apple Development signing, not distribution signing                                                |
| Simulator    | iPhone 17 Pro, iOS `26.5`, UDID `5A9AC632-0924-4BBF-ADF4-170831DC5A9E`                                        | Exact standalone native target                                                                     |
| Physical iOS | iPhone 15 Pro Max (`iPhone16,2`), iOS `26.6` build `23G71`, CoreDevice `69DD73EC-5E11-54E7-AE07-1CD1D565DC7C` | Paired, trusted, wired, Developer Mode enabled; app installed and launched before the phone locked |
| Android      | Static Expo export only                                                                                       | No ChartPath-owned device/AVD, runtime, SQLite, or TalkBack claim                                  |

The signed physical artifact tree digest is
`5bbeb9af04074d26c80e5eafa552cc215ab50889c325fa311228660bf885f0ee`.
The current simulator Debug app contains 73 files / 138,795,172 bytes and has tree digest
`631c358898b73fa5b701b0adae79bc45a97e8109ae5960447d9648ad8b418be3`.
Build and install used the repository iOS workspace, `ChartPath` scheme, exact simulator destination,
and `CODE_SIGNING_ALLOWED=NO`; the native build completed with only existing dependency/script-phase
warnings.

## 2. Immutable candidate identities

| Decision | Candidate / scenario                                                      | Dataset / checksum                                                                                                      | Material checksum                                                         |
| -------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Long     | `publication-candidate-long-v1`; `internal-long-range-breakout@2.1.0`     | `internal-long-range-breakout-dataset@2.0.0`; `sha256:f927f4758ad81c6bdc1b2da7c5d4948af21ea930a0094db2ac9d49ee69e7f7d2` | `sha256:5212b1d0aab4eb6a1b6fd028a2a8f8d1d87551f7cf7530720c6fed65551a7b54` |
| Short    | `publication-candidate-short-v1`; `internal-short-double-top@2.0.0`       | `internal-short-double-top-dataset@2.0.0`; `sha256:357d1c59b511573583f40ee0ec332d737485fae2917ec3a3b7bec3564326967d`    | `sha256:15815a43ab08f9d3738331b00392ffe73afe62eb1ac481a53eb990001520ad6f` |
| No trade | `publication-candidate-no-trade-v1`; `internal-no-trade-capstone-c@1.0.0` | `internal-no-trade-capstone-c-dataset@1.0.0`; `sha256:c0b58867716179d9050c896988729457f3ddef8d083f4f103c3f7e7b49833aa2` | `sha256:cc42ef15cd912ac99446c0d41f05023860cc0c0eda4f57739d4537bb18d17a72` |

All remain reviewer-only, synthetic, no-credit, unapproved, and unpublished. The ordinary learner
library stayed empty in production and native reviewer-isolation checks.

## 3. Standalone lifecycle and actual SQLite evidence

The native harness always targets the exact simulator UUID and bundle ID, waits for observable UI
states, and refuses password-bearing import flows. Stable identifiers do not bypass analysis,
grading, execution, persistence, future isolation, or no-credit validation.

| Journey        | Standalone iOS result                                                                                                                                                                                                                                                                                                                                                         | Stopped-app SQLite checkpoint                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Long           | **PASS.** Complete 11-step analysis, order, fill, open management, submitted stop replacement, pending/relaunch restoration, process-once, stop terminal, journal/timeline/debrief, terminal relaunch                                                                                                                                                                         | `official-long-terminal-20260828-1830`; summary SHA-256 `ed3af140741cba982e4fd46d3c38b7ba7434ddcba4551d495bcbd235dfd54862`            |
| Short          | **PASS.** Complete 11-step analysis, market fill, pending stop `96.00`, pending relaunch, process-once, later gap, stop terminal, journal/timeline/debrief, terminal relaunch                                                                                                                                                                                                 | `official-short-terminal-20260828-2236`; summary SHA-256 `8aa474ee72f9985fb28d72a81cf0f87c67e0b335c2e4f1979cf96f647b678530`           |
| No trade       | **PASS.** Complete 11-step No-trade answer and rationale, positive No-trade terminal, relaunch restoration, no execution/management surface                                                                                                                                                                                                                                   | `official-no-trade-terminal-20260828-2259`; summary SHA-256 `d3efe961d1dad25916a11968cbb204d66a607f69004834c67c2d0d904be75416`        |
| Unfilled limit | **PASS WITH ASSERTION FOLLOW-UP.** Working state survived relaunch, 32 deterministic advances reached expiry, and a focused continuation verified expiry text, absent advance action, and terminal relaunch. The full run's only failure was a literal selector that did not account for iOS bidi isolates around `Replay`; the persisted terminal state was already present. | `official-unfilled-expiry-terminal-20260828-2310`; summary SHA-256 `2d13f301c386ef4c7750609770cfcf74a5cea92047355952f3ec56482ac8e31e` |

The Long evidence directory is
`/tmp/chartpath-m8-native-closure-evidence/m8-native-closure-candidate-11-long-lifecycle/2026-08-28_183223`.
The final Short evidence is under the same evidence root at timestamp `2026-08-28_223644`, the final
No-trade pass at `2026-08-28_225957`, and the unfilled terminal run at
`2026-08-28_231033` plus `maestro-diagnostic/unfilled-expiry-tail`.

Every checkpoint reports `integrity_check=ok`, zero foreign-key violations, WAL journal mode, all
five checksum-pinned migrations, and all append-only rejection triggers.

- Long and Short: one finalized analysis, one paper fill/open position, one management session, one
  submitted action, one protective-stop replacement, one stop closure, and one journal entry.
- No trade: one finalized analysis and zero paper, management, journal, or attempt rows.
- Unfilled: one finalized analysis, one completed paper session, one `order-expired`, zero fills,
  zero management/journal rows, and zero attempts.
- No checkpoint contains ordinary course credit, XP, mastery, or review-schedule mutation.

The inspector copies DB/WAL/SHM only after explicit exact-app termination and then inspects the
coherent copy. It never calls `simctl` or accepts an ambiguous app/container target.

## 4. Reviewer and chart isolation

The current standalone app passed:

- an unauthorized reviewer deep link resolving only to `scenario-qa-unavailable`;
- the ordinary scenario library showing its truthful empty state and no published list;
- the authorized development-only route requiring explicit acknowledgement and preserving the
  internal/synthetic/no-credit/unpublished warnings;
- candidate evidence hidden until explicit reveal, followed by the explicit non-approval warning;
- non-gesture chart pan/zoom transitions over the real 48-candle knowledge window:
  `#16–#63` → `#22–#57` → `#18–#53` → `#22–#57` → `#16–#63`; and
- continued visibility of the blind historical disclosure, with no access beyond candle `#63`.

## 5. Recovery result and privacy boundary

The native pre-secret recovery UI checkpoint **passed**. It confirmed settings and attempts selected
by default; analysis, paper, and management histories excluded by default; explicit management
selection; a second unchecked sensitive-data consent; native secure-field keyboard dismissal; and
a disabled export action without a password.

The runner deliberately returns exit `78` for password-bearing import/apply flows and accepts no
password environment variable. This prevents secrets from entering shell arguments, environment
dumps, Maestro reports, screenshots, or committed evidence.

The following therefore remain open and block machine closure: native file creation/share, native
document selection, password-bearing dry-run/cancel/apply, UI/SQLite post-import readback,
idempotent re-import, and native wrong-password/tamper/schema/stable-ID-conflict zero-mutation
checks. Browser, crypto, repository, component, and E2E coverage passed but is not relabelled as
native file/provider evidence. The planner's installed-registry limitation is documented in
`RECOVERY_POLICY.md`.

iOS `Documents/SQLite` backup exclusion and Android `allowBackup=false` remain separate from logical
recovery. SQLite, WAL, SHM, caches, datasets, reviewer state, and secrets are never recovery-bundle
categories; journal/free text requires explicit sensitive-data consent.

## 6. Failure recovery and duplicate delivery

Deterministic domain/repository tests cover checksum/version/missing-dataset rejection, corrupt or
unsupported persistence, quarantine, duplicate callbacks/fills/events/journal retries, recovery
wrong-password/tamper/schema/conflict rejection, dry-run zero mutation, transactional apply, and
idempotency. The actual lifecycle checkpoints independently show one fill/close/journal or one
expiry as appropriate.

The requested disposable native failure-injection matrix was **not executed**. No production-capable
mutation or corruption seam was added merely to manufacture evidence. Dataset mismatch,
scenario-version mismatch, missing dataset, corrupt state, unsupported schema, duplicate delivery,
and quarantine/recovery therefore remain open as native-runtime injection claims.

## 7. Physical iPhone and human accessibility boundary

The signed `0.1.0` build `1` installed and launched on the exact iPhone 15 Pro Max. The phone then
became passcode-locked. No repeated launch attempts or security bypass occurred. Installation and a
launch event do **not** prove touch usability, RTL interaction, drawing, order/management controls,
force-close restoration, persistence, dark mode, large text, orientation, focus, or speech.

No human VoiceOver session occurred and no speech/focus observation is claimed. VoiceOver remains
required across onboarding, ordinary/reviewer surfaces, blind chart, Guided Analysis, No-trade,
paper execution, management, journal, debrief, recovery, errors, dialogs, and quarantine. It must
also confirm that no hidden ticker/date, future candle/extreme, correct decision, grader geometry,
fill, stop/target outcome, or future P&L is spoken.

## 8. Native OS accessibility evidence

Original-resolution `1206×2622` simulator evidence was captured and visually inspected under
`/tmp/chartpath-m8-native-closure-evidence/visual-accessibility/`:

- `simulator-recovery-light-default-ready.png`;
- `simulator-recovery-dark-default-ready.png`;
- `simulator-recovery-dark-increased-contrast-ready.png`; and
- `simulator-recovery-dark-axxxl-ready.png`.

Light, dark, and increased-contrast recovery surfaces were RTL-correct, readable, and unclipped in
the inspected frames. Maximum Dynamic Type reflowed into a scroll-first layout without horizontal
clipping; route readiness and the visible upper surface were verified, not every downstream action.
Automated chart controls provide a keyboard/non-gesture alternative and the paper/management inputs
expose native `Done` accessories. Bold Text, Reduce Transparency, Reduce Motion, landscape/tablet,
modal focus restoration, physical touch targets, and human RTL reading order remain open.

## 9. Final automated evidence

The final authoritative counts and hashes must be read together with the command logs and final
handoff; an export is bundle evidence, never runtime evidence.

- `pnpm check`: **PASS**, 67 suites / 717 tests (UI 15, domain 211, historical-data 98,
  chart-engine 57, content 98, mobile 238), plus formatting, lint, all workspace typechecks,
  content validation, and packet byte verification. Two existing non-failing overlapping React
  `act()` warnings remained.
- Production browser E2E: **26/26 passed**, zero skips/retries.
- Development QA E2E: **49 passed / 1 intentional iPad duplicate skipped**, zero failures/retries.
- Historical validation: 96 candles, one gap, five intentional blockers.
- Scenario validation: nine candidates (3/3/3), zero structural errors, 97 blockers; management
  three variants / 13 cases / 39 blockers; combined 136; 12 datasets / 13 scenarios / zero credit.
- Identity audit: 60 records, no issues, checksum
  `sha256:ba7499f4977af92a78211f9c890ec6ea898776f2f747a524ac0b6b9ddcc67bd0`.
- Review packets: two generations byte-identical, tree digest
  `599738315e96a7231d350f68d4b985f00e04bc11bd46f4b46b05916e5e6cf878`.
- Review verification: all three candidates have eight missing scopes and no approval records.
- Preflight: 30 gates; 8 passed, 13 blocked, 9 not run; 22 blockers; `sideEffects:[]`;
  `PUBLICATION_NO_GO`.
- Web export: 79 files / 5,465,801 bytes; tree SHA-256
  `1da5443f6121af94ea4b4968c345a114e80f74b57920e5c66832497f69e64205`.
- iOS export: 25 files / 5,964,124 bytes; tree SHA-256
  `fd5de2f69684a5dc4cbdf43a3a0d4cac26b131881d0657dbdd3159144f5e2ae5`.
- Android static export: 29 files / 7,134,466 bytes; tree SHA-256
  `b0a37d1fdd6ed02202ec39cdbb9a22aac1208670393801dbcb742a6c2d986c6d`.

Expo/browser commands retain the known `NO_COLOR`/`FORCE_COLOR` warning. Native builds retain known
dependency and script-phase warnings. Neither warning was hidden or treated as a release pass.

## 10. Release decision and exact next actions

The machine gate is still open because password-bearing native recovery and native failure
injection were not completed. Physical-device and human VoiceOver gates are also open. Therefore:

```text
M8_NATIVE_MACHINE_CLOSED: NOT ACHIEVED
PHYSICAL_IOS_PARTIAL
VOICEOVER_PENDING
EXTERNAL_REVIEW_PENDING
PUBLICATION_NO_GO
```

Do not push solely on the strength of this partial closure record. The next authorized closure
session must keep the phone unlocked and awake for one bounded physical journey and human VoiceOver
session, use a reviewed secret-safe native recovery procedure with a disposable password, exercise
the disposable native failure matrix, and repeat affected checks. Android/TalkBack, external review,
licensing, distribution signing, TestFlight/App Store upload, publication, and learner credit remain
future separately authorized work.
