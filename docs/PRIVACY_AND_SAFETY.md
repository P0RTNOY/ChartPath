# Privacy, Security, and Financial Safety

> Status snapshot: 2026-08-26. This document defines the policy and engineering
> requirements and now accompanies an implemented local beta. Evidence for controls,
> test coverage, platform-backup behavior, and unresolved distribution gates is kept
> in `docs/RELEASE_READINESS.md` and `docs/NATIVE_ACCESSIBILITY_VERIFICATION.md`; a
> requirement here is not evidence by itself.

## Product safety position

ChartPath is an educational chart-reading application. It is not a broker, trading
signal, portfolio manager, suitability assessment, or source of personalized
financial advice. The beta uses synthetic charts and hypothetical values; it does
not need live market data, brokerage access, or the learner's real holdings.

The product teaches probabilistic analysis and process quality. It must say clearly
that patterns fail, targets are estimates, historical examples are not proof, stop
orders do not guarantee execution price, and costs, spread, slippage, liquidity,
gaps, correlation, and leverage can change outcomes. “Wait,” “no trade,” and
“insufficient evidence” are valid and positively reinforced answers.

Milestones 3 and 4 provide frozen generated replay and deterministic fictional paper execution,
while native accessibility remains pending. There is no real price history, provider credential or
runtime market-data integration. The simulator never routes an order or connects to an account.
Portfolios, live feeds, news, real orders and brokerage connectivity remain out of scope.

## Status language

- **Beta requirement** means implementation and verification are required before
  release.
- **Future design** means it is explicitly outside the offline beta and must not be
  represented as available.
- **Verified** requires linked automated or manual evidence in the release-readiness
  record. Verification is target-specific; a passing web journey does not establish
  native-device or screen-reader behavior.

## Data-minimization baseline

**Beta requirement.** Guest mode is the default and registration is not required.
The application asks only for settings needed for the learning experience. It must
not request a legal name, email, phone number, contacts, advertising ID, precise
location, brokerage credentials, actual portfolio, bank information, income, net
worth, risk tolerance, or trading history.

Position-sizing exercises use clearly labeled hypothetical account risk and prices.
The beta must not ask learners to enter their actual account balance. There are no
ads, ad SDKs, cross-app tracking, public profiles, social feeds, or leaderboards.

### Intended local data inventory

| Data                                          | Purpose                                                       | Location                    | Retention/control                                      |
| --------------------------------------------- | ------------------------------------------------------------- | --------------------------- | ------------------------------------------------------ |
| Attempts and deterministic results            | Feedback, mastery, review, resume                             | Local SQLite                | Until in-app reset or app-data removal                 |
| Hint and misconception history                | Better local feedback/review                                  | Local SQLite                | Until in-app reset or app-data removal                 |
| Lesson/progress projections                   | Learning path and resume                                      | Local SQLite; rebuildable   | Until reset; rebuildable from attempts                 |
| XP, streak, and daily activity                | Non-monetary learning motivation                              | Local SQLite                | Until reset                                            |
| Theme, RTL, text, motion, daily-goal settings | Accessibility and preferences                                 | Local SQLite on native      | Until reset                                            |
| Response duration                             | Optional local diagnostics; never a material mastery penalty  | Local SQLite if implemented | Delete with attempts; do not upload by default         |
| Content/schema versions                       | Migration and reproducibility                                 | Local SQLite                | Retained with relevant attempts                        |
| Guided-analysis drafts                        | Offline resume, replay integrity and final reflection         | Local SQLite                | Until explicit reset; finalized sessions are read-only |
| Paper-execution sessions                      | Resume one fictional plan, events and deterministic debrief   | Local SQLite                | Until explicit reset/abandonment; attempts unaffected  |
| Position-management sessions                  | Resume fictional lots, actions, fills, accounting and debrief | Local SQLite                | Until explicit reset; ordinary attempts unaffected     |
| Management-journal text and corrections       | Local process reflection and immutable correction history     | Local SQLite                | Until explicit reset; never upload by default          |
| Quarantined/rejected records                  | Fail-closed recovery and diagnosis of invalid local payloads  | Local SQLite                | Until reset/recovery; never ordinary learner credit    |
| Internal scenario sessions                    | Resume checksum-pinned synthetic QA analysis                  | Local SQLite                | Until explicit reset; no ordinary credit projection    |
| Generated development candles                 | Exercise infrastructure validation only                       | Bundled application data    | Replaced only by a reviewed build; not learner data    |

