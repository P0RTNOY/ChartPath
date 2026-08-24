# Beta screenshot evidence

The web images were generated from the local static candidate with `pnpm screenshots:web` while
`pnpm web:e2e:serve` was running. They cover Hebrew RTL onboarding, the learning path, lesson context,
deterministic feedback, a direct chart-label exercise, dark mode with very large text and reduced
motion enabled, and tablet layout.

The `native-ios-*` images were captured earlier on 2026-08-24 from Expo Go `57.0.9` on an iPhone 17
Pro iOS `26.5` simulator. They record disclaimer acceptance, the error-free first-lesson context after
the native badge fix, the truthful `4/5` lesson summary, and the completed lesson after
force-quit/reopen. They predate the final logical-RTL correction and are retained only as historical
native-runtime and persistence evidence; the regenerated web images are the current visual-acceptance
set. See `docs/RELEASE_READINESS.md` for the exact journey and its remaining distribution limits.

The three `native-ios-rtl-*` images are the current native follow-up set. They verify right-aligned
Hebrew onboarding cards and clarification prose, LTR English/market-data fragments, and a rendered
OHLCV chart after a cold Expo Go launch. The floating blue gear belongs to the Expo Go development
menu and is not part of ChartPath.

`native-ios-question-basis.png` and `native-ios-chart-answer-evidence.png` verify the chart-relevance
contract. The reported hindsight exercise now presents only its written case and explicitly says
that no graph inference is required. The candle-label exercise explicitly says the graph is part of
the question and displays the audited chart interaction.
