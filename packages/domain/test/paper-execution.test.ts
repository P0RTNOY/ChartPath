import { describe, expect, it } from 'vitest';

import {
  COST_MODEL_VERSION,
  DEFAULT_COST_MODEL,
  DEFAULT_EXECUTION_POLICY,
  EXECUTION_POLICY_VERSION,
  PAPER_EXECUTION_SCHEMA_VERSION,
  assertCompatibleExecutionIdentity,
  assertValidPaperExecutionSession,
  createPaperExecutionSession,
  createTradePlan,
  executionIdentitiesEqual,
  reducePaperExecutionSession,
  type CostModel,
  type HistoricalExecutionIdentity,
  type OhlcvCandle,
  type PaperExecutionSession,
  type TradePlanInput,
} from '../src/index.js';

const BASE_TIME = Date.parse('2026-08-24T12:00:00.000Z');

function at(second: number): string {
  return new Date(BASE_TIME + second * 1_000).toISOString();
}

function identity(
  overrides: Partial<HistoricalExecutionIdentity> = {},
): HistoricalExecutionIdentity {
  return {
    datasetId: 'historical-dataset-001',
    datasetVersion: 'dataset-v1',
    canonicalChecksum: `sha256:${'a'.repeat(64)}`,
    scenarioId: 'historical-scenario-001',
    scenarioVersion: 'scenario-v1',
    analysisSessionId: 'analysis-session-001',
    analysisFinalizedAt: at(0),
    decisionCandleIndex: 2,
    candleCount: 8,
    learningCredit: 'none',
    permittedDirections: ['long', 'short'],
    permittedEntryOrderTypes: ['market', 'limit', 'stop'],
    ...overrides,
  };
}

function plan(overrides: Partial<TradePlanInput> = {}): TradePlanInput {
  return {
    planId: 'plan-001',
    direction: 'long',
    entryIntent: { type: 'market', estimatedEntryPrice: 100 },
    protectiveStopPrice: 95,
    targetPrice: 110,
    fictionalAccountValue: 10_000,
    intendedRiskAmount: 100,
    quantity: 10,
    authoredAtCandleIndex: 2,
    processEvidence: {
      analysisDecision: 'long',
      entryMatchesAnalysis: true,
      invalidationMatchesAnalysis: true,
      targetMatchesAnalysis: true,
      requiredReasoningBypassed: false,
    },
    ...overrides,
  };
}

function session(
  planInput: TradePlanInput = plan(),
  source: HistoricalExecutionIdentity = identity(),
  costModel: CostModel = DEFAULT_COST_MODEL,
): PaperExecutionSession {
  return createPaperExecutionSession({
    sessionId: 'paper-session-001',
    orderId: 'paper-order-001',
    positionId: 'paper-position-001',
    debriefId: 'paper-debrief-001',
    source,
    plan: planInput,
    createdAt: at(1),
    executionPolicy: DEFAULT_EXECUTION_POLICY,
    costModel,
  });
}

function submit(value: PaperExecutionSession = session()): PaperExecutionSession {
  return reducePaperExecutionSession(value, {
    type: 'submit',
    confirmationId: 'confirmation-001',
    submittedAt: at(2),
  });
}

function candle(
  index: number,
  values: Partial<Omit<OhlcvCandle, 'index' | 'timestamp'>> = {},
): OhlcvCandle {
  return {
    index,
    timestamp: new Date(Date.parse('2020-01-01T00:00:00.000Z') + index * 86_400_000).toISOString(),
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1_000,
    ...values,
  };
}

function process(
  value: PaperExecutionSession,
  candles: readonly OhlcvCandle[],
  second = 3,
): PaperExecutionSession {
  return reducePaperExecutionSession(value, {
    type: 'process-candles',
    candles,
    processedAt: at(second),
  });
}

