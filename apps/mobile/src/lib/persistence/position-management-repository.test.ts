import {
  ANALYSIS_WORKFLOW_STEP_IDS,
  createGuidedAnalysisSession,
  createPaperExecutionSession,
  createPositionManagementSession,
  computePositionManagementRubricChecksum,
  gradeAnswer,
  reduceGuidedAnalysisSession,
  reducePaperExecutionSession,
  reducePositionManagementSession,
  type AnalysisWorkflowStepId,
  type AtomicAnswerRubric,
  type GuidedAnalysisSession,
  type OhlcvCandle,
  type PaperExecutionSession,
  type PositionManagementSession,
} from '@chartpath/domain';

import {
  PaperExecutionSessionConflictError,
  PersistenceCorruptionError,
  PositionManagementSessionConflictError,
} from './adapter';
import { InMemoryPersistenceAdapter } from './in-memory-adapter';
import { LearningRepository } from './repository';
import { CURRENT_PERSISTENCE_SCHEMA_VERSION } from './types';

const CREATED_AT = '2026-08-25T08:00:00.000Z';
const FINALIZED_AT = '2026-08-25T08:30:00.000Z';
const checksum = `sha256:${'d'.repeat(64)}`;
const rubric: AtomicAnswerRubric = {
  kind: 'selection',
  expectedIds: ['observed'],
  mode: 'exact',
};
const stepRubrics = Object.fromEntries(
  ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => [stepId, rubric]),
) as unknown as Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>;
const entryCandle: OhlcvCandle = {
  index: 1,
  timestamp: '2026-08-25T09:00:00.000Z',
  open: 100,
  high: 105,
  low: 95,
  close: 102,
  volume: 1_000,
};

