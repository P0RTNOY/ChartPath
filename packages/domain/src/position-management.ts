import {
  assertValidPaperExecutionSession,
  type CostModel,
  type ExecutionSide,
  type HistoricalExecutionIdentity,
  type PaperExecutionSession,
  type TradeDirection,
} from './paper-execution.js';
import type { OhlcvCandle } from './types.js';

export const POSITION_MANAGEMENT_SCHEMA_VERSION = 1 as const;
export const POSITION_MANAGEMENT_POLICY_VERSION = 'position-management-policy-v1' as const;

export interface PositionManagementPolicy {
  readonly version: typeof POSITION_MANAGEMENT_POLICY_VERSION;
  readonly actionTiming: 'cutoff-n-eligible-n-plus-one';
  readonly replacementPriority: 'activate-before-opening-thresholds';
  readonly voluntaryOpeningConflict: 'pause-as-ambiguous';
  readonly intrabarThresholdConflict: 'pause-as-ambiguous';
  readonly voluntaryFillPoint: 'next-candle-open';
  readonly scaleInMaximumInitialQuantityBps: 10_000;
  readonly softRiskLimitOriginalRBps: 10_000;
  readonly hardRiskLimitOriginalRBps: 20_000;
  readonly automaticTrailing: false;
}

export const DEFAULT_POSITION_MANAGEMENT_POLICY: PositionManagementPolicy = Object.freeze({
  version: POSITION_MANAGEMENT_POLICY_VERSION,
  actionTiming: 'cutoff-n-eligible-n-plus-one',
  replacementPriority: 'activate-before-opening-thresholds',
  voluntaryOpeningConflict: 'pause-as-ambiguous',
  intrabarThresholdConflict: 'pause-as-ambiguous',
  voluntaryFillPoint: 'next-candle-open',
  scaleInMaximumInitialQuantityBps: 10_000,
  softRiskLimitOriginalRBps: 10_000,
  hardRiskLimitOriginalRBps: 20_000,
  automaticTrailing: false,
});

export type PositionManagementMaterialIntent =
  | { readonly kind: 'full-exit' }
  | { readonly kind: 'partial-exit'; readonly quantityUnits: number }
  | {
      readonly kind: 'scale-in';
      readonly quantityUnits: number;
      readonly estimatedEntryPrice: number;
    }
  | { readonly kind: 'replace-stop'; readonly price: number }
  | { readonly kind: 'replace-target'; readonly price: number };

export type PositionManagementMaterialActionKind = PositionManagementMaterialIntent['kind'];

export type PositionManagementEvidenceTag =
  | 'predefined-plan'
  | 'visible-price-evidence'
  | 'structural-change'
  | 'risk-budget'
  | 'invalidation-rule'
  | 'target-rule'
  | 'voluntary-exit-rule'
  | 'execution-costs'
  | 'uncertainty-recorded';

export type PositionManagementDecisionBasis =
  | 'predefined-plan'
  | 'new-visible-evidence'
  | 'risk-reduction'
  | 'outcome-chasing'
  | 'future-information';

export interface PositionManagementProcessEvidence {
  readonly decisionBasis: PositionManagementDecisionBasis;
  readonly riskReviewed: boolean;
  readonly evidenceTags: readonly PositionManagementEvidenceTag[];
}

export type PositionManagementRubricCriterion =
  | {
      readonly criterionId: string;
      readonly kind: 'decision-basis';
      readonly accepted: readonly PositionManagementDecisionBasis[];
    }
  | {
      readonly criterionId: string;
      readonly kind: 'risk-reviewed';
      readonly required: true;
    }
  | {
      readonly criterionId: string;
      readonly kind: 'evidence-tags';
      readonly accepted: readonly PositionManagementEvidenceTag[];
      readonly minimumMatches: number;
    }
  | {
      readonly criterionId: string;
      readonly kind: 'risk-warning-acknowledged';
      readonly required: true;
    }
  | {
      readonly criterionId: string;
      readonly kind: 'minimum-material-actions';
      readonly minimum: number;
    };

export interface PositionManagementRubricV1 {
  readonly schemaVersion: 1;
  readonly criteria: readonly PositionManagementRubricCriterion[];
}

export interface PositionManagementRiskLimits {
  readonly maxOpenQuantityUnits: number;
  readonly maxScaleInInitialQuantityBps: number;
  readonly softRiskLimitOriginalRBps: number;
  readonly hardRiskLimitOriginalRBps: number;
}

export interface PositionManagementAuthority {
  readonly schemaVersion: 1;
  readonly permissionVersion: string;
  readonly permittedActionKinds: readonly PositionManagementMaterialActionKind[];
  readonly rubricId: string;
  readonly rubricVersion: string;
  readonly rubricChecksum: string;
  readonly rubric: PositionManagementRubricV1;
  readonly riskLimits: PositionManagementRiskLimits;
  readonly learningCredit: 'course' | 'none';
}

export type PositionManagementRiskCode =
  | 'PROJECTED_RISK_EXCEEDS_ORIGINAL_1R'
  | 'PROJECTED_RISK_EXCEEDS_HARD_LIMIT'
  | 'SCALE_IN_EXCEEDS_QUANTITY_LIMIT';

export interface PositionManagementRiskAssessment {
  readonly projectedRiskMinor: number;
  readonly originalRiskMinor: number;
  readonly warningCodes: readonly PositionManagementRiskCode[];
  readonly hardRejectionCodes: readonly PositionManagementRiskCode[];
}

export interface PositionManagementDraft {
  readonly draftId: string;
  readonly intent: PositionManagementMaterialIntent;
  readonly rationale: string;
  readonly processEvidence: PositionManagementProcessEvidence;
  readonly authoredAtCandleIndex: number;
  readonly lastEditId: string;
  readonly updatedAt: string;
  readonly riskAssessment: PositionManagementRiskAssessment;
}

export interface SubmittedPositionManagementAction {
  readonly submissionId: string;
  readonly draftId: string;
  readonly intent: PositionManagementMaterialIntent;
  readonly rationale: string;
  readonly processEvidence: PositionManagementProcessEvidence;
  readonly submittedAtCandleIndex: number;
  readonly eligibleCandleIndex: number;
  readonly submittedAt: string;
  readonly acknowledgedRiskWarningCodes: readonly PositionManagementRiskCode[];
  readonly riskAssessment: PositionManagementRiskAssessment;
}

export interface PositionManagementFill {
  readonly side: ExecutionSide;
  readonly reason: 'voluntary-exit' | 'scale-in' | 'protective-stop' | 'target';
  readonly candleIndex: number;
  readonly timestamp: string;
  readonly referencePriceMinor: number;
  readonly priceMinor: number;
  readonly quantityUnits: number;
  readonly commissionMinor: number;
  readonly modeledExecutionCostMinor: number;
  readonly gap: boolean;
  readonly priceCappedByTarget: boolean;
}

export interface PositionManagementLot {
  readonly lotId: string;
  readonly openedBy: 'paper-handoff' | 'scale-in';
  readonly entryCandleIndex: number;
  readonly entryPriceMinor: number;
  readonly initialQuantityUnits: number;
  readonly openQuantityUnits: number;
  readonly entryCommissionMinor: number;
  readonly unallocatedEntryCommissionMinor: number;
}

export interface RealizedPositionSlice {
  readonly lotId: string;
  readonly exitFillId: string;
  readonly quantityUnits: number;
  readonly grossMinor: number;
  readonly allocatedEntryCommissionMinor: number;
}

export interface PositionManagementAccounting {
  readonly grossRealizedMinor: number;
  readonly allocatedEntryCommissionMinor: number;
  readonly exitCommissionMinor: number;
  readonly realizedNetMinor: number;
  readonly modeledExecutionCostMinor: number;
  readonly realizedSlices: readonly RealizedPositionSlice[];
}

export type PositionManagementStatus =
  'active' | 'closed-voluntary' | 'closed-stop' | 'closed-target' | 'ambiguous' | 'completed-open';

export type PositionManagementAmbiguityReason =
  'voluntary-action-and-opening-threshold' | 'stop-and-target-same-candle';

export interface PositionManagementJournalObservation {
  readonly kind: 'observation';
  readonly entryId: string;
  readonly sessionId: string;
  readonly entryOrder: number;
  readonly candleIndex: number;
  readonly candleTimestamp: string;
  readonly text: string;
  readonly evidenceTags: readonly PositionManagementEvidenceTag[];
  readonly recordedAt: string;
}

export interface PositionManagementJournalActionRationale {
  readonly kind: 'action-rationale';
  readonly entryId: string;
  readonly sessionId: string;
  readonly entryOrder: number;
  readonly candleIndex: number;
  readonly candleTimestamp: string;
  readonly relatedActionId: string;
  readonly submissionOrder: number;
  readonly text: string;
  readonly evidenceTags: readonly PositionManagementEvidenceTag[];
  readonly recordedAt: string;
}

export interface PositionManagementJournalCorrection {
  readonly kind: 'correction';
  readonly entryId: string;
  readonly sessionId: string;
  readonly entryOrder: number;
  readonly candleIndex: number;
  readonly candleTimestamp: string;
  readonly correctsEntryId: string;
  readonly text: string;
  readonly evidenceTags: readonly PositionManagementEvidenceTag[];
  readonly recordedAt: string;
}

export type PositionManagementJournalEntry =
  | PositionManagementJournalObservation
  | PositionManagementJournalActionRationale
  | PositionManagementJournalCorrection;

interface BasePositionManagementEvent {
  readonly eventId: string;
  readonly sequence: number;
  readonly occurredAt: string;
  readonly candleIndex?: number;
}

export type PositionManagementEvent =
  | (BasePositionManagementEvent & {
      readonly type: 'management-session-created';
      readonly paperExecutionSessionId: string;
      readonly authority: PositionManagementAuthority;
    })
  | (BasePositionManagementEvent & {
      readonly type: 'management-draft-edited';
      readonly editId: string;
      readonly draftId: string;
      readonly intent: PositionManagementMaterialIntent;
      readonly rationale: string;
      readonly processEvidence: PositionManagementProcessEvidence;
    })
  | (BasePositionManagementEvent & {
      readonly type: 'management-action-submitted';
      readonly submissionId: string;
      readonly draftId: string;
      readonly intent: PositionManagementMaterialIntent;
      readonly rationale: string;
      readonly processEvidence: PositionManagementProcessEvidence;
      readonly rationaleJournalEntryId: string;
      readonly submissionOrder: number;
      readonly journalEntryOrder: number;
      readonly cutoffCandleTimestamp: string;
      readonly acknowledgedRiskWarningCodes: readonly PositionManagementRiskCode[];
      readonly warningCodes: readonly PositionManagementRiskCode[];
    })
  | (BasePositionManagementEvent & {
      readonly type: 'management-action-cancelled';
      readonly cancellationId: string;
      readonly submissionId: string;
    })
  | (BasePositionManagementEvent & {
      readonly type: 'management-action-risk-rejected';
      readonly submissionId: string;
      readonly issueCodes: readonly PositionManagementRiskCode[];
    })
  | (BasePositionManagementEvent & {
      readonly type: 'protective-stop-replaced';
      readonly submissionId: string;
      readonly previousPriceTicks: number;
      readonly priceTicks: number;
    })
  | (BasePositionManagementEvent & {
      readonly type: 'target-replaced';
      readonly submissionId: string;
      readonly previousPriceTicks: number;
      readonly priceTicks: number;
    })
  | (BasePositionManagementEvent & {
      readonly type: 'voluntary-exit-filled';
      readonly submissionId: string;
      readonly fillId: string;
      readonly fill: PositionManagementFill;
    })
  | (BasePositionManagementEvent & {
      readonly type: 'scale-in-filled';
      readonly submissionId: string;
      readonly fillId: string;
      readonly lotId: string;
      readonly fill: PositionManagementFill;
    })
  | (BasePositionManagementEvent & {
      readonly type: 'position-closed-stop' | 'position-closed-target';
      readonly fillId: string;
      readonly fill: PositionManagementFill;
    })
  | (BasePositionManagementEvent & {
      readonly type: 'position-management-ambiguous';
      readonly reason: PositionManagementAmbiguityReason;
      readonly submissionId?: string;
    })
  | (BasePositionManagementEvent & {
      readonly type: 'management-observation-recorded';
      readonly entryId: string;
      readonly text: string;
      readonly evidenceTags: readonly PositionManagementEvidenceTag[];
      readonly journalEntryOrder: number;
      readonly cutoffCandleTimestamp: string;
    })
  | (BasePositionManagementEvent & {
      readonly type: 'management-journal-corrected';
      readonly entryId: string;
      readonly correctsEntryId: string;
      readonly text: string;
      readonly evidenceTags: readonly PositionManagementEvidenceTag[];
      readonly journalEntryOrder: number;
      readonly cutoffCandleTimestamp: string;
    })
  | (BasePositionManagementEvent & { readonly type: 'position-open-at-replay-end' });

export interface ProcessedPositionManagementCandle {
  readonly index: number;
  readonly timestamp: string;
  readonly fingerprint: string;
}

export interface PositionManagementProcessAssessmentItem {
  readonly id: string;
  readonly source: 'invariant' | 'authored-rubric';
  readonly result: 'met' | 'not-met' | 'review';
}

export interface PositionManagementDebrief {
  readonly debriefId: string;
  readonly outcome:
    'voluntary-exit' | 'protective-stop' | 'target' | 'ambiguous' | 'open-at-replay-end';
  readonly outcomeDeterminate: boolean;
  readonly processQuality: 'coherent' | 'mixed' | 'needs-review';
  readonly processAssessment: readonly PositionManagementProcessAssessmentItem[];
  readonly originalRiskMinor: number;
  readonly grossRealizedMinor: number;
  readonly realizedNetMinor: number;
  readonly realizedRiskNumeratorMinor: number;
  readonly realizedRiskDenominatorMinor: number;
  readonly initialQuantityUnits: number;
  readonly finalOpenQuantityUnits: number;
  readonly materialActionCount: number;
  readonly journalEntryCount: number;
  readonly assumptionCodes: readonly string[];
  readonly createdAt: string;
}

export interface PositionManagementSnapshot {
  readonly cutoffCandleIndex: number;
  readonly markCloseMinor: number;
  readonly initialQuantityUnits: number;
  readonly openQuantityUnits: number;
  readonly closedQuantityUnits: number;
  readonly weightedAverageEntryNumeratorMinorUnits: number;
  readonly weightedAverageEntryDenominatorUnits: number;
  readonly activeProtectiveStopMinor: number;
  readonly activeTargetMinor: number;
  readonly currentRiskMinor: number;
  readonly unrealizedAtCloseGrossMinor: number;
  readonly hypotheticalLiquidationNetMinor: number;
  readonly grossRealizedMinor: number;
  readonly realizedNetMinor: number;
  readonly totalEntryCommissionMinor: number;
  readonly totalExitCommissionMinor: number;
  readonly totalCommissionMinor: number;
  readonly totalModeledExecutionCostMinor: number;
  readonly originalRiskMinor: number;
  readonly pendingAction?: SubmittedPositionManagementAction;
}

