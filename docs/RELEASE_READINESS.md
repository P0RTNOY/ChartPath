# ChartPath Beta Release Readiness

> Living verification record. This document starts from zero trust: a capability is **Not Yet Verified** until reproducible evidence is recorded here. A checked box without evidence is not sufficient.

## Release snapshot

| Field                              | Value                                |
| ---------------------------------- | ------------------------------------ |
| Candidate version                  | `TBD`                                |
| Commit SHA                         | `TBD`                                |
| Branch                             | `TBD`                                |
| Verification started               | `TBD`                                |
| Verification completed             | `TBD`                                |
| Verifier(s)                        | `TBD`                                |
| Supported local targets            | `TBD`                                |
| Supported device/OS/browser matrix | `TBD`                                |
| Content version                    | `TBD`                                |
| Schema version                     | `TBD`                                |
| Release decision                   | **NOT READY — no evidence recorded** |

## Status definitions

- **Not Yet Verified** means the work may be absent, incomplete, or implemented but has not passed the required check against the candidate commit.
- **Verified** means a named verifier ran the stated check against the candidate commit, recorded the dated result, and linked an artifact or durable log where applicable.
- **External / Future** means the capability is intentionally outside this beta and must not be represented as available. It is not a release blocker unless beta behavior accidentally depends on it.
- **Blocked by environment** is not the same as Verified. It may be recorded only with the exact command, complete failure, environment details, product impact, owner, and next verification step. A product defect must not be relabeled as an environment limitation.

When a new candidate commit is selected, reset affected Verified items to Not Yet Verified and rerun them. Evidence from a different commit is historical context, not release evidence.

## Verified

No capabilities or checks are verified yet.

Move an item into this section only in addition to updating its source row below. Use this format:

| ID    | Verified capability/check | Candidate SHA | Evidence | Verified by | Date  |
| ----- | ------------------------- | ------------- | -------- | ----------- | ----- |
| `TBD` | `TBD`                     | `TBD`         | `TBD`    | `TBD`       | `TBD` |

## Not Yet Verified — beta capabilities

All rows in this section are initially release-blocking unless explicitly marked otherwise.

