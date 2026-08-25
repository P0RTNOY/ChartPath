import type { TradeDecision } from './types.js';

export type AnalysisTradeDirection = 'long' | 'short';
export type NoTradeDisposition = Exclude<TradeDecision, 'trade'>;

/** The application-level conclusion of a completed analysis, independent of market outcome. */
export type AnalysisApplicationDecision =
  | {
      readonly kind: 'trade';
      readonly direction: AnalysisTradeDirection;
    }
  | {
      readonly kind: 'no-trade';
      readonly disposition: NoTradeDisposition;
    };

export type AnalysisApplicationAlignment = 'matched' | 'mismatched' | 'unresolved';
export type AnalysisApplicationNextAction =
  'paper-execution' | 'no-trade-review' | 'review-analysis';

export interface ResolveAnalysisApplicationInput {
  readonly expected: AnalysisApplicationDecision;
  readonly learnerDecision?: TradeDecision;
  /** Required only when the learner selected `trade`; never inferred from price action. */
  readonly learnerTradeDirection?: AnalysisTradeDirection;
}

export interface ResolvedAnalysisApplication {
  readonly expected: AnalysisApplicationDecision;
  readonly learner?: AnalysisApplicationDecision;
  readonly alignment: AnalysisApplicationAlignment;
  readonly nextAction: AnalysisApplicationNextAction;
}

function learnerApplicationDecision(
  decision: TradeDecision | undefined,
  direction: AnalysisTradeDirection | undefined,
): AnalysisApplicationDecision | undefined {
  if (decision === undefined) return undefined;
  if (decision === 'trade') {
    return direction === undefined ? undefined : { kind: 'trade', direction };
  }
  return { kind: 'no-trade', disposition: decision };
}

function decisionsEqual(
  left: AnalysisApplicationDecision,
  right: AnalysisApplicationDecision,
): boolean {
  if (left.kind !== right.kind) return false;
  return left.kind === 'trade' && right.kind === 'trade'
    ? left.direction === right.direction
    : left.kind === 'no-trade' &&
        right.kind === 'no-trade' &&
        left.disposition === right.disposition;
}

/**
 * Resolves only authored and learner decisions. It accepts no candles, fills, prices, or outcome
 * data, so later market action cannot retroactively change the application result.
 */
export function resolveAnalysisApplication(
  input: ResolveAnalysisApplicationInput,
): ResolvedAnalysisApplication {
  const expected: AnalysisApplicationDecision = { ...input.expected };
  const learner = learnerApplicationDecision(input.learnerDecision, input.learnerTradeDirection);
  if (learner === undefined) {
    return {
      expected,
      alignment: 'unresolved',
      nextAction: 'review-analysis',
    };
  }
  if (!decisionsEqual(expected, learner)) {
    return {
      expected,
      learner,
      alignment: 'mismatched',
      nextAction: 'review-analysis',
    };
  }
  return {
    expected,
    learner,
    alignment: 'matched',
    nextAction: expected.kind === 'trade' ? 'paper-execution' : 'no-trade-review',
  };
}
