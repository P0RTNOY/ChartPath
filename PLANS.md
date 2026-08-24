# ChartPath beta execution plan

Updated: 2026-08-24

## Initial state

- Blank Git repository on `main`; no pre-existing user files or changes.
- Authoritative 87-page PDF supplied at `/Users/portnoy/Downloads/technical-analysis-he-digital 2.pdf`.
- Copied unchanged to `docs/sources/technical-analysis-he-digital 2.pdf` (SHA-256
  `25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`).
- No tests existed to run before implementation.
- Expo's current default TypeScript template selected the Expo 57 compatible stack.

## Milestones

| Milestone                         | Status   | Evidence / next work                                                      |
| --------------------------------- | -------- | ------------------------------------------------------------------------- |
| 1. Product and source audit       | Complete | All 87 PDF pages, diagrams and printed-page offsets audited.              |
| 2. Domain and content foundation  | Complete | Pure engines, schemas, versioning and 128 package tests pass.             |
| 3. End-to-end learning slice      | Complete | Onboarding → five exercises → persisted summary passes E2E.               |
| 4. Adaptive review and curriculum | Complete | 12 lessons, 60 reviewed exercises, glossary and capstone validate.        |
| 5. Polish and accessibility       | Complete | RTL, themes, motion, user text scale and responsive screenshots verified. |
| 6. Beta verification              | Complete | Static checks, 174 tests, 4 E2E journeys and all platform bundles pass.   |

## Decisions

- Guest-first, local-only beta. No authentication, market APIs, brokerage features, analytics, or AI
  key is required.
- Pure packages own grading and scheduling; the Expo app is an adapter and presentation layer.
- Synthetic charts are generated from integer seeds and store separate ground-truth annotations.
- SQLite is the native persistence target. A deterministic web storage adapter supports browser
  verification while preserving the same repository interface.

## Validation log

| Date       | Command / inspection                      | Result                                                                                |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| 2026-08-23 | Initial `git status --short --branch`     | `main`, no commits, empty worktree.                                                   |
| 2026-08-23 | `pdfinfo` on supplied source              | 87 pages, unencrypted, no JavaScript, 1.7 MB.                                         |
| 2026-08-23 | Expo default template generation          | Selected Expo 57.0.15 / React Native 0.86.2.                                          |
| 2026-08-23 | `pnpm check`                              | PASS; format, lint, strict types, 174 tests, content validation.                      |
| 2026-08-23 | `pnpm content:validate`                   | PASS; 12 lessons, 60/60 reviewed exercises, all quotas.                               |
| 2026-08-23 | `pnpm test:e2e:web`                       | PASS; 4/4 production-export journeys on phone and tablet.                             |
| 2026-08-23 | `pnpm dlx expo-doctor@latest apps/mobile` | PASS; 21/21 checks.                                                                   |
| 2026-08-23 | Expo web, iOS and Android exports         | PASS; 49 web routes and both Hermes native bundles emitted.                           |
| 2026-08-23 | Visual screenshot inspection              | PASS after fixing chart-axis RTL clipping.                                            |
| 2026-08-23 | `pnpm audit --prod --audit-level high`    | PASS release threshold; 0 high/critical, one documented moderate build-tool advisory. |

Native UI/runtime, SQLite-on-device, and screen-reader verification remain distribution gates; see
`docs/RELEASE_READINESS.md`.

## Chart-simulator roadmap

| Milestone                                   | Status   | Evidence / next work                                                                                                                                                     |
| ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Interactive Chart Workbench foundation   | Complete | Pure viewport/replay/drawing state, Hebrew Lab route, deterministic line task, 205 tests and 6 browser journeys pass.                                                    |
| 2. Persistent Guided Analysis Session       | Complete | Source-backed 11-step journey, resumable drafts, atomic finalization, debrief and local history.                                                                         |
| 3. Frozen Historical Replay Foundation      | Complete | Provider-neutral data/import, internal generated replay, exact resume/recovery, blind reveal, non-credit finalization and history are integrated and fully verified.     |
| 4. Deterministic Paper Execution Foundation | Complete | Pure one-plan/order/position engine, checksum-bound persistence, Hebrew ticket/overlays/debrief and final evidence; release gates remain in `docs/RELEASE_READINESS.md`. |

