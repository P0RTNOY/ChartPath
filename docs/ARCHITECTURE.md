# ChartPath Architecture

> Status snapshot: 2026-08-23. This document is an implementation contract for the
> beta. At the time of writing, the repository contained no application code, so no
> capability below is claimed to be implemented unless a later status table says
> otherwise. Release evidence belongs in `docs/RELEASE_READINESS.md`.

## Status language

- **Beta requirement**: intended for the first credible beta; implementation and
  verification are still required.
- **Future design**: a compatibility direction, not a beta dependency or a claim
  that infrastructure exists.
- **Implemented**: may be used only after code and relevant verification evidence
  exist. No item has this status in this initial document.

## Architectural goals

ChartPath is an offline-first Hebrew learning application. The architecture keeps
the learning rules, deterministic grading, synthetic market data, and authored
content outside React Native so that they can be tested without a device and cannot
silently diverge between screens. The mobile application owns platform concerns:
navigation, SQLite, operating-system accessibility, and lifecycle behavior.

The beta has four hard constraints:

1. A learner can complete the core journey without an account, network, market-data
   provider, or AI key.
2. The same chart seed, parameters, generator version, and decision candle produce
   the same visible candles, annotations, and grade.
3. Only curated, schema-valid content and pure grading rules determine correctness.
4. Learning history is durable and append-only; derived progress can be rebuilt.

Live market data, brokerage connections, trade execution, social trading, public
leaderboards, subscriptions, and runtime AI-authored lessons are outside the beta.

## Repository layout and dependency boundaries

The intended empty-repository layout is a strict TypeScript `pnpm` workspace:

```text
apps/
  mobile/              Expo, Expo Router, SQLite, application orchestration
packages/
  domain/              Learning types, pure graders, mastery, review scheduling
  chart-engine/        Seeded OHLCV generation and semantic ground truth
  content/             Versioned curriculum data, schemas, migrations, validator
  ui/                  Accessible React Native primitives and chart presentation
docs/                   Product, learning, source, architecture, and release records
```

Allowed production dependencies are one-way:

```text
apps/mobile  ───────>  packages/content
     │               ↘ packages/domain
     ├───────────────> packages/chart-engine ──> packages/domain
     └───────────────> packages/ui

packages/content ───> packages/domain
packages/ui ────────> React / React Native / react-native-svg
packages/domain ────> platform-independent TypeScript only
```

`packages/content` may call `packages/chart-engine` from its validation command or
tests to reproduce seeded examples. This is a tooling dependency, not permission
to generate or mutate canonical content at runtime. Cycles among workspace packages
are prohibited and should be checked in CI.

### `apps/mobile`

**Beta requirement.** The app is the composition root. It owns Expo Router routes,
screen/view-model orchestration, RTL and accessibility integration, theme and
reduced-motion preferences, database initialization and migrations, repositories,
and lifecycle recovery. It may translate UI gestures into domain answer values,
but it must not contain grading rules or lesson prose.

Suggested internal layers:

```text
src/application/      use cases and screen-facing view models
src/infrastructure/   SQLite repositories, clocks, IDs, feature flags
src/features/         route-level feature composition
src/providers/        theme, locale, database, tutor composition
```

Routes call application use cases. Application use cases call repository ports and
pure package functions. Infrastructure implements the ports. Components must not
execute ad-hoc SQL or import content files directly.

### `packages/domain`

**Beta requirement.** Pure TypeScript definitions and functions for `Skill`,
`Unit`, `Lesson`, `Exercise`, `ChartSpec`, `ChartAnnotation`, `AnswerRubric`,
`Attempt`, `AttemptResult`, `Misconception`, `SkillMastery`, `ReviewState`,
`DailyActivity`, and `ContentVersion` live here. It also owns deterministic grading,
position-size and `R` calculations, mastery updates, prerequisite evaluation, daily
path selection, and the spaced-repetition scheduler.

Domain functions receive all nondeterministic inputs explicitly: `now`, IDs,
locale-independent numeric values, and seeded random sources. They must not import
React, React Native, Expo, SQLite, network clients, environment variables, or the
system clock. They return values or typed errors and do not persist state.

The answer submitted to the grader is expressed in chart coordinates (candle index,
price, normalized zone, semantic selection), never screen pixels. Gesture adapters
in the UI convert pixels to chart coordinates before grading. Tolerances are part of
the rubric and chart domain, which keeps grades stable across screen sizes.

### `packages/chart-engine`

**Beta requirement.** This package generates deterministic OHLCV and separate
semantic annotations from a serializable `ChartSpec`. Its reproducibility identity
is the tuple `(generatorVersion, seed, normalized parameters)`. Changing the
algorithm requires a new generator version; published exercises keep their old
version available or are explicitly migrated.

