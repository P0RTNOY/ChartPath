# Licensing and redistribution review brief

**Status:** human/legal review required; this brief records evidence and questions but does not
state that publication or redistribution is lawful

**Source document:** `docs/sources/technical-analysis-he-digital 2.pdf`

**Source identity:** `ta-he-v2`, PDF document ID `ta-he-v2.pdf`, 1,762,414 bytes,
SHA-256 `25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`

## 1. Decision boundary

The three records below remain internal, no-credit publication candidates. Their immutable material
states that redistribution is `prohibited`, publication is `internal`, source-adaptation rights
require a human decision, and intended redistribution is `not-authorized`. This document does not
change those fields. A reviewer should not interpret synthetic charts, original rendering, short
summaries, or repository access as permission to distribute the source adaptation.

The current authorized distribution model is a local reviewer-only development configuration. No
candidate, review packet, native build, encrypted recovery bundle, or generated asset is authorized
for public catalog exposure, TestFlight, an app store, production hosting, or third-party delivery.
Any future public app-distribution model requires a separately documented rights decision and a new
immutable candidate/material version where the rights-facing material changes.

## 2. Exact candidate material

### Long — `publication-candidate-long-v1`

- Scenario: `internal-long-range-breakout@2.1.0`.
- Dataset: `internal-long-range-breakout-dataset@2.0.0`, SHA-256
  `f927f4758ad81c6bdc1b2da7c5d4948af21ea930a0094db2ac9d49ee69e7f7d2`.
- Generator: ChartPath generator `1.0.0`, seed `51001`; one versioned future-only OHLC
  replacement at candle 65.
- Base concept: breakout, risk planning, and target; source record `u10-capstone-e01`, physical PDF
  pages 72–73, printed pages 59–60, chapter 19, case/figure 19.1.
- Management concepts: plan and rationale recorded before the next candle; risk and invalidation
  checked before management. Source record `u10-capstone-e05`, physical PDF pages 76–79 / printed
  pages 63–66, with the risk/invalidation reference specifically at physical page 78 / printed
  page 65.
- Learner title: “מועמד פריצה מטווח לניתוח לונג”.
- Learner prompt: “נתחו את מועמד פריצה מטווח לניתוח לונג באמצעות 11 שלבי התהליך. אין להשתמש
  בנרות שמעבר לנקודת ההחלטה.”
- Learner-facing evidence summary: “בחלון הגלוי 16–63: טווח המחיר 97.6809–106.4795, סגירת נר
  ההחלטה 106.136 ומחזור 100694.”

### Short — `publication-candidate-short-v1`

- Scenario: `internal-short-double-top@2.0.0`.
- Dataset: `internal-short-double-top-dataset@2.0.0`, SHA-256
  `357d1c59b511573583f40ee0ec332d737485fae2917ec3a3b7bec3564326967d`.
- Generator: ChartPath generator `1.0.0`, seed `52001`; three versioned future-only OHLC
  replacements at candles 65–67.
- Base concept: double top, intervening low, and confirmation; source record `u05-reversal-e04`,
  physical PDF page 41, printed page 28, chapter 9, figure 9.1.
- Management concepts: the same `u10-capstone-e05` references at physical PDF pages 76–79 /
  printed pages 63–66 and physical page 78 / printed page 65.
- Learner title: “מועמד פסגה כפולה לניתוח שורט”.
- Learner prompt: “נתחו את מועמד פסגה כפולה לניתוח שורט באמצעות 11 שלבי התהליך. אין להשתמש
  בנרות שמעבר לנקודת ההחלטה.”
- Learner-facing evidence summary: “בחלון הגלוי 16–63: טווח המחיר 94.6786–103.9068, סגירת נר
  ההחלטה 94.9555 ומחזור 99279.”

### No trade — `publication-candidate-no-trade-v1`

- Scenario: `internal-no-trade-capstone-c@1.0.0`.
- Dataset: `internal-no-trade-capstone-c-dataset@1.0.0`, SHA-256
  `c0b58867716179d9050c896988729457f3ddef8d083f4f103c3f7e7b49833aa2`.
- Generator: ChartPath generator `1.0.0`, seed `53001`; no future-patch recipe.
- Concept: a recognizable pattern without an adequate risk/reward relationship; source record
  `u10-capstone-e03`, physical PDF pages 74–75, printed pages 61–62, chapter 19, case C.
- Learner title: “מועמד אי־עסקה — מקרה ג׳”.
- Learner prompt: “נתחו את מועמד אי־עסקה — מקרה ג׳ באמצעות 11 שלבי התהליך. אין להשתמש בנרות
  שמעבר לנקודת ההחלטה.”
