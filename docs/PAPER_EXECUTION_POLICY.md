# Deterministic paper-execution policy

**Policy date:** 2026-08-24
**Execution schema:** `1`
**Execution policy:** `paper-execution-policy-v1`
**Cost model:** `paper-cost-model-v1`
**Status:** normative contract for the Milestone 4 educational simulator

ChartPath paper execution is an offline, deterministic learning simulation over a checksum-pinned
historical replay. It is not a broker, exchange, order router, portfolio, signal service, backtest,
or representation of achievable execution. It never connects to real money or a live/delayed feed.

This document separates three authorities:

1. **Reviewed technical-analysis education** — the canonical workflow, analysis, invalidation,
   target, risk and review concepts traceable to the reviewed Hebrew source.
2. **Neutral arithmetic** — finite-value validation, distance, quantity, costs and `R` calculations.
3. **Versioned simulator assumptions** — artificial fill timing, OHLCV threshold handling, spread,
   slippage, commission and rounding rules needed to produce one reproducible result.

Simulator assumptions are not source claims and are never presented as universal market behavior.

## 1. Scope and hard limits

The foundation supports one plan, one working entry order and at most one simulated position per
execution session. An authored scenario may permit long and/or short direction and market, limit
and/or stop entry intents. A submitted position resolves automatically at its protective stop,
target, or an honest ambiguity state.

The model intentionally excludes partial fills, queue priority, an order book, liquidity inference,
volume participation, manual or partial exits, scale in/out, trailing stops, stop-limit orders,
multiple positions, leverage, margin, borrowing, dividends, interest, tax, portfolio effects and
automatic management. It cannot reproduce latency, venue rules, auction behavior, rejected routes,
trading halts or a broker's exact fee schedule.

OHLCV bars reveal only open, high, low and close, not the sequence or availability of intrabar
prices. The simulator therefore reports ambiguity instead of manufacturing favorable precision.

## 2. Pinned identity and future isolation

Every execution session is bound to:

- dataset ID, version and canonical lowercase SHA-256 checksum;
- scenario ID and version;
- finalized Guided Analysis session ID and finalization time;
- decision candle, total candle count and learning-credit status;
- scenario-permitted directions and entry-order types;
- execution-schema, execution-policy and cost-model versions; and
- immutable session, plan, order, position and event identifiers.

Creation requires an exactly resolved, finalized historical analysis. Resume compares the full
identity and versions; a missing scenario/dataset, checksum disagreement, metadata disagreement,
modified dataset or incompatible state fails closed. The app does not download a substitute,
silently repin, repair, clamp or reinterpret an execution session.

The first eligible execution candle is strictly after the analysis decision candle. Each new candle
is processed sequentially and recorded with an identity fingerprint. Replaying the same identical
candle is idempotent; changing a previously processed candle or skipping an intermediate index is an
error. A batch advance is therefore equivalent to the same one-candle advances in order.

No fill, event, debrief statement, chart scale or accessibility description may depend on a later
candle. A working order that reaches the end of the replay without filling expires.

## 3. Plan validation and confirmation

Before submission, the simulator validates finite positive prices, a non-zero stop distance,
directional entry/stop/target relationships, positive fictional account value and risk amount,
whole-unit quantity, estimated risk within the selected budget, price ticks, scenario permission,
decision-candle authorship and pinned identity.

The plan also records process evidence from the completed analysis: the analysis conclusion,
whether entry/invalidation/target match that analysis, and whether required reasoning was bypassed.
A divergence is kept visible in validation and the debrief. It is never hidden because a later
simulated outcome happens to be favorable.

Submission requires an explicit review/confirmation step. A valid submitted order becomes working;
an invalid order is rejected deterministically. Before fill, a working order can be cancelled. The
Milestone 4 contract does not allow an in-place amendment after submission; a learner must change a
draft before confirmation.

## 4. Entry policy

Rules are symmetric by execution side: a long entry buys and a short entry sells. “Adverse” means a
higher fill for a buy and a lower fill for a sell.

### Market entry

A market intent submitted after the decision candle fills at the next eligible candle open. The
engine applies half the configured spread plus adverse slippage, rounds against the learner, and
adds commission. It never grants a fill at the completed decision candle.

### Limit entry

