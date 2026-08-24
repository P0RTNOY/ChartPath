import type { OhlcvCandle } from './types.js';

export const PAPER_EXECUTION_SCHEMA_VERSION = 1 as const;
export const EXECUTION_POLICY_VERSION = 'paper-execution-policy-v1' as const;
export const COST_MODEL_VERSION = 'paper-cost-model-v1' as const;

export type TradeDirection = 'long' | 'short';
export type EntryOrderType = 'market' | 'limit' | 'stop';
export type ExecutionSide = 'buy' | 'sell';
export type AnalysisTradeDecision = TradeDirection | 'wait' | 'no-trade' | 'insufficient-evidence';

export interface ExecutionPolicy {
  readonly version: typeof EXECUTION_POLICY_VERSION;
  readonly marketEntryPoint: 'next-candle-open';
  readonly limitFillPolicy: 'limit-price-no-improvement';
  readonly entryStopGapPolicy: 'adverse-opening-price';
  readonly protectiveStopGapPolicy: 'adverse-opening-price';
  readonly targetGapPolicy: 'target-price-no-improvement';
  readonly sameCandleAmbiguityPolicy: 'pause-as-ambiguous';
  readonly intrabarEntryExitPolicy: 'pause-as-ambiguous';
  readonly partialFillsModeled: false;
}

export interface CostModel {
  readonly version: typeof COST_MODEL_VERSION;
  /** Total modeled bid/ask spread in basis points. Each side receives half. */
  readonly spreadBps: number;
  /** Adverse slippage applied to market and stop executions in basis points. */
  readonly slippageBps: number;
  readonly commissionFixed: number;
  readonly commissionPerUnit: number;
  readonly minimumCommission: number;
  readonly priceTick: number;
  readonly quantityIncrement: number;
  readonly currencyDecimals: number;
}

export const DEFAULT_EXECUTION_POLICY: ExecutionPolicy = Object.freeze({
  version: EXECUTION_POLICY_VERSION,
  marketEntryPoint: 'next-candle-open',
  limitFillPolicy: 'limit-price-no-improvement',
  entryStopGapPolicy: 'adverse-opening-price',
  protectiveStopGapPolicy: 'adverse-opening-price',
  targetGapPolicy: 'target-price-no-improvement',
  sameCandleAmbiguityPolicy: 'pause-as-ambiguous',
  intrabarEntryExitPolicy: 'pause-as-ambiguous',
  partialFillsModeled: false,
});

export const DEFAULT_COST_MODEL: CostModel = Object.freeze({
  version: COST_MODEL_VERSION,
  spreadBps: 10,
  slippageBps: 5,
  commissionFixed: 0,
  commissionPerUnit: 0.01,
  minimumCommission: 1,
  priceTick: 0.01,
  quantityIncrement: 1,
  currencyDecimals: 2,
});

export interface HistoricalExecutionIdentity {
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly canonicalChecksum: string;
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly analysisSessionId: string;
  readonly analysisFinalizedAt: string;
  readonly decisionCandleIndex: number;
  readonly candleCount: number;
  readonly learningCredit: 'course' | 'none';
  readonly permittedDirections: readonly TradeDirection[];
  readonly permittedEntryOrderTypes: readonly EntryOrderType[];
}

export type OrderIntent =
  | { readonly type: 'market'; readonly estimatedEntryPrice: number }
  | { readonly type: 'limit'; readonly limitPrice: number }
  | { readonly type: 'stop'; readonly triggerPrice: number };

export interface TradePlanProcessEvidence {
  readonly analysisDecision: AnalysisTradeDecision;
  readonly entryMatchesAnalysis: boolean;
  readonly invalidationMatchesAnalysis: boolean;
  readonly targetMatchesAnalysis: boolean;
  readonly requiredReasoningBypassed: boolean;
}

export type TradePlanValidationCode =
  | 'DIRECTION_NOT_PERMITTED'
  | 'ORDER_TYPE_NOT_PERMITTED'
  | 'ENTRY_PRICE_MUST_BE_POSITIVE'
  | 'ENTRY_PRICE_TICK_MISMATCH'
  | 'STOP_PRICE_MUST_BE_POSITIVE'
  | 'STOP_PRICE_TICK_MISMATCH'
  | 'TARGET_PRICE_MUST_BE_POSITIVE'
  | 'TARGET_PRICE_TICK_MISMATCH'
  | 'LONG_STOP_MUST_BE_BELOW_ENTRY'
  | 'LONG_TARGET_MUST_BE_ABOVE_ENTRY'
  | 'SHORT_STOP_MUST_BE_ABOVE_ENTRY'
  | 'SHORT_TARGET_MUST_BE_BELOW_ENTRY'
  | 'STOP_DISTANCE_MUST_BE_POSITIVE'
  | 'ACCOUNT_VALUE_MUST_BE_POSITIVE'
  | 'RISK_BUDGET_MUST_BE_POSITIVE'
  | 'RISK_BUDGET_EXCEEDS_ACCOUNT_VALUE'
  | 'QUANTITY_MUST_BE_POSITIVE'
  | 'QUANTITY_INCREMENT_MISMATCH'
  | 'ESTIMATED_RISK_EXCEEDS_BUDGET'
  | 'PLAN_USES_FUTURE_CANDLE'
  | 'ANALYSIS_DID_NOT_SUPPORT_TRADE'
  | 'PLAN_DIRECTION_DIFFERS_FROM_ANALYSIS'
  | 'ANALYSIS_REASONING_BYPASSED'
  | 'DEVELOPMENT_SCENARIO_NO_COURSE_CREDIT';

export interface TradePlanValidationIssue {
  readonly code: TradePlanValidationCode;
  readonly field: string;
  readonly severity: 'error' | 'warning';
}

export interface TradePlanInput {
  readonly planId: string;
  readonly direction: TradeDirection;
  readonly entryIntent: OrderIntent;
  readonly protectiveStopPrice: number;
  readonly targetPrice: number;
  readonly fictionalAccountValue: number;
  readonly intendedRiskAmount: number;
  readonly quantity: number;
  readonly authoredAtCandleIndex: number;
  readonly processEvidence: TradePlanProcessEvidence;
}

export interface TradePlan extends TradePlanInput {
  readonly status: 'valid' | 'invalid';
  readonly validationIssues: readonly TradePlanValidationIssue[];
  readonly plannedEntryPrice: number;
  readonly estimatedEntryFillPrice: number;
  readonly riskPerUnit: number;
  readonly estimatedEntryCommission: number;
  readonly estimatedExitCommission: number;
  readonly estimatedExecutionCosts: number;
  readonly estimatedTotalRisk: number;
  readonly plannedRewardToRisk?: number;
}

export interface ExecutionFill {
  readonly side: ExecutionSide;
  readonly candleIndex: number;
  readonly timestamp: string;
  readonly referencePrice: number;
  readonly price: number;
  readonly quantity: number;
  readonly commission: number;
  readonly modeledSpreadAmount: number;
  readonly modeledSlippageAmount: number;
  readonly gap: boolean;
  readonly priceCappedByLimit: boolean;
}

export type WorkingOrderStatus =
  'submitted' | 'working' | 'filled' | 'cancelled' | 'rejected' | 'expired';

