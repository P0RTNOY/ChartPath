import {
  internalHistoricalContentRegistry,
  type HistoricalContentRegistry,
  type ResolvedHistoricalContent,
} from '@chartpath/content';
import {
  COST_MODEL_VERSION,
  EXECUTION_POLICY_VERSION,
  assertCompatibleExecutionIdentity,
  resolveAnalysisApplication,
  type AnalysisTradeDirection,
  type HistoricalExecutionIdentity,
  type OhlcvCandle,
  type PaperExecutionSession,
  type ResolvedAnalysisApplication,
  type TradePlanProcessEvidence,
} from '@chartpath/domain';

import {
  resolveHistoricalAnalysisSession,
  type HistoricalSessionResolutionStatus,
} from './historical-replay';

export type PaperExecutionResolutionStatus =
  | HistoricalSessionResolutionStatus
  | 'analysis-not-finalized'
  | 'analysis-application-mismatch'
  | 'analysis-application-unresolved'
  | 'execution-not-enabled'
  | 'hypothetical-mechanics-restricted'
  | 'unsupported-execution-policy'
  | 'execution-boundary-mismatch'
  | 'execution-direction-mismatch'
  | 'execution-identity-mismatch';

export type PaperExecutionAccessMode = 'ordinary' | 'qa-hypothetical-mechanics';

export interface PaperExecutionResolutionOptions {
  /** Hypothetical mechanics are deliberately inaccessible to ordinary learner flows. */
  readonly accessMode?: PaperExecutionAccessMode;
  /** A proposed plan direction must agree with the completed analysis before allocation. */
  readonly proposedDirection?: AnalysisTradeDirection;
}

export interface HistoricalAnalysisApplicationReady {
  readonly status: 'ready';
  readonly content: ResolvedHistoricalContent;
  readonly application: ResolvedAnalysisApplication;
}

export type HistoricalAnalysisApplicationResolution =
  | HistoricalAnalysisApplicationReady
  | {
      readonly status:
        | Exclude<HistoricalSessionResolutionStatus, 'ready'>
        | 'analysis-not-finalized'
        | 'analysis-application-mismatch'
        | 'analysis-application-unresolved';
      readonly message: string;
    };

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
  readonly mode: 'aligned' | 'hypothetical-mechanics';
  readonly application: ResolvedAnalysisApplication;
  readonly analysisProcessEvidence: TradePlanProcessEvidence;
}

export type PaperExecutionResolution =
  | PaperExecutionReady
  | {
      readonly status: Exclude<PaperExecutionResolutionStatus, 'ready'>;
      readonly message: string;
    };

function unavailable<Status extends Exclude<PaperExecutionResolutionStatus, 'ready'>>(
  status: Status,
  message: string,
): { readonly status: Status; readonly message: string } {
  return { status, message };
}

