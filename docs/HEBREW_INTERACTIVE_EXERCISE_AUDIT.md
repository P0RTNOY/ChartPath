# Hebrew and interactive-chart exercise audit

Updated: 2026-08-24 (Asia/Jerusalem)

## Scope

This audit covered every learner-facing route in the Expo application: onboarding, disclosure,
home, catalog, unit and lesson introductions, the lesson player and feedback, progress, review,
glossary, settings, and the not-found path. It also covered shared navigation, typography, buttons,
badges, progress indicators, charts, every published curriculum record, and all seven specialized
chart interactions.

The review preserves the product's Hebrew-first requirement without changing deterministic grading,
source references, or the rule that charts express evidence and scenarios rather than financial
advice.

## Hebrew and RTL findings

The most important defect was structural: several horizontal layouts combined inherited RTL
direction with `row-reverse`. React Native had already applied the writing direction, so the second
reversal put back controls, icons, navigation items, and numbered sequences on the wrong side. The
same pattern also caused progress bars to fill from the visual left.

The correction uses one logical model throughout:

- Screen and navigation containers receive the active locale direction; semantic rows use `row`.
- The back chevron changes shape with the locale, and its accessible name describes the action.
- Progress fills begin at the logical start edge, including onboarding and lesson progress.
- Chart chronology remains left-to-right because time axes are quantitative rather than prose.
- Tickers, timeframes, dates, equations, prices, and Latin abbreviations are isolated as LTR runs
  inside Hebrew sentences. Chart dates use the familiar `DD/MM` order.
- Pure English subtitles remain LTR, so the same shared top bar does not damage an English layout.
- Numeric value groups keep their intended visual order while their Hebrew labels remain RTL.

The editorial pass also replaced literal or awkward wording across screens, lessons, exercises,
glossary entries, feedback, and settings. Examples include natural action labels, correct singular
and plural forms, consistent `דק׳` units, Hebrew workflow-step names instead of implementation IDs,
and professional terms such as `נקודות מפנה`, `מחזור`, and `שעות מסחר`. “Wait,” “no trade,” and
“insufficient evidence” remain explicit valid outcomes.

## Existing interactive-chart inventory

The application already contained seven specialized interactions. They were retained and improved
rather than replaced.

| Exercise             | Skill                   | Interaction                                         |
| -------------------- | ----------------------- | --------------------------------------------------- |
| `u01-chart-data-e01` | OHLC candle anatomy     | Place six labels on rising and falling candles      |
| `u02-structure-e01`  | Multi-timeframe context | Compare weekly, daily, and hourly views             |
| `u02-structure-e04`  | Market structure        | Mark all seven significant higher highs/lows        |
| `u03-levels-e01`     | Support/resistance      | Mark two opposite corners of a support zone         |
| `u03-levels-e04`     | Trendlines              | Mark two anchors for the rising baseline            |
| `u05-reversal-e04`   | Pattern confirmation    | Mark the intervening low in a possible double top   |
| `u06-breakouts-e04`  | Breakout decisions      | Reveal candles progressively to the decision window |

## Interaction improvements

### Completion and mobile controls

- A chart answer is not submittable until its authored rubric is complete: one required point, all
  seven required points, two line anchors, two zone corners, or all six candle labels.
- Taps snap to the nearest visible candle. Taps on the price axis, date axis, or volume area are
  ignored and produce a short accessible explanation instead of an invalid mark.
- Full multi-point answers no longer reset when the learner taps again. Learners can undo the latest
  point or clear the drawing explicitly.
- Instructions, progress, the latest candle/price, and a completion state appear beside the chart.
  Controls wrap at narrow widths and retain 44-point touch targets.
- The precise candle/price fallback is collapsed until requested. It accepts decimal commas,
  validates the visible candle and price range inline, and uses mode-specific action text.
- Label placement preserves previous labels and advances to the next unfinished label.
- Sequential reveal ends in a clear completion state instead of leaving a stale disabled action.

### Validation and feedback

Grading remains entirely curated and deterministic in `packages/domain`. The UI now mirrors those
requirements before submission: it derives required counts and target types from the authored
rubric and never treats an incomplete draft as an answer.

After submission, drawing feedback preserves the learner's own point, line, zone, or label
placements and overlays the fixed reference geometry with a separate dashed style. The legend names
both layers, and point/label exercises report the matched count. The reference is shown only after a
grade; it is not exposed by the accessible alternative during the exercise.

## Regression coverage

The automated suite now directly covers:

- RTL and LTR back-navigation behavior and LTR English subtitles.
- LTR isolation inside mixed Hebrew strings.
- Draft gating and completion for seven-point structure marking.
- Single-point, line, zone, and six-label completion rules.
- Undo behavior, decimal-comma input, and visible-range validation.
- Ignoring taps outside the price plot.
- Separate learner and reference overlay layers in feedback charts.

The production web journeys continue to cover onboarding, a complete lesson, persistence, glossary
search, dark mode, very large text, and reduced motion. Current command and visual evidence is
recorded in `docs/RELEASE_READINESS.md`.

## Remaining human validation

Automated component, domain, browser, and screenshot checks do not replace a real gesture and
assistive-technology pass. Before native distribution, complete the chart interactions on a physical
phone with VoiceOver and TalkBack, the largest operating-system text size, and reduced motion. An
editorial review by a native Hebrew financial educator and a beginner usability study also remain
appropriate release gates.