The package separates:

- a seeded pseudo-random number generator with no `Math.random()` calls;
- regime and structure generation;
- OHLCV normalization and invariant checks;
- ground-truth semantic annotations;
- decision-window projection (`candles[0..decisionIndex]`); and
- future reveal data, which is unavailable to the grader until submission.

Rendering is not part of this package. A grade at candle `N` receives only the
visible chart slice, rubric, and learner answer. Future candles must not be passed
and cannot be used as evidence about whether the learner's decision was valid.

### `packages/content`

**Beta requirement.** Lessons and exercises are versioned data validated at build
time with Zod (or an equivalent runtime validator). UI components receive parsed
content; they do not embed canonical prompts, answers, or explanations.

Published exercise records include stable ID, schema version, content version,
editorial status, skills, difficulty, Hebrew text, interaction kind, deterministic
chart specification, decision index, rubric, tolerances, explanations, misconception
tags, hints, and page-level source references. Optional English strings remain
explicitly LTR. Published beta content fails validation for a missing Hebrew string,
source, rubric, explanation, unknown prerequisite or skill, duplicate ID,
unreachable lesson, unreproducible annotation, or ambiguous exercise without a
permitted uncertainty answer.

Content corrections create a new version. IDs are never silently reused for a
different concept or rubric. Aliases and migration manifests map retired IDs while
old attempts retain the exact exercise/content/generator versions they used.

### `packages/ui`

**Beta requirement.** Accessible, reusable React Native components and tokens live
here. The package may depend on React Native and `react-native-svg`, but not on
SQLite, lesson catalogs, graders, or network services. It renders state supplied by
the app and emits semantic actions.

Chart components receive already-generated candles and annotations. They expose
screen-reader labels, sufficiently large targets, non-color status cues, explicit
LTR wrappers for tickers/numbers/formulas, and a reduced-motion mode. The package
must not infer whether an answer is correct from visual geometry.

## Interactive Chart Workbench foundation

**Implemented 2026-08-24.** The learner-facing `/lab` route establishes a reusable analysis surface
without changing the lesson catalog, attempt schema, or source-backed grading contracts.

### Pure workbench state

`packages/domain/src/workbench.ts` owns learner-authored analysis state. `ChartTool` is an exhaustive
discriminated union for inspect, point, horizontal level, trendline, zone, and selection. Finished
`LearnerChartAnnotation` records contain only candle indexes and prices; raw screen pixels are never
authoritative. `AnalysisDraft` keeps the active tool, a pending two-anchor drawing, selected
annotation, and undo/redo history. Its reducer implements construction, specific deletion, clear,
undo, and redo without importing React or a platform API.

Learner annotations remain distinct from generated `ChartAnnotation` semantics. The app converts
only the authored task's relevant learner geometry into the existing `LineAnswer`, `PointAnswer`, or
`ZoneAnswer` contract. Scratch annotations cannot silently become official answers.

### Viewport and replay boundary

`packages/chart-engine/src/viewport.ts` owns bounded candle windows and bidirectional conversion
between chart coordinates and screen rectangles. Pan and zoom clamp to the candles currently
permitted by replay, preserve chronological left-to-right mapping, and define a minimum visible
candle count. Renderers receive the resulting viewport; they do not invent their own answer-space
normalization.

`packages/chart-engine/src/replay.ts` is a pure state machine. It supports reset, one-candle advance,
fixed-group advance, and advance to the authored decision candle. Every transition is capped at that
decision boundary. `replayChartSlice` composes the existing decision slicer so candles and semantic
annotations are filtered together at the current position. Learner drawings are retained in chart
coordinates and explicitly snapshotted as replay advances; drawings whose endpoints are still in
the future are not rendered early.

### Mobile adapter and grading

`apps/mobile/src/components/chart-workbench.tsx` owns gestures, accessible controls, selected-candle
inspection, exact OHLCV presentation, responsive composition, and local orchestration. Native pinch
and horizontal pan use Gesture Handler; web, keyboard, and assistive-technology users receive named
pan/zoom buttons plus exact candle/price inputs. `OhlcvChart` applies an explicit LTR direction to
the quantitative surface inside the RTL shell.

The first Lab task reuses reviewed exercise `u03-levels-e04` unchanged. Submission stays disabled
until a learner trendline is complete and replay reaches decision candle 71. `gradeAnswer` then
receives the existing line rubric and decision-bounded candle context. Reference geometry is not
passed to the renderer before grading; afterward it is a dashed warning-colored layer distinct from
the solid learner layer. Workbench drafts are in-memory in this milestone and do not award XP or
alter append-only attempts. Persisted replay drafts and paper-execution events are future work and
would require an explicit versioned contract.

### Source boundary