| ID     | Capability and acceptance criterion                                                                                                                                                                                                                                  | Status           | Evidence |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------- |
| CAP-01 | The application launches without fatal errors on every declared supported local target.                                                                                                                                                                              | Not Yet Verified | `TBD`    |
| CAP-02 | Hebrew onboarding includes safe expectations, educational/financial-risk disclosure, guest mode without mandatory registration, and daily-goal selection.                                                                                                            | Not Yet Verified | `TBD`    |
| CAP-03 | The home screen presents a visible learning path with prerequisites and unlock state.                                                                                                                                                                                | Not Yet Verified | `TBD`    |
| CAP-04 | A learner can open a unit and lesson, complete interactive exercises, receive immediate corrective feedback and progressive hints, finish the lesson, and see a truthful summary. No critical step is a placeholder.                                                 | Not Yet Verified | `TBD`    |
| CAP-05 | XP, streak, lesson completion, mastery, and conceptual accuracy are distinct values and are updated according to documented deterministic rules.                                                                                                                     | Not Yet Verified | `TBD`    |
| CAP-06 | The review queue prioritizes prerequisites, current lesson, due reviews, weak skills, and new material in the documented order; failed reviews become due appropriately.                                                                                             | Not Yet Verified | `TBD`    |
| CAP-07 | Glossary search works in Hebrew and English, including mixed-direction terminology.                                                                                                                                                                                  | Not Yet Verified | `TBD`    |
| CAP-08 | Progress, settings, theme, accessibility, reduced-motion, and developer content-catalog screens are functional and expose accurate state.                                                                                                                            | Not Yet Verified | `TBD`    |
| CAP-09 | At least four coherent beta units, twelve short lessons, and sixty reviewed exercises are available and pass content validation. Counts must come from the candidate content catalog, not a manual estimate.                                                         | Not Yet Verified | `TBD`    |
| CAP-10 | The catalog includes at least ten near-miss or ambiguous examples; at least ten exercises where wait, no trade, or insufficient evidence is correct; and at least ten risk or position-size exercises.                                                               | Not Yet Verified | `TBD`    |
| CAP-11 | One learner-completable capstone exercises all 11 steps in canonical order: Context, Structure, Level, Setup, Confirmation, Entry, Invalidation, Position size, Target, Management, Review.                                                                          | Not Yet Verified | `TBD`    |
| CAP-12 | Required trend, structure, level, confirmation, and invalidation chart interactions are usable and graded meaningfully, including input tolerances across supported screen sizes.                                                                                    | Not Yet Verified | `TBD`    |
| CAP-13 | Seeded synthetic OHLCV and ground-truth annotations are deterministic; OHLC values are internally valid; supported regimes, levels, volume behavior, breakouts, retests, failures, gaps, structures, ambiguous examples, and lookalikes are represented.             | Not Yet Verified | `TBD`    |
| CAP-14 | Generation, semantic annotations, rendering, and grading are separate concerns. Grading is deterministic and does not depend on runtime AI.                                                                                                                          | Not Yet Verified | `TBD`    |
| CAP-15 | At a decision candle `N`, visible data and grading use only candles through `N`; later candles cannot alter the validity of the submitted reasoning.                                                                                                                 | Not Yet Verified | `TBD`    |
| CAP-16 | Position sizing uses `account risk / (entry-stop distance + expected per-unit costs)` and rejects zero-distance, invalid-price, and invalid-risk input.                                                                                                              | Not Yet Verified | `TBD`    |
| CAP-17 | Mastery remains within its defined range; hint use, difficulty, misconceptions, and review performance affect it transparently; response time does not materially penalize accessibility or language needs.                                                          | Not Yet Verified | `TBD`    |
| CAP-18 | Attempts are append-only and last review, next due, interval, ease/stability, lapse count, mastery, and attempt history persist offline.                                                                                                                             | Not Yet Verified | `TBD`    |
| CAP-19 | A completed lesson remains complete after a full app restart, and content/version migrations preserve attempts and progress.                                                                                                                                         | Not Yet Verified | `TBD`    |
| CAP-20 | Published content has stable unique IDs, valid prerequisites and skill references, source references, Hebrew text, rubrics, explanations, reproducible chart expectations, reachable unlocks, and valid uncertainty answers for ambiguous exercises.                 | Not Yet Verified | `TBD`    |
| CAP-21 | The beta's core journey works offline and requires no AI key, live-market API, cloud account, brokerage connection, or production service.                                                                                                                           | Not Yet Verified | `TBD`    |
| CAP-22 | The curriculum and feedback consistently teach probabilistic, process-oriented analysis and distinguish observation, setup, confirmation, entry trigger, invalidation, and execution.                                                                                | Not Yet Verified | `TBD`    |
| CAP-23 | Important content meets the Hebrew RTL, bilingual rendering, contrast, touch-target, screen-reader, larger-text, dark-theme, and reduced-motion criteria below.                                                                                                      | Not Yet Verified | `TBD`    |
| CAP-24 | The complete authoritative PDF has been audited, including diagrams, exercises, glossary, disclaimers, and appendices; every shipped concept/exercise has page- or chapter-level traceability, and no source-backed claim is invented or copied at excessive length. | Not Yet Verified | `TBD`    |

## Command evidence

Run every applicable command from a clean install of the exact candidate commit. Replace placeholders with the repository's real scripts once defined; do not mark a row Verified while the command is still a placeholder. Store full logs under an agreed evidence location and link them here. Record the command's exit code and relevant counts, not merely “passed.”