describe('paper execution contracts and plan validation', () => {
  it('pins stable schema, policy, cost, dataset, scenario, and analysis identities', () => {
    const value = session();

    expect(PAPER_EXECUTION_SCHEMA_VERSION).toBe(1);
    expect(EXECUTION_POLICY_VERSION).toBe('paper-execution-policy-v1');
    expect(COST_MODEL_VERSION).toBe('paper-cost-model-v1');
    expect(value).toMatchObject({
      schemaVersion: 1,
      status: 'draft',
      lastProcessedCandleIndex: 2,
      source: identity(),
      executionPolicy: DEFAULT_EXECUTION_POLICY,
      costModel: DEFAULT_COST_MODEL,
    });
    expect(value.events).toEqual([
      {
        eventId: 'paper-session-001:event:0',
        sequence: 0,
        occurredAt: at(1),
        type: 'session-created',
        planId: 'plan-001',
      },
    ]);
  });

  it('fails closed for every material restored identity mismatch', () => {
    const pinned = identity();
    expect(executionIdentitiesEqual(pinned, { ...pinned })).toBe(true);
    for (const available of [
      identity({ datasetId: 'different' }),
      identity({ datasetVersion: 'v2' }),
      identity({ canonicalChecksum: `sha256:${'b'.repeat(64)}` }),
      identity({ scenarioId: 'different' }),
      identity({ scenarioVersion: 'v2' }),
      identity({ analysisSessionId: 'different' }),
      identity({ decisionCandleIndex: 3 }),
      identity({ permittedDirections: ['short'] }),
    ]) {
      expect(executionIdentitiesEqual(pinned, available)).toBe(false);
      expect(() => assertCompatibleExecutionIdentity(pinned, available)).toThrow('pinned');
    }
  });

  it('rejects unsupported schemas, policies, cost models, and invalid checksums', () => {
    expect(() =>
      assertValidPaperExecutionSession({ ...session(), schemaVersion: 2 } as never),
    ).toThrow('Unsupported paper execution schema');
    expect(() =>
      createPaperExecutionSession({
        sessionId: 'session',
        orderId: 'order',
        positionId: 'position',
        debriefId: 'debrief',
        source: identity(),
        plan: plan(),
        createdAt: at(1),
        executionPolicy: {
          ...DEFAULT_EXECUTION_POLICY,
          sameCandleAmbiguityPolicy: 'loss-first',
        } as never,
      }),
    ).toThrow('Unsupported execution policy');
    expect(() =>
      session(plan(), identity(), { ...DEFAULT_COST_MODEL, version: 'v2' } as never),
    ).toThrow('Unsupported cost model');
    expect(() => session(plan(), identity({ canonicalChecksum: 'sha256:ABC' }))).toThrow('SHA-256');
  });

  it('validates direction, order permission, future authorship, and numerical inputs', () => {
    const result = createTradePlan(
      plan({
        direction: 'long',
        entryIntent: { type: 'stop', triggerPrice: -1 },
        protectiveStopPrice: -2,
        targetPrice: -3,
        fictionalAccountValue: 0,
        intendedRiskAmount: 0,
        quantity: 0.5,
        authoredAtCandleIndex: 3,
      }),
      identity({ permittedDirections: ['short'], permittedEntryOrderTypes: ['market'] }),
    );

    expect(result.status).toBe('invalid');
    expect(result.validationIssues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'DIRECTION_NOT_PERMITTED',
        'ORDER_TYPE_NOT_PERMITTED',
        'ENTRY_PRICE_MUST_BE_POSITIVE',
        'STOP_PRICE_MUST_BE_POSITIVE',
        'TARGET_PRICE_MUST_BE_POSITIVE',
        'ACCOUNT_VALUE_MUST_BE_POSITIVE',
        'RISK_BUDGET_MUST_BE_POSITIVE',
        'QUANTITY_INCREMENT_MISMATCH',
        'PLAN_USES_FUTURE_CANDLE',
      ]),
    );
  });

  it.each([
    ['long stop', plan({ protectiveStopPrice: 100 }), 'LONG_STOP_MUST_BE_BELOW_ENTRY'],
    ['long target', plan({ targetPrice: 99 }), 'LONG_TARGET_MUST_BE_ABOVE_ENTRY'],
    [
      'short stop',
      plan({
        direction: 'short',
        protectiveStopPrice: 100,
        targetPrice: 90,
        processEvidence: { ...plan().processEvidence, analysisDecision: 'short' },
      }),
      'SHORT_STOP_MUST_BE_ABOVE_ENTRY',
    ],
    [
      'short target',
      plan({
        direction: 'short',
        protectiveStopPrice: 105,
        targetPrice: 101,
        processEvidence: { ...plan().processEvidence, analysisDecision: 'short' },
      }),
      'SHORT_TARGET_MUST_BE_BELOW_ENTRY',
    ],
  ] as const)('rejects an incoherent %s relationship', (_label, input, code) => {
    expect(createTradePlan(input, identity()).validationIssues.map(({ code }) => code)).toContain(
      code,
    );
  });

  it('rejects zero stop distance, excessive estimated risk, and invalid quantity increments', () => {
    const value = createTradePlan(
      plan({ protectiveStopPrice: 100, quantity: 10.5, intendedRiskAmount: 1 }),
      identity(),
    );
    expect(value.validationIssues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'STOP_DISTANCE_MUST_BE_POSITIVE',
        'QUANTITY_INCREMENT_MISMATCH',
        'ESTIMATED_RISK_EXCEEDS_BUDGET',
      ]),
    );
  });

  it('rejects prices off the configured tick and a risk amount above fictional account value', () => {
    const value = createTradePlan(
      plan({
        entryIntent: { type: 'market', estimatedEntryPrice: 100.001 },
        protectiveStopPrice: 95.001,
        targetPrice: 110.001,
        fictionalAccountValue: 100,
        intendedRiskAmount: 101,
      }),
      identity(),
    );
    expect(value.validationIssues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'ENTRY_PRICE_TICK_MISMATCH',
        'STOP_PRICE_TICK_MISMATCH',
        'TARGET_PRICE_TICK_MISMATCH',
        'RISK_BUDGET_EXCEEDS_ACCOUNT_VALUE',
      ]),
    );
  });

  it('keeps no-trade and development credit as visible process warnings, not mechanical blockers', () => {
    const value = createTradePlan(
      plan({ processEvidence: { ...plan().processEvidence, analysisDecision: 'no-trade' } }),
      identity({ learningCredit: 'none' }),
    );
    expect(value.status).toBe('valid');
    expect(value.validationIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ANALYSIS_DID_NOT_SUPPORT_TRADE', severity: 'warning' }),
        expect.objectContaining({
          code: 'DEVELOPMENT_SCENARIO_NO_COURSE_CREDIT',
          severity: 'warning',
        }),
      ]),
    );
  });

  it('rejects an invalid plan with an immutable deterministic event instead of creating an order fill', () => {
    const draft = session(plan({ quantity: 10_000, intendedRiskAmount: 1 }));
    const rejected = submit(draft);

    expect(rejected.status).toBe('rejected');
    expect(rejected.workingOrder?.status).toBe('rejected');
    expect(rejected.events.at(-1)).toMatchObject({
      eventId: 'paper-session-001:event:1',
      type: 'order-rejected',
    });
    expect(() => process(rejected, [candle(3)])).toThrow('must be submitted');
  });

  it('allows plan replacement only while draft and preserves an audit event', () => {
    const replaced = reducePaperExecutionSession(session(), {
      type: 'replace-plan',
      plan: plan({ planId: 'plan-002', targetPrice: 112 }),
      updatedAt: at(2),
    });
    expect(replaced.plan.planId).toBe('plan-002');
    expect(replaced.events.at(-1)?.type).toBe('plan-replaced');
    expect(() =>
      reducePaperExecutionSession(submit(replaced), {
        type: 'replace-plan',
        plan: plan(),
        updatedAt: at(3),
      }),
    ).toThrow('cannot be amended');
  });
});

