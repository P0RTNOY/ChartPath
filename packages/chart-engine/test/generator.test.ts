import { describe, expect, it } from 'vitest';

import type { ChartAnnotation, OhlcvCandle } from '@chartpath/domain';

import {
  annotationReferencesOnlyVisibleCandles,
  createChartSpec,
  generateChart,
  generateFullChart,
  generatePriceSeries,
  generateSemanticAnnotations,
  sliceChartAt,
} from '../src/index.js';

describe('deterministic chart generation', () => {
  it('reproduces both OHLCV and semantic annotations from an identical seed and spec', () => {
    const spec = createChartSpec({
      id: 'reproducible-retest',
      seed: 7_218_993,
      scenario: 'retest',
      candleCount: 96,
      parameters: {
        direction: 'up',
        relativeVolume: 'spike',
        gapKind: 'breakaway',
        pattern: 'ascending-triangle',
      },
    });

    const first = generateFullChart(spec);
    const second = generateFullChart(spec);

    expect(second).toEqual(first);
    expect(generatePriceSeries(spec)).toEqual(first.candles);
    expect(generateSemanticAnnotations(spec, first.candles)).toEqual(first.annotations);
  });

  it('uses the seed to produce distinct noise while retaining the same structure', () => {
    const first = generateFullChart(
      createChartSpec({ seed: 101, scenario: 'uptrend', candleCount: 60 }),
    );
    const second = generateFullChart(
      createChartSpec({ seed: 102, scenario: 'uptrend', candleCount: 60 }),
    );

    expect(second.candles).not.toEqual(first.candles);
    expect(second.annotations).not.toEqual(first.annotations);
    expect(second.annotations.map(({ role }) => role)).toEqual(
      first.annotations.map(({ role }) => role),
    );
  });
});