export interface PositionManagementIntentPreview {
  readonly intent: PositionManagementMaterialIntent;
  readonly riskAssessment: PositionManagementRiskAssessment;
  readonly beforeOpenQuantityUnits: number;
  readonly afterOpenQuantityUnits: number;
  readonly beforeWeightedAverageEntryNumeratorMinorUnits: number;
  readonly beforeWeightedAverageEntryDenominatorUnits: number;
  readonly afterWeightedAverageEntryNumeratorMinorUnits: number;
  readonly afterWeightedAverageEntryDenominatorUnits: number;
  readonly estimatedAdditionalCommissionMinor: number;
  readonly estimatedAdditionalModeledExecutionCostMinor: number;
}

export interface PositionManagementSession {
  readonly schemaVersion: typeof POSITION_MANAGEMENT_SCHEMA_VERSION;
  readonly revision: number;
  readonly sessionId: string;
  readonly debriefId: string;
  readonly handoff: PaperExecutionSession;
  readonly source: HistoricalExecutionIdentity;
  readonly authority: PositionManagementAuthority;
  readonly policy: PositionManagementPolicy;
  readonly costModel: CostModel;
  readonly status: PositionManagementStatus;
  readonly direction: TradeDirection;
  readonly priceTickMinor: number;
  readonly currencyDecimals: number;
  readonly quantityIncrement: number;
  readonly originalRiskMinor: number;
  readonly initialQuantityUnits: number;
  readonly openQuantityUnits: number;
  readonly activeProtectiveStopTicks: number;
  readonly activeTargetTicks: number;
  readonly lots: readonly PositionManagementLot[];
  readonly fills: readonly { readonly fillId: string; readonly fill: PositionManagementFill }[];
  readonly accounting: PositionManagementAccounting;
  readonly draft?: PositionManagementDraft;
  readonly pendingAction?: SubmittedPositionManagementAction;
  readonly ambiguityReason?: PositionManagementAmbiguityReason;
  readonly journal: readonly PositionManagementJournalEntry[];
  readonly events: readonly PositionManagementEvent[];
  readonly processedCandles: readonly ProcessedPositionManagementCandle[];
  readonly lastProcessedCandleIndex: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly debrief?: PositionManagementDebrief;
}

export interface CreatePositionManagementSessionInput {
  readonly sessionId: string;
  readonly debriefId: string;
  readonly openPaperExecutionSession: PaperExecutionSession;
  readonly authority: PositionManagementAuthority;
  readonly createdAt: string;
  readonly policy?: PositionManagementPolicy;
}

/** Canonical pure cross-platform checksum for the exact embedded authored rubric. */
export function computePositionManagementRubricChecksum(
  rubric: PositionManagementRubricV1,
): string {
  return `sha256:${sha256Hex(canonicalSerialize(rubric))}`;
}

export type PositionManagementAction =
  | {
      readonly type: 'edit-draft';
      readonly editId: string;
      readonly draftId: string;
      readonly intent: PositionManagementMaterialIntent;
      readonly rationale: string;
      readonly processEvidence: PositionManagementProcessEvidence;
      readonly authoredAtCandleIndex: number;
      readonly updatedAt: string;
    }
  | {
      readonly type: 'submit-draft';
      readonly submissionId: string;
      readonly draftId: string;
      readonly acknowledgedRiskWarningCodes: readonly PositionManagementRiskCode[];
      readonly submittedAt: string;
    }
  | {
      readonly type: 'cancel-pending';
      readonly cancellationId: string;
      readonly submissionId: string;
      readonly cancelledAt: string;
    }
  | {
      readonly type: 'record-observation';
      readonly entryId: string;
      readonly candleIndex: number;
      readonly text: string;
      readonly evidenceTags?: readonly PositionManagementEvidenceTag[];
      readonly recordedAt: string;
    }
  | {
      readonly type: 'correct-journal';
      readonly entryId: string;
      readonly correctsEntryId: string;
      readonly text: string;
      readonly evidenceTags?: readonly PositionManagementEvidenceTag[];
      readonly recordedAt: string;
    }
  | {
      readonly type: 'process-candles';
      readonly candles: readonly OhlcvCandle[];
      readonly processedAt: string;
    }
  | { readonly type: 'complete-replay'; readonly completedAt: string };

