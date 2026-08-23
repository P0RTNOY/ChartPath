# ChartPath beta release readiness

Updated: 2026-08-23 (Asia/Jerusalem)

This record distinguishes the verified local beta from native distribution readiness. It does not
claim app-store, production, or human-learning validation.

## Candidate identity

| Field                      | Value                                                                |
| -------------------------- | -------------------------------------------------------------------- |
| Product version            | `0.1.0`                                                              |
| Content version            | `2026.08-beta.1`                                                     |
| Content schema             | `1`                                                                  |
| Persistence schema         | `2`                                                                  |
| Branch                     | `main`                                                               |
| Foundation commit          | `f394380`                                                            |
| Catalog commit             | `1e194e0`                                                            |
| Mobile commit              | `f928497`                                                            |
| Journey-evidence commit    | `3bc11d4`                                                            |
| Integrity-hardening commit | `dc992bd`                                                            |
| Source PDF SHA-256         | `25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`   |
| Verified runtime           | Static Expo web export in Chromium, Pixel 7 and iPad Pro 11 profiles |
| Bundle-verified targets    | Expo iOS and Android Hermes bundles                                  |
| Decision                   | **GO for the local web beta; NO-GO for native distribution**         |

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
  learner records staged updates through the decision window.
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

| Check                                   | Command                                                                                         | Result                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Frozen install                          | `pnpm install --frozen-lockfile`                                                                | PASS; lockfile unchanged                                                         |
| Formatting, lint, types, tests, content | `pnpm check`                                                                                    | PASS                                                                             |
| Package builds                          | `pnpm build`                                                                                    | PASS for domain, chart engine, content, and UI                                   |
| Unit/integration inventory              | included in `pnpm check`                                                                        | 174 tests: domain 48, chart 48, content 20, UI 12, mobile/persistence/UI 46      |
| Catalog validation                      | `pnpm content:validate`                                                                         | PASS; exact inventory printed and quotas satisfied                               |
| Web export                              | `pnpm --filter @chartpath/mobile export:web`                                                    | PASS; 49 static routes, including every dynamic unit/lesson path                 |
| Browser journeys                        | `pnpm test:e2e:web`                                                                             | PASS; 4/4 on phone and tablet Chromium projects, no retries                      |
| Expo dependency alignment               | `pnpm --filter @chartpath/mobile exec expo install --check`                                     | PASS; dependencies up to date                                                    |
| Expo project health                     | `pnpm dlx expo-doctor@latest apps/mobile`                                                       | PASS; 21/21 checks                                                               |
| iOS bundle                              | `pnpm --filter @chartpath/mobile exec expo export --platform ios --output-dir dist-ios`         | PASS; 1,405 modules, Hermes bundle emitted                                       |
| Android bundle                          | `pnpm --filter @chartpath/mobile exec expo export --platform android --output-dir dist-android` | PASS; 1,535 modules, Hermes bundle emitted                                       |
| Production dependency audit             | `pnpm audit --prod --audit-level high`                                                          | PASS gate: 0 high, 0 critical; one moderate build-tool advisory documented below |
| Diff integrity                          | `git diff --check`                                                                              | PASS                                                                             |

The 174-test inventory excludes the four browser journeys. Together the automated candidate evidence
contains 178 passing tests/journeys.

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

## Required manual-journey matrix

The original request calls these manual journeys. The table below deliberately separates automated
evidence from human execution; component/domain coverage is not relabeled as a manual pass.