describe('market regimes and scenario semantics', () => {
  it.each([
    ['uptrend', 1],
    ['downtrend', -1],
  ] as const)('creates a directional %s regime', (scenario, expectedDirection) => {
    const chart = generateFullChart(
      createChartSpec({ seed: 32, scenario, candleCount: 80, noise: 0.1 }),
    );
    const first = candleAt(chart.candles, 0);
    const last = candleAt(chart.candles, chart.candles.length - 1);

    expect(Math.sign(last.close - first.close)).toBe(expectedDirection);
    expect(roles(chart.annotations)).toContain(
      scenario === 'uptrend' ? 'higher-high' : 'lower-high',
    );
    expect(roles(chart.annotations)).toContain(scenario === 'uptrend' ? 'higher-low' : 'lower-low');
    expect(roles(chart.annotations)).toContain('trendline');
  });

  it('creates a bounded range with support and resistance zones', () => {
    const chart = generateFullChart(
      createChartSpec({ seed: 44, scenario: 'range', candleCount: 80, noise: 0.1 }),
    );
    const closes = chart.candles.map(({ close }) => close);

    expect(Math.max(...closes) - Math.min(...closes)).toBeLessThan(12);
    expect(roles(chart.annotations)).toContain('support');
    expect(roles(chart.annotations)).toContain('resistance');
  });

  it.each([
    ['support', 'support'],
    ['resistance', 'resistance'],
  ] as const)('models and labels a %s reaction', (reaction, expectedRole) => {
    const chart = generateFullChart(
      createChartSpec({
        seed: 81,
        scenario: 'range',
        parameters: { reaction },
      }),
    );
    expect(roles(chart.annotations)).toContain(expectedRole);
    expect(roles(chart.annotations)).toContain('level-reaction');
  });

  it.each([
    ['breakout', 'confirmed-breakout'],
    ['retest', 'successful-retest'],
    ['false-breakout', 'false-breakout-confirmed'],
  ] as const)('provides ground truth for %s', (scenario, expectedRole) => {
    const chart = generateFullChart(
      createChartSpec({ seed: 91, scenario, parameters: { direction: 'up' } }),
    );
    expect(roles(chart.annotations)).toContain(expectedRole);
  });

  it.each([
    ['reversal', 'double-bottom', 'reversal-structure'],
    ['reversal', 'head-and-shoulders', 'reversal-structure'],
    ['reversal', 'rounded', 'reversal-structure'],
    ['continuation', 'rectangle', 'continuation-structure'],
    ['continuation', 'symmetrical-triangle', 'continuation-structure'],
    ['continuation', 'flag', 'continuation-structure'],
    ['continuation', 'pennant', 'continuation-structure'],
    ['continuation', 'wedge', 'continuation-structure'],
  ] as const)('supports a %s %s structure', (scenario, pattern, expectedRole) => {
    const chart = generateFullChart(
      createChartSpec({ seed: 110, scenario, parameters: { pattern } }),
    );
    const patternAnnotation = chart.annotations.find((annotation) => annotation.kind === 'pattern');

    expect(patternAnnotation?.role).toBe(expectedRole);
    expect(patternAnnotation?.kind === 'pattern' ? patternAnnotation.label : undefined).toBe(
      pattern,
    );
    expect(roles(chart.annotations)).toContain('confirmation');
  });

  it.each([
    ['inverse-head-and-shoulders', 1],
    ['head-and-shoulders', -1],
  ] as const)(
    'gives a %s reversal its required preceding trend and opposite follow-through',
    (pattern, outcomeDirection) => {
      const chart = generateFullChart(
        createChartSpec({ seed: 204, scenario: 'reversal', noise: 0, parameters: { pattern } }),
      );
      const event = chart.annotations.find(({ role }) => role === 'confirmation');
      if (event?.kind !== 'event') throw new Error('Expected reversal confirmation');
      const first = candleAt(chart.candles, 0).close;
      const beforePattern = candleAt(
        chart.candles,
        Math.max(1, Math.round(event.candleIndex * 0.45)),
      ).close;
      const final = candleAt(chart.candles, chart.candles.length - 1).close;
      const context = chart.annotations.find(({ role }) => role === 'market-regime');

      expect(Math.sign(beforePattern - first)).toBe(-outcomeDirection);
      expect(Math.sign(final - candleAt(chart.candles, event.candleIndex).close)).toBe(
        outcomeDirection,
      );
      expect(context?.metadata?.regime).toBe(outcomeDirection === 1 ? 'downtrend' : 'uptrend');
    },
  );

  it.each([
    ['positive', 'confirmed-breakout'],
    ['near-miss', 'breakout-near-miss'],
    ['ambiguous', 'insufficient-evidence'],
  ] as const)('supports the %s example variant', (variant, expectedRole) => {
    const chart = generateFullChart(
      createChartSpec({
        seed: 504,
        scenario: variant === 'ambiguous' ? 'ambiguous' : 'breakout',
        parameters: variant === 'ambiguous' ? { baseScenario: 'breakout' } : { variant },
      }),
    );

    expect(roles(chart.annotations)).toContain(expectedRole);
  });

  it('marks a reversal lookalike as invalid when the preceding trend is absent', () => {
    const chart = generateFullChart(
      createChartSpec({
        seed: 505,
        scenario: 'lookalike',
        parameters: { baseScenario: 'reversal', pattern: 'inverse-head-and-shoulders' },
      }),
    );

    expect(roles(chart.annotations)).toContain('lookalike');
    expect(roles(chart.annotations)).toContain('missing-preceding-trend');
    expect(roles(chart.annotations)).not.toContain('confirmation');
  });

  it.each(['rising', 'falling', 'spike'] as const)(
    'models %s relative volume and records it semantically',
    (relativeVolume) => {
      const chart = generateFullChart(
        createChartSpec({
          seed: 31,
          scenario: 'range',
          noise: 0,
          parameters: { relativeVolume },
        }),
      );
      expect(roles(chart.annotations)).toContain(`relative-volume-${relativeVolume}`);

      const midpoint = Math.floor(chart.candles.length / 2);
      const firstHalf = average(chart.candles.slice(0, midpoint).map(({ volume }) => volume));
      const secondHalf = average(chart.candles.slice(midpoint).map(({ volume }) => volume));
      if (relativeVolume === 'rising') expect(secondHalf).toBeGreaterThan(firstHalf);
      if (relativeVolume === 'falling') expect(secondHalf).toBeLessThan(firstHalf);
      if (relativeVolume === 'spike') {
        expect(candleAt(chart.candles, 51).volume).toBeGreaterThan(firstHalf * 2);
      }
    },
  );

  it.each(['common', 'breakaway', 'continuation', 'exhaustion'] as const)(
    'creates and labels a %s gap',
    (gapKind) => {
      const chart = generateFullChart(
        createChartSpec({
          seed: 87,
          scenario: 'uptrend',
          volatility: 0.01,
          parameters: { gapKind, direction: 'up' },
        }),
      );
      const gap = chart.annotations.find(({ role }) => role === `${gapKind}-gap`);
      expect(gap?.kind).toBe('event');
      if (gap?.kind !== 'event') throw new Error('Expected a gap event');
      const prior = candleAt(chart.candles, gap.candleIndex - 1);
      const current = candleAt(chart.candles, gap.candleIndex);
      expect(current.open).toBeGreaterThan(prior.close);
    },
  );
});

