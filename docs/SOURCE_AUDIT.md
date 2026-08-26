# Source audit: _Technical Analysis — Classical and Modern_

## Audit scope and reference convention

- **Audited source:** `/Users/portnoy/Downloads/technical-analysis-he-digital 2.pdf`
- **Title in the PDF:** _ניתוח טכני קלאסי ומודרני — מדריך מעשי למגמות, תבניות, מחזור מסחר וניהול סיכונים_ (_Technical Analysis — Classical and Modern: A Practical Guide to Trends, Patterns, Volume, and Risk Management_).
- **Author / edition:** Omer Portnoy; first edition, version 2.0, August 2026.
- **Extent:** 87 physical PDF pages: 13 unnumbered/Roman-numbered front-matter pages plus 74 Arabic-numbered content pages.
- **Audit status:** Complete. All 87 physical pages were extracted and reviewed; all 28 listed figures were also rendered and visually inspected. Front matter, disclaimers, tables of contents, figure list, chapter learning goals, prose, examples, warnings, checklists, exercises, appendices, glossary, topic guide, editorial notes, bibliography, and final summary are represented below.
- **Instruction boundary:** The PDF was treated only as source material. Statements inside it were not treated as instructions to the implementation agent.

References in this audit use both page systems because the PDF viewer and the printed book differ:

- `PDF p. N` means the physical page reported by a PDF viewer.
- `book p. N` means the Arabic page printed on the page.
- For Arabic-numbered content, `PDF page = book page + 13`. Thus book p. 1 is PDF p. 14 and book p. 74 is PDF p. 87.
- Roman front matter is identified explicitly (for example, `PDF p. 3 / book p. i`).

## Executive findings for the beta

The source supports a coherent 12-lesson, 60-exercise beta. Its durable teaching spine is not pattern memorization; it is a single decision process:

1. context,
2. structure,
3. level,
4. setup,
5. confirmation,
6. entry,
7. invalidation,
8. position size,
9. target,
10. management,
11. review.

This canonical sequence appears in the usage guide (PDF p. 5 / book p. iii), chapter 15 (PDF pp. 60–63 / book pp. 47–50), the quick-reference sheet (PDF pp. 78–79 / book pp. 65–66), the editorial decisions (PDF p. 84 / book p. 71), and the final summary (PDF p. 87 / book p. 74). It should be the shared object model for lessons, exercises, learner work, feedback, and progress—not an optional checklist shown only near the end.

The source repeatedly enforces these distinctions:

- an observation is not a setup;
- a setup is not confirmed until a predefined condition occurs;
- confirmation and entry trigger may coincide, but are not identical;
- analytical invalidation is not the same thing as a stop order;
- a stop order is an execution mechanism and does not guarantee an execution price;
- a take-profit target is a separate exit rule;
- measured targets are geometric estimates, not promises;
- volume is supporting evidence, not a judge that overrides price;
- a technically recognizable pattern can still be a poor trade;
- “no trade” is a valid, teachable outcome.

The beta should therefore score decision quality and rule adherence, not whether a synthetic chart later moved in the learner's predicted direction.

## Complete content traceability

