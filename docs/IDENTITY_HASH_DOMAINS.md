# Identity and hash domains

ChartPath treats an identity as the tuple **domain, logical ID, version, checksum**. A SHA-256
string by itself is not an identity and is never authority to substitute one kind of material for
another.

The machine-readable report is built by
`packages/content/src/scenarios/identity.ts`. The CLI at
`packages/content/src/scenarios/identity-cli.ts` writes one canonical JSON object followed by a
newline and exits non-zero when the report contains an integrity issue. The report has no clock,
network, filesystem, randomness, or environment input; identical registries produce identical
bytes.

## Domain contract

Every domain has `interchangeableWith: []`. Even when two records happen to contain the same SHA-256
string, a consumer must compare all four identity fields.

| Domain label                                | Canonical payload                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `historical-dataset-canonical-payload-v1`   | Dataset manifest excluding `canonicalChecksum`, then candles, corporate actions, and recorded gaps |
| `scenario-learner-exercise-v1`              | Exact learner-safe `ScenarioLearnerExerciseProjection`                                             |
| `scenario-private-grader-exercise-v1`       | Exact private deterministic `ContentExercise`; this must never be rendered to a learner            |
| `scenario-authoring-material-v1`            | Authored scenario material excluding lifecycle and review bookkeeping                              |
| `position-management-material-v1`           | Exact scenario, dataset, and position-management configuration material                            |
| `position-management-domain-rubric-v1`      | Embedded deterministic management domain rubric                                                    |
| `publication-candidate-material-set-v1`     | Candidate ancestry, provenance, and future-patch recipe, when applicable                           |
| `publication-review-packet-material-v1`     | Complete review packet excluding its self-checksum                                                 |
| `publication-future-candle-patch-recipe-v1` | OHLC replacement recipe excluding its self-checksum                                                |
| `publication-review-artifact-bytes-v1`      | Exact UTF-8 bytes of generated JSONL, Markdown, or artifact-index output                           |
| `identity-hash-domain-report-material-v1`   | Complete identity report excluding its self-checksum                                               |

Canonical JSON domains use ChartPath's sorted-key `canonicalSerialize` contract. Artifact records
hash file bytes, including their terminal newline; they must not be recomputed as canonical JSON.
Each record states its serialization so consumers cannot silently cross these boundaries.

## Version and mutation rule

Once a tuple of domain, ID, and version has been observed, its canonical bytes and checksum are
immutable. `validateIdentityVersionTransition(previous, current)` reports a same-version checksum
change. A material change must receive a new domain-specific version; changing a checksum in place
is not a versioning mechanism.

Dataset identities are deduplicated across scenario and management references. If the same dataset
ID and version resolve to different canonical bytes, report generation fails closed. Declared
scenario, dataset, management, rubric, candidate, packet, and recipe checksums are independently
recomputed and must match their canonical material.

## Historical pin

The development replay fixture remains explicitly pinned as:

```text
chartpath-generated-hourly-fixture@1.0.0-dev
sha256:07907f75988d2aba5f27d6c73bc596ad9f896452f37a8ba9a240b8ae285a144e
```

This pin is an integrity invariant, not publication authorization. The fixture remains synthetic,
development-only, non-credit-bearing, and blocked from redistribution under the existing
publication and licensing gates.

## Publication layering

Publication uses several intentionally separate identities:

1. The candidate material set pins frozen ancestry, exact source provenance, and an optional future
   candle patch recipe.
2. The review packet adds reviewer-facing text, licensing state, evidence, blockers, accessibility,
   and deterministic private evidence.
3. Artifact hashes pin the exact generated JSONL and Markdown bytes.
4. Attestations pin the candidate material-set and review-packet checksums; neither checksum can be
   replaced by a dataset, rubric, recipe, or artifact checksum.

The identity report audits these boundaries. It does not approve a candidate, resolve licensing,
grant learning credit, or replace native and accessibility evidence.
