# ChartPath Learning Design

**Status:** Beta learning-design specification  
**Audience:** Hebrew-speaking beginners  
**Evidence boundary:** This document operationalizes the supplied product brief. Source-dependent
details are now backed by the complete audit in `docs/SOURCE_AUDIT.md` and the exact lesson/exercise
map in `docs/CURRICULUM_MAP.md`.

This document defines intended learning behavior; it does not by itself establish that content or application behavior has been implemented, source-reviewed, or learner-validated.

## 1. Evidence and editorial policy

The curriculum source is `docs/sources/technical-analysis-he-digital 2.pdf`. The audit covered all
87 physical pages and visually inspected all 28 listed figures. The editorial policy is:

- Concept coverage below is cross-checked against the audited chapter and appendix ranges.
- Source references record physical PDF pages plus printed book pages and chapter/figure detail.
- No exercise may be promoted to `reviewed` or `published` on the strength of this design document
  alone; it must pass the source, pedagogy, Hebrew, rubric, safety, and validation workflow.
- Page numbers, quotations, diagram interpretations, and source-backed definitions must not be invented.
- Source material must be transformed into original, concise instruction rather than reproduced in long passages.

The traceability pass found no conflict with the product's safety doctrine. Current market,
regulatory, legal, exchange, or broker claims still require a current primary-source check rather
than relying on the PDF bibliography.

## 2. Learning promise

ChartPath teaches a novice to inspect chart evidence in a repeatable sequence, express uncertainty, distinguish analysis from execution, size risk consistently, and review reasoning after a decision. It does not teach price prediction as certainty and does not train learners to maximize simulated profit.

The intended progression is:

`read the chart → describe structure → locate contextually meaningful evidence → define a conditional setup → require confirmation → plan risk → decide act/wait/reject → review the process`

## 3. Learning outcomes

By the end of the mapped curriculum, a learner should be able to:

1. Decode price, volume, time, OHLC, chart type, timeframe, and scale.
2. Describe trend and market structure from meaningful swings.
3. Treat support and resistance as contextual zones and evaluate lines/channels without false precision.
4. Use volume as supporting evidence while recognizing fragmented or incomplete data.
5. Identify pattern candidates, prerequisites, confirmation conditions, invalidation, and common lookalikes.
6. Distinguish a penetration, valid breakout, retest, false breakout, and unresolved case.
7. Compare strategic, tactical, and execution timeframes without searching for convenient confirmation.
8. Separate analytical invalidation from order execution, calculate position size, and reason in `R`.
9. Recognize hindsight, look-ahead, data-mining, cost, and survivorship problems.
10. Complete the 11-step workflow on an unseen chart and justify “trade,” “wait,” “reject,” or “insufficient evidence.”

Exact source alignment for these outcomes is recorded in `docs/CURRICULUM_MAP.md`.

## 4. Canonical mental model

Every applicable lesson and exercise should reinforce one or more stages of the required workflow:

| Step             | Learner question                                  | Evidence of learning                                            |
| ---------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| 1. Context       | What environment and timeframe am I examining?    | States relevant regime, timeframe, and limits.                  |
| 2. Structure     | What are meaningful swings doing?                 | Marks and describes structure without cherry-picking.           |
| 3. Level         | Where are reactions or decision zones meaningful? | Positions a zone/line with defensible tolerance.                |
| 4. Setup         | What conditional idea is present?                 | Names prerequisites and avoids treating shape as proof.         |
| 5. Confirmation  | What predefined evidence would support the setup? | Chooses an observable rule without using future candles.        |
| 6. Entry         | What event would trigger execution consideration? | Separates trigger from bias and confirmation.                   |
| 7. Invalidation  | What evidence would make the analysis wrong?      | Defines analytical invalidation separately from stop mechanics. |
| 8. Position size | How much exposure follows from defined risk?      | Uses risk, distance, and costs; rejects invalid inputs.         |
| 9. Target        | What conditional estimate frames the scenario?    | Treats targets as estimates, not promises.                      |
| 10. Management   | What decisions are predefined after entry?        | Accounts for uncertainty, costs, gaps, and execution.           |
| 11. Review       | Was the process followed, regardless of outcome?  | Diagnoses evidence quality and records learning.                |

