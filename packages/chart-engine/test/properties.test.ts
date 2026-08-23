import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { ChartScenario } from '@chartpath/domain';

import {
  annotationReferencesOnlyVisibleCandles,
  createChartSpec,
  generateFullChart,
  sliceChartAt,
} from '../src/index.js';

const scenarios: readonly ChartScenario[] = [
  'uptrend',
  'downtrend',
  'range',
  'breakout',
  'retest',
  'false-breakout',
  'reversal',
  'continuation',
  'ambiguous',
  'lookalike',
];

describe('generator properties', () => {
  it('always emits finite, positive, internally valid OHLCV candles', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }),
        fc.integer({ min: 20, max: 180 }),
        fc.double({ min: 0.0005, max: 0.2, noNaN: true }),
        fc.double({ min: 0, max: 2, noNaN: true }),
        fc.constantFrom(...scenarios),
        (seed, candleCount, volatility, noise, scenario) => {
          const chart = generateFullChart(
            createChartSpec({ seed, scenario, candleCount, volatility, noise }),
          );
          expect(chart.candles).toHaveLength(candleCount);
          for (const [index, candle] of chart.candles.entries()) {
            expect(candle.index).toBe(index);
            expect(Number.isFinite(candle.open)).toBe(true);
            expect(Number.isFinite(candle.high)).toBe(true);
            expect(Number.isFinite(candle.low)).toBe(true);
            expect(Number.isFinite(candle.close)).toBe(true);
            expect(Number.isFinite(candle.volume)).toBe(true);
            expect(candle.open).toBeGreaterThan(0);
            expect(candle.close).toBeGreaterThan(0);
            expect(candle.low).toBeGreaterThan(0);
            expect(candle.volume).toBeGreaterThan(0);
            expect(candle.low).toBeLessThanOrEqual(Math.min(candle.open, candle.close));
            expect(candle.high).toBeGreaterThanOrEqual(Math.max(candle.open, candle.close));
            expect(Number.isInteger(candle.volume)).toBe(true);
            expect(Number.isNaN(Date.parse(candle.timestamp))).toBe(false);
          }
        },
      ),
      { numRuns: 120 },
    );
  });

  it('reproduces annotations for arbitrary supported specifications', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -2_000_000_000, max: 2_000_000_000 }),
        fc.integer({ min: 20, max: 140 }),
        fc.constantFrom(...scenarios),
        (seed, candleCount, scenario) => {
          const spec = createChartSpec({ seed, scenario, candleCount });
          expect(generateFullChart(spec)).toEqual(generateFullChart(spec));
        },
      ),
      { numRuns: 80 },
    );
  });

  it.each([
    ['uptrend', 'higher-high', 'higher-low', 1],
    ['downtrend', 'lower-high', 'lower-low', -1],
  ] as const)(
    'keeps %s swing annotations consistent with their prices',
    (scenario, highRole, lowRole, direction) => {
      fc.assert(
        fc.property(fc.integer(), (seed) => {
          const chart = generateFullChart(createChartSpec({ seed, scenario, candleCount: 100 }));
          for (const role of [highRole, lowRole]) {
            const prices = chart.annotations
              .filter((annotation) => annotation.kind === 'point' && annotation.role === role)
              .map((annotation) => (annotation.kind === 'point' ? annotation.price : 0));
            for (let index = 1; index < prices.length; index += 1) {
              const previous = prices[index - 1];
              const current = prices[index];
              expect(previous).toBeDefined();
              expect(current).toBeDefined();
              expect(Math.sign((current ?? 0) - (previous ?? 0))).toBe(direction);
            }
          }
        }),
        { numRuns: 80 },
      );
    },
  );

  it('never exposes a future candle reference in arbitrary decision slices', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -2_000_000_000, max: 2_000_000_000 }),
        fc.integer({ min: 20, max: 140 }),
        fc.constantFrom(...scenarios),
        fc.nat(),
        (seed, candleCount, scenario, rawCutoff) => {
          const chart = generateFullChart(createChartSpec({ seed, scenario, candleCount }));
          const cutoff = rawCutoff % candleCount;
          const slice = sliceChartAt(chart, cutoff);
          expect(slice.candles).toHaveLength(cutoff + 1);
          expect(
            slice.annotations.every((annotation) =>
              annotationReferencesOnlyVisibleCandles(annotation, cutoff),
            ),
          ).toBe(true);
        },
      ),
      { numRuns: 120 },
    );
  });
});
