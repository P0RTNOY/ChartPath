# ChartPath

ChartPath is a Hebrew-first, mobile learning beta for technical-analysis literacy and disciplined,
risk-aware chart reasoning. It teaches process and uncertainty through deterministic synthetic
charts; it does not provide signals, personalized advice, trade execution, or live market data.

## Workspace

- `apps/mobile` — Expo Router application for iOS, Android, and the supported web verification path.
- `packages/domain` — pure grading, risk, mastery, review, and learning-path logic.
- `packages/chart-engine` — seeded OHLCV generation and semantic annotations.
- `packages/content` — versioned curriculum, glossary, schemas, and content validation.
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
the device. See `docs/RELEASE_READINESS.md` for currently verified targets and known limitations.

## Educational safety

All charts are synthetic. Examples explain observations, prerequisites, uncertainty, invalidation,
position sizing, and review. They are not recommendations to buy or sell any asset. Stops may execute
away from their requested price because spreads, liquidity, gaps, and slippage exist.
