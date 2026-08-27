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

Milestone 6 adds an internal, no-credit position-management foundation over an exact open paper
handoff: cutoff-N decisions eligible at N+1, partial/full exits, scale-in, manual stop/target
replacement, frozen-original-1R integer accounting, append-only journal evidence and explicit
ambiguity. Automatic trailing remains deferred. Final Milestone 6 E2E, export, visual and native
evidence is recorded in the release documents. The bounded iOS simulator lifecycle passed through
pending-action cold restore and its single N+1 fill; broader native distribution remains a release
**NO-GO**.

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
Position-management timing, risk and accounting are in `docs/POSITION_MANAGEMENT_POLICY.md`; journal
authorship, correction, privacy and process-grading rules are in `docs/TRADE_JOURNAL_POLICY.md`.

## Verification

```sh
pnpm check
pnpm historical:validate
pnpm scenarios:validate
pnpm scenarios:report
pnpm scenarios:preview
pnpm screenshots:management
pnpm build
pnpm test:e2e:web
pnpm test:e2e:qa:web
pnpm --filter @chartpath/mobile export:web
```

The production web export is verified end to end at phone and tablet viewports. Expo's iOS and
Android Hermes bundles also export successfully. An iOS Expo Go simulator journey verifies native
onboarding, lesson completion, device SQLite, and force-quit/reopen persistence; Milestone 7 adds a
standalone simulator build/backup readback and a signed physical-device installation. Android
runtime, complete standalone/physical-device lifecycles, and screen-reader runs remain explicit
gates before any distribution.
The Milestone 6 iOS simulator run establishes an internal management launch, native SQLite recovery,
pending-action cold restore and one deterministic N+1 partial fill. It does not establish a terminal
debrief, Android, VoiceOver, TalkBack or physical-device runtime readiness. The exact current matrix
is recorded in `docs/NATIVE_ACCESSIBILITY_VERIFICATION.md`.
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

Management QA is equally internal and fail-closed. Simulated P&L never changes the deterministic
process assessment, and journal text stays local under the guest-first data model. No management
variant has passed the external human source, rubric, execution, accessibility, Hebrew,
financial-safety or publication gates.

## Milestone 7 publication-candidate boundary

Milestone 7 freezes one exact Long, Short, and No-trade candidate for external review. Deterministic
machine/human packets, detached Ed25519 attestation verification, a repository-pinned production
trust registry, and a side-effect-free promotion preflight are available through
`pnpm scenarios:candidates`, `pnpm reviews:pack`, `pnpm reviews:verify`, and
`pnpm release:preflight`. The production registry is intentionally empty, every required human
scope is missing, redistribution remains prohibited by the immutable candidate material, and the
ordinary learner catalog remains empty. Status is `PUBLICATION_CANDIDATE_READY`; publication is
`NO-GO`.

Native work now includes a standalone iOS simulator build and SQLite backup-exclusion readback plus
a signed development build installed on the connected iPhone 15 Pro Max. The phone was locked at
launch, and complete standalone candidate lifecycles, VoiceOver, Android, and TalkBack were not
performed. These partial results do not make ChartPath native-release-ready. Exact evidence and
limitations are in `docs/PUBLICATION_CANDIDATE_POLICY.md`,
`docs/REVIEW_ATTESTATION_POLICY.md`, and `docs/NATIVE_ACCESSIBILITY_VERIFICATION.md`.

## Milestone 8 recovery and external-review boundary

Milestone 8 adds a mandatory password-encrypted, user-controlled logical recovery bundle while
retaining complete native backup exclusion. Export defaults to portable settings and attempts;
simulated histories are optional, and management/journal plus quarantine material require explicit
sensitive-data consent. Import is dry-run-first, category-selective, additive, conflict-reporting,
transactional and idempotent. It never copies SQLite/WAL files, internal no-credit QA records,
reproducible datasets, or private grader material. See `docs/RECOVERY_POLICY.md`.

External-review onboarding is proposal-only. Reviewer private keys must remain outside the
repository; public-key fingerprints, qualification/authorization evidence, onboarding proposals,
revocation proposals, and all eight candidate scopes can be checked deterministically. The
production registry remains empty and cannot be overridden by production commands. See
`docs/EXTERNAL_REVIEW_GUIDE.md` and `docs/LICENSING_REVIEW_BRIEF.md`.

The candidate route now requires an explicit development reviewer-build flag in addition to its
route flag and acknowledgement gate. It remains no-credit and absent from production/ordinary
catalogs. Preflight reports category-specific machine, native, accessibility, physical-device,
human-review, licensing and distribution gates. The truthful status is
`INTERNAL_REVIEW_BUILD_READY / EXTERNAL_REVIEW_PENDING / PUBLICATION_NO_GO`; exact evidence and
remaining human/device actions are in `docs/NATIVE_RELEASE_CLOSURE.md`.
