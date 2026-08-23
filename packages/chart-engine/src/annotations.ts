import type { ChartAnnotation, ChartSpec, OhlcvCandle } from '@chartpath/domain';

import {
  assertValidChartSpec,
  effectiveScenario,
  resolveGenerationParameters,
  type ResolvedGenerationParameters,
} from './config.js';
import { gapIndexFor } from './price-model.js';

/**
 * Derives curated ground truth from the completed price model. This module
 * never changes candle values and can be omitted entirely by a renderer.
 */
export function generateSemanticAnnotations(
  spec: ChartSpec,
  candles: readonly OhlcvCandle[],
): readonly ChartAnnotation[] {
  assertValidChartSpec(spec);
  assertCandleSeriesMatchesSpec(spec, candles);
  const parameters = resolveGenerationParameters(spec);
  const scenario = effectiveScenario(spec);
  const annotations: ChartAnnotation[] = [];

  addRegimeAnnotations(annotations, spec, candles, parameters);
  addReactionAnnotations(annotations, spec, candles, parameters);
  addScenarioAnnotations(annotations, spec, candles, parameters, scenario);
  addVolumeAnnotations(annotations, spec, parameters);
  addGapAnnotation(annotations, spec, candles, parameters);

  return annotations;
}

function addRegimeAnnotations(
  annotations: ChartAnnotation[],
  spec: ChartSpec,
  candles: readonly OhlcvCandle[],
  parameters: ResolvedGenerationParameters,
): void {
  const lastIndex = candles.length - 1;
  const scenario = effectiveScenario(spec);
  const contextEnd =
    scenario === 'breakout' || scenario === 'retest' || scenario === 'false-breakout'
      ? Math.max(0, parameters.eventIndex - 1)
      : scenario === 'reversal'
        ? Math.max(0, Math.round(parameters.eventIndex * 0.3))
        : scenario === 'continuation'
          ? Math.max(0, parameters.eventIndex - Math.round(lastIndex * 0.3))
          : lastIndex;
  annotations.push({
    id: annotationId(spec, 'context'),
    kind: 'range',
    role: 'market-regime',
    startCandleIndex: 0,
    endCandleIndex: contextEnd,
    visibleFromCandleIndex: Math.min(contextEnd, Math.round(contextEnd * 0.3)),
    metadata: { regime: parameters.regime },
  });

  if (parameters.regime === 'range') {
    const recognitionEnd = Math.max(4, Math.round(lastIndex * 0.42));
    const observed = candles.slice(0, recognitionEnd + 1);
    const support = Math.min(...observed.map((candle) => candle.low));
    const resistance = Math.max(...observed.map((candle) => candle.high));
    const width = Math.max((resistance - support) * 0.06, spec.basePrice * 0.0025);
    annotations.push(
      {
        id: annotationId(spec, 'range-support'),
        kind: 'zone',
        role: 'support',
        startCandleIndex: 0,
        endCandleIndex: lastIndex,
        priceLow: round(support - width),
        priceHigh: round(support + width),
        visibleFromCandleIndex: recognitionEnd,
      },
      {
        id: annotationId(spec, 'range-resistance'),
        kind: 'zone',
        role: 'resistance',
        startCandleIndex: 0,
        endCandleIndex: lastIndex,
        priceLow: round(resistance - width),
        priceHigh: round(resistance + width),
        visibleFromCandleIndex: recognitionEnd,
      },
    );
    return;
  }

  // Reversal and continuation charts label their context window above; their
  // later pattern annotations replace a whole-chart trend classification.
  if (scenario !== 'uptrend' && scenario !== 'downtrend') return;

  const highIndexes = fractionalIndexes(lastIndex, [0.18, 0.43, 0.68, 0.92]);
  const lowIndexes = fractionalIndexes(lastIndex, [0.29, 0.54, 0.79]);
  const swingRolePrefix = parameters.regime === 'uptrend' ? 'higher' : 'lower';
  for (const [position, candleIndex] of highIndexes.entries()) {
    annotations.push({
      id: annotationId(spec, `swing-high-${position}`),
      kind: 'point',
      role: `${swingRolePrefix}-high`,
      candleIndex,
      price: candleAt(candles, candleIndex).high,
      visibleFromCandleIndex: Math.min(lastIndex, candleIndex + 2),
    });
  }
  for (const [position, candleIndex] of lowIndexes.entries()) {
    annotations.push({
      id: annotationId(spec, `swing-low-${position}`),
      kind: 'point',
      role: `${swingRolePrefix}-low`,
      candleIndex,
      price: candleAt(candles, candleIndex).low,
      visibleFromCandleIndex: Math.min(lastIndex, candleIndex + 2),
    });
  }

  const lineIndexes = parameters.regime === 'uptrend' ? lowIndexes : highIndexes;
  const first = lineIndexes[0];
  const last = lineIndexes[lineIndexes.length - 1];
  if (first !== undefined && last !== undefined) {
    const useLow = parameters.regime === 'uptrend';
    annotations.push({
      id: annotationId(spec, 'trendline'),
      kind: 'line',
      role: 'trendline',
      start: {
        candleIndex: first,
        price: useLow ? candleAt(candles, first).low : candleAt(candles, first).high,
      },
      end: {
        candleIndex: last,
        price: useLow ? candleAt(candles, last).low : candleAt(candles, last).high,
      },
      visibleFromCandleIndex: Math.min(lastIndex, last + 2),
    });
  }
}