| ID     | Check                                              | Exact command for candidate | Expected result                                                                                | Actual result / exit code | Evidence artifact | Status           |
| ------ | -------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------- | ----------------- | ---------------- |
| CMD-01 | Runtime/toolchain versions                         | `TBD`                       | Versions match documented prerequisites.                                                       | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-02 | Clean dependency install with lockfile enforcement | `TBD`                       | Exit 0; no lockfile drift.                                                                     | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-03 | Formatting check                                   | `TBD`                       | Exit 0; no files rewritten by the check.                                                       | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-04 | Lint                                               | `TBD`                       | Exit 0; no ignored release-blocking findings.                                                  | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-05 | Type checking                                      | `TBD`                       | Exit 0 in every workspace/package.                                                             | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-06 | Domain/unit tests                                  | `TBD`                       | Exit 0; no skipped release-critical tests.                                                     | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-07 | Chart generator property/parameterized tests       | `TBD`                       | Exit 0; seed determinism and invariants pass.                                                  | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-08 | Grader and risk table-driven tests                 | `TBD`                       | Exit 0; tolerance, uncertainty, future-data, costs, invalid inputs, and gap-risk cases pass.   | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-09 | Mastery and spaced-review tests                    | `TBD`                       | Exit 0; range and failed-review scheduling assertions pass.                                    | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-10 | Persistence and migration integration tests        | `TBD`                       | Exit 0; restart and migration fixtures preserve history and progress.                          | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-11 | UI/accessibility behavior tests                    | `TBD`                       | Exit 0; labels, RTL/LTR fragments, and reduced motion are covered.                             | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-12 | Published-content validation                       | `TBD`                       | Exit 0; all schema and catalog constraints pass; required counts are printed.                  | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-13 | Supported production build/export                  | `TBD`                       | Exit 0 for every declared supported target.                                                    | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-14 | Critical end-to-end suite                          | `TBD`                       | Exit 0 for every automated critical journey; no retries masking deterministic failures.        | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-15 | Dependency/security audit                          | `TBD`                       | No unresolved release-blocking known vulnerability; exceptions have risk acceptance and owner. | `TBD`                     | `TBD`             | Not Yet Verified |
| CMD-16 | Final diff and repository cleanliness              | `TBD`                       | Intended files only; generated secrets/build artifacts absent; candidate SHA recorded.         | `TBD`                     | `TBD`             | Not Yet Verified |

## Required manual journeys

Run all journeys on the candidate build with a fresh guest profile unless the setup says otherwise. Record target/device, theme, text size, locale, build SHA, tester, date, outcome, and screenshot/video/log references. A journey passes only if its complete acceptance criterion passes without developer intervention.

| ID    | Journey and acceptance criterion                                                                                                                                                                                  | Setup / required variants                                                                         | Evidence | Status           |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- | ---------------- |
| MJ-01 | A new Hebrew user completes onboarding and the first lesson. The disclosure is visible, guest mode requires no account, the daily goal is saved, feedback is understandable, and completion appears on the path.  | Fresh storage; default theme; supported phone target.                                             | `TBD`    | Not Yet Verified |
| MJ-02 | The learner answers incorrectly, requests a hint, receives feedback tied to the actual misconception rather than a generic error, then succeeds on a later variant without the answer being revealed prematurely. | Exercise with known misconception tag and progressive hint ladder.                                | `TBD`    | Not Yet Verified |
| MJ-03 | The learner identifies higher highs and higher lows by tapping chart points; selected points, correction, labels, and touch targets remain legible and operable.                                                  | Smallest supported phone and one larger viewport.                                                 | `TBD`    | Not Yet Verified |
| MJ-04 | The learner draws a support zone and receives tolerant but meaningful grading: reasonable near-boundary input passes, materially wrong placement fails with an explanation.                                       | At least two supported screen sizes.                                                              | `TBD`    | Not Yet Verified |
| MJ-05 | The learner rejects an attractive-looking reversal pattern because the required preceding trend is missing; feedback explains why context is required.                                                            | Known lookalike/near-miss seed.                                                                   | `TBD`    | Not Yet Verified |
| MJ-06 | The learner chooses wait because confirmation has not occurred; the app rewards process quality and does not imply a buy/sell signal or guaranteed outcome.                                                       | Pre-confirmation decision candle with future candles hidden.                                      | `TBD`    | Not Yet Verified |
| MJ-07 | The learner completes a position-size exercise using account risk, entry-stop distance, and expected per-unit costs; units, directionality, validation, and explanation are correct.                              | Include one fractional or cost-heavy case.                                                        | `TBD`    | Not Yet Verified |
| MJ-08 | After completing meaningful progress, the learner fully closes and reopens the app and sees the same completion, attempt history, mastery, streak/daily state, and settings.                                      | Offline; full process termination, not navigation only.                                           | `TBD`    | Not Yet Verified |
| MJ-09 | A due concept appears in a review session at the deterministic due time and its result updates review state without altering unrelated skills.                                                                    | Seeded clock/test profile with a due review.                                                      | `TBD`    | Not Yet Verified |
| MJ-10 | The learner completes the capstone across all 11 canonical steps on an unseen synthetic chart, including a valid no-trade/uncertainty path when evidence demands it; no future candle leaks into a decision.      | Fresh capstone attempt; record seed and decision candles.                                         | `TBD`    | Not Yet Verified |
| MJ-11 | The same critical screens remain usable in dark theme, reduced-motion mode, and a larger text setting, with no loss of content, controls, focus, chart meaning, or completion ability.                            | Run the critical path with all three settings enabled, plus targeted checks separately if needed. | `TBD`    | Not Yet Verified |

