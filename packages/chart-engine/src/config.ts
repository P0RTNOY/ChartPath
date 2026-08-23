import type { ChartScenario, ChartSpec, JsonValue } from '@chartpath/domain';

export const GENERATOR_VERSION = '1.0.0';

export const MIN_CANDLE_COUNT = 20;
export const MAX_CANDLE_COUNT = 500;

export type MarketRegime = 'uptrend' | 'downtrend' | 'range';
export type ScenarioDirection = 'up' | 'down';
export type ExampleVariant = 'positive' | 'near-miss' | 'ambiguous' | 'lookalike';
export type LevelReaction = 'support' | 'resistance' | 'none';
export type RelativeVolumeProfile = 'steady' | 'rising' | 'falling' | 'spike';
export type GapKind = 'none' | 'common' | 'breakaway' | 'continuation' | 'exhaustion';
export type ReversalPattern =
  'double-top' | 'double-bottom' | 'head-and-shoulders' | 'inverse-head-and-shoulders' | 'rounded';
export type ContinuationPattern =
  | 'rectangle'
  | 'symmetrical-triangle'
  | 'ascending-triangle'
  | 'descending-triangle'
  | 'flag'
  | 'pennant'
  | 'wedge';
export type StructurePattern = ReversalPattern | ContinuationPattern;

export interface ChartSpecInput {
  readonly seed: number;
  readonly scenario: ChartScenario;
  readonly id?: string;
  readonly candleCount?: number;
  readonly timeframe?: string;
  readonly basePrice?: number;
  readonly baseVolume?: number;
  readonly volatility?: number;
  readonly noise?: number;
  readonly decisionCandleIndex?: number;
  readonly parameters?: Readonly<Record<string, JsonValue>>;
}

export interface ResolvedGenerationParameters {
  readonly direction: ScenarioDirection;
  readonly regime: MarketRegime;
  readonly variant: ExampleVariant;
  readonly reaction: LevelReaction;
  readonly relativeVolume: RelativeVolumeProfile;
  readonly gapKind: GapKind;
  readonly gapSize: number;
  readonly pattern: StructurePattern;
  readonly eventIndex: number;
  readonly startTimestamp: number;
  readonly intervalMs: number;
}

const DEFAULT_START_TIMESTAMP = Date.UTC(2024, 0, 2);

const timeframeMilliseconds: Readonly<Record<string, number>> = {
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
};