function finalizedAnalysis(): GuidedAnalysisSession {
  let session = createGuidedAnalysisSession({
    sessionId: 'management-analysis-1',
    attemptId: 'management-attempt-1',
    finalizationIdempotencyKey: 'management-finalization-1',
    exerciseId: 'u10-capstone-e03',
    contentVersionId: 'catalog-1',
    exerciseSchemaVersion: 1,
    chart: {
      kind: 'historical',
      id: 'historical:management-scenario-1',
      scenarioId: 'management-scenario-1',
      scenarioVersion: '1.0.0',
      datasetId: 'management-dataset-1',
      datasetVersion: '1.0.0',
      canonicalChecksum: checksum,
      candleCount: 4,
      interval: 'hour:1:3600000',
      firstCandleTimestamp: '2026-08-25T08:00:00.000Z',
      lastCandleTimestamp: '2026-08-25T11:00:00.000Z',
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
    session = reduceGuidedAnalysisSession(session, {
      type: 'update-step-answer',
      stepId,
      answer,
      updatedAt: `2026-08-25T08:${String(index * 2 + 1).padStart(2, '0')}:00.000Z`,
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'submit-step',
      stepId,
      result: gradeAnswer(rubric, answer),
      submittedAt: `2026-08-25T08:${String(index * 2 + 2).padStart(2, '0')}:00.000Z`,
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

function openPaperSession(identitySuffix = ''): PaperExecutionSession {
  const suffix = identitySuffix.length === 0 ? '1' : identitySuffix;
  const source = {
    datasetId: 'management-dataset-1',
    datasetVersion: '1.0.0',
    canonicalChecksum: checksum,
    scenarioId: 'management-scenario-1',
    scenarioVersion: '1.0.0',
    analysisSessionId: 'management-analysis-1',
    analysisFinalizedAt: FINALIZED_AT,
    decisionCandleIndex: 0,
    candleCount: 4,
    learningCredit: 'none' as const,
    permittedDirections: ['long' as const],
    permittedEntryOrderTypes: ['market' as const],
  };
  let paper = createPaperExecutionSession({
    sessionId: `management-paper-${suffix}`,
    orderId: `management-order-${suffix}`,
    positionId: `management-position-${suffix}`,
    debriefId: `management-paper-debrief-${suffix}`,
    source,
    plan: {
      planId: `management-plan-${suffix}`,
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
    createdAt: '2026-08-25T08:31:00.000Z',
  });
  paper = reducePaperExecutionSession(paper, {
    type: 'submit',
    confirmationId: `management-submit-${suffix}`,
    submittedAt: '2026-08-25T08:32:00.000Z',
  });
  return reducePaperExecutionSession(paper, {
    type: 'process-candles',
    candles: [entryCandle],
    processedAt: entryCandle.timestamp,
  });
}

async function seededRepository(adapter = new InMemoryPersistenceAdapter()) {
  const repository = new LearningRepository(adapter, {
    contentVersion: 'catalog-1',
    now: () => '2026-08-25T09:01:00.000Z',
  });
  const analysis = finalizedAnalysis();
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
  await repository.saveAnalysisSession({
    ...analysis,
    status: 'active',
    revision: analysis.revision - 1,
    updatedAt: analysis.steps.review.submittedAt!,
    finalizedAt: undefined,
    finalResult: undefined,
  });
  await repository.finalizePracticeAnalysisSession(analysis);
  const paper = openPaperSession();
  await repository.createOrResumePaperExecutionSession({
    ...paper,
    status: 'draft',
    revision: 0,
    updatedAt: paper.createdAt,
    submittedAt: undefined,
    workingOrder: undefined,
    position: undefined,
    events: paper.events.slice(0, 1),
    processedCandles: [],
    lastProcessedCandleIndex: paper.source.decisionCandleIndex,
  } as PaperExecutionSession);
  const draft = (await repository.getPaperExecutionSession(paper.sessionId))!;
  const submitted = reducePaperExecutionSession(draft, {
    type: 'submit',
    confirmationId: 'management-submit-1',
    submittedAt: '2026-08-25T08:32:00.000Z',
  });
  await repository.savePaperExecutionSession(submitted);
  await repository.savePaperExecutionSession(paper);
  return { repository, adapter, paper };
}

function managementSession(
  paper: PaperExecutionSession,
  identity: {
    readonly sessionId: string;
    readonly debriefId: string;
  } = {
    sessionId: 'position-management-1',
    debriefId: 'position-management-debrief-1',
  },
): PositionManagementSession {
  const managementRubric = {
    schemaVersion: 1 as const,
    criteria: [
      {
        criterionId: 'risk-reviewed',
        kind: 'risk-reviewed' as const,
        required: true as const,
      },
    ],
  };
  return createPositionManagementSession({
    sessionId: identity.sessionId,
    debriefId: identity.debriefId,
    openPaperExecutionSession: paper,
    authority: {
      schemaVersion: 1,
      permissionVersion: 'management-permissions-v1',
      permittedActionKinds: [
        'full-exit',
        'partial-exit',
        'scale-in',
        'replace-stop',
        'replace-target',
      ],
      rubricId: 'management-rubric-1',
      rubricVersion: '1.0.0',
      rubricChecksum: computePositionManagementRubricChecksum(managementRubric),
      rubric: managementRubric,
      riskLimits: {
        maxOpenQuantityUnits: 10,
        maxScaleInInitialQuantityBps: 10_000,
        softRiskLimitOriginalRBps: 10_000,
        hardRiskLimitOriginalRBps: 20_000,
      },
      learningCredit: 'none',
    },
    createdAt: '2026-08-25T09:01:00.000Z',
  });
}

describe('position management repository', () => {
  it('creates and logically resumes one exact handoff without changing learning state', async () => {
    const { repository, paper } = await seededRepository();
    const before = await repository.load();
    const first = await repository.createOrResumePositionManagementSession(
      managementSession(paper),
    );
    const resumed = await repository.createOrResumePositionManagementSession(
      managementSession(paper, {
        sessionId: 'position-management-retry',
        debriefId: 'position-management-debrief-retry',
      }),
    );

    expect(first.created).toBe(true);
    expect(resumed.created).toBe(false);
    expect(resumed.session.sessionId).toBe(first.session.sessionId);
    expect(resumed.snapshot.attempts).toEqual(before.attempts);
    expect(resumed.snapshot.projections).toEqual(before.projections);
  });

  it('persists draft and append-only journal revisions across reloads', async () => {
    const { repository, adapter, paper } = await seededRepository();
    const created = await repository.createOrResumePositionManagementSession(
      managementSession(paper),
    );
    const draft = reducePositionManagementSession(created.session, {
      type: 'edit-draft',
      editId: 'edit-1',
      draftId: 'draft-1',
      intent: { kind: 'partial-exit', quantityUnits: 1 },
      rationale: 'Reducing one unit while preserving the original stop.',
      processEvidence: {
        decisionBasis: 'risk-reduction',
        riskReviewed: true,
        evidenceTags: ['risk-budget'],
      },
      authoredAtCandleIndex: created.session.lastProcessedCandleIndex,
      updatedAt: '2026-08-25T09:02:00.000Z',
    });
    await repository.savePositionManagementSession(draft);
    const submitted = reducePositionManagementSession(draft, {
      type: 'submit-draft',
      submissionId: 'submission-1',
      draftId: 'draft-1',
      acknowledgedRiskWarningCodes: [],
      submittedAt: '2026-08-25T09:03:00.000Z',
    });
    await repository.savePositionManagementSession(submitted);
    const observed = reducePositionManagementSession(submitted, {
      type: 'record-observation',
      entryId: 'journal-2',
      candleIndex: submitted.lastProcessedCandleIndex,
      text: 'Price remains between the pinned stop and target.',
      evidenceTags: ['visible-price-evidence'],
      recordedAt: '2026-08-25T09:04:00.000Z',
    });
    await repository.savePositionManagementSession(observed);

    const reopened = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => '2026-08-25T09:05:00.000Z',
    });
    const restored = await reopened.getPositionManagementSession(observed.sessionId);
    const retry = await reopened.savePositionManagementSession(observed);

    expect(restored).toEqual(observed);
    expect(restored?.pendingAction?.submissionId).toBe('submission-1');
    expect(restored?.journal).toHaveLength(2);
    expect(restored?.journal[0]?.kind).toBe('action-rationale');
    expect(retry.saved).toBe(false);
  });

  it('rejects stale rewrites and freezes the linked paper execution', async () => {
    const { repository, paper } = await seededRepository();
    const created = await repository.createOrResumePositionManagementSession(
      managementSession(paper),
    );
    const observed = reducePositionManagementSession(created.session, {
      type: 'record-observation',
      entryId: 'journal-1',
      candleIndex: created.session.lastProcessedCandleIndex,
      text: 'Observation recorded before any action.',
      recordedAt: '2026-08-25T09:02:00.000Z',
    });
    await repository.savePositionManagementSession(observed);

    await expect(repository.savePositionManagementSession(created.session)).rejects.toBeInstanceOf(
      PositionManagementSessionConflictError,
    );
    await expect(
      repository.savePositionManagementSession({
        ...observed,
        revision: observed.revision + 1,
        updatedAt: '2026-08-25T09:03:00.000Z',
        journal: observed.journal.map((entry) => ({
          ...entry,
          text: 'Rewritten journal evidence.',
        })),
        events: observed.events.map((event) =>
          event.type === 'management-observation-recorded'
            ? { ...event, text: 'Rewritten journal evidence.' }
            : event,
        ),
      }),
    ).rejects.toBeInstanceOf(PositionManagementSessionConflictError);
    await expect(
      repository.abandonPaperExecutionSession(
        paper.sessionId,
        'paper-abandon-after-handoff',
        '2026-08-25T09:03:00.000Z',
      ),
    ).rejects.toBeInstanceOf(PaperExecutionSessionConflictError);
  });

  it('round-trips a partial exit and immutable terminal debrief without learning credit', async () => {
    const { repository, adapter, paper } = await seededRepository();
    const before = await repository.load();
    const created = await repository.createOrResumePositionManagementSession(
      managementSession(paper),
    );
    const draft = reducePositionManagementSession(created.session, {
      type: 'edit-draft',
      editId: 'partial-edit-1',
      draftId: 'partial-draft-1',
      intent: { kind: 'partial-exit', quantityUnits: 1 },
      rationale: 'Reduce one unit at the next eligible open.',
      processEvidence: {
        decisionBasis: 'risk-reduction',
        riskReviewed: true,
        evidenceTags: ['risk-budget'],
      },
      authoredAtCandleIndex: created.session.lastProcessedCandleIndex,
      updatedAt: '2026-08-25T09:02:00.000Z',
    });
    const submitted = reducePositionManagementSession(draft, {
      type: 'submit-draft',
      submissionId: 'partial-submission-1',
      draftId: 'partial-draft-1',
      acknowledgedRiskWarningCodes: [],
      submittedAt: '2026-08-25T09:03:00.000Z',
    });
    await repository.savePositionManagementSession(draft);
    await repository.savePositionManagementSession(submitted);
    const partial = reducePositionManagementSession(submitted, {
      type: 'process-candles',
      candles: [
        {
          index: 2,
          timestamp: '2026-08-25T10:00:00.000Z',
          open: 103,
          high: 110,
          low: 96,
          close: 105,
          volume: 1_100,
        },
      ],
      processedAt: '2026-08-25T10:00:00.000Z',
    });
    await repository.savePositionManagementSession(partial);

    const reopened = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => '2026-08-25T10:01:00.000Z',
    });
    const restoredPartial = (await reopened.getPositionManagementSession(partial.sessionId))!;
    expect(restoredPartial.openQuantityUnits).toBe(partial.initialQuantityUnits - 1);
    expect(restoredPartial.fills).toHaveLength(1);
    const closed = reducePositionManagementSession(restoredPartial, {
      type: 'process-candles',
      candles: [
        {
          index: 3,
          timestamp: '2026-08-25T11:00:00.000Z',
          open: 106,
          high: 121,
          low: 101,
          close: 119,
          volume: 1_200,
        },
      ],
      processedAt: '2026-08-25T11:00:00.000Z',
    });
    const stored = await reopened.savePositionManagementSession(closed);
    const retry = await reopened.savePositionManagementSession(closed);

    expect(stored.session.status).toBe('closed-target');
    expect(stored.session.debrief?.outcome).toBe('target');
    expect(retry.saved).toBe(false);
    expect(retry.snapshot.attempts).toEqual(before.attempts);
    expect(retry.snapshot.projections).toEqual(before.projections);
  });

  it('quarantines orphaned and cross-record-divergent management aggregates', async () => {
    const { repository, adapter, paper } = await seededRepository();
    const before = await repository.load();
    await repository.createOrResumePositionManagementSession(managementSession(paper));
    const persisted = JSON.parse((await adapter.dump())!) as Record<string, unknown>;
    const orphan = managementSession(openPaperSession('orphan'), {
      sessionId: 'position-management-orphan',
      debriefId: 'position-management-debrief-orphan',
    });
    const divergentHandoff = managementSession(
      { ...paper, debriefId: 'divergent-paper-debrief' },
      {
        sessionId: 'position-management-divergent-handoff',
        debriefId: 'position-management-debrief-divergent-handoff',
      },
    );
    const authoritySource = managementSession(paper, {
      sessionId: 'position-management-divergent-authority',
      debriefId: 'position-management-debrief-divergent-authority',
    });
    const divergentAuthority = {
      ...authoritySource.authority,
      learningCredit: 'course' as const,
    };
    const divergentAuthoritySource = {
      ...authoritySource,
      authority: divergentAuthority,
      events: authoritySource.events.map((event, index) =>
        index === 0 && event.type === 'management-session-created'
          ? { ...event, authority: divergentAuthority }
          : event,
      ),
    };
    const corrupt = {
      ...persisted,
      positionManagementSessions: [orphan, divergentHandoff, divergentAuthoritySource],
    };

    const recovered = await new LearningRepository(
      new InMemoryPersistenceAdapter(JSON.stringify(corrupt)),
      { contentVersion: 'catalog-1', now: () => '2026-08-25T11:05:00.000Z' },
    ).initialize();

    expect(recovered.positionManagementSessions).toEqual([]);
    expect(recovered.quarantinedPositionManagementSessions).toHaveLength(3);
    expect(recovered.quarantinedPositionManagementSessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sessionId: orphan.sessionId }),
        expect.objectContaining({ sessionId: divergentHandoff.sessionId }),
        expect.objectContaining({ sessionId: divergentAuthoritySource.sessionId }),
      ]),
    );
    expect(recovered.attempts).toEqual(before.attempts);
    expect(recovered.projections).toEqual(before.projections);
  });

  it('fails closed when a management payload is mislabeled as schema 5', async () => {
    const { repository, adapter, paper } = await seededRepository();
    await repository.createOrResumePositionManagementSession(managementSession(paper));
    const persisted = JSON.parse((await adapter.dump())!) as Record<string, unknown>;
    const mislabeled = JSON.stringify({
      ...persisted,
      metadata: {
        ...(persisted.metadata as Record<string, unknown>),
        schemaVersion: 5,
      },
    });
    const downgradedAdapter = new InMemoryPersistenceAdapter(mislabeled);
    const downgraded = new LearningRepository(downgradedAdapter, {
      contentVersion: 'catalog-1',
      now: () => '2026-08-25T11:06:00.000Z',
    });

    await expect(downgraded.initialize()).rejects.toBeInstanceOf(PersistenceCorruptionError);
    expect(await downgradedAdapter.dump()).toBe(mislabeled);
  });

  it('migrates schema 5 empty and quarantines corrupt schema 6 management state', async () => {
    const { repository, adapter, paper } = await seededRepository();
    const current = await repository.load();
    const legacy = {
      ...current,
      metadata: { ...current.metadata, schemaVersion: 5 },
      positionManagementSessions: undefined,
      quarantinedPositionManagementSessions: undefined,
    };
    const migrated = await new LearningRepository(
      new InMemoryPersistenceAdapter(JSON.stringify(legacy)),
      { contentVersion: 'catalog-1', now: () => '2026-08-25T09:05:00.000Z' },
    ).initialize();
    expect(migrated.metadata.schemaVersion).toBe(CURRENT_PERSISTENCE_SCHEMA_VERSION);
    expect(migrated.positionManagementSessions).toEqual([]);
    expect(migrated.analysisSessions).toEqual(current.analysisSessions);
    expect(migrated.paperExecutionSessions).toEqual(current.paperExecutionSessions);
    expect(migrated.attempts).toEqual(current.attempts);
    expect(migrated.projections).toEqual(current.projections);

    await repository.createOrResumePositionManagementSession(managementSession(paper));
    const persisted = JSON.parse((await adapter.dump())!) as Record<string, unknown>;
    const corrupt = {
      ...persisted,
      positionManagementSessions: [
        {
          schemaVersion: 99,
          sessionId: 'damaged-management',
          handoff: { sessionId: paper.sessionId },
        },
      ],
    };
    const recovery = new LearningRepository(
      new InMemoryPersistenceAdapter(JSON.stringify(corrupt)),
      { contentVersion: 'catalog-1', now: () => '2026-08-25T09:06:00.000Z' },
    );
    const recovered = await recovery.initialize();
    expect(recovered.positionManagementSessions).toEqual([]);
    expect(recovered.quarantinedPositionManagementSessions).toHaveLength(1);
    expect(recovered.quarantinedPositionManagementSessions[0]).toMatchObject({
      sessionId: 'damaged-management',
      paperExecutionSessionId: paper.sessionId,
    });
    expect(recovered.attempts).toEqual(current.attempts);
    expect(recovered.projections).toEqual(current.projections);
    const discarded = await recovery.discardQuarantinedPositionManagementSessions([
      recovered.quarantinedPositionManagementSessions[0]!.quarantineId,
    ]);
    expect(discarded.quarantinedPositionManagementSessions).toEqual([]);
    expect(discarded.attempts).toEqual(current.attempts);
    expect(discarded.projections).toEqual(current.projections);
  });
});
