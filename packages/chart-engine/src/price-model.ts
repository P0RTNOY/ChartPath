import type { ChartSpec, OhlcvCandle } from '@chartpath/domain';

import {
  assertValidChartSpec,
  effectiveScenario,
  resolveGenerationParameters,
  type ExampleVariant,
  type MarketRegime,
  type ResolvedGenerationParameters,
  type ScenarioDirection,
  type StructurePattern,
} from './config.js';
import { createSeededRandom } from './prng.js';

const PRICE_PRECISION = 4;

/**
 * Produces only synthetic market data. Semantic labels deliberately live in
 * `annotations.ts`, so price generation can be tested and evolved separately.
 */
export function generatePriceSeries(spec: ChartSpec): readonly OhlcvCandle[] {
  assertValidChartSpec(spec);
  const parameters = resolveGenerationParameters(spec);
  const scenario = effectiveScenario(spec);
  const random = createSeededRandom(spec.seed);
  const candles: OhlcvCandle[] = [];
  const lastIndex = spec.candleCount - 1;
  const gapIndex = gapIndexFor(spec, parameters);
  const directionSign = parameters.direction === 'up' ? 1 : -1;
  let previousClose = spec.basePrice;

  for (let index = 0; index < spec.candleCount; index += 1) {
    const progress = index / lastIndex;
    const structuralOffset = pathOffset(
      scenario,
      progress,
      parameters.eventIndex / lastIndex,
      parameters.regime,
      parameters.direction,
      parameters.variant,
      parameters.pattern,
    );
    const reactionOffset = levelReactionOffset(progress, parameters.reaction);
    const noise = random.symmetric() * spec.volatility * spec.noise * 0.24;
    const gapOffset =
      gapIndex !== undefined && index >= gapIndex ? directionSign * parameters.gapSize : 0;
    const targetClose = Math.max(
      spec.basePrice * 0.05,
      spec.basePrice * (1 + structuralOffset + reactionOffset + gapOffset + noise),
    );

    const isGap = gapIndex === index;
    const ordinaryOpenNoise = random.symmetric() * spec.volatility * spec.noise * 0.09;
    const open =
      index === 0
        ? spec.basePrice * (1 + ordinaryOpenNoise)
        : isGap
          ? previousClose * (1 + directionSign * parameters.gapSize)
          : previousClose * (1 + ordinaryOpenNoise);

    const bodyRange = Math.abs(targetClose - open);
    const wickScale = spec.volatility * (0.17 + random.next() * 0.32);
    const upperWick = Math.max(bodyRange * 0.08, Math.max(open, targetClose) * wickScale);
    const lowerWick = Math.max(bodyRange * 0.08, Math.min(open, targetClose) * wickScale);
    let high = Math.max(open, targetClose) + upperWick;
    let low = Math.max(spec.basePrice * 0.01, Math.min(open, targetClose) - lowerWick);

    // A near miss can cross a level intraday without providing close-based confirmation.
    if (
      parameters.variant === 'near-miss' &&
      scenario === 'breakout' &&
      index === parameters.eventIndex
    ) {
      if (parameters.direction === 'up') high += spec.basePrice * 0.025;
      else low = Math.max(spec.basePrice * 0.01, low - spec.basePrice * 0.025);
    }

    const volume = volumeAt(spec, parameters, scenario, index, random.symmetric());
    const roundedOpen = roundPrice(open);
    const roundedClose = roundPrice(targetClose);
    const roundedHigh = roundPrice(high);
    const roundedLow = roundPrice(low);
    const candle: OhlcvCandle = {
      index,
      timestamp: new Date(parameters.startTimestamp + index * parameters.intervalMs).toISOString(),
      open: roundedOpen,
      high: Math.max(roundedHigh, roundedOpen, roundedClose),
      low: Math.min(roundedLow, roundedOpen, roundedClose),
      close: roundedClose,
      volume,
    };
    candles.push(candle);
    previousClose = candle.close;
  }

  return candles;
}

export function gapIndexFor(
  spec: ChartSpec,
  parameters: ResolvedGenerationParameters = resolveGenerationParameters(spec),
): number | undefined {
  if (parameters.gapKind === 'none') return undefined;
  if (spec.parameters?.gapIndex !== undefined) {
    const requested = spec.parameters.gapIndex;
    if (
      typeof requested !== 'number' ||
      !Number.isInteger(requested) ||
      requested < 1 ||
      requested >= spec.candleCount - 1
    ) {
      throw new RangeError('gapIndex must be an integer between 1 and candleCount - 2');
    }
    return requested;
  }
  if (parameters.gapKind === 'common') return Math.round((spec.candleCount - 1) * 0.38);
  if (parameters.gapKind === 'exhaustion') return Math.round((spec.candleCount - 1) * 0.84);
  return parameters.eventIndex;
}