## Accessibility, RTL, and visual inspection

Capture screenshots of important Hebrew screens at minimum for onboarding/disclosure, learning path, lesson prompt, each chart interaction family, wrong-answer feedback with a hint, lesson summary, review queue, glossary, progress/mastery, settings, and the capstone. Include light and dark themes and the smallest supported viewport. Store the artifact index in `TBD`.

| ID     | Inspection criterion                                                                                                                                                                                         | Evidence | Status           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------- |
| VIS-01 | Page and component reading order is correct in RTL; focus order and screen-reader traversal follow the visual/logical order.                                                                                 | `TBD`    | Not Yet Verified |
| VIS-02 | English terms, tickers, numbers, formulas, OHLC values, timestamps, chart axes, and position-size expressions use explicit LTR isolation where required. Punctuation and parentheses do not jump or reverse. | `TBD`    | Not Yet Verified |
| VIS-03 | Hebrew copy is not clipped, truncated, overlapped, or forced into unreadable lines at the largest supported text size and smallest supported viewport.                                                       | `TBD`    | Not Yet Verified |
| VIS-04 | Chart labels, annotations, tooltips, selected points, zones, candles, axes, and feedback do not overlap in ways that obscure meaning.                                                                        | `TBD`    | Not Yet Verified |
| VIS-05 | Important text, controls, focus indicators, charts, and states meet at least WCAG AA contrast in light and dark themes. Record measured color pairs and ratios; visual judgment alone is insufficient.       | `TBD`    | Not Yet Verified |
| VIS-06 | Correctness, direction, risk, and state are not conveyed by red/green or color alone; text, icon, pattern, shape, or position supplies a second cue.                                                         | `TBD`    | Not Yet Verified |
| VIS-07 | Interactive controls have accessible names, roles, states, and sufficiently large touch targets; chart gestures have an accessible non-gesture alternative where needed.                                     | `TBD`    | Not Yet Verified |
| VIS-08 | Screen-reader announcements make prompts, selections, feedback, hint state, validation errors, and progress changes understandable without viewing the chart.                                                | `TBD`    | Not Yet Verified |
| VIS-09 | Reduced-motion mode suppresses nonessential animation while retaining necessary state feedback; no timed motion blocks task completion.                                                                      | `TBD`    | Not Yet Verified |
| VIS-10 | Keyboard/focus behavior is visible, ordered, and non-trapping on supported targets; zoom/orientation/responsive layouts remain usable where supported.                                                       | `TBD`    | Not Yet Verified |
| VIS-11 | Loading, empty, offline, invalid-content, and recoverable-error states are localized, actionable, and visually stable.                                                                                       | `TBD`    | Not Yet Verified |
| VIS-12 | Visual feedback is original, restrained, and encouraging without copying another product or using casino/gambling cues.                                                                                      | `TBD`    | Not Yet Verified |

