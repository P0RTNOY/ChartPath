export type RiskValidationCode =
  | 'ACCOUNT_VALUE_MUST_BE_POSITIVE'
  | 'ACCOUNT_RISK_REQUIRED'
  | 'ACCOUNT_RISK_CONFLICT'
  | 'ACCOUNT_RISK_MUST_BE_POSITIVE'
  | 'RISK_FRACTION_OUT_OF_RANGE'
  | 'ACCOUNT_RISK_EXCEEDS_LIMIT'
  | 'ENTRY_PRICE_MUST_BE_POSITIVE'
  | 'STOP_PRICE_MUST_BE_POSITIVE'
  | 'STOP_DISTANCE_MUST_BE_POSITIVE'
  | 'COST_MUST_BE_NON_NEGATIVE'
  | 'GAP_RISK_MUST_BE_NON_NEGATIVE'
  | 'LOT_SIZE_MUST_BE_POSITIVE'
  | 'POSITION_BELOW_MINIMUM_LOT'
  | 'INVALID_LONG_INVALIDATION'
  | 'INVALID_SHORT_INVALIDATION'
  | 'EXIT_PRICE_MUST_BE_POSITIVE';

export interface RiskValidationIssue {
  readonly code: RiskValidationCode;
  readonly field: string;
}

export type CalculationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly RiskValidationIssue[] };

export interface PositionSizeInput {
  readonly accountValue: number;
  /** Absolute account-currency risk budget. Supply this or riskFraction, never both. */
  readonly accountRisk?: number;
  /** Fraction of account value, so 0.01 means one percent. */
  readonly riskFraction?: number;
  readonly entryPrice: number;
  readonly stopPrice: number;
  /** Expected spread, commission and slippage for one unit. */
  readonly expectedPerUnitCosts: number;
  /** Optional conservative allowance for discontinuous gap movement. */
  readonly gapRiskPerUnit?: number;
  /** Minimum tradable increment. Use 1 for whole units or a smaller value for fractional units. */
  readonly lotSize?: number;
  /** Defaults to 0.05 (five percent). */
  readonly maximumRiskFraction?: number;
}

export interface PositionSizeResult {
  readonly accountRisk: number;
  readonly stopDistance: number;
  readonly expectedPerUnitCosts: number;
  readonly gapRiskPerUnit: number;
  readonly perUnitRisk: number;
  readonly rawPositionSize: number;
  readonly positionSize: number;
  readonly unusedRiskBudget: number;
  readonly effectiveRiskAtSize: number;
}

export interface RiskMultipleInput {
  readonly direction: 'long' | 'short';
  readonly entryPrice: number;
  readonly invalidationPrice: number;
  readonly exitPrice: number;
  readonly expectedPerUnitCosts: number;
  readonly gapRiskPerUnit?: number;
}

export interface RiskMultipleResult {
  readonly unitRisk: number;
  readonly netOutcomePerUnit: number;
  readonly riskMultiple: number;
}

function validFinite(value: number): boolean {
  return Number.isFinite(value);
}

function floorToIncrement(value: number, increment: number): number {
  const units = Math.floor((value + Number.EPSILON) / increment);
  const precision = Math.min(12, Math.max(0, -Math.floor(Math.log10(increment)) + 2));
  return Number((units * increment).toFixed(precision));
}

