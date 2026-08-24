# Frozen historical-data and replay contract

**Contract date:** 2026-08-24

**Status:** normative provider-neutral contract implemented by the current Milestone 3 foundation;
real-data publication remains gated

This contract defines what a canonical frozen dataset and historical replay scenario must mean. The
current foundation implements canonical schema version 1, pure import/checksum/validation, cutoff and
blind projections, exact session pins/recovery, internal practice finalization and the learner replay
flow using a ChartPath-generated development fixture. That implementation is not permission to ship
real market data: provider rights, publication status and independent human editorial/accessibility
review remain mandatory gates. Implementation names may change; the serialized meaning, validation
rules and publication gates may not be weakened without a schema/version change and migration review.

## 1. Boundaries and source hierarchy

Historical replay is offline educational content, not a live market-data service or simulated
execution system.

Two independent source records are mandatory:

1. **Educational source provenance** supports the prompt, rubric, feedback, hints, misconceptions,
   and analytical doctrine. Current ChartPath doctrine remains based on the audited
   `ta-he-v2` source and existing reviewed content records.
2. **Market-data provenance** identifies the origin and rights for candle/action data. It does not
   support technical-analysis doctrine, and an educational citation does not grant market-data
   redistribution rights.

The immutable market dataset is separate from the authored replay scenario. Many scenarios may
reference one checksum-pinned dataset without copying its candles.

## 2. Canonical records

### 2.1 Dataset manifest

Every canonical dataset manifest contains at least:

| Category          | Required meaning                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity          | Stable dataset ID, positive schema version, immutable dataset version, and publication status.                                                                               |
| Origin            | Provider/origin ID and name, official source URL, exact dataset or endpoint identifier, retrieval timestamp, and known limitations.                                          |
| Rights            | Official terms/license URL, evidence-review date, permitted-use decision, redistribution decision, attribution requirements, caching/retention decision, and evidence notes. |
| Integrity         | SHA-256 of exact raw input and SHA-256 of the canonical normalized dataset.                                                                                                  |
| Instrument        | Source symbol, learner display symbol, exchange, MIC when known, ISO currency, exchange timezone, and optional anonymized learner identity.                                  |
| Range             | Candle interval, inclusive first/last UTC timestamp, candle count, price precision, and volume unit.                                                                         |
| Adjustment        | Raw/split-adjusted/total-return mode, explicit split policy, explicit dividend policy, and corporate-action handling.                                                        |
| Sessions          | Included session classes, pinned calendar/policy identity, regular-hours definition where applicable, timestamp convention, and extended-hours treatment.                    |
| Missing intervals | Reject-or-record policy, explicit irregularities, and an invariant that missing candles are never invented.                                                                  |

URLs use HTTPS except for an explicitly documented local generated-fixture origin. Timestamps are
ISO-8601. Timezone identifiers are valid IANA names; fixed labels such as `EST` are insufficient.
Currency uses ISO 4217 where the instrument has a currency. Optional fields may be absent; empty
strings and guessed values are invalid substitutes.

### 2.2 Historical candle

Each candle contains:

- a zero-based, gap-free sequential index;
- an unambiguous UTC timestamp;
- an exchange-local timestamp or a deterministic derivation rule;
- finite open, high, low, and close values at declared precision;
- finite non-negative volume in the declared unit;
- session classification; and
- adjustment metadata and contributing corporate-action IDs when applicable.

For every candle, `low ≤ open ≤ high`, `low ≤ close ≤ high`, and `low ≤ high`. Timestamps are unique
and strictly increasing. A zero-volume candle is allowed only when the source/session policy permits
it; negative, `NaN`, infinite, overflowed, or silently truncated values are invalid.

### 2.3 Corporate action

Supported explicit actions are split, reverse split, cash dividend, and symbol change. Another
data-affecting action is allowed only with a stable kind/description and source evidence. Each action
records:

- a stable action ID and source URL;
- effective/ex timestamp;
- announcement or first-known timestamp;
- first candle index at which it may enter the learner knowledge view; and
- exact type-specific values, such as split ratio, dividend amount/currency, or old/new symbol.

Do not infer a missing action from an apparent price discontinuity. Unknown or unverifiable action
history is a dataset limitation and publication blocker when it could materially change the chart.
Corrections, cancellations, and rescissions require a new dataset version and checksums; they never
silently rewrite a published bundle.

### 2.4 Replay scenario

A scenario references, rather than embeds:

- stable scenario ID, schema version, and scenario version;
- dataset ID, dataset version, and canonical checksum;
- existing educational content ID and exact educational references;
- decision candle, initial visible range, permitted replay boundary, and knowledge cutoff;
- blind/anonymized mode and the post-finalization reveal policy;
- market-data provenance pointer;
- editorial and dataset-publication statuses;
- scenario annotations and the first candle at which each is knowable;
- original Hebrew disclosure;
- deterministic rubric/grader identity; and
- future-leak validation status, validator version, and evidence timestamp.

