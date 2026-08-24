import { describe, expect, it } from 'vitest';

import {
  DEVELOPMENT_HISTORICAL_DATASET,
  DEVELOPMENT_HISTORICAL_SCENARIO,
  createReplayKnowledgeView,
} from '../src/index.js';

describe('historical replay knowledge cutoff', () => {
  it('returns exactly the permitted candles and computes statistics/scaling only from them', () => {
    const view = createReplayKnowledgeView(
      DEVELOPMENT_HISTORICAL_DATASET,
      DEVELOPMENT_HISTORICAL_SCENARIO,
      40,
    );
    const expected = DEVELOPMENT_HISTORICAL_DATASET.candles.slice(0, 41);
    expect(view.candles).toHaveLength(41);
    expect(view.candles.at(-1)?.index).toBe(40);
    expect(view.visibleStatistics).toEqual({
      low: Math.min(...expected.map(({ low }) => low)),
      high: Math.max(...expected.map(({ high }) => high)),
      volume: expected.reduce((sum, { volume }) => sum + volume, 0),
    });
    expect(view.visibleScale).toEqual({
      minimum: view.visibleStatistics.low,
      maximum: view.visibleStatistics.high,
    });
  });

  it('enforces the exact decision/knowledge boundary', () => {
    const boundary = createReplayKnowledgeView(
      DEVELOPMENT_HISTORICAL_DATASET,
      DEVELOPMENT_HISTORICAL_SCENARIO,
      72,
    );
    expect(boundary.candles.at(-1)?.index).toBe(72);
    expect(() =>
      createReplayKnowledgeView(
        DEVELOPMENT_HISTORICAL_DATASET,
        DEVELOPMENT_HISTORICAL_SCENARIO,
        73,
      ),
    ).toThrow(/knowledge cutoff/);
  });

  it('withholds future annotations and corporate actions until their knowledge index', () => {
    const before = createReplayKnowledgeView(
      DEVELOPMENT_HISTORICAL_DATASET,
      DEVELOPMENT_HISTORICAL_SCENARIO,
      29,
    );
    const after = createReplayKnowledgeView(
      DEVELOPMENT_HISTORICAL_DATASET,
      DEVELOPMENT_HISTORICAL_SCENARIO,
      30,
    );
    expect(before.annotations).toEqual([]);
    expect(after.annotations.map(({ id }) => id)).toEqual(['known-level']);
    expect(after.annotations.map(({ id }) => id)).not.toContain('future-reference-hidden');
    expect(after.corporateActions).toEqual([]);
  });

  it('structurally omits symbol and dates from blind candles, identity, title, and accessibility text', () => {
    const view = createReplayKnowledgeView(
      DEVELOPMENT_HISTORICAL_DATASET,
      DEVELOPMENT_HISTORICAL_SCENARIO,
      40,
    );
    expect(view.identity).toBeNull();
    expect(view.candles[0]).not.toHaveProperty('timestampUtc');
    expect(view.candles[0]).not.toHaveProperty('exchangeLocalTimestamp');
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain(DEVELOPMENT_HISTORICAL_DATASET.manifest.symbol);
    expect(serialized).not.toContain('2025-01');
    expect(view.accessibilityLabel).not.toContain('DEV-BLIND');
  });

  it('reveals identity and provenance-safe period fields only after finalization', () => {
    const final = createReplayKnowledgeView(
      DEVELOPMENT_HISTORICAL_DATASET,
      DEVELOPMENT_HISTORICAL_SCENARIO,
      72,
      true,
    );
    expect(final.identity).toMatchObject({
      symbol: 'DEV-BLIND-001',
      exchange: 'ChartPath synthetic continuous session',
    });
    expect(final.candles[0]).toHaveProperty('timestampUtc');
    expect(final.accessibilityLabel).toContain('Generated fixture 001');
  });

  it('is deterministic across reload-equivalent calls and rejects altered data', () => {
    const first = createReplayKnowledgeView(
      DEVELOPMENT_HISTORICAL_DATASET,
      DEVELOPMENT_HISTORICAL_SCENARIO,
      55,
    );
    const second = createReplayKnowledgeView(
      structuredClone(DEVELOPMENT_HISTORICAL_DATASET),
      structuredClone(DEVELOPMENT_HISTORICAL_SCENARIO),
      55,
    );
    expect(second).toEqual(first);

    const modified = structuredClone(DEVELOPMENT_HISTORICAL_DATASET);
    const candle = modified.candles[0];
    if (candle) Object.assign(candle, { close: candle.close + 0.01 });
    expect(() => createReplayKnowledgeView(modified, DEVELOPMENT_HISTORICAL_SCENARIO, 55)).toThrow(
      /modified/,
    );
  });
});