A long limit becomes fillable when the candle low is at or below the limit; a short limit becomes
fillable when the candle high is at or above the limit. The fill is exactly the submitted limit,
including when the next candle opens through it. The simulator does not award a more favorable
opening or intrabar price, and it applies neither spread nor slippage to this synthetic limit fill.
Commission still applies.

This no-improvement rule is deliberately conservative and deterministic. It is not a claim that a
real limit order must fill, will fill in full, or cannot receive improvement.

### Stop entry

A long stop triggers when the open or high reaches/exceeds the trigger; a short stop triggers when
the open or low reaches/falls below it. An intrabar trigger uses the trigger as its reference. If the
candle opens beyond the trigger, the opening price is the adverse reference instead. Half spread,
adverse slippage, side-adverse tick rounding and commission apply.

## 5. Exit, gap and ambiguity policy

### Protective stop

A long protective stop is touched when the low is at or below it; a short protective stop is touched
when the high is at or above it. An intrabar stop uses the stop as its reference. An opening gap
beyond it uses the adverse opening price. Half spread, adverse slippage, side-adverse tick rounding
and commission apply. The model never improves a gap-through-stop back to the requested stop.

### Target

A long target is touched when the high is at or above it; a short target is touched when the low is
at or below it. The fill is exactly the target even if the candle opens through it. There is no
favorable price improvement, spread or slippage on the modeled target fill; commission applies.

### Opening thresholds and intrabar uncertainty

Opening-price evidence is ordered before range-only evidence. If an opening price has already
crossed a stop or target, that threshold resolves from the open according to the rules above. If no
opening threshold resolves the position and the same OHLCV candle touches both stop and target, the
engine records `ambiguous` and does not choose either outcome.

If an entry fills intrabar and that same candle also reaches a stop or target, the engine likewise
records `ambiguous`, because OHLCV cannot establish whether entry occurred before the exit
threshold. Ambiguity pauses/concludes the execution with no invented exit fill or P&L.

## 6. Cost and rounding model

`paper-cost-model-v1` is fixed and visible:

| Input                     | Value                                          |
| ------------------------- | ---------------------------------------------- |
| Total modeled spread      | `10` basis points; `5` bps allocated per side  |
| Adverse slippage          | `5` basis points on market and stop executions |
| Commission                | `max(1.00, 0.01 × quantity)` per fill          |
| Price tick                | `0.01`                                         |
| Quantity increment        | `1` whole unit                                 |
| Currency display/rounding | `2` decimal places                             |

Raw adverse buy fills round up to the next tick; raw adverse sell fills round down. Commission
rounds upward to two decimals. Limit and target prices must already lie on the tick and are not
improved. Cost/model changes require a new version; saved sessions keep their original model.

Estimated total risk includes the planned stop distance, the modeled entry and protective-stop
execution effects, and both commissions. Planned reward-to-risk is displayed only when the
calculation is finite and valid. These values explain the model; they are not promises or a
recommended account-risk percentage.

## 7. Lifecycle and immutable events

A plan begins as `draft`. Submission produces a rejected state or a `working` entry order. The
working order can fill, cancel or expire. A fill opens the single position. The position then closes
by protective stop or target, or becomes `ambiguous`. The replay cannot silently reset or erase a
submitted execution.

Transitions append deterministic events such as plan creation/replacement, order submission,
rejection, fill, cancellation or expiration, position open, stop/target close, ambiguity, replay
completion and abandonment. Processed-candle fingerprints and immutable event IDs make retries and
reloads safe against duplicate fills, costs, exits or debriefs.

Draft, working, open, closed, ambiguous, cancelled, rejected and completed states are persisted
offline. Persistence validation preserves attempts and progress, quarantines structurally invalid
execution records, and requires explicit recovery or reset. Paper execution never rewrites the
finalized analysis from which it was created.

## 8. Debrief and learning-credit boundary

The deterministic debrief evaluates process separately from outcome. It records whether the plan
matched the analysis, whether entry/invalidation/target were aligned, whether risk was calculable,
whether reasoning was preserved, which gaps/costs/model assumptions affected execution, and whether
OHLCV could determine the outcome. Neutral entry/exit, costs and `R` values may be shown when
determinable, but P&L is not the grade.

The installed scenario is `historical-dev-u10-capstone-e03@1.0.0-dev`, backed only by the generated
fixture `chartpath-generated-hourly-fixture@1.0.0-dev`. The reviewed exercise concludes **no trade**.
Opening a paper ticket is therefore an explicitly hypothetical mechanics exercise that contradicts
the reviewed decision; the UI must keep that mismatch visible. It does not change the analysis,
create an ordinary attempt, award course credit, update mastery/review/lesson progress, add XP or
streak activity, or imply that a trade should have been taken.

