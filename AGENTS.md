# ChartPath contributor guidance

## Product invariants

- The UI and published curriculum are Hebrew-first and RTL; wrap tickers, equations, English
  terminology, dates, and chart axes in explicit LTR containers.
- Describe evidence and probabilistic scenarios. Never turn an exercise, explanation, or chart into
  personalized financial advice or an instruction to buy or sell.
- Preserve the canonical workflow: Context, Structure, Level, Setup, Confirmation, Entry,
  Invalidation, Position size, Target, Management, Review.
- “Wait,” “no trade,” and “insufficient evidence” are first-class correct answers.
- Runtime grading is deterministic and curated. An optional tutor may explain a rubric but may not
  change it.

## Architecture rules

- Keep `packages/domain`, `packages/chart-engine`, and `packages/content` independent of React and
  React Native.
- Keep chart generation, semantic annotations, rendering, and grading separate.
- Attempts are append-only. Migrations must preserve attempts and progress.
- Source-backed content records PDF page ranges and uses original wording.

## Verification

Run `pnpm check` before calling a change complete. For mobile UI changes, also run the Expo web
export and inspect Hebrew screens at phone and tablet widths in light/dark and reduced-motion modes.
