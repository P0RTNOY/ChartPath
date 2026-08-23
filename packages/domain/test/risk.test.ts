import { describe, expect, it } from 'vitest';

import { calculatePositionSize, calculateRiskMultiple } from '../src/index.js';

describe('calculatePositionSize', () => {
  it.each([
    {
      name: 'normal whole-unit sizing includes per-unit costs',
      input: {
        accountValue: 10_000,
        accountRisk: 100,
        entryPrice: 50,
        stopPrice: 48,
        expectedPerUnitCosts: 0.5,
      },
      positionSize: 40,
      perUnitRisk: 2.5,
    },
    {
      name: 'fractional lot sizing',
      input: {
        accountValue: 1_000,
        riskFraction: 0.01,
        entryPrice: 10,
        stopPrice: 9.9,
        expectedPerUnitCosts: 0,
        lotSize: 0.001,
      },
      positionSize: 100,
      perUnitRisk: 0.1,
    },
    {
      name: 'cost-heavy setup reduces size',
      input: {
        accountValue: 10_000,
        accountRisk: 100,
        entryPrice: 50,
        stopPrice: 49,
        expectedPerUnitCosts: 4,
      },
      positionSize: 20,
      perUnitRisk: 5,
    },
    {
      name: 'gap-risk allowance is included',
      input: {
        accountValue: 10_000,
        accountRisk: 100,
        entryPrice: 50,
        stopPrice: 48,
        expectedPerUnitCosts: 0.5,
        gapRiskPerUnit: 1,
      },
      positionSize: 28,
      perUnitRisk: 3.5,
    },
  ])('$name', ({ input, positionSize, perUnitRisk }) => {
    const result = calculatePositionSize(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.positionSize).toBeCloseTo(positionSize, 8);
    expect(result.value.perUnitRisk).toBeCloseTo(perUnitRisk, 8);
    expect(result.value.effectiveRiskAtSize).toBeLessThanOrEqual(result.value.accountRisk);
  });

  it.each([
    {
      name: 'zero stop distance',
      input: {
        accountValue: 10_000,
        accountRisk: 100,
        entryPrice: 50,
        stopPrice: 50,
        expectedPerUnitCosts: 0,
      },
      issue: 'STOP_DISTANCE_MUST_BE_POSITIVE',
    },
    {
      name: 'excessive account risk',
      input: {
        accountValue: 10_000,
        accountRisk: 1_000,
        entryPrice: 50,
        stopPrice: 48,
        expectedPerUnitCosts: 0,
      },
      issue: 'ACCOUNT_RISK_EXCEEDS_LIMIT',
    },
    {
      name: 'invalid negative price',
      input: {
        accountValue: 10_000,
        accountRisk: 100,
        entryPrice: -1,
        stopPrice: 48,
        expectedPerUnitCosts: 0,
      },
      issue: 'ENTRY_PRICE_MUST_BE_POSITIVE',
    },
    {
      name: 'conflicting absolute and fractional budgets',
      input: {
        accountValue: 10_000,
        accountRisk: 100,
        riskFraction: 0.01,
        entryPrice: 50,
        stopPrice: 48,
        expectedPerUnitCosts: 0,
      },
      issue: 'ACCOUNT_RISK_CONFLICT',
    },
    {
      name: 'non-finite values are rejected',
      input: {
        accountValue: 10_000,
        accountRisk: 100,
        entryPrice: Number.POSITIVE_INFINITY,
        stopPrice: 48,
        expectedPerUnitCosts: 0,
      },
      issue: 'ENTRY_PRICE_MUST_BE_POSITIVE',
    },
  ] as const)('rejects $name', ({ input, issue }) => {
    const result = calculatePositionSize(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map(({ code }) => code)).toContain(issue);
  });

  it('never sizes above the risk budget across a broad parameter table', () => {
    for (let distance = 0.25; distance <= 20; distance += 0.25) {
      for (const cost of [0, 0.01, 0.5, 2]) {
        const result = calculatePositionSize({
          accountValue: 50_000,
          accountRisk: 500,
          entryPrice: 100,
          stopPrice: 100 - distance,
          expectedPerUnitCosts: cost,
          lotSize: 0.01,
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.effectiveRiskAtSize).toBeLessThanOrEqual(500 + 1e-8);
        }
      }
    }
  });
});

describe('calculateRiskMultiple', () => {
  it.each([
    {
      direction: 'long',
      entryPrice: 100,
      invalidationPrice: 95,
      exitPrice: 110,
      expectedPerUnitCosts: 1,
      unitRisk: 6,
      outcome: 9,
      multiple: 1.5,
    },
    {
      direction: 'short',
      entryPrice: 100,
      invalidationPrice: 104,
      exitPrice: 92,
      expectedPerUnitCosts: 0.5,
      gapRiskPerUnit: 0.5,
      unitRisk: 5,
      outcome: 7.5,
      multiple: 1.5,
    },
  ] as const)('calculates signed $direction outcomes in R', (example) => {
    const result = calculateRiskMultiple(example);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.unitRisk).toBeCloseTo(example.unitRisk);
    expect(result.value.netOutcomePerUnit).toBeCloseTo(example.outcome);
    expect(result.value.riskMultiple).toBeCloseTo(example.multiple);
  });

  it.each([
    {
      direction: 'long',
      entryPrice: 100,
      invalidationPrice: 101,
      exitPrice: 110,
      expectedPerUnitCosts: 0,
      issue: 'INVALID_LONG_INVALIDATION',
    },
    {
      direction: 'short',
      entryPrice: 100,
      invalidationPrice: 99,
      exitPrice: 90,
      expectedPerUnitCosts: 0,
      issue: 'INVALID_SHORT_INVALIDATION',
    },
  ] as const)('rejects invalidation on the wrong side for $direction', ({ issue, ...input }) => {
    const result = calculateRiskMultiple(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map(({ code }) => code)).toContain(issue);
  });
});
