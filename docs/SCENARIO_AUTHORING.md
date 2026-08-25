# Scenario authoring and deterministic generation

**Status:** Milestone 5 internal candidate contract implemented; final milestone verification is
still in progress and this is not a publication claim

**Authoring schema:** `1`

**Compiler:** `scenario-compiler-v1`

The authoritative scenario definitions live in `packages/content/src/scenarios`, outside React and
React Native. They compile into three separate artifacts: a generated historical dataset, a virtual
eleven-step capstone exercise, and a historical replay scenario that can optionally enable the
versioned paper-execution engine. UI components consume those artifacts; they do not define source
truth, scoring, or execution outcomes.

The current authoring surface is TypeScript. `parseScenarioAuthoringManifest` checks the required
top-level runtime shape and `compileScenarioSafely` converts parse/compilation failures into issues,
but nested runtime-schema validation is not yet exhaustive. Serialized external authoring input is
therefore not an approved workflow. There is also no standalone JSON editor or approval service.

## 1. Authoring manifest

`ScenarioAuthoringManifestV1` records the following material:

| Area                 | Fields and meaning                                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity             | `schemaVersion`, compiler version and compiler-contract checksum; stable `scenarioId` and immutable semantic `scenarioVersion`; stable `datasetId` and `datasetVersion`          |
| Learner presentation | Original Hebrew title, prompt, blind evidence summary, hints, difficulty, prerequisites, accessibility descriptions, financial-safety disclosure and all workflow prompts        |
| Deterministic chart  | `chartSpec`, its checksum, the generated canonical dataset checksum, and the final material-artifact checksum                                                                    |
| Replay boundary      | Decision candle, initial visible range, permitted replay boundary, knowledge cutoff, and blind reveal only after finalization                                                    |
| Guided support       | Whether Guided Analysis is enabled, the available hint count, and the requirement that guidance preserve the decision cutoff                                                     |
| Application          | One authored expected application decision: directed trade, or a recognized no-trade disposition                                                                                 |
| Rubric               | Versioned rubric identity and checksum, one criterion per canonical workflow step, required rationale IDs, and explicit score independence from execution status and profit/loss |
| Trade execution      | When a trade is valid: permitted direction/order type, a fully authored plan, expected final status/evidence and an exact checksum-pinned event/debrief snapshot                 |
| Educational source   | Exact repository source identity, reviewed content IDs, physical PDF and printed-book pages, section, PDF document, chapter, figure/case, reviewed concept and Hebrew rationale  |
| Licensing            | Current generated-data owner, generated-only flag, redistribution status and internal publication status                                                                         |
| Review and lifecycle | Publication ledger, review records, per-area review states, review fingerprint, retirement and optional replacement identity                                                     |

The stable generator seed and generator version, candle count and interval are part of `chartSpec`.
The compiler then pins the resulting canonical candle artifact by checksum. The compiler version and
the canonical checksum of `SCENARIO_COMPILER_CONTRACT_V1` are also material: changing neutral
learner copy, distractor policy, grader identity or paper disclosure in that contract invalidates the
manifest fingerprint. Geometry is expressed in candle indexes and prices; screen coordinates are
not authoritative scenario content.

Two requested areas are not independently configurable in the current manifest. The compiler fixes
the generated datasets to one-hour candles, `Asia/Jerusalem`, a continuous 24×7 synthetic session,
raw/unadjusted prices, explicit actions only, and never-invent-candles gap handling. Likewise, the
licensing block is deliberately fixed to ChartPath-generated, internal, redistribution-prohibited
data. Generalizing either area requires a later schema version and renewed validation; authors must
not imply that those fields are currently free-form.

Credit eligibility is not an author-controlled manifest flag. It is derived from the closed
historical-content publication gate. An internal candidate therefore cannot opt itself into mastery
or course credit.

## 2. Educational-source discipline

Every technical-analysis prompt, hint, expected decision, criterion, invalidation or target rule
must be traceable to a reviewed repository source record. The compiler requires the physical and
printed page identity to exactly match an existing reviewed exercise or lesson reference, and it
requires non-empty document, chapter, figure/case, concept and rationale fields.

Exact-reference matching proves that the referenced page record exists. It does **not** prove that a
human has reviewed the new scenario wording, synthetic chart, expected decision, eleven-step rubric
or its application of the cited concept. Those remain separate review gates.

Authors must:

- use original Hebrew wording;
- cite the exact reviewed repository source rather than a generic internet trading rule;
- keep educational doctrine separate from ChartPath's execution-policy assumptions;
- avoid copying source prose, charts, diagrams, price series or distinctive compositions; and
- leave an unsupported concept unpublished with a precise source-review blocker.

The compiler also checks that the generated replay's educational references and deterministic
rubric identity exactly match the compiled virtual exercise. A mismatch is structural, not a
warning.

## 3. Deterministic generation

For each manifest, the compiler currently performs this pipeline:

1. Validate the supported manifest version and required top-level shapes.
2. Recompute the canonical chart-spec and process-rubric checksums.
3. Generate the full chart from the pinned `ChartSpec`, stable integer seed and generator version.
4. Serialize the candles to the strict historical CSV shape.
5. Import them through the historical-data importer with fixed synthetic provenance, timezone,
   session, adjustment and gap policies.
6. Compare the resulting canonical dataset checksum with `generatedDatasetChecksum`.
7. Compile a private eleven-step grading exercise and deterministic rubric identity.
8. Derive a distinct learner exercise projection containing prompts, choices, safety and
   accessibility text but no rubric, accepted answer, explanation, source identity, dataset
   identity or execution expectation.
9. Compile the blind historical replay and its cutoff-bound dataset identity against the private
   grading exercise.
10. For trade candidates, run the real paper-execution reducer and compare final status, evidence
    and the complete canonical event/debrief snapshot with the authored expectation.
11. Return structural issues and publication blockers separately.

Compilation uses a fixed provenance time and canonical serialization. The same manifest must
therefore reproduce the same candles, dataset checksum, rubric identity, material checksum,
execution evidence, ordered event facts, debrief facts and reports. Each expected execution snapshot
has its own checksum; the compiler rejects both a malformed snapshot checksum and any canonical
difference from the real engine output.

The private/learner exercise split is a security and pedagogy boundary. The internal historical
registry stores both projections under different fields. Learner components receive only the narrow
projection; validators and deterministic grading receive the private `ContentExercise`. A learner
DTO must never be recreated by serializing `CompiledScenarioCandidate` wholesale.

The available commands are:

```bash
pnpm scenarios:validate
pnpm scenarios:report
pnpm scenarios:preview
```

- `scenarios:validate` prints a human-readable candidate summary and fails on an invalid library
  shape or structural error. It does not publish anything.
- `scenarios:report` emits the canonical machine-readable readiness report, including every
  candidate blocker and execution-evidence label.
- `scenarios:preview` emits the learner-safe blind projections used for inspection. It contains
  only candles and annotations permitted at the knowledge cutoff and neutral presentation fields.

The preview command is a diagnostic projection, not proof against bundle or developer-tool
inspection. Tests also scan the serialized preview for current answer-bearing identifiers, but the
compiler does not yet perform a general semantic information-flow proof over arbitrary future
learner text.

## 4. Process rubric and decision model

Each candidate reuses the canonical workflow:

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

The authored application decision is either a directionally aligned trade or no trade. A no-trade
candidate has no expected execution plan and cannot compile an aligned paper ticket. Its management
criterion still requires an authored evidence-before-outcome rationale. Future candles cannot turn
a disciplined no-trade decision into an error.

For trade candidates, the manifest pins direction, order type, entry intent, stop, target, quantity,
fictional risk values, decision-candle authorship, expected deterministic state and required
execution evidence. The compiler rejects direction/order contradictions and exercises the versioned
paper engine rather than duplicating fill logic in content.

All candidate rubrics currently state:

```text
executionStatusAffectsScore = false
profitAndLossAffectsScore = false
```

The compiled capstone grades evidence and decision consistency deterministically. A target outcome
does not rescue an incoherent process; a protective-stop or unfilled outcome does not invalidate a
coherent one; and correct no trade can receive the same process credit as a coherent trade. There is
no AI grading.

## 5. Current candidate inventory

The internal registry declares nine candidates: three long-analysis, three short-analysis and three
correct no-trade candidates. The committed machine-readable report currently contains zero
structural issues and 97 explicit publication blockers. This is an authoring/QA inventory, not the
ordinary learner catalog; the ordinary published projection is empty.