| PDF pages | Printed pages | Source unit                                       | Content and beta relevance                                                                                                                                                                                         |
| --------- | ------------: | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1–2       |   cover/title | Cover and title                                   | Title, author, first edition (August 2026), original educational edition, no return promise, no investment advice.                                                                                                 |
| 3         |             i | Edition, rights, disclosure                       | Copyright; relationship to Edwards/Magee/Bassetti; all figures use synthetic teaching data; no investment advice; probabilistic framing; leverage/short/uncovered-option loss warning; stop-execution warning.     |
| 4         |            ii | How the book was built                            | Compresses a 43-chapter classical reference into 20 chapters and adds empirical testing, costs, hindsight bias, multiple timeframes, journaling, and continuous-market cautions.                                   |
| 5         |           iii | How to use the guide                              | One chapter at a time; apply checklists to unseen charts; write positive/negative scenarios and invalidation; evaluate consistency over a series; canonical 11-step process and term distinctions.                 |
| 6–11      |         iv–ix | Table of contents                                 | Complete chapter/appendix structure and page ranges.                                                                                                                                                               |
| 12–13     |          x–xi | List of figures                                   | Index of all 28 figures, with captions and printed page references.                                                                                                                                                |
| 14–15     |           1–2 | Part I introduction                               | Establish data and structure before levels/patterns to reduce post-hoc justification.                                                                                                                              |
| 16–18     |           3–5 | Ch. 1: What technical analysis is—and is not      | Price/volume/time; market state; scenario versus forecast; technical versus fundamental; pattern perception, hindsight, confirmation bias; checklist; three exercises.                                             |
| 19–21     |           6–8 | Ch. 2: Charts, data, and scales                   | OHLC and chart forms; arithmetic/log scales; splits/dividends/continuous futures/exchange differences; timeframe selection; data validation; three exercises.                                                      |
| 22–24     |          9–11 | Ch. 3: Dow theory and market structure            | Primary/secondary/short trends; accumulation/participation/distribution; cross-market confirmation as supporting evidence; limitations; three exercises.                                                           |
| 25–26     |         12–13 | Ch. 4: Highs, lows, and base points               | HH/HL and LH/LL structure; meaningful swing rules; ATR/percentage/bar-count alternatives; base points; structural change; three exercises.                                                                         |
| 27–28     |         14–15 | Part II introduction                              | Levels, lines, and volume as context for setup, confirmation, invalidation, and entry.                                                                                                                             |
| 29–30     |         16–17 | Ch. 5: Support and resistance                     | Zones; role reversal; level importance; round numbers/highs; over-testing caveat; checklist; three exercises.                                                                                                      |
| 31–32     |         18–19 | Ch. 6: Trendlines, channels, and fan principle    | Drawing rules; third-touch validation; line authority; channels; penetration/retest; changing slope; three exercises.                                                                                              |
| 33–35     |         20–22 | Ch. 7: Volume and confirmation                    | Trend-volume heuristic; relative volume; pattern volume; incomplete/decentralized volume; explicit non-universality; three exercises.                                                                              |
| 36–37     |         23–24 | Part III introduction                             | Pattern names are descriptive conventions, not proof; require quantitative definition/sample/comparison/costs for statistical claims.                                                                              |
| 38–40     |         25–27 | Ch. 8: Head-and-shoulders and rounded bottoms     | Prior-trend requirement; neckline; confirmation; measured target; inverse form; rounded bottom; worked numbers; three exercises.                                                                                   |
| 41–43     |         28–30 | Ch. 9: Double/triple tops and bottoms; rectangles | Separation and intermediate swing; confirmation; rectangle as continuation or reversal; measured height; three exercises.                                                                                          |
| 44–46     |         31–33 | Ch. 10: Triangles                                 | Symmetrical/ascending/descending forms; contracting range; breakout timing; measured targets; worked risk/reward; three exercises.                                                                                 |
| 47–49     |         34–36 | Ch. 11: Wedges, broadening patterns, and diamonds | Rising/falling wedges; expanding volatility; diamond rarity and hindsight risk; reversal day/selling climax/spike; three exercises.                                                                                |
| 50–51     |         37–38 | Ch. 12: Flags, pennants, and continuations        | Pole/correction; duration/depth/volume qualities; measured pole; staged management; three exercises.                                                                                                               |
| 52–54     |         39–41 | Ch. 13: Price gaps                                | Gap definition bound to series/source; common/breakaway/continuation/exhaustion; island reversal; gap risk to stops; three exercises.                                                                              |
| 55–56     |         42–43 | Part IV introduction                              | Connects recognition to action while preserving invalidation/stop/size/target separation.                                                                                                                          |
| 57–59     |         44–46 | Ch. 14: Breakouts, retests, and false breakouts   | Predefined breakout rules; fixed-percent versus ATR thresholds; three entry modes; false-breakout evidence; retest versus failure; three exercises.                                                                |
| 60–63     |         47–50 | Ch. 15: Multi-timeframe analysis and workflow     | Strategic/tactical/execution layers; alignment caveat; 11-step workflow; journal schema; asset/liquidity selection; three exercises.                                                                               |
| 64–67     |         51–54 | Ch. 16: Stops, targets, and position sizing       | Invalidation before stop; structural/volatility/time stops; R; expected value; sizing formula; trailing stop; correlation, leverage, margin; three exercises.                                                      |
| 68–69     |         55–56 | Ch. 17: What research says—and does not say       | Weak-form efficiency; empirical studies; data snooping; recognition versus net profitability; fair test design; three exercises.                                                                                   |
| 70–71     |         57–58 | Ch. 18: Modern-market adaptation                  | Stocks/ETFs, indices, futures, FX, crypto, algorithmic trading, news/halts; source-specific volume and execution constraints; three exercises.                                                                     |
| 72–75     |         59–62 | Ch. 19: Four complete cases                       | A: successful range breakout; B: confirmed breakout failure; C: recognizable H&S rejected for poor geometry; D: lower-timeframe signal rejected against higher timeframe; 11-step case accounting; four exercises. |
| 76–77     |         63–64 | Ch. 20: Personal action plan                      | Narrow market/method selection; written rules; metrics; weekly/monthly review; stop-trading criteria; simulation before real capital; three exercises.                                                             |
| 78–79     |         65–66 | Consolidated quick-reference sheet                | Full 11-step list, eight “golden rules,” and rapid pattern-check table. Best compact source for global UI/help copy.                                                                                               |
| 80        |            67 | Short pattern atlas                               | Pattern, context, confirmation, and common-failure matrix for 13 pattern rows. Useful as retrieval practice, not as a stand-alone trading signal catalog.                                                          |
| 81–82     |         68–69 | Hebrew–English glossary                           | 22 defined terms covering setup evidence, volatility, risk, patterns, execution, and derivatives data.                                                                                                             |
| 83        |            70 | Topic guide                                       | Manually curated cross-chapter index; useful for in-product “related lesson” links.                                                                                                                                |
| 84        |            71 | Editorial decisions / modern adaptations          | Eight design decisions: consolidation, original synthetic figures, probabilistic language, research, risk, modern markets, 11-step process, deliberate omissions.                                                  |
| 85–86     |         72–73 | Bibliography and sources                          | Sixteen book, academic, regulator, and standards references.                                                                                                                                                       |
| 87        |            74 | Summary                                           | Technical analysis as language for price behavior and risk planning; define rules before outcomes; adapt, size, document, invalidate.                                                                              |

