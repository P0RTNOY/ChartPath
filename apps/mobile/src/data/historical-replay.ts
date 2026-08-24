import {
  historicalContentRegistry,
  resolveHistoricalContent,
  type HistoricalContentRegistry,
  type ResolvedHistoricalContent,
} from '@chartpath/content';
import {
  createReplayKnowledgeView,
  verifyDatasetIdentity,
  type HistoricalDataset,
  type ReplayKnowledgeView,
} from '@chartpath/historical-data';
import {
  analysisChartIdentitiesEqual,
  type GuidedAnalysisSession,
  type HistoricalAnalysisChartIdentity,
  type OhlcvCandle,
} from '@chartpath/domain';

export type HistoricalSessionResolutionStatus =
  | 'ready'
  | 'scenario-missing'
  | 'dataset-missing'
  | 'checksum-mismatch'
  | 'metadata-mismatch'
  | 'dataset-modified';

export interface HistoricalReplayReady {
  readonly status: 'ready';
  readonly content: ResolvedHistoricalContent;
  readonly chartIdentity: HistoricalAnalysisChartIdentity;
  readonly initialKnowledgeView: ReplayKnowledgeView;
  readonly chartEvidence: {
    readonly candles: readonly OhlcvCandle[];
    readonly decisionCandleIndex: number;
  };
}

export type HistoricalReplayResolution =
  | HistoricalReplayReady
  | {
      readonly status: Exclude<HistoricalSessionResolutionStatus, 'ready'>;
      readonly message: string;
    };

function unavailable(
  status: Exclude<HistoricalSessionResolutionStatus, 'ready'>,
  message: string,
): HistoricalReplayResolution {
  return { status, message };
}

function intervalIdentity(dataset: HistoricalDataset): string {
  const { unit, value, milliseconds } = dataset.manifest.interval;
  return `${unit}:${value}:${milliseconds}`;
}

export function historicalChartIdentity(
  content: ResolvedHistoricalContent,
): HistoricalAnalysisChartIdentity {
  const { dataset, scenario, learningCredit } = content;
  return {
    kind: 'historical',
    id: `historical:${scenario.scenarioId}`,
    scenarioId: scenario.scenarioId,
    scenarioVersion: scenario.scenarioVersion,
    datasetId: dataset.manifest.datasetId,
    datasetVersion: dataset.manifest.datasetVersion,
    canonicalChecksum: dataset.manifest.canonicalChecksum,
    candleCount: dataset.candles.length,
    interval: intervalIdentity(dataset),
    firstCandleTimestamp: dataset.candles[0]!.timestampUtc,
    lastCandleTimestamp: dataset.candles.at(-1)!.timestampUtc,
    decisionCandleIndex: scenario.decisionCandleIndex,
    learningCredit,
  };
}

/** Converts only evidence knowable by the decision candle; future candles never reach grading. */
export function historicalChartEvidence(
  dataset: HistoricalDataset,
  decisionCandleIndex: number,
): HistoricalReplayReady['chartEvidence'] {
  if (
    !Number.isInteger(decisionCandleIndex) ||
    decisionCandleIndex < 0 ||
    decisionCandleIndex >= dataset.candles.length
  ) {
    throw new RangeError('Historical decision candle is outside the canonical dataset.');
  }
  return {
    candles: dataset.candles.slice(0, decisionCandleIndex + 1).map((candle) => ({
      index: candle.index,
      timestamp: candle.timestampUtc,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    })),
    decisionCandleIndex,
  };
}

export function resolveHistoricalReplayScenario(
  scenarioId: string,
  registry: HistoricalContentRegistry = historicalContentRegistry,
): HistoricalReplayResolution {
  const scenarios = registry.scenarios.filter((scenario) => scenario.scenarioId === scenarioId);
  if (scenarios.length === 0)
    return unavailable('scenario-missing', `Historical scenario is unavailable: ${scenarioId}.`);
  if (scenarios.length !== 1)
    return unavailable(
      'metadata-mismatch',
      `Historical scenario is registered more than once: ${scenarioId}.`,
    );
  const scenario = scenarios[0]!;
  const dataset = registry.datasets.find(
    (candidate) =>
      candidate.manifest.datasetId === scenario.dataset.datasetId &&
      candidate.manifest.datasetVersion === scenario.dataset.datasetVersion,
  );
  if (!dataset)
    return unavailable(
      'dataset-missing',
      `Pinned historical dataset is unavailable: ${scenario.dataset.datasetId}@${scenario.dataset.datasetVersion}.`,
    );
  if (dataset.manifest.canonicalChecksum !== scenario.dataset.canonicalChecksum)
    return unavailable('checksum-mismatch', 'Historical scenario and dataset checksums disagree.');

  const identity = verifyDatasetIdentity(scenario.dataset, dataset);
  if (!identity.ok) {
    if (identity.reason === 'modified')
      return unavailable('dataset-modified', 'Canonical historical dataset content was modified.');
    if (identity.reason === 'checksum-mismatch')
      return unavailable(
        'checksum-mismatch',
        'Canonical historical dataset checksum is incompatible.',
      );
    if (identity.reason === 'missing')
      return unavailable('dataset-missing', 'Canonical historical dataset is unavailable.');
    return unavailable(
      'metadata-mismatch',
      'Historical dataset identity metadata is incompatible.',
    );
  }

  const resolved = resolveHistoricalContent(scenarioId, registry);
  if (!resolved.ok)
    return unavailable(
      'metadata-mismatch',
      resolved.issues.map(({ code }) => code).join(', ') ||
        'Historical content metadata is invalid.',
    );
  const chartIdentity = historicalChartIdentity(resolved.value);
  try {
    return {
      status: 'ready',
      content: resolved.value,
      chartIdentity,
      initialKnowledgeView: createReplayKnowledgeView(
        dataset,
        scenario,
        scenario.initialVisibleRange.endCandleIndex,
      ),
      chartEvidence: historicalChartEvidence(dataset, scenario.decisionCandleIndex),
    };
  } catch (error) {
    return unavailable(
      'metadata-mismatch',
      error instanceof Error ? error.message : 'Historical replay metadata is incompatible.',
    );
  }
}

/** Re-resolves every pinned field. It never repairs, substitutes, repins, or clamps a session. */
export function resolveHistoricalAnalysisSession(
  session: GuidedAnalysisSession,
  registry: HistoricalContentRegistry = historicalContentRegistry,
): HistoricalReplayResolution {
  if (session.chart.kind !== 'historical')
    return unavailable('metadata-mismatch', 'Analysis session is not historical.');
  const resolved = resolveHistoricalReplayScenario(session.chart.scenarioId, registry);
  if (resolved.status !== 'ready') return resolved;
  if (session.chart.canonicalChecksum !== resolved.chartIdentity.canonicalChecksum)
    return unavailable(
      'checksum-mismatch',
      'Session checksum does not match installed historical data.',
    );
  if (!analysisChartIdentitiesEqual(session.chart, resolved.chartIdentity))
    return unavailable(
      'metadata-mismatch',
      'Session historical metadata does not match installed content.',
    );
  return resolved;
}
