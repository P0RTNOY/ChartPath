# ChartPath curriculum map

> **Status:** implementation contract, not an implementation report. This document defines the
> content graph and beta inventory that `packages/content` must eventually encode and validate.
> Nothing here asserts that a lesson or exercise is already authored, reviewed, published, or
> available in the application.

## Authority and traceability

The primary source is `technical-analysis-he-digital 2.pdf`, source ID `ta-he-v2`, by Omer
Portnoy, first edition, version 2.0 (August 2026). The audited copy has 87 physical PDF pages:
13 front-matter pages followed by 74 Arabic-numbered book pages. For Arabic-numbered material,
`PDF page = book page + 13`.

Every reference below gives both systems. `PDF p.` is the physical viewer page; `book p.` is the
printed page. Front matter uses its printed Roman number, for example `PDF p. 3 / book p. i`.
The complete audit and figure inventory are in [SOURCE_AUDIT.md](./SOURCE_AUDIT.md).

The lesson and exercise descriptions below are original ChartPath briefs derived from the source;
they are not quotations or permission to reuse the book's prose or artwork. Production visuals must
use newly generated synthetic data and original styling.

## Canonical workflow tags

These IDs, ordering, and Hebrew labels are fixed curriculum vocabulary. Exercises attach every
applicable tag; integrated work may attach several. A tag describes the analytical stage being
practised and is separate from a skill ID.

| Order | Tag ID          | Hebrew label | English label | Source                                                                         |
| ----: | --------------- | ------------ | ------------- | ------------------------------------------------------------------------------ |
|     1 | `context`       | הקשר         | Context       | PDF p. 5 / book p. iii; PDF pp. 60–63 / book pp. 47–50; PDF p. 78 / book p. 65 |
|     2 | `structure`     | מבנה         | Structure     | same workflow sources                                                          |
|     3 | `level`         | רמה          | Level         | same workflow sources                                                          |
|     4 | `setup`         | תצורה        | Setup         | same workflow sources                                                          |
|     5 | `confirmation`  | אישור        | Confirmation  | same workflow sources                                                          |
|     6 | `entry`         | כניסה        | Entry         | same workflow sources                                                          |
|     7 | `invalidation`  | נקודת ביטול  | Invalidation  | same workflow sources                                                          |
|     8 | `position-size` | גודל פוזיציה | Position Size | same workflow sources                                                          |
|     9 | `target`        | יעד          | Target        | same workflow sources                                                          |
|    10 | `management`    | ניהול        | Management    | same workflow sources                                                          |
|    11 | `review`        | תחקור        | Review        | same workflow sources                                                          |

The record model must keep observation, setup, confirmation, entry trigger, analytical
invalidation, stop order, and take-profit rule distinct. They must not be collapsed into a single
“trade plan” answer.

## Skill catalog and prerequisite graph

Skill IDs are stable storage keys. Titles may be edited through content versioning; IDs and their
meaning may not be repurposed. Prerequisites are skill IDs, not merely recommended reading.

