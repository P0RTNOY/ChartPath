# External reviewer onboarding and key-handling guide

**Status:** proposal and verification tooling only. The production trusted-reviewer registry remains
empty. No proposal, proof-of-possession signature, command output or coding-agent action grants
trust, records a review approval or authorizes publication.

This guide describes how a legitimate external human can prepare public-key material for an
independently reviewed repository change. It does not establish identity, professional
qualification, independence, authority, licensing permission or suitability for any review scope.
Those decisions belong to responsible humans outside the application and must be supported by
separately controlled evidence.

## 1. Authority boundary

There are three deliberately separate facts:

1. **Possession:** a valid Ed25519 proof shows that the proposer controlled the private key when the
   proposal was signed.
2. **Proposal readiness:** complete checksum-pinned evidence references make a proposal ready for
   human review.
3. **Production trust:** only an independently reviewed change to the repository-owned production
   trusted-reviewer registry can authorize a reviewer and exact scopes.

Possession does not prove identity or competence. A proposal whose status is
`proof-verified-human-review-required` still has `trustGranted:false`. A revocation proposal whose
status is `human-review-required` still has `trustChanged:false`.

The production verification commands never accept a caller-supplied trusted registry. Test-fixture
keys and test reviewers cannot be promoted into production.

## 2. Private-key generation

Generate the key on reviewer-controlled hardware. The helper requires a new absolute destination
outside the ChartPath repository, refuses to overwrite an existing file, and applies permission
mode `0600`:

```bash
pnpm --filter @chartpath/content exec tsx \
  src/scenarios/publication/reviewer-keygen-cli.ts -- \
  --private-key-out /absolute/reviewer-controlled/location/chartpath-reviewer-ed25519.pem
```

The command prints only public SPKI DER Base64, its SHA-256 fingerprint, the destination path and
the recorded file format/permission mode. It never prints or returns private-key bytes. Do not use a
path inside the repository, a synced project folder, an issue attachment directory or a shared
build workspace.

Private keys must never be committed, pasted into a proposal, copied into `review-packets`, logged,
photographed, uploaded to an issue tracker or provided to the learner application. Hardware-backed
or otherwise reviewer-controlled key storage is preferred. Back up or escrow a key only under an
explicitly authorized organizational policy.

## 3. Proposal material

An onboarding proposal is caller-supplied metadata for one `external-human`. It contains:

- stable proposal, reviewer and key IDs;
- a canonical ordered non-empty subset of the eight publication review scopes;
- the public Ed25519 SPKI DER Base64 and SHA-256 fingerprint;
- an explicit key validity start and optional exclusive validity end;
- checksum-pinned opaque identity and independence evidence record IDs;
- for every requested scope, separate qualification and authorization evidence record IDs;
- a canonical UTC submission time and bounded note; and
- a detached possession proof.

Evidence entries are metadata only: an opaque evidence ID, external record ID, checksum and short
note. Do not commit passports, identity cards, personnel files, contracts, legal advice or other raw
sensitive documents. The responsible repository reviewer must obtain the referenced records through
the authorized external process and independently verify their checksums.

Requested scopes must follow this canonical order when included:

1. `source`
2. `rubric`
3. `execution`
4. `accessibility`
5. `hebrew`
6. `financial-safety`
7. `licensing`
8. `publication`

List the exact requirements without changing state:

```bash
pnpm --filter @chartpath/content exec tsx \
  src/scenarios/publication/reviewer-governance-cli.ts -- \
  --action requirements
```

## 4. Possession proof and deterministic proposal creation

First create canonical proposal **material** without `possessionProof`. Store only the public and
evidence-reference fields in that file. The preparation action validates the strict contract and
prints the exact domain-separated signing bytes as Base64:

```bash
pnpm --filter @chartpath/content exec tsx \
  src/scenarios/publication/reviewer-governance-cli.ts -- \
  --action prepare-onboarding \
  --material reviewer-onboarding-material.canonical.json
```

