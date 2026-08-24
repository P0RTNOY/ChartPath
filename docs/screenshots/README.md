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

The `workbench-*` images were generated independently with `pnpm screenshots:workbench` against the
production static export. They record the new Lab at phone and tablet widths, the graded learner and
reference trendline overlay, and the combined dark / largest in-app text / reduced-motion state.
They were inspected at their original `390×844` and `1024×768` resolutions. These web captures do
not establish native gesture or screen-reader usability.

The `guided-analysis-*` set is generated with `pnpm screenshots:guided` against the same production
static export. It records a new session, mid-session state, notebook drawing, leave/resume recovery,
position sizing, the authored no-trade decision, finalized process debrief, local history, combined
dark / largest in-app text / reduced motion, and tablet composition. Captures retain their native
`390×844` or `1024×768` viewport because the React Native scroll container owns scrolling. The set
demonstrates browser layout and state distinctions, not native gestures or screen-reader behavior.

The ten `historical-replay-*` images were generated with `pnpm screenshots:historical` against the
production static export for branch `codex/historical-replay-foundation`:

- `historical-replay-entry-light-phone.png` — the separate internal, generated-data entry and
  development/no-credit disclosures;
- `historical-replay-blind-before-decision-light-phone.png` — the initial blind session, exact
  dataset/checksum pin and `24/73` cutoff without final identity/dates;
- `historical-replay-mid-light-phone.png` — cutoff-only candle chart, neutral accessible notebook and
  replay controls;
- `historical-replay-resumed-light-phone.png` — restored submitted answers and active workflow step;
- `historical-replay-provenance-status-light-phone.png` — resumed cursor/status disclosure while
  identity remains blind;
- `historical-replay-final-reveal-light-phone.png` — after-finalization generated identity,
  provenance, terms, limitations and process/outcome disclosure;
- `historical-replay-debrief-light-phone.png` — read-only process score beside the no-credit reveal;
- `historical-replay-history-light-phone.png` — finalized local history and revealed generated
  provenance;
- `historical-replay-dark-very-large-reduced-phone.png` — dark theme, very-large in-app text and
  reduced-motion state; and
- `historical-replay-light-tablet.png` — wide two-column tablet composition.

The nine phone images are exactly `390×844`; the tablet image is exactly `1024×768`. They were
inspected at those original dimensions for Hebrew RTL hierarchy, LTR checksum/dataset/date strings,
clipping, line wrapping, chart chronology, label/control overlap, non-color status, blind-versus-
revealed identity, dark contrast, very-large text, reduced-motion messaging and responsive
composition. The set confirms browser presentation and persisted browser state only. It does not
establish native rendering, gestures, VoiceOver/TalkBack focus or speech, native largest OS text,
force-close/reopen behavior, physical-device ergonomics or application-bundle secrecy.

The final Milestone 4 paper-execution evidence was generated from the final production web export
with `pnpm screenshots:paper` and inspected at original resolution:

- `paper-execution-ticket-light-phone.png` — progressive confirmed-plan inputs and order types;
- `paper-execution-working-light-phone.png` — submitted working order and distinct planned/working
  overlays;
- `paper-execution-open-light-phone.png` — open simulated position with planned levels and actual
  fill distinguished;
- `paper-execution-debrief-light-phone.png` — deterministic process-first gap-stop debrief;
- `paper-execution-ambiguous-light-phone.png` — explicit same-candle ambiguity with no invented exit;
- `paper-execution-dark-phone.png` — dark-theme contrast and state cues;
- `paper-execution-large-reduced-phone.png` — very-large in-app text and reduced-motion state; and
- `paper-execution-light-tablet.png` — wide two-column tablet composition.

The seven phone images are exactly `390×844`; the tablet image is exactly `1024×768`. Inspection
confirmed Hebrew RTL hierarchy, explicit LTR prices/quantities, chart chronology, clipping and
wrapping, progressive confirmation, cutoff-safe states, event ordering, planned-versus-actual fill
distinction, line/shape/text cues independent of color, dark contrast, large text, reduced-motion
messaging and phone/tablet responsiveness. Component and browser tests additionally cover the
accessible event list and Hebrew control names.

As with earlier sets, web captures establish browser presentation only. They do not establish native
rendering, native gestures, VoiceOver/TalkBack focus or speech, OS largest-text layout,
force-close/reopen recovery or physical-device ergonomics. Leave those gates pending until an actual
native run is recorded in `docs/RELEASE_READINESS.md`.
