# ChartPath beta release readiness

Updated: 2026-08-25 (Asia/Jerusalem)

This record distinguishes the verified local beta from native distribution readiness. It does not
claim app-store, production, or human-learning validation.

## Candidate identity

| Field                                          | Value                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| Product version                                | `0.1.0`                                                                                |
| Content version                                | `2026.08-beta.1`                                                                       |
| Content schema                                 | `1`                                                                                    |
| Guided-session schema                          | `2`                                                                                    |
| Persistence schema                             | Web/native payload `6`; native SQLite migrations `5`                                   |
| Historical-data schema                         | `1`                                                                                    |
| Paper-execution schema/policy                  | `1`; `paper-execution-policy-v1`; `paper-cost-model-v1`                                |
| Position-management schema/policy              | `1`; `position-management-policy-v1`; automatic trailing disabled                      |
| Branch                                         | `codex/position-management-journal`                                                    |
| Milestone 6 implementation/evidence checkpoint | `7cb8dd2`; documentation commit and final clean HEAD are reported in the handoff       |
| Milestone 3 implementation tip                 | `37ebb67`; final documentation is committed separately                                 |
| Foundation commit                              | `f394380`                                                                              |
| Catalog commit                                 | `1e194e0`                                                                              |
| Mobile commit                                  | `f928497`                                                                              |
| Journey-evidence commit                        | `3bc11d4`                                                                              |
| Integrity-hardening commit                     | `dc992bd`                                                                              |
| Source PDF SHA-256                             | `25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`                     |
| Previously verified runtime                    | Static Expo web export in Chromium plus Expo Go on an iPhone 17 Pro iOS 26.5 simulator |
| Bundle-verified targets                        | Expo iOS and Android Hermes bundles                                                    |
| Decision                                       | **GO for the local web beta; NO-GO for native distribution**                           |

## Verified product scope

- Guest onboarding in Hebrew with educational and financial-risk disclosure, no account, and a
  persisted daily goal.
- Visible prerequisite learning path, units, lesson context, five-exercise lesson player,
  progressive hints, immediate deterministic feedback, summary, progress, review queue, glossary,
  settings, theme, text size, and reduced motion.
- Exactly 11 units, 12 reviewed lessons, 60 reviewed exercises, 27 glossary terms, 25
  near-miss/ambiguous/lookalike examples, 13 disciplined uncertainty answers, 13 risk/position-size
  exercises, and one 11-step capstone.
- All requested rubric families are represented through multiple choice, selection, sequencing,
  point/zone/line drawing, risk calculation, decision, label placement, timeframe comparison,
  mistake diagnosis, and sequential reveal interactions.
- Decision alternatives use explicit authored option-to-domain mappings, presentation order is
  deterministic without consulting rubrics, and sequential-reveal submission stays gated until the
  staged chart reaches the decision window.
- All 60 exercises carry an audited chart-presentation role. Seven direct chart interactions expose
  answer-bearing graphs; the other 53 hide unrelated synthetic charts in both question and feedback
  phases and explicitly tell learners to answer from the written case.
- Seeded synthetic OHLCV generation is separated from semantic annotations, rendering, and grading.
  Property tests cover deterministic generation, OHLC invariants, supported scenarios, and arbitrary
  decision-candle cutoffs.
- Pure deterministic grading, tolerance normalization, mastery, cost-aware risk sizing, SM-2-style
  review, and daily-path ordering. Runtime AI is disabled and cannot alter a grade.
- Append-only, idempotent attempts; replayable projections; content and schema migration; native
  SQLite and web local-storage adapters behind the same repository interface.
- A separate internal Frozen Historical Replay entry uses one 96-candle ChartPath-generated
  development dataset with one recorded gap. It provides cutoff-only blind replay, exact local
  resume/recovery, post-finalization provenance reveal, and read-only history without ordinary
  attempt or projection credit.
- The historical registry reports zero course-credit-eligible scenarios and four publication
  blockers. No real candle, provider payload, provider key, or runtime market-data request is
  bundled or configured.
- Milestone 4 defines a narrow local paper-execution simulation over an exact finalized historical
  analysis. It has one plan/order/position, deterministic events, explicit gap/cost/ambiguity
  assumptions and process-first debrief; it is not broker execution or a credited assessment.
- Milestone 5 provides nine synthetic internal scenario candidates, an empty truthful ordinary
  learner library, fail-closed seven-scope review and a developer-only QA surface. No candidate is
  human-approved or published.
- Milestone 6 provides three exact internal management variants over open paper handoffs. The pure
  aggregate supports N/N+1 full/partial exits, scale-in and manual stop/target replacements,
  explicit ambiguity, frozen-1R integer/FIFO accounting and an append-only journal. Automatic
  trailing, ordinary learning credit and real execution remain absent.
- Static pages are generated for every unit and lesson so supported web deep links survive refresh.
- No authentication, cloud sync, analytics, live-market requests, brokerage connection, production
  service, or API key is required by the core journey.

## Command evidence

All commands were run from the repository root on macOS with Node `v22.23.2` and pnpm `11.21.0`.

The table below is the previously completed candidate baseline and is retained as historical
evidence. The current Milestone 3 verification is recorded with exact results in its addendum.

| Check                                   | Command                                                                                         | Result                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Frozen install                          | `pnpm install --frozen-lockfile`                                                                | PASS; lockfile unchanged                                                            |
| Formatting, lint, types, tests, content | `pnpm check`                                                                                    | PASS                                                                                |
| Package builds                          | `pnpm build`                                                                                    | PASS for domain, chart engine, content, and UI                                      |
| Unit/integration inventory              | included in `pnpm check`                                                                        | 186 tests: domain 48, chart 48, content 22, UI 14, mobile/persistence/UI 54         |
| Catalog validation                      | `pnpm content:validate`                                                                         | PASS; exact inventory printed and quotas satisfied                                  |
| Web export                              | `pnpm --filter @chartpath/mobile export:web`                                                    | PASS; 49 static routes, including every dynamic unit/lesson path                    |
| Browser journeys                        | `pnpm test:e2e:web`                                                                             | PASS; 4/4 on phone and tablet Chromium projects, no retries                         |
| Expo dependency alignment               | `pnpm --filter @chartpath/mobile exec expo install --check`                                     | PASS; dependencies up to date                                                       |
| Expo project health                     | `pnpm dlx expo-doctor@latest apps/mobile`                                                       | PASS; 21/21 checks                                                                  |
| iOS bundle                              | `pnpm --filter @chartpath/mobile exec expo export --platform ios --output-dir dist-ios`         | PASS; 1,405 modules, Hermes bundle emitted                                          |
| Android bundle                          | `pnpm --filter @chartpath/mobile exec expo export --platform android --output-dir dist-android` | PASS; 1,535 modules, Hermes bundle emitted                                          |
| iOS Expo Go runtime journey             | Expo Go `57.0.9`, iPhone 17 Pro simulator on iOS `26.5`, LAN Metro bundle                       | PASS; onboarding, five attempts, completion, force-quit/reopen, and SQLite readback |
| Production dependency audit             | `pnpm audit --prod --audit-level high`                                                          | PASS gate: 0 high, 0 critical; one moderate build-tool advisory documented below    |
| Diff integrity                          | `git diff --check`                                                                              | PASS                                                                                |

