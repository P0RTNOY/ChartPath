# ChartPath Product Specification

**Status:** Beta product specification  
**Language:** Hebrew-first, with deliberate bilingual terminology  
**Primary audience:** Hebrew-speaking beginners learning systematic chart analysis  
**Source basis:** The supplied product brief plus the complete PDF audit in
`docs/SOURCE_AUDIT.md`. Detailed lesson and exercise traceability lives in
`docs/CURRICULUM_MAP.md`.

This is a requirements document, not evidence that the described capabilities are already implemented or verified.

**Milestone 3 status (2026-08-24): implementation and repository verification complete.** The frozen,
provider-neutral historical-replay flow is learner-accessible as an explicitly internal practice
scenario. The only historical-format candles in the repository are a ChartPath-generated
development fixture, not real market observations.

**Milestone 4 status (2026-08-24): implementation contract present; final verification evidence is
tracked in `docs/RELEASE_READINESS.md`.** Paper execution is a local deterministic mechanics layer
over a completed checksum-pinned analysis, not brokerage execution or a new trading curriculum.

## 1. Document status and evidence labels

This specification distinguishes requested product behavior from source-backed curriculum evidence:

- **Required** — explicitly required by the product brief.
- **Beta decision** — a product decision made to turn the brief into a coherent beta; it remains subject to usability testing.
- **Future** — intentionally outside the first beta.
- **Source verified** — checked against `docs/sources/technical-analysis-he-digital 2.pdf` and
  recorded with exact physical PDF and printed-book page references.

The source audit covers all 87 physical pages, 20 chapters, 28 figures, chapter exercises,
appendices, 27 glossary entries, disclaimers, editorial notes, and bibliography. It is still a
provenance map rather than permission to copy prose or diagrams: ChartPath uses concise original
wording and newly generated synthetic charts. A guessed or unresolved page reference remains a
publication blocker.

## 2. Product vision

ChartPath is a mobile-first learning application that helps a beginner move from recognizing chart vocabulary to applying a repeatable, risk-aware analytical process. It uses short, interactive practice, visible progress, deterministic review, and synthetic charts. Its success metric is better reasoning, including the ability to wait or reject a setup—not simulated trading profit.

The product's central mental model is the required 11-step workflow:

1. Context
2. Structure
3. Level
4. Setup
5. Confirmation
6. Entry
7. Invalidation
8. Position size
9. Target
10. Management
11. Review

Hebrew labels will be finalized through editorial review. English professional terms remain visible where they improve transfer to professional material.

## 3. Product goals

The beta must enable learners to:

- Read price, volume, and time from common chart forms.
- Use technical-analysis terminology accurately in Hebrew and English.
- Identify trends, structure, levels, pattern prerequisites, breakouts, retests, and failures.
- Separate observation, setup, confirmation, entry trigger, and invalidation.
- Calculate position size from account risk, stop distance, and expected per-unit costs.
- Reason in units of risk (`R`) and discuss uncertainty without promising an outcome.
- Select “wait,” “no trade,” or “insufficient evidence” when the evidence does not justify action.
- Apply the full 11-step workflow to an unseen, deterministic synthetic chart.
- Retain concepts through a transparent mastery and spaced-review system.
- Resume learning offline without losing attempts, progress, or review state.

## 4. Product principles

### 4.1 Learning before engagement

XP, streaks, and completion support habit formation but remain separate from conceptual accuracy and skill mastery. The application must never imply that a streak proves competence.

### 4.2 Process over outcome

Grading evaluates the evidence available at the decision candle and the quality of the learner's reasoning. A later price move cannot retroactively make a weak process correct or a defensible process wrong.

### 4.3 Deterministic authority

Reviewed rubrics and deterministic graders define official answers. The core experience must work without AI, live-market data, cloud services, or account registration.

### 4.4 Uncertainty is a first-class answer

Ambiguity is intentionally represented. “Not enough information,” “wait,” and “no trade” are normal, positively framed answers where supported by the rubric.

### 4.5 Accessible by construction

RTL layout, mixed-direction content, larger text, screen readers, large touch targets, high contrast, reduced motion, and non-color cues are acceptance requirements rather than later polish.

## 5. Audience and learner needs

### 5.1 Primary learner

A Hebrew-speaking beginner who may understand basic investing terms but cannot yet analyze a chart systematically. The learner needs concise explanations, repeated visual practice, explicit distinctions between easily confused concepts, and reassurance that declining to act can demonstrate mastery.

