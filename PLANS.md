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

| Milestone                                 | Status   | Evidence / next work                                                                                                  |
| ----------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| 1. Interactive Chart Workbench foundation | Complete | Pure viewport/replay/drawing state, Hebrew Lab route, deterministic line task, 205 tests and 6 browser journeys pass. |
| 2. Persistent Guided Analysis Session     | Complete | Source-backed 11-step journey, resumable drafts, atomic finalization, debrief and local history.                      |
| 3. Historical replay and paper execution  | Planned  | Requires a separately scoped, licensed-data and simulated-order design; no implementation has begun.                  |

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