Early lessons expose this sequence in small parts; later lessons require learners to select and connect steps; the capstone requires the complete sequence.

## 5. Curriculum architecture

The requested map contains Units 0–10. The first beta is required to implement a coherent four-unit/twelve-lesson vertical slice and represent the rest with valid draft metadata. The exact choice and sequencing of the four implemented units is a beta implementation decision; it must preserve prerequisites while still satisfying the required trend, structure, levels, confirmation, invalidation, uncertainty, and risk-exercise coverage. The content team must not claim complete coverage merely because metadata exists.

### Unit 0 — Orientation and safe expectations

- Technical analysis: purpose and limitations.
- Price, volume, and time.
- Scenarios rather than predictions.
- Technical and fundamental analysis.
- Cognitive traps.
- Educational-purpose and financial-risk notice.

### Unit 1 — Reading charts and data

- Line, bar, OHLC, and candlestick charts.
- Open, high, low, close.
- Timeframes.
- Arithmetic and logarithmic scales.
- Adjusted data and corporate actions.
- Data quality and source limitations.

### Unit 2 — Trend and market structure

- Requested Dow Theory foundations.
- Primary, secondary, and minor trends.
- Higher highs/lows and lower highs/lows.
- Meaningful swings, base points, and structural change.

### Unit 3 — Levels and lines

- Support and resistance as zones.
- Significance and role reversal.
- Trendlines and channels.
- Penetration versus confirmed break.
- Requested fan principle.

### Unit 4 — Volume and confirmation

- Absolute and relative volume.
- Volume in trends and patterns.
- Incomplete or fragmented volume.
- Predefined confirmation evidence.
- Volume as supporting evidence, not a standalone verdict.

### Unit 5 — Reversal and continuation patterns

- Head and shoulders; inverse head and shoulders.
- Rounded bottoms.
- Double/triple tops and bottoms.
- Rectangles and triangle types.
- Rising/falling wedges, broadening formations, and diamonds.
- Flags and pennants.
- Context, confirmation, invalidation, and common lookalikes.

### Unit 6 — Gaps, breakouts, and failure

- Common, breakaway, continuation, and exhaustion gaps.
- Gap risk.
- Valid-breakout rules.
- Immediate, close-based, and retest entries.
- Retest, failure, and false breakout.
- ATR-aware confirmation thresholds.

### Unit 7 — Multi-timeframe analysis

- Strategic, tactical, and execution timeframes.
- Top-down analysis and conflicting timeframes.
- Context before setup.
- Avoiding confirmation bias when switching timeframes.

### Unit 8 — Risk and execution

- Invalidation and stop-order distinction.
- Structural, volatility, and time stops.
- Risk unit `R`.
- Risk/reward and expected value.
- Position size, commission, spread, and slippage.
- Trailing stops, diversification, correlation, leverage, gap, and liquidity risk.

Required sizing expression:

`position size = account risk / (entry-stop distance + expected per-unit costs)`

### Unit 9 — Evidence, uncertainty, and common mistakes

- Market efficiency.
- Data mining and data snooping.
- Look-ahead and hindsight bias.
- In-sample and out-of-sample testing.
- Costs and survivorship bias.
- Why attractive examples are not statistical proof.
- Special considerations for ETFs, crypto, 24/7 markets, and fragmented volume.

### Unit 10 — The 11-step capstone

The learner receives an unseen synthetic chart and completes the entire workflow from context through review.

All unit details above are requirements from the brief and are mapped to verified source ranges in
`docs/CURRICULUM_MAP.md`.

## 6. Lesson anatomy

A short lesson should take approximately one focused sitting; the precise duration is a beta-tuning decision rather than a mastery requirement. Each lesson follows this structure:

1. **Purpose:** one observable learner outcome stated in friendly Hebrew.
2. **Prior knowledge retrieval:** one brief prompt that activates a prerequisite.
3. **Worked example:** the system models the reasoning and names the evidence.
4. **Guided practice:** the learner manipulates a chart with a strong first hint available.
5. **Contrast case:** a near-miss or lookalike changes one meaningful prerequisite.
6. **Independent practice:** a new seeded scenario with less scaffolding.
7. **Uncertainty check:** when instructionally relevant, “wait,” “reject,” or “insufficient evidence” competes with attractive distractors.
8. **Process reflection:** the learner identifies which workflow step drove the answer.
9. **Summary:** skill evidence, misconceptions, mastery impact, and next review are shown separately from XP.

Lessons should interleave explanation and action. Long expository blocks, isolated terminology drills, and multiple-choice-only sequences are avoided.

## 7. Exercise pedagogy

### 7.1 Exercise families and intended learning

| Interaction                    | What it should assess                                        | Common misuse to avoid                                      |
| ------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------- |
| Multiple choice                | Concept discrimination or reasoning selection                | Trivia recall as the dominant experience.                   |
| Tap candle/swing               | Visual detection and structural sequencing                   | Requiring pixel precision unrelated to the concept.         |
| Draw/position zone             | Reasonable level boundaries                                  | Pretending levels are exact single prices.                  |
| Connect trendline              | Selection of defensible swing anchors                        | Grading only one artistically exact line.                   |
| Drag chart labels              | Spatial relationship among pattern parts and decision points | Accepting labels without prerequisite/context reasoning.    |
| Arrange 11 steps               | Workflow order and conceptual separation                     | Treating memorized order as sufficient analysis competence. |
| Compare timeframes             | Top-down reasoning and conflict recognition                  | Encouraging timeframe shopping for confirmation.            |
| Classify/insufficient evidence | Prerequisite and ambiguity recognition                       | Forcing a pattern label when evidence is incomplete.        |
| Choose confirmation rule       | Precommitment to observable evidence                         | Using hindsight to choose the rule that worked.             |
| Mark entry/invalidation/target | Conditional plan coherence                                   | Presenting target as guaranteed or stop as guaranteed fill. |
| Calculate size and `R`         | Risk arithmetic plus input validation                        | Omitting expected costs or accepting zero distance.         |
| Diagnose flawed analysis       | Misconception transfer and metacognition                     | Asking only for superficial wording errors.                 |
| Trade/wait/reject              | Disciplined decision quality                                 | Rewarding action frequency.                                 |
| Sequential candle reveal       | Updating beliefs without future leakage                      | Regrading the original decision from later outcome.         |

### 7.2 Constructive alignment

Each exercise must identify the skill and observable behavior before choosing an interaction. The interaction is justified only when it makes the reasoning visible. For example, recognition of meaningful swings is better assessed by tapping a chart than by recalling a definition; distinguishing confirmation from entry may require ordering or marking evidence, not just selecting vocabulary.

### 7.3 Example design matrix

Every concept set should include a deliberate mix:

- **Positive example:** prerequisites and evidence are present.
- **Near-miss:** visual similarity exists but one required condition is absent.
- **Lookalike:** a different structure could plausibly be confused with the target.
- **Ambiguous case:** the evidence cannot support a unique conclusion.
- **Changing evidence:** sequential reveal requires an update without hindsight.
- **Transfer case:** surface features differ while the same principle applies.

The beta distribution must include at least ten near-miss or ambiguous examples, at least ten wait/no-trade/insufficient-evidence answers, and at least ten risk/position-size exercises.

### 7.4 Rubrics and tolerance

Rubrics are semantic, deterministic, and authored with the exercise. They may contain:

- Required and forbidden classifications.
- Acceptable uncertainty choices.
- Ordered or partially ordered relationships.
- Chart-coordinate regions normalized to chart dimensions.
- Distance tolerance relative to candle width, price range, or semantic zone—not fixed device pixels.
- Required anchor count/order and acceptable alternate anchors.
- Numeric tolerance, rounding policy, unit, and invalid-input conditions.
- Evidence cutoff candle `N`.
- Partial-credit policy where partial credit is instructionally meaningful.

For drawing tasks, the learner should receive specific feedback such as “the zone omits two major reactions” rather than a generic failure. Multiple defensible drawings can be accepted when encoded in the rubric.

### 7.5 No future leakage

- The visible chart, annotations available to the learner, grader input, and explanation of the original choice are all limited to candles `≤ N`.
- Ground-truth annotations for future candles are kept outside the grading view.
- A post-submission reveal is clearly labeled as later information.
- Outcome information may prompt reflection but cannot determine whether the earlier process was defensible.
- Tests must prove that changing candles after `N` does not change the original grade.

## 8. Feedback and hint design

### 8.1 Feedback sequence

Feedback answers four questions:

1. What did the learner select or draw?
2. Which observable evidence supports or conflicts with it?
3. What misconception or missing step best explains the difference?
4. What should the learner inspect next time?

Feedback never stops at “incorrect.” It avoids hindsight claims, certainty language, trading recommendations, and identity judgments.

### 8.2 Progressive hint ladder

Hints should increase support gradually:

1. **Orient:** point to the relevant workflow step or chart region.
2. **Recall:** restate the prerequisite or decision rule in general terms.
3. **Narrow:** highlight the relevant evidence set or eliminate an incompatible category.
4. **Model:** demonstrate the first reasoning operation on part of the chart.
5. **Reveal with explanation:** show the answer only after meaningful scaffolding, then require a later variant for independent evidence.

Hint use informs mastery transparently but does not turn a learning attempt into punishment.

### 8.3 Misconception taxonomy

Initial cross-unit tags should include, at minimum:

- `pattern_without_context`
- `missing_preceding_trend`
- `bias_as_confirmation`
- `confirmation_as_entry`
- `invalidation_as_guaranteed_fill`
- `target_as_promise`
- `volume_as_verdict`
- `level_as_exact_price`
- `future_information_leak`
- `outcome_bias`
- `forced_trade`
- `timeframe_shopping`
- `costs_omitted`
- `position_size_before_risk`
- `single_example_as_proof`

Final names and source alignment are editorial/schema decisions and require verification.

## 9. Mastery model

### 9.1 Purpose and transparency

Mastery is a bounded, deterministic estimate per skill. It answers “what evidence has this learner demonstrated recently across suitable tasks?” It does not predict returns or certify professional competence.

### 9.2 Inputs

Required inputs are:

- Correctness, including rubric-supported partial credit where applicable.
- Exercise difficulty.
- Hint usage.
- Repeated misconception tags.
- Review performance.

Response time may be recorded for diagnostics but must not materially reduce mastery. No time penalty should disadvantage screen-reader users, learners using larger text, people with motor or cognitive access needs, or learners processing bilingual terminology.

### 9.3 Update rules

The exact coefficients are a **beta decision requiring validation**. The implementation must nevertheless follow these rules:

- Scores stay within a documented closed range.
- Identical prior state and attempt history produce identical mastery.
- More difficult independent success can contribute more evidence than an easy success.
- Hints reduce the strength of evidence, not the learner's earned completion or dignity.
- Repeated occurrences of the same misconception limit rapid mastery growth and prioritize targeted variants.
- A single success cannot erase repeated lapses.
- Review success contributes evidence of retention, not merely initial performance.
- The learner can inspect the factors that changed the score in plain Hebrew.

### 9.4 Mastery states

A UI may translate the numeric score into descriptive bands such as “starting,” “developing,” “secure,” and “review needed.” Labels and thresholds are beta decisions and must be tested in Hebrew for clarity. Bands must not imply investment competence or guaranteed future performance.

## 10. Spaced review

### 10.1 Deterministic scheduler