The 186-test inventory excludes the four browser journeys. Together the automated candidate evidence
contains 190 passing tests/journeys. The native simulator journey is recorded separately because it
was driven through native controls rather than the browser suite.

## Journey evidence

The browser suite performs the following against the production static export on both declared
viewports:

1. Clears into a new guest profile and completes all three onboarding steps.
2. Accepts the educational disclosure and persists a daily goal.
3. Opens the first lesson and correctly completes five different exercises.
4. Verifies deterministic feedback and a truthful `5/5` summary.
5. Returns home, reloads the full application, and verifies lesson completion remains persisted.
6. Refreshes a generated dynamic lesson URL and verifies it is still available.
7. Searches the bilingual glossary for `Breakout` and finds the Hebrew term.
8. Enables dark mode, extra-large text, and reduced motion; reloads; and verifies all three settings
   remain selected.

Persistence integration tests additionally cover idempotent retry, conflicting attempt IDs,
projection rebuild, content migration, restart survival, a corrupt-SQLite reset, bounded long-session
timing, complex capstone/label answers, and safe rejection of a future schema.

### Native iOS simulator journey

On 2026-08-24, the app was launched in Expo Go `57.0.9` on a booted iPhone 17 Pro simulator running
iOS `26.5`. Opening the LAN `exp://` URL with `simctl` bypassed the previously blocked macOS handoff
prompt. The journey then used native iOS controls, not a browser surface:

1. Completed all three Hebrew onboarding screens, accepted the educational disclaimer, and selected
   a 15-minute daily goal.
2. Opened the first lesson and submitted all five deterministic exercises. Four were fully correct;
   the selection exercise scored `2/3` because the automation missed the duration checkbox. The
   lesson still completed truthfully with `4/5` and `93%`.
3. The native run exposed a React Native raw-text error for badges containing interpolated fragments.
   `Badge` now wraps all-text child arrays in `UiText`, and a regression test covers the lesson and
   hint label shapes. The lesson intro was rerun without a LogBox error.
4. Force-terminated Expo Go, reopened the same experience, observed restoration to the previous tab,
   then returned home and verified the completed first lesson and unlocked next lesson.
5. Read `chartpath.db` directly from the simulator container. It contained five append-only attempt
   rows, the accepted disclaimer, the 15-minute goal, and a completed `lesson-u00-scenarios`
   projection with all five exercise IDs. The update/delete rejection triggers were present.

This proves the iOS Expo Go UI path and device SQLite restart behavior on one simulator. It is not a
standalone-build, physical-device, screen-reader, Android, signing, or distribution claim.

## Required manual-journey matrix

The original request calls these manual journeys. The table below deliberately separates automated
evidence from human execution; component/domain coverage is not relabeled as a manual pass.

| Requested journey                                     | Automated evidence in this candidate                                       | Human/manual status                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Hebrew onboarding and first lesson                    | Production-export Playwright journey plus native iOS Expo Go simulator run | Agent-driven native run passed; human sign-off outstanding |
| Wrong answer, hint, misconception feedback, later try | Hint/feedback domain and UI tests; reviewed alternative feedback           | Full later-variant journey not manually executed           |
| Tap higher highs and higher lows                      | Seven-point draft/completion, undo, input, and coordinate-grader tests     | Gesture journey not manually executed                      |
| Draw and grade a support zone                         | Two-corner UI, normalization, tolerance, and scale-invariance tests        | Gesture journey not manually executed                      |
| Reject lookalike without a preceding trend            | Authored decision mapping/UI regression for `u05-reversal-e01`             | Not manually executed                                      |
| Wait for missing confirmation                         | Reviewed uncertainty rubrics and decision interaction tests                | Not manually executed                                      |
| Complete position sizing                              | Table-driven risk/cost/invalid-input tests and capstone risk UI            | Not manually executed                                      |
| Close/reopen without losing progress                  | Web reload E2E, repository reopen/migration tests, and iOS SQLite readback | Native iOS simulator force-quit/reopen passed              |
| Due concept appears in review                         | Deterministic review/daily-path tests                                      | Not manually executed                                      |
| Complete all 11 capstone stages                       | Aggregate domain, UI completion, persistence and malformed-answer tests    | Full human completion not executed                         |
| Dark, reduced motion, and large text                  | Production-export Playwright persistence plus screenshots                  | No VoiceOver/TalkBack or native largest-text run           |

These outstanding human journeys remain required before native distribution and before claiming a
completed manual QA pass. They do not block the declared local, automated web beta target.

## Visual and accessibility evidence

Screenshots were captured from the production static export, inspected at original resolution, and
checked for RTL order, clipped Hebrew, bilingual fragments, numeric direction, chart-label overlap,
contrast, and bottom-navigation obstruction:

- `docs/screenshots/onboarding-light-phone.png`
- `docs/screenshots/home-light-phone.png`
- `docs/screenshots/lesson-light-phone.png`
- `docs/screenshots/exercise-feedback-light-phone.png`
- `docs/screenshots/interactive-chart-light-phone.png`
- `docs/screenshots/settings-dark-large-phone.png`
- `docs/screenshots/home-light-tablet.png`
- `docs/screenshots/native-ios-disclaimer.png`
- `docs/screenshots/native-ios-lesson-intro.png`
- `docs/screenshots/native-ios-summary.png`
- `docs/screenshots/native-ios-restart-home.png`
- `docs/screenshots/native-ios-rtl-onboarding.png`
- `docs/screenshots/native-ios-rtl-clarification.png`
- `docs/screenshots/native-ios-rtl-chart.png`
- `docs/screenshots/native-ios-question-basis.png`
- `docs/screenshots/native-ios-chart-answer-evidence.png`

The inspection verified logical RTL navigation order, a right-edge back action, Hebrew sequence and
icon order, right-origin progress, and a rightmost home tab. Quantitative chart chronology remains
LTR; `DD/MM` dates, tickers, timeframes, numbers, and Latin terms are explicitly isolated. The chart
exercise image verifies mobile wrapping, learner instructions, progress, and accessible relative
placement controls. The settings image combines dark mode, very large text, and enabled reduced
motion.

