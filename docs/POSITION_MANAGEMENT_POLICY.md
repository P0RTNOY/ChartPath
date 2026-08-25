# Deterministic position-management policy

Status: Milestone 6 implemented and locally verified; publication and native-distribution gates
remain open. This document is the normative mechanics and safety contract for
`position-management-policy-v1`.

ChartPath position management is a local, deterministic educational simulation over one exact open
paper position. It is not a brokerage emulator, a recommendation, a promise of execution quality or
a profit-maximization exercise. A favorable outcome cannot make an unsupported decision correct,
and an unfavorable outcome cannot make a coherent process incorrect.

## 1. Eligibility and immutable handoff

Management is fail closed. A session may begin only when all of the following are true:

- the historical analysis is finalized and its scenario, dataset version, canonical checksum,
  decision candle, candle count and learning-credit class still match;
- the persisted paper-execution session has one actually filled, still-open position;
- an exact scenario/version management extension grants the action kinds, risk limits and rubric;
- the complete open paper session, execution policy, cost model and source identity are copied into
  the management handoff without reinterpretation.

The original paper session is frozen once a management session claims it. One paper execution may
have at most one logical management session. Original no-trade scenarios, unfilled orders,
unrecognized versions, credit mismatches and scenarios without explicit management permission do
not expose management controls.

The current registry contains three synthetic internal QA management variants derived from two
Milestone 5 candidates. They have no course credit, no human approval and no ordinary learner
publication status. Their expected cases are validation fixtures, not recommended trading rules.

## 2. Supported actions and explicit omissions

The version-1 engine supports one pending material action at a time:

- full voluntary exit of the entire open quantity;
- partial voluntary exit that leaves a positive exact-unit remainder;
- scale-in by a positive exact quantity;
- manual replacement of the active protective stop; and
- manual replacement of the active target.

Drafting, previewing, submitting, explicitly acknowledging soft risk warnings and cancelling the
exact pending action are separate state transitions. A submitted action cannot be edited; cancel it
before creating a replacement draft.

Automatic or dynamic trailing stops are deliberately deferred. The engine never infers a new stop
from a swing, ATR, price movement or outcome. A learner may submit a manual replacement only when
the authored scenario permits it, and must record the decision basis and evidence. Multiple
positions, portfolios, hedging, bracket/OCO editing, time-in-force variants, short availability,
corporate actions, taxes, borrowing costs, margin calls and live order routing remain out of scope.

## 3. Timing and candle-processing order

All decisions use completed, visible evidence through cutoff candle N. A submitted material action
is eligible only on candle N+1. Drafts become stale when replay advances, pending actions may not
skip their exact eligible candle, and candles must be processed sequentially with a persisted
fingerprint.

For each eligible candle N+1, processing order is fixed:

1. Apply an eligible stop or target replacement before evaluating that candle's opening thresholds.
2. Compare the opening price with the now-active stop and target.
3. If an eligible full exit, partial exit or scale-in conflicts with an opening stop or target,
   terminate as ambiguous; do not choose a favorable sequence.
4. Otherwise fill the eligible voluntary action at the next candle open using the pinned adverse
   spread/slippage and commission model. Recheck a scale-in against the hard risk limit using its
   actual opening fill; reject it without adding quantity if the limit is exceeded.
5. If an opening stop or target threshold was crossed, process the opening-gap exit.
6. Otherwise inspect the candle's high and low. If both active thresholds were reachable, terminate
   as ambiguous. If exactly one was reachable, close at that threshold under the pinned execution
   policy.
7. Persist the exact candle timestamp and fingerprint before any later candle is accepted.

Replacement priority is therefore not a claim that a real amendment would reach a venue before the
open. It is a declared simulator convention. Voluntary/opening conflicts and same-candle stop/target
conflicts intentionally produce no invented intrabar path. A fully voluntary exit closes the
session immediately; a partial exit or accepted scale-in leaves the remainder subject to the same
candle's thresholds.

At the pinned final candle, an active position may complete as `open-at-replay-end` only when no
material action remains pending. This is a terminal educational result, not a synthetic liquidation.

## 4. Risk authority

Original 1R is frozen from the confirmed paper plan's estimated total risk in integer minor units.
It is never rebased after partial exits, scale-ins, stop changes, realized profit or loss.

The scenario authority pins maximum open quantity, maximum cumulative scale-in relative to initial
quantity, a soft risk boundary and a hard risk boundary. The current policy uses:

- cumulative scale-in maximum: 100% of initial quantity;
- soft projected-risk boundary: 100% of original 1R; and
- hard projected-risk boundary: 200% of original 1R.