function addReactionAnnotations(
  annotations: ChartAnnotation[],
  spec: ChartSpec,
  candles: readonly OhlcvCandle[],
  parameters: ResolvedGenerationParameters,
): void {
  if (parameters.reaction === 'none') return;
  const lastIndex = candles.length - 1;
  const touchIndex = Math.round(lastIndex * 0.55);
  const touch = candleAt(candles, touchIndex);
  const isSupport = parameters.reaction === 'support';
  const price = isSupport ? touch.low : touch.high;
  const width = Math.max(spec.basePrice * 0.004, spec.volatility * price * 0.35);
  annotations.push(
    {
      id: annotationId(spec, `${parameters.reaction}-zone`),
      kind: 'zone',
      role: parameters.reaction,
      startCandleIndex: Math.max(0, touchIndex - Math.round(lastIndex * 0.25)),
      endCandleIndex: lastIndex,
      priceLow: round(price - width),
      priceHigh: round(price + width),
      visibleFromCandleIndex: touchIndex,
    },
    {
      id: annotationId(spec, `${parameters.reaction}-reaction`),
      kind: 'event',
      role: 'level-reaction',
      candleIndex: touchIndex,
      label: parameters.reaction,
      visibleFromCandleIndex: touchIndex,
    },
  );
}

function addScenarioAnnotations(
  annotations: ChartAnnotation[],
  spec: ChartSpec,
  candles: readonly OhlcvCandle[],
  parameters: ResolvedGenerationParameters,
  scenario: ChartSpec['scenario'],
): void {
  const lastIndex = candles.length - 1;
  const eventIndex = parameters.eventIndex;
  const directionRole = parameters.direction === 'up' ? 'resistance' : 'support';
  const level = levelBeforeEvent(candles, eventIndex, parameters.direction);
  const zoneWidth = Math.max(level * spec.volatility * 0.28, spec.basePrice * 0.0025);

  if (scenario === 'breakout' || scenario === 'retest' || scenario === 'false-breakout') {
    annotations.push({
      id: annotationId(spec, 'breakout-level'),
      kind: 'zone',
      role: directionRole,
      startCandleIndex: Math.max(0, eventIndex - Math.round(lastIndex * 0.4)),
      endCandleIndex: lastIndex,
      priceLow: round(level - zoneWidth),
      priceHigh: round(level + zoneWidth),
      visibleFromCandleIndex: Math.max(2, eventIndex - 3),
    });
  }

  if (scenario === 'breakout') {
    const role =
      parameters.variant === 'positive'
        ? 'confirmed-breakout'
        : parameters.variant === 'near-miss'
          ? 'breakout-near-miss'
          : 'insufficient-confirmation';
    annotations.push({
      id: annotationId(spec, 'breakout-attempt'),
      kind: 'event',
      role,
      candleIndex: eventIndex,
      label: parameters.direction,
      visibleFromCandleIndex: eventIndex,
      metadata: { variant: parameters.variant, closeBased: parameters.variant === 'positive' },
    });
  }

  if (scenario === 'retest') {
    const retestIndex = Math.min(
      lastIndex,
      eventIndex + Math.round((lastIndex - eventIndex) * 0.58),
    );
    annotations.push(
      {
        id: annotationId(spec, 'breakout'),
        kind: 'event',
        role: parameters.variant === 'positive' ? 'confirmed-breakout' : 'breakout-attempt',
        candleIndex: eventIndex,
        visibleFromCandleIndex: eventIndex,
      },
      {
        id: annotationId(spec, 'retest'),
        kind: 'point',
        role: parameters.variant === 'positive' ? 'successful-retest' : 'unconfirmed-retest',
        candleIndex: retestIndex,
        price:
          parameters.direction === 'up'
            ? candleAt(candles, retestIndex).low
            : candleAt(candles, retestIndex).high,
        visibleFromCandleIndex: retestIndex,
      },
    );
  }

  if (scenario === 'false-breakout') {
    const failureIndex = Math.min(
      lastIndex,
      eventIndex + Math.max(2, Math.round((lastIndex - eventIndex) * 0.4)),
    );
    annotations.push(
      {
        id: annotationId(spec, 'breakout-attempt'),
        kind: 'event',
        role: 'breakout-attempt',
        candleIndex: eventIndex,
        visibleFromCandleIndex: eventIndex,
      },
      {
        id: annotationId(spec, 'breakout-failure'),
        kind: 'event',
        role: 'false-breakout-confirmed',
        candleIndex: failureIndex,
        visibleFromCandleIndex: failureIndex,
      },
    );
  }

  if (scenario === 'reversal' || scenario === 'continuation') {
    const patternStart =
      scenario === 'reversal'
        ? Math.max(0, Math.round(eventIndex * 0.3))
        : Math.max(0, eventIndex - Math.round(lastIndex * 0.3));
    const patternEnd = Math.max(patternStart + 1, eventIndex - 1);
    const isValidated = parameters.variant === 'positive';
    annotations.push({
      id: annotationId(spec, 'pattern'),
      kind: 'pattern',
      role:
        parameters.variant === 'lookalike'
          ? 'lookalike'
          : parameters.variant === 'ambiguous'
            ? 'incomplete-structure'
            : isValidated
              ? `${scenario}-structure`
              : 'near-miss-structure',
      startCandleIndex: patternStart,
      endCandleIndex: patternEnd,
      label: parameters.pattern,
      visibleFromCandleIndex: patternEnd,
      metadata: {
        variant: parameters.variant,
        precedingTrendPresent: parameters.variant !== 'lookalike',
      },
    });
    if (isValidated) {
      annotations.push({
        id: annotationId(spec, 'structure-confirmation'),
        kind: 'event',
        role: 'confirmation',
        candleIndex: eventIndex,
        visibleFromCandleIndex: eventIndex,
        metadata: { scenario },
      });
    }
  }

  if (spec.scenario === 'ambiguous' || parameters.variant === 'ambiguous') {
    annotations.push({
      id: annotationId(spec, 'insufficient-evidence'),
      kind: 'event',
      role: 'insufficient-evidence',
      candleIndex: eventIndex,
      label: 'wait',
      visibleFromCandleIndex: eventIndex,
      metadata: { validDecision: 'insufficient-evidence' },
    });
  }

  if (spec.scenario === 'lookalike' || parameters.variant === 'lookalike') {
    annotations.push({
      id: annotationId(spec, 'missing-prerequisite'),
      kind: 'event',
      role: 'missing-preceding-trend',
      candleIndex: eventIndex,
      label: 'lookalike',
      visibleFromCandleIndex: eventIndex,
      metadata: { validDecision: 'reject-setup' },
    });
  }
}