## Doctrine map for 12 lessons

The following distribution preserves prerequisite order and gives each lesson five assessable exercises. “Anchor pages” are the smallest source ranges that should be attached to lesson content and answer rubrics.

| Lesson | Doctrine and intended outcome                                                                                                                                                | Anchor source                                                                 | Required concepts / non-negotiable distinctions                                                                                                                                                                                                           |
| -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|      1 | **Technical-analysis language and trustworthy chart data.** Learner can describe, not prophesy; read OHLC; select scale/timeframe; spot data artifacts.                      | PDF pp. 16–21 / book pp. 3–8; figs. 1.1, 2.1, 2.2                             | Price/volume/time; three market states; scenario + condition + invalidation; technical/fundamental complementarity; arithmetic vs log; adjusted data; no pattern inference before source checks.                                                          |
|      2 | **Trend, Dow structure, and meaningful swings.** Learner can distinguish timeframe layers and label structural progression consistently.                                     | PDF pp. 22–26 / book pp. 9–13; figs. 3.1, 4.1                                 | Primary/secondary/short; accumulation/participation/distribution are interpretive; confirmation is supporting evidence; HH/HL, LH/LL; explicit swing rule; one break is not necessarily a full reversal.                                                  |
|      3 | **Decision zones, trendlines, and channels.** Learner can draw sparse, defensible zones/lines and define what a break means before it occurs.                                | PDF pp. 29–32 / book pp. 16–19; figs. 5.1, 6.1                                | Zone over razor-thin line; role reversal; level importance is heuristic; repeated tests can strengthen or consume a level; third touch; log-scale check; channel; retest; fan as rate change, not magic “three.”                                          |
|      4 | **Volume as contextual confirmation.** Learner can calculate relative volume and qualify volume claims by venue and instrument.                                              | PDF pp. 33–35 / book pp. 20–22, plus PDF pp. 70–71 / book pp. 57–58; fig. 7.1 | Relative not absolute volume; trend/pattern heuristics; price determines P&L; incomplete FX/index/crypto volume; derivatives venue dependence; event outliers; no “statistically valid” label without a test.                                             |
|      5 | **Reversal structures.** Learner can identify and withhold labels until prior trend, components, and confirmation are present.                                               | PDF pp. 38–43 / book pp. 25–30; figs. 8.1–8.3, 9.1–9.2                        | H&S / inverse H&S / rounded bottom; double/triple tops/bottoms; rectangle ambiguity; neckline/intermediate swing confirmation; measured target is an estimate; early versus confirmed entry trade-off.                                                    |
|      6 | **Compression and continuation structures.** Learner can compare triangles, wedges, broadening patterns, diamonds, flags, and pennants without forcing names.                | PDF pp. 44–51 / book pp. 31–38; figs. 10.1–10.2, 11.1–11.2, 12.1              | Symmetrical direction unresolved; ascending/descending are biases, not confirmations; apex timing; wedge convergence; expanding-pattern risk; diamond rarity/hindsight; pole/depth/duration; intermediate levels before measured target.                  |
|      7 | **Gaps and event risk.** Learner can classify gaps only from source, context, and subsequent action, and explain stop slippage.                                              | PDF pp. 52–54 / book pp. 39–41; fig. 13.1                                     | A gap belongs to a specific bar series/venue; common/breakaway/continuation/exhaustion; continuation vs exhaustion uncertain in real time; island reversal needs follow-through; not every gap closes; stop price is not guaranteed.                      |
|      8 | **Breakout decision rules and false breakouts.** Learner can write a rule, select an entry method, and distinguish a normal retest from failure.                             | PDF pp. 57–59 / book pp. 44–46; figs. 14.1–14.2                               | Precommit to close/distance/time/volume rule; fixed percent vs ATR; immediate/close/retest entries; no guaranteed retest; weak close/long wick/re-entry/structure break as evidence; no revenge sizing.                                                   |
|      9 | **Multi-timeframe workflow and journaling.** Learner can move top-down and produce a complete 11-step trade record.                                                          | PDF pp. 60–63 / book pp. 47–50; figs. 15.1–15.2                               | Higher=context, middle=setup, lower=trigger; alignment is a testable filter, not guaranteed edge; observation/setup/confirmation/trigger separation; journal before/after screenshots; liquidity and event check; assess process separately from outcome. |
|     10 | **Risk, execution, and position sizing.** Learner can derive size from invalidation/stop distance and account risk, express outcomes in R, and reason about correlated risk. | PDF pp. 64–67 / book pp. 51–54; figs. 16.1–16.3                               | Invalidation → stop mechanism → quantity, in that order; structural/ATR/time stop; target separate; position-size formula includes expected commission/slippage per unit; gaps can exceed planned R; trailing rule; leverage/margin/correlation.          |
|     11 | **Evidence and market-specific adaptation.** Learner can design a fair test and reject claims that ignore costs, selection bias, or market structure.                        | PDF pp. 68–71 / book pp. 55–58                                                | Weak-form efficiency; mixed evidence; data snooping; train/test split; survivorship, look-ahead, parameter sensitivity; net returns/drawdown/trades; stocks/ETF/index/futures/FX/crypto differences; event/venue constraints.                             |
|     12 | **Integrated cases and a personal practice system.** Learner can finish an analysis with a managed trade or a justified no-trade decision, then review it.                   | PDF pp. 72–80 / book pp. 59–67; figs. 19.1–19.2; quick reference and atlas    | Four complete cases; explicit arithmetic; “no trade” in cases C/D; written market/setup/event/risk rules; process and outcome metrics; weekly/monthly review; pause conditions; simulate/test before risking real capital.                                |