Radio controls expose explicit `aria-checked`; charts have a concise, non-interpretive screen-reader
description. Ordinary and read-only charts provide an expandable OHLC row for every visible candle;
the OHLC label-placement assessment instead provides four relative-position controls so its
accessible path does not reveal the numeric answer key. Hollow/filled candle bodies provide a
non-color direction cue. Touch targets use a 44-point minimum; palette tests enforce WCAG AA
normal-text contrast; system font scaling remains enabled up to `2x`, and the in-app preference adds
bounded `1.15x`/`1.3x` scaling.

A native follow-up caught a Fabric-specific text-alignment mirror that was not present in the web
screenshots. The shared text primitive now maps logical alignment separately on native and web, and
the native root is explicitly configured as RTL. A cold Expo Go relaunch also restored the bundled
`RNSVGSvgView` registration; the current native images verify the logo and OHLCV chart without the
red unimplemented-component placeholder.

The two chart-relevance images additionally verify the learner-facing distinction between a written
case with no displayed graph and a direct chart task whose graph is explicitly named as answer
evidence.

Remaining accessibility work before native distribution is listed below; screenshots and automated
roles do not replace a manual VoiceOver/TalkBack pass.

## Content and financial-safety review

- The complete 87-page source was audited, including diagrams, glossary, disclaimers, chapter
  exercises, and printed-page/PDF-page offsets. The unchanged source is retained under
  `docs/sources/` and the detailed audit is in `docs/SOURCE_AUDIT.md`.
- Shipped exercises use original instructional wording, stable IDs, exact source references,
  progressive hints, misconception tags, reproducible chart specs, deterministic rubrics, and
  alternative-answer feedback.
- Content consistently separates observation, setup, confirmation, entry trigger, invalidation,
  execution, and outcome review. `wait`, `no-trade`, `reject`, and `insufficient-evidence` are valid
  professional answers.
- The product does not promise price direction, stop fill, target attainment, accuracy, safety, or
  profit. Examples mention spread, slippage, costs, gaps, liquidity, correlation, and leverage where
  relevant.
- All price series and ticker labels are synthetic. The application provides education, not
  personalized financial advice.

## Privacy and security review

- No credentials, tokens, personal data, account identifiers, telemetry SDKs, remote fetches, or
  brokerage/live-market integrations were found in application code or configuration.
- Guest progress stays locally in SQLite on native or local storage on web. Users can review the
  disclosure and delete all local data from settings.
- Android backup is disabled in Expo configuration. iOS backup exclusion is not configured or
  verified; the native SQLite container may be included in iCloud/device backup. The same distinction
  is disclosed beside the in-app local-data controls.
- SQLite writes use bound parameters, WAL, exclusive transactions, checksum-tracked migrations, and
  triggers that reject ordinary attempt updates/deletes.
- Stored values and imported catalog records are runtime validated; unsupported future schemas fail
  without overwriting the existing record.
- `pnpm audit --prod --json` reports one moderate advisory, `GHSA-w5hq-g745-h8pq`, in `uuid@7.0.3`
  reached only through Expo's `xcode` configuration/build tooling. It is not imported into the app's
  learning runtime and there are no high or critical findings. Overriding the major version would
  diverge from the current Expo SDK; track the fix through the Expo dependency line.

## Unresolved limitations and exact next steps

| Limitation                                                                                                                                     | Impact                                                                                                                                                 | Required next step                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| The iOS runtime journey was executed in Expo Go on one simulator, not in a standalone signed build or on physical hardware.                    | React Native UI and SQLite restart behavior are proven for that simulator, but standalone lifecycle, signing, and hardware behavior remain unverified. | Run the same journey in a release-profile standalone build on at least one physical iPhone.                                                          |
| No Android emulator/device was connected.                                                                                                      | Android Hermes bundle is verified, but the native Android UI and SQLite journey were not executed.                                                     | Run `pnpm --filter @chartpath/mobile android` on an emulator, complete the same restart journey, and attach evidence.                                |
| No manual VoiceOver or TalkBack pass was performed.                                                                                            | Automated roles, labels, contrast, motion, and font-scale coverage cannot prove real assistive-technology usability.                                   | Test onboarding, drawing, feedback, glossary, and settings with both screen readers and the largest OS text size.                                    |
| iOS backup exclusion is not configured or verified; only Android has `allowBackup: false`.                                                     | Local SQLite data may be incorporated into an iCloud/device backup according to platform and user settings.                                            | Set and verify the intended iOS backup policy in a native build, then disclose the confirmed behavior.                                               |
| The required manual journey matrix was not fully executed by a human; complex interactions currently have automated component/domain evidence. | Automated correctness does not establish gesture ergonomics, comprehension, or end-to-end human usability.                                             | Execute and record all 11 journeys on phone, including chart gestures, review, capstone, and accessibility variants.                                 |
| The Guided Analysis entry point rendered in Expo Go, but native input automation was unavailable in this environment.                          | The iOS bundle and Lab hub are native-rendered, but Guided pinch/pan and force-close/resume were not manually completed.                               | Complete a native Guided draft, force-quit/reopen it, and exercise pinch/pan on an interactable simulator or device.                                 |
| Guided-analysis drafts are local-only and have no cloud synchronization.                                                                       | A device loss or explicit local-data reset removes unfinished sessions; this milestone only guarantees the supported local repository.                 | Treat any future account/sync work as a separate privacy, security and conflict-resolution project.                                                  |
| The historical scenario is development-only, has zero course credit and retains four publication blockers.                                     | Focused engineering evidence does not establish redistribution rights, production publication, or independent educational approval.                    | Obtain explicit human licensing/procurement and editorial approval, then publish a new immutable dataset/scenario version only if every gate passes. |
| Historical replay was inspected and exercised in browser phone/tablet profiles, not with native assistive technology.                          | Browser roles and screenshots cannot prove VoiceOver/TalkBack, native focus, gestures, lifecycle resume, or largest OS text.                           | Execute the full historical journey on native iOS and Android with screen readers, largest text, reduced motion and force-close/reopen.              |
| No external learner study or editorial sign-off by a licensed financial educator was performed.                                                | The beta is technically and internally content-validated, not validated for learning outcomes or regulated use.                                        | Run a small beginner usability study and independent content/safety review before public distribution.                                               |
| No store signing, privacy form, production deployment, or device matrix was requested.                                                         | This is a local beta, not a distributable release candidate.                                                                                           | Treat distribution as a separate explicitly authorized release project.                                                                              |

