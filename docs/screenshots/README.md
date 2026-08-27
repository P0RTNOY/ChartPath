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

## Milestone 6 position-management set

The capture script declares the following named management views under
`pnpm screenshots:management`:

- `position-management-open-dashboard-light-phone.png`;
- `position-management-action-selector-light-phone.png`;
- `position-management-partial-confirmation-light-phone.png`;
- `position-management-scale-in-risk-light-phone.png`;
- `position-management-stop-replacement-light-phone.png`;
- `position-management-pending-action-light-phone.png`;
- `position-management-journal-timeline-light-phone.png`;
- `position-management-chart-overlays-light-phone.png`;
- `position-management-process-debrief-light-phone.png`;
- `position-management-ambiguity-light-phone.png`;
- `position-management-dark-phone.png`;
- `position-management-large-reduced-phone.png`; and
- `position-management-light-tablet.png`.

The script emitted all 13 named files. Twelve are original `390×844` phone captures and
`position-management-light-tablet.png` is `1024×768`. Each file was inspected at original
resolution after the complete browser run.

Inspection passed for Hebrew RTL hierarchy; explicit LTR prices, quantities, risk multiples and
dates; cutoff N/N+1 wording; initial/current quantity and frozen original 1R; partial, scale-in and
manual-replacement distinctions; hard/soft risk states; pending/cancel controls; append-only journal
order; chart overlays; explicit ambiguity; process/P&L separation; non-color cues; clipping and
wrapping; dark appearance; largest in-app text with reduced motion; and phone/tablet composition.
No error overlay, hidden required control, clipped Hebrew, bottom-navigation obstruction or invented
future evidence was observed.

Browser captures cannot establish native SQLite recovery, OS largest-text layout, VoiceOver or
TalkBack focus/speech, physical-device ergonomics or signed-build behavior. Separate temporary iOS
simulator captures of the open management screen, pending state before/after relaunch and post-fill
timeline were inspected during the bounded native lifecycle; they are not a full native visual or
accessibility matrix and are not committed as release screenshots.

## Milestone 7 publication-candidate and native set

`pnpm screenshots:publication` captures the explicit reviewer/QA boundary and the actual dry-run
preflight report. The deterministic browser set is:

- `m7-publication-candidate-selection-browser.png` (`390×844`) — opaque ordinary QA cards before
  reveal; direction and publication identity remain hidden;
- `m7-publication-candidate-long-decision-browser.png` (`390×844`) — exact selected Long
  `internal-long-range-breakout@2.1.0`, dataset `2.0.0`, QA/no-publication labels and the real local
  packet path;
- `m7-publication-candidate-short-decision-browser.png` (`430×932`) — exact selected Short
  `internal-short-double-top@2.0.0`, dataset `2.0.0`, full LTR identity and packet path without
  clipping;
- `m7-publication-candidate-long-reviewer-browser.png`,
  `m7-publication-candidate-short-reviewer-browser.png`, and
  `m7-publication-candidate-no-trade-reviewer-browser.png` (`390×844`) — explicit reveal-only
  reviewer packet cards with exact material hash, canonical local packet path, source summary, and
  eight required signed scopes;
- `m7-publication-candidate-largest-text-reduced-motion-browser.png` (`390×844`) — largest in-app
  text and application reduced-motion preference with required content reachable by scroll;
- `m7-publication-candidate-dark-browser.png` (`390×844`) — dark contrast and non-color status
  labels;
- `m7-publication-candidate-tablet-browser.png` (`1024×768`) — responsive tablet composition; and
- `m7-publication-preflight-no-go-blockers-browser.png` (`390×1967`) — real side-effect-free
  `NO-GO` output with every blocker visible.

The corrected Milestone 5 `scenario-blind-short-light-phone.png` (`390×844`) now comes from the
actual `candidate-07` blind Double Top decision screen rather than an unrelated Short candidate. Its
answer remains hidden and its exact scenario identity is asserted from persisted state during
capture.

All browser originals were inspected for Hebrew RTL order, LTR scenario/dataset/hash/path wrapping,
no hidden identity before reveal, non-color state communication, contrast, text resizing, scroll
reachability, and absence of horizontal clipping or overlays. They are browser evidence, not native
or screen-reader passes.

Four standalone iPhone 17 Pro / iOS 26.5 simulator captures are committed at `1206×2622`:

- `m7-native-standalone-onboarding-light-simulator.png`;
- `m7-native-standalone-onboarding-dark-simulator.png`;
- `m7-native-standalone-onboarding-largest-text-simulator.png`; and
- `m7-native-standalone-onboarding-increased-contrast-simulator.png`.

Original-resolution inspection shows fully rendered Hebrew onboarding in light/dark modes, readable
increased-contrast presentation, and OS largest text wrapping without horizontal clipping; the
largest-text frame requires vertical scrolling for later content. These frames prove only the named
standalone simulator layout states. The light capture was deliberately retaken after the development
warning overlay was dismissed; no loading or failed-launch frame is presented as a pass.

Milestone 7 did not produce valid native captures for an open position, pending management action,
terminal debrief, unfilled debrief, or VoiceOver focus. The earlier browser and bounded Milestone 6
simulator evidence remains supporting history and is not relabeled as a standalone M7 native pass.
Android/emulator, TalkBack, and physical-device runtime screenshots are absent because those runs
were not completed.

## Milestone 8 recovery and external-review set

`pnpm screenshots:m8` captures the supported encrypted-recovery path from the production web
export and the explicitly enabled development reviewer surface from a separate QA server. The
original-resolution set is:

- `m8-recovery-privacy-phone-browser.png` and
  `m8-recovery-export-default-phone-browser.png` (`390×844`) — backup exclusion, local-only
  recovery, portable default categories, and the password boundary;
- `m8-recovery-import-dry-run-phone-browser.png` and
  `m8-recovery-import-explicit-confirmation-phone-browser.png` (`390×844`) — exact category/count
  preview with no write, followed by the separate additive-import confirmation;
- `m8-recovery-tamper-rejected-phone-browser.png` (`390×844`) — authenticated failure with no
  preview or apply control;
- `m8-recovery-journal-opt-in-internal-excluded-browser.png` (`390×844`) — explicit sensitive-data
  consent while the internal no-credit QA management record remains excluded;
- `m8-recovery-largest-text-reduced-motion-browser.png` and
  `m8-recovery-dark-phone-browser.png` (`390×844`) — largest in-app text/reduced motion and dark
  appearance;
- `m8-recovery-import-tablet-browser.png` (`1024×768`) — wide dry-run composition;
- `m8-reviewer-acknowledgement-gate-browser.png`, `m8-reviewer-long-packet-browser.png`,
  `m8-reviewer-short-packet-browser.png`, and `m8-reviewer-no-trade-packet-browser.png`
  (`390×844`) — the development-only acknowledgement/reveal boundary and all three exact packet
  identities;
- `m8-accessible-blind-chart-candidate-04-browser.png` and
  `m8-accessible-blind-chart-candidate-07-browser.png` (`390×844`) — visible-only 48-candle chart
  projections for no-trade and Short candidates, with identity/outcome/future metadata still
  hidden; and
- `m8-publication-preflight-categorized-no-go-browser.png` (`390×2825`) — the real deterministic
  preflight rendered by category, including passed machine gates and every still-open external or
  native gate.

Every image was inspected at its original resolution for Hebrew RTL hierarchy, LTR identifiers and
hashes, clipping, wrapping, non-color status, dark contrast, large-text reachability, phone/tablet
composition, explicit confirmation, visible-only chart chronology, internal-reviewer isolation,
and truthful `PUBLICATION_NO_GO` wording. The set contains no plaintext recovery payload or
password, private reviewer key, fabricated approval, hidden grader material, or ordinary learner
candidate entry.

`m8-native-ios-recovery-light.png` is a separate `1206×2622` standalone arm64 Release-build capture
from the exact iPhone 17 Pro / iOS 26.5 simulator. Its SHA-256 is
`4a07a19a2fa993fc28ff820aef0266b03dbf3294fb3d1a5696c3a89f48138829`. Original-resolution
inspection confirms that the post-Milestone 8 app launched and the Hebrew RTL recovery route
rendered in light mode without a development overlay or horizontal clipping. It is one route frame,
not proof of encrypted export/import, file sharing, a completed recovery lifecycle, screen-reader
speech/focus, OS accessibility settings, physical-device behavior, signing or distribution.

The other Milestone 8 images are deterministic browser presentation/accessibility-query artifacts.
They do not establish native file sharing/import, standalone SQLite recovery, OS-level text
settings, physical-device ergonomics, VoiceOver/TalkBack speech or focus, distribution signing,
upload, or publication.
