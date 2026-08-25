# Trade-management journal policy

Status: Milestone 6 implemented and locally verified; the bounded iOS lifecycle preserved one
action rationale, while full native correction/debrief and assistive-technology gates remain open.

The management journal is append-only evidence of what was visible, why an action was chosen and
what uncertainty was recorded at a particular replay cutoff. It is not a diary of future outcomes,
a brokerage statement, a performance leaderboard or a mechanism for retroactively improving a
grade.

## 1. Entry types

The schema supports three immutable entry kinds:

- **Observation** — learner-authored visible evidence at the exact current candle cutoff.
- **Action rationale** — created automatically when a material draft is submitted. It is linked to
  the submission ID and immutable submission order and copies the submitted rationale and evidence
  tags.
- **Correction** — a new entry that identifies a prior journal entry and supplies corrected text
  and tags. It never edits, replaces or hides the original.

Each entry pins session ID, deterministic zero-based journal order, candle index, candle timestamp,
recorded-at timestamp, text and evidence tags. Action rationales additionally pin related action ID
and one-based submission order. Corrections may reference only an entry already present in the same
canonical journal, so the reference cannot point forward.

## 2. Cutoff and authorship rules

Observations and corrections are recorded against the session's exact last processed candle.
Action rationales inherit the submitted draft's exact cutoff N and are stored before N+1 is exposed.
An observation cannot claim a different candle, and a stale material draft cannot be submitted after
replay advances.

The supported tags describe the asserted basis—predefined plan, visible price evidence, structural
change, risk budget, invalidation, target, voluntary exit rule, execution costs and recorded
uncertainty. Tags are evidence labels, not automatic proof that the text is true. Runtime grading is
deterministic and may use only the pinned rubric and submitted structured evidence.

The app does not infer journal prose, rewrite it with AI or create fake reviewer approval. A future
optional tutor may explain a rubric but may not alter an entry, the evidence cutoff or the grade.

## 3. Append-only and correction contract

Journal order and identity are permanent. Repository saves require the existing journal to remain a
byte-equivalent canonical prefix. Reusing an entry ID with changed data is a conflict. Native SQLite
stores each entry in `management_journal_entries` with unique `(session_id, sequence)` and triggers
that reject update and delete.

A correction adds context; it does not erase the original or change the linked material action. If a
submitted action itself is still pending, it must be cancelled explicitly; journal correction is
not cancellation. Once a management session is persisted terminal, the whole session is read-only,
so no post-hoc observation or correction can be appended through the repository.

Explicit learner-authorized local-data reset remains the only ordinary deletion boundary and removes
the aggregate and its journal mirrors together. Schema migration may rebuild mirrors only through
the explicit migration path. Corrupt or source-divergent payloads are quarantined with their
canonical JSON retained; they are not silently discarded or accepted as current evidence.

## 4. Process rubric and P&L separation

The debrief evaluates process evidence, not whether the simulated price later moved favorably.
Invariant checks cover:

- original 1R remained frozen;
- every material action has its linked rationale entry;
- required risk warnings were acknowledged;
- future information was excluded;
- journal history was preserved; and
- P&L was not used for the process grade.

Scenario-authored criteria then evaluate allowed decision bases, risk review, relevant evidence tags
and any minimum action requirement. A profitable action can still need review; a loss can follow a
coherent process. `outcome-chasing` and `future-information` are explicit negative evidence, not
hindsight shortcuts. Ambiguous candles pause with an indeterminate outcome rather than letting an
assumed sequence validate the journal.

Journal entries and assessment in the current management variants have learning credit `none`.
They cannot create attempts or alter lesson completion, mastery, review scheduling, XP, streaks or
daily activity.

## 5. Privacy and educational safety

Journal text is local learner-authored data and may contain sensitive personal or financial context.
ChartPath requires no account, cloud sync, analytics, AI key or brokerage connection, and the beta
does not transmit journal content. Do not enter brokerage credentials, account numbers, tax data,
personal identifiers or real trade instructions.

Screens and exports must frame entries as observations and process evidence, never as personalized
financial advice. Tickers, prices, quantities, dates, IDs and equations remain explicit LTR spans
inside the Hebrew RTL interface. Accessibility alternatives must expose entry kind, order, cutoff,
tags, correction linkage and related-action linkage without relying on color or chart geometry.

## 6. Source boundary

The reviewed source supports precommitment, written plans, invalidation and risk review, management,
process documentation and post-case review. Relevant audited references are physical PDF pages 51,
54, 59 and 62–79, corresponding to printed pages 38, 41, 46 and 49–66. The most direct reviewed
curriculum pins are Unit 8 risk exercises and `u10-capstone-e05`.

The source does not prescribe ChartPath's database schema, entry IDs, correction graph, N/N+1 event
ordering, FIFO allocation, checksum strategy or ambiguity state. Those are clearly labelled neutral
simulator and integrity mechanics, not quotations or universal trading doctrine. Original source
wording stays in the reviewed content records with exact page ranges; this policy paraphrases the
boundary.

## 7. Verification and remaining gates

Domain, persistence and browser tests cover submit/reload/advance/reload identity, correction
preservation, idempotent retry, quarantine and no-credit projection isolation. The bounded iOS
simulator run preserved one action rationale across termination/relaunch and ended with one
management row, one journal row and one fill after N+1; `PRAGMA integrity_check` passed. The 13
inspected browser views include the journal timeline and process debrief.

The native run did not exercise a correction, terminal debrief, VoiceOver/TalkBack reading order,
largest OS text, Android, physical hardware or a signed build. Those remain open distribution
gates; the browser and bounded simulator evidence is not relabeled as a human accessibility pass.
