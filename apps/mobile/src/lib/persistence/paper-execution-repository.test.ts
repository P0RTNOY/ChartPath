import {
  ANALYSIS_WORKFLOW_STEP_IDS,
  createGuidedAnalysisSession,
  createPaperExecutionSession,
  gradeAnswer,
  reduceGuidedAnalysisSession,
  reducePaperExecutionSession,
  type AnalysisWorkflowStepId,
  type AtomicAnswerRubric,
  type GuidedAnalysisSession,
  type HistoricalExecutionIdentity,
  type OhlcvCandle,
  type PaperExecutionSession,
} from '@chartpath/domain';

import { PaperExecutionSessionConflictError, PaperExecutionSessionNotFoundError } from './adapter';
import { InMemoryPersistenceAdapter } from './in-memory-adapter';
import { LearningRepository } from './repository';
import { CURRENT_PERSISTENCE_SCHEMA_VERSION } from './types';

const CREATED_AT = '2026-08-24T08:00:00.000Z';
const FINALIZED_AT = '2026-08-24T08:30:00.000Z';
const EXECUTION_CREATED_AT = '2026-08-24T08:31:00.000Z';
const checksum = `sha256:${'a'.repeat(64)}`;
const rubric: AtomicAnswerRubric = {
  kind: 'selection',
  expectedIds: ['observed'],
  mode: 'exact',
};
const stepRubrics = Object.fromEntries(
  ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => [stepId, rubric]),
) as unknown as Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>;

function finalizedHistoricalAnalysis(): GuidedAnalysisSession {
  let session = createGuidedAnalysisSession({
    sessionId: 'historical-analysis-1',
    attemptId: 'historical-attempt-1',
    finalizationIdempotencyKey: 'historical-finalization-1',
    exerciseId: 'u10-capstone-e03',
    contentVersionId: 'catalog-1',
    exerciseSchemaVersion: 1,
    chart: {
      kind: 'historical',
      id: 'historical:scenario-1',
      scenarioId: 'scenario-1',
      scenarioVersion: '1.0.0',
      datasetId: 'dataset-1',
      datasetVersion: '1.0.0',
      canonicalChecksum: checksum,
      candleCount: 4,
      interval: 'hour:1:3600000',
      firstCandleTimestamp: '2026-08-24T07:00:00.000Z',
      lastCandleTimestamp: '2026-08-24T10:00:00.000Z',
      decisionCandleIndex: 0,
      learningCredit: 'none',
    },
    createdAt: CREATED_AT,
    initialReplayCursorCandleIndex: 0,
    workflowStepIds: ANALYSIS_WORKFLOW_STEP_IDS,
    stepRubrics,
  });
  ANALYSIS_WORKFLOW_STEP_IDS.forEach((stepId, index) => {
    const answer = { kind: 'selection' as const, selectedIds: ['observed'] };
    const updatedAt = `2026-08-24T08:${String(index * 2 + 1).padStart(2, '0')}:00.000Z`;
    const submittedAt = `2026-08-24T08:${String(index * 2 + 2).padStart(2, '0')}:00.000Z`;
    session = reduceGuidedAnalysisSession(session, {
      type: 'update-step-answer',
      stepId,
      answer,
      updatedAt,
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'submit-step',
      stepId,
      result: gradeAnswer(rubric, answer),
      submittedAt,
    });
  });
  const answer = {
    kind: 'capstone' as const,
    stepAnswers: ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => ({
      stepId,
      answer: { kind: 'selection' as const, selectedIds: ['observed'] },
    })),
  };
  return reduceGuidedAnalysisSession(session, {
    type: 'finalize',
    attemptId: session.attemptId,
    idempotencyKey: session.finalizationIdempotencyKey,
    finalResult: gradeAnswer(
      {
        kind: 'capstone',
        steps: ANALYSIS_WORKFLOW_STEP_IDS.map((id) => ({ id, rubric })),
      },
      answer,
    ),
    finalizedAt: FINALIZED_AT,
  });
}