function addVolumeAnnotations(
  annotations: ChartAnnotation[],
  spec: ChartSpec,
  parameters: ResolvedGenerationParameters,
): void {
  if (parameters.relativeVolume === 'steady') return;
  if (parameters.relativeVolume === 'spike') {
    annotations.push({
      id: annotationId(spec, 'relative-volume-spike'),
      kind: 'event',
      role: 'relative-volume-spike',
      candleIndex: parameters.eventIndex,
      visibleFromCandleIndex: parameters.eventIndex,
    });
    return;
  }
  annotations.push({
    id: annotationId(spec, 'relative-volume-profile'),
    kind: 'range',
    role: `relative-volume-${parameters.relativeVolume}`,
    startCandleIndex: 0,
    endCandleIndex: spec.candleCount - 1,
    visibleFromCandleIndex: Math.round((spec.candleCount - 1) * 0.35),
  });
}

function addGapAnnotation(
  annotations: ChartAnnotation[],
  spec: ChartSpec,
  candles: readonly OhlcvCandle[],
  parameters: ResolvedGenerationParameters,
): void {
  const gapIndex = gapIndexFor(spec, parameters);
  if (gapIndex === undefined) return;
  annotations.push({
    id: annotationId(spec, 'gap'),
    kind: 'event',
    role: `${parameters.gapKind}-gap`,
    candleIndex: gapIndex,
    label: parameters.direction,
    visibleFromCandleIndex: gapIndex,
    metadata: {
      previousClose: candleAt(candles, gapIndex - 1).close,
      openingPrice: candleAt(candles, gapIndex).open,
    },
  });
}

