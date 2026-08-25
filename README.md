# ChartPath

ChartPath is a Hebrew-first, mobile learning beta for technical-analysis literacy and disciplined,
risk-aware chart reasoning. It teaches process and uncertainty through deterministic synthetic
charts; it does not provide signals, personalized advice, real trade execution, or live market
data. Its development-only paper-execution foundation is a simplified historical learning
simulation, not a brokerage emulator.

Milestone 5 adds a deterministic, source-pinned synthetic scenario-authoring system and an explicit
internal QA library. The ordinary learner scenario library is intentionally empty because no
candidate has passed the required external human review and publication gates. “No trade” is a
first-class completed analysis: it produces process reflection without creating an order or being
regraded from later price action.

## Workspace

- `apps/mobile` — Expo Router application for iOS, Android, and the supported web verification path.
- `packages/domain` — pure grading, risk, mastery, review, and learning-path logic.
- `packages/chart-engine` — seeded OHLCV generation and semantic annotations.
- `packages/historical-data` — pure canonical datasets, checksums, replay projections and policy
  validation.
- `packages/content` — versioned curriculum, scenario compiler, publication reports, glossary,
  schemas, and content validation.
- `packages/ui` — accessible design tokens and reusable visual primitives.
- `docs` — product, learning, curriculum, architecture, source, safety, authoring, and release notes.

## Local development

Requires Node.js 22+ and pnpm 11+.

```sh
pnpm install
pnpm check
pnpm mobile:web
```

The application is guest-first and works without API keys or cloud services. Progress is stored on
the device. See `docs/RELEASE_READINESS.md` for currently verified targets and known limitations,
and `docs/HEBREW_INTERACTIVE_EXERCISE_AUDIT.md` for the Hebrew/RTL and chart-interaction review.
The exact paper-fill, cost, gap, ambiguity, persistence, no-credit and accessibility assumptions are
documented in `docs/PAPER_EXECUTION_POLICY.md`.
Scenario fields and deterministic generation are documented in `docs/SCENARIO_AUTHORING.md`; the
fail-closed review lifecycle is in `docs/SCENARIO_PUBLICATION_POLICY.md`.

## Verification

```sh
pnpm check
pnpm historical:validate
pnpm scenarios:validate
pnpm scenarios:report
pnpm scenarios:preview
pnpm build
pnpm test:e2e:web
pnpm --filter @chartpath/mobile export:web
```

The production web export is verified end to end at phone and tablet viewports. Expo's iOS and
Android Hermes bundles also export successfully. An iOS Expo Go simulator journey verifies native
onboarding, lesson completion, device SQLite, and force-quit/reopen persistence; Android runtime,
standalone/physical-device, and screen-reader runs remain explicit gates before any distribution.
Those earlier native checks do not establish the new curated-scenario lifecycle. The exact pending
scenario-native, VoiceOver, TalkBack, largest-OS-text and physical-device matrix is recorded in
`docs/NATIVE_ACCESSIBILITY_READINESS.md`.
Reproducible screenshot evidence is under `docs/screenshots/`.

## Educational safety

All charts are synthetic. Examples explain observations, prerequisites, uncertainty, invalidation,
position sizing, and review. They are not recommendations to buy or sell any asset. Stops may execute
away from their requested price because spreads, liquidity, gaps, and slippage exist. Paper fills use
fixed versioned assumptions for reproducibility and do not represent achievable market execution;
the generated development fixture awards no course credit.

Internal scenario QA is visibly labelled and developer-gated. Its synthetic candidates, answer-key
material, expected fills and publication blockers are not ordinary learner content and cannot affect
mastery, review, lesson completion, XP or streaks.