## Release decision

The local web beta is a **GO**: its core journey, persistence, content, dynamic routes, responsive RTL
UI, dark/large-text settings, and deterministic learning logic are exercised end to end without
external services.

Native distribution remains **NO-GO** until the Android runtime journey, a standalone iOS build,
VoiceOver/TalkBack, signing, and a real-device matrix are verified. This boundary is deliberate and
must not be represented as an app-store-ready product.

## Chart Workbench Milestone 1 addendum

Verified on branch `codex/chart-workbench-foundation` on 2026-08-24. This addendum covers the new
interactive analysis surface; it does not revise the local-beta/native-distribution decision above.

| Check                          | Result                                                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline before implementation | `pnpm check` PASS with 186 tests; `pnpm build` PASS; `pnpm test:e2e:web` PASS 4/4; `git diff --check` PASS.                                                                                          |
| Pure workbench packages        | Domain 54/54 and chart engine 55/55 tests pass, including coordinate conversion, viewport bounds, drawing history, replay boundaries, and future-data isolation.                                     |
| Mobile/component suite         | 16 suites and 60/60 tests pass, including Chart Lab RTL/LTR, crosshair, precise input, replay, drawing history, deletion, clear confirmation, grading layers, reduced motion, and responsive layout. |
| Full repository check          | `pnpm check` PASS with 205 tests and all 60 reviewed exercises validated.                                                                                                                            |
| Package build                  | `pnpm build` PASS for domain, UI, chart engine, and content.                                                                                                                                         |
| Production web export          | PASS; 50 static routes including `/lab`.                                                                                                                                                             |
| Browser journeys               | PASS 6/6 with no retries on Pixel 7 and iPad Pro 11 Chromium profiles; the Lab journey opens from Home, draws the reviewed line through replay, zooms, submits, and receives deterministic feedback. |
| Native bundle exports          | PASS; iOS Hermes bundle emitted from 1,858 modules and Android Hermes bundle from 1,947 modules.                                                                                                     |
| Visual inspection              | PASS for 390×844 light, graded overlay, dark + largest in-app text + reduced motion, and 1024×768 light tablet captures.                                                                             |
| Diff integrity                 | `git diff --check` PASS.                                                                                                                                                                             |

The Lab uses `u03-levels-e04`, backed by physical PDF page 31 / printed page 18. It introduces no
new curriculum claim, external data, AI grading, paper trading, analytics, or network dependency.
Draft drawings are intentionally session-local. Native pinch/pan runtime behavior, physical-device
ergonomics, screen readers, and the largest operating-system text size were not executed and remain
unverified.

## Guided Analysis Milestone 2 addendum

Implemented on branch `codex/chart-workbench-foundation` on 2026-08-24. The feature reuses reviewed
capstone `u10-capstone-e03` and its shared `ta-he-v2` provenance: physical PDF pages 74–75, printed
book pages 61–62, Chapter 19 case C. No new technical-analysis doctrine, market data, execution,
brokerage, news, AI grading or tutoring was added.

At the Milestone 2 evidence point, the persistent payload was schema `3` and the native SQLite
migration set was version `2`; Milestone 3 supersedes them with payload `4` and SQLite migration `3`.
Active sessions autosave answers, exact replay position, learner candle/price annotations, hints,
current step and deterministic step results. Earlier-step edits explicitly invalidate that result and
every later submitted result. Restart/abandon keeps append-only attempts, malformed drafts enter an
explicit quarantine flow, and finalization atomically pairs one read-only session with one stable
attempt. Retrying the same allocation reads back the pair without duplicating XP or projection
effects.

| Check                          | Result                                                                                                                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline before implementation | `pnpm check` PASS with 205 tests; `pnpm build` PASS; `pnpm test:e2e:web` PASS 6/6; production web export PASS with 50 routes; `git diff --check` PASS.                                                                                                                       |
| Pure packages                  | Domain 96/96, chart engine 55/55, content 22/22 and UI 14/14 tests pass. Coverage includes lifecycle transitions, invalidation, stable serialization, replay/annotation cutoff isolation and content/generator compatibility.                                                |
| Mobile/component/persistence   | 20 suites and 82/82 tests pass. Coverage includes web/native repository parity, v1/v2 payload migration, SQLite migration/triggers, corrupt-draft quarantine, restart preservation, background flush, atomic/idempotent finalization, learning projections and read-only UI. |
| Full repository check          | `pnpm check` PASS with 269 tests and all 60 reviewed exercises validated.                                                                                                                                                                                                    |
| Package build                  | `pnpm build` PASS for domain, UI, chart engine and content.                                                                                                                                                                                                                  |
| Production web export          | PASS; 53 static routes, including `/lab`, `/workbench`, `/analysis` and `/analysis-history`.                                                                                                                                                                                 |
| Browser journeys               | PASS 10/10 with no retries on Pixel 7 and iPad Pro 11 Chromium profiles: existing journeys plus draft leave/resume, exact replay/annotation recovery, all-step finalization, idempotent reload, projection/XP assertion and history read-only reopen.                        |
| Native bundle exports          | PASS; iOS Hermes bundle emitted from 1,866 modules and Android Hermes bundle from 1,955 modules.                                                                                                                                                                             |
| Visual inspection              | PASS for ten original-resolution captures: nine `390×844` phone states and one `1024×768` tablet state, including dark + largest in-app text + reduced motion.                                                                                                               |
| Native runtime availability    | iPhone 17 Pro / iOS 26.5 / Expo Go 57.0.9 loaded the current 2,034-module native bundle and rendered the new `/lab` hub via deep link. Guided input, native restart, screen readers and largest OS text were not executed.                                                   |
| Diff integrity                 | `git diff --check` PASS.                                                                                                                                                                                                                                                     |

Native pinch/pan, a native Guided Analysis force-close/reopen, VoiceOver, TalkBack and the largest
operating-system text setting remain unverified manual gates. An Android Hermes bundle was produced,
but `adb devices` reported no connected emulator or device.

## Frozen Historical Replay Milestone 3 addendum

Implemented and verified on branch `codex/historical-replay-foundation` on 2026-08-24. This addendum
does not promote the internal scenario to published content or change the native-distribution NO-GO.

The historical-data package implements provider-neutral canonical schema version 1, deterministic
serialization, pure SHA-256, CSV import/normalization, data/scenario validation and knowledge-cutoff
views. The only installed dataset is the ChartPath-generated
`chartpath-generated-hourly-fixture@1.0.0-dev`: 96 hourly candles, one recorded gap, no corporate
actions, and canonical checksum
`sha256:07907f75988d2aba5f27d6c73bc596ad9f896452f37a8ba9a240b8ae285a144e`. It is not real
market data. No provider response, credential, SDK or runtime acquisition request is present.