| Skill ID                      | Hebrew / English                                                | Prerequisite skill IDs                                        | Exact source                                                                              |
| ----------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `safe.ta-boundaries`          | גבולות הניתוח הטכני / TA boundaries                             | —                                                             | PDF p. 3 / book p. i; PDF pp. 16–18 / book pp. 3–5                                        |
| `data.ohlcv`                  | מחיר, מחזור וזמן / Price, volume, time and OHLC                 | `safe.ta-boundaries`                                          | PDF pp. 16–21 / book pp. 3–8; fig. 2.1, PDF p. 19 / book p. 6                             |
| `data.timeframe-scale`        | מסגרת זמן וקנה מידה / Timeframe and scale                       | `data.ohlcv`                                                  | PDF pp. 19–21 / book pp. 6–8; fig. 2.2, PDF p. 20 / book p. 7                             |
| `data.integrity`              | תקינות ומקור הנתונים / Data integrity and provenance            | `data.ohlcv`                                                  | PDF pp. 20–21 / book pp. 7–8                                                              |
| `structure.dow-trends`        | שכבות מגמה / Dow trend layers                                   | `data.timeframe-scale`                                        | PDF pp. 22–24 / book pp. 9–11; fig. 3.1, PDF p. 23 / book p. 10                           |
| `structure.swings`            | שיאים, שפלים ונקודות בסיס / Swings and base points              | `structure.dow-trends`                                        | PDF pp. 25–26 / book pp. 12–13; fig. 4.1, PDF p. 25 / book p. 12                          |
| `levels.zones`                | אזורי תמיכה והתנגדות / Support and resistance zones             | `structure.swings`                                            | PDF pp. 29–30 / book pp. 16–17; fig. 5.1, PDF p. 29 / book p. 16                          |
| `levels.lines`                | קווי מגמה וערוצים / Trendlines and channels                     | `levels.zones`                                                | PDF pp. 31–32 / book pp. 18–19; fig. 6.1, PDF p. 31 / book p. 18                          |
| `evidence.volume`             | מחזור יחסי כאישור תומך / Relative volume as supporting evidence | `data.integrity`, `structure.swings`                          | PDF pp. 33–35 / book pp. 20–22; fig. 7.1, PDF p. 34 / book p. 21                          |
| `patterns.reversal`           | תבניות היפוך / Reversal patterns                                | `levels.zones`, `evidence.volume`                             | PDF pp. 38–43 / book pp. 25–30; figs. 8.1–9.2                                             |
| `patterns.continuation`       | תבניות התכנסות והמשך / Compression and continuation patterns    | `levels.lines`, `evidence.volume`                             | PDF pp. 44–51 / book pp. 31–38; figs. 10.1–12.1                                           |
| `events.gaps`                 | פערים וסיכון אירוע / Gaps and event risk                        | `data.ohlcv`, `data.integrity`                                | PDF pp. 52–54 / book pp. 39–41; fig. 13.1, PDF p. 53 / book p. 40                         |
| `breakouts.rules`             | כללי תוקף לפריצה / Breakout validity rules                      | `levels.zones`, `evidence.volume`                             | PDF pp. 57–59 / book pp. 44–46; fig. 14.1, PDF p. 58 / book p. 45                         |
| `breakouts.failure`           | בדיקה מחדש וכשל / Retest and failure                            | `breakouts.rules`                                             | PDF pp. 57–59 / book pp. 44–46; fig. 14.2, PDF p. 58 / book p. 45                         |
| `context.multitimeframe`      | ניתוח רב־טווחי / Multi-timeframe analysis                       | `structure.swings`, `breakouts.rules`                         | PDF pp. 60–63 / book pp. 47–50; fig. 15.1, PDF p. 61 / book p. 48                         |
| `workflow.eleven-step`        | תהליך 11 השלבים / Eleven-step workflow                          | `context.multitimeframe`                                      | PDF p. 5 / book p. iii; PDF pp. 61–63 / book pp. 48–50; fig. 15.2, PDF p. 62 / book p. 49 |
| `risk.invalidation-execution` | ביטול לעומת ביצוע / Invalidation versus execution               | `breakouts.failure`                                           | PDF pp. 57–59 / book pp. 44–46; PDF pp. 64–67 / book pp. 51–54                            |
| `risk.r`                      | יחידת סיכון וערך צפוי / R and expected value                    | `risk.invalidation-execution`                                 | PDF pp. 64–67 / book pp. 51–54; fig. 16.1, PDF p. 65 / book p. 52                         |
| `risk.position-size`          | חישוב גודל פוזיציה / Position sizing                            | `risk.r`                                                      | PDF pp. 64–67 / book pp. 51–54; fig. 16.2, PDF p. 66 / book p. 53                         |
| `risk.management`             | ניהול, עלויות וסיכון מצטבר / Management and aggregate risk      | `risk.position-size`                                          | PDF pp. 64–67 / book pp. 51–54; fig. 16.3, PDF p. 66 / book p. 53                         |
| `evidence.testing`            | בדיקה הוגנת והטיות מחקר / Fair testing and research bias        | `safe.ta-boundaries`, `data.integrity`                        | PDF pp. 68–69 / book pp. 55–56                                                            |
| `markets.constraints`         | מגבלות שוק ומכשיר / Market and instrument constraints           | `data.integrity`, `risk.invalidation-execution`               | PDF pp. 70–71 / book pp. 57–58                                                            |
| `review.process`              | תחקור תהליך / Process review                                    | `workflow.eleven-step`, `risk.management`, `evidence.testing` | PDF pp. 72–79 / book pp. 59–66; figs. 19.1–19.2                                           |

This graph is acyclic. Lesson unlocking may additionally require lesson completion, but no lesson may
invent a hidden skill prerequisite.

## Units 0–10

The requested unit taxonomy is canonical. The beta does not replace it with four broad buckets:
all eleven units exist in the path. Unit 5 contains two beta lessons so the beta total is twelve.
The `draft depth` IDs reserve source-supported follow-on coverage without filler prose.

| Unit                     | Hebrew / English title                                        | Required scope                                                                                                                                     | Unit prerequisite        | Beta lesson IDs                                                    | Draft depth metadata IDs       | Exact source                                                                         |
| ------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------ |
| `unit-00-orientation`    | התמצאות וציפיות בטוחות / Orientation and safe expectations    | What TA is/is not; price-volume-time; scenarios; technical vs fundamental; cognitive traps; educational/risk disclosure                            | —                        | `lesson-u00-scenarios`                                             | `draft-u00-bias-practice`      | PDF p. 3 / book p. i; PDF pp. 16–18 / book pp. 3–5                                   |
| `unit-01-chart-data`     | קריאת גרפים ונתונים / Reading charts and data                 | Line, bar, OHLC and candle charts; timeframes; arithmetic/log scales; adjustments; source limits                                                   | `unit-00-orientation`    | `lesson-u01-chart-data`                                            | `draft-u01-data-provenance`    | PDF pp. 19–21 / book pp. 6–8                                                         |
| `unit-02-structure`      | מגמה ומבנה שוק / Trend and market structure                   | Dow foundations; primary/secondary/minor trend; HH/HL, LH/LL; swings; base points; structural change                                               | `unit-01-chart-data`     | `lesson-u02-market-structure`                                      | `draft-u02-structural-change`  | PDF pp. 22–26 / book pp. 9–13                                                        |
| `unit-03-levels-lines`   | רמות וקווים / Levels and lines                                | Zones; significance; role reversal; trendlines; channels; penetration vs confirmed break; fan principle                                            | `unit-02-structure`      | `lesson-u03-levels-lines`                                          | `draft-u03-fan-and-scale`      | PDF pp. 29–32 / book pp. 16–19                                                       |
| `unit-04-volume`         | מחזור ואישור / Volume and confirmation                        | Absolute vs relative volume; trend/pattern evidence; fragmented volume; predefined confirmation; price remains decisive                            | `unit-03-levels-lines`   | `lesson-u04-volume-evidence`                                       | `draft-u04-venue-volume`       | PDF pp. 33–35 / book pp. 20–22; PDF pp. 70–71 / book pp. 57–58                       |
| `unit-05-patterns`       | תבניות היפוך והמשך / Reversal and continuation patterns       | H&S, rounded, double/triple, rectangles, triangles, wedges, broadening, diamonds, flags, pennants; context, confirmation, invalidation, lookalikes | `unit-04-volume`         | `lesson-u05-reversal-patterns`, `lesson-u05-continuation-patterns` | `draft-u05-atlas-retrieval`    | PDF pp. 36–51 / book pp. 23–38; PDF p. 80 / book p. 67                               |
| `unit-06-breakouts`      | פערים, פריצות וכשל / Gaps, breakouts, and failure             | Gap types/risk; breakout rules; immediate/close/retest entry; retest vs failure; false breakout; ATR-aware thresholds                              | `unit-05-patterns`       | `lesson-u06-gaps-breakouts-failure`                                | `draft-u06-sequential-failure` | PDF pp. 52–59 / book pp. 39–46                                                       |
| `unit-07-multitimeframe` | ניתוח רב־טווחי / Multi-timeframe analysis                     | Strategic/tactical/execution layers; top-down work; conflicts; context first; resist timeframe confirmation bias                                   | `unit-06-breakouts`      | `lesson-u07-multi-timeframe`                                       | `draft-u07-journal-transfer`   | PDF pp. 60–63 / book pp. 47–50                                                       |
| `unit-08-risk`           | סיכון וביצוע / Risk and execution                             | Invalidation vs stop; structural/volatility/time stops; R; risk/reward vs EV; sizing; costs; trailing; correlation/leverage/gap/liquidity          | `unit-07-multitimeframe` | `lesson-u08-risk-execution`                                        | `draft-u08-gap-correlation`    | PDF pp. 64–67 / book pp. 51–54; execution cautions at PDF pp. 52–54 / book pp. 39–41 |
| `unit-09-evidence`       | ראיות, אי־ודאות וטעויות / Evidence, uncertainty, and mistakes | Efficiency; data mining/snooping; look-ahead/hindsight; in/out-of-sample; costs/survivorship; examples are not proof; market-specific caveats      | `unit-08-risk`           | `lesson-u09-evidence-uncertainty`                                  | `draft-u09-fair-test-lab`      | PDF pp. 68–71 / book pp. 55–58                                                       |
| `unit-10-capstone`       | תרגיל מסכם: 11 שלבים / Eleven-step capstone                   | Unseen synthetic chart; complete workflow; managed or justified no-trade outcome; process review                                                   | `unit-09-evidence`       | `lesson-u10-capstone`                                              | `draft-u10-practice-plan`      | PDF pp. 72–80 / book pp. 59–67; workflow recap at PDF pp. 78–79 / book pp. 65–66     |