The guided scenario cites `ta-he-v2`, physical PDF page 31 / printed page 18, Chapter 6 and Figure
6.1. Learner-facing task, hints, explanation, safety note, and rubric come from the existing reviewed
content record. Controls and navigation add no new technical-analysis doctrine.

## Runtime flows

### Startup and content loading

1. Open the SQLite database and enable foreign keys.
2. Run bundled, checksum-tracked migrations in a transaction.
3. Parse the bundled content catalog and verify its supported schema/content
   versions. A production build should ship only a catalog that passed the full
   content validator.
4. Load local settings and rebuild stale projections if their projector version is
   behind.
5. Select the next activity from prerequisites, current lesson, due reviews, weak
   skills, then eligible new material.

An unsupported or corrupt content/database version routes to a recoverable error
screen. It must not wipe learning history automatically.

### Exercise attempt

1. Resolve a published, versioned exercise.
2. Generate its chart from the pinned generator version and seed.
3. Limit displayed and graded candles to the declared decision index.
4. Convert interaction output to a serializable domain answer.
5. Call the pure grader with the answer, rubric, visible chart/annotations, and
   declared tolerance policy.
6. Build an immutable `Attempt` containing the versioned inputs and deterministic
   `AttemptResult`.
7. In one SQLite transaction, append the attempt and update/rebuildable mastery,
   review, lesson-progress, daily-activity, XP, and streak projections.
8. Render authored explanation and misconception-specific feedback. Optional future
   tutoring can supplement it but cannot replace the result.

An idempotency key (`attemptId`) makes a retry after interruption safe. A duplicate
insert returns the original outcome instead of awarding XP twice.

## Offline persistence

### Source events and projections

**Beta requirement.** SQLite is the local system of record. Submitted attempts are
append-only source events. Suggested minimum columns are:

```text
attempts
  attempt_id TEXT PRIMARY KEY
  exercise_id TEXT NOT NULL
  exercise_version INTEGER NOT NULL
  lesson_id TEXT NOT NULL
  content_version TEXT NOT NULL
  generator_version INTEGER
  skill_ids_json TEXT NOT NULL
  answer_json TEXT NOT NULL
  result_json TEXT NOT NULL
  hint_count INTEGER NOT NULL
  started_at TEXT NOT NULL
  submitted_at TEXT NOT NULL
  elapsed_ms INTEGER
  schema_version INTEGER NOT NULL
```

Answers and results are validated before insertion. Timestamps use ISO-8601 UTC;
the scheduler receives an explicit clock and must tolerate device-clock changes.
Elapsed time may support local diagnostics but must not materially reduce mastery.
No real portfolio value, brokerage identifier, or free-form financial profile is
stored.

Updates and deletes on `attempts` should be rejected by repository design and, where
supported, SQLite triggers. Corrections are new events that reference the prior
event. User-requested erasure is the deliberate exception and deletes the local
database through a dedicated reset operation, not an ordinary repository method.

Rebuildable projection tables include:

- `skill_mastery` and `review_state`;
- `lesson_progress` and unlock state;
- `daily_activity`, XP, streak, and completion counters; and
- a `projection_metadata` row containing projector version and last applied event.

XP, streak, completion, mastery, and conceptual correctness are distinct fields.
The attempt log is authoritative when a projection disagrees. Projection update
code is deterministic and covered by replay tests.

### Schema and content migrations

**Beta requirement.** Numbered database migrations are bundled with the app and
recorded in `schema_migrations(version, name, checksum, applied_at)`. Each migration:

- runs in a transaction and is never edited after release;
- is forward-only, deterministic, and idempotent at its guarded entry point;
- preserves `attempts` unless the user explicitly resets data;
- validates preconditions before changing a table; and
- has fixture tests that upgrade from every supported beta schema.

SQLite table changes that require replacement use create-copy-validate-rename in a
transaction. The migration checks row counts and required values before dropping an
old table. Startup stops with a repairable error when a checksum or invariant fails.

Content migrations are separate manifests in `packages/content`. They may add an ID
alias, retire content, or invalidate a derived projection. They never rewrite the
exercise identity inside an old attempt. If a rubric correction means an attempt is
no longer comparable, the projector marks that historical event with its original
version and recalculates only where the manifest explicitly allows it.

The required persistence test completes an exercise, fully closes the app/database,
reopens it, migrates if necessary, and observes the same attempt plus correct
projections. Unit tests alone are not sufficient evidence for this journey.

## Deterministic grading contract

**Beta requirement.** The canonical signature should be equivalent to:

```ts
gradeExercise(input: {
  exerciseId: string;
  exerciseVersion: number;
  answer: LearnerAnswer;
  rubric: AnswerRubric;
  visibleChart?: Readonly<VisibleChart>;
}): AttemptResult
```