The decision candle, knowledge cutoff, initial range, and replay boundary must be in range. No
permitted boundary may exceed the decision candle before finalization. A scenario cannot substitute a
new rubric for the referenced reviewed educational content without an explicit new content version
and human review.

## 3. Deterministic import and normalization

Provider acquisition and canonical normalization are separate operations. A downloader may fetch a
supported provider format outside the learner runtime, but the normalizer accepts explicit files and
manifests, requires no credential, and produces the same result offline.

The pipeline performs these steps in order:

1. Hash the exact input bytes before parsing.
2. Parse only a supported, versioned raw format and reject unknown columns/encodings when they could
   change meaning.
3. Validate the source manifest and publication/license status.
4. Convert timestamps through the declared exchange timezone and timestamp convention to canonical
   UTC. Reject ambiguous or nonexistent local times rather than guessing across daylight-saving
   transitions.
5. Parse prices and volume without locale-sensitive separators or binary-floating-point surprises.
   Preserve declared source precision; any quantization or adjustment rule is explicit and versioned.
6. Order and validate rows. Reject duplicate or non-monotonic timestamps and malformed OHLCV.
7. Classify sessions with the pinned calendar/policy. Do not infer regular hours from a device locale.
8. Apply only the declared adjustment policy and explicit corporate actions. Never mix raw and
   adjusted fields silently.
9. Detect unexpected interval gaps. Reject them or record them according to policy; never synthesize
   candles. Weekends, holidays, halts, and early closes count as scheduled only when the pinned
   calendar/policy proves that status.
10. Emit the canonical dataset, checksums, counts, range, limitations, and an auditable validation
    report.

The learner application consumes only canonical output that passed runtime parsing and checksum
verification. It never fetches provider data, applies credentials, or repairs malformed bundles.

## 4. Checksum contract

Both checksums use SHA-256 and are serialized as a lowercase algorithm prefix plus 64 lowercase hex
digits.

- **Raw checksum:** digest of the exact original bytes, including their original newline and encoding
  representation. It proves which input was normalized; it does not grant rights or prove accuracy.
- **Canonical checksum:** digest of the canonical normalized dataset envelope. The envelope includes
  the manifest (including raw checksum but excluding the canonical-checksum field itself), candles in
  ascending index order, corporate actions in deterministic order, and recorded missing intervals in
  deterministic order.

Canonical serialization is versioned. For the initial contract it uses UTF-8 without a byte-order
mark, lexicographically sorted object keys, semantic array order, normalized ISO-8601 UTC strings,
finite locale-independent JSON numbers, no insignificant whitespace, and one terminal newline. A
serializer-version change creates a new dataset/schema version; it cannot silently change an existing
checksum.

The manifest-declared checksum must equal a fresh digest at build validation and runtime load. A
scenario pins the same dataset ID, version, and canonical checksum. Missing data, modified bytes,
version mismatch, or checksum mismatch produces a localized recovery state and cannot fall back to a
different dataset.

## 5. Knowledge-cutoff and blind-view contract

At replay cursor `N`, every learner-visible or machine-readable projection is computed only from
information knowable at or before the lesser of `N`, the scenario knowledge cutoff, and the permitted
replay boundary.

The pre-finalization projection must not contain future information through:

- candles, volume, annotations, corporate actions, indicators, or summary statistics;
- full-dataset extrema, chart domains, axes, zoom limits, or scaling;
- dataset end dates, future event/action metadata, scenario titles, filenames, route parameters,
  search metadata, progress copy, or cache keys;
- identity/date fields configured as blind, including ticker, issuer, exchange hints, and calendar
  labels;
- accessibility labels, focus text, test IDs, hidden DOM/native props, debug logs, error text, network
  payloads, or cached debrief objects;
- final outcome labels, future reference geometry, or result-dependent grading.

Visible chart scale, statistics, and accessibility summaries are recomputed from the allowed slice
only. An annotation or corporate action appears only when both its anchor/effective data and its
first-known boundary are allowed. Identity hiding is a data projection that omits fields, not a CSS or
color treatment.

Before finalization, blind mode uses a neutral Hebrew title and hides the configured symbol, issuer,
exact date, outcome, and future-event context. After finalization, the read-only debrief may reveal
the symbol/issuer, exchange, historical period, provider attribution, adjustment/session policy,
decision timestamp, later outcome, and known limitations according to the authored reveal policy.