### 5.2 Situational needs

- Short sessions that fit into a daily routine.
- Guest access without mandatory registration.
- Offline continuity.
- Terminology that bridges Hebrew instruction and English professional usage.
- Feedback that diagnoses reasoning rather than shaming the learner.
- Controls that remain usable with larger text, screen readers, or reduced motion.

### 5.3 Not assumed

The beta does not assume brokerage experience, advanced mathematics, familiarity with every chart pattern, or access to live market data.

## 6. Scope

### 6.1 Required beta experience

- Hebrew onboarding and risk/education disclaimer.
- Guest mode and daily-goal selection.
- Learning-path home screen with unit, lesson, lock, current, review-due, and mastery states.
- Unit and lesson views.
- Interactive lesson player with hints and immediate, misconception-specific feedback.
- Lesson summary with accuracy, concepts practiced, misconceptions, XP, and next action.
- Skill-level mastery display.
- Deterministic spaced-review queue.
- Separate XP, streak, completion, mastery, and accuracy measures.
- Hebrew/English glossary search.
- Progress view.
- Light and dark themes.
- Settings for accessibility and reduced motion.
- Offline persistence and content/version migrations.
- Developer content catalog for lessons, exercises, source status, and validation errors.
- Deterministic synthetic OHLCV charts, semantic annotations, and pure grading.
- A future-facing `TutorProvider` boundary that is disabled in the beta.

### 6.2 Required beta content

- Four coherent implemented units.
- Twelve short lessons.
- Sixty `reviewed` exercises.
- Interactions covering trend, structure, levels, confirmation, and invalidation.
- At least ten near-miss or ambiguous exercises.
- At least ten exercises where wait/no-trade/insufficient-evidence is correct.
- At least ten risk or position-size exercises.
- One multi-step capstone using all 11 workflow steps.
- Draft metadata mapping the remainder of Units 0–10 without filler lesson prose.

These content counts can be considered met only after the source references have been verified. Until then, content may be implemented and tested as `draft`, but it cannot legitimately satisfy the `reviewed` count.

### 6.3 Non-goals for the first beta

- Brokerage connections, real trade execution or order routing.
- Live-market data dependencies.
- Price alerts, signals, or recommendations.
- Personalized financial advice.
- Public leaderboards or social trading.
- Paid subscriptions.
- Live AI-generated lessons or AI-decided grading.
- Cloud synchronization as a local-development dependency.
- Simulated portfolio profit as a learning reward.
- Copying any other product's branding, mascot, illustrations, layout, sounds, wording, or proprietary interface.

### 6.4 Future, explicitly non-blocking architecture

- Optional account-based synchronization using a documented PostgreSQL/Supabase design with authentication and row-level security.
- Optional tutor explanations through a guarded `TutorProvider`.
- Additional curriculum depth and more exercise variants.

The implemented Milestone 3 foundation adds provider-neutral historical import, integrity,
publication-gate and persistence contracts without adding a market-data dependency to the core
product. Its sole installed dataset is a non-publishable 96-candle ChartPath-generated fixture with
one recorded gap. It contains no real ticker, issuer, market or price history; no provider keys or
runtime network request are configured. The historical registry is separate from the reviewed
curriculum catalog and currently has zero course-credit-eligible scenarios and four explicit
publication blockers.

The Milestone 4 paper-execution foundation is a narrow development-only educational simulation. It
supports one plan/order/position, fixed versioned fills/costs, manual candle advancement and a
process debrief. Portfolios, P&L scoring, partial/manual exits, position management, complex orders,
live or delayed feeds, streaming quotes, real orders, news and brokerage connectivity remain out of
scope. Databento and the other researched vendors in `docs/HISTORICAL_DATA_POLICY.md` are
procurement candidates only, not approved sources or implemented integrations.

Future capabilities do not belong in beta claims unless implemented and verified.

## 7. Information architecture

The primary navigation should expose:

- **Learn** — learning path, current lesson, and due-review entry point.
- **Review** — due and weak-skill practice with an explanation of why each item was selected.
- **Glossary** — searchable Hebrew and English terms.
- **Progress** — completion, mastery by skill, accuracy trends, streak, and XP as distinct measures.
- **Settings** — theme, text/accessibility options, reduced motion, data information, and disclaimer.