describe('market, limit, and stop entry behavior', () => {
  it('fills a market order only at the next candle open with adverse spread and slippage', () => {
    const draft = session();
    expect(draft.lastProcessedCandleIndex).toBe(2);
    const filled = process(submit(draft), [
      candle(3, { open: 100, high: 102, low: 99, close: 101 }),
    ]);

    expect(filled.status).toBe('open');
    expect(filled.position?.entryFill).toMatchObject({
      side: 'buy',
      candleIndex: 3,
      referencePrice: 100,
      price: 100.1,
      commission: 1,
      gap: false,
    });
    expect(filled.events.map(({ type }) => type)).toEqual([
      'session-created',
      'order-submitted',
      'order-working',
      'order-filled',
      'position-opened',
    ]);
  });

  it('applies symmetric adverse execution to a short market entry', () => {
    const short = plan({
      direction: 'short',
      protectiveStopPrice: 105,
      targetPrice: 90,
      processEvidence: { ...plan().processEvidence, analysisDecision: 'short' },
    });
    const filled = process(submit(session(short)), [candle(3)]);
    expect(filled.position?.entryFill).toMatchObject({ side: 'sell', price: 99.9 });
  });

  it.each([
    {
      label: 'long limit',
      input: plan({ entryIntent: { type: 'limit', limitPrice: 98 }, protectiveStopPrice: 94 }),
      bar: candle(3, { open: 100, high: 101, low: 97, close: 98 }),
      side: 'buy',
      price: 98,
    },
    {
      label: 'short limit',
      input: plan({
        direction: 'short',
        entryIntent: { type: 'limit', limitPrice: 102 },
        protectiveStopPrice: 106,
        targetPrice: 94,
        processEvidence: { ...plan().processEvidence, analysisDecision: 'short' },
      }),
      bar: candle(3, { open: 100, high: 103, low: 99, close: 102 }),
      side: 'sell',
      price: 102,
    },
  ] as const)(
    'fills a crossed $label conservatively at the limit without price improvement',
    ({ input, bar, side, price }) => {
      const filled = process(submit(session(input)), [bar]);
      expect(filled.position?.entryFill).toMatchObject({
        side,
        price,
        priceCappedByLimit: true,
        modeledSpreadAmount: 0,
        modeledSlippageAmount: 0,
      });
    },
  );

  it.each([
    {
      label: 'long stop',
      input: plan({ entryIntent: { type: 'stop', triggerPrice: 102 }, protectiveStopPrice: 98 }),
      bar: candle(3, { open: 100, high: 103, low: 99, close: 102 }),
      side: 'buy',
      price: 102.11,
    },
    {
      label: 'short stop',
      input: plan({
        direction: 'short',
        entryIntent: { type: 'stop', triggerPrice: 98 },
        protectiveStopPrice: 102,
        targetPrice: 90,
        processEvidence: { ...plan().processEvidence, analysisDecision: 'short' },
      }),
      bar: candle(3, { open: 100, high: 101, low: 97, close: 98 }),
      side: 'sell',
      price: 97.9,
    },
  ] as const)('triggers an intrabar $label symmetrically', ({ input, bar, side, price }) => {
    const filled = process(submit(session(input)), [bar]);
    expect(filled.position?.entryFill).toMatchObject({
      side,
      referencePrice: input.entryIntent.type === 'stop' ? input.entryIntent.triggerPrice : 0,
      price,
    });
  });

  it.each([
    {
      label: 'long stop gap',
      input: plan({
        entryIntent: { type: 'stop', triggerPrice: 102 },
        protectiveStopPrice: 95,
        targetPrice: 120,
      }),
      bar: candle(3, { open: 105, high: 107, low: 104, close: 106 }),
      side: 'buy',
      price: 105.11,
    },
    {
      label: 'short stop gap',
      input: plan({
        direction: 'short',
        entryIntent: { type: 'stop', triggerPrice: 98 },
        protectiveStopPrice: 105,
        targetPrice: 80,
        processEvidence: { ...plan().processEvidence, analysisDecision: 'short' },
      }),
      bar: candle(3, { open: 95, high: 96, low: 93, close: 94 }),
      side: 'sell',
      price: 94.9,
    },
  ] as const)(
    'uses the adverse open, spread, and slippage for a $label',
    ({ input, bar, side, price }) => {
      const filled = process(submit(session(input)), [bar]);
      expect(filled.position?.entryFill).toMatchObject({
        side,
        referencePrice: bar.open,
        price,
        gap: true,
      });
    },
  );

  it('keeps untouched limit and stop orders working', () => {
    const limit = plan({ entryIntent: { type: 'limit', limitPrice: 95 }, protectiveStopPrice: 90 });
    const working = process(submit(session(limit)), [candle(3), candle(4)], 3);
    expect(working.status).toBe('working');
    expect(working.workingOrder?.status).toBe('working');
    expect(working.events).toHaveLength(3);
  });

  it.each([
    {
      label: 'long limit',
      input: plan({
        entryIntent: { type: 'limit', limitPrice: 98 },
        protectiveStopPrice: 85,
        intendedRiskAmount: 200,
      }),
      bar: candle(3, { open: 90, high: 93, low: 89, close: 92 }),
      side: 'buy',
      price: 98,
    },
    {
      label: 'short limit',
      input: plan({
        direction: 'short',
        entryIntent: { type: 'limit', limitPrice: 102 },
        protectiveStopPrice: 115,
        targetPrice: 90,
        intendedRiskAmount: 200,
        processEvidence: { ...plan().processEvidence, analysisDecision: 'short' },
      }),
      bar: candle(3, { open: 110, high: 112, low: 108, close: 109 }),
      side: 'sell',
      price: 102,
    },
  ] as const)(
    'does not grant favorable opening-gap improvement to a $label',
    ({ input, bar, side, price }) => {
      const filled = process(submit(session(input)), [bar]);
      expect(filled.position?.entryFill).toMatchObject({
        side,
        referencePrice: price,
        price,
        gap: true,
        priceCappedByLimit: true,
      });
    },
  );
});