export interface WorkingOrder {
  readonly orderId: string;
  readonly intent: OrderIntent;
  readonly direction: TradeDirection;
  readonly quantity: number;
  readonly status: WorkingOrderStatus;
  readonly submittedAt: string;
  readonly firstEligibleCandleIndex: number;
  readonly filledAtCandleIndex?: number;
  readonly cancelledAt?: string;
  readonly expiredAt?: string;
  readonly fill?: ExecutionFill;
}

export type PositionStatus = 'open' | 'closed-stop' | 'closed-target' | 'ambiguous';

export interface SimulatedPosition {
  readonly positionId: string;
  readonly direction: TradeDirection;
  readonly quantity: number;
  readonly status: PositionStatus;
  readonly openedAtCandleIndex: number;
  readonly entryFill: ExecutionFill;
  readonly protectiveStopPrice: number;
  readonly targetPrice: number;
  readonly closedAtCandleIndex?: number;
  readonly exitFill?: ExecutionFill;
  readonly ambiguityReason?: 'stop-and-target-same-candle' | 'entry-exit-sequence-unknown';
}

interface BaseExecutionEvent {
  readonly eventId: string;
  readonly sequence: number;
  readonly occurredAt: string;
  readonly candleIndex?: number;
}

export type ExecutionEvent =
  | (BaseExecutionEvent & { readonly type: 'session-created'; readonly planId: string })
  | (BaseExecutionEvent & { readonly type: 'plan-replaced'; readonly planId: string })
  | (BaseExecutionEvent & {
      readonly type: 'order-rejected';
      readonly issueCodes: readonly TradePlanValidationCode[];
    })
  | (BaseExecutionEvent & {
      readonly type: 'order-submitted';
      readonly orderId: string;
      readonly confirmationId: string;
    })
  | (BaseExecutionEvent & { readonly type: 'order-working'; readonly orderId: string })
  | (BaseExecutionEvent & {
      readonly type: 'order-filled';
      readonly orderId: string;
      readonly fill: ExecutionFill;
    })
  | (BaseExecutionEvent & {
      readonly type: 'position-opened';
      readonly positionId: string;
      readonly fill: ExecutionFill;
    })
  | (BaseExecutionEvent & {
      readonly type: 'position-closed-stop';
      readonly positionId: string;
      readonly fill: ExecutionFill;
    })
  | (BaseExecutionEvent & {
      readonly type: 'position-closed-target';
      readonly positionId: string;
      readonly fill: ExecutionFill;
    })
  | (BaseExecutionEvent & {
      readonly type: 'execution-ambiguous';
      readonly positionId: string;
      readonly reason: NonNullable<SimulatedPosition['ambiguityReason']>;
    })
  | (BaseExecutionEvent & {
      readonly type: 'order-cancelled';
      readonly orderId: string;
      readonly confirmationId: string;
    })
  | (BaseExecutionEvent & { readonly type: 'order-expired'; readonly orderId: string })
  | (BaseExecutionEvent & {
      readonly type: 'execution-abandoned';
      readonly confirmationId: string;
    });

export interface ProcessAssessmentItem {
  readonly id:
    | 'analysis-completed'
    | 'direction-aligned'
    | 'entry-aligned'
    | 'invalidation-aligned'
    | 'target-aligned'
    | 'risk-calculable'
    | 'reasoning-preserved';
  readonly result: 'met' | 'not-met' | 'review';
}

export interface ExecutionDebrief {
  readonly debriefId: string;
  readonly outcome: 'protective-stop' | 'target' | 'ambiguous';
  readonly outcomeDeterminate: boolean;
  readonly processQuality: 'coherent' | 'mixed' | 'needs-review';
  readonly processAssessment: readonly ProcessAssessmentItem[];
  readonly entryPrice: number;
  readonly exitPrice?: number;
  readonly totalCommissions: number;
  readonly modeledSpreadAndSlippage: number;
  readonly netSimulatedOutcome?: number;
  readonly riskMultiple?: number;
  readonly assumptionCodes: readonly string[];
  readonly createdAt: string;
}

export interface ProcessedExecutionCandle {
  readonly index: number;
  readonly timestamp: string;
  readonly fingerprint: string;
}

export type PaperExecutionStatus =
  'draft' | 'working' | 'open' | 'closed' | 'ambiguous' | 'cancelled' | 'rejected' | 'completed';

export interface PaperExecutionSession {
  readonly schemaVersion: typeof PAPER_EXECUTION_SCHEMA_VERSION;
  readonly revision: number;
  readonly sessionId: string;
  readonly source: HistoricalExecutionIdentity;
  readonly executionPolicy: ExecutionPolicy;
  readonly costModel: CostModel;
  readonly plan: TradePlan;
  readonly status: PaperExecutionStatus;
  readonly orderId: string;
  readonly positionId: string;
  readonly debriefId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly submittedAt?: string;
  readonly workingOrder?: WorkingOrder;
  readonly position?: SimulatedPosition;
  readonly events: readonly ExecutionEvent[];
  readonly processedCandles: readonly ProcessedExecutionCandle[];
  readonly lastProcessedCandleIndex: number;
  readonly debrief?: ExecutionDebrief;
}

export interface CreatePaperExecutionSessionInput {
  readonly sessionId: string;
  readonly orderId: string;
  readonly positionId: string;
  readonly debriefId: string;
  readonly source: HistoricalExecutionIdentity;
  readonly plan: TradePlanInput;
  readonly createdAt: string;
  readonly executionPolicy?: ExecutionPolicy;
  readonly costModel?: CostModel;
}

export type PaperExecutionAction =
  | { readonly type: 'replace-plan'; readonly plan: TradePlanInput; readonly updatedAt: string }
  | { readonly type: 'submit'; readonly confirmationId: string; readonly submittedAt: string }
  | { readonly type: 'cancel-order'; readonly confirmationId: string; readonly cancelledAt: string }
  | {
      readonly type: 'process-candles';
      readonly candles: readonly OhlcvCandle[];
      readonly processedAt: string;
    }
  | { readonly type: 'complete-replay'; readonly completedAt: string }
  | { readonly type: 'abandon'; readonly confirmationId: string; readonly abandonedAt: string };