## Twelve beta lessons

Each lesson is short, has five exercises, and is source-grounded. `reviewed` or `published` status
must be earned through the workflow in `CONTENT_AUTHORING.md`; the planned status below is not a
claim about current files.

| Order | Lesson ID and planned title                                                                                          | Prerequisite lesson IDs                                            | Skill IDs                                                                        | Workflow tags                                                                                       | Exact source                                                                               | Exercises |
| ----: | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------: |
|     1 | `lesson-u00-scenarios` — תרחישים, לא נבואות / Scenarios, not predictions                                             | —                                                                  | `safe.ta-boundaries`                                                             | `context`, `setup`, `invalidation`, `review`                                                        | PDF p. 3 / book p. i; PDF pp. 16–18 / book pp. 3–5; fig. 1.1, PDF p. 17 / book p. 4        |         5 |
|     2 | `lesson-u01-chart-data` — לקרוא את הנתונים לפני התבנית / Read data before patterns                                   | `lesson-u00-scenarios`                                             | `data.ohlcv`, `data.timeframe-scale`, `data.integrity`                           | `context`, `structure`                                                                              | PDF pp. 19–21 / book pp. 6–8; figs. 2.1–2.2                                                |         5 |
|     3 | `lesson-u02-market-structure` — מגמות ונקודות מפנה משמעותיות / Trends and meaningful swings                          | `lesson-u01-chart-data`                                            | `structure.dow-trends`, `structure.swings`                                       | `context`, `structure`, `confirmation`                                                              | PDF pp. 22–26 / book pp. 9–13; figs. 3.1, 4.1                                              |         5 |
|     4 | `lesson-u03-levels-lines` — אזורים, קווים ופריצות מוגדרות / Zones, lines, and defined breaks                         | `lesson-u02-market-structure`                                      | `levels.zones`, `levels.lines`                                                   | `structure`, `level`, `confirmation`, `invalidation`                                                | PDF pp. 29–32 / book pp. 16–19; figs. 5.1, 6.1                                             |         5 |
|     5 | `lesson-u04-volume-evidence` — מחזור הוא ראיה תומכת / Volume is supporting evidence                                  | `lesson-u03-levels-lines`                                          | `evidence.volume`, `markets.constraints`                                         | `context`, `setup`, `confirmation`, `review`                                                        | PDF pp. 33–35 / book pp. 20–22; fig. 7.1; PDF pp. 70–71 / book pp. 57–58                   |         5 |
|     6 | `lesson-u05-reversal-patterns` — היפוך דורש מגמה קודמת / Reversal requires a prior trend                             | `lesson-u04-volume-evidence`                                       | `patterns.reversal`                                                              | `context`, `structure`, `level`, `setup`, `confirmation`, `invalidation`, `target`                  | PDF pp. 38–43 / book pp. 25–30; figs. 8.1–9.2                                              |         5 |
|     7 | `lesson-u05-continuation-patterns` — התכנסות והמשך בלי לכפות שם / Compression and continuation without forced labels | `lesson-u04-volume-evidence`                                       | `patterns.continuation`                                                          | `context`, `structure`, `level`, `setup`, `confirmation`, `invalidation`, `target`, `management`    | PDF pp. 44–51 / book pp. 31–38; figs. 10.1–12.1                                            |         5 |
|     8 | `lesson-u06-gaps-breakouts-failure` — להגדיר פריצה ולזהות כשל / Define the break; recognize failure                  | `lesson-u05-reversal-patterns`, `lesson-u05-continuation-patterns` | `events.gaps`, `breakouts.rules`, `breakouts.failure`                            | `context`, `level`, `setup`, `confirmation`, `entry`, `invalidation`, `position-size`, `management` | PDF pp. 52–54 / book pp. 39–41; fig. 13.1; PDF pp. 57–59 / book pp. 44–46; figs. 14.1–14.2 |         5 |
|     9 | `lesson-u07-multi-timeframe` — הקשר, תצורה וטריגר / Context, setup, and trigger                                      | `lesson-u06-gaps-breakouts-failure`                                | `context.multitimeframe`, `workflow.eleven-step`                                 | all eleven tags                                                                                     | PDF pp. 60–63 / book pp. 47–50; figs. 15.1–15.2                                            |         5 |
|    10 | `lesson-u08-risk-execution` — מביטול לכמות / From invalidation to size                                               | `lesson-u07-multi-timeframe`                                       | `risk.invalidation-execution`, `risk.r`, `risk.position-size`, `risk.management` | `entry`, `invalidation`, `position-size`, `target`, `management`, `review`                          | PDF pp. 64–67 / book pp. 51–54; figs. 16.1–16.3                                            |         5 |
|    11 | `lesson-u09-evidence-uncertainty` — לבדוק טענה, לא להתאהב בדוגמה / Test a claim, not an example                      | `lesson-u08-risk-execution`                                        | `evidence.testing`, `markets.constraints`                                        | `context`, `setup`, `confirmation`, `management`, `review`                                          | PDF pp. 68–71 / book pp. 55–58                                                             |         5 |
|    12 | `lesson-u10-capstone` — ניתוח מלא ותחקור / Complete analysis and review                                              | `lesson-u09-evidence-uncertainty`                                  | `workflow.eleven-step`, `review.process`, `risk.management`                      | all eleven tags                                                                                     | PDF pp. 72–79 / book pp. 59–66; figs. 19.1–19.2; quick-reference sheet                     |         5 |

