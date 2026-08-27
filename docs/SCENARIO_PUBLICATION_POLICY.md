# Scenario publication policy

**Status:** fail-closed Milestone 7 policy; publication-candidate packets, detached-attestation
verification and dry-run preflight are implemented, while every human, licensing and release gate
remains incomplete

**Applies to:** `ScenarioAuthoringManifestV1`, position-management variants, publication-candidate
records, generated review packets, detached review attestations and dry-run release preflight

Automated validity, deterministic output and a passing test suite are necessary publication
evidence. They are not human approval, licensing permission or a release decision. Three exact
scenario versions are now publication candidates, but they remain no-credit and unavailable through
the ordinary learner catalog.

## 1. Lifecycle

The publication-candidate contract recognizes these release states:

| State                   | Meaning                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `internal-qa`           | Internal engineering material. It is not learner content and may remain incomplete.                                                           |
| `publication-candidate` | Exact immutable scenario/dataset/review material selected for external review. It is still unpublished and no-credit.                         |
| `approved`              | All eight authenticated review scopes and every independent evidence gate passed for the exact packet. Approval alone does not distribute it. |
| `published`             | The exact approved artifact was deliberately entered into a published registry by an authorized release action.                               |
| `retired`               | No new learner assignment is allowed. Old pinned attempts and immutable identity are preserved subject to the governing rights decision.      |

The older authoring ledger may still use `draft`, `auto-validated` and `human-review-required` while
material is prepared. `publication-candidate` is a separate composite state over exact base and,
where applicable, management material; it is not a synonym for `human-review-required`, `approved`
or `published`.

The compiler reports structural issues separately from publication blockers. A candidate can be
structurally valid and useful in internal QA while remaining deliberately non-publishable.

The current `ScenarioLibraryReport.publishable` value remains `false`. Milestone 7 adds an empty
production reviewer-key registry, offline detached-Ed25519 verification and dry-run-only preflight.
It does not add a promotion mutation, published-registry writer or release command. The verifier can
authenticate a signature against configured public keys; it cannot establish a reviewer's identity,
qualifications, independence or legal authority. Those remain external trust and release gates.

See [PUBLICATION_CANDIDATE_POLICY.md](./PUBLICATION_CANDIDATE_POLICY.md) for the selected versions
and packet contract, and [REVIEW_ATTESTATION_POLICY.md](./REVIEW_ATTESTATION_POLICY.md) for the root
of trust and signature rules.

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

The legacy `reviewFingerprint` must equal the authoring material-artifact checksum. A publication
candidate additionally pins a composite `materialSetChecksum` and a deterministic
`reviewPacketChecksum`. A detached attestation pins both values plus the exact candidate, scenario
and dataset identity. Any mismatch makes that attestation stale; malformed or unauthenticated
records are invalid.

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
enforce retention. Detached attestation files provide portable signed decisions, but the repository
still has no external append-only retention authority or published-artifact archive.

## 4. Retirement and replacement

A retired record may optionally pin both `replacementScenarioId` and
`replacementScenarioVersion`. Supplying only one is invalid; a replacement must exist in the
validated registry and cannot be the retired scenario itself.

Retirement means:

- remove the version from new learner selection;
- retain its immutable scenario/dataset/rubric/execution identity for existing attempts;
- never silently repin or regrade an old attempt against the replacement; and
- preserve the reason and responsible human decision in release records outside the learner bundle.

The three selected records are in `publication-candidate`, not `approved` or `published`, and remain
unpublished. Native/session persistence already pins scenario and dataset identities, but a complete
retired-artifact archival and distribution-removal workflow has not yet been implemented or
exercised.

## 5. Human-review boundary

The manifest retains source, Hebrew, accessibility and financial-safety review-state projections.
The publication-candidate policy requires a current authenticated approval for all eight scopes:
source, rubric, deterministic execution, accessibility, Hebrew, financial safety,
licensing/redistribution and publication. Every scope is required even when a no-trade scenario has
no paper order, because the execution reviewer must explicitly approve that absence and the
decision/execution boundary. Licensing is not implied by source or publication approval.

The coding agent and automated commands must never invent a reviewer identity, approval timestamp,
approval note or legal decision. They may create schemas, pending states, validation evidence and
blocker reports only. Automated future-leak validation is also not editorial approval.

Production verification uses the exact `review-attestation-v1` payload, canonical UTC timestamps,
canonical JSON and a detached Ed25519 signature under `review-attestation-policy-v1`. It rejects
unknown or revoked reviewers/keys, test registries, wrong scopes, stale identities/material,
expired decisions and signature failure. The production registry is intentionally empty; no real
approval currently exists.

For each scope, valid decisions are ordered by canonical `reviewedAt`, then decision and finally
attestation ID. `changes-requested` wins an equal-time tie and a later valid changes request becomes
the current decision. An explicit supersession reference must identify an earlier valid decision
for the same candidate and scope. Exact replay is a duplicate and grants no additional state.

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
- current detached approvals for all eight scopes, with key/scope validation, staleness,
  supersession and changes-requested precedence;
- dataset/scenario/editorial/paper-execution publication status;
- verified redistribution/market-data provenance when real data is ever proposed;
- retirement/replacement consistency; and
- duplicate or materially mutated immutable versions in the supplied registry.

Course credit is derived only when the closed historical publication gate has no blockers. Authors
cannot set a credit flag. Published scenario status alone is insufficient.

## 7. Known blockers for the publication candidates

The exact long, short and no-trade candidates are listed in
[PUBLICATION_CANDIDATE_POLICY.md](./PUBLICATION_CANDIDATE_POLICY.md). Every one deliberately carries
these unresolved conditions:

- all eight externally authenticated review decisions are missing;
- generated datasets and replay scenarios are internal rather than published;
- the fixed synthetic license records publication internal and redistribution prohibited;
- source-adaptation and generated-data redistribution questions have no human/legal decision;
- exact candidate native lifecycle and actual screen-reader/OS-accessibility evidence remain open;
- browser screenshots are supporting evidence rather than native or accessibility approval; and
- candidate material remains no-credit and absent from the ordinary learner catalog.

Trade candidates additionally compile paper execution with internal—not published—execution status.
That is a separate publication blocker even when their simulated outcomes reproduce exactly.

The third literal no-trade candidate has an additional precise source blocker: the reviewed catalog
supports waiting or insufficient evidence for the cited gap uncertainty, but does not yet contain a
third independently reviewed full eleven-step literal no-trade rubric. It must remain unpublished
unless a responsible source reviewer closes that gap; the balanced candidate count is not permission
to lower the standard.

These blockers are expected policy evidence, not validator defects. The nine-source-candidate and
three-management-variant reports remain the complete QA inventory; the publication registry is a
separate exact three-record projection. Candidate ancestry and checksums are recorded in the
candidate policy and generated packets.

## 8. Internal QA versus the ordinary catalog

The fixed reviewed course catalog remains unchanged. Scenario candidates compile into a separate
scenario registry and are combined with the legacy development fixture only through the explicit
internal historical-content registry.

Internal QA and publication-candidate reviewer surfaces must:

- identify themselves as internal, synthetic and no-credit;
- resolve an exact scenario ID/version and dataset checksum;
- expose provenance, rubric identity, blockers and expected outcomes only in reviewer context;
- keep learner-safe previews neutral and cutoff-bound;
- avoid writing ordinary attempts, mastery, review scheduling, lesson completion, XP or streak
  activity; and
- keep the legacy no-trade fixture's contradictory hypothetical short mechanics isolated from the
  normal learner decision.

Draft, internal and publication-candidate records must not enter the general learner catalog,
search, progression or recommendation surfaces. The ordinary scenario library must continue to
query an explicitly published, credit-derived projection rather than importing either candidate
registry.

## 9. No-trade and process-first publication rule

No trade is a first-class authored application decision. It requires an evidence-based learner
rationale, creates no order or position, and produces a deterministic process debrief. A later
profitable move cannot make it incorrect, and trading cannot receive preferential credit merely for
participation.

For all scenarios, educational scoring is independent of execution status and profit/loss. The
publication reviewer must evaluate context, structure, levels, setup versus confirmation, entry or
non-entry logic, invalidation, target, risk, consistency and uncertainty at the decision cutoff.
Execution evidence may test the simulator and enrich a debrief; it is not the rubric answer.

## 10. Review and future publication procedure

The implemented workflow stops at deterministic review and dry-run preflight:

1. Run `pnpm scenarios:candidates` to inspect the exact three-record no-credit registry.
2. Run `pnpm reviews:pack` to verify evidence bytes and regenerate canonical JSON/Markdown packets.
3. Have responsible external humans review the exact packet and sign only their authorized scopes
   with private keys kept outside the repository and application.
4. Add only independently reviewed public keys to the production trust registry; never add private
   or test-fixture keys.
5. Run `pnpm reviews:verify -- --candidate <id> --as-of <canonical-UTC-time>` against canonical
   detached attestations.
6. Run `pnpm release:preflight -- --dry-run` with the exact candidate/scenario/dataset identity.
7. Preserve every missing, changes-requested, stale, native/accessibility and licensing blocker.
8. If review changes material, create the required immutable version, regenerate packets and treat
   prior attestations as stale.

No current command performs steps beyond dry-run. A future real publication would additionally need
separate user authorization, complete rights evidence, all native/accessibility evidence, a clean
release verification, and an explicitly implemented published-registry mutation. It must move only
the exact approved material and must not silently convert candidate state into learning credit.

See [SCENARIO_AUTHORING.md](./SCENARIO_AUTHORING.md) for the authoring contract,
[PUBLICATION_CANDIDATE_POLICY.md](./PUBLICATION_CANDIDATE_POLICY.md) for the three selected versions,
[REVIEW_ATTESTATION_POLICY.md](./REVIEW_ATTESTATION_POLICY.md) for authenticated review decisions,
[HISTORICAL_DATA_POLICY.md](./HISTORICAL_DATA_POLICY.md) for market-data rights, and
[PAPER_EXECUTION_POLICY.md](./PAPER_EXECUTION_POLICY.md) for simulator assumptions.

## 11. Milestone 8 reviewer and preflight closure

Reviewer onboarding is now an auditable proposal workflow. Public-key material, exact Ed25519
fingerprints, opaque checksum-pinned identity/independence/qualification/authorization evidence,
scope requests and possession proofs can be validated without mutating trust. Private keys must be
created and retained outside the repository. A valid proposal remains
`proof-verified-human-review-required` with `trustGranted:false`; a valid revocation proposal
remains `trustChanged:false` until an independently reviewed production-registry change occurs.

The internal reviewer build is not publication. It requires an explicit development configuration,
keeps candidate identity and answer material behind acknowledgement/reveal actions, uses only
`qa-internal` no-credit access, and never exposes candidates through ordinary learner selection.

Preflight policy v2 classifies machine, native-runtime, accessibility, physical-device,
human-review, licensing and distribution gates. Passing machine gates can produce
`MACHINE_GATES_CLOSED` and `INTERNAL_REVIEW_BUILD_READY`; it cannot remove missing human, rights,
device or distribution gates. While those remain open the only valid aggregate includes
`EXTERNAL_REVIEW_PENDING` and `PUBLICATION_NO_GO`.