export function createTradePlan(
  input: TradePlanInput,
  source: HistoricalExecutionIdentity,
  costModel: CostModel = DEFAULT_COST_MODEL,
): TradePlan {
  assertExecutionIdentity(source);
  assertCostModel(costModel);
  assertId(input.planId, 'Plan ID');
  const plannedEntryPrice = orderIntentPrice(input.entryIntent);
  const entryEstimate =
    input.entryIntent.type === 'limit'
      ? limitFill(input.direction, plannedEntryPrice, input.quantity, 0, '', costModel)
      : adverseFill(
          entrySide(input.direction),
          plannedEntryPrice,
          input.quantity,
          0,
          '',
          false,
          costModel,
        );
  const stopEstimate = adverseFill(
    exitSide(input.direction),
    input.protectiveStopPrice,
    input.quantity,
    0,
    '',
    false,
    costModel,
  );
  const riskPerUnit = Math.abs(entryEstimate.price - stopEstimate.price);
  const estimatedExecutionCosts = money(
    entryEstimate.commission +
      stopEstimate.commission +
      input.quantity *
        (entryEstimate.modeledSpreadAmount +
          entryEstimate.modeledSlippageAmount +
          stopEstimate.modeledSpreadAmount +
          stopEstimate.modeledSlippageAmount),
    costModel.currencyDecimals,
  );
  const estimatedTotalRisk = money(
    riskPerUnit * input.quantity + entryEstimate.commission + stopEstimate.commission,
    costModel.currencyDecimals,
  );
  const issues = validateTradePlanInput(
    input,
    source,
    costModel,
    plannedEntryPrice,
    estimatedTotalRisk,
  );
  const grossRewardPerUnit =
    input.direction === 'long'
      ? input.targetPrice - entryEstimate.price
      : entryEstimate.price - input.targetPrice;
  const rewardAfterCommissions =
    grossRewardPerUnit * input.quantity -
    entryEstimate.commission -
    commission(input.quantity, costModel);
  const plannedRewardToRisk =
    estimatedTotalRisk > 0 && Number.isFinite(rewardAfterCommissions)
      ? rewardAfterCommissions / estimatedTotalRisk
      : undefined;

  return {
    ...input,
    entryIntent: { ...input.entryIntent },
    processEvidence: { ...input.processEvidence },
    status: issues.some(({ severity }) => severity === 'error') ? 'invalid' : 'valid',
    validationIssues: issues,
    plannedEntryPrice,
    estimatedEntryFillPrice: entryEstimate.price,
    riskPerUnit,
    estimatedEntryCommission: entryEstimate.commission,
    estimatedExitCommission: stopEstimate.commission,
    estimatedExecutionCosts,
    estimatedTotalRisk,
    ...(plannedRewardToRisk === undefined ? {} : { plannedRewardToRisk }),
  };
}

export function createPaperExecutionSession(
  input: CreatePaperExecutionSessionInput,
): PaperExecutionSession {
  assertExecutionIdentity(input.source);
  assertTimestamp(input.createdAt, 'Creation timestamp');
  [input.sessionId, input.orderId, input.positionId, input.debriefId].forEach((id) =>
    assertId(id, 'Execution identifier'),
  );
  const executionPolicy = input.executionPolicy ?? DEFAULT_EXECUTION_POLICY;
  const costModel = input.costModel ?? DEFAULT_COST_MODEL;
  assertExecutionPolicy(executionPolicy);
  assertCostModel(costModel);
  const plan = createTradePlan(input.plan, input.source, costModel);
  const created: PaperExecutionSession = {
    schemaVersion: PAPER_EXECUTION_SCHEMA_VERSION,
    revision: 0,
    sessionId: input.sessionId,
    source: cloneIdentity(input.source),
    executionPolicy: { ...executionPolicy },
    costModel: { ...costModel },
    plan,
    status: 'draft',
    orderId: input.orderId,
    positionId: input.positionId,
    debriefId: input.debriefId,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    events: [
      event(input.sessionId, 0, input.createdAt, 'session-created', { planId: plan.planId }),
    ],
    processedCandles: [],
    lastProcessedCandleIndex: input.source.decisionCandleIndex,
  };
  assertValidPaperExecutionSession(created);
  return created;
}

export function reducePaperExecutionSession(
  session: PaperExecutionSession,
  action: PaperExecutionAction,
): PaperExecutionSession {
  assertValidPaperExecutionSession(session);
  let next: PaperExecutionSession;
  switch (action.type) {
    case 'replace-plan':
      if (session.status !== 'draft') throw new Error('A submitted paper plan cannot be amended');
      assertActionTime(session, action.updatedAt);
      next = {
        ...session,
        plan: createTradePlan(action.plan, session.source, session.costModel),
        updatedAt: action.updatedAt,
        events: appendEvent(session, action.updatedAt, 'plan-replaced', {
          planId: action.plan.planId,
        }),
      };
      break;
    case 'submit':
      next = submit(session, action);
      break;
    case 'cancel-order':
      next = cancelOrder(session, action);
      break;
    case 'process-candles':
      next = processCandles(session, action);
      break;
    case 'complete-replay':
      next = completeReplay(session, action.completedAt);
      break;
    case 'abandon':
      next = abandon(session, action);
      break;
  }
  if (next === session) return session;
  const revised = { ...next, revision: session.revision + 1 };
  assertValidPaperExecutionSession(revised);
  return revised;
}

export function executionIdentitiesEqual(
  left: HistoricalExecutionIdentity,
  right: HistoricalExecutionIdentity,
): boolean {
  return (
    left.datasetId === right.datasetId &&
    left.datasetVersion === right.datasetVersion &&
    left.canonicalChecksum === right.canonicalChecksum &&
    left.scenarioId === right.scenarioId &&
    left.scenarioVersion === right.scenarioVersion &&
    left.analysisSessionId === right.analysisSessionId &&
    left.analysisFinalizedAt === right.analysisFinalizedAt &&
    left.decisionCandleIndex === right.decisionCandleIndex &&
    left.candleCount === right.candleCount &&
    left.learningCredit === right.learningCredit &&
    sameSet(left.permittedDirections, right.permittedDirections) &&
    sameSet(left.permittedEntryOrderTypes, right.permittedEntryOrderTypes)
  );
}

export function assertCompatibleExecutionIdentity(
  pinned: HistoricalExecutionIdentity,
  available: HistoricalExecutionIdentity,
): void {
  assertExecutionIdentity(pinned);
  assertExecutionIdentity(available);
  if (!executionIdentitiesEqual(pinned, available)) {
    throw new Error('Historical execution identity does not match the pinned session data');
  }
}

export function assertValidPaperExecutionSession(
  session: PaperExecutionSession,
): asserts session is PaperExecutionSession {
  if (session.schemaVersion !== PAPER_EXECUTION_SCHEMA_VERSION) {
    throw new Error(`Unsupported paper execution schema version: ${String(session.schemaVersion)}`);
  }
  assertId(session.sessionId, 'Execution session ID');
  assertExecutionIdentity(session.source);
  assertExecutionPolicy(session.executionPolicy);
  assertCostModel(session.costModel);
  [session.orderId, session.positionId, session.debriefId].forEach((id) =>
    assertId(id, 'Execution identifier'),
  );
  if (!Number.isSafeInteger(session.revision) || session.revision < 0) {
    throw new RangeError('Execution revision must be a non-negative safe integer');
  }
  assertTimestamp(session.createdAt, 'Creation timestamp');
  assertTimestamp(session.updatedAt, 'Update timestamp');
  if (toTime(session.updatedAt) < toTime(session.createdAt))
    throw new RangeError('Execution update precedes creation');

  const canonicalPlan = createTradePlan(session.plan, session.source, session.costModel);
  if (JSON.stringify(canonicalPlan) !== JSON.stringify(session.plan)) {
    throw new Error('Persisted trade plan does not match its deterministic validation');
  }
  assertEvents(session.events, session.sessionId, session.createdAt, session.updatedAt);
  assertProcessedCandles(session);
  assertSessionState(session);
}