The app may generate a random installation-scoped identifier for database
idempotency. It must not derive that ID from hardware identifiers or use it to track
the learner across apps. Avoid free-text response collection in the beta; structured
answers are sufficient and easier to minimize.

“Local” means stored in the app's platform sandbox, not a promise of cryptographic
database encryption. Device lock, OS compromise, debugging tools, and platform cloud
backup behavior affect confidentiality. Release documentation must state whether
the database is included in iCloud/Android backups and either configure the intended
exclusion or accurately disclose that it may be part of the user's device backup.

The current privacy-first decision excludes the complete mutable SQLite store rather than trying to
split co-resident learner data into selectively backed-up classes. Android manifest generation is
configured and asserted with `allowBackup: false`. The iOS source/configuration foundation sets and
reads back `URLResourceValues.isExcludedFromBackup` on durable `Documents/SQLite` before opening the
database and fails closed in a standalone build when the required module or policy is missing.

This intentionally means OS backup/device migration is not a recovery path for attempts, progress,
settings, analyses, paper/management sessions, journal text, quarantine records, or installation
identity. Uninstall, app-data removal, device loss, or device replacement may lose them. Bundled
synthetic datasets and curriculum are application assets, not mutable learner backup data. There is
no account, cloud sync, telemetry, or remote recovery recipient.

Configuration and unit tests pass, but a standalone ChartPath build has not been generated or run,
and the actual iOS app-container resource value has not been read back at runtime. Expo Go cannot
load the local backup-policy module and is not backup evidence. Until the exact runtime checks in
`docs/NATIVE_ACCESSIBILITY_VERIFICATION.md` pass, backup behavior and native distribution remain
**NO-GO** rather than a claim that local storage cannot leave the device through OS backup.

## No telemetry by default

**Beta requirement.** Production builds make no analytics, attribution, advertising,
session-replay, or remote-crash-reporting requests. Learning answers, misconception
history, accessibility choices, and hypothetical financial inputs remain on device.
Network failure must not impair lessons, grading, persistence, mastery, or review.

Development logs are local, disabled or minimized in production, and must not contain
full database rows, authored correct answers, access tokens, or user-entered values.
A dependency is not allowed to collect data merely because collection is enabled by
default; SDK network behavior must be inspected before adoption.

**Future design.** Any telemetry proposal needs a named purpose, event-by-event data
map, lawful/consent basis where applicable, retention and deletion periods, vendor
review, user-facing disclosure, transport security, access controls, and an off
switch. Aggregate usefulness alone is not authorization to upload attempt history.

## Local privacy controls

**Beta requirement.** Settings provide a plainly worded “Delete local learning
data” action with confirmation and a success/error result. Deletion removes attempts,
projections, preferences, cached tutor output (if ever introduced), and any local
installation identifier. Because it is destructive, the target database is resolved
explicitly and deletion is tested. Reinstall/uninstall behavior is documented per
platform, including backup restoration caveats.

Append-only attempts protect learning-history integrity during normal operation; they
do not override a learner's deletion request. The dedicated erase flow is the only
ordinary path that deletes those events. Debug/test reset utilities must not be
reachable in production builds.

If export is added later, it should produce a human-readable, versioned local file
only after an explicit action and must warn that the file may contain learning
history. Export is not required for the first vertical slice.

## Application security requirements

### Data and database integrity

**Beta requirement.** All content, stored JSON, answers, prices, indices, tolerances,
and migrated rows are runtime validated. SQL uses bound parameters. No learner value
is interpolated into a query, file path, route, log statement, or dynamic code.

SQLite foreign keys are enabled. Migrations are bundled, checksum-tracked,
transactional, forward-only, and fixture-tested. Submitted attempts are immutable;
derived tables can be replayed. Attempt IDs make submission idempotent so lifecycle
retries cannot duplicate XP or review updates. A failed migration stops safely and
never silently wipes the database.

### Content and rendering

**Beta requirement.** Bundled content is treated as untrusted until it passes the
content schema and semantic validator. Inputs have finite numeric bounds and maximum
sizes so an invalid seed, candle count, label, or coordinate cannot exhaust the
device. The renderer uses text components and SVG primitives, never `eval`, injected
JavaScript, or unsanitized HTML. If Expo web supports authored rich text, it must use
an allowlist renderer rather than raw HTML injection.

Deep links and Expo Router parameters are allowlisted to known routes and validated
IDs. A crafted route cannot reveal answer keys for locked exercises, invoke debug
screens, erase data, or select an arbitrary local file.

