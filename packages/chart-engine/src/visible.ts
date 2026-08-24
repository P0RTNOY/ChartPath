import type { OhlcvCandle } from '@chartpath/domain';

import type { ChartBounds } from './viewport.js';

export interface VisibleCandleProjectionOptions {
  /** Inclusive boundary. Candles after this index can never affect the projection. */
  readonly cutoffCandleIndex: number;
  readonly startCandleIndex?: number;
  readonly endCandleIndex?: number;
  readonly pricePaddingRatio?: number;
  readonly minimumPricePadding?: number;
  readonly minVisibleCandles?: number;
}

export interface VisibleCandleStats {
  readonly candleCount: number;
  readonly firstCandleIndex: number;
  readonly lastCandleIndex: number;
  readonly minimumPrice: number;
  readonly maximumPrice: number;
  readonly maximumVolume: number;
}

export interface VisibleCandleProjection {
  readonly candles: readonly OhlcvCandle[];
  readonly stats?: VisibleCandleStats;
  readonly bounds?: ChartBounds;
}

/**
 * Projects the only candles and scale statistics a cutoff-bound presentation may consume.
 * Values after the inclusive cutoff are deliberately excluded before any extrema are calculated.
 */
export function projectVisibleCandles(
  source: readonly OhlcvCandle[],
  options: VisibleCandleProjectionOptions,
): VisibleCandleProjection {
  if (!Number.isInteger(options.cutoffCandleIndex) || options.cutoffCandleIndex < -1) {
    throw new RangeError('Visible candle cutoff must be an integer at or above -1');
  }
  const start = options.startCandleIndex ?? Number.NEGATIVE_INFINITY;
  const requestedEnd = options.endCandleIndex ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(start) && start !== Number.NEGATIVE_INFINITY) {
    throw new RangeError('Visible candle start must be finite when supplied');
  }
  if (!Number.isFinite(requestedEnd) && requestedEnd !== Number.POSITIVE_INFINITY) {
    throw new RangeError('Visible candle end must be finite when supplied');
  }
  const ratio = options.pricePaddingRatio ?? 0.08;
  const minimumPadding = options.minimumPricePadding ?? 0.01;
  if (!Number.isFinite(ratio) || ratio < 0) {
    throw new RangeError('Visible candle price padding ratio must be finite and non-negative');
  }
  if (!Number.isFinite(minimumPadding) || minimumPadding <= 0) {
    throw new RangeError('Visible candle minimum price padding must be finite and positive');
  }
  const end = Math.min(requestedEnd, options.cutoffCandleIndex);
  const candles = source.filter(({ index }) => index >= start && index <= end);
  if (candles.length === 0) return { candles };

  const stats = candles.reduce<VisibleCandleStats>(
    (current, candle) => ({
      candleCount: current.candleCount + 1,
      firstCandleIndex: Math.min(current.firstCandleIndex, candle.index),
      lastCandleIndex: Math.max(current.lastCandleIndex, candle.index),
      minimumPrice: Math.min(current.minimumPrice, candle.low),
      maximumPrice: Math.max(current.maximumPrice, candle.high),
      maximumVolume: Math.max(current.maximumVolume, candle.volume),
    }),
    {
      candleCount: 0,
      firstCandleIndex: Number.POSITIVE_INFINITY,
      lastCandleIndex: Number.NEGATIVE_INFINITY,
      minimumPrice: Number.POSITIVE_INFINITY,
      maximumPrice: Number.NEGATIVE_INFINITY,
      maximumVolume: 0,
    },
  );
  const padding = Math.max(minimumPadding, (stats.maximumPrice - stats.minimumPrice) * ratio);
  return {
    candles,
    stats,
    bounds: {
      minIndex: stats.firstCandleIndex,
      maxIndex: stats.lastCandleIndex,
      minPrice: stats.minimumPrice - padding,
      maxPrice: stats.maximumPrice + padding,
      minVisibleCandles: options.minVisibleCandles,
    },
  };
}