function submit(
  session: PaperExecutionSession,
  action: Extract<PaperExecutionAction, { type: 'submit' }>,
): PaperExecutionSession {
  assertActionTime(session, action.submittedAt);
  assertId(action.confirmationId, 'Submission confirmation ID');
  if (session.status !== 'draft') {
    if (
      session.submittedAt === action.submittedAt &&
      session.events.some(
        (entry) =>
          entry.type === 'order-submitted' && entry.confirmationId === action.confirmationId,
      )
    )
      return session;
    throw new Error('Paper execution session has already been submitted');
  }
  const baseOrder: WorkingOrder = {
    orderId: session.orderId,
    intent: { ...session.plan.entryIntent },
    direction: session.plan.direction,
    quantity: session.plan.quantity,
    status: session.plan.status === 'valid' ? 'working' : 'rejected',
    submittedAt: action.submittedAt,
    firstEligibleCandleIndex: session.source.decisionCandleIndex + 1,
  };
  if (session.plan.status === 'invalid') {
    return {
      ...session,
      status: 'rejected',
      submittedAt: action.submittedAt,
      updatedAt: action.submittedAt,
      workingOrder: baseOrder,
      events: appendEvent(session, action.submittedAt, 'order-rejected', {
        issueCodes: session.plan.validationIssues
          .filter(({ severity }) => severity === 'error')
          .map(({ code }) => code),
      }),
    };
  }
  let events = appendEvent(session, action.submittedAt, 'order-submitted', {
    orderId: session.orderId,
    confirmationId: action.confirmationId,
    candleIndex: session.source.decisionCandleIndex,
  });
  events = appendEvent({ ...session, events }, action.submittedAt, 'order-working', {
    orderId: session.orderId,
    candleIndex: session.source.decisionCandleIndex,
  });
  return {
    ...session,
    status: 'working',
    submittedAt: action.submittedAt,
    updatedAt: action.submittedAt,
    workingOrder: baseOrder,
    events,
  };
}

function cancelOrder(
  session: PaperExecutionSession,
  action: Extract<PaperExecutionAction, { type: 'cancel-order' }>,
): PaperExecutionSession {
  assertActionTime(session, action.cancelledAt);
  assertId(action.confirmationId, 'Cancellation confirmation ID');
  if (
    session.status === 'cancelled' &&
    session.workingOrder?.cancelledAt === action.cancelledAt &&
    session.events.some(
      (entry) => entry.type === 'order-cancelled' && entry.confirmationId === action.confirmationId,
    )
  )
    return session;
  if (session.status !== 'working' || session.workingOrder?.status !== 'working') {
    throw new Error('Only an unfilled working order can be cancelled');
  }
  return {
    ...session,
    status: 'cancelled',
    updatedAt: action.cancelledAt,
    workingOrder: { ...session.workingOrder, status: 'cancelled', cancelledAt: action.cancelledAt },
    events: appendEvent(session, action.cancelledAt, 'order-cancelled', {
      orderId: session.orderId,
      confirmationId: action.confirmationId,
      candleIndex: session.lastProcessedCandleIndex,
    }),
  };
}

function abandon(
  session: PaperExecutionSession,
  action: Extract<PaperExecutionAction, { type: 'abandon' }>,
): PaperExecutionSession {
  assertActionTime(session, action.abandonedAt);
  assertId(action.confirmationId, 'Abandonment confirmation ID');
  const prior = session.events.find((entry) => entry.type === 'execution-abandoned');
  if (
    session.status === 'cancelled' &&
    prior?.type === 'execution-abandoned' &&
    prior.confirmationId === action.confirmationId &&
    prior.occurredAt === action.abandonedAt
  )
    return session;
  if (!['draft', 'working', 'open'].includes(session.status))
    throw new Error('Completed execution sessions cannot be abandoned');
  const order =
    session.workingOrder?.status === 'working'
      ? { ...session.workingOrder, status: 'cancelled' as const, cancelledAt: action.abandonedAt }
      : session.workingOrder;
  return {
    ...session,
    status: 'cancelled',
    updatedAt: action.abandonedAt,
    ...(order === undefined ? {} : { workingOrder: order }),
    events: appendEvent(session, action.abandonedAt, 'execution-abandoned', {
      confirmationId: action.confirmationId,
      candleIndex: session.lastProcessedCandleIndex,
    }),
  };
}