## Sixty-exercise traceability blueprint

Each lesson receives exactly five exercises. These are source-grounded seeds, not verbatim copies of the book's end-of-chapter questions. Use newly created synthetic charts and new numbers when implementing them.

| IDs         | Exercise seeds                                                                                                                                                                                                                                                                                                                                                                    | Exact source basis                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| L01-E01–E05 | E01 rewrite an absolute prediction as conditional bull/bear scenarios with invalidation; E02 label OHLC on two candles; E03 choose arithmetic vs log scale for two histories; E04 diagnose a split/dividend/bad-tick/continuous-contract artifact; E05 choose a workable timeframe and explain cost/noise implications.                                                           | E01 book pp. 4–5; E02 p. 6 fig. 2.1; E03 p. 7 fig. 2.2; E04 pp. 7–8; E05 pp. 7–8 (PDF pp. 17–21).                           |
| L02-E01–E05 | E01 classify primary/secondary/short trends; E02 map accumulation/participation/distribution while labeling the interpretation as uncertain; E03 evaluate a non-confirming index/breadth observation without trading on it alone; E04 label HH/HL or LH/LL; E05 apply a stated swing rule and distinguish a structure break from a full reversal.                                 | Ch. 3 book pp. 9–11 and fig. 3.1 p. 10; ch. 4 pp. 12–13 and fig. 4.1 p. 12 (PDF pp. 22–26).                                 |
| L03-E01–E05 | E01 turn repeated prices into a zone; E02 explain support/resistance role reversal; E03 rank three levels while noting the repeated-test caveat; E04 draw a trendline/channel from allowed anchors; E05 predefine a valid penetration and classify a retest, failed retest, or slope change.                                                                                      | Ch. 5 book pp. 16–17 and fig. 5.1 p. 16; ch. 6 pp. 18–19 and fig. 6.1 p. 18 (PDF pp. 29–32).                                |
| L04-E01–E05 | E01 annotate impulse/correction volume behavior; E02 calculate 20-day relative volume; E03 compare volume expectations in H&S vs triangle; E04 explain what can and cannot be inferred from FX tick volume/index proxy/one crypto venue; E05 investigate an event-volume outlier and write a qualified conclusion.                                                                | Ch. 7 book pp. 20–22 and fig. 7.1 p. 21; market cautions ch. 18 pp. 57–58 (PDF pp. 33–35, 70–71).                           |
| L05-E01–E05 | E01 accept/reject an H&S label based on prior trend and right shoulder; E02 mark neckline, confirmation, invalidation, and measured estimate on inverse H&S; E03 choose a defensible confirmation for a rounded bottom; E04 distinguish two nearby highs from a confirmed double top; E05 compare rectangle continuation, reversal, and unresolved scenarios.                     | Ch. 8 book pp. 25–27, figs. 8.1–8.3; ch. 9 pp. 28–30, figs. 9.1–9.2 (PDF pp. 38–43).                                        |
| L06-E01–E05 | E01 identify symmetrical/ascending/descending triangle and state bias vs confirmation; E02 assess touch count and late-apex breakout; E03 calculate a triangle projection and stop at an intervening level; E04 distinguish wedge, ordinary channel, broadening pattern, and forced diamond; E05 evaluate a flag/pennant using pole, depth, duration, volume, and staged targets. | Ch. 10 book pp. 31–33, figs. 10.1–10.2; ch. 11 pp. 34–36, figs. 11.1–11.2; ch. 12 pp. 37–38, fig. 12.1 (PDF pp. 44–51).     |
| L07-E01–E05 | E01 detect whether two OHLC bars form a gap; E02 classify the three fig. 13.1 scenarios using context and follow-through; E03 separate common from breakaway gap; E04 explain why continuation vs exhaustion cannot be known from the opening gap alone; E05 size/decline a position given event-gap and stop-slippage risk.                                                      | Ch. 13 book pp. 39–41, especially fig. 13.1 p. 40 and warning p. 41 (PDF pp. 52–54).                                        |
| L08-E01–E05 | E01 write close/ATR/volume breakout criteria before seeing the next bar; E02 compare immediate, close, and retest entries; E03 sequence breakout→retest→continuation from fig. 14.1; E04 identify first confirmed return inside the range in fig. 14.2; E05 calculate risk for breakout vs retest entries and classify subsequent action as normal retest or failure.             | Ch. 14 book pp. 44–46, figs. 14.1–14.2 and worked example p. 46 (PDF pp. 57–59).                                            |
| L09-E01–E05 | E01 assign higher/middle/lower charts to context/setup/trigger; E02 classify a short-term bullish signal inside a weekly downtrend; E03 place 11 shuffled cards in canonical order; E04 complete a journal record separating observation, confirmation, trigger, fill, and review; E05 reject or retain an asset based on spread/liquidity/history/events.                        | Ch. 15 book pp. 47–50, figs. 15.1–15.2 (PDF pp. 60–63).                                                                     |
| L10-E01–E05 | E01 distinguish invalidation, stop trigger, possible fill, and take-profit; E02 calculate 1R/2R and expected-value components; E03 calculate quantity from account risk ÷ (entry–stop distance + per-unit costs); E04 advance a structural trailing stop only after a new swing; E05 aggregate correlated exposure and explain leverage/gap risk beyond planned loss.             | Ch. 16 book pp. 51–54, figs. 16.1–16.3; formula and 192-share example p. 52 (PDF pp. 64–67).                                |
| L11-E01–E05 | E01 flag data-snooping, survivorship, look-ahead, and cost omissions in a backtest; E02 design train/test or rolling validation; E03 compare statistical predictability with net tradability; E04 match stocks/ETFs/indices/futures/FX/crypto to data and execution constraints; E05 audit a claim for venue, timezone, rollover, spread, halt, and event assumptions.            | Ch. 17 book pp. 55–56; ch. 18 pp. 57–58 (PDF pp. 68–71).                                                                    |
| L12-E01–E05 | E01 recompute case A size and R after higher slippage; E02 reconstruct case B's first failure evidence and actual loss; E03 defend case C as no-trade despite a clear pattern; E04 determine what would make case D reach 1.5R and whether that change is structurally honest; E05 author a narrow rules document plus weekly/monthly review and pause criteria.                  | Ch. 19 book pp. 59–62, figs. 19.1–19.2 and its four exercises; ch. 20 pp. 63–64; quick reference pp. 65–66 (PDF pp. 72–79). |