### Secrets and network boundaries

**Beta requirement.** No service key or AI key is required or bundled. Environment
files, signing material, and development tokens remain outside version control.
Client applications can never safely hold a Supabase service-role key or equivalent
privileged secret. Platform secure storage is reserved for future user credentials;
ordinary preferences do not belong there, and secrets never belong in AsyncStorage,
logs, screenshots, or crash reports.

Dependency versions are locked, install scripts reviewed, and release checks include
license and known-vulnerability review. Findings are assessed for actual reachability
and fixed without disabling platform protections merely to pass a test.

The historical-data package is a pure importer/validator/replay library. It has no provider SDK,
runtime fetch, filesystem lookup, key reader or environment-variable dependency. Callers supply the
source bytes/text and a manifest explicitly. The current app bundles no real provider payload and
does not cache provider responses. Adding acquisition code, credentials or a remote endpoint would
be a separate privacy, security, licensing and product-scope decision.

### Platform and release behavior

**Beta requirement.** Request no camera, microphone, photo-library, contacts,
location, health, tracking, or notification permission unless a separately reviewed
feature truly requires it. The expected first vertical slice requires none of them.
Application manifests and generated native projects are checked to ensure transitive
packages did not add unexpected permissions.

Production builds disable developer menus, catalog answer-reveal tools, verbose
logging, and test fixtures intended only for authoring. The developer content catalog
may inspect lessons and exercise metadata, but a production learner route must not
expose hidden answers before submission.

## Deterministic grading and anti-leak controls

**Beta requirement.** Correctness is decided by pure, reviewed rubrics. The grader
receives only candles and semantic evidence available through the exercise's decision
index. Future candles may be revealed after submission for discussion, but neither
their direction nor the simulated profit may retroactively change the grade.

Ground-truth annotations and rubrics are not passed to chart-render interaction code
unless needed for an explicitly visible overlay. Feedback is displayed only after
the attempt becomes final. In-development catalog tools that reveal ground truth are
visually marked and excluded or gated from production.

Malformed numeric answers are rejected: `NaN`, infinity, negative risk, invalid
prices, zero entry-stop distance, and overflows must never create a favorable grade.
Drawing tolerances are documented and evaluated in chart coordinates so device size
does not change correctness.

### Frozen historical replay boundary

Canonical historical schema version 1 pins provenance, UTC/local timestamps, interval/session and
adjustment policies, recorded gaps, editorial/publication status and lowercase SHA-256 identity. The
only installed fixture has 96 ChartPath-generated candles, one recorded gap and checksum
`sha256:07907f75988d2aba5f27d6c73bc596ad9f896452f37a8ba9a240b8ae285a144e`. It represents no
issuer, exchange or real prices.

Every historical visual and accessibility view is derived from the same prefix bounded by the
current replay cursor and the minimum decision/permitted/knowledge cutoff. Future candles cannot
affect extrema, scale, aggregate volume, visible scenario annotations, corporate actions, timestamps,
titles or screen-reader text. Blind mode redacts instrument identity and timestamps until the
authored post-finalization reveal policy allows them.

This boundary limits ordinary learner UI and accessibility leakage; it is not cryptographic or DRM
protection. A learner controlling a bundled client may inspect application bundles, source maps,
memory or developer tools. Therefore production safety must not depend on installed candles, answer
metadata or source identities being secret, and development/debug surfaces must remain excluded or
gated from production.

Guided-session schema 2 distinguishes a synthetic seed/generator pin from a historical
scenario/dataset/version/checksum pin. Persistence payload schema 4 and native SQLite migration 3
retain the replay cursor, monotonic maximum-seen high-water mark, annotation authorship cursor and
append-only checkpoint snapshots. Resume resolves exact pinned evidence and fails closed as
`scenario-missing`, `dataset-missing`, `checksum-mismatch`, `metadata-mismatch` or
`dataset-modified`; `ready` is the only editable resolution. The system never downloads a
replacement, repairs a checksum, substitutes a nearby version, repins silently or clamps inconsistent
session evidence.

The installed scenario is practice-only. Its finalization stores the immutable read-only session but
adds no attempt and changes no mastery, review, lesson, XP, streak or daily-activity projection. Any
future credited historical scenario must include the exact pinned chart identity in its immutable
attempt and pass the human/licensing publication gate first.

### Historical data rights and publication