export function createPositionManagementSession(
  input: CreatePositionManagementSessionInput,
): PositionManagementSession {
  assertValidPaperExecutionSession(input.openPaperExecutionSession);
  const handoff = clone(input.openPaperExecutionSession);
  if (handoff.status !== 'open' || handoff.position?.status !== 'open') {
    throw new Error('Position management requires an exact open paper execution session');
  }
  assertId(input.sessionId, 'Position management session ID');
  assertId(input.debriefId, 'Position management debrief ID');
  assertTimestamp(input.createdAt, 'Position management creation timestamp');
  const policy = input.policy ?? DEFAULT_POSITION_MANAGEMENT_POLICY;
  assertPolicy(policy);
  const scale = 10 ** handoff.costModel.currencyDecimals;
  const priceTickMinor = exactSafeInteger(
    handoff.costModel.priceTick * scale,
    'Price tick must map exactly to currency minor units',
  );
  const quantityIncrement = exactSafeInteger(
    handoff.costModel.quantityIncrement,
    'Position management v1 requires a whole-number quantity increment',
  );
  if (priceTickMinor <= 0 || quantityIncrement <= 0)
    throw new RangeError('Position management increments must be positive');
  const entryPriceMinor = moneyToMinor(
    handoff.position.entryFill.price,
    handoff.costModel.currencyDecimals,
    'Paper entry fill price',
  );
  const initialQuantityUnits = quantityToUnits(handoff.position.quantity, quantityIncrement);
  const entryCommissionMinor = moneyToMinor(
    handoff.position.entryFill.commission,
    handoff.costModel.currencyDecimals,
    'Paper entry commission',
  );
  const initialLot: PositionManagementLot = {
    lotId: `${input.sessionId}:lot:0`,
    openedBy: 'paper-handoff',
    entryCandleIndex: handoff.position.openedAtCandleIndex,
    entryPriceMinor,
    initialQuantityUnits,
    openQuantityUnits: initialQuantityUnits,
    entryCommissionMinor,
    unallocatedEntryCommissionMinor: entryCommissionMinor,
  };
  const created: PositionManagementSession = {
    schemaVersion: POSITION_MANAGEMENT_SCHEMA_VERSION,
    revision: 0,
    sessionId: input.sessionId,
    debriefId: input.debriefId,
    handoff,
    source: clone(handoff.source),
    authority: clone(input.authority),
    policy: { ...policy },
    costModel: { ...handoff.costModel },
    status: 'active',
    direction: handoff.position.direction,
    priceTickMinor,
    currencyDecimals: handoff.costModel.currencyDecimals,
    quantityIncrement,
    originalRiskMinor: moneyToMinor(
      handoff.plan.estimatedTotalRisk,
      handoff.costModel.currencyDecimals,
      'Original 1R',
    ),
    initialQuantityUnits,
    openQuantityUnits: initialQuantityUnits,
    activeProtectiveStopTicks: priceToTicks(
      handoff.position.protectiveStopPrice,
      scale,
      priceTickMinor,
      'Initial protective stop',
    ),
    activeTargetTicks: priceToTicks(
      handoff.position.targetPrice,
      scale,
      priceTickMinor,
      'Initial target',
    ),
    lots: [initialLot],
    fills: [],
    accounting: emptyAccounting(
      roundedMoneyToMinor(
        handoff.position.quantity *
          (handoff.position.entryFill.modeledSpreadAmount +
            handoff.position.entryFill.modeledSlippageAmount),
        handoff.costModel.currencyDecimals,
        'Paper entry modeled execution cost',
      ),
    ),
    journal: [],
    events: [
      makeEvent(input.sessionId, 0, input.createdAt, 'management-session-created', {
        paperExecutionSessionId: handoff.sessionId,
        authority: clone(input.authority),
        candleIndex: handoff.lastProcessedCandleIndex,
      }),
    ],
    processedCandles: [],
    lastProcessedCandleIndex: handoff.lastProcessedCandleIndex,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
  assertValidPositionManagementSession(created);
  return created;
}

export function reducePositionManagementSession(
  session: PositionManagementSession,
  action: PositionManagementAction,
): PositionManagementSession {
  assertValidPositionManagementSession(session);
  const priorById = actionIdentity(session, action);
  if (priorById === 'same') return session;
  if (priorById === 'changed')
    throw new Error('Position management action ID was reused with changed data');
  let next: PositionManagementSession;
  switch (action.type) {
    case 'edit-draft':
      next = editDraft(session, action);
      break;
    case 'submit-draft':
      next = submitDraft(session, action);
      break;
    case 'cancel-pending':
      next = cancelPending(session, action);
      break;
    case 'record-observation':
      next = recordObservation(session, action);
      break;
    case 'correct-journal':
      next = correctJournal(session, action);
      break;
    case 'process-candles':
      next = processCandles(session, action);
      break;
    case 'complete-replay':
      next = completeReplay(session, action.completedAt);
      break;
  }
  if (next === session) return session;
  const revised = { ...next, revision: session.revision + 1 };
  const withDebrief = isTerminal(revised.status)
    ? { ...revised, debrief: createPositionManagementDebrief(revised, revised.updatedAt) }
    : revised;
  assertValidPositionManagementSession(withDebrief);
  return withDebrief;
}

export function assertValidPositionManagementSession(
  session: PositionManagementSession,
): asserts session is PositionManagementSession {
  if (session.schemaVersion !== POSITION_MANAGEMENT_SCHEMA_VERSION)
    throw new Error(`Unsupported position management schema: ${String(session.schemaVersion)}`);
  assertId(session.sessionId, 'Position management session ID');
  assertId(session.debriefId, 'Position management debrief ID');
  assertValidPaperExecutionSession(session.handoff);
  if (session.handoff.status !== 'open' || session.handoff.position?.status !== 'open')
    throw new Error('Position management handoff must remain an immutable open paper session');
  if (!structurallyEqual(session.source, session.handoff.source))
    throw new Error('Position management source differs from its exact paper handoff');
  assertAuthority(session.authority, session.source, session.initialQuantityUnits);
  if (!structurallyEqual(session.costModel, session.handoff.costModel))
    throw new Error('Position management cost model differs from its paper handoff');
  const expectedScale = 10 ** session.handoff.costModel.currencyDecimals;
  if (
    session.currencyDecimals !== session.handoff.costModel.currencyDecimals ||
    session.priceTickMinor !==
      exactSafeInteger(
        session.handoff.costModel.priceTick * expectedScale,
        'Handoff price tick minor units',
      ) ||
    session.quantityIncrement !==
      exactSafeInteger(session.handoff.costModel.quantityIncrement, 'Handoff quantity increment')
  )
    throw new Error('Position management numeric pins differ from the exact paper handoff');
  assertPolicy(session.policy);
  if (!Number.isSafeInteger(session.revision) || session.revision < 0)
    throw new RangeError('Position management revision must be a non-negative safe integer');
  assertTimestamp(session.createdAt, 'Position management creation timestamp');
  assertTimestamp(session.updatedAt, 'Position management update timestamp');
  if (Date.parse(session.updatedAt) < Date.parse(session.createdAt))
    throw new RangeError('Position management update precedes creation');
  for (const value of [
    session.priceTickMinor,
    session.quantityIncrement,
    session.originalRiskMinor,
    session.initialQuantityUnits,
    session.openQuantityUnits,
    session.activeProtectiveStopTicks,
    session.activeTargetTicks,
  ])
    assertNonNegativeSafeInteger(value, 'Position management authoritative integer');
  if (
    session.priceTickMinor === 0 ||
    session.quantityIncrement === 0 ||
    session.originalRiskMinor === 0 ||
    session.initialQuantityUnits === 0
  )
    throw new RangeError('Position management authoritative amounts must be positive');
  const expectedOriginalRisk = moneyToMinor(
    session.handoff.plan.estimatedTotalRisk,
    session.currencyDecimals,
    'Original 1R',
  );
  if (session.originalRiskMinor !== expectedOriginalRisk)
    throw new Error('Original 1R is not frozen from the paper handoff');
  if (session.direction !== session.handoff.position.direction)
    throw new Error('Position management direction differs from the paper handoff');
  if (session.draft) {
    assertId(session.draft.draftId, 'Management draft ID');
    assertId(session.draft.lastEditId, 'Management draft edit ID');
    assertText(session.draft.rationale, 'Management draft rationale');
    assertTimestamp(session.draft.updatedAt, 'Management draft timestamp');
    assertProcessEvidence(session.draft.processEvidence);
  }
  if (session.pendingAction) {
    assertId(session.pendingAction.submissionId, 'Management submission ID');
    assertId(session.pendingAction.draftId, 'Management draft ID');
    assertText(session.pendingAction.rationale, 'Submitted management rationale');
    assertTimestamp(session.pendingAction.submittedAt, 'Management submission timestamp');
    assertProcessEvidence(session.pendingAction.processEvidence);
  }
  assertLots(session);
  assertAccounting(session.accounting);
  assertEvents(session.events, session);
  assertDerivedHistory(session);
  assertProcessedCandles(session);
  assertJournal(session);
  if (session.draft && session.pendingAction)
    throw new Error('A submitted material action cannot remain editable');
  if (session.draft) {
    assertProcessEvidence(session.draft.processEvidence);
    validateIntent(session, session.draft.intent);
    if (session.draft.authoredAtCandleIndex !== session.lastProcessedCandleIndex)
      throw new Error('Management draft does not match the current cutoff');
    if (!structurallyEqual(assessRisk(session, session.draft.intent), session.draft.riskAssessment))
      throw new Error('Management draft risk assessment is not deterministic');
  }
  if (
    session.pendingAction &&
    session.pendingAction.eligibleCandleIndex !== session.lastProcessedCandleIndex + 1
  )
    throw new Error('Pending material action eligibility does not follow the current cutoff');
  if (session.pendingAction) {
    assertProcessEvidence(session.pendingAction.processEvidence);
    validateIntent(session, session.pendingAction.intent);
    const canonicalRisk = assessRisk(session, session.pendingAction.intent);
    if (!structurallyEqual(canonicalRisk, session.pendingAction.riskAssessment))
      throw new Error('Submitted management risk assessment is not deterministic');
    if (
      canonicalRisk.warningCodes.some(
        (code) => !session.pendingAction!.acknowledgedRiskWarningCodes.includes(code),
      )
    )
      throw new Error('Submitted management action is missing a required risk acknowledgement');
  }
  if (session.pendingAction && session.status !== 'active')
    throw new Error('Terminal position management cannot contain a pending action');
  if (session.status === 'active' && session.openQuantityUnits === 0)
    throw new Error('Active position management has no open quantity');
  if (
    ['closed-voluntary', 'closed-stop', 'closed-target'].includes(session.status) &&
    session.openQuantityUnits !== 0
  )
    throw new Error('Closed position management retains open quantity');
  if (session.status === 'ambiguous' && !session.ambiguityReason)
    throw new Error('Ambiguous position management is missing its reason');
  if (isTerminal(session.status)) {
    if (!session.debrief) throw new Error('Terminal position management is missing its debrief');
    const canonical = createPositionManagementDebrief(session, session.debrief.createdAt);
    if (!structurallyEqual(canonical, session.debrief))
      throw new Error('Position management debrief differs from deterministic state');
  } else if (session.debrief)
    throw new Error('Active position management contains a terminal debrief');
}

export function createPositionManagementDebrief(
  session: PositionManagementSession,
  createdAt: string,
): PositionManagementDebrief {
  assertTimestamp(createdAt, 'Position management debrief timestamp');
  const submissions = session.events.filter(
    (entry): entry is Extract<PositionManagementEvent, { type: 'management-action-submitted' }> =>
      entry.type === 'management-action-submitted',
  );
  const warningAcknowledged = submissions.every((entry) =>
    entry.warningCodes.every((code) => entry.acknowledgedRiskWarningCodes.includes(code)),
  );
  const assessment: PositionManagementProcessAssessmentItem[] = [
    { id: 'original-risk-frozen', source: 'invariant', result: 'met' },
    {
      id: 'material-rationale-recorded',
      source: 'invariant',
      result: submissions.every(({ rationaleJournalEntryId }) =>
        session.journal.some(
          (entry) => entry.kind === 'action-rationale' && entry.entryId === rationaleJournalEntryId,
        ),
      )
        ? 'met'
        : 'not-met',
    },
    {
      id: 'risk-warnings-acknowledged',
      source: 'invariant',
      result: warningAcknowledged ? 'met' : 'not-met',
    },
    {
      id: 'future-evidence-excluded',
      source: 'invariant',
      result: submissions.every(
        ({ processEvidence }) => processEvidence.decisionBasis !== 'future-information',
      )
        ? 'met'
        : 'not-met',
    },
    { id: 'journal-history-preserved', source: 'invariant', result: 'met' },
    { id: 'outcome-not-used-for-process-grade', source: 'invariant', result: 'met' },
    ...session.authority.rubric.criteria.map(
      (criterion): PositionManagementProcessAssessmentItem => ({
        id: criterion.criterionId,
        source: 'authored-rubric',
        result:
          criterion.kind === 'minimum-material-actions'
            ? submissions.length >= criterion.minimum
              ? 'met'
              : 'not-met'
            : submissions.every((submission) => rubricCriterionMet(criterion, submission))
              ? 'met'
              : 'not-met',
      }),
    ),
  ];
  const notMet = assessment.filter(({ result }) => result === 'not-met').length;
  const review = assessment.filter(({ result }) => result === 'review').length;
  const processQuality = notMet > 0 ? 'needs-review' : review > 0 ? 'mixed' : 'coherent';
  return {
    debriefId: session.debriefId,
    outcome:
      session.status === 'closed-voluntary'
        ? 'voluntary-exit'
        : session.status === 'closed-stop'
          ? 'protective-stop'
          : session.status === 'closed-target'
            ? 'target'
            : session.status === 'ambiguous'
              ? 'ambiguous'
              : 'open-at-replay-end',
    outcomeDeterminate: session.status !== 'ambiguous',
    processQuality,
    processAssessment: assessment,
    originalRiskMinor: session.originalRiskMinor,
    grossRealizedMinor: session.accounting.grossRealizedMinor,
    realizedNetMinor: session.accounting.realizedNetMinor,
    realizedRiskNumeratorMinor: session.accounting.realizedNetMinor,
    realizedRiskDenominatorMinor: session.originalRiskMinor,
    initialQuantityUnits: session.initialQuantityUnits,
    finalOpenQuantityUnits: session.openQuantityUnits,
    materialActionCount: submissions.length,
    journalEntryCount: session.journal.length,
    assumptionCodes: [
      session.policy.version,
      session.handoff.executionPolicy.version,
      session.costModel.version,
      'safe-integer-minor-and-tick-units',
      'fifo-realized-accounting',
      'process-independent-of-pnl',
    ],
    createdAt,
  };
}

function rubricCriterionMet(
  criterion: PositionManagementRubricCriterion,
  submission: Extract<PositionManagementEvent, { type: 'management-action-submitted' }>,
): boolean {
  switch (criterion.kind) {
    case 'decision-basis':
      return criterion.accepted.includes(submission.processEvidence.decisionBasis);
    case 'risk-reviewed':
      return submission.processEvidence.riskReviewed;
    case 'evidence-tags':
      return (
        submission.processEvidence.evidenceTags.filter((tag) => criterion.accepted.includes(tag))
          .length >= criterion.minimumMatches
      );
    case 'risk-warning-acknowledged':
      return submission.warningCodes.every((code) =>
        submission.acknowledgedRiskWarningCodes.includes(code),
      );
    case 'minimum-material-actions':
      return true;
  }
}

/** Returns the complete accounting projection at the exact last visible candle only. */
export function selectPositionManagementSnapshot(
  session: PositionManagementSession,
  lastVisibleCandle: OhlcvCandle,
): PositionManagementSnapshot {
  assertValidPositionManagementSession(session);
  assertCandle(lastVisibleCandle, session.source.candleCount);
  if (lastVisibleCandle.index !== session.lastProcessedCandleIndex)
    throw new Error('Position snapshot requires the exact last visible completed candle');
  const checkpoint =
    lastVisibleCandle.index === session.handoff.lastProcessedCandleIndex
      ? session.handoff.processedCandles.find(({ index }) => index === lastVisibleCandle.index)
      : session.processedCandles.find(({ index }) => index === lastVisibleCandle.index);
  if (!checkpoint || checkpoint.fingerprint !== candleFingerprint(lastVisibleCandle))
    throw new Error('Position snapshot candle differs from the persisted exact checkpoint');
  const markCloseMinor = candlePriceToTickMinor(
    lastVisibleCandle.close,
    session,
    'Position snapshot close',
  );
  const weighted = weightedOpenEntry(session.lots);
  let unrealizedAtCloseGrossMinor = 0;
  const hypotheticalExitMinor = adversePriceMinor(
    session,
    exitSide(session.direction),
    markCloseMinor,
  );
  let hypotheticalLiquidationGrossMinor = 0;
  let unallocatedEntryCommissionMinor = 0;
  for (const lot of session.lots) {
    const closeDelta =
      session.direction === 'long'
        ? markCloseMinor - lot.entryPriceMinor
        : lot.entryPriceMinor - markCloseMinor;
    const liquidationDelta =
      session.direction === 'long'
        ? hypotheticalExitMinor - lot.entryPriceMinor
        : lot.entryPriceMinor - hypotheticalExitMinor;
    unrealizedAtCloseGrossMinor = safeAddSigned(
      unrealizedAtCloseGrossMinor,
      safeMultiply(closeDelta, quantityAmount(session, lot.openQuantityUnits)),
    );
    hypotheticalLiquidationGrossMinor = safeAddSigned(
      hypotheticalLiquidationGrossMinor,
      safeMultiply(liquidationDelta, quantityAmount(session, lot.openQuantityUnits)),
    );
    unallocatedEntryCommissionMinor = safeAdd(
      unallocatedEntryCommissionMinor,
      lot.unallocatedEntryCommissionMinor,
    );
  }
  const hypotheticalExitCommission =
    session.openQuantityUnits === 0 ? 0 : commissionMinor(session, session.openQuantityUnits);
  const totalEntryCommissionMinor = session.lots.reduce(
    (sum, lot) => safeAdd(sum, lot.entryCommissionMinor),
    0,
  );
  return {
    cutoffCandleIndex: session.lastProcessedCandleIndex,
    markCloseMinor,
    initialQuantityUnits: session.initialQuantityUnits,
    openQuantityUnits: session.openQuantityUnits,
    closedQuantityUnits: session.lots.reduce(
      (sum, lot) => safeAdd(sum, lot.initialQuantityUnits - lot.openQuantityUnits),
      0,
    ),
    weightedAverageEntryNumeratorMinorUnits: weighted.numerator,
    weightedAverageEntryDenominatorUnits: weighted.denominator,
    activeProtectiveStopMinor: ticksToMinor(
      session.activeProtectiveStopTicks,
      session.priceTickMinor,
    ),
    activeTargetMinor: ticksToMinor(session.activeTargetTicks, session.priceTickMinor),
    currentRiskMinor: projectedRiskMinor(session, session.activeProtectiveStopTicks),
    unrealizedAtCloseGrossMinor,
    hypotheticalLiquidationNetMinor:
      hypotheticalLiquidationGrossMinor -
      unallocatedEntryCommissionMinor -
      hypotheticalExitCommission,
    grossRealizedMinor: session.accounting.grossRealizedMinor,
    realizedNetMinor: session.accounting.realizedNetMinor,
    totalEntryCommissionMinor,
    totalExitCommissionMinor: session.accounting.exitCommissionMinor,
    totalCommissionMinor: safeAdd(
      totalEntryCommissionMinor,
      session.accounting.exitCommissionMinor,
    ),
    totalModeledExecutionCostMinor: session.accounting.modeledExecutionCostMinor,
    originalRiskMinor: session.originalRiskMinor,
    ...(session.pendingAction ? { pendingAction: clone(session.pendingAction) } : {}),
  };
}

/** Previews a neutral material intent without mutating the aggregate or grading its rationale. */
export function previewPositionManagementIntent(
  session: PositionManagementSession,
  intent: PositionManagementMaterialIntent,
): PositionManagementIntentPreview {
  assertValidPositionManagementSession(session);
  assertActive(session);
  validateIntent(session, intent);
  const before = weightedOpenEntry(session.lots);
  let afterOpenQuantityUnits = session.openQuantityUnits;
  let after = before;
  let estimatedAdditionalCommissionMinor = 0;
  let estimatedAdditionalModeledExecutionCostMinor = 0;
  if (intent.kind === 'full-exit') {
    afterOpenQuantityUnits = 0;
    after = { numerator: 0, denominator: 0 };
    estimatedAdditionalCommissionMinor = commissionMinor(session, session.openQuantityUnits);
  } else if (intent.kind === 'partial-exit') {
    afterOpenQuantityUnits -= intent.quantityUnits;
    const projectedLots = consumeLotsWithoutAccounting(session.lots, intent.quantityUnits);
    after = weightedOpenEntry(projectedLots);
    estimatedAdditionalCommissionMinor = commissionMinor(session, intent.quantityUnits);
  } else if (intent.kind === 'scale-in') {
    const referenceMinor = moneyToMinor(
      intent.estimatedEntryPrice,
      session.currencyDecimals,
      'Estimated scale-in price',
    );
    const fillMinor = adversePriceMinor(session, entrySide(session.direction), referenceMinor);
    afterOpenQuantityUnits = safeAdd(afterOpenQuantityUnits, intent.quantityUnits);
    after = {
      numerator: safeAdd(before.numerator, safeMultiply(fillMinor, intent.quantityUnits)),
      denominator: afterOpenQuantityUnits,
    };
    estimatedAdditionalCommissionMinor = commissionMinor(session, intent.quantityUnits);
    estimatedAdditionalModeledExecutionCostMinor = safeMultiply(
      Math.abs(fillMinor - referenceMinor),
      quantityAmount(session, intent.quantityUnits),
    );
  }
  return {
    intent: clone(intent),
    riskAssessment: assessRisk(session, intent),
    beforeOpenQuantityUnits: session.openQuantityUnits,
    afterOpenQuantityUnits,
    beforeWeightedAverageEntryNumeratorMinorUnits: before.numerator,
    beforeWeightedAverageEntryDenominatorUnits: before.denominator,
    afterWeightedAverageEntryNumeratorMinorUnits: after.numerator,
    afterWeightedAverageEntryDenominatorUnits: after.denominator,
    estimatedAdditionalCommissionMinor,
    estimatedAdditionalModeledExecutionCostMinor,
  };
}

function editDraft(
  session: PositionManagementSession,
  action: Extract<PositionManagementAction, { type: 'edit-draft' }>,
): PositionManagementSession {
  assertActive(session);
  assertActionTime(session, action.updatedAt);
  if (session.pendingAction) throw new Error('Only one pending material action is allowed');
  [action.editId, action.draftId].forEach((id) => assertId(id, 'Management draft identifier'));
  if (action.authoredAtCandleIndex !== session.lastProcessedCandleIndex)
    throw new Error('Management draft must use the exact current candle cutoff');
  assertText(action.rationale, 'Management rationale');
  assertProcessEvidence(action.processEvidence);
  validateIntent(session, action.intent);
  const riskAssessment = assessRisk(session, action.intent);
  const draft: PositionManagementDraft = {
    draftId: action.draftId,
    intent: clone(action.intent),
    rationale: action.rationale,
    processEvidence: clone(action.processEvidence),
    authoredAtCandleIndex: action.authoredAtCandleIndex,
    lastEditId: action.editId,
    updatedAt: action.updatedAt,
    riskAssessment,
  };
  return {
    ...session,
    draft,
    updatedAt: action.updatedAt,
    events: appendEvent(session, action.updatedAt, 'management-draft-edited', {
      editId: action.editId,
      draftId: action.draftId,
      intent: clone(action.intent),
      rationale: action.rationale,
      processEvidence: clone(action.processEvidence),
      candleIndex: session.lastProcessedCandleIndex,
    }),
  };
}

function submitDraft(
  session: PositionManagementSession,
  action: Extract<PositionManagementAction, { type: 'submit-draft' }>,
): PositionManagementSession {
  assertActive(session);
  assertActionTime(session, action.submittedAt);
  assertId(action.submissionId, 'Management submission ID');
  if (session.pendingAction) throw new Error('Only one pending material action is allowed');
  const draft = session.draft;
  if (!draft || draft.draftId !== action.draftId)
    throw new Error('Management submission does not match the editable draft');
  if (draft.authoredAtCandleIndex !== session.lastProcessedCandleIndex)
    throw new Error('A stale management draft cannot be submitted after replay advances');
  if (draft.riskAssessment.hardRejectionCodes.length > 0)
    throw new Error(
      `Management action exceeds hard risk limits: ${draft.riskAssessment.hardRejectionCodes.join(',')}`,
    );
  const acknowledgements = uniqueSorted(action.acknowledgedRiskWarningCodes);
  const missing = draft.riskAssessment.warningCodes.filter(
    (code) => !acknowledgements.includes(code),
  );
  if (missing.length > 0)
    throw new Error(
      `Management risk warnings require explicit acknowledgement: ${missing.join(',')}`,
    );
  const pendingAction: SubmittedPositionManagementAction = {
    submissionId: action.submissionId,
    draftId: draft.draftId,
    intent: clone(draft.intent),
    rationale: draft.rationale,
    processEvidence: clone(draft.processEvidence),
    submittedAtCandleIndex: draft.authoredAtCandleIndex,
    eligibleCandleIndex: draft.authoredAtCandleIndex + 1,
    submittedAt: action.submittedAt,
    acknowledgedRiskWarningCodes: acknowledgements,
    riskAssessment: clone(draft.riskAssessment),
  };
  const submissionOrder =
    session.events.filter(({ type }) => type === 'management-action-submitted').length + 1;
  const journalEntryOrder = session.journal.length;
  const cutoffCandleTimestamp = candleTimestampAtCutoff(session, session.lastProcessedCandleIndex);
  const rationaleEntry: PositionManagementJournalActionRationale = {
    kind: 'action-rationale',
    entryId: action.submissionId,
    sessionId: session.sessionId,
    entryOrder: journalEntryOrder,
    candleIndex: session.lastProcessedCandleIndex,
    candleTimestamp: cutoffCandleTimestamp,
    relatedActionId: action.submissionId,
    submissionOrder,
    text: draft.rationale,
    evidenceTags: [...draft.processEvidence.evidenceTags],
    recordedAt: action.submittedAt,
  };
  return {
    ...session,
    draft: undefined,
    pendingAction,
    journal: [...session.journal, rationaleEntry],
    updatedAt: action.submittedAt,
    events: appendEvent(session, action.submittedAt, 'management-action-submitted', {
      submissionId: action.submissionId,
      draftId: draft.draftId,
      intent: clone(draft.intent),
      rationale: draft.rationale,
      processEvidence: clone(draft.processEvidence),
      rationaleJournalEntryId: rationaleEntry.entryId,
      submissionOrder,
      journalEntryOrder,
      cutoffCandleTimestamp,
      acknowledgedRiskWarningCodes: acknowledgements,
      warningCodes: draft.riskAssessment.warningCodes,
      candleIndex: session.lastProcessedCandleIndex,
    }),
  };
}

function cancelPending(
  session: PositionManagementSession,
  action: Extract<PositionManagementAction, { type: 'cancel-pending' }>,
): PositionManagementSession {
  assertActive(session);
  assertActionTime(session, action.cancelledAt);
  assertId(action.cancellationId, 'Management cancellation ID');
  if (!session.pendingAction || session.pendingAction.submissionId !== action.submissionId)
    throw new Error('Only the exact pending material action can be cancelled');
  return {
    ...session,
    pendingAction: undefined,
    updatedAt: action.cancelledAt,
    events: appendEvent(session, action.cancelledAt, 'management-action-cancelled', {
      cancellationId: action.cancellationId,
      submissionId: action.submissionId,
      candleIndex: session.lastProcessedCandleIndex,
    }),
  };
}

function recordObservation(
  session: PositionManagementSession,
  action: Extract<PositionManagementAction, { type: 'record-observation' }>,
): PositionManagementSession {
  assertActionTime(session, action.recordedAt);
  assertId(action.entryId, 'Management journal entry ID');
  assertText(action.text, 'Management journal observation');
  const evidenceTags = uniqueSorted(action.evidenceTags ?? []);
  assertEvidenceTags(evidenceTags, 'Management journal evidence tags');
  if (action.candleIndex !== session.lastProcessedCandleIndex)
    throw new Error('Management journal observation must use the exact current replay cutoff');
  const candleTimestamp = candleTimestampAtCutoff(session, action.candleIndex);
  const entryOrder = session.journal.length;
  const entry: PositionManagementJournalObservation = {
    kind: 'observation',
    entryId: action.entryId,
    sessionId: session.sessionId,
    entryOrder,
    candleIndex: action.candleIndex,
    candleTimestamp,
    text: action.text,
    evidenceTags,
    recordedAt: action.recordedAt,
  };
  return refreshDebrief({
    ...session,
    journal: [...session.journal, entry],
    updatedAt: action.recordedAt,
    events: appendEvent(session, action.recordedAt, 'management-observation-recorded', {
      entryId: action.entryId,
      text: action.text,
      evidenceTags,
      journalEntryOrder: entryOrder,
      cutoffCandleTimestamp: candleTimestamp,
      candleIndex: action.candleIndex,
    }),
  });
}

function correctJournal(
  session: PositionManagementSession,
  action: Extract<PositionManagementAction, { type: 'correct-journal' }>,
): PositionManagementSession {
  assertActionTime(session, action.recordedAt);
  [action.entryId, action.correctsEntryId].forEach((id) => assertId(id, 'Management journal ID'));
  assertText(action.text, 'Management journal correction');
  const evidenceTags = uniqueSorted(action.evidenceTags ?? []);
  assertEvidenceTags(evidenceTags, 'Management journal correction tags');
  if (!session.journal.some(({ entryId }) => entryId === action.correctsEntryId))
    throw new Error('Management correction must reference an existing journal entry');
  const candleIndex = session.lastProcessedCandleIndex;
  const candleTimestamp = candleTimestampAtCutoff(session, candleIndex);
  const entryOrder = session.journal.length;
  const entry: PositionManagementJournalCorrection = {
    kind: 'correction',
    entryId: action.entryId,
    sessionId: session.sessionId,
    entryOrder,
    candleIndex,
    candleTimestamp,
    correctsEntryId: action.correctsEntryId,
    text: action.text,
    evidenceTags,
    recordedAt: action.recordedAt,
  };
  return refreshDebrief({
    ...session,
    journal: [...session.journal, entry],
    updatedAt: action.recordedAt,
    events: appendEvent(session, action.recordedAt, 'management-journal-corrected', {
      entryId: action.entryId,
      correctsEntryId: action.correctsEntryId,
      text: action.text,
      evidenceTags,
      journalEntryOrder: entryOrder,
      cutoffCandleTimestamp: candleTimestamp,
      candleIndex,
    }),
  });
}

function processCandles(
  session: PositionManagementSession,
  action: Extract<PositionManagementAction, { type: 'process-candles' }>,
): PositionManagementSession {
  assertActionTime(session, action.processedAt);
  let next = session;
  let changed = false;
  for (const candle of action.candles) {
    assertCandle(candle, session.source.candleCount);
    const fingerprint = candleFingerprint(candle);
    const existing = next.processedCandles.find(({ index }) => index === candle.index);
    if (existing) {
      if (existing.fingerprint !== fingerprint || existing.timestamp !== candle.timestamp)
        throw new Error(`Managed candle ${candle.index} differs from its persisted checkpoint`);
      continue;
    }
    if (isTerminal(next.status))
      throw new Error('Terminal position management cannot process a new candle');
    if (candle.index !== next.lastProcessedCandleIndex + 1)
      throw new Error(
        `Position management candles must be sequential; expected ${next.lastProcessedCandleIndex + 1}`,
      );
    next = processOneCandle(next, candle, action.processedAt);
    next = {
      ...next,
      processedCandles: [
        ...next.processedCandles,
        { index: candle.index, timestamp: candle.timestamp, fingerprint },
      ],
      lastProcessedCandleIndex: candle.index,
      updatedAt: action.processedAt,
    };
    changed = true;
  }
  return changed ? next : session;
}

function processOneCandle(
  session: PositionManagementSession,
  candle: OhlcvCandle,
  processedAt: string,
): PositionManagementSession {
  let next = session;
  const pending = next.pendingAction;
  if (pending && pending.eligibleCandleIndex !== candle.index)
    throw new Error('Pending material action missed its exact eligible candle');

  if (pending?.intent.kind === 'replace-stop') {
    const ticks = priceToTicks(
      pending.intent.price,
      10 ** next.currencyDecimals,
      next.priceTickMinor,
      'Replacement stop',
    );
    next = {
      ...next,
      activeProtectiveStopTicks: ticks,
      pendingAction: undefined,
      events: appendEvent(next, candle.timestamp, 'protective-stop-replaced', {
        submissionId: pending.submissionId,
        previousPriceTicks: next.activeProtectiveStopTicks,
        priceTicks: ticks,
        candleIndex: candle.index,
      }),
    };
  } else if (pending?.intent.kind === 'replace-target') {
    const ticks = priceToTicks(
      pending.intent.price,
      10 ** next.currencyDecimals,
      next.priceTickMinor,
      'Replacement target',
    );
    next = {
      ...next,
      activeTargetTicks: ticks,
      pendingAction: undefined,
      events: appendEvent(next, candle.timestamp, 'target-replaced', {
        submissionId: pending.submissionId,
        previousPriceTicks: next.activeTargetTicks,
        priceTicks: ticks,
        candleIndex: candle.index,
      }),
    };
  }

  const openMinor = candlePriceToTickMinor(candle.open, next, 'Candle open');
  const stopMinor = ticksToMinor(next.activeProtectiveStopTicks, next.priceTickMinor);
  const targetMinor = ticksToMinor(next.activeTargetTicks, next.priceTickMinor);
  const openingStop = next.direction === 'long' ? openMinor <= stopMinor : openMinor >= stopMinor;
  const openingTarget =
    next.direction === 'long' ? openMinor >= targetMinor : openMinor <= targetMinor;
  const voluntary = pending && isVoluntaryIntent(pending.intent) ? pending : undefined;
  if (voluntary && (openingStop || openingTarget))
    return ambiguous(
      next,
      candle,
      'voluntary-action-and-opening-threshold',
      voluntary.submissionId,
      processedAt,
    );

  if (voluntary) {
    if (voluntary.intent.kind === 'scale-in') {
      const fill = marketFill(
        next,
        candle,
        entrySide(next.direction),
        voluntary.intent.quantityUnits,
        'scale-in',
      );
      const candidateLot: PositionManagementLot = {
        lotId: `${next.sessionId}:lot:${next.lots.length}`,
        openedBy: 'scale-in',
        entryCandleIndex: candle.index,
        entryPriceMinor: fill.priceMinor,
        initialQuantityUnits: fill.quantityUnits,
        openQuantityUnits: fill.quantityUnits,
        entryCommissionMinor: fill.commissionMinor,
        unallocatedEntryCommissionMinor: fill.commissionMinor,
      };
      const exactRisk = projectedRiskMinor(next, next.activeProtectiveStopTicks, candidateLot);
      if (exactRisk > hardRiskLimitMinor(next)) {
        next = {
          ...next,
          pendingAction: undefined,
          events: appendEvent(next, candle.timestamp, 'management-action-risk-rejected', {
            submissionId: voluntary.submissionId,
            issueCodes: ['PROJECTED_RISK_EXCEEDS_HARD_LIMIT'],
            candleIndex: candle.index,
          }),
        };
      } else {
        const fillId = `${next.sessionId}:fill:${next.fills.length}`;
        next = {
          ...next,
          lots: [...next.lots, candidateLot],
          openQuantityUnits: safeAdd(next.openQuantityUnits, fill.quantityUnits),
          fills: [...next.fills, { fillId, fill }],
          accounting: {
            ...next.accounting,
            modeledExecutionCostMinor: safeAdd(
              next.accounting.modeledExecutionCostMinor,
              fill.modeledExecutionCostMinor,
            ),
          },
          pendingAction: undefined,
          events: appendEvent(next, candle.timestamp, 'scale-in-filled', {
            submissionId: voluntary.submissionId,
            fillId,
            lotId: candidateLot.lotId,
            fill,
            candleIndex: candle.index,
          }),
        };
      }
    } else {
      let quantityUnits: number;
      if (voluntary.intent.kind === 'full-exit') quantityUnits = next.openQuantityUnits;
      else if (voluntary.intent.kind === 'partial-exit')
        quantityUnits = voluntary.intent.quantityUnits;
      else throw new Error('Unexpected voluntary material action');
      const fill = marketFill(
        next,
        candle,
        exitSide(next.direction),
        quantityUnits,
        'voluntary-exit',
      );
      const fillId = `${next.sessionId}:fill:${next.fills.length}`;
      next = realizeExit(next, fillId, fill);
      next = {
        ...next,
        status: next.openQuantityUnits === 0 ? 'closed-voluntary' : 'active',
        fills: [...next.fills, { fillId, fill }],
        pendingAction: undefined,
        events: appendEvent(next, candle.timestamp, 'voluntary-exit-filled', {
          submissionId: voluntary.submissionId,
          fillId,
          fill,
          candleIndex: candle.index,
        }),
      };
      if (next.status === 'closed-voluntary') return { ...next, updatedAt: processedAt };
    }
  }

  if (openingStop || openingTarget) {
    if (openingStop && openingTarget)
      return ambiguous(next, candle, 'stop-and-target-same-candle', undefined, processedAt);
    return closeAtThreshold(
      next,
      candle,
      openingStop ? 'protective-stop' : 'target',
      true,
      processedAt,
    );
  }
  const lowMinor = candlePriceToTickMinor(candle.low, next, 'Candle low');
  const highMinor = candlePriceToTickMinor(candle.high, next, 'Candle high');
  const stopTouched = next.direction === 'long' ? lowMinor <= stopMinor : highMinor >= stopMinor;
  const targetTouched =
    next.direction === 'long' ? highMinor >= targetMinor : lowMinor <= targetMinor;
  if (stopTouched && targetTouched)
    return ambiguous(next, candle, 'stop-and-target-same-candle', undefined, processedAt);
  if (stopTouched || targetTouched)
    return closeAtThreshold(
      next,
      candle,
      stopTouched ? 'protective-stop' : 'target',
      false,
      processedAt,
    );
  return next;
}

function closeAtThreshold(
  session: PositionManagementSession,
  candle: OhlcvCandle,
  reason: 'protective-stop' | 'target',
  gap: boolean,
  processedAt: string,
): PositionManagementSession {
  const fill =
    reason === 'protective-stop'
      ? stopFill(session, candle, gap)
      : targetFill(session, candle, gap);
  const fillId = `${session.sessionId}:fill:${session.fills.length}`;
  let next = realizeExit(session, fillId, fill);
  next = {
    ...next,
    status: reason === 'protective-stop' ? 'closed-stop' : 'closed-target',
    fills: [...next.fills, { fillId, fill }],
    pendingAction: undefined,
    updatedAt: processedAt,
    events: appendEvent(
      next,
      candle.timestamp,
      reason === 'protective-stop' ? 'position-closed-stop' : 'position-closed-target',
      {
        fillId,
        fill,
        candleIndex: candle.index,
      },
    ),
  };
  return next;
}

function ambiguous(
  session: PositionManagementSession,
  candle: OhlcvCandle,
  reason: PositionManagementAmbiguityReason,
  submissionId: string | undefined,
  processedAt: string,
): PositionManagementSession {
  return {
    ...session,
    status: 'ambiguous',
    ambiguityReason: reason,
    pendingAction: undefined,
    updatedAt: processedAt,
    events: appendEvent(session, candle.timestamp, 'position-management-ambiguous', {
      reason,
      ...(submissionId ? { submissionId } : {}),
      candleIndex: candle.index,
    }),
  };
}

function completeReplay(
  session: PositionManagementSession,
  completedAt: string,
): PositionManagementSession {
  assertActionTime(session, completedAt);
  if (session.lastProcessedCandleIndex !== session.source.candleCount - 1)
    throw new Error('Position management replay cannot complete before the pinned final candle');
  if (isTerminal(session.status)) return session;
  if (session.pendingAction)
    throw new Error('Cancel the pending material action before completing replay');
  return {
    ...session,
    status: 'completed-open',
    updatedAt: completedAt,
    events: appendEvent(session, completedAt, 'position-open-at-replay-end', {
      candleIndex: session.lastProcessedCandleIndex,
    }),
  };
}

function validateIntent(
  session: PositionManagementSession,
  intent: PositionManagementMaterialIntent,
): void {
  if (!session.authority.permittedActionKinds.includes(intent.kind))
    throw new Error(
      `Position management action is not permitted by the pinned scenario: ${intent.kind}`,
    );
  const scale = 10 ** session.currencyDecimals;
  switch (intent.kind) {
    case 'full-exit':
      return;
    case 'partial-exit':
      assertPositiveSafeInteger(intent.quantityUnits, 'Partial exit quantity units');
      if (intent.quantityUnits >= session.openQuantityUnits)
        throw new Error(
          'Partial exit must leave an open exact-unit remainder; use full exit otherwise',
        );
      return;
    case 'scale-in':
      assertPositiveSafeInteger(intent.quantityUnits, 'Scale-in quantity units');
      priceToTicks(
        intent.estimatedEntryPrice,
        scale,
        session.priceTickMinor,
        'Estimated scale-in price',
      );
      return;
    case 'replace-stop': {
      const ticks = priceToTicks(intent.price, scale, session.priceTickMinor, 'Replacement stop');
      if (ticks === session.activeProtectiveStopTicks)
        throw new Error('Replacement stop must change');
      if (
        session.direction === 'long'
          ? ticks >= session.activeTargetTicks
          : ticks <= session.activeTargetTicks
      )
        throw new Error('Replacement stop must remain on the protective side of the target');
      return;
    }
    case 'replace-target': {
      const ticks = priceToTicks(intent.price, scale, session.priceTickMinor, 'Replacement target');
      if (ticks === session.activeTargetTicks) throw new Error('Replacement target must change');
      if (
        session.direction === 'long'
          ? ticks <= session.activeProtectiveStopTicks
          : ticks >= session.activeProtectiveStopTicks
      )
        throw new Error('Replacement target must remain beyond the protective stop');
    }
  }
}

function assessRisk(
  session: PositionManagementSession,
  intent: PositionManagementMaterialIntent,
): PositionManagementRiskAssessment {
  let projectedRisk = projectedRiskMinor(session, session.activeProtectiveStopTicks);
  const hardRejectionCodes: PositionManagementRiskCode[] = [];
  if (intent.kind === 'replace-stop') {
    const ticks = priceToTicks(
      intent.price,
      10 ** session.currencyDecimals,
      session.priceTickMinor,
      'Replacement stop',
    );
    projectedRisk = projectedRiskMinor(session, ticks);
  } else if (intent.kind === 'scale-in') {
    const estimatedMinor = moneyToMinor(
      intent.estimatedEntryPrice,
      session.currencyDecimals,
      'Estimated scale-in price',
    );
    const estimatedLot: PositionManagementLot = {
      lotId: 'risk-estimate',
      openedBy: 'scale-in',
      entryCandleIndex: session.lastProcessedCandleIndex + 1,
      entryPriceMinor: adversePriceMinor(session, entrySide(session.direction), estimatedMinor),
      initialQuantityUnits: intent.quantityUnits,
      openQuantityUnits: intent.quantityUnits,
      entryCommissionMinor: commissionMinor(session, intent.quantityUnits),
      unallocatedEntryCommissionMinor: commissionMinor(session, intent.quantityUnits),
    };
    projectedRisk = projectedRiskMinor(session, session.activeProtectiveStopTicks, estimatedLot);
    const maxAddedUnits = Math.floor(
      safeBpsProduct(
        session.initialQuantityUnits,
        session.authority.riskLimits.maxScaleInInitialQuantityBps,
      ),
    );
    const priorScaleInUnits = session.lots
      .slice(1)
      .reduce((sum, lot) => safeAdd(sum, lot.initialQuantityUnits), 0);
    if (safeAdd(priorScaleInUnits, intent.quantityUnits) > maxAddedUnits)
      hardRejectionCodes.push('SCALE_IN_EXCEEDS_QUANTITY_LIMIT');
    if (
      safeAdd(session.openQuantityUnits, intent.quantityUnits) >
      session.authority.riskLimits.maxOpenQuantityUnits
    )
      hardRejectionCodes.push('SCALE_IN_EXCEEDS_QUANTITY_LIMIT');
  }
  if (projectedRisk > hardRiskLimitMinor(session))
    hardRejectionCodes.push('PROJECTED_RISK_EXCEEDS_HARD_LIMIT');
  const warningCodes: PositionManagementRiskCode[] = [];
  const softLimit = Math.floor(
    safeBpsProduct(
      session.originalRiskMinor,
      session.authority.riskLimits.softRiskLimitOriginalRBps,
    ),
  );
  if (projectedRisk > softLimit && hardRejectionCodes.length === 0)
    warningCodes.push('PROJECTED_RISK_EXCEEDS_ORIGINAL_1R');
  return {
    projectedRiskMinor: projectedRisk,
    originalRiskMinor: session.originalRiskMinor,
    warningCodes,
    hardRejectionCodes: uniqueSorted(hardRejectionCodes),
  };
}

function projectedRiskMinor(
  session: PositionManagementSession,
  stopTicks: number,
  extraLot?: PositionManagementLot,
): number {
  const lots = extraLot ? [...session.lots, extraLot] : session.lots;
  const stopReferenceMinor = ticksToMinor(stopTicks, session.priceTickMinor);
  const stopPriceMinor = adversePriceMinor(
    session,
    exitSide(session.direction),
    stopReferenceMinor,
  );
  const quantityUnits = lots.reduce((sum, lot) => safeAdd(sum, lot.openQuantityUnits), 0);
  let netAtStop = 0;
  let entryCommission = 0;
  for (const lot of lots) {
    const delta =
      session.direction === 'long'
        ? stopPriceMinor - lot.entryPriceMinor
        : lot.entryPriceMinor - stopPriceMinor;
    netAtStop = safeAddSigned(
      netAtStop,
      safeMultiply(delta, quantityAmount(session, lot.openQuantityUnits)),
    );
    entryCommission = safeAdd(entryCommission, lot.unallocatedEntryCommissionMinor);
  }
  netAtStop = safeAddSigned(netAtStop, -entryCommission);
  netAtStop = safeAddSigned(netAtStop, -commissionMinor(session, quantityUnits));
  return Math.max(0, -netAtStop);
}

function realizeExit(
  session: PositionManagementSession,
  fillId: string,
  fill: PositionManagementFill,
): PositionManagementSession {
  let remaining = fill.quantityUnits;
  let gross = 0;
  let allocatedEntryCommission = 0;
  const slices: RealizedPositionSlice[] = [];
  const lots = session.lots.map((lot) => {
    if (remaining === 0 || lot.openQuantityUnits === 0) return lot;
    const taken = Math.min(remaining, lot.openQuantityUnits);
    const allocation =
      taken === lot.openQuantityUnits
        ? lot.unallocatedEntryCommissionMinor
        : Math.floor((lot.entryCommissionMinor * taken) / lot.initialQuantityUnits);
    const delta =
      session.direction === 'long'
        ? fill.priceMinor - lot.entryPriceMinor
        : lot.entryPriceMinor - fill.priceMinor;
    const sliceGross = safeMultiply(delta, quantityAmount(session, taken));
    gross = safeAddSigned(gross, sliceGross);
    allocatedEntryCommission = safeAdd(allocatedEntryCommission, allocation);
    slices.push({
      lotId: lot.lotId,
      exitFillId: fillId,
      quantityUnits: taken,
      grossMinor: sliceGross,
      allocatedEntryCommissionMinor: allocation,
    });
    remaining -= taken;
    return {
      ...lot,
      openQuantityUnits: lot.openQuantityUnits - taken,
      unallocatedEntryCommissionMinor: lot.unallocatedEntryCommissionMinor - allocation,
    };
  });
  if (remaining !== 0) throw new Error('Exit fill exceeds the exact open quantity');
  const accounting: PositionManagementAccounting = {
    grossRealizedMinor: safeAddSigned(session.accounting.grossRealizedMinor, gross),
    allocatedEntryCommissionMinor: safeAdd(
      session.accounting.allocatedEntryCommissionMinor,
      allocatedEntryCommission,
    ),
    exitCommissionMinor: safeAdd(session.accounting.exitCommissionMinor, fill.commissionMinor),
    realizedNetMinor: safeAddSigned(
      session.accounting.realizedNetMinor,
      gross - allocatedEntryCommission - fill.commissionMinor,
    ),
    modeledExecutionCostMinor: safeAdd(
      session.accounting.modeledExecutionCostMinor,
      fill.modeledExecutionCostMinor,
    ),
    realizedSlices: [...session.accounting.realizedSlices, ...slices],
  };
  return {
    ...session,
    lots,
    openQuantityUnits: session.openQuantityUnits - fill.quantityUnits,
    accounting,
  };
}

function marketFill(
  session: PositionManagementSession,
  candle: OhlcvCandle,
  side: ExecutionSide,
  quantityUnits: number,
  reason: 'voluntary-exit' | 'scale-in',
): PositionManagementFill {
  const referencePriceMinor = candlePriceToTickMinor(candle.open, session, 'Market fill reference');
  const priceMinor = adversePriceMinor(session, side, referencePriceMinor);
  return {
    side,
    reason,
    candleIndex: candle.index,
    timestamp: candle.timestamp,
    referencePriceMinor,
    priceMinor,
    quantityUnits,
    commissionMinor: commissionMinor(session, quantityUnits),
    modeledExecutionCostMinor: safeMultiply(
      Math.abs(priceMinor - referencePriceMinor),
      quantityAmount(session, quantityUnits),
    ),
    gap: false,
    priceCappedByTarget: false,
  };
}

function stopFill(
  session: PositionManagementSession,
  candle: OhlcvCandle,
  gap: boolean,
): PositionManagementFill {
  const stopMinor = ticksToMinor(session.activeProtectiveStopTicks, session.priceTickMinor);
  const referencePriceMinor = gap
    ? candlePriceToTickMinor(candle.open, session, 'Stop gap reference')
    : stopMinor;
  const priceMinor = adversePriceMinor(session, exitSide(session.direction), referencePriceMinor);
  return {
    side: exitSide(session.direction),
    reason: 'protective-stop',
    candleIndex: candle.index,
    timestamp: candle.timestamp,
    referencePriceMinor,
    priceMinor,
    quantityUnits: session.openQuantityUnits,
    commissionMinor: commissionMinor(session, session.openQuantityUnits),
    modeledExecutionCostMinor: safeMultiply(
      Math.abs(priceMinor - referencePriceMinor),
      quantityAmount(session, session.openQuantityUnits),
    ),
    gap,
    priceCappedByTarget: false,
  };
}

function targetFill(
  session: PositionManagementSession,
  candle: OhlcvCandle,
  gap: boolean,
): PositionManagementFill {
  const priceMinor = ticksToMinor(session.activeTargetTicks, session.priceTickMinor);
  return {
    side: exitSide(session.direction),
    reason: 'target',
    candleIndex: candle.index,
    timestamp: candle.timestamp,
    referencePriceMinor: priceMinor,
    priceMinor,
    quantityUnits: session.openQuantityUnits,
    commissionMinor: commissionMinor(session, session.openQuantityUnits),
    modeledExecutionCostMinor: 0,
    gap,
    priceCappedByTarget: true,
  };
}

function adversePriceMinor(
  session: PositionManagementSession,
  side: ExecutionSide,
  referenceMinor: number,
): number {
  const adjustment = session.costModel.spreadBps + 2 * session.costModel.slippageBps;
  const denominator = 20_000;
  const multiplier = side === 'buy' ? denominator + adjustment : denominator - adjustment;
  const numerator = safeMultiply(referenceMinor, multiplier);
  const rawMinor = numerator / denominator;
  const tick = session.priceTickMinor;
  const ticks = side === 'buy' ? Math.ceil(rawMinor / tick) : Math.floor(rawMinor / tick);
  return safeMultiply(ticks, tick);
}

function commissionMinor(session: PositionManagementSession, quantityUnits: number): number {
  const quantity = quantityAmount(session, quantityUnits);
  const value = Math.max(
    session.costModel.minimumCommission,
    session.costModel.commissionFixed + session.costModel.commissionPerUnit * quantity,
  );
  const factor = 10 ** session.currencyDecimals;
  return assertNonNegativeSafeInteger(
    Math.ceil((value - Number.EPSILON) * factor),
    'Commission minor units',
  );
}

function quantityAmount(session: PositionManagementSession, quantityUnits: number): number {
  return safeMultiply(quantityUnits, session.quantityIncrement);
}

function actionIdentity(
  session: PositionManagementSession,
  action: PositionManagementAction,
): 'absent' | 'same' | 'changed' {
  const match = session.events.find((entry) => {
    switch (action.type) {
      case 'edit-draft':
        return entry.type === 'management-draft-edited' && entry.editId === action.editId;
      case 'submit-draft':
        return (
          entry.type === 'management-action-submitted' && entry.submissionId === action.submissionId
        );
      case 'cancel-pending':
        return (
          entry.type === 'management-action-cancelled' &&
          entry.cancellationId === action.cancellationId
        );
      case 'record-observation':
        return entry.type === 'management-observation-recorded' && entry.entryId === action.entryId;
      case 'correct-journal':
        return entry.type === 'management-journal-corrected' && entry.entryId === action.entryId;
      case 'process-candles':
        return undefined;
      case 'complete-replay':
        return (
          entry.type === 'position-open-at-replay-end' && entry.occurredAt === action.completedAt
        );
    }
  });
  if (!match) return 'absent';
  const comparable = eventComparableToAction(match, action);
  return structurallyEqual(comparable, action) ? 'same' : 'changed';
}

function eventComparableToAction(
  event: PositionManagementEvent,
  action: PositionManagementAction,
): unknown {
  switch (action.type) {
    case 'edit-draft':
      if (event.type !== 'management-draft-edited') return undefined;
      return {
        type: action.type,
        editId: event.editId,
        draftId: event.draftId,
        intent: event.intent,
        rationale: event.rationale,
        processEvidence: event.processEvidence,
        authoredAtCandleIndex: event.candleIndex,
        updatedAt: event.occurredAt,
      };
    case 'submit-draft':
      if (event.type !== 'management-action-submitted') return undefined;
      return {
        type: action.type,
        submissionId: event.submissionId,
        draftId: event.draftId,
        acknowledgedRiskWarningCodes: event.acknowledgedRiskWarningCodes,
        submittedAt: event.occurredAt,
      };
    case 'cancel-pending':
      if (event.type !== 'management-action-cancelled') return undefined;
      return {
        type: action.type,
        cancellationId: event.cancellationId,
        submissionId: event.submissionId,
        cancelledAt: event.occurredAt,
      };
    case 'record-observation':
      if (event.type !== 'management-observation-recorded') return undefined;
      return {
        type: action.type,
        entryId: event.entryId,
        candleIndex: event.candleIndex,
        text: event.text,
        ...(action.evidenceTags === undefined ? {} : { evidenceTags: event.evidenceTags }),
        recordedAt: event.occurredAt,
      };
    case 'correct-journal':
      if (event.type !== 'management-journal-corrected') return undefined;
      return {
        type: action.type,
        entryId: event.entryId,
        correctsEntryId: event.correctsEntryId,
        text: event.text,
        ...(action.evidenceTags === undefined ? {} : { evidenceTags: event.evidenceTags }),
        recordedAt: event.occurredAt,
      };
    case 'process-candles':
      return undefined;
    case 'complete-replay':
      return { type: action.type, completedAt: event.occurredAt };
  }
}

function hardRiskLimitMinor(session: PositionManagementSession): number {
  return Math.floor(
    safeBpsProduct(
      session.originalRiskMinor,
      session.authority.riskLimits.hardRiskLimitOriginalRBps,
    ),
  );
}

function refreshDebrief(session: PositionManagementSession): PositionManagementSession {
  return isTerminal(session.status)
    ? { ...session, debrief: createPositionManagementDebrief(session, session.updatedAt) }
    : session;
}

function assertLots(session: PositionManagementSession): void {
  let open = 0;
  const ids = new Set<string>();
  for (const lot of session.lots) {
    assertId(lot.lotId, 'Position lot ID');
    if (ids.has(lot.lotId)) throw new Error('Position lot identities must be unique');
    ids.add(lot.lotId);
    for (const value of [
      lot.entryCandleIndex,
      lot.entryPriceMinor,
      lot.initialQuantityUnits,
      lot.openQuantityUnits,
      lot.entryCommissionMinor,
      lot.unallocatedEntryCommissionMinor,
    ])
      assertNonNegativeSafeInteger(value, 'Position lot integer');
    if (lot.initialQuantityUnits === 0 || lot.openQuantityUnits > lot.initialQuantityUnits)
      throw new Error('Position lot quantity is inconsistent');
    if (lot.unallocatedEntryCommissionMinor > lot.entryCommissionMinor)
      throw new Error('Position lot commission allocation is inconsistent');
    open = safeAdd(open, lot.openQuantityUnits);
  }
  if (open !== session.openQuantityUnits)
    throw new Error('Open quantity differs from position lots');
}

function assertAccounting(accounting: PositionManagementAccounting): void {
  for (const value of [accounting.grossRealizedMinor, accounting.realizedNetMinor]) {
    if (!Number.isSafeInteger(value))
      throw new RangeError('Signed accounting must use safe integer minor units');
  }
  for (const value of [
    accounting.allocatedEntryCommissionMinor,
    accounting.exitCommissionMinor,
    accounting.modeledExecutionCostMinor,
  ])
    assertNonNegativeSafeInteger(value, 'Accounting minor units');
  if (
    accounting.realizedNetMinor !==
    accounting.grossRealizedMinor -
      accounting.allocatedEntryCommissionMinor -
      accounting.exitCommissionMinor
  )
    throw new Error('Realized net accounting is inconsistent');
  if (
    accounting.realizedSlices.reduce((sum, slice) => safeAddSigned(sum, slice.grossMinor), 0) !==
      accounting.grossRealizedMinor ||
    accounting.realizedSlices.reduce(
      (sum, slice) => safeAdd(sum, slice.allocatedEntryCommissionMinor),
      0,
    ) !== accounting.allocatedEntryCommissionMinor
  )
    throw new Error('Realized slice accounting is inconsistent');
}

function assertEvents(
  events: readonly PositionManagementEvent[],
  session: PositionManagementSession,
): void {
  if (events[0]?.type !== 'management-session-created')
    throw new Error('Management event history must begin with creation');
  if (!structurallyEqual(events[0].authority, session.authority))
    throw new Error('Position management authority differs from its immutable creation event');
  if (events[0].paperExecutionSessionId !== session.handoff.sessionId)
    throw new Error('Position management creation event differs from its paper handoff');
  events.forEach((entry, index) => {
    if (entry.sequence !== index || entry.eventId !== `${session.sessionId}:event:${index}`)
      throw new Error('Management events require deterministic sequential identities');
    assertTimestamp(entry.occurredAt, 'Management event timestamp');
    if (
      !isCandleDrivenEvent(entry) &&
      (Date.parse(entry.occurredAt) < Date.parse(session.createdAt) ||
        Date.parse(entry.occurredAt) > Date.parse(session.updatedAt))
    )
      throw new Error('Management event timestamp is outside the session lifetime');
    if (entry.type === 'management-draft-edited') {
      assertId(entry.editId, 'Management edit ID');
      assertId(entry.draftId, 'Management draft ID');
      assertText(entry.rationale, 'Management draft rationale');
      assertProcessEvidence(entry.processEvidence);
    } else if (entry.type === 'management-action-submitted') {
      assertId(entry.submissionId, 'Management submission ID');
      assertId(entry.draftId, 'Management draft ID');
      assertId(entry.rationaleJournalEntryId, 'Management rationale journal ID');
      assertText(entry.rationale, 'Submitted management rationale');
      assertProcessEvidence(entry.processEvidence);
      assertTimestamp(entry.cutoffCandleTimestamp, 'Management submission cutoff timestamp');
      assertPositiveSafeInteger(entry.submissionOrder, 'Management submission order');
      assertNonNegativeSafeInteger(entry.journalEntryOrder, 'Management journal entry order');
    } else if (entry.type === 'management-observation-recorded') {
      assertId(entry.entryId, 'Management observation ID');
      assertText(entry.text, 'Management observation text');
      assertEvidenceTags(entry.evidenceTags, 'Management observation evidence tags');
      assertTimestamp(entry.cutoffCandleTimestamp, 'Management observation cutoff timestamp');
      assertNonNegativeSafeInteger(entry.journalEntryOrder, 'Management journal entry order');
    } else if (entry.type === 'management-journal-corrected') {
      assertId(entry.entryId, 'Management correction ID');
      assertId(entry.correctsEntryId, 'Corrected management journal ID');
      assertText(entry.text, 'Management correction text');
      assertEvidenceTags(entry.evidenceTags, 'Management correction evidence tags');
      assertTimestamp(entry.cutoffCandleTimestamp, 'Management correction cutoff timestamp');
      assertNonNegativeSafeInteger(entry.journalEntryOrder, 'Management journal entry order');
    }
  });
}

function assertDerivedHistory(session: PositionManagementSession): void {
  const scale = 10 ** session.currencyDecimals;
  let expectedStop = priceToTicks(
    session.handoff.position!.protectiveStopPrice,
    scale,
    session.priceTickMinor,
    'Handoff stop',
  );
  let expectedTarget = priceToTicks(
    session.handoff.position!.targetPrice,
    scale,
    session.priceTickMinor,
    'Handoff target',
  );
  const eventFills: { readonly fillId: string; readonly fill: PositionManagementFill }[] = [];
  const scaleEvents: Extract<PositionManagementEvent, { type: 'scale-in-filled' }>[] = [];
  for (const entry of session.events) {
    if (entry.type === 'protective-stop-replaced') {
      if (entry.previousPriceTicks !== expectedStop)
        throw new Error('Protective-stop event history is discontinuous');
      expectedStop = entry.priceTicks;
    } else if (entry.type === 'target-replaced') {
      if (entry.previousPriceTicks !== expectedTarget)
        throw new Error('Target event history is discontinuous');
      expectedTarget = entry.priceTicks;
    } else if (
      entry.type === 'voluntary-exit-filled' ||
      entry.type === 'scale-in-filled' ||
      entry.type === 'position-closed-stop' ||
      entry.type === 'position-closed-target'
    ) {
      eventFills.push({ fillId: entry.fillId, fill: entry.fill });
      if (entry.type === 'scale-in-filled') scaleEvents.push(entry);
    }
  }
  if (
    expectedStop !== session.activeProtectiveStopTicks ||
    expectedTarget !== session.activeTargetTicks
  )
    throw new Error('Active thresholds differ from immutable replacement events');
  if (!structurallyEqual(eventFills, session.fills))
    throw new Error('Position fills differ from immutable execution events');
  session.fills.forEach(({ fillId, fill }, index) => {
    if (fillId !== `${session.sessionId}:fill:${index}`)
      throw new Error('Position fill identities must be deterministic and sequential');
    assertPositiveSafeInteger(fill.quantityUnits, 'Position fill quantity units');
    for (const value of [
      fill.referencePriceMinor,
      fill.priceMinor,
      fill.commissionMinor,
      fill.modeledExecutionCostMinor,
    ])
      assertNonNegativeSafeInteger(value, 'Position fill authoritative integer');
  });
  const initialLot = session.lots[0];
  const paperPosition = session.handoff.position!;
  if (
    !initialLot ||
    initialLot.openedBy !== 'paper-handoff' ||
    initialLot.initialQuantityUnits !== session.initialQuantityUnits ||
    initialLot.entryPriceMinor !==
      moneyToMinor(paperPosition.entryFill.price, session.currencyDecimals, 'Paper handoff fill')
  )
    throw new Error('Initial position lot differs from the exact paper handoff');
  if (session.lots.length !== scaleEvents.length + 1)
    throw new Error('Position lots differ from scale-in event history');
  scaleEvents.forEach((entry, index) => {
    const lot = session.lots[index + 1];
    if (
      !lot ||
      lot.lotId !== entry.lotId ||
      lot.openedBy !== 'scale-in' ||
      lot.entryCandleIndex !== entry.fill.candleIndex ||
      lot.entryPriceMinor !== entry.fill.priceMinor ||
      lot.initialQuantityUnits !== entry.fill.quantityUnits ||
      lot.entryCommissionMinor !== entry.fill.commissionMinor
    )
      throw new Error('Scale-in lot differs from its immutable fill event');
  });
  const exitFills = session.fills.filter(({ fill }) => fill.reason !== 'scale-in');
  const exitedQuantity = exitFills.reduce((sum, { fill }) => safeAdd(sum, fill.quantityUnits), 0);
  const totalEnteredQuantity = session.lots.reduce(
    (sum, lot) => safeAdd(sum, lot.initialQuantityUnits),
    0,
  );
  if (totalEnteredQuantity - exitedQuantity !== session.openQuantityUnits)
    throw new Error('Position quantity conservation differs from immutable fills');
  if (
    exitFills.reduce((sum, { fill }) => safeAdd(sum, fill.commissionMinor), 0) !==
    session.accounting.exitCommissionMinor
  )
    throw new Error('Exit commission accounting differs from immutable fills');
  const initialModeledCost = roundedMoneyToMinor(
    paperPosition.quantity *
      (paperPosition.entryFill.modeledSpreadAmount + paperPosition.entryFill.modeledSlippageAmount),
    session.currencyDecimals,
    'Paper entry modeled execution cost',
  );
  if (
    session.fills.reduce(
      (sum, { fill }) => safeAdd(sum, fill.modeledExecutionCostMinor),
      initialModeledCost,
    ) !== session.accounting.modeledExecutionCostMinor
  )
    throw new Error('Modeled execution cost differs from immutable fills');
  assertCanonicalExecutionState(session, initialModeledCost);
  for (const { fillId, fill } of exitFills) {
    const slicedQuantity = session.accounting.realizedSlices
      .filter(({ exitFillId }) => exitFillId === fillId)
      .reduce((sum, slice) => safeAdd(sum, slice.quantityUnits), 0);
    if (slicedQuantity !== fill.quantityUnits)
      throw new Error('Realized FIFO slices differ from their exit fill quantity');
  }
  for (const lot of session.lots) {
    const slices = session.accounting.realizedSlices.filter(({ lotId }) => lotId === lot.lotId);
    if (
      slices.reduce((sum, slice) => safeAdd(sum, slice.quantityUnits), 0) +
        lot.openQuantityUnits !==
        lot.initialQuantityUnits ||
      slices.reduce((sum, slice) => safeAdd(sum, slice.allocatedEntryCommissionMinor), 0) +
        lot.unallocatedEntryCommissionMinor !==
        lot.entryCommissionMinor
    )
      throw new Error('Position lot differs from its immutable FIFO realization history');
  }
  const latestDraftEvent = [...session.events]
    .reverse()
    .find(
      (entry): entry is Extract<PositionManagementEvent, { type: 'management-draft-edited' }> =>
        entry.type === 'management-draft-edited',
    );
  if (
    session.draft &&
    (!latestDraftEvent ||
      latestDraftEvent.editId !== session.draft.lastEditId ||
      latestDraftEvent.draftId !== session.draft.draftId ||
      latestDraftEvent.candleIndex !== session.draft.authoredAtCandleIndex ||
      latestDraftEvent.occurredAt !== session.draft.updatedAt ||
      latestDraftEvent.rationale !== session.draft.rationale ||
      !structurallyEqual(latestDraftEvent.intent, session.draft.intent) ||
      !structurallyEqual(latestDraftEvent.processEvidence, session.draft.processEvidence))
  )
    throw new Error('Editable management draft differs from its immutable edit event');
  const submissionEvent = session.pendingAction
    ? session.events.find(
        (
          entry,
        ): entry is Extract<PositionManagementEvent, { type: 'management-action-submitted' }> =>
          entry.type === 'management-action-submitted' &&
          entry.submissionId === session.pendingAction!.submissionId,
      )
    : undefined;
  if (
    session.pendingAction &&
    (!submissionEvent ||
      submissionEvent.draftId !== session.pendingAction.draftId ||
      submissionEvent.candleIndex !== session.pendingAction.submittedAtCandleIndex ||
      submissionEvent.occurredAt !== session.pendingAction.submittedAt ||
      submissionEvent.rationale !== session.pendingAction.rationale ||
      !structurallyEqual(submissionEvent.intent, session.pendingAction.intent) ||
      !structurallyEqual(submissionEvent.processEvidence, session.pendingAction.processEvidence) ||
      !structurallyEqual(
        submissionEvent.acknowledgedRiskWarningCodes,
        session.pendingAction.acknowledgedRiskWarningCodes,
      ) ||
      !structurallyEqual(
        submissionEvent.warningCodes,
        session.pendingAction.riskAssessment.warningCodes,
      ))
  )
    throw new Error('Pending management action differs from its immutable submission event');
  const journalFromEvents: PositionManagementJournalEntry[] = [];
  for (const entry of session.events) {
    if (entry.type === 'management-action-submitted') {
      journalFromEvents.push({
        kind: 'action-rationale',
        entryId: entry.rationaleJournalEntryId,
        sessionId: session.sessionId,
        entryOrder: entry.journalEntryOrder,
        candleIndex: entry.candleIndex!,
        candleTimestamp: entry.cutoffCandleTimestamp,
        relatedActionId: entry.submissionId,
        submissionOrder: entry.submissionOrder,
        text: entry.rationale,
        evidenceTags: entry.processEvidence.evidenceTags,
        recordedAt: entry.occurredAt,
      });
    } else if (entry.type === 'management-observation-recorded') {
      journalFromEvents.push({
        kind: 'observation',
        entryId: entry.entryId,
        sessionId: session.sessionId,
        entryOrder: entry.journalEntryOrder,
        candleIndex: entry.candleIndex!,
        candleTimestamp: entry.cutoffCandleTimestamp,
        text: entry.text,
        evidenceTags: entry.evidenceTags,
        recordedAt: entry.occurredAt,
      });
    } else if (entry.type === 'management-journal-corrected') {
      journalFromEvents.push({
        kind: 'correction',
        entryId: entry.entryId,
        sessionId: session.sessionId,
        entryOrder: entry.journalEntryOrder,
        candleIndex: entry.candleIndex!,
        candleTimestamp: entry.cutoffCandleTimestamp,
        correctsEntryId: entry.correctsEntryId,
        text: entry.text,
        evidenceTags: entry.evidenceTags,
        recordedAt: entry.occurredAt,
      });
    }
  }
  if (!structurallyEqual(journalFromEvents, session.journal))
    throw new Error('Management journal differs from its immutable event history');
  const terminalType: Partial<Record<PositionManagementStatus, PositionManagementEvent['type']>> = {
    'closed-voluntary': 'voluntary-exit-filled',
    'closed-stop': 'position-closed-stop',
    'closed-target': 'position-closed-target',
    ambiguous: 'position-management-ambiguous',
    'completed-open': 'position-open-at-replay-end',
  };
  const required = terminalType[session.status];
  if (required && !session.events.some(({ type }) => type === required))
    throw new Error('Position management terminal status lacks its immutable lifecycle event');
  const hasTerminalEvent =
    session.events.some(({ type }) =>
      [
        'position-closed-stop',
        'position-closed-target',
        'position-management-ambiguous',
        'position-open-at-replay-end',
      ].includes(type),
    ) ||
    (session.openQuantityUnits === 0 &&
      session.events.some(({ type }) => type === 'voluntary-exit-filled'));
  if (session.status === 'active' && hasTerminalEvent)
    throw new Error('Active position management contains a terminal lifecycle event');
}

function assertCanonicalExecutionState(
  session: PositionManagementSession,
  initialModeledCost: number,
): void {
  const paperPosition = session.handoff.position!;
  const initialLot: PositionManagementLot = {
    lotId: `${session.sessionId}:lot:0`,
    openedBy: 'paper-handoff',
    entryCandleIndex: paperPosition.openedAtCandleIndex,
    entryPriceMinor: moneyToMinor(
      paperPosition.entryFill.price,
      session.currencyDecimals,
      'Paper handoff fill',
    ),
    initialQuantityUnits: session.initialQuantityUnits,
    openQuantityUnits: session.initialQuantityUnits,
    entryCommissionMinor: moneyToMinor(
      paperPosition.entryFill.commission,
      session.currencyDecimals,
      'Paper handoff commission',
    ),
    unallocatedEntryCommissionMinor: moneyToMinor(
      paperPosition.entryFill.commission,
      session.currencyDecimals,
      'Paper handoff commission',
    ),
  };
  let replay: PositionManagementSession = {
    ...session,
    status: 'active',
    ambiguityReason: undefined,
    draft: undefined,
    pendingAction: undefined,
    debrief: undefined,
    activeProtectiveStopTicks: priceToTicks(
      paperPosition.protectiveStopPrice,
      10 ** session.currencyDecimals,
      session.priceTickMinor,
      'Handoff stop',
    ),
    activeTargetTicks: priceToTicks(
      paperPosition.targetPrice,
      10 ** session.currencyDecimals,
      session.priceTickMinor,
      'Handoff target',
    ),
    lots: [initialLot],
    fills: [],
    openQuantityUnits: session.initialQuantityUnits,
    accounting: emptyAccounting(initialModeledCost),
  };

  for (const event of session.events) {
    if (event.type === 'protective-stop-replaced') {
      replay = { ...replay, activeProtectiveStopTicks: event.priceTicks };
      continue;
    }
    if (event.type === 'target-replaced') {
      replay = { ...replay, activeTargetTicks: event.priceTicks };
      continue;
    }
    if (
      event.type !== 'voluntary-exit-filled' &&
      event.type !== 'scale-in-filled' &&
      event.type !== 'position-closed-stop' &&
      event.type !== 'position-closed-target'
    )
      continue;

    const candle = managedCandleFromCheckpoint(session, event.fill.candleIndex);
    if (
      event.candleIndex !== candle.index ||
      event.occurredAt !== candle.timestamp ||
      event.fill.timestamp !== candle.timestamp
    )
      throw new Error('Position fill is not linked to its exact processed candle checkpoint');

    let expectedFill: PositionManagementFill;
    if (event.type === 'voluntary-exit-filled') {
      const submission = session.events.find(
        (
          candidate,
        ): candidate is Extract<PositionManagementEvent, { type: 'management-action-submitted' }> =>
          candidate.type === 'management-action-submitted' &&
          candidate.submissionId === event.submissionId,
      );
      if (
        !submission ||
        (submission.intent.kind !== 'full-exit' && submission.intent.kind !== 'partial-exit')
      )
        throw new Error('Voluntary exit fill lacks its exact submitted exit intent');
      const quantityUnits =
        submission.intent.kind === 'full-exit'
          ? replay.openQuantityUnits
          : submission.intent.quantityUnits;
      expectedFill = marketFill(
        replay,
        candle,
        exitSide(replay.direction),
        quantityUnits,
        'voluntary-exit',
      );
    } else if (event.type === 'scale-in-filled') {
      const submission = session.events.find(
        (
          candidate,
        ): candidate is Extract<PositionManagementEvent, { type: 'management-action-submitted' }> =>
          candidate.type === 'management-action-submitted' &&
          candidate.submissionId === event.submissionId,
      );
      if (!submission || submission.intent.kind !== 'scale-in')
        throw new Error('Scale-in fill lacks its exact submitted scale-in intent');
      expectedFill = marketFill(
        replay,
        candle,
        entrySide(replay.direction),
        submission.intent.quantityUnits,
        'scale-in',
      );
    } else if (event.type === 'position-closed-stop') {
      const openMinor = candlePriceToTickMinor(candle.open, replay, 'Stop gap observation');
      const stopMinor = ticksToMinor(replay.activeProtectiveStopTicks, replay.priceTickMinor);
      const gap = replay.direction === 'long' ? openMinor <= stopMinor : openMinor >= stopMinor;
      expectedFill = stopFill(replay, candle, gap);
    } else {
      const openMinor = candlePriceToTickMinor(candle.open, replay, 'Target gap observation');
      const targetMinor = ticksToMinor(replay.activeTargetTicks, replay.priceTickMinor);
      const gap = replay.direction === 'long' ? openMinor >= targetMinor : openMinor <= targetMinor;
      expectedFill = targetFill(replay, candle, gap);
    }
    if (!structurallyEqual(event.fill, expectedFill))
      throw new Error('Position fill differs from its canonical side/price/cost/gap calculation');

    if (event.type === 'scale-in-filled') {
      const lot: PositionManagementLot = {
        lotId: `${session.sessionId}:lot:${replay.lots.length}`,
        openedBy: 'scale-in',
        entryCandleIndex: candle.index,
        entryPriceMinor: expectedFill.priceMinor,
        initialQuantityUnits: expectedFill.quantityUnits,
        openQuantityUnits: expectedFill.quantityUnits,
        entryCommissionMinor: expectedFill.commissionMinor,
        unallocatedEntryCommissionMinor: expectedFill.commissionMinor,
      };
      if (event.lotId !== lot.lotId) throw new Error('Scale-in lot identity is not canonical');
      replay = {
        ...replay,
        lots: [...replay.lots, lot],
        openQuantityUnits: safeAdd(replay.openQuantityUnits, expectedFill.quantityUnits),
        fills: [...replay.fills, { fillId: event.fillId, fill: expectedFill }],
        accounting: {
          ...replay.accounting,
          modeledExecutionCostMinor: safeAdd(
            replay.accounting.modeledExecutionCostMinor,
            expectedFill.modeledExecutionCostMinor,
          ),
        },
      };
    } else {
      replay = realizeExit(replay, event.fillId, expectedFill);
      replay = {
        ...replay,
        fills: [...replay.fills, { fillId: event.fillId, fill: expectedFill }],
      };
    }
  }

  if (
    !structurallyEqual(replay.fills, session.fills) ||
    !structurallyEqual(replay.lots, session.lots) ||
    replay.openQuantityUnits !== session.openQuantityUnits ||
    !structurallyEqual(replay.accounting, session.accounting)
  )
    throw new Error('Restored position lots/accounting differ from canonical FIFO reconstruction');
}

function isCandleDrivenEvent(entry: PositionManagementEvent): boolean {
  return [
    'protective-stop-replaced',
    'target-replaced',
    'voluntary-exit-filled',
    'scale-in-filled',
    'position-closed-stop',
    'position-closed-target',
    'position-management-ambiguous',
    'management-action-risk-rejected',
  ].includes(entry.type);
}

function assertProcessedCandles(session: PositionManagementSession): void {
  let expected = session.handoff.lastProcessedCandleIndex + 1;
  for (const candle of session.processedCandles) {
    if (candle.index !== expected++)
      throw new Error('Managed candles must form a contiguous sequence');
    assertTimestamp(candle.timestamp, 'Managed candle timestamp');
    if (!candle.fingerprint) throw new Error('Managed candle fingerprint is required');
  }
  if (session.lastProcessedCandleIndex !== expected - 1)
    throw new Error('Managed candle cutoff differs from persisted checkpoints');
}

function assertJournal(session: PositionManagementSession): void {
  const ids = new Set<string>();
  for (const [entryOrder, entry] of session.journal.entries()) {
    assertId(entry.entryId, 'Management journal entry ID');
    assertText(entry.text, 'Management journal text');
    assertEvidenceTags(entry.evidenceTags, 'Management journal evidence tags');
    assertTimestamp(entry.recordedAt, 'Management journal timestamp');
    assertTimestamp(entry.candleTimestamp, 'Management journal candle timestamp');
    if (
      entry.sessionId !== session.sessionId ||
      entry.entryOrder !== entryOrder ||
      entry.candleIndex > session.lastProcessedCandleIndex ||
      candleTimestampAtCutoff(session, entry.candleIndex) !== entry.candleTimestamp
    )
      throw new Error('Management journal entry differs from its exact session/cutoff/order');
    if (ids.has(entry.entryId))
      throw new Error('Management journal entry identities must be unique');
    if (entry.kind === 'action-rationale') {
      assertId(entry.relatedActionId, 'Related management action ID');
      assertPositiveSafeInteger(entry.submissionOrder, 'Management submission order');
    }
    if (entry.kind === 'correction' && !ids.has(entry.correctsEntryId))
      throw new Error('Management journal correction must reference earlier immutable evidence');
    ids.add(entry.entryId);
  }
}

function assertPolicy(policy: PositionManagementPolicy): void {
  if (!structurallyEqual(policy, DEFAULT_POSITION_MANAGEMENT_POLICY))
    throw new Error('Unsupported position management policy');
}

function assertAuthority(
  authority: PositionManagementAuthority,
  source: HistoricalExecutionIdentity,
  initialQuantityUnits: number,
): void {
  if (authority.schemaVersion !== 1)
    throw new Error('Unsupported position management authority schema');
  [authority.permissionVersion, authority.rubricId, authority.rubricVersion].forEach((value) =>
    assertId(value, 'Position management authority identity'),
  );
  if (!/^sha256:[a-f0-9]{64}$/.test(authority.rubricChecksum))
    throw new Error('Position management rubric checksum must be lowercase SHA-256');
  if (authority.rubricChecksum !== computePositionManagementRubricChecksum(authority.rubric))
    throw new Error('Position management rubric checksum does not match its canonical contract');
  if (authority.learningCredit !== source.learningCredit)
    throw new Error('Position management learning credit differs from the paper source');
  const limits = authority.riskLimits;
  for (const value of [
    limits.maxOpenQuantityUnits,
    limits.maxScaleInInitialQuantityBps,
    limits.softRiskLimitOriginalRBps,
    limits.hardRiskLimitOriginalRBps,
  ])
    assertPositiveSafeInteger(value, 'Position management scenario risk limit');
  if (
    limits.maxOpenQuantityUnits > 1_000_000_000 ||
    limits.maxScaleInInitialQuantityBps > 1_000_000 ||
    limits.softRiskLimitOriginalRBps > 1_000_000 ||
    limits.hardRiskLimitOriginalRBps > 1_000_000
  )
    throw new Error('Position management scenario risk limits exceed bounded v1 ranges');
  if (limits.maxOpenQuantityUnits < initialQuantityUnits)
    throw new Error('Scenario maximum open quantity cannot be below the handed-off position');
  if (limits.hardRiskLimitOriginalRBps < limits.softRiskLimitOriginalRBps)
    throw new Error('Scenario hard risk limit must be at least its soft risk limit');
  const allowed: readonly PositionManagementMaterialActionKind[] = [
    'full-exit',
    'partial-exit',
    'scale-in',
    'replace-stop',
    'replace-target',
  ];
  if (
    authority.permittedActionKinds.length === 0 ||
    new Set(authority.permittedActionKinds).size !== authority.permittedActionKinds.length ||
    authority.permittedActionKinds.some((kind) => !allowed.includes(kind))
  )
    throw new Error('Position management permissions must be a unique supported non-empty set');
  if (
    authority.rubric.schemaVersion !== 1 ||
    authority.rubric.criteria.length === 0 ||
    authority.rubric.criteria.length > 16
  )
    throw new Error('Position management rubric must contain 1 through 16 criteria');
  const criterionIds = new Set<string>();
  for (const criterion of authority.rubric.criteria) {
    assertId(criterion.criterionId, 'Position management rubric criterion ID');
    if (criterionIds.has(criterion.criterionId))
      throw new Error('Position management rubric criterion IDs must be unique');
    criterionIds.add(criterion.criterionId);
    if (criterion.kind === 'decision-basis') {
      if (
        criterion.accepted.length === 0 ||
        new Set(criterion.accepted).size !== criterion.accepted.length ||
        criterion.accepted.some(
          (basis) =>
            ![
              'predefined-plan',
              'new-visible-evidence',
              'risk-reduction',
              'outcome-chasing',
              'future-information',
            ].includes(basis),
        )
      )
        throw new Error('Decision-basis rubric criterion requires unique accepted values');
    } else if (criterion.kind === 'evidence-tags') {
      assertEvidenceTags(criterion.accepted, 'Rubric evidence tags');
      if (
        !Number.isSafeInteger(criterion.minimumMatches) ||
        criterion.minimumMatches <= 0 ||
        criterion.minimumMatches > criterion.accepted.length
      )
        throw new Error('Evidence-tag rubric minimum must fit its accepted tag set');
    } else if (criterion.kind === 'minimum-material-actions') {
      if (
        !Number.isSafeInteger(criterion.minimum) ||
        criterion.minimum < 0 ||
        criterion.minimum > 32
      )
        throw new Error('Minimum-material-actions rubric criterion must be from zero through 32');
    } else if (
      (criterion.kind === 'risk-reviewed' || criterion.kind === 'risk-warning-acknowledged') &&
      criterion.required !== true
    ) {
      throw new Error('Boolean position-management rubric criteria must require true');
    } else if (
      ![
        'risk-reviewed',
        'risk-warning-acknowledged',
        'decision-basis',
        'evidence-tags',
        'minimum-material-actions',
      ].includes(criterion.kind)
    ) {
      throw new Error('Unknown position-management rubric criterion kind');
    }
  }
}

function assertActive(session: PositionManagementSession): void {
  if (session.status !== 'active')
    throw new Error('Material management requires an active position');
}

function assertActionTime(session: PositionManagementSession, value: string): void {
  assertTimestamp(value, 'Position management action timestamp');
  if (Date.parse(value) < Date.parse(session.updatedAt))
    throw new Error('Position management action timestamp precedes current state');
}

function assertCandle(candle: OhlcvCandle, candleCount: number): void {
  if (!Number.isInteger(candle.index) || candle.index < 0 || candle.index >= candleCount)
    throw new Error('Managed candle index is outside the pinned dataset');
  assertTimestamp(candle.timestamp, 'Managed candle timestamp');
  if (
    ![candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite) ||
    candle.open <= 0 ||
    candle.high <= 0 ||
    candle.low <= 0 ||
    candle.close <= 0 ||
    candle.volume < 0 ||
    candle.low > Math.min(candle.open, candle.close) ||
    candle.high < Math.max(candle.open, candle.close)
  )
    throw new Error('Managed candle contains invalid OHLCV values');
}

function emptyAccounting(initialModeledExecutionCostMinor = 0): PositionManagementAccounting {
  return {
    grossRealizedMinor: 0,
    allocatedEntryCommissionMinor: 0,
    exitCommissionMinor: 0,
    realizedNetMinor: 0,
    modeledExecutionCostMinor: initialModeledExecutionCostMinor,
    realizedSlices: [],
  };
}

function weightedOpenEntry(lots: readonly PositionManagementLot[]): {
  readonly numerator: number;
  readonly denominator: number;
} {
  let numerator = 0;
  let denominator = 0;
  for (const lot of lots) {
    numerator = safeAdd(numerator, safeMultiply(lot.entryPriceMinor, lot.openQuantityUnits));
    denominator = safeAdd(denominator, lot.openQuantityUnits);
  }
  return { numerator, denominator };
}

function consumeLotsWithoutAccounting(
  lots: readonly PositionManagementLot[],
  quantityUnits: number,
): readonly PositionManagementLot[] {
  let remaining = quantityUnits;
  const projected = lots.map((lot) => {
    const consumed = Math.min(remaining, lot.openQuantityUnits);
    remaining -= consumed;
    return { ...lot, openQuantityUnits: lot.openQuantityUnits - consumed };
  });
  if (remaining !== 0) throw new Error('Projected exit exceeds open quantity');
  return projected;
}

function entrySide(direction: TradeDirection): ExecutionSide {
  return direction === 'long' ? 'buy' : 'sell';
}
function exitSide(direction: TradeDirection): ExecutionSide {
  return direction === 'long' ? 'sell' : 'buy';
}
function ticksToMinor(ticks: number, tickMinor: number): number {
  return safeMultiply(ticks, tickMinor);
}

function priceToTicks(value: number, scale: number, tickMinor: number, label: string): number {
  const minor = moneyToMinor(value, Math.log10(scale), label);
  if (minor % tickMinor !== 0) throw new Error(`${label} must align to the pinned price tick`);
  return exactSafeInteger(minor / tickMinor, `${label} ticks`);
}

function moneyToMinor(value: number, decimals: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return exactSafeInteger(value * 10 ** decimals, `${label} must map exactly to minor units`);
}

/**
 * Historical candles may carry more decimal places than the pinned execution currency. Marks and
 * threshold observations are therefore normalized once to the nearest configured price tick.
 * Executions apply the adverse fill model only after this neutral reference conversion.
 */
function candlePriceToTickMinor(
  value: number,
  session: Pick<PositionManagementSession, 'currencyDecimals' | 'priceTickMinor'>,
  label: string,
): number {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${label} must be finite and positive`);
  const rawTicks = (value * 10 ** session.currencyDecimals) / session.priceTickMinor;
  const ticks = Math.round(rawTicks);
  if (!Number.isSafeInteger(ticks) || ticks <= 0)
    throw new RangeError(`${label} exceeds safe configured price ticks`);
  return safeMultiply(ticks, session.priceTickMinor);
}

/** Rounds an already-derived display amount once at the aggregate minor-unit boundary. */
function roundedMoneyToMinor(value: number, decimals: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  const rounded = Math.round(value * 10 ** decimals);
  if (!Number.isSafeInteger(rounded)) throw new RangeError(`${label} exceeds safe minor units`);
  return rounded;
}

function quantityToUnits(quantity: number, increment: number): number {
  return exactSafeInteger(
    quantity / increment,
    'Position quantity must map exactly to quantity units',
  );
}

function exactSafeInteger(value: number, label: string): number {
  const rounded = Math.round(value);
  if (!Number.isSafeInteger(rounded) || Math.abs(value - rounded) > 1e-7)
    throw new RangeError(label);
  return rounded;
}

function assertPositiveSafeInteger(value: number, label: string): number {
  assertNonNegativeSafeInteger(value, label);
  if (value === 0) throw new RangeError(`${label} must be positive`);
  return value;
}

function assertNonNegativeSafeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(`${label} must be a non-negative safe integer`);
  return value;
}

function safeAdd(left: number, right: number): number {
  return assertNonNegativeSafeInteger(left + right, 'Safe integer sum');
}
function safeAddSigned(left: number, right: number): number {
  const value = left + right;
  if (!Number.isSafeInteger(value))
    throw new RangeError('Signed accounting exceeded safe integer range');
  return value;
}
function safeMultiply(left: number, right: number): number {
  const value = left * right;
  if (!Number.isSafeInteger(value))
    throw new RangeError('Authoritative accounting exceeded safe integer range');
  return value;
}

function safeBpsProduct(value: number, bps: number): number {
  return safeMultiply(value, bps) / 10_000;
}

function hardRiskLimitFromBps(originalRiskMinor: number, bps: number): number {
  return Math.floor((originalRiskMinor * bps) / 10_000);
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort();
}
function isVoluntaryIntent(
  intent: PositionManagementMaterialIntent,
): intent is Extract<
  PositionManagementMaterialIntent,
  { kind: 'full-exit' | 'partial-exit' | 'scale-in' }
> {
  return ['full-exit', 'partial-exit', 'scale-in'].includes(intent.kind);
}
function isTerminal(status: PositionManagementStatus): boolean {
  return status !== 'active';
}
function assertId(value: string, label: string): void {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value !== value.trim() ||
    [...value].length > 128 ||
    containsDisallowedControl(value, false)
  )
    throw new Error(`${label} must contain 1 through 128 trimmed control-free code points`);
}
function assertText(value: string, label: string): void {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value !== value.trim() ||
    [...value].length > 4_096 ||
    containsDisallowedControl(value, true)
  )
    throw new Error(`${label} must contain 1 through 4096 trimmed control-free code points`);
}

function containsDisallowedControl(value: string, allowTextWhitespace: boolean): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if (codePoint === 0x7f) return true;
    if (codePoint < 0x20) {
      const allowedWhitespace =
        allowTextWhitespace && (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d);
      if (!allowedWhitespace) return true;
    }
  }
  return false;
}

function assertProcessEvidence(evidence: PositionManagementProcessEvidence): void {
  if (
    ![
      'predefined-plan',
      'new-visible-evidence',
      'risk-reduction',
      'outcome-chasing',
      'future-information',
    ].includes(evidence.decisionBasis) ||
    typeof evidence.riskReviewed !== 'boolean'
  )
    throw new Error('Management process evidence contains an unsupported structured value');
  assertEvidenceTags(evidence.evidenceTags, 'Management process evidence tags');
}

function assertEvidenceTags(tags: readonly PositionManagementEvidenceTag[], label: string): void {
  const allowed: readonly PositionManagementEvidenceTag[] = [
    'predefined-plan',
    'visible-price-evidence',
    'structural-change',
    'risk-budget',
    'invalidation-rule',
    'target-rule',
    'voluntary-exit-rule',
    'execution-costs',
    'uncertainty-recorded',
  ];
  if (
    !Array.isArray(tags) ||
    tags.length > 8 ||
    new Set(tags).size !== tags.length ||
    tags.some((tag) => !allowed.includes(tag))
  )
    throw new Error(`${label} must contain at most eight unique supported tags`);
}
function assertTimestamp(value: string, label: string): void {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value)
    throw new Error(`${label} must be canonical UTC ISO-8601`);
}
function candleFingerprint(candle: OhlcvCandle): string {
  return [
    candle.index,
    candle.timestamp,
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume,
  ].join('|');
}

function candleTimestampAtCutoff(session: PositionManagementSession, candleIndex: number): string {
  const checkpoint =
    candleIndex <= session.handoff.lastProcessedCandleIndex
      ? session.handoff.processedCandles.find(({ index }) => index === candleIndex)
      : session.processedCandles.find(({ index }) => index === candleIndex);
  if (!checkpoint) throw new Error('Journal cutoff has no exact persisted candle checkpoint');
  return checkpoint.timestamp;
}

function managedCandleFromCheckpoint(
  session: PositionManagementSession,
  candleIndex: number,
): OhlcvCandle {
  const checkpoint = session.processedCandles.find(({ index }) => index === candleIndex);
  if (!checkpoint) throw new Error('Position fill has no persisted managed candle checkpoint');
  const parts = checkpoint.fingerprint.split('|');
  if (parts.length !== 7) throw new Error('Managed candle checkpoint fingerprint is malformed');
  const [indexText, timestamp, openText, highText, lowText, closeText, volumeText] = parts;
  const candle: OhlcvCandle = {
    index: Number(indexText),
    timestamp: timestamp!,
    open: Number(openText),
    high: Number(highText),
    low: Number(lowText),
    close: Number(closeText),
    volume: Number(volumeText),
  };
  assertCandle(candle, session.source.candleCount);
  if (
    candle.index !== checkpoint.index ||
    candle.timestamp !== checkpoint.timestamp ||
    candleFingerprint(candle) !== checkpoint.fingerprint
  )
    throw new Error('Managed candle checkpoint fingerprint cannot be reconstructed canonically');
  return candle;
}

function makeEvent<T extends PositionManagementEvent['type']>(
  sessionId: string,
  sequence: number,
  occurredAt: string,
  type: T,
  data: Omit<
    Extract<PositionManagementEvent, { type: T }>,
    keyof BasePositionManagementEvent | 'type'
  > & { readonly candleIndex?: number },
): Extract<PositionManagementEvent, { type: T }> {
  return {
    eventId: `${sessionId}:event:${sequence}`,
    sequence,
    occurredAt,
    type,
    ...data,
  } as Extract<PositionManagementEvent, { type: T }>;
}

function appendEvent<T extends PositionManagementEvent['type']>(
  session: Pick<PositionManagementSession, 'sessionId' | 'events'>,
  occurredAt: string,
  type: T,
  data: Omit<
    Extract<PositionManagementEvent, { type: T }>,
    keyof BasePositionManagementEvent | 'type'
  > & { readonly candleIndex?: number },
): readonly PositionManagementEvent[] {
  return [
    ...session.events,
    makeEvent(session.sessionId, session.events.length, occurredAt, type, data),
  ];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right))
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => structurallyEqual(value, right[index]))
    );
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object')
    return false;
  const l = left as Readonly<Record<string, unknown>>;
  const r = right as Readonly<Record<string, unknown>>;
  const lk = Object.keys(l).sort();
  const rk = Object.keys(r).sort();
  return (
    lk.length === rk.length &&
    lk.every((key, index) => key === rk[index] && structurallyEqual(l[key], r[key]))
  );
}

// Compile-time anchor for the fixed hard-risk calculation and its safe-integer intent.
void hardRiskLimitFromBps;

const SHA256_ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function canonicalSerialize(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new Error('Canonical rubric cannot contain non-finite numbers');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalSerialize).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalSerialize(record[key])}`)
      .join(',')}}`;
  }
  throw new Error('Canonical rubric contains an unsupported value');
}

function sha256Hex(value: string): string {
  const bytes: number[] = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    else if (codePoint <= 0xffff)
      bytes.push(
        0xe0 | (codePoint >>> 12),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    else
      bytes.push(
        0xf0 | (codePoint >>> 18),
        0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
  }
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x1_0000_0000);
  const low = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 0xff);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((low >>> shift) & 0xff);
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const words = new Array<number>(64).fill(0);
  const rotate = (word: number, bits: number): number => (word >>> bits) | (word << (32 - bits));
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const cursor = offset + index * 4;
      words[index] =
        (((bytes[cursor] ?? 0) << 24) |
          ((bytes[cursor + 1] ?? 0) << 16) |
          ((bytes[cursor + 2] ?? 0) << 8) |
          (bytes[cursor + 3] ?? 0)) >>>
        0;
    }
    for (let index = 16; index < 64; index += 1) {
      const a = words[index - 15] ?? 0;
      const b = words[index - 2] ?? 0;
      words[index] =
        ((words[index - 16] ?? 0) +
          (rotate(a, 7) ^ rotate(a, 18) ^ (a >>> 3)) +
          (words[index - 7] ?? 0) +
          (rotate(b, 17) ^ rotate(b, 19) ^ (b >>> 10))) >>>
        0;
    }
    let [a, b, c, d, e, f, g, h] = hash as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    for (let index = 0; index < 64; index += 1) {
      const temp1 =
        (h +
          (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) +
          ((e & f) ^ (~e & g)) +
          (SHA256_ROUND_CONSTANTS[index] ?? 0) +
          (words[index] ?? 0)) >>>
        0;
      const temp2 =
        ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    hash[0] = ((hash[0] ?? 0) + a) >>> 0;
    hash[1] = ((hash[1] ?? 0) + b) >>> 0;
    hash[2] = ((hash[2] ?? 0) + c) >>> 0;
    hash[3] = ((hash[3] ?? 0) + d) >>> 0;
    hash[4] = ((hash[4] ?? 0) + e) >>> 0;
    hash[5] = ((hash[5] ?? 0) + f) >>> 0;
    hash[6] = ((hash[6] ?? 0) + g) >>> 0;
    hash[7] = ((hash[7] ?? 0) + h) >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
}
