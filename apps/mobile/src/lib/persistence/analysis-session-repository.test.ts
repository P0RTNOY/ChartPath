import {
  ANALYSIS_WORKFLOW_STEP_IDS,
  createGuidedAnalysisSession,
  gradeAnswer,
  reduceGuidedAnalysisSession,
  type AnalysisWorkflowStepId,
  type AtomicAnswerRubric,
  type GuidedAnalysisSession,
} from '@chartpath/domain';

import { InMemoryPersistenceAdapter } from './in-memory-adapter';
import { LearningRepository } from './repository';
import type { NewAttemptRecord } from './types';

const CREATED_AT = '2026-08-24T08:00:00.000Z';
const FINALIZED_AT = '2026-08-24T08:30:00.000Z';
const rubric: AtomicAnswerRubric = {
  kind: 'selection',
  expectedIds: ['observed'],
  mode: 'exact',
};
const stepRubrics = Object.fromEntries(
  ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => [stepId, rubric]),
) as unknown as Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>;

function completedActiveSession(): GuidedAnalysisSession {
  let session = createGuidedAnalysisSession({
    sessionId: 'real-domain-session',
    attemptId: 'analysis-attempt:real-domain-session',
    finalizationIdempotencyKey: 'analysis-finalize:real-domain-session',
    exerciseId: 'u10-capstone-e03',
    contentVersionId: 'catalog-1',
    exerciseSchemaVersion: 1,
    chart: {
      kind: 'synthetic',
      id: 'u10-capstone-e03-chart',
      seed: 91003,
      generatorVersion: '1.0.0',
      candleCount: 96,
      decisionCandleIndex: 71,
    },
    createdAt: CREATED_AT,
    initialReplayCursorCandleIndex: 23,
    stepRubrics,
    workflowStepIds: ANALYSIS_WORKFLOW_STEP_IDS,
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
  return session;
}

describe('guided analysis repository integration', () => {
  it('persists the real domain contract and finalizes exactly once from the next revision', async () => {
    const adapter = new InMemoryPersistenceAdapter();
    const repository = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => FINALIZED_AT,
    });
    const created = createGuidedAnalysisSession({
      sessionId: 'real-domain-session',
      attemptId: 'analysis-attempt:real-domain-session',
      finalizationIdempotencyKey: 'analysis-finalize:real-domain-session',
      exerciseId: 'u10-capstone-e03',
      contentVersionId: 'catalog-1',
      exerciseSchemaVersion: 1,
      chart: {
        kind: 'synthetic',
        id: 'u10-capstone-e03-chart',
        seed: 91003,
        generatorVersion: '1.0.0',
        candleCount: 96,
        decisionCandleIndex: 71,
      },
      createdAt: CREATED_AT,
      initialReplayCursorCandleIndex: 23,
      stepRubrics,
      workflowStepIds: ANALYSIS_WORKFLOW_STEP_IDS,
    });
    await repository.createOrResumeAnalysisSession(created);
    const active = completedActiveSession();
    await repository.saveAnalysisSession(active);
    const answer = {
      kind: 'capstone' as const,
      stepAnswers: ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => ({
        stepId,
        answer: { kind: 'selection' as const, selectedIds: ['observed'] },
      })),
    };
    const capstoneRubric = {
      kind: 'capstone' as const,
      steps: ANALYSIS_WORKFLOW_STEP_IDS.map((id) => ({ id, rubric })),
    };
    const finalResult = gradeAnswer(capstoneRubric, answer);
    const finalized = reduceGuidedAnalysisSession(active, {
      type: 'finalize',
      attemptId: active.attemptId,
      idempotencyKey: active.finalizationIdempotencyKey,
      finalResult,
      finalizedAt: FINALIZED_AT,
    });
    const attemptRecord: NewAttemptRecord = {
      attempt: {
        id: finalized.attemptId,
        exerciseId: finalized.exerciseId,
        contentVersionId: finalized.contentVersionId,
        startedAt: CREATED_AT,
        submittedAt: FINALIZED_AT,
        answer,
        result: finalResult,
        hintIdsUsed: [],
        responseTimeMs: 1_800_000,
      },
      lessonId: 'lesson-u10-capstone',
      skillIds: ['workflow.eleven-step'],
      difficulty: 5,
      exerciseVersion: 1,
      generatorVersion: '1.0.0',
      isReview: false,
      xpAwarded: 20,
      activityDate: '2026-08-24',
      dailyGoalMinutes: 10,
      activeMinutes: 30,
      completesLesson: false,
    };

    await expect(
      repository.finalizeAnalysisSession({
        session: { ...finalized, revision: finalized.revision + 1 },
        attemptRecord,
      }),
    ).rejects.toThrow('Finalization must directly follow the persisted active revision.');
    const first = await repository.finalizeAnalysisSession({ session: finalized, attemptRecord });
    const retry = await repository.finalizeAnalysisSession({ session: finalized, attemptRecord });

    expect(first.inserted).toBe(true);
    expect(retry.inserted).toBe(false);
    expect(retry.snapshot.attempts).toHaveLength(1);
    expect(retry.snapshot.projections.totalXp).toBe(20);
    expect(retry.snapshot.projections.skillMastery['workflow.eleven-step']?.attemptCount).toBe(1);
  });
});