The developer content catalog is a development-only or clearly separated diagnostic surface, not a learner navigation destination.

## 8. Core user journeys

### 8.1 First session

1. The app opens in Hebrew with correct RTL layout.
2. The learner sees a concise educational-purpose and financial-risk notice before exercises.
3. The learner continues in guest mode without registration.
4. The learner chooses a daily goal.
5. A brief orientation explains scenarios, uncertainty, and the 11-step workflow.
6. The learner completes a real first lesson containing instruction, chart interaction, feedback, and at least one uncertainty-aware choice.
7. The lesson summary distinguishes XP/completion from accuracy/mastery.
8. The learner returns to the path and sees persisted progress and the next available action.

### 8.2 Incorrect answer, hint, and recovery

1. The learner answers incorrectly.
2. The system identifies the applicable misconception tag.
3. Feedback explains the reasoning error and preserves a neutral, encouraging tone.
4. The learner requests a progressive hint that reveals the next reasoning step, not the answer immediately.
5. The learner attempts a later variant targeting the same skill.
6. Recovery affects mastery based on correctness, difficulty, hints, misconception recurrence, and later review—not merely the last response.

### 8.3 Interactive chart reasoning

1. The learner sees only candles available through decision candle `N`.
2. Depending on the task, the learner taps swing points, draws a zone, connects a trendline, positions labels, or marks entry/invalidation/target areas.
3. The grader applies a deterministic rubric and screen-size-independent tolerance.
4. Feedback compares the learner's reasoning with semantic ground truth.
5. Future candles may be revealed only after submission and may support discussion, not original-answer grading.

### 8.4 Wait or reject

1. A visually attractive candidate setup is presented with a missing prerequisite or incomplete confirmation.
2. The learner selects “wait,” “no trade,” or “insufficient evidence.”
3. The application celebrates disciplined process without casino-like animation or profit language.
4. The explanation identifies exactly what is missing and what evidence would change the analysis.

### 8.5 Position sizing

1. The learner receives account risk, entry, stop/invalidation context, and expected per-unit costs.
2. The learner applies `position size = account risk / (entry-stop distance + expected per-unit costs)`.
3. Invalid inputs—including zero distance—are rejected with an explanation.
4. The result is discussed in terms of defined risk, execution uncertainty, and constraints such as spread, slippage, gaps, liquidity, leverage, and correlation.

### 8.6 Due review

1. A due concept appears in the review queue.
2. The learner can see why it is due.
3. Review performance updates interval, next-due time, lapse count, mastery, and attempt history deterministically.
4. A failed review becomes due again according to the documented scheduler.

### 8.7 Resume offline

1. The learner completes part or all of a lesson, closes the app, and relaunches offline.
2. Attempts remain append-only.
3. Completion, mastery, review state, XP, streak state, and current location are restored.
4. A content migration preserves history and maps or retires changed content safely.

### 8.8 Capstone

1. The learner receives an unseen seeded synthetic chart.
2. The learner completes the 11 steps in sequence, with no future-candle leakage.
3. Each step is graded against its own rubric; later steps may depend only on accepted earlier information.
4. The summary reports process strengths, misconceptions, uncertainty handling, and review recommendations—not hypothetical profit.

### 8.9 Frozen historical replay

The implemented internal-practice journey is:

1. The app resolves an installed scenario and exact dataset ID, version and SHA-256 checksum before
   starting or resuming a session.
2. The learner sees only the candle prefix and scenario evidence available at the current replay
   cursor, never beyond the minimum authored cutoff.
3. Blind presentation omits identity and timestamps and derives chart scale, summaries and
   accessibility text from that same visible prefix.
4. The existing reviewed 11-step capstone prompts, rubrics, explanations, hints, misconceptions and
   educational source references are reused unchanged.
5. Draft answers, current and maximum-seen replay cursors, annotation authorship and checkpoint
   snapshots survive an offline resume under the pinned identity.
6. A missing scenario/dataset, checksum disagreement, metadata disagreement or modified dataset
   stops resume and requires an explicit recovery choice; the app never substitutes or silently
   repins evidence.
7. Finalizing a development-only, non-credit scenario freezes the practice session but creates no
   ordinary attempt and changes no mastery, review, completion, XP, streak or activity projection.
8. Identity may be disclosed only under the authored reveal policy after finalization. Later outcome
   remains excluded from the original grade.

### 8.10 Deterministic paper execution