describe('position resolution, ambiguity, gaps, and debrief', () => {
  function opened(input: TradePlanInput = plan()): PaperExecutionSession {
    return process(submit(session(input)), [candle(3)], 3);
  }

  it('closes a long position at its protective stop with adverse modeled execution', () => {
    const closed = process(opened(), [candle(4, { open: 100, high: 101, low: 94, close: 95 })], 4);
    expect(closed.status).toBe('closed');
    expect(closed.position).toMatchObject({ status: 'closed-stop', closedAtCandleIndex: 4 });
    expect(closed.position?.exitFill).toMatchObject({
      side: 'sell',
      referencePrice: 95,
      price: 94.9,
    });
    expect(closed.debrief).toMatchObject({
      outcome: 'protective-stop',
      outcomeDeterminate: true,
      processQuality: 'coherent',
    });
    expect(closed.debrief?.riskMultiple).toBeLessThan(0);
  });

  it('closes a short position at its target without favorable gap improvement', () => {
    const short = plan({
      direction: 'short',
      protectiveStopPrice: 105,
      targetPrice: 90,
      processEvidence: { ...plan().processEvidence, analysisDecision: 'short' },
    });
    const closed = process(
      opened(short),
      [candle(4, { open: 85, high: 89, low: 84, close: 86 })],
      4,
    );
    expect(closed.position?.exitFill).toMatchObject({
      side: 'buy',
      referencePrice: 90,
      price: 90,
      priceCappedByLimit: true,
    });
    expect(closed.debrief?.outcome).toBe('target');
  });

  it.each([
    {
      label: 'long',
      input: plan(),
      bar: candle(4, { open: 90, high: 92, low: 88, close: 91 }),
      side: 'sell',
      referencePrice: 90,
      price: 89.91,
    },
    {
      label: 'short',
      input: plan({
        direction: 'short',
        protectiveStopPrice: 105,
        targetPrice: 90,
        processEvidence: { ...plan().processEvidence, analysisDecision: 'short' },
      }),
      bar: candle(4, { open: 110, high: 112, low: 109, close: 111 }),
      side: 'buy',
      referencePrice: 110,
      price: 110.11,
    },
  ] as const)(
    'fills a $label protective-stop gap at the adverse open',
    ({ input, bar, side, referencePrice, price }) => {
      const closed = process(opened(input), [bar], 4);
      expect(closed.position?.exitFill).toMatchObject({ side, referencePrice, price, gap: true });
    },
  );

  it('pauses when both stop and target are touched and never chooses the profitable result', () => {
    const ambiguous = process(
      opened(),
      [candle(4, { open: 100, high: 111, low: 94, close: 102 })],
      4,
    );
    expect(ambiguous.status).toBe('ambiguous');
    expect(ambiguous.position).toMatchObject({
      status: 'ambiguous',
      ambiguityReason: 'stop-and-target-same-candle',
    });
    expect(ambiguous.position?.exitFill).toBeUndefined();
    expect(ambiguous.debrief).toMatchObject({
      outcome: 'ambiguous',
      outcomeDeterminate: false,
    });
    expect(ambiguous.debrief?.netSimulatedOutcome).toBeUndefined();
    expect(ambiguous.debrief?.riskMultiple).toBeUndefined();
  });

  it('uses a known protective-stop opening gap before later intrabar target contact', () => {
    const closed = process(opened(), [candle(4, { open: 90, high: 112, low: 89, close: 110 })], 4);
    expect(closed.status).toBe('closed');
    expect(closed.position).toMatchObject({ status: 'closed-stop' });
    expect(closed.position?.exitFill).toMatchObject({ referencePrice: 90, gap: true });
  });

  it('pauses when an intrabar entry and an exit threshold appear in the same candle', () => {
    const input = plan({
      entryIntent: { type: 'limit', limitPrice: 98 },
      protectiveStopPrice: 95,
      targetPrice: 110,
    });
    const ambiguous = process(submit(session(input)), [
      candle(3, { open: 100, high: 101, low: 94, close: 99 }),
    ]);
    expect(ambiguous.status).toBe('ambiguous');
    expect(ambiguous.position?.ambiguityReason).toBe('entry-exit-sequence-unknown');
  });

  it('grades process independently of a target outcome', () => {
    const mismatched = plan({
      processEvidence: {
        analysisDecision: 'no-trade',
        entryMatchesAnalysis: false,
        invalidationMatchesAnalysis: false,
        targetMatchesAnalysis: false,
        requiredReasoningBypassed: true,
      },
    });
    const closed = process(
      opened(mismatched),
      [candle(4, { open: 100, high: 112, low: 99, close: 111 })],
      4,
    );
    expect(closed.debrief).toMatchObject({ outcome: 'target', processQuality: 'needs-review' });
    expect(closed.debrief?.netSimulatedOutcome).toBeGreaterThan(0);
    expect(closed.debrief?.processAssessment).toEqual(
      expect.arrayContaining([
        { id: 'direction-aligned', result: 'not-met' },
        { id: 'reasoning-preserved', result: 'not-met' },
      ]),
    );
  });

  it('itemizes spread, slippage, commissions, net outcome, and R deterministically', () => {
    const zeroish: CostModel = {
      ...DEFAULT_COST_MODEL,
      spreadBps: 20,
      slippageBps: 10,
      commissionFixed: 0.5,
      commissionPerUnit: 0.05,
      minimumCommission: 0,
    };
    const value = session(plan({ intendedRiskAmount: 200 }), identity(), zeroish);
    const openedValue = process(submit(value), [candle(3)], 3);
    const closed = process(
      openedValue,
      [candle(4, { open: 100, high: 111, low: 99, close: 110 })],
      4,
    );
    expect(openedValue.position?.entryFill).toMatchObject({
      price: 100.2,
      commission: 1,
      modeledSpreadAmount: 0.1,
      modeledSlippageAmount: 0.1,
    });
    expect(closed.debrief).toMatchObject({ totalCommissions: 2, modeledSpreadAndSlippage: 2 });
    expect(closed.debrief?.netSimulatedOutcome).toBeCloseTo(96, 8);
    expect(closed.debrief?.riskMultiple).toBeCloseTo(96 / closed.plan.estimatedTotalRisk, 8);
  });
});