| Requested journey                                     | Automated evidence in this candidate                                    | Human/manual status                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| Hebrew onboarding and first lesson                    | Production-export Playwright journey on phone and tablet                | Screenshots inspected; no native human run       |
| Wrong answer, hint, misconception feedback, later try | Hint/feedback domain and UI tests; reviewed alternative feedback        | Full later-variant journey not manually executed |
| Tap higher highs and higher lows                      | Coordinate grader and accessible-input coverage                         | Gesture journey not manually executed            |
| Draw and grade a support zone                         | Zone tolerance and scale-invariance tests                               | Gesture journey not manually executed            |
| Reject lookalike without a preceding trend            | Authored decision mapping/UI regression for `u05-reversal-e01`          | Not manually executed                            |
| Wait for missing confirmation                         | Reviewed uncertainty rubrics and decision interaction tests             | Not manually executed                            |
| Complete position sizing                              | Table-driven risk/cost/invalid-input tests and capstone risk UI         | Not manually executed                            |
| Close/reopen without losing progress                  | Web reload E2E plus repository reopen/migration tests                   | Native force-quit/reopen not executed            |
| Due concept appears in review                         | Deterministic review/daily-path tests                                   | Not manually executed                            |
| Complete all 11 capstone stages                       | Aggregate domain, UI completion, persistence and malformed-answer tests | Full human completion not executed               |
| Dark, reduced motion, and large text                  | Production-export Playwright persistence plus screenshots               | No VoiceOver/TalkBack or native largest-text run |

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
- `docs/screenshots/settings-dark-large-phone.png`
- `docs/screenshots/home-light-tablet.png`

The inspection found and fixed RTL inheritance that clipped the chart's `VOL` label and first date.
Dates are now LTR-isolated and centered. Radio controls expose explicit `aria-checked`; charts have a
concise, non-interpretive screen-reader description. Ordinary and read-only charts provide an
expandable OHLC row for every visible candle; the OHLC label-placement assessment instead provides
four relative-position controls so its accessible path does not reveal the numeric answer key.
Hollow/filled candle bodies provide a non-color direction cue. Touch targets use a 44-point minimum;
palette tests enforce WCAG AA normal-text contrast; system font scaling remains enabled up to `2x`,
and the in-app preference adds bounded `1.15x`/`1.3x` scaling.

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

| Limitation                                                                                                                                                       | Impact                                                                                                                  | Required next step                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| The iOS Expo Go launch reached the system `Open in Expo Go?` confirmation on a headless booted simulator; the agent could not provide the required physical tap. | iOS bundle and configuration are verified, but the native UI journey and SQLite adapter were not runtime-proven on iOS. | On an interactive simulator, tap `Open`, run onboarding → first lesson → force-quit/reopen, and attach screenshots/logs.   |
| No Android emulator/device was connected.                                                                                                                        | Android Hermes bundle is verified, but the native Android UI and SQLite journey were not executed.                      | Run `pnpm --filter @chartpath/mobile android` on an emulator, complete the same restart journey, and attach evidence.      |
| No manual VoiceOver or TalkBack pass was performed.                                                                                                              | Automated roles, labels, contrast, motion, and font-scale coverage cannot prove real assistive-technology usability.    | Test onboarding, drawing, feedback, glossary, and settings with both screen readers and the largest OS text size.          |
| iOS backup exclusion is not configured or verified; only Android has `allowBackup: false`.                                                                       | Local SQLite data may be incorporated into an iCloud/device backup according to platform and user settings.             | Set and verify the intended iOS backup policy in a native build, then disclose the confirmed behavior.                     |
| The required manual journey matrix was not fully executed by a human; complex interactions currently have automated component/domain evidence.                   | Automated correctness does not establish gesture ergonomics, comprehension, or end-to-end human usability.              | Execute and record all 11 journeys on phone, including chart gestures, review, capstone, and accessibility variants.       |
| Partial capstone answers live only while the exercise screen remains open; only the complete 11-step answer is persisted.                                        | Leaving a long capstone before completion loses its draft stages, though no completed attempt is lost.                  | Add versioned capstone-draft persistence before a broader learner beta, or retain the current explicit in-product warning. |
| No external learner study or editorial sign-off by a licensed financial educator was performed.                                                                  | The beta is technically and internally content-validated, not validated for learning outcomes or regulated use.         | Run a small beginner usability study and independent content/safety review before public distribution.                     |
| No store signing, privacy form, production deployment, or device matrix was requested.                                                                           | This is a local beta, not a distributable release candidate.                                                            | Treat distribution as a separate explicitly authorized release project.                                                    |

## Release decision

The local web beta is a **GO**: its core journey, persistence, content, dynamic routes, responsive RTL
UI, dark/large-text settings, and deterministic learning logic are exercised end to end without
external services.

Native distribution remains **NO-GO** until both native runtime journeys, SQLite restart behavior,
VoiceOver/TalkBack, signing, and a real device matrix are verified. This boundary is deliberate and
must not be represented as an app-store-ready product.