### Exercise implementation requirements derived from the source

Every exercise record should carry:

- `source_ref`: PDF and printed page, plus figure/chapter when applicable;
- the relevant 11-step field(s), even when the exercise covers only one;
- a prompt using synthetic or explicitly licensed/frozen historical data;
- an expected answer and partial-credit rubric;
- feedback that distinguishes concept error from execution/arithmetic error;
- an uncertainty/safety note when a learner could mistake a heuristic for a guarantee;
- an outcome-independent process score for scenario, invalidation, size, costs, and rule adherence.

Recommended mix across the 60 exercises:

- 18 visual classification/annotation exercises;
- 12 explanation or misconception-correction exercises;
- 10 calculations (relative volume, measured move, R, size, costs, expected value);
- 12 scenario/decision exercises, including explicit no-trade answers;
- 8 journaling, test-design, or review exercises.

The five-per-lesson blueprint above satisfies the count; the mix can be tuned during implementation as long as every concept remains traceable and no lesson becomes pure pattern recognition.

## Diagram inventory (28 figures)

All figures are declared synthetic and original in the source (PDF p. 3 / book p. i; PDF p. 84 / book p. 71). The inventory is a content specification, not permission to copy. Recreate diagrams from new synthetic data and original styling unless rights are separately confirmed.

| Figure | Book / PDF page | Visual content                                                                 | Best beta use                                           |
| ------ | --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 1.1    | 4 / 17          | One series divided into uptrend, trading range, downtrend                      | Market-state classification; scenario language.         |
| 2.1    | 6 / 19          | Bullish/bearish candle anatomy with open/high/low/close                        | OHLC labeling and accessible non-color encoding.        |
| 2.2    | 7 / 20          | Same move on arithmetic and logarithmic scales                                 | Scale-choice comparison.                                |
| 3.1    | 10 / 23         | Accumulation, public participation, distribution phases                        | Interpretive phase sequencing with uncertainty caveat.  |
| 4.1    | 12 / 25         | Higher highs and higher lows                                                   | Structural labeling and swing-rule exercise.            |
| 5.1    | 16 / 29         | Resistance breakout followed by support role reversal                          | Zone, breakout, and retest exercise.                    |
| 6.1    | 18 / 31         | Rising trendline with parallel price channel                                   | Anchor selection, channel, acceleration/failure.        |
| 7.1    | 21 / 34         | Price impulses/corrections with expanding/contracting volume                   | Relative-volume annotation; supporting-evidence lesson. |
| 8.1    | 25 / 38         | Top H&S with neckline and confirmed break                                      | Component and confirmation labeling.                    |
| 8.2    | 26 / 39         | Inverse H&S                                                                    | Supply-to-demand transition and confirmation.           |
| 8.3    | 27 / 40         | Rounded bottom                                                                 | Gradual transition; alternative confirmation design.    |
| 9.1    | 28 / 41         | Double top confirmed at intermediate trough break                              | Prevent premature labeling.                             |
| 9.2    | 29 / 42         | Rectangle/trading range with breakout                                          | Continuation/reversal ambiguity and measured height.    |
| 10.1   | 31 / 44         | Symmetrical triangle and breakout                                              | Touches, contraction, unresolved direction.             |
| 10.2   | 32 / 45         | Ascending triangle with flat resistance/rising lows                            | Bias versus confirmation.                               |
| 11.1   | 34 / 47         | Rising wedge breaking lower                                                    | Momentum deceleration and confirmation.                 |
| 11.2   | 35 / 48         | Broadening formation                                                           | Expanding volatility and wider structural risk.         |
| 12.1   | 37 / 50         | Bull flag with pole, narrow correction, continuation                           | Pole/depth/duration and measured-target exercise.       |
| 13.1   | 40 / 53         | Three OHLC panels: breakaway, continuation, exhaustion gaps                    | Context-dependent gap classification.                   |
| 14.1   | 45 / 58         | Breakout, retest, and trend renewal                                            | Sequence ordering; retest entry.                        |
| 14.2   | 45 / 58         | Breakout close followed by first close back inside range                       | False-breakout classification.                          |
| 15.1   | 48 / 61         | Same synthetic series at weekly/daily/hourly detail with shared anchor         | Multi-timeframe context/setup/trigger.                  |
| 15.2   | 49 / 62         | Vertical 11-step canonical workflow                                            | Navigation, progress, and shuffled-sequence assessment. |
| 16.1   | 52 / 65         | 1R downside versus 2R target                                                   | R arithmetic.                                           |
| 16.2   | 53 / 66         | Flow diagram from account through risk and stop distance to units              | Position-sizing calculation.                            |
| 16.3   | 53 / 66         | Price with structural trailing stop advanced after new swings                  | Stop-management simulation.                             |
| 19.1   | 60 / 73         | Case A with range, confirmation, entry, stop, invalidation, two targets, trail | Full 11-step successful-process case.                   |
| 19.2   | 61 / 74         | Case B with entry, failed push, return, stop fill, later loss avoided          | Failure, slippage, and post-trade review.               |

