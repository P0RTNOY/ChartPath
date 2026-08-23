# ChartPath beta execution plan

Updated: 2026-08-23

## Initial state

- Blank Git repository on `main`; no pre-existing user files or changes.
- Authoritative 87-page PDF supplied at `/Users/portnoy/Downloads/technical-analysis-he-digital 2.pdf`.
- Copied unchanged to `docs/sources/technical-analysis-he-digital 2.pdf` (SHA-256
  `25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`).
- No tests existed to run before implementation.
- Expo's current default TypeScript template selected the Expo 57 compatible stack.

## Milestones

| Milestone                         | Status      | Evidence / next work                                        |
| --------------------------------- | ----------- | ----------------------------------------------------------- |
| 1. Product and source audit       | In progress | Full PDF audit and curriculum traceability underway.        |
| 2. Domain and content foundation  | In progress | Workspace scaffolded; schemas, engines, tests next.         |
| 3. End-to-end learning slice      | Pending     | Onboarding → lesson → persisted summary.                    |
| 4. Adaptive review and curriculum | Pending     | 12 lessons, 60 reviewed exercises, glossary, capstone.      |
| 5. Polish and accessibility       | Pending     | RTL, themes, reduced motion, large text, responsive checks. |
| 6. Beta verification              | Pending     | Full checks, web export, browser journeys and screenshots.  |

## Decisions

- Guest-first, local-only beta. No authentication, market APIs, brokerage features, analytics, or AI
  key is required.
- Pure packages own grading and scheduling; the Expo app is an adapter and presentation layer.
- Synthetic charts are generated from integer seeds and store separate ground-truth annotations.
- SQLite is the native persistence target. A deterministic web storage adapter supports browser
  verification while preserving the same repository interface.

## Validation log

| Date       | Command / inspection                  | Result                                        |
| ---------- | ------------------------------------- | --------------------------------------------- |
| 2026-08-23 | Initial `git status --short --branch` | `main`, no commits, empty worktree.           |
| 2026-08-23 | `pdfinfo` on supplied source          | 87 pages, unencrypted, no JavaScript, 1.7 MB. |
| 2026-08-23 | Expo default template generation      | Selected Expo 57.0.15 / React Native 0.86.2.  |

Keep this file current as implementation and verification proceed.