The first beta uses SM-2 or another similarly explainable deterministic algorithm. The selected algorithm and parameters must be documented and tested rather than hidden behind an AI score.

Persist for each skill or review item, as the implementation model defines:

- Last review time.
- Next due time.
- Review interval.
- Ease or stability value.
- Lapse count.
- Mastery score.
- Append-only attempt history.

### 10.2 Review selection

The daily learning sequence prioritizes:

1. Required prerequisites.
2. Current lesson.
3. Due reviews.
4. Weak skills.
5. New material.

Within review, selection should favor overdue items, recent lapses, recurring misconceptions, and varied surface forms. The app explains why an item appears, for example “due today” or “practice confirmation vs. entry.”

### 10.3 Review quality

- A review should use a variant or transfer case rather than exact answer recall when possible.
- Failed reviews become due appropriately under the documented scheduler.
- Hinted success schedules more conservatively than independent success.
- Repeated easy success expands intervals within a tested upper bound.
- Review sessions mix recognition, construction, calculation, and judgment.
- Reviews never use response speed as a meaningful penalty.

## 11. Progression and unlocking

- Prerequisites form an acyclic, reachable graph.
- A lesson unlocks only when required prerequisites are satisfied under documented rules.
- The learner can see why a lesson is locked and what action unlocks it.
- Completion can unlock progression while weak mastery generates reviews; this prevents one difficult skill from trapping the learner indefinitely while still preserving remediation.
- New content is not prioritized ahead of genuinely due prerequisite review.
- The content validator fails if a reachable lesson cannot be unlocked.

Unlock thresholds and retry requirements are **beta decisions requiring usability validation**.

## 12. Hebrew-first instructional language

### 12.1 Tone

Hebrew copy is direct, friendly, and adult. It praises attention, evidence use, and willingness to wait. It avoids childish language, urgency, shame, bravado, and certainty.

Preferred feedback pattern:

- Name the evidence.
- State the conditional conclusion.
- Acknowledge ambiguity where present.
- Suggest the next observable check.

Avoid phrases equivalent to “sure win,” “obvious trade,” “guaranteed target,” or “you should buy/sell.”

### 12.2 Bilingual terminology

- Introduce the Hebrew term first and show the English term in an isolated LTR span when useful.
- Reuse a canonical bilingual glossary entry rather than translating ad hoc.
- Keep formulas, tickers, signed values, decimals, and English abbreviations in LTR containers.
- Use typography and punctuation that remain legible when Hebrew and English share a sentence.
- Test spoken labels with the target screen readers; visual order alone is insufficient.

### 12.3 Cognitive accessibility

- One primary judgment per screen.
- Concise prompt with optional expandable detail.
- Stable interaction instructions and icon meanings.
- No essential information conveyed only through animation.
- Repeatable chart legends and terminology.
- Hints that reduce complexity one step at a time.

## 13. Safety as a learning objective

The safety doctrine is not a disclaimer-only topic. It is repeatedly assessed through examples and feedback:

1. Scenarios are probabilistic, not certain.
2. Shape recognition without context is incomplete.
3. Reversal classification requires a preceding trend.
4. Bias and confirmation are distinct.
5. Confirmation and entry trigger are distinct.
6. Analytical invalidation and stop execution are distinct; execution price is not guaranteed.
7. Targets are estimates.
8. Volume supports evidence; it is not a standalone verdict.
9. Position size follows account risk and stop distance.
10. Spread, slippage, costs, liquidity, gaps, correlation, and leverage affect execution and risk.
11. One example is not statistical proof.
12. Wait/no-trade/insufficient-evidence are valid.
13. Process quality—not profit or risk-taking—is rewarded.
14. Nothing is personalized advice, a signal, or a buy/sell recommendation.

Each unit should identify which doctrine points it teaches, practices, and assesses. Editorial review should reject exercises whose visual framing or rewards contradict the written doctrine.

## 14. Capstone design

The capstone uses an unseen deterministic seed and records a response for every workflow stage.