function pathOffset(
  scenario: ChartSpec['scenario'],
  progress: number,
  eventProgress: number,
  regime: MarketRegime,
  direction: ScenarioDirection,
  variant: ExampleVariant,
  pattern: StructurePattern,
): number {
  switch (scenario) {
    case 'uptrend':
    case 'downtrend':
    case 'range':
      return regimeOffset(progress, regime);
    case 'breakout':
      return breakoutOffset(progress, eventProgress, direction, variant);
    case 'retest':
      return retestOffset(progress, eventProgress, direction, variant);
    case 'false-breakout':
      return falseBreakoutOffset(progress, eventProgress, direction);
    case 'reversal':
      return reversalOffset(progress, eventProgress, direction, variant, pattern);
    case 'continuation':
      return continuationOffset(progress, eventProgress, direction, variant, pattern);
    case 'ambiguous':
    case 'lookalike':
      return regimeOffset(progress, regime);
  }
}

function regimeOffset(progress: number, regime: MarketRegime): number {
  const swing = Math.sin(progress * Math.PI * 8) * 0.012;
  if (regime === 'uptrend') return progress * 0.19 + swing;
  if (regime === 'downtrend') return progress * -0.17 + swing;
  return Math.sin(progress * Math.PI * 6) * 0.026 + Math.sin(progress * Math.PI * 13) * 0.006;
}

function breakoutOffset(
  progress: number,
  eventProgress: number,
  direction: ScenarioDirection,
  variant: ExampleVariant,
): number {
  const sign = direction === 'up' ? 1 : -1;
  const before = Math.sin((progress / Math.max(eventProgress, 0.01)) * Math.PI * 6) * 0.018;
  if (progress < eventProgress) return before;

  const postProgress = (progress - eventProgress) / Math.max(1 - eventProgress, 0.01);
  if (variant === 'ambiguous') return sign * (0.012 + postProgress * 0.004);
  if (variant === 'near-miss') return sign * (0.017 - postProgress * 0.012);
  if (variant === 'lookalike') return sign * (0.035 + postProgress * 0.025);
  return sign * (0.052 + postProgress * 0.11);
}

function retestOffset(
  progress: number,
  eventProgress: number,
  direction: ScenarioDirection,
  variant: ExampleVariant,
): number {
  const sign = direction === 'up' ? 1 : -1;
  if (progress < eventProgress) {
    return Math.sin((progress / Math.max(eventProgress, 0.01)) * Math.PI * 6) * 0.018;
  }
  const postProgress = (progress - eventProgress) / Math.max(1 - eventProgress, 0.01);
  const positivePath = interpolate(
    [
      [0, 0.052],
      [0.34, 0.076],
      [0.58, 0.025],
      [0.72, 0.055],
      [1, 0.14],
    ],
    postProgress,
  );
  if (variant === 'near-miss') return sign * Math.min(positivePath, 0.026);
  if (variant === 'ambiguous')
    return (
      sign *
      interpolate(
        [
          [0, 0.035],
          [1, 0.018],
        ],
        postProgress,
      )
    );
  return sign * positivePath;
}

function falseBreakoutOffset(
  progress: number,
  eventProgress: number,
  direction: ScenarioDirection,
): number {
  const sign = direction === 'up' ? 1 : -1;
  if (progress < eventProgress) {
    return Math.sin((progress / Math.max(eventProgress, 0.01)) * Math.PI * 5) * 0.018;
  }
  const postProgress = (progress - eventProgress) / Math.max(1 - eventProgress, 0.01);
  return (
    sign *
    interpolate(
      [
        [0, 0.052],
        [0.18, 0.073],
        [0.4, 0.006],
        [0.65, -0.024],
        [1, -0.012],
      ],
      postProgress,
    )
  );
}

function reversalOffset(
  progress: number,
  eventProgress: number,
  direction: ScenarioDirection,
  variant: ExampleVariant,
  pattern: StructurePattern,
): number {
  const sign = direction === 'up' ? 1 : -1;
  const normalizedEvent = Math.max(eventProgress, 0.2);
  const local = progress / normalizedEvent;
  const omitsPrecedingTrend = variant === 'lookalike';
  const precedingStart = omitsPrecedingTrend ? 0.008 : 0.11;
  const rounded = pattern === 'rounded';
  const doublePattern = pattern === 'double-top' || pattern === 'double-bottom';
  const formation = rounded
    ? interpolate(
        [
          [0, precedingStart],
          [0.35, 0.035],
          [0.58, -0.035],
          [0.76, -0.012],
          [1, 0.025],
        ],
        local,
      )
    : doublePattern
      ? interpolate(
          [
            [0, precedingStart],
            [0.38, -0.035],
            [0.55, 0.008],
            [0.72, -0.034],
            [0.88, 0.012],
            [1, 0.035],
          ],
          local,
        )
      : interpolate(
          [
            [0, precedingStart],
            [0.32, 0.01],
            [0.45, -0.03],
            [0.55, 0.005],
            [0.65, -0.055],
            [0.75, 0.005],
            [0.84, -0.026],
            [1, 0.035],
          ],
          local,
        );
  if (progress < normalizedEvent) return sign * formation;

  const postProgress = (progress - normalizedEvent) / Math.max(1 - normalizedEvent, 0.01);
  if (variant === 'near-miss')
    return (
      sign *
      interpolate(
        [
          [0, 0.018],
          [1, -0.01],
        ],
        postProgress,
      )
    );
  if (variant === 'ambiguous')
    return (
      sign *
      interpolate(
        [
          [0, 0.01],
          [1, 0.018],
        ],
        postProgress,
      )
    );
  return sign * (0.04 + postProgress * 0.12);
}

