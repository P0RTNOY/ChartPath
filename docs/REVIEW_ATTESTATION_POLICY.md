# Review attestation policy

**Status:** Milestone 7 verification infrastructure is implemented; the production trust registry
is intentionally empty and no real approval has been recorded

**Contract:** `review-attestation-v1`

**Policy:** `review-attestation-policy-v1`

This policy defines portable detached review decisions for exact publication-candidate packets. It
uses Node's built-in Ed25519 implementation. It does not create reviewer identities, issue private
keys, decide qualifications, perform a review or authorize publication.

## 1. Signed payload and domain separation

An attestation signs the canonical JSON serialization of `ReviewAttestationPayloadV1`, prefixed by
these exact UTF-8 domain-separation bytes:

```text
ChartPath\0review-attestation\0v1\0
```

The prefix prevents a valid signature over another ChartPath or third-party message from being
reinterpreted as a review approval. Signing and verification use Ed25519 with no additional digest
argument. The detached signature is a canonical Base64 encoding of exactly 64 bytes.

The signed payload pins:

- schema and contract versions;
- unique attestation, reviewer and key IDs;
- one of the eight allowed review scopes;
- candidate ID and exact scenario ID/version;
- exact dataset ID/version/checksum;
- candidate material-set checksum and review-packet checksum;
- `approved` or `changes-requested`;
- canonical millisecond UTC review time;
- optional canonical expiration and superseded-attestation ID;
- exact attestation-policy version; and
- a non-empty NFC-normalized signed note.

Unknown fields, noncanonical timestamps, malformed identifiers/checksums, noncanonical Base64,
unsupported algorithms and invalid Unicode/control content fail closed.

## 2. Eight required scopes

An attestation applies to exactly one scope:

1. `source` — exact references, faithful original summary and doctrine boundary;
2. `rubric` — deterministic eleven-step assessment and no hindsight scoring;
3. `execution` — paper/management policy, snapshots and ambiguity behavior;
4. `accessibility` — blind-safe alternatives, reading order and actual accessibility evidence;
5. `hebrew` — learner copy, terminology, RTL flow and LTR numeric isolation;
6. `financial-safety` — educational, probabilistic and non-personalized framing;
7. `licensing` — source adaptation, generated-data rights, redistribution and attribution; and
8. `publication` — final release decision for the exact material after the other evidence is
   considered.

Every scope needs a current `approved` decision. A no-trade candidate still requires explicit
execution approval of the absence of an order/position. Licensing is not implied by source,
publication or synthetic-data origin.

## 3. Root of trust

`packages/content/src/scenarios/publication/trusted-reviewers.ts` is the repository root of trust for
production review. It is deliberately empty until a separately reviewed change registers legitimate
external humans and public keys.

A production reviewer record contains:

- a stable reviewer ID;
- kind `external-human`;
- active/revoked status;
- an explicit allowed-scope set; and
- one or more Ed25519 public keys in SPKI DER Base64, each with its SHA-256 fingerprint, validity
  interval and active/revoked state.

Production verification rejects a test registry, a `test-fixture` reviewer, unknown reviewer/key,
wrong scope, revoked reviewer/key, duplicate reviewer/key/fingerprint, invalid SPKI, fingerprint
mismatch, non-Ed25519 key or review time outside key validity. A public-key registry entry is a trust
configuration change and requires human repository review; adding a syntactically valid key is not
proof that its owner is qualified.

The verifier is offline and deterministic. It does not contact an identity provider, certificate
authority or timestamping service. Repository procedures must establish reviewer identity, scope
competence and key possession outside this code.

## 4. Private-key safety

Private reviewer keys must never be committed, placed in `review-packets`, stored in the trusted
reviewer registry, logged, photographed, copied into issue trackers or sent to the application.
Signing should occur in reviewer-controlled tooling or hardware outside the learner build. Only the
public SPKI bytes, fingerprint and signed detached envelope may enter review evidence.

Tests generate ephemeral Ed25519 key pairs in memory and label reviewers `test-fixture`. The
test-only verifier accepts only a `test` registry; the production verifier accepts only a
`production` registry and only `external-human` reviewers. Test keys and signatures can prove parser
and cryptographic behavior, never a real review.

Key rotation adds a new public key with a new `keyId` and validity start. Revocation changes the
reviewer or key status and records `revokedAt` for a key. An attestation is invalid when its reviewer
or key is revoked under the evaluated registry. A validity interval limits which signed review
times the key can authenticate; it does not by itself close product or licensing gates.

## 5. Verification, replay and staleness

`pnpm reviews:verify` requires a candidate ID and an explicit canonical UTC `--as-of` value. It
reads canonical `.json` envelopes from `review-attestations` by default, sorted by filename, and
always resolves the checked-in production trusted-reviewer registry. The production CLI cannot
replace that root with a caller-supplied registry. Arbitrary registries are accepted only by the
explicit test verifier. Canonical files must be regular, non-symlink files containing exactly
`canonical-json-v1` plus one trailing newline.

Example shape:

```bash
pnpm reviews:verify -- \
  --candidate publication-candidate-long-v1 \
  --as-of 2032-01-01T00:00:00.000Z
```

The verifier classifies each record as `valid`, `stale`, `invalid` or `duplicate`:

- malformed, unauthenticated, wrong-key, wrong-scope and revoked records are invalid;
- exact replay of identical canonical signed bytes is a duplicate and creates no additional
  approval state;
- reuse of one attestation ID for different signed material invalidates the conflict;
- candidate, scenario, dataset, material-set or packet mismatch makes a signature stale;
- expiration at or before `asOf` makes a signature stale; and
- a review time after the explicit `asOf` instant makes a signature stale; and
- an absent scope remains missing.

Any material packet change, including learner wording, source, rubric, dataset, accessibility copy,
licensing state or selection rationale, changes a pinned checksum and makes old attestations stale.

## 6. Supersession and decision ordering

`supersedesAttestationId`, when present, must identify a different, strictly earlier valid
attestation for the same candidate and same scope. Self-reference, equal-time reference,
cross-candidate, cross-scope, missing, later, cyclic, or otherwise invalid chains fail regardless of
input order. Supersession does not delete the older signed record; it establishes an auditable
decision chain.

For each scope, valid records are ordered by:

1. canonical `reviewedAt` instant;
2. decision, with `changes-requested` taking precedence over `approved` at an equal instant; and
3. attestation ID as a stable final tie-break.

The current record determines the scope projection. Therefore a later valid
`changes-requested` decision supersedes an earlier approval and makes the aggregate incomplete. A
later approval can become current only as another independently valid signed decision over the same
exact, still-current packet. Review changes should normally produce corrected immutable material
and a new packet rather than approving stale content.

## 7. Completion and publication boundary

Attestation verification reports `complete: true` only when every one of the eight scope projections
is `approved` and there are no invalid or stale record issues. That result authenticates the
recorded review decisions; it does not by itself:

- prove that the source or generated material may legally be redistributed;
- establish native lifecycle, VoiceOver, TalkBack or OS-accessibility evidence;
- change internal licensing fields;
- add a scenario to the ordinary learner catalog;
- grant learning credit; or
- authorize release or deployment.

`pnpm release:preflight -- --dry-run ...` separately regenerates the packet, verifies exact
scenario/dataset identity, consumes the attestation report, checks external evidence gates and
enforces the ordinary-catalog boundary. The current immutable candidates remain
redistribution-prohibited and internal, so preflight stays `NO-GO` even if a test constructs a
synthetically complete review projection.

No production attestation currently exists. The empty production registry and eight missing scope
decisions are intentional, honest blockers.