export function calculatePositionSize(
  input: PositionSizeInput,
): CalculationResult<PositionSizeResult> {
  const issues: RiskValidationIssue[] = [];
  const maximumRiskFraction = input.maximumRiskFraction ?? 0.05;
  const lotSize = input.lotSize ?? 1;
  const gapRiskPerUnit = input.gapRiskPerUnit ?? 0;

  if (!validFinite(input.accountValue) || input.accountValue <= 0) {
    issues.push({ code: 'ACCOUNT_VALUE_MUST_BE_POSITIVE', field: 'accountValue' });
  }
  if (input.accountRisk === undefined && input.riskFraction === undefined) {
    issues.push({ code: 'ACCOUNT_RISK_REQUIRED', field: 'accountRisk' });
  }
  if (input.accountRisk !== undefined && input.riskFraction !== undefined) {
    issues.push({ code: 'ACCOUNT_RISK_CONFLICT', field: 'accountRisk' });
  }
  if (
    input.accountRisk !== undefined &&
    (!validFinite(input.accountRisk) || input.accountRisk <= 0)
  ) {
    issues.push({ code: 'ACCOUNT_RISK_MUST_BE_POSITIVE', field: 'accountRisk' });
  }
  if (
    input.riskFraction !== undefined &&
    (!validFinite(input.riskFraction) || input.riskFraction <= 0 || input.riskFraction > 1)
  ) {
    issues.push({ code: 'RISK_FRACTION_OUT_OF_RANGE', field: 'riskFraction' });
  }
  if (!validFinite(maximumRiskFraction) || maximumRiskFraction <= 0 || maximumRiskFraction > 1) {
    issues.push({ code: 'RISK_FRACTION_OUT_OF_RANGE', field: 'maximumRiskFraction' });
  }
  if (!validFinite(input.entryPrice) || input.entryPrice <= 0) {
    issues.push({ code: 'ENTRY_PRICE_MUST_BE_POSITIVE', field: 'entryPrice' });
  }
  if (!validFinite(input.stopPrice) || input.stopPrice <= 0) {
    issues.push({ code: 'STOP_PRICE_MUST_BE_POSITIVE', field: 'stopPrice' });
  }
  if (!validFinite(input.expectedPerUnitCosts) || input.expectedPerUnitCosts < 0) {
    issues.push({ code: 'COST_MUST_BE_NON_NEGATIVE', field: 'expectedPerUnitCosts' });
  }
  if (!validFinite(gapRiskPerUnit) || gapRiskPerUnit < 0) {
    issues.push({ code: 'GAP_RISK_MUST_BE_NON_NEGATIVE', field: 'gapRiskPerUnit' });
  }
  if (!validFinite(lotSize) || lotSize <= 0) {
    issues.push({ code: 'LOT_SIZE_MUST_BE_POSITIVE', field: 'lotSize' });
  }

  const stopDistance = Math.abs(input.entryPrice - input.stopPrice);
  if (!validFinite(stopDistance) || stopDistance <= 0) {
    issues.push({ code: 'STOP_DISTANCE_MUST_BE_POSITIVE', field: 'stopPrice' });
  }

  const accountRisk =
    input.accountRisk ??
    (input.riskFraction === undefined ? Number.NaN : input.accountValue * input.riskFraction);
  if (
    validFinite(accountRisk) &&
    validFinite(input.accountValue) &&
    input.accountValue > 0 &&
    validFinite(maximumRiskFraction) &&
    accountRisk / input.accountValue > maximumRiskFraction
  ) {
    issues.push({ code: 'ACCOUNT_RISK_EXCEEDS_LIMIT', field: 'accountRisk' });
  }
  if (issues.length > 0) return { ok: false, issues };

  const perUnitRisk = stopDistance + input.expectedPerUnitCosts + gapRiskPerUnit;
  const rawPositionSize = accountRisk / perUnitRisk;
  const positionSize = floorToIncrement(rawPositionSize, lotSize);
  if (positionSize <= 0) {
    return {
      ok: false,
      issues: [{ code: 'POSITION_BELOW_MINIMUM_LOT', field: 'lotSize' }],
    };
  }
  const effectiveRiskAtSize = positionSize * perUnitRisk;
  return {
    ok: true,
    value: {
      accountRisk,
      stopDistance,
      expectedPerUnitCosts: input.expectedPerUnitCosts,
      gapRiskPerUnit,
      perUnitRisk,
      rawPositionSize,
      positionSize,
      unusedRiskBudget: Math.max(0, accountRisk - effectiveRiskAtSize),
      effectiveRiskAtSize,
    },
  };
}

export function calculateRiskMultiple(
  input: RiskMultipleInput,
): CalculationResult<RiskMultipleResult> {
  const issues: RiskValidationIssue[] = [];
  const gapRiskPerUnit = input.gapRiskPerUnit ?? 0;
  if (!validFinite(input.entryPrice) || input.entryPrice <= 0) {
    issues.push({ code: 'ENTRY_PRICE_MUST_BE_POSITIVE', field: 'entryPrice' });
  }
  if (!validFinite(input.invalidationPrice) || input.invalidationPrice <= 0) {
    issues.push({ code: 'STOP_PRICE_MUST_BE_POSITIVE', field: 'invalidationPrice' });
  }
  if (!validFinite(input.exitPrice) || input.exitPrice <= 0) {
    issues.push({ code: 'EXIT_PRICE_MUST_BE_POSITIVE', field: 'exitPrice' });
  }
  if (!validFinite(input.expectedPerUnitCosts) || input.expectedPerUnitCosts < 0) {
    issues.push({ code: 'COST_MUST_BE_NON_NEGATIVE', field: 'expectedPerUnitCosts' });
  }
  if (!validFinite(gapRiskPerUnit) || gapRiskPerUnit < 0) {
    issues.push({ code: 'GAP_RISK_MUST_BE_NON_NEGATIVE', field: 'gapRiskPerUnit' });
  }
  if (input.direction === 'long' && input.invalidationPrice >= input.entryPrice) {
    issues.push({ code: 'INVALID_LONG_INVALIDATION', field: 'invalidationPrice' });
  }
  if (input.direction === 'short' && input.invalidationPrice <= input.entryPrice) {
    issues.push({ code: 'INVALID_SHORT_INVALIDATION', field: 'invalidationPrice' });
  }
  if (issues.length > 0) return { ok: false, issues };

  const unitRisk =
    Math.abs(input.entryPrice - input.invalidationPrice) +
    input.expectedPerUnitCosts +
    gapRiskPerUnit;
  const grossOutcome =
    input.direction === 'long'
      ? input.exitPrice - input.entryPrice
      : input.entryPrice - input.exitPrice;
  const netOutcomePerUnit = grossOutcome - input.expectedPerUnitCosts;
  return {
    ok: true,
    value: {
      unitRisk,
      netOutcomePerUnit,
      riskMultiple: netOutcomePerUnit / unitRisk,
    },
  };
}
