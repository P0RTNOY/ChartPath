# Publication candidate policy

**Status:** Milestone 7 fail-closed candidate and review-packet contract; three exact candidates are
selected for external review, but none is approved, published, licensed for redistribution or
eligible for learning credit

**Contract versions:** publication-candidate schema `1`, `review-packet-v1`,
`publication-preflight-policy-v1`

This policy governs the records in
`packages/content/src/scenarios/publication`. A publication candidate is a frozen set of material
prepared for review. It is not a published scenario and is not permission to distribute source
material, synthetic candles or an application build.

## 1. Lifecycle and learner boundary

The publication lifecycle is:

| State                   | Meaning                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `internal-qa`           | Internal engineering material. It may be incomplete and may be used only through explicit development/QA tooling.                                    |
| `publication-candidate` | Exact immutable scenario, dataset and review material selected for external review. It remains unpublished and no-credit.                            |
| `approved`              | Every required scope has a current independently authenticated approval for the exact packet, and all non-review evidence gates pass.                |
| `published`             | An approved immutable version was deliberately placed in the published registry by a separately authorized release action.                           |
| `retired`               | The version is unavailable for new assignment but remains resolvable for retained sessions and attempts according to the applicable rights decision. |

Only the middle state is implemented for the three Milestone 7 records. The production trusted
reviewer registry is empty, the current immutable licensing material prohibits redistribution, and
the dry-run preflight always reports `NO-GO`. No command implemented by this milestone promotes or
publishes a candidate.

A publication candidate may appear in candidate-only reviewer tools, deterministic packets and
native QA. It must not appear in the ordinary learner catalog, grant XP, affect mastery, schedule
review, complete a lesson, change a streak or create an ordinary credited attempt. Candidate state
must never be treated as an alias for `approved` or `published`.

## 2. Deterministic selection rule

Selection considers only evidence available at or before the authored decision cutoff and the
quality of the frozen engineering/review record:

1. Require zero structural validation issues and exact source/content identity.
2. Require a stable scenario version, dataset version/checksum and material checksum chain.
3. Require strict learner/private-grader separation and cutoff-safe blind replay.
4. For a trade path, prefer an exact management-enabled version with reducer-produced terminal or
   ambiguity evidence.
5. Prefer the source record that most directly supports the complete learner decision and has the
   fewest special source/rubric blockers.
6. Use exact lexical identity only as a final deterministic tie-break.

Future price direction, target attainment, net simulated P&L and risk multiple are never selection
inputs. The long and short choices deliberately include adverse and indeterminate execution
evidence. Those outcomes demonstrate policy coverage; they do not make a candidate stronger or
weaker educationally.

## 3. Exact selected candidates

All three use `scenario-compiler-v1`, compiler-contract checksum
`sha256:92f6a21c940c781a62260d3983257b7ed0eb00a084617487d3b7aba7e7fffadd` and chart-generator
version `1.0.0`. Their decision candle, permitted replay boundary and knowledge cutoff are candle
`63`; the initial visible range is candles `16–63`; blind material reveals identity and private
review evidence only after finalization.

### Long: `publication-candidate-long-v1`