`docs/HISTORICAL_DATA_POLICY.md` records dated official-source research; it does not grant rights.
No real candle may be committed, cached for shipment or externally displayed until an accountable
human confirms the governing agreement permits the exact commercial/educational use, retention,
caching, display, bundling, redistribution, attribution and derived-data treatment. Procurement and
legal approval are distinct from a technically successful API call.

The legacy development replay remains zero-credit and is blocked by unpublished scenario/dataset,
unverified redistribution, missing human editorial review and unpublished paper execution. The
separate Milestone 5 candidate report adds nine internal synthetic candidates with 97 explicit
publication blockers and zero structural issues; it does not change the ordinary learner catalog.
Authors cannot self-declare credit. Publication also requires exact dataset and rubric pins,
canonical validation, market and educational provenance, Hebrew disclosure, cutoff/future-leak
validation and human editorial evidence. Databento is only a procurement lead; none of the
researched providers is an approved bundled-data source.

### Deterministic paper-execution boundary

Paper execution stores a fictional account value/risk budget, plan levels, quantity, exact
historical/analysis identity, processed-candle fingerprints, immutable simulator events and its
debrief. It requests no actual balance, holdings, brokerage identity, credential, account number or
order-route data. It is local-only under the existing guest storage/backup disclosure and adds no
analytics, remote tutor, market-data call or other recipient.

`paper-execution-policy-v1` and `paper-cost-model-v1` are visible simplified assumptions. Market
entry occurs at the next open; limit and target fills have no favorable improvement; gaps through
entry/protective stops use an adverse open; and unorderable intrabar threshold touches become
ambiguous. Market/stop fills apply a ten-basis-point total spread, five basis points of adverse
slippage, adverse tick rounding and commission. This consistency is a reproducibility control, not
a promise that a real venue or broker behaves that way. Partial fills, order books, queue priority
and unsupported liquidity inference are explicitly absent.

The chart and accessible event list receive only processed candles. Repeated candles are idempotent;
changed or skipped evidence and dataset/scenario/checksum mismatches fail closed. Execution state is
separate from append-only attempts, and the current development fixture can never change mastery,
review, lesson progress, XP, streak or daily activity. Reset/abandonment is explicit and does not
rewrite the finalized analysis or learning history.

The fixture's reviewed analysis concludes no trade. The mechanics exercise must keep the conflict
visible and must not imply that a simulated result validates bypassing the analysis. Debriefs score
process separately from P&L, do not celebrate profit or shame modeled loss, and state that historical
simulation neither recommends an action nor predicts future performance.

### Curated scenario and internal-QA boundary

Scenario manifests and stored scenario identities are treated as untrusted until their supported
top-level schema, compiler contract, exact reviewed source/content binding, checksums, replay cutoffs,
Hebrew/accessibility/safety fields, rubric and deterministic execution snapshot validate. The
current runtime parser is not an exhaustive nested-schema validator, so external serialized
authoring input is not an approved ingestion path.

Compilation keeps the private grading exercise separate from the learner exercise projection. The
learner projection contains no accepted rubric, explanation, source identity, dataset identity,
expected decision or execution outcome. Ordinary selection derives only published, reviewed,
blocker-free records and is currently empty. Internal candidates are reachable only through an
explicit developer QA route that labels them synthetic, internal and no-credit; detailed source,
checksum, expected-outcome and blocker views require a separate reveal action.

Reviewer authentication is external. The compiler accepts reviewer-record IDs asserted by a caller
as authenticated and verifies all seven approval scopes, timestamp order and material checksum, but
it neither identifies nor authenticates a human. A coding agent, manifest literal or passing command
cannot close editorial, source, Hebrew, accessibility, financial-safety, execution or publication
review. A later `changes-requested` record, including an equal-instant tie, blocks approval.

Internal candidate sessions remain local and pin the same scenario/dataset/checksum evidence as
historical replay. They create no new recipient, credential, real-price record or telemetry. Because
they have no course credit, finalization must not change attempts, mastery, review, lesson progress,
XP, streak or activity. A correct no-trade application creates no order/position and cannot be
regraded from later price action.

### Position-management and journal boundary

Milestone 6 stores one exact open paper handoff, scenario-granted authority, safe-integer lots,
fills, risk/accounting projections, processed-candle fingerprints, immutable simulator events and
learner-authored journal text. It does not request real holdings, account balance, brokerage or tax
identifiers, credentials, order routes or live prices. The management variants are synthetic,
internal, no-credit and visibly developer-gated.

