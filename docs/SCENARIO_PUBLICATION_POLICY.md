# Scenario publication policy

**Status:** fail-closed Milestone 5 policy; internal enforcement is implemented, while human review
and release remain incomplete

**Applies to:** `ScenarioAuthoringManifestV1`, its compiled dataset, virtual exercise, historical
replay, process rubric and optional paper-execution expectation

Automated validity, deterministic output and a passing test suite are necessary publication
evidence. They are not human approval, licensing permission or a release decision. At the current
implementation stage every scenario-authoring candidate remains internal, no-credit and unavailable
through the ordinary learner catalog.

## 1. Lifecycle

The authoring ledger recognizes these states:

| State                   | Meaning                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `draft`                 | Material is being authored and may be incomplete. It is not learner content.                                                                                             |
| `auto-validated`        | Deterministic structural checks passed. Human and legal gates remain open.                                                                                               |
| `human-review-required` | The artifact is ready for named human review but has no current complete approval. This is the state of the in-progress candidates.                                      |
| `approved`              | A responsible human has recorded an approval against the exact material checksum and every required area is approved. This state alone does not distribute the scenario. |
| `published`             | The exact immutable artifact has passed all content, data, execution, accessibility, safety and release gates and may enter an explicitly published registry.            |
| `retired`               | No new learner assignment is allowed. Old pinned attempts and immutable identity are preserved.                                                                          |

The compiler reports structural issues separately from publication blockers. A candidate can be
structurally valid and useful in internal QA while remaining deliberately non-publishable.

The current `ScenarioLibraryReport.publishable` value is always `false` by contract. No implemented
command changes lifecycle state, writes a reviewer record, or publishes a candidate.

Current enforcement is intentionally incomplete beyond the internal candidate boundary. In
particular, nested runtime-schema validation is not exhaustive, and there is no published-registry
promotion command, signed append-only ledger or retirement archive. Authentication is an explicit
trust boundary: `compileScenario` accepts a set of reviewer-record IDs asserted by an external
authenticated human-review authority. The compiler verifies membership in that asserted set; it does
not authenticate a reviewer, contact an identity provider or prove that the external assertion is
truthful. These are open implementation/release gates, not responsibilities that an author may
satisfy by editing a literal.

## 2. Publication identities and fingerprints

The material-artifact checksum covers learner-facing and outcome-bearing material, including:

- scenario and dataset identity/version;
- Hebrew title, prompt, hints and workflow prompts;
- prerequisites and difficulty support;
- exact educational provenance and rationale;
- chart generator specification and pinned generated dataset checksum;
- decision, visible-range, replay and knowledge cutoffs;
- expected application decision;
- process rubric, rationale requirements and scoring policy;
- trade constraints, plan and expected execution evidence when present; and
- synthetic-data licensing fields.

The `reviewFingerprint` must equal the canonical material-artifact checksum. Each review record must
pin that same checksum and contain a non-empty reviewer, parseable time, decision, scope and note.
A checksum mismatch makes the review stale. A malformed record is a blocker.

Publication bookkeeping, per-area review-state projections and retirement metadata are excluded
from the material checksum so that recording a review or retirement does not recursively change the
artifact under review. They still have independent lifecycle validation.

## 3. Material changes and immutable versions

Changing learner text, hints, candles/generator inputs, generated checksum, decision or replay
cutoffs, source provenance, expected decision, rubric, licensing, plan constraints or expected
execution is a material change. The author must:

1. Return the candidate to an unpublished review state.
2. Recompute the material checksum and review fingerprint.
3. Treat every approval pinned to the old checksum as stale.
4. If the prior artifact was published, create a new semantic `scenarioVersion` and, when its candle
   artifact changed, a new `datasetVersion`.
5. Keep the old version available for exact historical resolution while any saved session or attempt
   references it.

`validateScenarioVersionHistory` rejects two different material artifacts that reuse one scenario
ID/version and detects duplicate immutable versions. This protection works over the versions present
in the supplied registry. The repository does not yet have an external append-only publication
ledger, signature service or remote retention authority; deleting the old version from all inputs
would evade that local comparison. Human release procedure and repository review must therefore
enforce retention until a durable ledger exists.

## 4. Retirement and replacement

A retired record may optionally pin both `replacementScenarioId` and
`replacementScenarioVersion`. Supplying only one is invalid; a replacement must exist in the
validated registry and cannot be the retired scenario itself.

Retirement means:

- remove the version from new learner selection;
- retain its immutable scenario/dataset/rubric/execution identity for existing attempts;
- never silently repin or regrade an old attempt against the replacement; and
- preserve the reason and responsible human decision in release records outside the learner bundle.

Current candidates are active and unpublished. Native/session persistence already pins scenario and
dataset identities, but a complete retired-artifact archival and distribution-removal workflow has
not yet been implemented or exercised.

## 5. Human-review boundary

The manifest retains source, Hebrew, accessibility and financial-safety review-state projections.
For an `approved` or `published` lifecycle, the publication ledger separately requires a current
authenticated approval for all seven scopes: source, rubric, execution, accessibility, Hebrew,
financial safety and publication. Every scope is required even when a no-trade scenario has no paper
order, because the reviewer must explicitly approve that absence and the decision/execution
boundary.

The coding agent and automated commands must never invent a reviewer identity, approval timestamp,
approval note or legal decision. They may create schemas, pending states, validation evidence and
blocker reports only. Automated future-leak validation is also not editorial approval.