describe('sequential replay, idempotency, cancellation, and completion', () => {
  it('processes every intermediate candle and yields identical results for batch or single advances', () => {
    const bars = [
      candle(3),
      candle(4, { open: 101, high: 102, low: 100, close: 101 }),
      candle(5, { open: 101, high: 111, low: 100, close: 110 }),
    ];
    const batched = process(submit(), bars, 5);
    let sequential = submit();
    sequential = process(sequential, [bars[0]!], 3);
    sequential = process(sequential, [bars[1]!], 4);
    sequential = process(sequential, [bars[2]!], 5);

    expect(batched.position).toEqual(sequential.position);
    expect(batched.events).toEqual(sequential.events);
    expect(batched.debrief).toEqual(sequential.debrief);
    expect(batched.processedCandles.map(({ index }) => index)).toEqual([3, 4, 5]);
  });

  it('is idempotent when submission or identical candles are replayed', () => {
    const submitted = submit();
    const duplicateSubmit = reducePaperExecutionSession(submitted, {
      type: 'submit',
      confirmationId: 'confirmation-001',
      submittedAt: at(2),
    });
    expect(duplicateSubmit).toBe(submitted);

    const once = process(submitted, [candle(3)], 3);
    const twice = process(once, [candle(3)], 4);
    expect(twice).toBe(once);
  });

  it('rejects skipped, changed, pre-decision, and out-of-range candles', () => {
    const value = submit();
    expect(() => process(value, [candle(4)])).toThrow('expected 3');
    expect(() => process(value, [candle(2)])).toThrow('completed decision');
    expect(() => process(value, [candle(8)])).toThrow('outside');
    const processed = process(value, [candle(3)]);
    expect(() => process(processed, [candle(3, { close: 100.5 })], 4)).toThrow('checkpoint');
  });

  it('cannot be affected by omitted future candles', () => {
    const prefix = [candle(3), candle(4, { open: 101, high: 102, low: 100, close: 101 })];
    const future = candle(5, { open: 1_000, high: 2_000, low: 1, close: 1_500 });
    const first = process(submit(), prefix, 4);
    const second = process(submit(), [...prefix], 4);
    expect(first).toEqual(second);
    expect(first.processedCandles.some(({ index }) => index === future.index)).toBe(false);
  });

  it('cancels a working order before fill and makes confirmation idempotent', () => {
    const working = submit(
      session(plan({ entryIntent: { type: 'limit', limitPrice: 90 }, protectiveStopPrice: 85 })),
    );
    const cancelled = reducePaperExecutionSession(working, {
      type: 'cancel-order',
      confirmationId: 'cancel-001',
      cancelledAt: at(3),
    });
    const repeated = reducePaperExecutionSession(cancelled, {
      type: 'cancel-order',
      confirmationId: 'cancel-001',
      cancelledAt: at(3),
    });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.workingOrder?.status).toBe('cancelled');
    expect(repeated).toBe(cancelled);
    expect(() =>
      reducePaperExecutionSession(process(submit(), [candle(3)]), {
        type: 'cancel-order',
        confirmationId: 'too-late',
        cancelledAt: at(4),
      }),
    ).toThrow('unfilled');
  });

  it('requires explicit confirmation to abandon and preserves the audit trail', () => {
    const abandoned = reducePaperExecutionSession(submit(), {
      type: 'abandon',
      confirmationId: 'reset-confirmation-001',
      abandonedAt: at(3),
    });
    expect(abandoned.status).toBe('cancelled');
    expect(abandoned.events.at(-1)).toMatchObject({
      type: 'execution-abandoned',
      confirmationId: 'reset-confirmation-001',
    });
  });

  it('expires an unfilled order only after every pinned candle is processed', () => {
    const input = plan({ entryIntent: { type: 'limit', limitPrice: 50 }, protectiveStopPrice: 45 });
    let working = submit(session(input));
    working = process(working, [candle(3), candle(4), candle(5), candle(6), candle(7)], 3);
    expect(() =>
      reducePaperExecutionSession(submit(session(input)), {
        type: 'complete-replay',
        completedAt: at(3),
      }),
    ).toThrow('every eligible candle');
    const completed = reducePaperExecutionSession(working, {
      type: 'complete-replay',
      completedAt: at(4),
    });
    expect(completed.status).toBe('completed');
    expect(completed.workingOrder?.status).toBe('expired');
    expect(completed.events.at(-1)?.type).toBe('order-expired');
  });

  it('detects corrupt events, checkpoints, derived plans, and debrief state on reload', () => {
    const value = process(submit(), [candle(3)]);
    expect(() =>
      assertValidPaperExecutionSession({
        ...value,
        events: value.events.map((entry, index) =>
          index === 1 ? { ...entry, eventId: 'forged' } : entry,
        ),
      }),
    ).toThrow('deterministic sequential');
    expect(() =>
      assertValidPaperExecutionSession({ ...value, lastProcessedCandleIndex: 4 }),
    ).toThrow('Last processed');
    expect(() =>
      assertValidPaperExecutionSession({
        ...value,
        plan: { ...value.plan, estimatedTotalRisk: 1 },
      }),
    ).toThrow('deterministic validation');
    expect(() =>
      assertValidPaperExecutionSession({ ...value, debrief: { debriefId: 'forged' } as never }),
    ).toThrow('Unresolved');
  });
});