function processCandles(
  session: PaperExecutionSession,
  action: Extract<PaperExecutionAction, { type: 'process-candles' }>,
): PaperExecutionSession {
  assertActionTime(session, action.processedAt);
  if (
    !['working', 'open', 'closed', 'ambiguous', 'cancelled', 'completed'].includes(session.status)
  ) {
    throw new Error('Paper order must be submitted before candles are processed');
  }
  let next = session;
  let changed = false;
  for (const candle of action.candles) {
    assertCandle(candle, session.source.candleCount);
    if (candle.index <= session.source.decisionCandleIndex) {
      throw new RangeError('Execution cannot process a completed decision candle');
    }
    const existing = next.processedCandles.find(({ index }) => index === candle.index);
    const fingerprint = candleFingerprint(candle);
    if (existing !== undefined) {
      if (existing.fingerprint !== fingerprint || existing.timestamp !== candle.timestamp) {
        throw new Error(`Processed candle ${candle.index} does not match the persisted checkpoint`);
      }
      continue;
    }
    if (candle.index !== next.lastProcessedCandleIndex + 1) {
      throw new RangeError(
        `Execution candles must be processed sequentially; expected ${next.lastProcessedCandleIndex + 1}`,
      );
    }
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
  session: PaperExecutionSession,
  candle: OhlcvCandle,
  processedAt: string,
): PaperExecutionSession {
  if (session.status === 'working' && session.workingOrder?.status === 'working') {
    const entry = entryFillForCandle(session, candle);
    if (entry === undefined) return session;
    let events = appendEvent(session, candle.timestamp, 'order-filled', {
      orderId: session.orderId,
      fill: entry.fill,
      candleIndex: candle.index,
    });
    events = appendEvent({ ...session, events }, candle.timestamp, 'position-opened', {
      positionId: session.positionId,
      fill: entry.fill,
      candleIndex: candle.index,
    });
    const opened: PaperExecutionSession = {
      ...session,
      status: 'open',
      updatedAt: processedAt,
      workingOrder: {
        ...session.workingOrder,
        status: 'filled',
        filledAtCandleIndex: candle.index,
        fill: entry.fill,
      },
      position: {
        positionId: session.positionId,
        direction: session.plan.direction,
        quantity: session.plan.quantity,
        status: 'open',
        openedAtCandleIndex: candle.index,
        entryFill: entry.fill,
        protectiveStopPrice: session.plan.protectiveStopPrice,
        targetPrice: session.plan.targetPrice,
      },
      events,
    };
    return resolvePositionOnCandle(opened, candle, entry.intrabar, processedAt);
  }
  if (session.status === 'open')
    return resolvePositionOnCandle(session, candle, false, processedAt);
  return session;
}

function entryFillForCandle(
  session: PaperExecutionSession,
  candle: OhlcvCandle,
): { readonly fill: ExecutionFill; readonly intrabar: boolean } | undefined {
  const { direction, quantity, entryIntent } = session.plan;
  const side = entrySide(direction);
  if (entryIntent.type === 'market') {
    return {
      fill: adverseFill(
        side,
        candle.open,
        quantity,
        candle.index,
        candle.timestamp,
        false,
        session.costModel,
      ),
      intrabar: false,
    };
  }
  if (entryIntent.type === 'limit') {
    const price = entryIntent.limitPrice;
    const touched = direction === 'long' ? candle.low <= price : candle.high >= price;
    if (!touched) return undefined;
    const atOpen = direction === 'long' ? candle.open <= price : candle.open >= price;
    return {
      fill: limitFill(
        direction,
        price,
        quantity,
        candle.index,
        candle.timestamp,
        session.costModel,
        atOpen,
      ),
      intrabar: !atOpen,
    };
  }
  const trigger = entryIntent.triggerPrice;
  const atOpen = direction === 'long' ? candle.open >= trigger : candle.open <= trigger;
  const touched = direction === 'long' ? candle.high >= trigger : candle.low <= trigger;
  if (!touched && !atOpen) return undefined;
  const reference = atOpen ? candle.open : trigger;
  return {
    fill: adverseFill(
      side,
      reference,
      quantity,
      candle.index,
      candle.timestamp,
      atOpen,
      session.costModel,
    ),
    intrabar: !atOpen,
  };
}

function resolvePositionOnCandle(
  session: PaperExecutionSession,
  candle: OhlcvCandle,
  entryWasIntrabar: boolean,
  processedAt: string,
): PaperExecutionSession {
  const position = session.position;
  if (position === undefined || position.status !== 'open') return session;
  const stopTouched =
    position.direction === 'long'
      ? candle.low <= position.protectiveStopPrice
      : candle.high >= position.protectiveStopPrice;
  const targetTouched =
    position.direction === 'long'
      ? candle.high >= position.targetPrice
      : candle.low <= position.targetPrice;
  const stopGap =
    position.direction === 'long'
      ? candle.open <= position.protectiveStopPrice
      : candle.open >= position.protectiveStopPrice;
  const targetGap =
    position.direction === 'long'
      ? candle.open >= position.targetPrice
      : candle.open <= position.targetPrice;
  if (entryWasIntrabar && (stopTouched || targetTouched)) {
    return makeAmbiguous(session, candle, 'entry-exit-sequence-unknown', processedAt);
  }
  if (!stopGap && !targetGap && stopTouched && targetTouched) {
    return makeAmbiguous(session, candle, 'stop-and-target-same-candle', processedAt);
  }
  if (!stopTouched && !targetTouched) return session;
  const side = exitSide(position.direction);
  let fill: ExecutionFill;
  let outcome: 'stop' | 'target';
  if (stopGap || (stopTouched && !targetGap)) {
    const reference = stopGap ? candle.open : position.protectiveStopPrice;
    fill = adverseFill(
      side,
      reference,
      position.quantity,
      candle.index,
      candle.timestamp,
      stopGap,
      session.costModel,
    );
    outcome = 'stop';
  } else {
    fill = targetFill(
      position.direction,
      position.targetPrice,
      position.quantity,
      candle.index,
      candle.timestamp,
      session.costModel,
      targetGap,
    );
    outcome = 'target';
  }
  const closedPosition: SimulatedPosition = {
    ...position,
    status: outcome === 'stop' ? 'closed-stop' : 'closed-target',
    closedAtCandleIndex: candle.index,
    exitFill: fill,
  };
  const type = outcome === 'stop' ? 'position-closed-stop' : 'position-closed-target';
  const withClose: PaperExecutionSession = {
    ...session,
    status: 'closed',
    position: closedPosition,
    updatedAt: processedAt,
    events: appendEvent(session, candle.timestamp, type, {
      positionId: session.positionId,
      fill,
      candleIndex: candle.index,
    }),
  };
  return { ...withClose, debrief: createDebrief(withClose, candle.timestamp) };
}

function makeAmbiguous(
  session: PaperExecutionSession,
  candle: OhlcvCandle,
  reason: NonNullable<SimulatedPosition['ambiguityReason']>,
  processedAt: string,
): PaperExecutionSession {
  const position = session.position!;
  const ambiguousPosition: SimulatedPosition = {
    ...position,
    status: 'ambiguous',
    closedAtCandleIndex: candle.index,
    ambiguityReason: reason,
  };
  const ambiguous: PaperExecutionSession = {
    ...session,
    status: 'ambiguous',
    position: ambiguousPosition,
    updatedAt: processedAt,
    events: appendEvent(session, candle.timestamp, 'execution-ambiguous', {
      positionId: session.positionId,
      reason,
      candleIndex: candle.index,
    }),
  };
  return { ...ambiguous, debrief: createDebrief(ambiguous, candle.timestamp) };
}

function completeReplay(
  session: PaperExecutionSession,
  completedAt: string,
): PaperExecutionSession {
  assertActionTime(session, completedAt);
  if (session.lastProcessedCandleIndex !== session.source.candleCount - 1) {
    throw new Error('Replay cannot complete before every eligible candle is processed');
  }
  if (session.status === 'completed') return session;
  if (session.status !== 'working' || session.workingOrder?.status !== 'working') return session;
  return {
    ...session,
    status: 'completed',
    updatedAt: completedAt,
    workingOrder: { ...session.workingOrder, status: 'expired', expiredAt: completedAt },
    events: appendEvent(session, completedAt, 'order-expired', {
      orderId: session.orderId,
      candleIndex: session.lastProcessedCandleIndex,
    }),
  };
}

function createDebrief(session: PaperExecutionSession, createdAt: string): ExecutionDebrief {
  const position = session.position!;
  const evidence = session.plan.processEvidence;
  const assessment: ProcessAssessmentItem[] = [
    { id: 'analysis-completed', result: 'met' },
    {
      id: 'direction-aligned',
      result: evidence.analysisDecision === session.plan.direction ? 'met' : 'not-met',
    },
    { id: 'entry-aligned', result: evidence.entryMatchesAnalysis ? 'met' : 'review' },
    { id: 'invalidation-aligned', result: evidence.invalidationMatchesAnalysis ? 'met' : 'review' },
    { id: 'target-aligned', result: evidence.targetMatchesAnalysis ? 'met' : 'review' },
    { id: 'risk-calculable', result: session.plan.status === 'valid' ? 'met' : 'not-met' },
    { id: 'reasoning-preserved', result: evidence.requiredReasoningBypassed ? 'not-met' : 'met' },
  ];
  const met = assessment.filter(({ result }) => result === 'met').length;
  const notMet = assessment.filter(({ result }) => result === 'not-met').length;
  const processQuality =
    notMet >= 2 ? 'needs-review' : met === assessment.length ? 'coherent' : 'mixed';
  const exit = position.exitFill;
  const totalCommissions = money(
    position.entryFill.commission + (exit?.commission ?? 0),
    session.costModel.currencyDecimals,
  );
  const modeledSpreadAndSlippage = money(
    position.quantity *
      (position.entryFill.modeledSpreadAmount +
        position.entryFill.modeledSlippageAmount +
        (exit?.modeledSpreadAmount ?? 0) +
        (exit?.modeledSlippageAmount ?? 0)),
    session.costModel.currencyDecimals,
  );
  const outcome =
    position.status === 'closed-stop'
      ? 'protective-stop'
      : position.status === 'closed-target'
        ? 'target'
        : 'ambiguous';
  let netSimulatedOutcome: number | undefined;
  let riskMultiple: number | undefined;
  if (exit !== undefined) {
    const gross =
      position.direction === 'long'
        ? (exit.price - position.entryFill.price) * position.quantity
        : (position.entryFill.price - exit.price) * position.quantity;
    netSimulatedOutcome = money(gross - totalCommissions, session.costModel.currencyDecimals);
    riskMultiple =
      session.plan.estimatedTotalRisk > 0
        ? netSimulatedOutcome / session.plan.estimatedTotalRisk
        : undefined;
  }
  return {
    debriefId: session.debriefId,
    outcome,
    outcomeDeterminate: outcome !== 'ambiguous',
    processQuality,
    processAssessment: assessment,
    entryPrice: position.entryFill.price,
    ...(exit === undefined ? {} : { exitPrice: exit.price }),
    totalCommissions,
    modeledSpreadAndSlippage,
    ...(netSimulatedOutcome === undefined ? {} : { netSimulatedOutcome }),
    ...(riskMultiple === undefined ? {} : { riskMultiple }),
    assumptionCodes: [
      session.executionPolicy.version,
      session.costModel.version,
      session.executionPolicy.sameCandleAmbiguityPolicy,
      'ohlcv-no-intrabar-sequence',
      'no-partial-fills',
    ],
    createdAt,
  };
}

function validateTradePlanInput(
  input: TradePlanInput,
  source: HistoricalExecutionIdentity,
  costModel: CostModel,
  entry: number,
  estimatedRisk: number,
): TradePlanValidationIssue[] {
  const issues: TradePlanValidationIssue[] = [];
  const error = (code: TradePlanValidationCode, field: string): void => {
    issues.push({ code, field, severity: 'error' });
  };
  const warning = (code: TradePlanValidationCode, field: string): void => {
    issues.push({ code, field, severity: 'warning' });
  };
  if (!source.permittedDirections.includes(input.direction))
    error('DIRECTION_NOT_PERMITTED', 'direction');
  if (!source.permittedEntryOrderTypes.includes(input.entryIntent.type))
    error('ORDER_TYPE_NOT_PERMITTED', 'entryIntent');
  if (!positive(entry)) error('ENTRY_PRICE_MUST_BE_POSITIVE', 'entryIntent');
  else if (!isIncrement(entry, costModel.priceTick))
    error('ENTRY_PRICE_TICK_MISMATCH', 'entryIntent');
  if (!positive(input.protectiveStopPrice))
    error('STOP_PRICE_MUST_BE_POSITIVE', 'protectiveStopPrice');
  else if (!isIncrement(input.protectiveStopPrice, costModel.priceTick))
    error('STOP_PRICE_TICK_MISMATCH', 'protectiveStopPrice');
  if (!positive(input.targetPrice)) error('TARGET_PRICE_MUST_BE_POSITIVE', 'targetPrice');
  else if (!isIncrement(input.targetPrice, costModel.priceTick))
    error('TARGET_PRICE_TICK_MISMATCH', 'targetPrice');
  if (input.direction === 'long') {
    if (!(input.protectiveStopPrice < entry))
      error('LONG_STOP_MUST_BE_BELOW_ENTRY', 'protectiveStopPrice');
    if (!(input.targetPrice > entry)) error('LONG_TARGET_MUST_BE_ABOVE_ENTRY', 'targetPrice');
  } else {
    if (!(input.protectiveStopPrice > entry))
      error('SHORT_STOP_MUST_BE_ABOVE_ENTRY', 'protectiveStopPrice');
    if (!(input.targetPrice < entry)) error('SHORT_TARGET_MUST_BE_BELOW_ENTRY', 'targetPrice');
  }
  if (
    positive(entry) &&
    positive(input.protectiveStopPrice) &&
    Math.abs(entry - input.protectiveStopPrice) === 0
  )
    error('STOP_DISTANCE_MUST_BE_POSITIVE', 'protectiveStopPrice');
  if (!positive(input.fictionalAccountValue))
    error('ACCOUNT_VALUE_MUST_BE_POSITIVE', 'fictionalAccountValue');
  if (!positive(input.intendedRiskAmount))
    error('RISK_BUDGET_MUST_BE_POSITIVE', 'intendedRiskAmount');
  else if (
    positive(input.fictionalAccountValue) &&
    input.intendedRiskAmount > input.fictionalAccountValue
  )
    error('RISK_BUDGET_EXCEEDS_ACCOUNT_VALUE', 'intendedRiskAmount');
  if (!positive(input.quantity)) error('QUANTITY_MUST_BE_POSITIVE', 'quantity');
  if (positive(input.quantity) && !isIncrement(input.quantity, costModel.quantityIncrement))
    error('QUANTITY_INCREMENT_MISMATCH', 'quantity');
  if (
    positive(input.intendedRiskAmount) &&
    Number.isFinite(estimatedRisk) &&
    estimatedRisk > input.intendedRiskAmount + currencyUnit(costModel.currencyDecimals) / 2
  )
    error('ESTIMATED_RISK_EXCEEDS_BUDGET', 'quantity');
  if (
    !Number.isInteger(input.authoredAtCandleIndex) ||
    input.authoredAtCandleIndex !== source.decisionCandleIndex
  )
    error('PLAN_USES_FUTURE_CANDLE', 'authoredAtCandleIndex');
  if (
    ['wait', 'no-trade', 'insufficient-evidence'].includes(input.processEvidence.analysisDecision)
  )
    warning('ANALYSIS_DID_NOT_SUPPORT_TRADE', 'processEvidence.analysisDecision');
  else if (input.processEvidence.analysisDecision !== input.direction)
    warning('PLAN_DIRECTION_DIFFERS_FROM_ANALYSIS', 'direction');
  if (input.processEvidence.requiredReasoningBypassed)
    warning('ANALYSIS_REASONING_BYPASSED', 'processEvidence');
  if (source.learningCredit === 'none')
    warning('DEVELOPMENT_SCENARIO_NO_COURSE_CREDIT', 'source.learningCredit');
  return issues;
}

function adverseFill(
  side: ExecutionSide,
  referencePrice: number,
  quantity: number,
  candleIndex: number,
  timestamp: string,
  gap: boolean,
  model: CostModel,
): ExecutionFill {
  const spread = referencePrice * (model.spreadBps / 2 / 10_000);
  const slippage = referencePrice * (model.slippageBps / 10_000);
  const raw =
    side === 'buy' ? referencePrice + spread + slippage : referencePrice - spread - slippage;
  return {
    side,
    candleIndex,
    timestamp,
    referencePrice,
    price: roundPriceAdverse(raw, side, model.priceTick),
    quantity,
    commission: commission(quantity, model),
    modeledSpreadAmount: spread,
    modeledSlippageAmount: slippage,
    gap,
    priceCappedByLimit: false,
  };
}

function limitFill(
  direction: TradeDirection,
  limitPrice: number,
  quantity: number,
  candleIndex: number,
  timestamp: string,
  model: CostModel,
  gap = false,
): ExecutionFill {
  return {
    side: entrySide(direction),
    candleIndex,
    timestamp,
    referencePrice: limitPrice,
    price: limitPrice,
    quantity,
    commission: commission(quantity, model),
    modeledSpreadAmount: 0,
    modeledSlippageAmount: 0,
    gap,
    priceCappedByLimit: true,
  };
}

function targetFill(
  direction: TradeDirection,
  targetPrice: number,
  quantity: number,
  candleIndex: number,
  timestamp: string,
  model: CostModel,
  gap: boolean,
): ExecutionFill {
  return {
    side: exitSide(direction),
    candleIndex,
    timestamp,
    referencePrice: targetPrice,
    price: targetPrice,
    quantity,
    commission: commission(quantity, model),
    modeledSpreadAmount: 0,
    modeledSlippageAmount: 0,
    gap,
    priceCappedByLimit: true,
  };
}

function commission(quantity: number, model: CostModel): number {
  if (!positive(quantity)) return 0;
  return ceilMoney(
    Math.max(model.minimumCommission, model.commissionFixed + model.commissionPerUnit * quantity),
    model.currencyDecimals,
  );
}

function orderIntentPrice(intent: OrderIntent): number {
  switch (intent.type) {
    case 'market':
      return intent.estimatedEntryPrice;
    case 'limit':
      return intent.limitPrice;
    case 'stop':
      return intent.triggerPrice;
  }
}

function entrySide(direction: TradeDirection): ExecutionSide {
  return direction === 'long' ? 'buy' : 'sell';
}
function exitSide(direction: TradeDirection): ExecutionSide {
  return direction === 'long' ? 'sell' : 'buy';
}

function roundPriceAdverse(value: number, side: ExecutionSide, tick: number): number {
  const units = side === 'buy' ? Math.ceil(value / tick - 1e-10) : Math.floor(value / tick + 1e-10);
  return Number((units * tick).toFixed(decimalPlaces(tick) + 2));
}

function money(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}
function ceilMoney(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.ceil((value - Number.EPSILON) * factor) / factor;
}
function currencyUnit(decimals: number): number {
  return 1 / 10 ** decimals;
}
function decimalPlaces(value: number): number {
  const text = value.toString().toLowerCase();
  if (text.includes('e-')) return Number(text.split('e-')[1]);
  return text.includes('.') ? text.split('.')[1]!.length : 0;
}

function event<T extends ExecutionEvent['type']>(
  sessionId: string,
  sequence: number,
  occurredAt: string,
  type: T,
  data: Omit<Extract<ExecutionEvent, { type: T }>, keyof BaseExecutionEvent | 'type'> & {
    readonly candleIndex?: number;
  },
): Extract<ExecutionEvent, { type: T }> {
  return {
    eventId: `${sessionId}:event:${sequence}`,
    sequence,
    occurredAt,
    type,
    ...data,
  } as Extract<ExecutionEvent, { type: T }>;
}

function appendEvent<T extends ExecutionEvent['type']>(
  session: Pick<PaperExecutionSession, 'sessionId' | 'events'>,
  occurredAt: string,
  type: T,
  data: Omit<Extract<ExecutionEvent, { type: T }>, keyof BaseExecutionEvent | 'type'> & {
    readonly candleIndex?: number;
  },
): readonly ExecutionEvent[] {
  return [
    ...session.events,
    event(session.sessionId, session.events.length, occurredAt, type, data),
  ];
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

function assertEvents(
  events: readonly ExecutionEvent[],
  sessionId: string,
  createdAt: string,
  updatedAt: string,
): void {
  if (events.length === 0 || events[0]?.type !== 'session-created')
    throw new Error('Execution event history must begin with session-created');
  events.forEach((entry, index) => {
    if (entry.sequence !== index || entry.eventId !== `${sessionId}:event:${index}`)
      throw new Error('Execution events must have deterministic sequential identities');
    assertTimestamp(entry.occurredAt, 'Execution event timestamp');
    if (
      entry.candleIndex === undefined &&
      (toTime(entry.occurredAt) < toTime(createdAt) || toTime(entry.occurredAt) > toTime(updatedAt))
    )
      throw new RangeError('Execution event timestamp is outside the session lifetime');
  });
}

function assertProcessedCandles(session: PaperExecutionSession): void {
  let expected = session.source.decisionCandleIndex + 1;
  for (const candle of session.processedCandles) {
    if (candle.index !== expected)
      throw new Error('Processed execution candles must form a contiguous sequence');
    assertTimestamp(candle.timestamp, 'Processed candle timestamp');
    if (candle.fingerprint.length === 0)
      throw new Error('Processed candle fingerprint is required');
    expected += 1;
  }
  if (session.lastProcessedCandleIndex !== expected - 1)
    throw new Error('Last processed candle does not match checkpoints');
}

function assertSessionState(session: PaperExecutionSession): void {
  if (session.status === 'draft') {
    if (
      session.workingOrder !== undefined ||
      session.position !== undefined ||
      session.submittedAt !== undefined
    )
      throw new Error('Draft execution contains submitted state');
  } else {
    if (session.workingOrder === undefined && session.status !== 'cancelled')
      throw new Error('Submitted execution is missing its order');
  }
  if (session.submittedAt !== undefined)
    assertTimestamp(session.submittedAt, 'Submission timestamp');
  if (session.workingOrder !== undefined) {
    if (session.workingOrder.orderId !== session.orderId)
      throw new Error('Working order identity mismatch');
    if (
      session.workingOrder.direction !== session.plan.direction ||
      session.workingOrder.quantity !== session.plan.quantity ||
      JSON.stringify(session.workingOrder.intent) !== JSON.stringify(session.plan.entryIntent)
    )
      throw new Error('Working order does not match the submitted trade plan');
    assertTimestamp(session.workingOrder.submittedAt, 'Working order submission timestamp');
    if (session.workingOrder.submittedAt !== session.submittedAt)
      throw new Error('Working order and session submission timestamps differ');
    if (session.workingOrder.firstEligibleCandleIndex !== session.source.decisionCandleIndex + 1)
      throw new Error('Working order eligibility mismatch');
  }
  if (['open', 'closed', 'ambiguous'].includes(session.status) && session.position === undefined)
    throw new Error('Execution position state is missing');
  if (session.position !== undefined && session.position.positionId !== session.positionId)
    throw new Error('Position identity mismatch');
  if (session.position !== undefined) {
    if (
      session.position.direction !== session.plan.direction ||
      session.position.quantity !== session.plan.quantity ||
      session.position.protectiveStopPrice !== session.plan.protectiveStopPrice ||
      session.position.targetPrice !== session.plan.targetPrice
    )
      throw new Error('Position does not match the submitted trade plan');
    if (
      session.workingOrder?.fill === undefined ||
      JSON.stringify(session.position.entryFill) !== JSON.stringify(session.workingOrder.fill)
    )
      throw new Error('Position entry does not match the filled order');
    assertFill(session.position.entryFill, session.source.candleCount, session.position.quantity);
    if (session.position.exitFill !== undefined)
      assertFill(session.position.exitFill, session.source.candleCount, session.position.quantity);
  }

  const expectedOrderStatus: Partial<Record<PaperExecutionStatus, WorkingOrderStatus>> = {
    working: 'working',
    open: 'filled',
    closed: 'filled',
    ambiguous: 'filled',
    rejected: 'rejected',
    completed: 'expired',
  };
  const requiredOrderStatus = expectedOrderStatus[session.status];
  if (requiredOrderStatus !== undefined && session.workingOrder?.status !== requiredOrderStatus)
    throw new Error(`Execution ${session.status} state has an inconsistent order lifecycle`);
  if (
    session.status === 'cancelled' &&
    session.workingOrder !== undefined &&
    !['cancelled', 'filled'].includes(session.workingOrder.status)
  )
    throw new Error('Cancelled execution has an inconsistent order lifecycle');

  if (session.status === 'open' && session.position?.status !== 'open')
    throw new Error('Open execution has an inconsistent position lifecycle');
  if (
    session.status === 'closed' &&
    !['closed-stop', 'closed-target'].includes(session.position?.status ?? '')
  )
    throw new Error('Closed execution has an inconsistent position lifecycle');
  if (session.status === 'ambiguous' && session.position?.status !== 'ambiguous')
    throw new Error('Ambiguous execution has an inconsistent position lifecycle');
  if (['closed', 'ambiguous'].includes(session.status)) {
    if (session.debrief === undefined) throw new Error('Resolved execution is missing its debrief');
    if (session.debrief.debriefId !== session.debriefId)
      throw new Error('Execution debrief identity mismatch');
    const canonicalDebrief = createDebrief(session, session.debrief.createdAt);
    if (JSON.stringify(canonicalDebrief) !== JSON.stringify(session.debrief))
      throw new Error('Persisted execution debrief does not match deterministic state');
  } else if (session.debrief !== undefined)
    throw new Error('Unresolved execution contains a debrief');
}

function assertFill(fill: ExecutionFill, candleCount: number, quantity: number): void {
  if (
    !Number.isInteger(fill.candleIndex) ||
    fill.candleIndex < 0 ||
    fill.candleIndex >= candleCount
  )
    throw new RangeError('Execution fill candle index is outside the pinned dataset');
  assertTimestamp(fill.timestamp, 'Execution fill timestamp');
  if (
    !positive(fill.referencePrice) ||
    !positive(fill.price) ||
    fill.quantity !== quantity ||
    !Number.isFinite(fill.commission) ||
    fill.commission < 0 ||
    !Number.isFinite(fill.modeledSpreadAmount) ||
    fill.modeledSpreadAmount < 0 ||
    !Number.isFinite(fill.modeledSlippageAmount) ||
    fill.modeledSlippageAmount < 0
  )
    throw new RangeError('Execution fill contains invalid values');
}

function assertExecutionIdentity(identity: HistoricalExecutionIdentity): void {
  [
    identity.datasetId,
    identity.datasetVersion,
    identity.scenarioId,
    identity.scenarioVersion,
    identity.analysisSessionId,
  ].forEach((id) => assertId(id, 'Historical execution identity'));
  if (!/^sha256:[a-f0-9]{64}$/.test(identity.canonicalChecksum))
    throw new Error('Historical execution checksum must be lowercase SHA-256');
  assertTimestamp(identity.analysisFinalizedAt, 'Analysis finalization timestamp');
  if (!Number.isInteger(identity.decisionCandleIndex) || identity.decisionCandleIndex < 0)
    throw new RangeError('Decision candle index must be non-negative');
  if (
    !Number.isInteger(identity.candleCount) ||
    identity.candleCount <= identity.decisionCandleIndex + 1
  )
    throw new RangeError('Historical execution requires a candle after the decision');
  if (!['course', 'none'].includes(identity.learningCredit))
    throw new Error('Unknown historical learning credit');
  assertEnumSet(identity.permittedDirections, ['long', 'short'], 'permitted direction');
  assertEnumSet(
    identity.permittedEntryOrderTypes,
    ['market', 'limit', 'stop'],
    'permitted entry order type',
  );
}

function assertExecutionPolicy(policy: ExecutionPolicy): void {
  if (
    policy.version !== EXECUTION_POLICY_VERSION ||
    policy.marketEntryPoint !== 'next-candle-open' ||
    policy.limitFillPolicy !== 'limit-price-no-improvement' ||
    policy.entryStopGapPolicy !== 'adverse-opening-price' ||
    policy.protectiveStopGapPolicy !== 'adverse-opening-price' ||
    policy.targetGapPolicy !== 'target-price-no-improvement' ||
    policy.sameCandleAmbiguityPolicy !== 'pause-as-ambiguous' ||
    policy.intrabarEntryExitPolicy !== 'pause-as-ambiguous' ||
    policy.partialFillsModeled !== false
  )
    throw new Error('Unsupported execution policy');
}

function assertCostModel(model: CostModel): void {
  if (model.version !== COST_MODEL_VERSION)
    throw new Error(`Unsupported cost model version: ${String(model.version)}`);
  for (const [field, value] of Object.entries(model)) {
    if (field === 'version' || field === 'currencyDecimals') continue;
    if (!Number.isFinite(value) || value < 0)
      throw new RangeError(`Cost model ${field} must be finite and non-negative`);
  }
  if (!positive(model.priceTick) || !positive(model.quantityIncrement))
    throw new RangeError('Cost model increments must be positive');
  if (
    !Number.isInteger(model.currencyDecimals) ||
    model.currencyDecimals < 0 ||
    model.currencyDecimals > 8
  )
    throw new RangeError('Currency decimals must be an integer from zero through eight');
}

function assertCandle(candle: OhlcvCandle, candleCount: number): void {
  if (!Number.isInteger(candle.index) || candle.index < 0 || candle.index >= candleCount)
    throw new RangeError('Execution candle index is outside the pinned dataset');
  assertTimestamp(candle.timestamp, 'Execution candle timestamp');
  if (
    ![candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite) ||
    candle.open <= 0 ||
    candle.high <= 0 ||
    candle.low <= 0 ||
    candle.close <= 0 ||
    candle.volume < 0 ||
    candle.low > Math.min(candle.open, candle.close) ||
    candle.high < Math.max(candle.open, candle.close) ||
    candle.low > candle.high
  )
    throw new RangeError('Execution candle contains invalid OHLCV values');
}

function cloneIdentity(identity: HistoricalExecutionIdentity): HistoricalExecutionIdentity {
  return {
    ...identity,
    permittedDirections: [...identity.permittedDirections],
    permittedEntryOrderTypes: [...identity.permittedEntryOrderTypes],
  };
}

function assertActionTime(session: PaperExecutionSession, timestamp: string): void {
  assertTimestamp(timestamp, 'Execution action timestamp');
  if (toTime(timestamp) < toTime(session.updatedAt))
    throw new RangeError('Execution action timestamp precedes the current state');
}

function assertTimestamp(value: string, label: string): void {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value)
    throw new Error(`${label} must be a canonical UTC timestamp`);
}
function toTime(value: string): number {
  return Date.parse(value);
}
function assertId(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty`);
}
function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
function isIncrement(value: number, increment: number): boolean {
  return Math.abs(value / increment - Math.round(value / increment)) < 1e-9;
}
function sameSet<T extends string>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}
function assertEnumSet<T extends string>(
  values: readonly T[],
  allowed: readonly T[],
  label: string,
): void {
  if (
    values.length === 0 ||
    new Set(values).size !== values.length ||
    values.some((value) => !allowed.includes(value))
  )
    throw new Error(`Historical execution ${label} set is invalid`);
}