Journal prose is potentially sensitive local data. It remains inside the guest persistence adapter;
there is no telemetry, cloud recipient, AI rewriting, analytics or sync. Learners should not enter
credentials, account numbers, personal identifiers or real trade instructions. A future sync or
tutor feature would require a new explicit privacy, consent and authorization review rather than
silently uploading existing entries.

`position-management-policy-v1` uses cutoff N / eligibility N+1, manual replacements, explicit
ambiguity, a frozen original 1R and deterministic integer/FIFO accounting. These are disclosed
simulator assumptions, not claims about venue priority or achievable execution. Automatic trailing
is absent. Soft risk increases require acknowledgement; hard risk, quantity and scale-in violations
fail closed.

Every material action creates an append-only rationale before the next candle. Corrections reference
the original entry and never erase it. Repository canonical-prefix checks plus SQLite update/delete
triggers prevent ordinary journal rewriting. P&L, later outcome and ambiguous intrabar guesses are
excluded from process grading. Management never appends an attempt or changes mastery, review,
lesson progress, XP, streak or daily activity.

Persistence payload schema 6 and native SQLite migration 5 preserve and mirror management/journal
evidence. Migration 5 is pinned to
`sha256:ddfdc6589ba3ea48862156293c60bb904a3a781fd4c3a73400a193fd1d25eb8a`. Invalid or ancestry-
divergent payloads quarantine with canonical JSON retained rather than being silently repaired.
Native lifecycle, assistive-technology and physical-device verification remain open release gates.

## Financial-safety content rules

These are **beta requirements** for every screen, lesson, exercise, notification,
and piece of feedback:

1. Use conditional language such as “may,” “scenario,” and “evidence,” not certainty
   or promises.
2. Never tell a learner to buy, sell, hold, short, or allocate money to a real asset.
3. Never personalize a recommendation from age, wealth, goals, experience, or
   purported risk tolerance.
4. Keep observation, setup, confirmation, entry trigger, invalidation, execution,
   and outcome distinct.
5. Require a preceding trend for reversal-pattern conclusions and context for every
   pattern.
6. Treat volume as supporting evidence; do not present it as a standalone verdict.
7. Label measured targets as estimates and stop orders as mechanisms that can suffer
   gaps and slippage.
8. Include per-unit expected costs in position sizing and reject invalid inputs.
9. Reward process, uncertainty recognition, risk discipline, review, and correction;
   never simulated profit, leverage, activity frequency, or aggressive risk.
10. Do not imply that a single attractive example, backtest, streak, or high mastery
    score proves profitability.

The onboarding disclaimer must be understandable Hebrew, shown before the first
lesson, and remain available in Settings. Acceptance, if recorded, stores only the
disclaimer version and local timestamp. A disclaimer does not replace safe product
behavior and must not be used to justify misleading claims.

### Motivation without gambling patterns

XP and streaks reflect learning activity, not capital returns. Use restrained motion
and neutral/positive educational language. Do not use cash imagery, jackpot effects,
slot-machine timing, near-win manipulation, loss-chasing prompts, urgent market
countdowns, or red/green-only success states. A missed day should offer a calm return
path rather than shame or financial fear.

Daily goals and reminders, if reminders are introduced later, must be optional and
easy to disable. The beta does not require push notifications.

## Accessibility is a safety control

**Beta requirement.** Hebrew is the primary UI direction, while English terms,
tickers, formulas, chart axes, and numeric inputs use explicit LTR isolation. Important
status is conveyed by label/icon/shape in addition to color. Interactive chart
elements have meaningful Hebrew screen-reader names, values, and instructions; touch
targets are large enough; focus order follows the task; and chart tasks provide a
non-gesture accessible alternative where necessary.

WCAG AA contrast is required for important text and controls in light and dark themes.
Large text must not clip safety disclosures, formulas, feedback, or action labels.
Reduced-motion mode removes nonessential animation and never hides information.
Response speed cannot materially penalize learners with motor, visual, cognitive, or
language-access needs.

## AI tutor boundary

**Beta requirement.** The core product uses a `DisabledTutorProvider`. It makes no
request, exposes no API-key setting, and always uses curated local explanations. An
AI model never authors the official answer, grades an attempt, adjusts mastery,
unlocks a lesson, or selects a real-world trade.

**Future design.** Before a remote tutor can be enabled, it requires explicit product
and privacy review. Its input is minimized to an approved source context, rubric,
deterministic result, and misconception IDs—never full attempt history, real finances,
or device identifiers. User text is treated as untrusted and cannot override system
safety constraints or request hidden answer keys.