### Screenshot evidence index

| Screen / state | Target and viewport | Theme / text / motion | Artifact path | Inspector notes | Status           |
| -------------- | ------------------- | --------------------- | ------------- | --------------- | ---------------- |
| `TBD`          | `TBD`               | `TBD`                 | `TBD`         | `TBD`           | Not Yet Verified |

## Privacy, security, and financial-language audit

This audit covers shipped code, content, local storage, logs, analytics configuration, permissions, dependencies, generated artifacts, and screenshots. Record file/search references or runtime evidence for every result.

| ID      | Audit criterion                                                                                                                                                                                               | Evidence / disposition | Status           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------- |
| SAFE-01 | Guest mode does not require identity, cloud credentials, contacts, brokerage access, or unnecessary device permissions. Requested permissions are documented and justified.                                   | `TBD`                  | Not Yet Verified |
| SAFE-02 | The beta collects and persists only data required for learning/progress. The data inventory documents fields, purpose, storage location, retention/deletion behavior, and whether anything leaves the device. | `TBD`                  | Not Yet Verified |
| SAFE-03 | Logs, fixtures, screenshots, bundles, configuration, and repository history included in the candidate contain no API keys, tokens, credentials, personal data, or sensitive financial data.                   | `TBD`                  | Not Yet Verified |
| SAFE-04 | Local persistence uses safe parameterized access and validates/migrates untrusted or stale content without corrupting append-only attempts or progress.                                                       | `TBD`                  | Not Yet Verified |
| SAFE-05 | Imported lesson/content data is runtime-schema-validated; malformed content fails safely and cannot execute arbitrary code or produce unsafe navigation/markup.                                               | `TBD`                  | Not Yet Verified |
| SAFE-06 | External links and dependencies are inventoried; unsupported network calls, live-market requests, analytics, trackers, and AI calls are absent from the core journey.                                         | `TBD`                  | Not Yet Verified |
| SAFE-07 | Dependency audit findings are triaged for actual runtime exposure; no known release-blocking vulnerability remains without explicit risk acceptance, owner, and remediation date.                             | `TBD`                  | Not Yet Verified |
| SAFE-08 | Educational and financial-risk disclosures are visible during onboarding and reachable later. They state that content is educational, probabilistic, and not personalized financial advice.                   | `TBD`                  | Not Yet Verified |
| SAFE-09 | Product and content contain no personalized recommendation, signal, or directive to buy/sell/hold an asset and no promise of profit, accuracy, target attainment, stop execution price, or risk elimination.  | `TBD`                  | Not Yet Verified |
| SAFE-10 | Language distinguishes directional bias from confirmation; confirmation from entry trigger; invalidation from stop order; and measured targets from promises.                                                 | `TBD`                  | Not Yet Verified |
| SAFE-11 | Content accounts for spread, slippage, commissions/costs, liquidity, gaps, correlation, leverage, and the limits of incomplete/fragmented volume where relevant.                                              | `TBD`                  | Not Yet Verified |
| SAFE-12 | Exercises accept and appropriately reward wait, no trade, and insufficient evidence. XP/streak/feedback reward reasoning and process rather than profit, action frequency, leverage, or risk-taking.          | `TBD`                  | Not Yet Verified |
| SAFE-13 | Examples are synthetic or appropriately licensed/attributed, source traceability is present, and no long passage or proprietary product identity/interface is copied.                                         | `TBD`                  | Not Yet Verified |
| SAFE-14 | Final diff review covers regressions, authentication/authorization if any, tenant boundaries if any, data integrity, privacy, accessibility, and misleading financial language.                               | `TBD`                  | Not Yet Verified |