The separate historical registry resolves one internal scenario against the unchanged reviewed
`u10-capstone-e03` content and reports zero course-credit eligibility plus four blockers:
`scenario-not-published`, `dataset-not-published`, `redistribution-not-verified`, and
`human-editorial-review-required`. These gates are authoritative. Databento and other researched
providers remain procurement candidates only; the official-source conclusions in
`docs/HISTORICAL_DATA_POLICY.md` do not grant rights.

Guided-session schema `2`, persistence payload `4`, and native SQLite migration `3` distinguish and
pin historical scenario/dataset/version/checksum evidence. The integrated Lab path preserves the
synthetic entry and adds an explicit internal historical entry. It keeps identity, exact dates and
future data out of the pre-final visual/accessibility projection; derives candles, annotations,
corporate actions, statistics and scale from the current cutoff-only prefix; and stores the current
cursor, monotonic maximum-seen cursor, annotation authorship and checkpoint snapshots. Exact resume
fails closed for `scenario-missing`, `dataset-missing`, `checksum-mismatch`, `metadata-mismatch`, or
`dataset-modified`; only `ready` is editable, and no state silently repairs, substitutes or repins
evidence.

After explicit finalization, the debrief and history are read-only and may reveal the generated
identity/provenance under the authored policy. Because the development scenario has learning credit
`none`, finalization creates no ordinary attempt and changes no mastery, review, lesson, XP, streak
or daily-activity projection. Blind mode is a learner UI/accessibility boundary, not adversarial
secrecy from application bundles or developer tools.

| Check                           | Current result                                                                                                                                                                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historical component/UI tests   | PASS, 18/18 across Lab entry/resume, session shell/recovery/final reveal, cutoff-only chart/authorship behavior, and history disclosure.                                                                                                                                      |
| Focused historical browser E2E  | PASS, 2/2 across the phone and tablet Chromium projects. The journey verifies blind entry, cursor/answer resume, finalization once, reveal/history, reload, and unchanged learning credit.                                                                                    |
| Historical data validation      | PASS; 96 generated candles, one recorded gap, checksum `sha256:07907f75988d2aba5f27d6c73bc596ad9f896452f37a8ba9a240b8ae285a144e`, development-only publication block.                                                                                                         |
| Historical registry validation  | PASS structurally; one dataset/scenario, zero course-credit eligible, four explicit publication blockers.                                                                                                                                                                     |
| Visual inspection               | PASS for ten web captures at original resolution: nine `390×844` phone states and one `1024×768` tablet state, including entry, blind/mid/resume, provenance status, reveal/debrief/history, dark + very large + reduced motion, and tablet layout.                           |
| Full repository check           | PASS; `pnpm check` completed formatting, lint, type checks, 413/413 tests and content validation in 37.53s. Test inventory: domain 125, historical-data 70, chart engine 57, content 35, UI 14 and mobile 112.                                                                |
| Package build                   | PASS; `pnpm build` completed domain, historical-data, UI, chart-engine and content builds.                                                                                                                                                                                    |
| Full browser suite              | PASS; 12/12 production-export journeys on Pixel 7 and iPad Pro 11 Chromium profiles, with zero failures, retries or duplicate learning credit.                                                                                                                                |
| Production web export           | PASS; 53 static routes, a 1,496-module server render bundle and a 970-module web bundle.                                                                                                                                                                                      |
| Native bundle exports           | PASS; iOS Hermes bundle emitted from 1,878 modules and Android Hermes bundle from 1,967 modules.                                                                                                                                                                              |
| Native historical smoke check   | PASS within stated scope; Expo Go 57.0.9 on the booted iPhone 17 Pro / iOS 26.5 simulator loaded the current 2,046-module native bundle and deep-linked to `/lab`, where the internal historical entry rendered in RTL dark/very-large state. Native input was not automated. |
| Diff integrity                  | PASS; `git diff --check`.                                                                                                                                                                                                                                                     |
| Native historical accessibility | **PENDING GATE.** VoiceOver, TalkBack, native largest text, gesture ergonomics, force-close/resume and physical-device coverage have not been established by browser evidence.                                                                                                |
| Human publication approval      | **BLOCKED.** Explicit market-data licensing/redistribution approval and independent Hebrew editorial, pedagogy, financial-safety and accessibility review are still required.                                                                                                 |

The ten screenshots were inspected at their original pixel dimensions for Hebrew RTL hierarchy,
explicit LTR isolation of checksum/dataset/date strings, clipping, overlap, chart chronology,
non-color status, blind-versus-revealed identity, reduced-motion copy, very-large text wrapping and
phone/tablet composition. This is visual browser evidence only; it is not a native gesture,
screen-reader, lifecycle or physical-device pass.

## Deterministic Paper Execution Milestone 4 addendum

Work was completed on branch `codex/paper-execution-foundation` from the Milestone 3 checkpoint
`a521fd481bbbca465674f5b7608af4d9c1360e18`. The branch is local-only. This addendum does not change
the native-distribution NO-GO or promote the generated historical fixture.

The normative mechanics are in `docs/PAPER_EXECUTION_POLICY.md`. In summary: a market entry uses the
next eligible candle open; limit and target fills use the exact submitted threshold without
favorable improvement; entry and protective-stop gaps use an adverse open; opening-threshold
evidence precedes range-only evidence; and unresolved stop/target or intrabar-entry/exit order
becomes ambiguous. The fixed v1 costs are a ten-basis-point total spread, five basis points adverse
slippage for market/stop fills, commission `max(1.00, 0.01 × quantity)`, `0.01` tick, whole units and
two-decimal currency rounding. Partial fills, order books, queue/liquidity inference and brokerage
behavior are not modeled.

The installed scenario is a special no-credit case: reviewed `u10-capstone-e03` concludes no trade.
Any short paper plan is an explicitly hypothetical mechanics exercise whose mismatch must remain
visible. It cannot change the finalized analysis, create an ordinary attempt or affect mastery,
review, lesson progress, XP, streak or daily activity.

### Baseline before Milestone 4 changes

