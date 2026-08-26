# Recovery architecture and encrypted bundle policy

**Decision:** use a versioned, user-controlled, password-encrypted logical export/import bundle;
keep the mutable SQLite store excluded from opaque platform backup

**Status:** Milestone 8 implementation policy; recovery is local and user initiated, not cloud sync

## 1. Context

ChartPath intentionally excludes its mutable SQLite directory from supported iOS backup paths and
sets Android `allowBackup=false`. This protects local answers, free-form journal text, simulation
history, and partially completed work from opaque backup/restore behavior that cannot preserve the
repository's transactional and append-only invariants. The consequence is material: device loss,
uninstall, or migration can destroy the only local copy.

Recovery must preserve immutable attempts, exact scenario/dataset identities, aggregate histories,
quarantine evidence, and derived-learning correctness without copying SQLite/WAL files, reproducible
candles, QA-only catalogs, or device-specific state. It must not silently disclose journal text.

## 2. Alternatives considered

### A. Selective platform backup with separated stores

This could place portable learner data in a backup-eligible store while isolating sensitive journal
or simulation data. It requires a new multi-store transaction protocol, cross-store migrations,
restoration ordering, backup-time consistency rules, and equivalent iOS/Android behavior. Platform
backup remains opaque to the application, does not provide a user-readable inventory, and cannot
reliably report conflicts before mutation. It remains a possible later optimization, not the
Milestone 8 recovery path.

### B. User-controlled encrypted export/import — selected

A logical bundle can include only portable categories, explain privacy choices, authenticate every
byte, validate versions before mutation, produce a dry-run conflict report, and merge once inside the
repository's transaction. The learner controls the destination and password. This is the minimum
safe cross-device path implemented in Milestone 8.

### C. Future account-based synchronization

An account service could offer multi-device continuity and server-side recovery, but it introduces
identity, authentication, authorization, encryption/key recovery, data residency, retention,
conflict-resolution, availability, breach-response, and privacy-policy obligations. Cloud accounts
and synchronization are expressly outside Milestone 8.

### D. Retain complete backup exclusion without recovery

This has the smallest attack surface but leaves learners with no supported response to device loss
or migration. It is no longer acceptable as the only architecture once progress, simulations, and
journal evidence are durable product data.

## 3. Decision

ChartPath keeps complete native backup exclusion and adds `RecoveryBundleV1`, a logical canonical
JSON payload inside a mandatory authenticated-encryption envelope. There is no plaintext export
mode. There is no automatic upload, account, sync, password storage, recovery escrow, analytics, or
telemetry.

The bundle never copies a SQLite database, WAL, normalized mirror table, projection table, cache,
generated dataset, source PDF, internal candidate registry, development QA state, device identifier,
or local filesystem path.

## 4. Portable categories

The encrypted payload supports these logical categories:

| Category                       | Default | Contents and rule                                                                                                                           |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `settings`                     | yes     | Theme, reduced motion, haptics, text scale, and daily goal. Disclaimer acceptance is deliberately not portable.                             |
| `attempts`                     | yes     | Immutable learner attempts. XP, mastery, review schedule, streak, lesson completion, and daily projections are rebuilt from these attempts. |
| `analysis-sessions`            | no      | Exact Guided Analysis aggregates with stable IDs, revisions, replay checkpoints, answers, and pinned chart identity.                        |
| `paper-execution-sessions`     | no      | Exact deterministic paper aggregates, event/candle prefixes, plans, fills, and terminal state.                                              |
| `position-management-sessions` | no      | Exact management aggregates including journal/rationale text. The whole category is sensitive; it is not partially redacted.                |
| `quarantine-records`           | no      | Analysis, paper, and management quarantine records. Raw payloads may contain free-form or malformed personal data.                          |

The default is therefore learning progress plus portable preferences. Analysis, paper, management,
and quarantine history require explicit selection. Management/journal and quarantine also require
an explicit sensitive-category acknowledgement. Journal text is never exported silently.

## 5. Envelope and cryptographic suite

The only version-1 suite is
`scrypt-rfc7914-n32768-r8-p1-aes-256-gcm-v1`:

- password KDF: scrypt with `N=32768`, `r=8`, `p=1`, 32-byte output, and a fresh 16-byte random
  salt;
- authenticated encryption: AES-256-GCM with a fresh 12-byte nonce and 16-byte tag;
- randomness: Expo's asynchronous cryptographic random-byte API on supported app runtimes;
- canonicalization: `canonical-json-v1` UTF-8 with exact object keys, canonical Base64, and one
  supported envelope/payload version; and
- AAD: a domain-separated canonical public header covering every envelope field except ciphertext
  and tag.

Scrypt is supplied by the exact-pinned, zero-runtime-dependency `@noble/hashes` implementation. AES
and secure random bytes use `expo-crypto` in the application. Node tests use an independent provider
implementing the same contract. A new parameter profile or primitive requires a new suite/version;
the importer never silently accepts weaker caller-selected parameters.

The authenticated outer envelope contains only format/version/suite/canonicalization identifiers,
KDF salt and exact parameters, AEAD nonce/tag length, ciphertext byte length, ciphertext, and tag.
Bundle ID, creation time, source versions, categories, counts, privacy flags, records, and the
internal payload checksum are encrypted.

The password is never logged, persisted, routed, included in errors, stored in a bundle, or retained
after cancel/success/failure. Mutable password-byte, key, plaintext, and decrypted buffers are
overwritten in `finally` paths where JavaScript permits. JavaScript strings, garbage-collected
copies, native crypto objects, and async runtime frames cannot be guaranteed to be erased; the UI
and policy do not claim otherwise.

