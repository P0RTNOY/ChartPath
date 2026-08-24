import type { HistoricalDataset, HistoricalReplayScenario, ReplayKnowledgeView } from './types.js';
import { verifyDatasetIdentity } from './validation.js';

export function createReplayKnowledgeView(
  dataset: HistoricalDataset,
  scenario: HistoricalReplayScenario,
  cursor: number,
  finalized = false,
): ReplayKnowledgeView {
  const identity = verifyDatasetIdentity(scenario.dataset, dataset);
  if (!identity.ok) throw new Error(`historical-dataset-${identity.reason}`);
  if (!Number.isInteger(cursor) || cursor < scenario.initialVisibleRange.endCandleIndex)
    throw new RangeError('Replay cursor must be an integer at or after the initial visible range.');
  const cutoff = Math.min(
    scenario.decisionCandleIndex,
    scenario.permittedReplayBoundaryIndex,
    scenario.knowledgeCutoffIndex,
  );
  if (cursor > cutoff) throw new RangeError('Replay cursor exceeds the scenario knowledge cutoff.');

  const revealIdentity =
    !scenario.blindMode || (finalized && scenario.revealPolicy === 'after-finalization');
  const sourceCandles = dataset.candles.slice(
    scenario.initialVisibleRange.startCandleIndex,
    cursor + 1,
  );
  const candles = sourceCandles.map(({ timestampUtc, exchangeLocalTimestamp, ...candle }) =>
    revealIdentity ? { ...candle, timestampUtc, exchangeLocalTimestamp } : candle,
  );
  const statistics = sourceCandles.reduce(
    (result, candle) => ({
      low: Math.min(result.low, candle.low),
      high: Math.max(result.high, candle.high),
      volume: result.volume + candle.volume,
    }),
    { low: Number.POSITIVE_INFINITY, high: Number.NEGATIVE_INFINITY, volume: 0 },
  );

  return {
    scenarioId: scenario.scenarioId,
    cursor,
    candles,
    annotations: scenario.annotations.filter(
      (annotation) => annotation.visibleFromCandleIndex <= cursor,
    ),
    corporateActions: dataset.corporateActions.filter(
      (action) => action.knownFromCandleIndex <= cursor,
    ),
    visibleStatistics: statistics,
    visibleScale: { minimum: statistics.low, maximum: statistics.high },
    identity: revealIdentity
      ? {
          symbol: dataset.manifest.symbol,
          displaySymbol: dataset.manifest.displaySymbol,
          exchange: dataset.manifest.exchange,
          periodStartUtc: dataset.manifest.startTimestampUtc,
          periodEndUtc: dataset.manifest.endTimestampUtc,
        }
      : null,
    titleHebrew: revealIdentity ? scenario.revealedTitleHebrew : scenario.blindTitleHebrew,
    accessibilityLabel: revealIdentity
      ? `${scenario.revealedTitleHebrew}, ${dataset.manifest.displaySymbol}, ${candles.length} נרות`
      : `תרחיש היסטורי עיוור, ${candles.length} נרות, מיקום ${cursor + 1}`,
  };
}