const chartScenarios: readonly ChartScenario[] = [
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

export function createChartSpec(input: ChartSpecInput): ChartSpec {
  const spec: ChartSpec = {
    id: input.id ?? `synthetic-${input.scenario}-${input.seed}`,
    seed: input.seed,
    generatorVersion: GENERATOR_VERSION,
    candleCount: input.candleCount ?? 80,
    timeframe: input.timeframe ?? '1d',
    scenario: input.scenario,
    basePrice: input.basePrice ?? 100,
    baseVolume: input.baseVolume ?? 1_000_000,
    volatility: input.volatility ?? 0.018,
    noise: input.noise ?? 0.55,
    ...(input.decisionCandleIndex === undefined
      ? {}
      : { decisionCandleIndex: input.decisionCandleIndex }),
    ...(input.parameters === undefined ? {} : { parameters: input.parameters }),
  };

  assertValidChartSpec(spec);
  return spec;
}

export function assertValidChartSpec(spec: ChartSpec): void {
  if (spec.generatorVersion !== GENERATOR_VERSION) {
    throw new RangeError(
      `Unsupported chart generator version ${spec.generatorVersion}; expected ${GENERATOR_VERSION}`,
    );
  }
  if (spec.id.trim().length === 0) {
    throw new RangeError('Chart id must not be empty');
  }
  if (!Number.isSafeInteger(spec.seed)) {
    throw new RangeError('Chart seed must be a safe integer');
  }
  if (!Number.isInteger(spec.candleCount)) {
    throw new RangeError('Candle count must be an integer');
  }
  if (spec.candleCount < MIN_CANDLE_COUNT || spec.candleCount > MAX_CANDLE_COUNT) {
    throw new RangeError(
      `Candle count must be between ${MIN_CANDLE_COUNT} and ${MAX_CANDLE_COUNT}`,
    );
  }
  if (!Number.isFinite(spec.basePrice) || spec.basePrice <= 0) {
    throw new RangeError('Base price must be greater than zero');
  }
  if (!Number.isFinite(spec.baseVolume) || spec.baseVolume <= 0) {
    throw new RangeError('Base volume must be greater than zero');
  }
  if (!Number.isFinite(spec.volatility) || spec.volatility <= 0 || spec.volatility > 0.25) {
    throw new RangeError('Volatility must be greater than zero and no more than 0.25');
  }
  if (!Number.isFinite(spec.noise) || spec.noise < 0 || spec.noise > 2) {
    throw new RangeError('Noise must be between zero and two');
  }
  if (!chartScenarios.includes(spec.scenario)) {
    throw new RangeError(`Unknown chart scenario: ${String(spec.scenario)}`);
  }
  if (
    spec.decisionCandleIndex !== undefined &&
    (!Number.isInteger(spec.decisionCandleIndex) ||
      spec.decisionCandleIndex < 0 ||
      spec.decisionCandleIndex >= spec.candleCount)
  ) {
    throw new RangeError('Decision candle index must refer to a candle in the chart');
  }
  resolveGenerationParameters(spec);
}

export function resolveGenerationParameters(spec: ChartSpec): ResolvedGenerationParameters {
  const parameters = spec.parameters ?? {};
  const requestedPattern = parameters.pattern;
  const inferredDirection: ScenarioDirection =
    effectiveScenario(spec) === 'reversal' &&
    (requestedPattern === 'double-top' || requestedPattern === 'head-and-shoulders')
      ? 'down'
      : 'up';
  const direction = readEnum(parameters, 'direction', ['up', 'down'] as const, inferredDirection);
  const defaultRegime = defaultRegimeForScenario(spec.scenario, direction);
  const regime = readEnum(
    parameters,
    'regime',
    ['uptrend', 'downtrend', 'range'] as const,
    defaultRegime,
  );
  const scenarioVariant =
    spec.scenario === 'ambiguous'
      ? 'ambiguous'
      : spec.scenario === 'lookalike'
        ? 'lookalike'
        : 'positive';
  const variant = readEnum(
    parameters,
    'variant',
    ['positive', 'near-miss', 'ambiguous', 'lookalike'] as const,
    scenarioVariant,
  );
  const reaction = readEnum(
    parameters,
    'reaction',
    ['support', 'resistance', 'none'] as const,
    'none',
  );
  const relativeVolume = readEnum(
    parameters,
    'relativeVolume',
    ['steady', 'rising', 'falling', 'spike'] as const,
    'steady',
  );
  const gapKind = readEnum(
    parameters,
    'gapKind',
    ['none', 'common', 'breakaway', 'continuation', 'exhaustion'] as const,
    'none',
  );
  const defaultPattern: StructurePattern =
    effectiveScenario(spec) === 'continuation'
      ? 'flag'
      : direction === 'up'
        ? 'inverse-head-and-shoulders'
        : 'head-and-shoulders';
  const pattern = readEnum(
    parameters,
    'pattern',
    [
      'double-top',
      'double-bottom',
      'head-and-shoulders',
      'inverse-head-and-shoulders',
      'rounded',
      'rectangle',
      'symmetrical-triangle',
      'ascending-triangle',
      'descending-triangle',
      'flag',
      'pennant',
      'wedge',
    ] as const,
    defaultPattern,
  );
  const defaultEventIndex = Math.round((spec.candleCount - 1) * 0.64);
  const eventIndex = readInteger(
    parameters,
    'eventIndex',
    defaultEventIndex,
    3,
    spec.candleCount - 3,
  );
  const defaultGapSize = Math.max(0.04, spec.volatility * 2.5);
  const gapSize = readNumber(parameters, 'gapSize', defaultGapSize, 0.01, 0.3);
  const startTimestamp = readTimestamp(parameters, 'startTimestamp', DEFAULT_START_TIMESTAMP);
  const configuredInterval = timeframeMilliseconds[spec.timeframe];
  const intervalMs = readInteger(
    parameters,
    'intervalMs',
    configuredInterval ?? 24 * 60 * 60_000,
    60_000,
    31 * 24 * 60 * 60_000,
  );

  return {
    direction,
    regime,
    variant,
    reaction,
    relativeVolume,
    gapKind,
    gapSize,
    pattern,
    eventIndex,
    startTimestamp,
    intervalMs,
  };
}

export function effectiveScenario(spec: ChartSpec): ChartScenario {
  if (spec.scenario !== 'ambiguous' && spec.scenario !== 'lookalike') {
    return spec.scenario;
  }

  const requested = spec.parameters?.baseScenario;
  if (
    requested === 'uptrend' ||
    requested === 'downtrend' ||
    requested === 'range' ||
    requested === 'breakout' ||
    requested === 'retest' ||
    requested === 'false-breakout' ||
    requested === 'reversal' ||
    requested === 'continuation'
  ) {
    return requested;
  }
  return 'reversal';
}

function defaultRegimeForScenario(
  scenario: ChartScenario,
  direction: ScenarioDirection,
): MarketRegime {
  if (scenario === 'uptrend') return 'uptrend';
  if (scenario === 'downtrend') return 'downtrend';
  if (scenario === 'range' || scenario === 'breakout' || scenario === 'retest') return 'range';
  if (scenario === 'false-breakout' || scenario === 'ambiguous' || scenario === 'lookalike') {
    return 'range';
  }
  if (scenario === 'reversal') {
    return direction === 'up' ? 'downtrend' : 'uptrend';
  }
  return direction === 'up' ? 'uptrend' : 'downtrend';
}

function readEnum<const T extends string>(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
  values: readonly T[],
  fallback: T,
): T {
  const value = parameters[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new RangeError(`${key} must be one of: ${values.join(', ')}`);
  }
  return value as T;
}

function readNumber(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = parameters[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${key} must be a finite number between ${minimum} and ${maximum}`);
  }
  return value;
}

function readInteger(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = parameters[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${key} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function readTimestamp(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
  fallback: number,
): number {
  const value = parameters[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'string') {
    throw new RangeError(`${key} must be an ISO-8601 string`);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new RangeError(`${key} must be a valid ISO-8601 string`);
  }
  return timestamp;
}