Parallel prerequisite note: the two Unit 5 lessons share the Unit 4 lesson as their direct
prerequisite; neither pattern family is falsely presented as conceptually prior to the other. Unit 6
requires both.

## Sixty-exercise source blueprint

This is the required inventory: twelve lessons × five exercises = exactly 60. The short briefs are
authoring prompts, not learner-facing copy. Every eventual record needs its own source reference,
rubric, feedback, hint ladder, workflow tags, misconception tags, and seeded chart where applicable.

### Unit 0 — `lesson-u00-scenarios`

| Exercise ID         | Brief and interaction family                                                                                   | Exact source                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `u00-scenarios-e01` | Explain what TA can describe and what it cannot promise.                                                       | PDF p. 16 / book p. 3                       |
| `u00-scenarios-e02` | Separate price, volume, and time observations from interpretations.                                            | PDF pp. 16–17 / book pp. 3–4                |
| `u00-scenarios-e03` | Rewrite an absolute forecast as positive/negative conditional scenarios with invalidation.                     | PDF pp. 17–18 / book pp. 4–5                |
| `u00-scenarios-e04` | Diagnose hindsight, confirmation bias, or pattern projection and choose insufficient evidence where warranted. | PDF p. 18 / book p. 5                       |
| `u00-scenarios-e05` | Review a sample learning note for educational framing, risk disclosure, and process-over-one-result reasoning. | PDF p. 3 / book p. i; PDF p. 18 / book p. 5 |

### Unit 1 — `lesson-u01-chart-data`

| Exercise ID          | Brief and interaction family                                                                                                  | Exact source                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `u01-chart-data-e01` | Place open, high, low, and close labels on bullish and bearish candles.                                                       | Fig. 2.1, PDF p. 19 / book p. 6 |
| `u01-chart-data-e02` | Match line, bar, OHLC, and candlestick views to what each preserves or hides.                                                 | PDF p. 19 / book p. 6           |
| `u01-chart-data-e03` | Compare the same history on arithmetic and logarithmic scales.                                                                | Fig. 2.2, PDF p. 20 / book p. 7 |
| `u01-chart-data-e04` | Calculate/check an adjusted series around a split or dividend before analyzing the apparent jump.                             | PDF pp. 20–21 / book pp. 7–8    |
| `u01-chart-data-e05` | Explain whether a bad tick, continuous-futures splice, exchange difference, or unsuitable timeframe invalidates an inference. | PDF pp. 20–21 / book pp. 7–8    |

### Unit 2 — `lesson-u02-market-structure`

| Exercise ID         | Brief and interaction family                                                                                       | Exact source                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `u02-structure-e01` | Label primary, secondary, and short trends without assuming they agree.                                            | PDF pp. 22–24 / book pp. 9–11    |
| `u02-structure-e02` | Sequence accumulation, participation, and distribution while marking the interpretation as uncertain.              | Fig. 3.1, PDF p. 23 / book p. 10 |
| `u02-structure-e03` | Decide how to treat a non-confirming index or breadth observation without using it as a standalone signal.         | PDF pp. 23–24 / book pp. 10–11   |
| `u02-structure-e04` | Tap and label HH/HL or LH/LL swing points.                                                                         | Fig. 4.1, PDF p. 25 / book p. 12 |
| `u02-structure-e05` | Apply a stated ATR/percentage/bar-count swing rule and explain why one break is not automatically a full reversal. | PDF pp. 25–26 / book pp. 12–13   |

### Unit 3 — `lesson-u03-levels-lines`