The function is total for schema-valid input and never reads global state. It returns
correctness/partial-credit components, accepted semantic alternatives,
misconception IDs, and authored feedback keys. It does not return a buy/sell signal
or simulated profit.

Drawing tolerances are defined in domain coordinates. Boundary behavior is explicit
(inclusive/exclusive), numeric inputs must be finite, and invalid or zero stop
distance is rejected. Position sizing uses:

```text
position size = account risk / (entry-stop distance + expected per-unit costs)
```

Published ambiguity is modeled, not inferred: `wait`, `no_trade`, or
`insufficient_evidence` must appear in the rubric's accepted answers. Pattern
lookalikes may be correct only when all declared prerequisites and evidence available
at the decision candle support them.

## Mastery and review

**Beta requirement.** Mastery and spaced repetition are transparent pure reducers
over attempts. Inputs include difficulty, correctness, hint use, misconception
recurrence, prior review state, and explicit review time. Mastery is clamped to its
documented range. Response time is diagnostic only.

The initial scheduler should use a documented SM-2-like rule with deterministic
rounding, a minimum interval, and an explicit lapse path. A failed review becomes
due according to that rule; time-zone boundaries affect the UI's “today” grouping,
not the stored UTC due instant. Scheduler and projection algorithm versions are
persisted so upgrades can be replayed or migrated intentionally.

## TutorProvider: disabled beta port

**Beta requirement.** A narrow interface may be defined in the domain/application
boundary:

```ts
interface TutorProvider {
  explain(input: ApprovedTutorContext): Promise<ValidatedTutorExplanation>;
}
```

The beta composition root binds only `DisabledTutorProvider`, which returns the
curated local explanation/fallback and makes no network request. There is no AI SDK,
API key field, remote feature flag, or hidden runtime dependency in the core path.

**Future design.** A remote provider would receive only the exercise rubric,
approved source excerpt/context, deterministic result, and misconception IDs. Its
output must pass financial-safety and structure validation, admit ambiguity, avoid
personalized recommendations, and fall back locally on timeout or rejection. It can
never change `AttemptResult`, mastery, XP, unlocks, or review scheduling.

## Future optional synchronization

**Future design; not required, configured, or provisioned for beta.** A later
Supabase/PostgreSQL adapter may synchronize immutable events after an explicit
account/consent flow. The mobile application must continue to start and function
when it is absent.

Candidate server tables include `profiles`, `devices`, `attempts`,
`attempt_corrections`, `content_receipts`, and rebuildable mastery/review/progress
projections. Every learner-owned row has a non-null `user_id` referencing
`auth.users`. Primary/unique keys include the owner (`user_id`, `attempt_id`) to
prevent cross-tenant references and provide idempotent merges.

Row-level security is enabled and forced for every learner-owned table. Policies are
equivalent to:

```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

Authenticated clients may select and insert only their own attempt events. Ordinary
update/delete grants on attempts are revoked; corrections append a new owned event.
Projection rows may be updated only through narrowly scoped, validated server code.
The service-role key never ships in the app. Security-definer functions use an
explicit safe `search_path`, validate ownership, and expose only the necessary
operation.

RLS is defense in depth, not the complete design. Server constraints, schema
validation, least-privilege grants, JWT verification, rate limits, audit logs for
privileged operations, and integration tests with two isolated users are required.
Guest-to-account migration uploads only after informed consent, keeps local event
IDs, and resolves conflicts by immutable-event union rather than last-write-wins.

## Error handling and observability

**Beta requirement.** User-facing errors are localized, actionable, and do not
expose SQL, stack traces, source paths, or content answers. Domain errors use stable
codes. Invalid content is a build/release failure; corrupt local state is a safe
recovery flow with reset as an explicit last resort.

There is no telemetry or remote crash reporting by default. Local development logs
must redact answers that could contain user-entered values and never include secrets.
If telemetry is proposed later, it requires a separate privacy review, data map,
consent decision, retention policy, and documented off switch.

## Verification gates

The architecture is not “implemented” until evidence covers at least:

- workspace dependency-boundary and TypeScript strict checks;
- seed/parameter reproducibility and OHLC invariants;
- decision-index tests proving future candles cannot influence grading;
- grader tolerance tests across render sizes and ambiguity answers;
- table-driven risk calculations, including invalid/zero-distance inputs;
- mastery bounds, lapses, due dates, and full projection replay;
- schema upgrades preserving attempts and progress across an actual restart;
- content validation for every published record;
- RTL/LTR, screen-reader, touch-target, contrast, and reduced-motion behavior; and
- critical offline app journeys with no network, AI key, or cloud credentials.

Update the status snapshot and `docs/RELEASE_READINESS.md` only from commands,
screenshots, or manual journeys that were actually run.