Diagram design observations from visual inspection:

- Figures use pale teal/orange/red semantic accents, dark price lines, and direct labels; most remain interpretable without relying only on color.
- Several charts mix Hebrew prose with English axis/series labels. The beta should choose a deliberate localization rule and keep abbreviations such as OHLC, ATR, HH/HL, and R consistent.
- Figures 13.1, 15.1, 15.2, 16.2, 19.1, and 19.2 are multi-part or information-dense. On small screens they should be decomposed into progressive steps rather than shrunk into one static image.
- Accessible alternatives should describe the structural relation (“second trough holds near the first, then price breaks the intermediate high”), not merely repeat the caption.

## Appendix inventories

### Quick-reference doctrine (book pp. 65–66 / PDF pp. 78–79)

The quick-reference sheet restates all 11 steps, then gives eight global rules:

1. a pattern without context is only a drawing;
2. a breakout without a validity rule is a reaction to noise;
3. a measured target is an estimate, not a commitment;
4. invalidation defines analytical failure, while a stop attempts execution and size derives from distance plus costs;
5. volume confirms, but price determines profit/loss;
6. an opportunity is unusable without reasonable liquidity;
7. one result neither proves nor disproves a system;
8. no trade is valid when data are unclear.

Its rapid pattern check covers prior trend, boundaries, confirmation, entry trigger, invalidation versus stop, target, and execution.

### Pattern-atlas rows (book p. 67 / PDF p. 80)

The atlas has 13 rows: H&S top, inverse H&S, double top, double bottom, rectangle, symmetrical triangle, ascending triangle, descending triangle, rising wedge, falling wedge, flag/pennant, breakaway gap, and exhaustion gap. Each row supplies context, confirmation, and a common failure. It is suitable for retrieval practice after lessons 5–8, but should never be presented without the workflow/risk frame.

### Glossary coverage (book pp. 68–69 / PDF pp. 81–82)

The glossary contains 27 defined entries: Confirmation; Average True Range (ATR); Retest; Position Size; Flag; Pennant; Slippage; Confirmation Bias; Resistance; R; Measured Move; Relative Volume; Trend; Invalidation; Open Interest; Gap; Breakout; False Breakout; Trendline; Neckline; Higher Low; Lower High; Funding Rate; Stop Order; Entry Trigger; Support; Volatility.

### Topic-guide links (book p. 70 / PDF p. 83)

- Confirmation and entry trigger → chapters 1, 14, 18; quick reference.
- Pattern atlas → chapters 8–12; short atlas.
- Charts, candles, scales → chapter 2.
- Position size and R → chapter 16; quick reference.
- Research bias and empirical testing → chapter 17.
- Stop order versus invalidation → chapters 14, 16, 18.
- Volume and confirmation → chapter 7.
- Trend, highs, lows → chapters 3–4.
- Multi-timeframe analysis → chapter 15.
- Gaps and false breakouts → chapters 13–14.
- Support, resistance, trendlines → chapters 5–6.
- Work plan and review → chapters 15, 18, 20.

## Legal, educational, and product-safety constraints

### Express source constraints

