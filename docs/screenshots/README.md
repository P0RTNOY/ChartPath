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

The Milestone 5 scenario-library evidence was generated with `pnpm screenshots:scenarios` against an
Expo development web server. The development server is required because unpublished scenario
candidates remain behind the explicit `developer=1` QA route; the ordinary learner library remains
truthfully empty. The 12 original-resolution captures are:

- `scenario-library-empty-light-phone.png` and
  `scenario-library-empty-light-tablet.png` — the ordinary, unpublished-candidate-free learner
  catalog at phone and tablet widths;
- `scenario-guided-long-light-phone.png` and `scenario-blind-short-light-phone.png` — blind analysis
  sessions started from two differently authored internal QA candidates without exposing direction,
  identity or future outcome before finalization;
- `scenario-no-trade-decision-light-phone.png` and
  `scenario-no-trade-debrief-light-phone.png` — explicit no-trade selection and its finalized,
  process-only 100% debrief with no paper-execution call to action;
- `scenario-trade-plan-confirmation-light-phone.png` — the separate fictional plan confirmation for
  an authored trade candidate;
- `scenario-working-order-light-phone.png` — a submitted authored limit order that remains working;
- `scenario-ambiguity-light-phone.png` — deterministic same-candle ambiguity with no invented
  favorable sequence;
- `scenario-qa-publication-blockers-light-phone.png` — explicit internal-QA, source, review,
  licensing and publication blockers after a separate reveal action;
- `scenario-library-empty-dark-phone.png` — the truthful ordinary empty catalog in dark mode; and
- `scenario-guided-large-reduced-phone.png` — the blind QA analysis at the largest in-app text size
  with reduced motion enabled.

The 11 phone images are exactly `390×844`; the tablet image is exactly `1024×768`. They were inspected
at original resolution for Hebrew RTL hierarchy, LTR prices and internal identifiers, clipping,
wrapping, non-color state labels, phone/tablet composition, dark contrast, largest-text layout and
the persistent separation between ordinary learner content and internal QA. These captures do not
claim that any candidate passed human editorial, source, licensing, accessibility, Hebrew,
financial-safety or publication review, and they do not establish native-device accessibility or
ergonomics.

`m5-native-expo-launch-timeout.png` is a separate `1206×2622` iPhone simulator capture from the
bounded native attempt. Original-resolution inspection shows only a black Expo Go foreground with
the iOS status bar. The correct M5 deep link was routed to Expo Go, but native activation timed out
before Metro received a ChartPath bundle request. This file documents the blocker; it is not a
ChartPath visual, RTL, lifecycle, or accessibility pass.