function assertCandleSeriesMatchesSpec(spec: ChartSpec, candles: readonly OhlcvCandle[]): void {
  if (candles.length !== spec.candleCount) {
    throw new RangeError(
      `Expected ${spec.candleCount} candles for annotations, received ${candles.length}`,
    );
  }
  for (const [index, candle] of candles.entries()) {
    if (candle.index !== index) {
      throw new RangeError(`Candle at position ${index} has index ${candle.index}`);
    }
    if (
      !Number.isFinite(candle.open) ||
      !Number.isFinite(candle.high) ||
      !Number.isFinite(candle.low) ||
      !Number.isFinite(candle.close) ||
      candle.low <= 0 ||
      candle.low > Math.min(candle.open, candle.close) ||
      candle.high < Math.max(candle.open, candle.close) ||
      !Number.isFinite(candle.volume) ||
      candle.volume <= 0
    ) {
      throw new RangeError(`Candle ${index} violates the OHLCV contract`);
    }
  }
}

function levelBeforeEvent(
  candles: readonly OhlcvCandle[],
  eventIndex: number,
  direction: ResolvedGenerationParameters['direction'],
): number {
  const start = Math.max(0, eventIndex - Math.round(candles.length * 0.4));
  const observed = candles.slice(start, eventIndex);
  if (observed.length === 0) return candleAt(candles, eventIndex).close;
  return direction === 'up'
    ? Math.max(...observed.map((candle) => candle.high))
    : Math.min(...observed.map((candle) => candle.low));
}

function fractionalIndexes(lastIndex: number, fractions: readonly number[]): number[] {
  return fractions.map((fraction) => Math.round(lastIndex * fraction));
}

function candleAt(candles: readonly OhlcvCandle[], index: number): OhlcvCandle {
  const candle = candles[index];
  if (candle === undefined) throw new RangeError(`Missing candle ${index}`);
  return candle;
}

function annotationId(spec: ChartSpec, suffix: string): string {
  return `${spec.id}:${suffix}`;
}

function round(value: number): number {
  return Number(value.toFixed(4));
}