The signing domain is `ChartPath\0reviewer-onboarding-proof\0v1\0`, followed by the
`canonical-json-v1` proposal material. Decode `signingBytesBase64` and sign those exact bytes with
Ed25519 in reviewer-controlled tooling. Do not sign a hash or text rendering in place of the exact
bytes.

Place only this public detached proof in a canonical JSON file:

```json
{ "algorithm": "Ed25519", "valueBase64": "<canonical 64-byte signature in Base64>" }
```

Assemble and immediately validate the proposal against the checked-in production registry:

```bash
pnpm --filter @chartpath/content exec tsx \
  src/scenarios/publication/reviewer-governance-cli.ts -- \
  --action create-onboarding \
  --material reviewer-onboarding-material.canonical.json \
  --proof reviewer-possession-proof.canonical.json \
  --as-of 2032-01-01T00:00:00.000Z
```

The output is deterministic canonical JSON on stdout. Save it through an appropriate reviewed
workflow if needed; the command itself does not write a proposal or registry. A valid result remains
`proof-verified-human-review-required` and `trustGranted:false`.

An already assembled canonical proposal can be checked with:

```bash
pnpm --filter @chartpath/content exec tsx \
  src/scenarios/publication/reviewer-governance-cli.ts -- \
  --action validate-onboarding \
  --proposal reviewer-onboarding-proposal.canonical.json \
  --as-of 2032-01-01T00:00:00.000Z
```

Validation rejects unknown fields, noncanonical scope order, invalid time bounds, malformed or
noncanonical Ed25519 SPKI, fingerprint mismatch, failed possession proof, and reviewer/key/fingerprint
conflicts. Missing evidence is listed separately and cannot be hidden by a valid signature.

## 5. Independent registration review

Before any registry change, responsible humans must verify at least:

- the person behind the stable reviewer ID;
- control of the public key and out-of-band fingerprint comparison;
- qualification for every requested scope;
- authority to act for those scopes;
- independence and conflicts of interest;
- suitable validity/rotation dates; and
- that no private or test key material is present anywhere in the change.

The registry change must be reviewed independently from the proposer. Scope expansion and key
rotation receive the same review as initial onboarding. Registration does not create an approval:
the reviewer must separately review and sign each exact candidate packet under the review
attestation policy.

## 6. Revocation requests

A revocation proposal targets either a reviewer or one exact key. It records the requester,
canonical proposal/effective times, a bounded reason, incident evidence references and independent
authorization evidence references. Validate it with:

```bash
pnpm --filter @chartpath/content exec tsx \
  src/scenarios/publication/reviewer-governance-cli.ts -- \
  --action validate-revocation \
  --proposal reviewer-revocation-proposal.canonical.json \
  --as-of 2032-01-01T00:00:00.000Z
```

A validated request does not change trust. The repository registry must be changed through the
independently reviewed emergency or ordinary revocation process. Do not require a signature by a
possibly compromised private key as the sole authority to revoke it. Pending credible revocation
requests are shown explicitly in the status matrix and keep affected scope availability fail-closed.

Current registry semantics treat a checked-in `revoked` reviewer or key as invalid, including for
otherwise historical attestations. The timestamp is audit evidence, not a mechanism for resurrecting
trust through an older `--as-of` value.

## 7. Required, missing and status matrices

The status action reads canonical proposal files from repository-relative directories, always uses
the production registry, and requires an explicit evaluation instant:

```bash
pnpm --filter @chartpath/content exec tsx \
  src/scenarios/publication/reviewer-governance-cli.ts -- \
  --action status \
  --as-of 2032-01-01T00:00:00.000Z \
  --onboarding-dir reviewer-onboarding-proposals \
  --revocation-dir reviewer-revocation-proposals
```

Absent directories mean no proposals. Output lists all eight required scopes, currently missing
scopes, reviewer/key validity states, proposal statuses and pending revocations. A proposal-only
scope is reported as `proposal-only-human-review-required`, never as registered authority. A scope
with a pending revocation is `revocation-pending` and remains missing for fail-closed readiness.

All commands require canonical millisecond UTC timestamps. They do not use wall-clock time, contact
identity services, mutate trust, sign review attestations, approve candidates, publish content or
grant learning credit.