- Learner-facing evidence summary: “בחלון הגלוי 16–63: טווח המחיר 96.2728–106.0593, סגירת נר
  ההחלטה 98.9797 ומחזור 99777.”

## 3. Creation and copying assertions requiring human confirmation

The repository records the following engineering assertions for all three candidates:

- Every candle is synthetic and deterministically generated; no security or observed market series
  is represented.
- Chart geometry was not copied or traced from a source figure.
- Source diagrams and figures are not embedded in the candidate packets or application assets.
- Learner charts use ChartPath's own renderer and original synthetic values.
- Long source passages are not copied into candidate material. The packets contain short original
  Hebrew summaries, exact citation metadata, workflow prompts, and engineering disclosures.
- The paper-execution, gap, cost, order, and management mechanics are versioned simulator
  assumptions, not claims that the book prescribes those exact mechanics.

These statements describe repository construction. The licensing reviewer must independently decide
whether the resulting selection, arrangement, adaptation, terminology, exercise structure, and
summaries may be distributed.

## 4. Exact generated assets proposed for review

The proposed distribution set is not yet authorized. The current review set consists of:

- `review-packets/index.canonical.jsonl` and each candidate's canonical JSONL and Markdown packet;
- the three exact deterministic scenario/dataset identities and their runtime chart projections;
- original ChartPath UI, accessibility alternatives, process rubrics, simulated execution and
  management snapshots;
- supporting screenshots listed in each packet, including exact Long, Short, and No-trade decision
  frames and management ambiguity/debrief frames; and
- a local reviewer-only native/web build that exposes candidates behind an explicit internal,
  unpublished, synthetic, no-credit boundary.

The source PDF itself is evidence for authorized reviewers and is not part of the proposed app
distribution set. Review packets must not be treated as authority to redistribute that PDF.

## 5. Repository-license status

The repository root has no project-wide `LICENSE` or `NOTICE` file. `apps/mobile/LICENSE` contains
the Expo/650 Industries MIT license text and must not be misrepresented as a license grant for all
ChartPath application code, curriculum, the user-authored PDF, the underlying book, candidate
packets, or generated content. Before any external distribution, an authorized owner must establish
and record the applicable license for ChartPath-owned code/assets and the required third-party
notices for runtime dependencies.

## 6. Questions requiring a qualified human decision

1. Who owns the user-authored Hebrew PDF, and what rights were retained or granted when it was
   created?
2. Does the PDF reproduce, translate, adapt, summarize, or reorganize protected expression from
   “Technical Analysis of Stock Trends,” and under which edition and rights chain?
3. Are the cited concepts, chapter/case structure, page references, terminology, exercise sequence,
   short summaries, or combined selection sufficiently protected to require permission?
4. May the exact Hebrew prompts, rubrics, citations, and source-backed summaries be distributed in
   a commercial or non-commercial mobile application?
5. May review packets containing private answer keys and exact citations be shared with external
   reviewers, and under what confidentiality terms?
6. Must source/title/author/publisher/edition attribution or a copyright notice appear in the app,
   review kit, or store listing?
7. Are ChartPath-generated synthetic datasets and rendered chart images owned and redistributable by
   the project, and what license/attribution should apply?
8. Is separate permission required for Hebrew translation/adaptation, electronic distribution,
   educational exercises, or territories served by the intended stores?
9. What retention and deletion rules apply to reviewer copies of the source PDF and review packets?
10. Does the chosen project-code license cover all files currently committed, or are exclusions and
    a third-party-notice inventory required?

## 7. Required approval record

The licensing gate may close only after an authorized qualified human supplies supporting evidence
and a valid `licensing` attestation for one exact candidate packet. The signed note or referenced
evidence should state, without ambiguity:

> I reviewed the identified source document, candidate version, dataset/material/packet checksums,
> exact learner-facing summaries, synthetic chart construction, proposed asset set, repository
> license status, and intended distribution model. Acting with documented authority and within my
> professional role, I [approve redistribution under the stated conditions / request the listed
> changes]. This decision applies only to the exact pinned material and does not extend to later
> versions or additional source material.

The evidence must identify the reviewer, authority basis, decision date, permitted channels and
territories, required attribution/notices, conditions or expiration, and any excluded assets. A
cryptographically valid signature proves control of a registered review key; it does not by itself
prove legal authority. Product-owner review of the public-key registration and evidence reference is
still required.

Until that record exists and the immutable rights-facing material is updated in a correctly
versioned candidate where necessary, the licensing gate remains blocked and publication remains
`PUBLICATION_NO_GO`.
