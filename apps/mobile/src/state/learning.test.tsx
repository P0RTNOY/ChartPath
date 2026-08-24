import { act, render, waitFor } from '@testing-library/react-native';

import { contentVersion, exercises, lessons } from '@chartpath/content';
import {
  ANALYSIS_WORKFLOW_STEP_IDS,
  gradeAnswer,
  reduceGuidedAnalysisSession,
  type AtomicAnswerRubric,
  type AtomicExerciseAnswer,
  type GuidedAnalysisSession,
} from '@chartpath/domain';

import { InMemoryPersistenceAdapter, LearningRepository } from '@/lib/persistence';

import {
  createAttemptRecord,
  GUIDED_ANALYSIS_EXERCISE_ID,
  LearningProvider,
  useLearning,
  type LearningContextValue,
} from './learning';

function correctAnswer(rubric: AtomicAnswerRubric): AtomicExerciseAnswer {
  switch (rubric.kind) {
    case 'multiple-choice':
      return { kind: 'multiple-choice', optionId: rubric.acceptedOptionIds[0]! };
    case 'selection':
      return { kind: 'selection', selectedIds: rubric.expectedIds };
    case 'sequence':
      return { kind: 'sequence', orderedIds: rubric.expectedOrder };
    case 'point':
      return { kind: 'point', points: rubric.targets };
    case 'zone':
      return { kind: 'zone', zone: rubric.target };
    case 'line':
      return { kind: 'line', line: rubric.target };
    case 'risk':
      return { kind: 'risk', values: rubric.expected };
    case 'decision':
      return {
        kind: 'decision',
        decision: rubric.acceptedDecisions[0]!,
        reasonIds: rubric.requiredReasonIds,
      };
    case 'label-placement':
      return {
        kind: 'label-placement',
        placements: rubric.targets.map(({ labelId, target }) => ({
          labelId,
          anchor: target,
        })),
      };
  }
}

function submitEveryStep(session: GuidedAnalysisSession): GuidedAnalysisSession {
  return ANALYSIS_WORKFLOW_STEP_IDS.reduce((current, stepId) => {
    const rubric = current.steps[stepId].rubric;
    const answer = correctAnswer(rubric);
    const answered = reduceGuidedAnalysisSession(current, {
      type: 'update-step-answer',
      stepId,
      answer,
      updatedAt: current.updatedAt,
    });
    return reduceGuidedAnalysisSession(answered, {
      type: 'submit-step',
      stepId,
      result: gradeAnswer(rubric, answer),
      submittedAt: answered.updatedAt,
    });
  }, session);
}

describe('guided analysis learning integration', () => {
  it('builds immutable attempt records with bounded timing and unique hints', () => {
    const exercise = exercises.find(({ id }) => id === GUIDED_ANALYSIS_EXERCISE_ID)!;
    const result = gradeAnswer(exercise.rubric, {
      kind: 'capstone',
      stepAnswers: [],
    });
    const record = createAttemptRecord({
      attemptId: 'stable-guided-attempt',
      exercise,
      lessonId: 'lesson-u10-capstone',
      answer: { kind: 'capstone', stepAnswers: [] },
      result,
      hintIdsUsed: ['hint-1', 'hint-1', 'hint-2'],
      startedAt: '2026-08-20T08:00:00.000Z',
      submittedAt: '2026-08-24T08:00:00.000Z',
      isReview: false,
      completesLesson: false,
      dailyGoalMinutes: 10,
    });

    expect(record.attempt.id).toBe('stable-guided-attempt');
    expect(record.attempt.hintIdsUsed).toEqual(['hint-1', 'hint-2']);
    expect(record.attempt.responseTimeMs).toBe(86_400_000);
    expect(record.activeMinutes).toBe(1_440);
    expect(record.xpAwarded).toBeGreaterThanOrEqual(4);
  });

  it('resumes one draft and finalizes it idempotently into one attempt', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    const lesson = lessons.find(({ id }) => id === 'lesson-u10-capstone')!;
    for (const exerciseId of lesson.exerciseIds.filter(
      (candidate) => candidate !== GUIDED_ANALYSIS_EXERCISE_ID,
    )) {
      const exercise = exercises.find(({ id }) => id === exerciseId)!;
      if (exercise.rubric.kind === 'capstone') throw new Error('Unexpected second capstone');
      const answer = correctAnswer(exercise.rubric);
      const result = gradeAnswer(exercise.rubric, answer);
      await repository.appendAttempt(
        createAttemptRecord({
          attemptId: `prior-${exerciseId}`,
          exercise,
          lessonId: lesson.id,
          answer,
          result,
          hintIdsUsed: [],
          startedAt: '2026-08-24T07:58:00.000Z',
          submittedAt: '2026-08-24T08:00:00.000Z',
          isReview: false,
          completesLesson: false,
          dailyGoalMinutes: 10,
        }),
      );
    }
    let learning: LearningContextValue | undefined;

    function Probe() {
      learning = useLearning();
      return null;
    }

    await act(async () => {
      render(
        <LearningProvider repositoryOverride={repository}>
          <Probe />
        </LearningProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(learning?.status).toBe('ready'));

    let session!: GuidedAnalysisSession;
    await act(async () => {
      session = await learning!.createOrResumeAnalysisSession();
    });
    await act(async () => {
      const resumed = await learning!.createOrResumeAnalysisSession();
      expect(resumed.sessionId).toBe(session.sessionId);
    });
    expect(learning!.snapshot!.analysisSessions).toHaveLength(1);

    const completed = submitEveryStep(session);
    await act(async () => {
      await learning!.saveAnalysisSession(completed);
      await learning!.finalizeAnalysisSession(completed);
    });
    const finalized = learning!.snapshot!.analysisSessions[0]!;
    const firstXp = learning!.snapshot!.projections.totalXp;
    expect(finalized.status).toBe('finalized');
    expect(
      learning!.snapshot!.attempts.filter(({ attempt }) => attempt.id === session.attemptId),
    ).toHaveLength(1);
    expect(
      learning!.snapshot!.attempts.find(({ attempt }) => attempt.id === session.attemptId)
        ?.completesLesson,
    ).toBe(true);
    expect(learning!.snapshot!.projections.lessonProgress[lesson.id]?.status).toBe('completed');

    // Simulate a retry from a stale in-memory active object after the atomic commit succeeded.
    await act(async () => {
      await learning!.finalizeAnalysisSession(completed);
    });
    expect(
      learning!.snapshot!.attempts.filter(({ attempt }) => attempt.id === session.attemptId),
    ).toHaveLength(1);
    expect(learning!.snapshot!.projections.totalXp).toBe(firstXp);

    await act(async () => {
      await learning!.finalizeAnalysisSession(finalized);
    });
    expect(
      learning!.snapshot!.attempts.filter(({ attempt }) => attempt.id === session.attemptId),
    ).toHaveLength(1);
    expect(learning!.snapshot!.projections.totalXp).toBe(firstXp);
  });
});
