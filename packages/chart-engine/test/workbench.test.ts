import { describe, expect, it } from 'vitest';

import type { ChartAnnotation, GeneratedChart, LearnerChartAnnotation } from '@chartpath/domain';

import {
  candleIndexAtScreenX,
  chartToScreen,
  createChartSpec,
  createChartViewport,
  createReplayState,
  generateFullChart,
  panChartViewport,
  reduceReplayState,
  replayChartSlice,
  screenToChart,
  visibleCandleCount,
  zoomChartViewport,
  type ChartBounds,
} from '../src/index.js';

const bounds: ChartBounds = {
  minIndex: 0,
  maxIndex: 99,
  minPrice: 80,
  maxPrice: 120,
  minVisibleCandles: 5,
};

describe('bounded chart viewport', () => {
  it('keeps zoom and pan inside the permitted candle range', () => {
    const initial = createChartViewport(bounds, { startIndex: 20, endIndex: 59 });
    const zoomed = zoomChartViewport(initial, 2, 40, bounds);
    expect(visibleCandleCount(zoomed)).toBe(20);
    expect(zoomed.startIndex).toBeGreaterThanOrEqual(0);
    expect(zoomed.endIndex).toBeLessThanOrEqual(99);

    const pannedPastEnd = panChartViewport(zoomed, 1_000, bounds);
    expect(pannedPastEnd.endIndex).toBe(99);
    expect(visibleCandleCount(pannedPastEnd)).toBe(20);

    const pannedPastStart = panChartViewport(pannedPastEnd, -1_000, bounds);
    expect(pannedPastStart.startIndex).toBe(0);
    expect(visibleCandleCount(pannedPastStart)).toBe(20);

    const maximallyZoomed = zoomChartViewport(pannedPastStart, 1_000, 2, bounds);
    expect(visibleCandleCount(maximallyZoomed)).toBe(5);
  });

  it('shifts an out-of-range requested price window inside the permitted bounds', () => {
    expect(createChartViewport(bounds, { minPrice: 125, maxPrice: 135 })).toMatchObject({
      minPrice: 110,
      maxPrice: 120,
    });
    expect(createChartViewport(bounds, { minPrice: 50, maxPrice: 150 })).toMatchObject({
      minPrice: 80,
      maxPrice: 120,
    });
  });

  it('converts chart and screen coordinates after both zooming and panning', () => {
    const screen = { left: 24, top: 12, width: 800, height: 400 };
    const initial = createChartViewport(bounds, { startIndex: 10, endIndex: 89 });
    const zoomed = zoomChartViewport(initial, 2, 50, bounds);
    const viewport = panChartViewport(zoomed, 7, bounds);
    const chartCoordinate = { candleIndex: 63, price: 107.25 };

    const rendered = chartToScreen(chartCoordinate, viewport, screen);
    const recovered = screenToChart(rendered, viewport, screen);

    expect(recovered.candleIndex).toBeCloseTo(chartCoordinate.candleIndex, 10);
    expect(recovered.price).toBeCloseTo(chartCoordinate.price, 10);
    expect(candleIndexAtScreenX(rendered.x, viewport, screen)).toBe(63);
  });

  it('uses chronological left-to-right screen coordinates', () => {
    const viewport = createChartViewport(bounds, { startIndex: 10, endIndex: 20 });
    const screen = { left: 0, top: 0, width: 300, height: 100 };

    expect(chartToScreen({ candleIndex: 10, price: 100 }, viewport, screen).x).toBe(0);
    expect(chartToScreen({ candleIndex: 20, price: 100 }, viewport, screen).x).toBe(300);
  });
});