After an exact finalized historical analysis, the learner may open a progressive Hebrew paper
ticket, review the scenario-permitted direction/order type, entry, protective stop, target,
fictional account/risk values, quantity, modeled costs and explicit assumptions, then confirm once.
The execution cursor begins after the decision candle. Every advance reveals and processes each new
candle exactly once, emits immutable order/position events and saves the checkpoint.

Market entry uses the next candle open. Limit entry and target fills receive no favorable price
improvement. Entry/protective stops use the adverse open after a gap. Range-only stop-and-target or
intrabar-entry/exit sequencing that OHLCV cannot establish becomes ambiguous, never an invented
winner. The v1 model and exact costs are specified in `docs/PAPER_EXECUTION_POLICY.md`.

The chart distinguishes planned entry, working order, actual fill, stop, target, open position, exit
and ambiguity by labels, shapes and line patterns in addition to color. A cutoff-safe accessible
event list is the non-gesture alternative. The debrief scores process alignment and outcome
determinability separately from neutral simulated P&L/`R` information.

The installed fixture's reviewed conclusion is no trade. Its paper ticket must explicitly describe
the exercise as hypothetical simulator mechanics that contradicts—but never changes—that analysis.
It grants no ordinary attempt, mastery, review, lesson completion, XP, streak or daily-activity
credit.

## 9. Hebrew RTL, bilingual content, and accessibility

### 9.1 Directionality

- The application shell and Hebrew prose use RTL direction.
- English terms, tickers, formulas, timestamps, decimal values, and chart-axis labels use explicit LTR or isolation containers.
- Mixed Hebrew/English strings must not rely on global direction alone.
- Parentheses, punctuation, signs, ranges, and units must be visually inspected in both themes and at larger text sizes.
- Chart interaction must not encode “forward” as a physical left/right assumption without considering RTL and chronological chart direction.

### 9.2 Bilingual terminology

- Important terms show Hebrew first with English in a stable secondary style, for example `תמיכה (Support)`.
- Glossary search matches both languages and common normalized spellings.
- A canonical term ID links lessons, exercises, glossary entries, and analytics so translations can change without breaking history.
- Translation status is explicit; missing Hebrew blocks publication of beta content.

### 9.3 Accessibility requirements

- WCAG AA contrast for important text, controls, focus indicators, and chart annotations.
- Meaning is never conveyed by red/green alone; use labels, shapes, line styles, or icons as redundant cues.
- Touch targets are large and separated enough for reliable use.
- Every interactive chart control has a screen-reader label, role, state, and concise instruction.
- A non-gesture or accessible alternative is available for precision drawing where required.
- Dynamic type/larger text does not clip required content or make actions unreachable.
- Reduced-motion mode suppresses nonessential animation and preserves state transitions without motion dependence.
- Feedback is announced appropriately without stealing focus unpredictably.
- Focus order follows the logical Hebrew reading and task order.
- Charts provide a concise textual summary of the visible data and task-relevant annotations when needed for access.

## 10. Learning, progress, and motivation surfaces

### 10.1 Learning path

The daily path prioritizes, in order:

1. Required prerequisites.
2. Current lesson.
3. Due reviews.
4. Weak skills.
5. New material.

The UI must explain locked prerequisites and why a review is recommended.

### 10.2 Separate measures

- **Completion:** whether required lesson work was finished.
- **Accuracy:** correctness over an explicitly stated attempt set.
- **Mastery:** deterministic, bounded skill estimate based on multiple evidence types.
- **XP:** participation reward with no claim of competence.
- **Streak:** consistency of qualifying daily activity.

No single number combines these concepts.

### 10.3 Motivation constraints

- Feedback is friendly and encouraging without childish framing.
- Rewards avoid coins, jackpots, price flashes, profit celebrations, loss chasing, or urgency associated with gambling.
- Streak messaging allows recovery and does not pressure learners into financial activity.
- “No trade” can receive the same positive completion treatment as a correct directional conclusion.

## 11. Safety doctrine

Every learner-facing surface and editorial workflow must uphold these required principles:

1. Technical analysis describes probabilistic scenarios, not certainty.
2. A pattern without context is only a drawing.
3. Reversal patterns require a preceding trend.
4. Directional bias is not confirmation.
5. Confirmation and entry trigger are related but distinct.
6. Invalidation is an analytical condition; a stop order is an execution mechanism and does not guarantee execution price.
7. Measured targets are estimates, not promises.
8. Volume is supporting evidence; price determines profit and loss.
9. Position size follows risk and stop distance.
10. Costs, spread, slippage, liquidity, gaps, correlation, and leverage matter.
11. A single example does not validate a method.
12. “No trade” and “not enough information” are valid answers.
13. The application rewards process quality, not profit or aggressive risk-taking.
14. Content is education, never personalized financial advice, a signal, or a recommendation to buy or sell.
15. Paper fills, spread, slippage, commission, gaps and OHLCV ambiguity are labelled versioned
    simulator assumptions, not market facts or promises of achievable execution.

Additional product enforcement:

- No runtime AI may determine an official answer.
- Any future tutor receives the approved rubric and source context, admits ambiguity, cannot override the grader, passes output validation, and has a safe local fallback.
- Synthetic scenarios use neutral identifiers and do not present themselves as current opportunities.
- Disclaimers complement rather than replace safe wording in lessons and feedback.
- Content validation should flag certainty language, recommendation language, absent uncertainty options for marked-ambiguous exercises, and missing risk context.

## 12. Data, persistence, and privacy expectations

- The beta works in guest mode and stores progress locally.
- Attempts are append-only so history can be migrated or synchronized without rewriting evidence.
- Stored learning data includes only what is needed for attempts, progress, mastery, review, preferences, and content migration.
- Response time may be retained for diagnostics but does not materially penalize mastery.
- The app clearly explains what is stored locally and how a learner can clear it.
- No brokerage credentials, holdings, trade history, or financial account connection is requested.
- Paper execution stores only local fictional account/risk inputs, plan levels, pinned historical
  identity, processed-candle evidence and immutable simulator events. These records are separate
  from append-only learning attempts and introduce no network recipient or telemetry.
- Cloud synchronization is future work and must require separate authentication, authorization, tenant isolation, retention, and deletion review.
- Guided-session schema version 2 distinguishes synthetic seed/generator identity from historical
  scenario/dataset/version/checksum identity. Persistence payload schema version 4 and native SQLite
  migration 3 preserve that pin, replay high-water state, annotation authorship and checkpoint
  snapshots without rewriting attempt history.
- Historical session resolution has six exact outcomes: `ready`, `scenario-missing`,
  `dataset-missing`, `checksum-mismatch`, `metadata-mismatch`, and `dataset-modified`. Non-ready
  states fail closed; they do not fetch, repair or replace data.
- Blind historical presentation protects the learning sequence in ordinary UI and accessibility
  output. It is not a promise that bundled data is secret from source inspection, application
  bundles or developer tools on a learner-controlled client.
- No real candles may be committed or shipped until human legal/procurement review establishes the
  intended provider rights and a human editorial review clears the separate historical publication
  gate. The current fixture checksum is
  `sha256:07907f75988d2aba5f27d6c73bc596ad9f896452f37a8ba9a240b8ae285a144e`.

## 13. Content and exercise contract

Every exercise requires:

- Stable unique ID and schema version.
- One or more valid skill IDs and difficulty.
- Hebrew prompt; optional English version.
- Interaction type and deterministic chart specification where applicable.
- Correct-answer rubric and drawing tolerance rules where applicable.
- Correct explanation and explanations for common alternatives.
- Misconception tags and progressive hint ladder.
- Source reference and explicit source-verification state.
- Editorial state: `draft`, `reviewed`, or `published`.

Publication is blocked when required fields, Hebrew content, prerequisite references, rubrics, explanations, reachable unlocking, deterministic annotations, or uncertainty answers are invalid. A `SOURCE_TBD` reference cannot count as verified and therefore cannot be `reviewed` or `published`.

## 14. Beta acceptance criteria

### 14.1 Functional

- A new Hebrew guest completes onboarding, disclaimer, daily goal, and the first real lesson.
- The learning path, lesson player, hints, misconception feedback, summary, glossary, progress, review, and settings are functional rather than placeholders.
- Twelve lessons and sixty source-verified `reviewed` exercises meet the distribution requirements in Section 6.2.
- The exercise system supports all 14 interaction families named in the brief or documents any intentionally sequenced beta delivery without falsely claiming completeness.
- The 11-step capstone completes end to end.
- Progress and due-review state survive app restart offline.

### 14.2 Learning integrity