function continuationOffset(
  progress: number,
  eventProgress: number,
  direction: ScenarioDirection,
  variant: ExampleVariant,
  pattern: StructurePattern,
): number {
  const sign = direction === 'up' ? 1 : -1;
  const consolidationStart = Math.max(0.18, eventProgress - 0.3);
  if (progress < consolidationStart) {
    return sign * (progress / consolidationStart) * 0.1;
  }
  if (progress < eventProgress) {
    const local =
      (progress - consolidationStart) / Math.max(eventProgress - consolidationStart, 0.01);
    const compression = 1 - local * 0.75;
    const patternWave =
      pattern === 'rectangle'
        ? Math.sin(local * Math.PI * 5) * 0.018
        : pattern === 'flag' || pattern === 'wedge'
          ? -local * 0.035 + Math.sin(local * Math.PI * 4) * 0.009
          : Math.sin(local * Math.PI * 6) * 0.024 * compression;
    return sign * (0.1 + patternWave);
  }
  const postProgress = (progress - eventProgress) / Math.max(1 - eventProgress, 0.01);
  if (variant === 'near-miss') return sign * (0.095 - postProgress * 0.018);
  if (variant === 'ambiguous') return sign * (0.1 + postProgress * 0.006);
  return sign * (0.13 + postProgress * 0.11);
}

function levelReactionOffset(
  progress: number,
  reaction: ResolvedGenerationParameters['reaction'],
): number {
  if (reaction === 'none') return 0;
  const distance = (progress - 0.55) / 0.075;
  const touch = Math.exp(-(distance * distance)) * 0.035;
  const followThrough = Math.max(0, progress - 0.55) * 0.07;
  return reaction === 'support' ? -touch + followThrough : touch - followThrough;
}

function volumeAt(
  spec: ChartSpec,
  parameters: ResolvedGenerationParameters,
  scenario: ChartSpec['scenario'],
  index: number,
  randomNoise: number,
): number {
  const progress = index / (spec.candleCount - 1);
  let profileMultiplier = 1;
  if (parameters.relativeVolume === 'rising') profileMultiplier = 0.62 + progress * 0.85;
  if (parameters.relativeVolume === 'falling') profileMultiplier = 1.38 - progress * 0.72;

  const distanceFromEvent = Math.abs(index - parameters.eventIndex);
  let eventMultiplier = 1;
  if (parameters.relativeVolume === 'spike' && distanceFromEvent <= 1) eventMultiplier = 2.5;
  if (
    (scenario === 'breakout' ||
      scenario === 'retest' ||
      scenario === 'reversal' ||
      scenario === 'continuation') &&
    parameters.variant === 'positive' &&
    distanceFromEvent <= 1
  ) {
    eventMultiplier = Math.max(eventMultiplier, 2.05);
  }
  if (scenario === 'false-breakout' && distanceFromEvent <= 1) eventMultiplier = 1.45;
  if (parameters.variant === 'near-miss' && distanceFromEvent <= 1) eventMultiplier = 0.82;

  const noiseMultiplier = Math.max(0.7, 1 + randomNoise * spec.noise * 0.14);
  return Math.max(
    1,
    Math.round(spec.baseVolume * profileMultiplier * eventMultiplier * noiseMultiplier),
  );
}

function interpolate(points: readonly (readonly [number, number])[], progress: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return 0;
  if (progress <= first[0]) return first[1];
  if (progress >= last[0]) return last[1];

  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    if (current !== undefined && previous !== undefined && progress <= current[0]) {
      const span = current[0] - previous[0];
      const local = span === 0 ? 0 : (progress - previous[0]) / span;
      return previous[1] + (current[1] - previous[1]) * local;
    }
  }
  return last[1];
}

function roundPrice(value: number): number {
  return Number(value.toFixed(PRICE_PRECISION));
}