function executionSource(): HistoricalExecutionIdentity {
  return {
    datasetId: 'dataset-1',
    datasetVersion: '1.0.0',
    canonicalChecksum: checksum,
    scenarioId: 'scenario-1',
    scenarioVersion: '1.0.0',
    analysisSessionId: 'historical-analysis-1',
    analysisFinalizedAt: FINALIZED_AT,
    decisionCandleIndex: 0,
    candleCount: 4,
    learningCredit: 'none',
    permittedDirections: ['long', 'short'],
    permittedEntryOrderTypes: ['market', 'limit', 'stop'],
  };
}

function executionSession(
  sessionId = 'paper-session-1',
  source: HistoricalExecutionIdentity = executionSource(),
): PaperExecutionSession {
  return createPaperExecutionSession({
    sessionId,
    orderId: `${sessionId}:order`,
    positionId: `${sessionId}:position`,
    debriefId: `${sessionId}:debrief`,
    source,
    plan: {
      planId: `${sessionId}:plan`,
      direction: 'long',
      entryIntent: { type: 'market', estimatedEntryPrice: 100 },
      protectiveStopPrice: 90,
      targetPrice: 120,
      fictionalAccountValue: 10_000,
      intendedRiskAmount: 1_000,
      quantity: 5,
      authoredAtCandleIndex: 0,
      processEvidence: {
        analysisDecision: 'long',
        entryMatchesAnalysis: true,
        invalidationMatchesAnalysis: true,
        targetMatchesAnalysis: true,
        requiredReasoningBypassed: false,
      },
    },
    createdAt: EXECUTION_CREATED_AT,
  });
}

const candles: readonly OhlcvCandle[] = [
  {
    index: 1,
    timestamp: '2026-08-24T09:00:00.000Z',
    open: 100,
    high: 105,
    low: 95,
    close: 102,
    volume: 1_000,
  },
  {
    index: 2,
    timestamp: '2026-08-24T10:00:00.000Z',
    open: 103,
    high: 121,
    low: 97,
    close: 119,
    volume: 1_200,
  },
];

async function seededRepository(adapter = new InMemoryPersistenceAdapter()) {
  const repository = new LearningRepository(adapter, {
    contentVersion: 'catalog-1',
    now: () => EXECUTION_CREATED_AT,
  });
  const analysis = finalizedHistoricalAnalysis();
  await repository.createOrResumeAnalysisSession({
    ...analysis,
    status: 'active',
    revision: 0,
    updatedAt: CREATED_AT,
    finalizedAt: undefined,
    finalResult: undefined,
    steps: Object.fromEntries(
      ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => [
        stepId,
        {
          ...analysis.steps[stepId],
          status: 'draft',
          answer: undefined,
          answerComplete: false,
          result: undefined,
          updatedAt: undefined,
          submittedAt: undefined,
        },
      ]),
    ) as GuidedAnalysisSession['steps'],
    currentStepId: 'context',
  } as GuidedAnalysisSession);
  // Tests the practice-only atomic path: no immutable learning attempt is created.
  await repository.saveAnalysisSession({
    ...analysis,
    status: 'active',
    revision: analysis.revision - 1,
    updatedAt: analysis.steps.review.submittedAt!,
    finalizedAt: undefined,
    finalResult: undefined,
  });
  await repository.finalizePracticeAnalysisSession(analysis);
  return { repository, adapter };
}

