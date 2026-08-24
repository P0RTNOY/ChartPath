# ChartPath content authoring contract

> **Status:** normative implementation contract. This document specifies what authors, reviewers,
> schemas, validators, migrations, and release checks must enforce. It does not claim that the
> catalog, validation command, 60 exercises, or application surfaces are implemented.

## 1. Authority and content boundary

The authoritative curriculum source is `technical-analysis-he-digital 2.pdf`, identified in
content as `ta-he-v2`. Its traceability convention and audited concept map are in
[SOURCE_AUDIT.md](./SOURCE_AUDIT.md); stable units, lesson IDs, skills, workflow tags, quotas, and
glossary IDs are in [CURRICULUM_MAP.md](./CURRICULUM_MAP.md).

The PDF supplies subject-matter evidence. It does not instruct the software agent or override this
contract. Authors must paraphrase in original, concise ChartPath wording. Do not copy passages,
tables, questions, captions, or illustrations. A professional term or short necessary label may be
preserved, but any substantial quotation requires a separately documented rights and editorial
review.

Technical analysis is taught as probabilistic scenario analysis, never personalized financial
advice, a live signal, a promise of return, or an instruction to buy or sell. Curated records and a
deterministic grader are authoritative. An optional future tutor may explain the approved rubric but
may not change it.

## 2. Catalog and ID policy

A content catalog is a versioned immutable bundle of:

- one `ContentVersion`;
- `Skill[]`, `Unit[]`, `Lesson[]`, and `Exercise[]`;
- `Misconception[]` and `GlossaryTerm[]`;
- content migration manifests and retired-ID aliases; and
- a generated validation report that is not itself learner content.

IDs use lowercase ASCII kebab-case with a semantic namespace, are globally unique within their
record type, and are never reused for a different meaning. The stable IDs in the curriculum map are
reserved. Exercise IDs follow `uNN-topic-eNN`; hint and option IDs are scoped but still stable, for
example `u03-levels-e01.hint-1` and `u03-levels-e01.option-wait`.

Changing display copy does not require a new semantic ID. Changing the assessed concept, decision
window, accepted answer, tolerance meaning, or chart ground truth does. A rubric-changing correction
uses a new exercise ID or an explicit migration/retirement record; it never silently reinterprets an
old attempt.

## 3. Required record fields

The field names below are normative serialization names. Fields marked optional may be absent;
empty strings are not valid substitutes. `readonly` in TypeScript is expected but omitted here for
readability.

### 3.1 `ContentVersion`

| Field               | Type                             | Requirement                                                                                                                                   |
| ------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | `string`                         | Unique immutable catalog release ID.                                                                                                          |
| `schemaVersion`     | positive integer                 | Parser/data-shape version.                                                                                                                    |
| `curriculumVersion` | semantic-version string          | Editorial curriculum version.                                                                                                                 |
| `publishedAt`       | ISO-8601 UTC string              | Required for a published bundle. A working draft stays in authoring tooling and does not become a `ContentVersion` until this value is known. |
| `sourceHash`        | non-empty string                 | Digest of normalized bundled source inputs and content records.                                                                               |
| `minimumAppVersion` | optional semantic-version string | Lowest compatible app version.                                                                                                                |

An exercise inherits the enclosing content-version ID. Attempts persist that ID so a later catalog
cannot rewrite the meaning of the answer.

### 3.2 `SourceReference`

The current domain shape is retained and interpreted strictly:

| Field       | Type             | Requirement                                                                                                                                            |
| ----------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sourceId`  | `string`         | `ta-he-v2` for the audited book.                                                                                                                       |
| `pageStart` | positive integer | First **physical PDF** page.                                                                                                                           |
| `pageEnd`   | positive integer | Last physical PDF page, inclusive and not below `pageStart`.                                                                                           |
| `section`   | `string`         | Required for ChartPath source-backed records. Format: `book pp. 25–27; Ch. 8; figs. 8.1–8.3`, or `book p. iii; How to use the guide` for front matter. |

`pageStart/pageEnd` never contain printed book pages. The printed page(s), chapter/appendix, and
figure IDs belong in `section`, making both numbering systems human-auditable without changing the
existing domain interface. A broad chapter range is not sufficient when a prompt, rubric, or figure
comes from a narrower page. Multiple disjoint ranges use multiple references.

`SOURCE_TBD`, guessed pages, a bibliography reference without the book page that discusses it, and
a local filesystem path are invalid publication references. Current legal, exchange, broker, or
regulatory claims require a separately audited primary source and source ID; the book bibliography
alone is provenance, not currency verification.

### 3.3 `Skill`

Required fields are `id`, `titleHe`, `descriptionHe`, `prerequisiteSkillIds`, `order`, and
`editorialStatus`. Optional fields are `titleEn` and `descriptionEn`. Every prerequisite resolves;
the graph is acyclic. The beta uses the exact IDs and prerequisite graph in the curriculum map.

### 3.4 `Unit`

Required fields are `id`, `order`, `titleHe`, `descriptionHe`, `prerequisiteUnitIds`, `lessonIds`,
`editorialStatus`, and `schemaVersion`. Optional fields are `titleEn` and `descriptionEn`.
`lessonIds` is ordered and contains no duplicates. Every beta unit is reachable from Unit 0.

### 3.5 `Lesson`

| Field                   | Type                     | Requirement                                                                            |
| ----------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `id`                    | stable lesson ID         | Unique and listed by exactly one unit.                                                 |
| `unitId`                | unit ID                  | Must resolve and contain this lesson in `lessonIds`.                                   |
| `order`                 | non-negative integer     | Stable display order within the unit.                                                  |
| `titleHe`, `summaryHe`  | non-empty Hebrew strings | Required for every status.                                                             |
| `titleEn`, `summaryEn`  | optional strings         | If present, receive explicit LTR rendering.                                            |
| `skillIds`              | non-empty unique array   | Every ID resolves.                                                                     |
| `prerequisiteLessonIds` | unique array             | Resolves, is acyclic, and makes the lesson reachable.                                  |
| `exerciseIds`           | ordered unique array     | Beta lesson: exactly five; all resolve back to this lesson through catalog membership. |
| `estimatedMinutes`      | positive integer         | Editorial estimate, not a timer or mastery input.                                      |
| `sourceReferences`      | non-empty array          | Exact references under Section 3.2.                                                    |
| `editorialStatus`       | status enum              | Governed by Section 4.                                                                 |
| `schemaVersion`         | positive integer         | Record-shape version.                                                                  |

The content schema must additionally expose `workflowStepIds` on lessons and exercises before beta
publication. It is a non-empty unique subset of the canonical eleven IDs in the curriculum map,
stored in canonical order. This field is not present in the initial domain interface; publication
must not hide it in free-form prose or infer it from titles.

### 3.6 `Exercise`

Required core fields are:

| Field                     | Type                            | Requirement                                                                                |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| `id`                      | stable exercise ID              | Unique; maps to exactly one beta lesson.                                                   |
| `skillIds`                | non-empty unique skill-ID array | All resolve.                                                                               |
| `workflowStepIds`         | non-empty workflow-tag array    | Schema extension required before publication; ordered canonically.                         |
| `difficulty`              | integer `1..5`                  | Calibrated relative to this beginner curriculum.                                           |
| `promptHe`                | non-empty Hebrew string         | One clear task and all information needed at the decision window.                          |
| `promptEn`                | optional string                 | Translation, not a substitute for Hebrew.                                                  |
| `interactionType`         | supported interaction enum      | Must be supported by the player and compatible with the rubric/answer adapter.             |
| `options`                 | optional option array           | Required when the interaction displays authored choices.                                   |
| `chartSpec`               | optional `ChartSpec`            | Required for chart-dependent tasks.                                                        |
| `rubric`                  | `AnswerRubric`                  | Required and deterministic.                                                                |
| `explanationHe`           | non-empty Hebrew string         | Explains evidence and why the accepted answer follows.                                     |
| `explanationEn`           | optional string                 | Secondary translation.                                                                     |
| `alternativeExplanations` | array                           | May be empty only when no authored alternative exists; common distractors require entries. |
| `misconceptionIds`        | unique misconception-ID array   | All resolve; may be empty only after an explicit editorial determination.                  |
| `hints`                   | ordered hint array              | Published exercises require a progressive ladder.                                          |
| `sourceReferences`        | non-empty exact reference array | Covers prompt doctrine and rubric; add separate refs if they differ.                       |
| `isAmbiguous`             | optional boolean                | Must be `true` for authored ambiguity under Section 9.                                     |
| `editorialStatus`         | status enum                     | Governed by Section 4.                                                                     |
| `schemaVersion`           | positive integer                | Record-shape version.                                                                      |

Every exercise also needs an authored uncertainty/safety note. Until a dedicated field is added, it
is the final clearly labelled paragraph of `explanationHe`; the schema should prefer a future
`safetyNoteHe`/`safetyNoteEn` pair so it can be validated and surfaced contextually. It states the
relevant limit—for example target-as-estimate, fragmented volume, gap risk, or lack of statistical
proof—without generic disclaimer spam.

`interactionType` may be `multiple-choice`, `selection`, `sequence`, `point`, `zone`, `line`,
`risk`, `decision`, `label-placement`, `timeframe-comparison`, `mistake-diagnosis`, or
`sequential-reveal`. The content validator must reject an interaction the lesson player cannot
render and grade end to end. A UI label alone does not make an unsupported interaction valid.

### 3.7 Exercise child records

`ExerciseOption` requires `id` and `labelHe`; `labelEn` is optional. Option IDs express semantics,
not position (`option-wait`, not `option-2`), so display reordering is harmless.

`ExerciseHint` requires `id`, integer `level`, and `textHe`; `textEn` is optional. Levels are unique,
contiguous, and increasing from 1.

`AlternativeExplanation` requires `answerId` and `explanationHe`; `explanationEn` and
`misconceptionId` are optional. `answerId` must resolve to an option, reason, selection, or stable
feedback key used by the rubric. When an alternative embodies a known misconception,
`misconceptionId` is required.

### 3.8 `Misconception`

Required fields are `id`, `titleHe`, `explanationHe`, `skillIds`, and
`remediationLessonIds`; `titleEn` and `explanationEn` are optional. IDs describe reasoning errors,
for example `misconception.pattern-without-prior-trend`, not a single wrong option. Remediation
lessons and skills must resolve. Explanations diagnose the mistake without shame or profit language.

### 3.9 `GlossaryTerm`

The domain currently lacks a glossary record and must add one before the glossary can be claimed.
The required shape is:

| Field                    | Type                     | Requirement                                                |
| ------------------------ | ------------------------ | ---------------------------------------------------------- |
| `id`                     | stable `term.*` ID       | One of the 27 beta IDs in the curriculum map.              |
| `termHe`                 | non-empty string         | Primary display term.                                      |
| `termEn`                 | non-empty string         | English professional term, explicitly LTR.                 |
| `abbreviation`           | optional string          | For `ATR`, `R`, and similar terms; LTR.                    |
| `aliasesHe`, `aliasesEn` | string arrays            | Search forms; normalized and deduplicated.                 |
| `definitionHe`           | non-empty Hebrew string  | Original concise source-faithful definition.               |
| `definitionEn`           | optional string          | Secondary definition.                                      |
| `relatedSkillIds`        | non-empty skill-ID array | All resolve.                                               |
| `sourceReferences`       | non-empty array          | Exact PDF/book glossary page and any doctrine page needed. |
| `editorialStatus`        | status enum              | Governed by Section 4.                                     |
| `schemaVersion`          | positive integer         | Record-shape version.                                      |

Search normalization may ignore Hebrew niqqud, ASCII case, and harmless hyphen/spacing differences;
it must not merge different concepts such as invalidation and stop order.

### 3.10 `ChartSpec` and semantic annotations

`ChartSpec` requires `id`, safe-integer `seed`, pinned `generatorVersion`, integer `candleCount`,
`timeframe`, `scenario`, positive `basePrice`, positive `baseVolume`, positive `volatility`, and
non-negative `noise`. `decisionCandleIndex` and serializable `parameters` are optional unless the
exercise needs them. A decision exercise requires `decisionCandleIndex`.

Supported scenarios are `uptrend`, `downtrend`, `range`, `breakout`, `retest`, `false-breakout`,
`reversal`, `continuation`, `ambiguous`, and `lookalike`. Generator parameters may further declare
the regime, direction, variant, level reaction, relative-volume profile, gap kind, pattern, event
index, and time interval, but authored values must pass the chart-engine schema rather than relying
on undocumented keys.

Ground truth is generated as separate `ChartAnnotation` records: `point`, `zone`, `line`, `range`,
`pattern`, or `event`. Every annotation has a stable `id` and semantic `role`; it may declare
`visibleFromCandleIndex`. Semantic annotations never live only as rendered pixels.

### 3.11 `AnswerRubric`

The rubric `kind` must match the submitted answer kind used by the deterministic grader:

| Kind              | Required fields                           | Authoring rule                                                                                                     |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `multiple-choice` | `acceptedOptionIds`                       | Non-empty; every ID resolves to an option.                                                                         |
| `selection`       | `expectedIds`, `mode`                     | `mode` is `exact` or `contains`; `allowExtraSelections` is explicit.                                               |
| `sequence`        | `expectedOrder`                           | Non-empty, unique, and contains exactly the draggable semantic IDs.                                                |
| `point`           | `targets`, `tolerance`, `matching`        | Targets use candle index and price; declare `all`/`any`, extra-point policy, and decision index.                   |
| `zone`            | `target`, `minimumIntersectionOverUnion`  | Target bounds are valid; IoU threshold is finite in `(0,1]`; decision index is explicit.                           |
| `line`            | `target.start`, `target.end`, `tolerance` | Declare direction invariance and decision index.                                                                   |
| `risk`            | `expected`, `tolerance`                   | Expected keys are from `accountRisk`, `stopDistance`, `perUnitRisk`, `positionSize`, `riskMultiple`.               |
| `decision`        | `acceptedDecisions`                       | Non-empty subset of `trade`, `wait`, `reject`, `no-trade`, `insufficient-evidence`; required reasons are explicit. |

Every rubric may attach `misconceptionIds`. Multi-part and richer interactions must compile to one of
these deterministic rubric shapes or add a new tested domain rubric before publication. They may not
be graded through ad-hoc component logic.

The current risk field set does not separately encode entry, stop, expected per-unit costs, or
expected value. A position-size author must therefore put the provided inputs in the prompt and use
`perUnitRisk = abs(entry - stop) + expectedPerUnitCosts`. Before richer calculators are published,
the domain schema should add explicit input/result fields rather than overloading `stopDistance`.

## 4. Editorial statuses and promotion

`editorialStatus` is exactly `draft`, `reviewed`, or `published`.

- `draft`: work may be incomplete, may fail non-safety completeness rules, and is never included in
  the learner production path. Draft metadata may reserve an ID and source range without generic
  lesson prose.
- `reviewed`: the record is complete and has passed source, Hebrew, pedagogy, grading, safety, and
  deterministic chart review by humans other than the primary author. It may be used in an explicit
  internal beta catalog, but is not a release claim.
- `published`: a reviewed record has passed catalog validation and release approval in a frozen
  `ContentVersion`. Only published content is resolved by the production learner path.

Promotion is monotonic within a catalog version: `draft → reviewed → published`. A correction does
not demote or mutate a catalog already used by attempts; it creates a new content version and, when
needed, a new semantic ID or retirement manifest.

The “60 reviewed exercises” gate means all 60 have evidence of completed human review. In a shipped
learner catalog their current status is `published`; publication is proof that review occurred, not a
fourth unreviewed category. Reviewer identity/date may live in editorial sidecar metadata excluded
from the learner bundle, but release evidence must retain it.

## 5. Source and reference rules

### 5.1 Guided-session publication contract

A guided session does not create a second content record. It resolves one reviewed capstone and
persists the capstone's stable exercise/content/schema identity, pinned chart identity and the exact
authored rubric for every canonical step. A later editorial change that alters any of those
identities must use an explicit migration or ask the learner to preserve the old draft as abandoned
and start a compatible draft; the player must not silently reinterpret saved answers.

The current Guided Analysis scenario is `u10-capstone-e03`. All eleven steps inherit its verified
`ta-he-v2` reference: physical PDF pages 74–75, printed book pages 61–62, Chapter 19, case C. The
record does not provide narrower step-specific references, so the UI truthfully labels that shared
range as the source for the scenario and all steps. The chart notebook is learner-authored scratch
evidence only: adding an official geometric requirement would require a reviewed step rubric and
source audit, not a UI-only change.

1. Read the entire relevant page range, including caption, warning, exercise, and nearby qualifier;
   do not extract a rule from a diagram alone.
2. Cite the narrowest range that supports the prompt and rubric. Cite separate disjoint ranges
   separately.
3. Record both physical PDF and printed book numbering under Section 3.2.
4. Figures are conceptual references, not assets. Recreate the learning relationship using a new
   seed and original styling. Do not trace, crop, screenshot, or redraw data point for data point.
5. Use original ChartPath wording. Avoid long quotations and source-specific anecdotes when a concise
   transformation teaches the concept.
6. Preserve qualifiers: probabilistic language, prior-trend requirements, target uncertainty,
   volume limitations, execution risk, costs, and market-specific assumptions.
7. A current factual claim about rules, market operation, regulation, or product behavior needs a
   current primary source review. Do not elevate the book's bibliography into an automatically
   current claim.
8. Unsupported course expansions—indicator systems, candlestick catalogs, options strategies,
   microstructure, broker behavior, tax, or portfolio optimization—need a separately audited source
   and curriculum decision.

## 6. Hebrew-first and mixed-direction authoring

Hebrew is required for published beta titles, summaries, prompts, options, hints, explanations,
misconceptions, glossary terms, safety notes, and accessibility text. English is optional except for
the glossary's professional term and approved bilingual terminology.

- Hebrew prose is authored naturally in RTL. Do not manually reverse text or insert visual-order
  spaces.
- English terms, IDs, tickers, dates, timestamps, formulas, decimal values, signed numbers, axes,
  `OHLC`, `ATR`, `HH/HL`, `LH/LL`, and `R` are rendered with Unicode isolation or a dedicated LTR
  component. Content strings should store logical order, not layout hacks.
- Prefer `תמיכה (Support)` on first meaningful introduction, then the stable Hebrew term. Reuse the
  glossary entry; do not invent per-lesson translations.
- The canonical Hebrew workflow is: הקשר, מבנה, רמה, תצורה, אישור, כניסה, נקודת ביטול, גודל
  פוזיציה, יעד, ניהול, תחקור.
- Write direct, adult, encouraging Hebrew. Praise evidence, precommitment, and disciplined waiting.
  Avoid certainty, urgency, shame, bravado, casino language, and simulated-profit celebration.
- Punctuation, parentheses, minus signs, ranges, percentages, currency, and formulas require visual
  inspection in mixed-direction sentences. Screen-reader order must also be tested.

## 7. Prompts, hints, misconceptions, and feedback

### Prompts

A prompt asks one primary judgment per screen, identifies the decision candle and units when
relevant, and provides every assumption required by the rubric. It does not reveal future candles,
imply that a pattern must exist, or use “buy/sell now” language. Real-looking synthetic symbols are
neutral and clearly labelled as synthetic.

### Hint ladder

Published exercises require at least two and normally three contiguous hint levels:

1. **Orient:** remind the learner which context, workflow stage, or prerequisite to inspect.
2. **Focus:** point to the relevant evidence or relationship without naming the answer.
3. **Procedure:** give the next method or calculation step. If this makes the answer unavoidable,
   record the hint use and schedule mastery conservatively.

Hints never introduce information absent at the decision candle. Repeating the prompt, saying “try
again,” or revealing the correct option as the first hint is invalid.

### Misconceptions and alternatives

Each plausible wrong path maps to a stable misconception when one exists. Feedback follows:

`observed evidence → reasoning error → correct conditional rule → next check`.

“Incorrect” by itself is forbidden. Arithmetic errors and concept errors receive different feedback.
Alternative explanations cover every authored distractor and the most likely tolerance miss; they do
not ridicule the learner or treat a losing outcome as proof of bad reasoning.

### Correct explanation

The explanation states why the rubric accepts the answer, which evidence was visible, what remained
uncertain, and which condition would change the conclusion. It distinguishes confirmation from entry,
invalidation from stop execution, and target estimate from promised outcome whenever those concepts
appear.

## 8. Rubrics, partial credit, and tolerances

Official grades are pure and deterministic. Content must not ask an AI model, current market result,
or hidden future candle to adjudicate correctness.

- Exact categorical tasks list stable accepted IDs. Ordering of displayed options is irrelevant.
- Multi-select authors explicitly choose exact-match versus contains and whether extras are allowed.
- Multi-part tasks assign deterministic components that sum to a score in `[0,1]`; correctness
  thresholds and partial-credit weights are written before learner testing.
- Point and line tolerances use fractions of the **visible candle span and visible price span**, not
  pixels. Horizontal and vertical tolerances are finite and in `(0,1]`.
- Zone grading uses intersection-over-union with a finite inclusive threshold in `(0,1]`.
- A boundary exactly at the declared threshold is accepted. The same answer must grade identically
  at phone, tablet, and web sizes.
- Targets and learner answers beyond `decisionCandleIndex` are invalid. Normalization uses only the
  declared visible range.
- Numeric tolerances state absolute and/or relative tolerance. Inputs and expected values are finite;
  zero or negative risk budget, zero entry-stop distance, impossible prices, and division by zero are
  rejected with specific feedback.
- Position size uses `account risk / (abs(entry - stop) + expected per-unit costs)`. The rounding rule
  and whether fractional units are permitted are authored explicitly. Costs cannot be omitted or
  represented as negative.
- A target, later profit, or later loss never changes the correctness of reasoning that was assessed
  at the decision candle.

Rubric review includes hand-worked examples at the pass boundary, just inside, just outside, and at
different visible ranges. Risk rubrics cover normal, fractional, zero-distance, excessive-risk,
cost-heavy, correlated, and gap-risk cases.

## 9. Ambiguous and uncertainty-answer exercises

Ambiguity is curated ground truth, not “accept anything.” An ambiguous published exercise must:

- set `isAmbiguous: true`;
- use a `decision` rubric that accepts at least one of `wait`, `no-trade`, or
  `insufficient-evidence`, or an equivalent tested rubric for the interaction;
- identify the specific missing/conflicting evidence in `requiredReasonIds`;
- explain what new observable evidence could resolve the case;
- avoid using future outcome to decide whether waiting was correct; and
- use a chart scenario/variant consistent with `ambiguous`, `near-miss`, or `lookalike` ground truth.

The uncertainty choices have different meanings:

- `wait`: a valid setup may be developing, but predefined confirmation or required data is not yet
  available;
- `reject`: a prerequisite or constraint fails, so this setup should not remain active under the
  stated rules;
- `no-trade`: the complete process concludes that no acceptable educational setup exists under the
  declared constraints;
- `insufficient-evidence`: the supplied data cannot support the requested classification.

Do not mark all four correct for convenience. Near-miss examples deliberately omit one named
prerequisite. Lookalikes assess whether the learner can resist a superficial shape. The beta quota is
validated from accepted rubric values and scenario metadata, not the presence of these words in copy.

## 10. Seeded chart authoring

1. Choose the teaching claim and decision point before choosing a visually attractive seed.
2. Select an appropriate supported scenario and variant: positive, near-miss, ambiguous, or
   lookalike.
3. Author a complete serializable `ChartSpec` with a pinned generator version and safe-integer seed.
4. Generate candles and semantic annotations outside the UI. Verify OHLC invariants, positive volume,
   exact candle count, event placement, and required semantic roles.
5. Set `decisionCandleIndex`; the prompt, chart viewport, rubric, hints, accessibility summary, and
   grader may use only candles/annotations visible through that index.
6. Keep post-decision candles in a separate reveal path. They may illustrate uncertainty after
   submission but do not amend the grade.
7. Check the seed at the smallest and largest supported chart widths, in light/dark mode and without
   color-only meaning. Dense figures become progressive screens rather than unreadable miniatures.
8. Snapshot the normalized spec, generator version, candle hash, and annotation hash in validation.
   The same inputs must reproduce exactly the same outputs.

Do not use `Math.random()`, an unpinned current generator, live market data, or a source figure's data
points. If frozen historical/licensed data is proposed later, record instrument, venue, source,
timezone, session, adjustment method, data latency/date, and rights; otherwise it cannot be
published.

## 11. Integrated workflow and capstone records

The capstone is a sequence of deterministic exercise records over one unseen seeded scenario, not a
single free-form answer. It stores separate response fields or step exercises for:

1. `context`
2. `structure`
3. `level`
4. `setup`
5. `confirmation`
6. `entry`
7. `invalidation`
8. `positionSize`
9. `target`
10. `management`
11. `review`

Within those stages, the authored plan retains separate semantic values for `observation`, `setup`,
`confirmation`, `entryTrigger`, `expectedFill`, `invalidation`, `stopOrder`, and `takeProfit`.
Confirmation and trigger may share a timestamp but never a field. Invalidation is an analytical
condition; `stopOrder` is a fallible execution mechanism. `takeProfit` is an exit rule and the target
is an estimate.

Each stage has its own rubric, feedback key, and misconception mapping. A later accepted stage cannot
retroactively repair an earlier unsupported answer. The summary scores process, precommitment,
uncertainty handling, costs, and review—not simulated profit.

## 12. Versioning, retirement, and migrations

There are three independent versions:

- `schemaVersion`: shape/parser compatibility;
- `curriculumVersion`: authored catalog release;
- `generatorVersion`: seeded chart algorithm identity.

All three are persisted where required to reproduce an attempt. Published bundles are immutable.
Old generator versions needed by retained attempts remain available, or the app keeps the generated
snapshot/hash necessary to explain the historical result.

A content migration manifest must declare:

| Field                                    | Meaning                                                            |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `id`                                     | Stable migration ID.                                               |
| `fromContentVersion`, `toContentVersion` | Exact version edge; no wildcard migration.                         |
| `idAliases`                              | Old-to-new navigation aliases; never rewrites IDs in old attempts. |
| `retiredExerciseIds`, `retiredLessonIds` | Content no longer assigned to new sessions.                        |
| `replacementIds`                         | Optional learner-path successors.                                  |
| `projectionPolicy`                       | Which derived progress/mastery projections may be rebuilt and why. |
| `notesHe`                                | Learner-safe explanation when retirement affects the visible path. |

Migrations are forward-only, deterministic, idempotent at their guarded entry, and tested from every
supported beta version. They preserve append-only attempts and completion evidence. Retiring an
exercise prevents new assignment but does not delete or silently regrade its attempts. A rubric
correction may recompute a derived projection only when the manifest explicitly defines a safe,
version-aware policy; the original result remains attached to the original attempt.

Draft metadata may change freely before publication as long as reserved IDs are not repurposed.
Once a record has appeared in a reviewed external test or published bundle, follow the same explicit
retirement discipline.

## 13. Validation and editorial workflow

### Authoring sequence

1. Reserve IDs and link the unit, lesson, skill prerequisites, and workflow tags.
2. Read and record the narrow source pages; write the doctrine and safety limits in an editorial
   note.
3. Author original Hebrew prompt, answer model, explanation, alternatives, misconceptions, and hint
   ladder.
4. Create the seeded chart and semantic ground truth if needed; freeze decision visibility.
5. Write the deterministic rubric and hand-work boundary cases.
6. Run schema and catalog validation while the item remains `draft`.
7. Obtain independent source-fidelity, Hebrew, learning-design, financial-safety, and grading review.
8. Run deterministic generation/grading tests and interaction/accessibility checks.
9. Promote to `reviewed` only when evidence is recorded.
10. Assemble a frozen catalog, rerun the full gates, and promote approved records to `published`.

### Required automated validation

The content command (intended as `pnpm --filter @chartpath/content validate`) fails for:

- duplicate or malformed IDs;
- unsupported schema/content/generator versions;
- unresolved skills, units, lessons, exercises, misconceptions, glossary terms, aliases, or
  prerequisites;
- prerequisite cycles, unreachable lessons, mismatched unit/lesson membership, or incorrect beta
  ordering;
- a beta lesson with other than five exercises or a beta catalog with other than 12 lessons and 60
  exercises;
- exercise mix or ambiguity/no-trade/risk quotas below the curriculum contract;
- missing Hebrew in a reviewed/published record;
- absent/invalid source references, guessed markers, physical PDF pages outside `1..87`, printed-page
  mismatch, or missing chapter/figure detail where used;
- missing rubric, explanation, hint ladder, required alternative feedback, workflow tags, or
  misconception references;
- interaction/rubric incompatibility or an interaction not supported end to end;
- chart-dependent content without a valid `ChartSpec`, reproducible annotations, or a valid decision
  index;
- non-reproducible candles/annotations, invalid OHLCV, annotation roles absent from the rubric, or a
  target/answer that relies on a future candle;
- missing, invalid, screen-dependent, or untested drawing/numeric tolerance;
- a published ambiguous exercise that lacks an accepted uncertainty answer and required reason;
- a position-size answer that omits expected per-unit costs or accepts zero distance/invalid numeric
  inputs;
- collapsed invalidation/stop/take-profit fields in integrated work;
- certainty, personalized recommendation, guaranteed-return, or casino/profit-reward language; and
- published visuals copied from the source or lacking rights/provenance metadata.

### Human review record

Automation cannot determine source fidelity, idiomatic Hebrew, pedagogical fairness, accessibility,
or misleading financial tone. The editorial sidecar records record ID/version, review dimension,
reviewer, timestamp, decision, and notes. No author self-approves all required dimensions.

Required review dimensions are:

- source and copyright transformation;
- Hebrew and bilingual terminology;
- learning objective, difficulty, hint progression, and misconception quality;
- rubric determinism, partial credit, and tolerance fairness;
- probabilistic/risk/no-advice language;
- chart truth, future-candle isolation, and calculation arithmetic; and
- accessibility and mixed-direction presentation.

### Release verification

After content validation, run repository type checking, tests, linting, formatting checks, and the
root `pnpm check`. For a mobile content/UI release, export Expo web and inspect representative Hebrew
screens at phone and tablet widths in light/dark, reduced-motion, large-text, and screen-reader paths.
Manually exercise at least one item from every interaction family plus every ambiguous and
position-size boundary class.

Validation output and screenshots are evidence only after the commands and journeys actually run.
This contract must not be cited as proof that they passed.