describe('deterministic replay', () => {
  it('resets, steps one/group, and advances to—but never beyond—the decision candle', () => {
    const chart = replayFixture();
    let replay = createReplayState(chart, {
      initialVisibleCandleCount: 3,
      decisionCandleIndex: 8,
      fixedGroupSize: 3,
    });
    expect(replay.visibleCandleIndex).toBe(2);

    replay = reduceReplayState(replay, { type: 'next' });
    expect(replay.visibleCandleIndex).toBe(3);
    replay = reduceReplayState(replay, { type: 'fixed-group' });
    expect(replay.visibleCandleIndex).toBe(6);
    replay = reduceReplayState(replay, { type: 'fixed-group' });
    expect(replay.visibleCandleIndex).toBe(8);
    replay = reduceReplayState(replay, { type: 'next' });
    expect(replay.visibleCandleIndex).toBe(8);

    replay = reduceReplayState(replay, { type: 'reset' });
    expect(replay.visibleCandleIndex).toBe(2);
    replay = reduceReplayState(replay, { type: 'to-decision' });
    expect(replay.visibleCandleIndex).toBe(8);
    expect(replayChartSlice(chart, replay).candles).toHaveLength(9);
  });

  it('isolates future candles and semantic annotations at every replay position', () => {
    const chart = replayFixture();
    let replay = createReplayState(chart, {
      initialVisibleCandleCount: 3,
      decisionCandleIndex: 8,
    });
    let slice = replayChartSlice(chart, replay);

    expect(slice.candles).toHaveLength(3);
    expect(slice.annotations.map(({ id }) => id)).toEqual(['known-point', 'spanning-zone']);
    expect(slice.annotations.find(({ id }) => id === 'spanning-zone')).toMatchObject({
      endCandleIndex: 2,
    });
    expect(slice.annotations.some(({ id }) => id === 'future-point')).toBe(false);

    replay = reduceReplayState(replay, { type: 'to-decision' });
    slice = replayChartSlice(chart, replay);
    expect(slice.candles).toHaveLength(9);
    expect(slice.annotations.map(({ id }) => id)).toContain('future-point');
    expect(slice.candles.some(({ index }) => index > 8)).toBe(false);
  });

  it('preserves learner drawings, snapshots them, and hides future-anchored geometry', () => {
    const chart = replayFixture();
    const drawings: readonly LearnerChartAnnotation[] = [
      { id: 'early', kind: 'point', anchor: { candleIndex: 1, price: 100 } },
      {
        id: 'later',
        kind: 'trendline',
        start: { candleIndex: 4, price: 99 },
        end: { candleIndex: 7, price: 104 },
      },
    ];
    let replay = createReplayState(chart, {
      initialVisibleCandleCount: 3,
      decisionCandleIndex: 8,
      learnerAnnotations: drawings,
    });

    expect(replayChartSlice(chart, replay).learnerAnnotations.map(({ id }) => id)).toEqual([
      'early',
    ]);
    replay = reduceReplayState(replay, { type: 'to-decision' });
    expect(replay.learnerAnnotations).toEqual(drawings);
    expect(replay.drawingSnapshots).toEqual([{ visibleCandleIndex: 8, annotations: drawings }]);
    expect(replayChartSlice(chart, replay).learnerAnnotations).toEqual(drawings);

    replay = reduceReplayState(replay, { type: 'reset' });
    expect(replay.learnerAnnotations).toEqual(drawings);
    expect(replayChartSlice(chart, replay).learnerAnnotations.map(({ id }) => id)).toEqual([
      'early',
    ]);
    expect(replay.drawingSnapshots.map(({ visibleCandleIndex }) => visibleCandleIndex)).toEqual([
      8, 2,
    ]);
    expect(replay.drawingSnapshots.at(-1)).toEqual({
      visibleCandleIndex: 2,
      annotations: [drawings[0]],
    });
  });
});

function replayFixture(): GeneratedChart {
  const generated = generateFullChart(
    createChartSpec({ id: 'replay-fixture', seed: 42, scenario: 'range', candleCount: 20 }),
  );
  const annotations: readonly ChartAnnotation[] = [
    {
      id: 'known-point',
      kind: 'point',
      role: 'known',
      candleIndex: 1,
      price: generated.candles[1]?.close ?? 100,
      visibleFromCandleIndex: 1,
    },
    {
      id: 'spanning-zone',
      kind: 'zone',
      role: 'known-zone',
      startCandleIndex: 0,
      endCandleIndex: 10,
      priceLow: 95,
      priceHigh: 105,
      visibleFromCandleIndex: 1,
    },
    {
      id: 'future-point',
      kind: 'point',
      role: 'future',
      candleIndex: 7,
      price: generated.candles[7]?.close ?? 100,
      visibleFromCandleIndex: 7,
    },
  ];
  return { ...generated, annotations };
}