describe('paper execution repository', () => {
  it('creates and logically resumes one checksum-pinned session without learning credit', async () => {
    const { repository } = await seededRepository();
    const before = await repository.load();
    const first = await repository.createOrResumePaperExecutionSession(executionSession());
    const resumed = await repository.createOrResumePaperExecutionSession(
      executionSession('paper-session-retry'),
    );

    expect(first.created).toBe(true);
    expect(resumed.created).toBe(false);
    expect(resumed.session.sessionId).toBe(first.session.sessionId);
    expect(resumed.snapshot.attempts).toEqual(before.attempts);
    expect(resumed.snapshot.projections).toEqual(before.projections);
  });

  it('persists working, open, and closed states once across reloads', async () => {
    const { repository, adapter } = await seededRepository();
    const before = await repository.load();
    const created = await repository.createOrResumePaperExecutionSession(executionSession());
    const submitted = reducePaperExecutionSession(created.session, {
      type: 'submit',
      confirmationId: 'confirm-submit-1',
      submittedAt: '2026-08-24T08:32:00.000Z',
    });
    await repository.savePaperExecutionSession(submitted);

    const reopened = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => '2026-08-24T09:00:00.000Z',
    });
    const working = (await reopened.getPaperExecutionSession(submitted.sessionId))!;
    const open = reducePaperExecutionSession(working, {
      type: 'process-candles',
      candles: [candles[0]!],
      processedAt: candles[0]!.timestamp,
    });
    await reopened.savePaperExecutionSession(open);
    const closed = reducePaperExecutionSession(open, {
      type: 'process-candles',
      candles: [candles[1]!],
      processedAt: candles[1]!.timestamp,
    });
    const stored = await reopened.savePaperExecutionSession(closed);
    expect((await reopened.load()).quarantinedPaperExecutionSessions).toEqual([]);
    const retry = await reopened.savePaperExecutionSession(closed);

    expect(working.status).toBe('working');
    expect(open.status).toBe('open');
    expect(stored.session.status).toBe('closed');
    expect(stored.session.events.filter(({ type }) => type === 'order-filled')).toHaveLength(1);
    expect(
      stored.session.events.filter(({ type }) => type === 'position-closed-target'),
    ).toHaveLength(1);
    expect(retry.saved).toBe(false);
    expect(retry.snapshot.attempts).toEqual(before.attempts);
    expect(retry.snapshot.projections).toEqual(before.projections);
  });

  it('rejects stale saves, changed pinned evidence, and missing sessions', async () => {
    const { repository } = await seededRepository();
    const created = await repository.createOrResumePaperExecutionSession(executionSession());
    const submitted = reducePaperExecutionSession(created.session, {
      type: 'submit',
      confirmationId: 'confirm-submit-1',
      submittedAt: '2026-08-24T08:32:00.000Z',
    });
    await repository.savePaperExecutionSession(submitted);

    await expect(repository.savePaperExecutionSession(created.session)).rejects.toBeInstanceOf(
      PaperExecutionSessionConflictError,
    );
    await expect(
      repository.createOrResumePaperExecutionSession(
        executionSession('changed-checksum', {
          ...executionSource(),
          canonicalChecksum: `sha256:${'b'.repeat(64)}`,
        }),
      ),
    ).rejects.toBeInstanceOf(PaperExecutionSessionConflictError);
    await expect(
      repository.savePaperExecutionSession(executionSession('missing-session')),
    ).rejects.toBeInstanceOf(PaperExecutionSessionNotFoundError);
  });

  it('round-trips an explicit same-candle ambiguity without inventing an exit', async () => {
    const { repository, adapter } = await seededRepository();
    const created = await repository.createOrResumePaperExecutionSession(executionSession());
    const submitted = reducePaperExecutionSession(created.session, {
      type: 'submit',
      confirmationId: 'confirm-submit-ambiguous',
      submittedAt: '2026-08-24T08:32:00.000Z',
    });
    const open = reducePaperExecutionSession(submitted, {
      type: 'process-candles',
      candles: [candles[0]!],
      processedAt: candles[0]!.timestamp,
    });
    const ambiguous = reducePaperExecutionSession(open, {
      type: 'process-candles',
      candles: [{ ...candles[1]!, high: 121, low: 89 }],
      processedAt: candles[1]!.timestamp,
    });
    await repository.savePaperExecutionSession(submitted);
    await repository.savePaperExecutionSession(open);
    await repository.savePaperExecutionSession(ambiguous);

    const reopened = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => candles[1]!.timestamp,
    });
    const restored = await reopened.getPaperExecutionSession(ambiguous.sessionId);
    expect(restored?.status).toBe('ambiguous');
    expect(restored?.position?.exitFill).toBeUndefined();
    expect(restored?.debrief?.outcomeDeterminate).toBe(false);
    expect(restored?.events.filter(({ type }) => type === 'execution-ambiguous')).toHaveLength(1);
  });

  it('records explicit abandonment once instead of deleting a submitted execution', async () => {
    const { repository } = await seededRepository();
    const created = await repository.createOrResumePaperExecutionSession(executionSession());
    const submitted = reducePaperExecutionSession(created.session, {
      type: 'submit',
      confirmationId: 'confirm-submit-1',
      submittedAt: '2026-08-24T08:32:00.000Z',
    });
    await repository.savePaperExecutionSession(submitted);

    const first = await repository.abandonPaperExecutionSession(
      submitted.sessionId,
      'confirm-reset-1',
      '2026-08-24T08:33:00.000Z',
    );
    const retry = await repository.abandonPaperExecutionSession(
      submitted.sessionId,
      'confirm-reset-1',
      '2026-08-24T08:33:00.000Z',
    );

    expect(first.saved).toBe(true);
    expect(retry.saved).toBe(false);
    expect(retry.session.status).toBe('cancelled');
    expect(retry.session.events.filter(({ type }) => type === 'execution-abandoned')).toHaveLength(
      1,
    );
    expect(await repository.listPaperExecutionSessions()).toHaveLength(1);
  });

  it('migrates schema 4 with no execution sessions and quarantines corrupt schema 5 sessions', async () => {
    const { repository, adapter } = await seededRepository();
    const current = await repository.load();
    const legacy = {
      ...current,
      metadata: { ...current.metadata, schemaVersion: 4 },
      paperExecutionSessions: undefined,
      quarantinedPaperExecutionSessions: undefined,
    };
    const migratedRepository = new LearningRepository(
      new InMemoryPersistenceAdapter(JSON.stringify(legacy)),
      { contentVersion: 'catalog-1', now: () => '2026-08-24T09:00:00.000Z' },
    );
    const migrated = await migratedRepository.initialize();
    expect(migrated.metadata.schemaVersion).toBe(CURRENT_PERSISTENCE_SCHEMA_VERSION);
    expect(migrated.paperExecutionSessions).toEqual([]);

    await repository.createOrResumePaperExecutionSession(executionSession());
    const persisted = JSON.parse((await adapter.dump())!) as Record<string, unknown>;
    const corrupt = {
      ...persisted,
      paperExecutionSessions: [{ schemaVersion: 99, sessionId: 'damaged-paper-session' }],
    };
    const recoveryRepository = new LearningRepository(
      new InMemoryPersistenceAdapter(JSON.stringify(corrupt)),
      { contentVersion: 'catalog-1', now: () => '2026-08-24T09:00:00.000Z' },
    );
    const recovered = await recoveryRepository.initialize();
    expect(recovered.paperExecutionSessions).toEqual([]);
    expect(recovered.quarantinedPaperExecutionSessions).toHaveLength(1);
    expect(recovered.quarantinedPaperExecutionSessions[0]?.sessionId).toBe('damaged-paper-session');
    expect(recovered.attempts).toEqual(current.attempts);
    expect(recovered.projections).toEqual(current.projections);
    const cleared = await recoveryRepository.discardQuarantinedPaperExecutionSessions([
      recovered.quarantinedPaperExecutionSessions[0]!.quarantineId,
    ]);
    expect(cleared.quarantinedPaperExecutionSessions).toEqual([]);
    expect(cleared.attempts).toEqual(current.attempts);
    expect(cleared.projections).toEqual(current.projections);
  });
});