| Exercise ID      | Brief and interaction family                                                                                    | Exact source                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `u03-levels-e01` | Draw a support/resistance zone around repeated reactions rather than a razor-thin line.                         | PDF pp. 29–30 / book pp. 16–17   |
| `u03-levels-e02` | Annotate resistance-to-support role reversal.                                                                   | Fig. 5.1, PDF p. 29 / book p. 16 |
| `u03-levels-e03` | Rank candidate levels, including the caveat that repeated testing can strengthen evidence or consume the level. | PDF pp. 29–30 / book pp. 16–17   |
| `u03-levels-e04` | Connect allowed swing anchors to draw a trendline and parallel channel.                                         | Fig. 6.1, PDF p. 31 / book p. 18 |
| `u03-levels-e05` | Predefine penetration evidence, then classify retest, failed retest, or slope change/fan behavior.              | PDF pp. 31–32 / book pp. 18–19   |

### Unit 4 — `lesson-u04-volume-evidence`

| Exercise ID      | Brief and interaction family                                                                                     | Exact source                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `u04-volume-e01` | Annotate impulse/correction volume expansion and contraction.                                                    | Fig. 7.1, PDF p. 34 / book p. 21                       |
| `u04-volume-e02` | Calculate relative volume against a declared 20-period baseline.                                                 | PDF pp. 33–35 / book pp. 20–22                         |
| `u04-volume-e03` | Compare volume behavior around an H&S candidate and a contracting triangle without treating volume as a verdict. | PDF pp. 34–35 / book pp. 21–22                         |
| `u04-volume-e04` | Explain what cannot be concluded from FX tick volume, an index proxy, or one crypto venue.                       | PDF p. 35 / book p. 22; PDF pp. 70–71 / book pp. 57–58 |
| `u04-volume-e05` | Quantify an event-volume outlier and write a qualified conclusion.                                               | PDF p. 35 / book p. 22; PDF p. 71 / book p. 58         |

### Unit 5A — `lesson-u05-reversal-patterns`

| Exercise ID        | Brief and interaction family                                                                     | Exact source                                  |
| ------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `u05-reversal-e01` | Accept or reject an H&S label based on prior trend and required geometry.                        | PDF pp. 38–39 / book pp. 25–26; figs. 8.1–8.2 |
| `u05-reversal-e02` | Place neckline, confirmation, invalidation, and measured-estimate labels on an inverse H&S.      | Fig. 8.2, PDF p. 39 / book p. 26              |
| `u05-reversal-e03` | Select a defensible confirmation rule for a rounded bottom.                                      | Fig. 8.3, PDF p. 40 / book p. 27              |
| `u05-reversal-e04` | Distinguish two nearby highs from a confirmed double top by marking the intermediate swing.      | Fig. 9.1, PDF p. 41 / book p. 28              |
| `u05-reversal-e05` | Explain rectangle continuation, reversal, and unresolved scenarios; a shape alone is not enough. | PDF pp. 42–43 / book pp. 29–30; fig. 9.2      |

### Unit 5B — `lesson-u05-continuation-patterns`

| Exercise ID            | Brief and interaction family                                                                             | Exact source                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `u05-continuation-e01` | Classify symmetrical/ascending/descending triangles and separate directional bias from confirmation.     | PDF pp. 44–46 / book pp. 31–33; figs. 10.1–10.2 |
| `u05-continuation-e02` | Mark valid touches and evaluate a late-apex breakout.                                                    | PDF pp. 44–46 / book pp. 31–33                  |
| `u05-continuation-e03` | Calculate a triangle projection and `R`, stopping the estimate at an intervening level.                  | PDF pp. 45–46 / book pp. 32–33                  |
| `u05-continuation-e04` | Distinguish wedge, ordinary channel, broadening pattern, and a forced diamond label.                     | PDF pp. 47–49 / book pp. 34–36; figs. 11.1–11.2 |
| `u05-continuation-e05` | Explain whether a flag/pennant has a credible pole, depth, duration, volume profile, and staged targets. | PDF pp. 50–51 / book pp. 37–38; fig. 12.1       |

### Unit 6 — `lesson-u06-gaps-breakouts-failure`

| Exercise ID         | Brief and interaction family                                                                                    | Exact source                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `u06-breakouts-e01` | Classify common, breakaway, continuation, and exhaustion gap panels using series context.                       | PDF pp. 52–54 / book pp. 39–41; fig. 13.1, PDF p. 53 / book p. 40 |
| `u06-breakouts-e02` | Choose insufficient evidence when continuation versus exhaustion cannot yet be known from the opening gap.      | PDF pp. 53–54 / book pp. 40–41                                    |
| `u06-breakouts-e03` | Write a close/distance/time/ATR/volume validity rule before revealing the next candle.                          | PDF pp. 57–59 / book pp. 44–46                                    |
| `u06-breakouts-e04` | Compare immediate, close-based, and retest entries; then classify normal retest versus first confirmed failure. | PDF pp. 57–59 / book pp. 44–46; figs. 14.1–14.2                   |
| `u06-breakouts-e05` | Calculate risk for breakout versus retest entry including expected costs and gap/slippage uncertainty.          | PDF p. 54 / book p. 41; PDF p. 59 / book p. 46                    |

### Unit 7 — `lesson-u07-multi-timeframe`

| Exercise ID          | Brief and interaction family                                                                                     | Exact source                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `u07-timeframes-e01` | Explain which chart supplies strategic context, tactical setup, and execution trigger.                           | PDF pp. 60–61 / book pp. 47–48; fig. 15.1 |
| `u07-timeframes-e02` | Decide how to treat a short-term bullish setup inside a weekly downtrend without assuming alignment has an edge. | PDF pp. 61–63 / book pp. 48–50            |
| `u07-timeframes-e03` | Arrange the eleven canonical workflow cards in order.                                                            | Fig. 15.2, PDF p. 62 / book p. 49         |
| `u07-timeframes-e04` | Complete a journal record with separate observation, setup, confirmation, trigger, fill, and review fields.      | PDF pp. 62–63 / book pp. 49–50            |
| `u07-timeframes-e05` | Review asset eligibility using spread, liquidity, history, and event calendar.                                   | PDF p. 63 / book p. 50                    |