describe('decision-candle isolation', () => {
  it('uses a decision index in the spec as a safe truncation boundary by default', () => {
    const spec = createChartSpec({
      seed: 712,
      scenario: 'retest',
      candleCount: 90,
      decisionCandleIndex: 51,
    });
    const safeChart = generateChart(spec);

    expect(safeChart.candles).toHaveLength(52);
    expect(
      safeChart.annotations.every((annotation) =>
        annotationReferencesOnlyVisibleCandles(annotation, 51),
      ),
    ).toBe(true);
  });

  it('does not reveal a later retest at the original breakout decision candle', () => {
    const full = generateFullChart(
      createChartSpec({ seed: 715, scenario: 'retest', candleCount: 90 }),
    );
    const breakout = full.annotations.find(({ role }) => role === 'confirmed-breakout');
    const retest = full.annotations.find(({ role }) => role === 'successful-retest');
    if (breakout?.kind !== 'event' || retest?.kind !== 'point') {
      throw new Error('Expected breakout and retest annotations');
    }

    const atBreakout = sliceChartAt(full, breakout.candleIndex);
    expect(roles(atBreakout.annotations)).toContain('confirmed-breakout');
    expect(roles(atBreakout.annotations)).not.toContain('successful-retest');
    expect(atBreakout.candles).toHaveLength(breakout.candleIndex + 1);
    expect(
      atBreakout.annotations.every((annotation) =>
        annotationReferencesOnlyVisibleCandles(annotation, breakout.candleIndex),
      ),
    ).toBe(true);
  });

  it('produces an unchanged current slice when future candle values are replaced', () => {
    const full = generateFullChart(
      createChartSpec({ seed: 716, scenario: 'false-breakout', candleCount: 80 }),
    );
    const cutoff = 38;
    const changedFutureCandles = full.candles.map((candle) =>
      candle.index <= cutoff
        ? candle
        : { ...candle, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    );
    const changedFuture = { ...full, candles: changedFutureCandles };

    expect(sliceChartAt(changedFuture, cutoff)).toEqual(sliceChartAt(full, cutoff));
  });

  it('rejects a cutoff outside the generated data', () => {
    const chart = generateFullChart(createChartSpec({ seed: 2, scenario: 'range' }));
    expect(() => sliceChartAt(chart, -1)).toThrow(RangeError);
    expect(() => sliceChartAt(chart, chart.candles.length)).toThrow(RangeError);
  });
});

describe('configuration validation', () => {
  it.each([
    { candleCount: 19 },
    { candleCount: 501 },
    { basePrice: 0 },
    { baseVolume: 0 },
    { volatility: 0 },
    { volatility: 0.3 },
    { noise: -0.01 },
    { noise: 2.1 },
  ])('rejects invalid numeric configuration %#', (invalid) => {
    expect(() => createChartSpec({ seed: 1, scenario: 'range', ...invalid })).toThrow(RangeError);
  });
});

function roles(annotations: readonly ChartAnnotation[]): string[] {
  return annotations.map(({ role }) => role);
}

function candleAt(candles: readonly OhlcvCandle[], index: number): OhlcvCandle {
  const candle = candles[index];
  if (candle === undefined) throw new Error(`Missing candle ${index}`);
  return candle;
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