1. **Copyright and reuse:** All rights are reserved; reproduction, distribution, or storage of portions requires written permission except fair use allowed by law (PDF p. 3 / book p. i). The source says its prose, structure, examples, and illustrations are original and its charts use synthetic data. Beta content should paraphrase doctrine, create new examples, and recreate rather than lift figures/tables/captions unless permission is documented.
2. **Not advice / no promise:** The work is an independent educational guide, not investment advice, a buy/sell recommendation, or a promise of profit (PDF pp. 1, 3 / cover and book p. i). Product onboarding, exercise feedback, and completion screens must retain that educational framing and avoid personalized action language.
3. **Probabilistic, falsifiable framing:** Technical analysis describes probabilistic scenarios, not certainty. A setup must state conditions, invalidation, and acceptable loss (PDF pp. 3, 5, 17–18 / book pp. i, iii, 4–5).
4. **Loss disclosures:** Trading can lose money; leverage, short selling, and uncovered option writing can produce losses above initial investment, while a purchased option's maximum loss is generally its premium (PDF p. 3 / book p. i). Do not teach a universal “maximum loss equals stop distance” claim.
5. **Execution limitations:** A stop is an execution mechanism, not a guaranteed exit price; gaps, fast markets, halts, and illiquidity can produce worse fills (PDF p. 3 / book p. i; PDF pp. 54, 64–67, 71 / book pp. 41, 51–54, 58).
6. **Personal and jurisdictional factors:** Real decisions depend on personal circumstances, taxes, costs, liquidity, and qualified professional advice (PDF p. 3 / book p. i). The beta should not infer suitability from quiz performance.
7. **Simulation before capital:** The final checklist says not to risk real capital before rules are written and tested in a simulated environment or fair historical sample (PDF p. 77 / book p. 64).
8. **Empirical-claim discipline:** A visual heuristic is not “statistically valid” without a defined asset, period, rule, sample, comparison, and costs. Out-of-sample testing and bias controls are required for predictive claims (PDF pp. 33, 36–37, 68–69 / book pp. 20, 23–24, 55–56).

### Derived beta guardrails

These are product implications of the source, not direct quotations:

- Keep default exercises synthetic and delayed/frozen. If market data are ever added, label venue, timezone, adjustment method, session, and data latency.
- Do not emit live “buy,” “sell,” position-size, or suitability recommendations from learner answers.
- A completion certificate should attest to educational progress, not competence to trade or an expected return.
- Never award correctness solely because the market outcome matched the learner's direction. Grade rule definition, evidence, invalidation, costs, size, and review.
- Include no-trade, failed-trade, slippage, gap, and low-liquidity examples, not only clean winning patterns.
- When an exercise uses leverage, shorting, options, futures, or perpetuals, show instrument-specific loss and execution cautions.
- Localize currency examples without implying that taxes, broker rules, market hours, or order behavior are universal.

## Milestone 7 publication-candidate source packet

Milestone 7 selects three exact versions for external review; selection does not constitute a new
source audit, copyright permission or editorial approval. The reviewed repository copy is
`docs/sources/technical-analysis-he-digital 2.pdf`, SHA-256
`25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`.

| Candidate                            | Exact source ancestry                                                                                                                                     | Why selected without using P&L                                                                                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `internal-long-range-breakout@2.1.0` | `u10-capstone-e01`; PDF 72–73 / printed 59–60, Chapter 19 case A / Figure 19.1; management rubric also uses `u10-capstone-e05`, PDF 76–79 / printed 63–66 | The capstone connects breakout evidence, planning, risk and target-as-estimate. The version adds adverse stop and explicit ambiguity evidence, so favorable future performance was not a selection criterion. |
| `internal-short-double-top@2.0.0`    | `u05-reversal-e04`; PDF 41 / printed 28, Chapter 9 / Figure 9.1; management rubric also uses `u10-capstone-e05`, PDF 76–79 / printed 63–66                | It has an exact reviewed confirmation concept and is the only management-enabled short. Its management case closes after an adverse later gap rather than being selected for a target outcome.                |
| `internal-no-trade-capstone-c@1.0.0` | `u10-capstone-e03`; PDF 74–75 / printed 61–62, Chapter 19 case C                                                                                          | It is the only current record explicitly tied to both a complete eleven-step rubric and a full no-trade conclusion. It creates no paper execution, so no future P&L can determine its selection.              |

The packet uses original short Hebrew summaries and exact page/chapter/figure references. It must
not reproduce source diagrams, tables, distinctive compositions or long passages. The synthetic
chart-generator claim `chartGeometryCopied: false` and authoring claim `proseCopied: false` are
facts asserted for review; they are not a legal conclusion or substitute for comparison by a
responsible reviewer.

The source itself states that all rights are reserved. The fact that the PDF is user-authored and
that candidate candles are ChartPath-generated does not automatically authorize public application
distribution, educational adaptation, screenshot distribution or a public synthetic-data license.
Before any candidate can progress beyond review, a responsible human must decide and document:

- who has authority to approve adaptation and redistribution of the source concepts and wording;
- whether the packet and application use only original summaries and independently generated chart
  geometry;
- the permitted audiences, channels, territories and duration;
- required attribution, notices, retention and withdrawal behavior;
- the license for the generated candle datasets and derived screenshots; and
- whether recording an authorized rights state requires a new immutable scenario/dataset material
  version.

Current publication-candidate material records source-adaptation and generated-data rights as
`human-decision-required`, intended redistribution as `not-authorized`, manifest redistribution as
`prohibited` and publication as `internal`. The eighth required signed review scope is `licensing`.
No licensing attestation, written permission or final publication decision has been recorded.

See [PUBLICATION_CANDIDATE_POLICY.md](./PUBLICATION_CANDIDATE_POLICY.md) for exact dataset and
material checksums and [REVIEW_ATTESTATION_POLICY.md](./REVIEW_ATTESTATION_POLICY.md) for the
independent review contract.

## Source references and what they support