### Unit 8 — `lesson-u08-risk-execution`

| Exercise ID    | Brief and interaction family                                                                              | Exact source                                              |
| -------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `u08-risk-e01` | Distinguish analytical invalidation, stop trigger, possible fill, and take-profit rule.                   | PDF pp. 64–67 / book pp. 51–54                            |
| `u08-risk-e02` | Calculate `1R`, `2R`, risk/reward, and expected-value components without treating the target as promised. | Fig. 16.1, PDF p. 65 / book p. 52                         |
| `u08-risk-e03` | Calculate quantity with `account risk / (entry-stop distance + expected per-unit costs)`.                 | PDF p. 65 / book p. 52; fig. 16.2, PDF p. 66 / book p. 53 |
| `u08-risk-e04` | Advance a structural trailing stop only after a qualifying new swing.                                     | Fig. 16.3, PDF p. 66 / book p. 53                         |
| `u08-risk-e05` | Aggregate correlated exposure and quantify why leverage, gaps, and margin can exceed the planned loss.    | PDF pp. 66–67 / book pp. 53–54                            |

### Unit 9 — `lesson-u09-evidence-uncertainty`

| Exercise ID        | Brief and interaction family                                                                                         | Exact source                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `u09-evidence-e01` | Explain data-snooping, survivorship, look-ahead, hindsight, and omitted-cost errors in a claim.                      | PDF pp. 68–69 / book pp. 55–56 |
| `u09-evidence-e02` | Design an in-sample/out-of-sample or rolling validation record.                                                      | PDF pp. 68–69 / book pp. 55–56 |
| `u09-evidence-e03` | Decide whether statistical predictability is net tradability after costs and constraints.                            | PDF pp. 68–69 / book pp. 55–56 |
| `u09-evidence-e04` | Explain the relevant data/execution differences for stocks, ETFs, indices, futures, FX, and crypto.                  | PDF pp. 70–71 / book pp. 57–58 |
| `u09-evidence-e05` | Audit a test record for venue, source, timezone, session, adjustment, rollover, spread, halt, and event assumptions. | PDF pp. 70–71 / book pp. 57–58 |

### Unit 10 — `lesson-u10-capstone`

| Exercise ID        | Brief and interaction family                                                                           | Exact source                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `u10-capstone-e01` | Recompute case A size and `R` after higher expected slippage.                                          | PDF pp. 72–73 / book pp. 59–60; fig. 19.1, PDF p. 73 / book p. 60               |
| `u10-capstone-e02` | Reconstruct case B's first failure evidence, actual fill, loss in `R`, and process review.             | PDF pp. 73–74 / book pp. 60–61; fig. 19.2, PDF p. 74 / book p. 61               |
| `u10-capstone-e03` | Defend case C as no trade despite a recognizable pattern.                                              | PDF pp. 74–75 / book pp. 61–62                                                  |
| `u10-capstone-e04` | Review case D and determine what would be required for `1.5R` without moving invalidation dishonestly. | PDF p. 75 / book p. 62                                                          |
| `u10-capstone-e05` | Write a narrow practice rules record with weekly/monthly review and pause criteria.                    | PDF pp. 76–77 / book pp. 63–64; quick reference, PDF pp. 78–79 / book pp. 65–66 |

## Exercise mix and safety quotas

Each exercise has one primary reporting category even when it uses more than one interaction. The
category is for catalog QA, not a restriction on pedagogy.

| Lesson                              | Visual classification / annotation | Explanation / misconception | Calculation | Scenario / decision | Journal / test / review |  Total |
| ----------------------------------- | ---------------------------------: | --------------------------: | ----------: | ------------------: | ----------------------: | -----: |
| `lesson-u00-scenarios`              |                                  0 |                           3 |           0 |                   1 |                       1 |      5 |
| `lesson-u01-chart-data`             |                                  3 |                           1 |           1 |                   0 |                       0 |      5 |
| `lesson-u02-market-structure`       |                                  3 |                           1 |           0 |                   1 |                       0 |      5 |
| `lesson-u03-levels-lines`           |                                  3 |                           0 |           0 |                   2 |                       0 |      5 |
| `lesson-u04-volume-evidence`        |                                  2 |                           1 |           2 |                   0 |                       0 |      5 |
| `lesson-u05-reversal-patterns`      |                                  3 |                           1 |           0 |                   1 |                       0 |      5 |
| `lesson-u05-continuation-patterns`  |                                  3 |                           1 |           1 |                   0 |                       0 |      5 |
| `lesson-u06-gaps-breakouts-failure` |                                  1 |                           1 |           1 |                   2 |                       0 |      5 |
| `lesson-u07-multi-timeframe`        |                                  0 |                           1 |           0 |                   2 |                       2 |      5 |
| `lesson-u08-risk-execution`         |                                  0 |                           0 |           4 |                   1 |                       0 |      5 |
| `lesson-u09-evidence-uncertainty`   |                                  0 |                           2 |           0 |                   1 |                       2 |      5 |
| `lesson-u10-capstone`               |                                  0 |                           0 |           1 |                   1 |                       3 |      5 |
| **Required total**                  |                             **18** |                      **12** |      **10** |              **12** |                   **8** | **60** |

Additional beta gates:

- At least ten authored records must use `near-miss`, `ambiguous`, or `lookalike` chart variants.
  The intended seed set includes `u00-scenarios-e04`, `u02-structure-e03`,
  `u02-structure-e05`, `u03-levels-e03`, `u03-levels-e05`, `u04-volume-e04`,
  `u05-reversal-e01`, `u05-reversal-e04`, `u05-reversal-e05`,
  `u05-continuation-e01`, `u05-continuation-e04`, `u06-breakouts-e02`,
  `u06-breakouts-e04`, and `u07-timeframes-e02`.
- At least ten records must accept a disciplined uncertainty decision as correct. The planned set is
  `u00-scenarios-e04`, `u02-structure-e03`, `u03-levels-e03`, `u03-levels-e05`,
  `u04-volume-e04`, `u05-reversal-e01`, `u05-reversal-e05`,
  `u05-continuation-e01`, `u05-continuation-e04`, `u06-breakouts-e02`,
  `u06-breakouts-e04`, `u07-timeframes-e02`, `u09-evidence-e03`, and
  `u10-capstone-e03`. The rubric decides among `wait`, `reject`, `no-trade`, and
  `insufficient-evidence`; these terms are not interchangeable by default.
- At least ten records must assess risk or position sizing: `u05-reversal-e02`,
  `u05-continuation-e03`, `u06-breakouts-e05`, all five `u08-risk-e01`–`e05`, and
  `u10-capstone-e01`–`e02`. All sizing work includes expected per-unit costs; gap and slippage
  cases state that stop execution price is not guaranteed.
- At least two integrated cases must show a planned loss or failed setup (`u10-capstone-e02` and
  `u06-breakouts-e04`), and at least two must make no trade the best process answer
  (`u05-reversal-e01` and `u10-capstone-e03`).
- No lesson may consist only of multiple choice or only of pattern-name recognition.

## Draft metadata for remaining depth

These records reserve specific source-backed depth after the 60-exercise beta. They contain no
placeholder lesson prose or exercises and must remain `draft` until fully authored and reviewed.

| Draft lesson ID                | Unit                     | Planned Hebrew / English title                                         | Prerequisite lesson IDs             | Skill IDs                                                      | Exact source                                                   | Uncovered depth to author                                                              |
| ------------------------------ | ------------------------ | ---------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `draft-u00-bias-practice`      | `unit-00-orientation`    | מלכודות חשיבה בתרגול / Cognitive traps in practice                     | `lesson-u00-scenarios`              | `safe.ta-boundaries`                                           | PDF pp. 16–18 / book pp. 3–5                                   | Transfer variants for pattern projection, hindsight, and confirmation bias.            |
| `draft-u01-data-provenance`    | `unit-01-chart-data`     | מקור, התאמות ואיכות נתונים / Provenance, adjustments, and data quality | `lesson-u01-chart-data`             | `data.integrity`, `data.timeframe-scale`                       | PDF pp. 20–21 / book pp. 7–8                                   | Deeper split/dividend, continuous-contract, venue, and timeframe comparisons.          |
| `draft-u02-structural-change`  | `unit-02-structure`      | שינוי מבני לפי כלל עקבי / Structural change under a consistent rule    | `lesson-u02-market-structure`       | `structure.swings`                                             | PDF pp. 25–26 / book pp. 12–13                                 | More swing-threshold variants and near-miss reversals.                                 |
| `draft-u03-fan-and-scale`      | `unit-03-levels-lines`   | מניפה, שיפוע וקנה מידה / Fan, slope, and scale                         | `lesson-u03-levels-lines`           | `levels.lines`, `data.timeframe-scale`                         | PDF pp. 31–32 / book pp. 18–19                                 | Fan-principle cases, log-scale redraws, and false precision.                           |
| `draft-u04-venue-volume`       | `unit-04-volume`         | מחזור לפי זירה ומכשיר / Venue-specific volume                          | `lesson-u04-volume-evidence`        | `evidence.volume`, `markets.constraints`                       | PDF p. 35 / book p. 22; PDF pp. 70–71 / book pp. 57–58         | FX ticks, index proxies, crypto fragmentation, open interest, and funding caveats.     |
| `draft-u05-atlas-retrieval`    | `unit-05-patterns`       | אטלס תבניות עם הקשר / Contextual pattern atlas                         | both Unit 5 beta lessons            | `patterns.reversal`, `patterns.continuation`                   | PDF p. 80 / book p. 67                                         | Retrieval across all 13 atlas rows with prerequisite/failure checks.                   |
| `draft-u06-sequential-failure` | `unit-06-breakouts`      | פריצה שמתפתחת נר אחר נר / Sequential breakout and failure              | `lesson-u06-gaps-breakouts-failure` | `breakouts.rules`, `breakouts.failure`, `events.gaps`          | PDF pp. 52–54 / book pp. 39–41; PDF pp. 57–59 / book pp. 44–46 | Candle-by-candle updating without future leakage and alternative entry modes.          |
| `draft-u07-journal-transfer`   | `unit-07-multitimeframe` | יומן רב־טווחי ותרגול העברה / Multi-timeframe journal transfer          | `lesson-u07-multi-timeframe`        | `context.multitimeframe`, `workflow.eleven-step`               | PDF pp. 60–63 / book pp. 47–50                                 | More timeframe ratios, disagreement costs, and before/after journal evidence.          |
| `draft-u08-gap-correlation`    | `unit-08-risk`           | סיכון מצטבר ופערי ביצוע / Aggregate and execution-gap risk             | `lesson-u08-risk-execution`         | `risk.position-size`, `risk.management`, `markets.constraints` | PDF pp. 64–67 / book pp. 51–54; PDF p. 54 / book p. 41         | Cost-heavy, correlated, leveraged, illiquid, and gap-through-stop sizing cases.        |
| `draft-u09-fair-test-lab`      | `unit-09-evidence`       | מעבדת בדיקה הוגנת / Fair-test lab                                      | `lesson-u09-evidence-uncertainty`   | `evidence.testing`, `markets.constraints`                      | PDF pp. 68–71 / book pp. 55–58                                 | Train/test and rolling protocols, sensitivity, costs, drawdown, and venue assumptions. |
| `draft-u10-practice-plan`      | `unit-10-capstone`       | תוכנית תרגול אישית, לא ייעוץ / Personal practice plan, not advice      | `lesson-u10-capstone`               | `review.process`                                               | PDF pp. 76–79 / book pp. 63–66                                 | Rules, metrics, pause conditions, simulated practice, weekly and monthly reviews.      |