Real historical scenarios remain blocked until rights, redistribution, publication and independent
educational/editorial approval pass. A future credited execution assessment would require a
separately authored and reviewed rubric; a profitable simulation can never create credit by itself.

## 9. Educational-source provenance

Learner-facing technical-analysis doctrine is limited to reviewed source records. Execution-policy
mechanics above are ChartPath assumptions and use original explanatory wording.

| Educational concept                                            | Reviewed source provenance                                                                    |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Canonical workflow and multi-timeframe context                 | `ta-he-v2`, PDF 62 / printed 49, Chapter 15, Figure 15.2                                      |
| Separating context, structure, setup and trigger               | `ta-he-v2`, PDF 62–63 / printed 49–50, Chapter 15                                             |
| Invalidation, stop, fill, target and disciplined risk planning | `ta-he-v2`, PDF 64–67 / printed 51–54, Chapter 16                                             |
| Risk units (`R`)                                               | `ta-he-v2`, PDF 65 / printed 52, Chapter 16, Figure 16.1                                      |
| Position sizing and execution costs                            | `ta-he-v2`, PDF 65–66 / printed 52–53, Chapter 16, Figure 16.2                                |
| Breakouts, stops and gap limitations                           | `ta-he-v2`, PDF 54 / printed 41, Chapter 13; PDF 59 / printed 46, Chapter 14                  |
| Costs, uncertainty and look-ahead bias                         | `ta-he-v2`, PDF 68–69 / printed 55–56, Chapter 17                                             |
| Recording execution assumptions                                | `ta-he-v2`, PDF 70–71 / printed 57–58, Chapter 18                                             |
| Capstone process and actual-fill/process review                | `ta-he-v2`, PDF 72–74 / printed 59–61, Chapter 19, cases A–B                                  |
| Installed fixture's correct no-trade conclusion                | `ta-he-v2`, PDF 74–75 / printed 61–62, Chapter 19, case C                                     |
| Narrow simulated practice and structured review                | `ta-he-v2`, PDF 76–77 / printed 63–64, Chapter 20; PDF 78–79 / printed 65–66, quick reference |

Source pages support the educational distinctions; they do not define ChartPath's exact fill
algorithm or cost constants.

## 10. Interface and accessibility contract

The order ticket is Hebrew-first and progressively discloses intent, levels, fictional risk and
confirmation. Tickers, prices, quantities, formulas, dates, identifiers, checksum fragments and the
LTR chart timeline are explicitly isolated inside the RTL shell.

Planned entry, working order, actual fill, protective stop, target, open position, exit and
ambiguity use different labels, shapes and line patterns; color is secondary. The planned price and
actual fill are never conflated. An accessible ordered event list exposes the same cutoff-safe state
without requiring chart gestures or color perception. Controls have meaningful Hebrew names, large
targets and deterministic keyboard/non-gesture alternatives. Reduced motion removes nonessential
animation without removing state changes.

Browser screenshots can establish responsive layout, contrast and visible state distinctions. They
do not by themselves establish native VoiceOver/TalkBack speech and focus, OS largest-text behavior,
native gesture ergonomics, lifecycle recovery or physical-device usability; those remain explicit
release gates until separately exercised.

## 11. Privacy, safety and release limits

Execution state remains local under the same guest-first persistence model. It contains fictional
account/risk values, plan levels, immutable simulator events and pinned dataset/session identities;
it contains no brokerage account, real holdings, credentials, order-route identifiers or live
prices. No new telemetry, analytics, remote tutor or network recipient is introduced.

Every learner-facing surface must state in understandable Hebrew that the feature is a historical
educational simulation, uses simplified assumptions, gives no investment advice and does not
predict future results. Interface language must not celebrate profit, shame a modeled loss, suggest
urgency, or turn activity frequency into a reward.

Release readiness requires deterministic/domain, persistence, UI, E2E, export and visual evidence;
exact mismatch recovery; no duplicate events or course credit; accessibility inspection; and human
Hebrew, pedagogy, financial-safety and source review. Until all applicable gates are recorded in
`docs/RELEASE_READINESS.md`, implementation is not a distribution claim.
