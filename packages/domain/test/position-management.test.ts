import { describe, expect, it } from 'vitest';

import {
  DEFAULT_COST_MODEL,
  DEFAULT_EXECUTION_POLICY,
  POSITION_MANAGEMENT_POLICY_VERSION,
  POSITION_MANAGEMENT_SCHEMA_VERSION,
  assertValidPositionManagementSession,
  computePositionManagementRubricChecksum,
  createPaperExecutionSession,
  createPositionManagementSession,
  previewPositionManagementIntent,
  reducePaperExecutionSession,
  reducePositionManagementSession,
  selectPositionManagementSnapshot,
  type HistoricalExecutionIdentity,
  type CostModel,
  type OhlcvCandle,
  type PaperExecutionSession,
  type PositionManagementAction,
  type PositionManagementAuthority,
  type PositionManagementMaterialIntent,
  type PositionManagementProcessEvidence,
  type PositionManagementRubricV1,
  type PositionManagementSession,
  type TradePlanInput,
} from '../src/index.js';

const BASE_TIME = Date.parse('2026-08-25T12:00:00.000Z');

function at(second: number): string {
  return new Date(BASE_TIME + second * 1_000).toISOString();
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

function identity(
  overrides: Partial<HistoricalExecutionIdentity> = {},
): HistoricalExecutionIdentity {
  return {
    datasetId: 'managed-dataset',
    datasetVersion: '1.0.0',
    canonicalChecksum: `sha256:${'a'.repeat(64)}`,
    scenarioId: 'managed-scenario',
    scenarioVersion: '1.0.0',
    analysisSessionId: 'analysis-session',
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
    planId: 'paper-plan',
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

function openPaper(
  planInput = plan(),
  costModel: CostModel = DEFAULT_COST_MODEL,
  entryCandle: OhlcvCandle = candle(3),
): PaperExecutionSession {
  let paper = createPaperExecutionSession({
    sessionId: 'paper-session',
    orderId: 'paper-order',
    positionId: 'paper-position',
    debriefId: 'paper-debrief',
    source: identity(),
    plan: planInput,
    createdAt: at(1),
    executionPolicy: DEFAULT_EXECUTION_POLICY,
    costModel,
  });
  paper = reducePaperExecutionSession(paper, {
    type: 'submit',
    confirmationId: 'paper-confirmation',
    submittedAt: at(2),
  });
  return reducePaperExecutionSession(paper, {
    type: 'process-candles',
    candles: [entryCandle],
    processedAt: at(3),
  });
}

function authority(
  overrides: Partial<PositionManagementAuthority> = {},
): PositionManagementAuthority {
  const rubric: PositionManagementRubricV1 = overrides.rubric ?? {
    schemaVersion: 1,
    criteria: [
      {
        criterionId: 'planned-basis',
        kind: 'decision-basis',
        accepted: ['predefined-plan', 'new-visible-evidence', 'risk-reduction'],
      },
      { criterionId: 'risk-reviewed', kind: 'risk-reviewed', required: true },
      {
        criterionId: 'management-evidence',
        kind: 'evidence-tags',
        accepted: ['predefined-plan', 'risk-budget', 'voluntary-exit-rule'],
        minimumMatches: 1,
      },
      {
        criterionId: 'warnings-acknowledged',
        kind: 'risk-warning-acknowledged',
        required: true,
      },
    ],
  };
  const riskLimits = overrides.riskLimits ?? {
    maxOpenQuantityUnits: 20,
    maxScaleInInitialQuantityBps: 10_000,
    softRiskLimitOriginalRBps: 10_000,
    hardRiskLimitOriginalRBps: 20_000,
  };
  return {
    schemaVersion: 1,
    permissionVersion: 'managed-permissions-v1',
    permittedActionKinds: [
      'full-exit',
      'partial-exit',
      'scale-in',
      'replace-stop',
      'replace-target',
    ],
    rubricId: 'managed-rubric',
    rubricVersion: '1.0.0',
    learningCredit: 'none',
    ...overrides,
    rubric,
    riskLimits,
    rubricChecksum: overrides.rubricChecksum ?? computePositionManagementRubricChecksum(rubric),
  };
}

function disciplinedEvidence(
  overrides: Partial<PositionManagementProcessEvidence> = {},
): PositionManagementProcessEvidence {
  return {
    decisionBasis: 'predefined-plan',
    riskReviewed: true,
    evidenceTags: ['predefined-plan', 'risk-budget'],
    ...overrides,
  };
}

function managed(
  paper: PaperExecutionSession = openPaper(),
  pinnedAuthority: PositionManagementAuthority = authority(),
): PositionManagementSession {
  return createPositionManagementSession({
    sessionId: 'management-session',
    debriefId: 'management-debrief',
    openPaperExecutionSession: paper,
    authority: pinnedAuthority,
    createdAt: at(4),
  });
}

function edit(
  session: PositionManagementSession,
  intent: PositionManagementMaterialIntent,
  second = 5,
  suffix = '1',
  processEvidence: PositionManagementProcessEvidence = disciplinedEvidence(),
): PositionManagementSession {
  return reducePositionManagementSession(session, {
    type: 'edit-draft',
    editId: `edit-${suffix}`,
    draftId: `draft-${suffix}`,
    intent,
    rationale: `נימוק ניהולי מתועד ${suffix}`,
    processEvidence,
    authoredAtCandleIndex: session.lastProcessedCandleIndex,
    updatedAt: at(second),
  });
}

function submit(
  session: PositionManagementSession,
  second = 6,
  suffix = '1',
): PositionManagementSession {
  const draft = session.draft!;
  return reducePositionManagementSession(session, {
    type: 'submit-draft',
    submissionId: `submission-${suffix}`,
    draftId: draft.draftId,
    acknowledgedRiskWarningCodes: draft.riskAssessment.warningCodes,
    submittedAt: at(second),
  });
}

function queue(
  session: PositionManagementSession,
  intent: PositionManagementMaterialIntent,
  suffix = '1',
  second = 5,
): PositionManagementSession {
  return submit(edit(session, intent, second, suffix), second + 1, suffix);
}

function process(
  session: PositionManagementSession,
  bars: readonly OhlcvCandle[],
  second = 7,
): PositionManagementSession {
  return reducePositionManagementSession(session, {
    type: 'process-candles',
    candles: bars,
    processedAt: at(second),
  });
}

describe('position management handoff and authority', () => {
  it('initializes a separate schema-1 aggregate from an exact open paper handoff', () => {
    const paper = openPaper();
    const session = managed(paper);

    expect(POSITION_MANAGEMENT_SCHEMA_VERSION).toBe(1);
    expect(POSITION_MANAGEMENT_POLICY_VERSION).toBe('position-management-policy-v1');
    expect(session).toMatchObject({
      schemaVersion: 1,
      revision: 0,
      status: 'active',
      handoff: paper,
      source: paper.source,
      direction: 'long',
      initialQuantityUnits: 10,
      openQuantityUnits: 10,
      activeProtectiveStopTicks: 9_500,
      activeTargetTicks: 11_000,
    });
    expect(session.originalRiskMinor).toBe(Math.round(paper.plan.estimatedTotalRisk * 100));
    expect(session.events).toHaveLength(1);
  });

  it('rejects non-open handoffs and malformed or mismatched scenario authority', () => {
    const draftPaper = createPaperExecutionSession({
      sessionId: 'draft-paper',
      orderId: 'order',
      positionId: 'position',
      debriefId: 'debrief',
      source: identity(),
      plan: plan(),
      createdAt: at(1),
    });
    expect(() => managed(draftPaper)).toThrow('open paper');
    expect(() => managed(openPaper(), authority({ rubricChecksum: 'sha256:BAD' }))).toThrow(
      'lowercase SHA-256',
    );
    expect(() => managed(openPaper(), authority({ learningCredit: 'course' }))).toThrow(
      'learning credit',
    );
  });

  it('enforces exact scenario action permissions', () => {
    const session = managed(
      openPaper(),
      authority({ permittedActionKinds: ['full-exit', 'replace-stop'] }),
    );
    expect(() =>
      edit(session, { kind: 'scale-in', quantityUnits: 1, estimatedEntryPrice: 100 }),
    ).toThrow('not permitted');
  });
});

describe('draft, submission, risk, cancellation, and journals', () => {
  it('keeps drafts editable with unique edit IDs and freezes the submitted rationale', () => {
    const first = edit(managed(), { kind: 'replace-target', price: 111 });
    const second = reducePositionManagementSession(first, {
      type: 'edit-draft',
      editId: 'edit-2',
      draftId: 'draft-1',
      intent: { kind: 'replace-target', price: 112 },
      rationale: 'נימוק מתוקן לפני הגשה',
      processEvidence: disciplinedEvidence({ decisionBasis: 'new-visible-evidence' }),
      authoredAtCandleIndex: 3,
      updatedAt: at(6),
    });
    const submitted = submit(second, 7);
    expect(submitted.draft).toBeUndefined();
    expect(submitted.pendingAction).toMatchObject({
      intent: { kind: 'replace-target', price: 112 },
      rationale: 'נימוק מתוקן לפני הגשה',
      eligibleCandleIndex: 4,
    });
    expect(() => edit(submitted, { kind: 'full-exit' }, 8, '3')).toThrow('pending');
  });

  it('requires explicit soft-risk acknowledgement and hard-rejects excessive risk or scale size', () => {
    const warning = edit(managed(), { kind: 'replace-stop', price: 92 });
    expect(warning.draft?.riskAssessment.warningCodes).toContain(
      'PROJECTED_RISK_EXCEEDS_ORIGINAL_1R',
    );
    expect(() =>
      reducePositionManagementSession(warning, {
        type: 'submit-draft',
        submissionId: 'warning-submit',
        draftId: 'draft-1',
        acknowledgedRiskWarningCodes: [],
        submittedAt: at(6),
      }),
    ).toThrow('explicit acknowledgement');

    const hardStop = edit(managed(), { kind: 'replace-stop', price: 89 });
    expect(hardStop.draft?.riskAssessment.hardRejectionCodes).toContain(
      'PROJECTED_RISK_EXCEEDS_HARD_LIMIT',
    );
    expect(() => submit(hardStop)).toThrow('hard risk');

    const hardScale = edit(managed(), {
      kind: 'scale-in',
      quantityUnits: 11,
      estimatedEntryPrice: 100,
    });
    expect(hardScale.draft?.riskAssessment.hardRejectionCodes).toContain(
      'SCALE_IN_EXCEEDS_QUANTITY_LIMIT',
    );
  });

  it('cancels only the exact pending action and makes exact ID retries idempotent', () => {
    const queued = queue(managed(), { kind: 'full-exit' });
    const action: PositionManagementAction = {
      type: 'cancel-pending',
      cancellationId: 'cancel-1',
      submissionId: 'submission-1',
      cancelledAt: at(7),
    };
    const cancelled = reducePositionManagementSession(queued, action);
    expect(cancelled.pendingAction).toBeUndefined();
    expect(reducePositionManagementSession(cancelled, action)).toBe(cancelled);
    expect(() =>
      reducePositionManagementSession(cancelled, { ...action, submissionId: 'changed' }),
    ).toThrow('reused with changed data');
  });

  it('appends journal observations and corrections without overwriting history', () => {
    const observed = reducePositionManagementSession(managed(), {
      type: 'record-observation',
      entryId: 'journal-1',
      candleIndex: 3,
      text: 'נר ההחלטה נשמר ללא מידע עתידי',
      recordedAt: at(5),
    });
    const corrected = reducePositionManagementSession(observed, {
      type: 'correct-journal',
      entryId: 'journal-2',
      correctsEntryId: 'journal-1',
      text: 'תיקון מצטבר שאינו מוחק את הרשומה',
      recordedAt: at(6),
    });
    expect(corrected.journal).toHaveLength(2);
    expect(corrected.journal[0]).toEqual(observed.journal[0]);
    expect(corrected.journal[1]).toMatchObject({
      kind: 'correction',
      correctsEntryId: 'journal-1',
    });
    expect(() =>
      reducePositionManagementSession(corrected, {
        type: 'record-observation',
        entryId: 'journal-1',
        candleIndex: 3,
        text: 'טקסט שונה',
        recordedAt: at(7),
      }),
    ).toThrow('reused with changed data');
  });
});

describe('material execution ordering and accounting', () => {
  it('fills a full voluntary exit at the next candle open with adverse costs', () => {
    const closed = process(queue(managed(), { kind: 'full-exit' }), [
      candle(4, { open: 102, high: 103, low: 101, close: 102 }),
    ]);
    expect(closed.status).toBe('closed-voluntary');
    expect(closed.openQuantityUnits).toBe(0);
    expect(closed.fills[0]?.fill).toMatchObject({
      reason: 'voluntary-exit',
      referencePriceMinor: 10_200,
      priceMinor: 10_189,
      quantityUnits: 10,
      commissionMinor: 100,
    });
    expect(closed.accounting).toMatchObject({
      grossRealizedMinor: 1_790,
      allocatedEntryCommissionMinor: 100,
      exitCommissionMinor: 100,
      realizedNetMinor: 1_590,
    });
    expect(closed.debrief).toMatchObject({
      outcome: 'voluntary-exit',
      processQuality: 'coherent',
      realizedRiskDenominatorMinor: closed.originalRiskMinor,
    });
  });

  it('partially exits exact FIFO units and preserves the remainder', () => {
    const partial = process(queue(managed(), { kind: 'partial-exit', quantityUnits: 4 }), [
      candle(4, { open: 102, high: 103, low: 99, close: 101 }),
    ]);
    expect(partial.status).toBe('active');
    expect(partial.openQuantityUnits).toBe(6);
    expect(partial.lots[0]).toMatchObject({
      openQuantityUnits: 6,
      unallocatedEntryCommissionMinor: 60,
    });
    expect(partial.accounting.realizedSlices[0]).toMatchObject({
      quantityUnits: 4,
      allocatedEntryCommissionMinor: 40,
    });
  });

  it('fills a bounded scale-in, creates a distinct lot, and updates integer cost state', () => {
    const queued = queue(managed(), {
      kind: 'scale-in',
      quantityUnits: 2,
      estimatedEntryPrice: 100,
    });
    const scaled = process(queued, [candle(4, { open: 101, high: 103, low: 99, close: 102 })]);
    expect(scaled.status).toBe('active');
    expect(scaled.openQuantityUnits).toBe(12);
    expect(scaled.lots).toHaveLength(2);
    expect(scaled.lots[1]).toMatchObject({
      openedBy: 'scale-in',
      entryPriceMinor: 10_111,
      initialQuantityUnits: 2,
      entryCommissionMinor: 100,
    });
    expect(scaled.events.at(-1)?.type).toBe('scale-in-filled');
    expect(scaled.accounting.modeledExecutionCostMinor).toBeGreaterThan(100);
  });

  it('activates replacements first and then applies stop or target thresholds', () => {
    const stopped = process(queue(managed(), { kind: 'replace-stop', price: 97 }), [
      candle(4, { open: 100, high: 101, low: 96, close: 97 }),
    ]);
    expect(stopped.activeProtectiveStopTicks).toBe(9_700);
    expect(stopped.events.map(({ type }) => type)).toEqual(
      expect.arrayContaining(['protective-stop-replaced', 'position-closed-stop']),
    );
    expect(stopped.status).toBe('closed-stop');

    const targeted = process(queue(managed(), { kind: 'replace-target', price: 105 }), [
      candle(4, { open: 100, high: 106, low: 99, close: 105 }),
    ]);
    expect(targeted.activeTargetTicks).toBe(10_500);
    expect(targeted.status).toBe('closed-target');
    expect(targeted.fills.at(-1)?.fill.priceMinor).toBe(10_500);
  });

  it('reports explicit opening conflict before a voluntary fill and intrabar threshold ambiguity', () => {
    const openingConflict = process(queue(managed(), { kind: 'full-exit' }), [
      candle(4, { open: 94, high: 100, low: 93, close: 96 }),
    ]);
    expect(openingConflict.status).toBe('ambiguous');
    expect(openingConflict.ambiguityReason).toBe('voluntary-action-and-opening-threshold');
    expect(openingConflict.fills).toEqual([]);

    const intrabar = process(managed(), [candle(4, { open: 100, high: 111, low: 94, close: 101 })]);
    expect(intrabar.status).toBe('ambiguous');
    expect(intrabar.ambiguityReason).toBe('stop-and-target-same-candle');
    expect(intrabar.fills).toEqual([]);
  });
});

describe('replay integrity, selectors, debrief, and restored validation', () => {
  it('fingerprints sequential candles, is idempotent for exact replay, and rejects changed/skipped evidence', () => {
    const first = process(managed(), [candle(4)]);
    expect(process(first, [candle(4)], 8)).toBe(first);
    expect(() => process(first, [candle(4, { close: 100.5 })], 8)).toThrow('checkpoint');
    expect(() => process(managed(), [candle(5)])).toThrow('expected 4');
  });

  it('completes an unresolved final position honestly without inventing an exit', () => {
    let session = managed();
    session = process(session, [candle(4), candle(5), candle(6), candle(7)]);
    const completed = reducePositionManagementSession(session, {
      type: 'complete-replay',
      completedAt: at(8),
    });
    expect(completed.status).toBe('completed-open');
    expect(completed.openQuantityUnits).toBe(10);
    expect(completed.fills).toEqual([]);
    expect(completed.debrief).toMatchObject({
      outcome: 'open-at-replay-end',
      finalOpenQuantityUnits: 10,
    });
  });

  it('provides exact snapshot and neutral intent previews without UI accounting', () => {
    const session = managed();
    const snapshot = selectPositionManagementSnapshot(session, candle(3));
    expect(snapshot).toMatchObject({
      cutoffCandleIndex: 3,
      markCloseMinor: 10_000,
      openQuantityUnits: 10,
      weightedAverageEntryNumeratorMinorUnits: 100_100,
      weightedAverageEntryDenominatorUnits: 10,
      activeProtectiveStopMinor: 9_500,
      activeTargetMinor: 11_000,
      originalRiskMinor: session.originalRiskMinor,
      totalEntryCommissionMinor: 100,
    });
    const preview = previewPositionManagementIntent(session, {
      kind: 'scale-in',
      quantityUnits: 2,
      estimatedEntryPrice: 100,
    });
    expect(preview).toMatchObject({
      beforeOpenQuantityUnits: 10,
      afterOpenQuantityUnits: 12,
      afterWeightedAverageEntryDenominatorUnits: 12,
      estimatedAdditionalCommissionMinor: 100,
    });
    expect(preview.riskAssessment.warningCodes).toContain('PROJECTED_RISK_EXCEEDS_ORIGINAL_1R');
    expect(() => selectPositionManagementSnapshot(session, candle(3, { close: 99 }))).toThrow(
      'checkpoint',
    );
  });

  it('keeps process debrief independent of profitable or losing P&L', () => {
    const profit = process(queue(managed(), { kind: 'full-exit' }), [
      candle(4, { open: 105, high: 106, low: 104, close: 105 }),
    ]);
    const loss = process(queue(managed(), { kind: 'full-exit' }), [
      candle(4, { open: 98, high: 99, low: 97, close: 98 }),
    ]);
    expect(profit.accounting.realizedNetMinor).toBeGreaterThan(0);
    expect(loss.accounting.realizedNetMinor).toBeLessThan(0);
    expect(profit.debrief?.processAssessment).toEqual(loss.debrief?.processAssessment);
    expect(profit.debrief?.processQuality).toBe(loss.debrief?.processQuality);
  });

  it('fails closed for mutated authoritative accounting, 1R, permissions, and event identities', () => {
    const session = process(queue(managed(), { kind: 'full-exit' }), [
      candle(4, { open: 102, high: 103, low: 101, close: 102 }),
    ]);
    expect(() =>
      assertValidPositionManagementSession({ ...session, originalRiskMinor: 1 }),
    ).toThrow('1R');
    expect(() =>
      assertValidPositionManagementSession({
        ...session,
        accounting: { ...session.accounting, realizedNetMinor: 1 },
      }),
    ).toThrow('inconsistent');
    expect(() =>
      assertValidPositionManagementSession({
        ...session,
        authority: { ...session.authority, rubricChecksum: `sha256:${'c'.repeat(64)}` },
      }),
    ).toThrow('rubric checksum');
    expect(() =>
      assertValidPositionManagementSession({
        ...session,
        events: session.events.map((entry, index) =>
          index === 1 ? { ...entry, eventId: 'forged' } : entry,
        ),
      }),
    ).toThrow('sequential identities');
  });

  it('normalizes four-decimal historical marks to the nearest pinned tick', () => {
    const exact = candle(3, {
      open: 100.0049,
      high: 101.0049,
      low: 99.0049,
      close: 100.0049,
    });
    const session = managed(openPaper(plan(), DEFAULT_COST_MODEL, exact));
    expect(selectPositionManagementSnapshot(session, exact).markCloseMinor).toBe(10_000);

    const filled = process(queue(session, { kind: 'full-exit' }), [
      candle(4, { open: 102.0049, high: 103.0049, low: 101.0049, close: 102.0049 }),
    ]);
    expect(filled.fills[0]?.fill.referencePriceMinor).toBe(10_200);
  });

  it('uses actual quantity increments in monetary accounting exactly once', () => {
    const costModel: CostModel = { ...DEFAULT_COST_MODEL, quantityIncrement: 2 };
    const session = managed(openPaper(plan({ quantity: 10 }), costModel));
    expect(session.initialQuantityUnits).toBe(5);
    const closed = process(queue(session, { kind: 'full-exit' }), [
      candle(4, { open: 102, high: 103, low: 101, close: 102 }),
    ]);
    expect(closed.fills[0]?.fill.quantityUnits).toBe(5);
    expect(closed.accounting.grossRealizedMinor).toBe(1_790);
    expect(closed.accounting.realizedSlices[0]?.quantityUnits).toBe(5);
  });

  it('rounds fractional paper modeled costs once at the aggregate boundary', () => {
    const costModel: CostModel = {
      ...DEFAULT_COST_MODEL,
      spreadBps: 7,
      slippageBps: 3,
      quantityIncrement: 2,
    };
    const paper = openPaper(plan({ quantity: 10 }), costModel);
    const session = managed(paper);
    expect(session.accounting.modeledExecutionCostMinor).toBe(
      Math.round(
        paper.position!.quantity *
          (paper.position!.entryFill.modeledSpreadAmount +
            paper.position!.entryFill.modeledSlippageAmount) *
          100,
      ),
    );
  });

  it('reconstructs FIFO slices canonically and rejects compensated restored mutations', () => {
    const closed = process(queue(managed(), { kind: 'full-exit' }), [
      candle(4, { open: 102, high: 103, low: 101, close: 102 }),
    ]);
    const forgedSlice = { ...closed.accounting.realizedSlices[0]!, grossMinor: 1_791 };
    expect(() =>
      assertValidPositionManagementSession({
        ...closed,
        accounting: {
          ...closed.accounting,
          grossRealizedMinor: 1_791,
          realizedNetMinor: 1_591,
          realizedSlices: [forgedSlice],
        },
      }),
    ).toThrow('canonical FIFO reconstruction');
  });

  it('validates canonical nested fills instead of accepting favorable restored executions', () => {
    const closed = process(queue(managed(), { kind: 'full-exit' }), [
      candle(4, { open: 102, high: 103, low: 101, close: 102 }),
    ]);
    const forgedFill = { ...closed.fills[0]!.fill, priceMinor: 10_200 };
    expect(() =>
      assertValidPositionManagementSession({
        ...closed,
        fills: [{ ...closed.fills[0]!, fill: forgedFill }],
        events: closed.events.map((event) =>
          event.type === 'voluntary-exit-filled' ? { ...event, fill: forgedFill } : event,
        ),
      }),
    ).toThrow('canonical side/price/cost/gap');
  });

  it('keeps passive management coherent and grades authored evidence independently of P&L', () => {
    const passiveLoss = process(managed(), [
      candle(4, { open: 100, high: 101, low: 94, close: 95 }),
    ]);
    expect(passiveLoss.status).toBe('closed-stop');
    expect(passiveLoss.debrief?.processQuality).toBe('coherent');

    const incoherentDraft = edit(
      managed(),
      { kind: 'full-exit' },
      5,
      'incoherent',
      disciplinedEvidence({
        decisionBasis: 'outcome-chasing',
        riskReviewed: false,
        evidenceTags: ['uncertainty-recorded'],
      }),
    );
    const profitable = process(submit(incoherentDraft, 6, 'incoherent'), [
      candle(4, { open: 105, high: 106, low: 104, close: 105 }),
    ]);
    expect(profitable.accounting.realizedNetMinor).toBeGreaterThan(0);
    expect(profitable.debrief?.processQuality).toBe('needs-review');
    expect(passiveLoss.accounting.realizedNetMinor).toBeLessThan(0);
  });

  it('atomically journals submitted rationale and rejects apparent backdating', () => {
    const submitted = queue(managed(), { kind: 'full-exit' });
    expect(submitted.journal[0]).toMatchObject({
      kind: 'action-rationale',
      entryId: 'submission-1',
      relatedActionId: 'submission-1',
      sessionId: submitted.sessionId,
      candleIndex: 3,
      entryOrder: 0,
      submissionOrder: 1,
    });
    const advanced = process(managed(), [candle(4)]);
    expect(() =>
      reducePositionManagementSession(advanced, {
        type: 'record-observation',
        entryId: 'backdated',
        candleIndex: 3,
        text: 'רשומה ישנה למראית עין',
        recordedAt: at(8),
      }),
    ).toThrow('exact current replay cutoff');
  });

  it('rejects malformed restored rubric and structured process evidence', () => {
    const session = managed();
    const alteredRubric: PositionManagementRubricV1 = {
      ...session.authority.rubric,
      criteria: [{ criterionId: 'unknown', kind: 'unknown' } as never],
    };
    const alteredAuthority = {
      ...session.authority,
      rubric: alteredRubric,
      rubricChecksum: computePositionManagementRubricChecksum(alteredRubric),
    };
    expect(() =>
      assertValidPositionManagementSession({
        ...session,
        authority: alteredAuthority,
        events: [
          {
            ...session.events[0]!,
            authority: alteredAuthority,
          } as PositionManagementSession['events'][number],
        ],
      }),
    ).toThrow('Unknown position-management rubric');

    const draft = edit(session, { kind: 'full-exit' });
    const forgedEvidence = {
      ...draft.draft!.processEvidence,
      decisionBasis: 'forged' as never,
    };
    expect(() =>
      assertValidPositionManagementSession({
        ...draft,
        draft: { ...draft.draft!, processEvidence: forgedEvidence },
        events: draft.events.map((event) =>
          event.type === 'management-draft-edited'
            ? { ...event, processEvidence: forgedEvidence }
            : event,
        ),
      }),
    ).toThrow('structured value');

    const pending = queue(session, { kind: 'full-exit' });
    expect(() =>
      assertValidPositionManagementSession({
        ...pending,
        pendingAction: {
          ...pending.pendingAction!,
          processEvidence: {
            ...pending.pendingAction!.processEvidence,
            evidenceTags: ['forged' as never],
          },
        },
      }),
    ).toThrow('supported tags');
    expect(() =>
      assertValidPositionManagementSession({
        ...pending,
        pendingAction: {
          ...pending.pendingAction!,
          riskAssessment: {
            ...pending.pendingAction!.riskAssessment,
            warningCodes: ['forged' as never],
          },
        },
      }),
    ).toThrow('supported codes');

    const invalidAcceptedRubric = {
      schemaVersion: 1,
      criteria: [
        {
          criterionId: 'basis',
          kind: 'decision-basis',
          accepted: ['forged'],
        },
      ],
    } as unknown as PositionManagementRubricV1;
    const invalidAcceptedAuthority = authority({ rubric: invalidAcceptedRubric });
    expect(() => managed(openPaper(), invalidAcceptedAuthority)).toThrow(
      'Decision-basis rubric criterion',
    );
  });

  it('enforces scenario risk boundaries again at the exact execution open', () => {
    const retargeted = process(queue(managed(), { kind: 'replace-target', price: 200 }), [
      candle(4),
    ]);
    const queuedScale = queue(
      retargeted,
      { kind: 'scale-in', quantityUnits: 1, estimatedEntryPrice: 100 },
      'scale-gap',
      8,
    );
    const rejected = process(
      queuedScale,
      [candle(5, { open: 150, high: 151, low: 149, close: 150 })],
      10,
    );
    expect(rejected.openQuantityUnits).toBe(10);
    expect(rejected.events.at(-1)).toMatchObject({
      type: 'management-action-risk-rejected',
      issueCodes: ['PROJECTED_RISK_EXCEEDS_HARD_LIMIT'],
    });
  });

  it('handles short protective-stop gaps symmetrically and freezes terminal execution state', () => {
    const shortSession = managed(
      openPaper(plan({ direction: 'short', protectiveStopPrice: 105, targetPrice: 90 })),
    );
    const stopped = process(shortSession, [
      candle(4, { open: 110, high: 111, low: 109, close: 110 }),
    ]);
    expect(stopped).toMatchObject({ status: 'closed-stop', openQuantityUnits: 0 });
    expect(stopped.fills[0]?.fill).toMatchObject({
      side: 'buy',
      reason: 'protective-stop',
      gap: true,
      referencePriceMinor: 11_000,
      priceMinor: 11_011,
    });
    expect(() => process(stopped, [candle(5)], 8)).toThrow('Terminal');
  });

  it('conserves FIFO quantity and entry commission through repeated reductions', () => {
    let session = process(
      queue(managed(), { kind: 'partial-exit', quantityUnits: 3 }, 'first', 5),
      [candle(4)],
      7,
    );
    session = process(
      queue(session, { kind: 'partial-exit', quantityUnits: 2 }, 'second', 8),
      [candle(5)],
      10,
    );
    session = process(queue(session, { kind: 'full-exit' }, 'last', 11), [candle(6)], 13);
    expect(session.status).toBe('closed-voluntary');
    expect(session.accounting.realizedSlices.map((slice) => slice.quantityUnits)).toEqual([
      3, 2, 5,
    ]);
    expect(
      session.accounting.realizedSlices.map((slice) => slice.allocatedEntryCommissionMinor),
    ).toEqual([30, 20, 50]);
    expect(session.accounting.allocatedEntryCommissionMinor).toBe(100);
  });

  it('produces equivalent candle evidence and accounting for batch and step processing', () => {
    const batched = process(managed(), [candle(4), candle(5)], 7);
    const stepped = process(process(managed(), [candle(4)], 7), [candle(5)], 7);
    expect({
      status: batched.status,
      lots: batched.lots,
      fills: batched.fills,
      accounting: batched.accounting,
      checkpoints: batched.processedCandles,
      cutoff: batched.lastProcessedCandleIndex,
    }).toEqual({
      status: stepped.status,
      lots: stepped.lots,
      fills: stepped.fills,
      accounting: stepped.accounting,
      checkpoints: stepped.processedCandles,
      cutoff: stepped.lastProcessedCandleIndex,
    });
  });

  it('bounds untrusted IDs, rationale text, and structured evidence tags', () => {
    expect(() =>
      reducePositionManagementSession(managed(), {
        type: 'edit-draft',
        editId: 'x'.repeat(129),
        draftId: 'draft',
        intent: { kind: 'full-exit' },
        rationale: 'נימוק',
        processEvidence: disciplinedEvidence(),
        authoredAtCandleIndex: 3,
        updatedAt: at(5),
      }),
    ).toThrow('128');
    expect(() =>
      edit(
        managed(),
        { kind: 'full-exit' },
        5,
        'tags',
        disciplinedEvidence({
          evidenceTags: [
            'predefined-plan',
            'visible-price-evidence',
            'structural-change',
            'risk-budget',
            'invalidation-rule',
            'target-rule',
            'voluntary-exit-rule',
            'execution-costs',
            'uncertainty-recorded',
          ],
        }),
      ),
    ).toThrow('at most eight');
  });

  it('pins bounded scenario limits and a canonically checksummed authored rubric', () => {
    const base = authority();
    const changedRubric: PositionManagementRubricV1 = {
      ...base.rubric,
      criteria: [
        ...base.rubric.criteria,
        { criterionId: 'action', kind: 'minimum-material-actions', minimum: 1 },
      ],
    };
    expect(computePositionManagementRubricChecksum(changedRubric)).not.toBe(base.rubricChecksum);
    expect(() =>
      managed(
        openPaper(),
        authority({
          riskLimits: {
            ...base.riskLimits,
            softRiskLimitOriginalRBps: 20_000,
            hardRiskLimitOriginalRBps: 10_000,
          },
        }),
      ),
    ).toThrow('at least its soft risk limit');

    const requiringAction = managed(openPaper(), authority({ rubric: changedRubric }));
    const passive = process(requiringAction, [
      candle(4, { open: 100, high: 101, low: 94, close: 95 }),
    ]);
    expect(passive.debrief?.processQuality).toBe('needs-review');
  });
});
