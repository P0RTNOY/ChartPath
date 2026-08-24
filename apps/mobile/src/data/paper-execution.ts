import {
  historicalContentRegistry,
  type HistoricalContentRegistry,
  type ResolvedHistoricalContent,
} from '@chartpath/content';
import {
  COST_MODEL_VERSION,
  EXECUTION_POLICY_VERSION,
  assertCompatibleExecutionIdentity,
  type HistoricalExecutionIdentity,
  type OhlcvCandle,
  type PaperExecutionSession,
  type TradePlanProcessEvidence,
} from '@chartpath/domain';

import {
  resolveHistoricalAnalysisSession,
  type HistoricalSessionResolutionStatus,
} from './historical-replay';

export type PaperExecutionResolutionStatus =
  | HistoricalSessionResolutionStatus
  | 'analysis-not-finalized'
  | 'execution-not-enabled'
  | 'unsupported-execution-policy'
  | 'execution-boundary-mismatch'
  | 'execution-identity-mismatch';

export interface PaperExecutionReady {
  readonly status: 'ready';
  readonly content: ResolvedHistoricalContent;
  readonly source: HistoricalExecutionIdentity;
  /** Full canonical history. Callers must render only through their own execution cursor. */
  readonly candles: readonly OhlcvCandle[];
  readonly executionBoundary: {
    readonly afterDecisionCandleIndex: number;
    readonly lastCandleIndex: number;
  };
  readonly learnerDisclosureHebrew: string;
  readonly analysisProcessEvidence: TradePlanProcessEvidence;
}

export type PaperExecutionResolution =
  | PaperExecutionReady
  | {
      readonly status: Exclude<PaperExecutionResolutionStatus, 'ready'>;
      readonly message: string;
    };

function unavailable(
  status: Exclude<PaperExecutionResolutionStatus, 'ready'>,
  message: string,
): PaperExecutionResolution {
  return { status, message };
}

function analysisProcessEvidence(
  session: Parameters<typeof resolveHistoricalAnalysisSession>[0],
  permittedDirections: HistoricalExecutionIdentity['permittedDirections'],
): TradePlanProcessEvidence {
  const management = session.steps.management.answer;
  const recordedDecision = management?.kind === 'decision' ? management.decision : undefined;
  const analysisDecision =
    recordedDecision === 'trade'
      ? permittedDirections.length === 1
        ? permittedDirections[0]
        : 'insufficient-evidence'
      : recordedDecision === 'reject'
        ? 'no-trade'
        : (recordedDecision ?? 'insufficient-evidence');
  const analysisSupportsExecution =
    (analysisDecision === 'long' || analysisDecision === 'short') &&
    permittedDirections.includes(analysisDecision);
  return {
    analysisDecision,
    entryMatchesAnalysis: analysisSupportsExecution && session.steps.entry.result?.correct === true,
    invalidationMatchesAnalysis:
      analysisSupportsExecution && session.steps.invalidation.result?.correct === true,
    targetMatchesAnalysis:
      analysisSupportsExecution && session.steps.target.result?.correct === true,
    requiredReasoningBypassed:
      !analysisSupportsExecution ||
      Object.values(session.steps).some(({ result }) => result?.correct !== true),
  };
}

function domainCandles(content: ResolvedHistoricalContent): readonly OhlcvCandle[] {
  return content.dataset.candles.map((candle) => ({
    index: candle.index,
    timestamp: candle.timestampUtc,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));
}

/**
 * Resolves a completed historical analysis into an execution identity. Every persisted field is
 * pinned from the verified registry; callers cannot supply or repair identity metadata.
 */
export function resolvePaperExecutionAnalysisSession(
  session: Parameters<typeof resolveHistoricalAnalysisSession>[0],
  registry: HistoricalContentRegistry = historicalContentRegistry,
): PaperExecutionResolution {
  if (session.status !== 'finalized' || session.finalizedAt === undefined) {
    return unavailable(
      'analysis-not-finalized',
      'Paper execution requires an immutable finalized historical analysis.',
    );
  }
  const historical = resolveHistoricalAnalysisSession(session, registry);
  if (historical.status !== 'ready') return historical;
  const configuration = historical.content.scenario.paperExecution;
  if (configuration?.enabled !== true) {
    return unavailable(
      'execution-not-enabled',
      'The historical scenario is not enabled for paper execution.',
    );
  }
  if (
    configuration.executionPolicyVersion !== EXECUTION_POLICY_VERSION ||
    configuration.costModelVersion !== COST_MODEL_VERSION
  ) {
    return unavailable(
      'unsupported-execution-policy',
      'The scenario requires an execution policy or cost model unavailable in this app version.',
    );
  }
  if (
    configuration.executionBoundary.afterDecisionCandleIndex !==
      historical.chartIdentity.decisionCandleIndex ||
    configuration.executionBoundary.lastCandleIndex !==
      historical.content.dataset.candles.length - 1
  ) {
    return unavailable(
      'execution-boundary-mismatch',
      'The execution boundary does not match the checksum-pinned historical dataset.',
    );
  }

  return {
    status: 'ready',
    content: historical.content,
    source: {
      datasetId: historical.chartIdentity.datasetId,
      datasetVersion: historical.chartIdentity.datasetVersion,
      canonicalChecksum: historical.chartIdentity.canonicalChecksum,
      scenarioId: historical.chartIdentity.scenarioId,
      scenarioVersion: historical.chartIdentity.scenarioVersion,
      analysisSessionId: session.sessionId,
      analysisFinalizedAt: session.finalizedAt,
      decisionCandleIndex: historical.chartIdentity.decisionCandleIndex,
      candleCount: historical.chartIdentity.candleCount,
      learningCredit: historical.chartIdentity.learningCredit,
      permittedDirections: [...configuration.permittedDirections],
      permittedEntryOrderTypes: [...configuration.permittedEntryOrderTypes],
    },
    candles: domainCandles(historical.content),
    executionBoundary: { ...configuration.executionBoundary },
    learnerDisclosureHebrew: configuration.learnerDisclosureHebrew,
    analysisProcessEvidence: analysisProcessEvidence(session, configuration.permittedDirections),
  };
}

/** Rebinds a persisted execution only when its finalized analysis and installed data still match. */
export function resolvePaperExecutionSession(
  execution: PaperExecutionSession,
  analysisSessions: readonly Parameters<typeof resolveHistoricalAnalysisSession>[0][],
  registry: HistoricalContentRegistry = historicalContentRegistry,
): PaperExecutionResolution {
  const analysis = analysisSessions.find(
    ({ sessionId }) => sessionId === execution.source.analysisSessionId,
  );
  if (!analysis) {
    return unavailable(
      'execution-identity-mismatch',
      'The finalized source analysis for this paper execution is unavailable.',
    );
  }
  const resolved = resolvePaperExecutionAnalysisSession(analysis, registry);
  if (resolved.status !== 'ready') return resolved;
  try {
    assertCompatibleExecutionIdentity(execution.source, resolved.source);
  } catch {
    return unavailable(
      'execution-identity-mismatch',
      'The paper execution identity does not match its checksum-pinned source analysis.',
    );
  }
  return resolved;
}