### 14.1 Stages

- Context, structure, and level establish the evidence base.
- Setup and confirmation test conditional reasoning and missing-evidence discipline.
- Entry and invalidation test separation of analysis and execution concepts.
- Position size requires the supplied formula, costs, and input validation.
- Target and management are conditional plans, never predictions.
- Review asks whether the process was followed regardless of revealed outcome.

### 14.2 Branches

“Wait,” “reject,” and “insufficient evidence” must be valid terminal or pause states when encoded by the rubric. Selecting one does not skip learning: the learner still explains the missing condition and completes a process review.

### 14.3 Scoring

- Each step receives rubric-based evidence.
- Safety-critical distinctions cannot be offset solely by unrelated points.
- The report shows strengths, misconceptions, hint dependence, and recommended review skills.
- Hypothetical profit is excluded from the score.
- Revealed future candles do not alter the original decision score.

## 15. Exercise metadata and authoring workflow

Each exercise stores:

- Stable ID, schema version, editorial status, and content version.
- Skill IDs and difficulty.
- Hebrew prompt and optional English version.
- Interaction type.
- Deterministic chart spec and decision cutoff where applicable.
- Correct-answer rubric and normalized tolerance rules.
- Correct and alternative explanations.
- Misconception tags.
- Progressive hints.
- Source references and source-verification state.

Authoring sequence:

1. State the skill and observable outcome.
2. Choose positive, near-miss, ambiguous, lookalike, or transfer role.
3. Specify what the learner may know at decision time.
4. Define the rubric before writing distractors.
5. Write misconception-specific alternatives and hint ladder.
6. Generate and inspect the deterministic chart.
7. Add verified source page/chapter references.
8. Review Hebrew, mixed directionality, accessibility, and safety language.
9. Validate the content schema and seed annotations.
10. Promote editorial status only after human review.

## 16. Learning analytics without opaque scoring

Useful beta diagnostics include:

- Attempts and correctness by skill, difficulty, and exercise family.
- Hint stages used.
- Misconception recurrence and recovery on later variants.
- Due reviews completed, lapsed, and retained.
- “Wait/reject/insufficient” selection on appropriate and inappropriate scenarios.
- Drop-off by lesson step.
- Accessibility preferences and response time only in privacy-respecting aggregate diagnostics.

Analytics must not expose personal financial data, infer risk appetite, rank learners publicly, or convert response speed into mastery disadvantage.

## 17. Learning acceptance criteria

### 17.1 Curriculum and content

- Units 0–10 are mapped with valid skill and prerequisite metadata.
- Four coherent units, twelve short lessons, and sixty source-verified reviewed exercises form the implemented beta slice.
- Required exercise distributions and capstone are present.
- Published content has verified source references, Hebrew prompts, rubrics, explanations, hints, misconception tags, and schema versions.
- No placeholder prose is used merely to satisfy quantity.

### 17.2 Pedagogy

- The beta is not multiple-choice-only and uses chart interactions aligned with outcomes.
- Every wrong answer receives evidence-based, misconception-specific feedback.
- Hints progress from orientation to modeled support and answer reveal.
- Positive, near-miss, ambiguous, lookalike, and transfer cases are represented.
- The learner is repeatedly rewarded for disciplined waiting and rejection.
- Reversal lookalikes without a preceding trend are not accepted as valid reversal patterns.

### 17.3 Mastery and review

- Mastery updates are deterministic, bounded, explainable, and skill-specific.
- Correctness, difficulty, hints, recurring misconceptions, and review performance affect mastery.
- Response time does not materially penalize learners.
- Review state persists all required fields and attempt history.
- Due/failed review behavior is covered by deterministic tests.
- XP, streak, completion, mastery, and conceptual accuracy remain separate.

### 17.4 Fair grading

- Seed, chart state, rubric, and attempt produce reproducible results.
- Drawing tolerances behave consistently across screen dimensions.
- Alternate defensible answers are represented explicitly where appropriate.
- Ambiguous items accept the uncertainty option.
- Modifying candles after the decision cutoff cannot change the original grade.
- Risk calculations include expected per-unit costs and reject zero-distance, invalid-price, and division-by-zero cases.