The bibliography is on PDF pp. 85–86 / book pp. 72–73.

| Ref. | Source                                                                           | Doctrine supported in the PDF                                                                                                   |
| ---: | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
|    1 | Edwards, Magee & Bassetti (2019), _Technical Analysis of Stock Trends_, 11th ed. | Classical framework, Dow theory, patterns, levels, tactics.                                                                     |
|    2 | Brock, Lakonishok & LeBaron (1992)                                               | Conditional-return evidence for simple moving-average/range-break rules under specified nulls; not universal net profitability. |
|    3 | Lo, Mamaysky & Wang (2000)                                                       | Algorithmic pattern recognition and conditional-return information; not proof of general after-cost profit.                     |
|    4 | Park & Irwin (2004)                                                              | Review of 92 modern studies and test-design problems.                                                                           |
|    5 | Sullivan, Timmermann & White (1999)                                              | Data-snooping correction / Reality Check.                                                                                       |
|    6 | Fama (1991)                                                                      | Weak-form framing and joint-hypothesis caution.                                                                                 |
|    7 | U.S. SEC / Investor.gov, Types of Orders                                         | Stop-order execution is not a guaranteed price.                                                                                 |
|    8 | U.S. SEC, ETF bulletin (2012)                                                    | ETF concentration, liquidity, spread, and NAV premium/discount cautions.                                                        |
|    9 | BIS Markets Committee (2017), sterling flash event                               | Decentralized FX and market-structure/event context.                                                                            |
|   10 | U.S. SEC (2020), algorithmic trading report                                      | Algorithmic order submission/cancellation/routing/execution context.                                                            |
|   11 | U.S. CFTC, futures markets                                                       | Futures leverage, expiry/roll, daily mark-to-market, margin.                                                                    |
|   12 | IOSCO (2025), crypto emerging risks                                              | Fragmented crypto venues, leverage/liquidations, venue-specific derivatives data.                                               |
|   13 | Odean (1999)                                                                     | Excess trading context; listed but not explicitly developed in the core chapters.                                               |
|   14 | Barber & Odean (2000)                                                            | Trading-cost/overtrading context; listed but not explicitly developed in the core chapters.                                     |
|   15 | Murphy (1999), _Technical Analysis of the Financial Markets_                     | Broader professional technical-analysis background.                                                                             |
|   16 | Kirkpatrick & Dahlquist (2010), _Technical Analysis_                             | Broader professional technical-analysis background.                                                                             |

For claims that will be presented as current market/regulatory facts, verify the primary source at implementation time. The PDF's bibliography is a provenance map, not a substitute for current legal, exchange, broker, or regulator documentation.

## Scope limits and omissions to preserve

The beta should not silently expand the source into a different course. The PDF does **not** provide full doctrine or operational training for:

- individual candlestick-pattern catalogs beyond basic candle anatomy;
- oscillator/indicator systems (RSI, MACD, stochastic, Bollinger Bands, etc.); ATR and moving averages appear only in limited supporting roles;
- order-book, market-making, tape-reading, or microstructure strategy;
- broker-specific order behavior, taxes, suitability, or jurisdiction-specific regulation;
- options strategy design, Greeks, or payoff construction;
- futures contract specifications or rollover implementation details;
- executable backtest code, datasets, or validated performance claims;
- portfolio optimization or a complete risk-of-ruin model.

These may become future modules, but they should not be inferred from isolated mentions in this source or introduced into the 12-lesson beta without additional audited sources.

## Acceptance checklist for source fidelity

- [ ] All 12 lessons point to exact PDF/book pages and at least one source doctrine objective.
- [ ] There are exactly 60 exercises and each has a source reference.
- [ ] The 11 canonical steps use one consistent translation and ordering everywhere.
- [ ] Observation, setup, confirmation, entry trigger, invalidation, stop order, and take-profit are distinct data fields.
- [ ] Every pattern lesson includes prior context, confirmation, invalidation, target-as-estimate, and a common failure.
- [ ] Every sizing answer includes expected costs; gap/slippage caveats appear where relevant.
- [ ] At least two integrated exercises have “no trade” as the best answer and at least two show a planned loss or failed setup.
- [ ] Visuals are recreated from new synthetic data or have documented reuse rights.
- [ ] Research exercises separate in-sample discovery from out-of-sample evaluation and include transaction costs.
- [ ] Market-specific exercises identify venue/source/timezone/session/adjustment assumptions.
- [ ] Prominent educational/no-advice/no-return-promise language exists in onboarding and relevant risk contexts.
- [ ] Learner assessment rewards precommitment and process, never hindsight outcome alone.

## Audit method and tool record

- `pdfinfo` established metadata, encryption/script/form status, A4 page size, and the 87-page count.
- Bundled Poppler `pdftotext -layout` extracted bounded ranges covering PDF pages 1–87. Ranges were deliberately overlapped where one output was truncated to ensure no page was missed.
- Bundled Poppler `pdftoppm` rendered every page containing a listed figure; 26 rendered pages contain the 28 figures.
- Pillow contact sheets plus local image inspection were used to check diagrams, captions, multipart layouts, labels, and accessibility-relevant visual structure.
- No web sources were used for this audit; external references are reported as they appear in the supplied PDF and were not independently revalidated here.