Remote output must be schema-validated and checked for personalized advice,
guarantees, unsupported price claims, trade imperatives, fabricated source claims,
and failure to admit ambiguity. Rejection, timeout, offline use, or vendor failure
falls back to the authored explanation. The output cannot override the deterministic
grader under any circumstance. Enabling the feature also requires clear vendor/data
disclosure, transport security, retention terms, age considerations, and a user
control where legally or ethically appropriate.

## Future Supabase synchronization

**Future design; not a beta dependency and not currently provisioned.** Cloud sync
would be opt-in after an account and privacy flow. Offline guest use remains fully
functional. Upload begins only after explicit confirmation and uses immutable local
attempt IDs for safe deduplication.

Every learner-owned row contains `user_id`; Supabase/PostgreSQL row-level security is
enabled and forced. Authenticated select/insert policies require
`auth.uid() = user_id` in both `USING` and `WITH CHECK`. Attempts have no ordinary
update/delete grant; corrections append events. Cross-table relationships include
the owner in their key so a user cannot attach data to another user's attempt.
Mastery and review projections are derived and updated only by narrowly scoped,
validated server operations.

The service-role key is server-only. Security-definer functions pin a safe
`search_path`, re-check ownership, and do not expose generic SQL. RLS tests use at
least two users and verify positive access, cross-user denial, forged-owner insert
denial, correction ownership, and account deletion. Server constraints, request
validation, rate limits, token verification, least-privilege grants, backups,
retention, deletion propagation, incident response, and privileged audit logging are
required in addition to RLS.

Sync conflicts merge immutable events; they do not replace one device's history with
last-write-wins. Client occurrence time is retained for the learning timeline while
server receipt time supports integrity. Guest data is not uploaded automatically
when an account is created.

## Safety review and incident handling

**Beta requirement.** Every published exercise has an editorial status, source page
reference, authored explanation, misconception feedback, and named rubric. Financial
language review checks the rules above. Synthetic tickers and values should avoid
creating an accidental current-market recommendation; real assets are unnecessary
for beta exercises.

If incorrect grading, future-data leakage, misleading financial wording, corrupted
attempts, cross-user exposure, or unexpected outbound data is discovered:

1. stop distributing the affected build/content version when practical;
2. preserve minimal local diagnostic evidence without copying learner data into an
   issue by default;
3. identify affected versions and whether the issue is reproducible;
4. correct content with a new version or code with a tested migration/fix;
5. never silently rewrite historical attempts;
6. communicate impact and remediation plainly; and
7. complete any applicable legal/vendor incident process before resuming release.

## Pre-release privacy and safety gate

No beta-readiness claim is valid until the release record contains evidence for:

- offline guest onboarding, disclaimer access, and the core lesson journey;
- zero unexpected network calls and zero analytics/crash/advertising SDK traffic;
- app manifests with no unexplained sensitive permissions;
- no bundled secrets, service-role keys, AI keys, or production credentials;
- parameterized grader tests, future-candle isolation, and uncertainty answers;
- position-size validation including costs and invalid/zero-distance cases;
- append-only attempt integrity, restart persistence, safe migrations, and deletion;
- production exclusion/gating of answer-reveal and debug functionality;
- for historical replay, exact dataset/checksum resume failures, cutoff-only scale/accessibility
  output, practice finalization with no attempt/projection mutation, and a human-approved rights and
  editorial publication record;
- for paper execution, exact identity recovery; future isolation; next-open/gap/cost/rounding and
  ambiguity tests; active-state reload without duplicate events; explicit fictional-data copy; zero
  attempt/projection mutation; and non-color visual plus accessible event-state evidence;
- for curated scenarios, private-grading/learner-projection separation, deterministic snapshot and
  source pins, empty ordinary selection while unpublished, explicit internal QA gating, seven-scope
  externally authenticated human approval, stale-review invalidation and correct no-trade with no
  order or hindsight grading;
- Hebrew RTL plus LTR numbers/formulas, screen reader, large text, contrast, and
  reduced-motion manual journeys;
- content review for advice, guarantees, profit-based rewards, and unsafe leverage;
- dependency/license/vulnerability review; and
- an accurate disclosure of OS backup behavior and every external data recipient
  (expected: none for the initial offline beta).

Any item without evidence remains **unverified**, not implicitly complete.