Wrong password, modified header, salt, nonce, ciphertext, or tag yield the same public
`RECOVERY_AUTHENTICATION_FAILED` result and no plaintext or partial record. Encryption establishes
confidentiality and knowledge of the bundle password. It does not authenticate the learner's legal
identity, device, or a trusted publisher.

## 6. Strict parsing and limits

Before key derivation or mutation, import rejects:

- unsupported future envelope, suite, KDF, or payload versions;
- unknown or missing fields, noncanonical JSON/Base64, duplicate-key/noncanonical encodings, invalid
  UTF-8, BOMs, non-finite numbers, accessors, cycles, shared references, sparse arrays, and unsafe
  object keys;
- invalid timestamps, IDs, category ordering, counts, privacy flags, stable record identities, or
  payload checksum;
- oversized raw envelopes, ciphertext/plaintext, strings, arrays, record counts, nesting, and node
  counts; and
- any record that fails the current domain, persistence, append-only, exact-identity, or supported
  migration validator.

The version-1 implementation uses bounded uncompressed data; compression is intentionally absent to
avoid decompression bombs and ambiguous byte domains.

## 7. Dry-run and conflict model

Import is two phase:

1. File selection and password entry decrypt and strictly validate the bundle.
2. A dry run compares the complete logical bundle with the current snapshot and returns exact
   imported, identical/no-op, conflicting, missing-reference, and quarantined counts by category.
3. The learner chooses eligible categories and whether portable settings should replace local
   portable settings.
4. Explicit confirmation applies the exact plan.
5. The repository reads current state again, recomputes the plan inside one transaction, applies it
   once, rebuilds projections, and performs a post-import readback.

Stable-ID rules are fail closed:

- same primary stable ID and exact canonical material: idempotent no-op;
- same primary or secondary identity with different material: hard conflict; apply aborts completely;
- duplicate identity inside one bundle: malformed bundle;
- absent, valid aggregate with satisfied exact ancestry: additive import;
- append-only attempts/events/journal: never rewrite, splice, renumber, or choose a longer suffix;
- missing or mismatched analysis → paper → management ancestry: report and block/quarantine according
  to the exact preview result; never manufacture an ancestor or dataset;
- unsupported future schema: reject and instruct the learner to update the app; and
- corrupt bundle/authentication: reject without partial mutation.

Dry-run, cancel, wrong password, tamper, unsupported schema, conflict, transaction failure, and
post-readback failure do not mutate local state. A repeated successful import of the same bundle is
an exact no-op and must not change progress or duplicate events, fills, journal entries, attempts,
XP, mastery, or review schedule.

Portable settings are not identity-merged. Local disclaimer acceptance always wins. Restoring the
five portable settings is an explicit choice, defaulting off when the target already contains
learner data.

## 8. Transaction and persistence boundary

Import calls one repository-level merge operation. It must not loop through public per-record save
methods or write normalized SQL directly. The repository revalidates and merges one complete
snapshot through the adapter transaction; SQLite then updates authoritative and mirror data inside
its exclusive transaction so a late trigger or journal constraint rolls everything back.

Web import must participate in the same named cross-document Web Lock as normal localStorage writes.
If the runtime cannot provide the required cross-document lock, import fails closed rather than
claiming atomicity across browser tabs.

No persistence schema bump is required solely to import logical records. The target keeps its
installed content/projector/persistence metadata and supported migrations. Imported exact scenario,
dataset, policy, cost-model, session, order, position, event, and attempt identities remain pinned.

## 9. Corrupt current stores and deletion

Normal import is additive only. Milestone 8 does not implement a destructive replace-corrupt import
mode and never silently falls back to deletion. A typed initialization failure distinguishes:

- `unsupported-newer-schema`: update the app; do not offer reset;
- `transient`: retry; do not offer reset; and
- `corrupt-store`: expose recovery information and a separately confirmed user deletion path.

User-requested local-data deletion remains separate from bundle import. If a later milestone adds
replace-corrupt restore, it must validate the encrypted bundle first, require a distinct destructive
confirmation, offer a fresh export/salvage of every still-readable local record, and apply once with
explicit deletion authority.

## 10. User experience and accessibility

Settings and the dedicated Hebrew RTL recovery route provide:

- export and import entry points;
- category and sensitive-data selection;
- password entry without storage, with clear minimum/limitations;
- file selection/share using OS-controlled surfaces;
- dry-run bundle summary and category counts;
- conflicts shown by safe category/stable ID and reason, never by dumping journal/raw payload text;
- explicit confirmation and exact imported/skipped/conflicting counts; and
- post-import verification, accessible live-region updates, focus movement/restoration, wrapped
  actions, 44-point targets, largest-text support, reduced-motion behavior, and LTR isolation for
  filenames, times, versions, counts, IDs, and hashes.

Recovery files contain private local learning data even when journal categories are excluded. The
learner is responsible for protecting the chosen file destination and remembering the password.
ChartPath has no server-side copy and cannot recover a forgotten password.

## 11. Backup-policy outcome

Native opaque backup remains excluded:

- iOS: the entire mutable `Documents/SQLite` directory is marked excluded from backup and verified
  before the standalone database is opened; and
- Android: `android:allowBackup="false"` remains enforced.

The encrypted RecoveryBundle is the supported user-controlled portability mechanism. Enabling broad
OS backup, copying SQLite/WAL files, or adding cloud sync requires a new architecture/privacy review.