| Field                         | Exact value                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| Scenario                      | `internal-long-range-breakout@2.1.0`                                                        |
| Dataset                       | `internal-long-range-breakout-dataset@2.0.0`                                                |
| Dataset checksum              | `sha256:f927f4758ad81c6bdc1b2da7c5d4948af21ea930a0094db2ac9d49ee69e7f7d2`                   |
| Base scenario                 | `internal-long-range-breakout@1.0.0`                                                        |
| Base dataset                  | `internal-long-range-breakout-dataset@1.0.0`                                                |
| Base dataset checksum         | `sha256:3119ca8967a40347d85d0c990ac9eea506402bee4b6d5414e93139768aecb2df`                   |
| Base material checksum        | `sha256:aff491ab6a4c5a124b8d1a61657f74a0765b31e17c582cffad947d45b34b263c`                   |
| Management material checksum  | `sha256:1f39e49342e080c9d9bbc9ebdd1b4884a2b5826e3c46507ed2ae4e83e53e15e0`                   |
| Future-patch recipe checksum  | `sha256:0649a41651d08b80b607d7d06639e10e962c749166c6022b26f2713a525018d6`                   |
| Candidate material-set hash   | `sha256:5212b1d0aab4eb6a1b6fd028a2a8f8d1d87551f7cf7530720c6fed65551a7b54`                   |
| Generated review-packet hash  | `sha256:8d4578880f791c69acfc8ee39d2e98adf6880330a520438c60eee9522a93d159`                   |
| Chart-spec checksum           | `sha256:4060fdc505536c0f6da062e64095215ed57689380de65bfaca47ea2510b6364b`                   |
| Generator seed                | `51001`                                                                                     |
| Base process-rubric checksum  | `sha256:530df8a6ba54f14f3abd5d82b0979677a41be82ce23a54e68963ef5a33a9127a`                   |
| Management domain-rubric hash | `sha256:5e57d7d778cc91416f2137902e0921a0eaf97818bcdd33a6cd58ba5e443d7ee0`                   |
| Source                        | `u10-capstone-e01`; `ta-he-v2`, PDF 72–73 / printed 59–60, Chapter 19, case A / Figure 19.1 |
| Management source             | `u10-capstone-e05`; `ta-he-v2`, PDF 76–79 / printed 63–66                                   |

Dataset `2.0.0` preserves every candle through index `64` and replaces only candle `65` with
OHLC `102 / 102.5 / 101.4 / 101.8`. The exact expected management cases cover an adverse protective
stop and explicit voluntary-action/opening-threshold ambiguity. The base dataset `1.0.0` target
snapshot is ancestry/regression evidence only; it is not the terminal outcome of this modified
dataset.

This candidate was selected over the inverse-head-and-shoulders candidate, whose own source
rationale says a complete plan still needs review, and the triangle candidate, whose evidence is
useful for confirmation ambiguity but has no position-management extension. Long version `2.0.0`
remains valuable mechanics coverage, but `2.1.0` provides the clearest adverse/indeterminate
P&L-independent reviewer case.

### Short: `publication-candidate-short-v1`

| Field                         | Exact value                                                                |
| ----------------------------- | -------------------------------------------------------------------------- |
| Scenario                      | `internal-short-double-top@2.0.0`                                          |
| Dataset                       | `internal-short-double-top-dataset@2.0.0`                                  |
| Dataset checksum              | `sha256:357d1c59b511573583f40ee0ec332d737485fae2917ec3a3b7bec3564326967d`  |
| Base scenario                 | `internal-short-double-top@1.0.0`                                          |
| Base dataset                  | `internal-short-double-top-dataset@1.0.0`                                  |
| Base dataset checksum         | `sha256:648d03368e3acfda4d459200ff9a5d4a7649dfc076cbfc1551b3394b8e0c6152`  |
| Base material checksum        | `sha256:b8b56eb342884a65fa9c7af96d27f67a248a87595debdef5193a425681a7328e`  |
| Management material checksum  | `sha256:8b63640cd86f6d6fab5da12170c2303a8c2b72756503bbae260ec2fba1c779bc`  |
| Future-patch recipe checksum  | `sha256:b4184647a682e19418a1977c6c3dc1dbae7e662ed251253810f1dfcdb38d3ebb`  |
| Candidate material-set hash   | `sha256:15815a43ab08f9d3738331b00392ffe73afe62eb1ac481a53eb990001520ad6f`  |
| Generated review-packet hash  | `sha256:a81188ade007a1996bc7f080a26fad9c5174015b310f629e400eff18d769f404`  |
| Chart-spec checksum           | `sha256:92e911de01b1d84dfd0d7d4e29f9c18a6e34d8d7c19ac336b9ea579ad708b767`  |
| Generator seed                | `52001`                                                                    |
| Base process-rubric checksum  | `sha256:bbcee3cfbdfc3b194bae8dd63b613f2fc47241346de1155b0289adff37781cb4`  |
| Management domain-rubric hash | `sha256:5e57d7d778cc91416f2137902e0921a0eaf97818bcdd33a6cd58ba5e443d7ee0`  |
| Source                        | `u05-reversal-e04`; `ta-he-v2`, PDF 41 / printed 28, Chapter 9, Figure 9.1 |
| Management source             | `u10-capstone-e05`; `ta-he-v2`, PDF 76–79 / printed 63–66                  |