- Future candles cannot influence grading at decision candle `N`.
- Ambiguous exercises accept uncertainty responses as specified.
- Near-miss cases assess missing prerequisites, not superficial shape matching.
- Wrong-answer feedback explains the misconception.
- Position-size grading includes expected per-unit costs and rejects invalid inputs.
- Mastery is bounded, deterministic, and distinct from XP, streak, completion, and raw accuracy.
- Failed reviews become due according to the documented deterministic scheduler.
- Paper execution processes only post-decision candles in sequence, is idempotent across repeat and
  reload, fails closed on evidence mismatch, reports honest OHLCV ambiguity and never awards credit
  from simulated outcome.

### 14.3 Content integrity

- Published content passes the content validator.
- IDs are unique; prerequisites, lessons, skills, and rubrics resolve.
- Every published beta item has Hebrew, explanation, valid source reference, and reviewed editorial status.
- Page/chapter citations and source-dependent terminology are verified against the complete PDF before release.
- The developer catalog exposes editorial and source-verification status.

### 14.4 Accessibility and localization

- Critical screens pass visual review in Hebrew RTL, dark mode, reduced motion, and a larger text setting.
- English terms, numbers, formulas, tickers, and chart labels preserve correct LTR order.
- Important content and controls meet WCAG AA contrast.
- Interactive chart controls have screen-reader labels and accessible alternatives where precision gestures are not viable.
- Required actions remain visible, reachable, and understandable without relying on color or motion.

### 14.5 Technical quality

- Identical seeds reproduce identical OHLCV and annotations.
- Generated OHLC values satisfy internal invariants.
- Grading tolerance remains meaningful across screen sizes.
- Domain, generator, grading, mastery, review, and content schema logic remain independent of React Native.
- Content migration preserves attempts and progress.
- Lint, formatting, type checking, unit/integration tests, content validation, persistence tests, and supported builds pass.
- At least one critical end-to-end journey runs in an available target; environment-only gaps are documented precisely.

Milestone 3 implementation includes the historical learner flow, fail-closed recovery presentation,
cutoff-safe visual/accessibility output, offline resume, non-credit finalization behavior and
light/dark/reduced-motion phone/tablet web captures. The full repository, browser and export command
inventory passes. Browser automation and screenshots do not establish
native screen-reader, native largest-text, gesture/lifecycle or physical-device usability.

Milestone 4 acceptance additionally requires tested market/limit/stop symmetry, adverse entry and
protective-stop gaps, exact cost/tick rounding, cancellation/expiration, same-candle ambiguity,
intermediate-candle processing, active-session reload, checksum mismatch recovery, no duplicate
events/credit, and inspected phone/tablet/dark/large-text/reduced-motion execution states. Export or
browser evidence must not be represented as native VoiceOver/TalkBack or physical-device evidence.

### 14.6 Safety

- No screen provides a buy/sell signal, personalized recommendation, or certainty claim.
- No core feature requires AI or market data.
- Rewards celebrate learning process, not profit, leverage, or risk-taking.
- Risk and educational notices are visible during onboarding and reachable later in settings.

## 15. Manual verification matrix

Before beta release, evidence must be captured for:

1. Hebrew onboarding and first lesson.
2. Incorrect answer → hint → misconception feedback → later successful variant.
3. Tapping higher highs and higher lows.
4. Drawing and tolerantly grading a support zone.
5. Rejecting a reversal lookalike with no preceding trend.
6. Waiting when confirmation is absent.
7. Completing a position-size exercise.
8. Restarting offline with progress intact.
9. Receiving a due concept in review.
10. Completing the 11-step capstone.
11. Repeating critical screens in dark mode, reduced motion, and larger text.

Screenshots must be inspected for RTL breakage, clipped text, punctuation and numeric-order errors, low contrast, and chart-label overlap.

## 16. Open verification items

The following are intentionally unresolved because they depend on source inspection or later empirical validation:

- Exact source chapter/page ranges for every concept and exercise — **source verification required**.
- Whether the requested terminology and canonical workflow wording exactly match the PDF — **source verification required**.
- Which diagrams can be transformed into original interactive content and what attribution is appropriate — **source and rights review required**.
- Final Hebrew editorial choices, reading level, and bilingual display frequency — **editorial/usability validation required**.
- Mastery thresholds, XP amounts, streak qualification, and daily-goal defaults — **beta decision requiring tuning**.
- Exact review-scheduler parameters — **beta decision requiring learning-data validation**.