Milestone 1 reuses reviewed exercise `u03-levels-e04`; it does not add historical or current market
data, paper execution, news, AI grading, or a backend. Verification on 2026-08-24 produced a 50-route
web export, iOS and Android Hermes bundles, and four new Workbench screenshots. Native pinch/pan,
physical-device ergonomics, and VoiceOver/TalkBack remain manual gates rather than passing claims.

Milestone 2 reuses reviewed capstone `u10-capstone-e03` and its unchanged authored prompts,
rubrics, hints, explanations, misconceptions and source reference. It adds a versioned pure session
state machine, web/native repository parity, guarded restart/recovery, and an atomic link between one
finalized session and one append-only attempt. Historical market data, execution, news, brokerage and
AI tutoring remain out of scope. Final verification produced 269 passing repository tests, 10/10
production-export browser journeys, 53 web routes, both native Hermes bundles and ten inspected
Guided Analysis screenshots.

Milestone 3 is complete on branch `codex/historical-replay-foundation`; native accessibility and
human publication gates remain pending. The repository has a pure
provider-neutral historical-data package with canonical schema version 1, deterministic canonical
serialization, a pure SHA-256 implementation and CSV import/validation. Its only bundled dataset is
a ChartPath-generated, development-only 96-candle fixture with one recorded gap and canonical checksum
`sha256:07907f75988d2aba5f27d6c73bc596ad9f896452f37a8ba9a240b8ae285a144e`; it contains no real
market prices. A separate historical registry currently reports one internal scenario, zero
course-credit-eligible scenarios and four explicit publication blockers. Guided-session schema 2,
persistence payload schema 4 and native SQLite migration 3 pin and preserve historical evidence. The
Lab now offers an explicitly internal historical entry, blind cutoff-aware replay, exact offline
resume and fail-closed recovery, read-only post-finalization provenance reveal, and local history.
Because the scenario has no course credit, finalization appends no ordinary attempt and changes no
learning projections. Final evidence consists of 413 passing unit/integration tests, 12/12
production-export browser journeys, 53 web routes, iOS and Android Hermes exports, 18/18 focused
historical component tests, 2/2 focused phone/tablet historical browser journeys, an iOS Expo Go
native Lab smoke check and ten inspected web screenshots. There are no provider
keys, runtime market-data requests or real candles in the repository. Milestone 3 itself excluded
paper execution; live data, real orders, news and brokerage integration remain out of scope.

Milestone 4 is complete on local branch `codex/paper-execution-foundation` from the completed M3
checkpoint `a521fd481bbbca465674f5b7608af4d9c1360e18`. It adds only deterministic educational paper
execution: one confirmed plan, market/limit/stop entry, one working order/position, automatic
stop/target or ambiguity resolution, versioned spread/slippage/commission assumptions, immutable
events, exact offline resume, chart overlays and a process-first debrief. The normative mechanics
and limitations are in `docs/PAPER_EXECUTION_POLICY.md`.

The current fixture's reviewed conclusion is no trade. Its hypothetical short mechanics exercise
does not revise that conclusion or award attempts, mastery, review, lesson progress, XP, streak or
daily activity. Multiple positions, portfolios, position management, partial/manual exits, complex
orders, live/delayed data, real order routing, brokerage connectivity, advice and P&L scoring remain
out of scope. Final verification produced 486 passing tests across 43 suites, 18/18 production-export
browser journeys across phone and tablet projects, 54 web routes, iOS and Android Hermes exports,
eight inspected paper-execution screenshots and a limited iOS Expo Go native deep-link/recovery
render smoke check. VoiceOver/TalkBack, OS largest-text behavior, native interaction/lifecycle
recovery, physical-device ergonomics and human publication/editorial review remain release gates;
they are not passing claims.