| Candidate                                 | Difficulty  | Application | Reviewed content and exact educational source                                                                       | Authored execution evidence                           |
| ----------------------------------------- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `internal-long-range-breakout@1.0.0`      | Guided      | Long        | `u10-capstone-e01`; `ta-he-v2`, PDF 72–73 / printed 59–60, Chapter 19, case A and Figure 19.1                       | Market entry and target                               |
| `internal-long-inverse-hs@1.0.0`          | Independent | Long        | `u05-reversal-e02`; `ta-he-v2`, PDF 39 / printed 26, Chapter 8, Figure 8.2                                          | Market entry and protective stop                      |
| `internal-long-triangle@1.0.0`            | Blind       | Long        | `u05-continuation-e01`; `ta-he-v2`, PDF 44–46 / printed 31–33, Chapter 10, Figures 10.1–10.2                        | Stop entry and explicit ambiguity                     |
| `internal-short-double-top@1.0.0`         | Guided      | Short       | `u05-reversal-e04`; `ta-he-v2`, PDF 41 / printed 28, Chapter 9, Figure 9.1                                          | Market entry and target                               |
| `internal-short-head-shoulders-gap@1.0.0` | Independent | Short       | `u05-reversal-e01`; `ta-he-v2`, PDF 38–39 / printed 25–26, Chapter 8, Figures 8.1–8.2                               | Stop entry, opening gap and target                    |
| `internal-short-rising-wedge@1.0.0`       | Blind       | Short       | `u05-continuation-e04`; `ta-he-v2`, PDF 47–49 / printed 34–36, Chapter 11, Figures 11.1–11.2                        | Limit entry and unfilled order                        |
| `internal-no-trade-capstone-c@1.0.0`      | Guided      | No trade    | `u10-capstone-e03`; `ta-he-v2`, PDF 74–75 / printed 61–62, Chapter 19, case C                                       | None; no order may be created                         |
| `internal-no-trade-capstone-d@1.0.0`      | Independent | No trade    | `u10-capstone-e04`; `ta-he-v2`, PDF 75 / printed 62, Chapter 19, case D                                             | None; no order may be created                         |
| `internal-no-trade-gap-uncertainty@1.0.0` | Blind       | No trade    | `u06-breakouts-e02`; `ta-he-v2`, PDF 53–54 / printed 40–41, Chapter 13, no separately reviewed full no-trade rubric | None; precise additional source/rubric review blocker |

The execution labels above are simulator-test expectations, not educational claims from the cited
book. The head-and-shoulders candidate's post-decision gap is likewise execution evidence; its
technical-analysis source citation does not claim that the source authored ChartPath's generated
future or fill result.

Every candidate is synthetic, internal, human-review-required and no-credit. The third literal
no-trade candidate is intentionally blocked because the current reviewed catalog supports waiting
or insufficient evidence but does not contain a third independently reviewed full eleven-step
literal no-trade rubric. The quota must not be used to erase that blocker.

## 6. Synthetic-data policy

Candidate candles are newly generated by ChartPath and are not observations of any security. They
use synthetic symbols, currency and volume, and must be labelled as training material. They must not
be described as historical market data, source-book diagrams, achievable fills or evidence of
profitability.

The current manifest licensing policy is intentionally restrictive:

- owner: ChartPath;
- generated data only: true;
- redistribution: prohibited; and
- publication: internal.

This prevents the candidate library from bypassing the existing market-data policy merely because
the candles are synthetic. A later public synthetic-data license and publication decision require
responsible human/legal review and a new immutable material artifact where applicable.

## 7. Authoring checklist

Before proposing a candidate for human review:

- choose an exact reviewed source and record both physical and printed pages;
- state the concept and a short Hebrew rationale without copying source wording or imagery;
- choose stable scenario/dataset identities, semantic versions and a safe integer seed;
- author decision-time context before looking at or optimizing the future result;
- pin all replay cutoffs and preserve blind reveal until finalization;
- author every workflow prompt and rubric criterion in Hebrew;
- require evidence-based rationale for trade and no-trade decisions;
- if trading, constrain direction and supported market/limit/stop entry types coherently;
- state expected execution evidence honestly, including ambiguity or an unfilled order;
- regenerate and verify every checksum after a material change;
- run all three scenario commands and repository checks; and
- leave every human review state pending until the responsible human actually records a decision.

Publication, approval invalidation, retirement and the internal-QA boundary are normative in
[SCENARIO_PUBLICATION_POLICY.md](./SCENARIO_PUBLICATION_POLICY.md).