| Check                 | Recorded result                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`          | PASS; 413/413 tests across 39 suites, plus content and historical validation.                                                  |
| `pnpm build`          | PASS for domain, historical-data, UI, chart-engine and content.                                                                |
| Web browser suite     | PASS after confirming a pre-existing lesson-navigation race; isolated rerun and final full rerun passed 12/12 with no retries. |
| Production web export | PASS; 53 routes.                                                                                                               |
| iOS export            | PASS; Hermes bundle and assets emitted.                                                                                        |
| Android export        | PASS; Hermes bundle and assets emitted.                                                                                        |
| Diff integrity        | PASS; clean baseline and `git diff --check`.                                                                                   |

### Milestone 4 final gates

Verification was rerun from the final implementation on 2026-08-24. Passing automated and visual
evidence below does not change the native-distribution NO-GO or promote the generated fixture.

| Gate                               | Recorded result                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain/policy tests                | **PASS.** The final domain run contributed 167/167 tests across seven suites, including deterministic market/limit/stop behavior in both directions, gaps, no-improvement, costs/rounding, cancellation/expiration, ambiguity and numeric boundaries.                                    |
| Replay isolation/idempotency       | **PASS.** Tests establish sequential cutoff-only candle processing, equivalent batch/step progression, idempotent identical repeats, and rejection of changed or skipped candles.                                                                                                        |
| Persistence/recovery               | **PASS.** The final mobile run contributed 132/132 tests across 26 suites; focused persistence coverage passed 31 tests across four suites for lifecycle reload, exact identity/version recovery, quarantine/reset, append-only events and zero duplicate credit.                        |
| Hebrew UI/component accessibility  | **PASS WITH MANUAL NATIVE GATES OPEN.** Fourteen UI tests and 23 focused paper-execution screen tests cover progressive confirmation, validation, Hebrew labels, explicit LTR isolation, non-color overlay semantics and the accessible immutable event list.                            |
| Browser E2E                        | **PASS.** `pnpm test:e2e:web` passed 18/18 journeys in 3.2 minutes with no failures or retries across Pixel 7 and iPad projects, including market-to-gap-stop debrief, working-order reload/idempotency and same-candle ambiguity.                                                       |
| Full `pnpm check` / build          | **PASS.** `pnpm check` passed 486/486 tests across 43 suites: domain 167, historical 81, UI 14, chart-engine 57, content 35 and mobile 132; 60/60 content records and one capstone validated. `pnpm build` passed all packages.                                                          |
| Historical validation              | **PASS.** `pnpm historical:validate` validated 96 generated candles, one recorded gap and checksum `sha256:07907f75988d2aba5f27d6c73bc596ad9f896452f37a8ba9a240b8ae285a144e`; the registry remains one scenario, zero credit and five publication blockers.                              |
| Web/iOS/Android exports            | **PASS AS BUNDLE EVIDENCE.** Web export emitted 54 routes and 76 files (4,908,845 bytes); iOS emitted 25 files/23 assets (5,347,612 bytes, 1,882 modules); Android emitted 29 files/27 assets (6,519,544 bytes, 1,971 modules). Exports are not device-interaction evidence.             |
| Original-resolution visual set     | **PASS FOR BROWSER PRESENTATION.** Eight final-export images were inspected at original resolution: seven `390×844` phone captures and one `1024×768` tablet capture. RTL/LTR hierarchy, clipping, chronology, progressive state, non-color cues, contrast and responsive layout passed. |
| Native smoke                       | **LIMITED PASS.** Expo Go 57.0.9 on an iPhone 17 Pro iOS 26.5 simulator bundled 2,050 native modules and deep-linked to the paper-execution route. The expected Hebrew RTL fail-closed recovery screen rendered; this did not exercise the full execution lifecycle.                     |
| VoiceOver/TalkBack/physical device | **PENDING GATE.** Neither screen-reader focus/speech nor a physical-device run was performed. Native largest OS text, gestures, force-close/reopen recovery and ergonomics remain unverified.                                                                                            |
| Human publication/editorial review | **BLOCKED.** Fixture licensing/publication plus independent Hebrew, source, pedagogy, financial-safety and accessibility approval remain absent.                                                                                                                                         |

The final visual inspection covered exact dimensions, Hebrew RTL hierarchy, LTR prices/quantities,
clipping and wrapping, chart chronology, planned-versus-actual fill distinction, line/shape/text
status independent of color, dark contrast, very-large in-app text, reduced-motion state and
phone/tablet composition. The exact files are recorded in `docs/screenshots/README.md`.

## Curated Scenario Library and Native Readiness Milestone 5 addendum

Core implementation is committed on local branch `codex/curated-scenarios-native-readiness` from
the completed Milestone 4 checkpoint `f196abe37870fec1f245ad4a835d17148e54d513`. The exact clean
final HEAD is reported in the milestone handoff because a commit cannot embed its own resulting
hash. This addendum does not change the native-distribution NO-GO and does not promote an internal
candidate into learner content.

### Implemented boundary

`packages/content/src/scenarios` now owns authoring schema 1, `scenario-compiler-v1`, its
checksum-pinned neutral learner/grader contract, deterministic chart/dataset generation, exact
source/content prerequisites, private grading exercises, learner-safe exercise projections, exact
execution snapshots, lifecycle/review fingerprints and human/machine-readable reports.

The internal registry contains nine candidates: three long, three short and three no-trade. It
covers guided, independent and blind support; market, limit and stop entry; an opening gap;
protective-stop, target and unfilled outcomes; and explicit OHLCV ambiguity. The current report has
zero structural errors and 97 publication blockers. Every candidate remains ChartPath-generated,
internal, no-credit and human-review-required. The third literal no-trade candidate retains its
specific source/rubric-review blocker.

Learner selection uses a distinct published-only projection. Because no candidate is published, the
ordinary `/historical-scenarios` library is correctly empty. `/historical-scenario-qa?developer=1`
is a visibly labelled internal QA route; it separates neutral pre-reveal cards from a deliberate
reviewer detail action that exposes exact source, checksum, rubric, expected outcome and blockers.
The route is unavailable without its developer gate.

The application decision contract treats no trade as a complete, rationale-bearing result. A
matching no-trade analysis finalizes to process review without opening a paper ticket, order or
position and without hindsight regrading. Trade candidates enter paper execution only through their
exact finalized analysis and allowed direction/order type. All internal paths preserve zero ordinary
attempt/mastery/review/lesson/XP/streak/activity mutation.

Approved or published manifests require current approval in seven scopes—source, rubric, execution,
accessibility, Hebrew, financial safety and publication—against the exact material checksum.
Reviewer-record IDs must be supplied by an external authenticated authority; the compiler cannot
authenticate a human. Records are ordered by the instant from `Date.parse`, and
`changes-requested` deterministically supersedes an earlier approval or wins an equal-instant tie.
Material changes stale prior approval; published corrections require a new immutable version.

### Baseline note

The branch began clean at `f196abe37870fec1f245ad4a835d17148e54d513`. During parallel baseline
work, formatting, lint, typecheck, content validation and historical validation passed, but one
unchanged content test exceeded its five-second Vitest timeout twice under heavy shared-workspace
contention before the mobile suite could run. It was a timeout rather than an assertion difference.
The final uncontended repository check below is the authoritative Milestone 5 result.

### Milestone 5 final gates

| Gate                               | Recorded result                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scenario validation/report         | **PASS.** Nine candidates (three long / three short / three no-trade), zero structural errors, 97 explicit publication blockers and no publishable candidate. Human-readable validation, canonical machine report and neutral preview commands complete deterministically.                                                                                                        |
| Source and learner-data separation | **PASS IN AUTOMATION.** Exact reviewed content/source pins, compiler-contract fingerprinting, private grading versus learner DTO separation, cutoff-safe preview serialization and answer/identity leak tests pass. This is not a human source or accessibility approval.                                                                                                         |
| No-trade and execution integration | **PASS IN AUTOMATION.** Tests cover rationale-bearing no trade with no paper session/order/position, deterministic process review, no hindsight/P&L grading, aligned long/short execution, exact event/debrief snapshots and isolation of the legacy hypothetical mechanics path.                                                                                                 |
| Persistence and credit isolation   | **PASS IN AUTOMATION.** Existing checksum-pinned Guided/paper repositories are reused; tests cover exact version resolution, resume, idempotent retry, no duplicate events and no ordinary attempt/projection changes for internal candidates. Full native terminate/relaunch remains open.                                                                                       |
| Full `pnpm check` / build          | **PASS.** Formatting, lint, all workspace typechecks, content validation and build passed. 51 suites / 546 tests passed: domain 180, historical-data 98, UI 14, chart-engine 57, content 45, mobile 152. Two known non-failing overlapping React `act()` warnings remained. An earlier load-only five-second timeout passed immediately in isolation and in the clean full rerun. |
| Production and QA browser E2E      | **PASS.** Production export: 16/16 across Chromium phone/tablet profiles in 41.7s. Explicit development QA: 16/16 across Pixel 7 and iPad Pro 11 profiles in 8.5m, including long, short, no-trade, working/unfilled, gap, ambiguity, exact reload and profit-independent grading.                                                                                                |
| Web/iOS/Android exports            | **PASS AS BUNDLE EVIDENCE.** Web: 56 routes, 1,510 server modules, 1,462 web modules, 78 files / 5,046,775 bytes (JS 3,782,593; CSS 397). iOS: 1,894 modules, 23 assets, 25 files / 5,425,349 bytes (Hermes 5,400,623). Android: 1,983 modules, 27 assets, 29 files / 6,598,035 bytes (Hermes 5,610,467). Native exports emitted only the known `NO_COLOR`/`FORCE_COLOR` warning. |
| Original-resolution visual set     | **PASS FOR BROWSER PRESENTATION.** Twelve inspected captures: 11 phone images at `390×844` and one tablet image at `1024×768`. They cover empty ordinary selection, guided long, blind short, no-trade decision/debrief, plan confirmation, working order, ambiguity, QA blockers, dark mode and largest in-app text/reduced motion.                                              |
| Native scenario lifecycle          | **BLOCKED / NOT RUN.** Expo Go `57.0.9` on iPhone 17 Pro / iOS `26.5` routed the exact M5 deep link but activation timed out (`NSPOSIXErrorDomain Code=60`) before Metro received a bundle. Maestro `2.8.0` also failed because its XCTest driver socket never opened. No scenario UI or lifecycle pass is claimed.                                                               |
| Native SQLite read-only audit      | **PASS WITHIN LIMITED SCOPE.** `PRAGMA integrity_check=ok`; expected migrations 1–4/checksums and guard triggers present; payload schema 5, 21 existing attempts, zero analysis/paper sessions. Because no M5 session was created, this is not resume/idempotency evidence.                                                                                                       |
| Android runtime                    | **PENDING GATE.** No usable Android emulator/device was available. An Android Hermes export is bundle evidence only.                                                                                                                                                                                                                                                              |
| VoiceOver                          | **PENDING GATE.** No human VoiceOver focus/speech/action pass was performed for scenario selection, blind chart alternatives, decision, recovery or debrief.                                                                                                                                                                                                                      |
| TalkBack                           | **PENDING GATE.** No Android runtime or human TalkBack pass was available.                                                                                                                                                                                                                                                                                                        |
| Largest OS text / physical device  | **PENDING GATE.** Largest in-app text is covered in browser evidence; largest operating-system text, standalone builds and physical-device gestures/ergonomics were not exercised.                                                                                                                                                                                                |
| Human publication/editorial review | **BLOCKED.** No externally authenticated seven-scope approval, distribution decision or published registry entry exists. Automated checks and synthetic ownership do not close these gates.                                                                                                                                                                                       |

### Visual evidence

The exact files and inspection notes are recorded in `docs/screenshots/README.md`:

- `scenario-library-empty-light-phone.png`
- `scenario-library-empty-light-tablet.png`
- `scenario-guided-long-light-phone.png`
- `scenario-blind-short-light-phone.png`
- `scenario-no-trade-decision-light-phone.png`
- `scenario-no-trade-debrief-light-phone.png`
- `scenario-trade-plan-confirmation-light-phone.png`
- `scenario-working-order-light-phone.png`
- `scenario-ambiguity-light-phone.png`
- `scenario-qa-publication-blockers-light-phone.png`
- `scenario-library-empty-dark-phone.png`
- `scenario-guided-large-reduced-phone.png`
- `m5-native-expo-launch-timeout.png` — blocker evidence only; not a visual pass

Inspection at original resolution covered Hebrew RTL hierarchy, explicit LTR prices/identifiers,
clipping/wrapping, phone/tablet composition, non-color state labels, dark contrast, largest in-app
text, reduced motion and separation of ordinary learner content from internal QA. Browser images do
not establish native layout, screen-reader speech/focus, OS text scaling, lifecycle recovery or
physical-device ergonomics.

The native blocker capture is `1206×2622` and was inspected at original resolution. It contains only
the stalled black Expo foreground and iOS status bar, so it supports the activation-timeout record
and no ChartPath UI, RTL, layout, interaction, or accessibility claim.

### Milestone 5 release decision

The deterministic scenario-authoring and internal-QA foundation may be used for local engineering
and responsible human review. The ordinary scenario learner library remains empty and candidate
course credit remains disabled. Public scenario publication and native distribution remain
**NO-GO** until external human approval, publication licensing, full native iOS/Android lifecycle,
VoiceOver, TalkBack, largest OS text, standalone build and physical-device gates are recorded.

## Position Management and Trade Journal Milestone 6 addendum

Milestone 6 starts from the completed Milestone 5 checkpoint and remains an internal, synthetic,
no-credit engineering foundation. It does not publish a scenario, route real orders, consume
live/delayed market data, connect a brokerage, recommend an action or validate a trading strategy.

### Implemented boundary

- Pure schema-1 management aggregate and `position-management-policy-v1`, bound to one exact open
  paper handoff and scenario-pinned permission/rubric.
- Cutoff N actions eligible exactly on N+1; replacement-before-opening-threshold order; explicit
  voluntary/opening and stop/target ambiguity; completed-open rather than forced liquidation.
- Full/partial voluntary exits, scale-in, manual protective-stop replacement and manual target
  replacement. Automatic trailing is intentionally deferred.
- Frozen original 1R; safe-integer minor/tick/quantity accounting; immutable lots and FIFO realized
  slices; separate realized P&L, commissions and modeled execution costs.
- Append-only observations, automatic action rationales and reference-only corrections. Process
  rubric and P&L/future-outcome scoring remain separate.
- Three internal management variants derived from exact Milestone 5 identities, with expected action
  cases/snapshots, strict parsing, material checksums, no course credit and seven open human review
  scopes. Original no-trade, unfilled and unauthorized scenarios fail closed.
- Persistence payload schema 6 plus SQLite migration 5,
  `create_position_management_and_journal`, checksum
  `sha256:ddfdc6589ba3ea48862156293c60bb904a3a781fd4c3a73400a193fd1d25eb8a`. Repository and SQLite
  enforce exact ancestry, one logical handoff, revision/prefix integrity, terminal immutability,
  append-only journal mirrors and explicit quarantine.
- Hebrew-first mobile management, risk-preview, pending-action, journal, timeline, summary and
  debrief surfaces consume pure cutoff-safe projections. They do not recalculate authority,
  accounting or assessment.

### Source and mechanics boundary

Reviewed doctrine is pinned to physical PDF pages 51, 54, 59 and 62–79, corresponding to printed
pages 38, 41, 46 and 49–66, with relevant Unit 8 risk material and `u10-capstone-e05`. It supports
planning, invalidation, risk, evidence-based manual management and process review. N/N+1 timing,
replacement precedence, adverse fills, integer rounding, FIFO allocation, checksums, SQLite layout
and ambiguity states are neutral simulator mechanics, not claims sourced from the book.

### Final Milestone 6 evidence

| Gate                                                                                  | Milestone 6 result                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Branch and implementation/evidence checkpoint                                         | `codex/position-management-journal` at `7cb8dd2`; the documentation commit and final clean HEAD are reported in the handoff.                                                                                                                                                   |
| Baseline and final `pnpm check`                                                       | **PASS.** Baseline 51 suites/546 tests. Final 57 suites/623 tests in 83.57 seconds, with formatting, lint, typecheck and content validation green. Two known non-failing overlapping React `act()` warnings remain.                                                            |
| Historical/scenario strict validation and reports                                     | **PASS.** Historical 96 candles/one gap/five blockers/checksum `sha256:07907f…a144e`. Nine candidates, zero structural errors, 97 blockers; three management variants/13 reducer cases/39 more blockers; strict envelopes pass. Report/preview repeat at 47,380/160,582 bytes. |
| Production and developer-QA browser journeys                                          | **PASS.** Production 16/16 in 38.43 seconds; full QA 40/40 in 11.0 minutes; four workers, zero retries. Focused management portion 24/24 across phone/tablet.                                                                                                                  |
| Web export                                                                            | **PASS.** 56 routes, 1,444 server/1,473 browser modules, 78 files, 5,256,875 bytes.                                                                                                                                                                                            |
| iOS export                                                                            | **PASS AS BUNDLE EVIDENCE.** 1,905 modules, 23 assets, 25 files, 5,699,979 bytes.                                                                                                                                                                                              |
| Android export                                                                        | **PASS AS BUNDLE EVIDENCE.** 1,994 modules, 27 assets, 29 files, 6,873,653 bytes.                                                                                                                                                                                              |
| Focused management domain/content/persistence/UI tests                                | **PASS.** 77 additional deterministic assertions are included in the final package totals; the focused browser matrix adds 24 journeys.                                                                                                                                        |
| Original-resolution management screenshots                                            | **PASS FOR BROWSER VISUAL SCOPE.** 13 inspected files: twelve `390×844` phone captures and one `1024×768` tablet capture; light/dark, large in-app text/reduced motion, overlays, journal, ambiguity and debrief are covered.                                                  |
| Native iOS management lifecycle                                                       | **PARTIAL PASS.** Expo Go on iPhone 17 Pro/iOS 26.5 loaded the exact QA route, submitted a pending partial exit, restored it after termination/relaunch and executed one N+1 fill. The terminal debrief was not reached.                                                       |
| Native payload schema 6 / migration 5 / SQLite integrity                              | **PASS.** `integrity_check=ok`; migrations 1–5 and checksums exact; direct migration readback required no further migration; zero management quarantines.                                                                                                                      |
| Native no-credit/no-duplicate readback                                                | **PASS FOR THE BOUNDED RUN.** Revision 3, open quantity 9, one fill/four events, one management row/one journal row, `learning_credit=none`; existing 21 attempts/366 XP unchanged by management.                                                                              |
| Android runtime / TalkBack                                                            | **BLOCKED LOCALLY.** No SDK, emulator or device; export is not runtime evidence.                                                                                                                                                                                               |
| VoiceOver / largest OS text / increased contrast                                      | **NOT RUN — OPEN GATE.**                                                                                                                                                                                                                                                       |
| Physical-device and signed standalone builds                                          | **NOT RUN — OPEN GATE.** The paired iPhone did not have ChartPath/Expo installed.                                                                                                                                                                                              |
| External human source/rubric/execution/accessibility/Hebrew/safety/publication review | **BLOCKED.** No authenticated approval records; all seven management review scopes remain open.                                                                                                                                                                                |

The practical M5 activation blocker was cleared for the bounded M6 run by using the host LAN Metro
address and the exact simulator UDID. The evidence does not prove one exclusive cause for the old
Code 60 failure, and it does not convert the incomplete native/assistive-technology matrix into a
distribution pass.

### Milestone 6 release decision

Milestone 6 is complete as a local internal/no-credit engineering checkpoint. Ordinary management
publication, course credit and native distribution remain **NO-GO** until every applicable native,
assistive-technology, physical-device and human-review gate passes.