The schema can detect an empty reviewer-record ID, invalid time, empty note, stale checksum or record
ID absent from the caller-supplied authenticated set. It cannot authenticate that ID itself or prove
that a review was actually performed. Approval therefore requires an independent human authority and
release evidence; source code containing a syntactically valid record or caller assertion is not
sufficient by itself.

For each scope, current records are ordered by the instant returned from `Date.parse(reviewedAt)`, so
equivalent offsets compare as the same moment. When an approval and `changes-requested` record share
the exact instant, `changes-requested` wins deterministically. A later changes-requested decision
supersedes an earlier approval; the newest current authenticated record for every scope must be
`approved`.

## 6. Fail-closed gates

A scenario remains non-publishable when any applicable gate is missing, contradictory, malformed or
stale. The current validators cover:

- supported top-level manifest/schema shapes and stable semantic identities;
- exact chart, generated dataset, rubric, material and review fingerprints;
- exact source-reference match against reviewed repository records;
- complete Hebrew prompts and one process criterion per canonical workflow step;
- dataset/scenario/checksum binding and deterministic historical-data validation;
- cutoff consistency, blind mode and reveal-after-finalization;
- aligned application decision, trade direction and supported entry order type;
- deterministic execution status/evidence for trade candidates;
- a current, externally asserted authenticated approval for all seven ledger scopes, with
  changes-requested precedence, plus per-area review states;
- dataset/scenario/editorial/paper-execution publication status;
- verified redistribution/market-data provenance when real data is ever proposed;
- retirement/replacement consistency; and
- duplicate or materially mutated immutable versions in the supplied registry.

Course credit is derived only when the closed historical publication gate has no blockers. Authors
cannot set a credit flag. Published scenario status alone is insufficient.

## 7. Known blockers for the in-progress candidates

Every current candidate deliberately carries these unresolved conditions:

- the scenario-authoring lifecycle is `human-review-required`, with no approval records;
- source, accessibility, Hebrew and financial-safety review states are pending;
- generated datasets and replay scenarios are internal rather than published;
- the fixed synthetic license records publication permission as blocked and redistribution as
  prohibited;
- independent educational/editorial review has not been recorded; and
- candidate material is internal QA and cannot grant course credit.

Trade candidates additionally compile paper execution with internal—not published—execution status.
That is a separate publication blocker even when their simulated outcomes reproduce exactly.

The third literal no-trade candidate has an additional precise source blocker: the reviewed catalog
supports waiting or insufficient evidence for the cited gap uncertainty, but does not yet contain a
third independently reviewed full eleven-step literal no-trade rubric. It must remain unpublished
unless a responsible source reviewer closes that gap; the balanced candidate count is not permission
to lower the standard.

These blockers are expected policy evidence, not validator defects. The current report contains nine
candidates, zero structural issues and 97 explicit publication blockers. Dataset, material and
snapshot checksums belong in the machine-readable report and final handoff rather than this policy.

## 8. Internal QA versus the ordinary catalog

The fixed reviewed course catalog remains unchanged. Scenario candidates compile into a separate
scenario registry and are combined with the legacy development fixture only through the explicit
internal historical-content registry.

Internal QA surfaces must:

- identify themselves as internal, synthetic and no-credit;
- resolve an exact scenario ID/version and dataset checksum;
- expose provenance, rubric identity, blockers and expected outcomes only in reviewer context;
- keep learner-safe previews neutral and cutoff-bound;
- avoid writing ordinary attempts, mastery, review scheduling, lesson completion, XP or streak
  activity; and
- keep the legacy no-trade fixture's contradictory hypothetical short mechanics isolated from the
  normal learner decision.

Draft/internal candidates must not enter the general learner catalog, search, progression or
recommendation surfaces. A future ordinary scenario library must query an explicitly published,
credit-derived projection rather than merely importing the internal registry.

## 9. No-trade and process-first publication rule

No trade is a first-class authored application decision. It requires an evidence-based learner
rationale, creates no order or position, and produces a deterministic process debrief. A later
profitable move cannot make it incorrect, and trading cannot receive preferential credit merely for
participation.

For all scenarios, educational scoring is independent of execution status and profit/loss. The
publication reviewer must evaluate context, structure, levels, setup versus confirmation, entry or
non-entry logic, invalidation, target, risk, consistency and uncertainty at the decision cutoff.
Execution evidence may test the simulator and enrich a debrief; it is not the rubric answer.

## 10. Publication procedure

For a future release candidate, a responsible human must:

1. Review the exact machine-readable scenario report and material checksum.
2. Verify educational references, original Hebrew wording, generated-chart independence and the
   decision-time rubric.
3. Verify dataset provenance/licensing and any distribution obligations.
4. Review paper-execution assumptions separately from educational doctrine.
5. Exercise blind-state accessibility and confirm that assistive text leaks no identity, answer or
   outcome.
6. Record current scoped approvals against the exact checksum without altering material afterward.
7. Confirm all per-area review states and release-readiness evidence.
8. Create a new immutable version if any material correction follows review.
9. Move only the exact approved artifact into an explicitly published registry.
10. Re-run repository, scenario, native, accessibility and release checks before distribution.

See [SCENARIO_AUTHORING.md](./SCENARIO_AUTHORING.md) for the authoring contract,
[HISTORICAL_DATA_POLICY.md](./HISTORICAL_DATA_POLICY.md) for market-data rights, and
[PAPER_EXECUTION_POLICY.md](./PAPER_EXECUTION_POLICY.md) for simulator assumptions.
