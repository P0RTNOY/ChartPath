# ChartPath beta release readiness

Updated: 2026-08-24 (Asia/Jerusalem)

This record distinguishes the verified local beta from native distribution readiness. It does not
claim app-store, production, or human-learning validation.

## Candidate identity

| Field                      | Value                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Product version            | `0.1.0`                                                                                |
| Content version            | `2026.08-beta.1`                                                                       |
| Content schema             | `1`                                                                                    |
| Persistence schema         | `2`                                                                                    |
| Branch                     | `main`                                                                                 |
| Foundation commit          | `f394380`                                                                              |
| Catalog commit             | `1e194e0`                                                                              |
| Mobile commit              | `f928497`                                                                              |
| Journey-evidence commit    | `3bc11d4`                                                                              |
| Integrity-hardening commit | `dc992bd`                                                                              |
| Source PDF SHA-256         | `25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`                     |
| Verified runtime           | Static Expo web export in Chromium plus Expo Go on an iPhone 17 Pro iOS 26.5 simulator |
| Bundle-verified targets    | Expo iOS and Android Hermes bundles                                                    |
| Decision                   | **GO for the local web beta; NO-GO for native distribution**                           |

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
- Static pages are generated for every unit and lesson so supported web deep links survive refresh.
- No authentication, cloud sync, analytics, live-market requests, brokerage connection, production
  service, or API key is required by the core journey.

## Command evidence

All commands were run from the repository root on macOS with Node `v22.23.2` and pnpm `11.21.0`.

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

| Limitation                                                                                                                                     | Impact                                                                                                                                                 | Required next step                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| The iOS runtime journey was executed in Expo Go on one simulator, not in a standalone signed build or on physical hardware.                    | React Native UI and SQLite restart behavior are proven for that simulator, but standalone lifecycle, signing, and hardware behavior remain unverified. | Run the same journey in a release-profile standalone build on at least one physical iPhone.                                |
| No Android emulator/device was connected.                                                                                                      | Android Hermes bundle is verified, but the native Android UI and SQLite journey were not executed.                                                     | Run `pnpm --filter @chartpath/mobile android` on an emulator, complete the same restart journey, and attach evidence.      |
| No manual VoiceOver or TalkBack pass was performed.                                                                                            | Automated roles, labels, contrast, motion, and font-scale coverage cannot prove real assistive-technology usability.                                   | Test onboarding, drawing, feedback, glossary, and settings with both screen readers and the largest OS text size.          |
| iOS backup exclusion is not configured or verified; only Android has `allowBackup: false`.                                                     | Local SQLite data may be incorporated into an iCloud/device backup according to platform and user settings.                                            | Set and verify the intended iOS backup policy in a native build, then disclose the confirmed behavior.                     |
| The required manual journey matrix was not fully executed by a human; complex interactions currently have automated component/domain evidence. | Automated correctness does not establish gesture ergonomics, comprehension, or end-to-end human usability.                                             | Execute and record all 11 journeys on phone, including chart gestures, review, capstone, and accessibility variants.       |
| Partial capstone answers live only while the exercise screen remains open; only the complete 11-step answer is persisted.                      | Leaving a long capstone before completion loses its draft stages, though no completed attempt is lost.                                                 | Add versioned capstone-draft persistence before a broader learner beta, or retain the current explicit in-product warning. |
| No external learner study or editorial sign-off by a licensed financial educator was performed.                                                | The beta is technically and internally content-validated, not validated for learning outcomes or regulated use.                                        | Run a small beginner usability study and independent content/safety review before public distribution.                     |
| No store signing, privacy form, production deployment, or device matrix was requested.                                                         | This is a local beta, not a distributable release candidate.                                                                                           | Treat distribution as a separate explicitly authorized release project.                                                    |

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