Exceeding the soft boundary requires explicit acknowledgement when no hard rejection applies.
Exceeding the hard boundary, the cumulative scale-in limit or the maximum open quantity rejects the
draft. Scale-in risk is checked again at the actual next-open fill because its authored estimate is
not authoritative. Reducing risk is not automatically graded as coherent; the recorded basis and
visible evidence still matter.

## 5. Integer accounting and execution assumptions

Authoritative prices are exact tick counts and monetary values are safe integers in the handoff's
currency minor units. Quantities are positive whole units of the pinned quantity increment. Unsafe,
fractional or non-tick-aligned authoritative values fail validation.

The initial paper fill becomes lot zero. Each accepted scale-in creates a separate immutable lot.
Voluntary and protective exits realize lots FIFO. For a partial realization, entry commission is
allocated proportionally with integer flooring; the final slice of a lot receives its exact
remaining unallocated commission. This preserves quantity and commission totals without floating
residue.

Reported accounting distinguishes:

- gross realized P&L;
- allocated entry commission;
- exit commission;
- realized net P&L;
- modeled execution cost from spread/slippage; and
- cutoff-only unrealized and hypothetical-liquidation estimates for the still-open quantity.

Realized net equals gross realized minus allocated entry commission minus exit commission. Modeled
execution cost is disclosed separately and is not subtracted a second time because it is already
embedded in adverse fill prices. Target fills are capped at the target; protective stops and
next-open voluntary fills use the inherited adverse spread/slippage model. These are reproducible
assumptions, not assertions of achievable fills.

The debrief displays realized net and the exact fraction `realized net / frozen original 1R` without
letting either value affect the process assessment. An ambiguous result has no determinate outcome
and no fabricated closing P&L. An open-at-end result retains its open quantity rather than pretending
to realize it.

## 6. Events, persistence and recovery

The aggregate records deterministic sequential event IDs, fill IDs, lot IDs, journal order and
processed-candle fingerprints. Reusing an action ID with identical material is idempotent; reusing
it with changed material fails. Saved revisions advance exactly one at a time, timestamps cannot
move backward and prior events, fills, candles and journal entries must remain canonical prefixes.

Persistence payload schema 6 adds position-management sessions and quarantine records. Native
SQLite migration 5, `create_position_management_and_journal`, is pinned to:

`sha256:ddfdc6589ba3ea48862156293c60bb904a3a781fd4c3a73400a193fd1d25eb8a`

SQLite mirrors the full session and each journal entry in the same exclusive transaction as the
canonical repository payload. Journal rows reject update/delete; management sessions reject delete
and reject updates after a terminal status. Invalid, duplicate or source-divergent management
payloads migrate into explicit quarantine instead of silently becoming a different session.
Unknown future payload or migration versions fail closed.

Exact restart evidence must prove the same handoff, policy, rubric checksum, cutoff, pending action,
journal prefix, fills, lots and accounting before replay continues. It must also prove that this
no-credit QA path creates no attempt and changes no mastery, review, lesson progress, XP, streak or
daily activity.

## 7. Process assessment and educational boundary

Every material submission writes an immutable action-rationale journal entry at cutoff N. The
domain assessment checks frozen risk, rationale presence, warning acknowledgement, exclusion of
future evidence, preservation of journal history and the scenario-pinned rubric. Current authored
criteria accept predefined-plan, new-visible-evidence or risk-reduction bases; require risk review;
and require relevant evidence tags.

`outcome-chasing` and `future-information` remain recordable so a debrief can surface process
problems; they are never converted into a correct decision because the later simulated result was
profitable. P&L and future outcome are explicitly excluded from the score.

The bundled Hebrew source supports planning, invalidation, risk, management and review doctrine.
Simulator ordering, FIFO allocation, integer rounding, adverse-cost formulas and ambiguity handling
are neutral mechanics chosen for deterministic reproducibility. See `docs/TRADE_JOURNAL_POLICY.md`
for the journal boundary and `docs/PAPER_EXECUTION_POLICY.md` for the inherited entry mechanics.

## 8. Known limitations and release status

Milestone 6 repository checks, deterministic reports, browser E2E, all three exports and 13 browser
visuals pass. A bounded iOS 26.5 Expo Go simulator run also established a real schema-6 SQLite
handoff, a pending partial exit across terminate/relaunch, and its single N+1 fill with no duplicate
management or journal row. It did not continue to a terminal debrief.

VoiceOver, TalkBack, largest OS text, increased contrast, physical-device ergonomics and signed
standalone builds remain open gates. Android runtime is unavailable in the audited local
environment. Native distribution remains **NO-GO**.