Dataset `2.0.0` preserves candles through index `64` and replaces candles `65`, `66` and `67` with
OHLC `94.2 / 95 / 93.6 / 94.4`, `94.5 / 95.2 / 93.9 / 94.8`, and
`98 / 99 / 97.5 / 98.5`. Its exact case applies a protective-stop replacement before a later adverse
gap. It is the only management-enabled short version. The head-and-shoulders candidate explicitly
needs a new source review, while the rising-wedge candidate is useful unfilled-order coverage but
cannot exercise an open-position management lifecycle.

Both management datasets carry `management-future-candle-replacement-v1` recipes in the candidate
material. The recipes pin the last preserved candle, every OHLC replacement and a canonical recipe
checksum. The base seed regenerates only dataset `1.0.0`; reproducing dataset `2.0.0` requires the
versioned recipe and final dataset checksum as well.

### No trade: `publication-candidate-no-trade-v1`

| Field                        | Exact value                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Scenario                     | `internal-no-trade-capstone-c@1.0.0`                                          |
| Dataset                      | `internal-no-trade-capstone-c-dataset@1.0.0`                                  |
| Dataset checksum             | `sha256:c0b58867716179d9050c896988729457f3ddef8d083f4f103c3f7e7b49833aa2`     |
| Base/material checksum       | `sha256:1ba1224283862c1a8799e23937294ef2e34c3a1ebd17018377a569205b3678c2`     |
| Candidate material-set hash  | `sha256:cc42ef154e2740b8fcca6c88a88db04b15174843321ec6e3c10440129c017a72`     |
| Generated review-packet hash | `sha256:0333ab31647a9255c0aae8a06026df8c2c76fd37d9095841081c5e7dc79c755a`     |
| Chart-spec checksum          | `sha256:8a39df10f87e41c5c2af04f965c87712dd753f834650ce61bfdc1bfeb647709b`     |
| Generator seed               | `53001`                                                                       |
| Process-rubric checksum      | `sha256:057229893cedc5bb5e75bbb650588842655800709fb34418e1c3951d90a03397`     |
| Source                       | `u10-capstone-e03`; `ta-he-v2`, PDF 74–75 / printed 61–62, Chapter 19, case C |
| Expected execution authority | None; the correct decision creates no paper order or managed position         |

This is the only current source record explicitly connected to both a complete eleven-step rubric
and a full no-trade decision. Case D supports an atomic no-trade conclusion but its eleven-step
expansion still needs review. Gap uncertainty supports waiting or insufficient evidence rather than
a separately reviewed full literal no-trade rubric.

The selected source PDF is `docs/sources/technical-analysis-he-digital 2.pdf`, SHA-256
`25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`.

## 4. Composite identity and material changes

A management candidate is not a standalone `ScenarioAuthoringManifestV1`. Its review identity is
the exact base authoring manifest plus the exact management scenario/dataset version, management
material checksum, policy and permission. Packet generation must resolve that ancestry and must not
substitute a base terminal snapshot for the modified candidate's management outcome.

The generator seed is necessary but insufficient to reproduce either management dataset `2.0.0`:
the future-only replacement recipe and resulting canonical candle checksum are material. A change to
the seed, chart spec, replacement candles, learner text, rubric, source, policy, permissions,
execution snapshots, accessibility material, licensing fields or selection rationale changes the
candidate material or review packet and invalidates prior attestations. Published material must
receive a new immutable scenario version and, when candle material changes, a new dataset version.

## 5. Review packet contract

`pnpm reviews:pack` verifies the source PDF and every referenced evidence file by exact
repository-relative path, byte count and SHA-256 before writing. `pnpm reviews:check` regenerates the
same bytes in memory and fails if any tracked artifact is stale without mutating the worktree:

- `review-packets/<candidate-id>/review-packet.canonical.jsonl`;
- `review-packets/<candidate-id>/review-packet.md`; and
- `review-packets/index.canonical.jsonl`.