### Financial-language search and editorial review record

Automated searches are a discovery aid, not proof of safety. Search Hebrew and English variants for terms such as guaranteed, certain, safe, easy profit, must rise/fall, buy now, sell now, signal, recommendation, no risk, target will be reached, stop guarantees, and their contextual equivalents. Every match requires human review.

| Search command / editorial scope | Matches | Reviewed false positives | Changes required | Reviewer / date | Status           |
| -------------------------------- | ------- | ------------------------ | ---------------- | --------------- | ---------------- |
| `TBD`                            | `TBD`   | `TBD`                    | `TBD`            | `TBD`           | Not Yet Verified |

## External / Future — intentionally outside this beta

These items must remain absent or disabled in the beta. Their absence does not excuse any beta capability from working locally.

| ID     | External/future capability                                                                     | Beta boundary                                                                                                                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FUT-01 | Cloud synchronization and production accounts                                                  | Document a future Supabase/PostgreSQL design with authentication and row-level security; do not make local use depend on it.                                                                                             |
| FUT-02 | Optional AI tutor                                                                              | A future `TutorProvider` may explain approved rubrics/source context, but remains disabled. It may never grade, override the deterministic grader, provide personalized advice, or require an API key for core behavior. |
| FUT-03 | Live market data                                                                               | Not used; beta charts are deterministic synthetic OHLCV.                                                                                                                                                                 |
| FUT-04 | Brokerage connection and trade execution                                                       | Not included and must not be simulated as an available integration.                                                                                                                                                      |
| FUT-05 | Price alerts                                                                                   | Not included.                                                                                                                                                                                                            |
| FUT-06 | Public leaderboards and social trading                                                         | Not included.                                                                                                                                                                                                            |
| FUT-07 | Paid subscriptions or purchases                                                                | Not included.                                                                                                                                                                                                            |
| FUT-08 | Live AI-generated lessons or runtime AI-authored answer keys                                   | Not included. Curated reviewed content and deterministic rubrics remain authoritative.                                                                                                                                   |
| FUT-09 | Production deployment, app-store publication, paid services, and production-system connections | Require separate explicit authorization and release procedures.                                                                                                                                                          |

## Exact release gates

The beta release decision is **GO** only when every gate below is satisfied against the same recorded candidate SHA. Unless a gate explicitly permits a documented environment limitation, no waiver, partial pass, unexecuted check, placeholder command, or undated evidence counts as passing.