## Glossary inventory

All 27 audited glossary concepts require stable IDs and bilingual search. Hebrew is the primary
display value. English, abbreviations, formulas, and IDs render in explicit LTR isolation. Definitions
must be newly written and source-faithful; this table inventories terms, not definition copy.

| Term ID                  | Hebrew display     | English display          | Teaching home     | Exact source           |
| ------------------------ | ------------------ | ------------------------ | ----------------- | ---------------------- |
| `term.confirmation`      | אישור              | Confirmation             | Units 4–7         | PDF p. 81 / book p. 68 |
| `term.atr`               | ממוצע הטווח האמיתי | Average True Range (ATR) | Units 6 and 8     | PDF p. 81 / book p. 68 |
| `term.retest`            | בדיקה מחדש         | Retest                   | Unit 6            | PDF p. 81 / book p. 68 |
| `term.position-size`     | גודל פוזיציה       | Position Size            | Unit 8            | PDF p. 81 / book p. 68 |
| `term.flag`              | דגל                | Flag                     | Unit 5            | PDF p. 81 / book p. 68 |
| `term.pennant`           | דגלון              | Pennant                  | Unit 5            | PDF p. 81 / book p. 68 |
| `term.slippage`          | החלקה              | Slippage                 | Units 6 and 8     | PDF p. 81 / book p. 68 |
| `term.confirmation-bias` | הטיית האישוש       | Confirmation Bias        | Units 0, 7, and 9 | PDF p. 81 / book p. 68 |
| `term.resistance`        | התנגדות            | Resistance               | Unit 3            | PDF p. 81 / book p. 68 |
| `term.r`                 | יחידת סיכון        | R                        | Unit 8            | PDF p. 81 / book p. 68 |
| `term.measured-move`     | יעד מדוד           | Measured Move            | Units 5 and 8     | PDF p. 81 / book p. 68 |
| `term.relative-volume`   | מחזור יחסי         | Relative Volume          | Unit 4            | PDF p. 81 / book p. 68 |
| `term.trend`             | מגמה               | Trend                    | Unit 2            | PDF p. 81 / book p. 68 |
| `term.invalidation`      | נקודת ביטול        | Invalidation             | Units 0, 6, and 8 | PDF p. 81 / book p. 68 |
| `term.open-interest`     | פוזיציות פתוחות    | Open Interest            | Units 4 and 9     | PDF p. 81 / book p. 68 |
| `term.gap`               | פער                | Gap                      | Unit 6            | PDF p. 81 / book p. 68 |
| `term.breakout`          | פריצה              | Breakout                 | Unit 6            | PDF p. 82 / book p. 69 |
| `term.false-breakout`    | פריצת שווא         | False Breakout           | Unit 6            | PDF p. 82 / book p. 69 |
| `term.trendline`         | קו מגמה            | Trendline                | Unit 3            | PDF p. 82 / book p. 69 |
| `term.neckline`          | קו צוואר           | Neckline                 | Unit 5            | PDF p. 82 / book p. 69 |
| `term.higher-low`        | שפל גבוה           | Higher Low               | Unit 2            | PDF p. 82 / book p. 69 |
| `term.lower-high`        | שיא נמוך           | Lower High               | Unit 2            | PDF p. 82 / book p. 69 |
| `term.funding-rate`      | שיעור מימון        | Funding Rate             | Units 4 and 9     | PDF p. 82 / book p. 69 |
| `term.stop-order`        | הוראת סטופ         | Stop Order               | Unit 8            | PDF p. 82 / book p. 69 |
| `term.entry-trigger`     | טריגר כניסה        | Entry Trigger            | Units 6–8         | PDF p. 82 / book p. 69 |
| `term.support`           | תמיכה              | Support                  | Unit 3            | PDF p. 82 / book p. 69 |
| `term.volatility`        | תנודתיות           | Volatility               | Units 6 and 8     | PDF p. 82 / book p. 69 |

## Curriculum acceptance gates

- The catalog contains the eleven canonical units and exactly the twelve beta lesson IDs above.
- Every beta lesson has exactly five exercises, for exactly 60 unique exercise IDs.
- Every lesson and exercise records a valid `ta-he-v2` reference with physical PDF page(s), printed
  book page(s), and chapter/figure where applicable.
- All skill, unit, lesson, misconception, glossary, and prerequisite references resolve; the graph is
  acyclic and every beta lesson is reachable.
- Workflow tags use the eleven IDs and fixed order in this document.
- All requested Unit 0–10 topics are taught by a beta lesson or explicitly reserved by valid draft
  metadata; draft entries are not counted as implemented content.
- The category totals are 18 visual, 12 explanation, 10 calculation, 12 decision, and 8
  journal/test/review exercises.
- The ambiguity, uncertainty-answer, risk, failed-setup, and no-trade quotas above pass against the
  actual rubrics, not filenames or prose labels.
- All 27 glossary IDs exist with Hebrew display text, English search text, source reference, and
  direction-safe rendering metadata.
- The capstone records and grades every workflow stage independently and scores process available at
  the decision candle, never hindsight profit.