function analysisProcessEvidence(
  session: Parameters<typeof resolveHistoricalAnalysisSession>[0],
  application: ResolvedAnalysisApplication,
): TradePlanProcessEvidence {
  const learner = application.learner;
  const analysisDecision =
    learner?.kind === 'trade'
      ? learner.direction
      : learner?.kind === 'no-trade'
        ? learner.disposition === 'reject'
          ? 'no-trade'
          : learner.disposition
        : 'insufficient-evidence';
  const analysisSupportsExecution = learner?.kind === 'trade';
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

/** Resolves the finalized Guided answer against authored application metadata before any replay. */
export function resolveHistoricalAnalysisApplication(
  session: Parameters<typeof resolveHistoricalAnalysisSession>[0],
  registry: HistoricalContentRegistry = internalHistoricalContentRegistry,
  proposedDirection?: AnalysisTradeDirection,
): HistoricalAnalysisApplicationResolution {
  if (session.status !== 'finalized' || session.finalizedAt === undefined) {
    return unavailable(
      'analysis-not-finalized',
      'Application resolution requires an immutable finalized historical analysis.',
    );
  }
  const historical = resolveHistoricalAnalysisSession(session, registry);
  if (historical.status !== 'ready') return historical;
  const management = session.steps.management.answer;
  const learnerDecision = management?.kind === 'decision' ? management.decision : undefined;
  const expected = historical.content.scenario.application.expectedDecision;
  // Guided trade answers are scenario-directed. A concrete plan direction, when supplied, takes
  // precedence and must match; no direction is inferred from candles or later market action.
  const learnerTradeDirection =
    proposedDirection ?? (expected.kind === 'trade' ? expected.direction : undefined);
  const application = resolveAnalysisApplication({
    expected,
    learnerDecision,
    ...(learnerTradeDirection === undefined ? {} : { learnerTradeDirection }),
  });
  if (application.alignment === 'unresolved') {
    return unavailable(
      'analysis-application-unresolved',
      'The finalized analysis does not contain a resolvable application decision.',
    );
  }
  if (application.alignment === 'mismatched') {
    return unavailable(
      'analysis-application-mismatch',
      'The finalized analysis or proposed direction does not match the canonical application decision.',
    );
  }
  return { status: 'ready', content: historical.content, application };
}

/**
 * Resolves a completed historical analysis into an execution identity. Every persisted field is
 * pinned from the verified registry; callers cannot supply or repair identity metadata.
 */
export function resolvePaperExecutionAnalysisSession(
  session: Parameters<typeof resolveHistoricalAnalysisSession>[0],
  registry: HistoricalContentRegistry = internalHistoricalContentRegistry,
  options: PaperExecutionResolutionOptions = {},
): PaperExecutionResolution {
  const applicationResolution = resolveHistoricalAnalysisApplication(
    session,
    registry,
    options.proposedDirection,
  );
  if (applicationResolution.status !== 'ready') return applicationResolution;
  const historical = resolveHistoricalAnalysisSession(session, registry);
  if (historical.status !== 'ready') return historical;
  const configuration = applicationResolution.content.scenario.paperExecution;
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

  const { application } = applicationResolution;
  if (
    options.proposedDirection !== undefined &&
    !configuration.permittedDirections.includes(options.proposedDirection)
  ) {
    return unavailable(
      'execution-direction-mismatch',
      'The proposed paper direction is not permitted by the canonical scenario.',
    );
  }
  if (
    configuration.mode === 'hypothetical-mechanics' &&
    (options.accessMode !== 'qa-hypothetical-mechanics' || !__DEV__)
  ) {
    return unavailable(
      'hypothetical-mechanics-restricted',
      'Hypothetical mechanics are available only inside the explicit development QA boundary.',
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
      analysisFinalizedAt: session.finalizedAt!,
      decisionCandleIndex: historical.chartIdentity.decisionCandleIndex,
      candleCount: historical.chartIdentity.candleCount,
      learningCredit: historical.chartIdentity.learningCredit,
      permittedDirections: [...configuration.permittedDirections],
      permittedEntryOrderTypes: [...configuration.permittedEntryOrderTypes],
    },
    candles: domainCandles(historical.content),
    executionBoundary: { ...configuration.executionBoundary },
    learnerDisclosureHebrew: configuration.learnerDisclosureHebrew,
    mode: configuration.mode,
    application,
    analysisProcessEvidence: analysisProcessEvidence(session, application),
  };
}

/** Rebinds a persisted execution only when its finalized analysis and installed data still match. */
export function resolvePaperExecutionSession(
  execution: PaperExecutionSession,
  analysisSessions: readonly Parameters<typeof resolveHistoricalAnalysisSession>[0][],
  registry: HistoricalContentRegistry = internalHistoricalContentRegistry,
  options: PaperExecutionResolutionOptions = {},
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
  const resolved = resolvePaperExecutionAnalysisSession(analysis, registry, {
    ...options,
    proposedDirection: options.proposedDirection ?? execution.plan.direction,
  });
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