1. **GATE-01 — Candidate identity:** version, content/schema versions, branch, immutable commit SHA, supported local targets, environment matrix, and verifiers are recorded in Release snapshot.
2. **GATE-02 — Clean reproducible install:** CMD-01 and CMD-02 pass from the documented clean state with the committed lockfile and no undocumented credentials or services.
3. **GATE-03 — Static quality:** CMD-03, CMD-04, and CMD-05 all exit 0 on the candidate SHA.
4. **GATE-04 — Automated correctness:** CMD-06 through CMD-11 all exit 0. No release-critical test is skipped, quarantined, focused, or made non-deterministic.
5. **GATE-05 — Content quantity, source traceability, and quality:** CMD-12 exits 0 and its evidence proves CAP-09, CAP-10, CAP-11, CAP-20, and CAP-24, including at least 4 coherent units, 12 lessons, 60 reviewed exercises, 10 near-miss/ambiguous examples, 10 wait/no-trade/insufficient-evidence answers, 10 risk/position-size exercises, one complete 11-step capstone, and a complete audit of the authoritative PDF.
6. **GATE-06 — Deterministic analysis:** CAP-13 through CAP-17 pass with automated evidence covering identical seed output, valid OHLC, grading tolerances at different sizes, future-candle isolation, uncertainty acceptance, mastery bounds, review scheduling, cost-aware sizing, invalid inputs, and gap risk.
7. **GATE-07 — Offline continuity:** CAP-18, CAP-19, CMD-10, and MJ-08 pass. Attempts remain append-only, the critical path needs no external service, and migrations preserve learning history and progress.
8. **GATE-08 — Build and launch:** CMD-13 and CAP-01 pass for every declared supported local target. The complete critical learning journey has no placeholder or fatal screen.
9. **GATE-09 — Manual learning journeys:** MJ-01 through MJ-11 all pass with target/build/tester/date evidence. A journey failure is a release blocker.
10. **GATE-10 — Accessibility, RTL, and visual quality:** VIS-01 through VIS-12 pass. Required screenshots are indexed and inspected for broken RTL, clipped text, misplaced punctuation, incorrect numeric direction, low contrast, and chart-label overlap; measured contrast evidence is recorded.
11. **GATE-11 — Privacy, security, and truthful financial education:** SAFE-01 through SAFE-14 and CMD-15 pass. The language-search record is complete, every match is reviewed, and no core behavior depends on AI, live data, cloud accounts, or brokerage services.
12. **GATE-12 — End-to-end evidence:** CMD-14 passes. An environment-only limitation may be accepted only for a non-product constraint after the equivalent journey has passed on another declared supported target and the exact failure, scope, unaffected behavior, owner, and next release step are recorded below. A missing supported-target build, reproducible app failure, or untested critical journey is not an acceptable limitation.
13. **GATE-13 — Scope boundary:** FUT-01 through FUT-09 are absent or disabled as documented; the UI and documentation do not imply they are available.
14. **GATE-14 — Final review:** CMD-16 passes; the final diff is reviewed for regressions, security, privacy, accessibility, content/source traceability, and misleading financial language. Documentation describes only what the evidence verifies.
15. **GATE-15 — Decision and sign-off:** all preceding gates are marked PASS in the sign-off table, all unresolved items are non-blocking and truthfully recorded, exact next release steps are listed, and the release owner signs GO. Otherwise the decision remains NO-GO.

### Gate sign-off

| Gate    | Result (`PASS` / `FAIL` / `NOT RUN`) | Evidence links | Owner | Date  |
| ------- | ------------------------------------ | -------------- | ----- | ----- |
| GATE-01 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-02 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-03 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-04 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-05 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-06 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-07 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-08 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-09 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-10 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-11 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-12 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-13 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-14 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |
| GATE-15 | NOT RUN                              | `TBD`          | `TBD` | `TBD` |

## Unresolved limitations and blockers

| ID    | Type (`product` / `content` / `environment` / `external`) | Description and exact reproduction | User/release impact | Owner | Required next step | Status |
| ----- | --------------------------------------------------------- | ---------------------------------- | ------------------- | ----- | ------------------ | ------ |
| `TBD` | `TBD`                                                     | `TBD`                              | `TBD`               | `TBD` | `TBD`              | `TBD`  |

## Exact next release steps

Replace this placeholder sequence with owners and dated commands for the selected candidate:

1. Record the immutable candidate SHA, versions, supported targets, toolchain, and verifier matrix.
2. Replace every command placeholder with the exact repository command and establish the evidence artifact location.
3. Run CMD-01 through CMD-16, repair product failures, and attach complete evidence.
4. Run MJ-01 through MJ-11 on the declared matrix and attach artifacts.
5. Complete VIS-01 through VIS-12 and SAFE-01 through SAFE-14, including screenshot, contrast, secret, dependency, and financial-language evidence.
6. Re-run every check affected by repairs against the final candidate SHA.
7. Complete GATE-01 through GATE-15 and record GO only if every gate passes.

## Release decision record

| Field                | Value                                                                      |
| -------------------- | -------------------------------------------------------------------------- |
| Final decision       | **NO-GO — not yet verified**                                               |
| Release owner        | `TBD`                                                                      |
| Decision date        | `TBD`                                                                      |
| Candidate SHA        | `TBD`                                                                      |
| Blocking items       | All release gates remain NOT RUN.                                          |
| Approved next action | Gather implementation and verification evidence; do not publish or deploy. |