The machine packet is `review-packet-v1` encoded with `canonical-json-v1` and one trailing newline.
The same repository material produces byte-identical JSON, Markdown and artifact indexes. Volatile
wall-clock generation time is deliberately absent. The packet checksum is SHA-256 over the
canonical packet material before the checksum field is added; the artifact index separately hashes
the exact JSON and Markdown bytes.

Each packet includes:

- exact candidate, scenario, dataset and base ancestry;
- compiler/generator versions, seed, cutoffs, blind/reveal policy and component hashes;
- learner Hebrew prompts/hints/workflow and a separate private reviewer projection;
- correct decision, process rubric, initial paper plan and management cases where applicable;
- exact source ID/pages/content records and an original short summary, without source diagrams or
  long passages;
- current rights state and unresolved licensing questions;
- a cutoff-safe Hebrew chart alternative, RTL reading order, LTR numeric policy and strings needing
  Hebrew review;
- exact supporting evidence file metadata and automated-test references; and
- all inherited, scoped, native/accessibility and licensing blockers.

Private reviewer evidence may expose the answer only in reviewer artifacts after the explicit
review boundary. It must never be reused as a learner DTO or accessibility label before
finalization.

## 6. Required review scopes and honest blockers

Every candidate requires eight independently authenticated scopes:

1. source;
2. rubric;
3. deterministic execution;
4. accessibility;
5. Hebrew;
6. financial safety;
7. licensing/redistribution; and
8. publication.

Current production decisions for all eight are missing. Browser screenshots are supporting visual
evidence only. They do not establish VoiceOver, TalkBack, OS accessibility, native lifecycle,
physical-device ergonomics, signing or distribution readiness. No packet claims an executed native
or assistive-technology gate that is not separately recorded as completed evidence.

The source PDF states that rights are reserved. The manifests describe ChartPath-generated
synthetic candles, but still mark redistribution prohibited and publication internal. Synthetic
origin does not answer whether the educational adaptation, generated data, screenshots or compiled
application may be redistributed. A responsible human must decide:

- the authority and terms for adapting the source concepts;
- whether any prose, diagram or distinctive geometry was copied;
- the public license, attribution, retention and redistribution terms for generated data;
- the intended audience and distribution channels; and
- whether a new immutable material version is required to record the approved rights state.

Until then, `chartGeometryCopied: false` and `proseCopied: false` describe the generator/authoring
claim under review, not a legal conclusion; `intendedRedistributionMode` remains `not-authorized`.

## 7. Dry-run promotion preflight

Only dry-run preflight exists. It requires an explicit candidate ID; exact scenario ID/version;
exact dataset ID/version/checksum; canonical UTC `--as-of`; regenerated packet; attestation
verification; and licensing, native, accessibility, source/Hebrew, execution and rubric evidence.
It also verifies that the candidate did not enter the ordinary learner registry.

Example shape:

```bash
pnpm release:preflight -- \
  --dry-run \
  --candidate publication-candidate-long-v1 \
  --scenario-id internal-long-range-breakout \
  --scenario-version 2.1.0 \
  --dataset-id internal-long-range-breakout-dataset \
  --dataset-version 2.0.0 \
  --dataset-checksum sha256:f927f4758ad81c6bdc1b2da7c5d4948af21ea930a0094db2ac9d49ee69e7f7d2 \
  --as-of 2032-01-01T00:00:00.000Z
```

The command has no promotion side effects. Its contract currently fixes `eligible: false`,
`status: NO-GO`, `mode: dry-run` and an empty `sideEffects` tuple. Even synthetically complete
review/evidence inputs cannot clear `LICENSING_MATERIAL_CHANGE_REQUIRED`, because the immutable
candidate material itself says internal and redistribution-prohibited. A legitimate rights decision
therefore requires reviewed material/version work before any future real promotion mechanism could
be authorized.

See [REVIEW_ATTESTATION_POLICY.md](./REVIEW_ATTESTATION_POLICY.md) for signature and trust policy and
[SCENARIO_PUBLICATION_POLICY.md](./SCENARIO_PUBLICATION_POLICY.md) for the broader scenario release
boundary.