The reveal must state in concise original Hebrew that the chart is historical, the outcome was hidden
during analysis, a favorable outcome does not prove the original process was correct, an unfavorable
outcome does not automatically invalidate disciplined process, historical performance does not
guarantee future results, and the scenario is educational rather than a current recommendation.

Later candles and outcome descriptions never enter the original deterministic grade or retroactively
change mastery. No hypothetical profit affects correctness or rewards.

## 6. Status and publication model

Dataset publication status and scenario editorial status are independent:

- `development-only`: generated fixture or insufficient data rights; local/internal tooling only;
- `internal`: structurally complete but not approved for the production learner path;
- `reviewed`: scenario doctrine, Hebrew, pedagogy, grading, safety, cutoff, and accessibility received
  independent human review, but dataset publication rights may still block release;
- `publishable`: market-data provenance and exact redistribution/retention rights pass, and the
  scenario is independently reviewed;
- `published`: a publishable immutable version received release approval and is present in a frozen
  bundle.

No automated result promotes a scenario to reviewed or publishable. Development/internal scenarios
do not award ordinary course XP, mastery, review scheduling, or completion. A published scenario may
reuse the ordinary append-only attempt/finalization path only when the exact dataset identity and
content identity are pinned.

## 7. Historical replay authoring and publication checklist

### Data and rights

- [ ] Exact provider/origin, source URL, dataset/endpoint, retrieval time, and limitations are recorded.
- [ ] Official terms/license URL and review date are recorded.
- [ ] Commercial/educational use, external display, app bundling, redistribution, caching, long-term retention, attribution, derived-data, exchange, termination, and audit obligations are explicitly decided.
- [ ] The exact dataset has verified permission under [HISTORICAL_DATA_POLICY.md](./HISTORICAL_DATA_POLICY.md); “free” or “educational” is not used as a proxy.
- [ ] No credential, confidential order text, or downloaded unlicensed response is in source control, logs, fixtures, screenshots, or bundles.

### Canonical dataset

- [ ] Manifest and schema versions, dataset ID/version, raw checksum, and canonical checksum are valid.
- [ ] Symbol/display symbol, exchange/MIC, currency, IANA timezone, interval, inclusive range, count, precision, and volume unit are complete.
- [ ] Adjustment, split, dividend, corporate-action, regular/extended-session, timestamp, calendar, and missing-interval policies are explicit.
- [ ] Candles, actions, and gaps pass deterministic normalization and invariant validation.
- [ ] Modified data, duplicate/non-monotonic timestamps, invalid OHLCV, unknown timezone/session, undeclared gaps, and checksum mismatches fail safely.

### Educational scenario

- [ ] Existing educational content ID, exact educational source references, deterministic rubric, and grader identity resolve.
- [ ] Decision candle, initial visible range, replay boundary, and knowledge cutoff are explicit and in range.
- [ ] Every authored annotation/action has a knowable-at boundary; no future-derived indicator or statistic is included.
- [ ] Original Hebrew historical/blind/outcome/no-guarantee/no-current-recommendation disclosure is present.
- [ ] Blind identity/date projection and after-finalization reveal policy are explicit.
- [ ] Scenario-specific doctrine, hints, feedback, or rubric changes—if any—have their own source review and content version rather than being invented from price history.

### Validation and human review

- [ ] Future-leak tests cover candles, annotations, actions, statistics, scaling, titles, filenames/routes, accessibility, logs, caches, and serialized/network views.
- [ ] Restore verifies the exact dataset ID/version/checksum and fails safely for missing or altered data.
- [ ] Deterministic replay and finalization survive reload without duplicate attempts/projections.
- [ ] Hebrew RTL/LTR, phone/tablet, dark mode, large text, reduced motion, keyboard, and screen-reader paths are reviewed.
- [ ] Independent humans reviewed source fidelity, market-data evidence, Hebrew, pedagogy, financial safety, grading, cutoff, and accessibility.
- [ ] Development/internal scenarios are excluded from ordinary XP/mastery/course completion.
- [ ] Release evidence identifies exactly what is real, synthetic, development-only, bundled, publishable, and still blocked.

Publication fails if any required educational source, market-data source, terms URL, redistribution
decision, checksum, decision candle, knowledge cutoff, Hebrew disclosure, adjustment policy,
editorial status, deterministic rubric, future-leak validation, or exact-rights evidence is absent.

## 8. Development fixture

The repository-safe fixture is generated synthetic data using the same canonical records and import
path. It contains enough candles for replay, a known decision cutoff, an explicit timezone, interval,
session and gap policy, and reproducible raw/canonical checksums. Its provenance says
`development-only` and `generated`; it never uses a real ticker/company/date or claims historical
market identity.

The fixture proves engineering behavior only. It does not prove provider accuracy, exchange-calendar
coverage, real-data rights, human editorial approval, native accessibility, or production readiness.