### 17.5 Language and accessibility

- Published beta content has reviewed Hebrew.
- Mixed Hebrew/English, formulas, tickers, and numeric labels render and read correctly.
- Exercises remain operable with a screen reader, larger text, dark mode, and reduced motion.
- Meaning does not depend on red/green or animation alone.
- Interactive chart controls have descriptive labels and accessible alternatives where necessary.

### 17.6 Safety

- No exercise, hint, explanation, reward, or capstone result gives personalized advice or a buy/sell signal.
- No answer is graded by runtime AI.
- Outcomes never override process-based grading.
- Target, stop, volume, cost, and uncertainty language follows the doctrine in Section 13.

## 18. Manual learning validation

Observe representative Hebrew-speaking beginners completing the required journeys. Record whether they can:

- Explain scenarios rather than predictions after onboarding.
- Recover from a misconception after hints and a later variant.
- Identify higher highs/lows by tapping rather than guessing terminology.
- Draw an acceptable zone and understand tolerance feedback.
- Reject a reversal lookalike without a preceding trend.
- Wait when confirmation has not occurred.
- Calculate position size including costs and explain what `R` represents.
- Resume and understand a due review.
- Complete and explain all 11 capstone steps.

Also inspect the same journey with dark mode, reduced motion, larger text, and screen-reader navigation. Exact usability success thresholds require a beta research plan and are not asserted here.

## 18.1 Guided Analysis Session implementation

The Chart Lab now presents the existing reviewed `u10-capstone-e03` as one continuous, resumable
eleven-step analysis rather than eleven unrelated screens. The authored order, prompts, answer
choices, rubrics, three progressive session-wide hints, explanations, misconception references and
safety note are reused without editorial changes. The synthetic chart is a neutral observation
notebook because every current capstone step has a non-geometric rubric; learner drawings are saved
for process reflection but do not change correctness.

Draft, submitted and finalized are deliberately different learning states. Structural completeness
enables submission, submission advances the linear process, and finalization requires all eleven
submitted results plus a separate confirmation. A learner may revisit an earlier answer. Any edit to
a submitted step invalidates that result and all later submitted results, keeps the answers visible,
and requires sequential resubmission. This makes changed assumptions observable instead of silently
leaving contradictory downstream credit.

The final debrief reports process score, each step result, demonstrated/review skills, authored
misconception guidance, hints, correct no-trade use, risk/target accuracy, learner notebook marks,
source provenance and the deterministic next-review dates. It never converts later price movement
into a score or describes hypothetical profit. Finalization creates the same immutable capstone
attempt used by the rest of the learning system, so mastery, review, XP, activity and lesson progress
remain separate deterministic projections.

## 19. Verified evidence and tunable decisions

### Source verification completed

- The 87-page chapter, appendix, disclaimer, glossary, and figure audit is recorded in
  `docs/SOURCE_AUDIT.md`.
- Exact chapter/page alignment for the twelve lessons and sixty exercise briefs is recorded in
  `docs/CURRICULUM_MAP.md`.
- Canonical Hebrew terminology and the 27 bilingual glossary concepts were checked against PDF
  pp. 81–82 / book pp. 68–69.
- Content records still require item-level validation and human editorial review before release.

### Beta tuning required

- Lesson duration targets and item count per lesson.
- Mastery coefficients, bands, and unlock thresholds.
- Review ease/stability parameters, minimum/maximum intervals, and lapse behavior.
- Daily-goal defaults, XP values, and streak qualification.
- Hint cost in mastery evidence.
- Device-relative drawing tolerances for each interaction family.
- Final Hebrew copy, bilingual term frequency, and screen-reader phrasing.

These open decisions must be resolved through automated verification, Hebrew editorial review,
accessibility testing, and learner observation before release claims are finalized.
