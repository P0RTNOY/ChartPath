import { act, render, waitFor } from '@testing-library/react-native';

import {
  DEVELOPMENT_HISTORICAL_DATASET,
  DEVELOPMENT_HISTORICAL_SCENARIO,
  contentVersion,
  exercises,
  historicalContentRegistry,
  lessons,
  type HistoricalContentRegistry,
} from '@chartpath/content';
import { computeCanonicalDatasetChecksum } from '@chartpath/historical-data';
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

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

async function renderLearning(
  repository: LearningRepository,
  registry?: HistoricalContentRegistry,
): Promise<{
  readonly current: () => LearningContextValue;
  readonly view: Awaited<ReturnType<typeof render>>;
}> {
  let learning: LearningContextValue | undefined;
  function Probe() {
    learning = useLearning();
    return null;
  }
  let view!: Awaited<ReturnType<typeof render>>;
  await act(async () => {
    view = await render(
      <LearningProvider repositoryOverride={repository} historicalRegistryOverride={registry}>
        <Probe />
      </LearningProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  await waitFor(() => expect(learning?.status).toBe('ready'));
  return {
    current: () => {
      if (!learning) throw new Error('Learning provider did not initialize');
      return learning;
    },
    view,
  };
}

function publishableHistoricalRegistry(): HistoricalContentRegistry {
  const dataset = structuredClone(DEVELOPMENT_HISTORICAL_DATASET) as Mutable<
    typeof DEVELOPMENT_HISTORICAL_DATASET
  >;
  dataset.manifest.publicationStatus = 'published';
  dataset.manifest.provenance.license.redistributionStatus = 'verified';
  dataset.manifest.canonicalChecksum = computeCanonicalDatasetChecksum(dataset);
  const scenario = structuredClone(DEVELOPMENT_HISTORICAL_SCENARIO) as Mutable<
    typeof DEVELOPMENT_HISTORICAL_SCENARIO
  >;
  scenario.dataset.canonicalChecksum = dataset.manifest.canonicalChecksum;
  scenario.publicationStatus = 'published';
  scenario.editorial = {
    status: 'published',
    humanReviewer: 'test-independent-review-record',
    reviewedAt: '2026-08-24T00:00:00.000Z',
  };
  return { datasets: [dataset], scenarios: [scenario] };
}

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
    expect(session.chart.kind).toBe('synthetic');
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

  it('creates, autosaves, resumes, and restarts the exact historical allocation', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    const harness = await renderLearning(repository);
    let session!: GuidedAnalysisSession;
    await act(async () => {
      session = await harness.current().createOrResumeAnalysisSession({
        kind: 'historical',
        scenarioId: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId,
      });
    });
    expect(session.chart).toMatchObject({
      kind: 'historical',
      scenarioId: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId,
      scenarioVersion: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioVersion,
      datasetId: DEVELOPMENT_HISTORICAL_SCENARIO.dataset.datasetId,
      datasetVersion: DEVELOPMENT_HISTORICAL_SCENARIO.dataset.datasetVersion,
      canonicalChecksum: DEVELOPMENT_HISTORICAL_SCENARIO.dataset.canonicalChecksum,
      candleCount: 96,
      decisionCandleIndex: 72,
      learningCredit: 'none',
    });
    expect(session.replay).toMatchObject({
      initialCursorCandleIndex: 23,
      cursorCandleIndex: 23,
      maxCursorSeenCandleIndex: 23,
      decisionCandleIndex: 72,
    });

    const advanced = reduceGuidedAnalysisSession(session, {
      type: 'set-replay-cursor',
      cursorCandleIndex: 40,
      updatedAt: session.updatedAt,
    });
    let saved!: GuidedAnalysisSession;
    await act(async () => {
      saved = await harness.current().saveAnalysisSession(advanced);
    });
    expect(saved).toEqual(advanced);
    await act(async () => {
      const resumed = await harness.current().createOrResumeAnalysisSession({
        kind: 'historical',
        scenarioId: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId,
      });
      expect(resumed).toEqual(saved);
    });

    let restarted!: GuidedAnalysisSession;
    await act(async () => {
      restarted = await harness.current().restartAnalysisSession(session.sessionId);
    });
    expect(restarted.sessionId).not.toBe(session.sessionId);
    expect(restarted.chart).toEqual(session.chart);
    expect(harness.current().snapshot?.analysisSessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sessionId: session.sessionId, status: 'abandoned' }),
        expect.objectContaining({
          sessionId: restarted.sessionId,
          status: 'active',
          chart: session.chart,
        }),
      ]),
    );
    await harness.view.unmount();
  });

  it('finalizes development historical practice idempotently without attempts or projections', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    const harness = await renderLearning(repository);
    let session!: GuidedAnalysisSession;
    await act(async () => {
      session = await harness.current().createOrResumeAnalysisSession({
        kind: 'historical',
        scenarioId: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId,
      });
    });
    const completed = submitEveryStep(session);
    await act(async () => {
      await harness.current().saveAnalysisSession(completed);
    });
    const before = await repository.load();
    const beforeLearning = JSON.stringify({
      attempts: before.attempts,
      projections: before.projections,
    });

    await act(async () => {
      await harness.current().finalizeAnalysisSession(completed);
    });
    const finalized = harness
      .current()
      .snapshot!.analysisSessions.find(({ sessionId }) => sessionId === session.sessionId)!;
    expect(finalized.status).toBe('finalized');
    expect(harness.current().snapshot!.attempts).toEqual([]);
    expect(
      JSON.stringify({
        attempts: harness.current().snapshot!.attempts,
        projections: harness.current().snapshot!.projections,
      }),
    ).toBe(beforeLearning);

    // Retry both the stale active object and the immutable finalized object.
    await act(async () => {
      await harness.current().finalizeAnalysisSession(completed);
      await harness.current().finalizeAnalysisSession(finalized);
    });
    expect(harness.current().snapshot!.attempts).toEqual([]);
    expect(
      JSON.stringify({
        attempts: harness.current().snapshot!.attempts,
        projections: harness.current().snapshot!.projections,
      }),
    ).toBe(beforeLearning);
    await harness.view.unmount();
  });

  it('pins exact chart identity into a future eligible historical course attempt', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    const registry = publishableHistoricalRegistry();
    const harness = await renderLearning(repository, registry);
    let session!: GuidedAnalysisSession;
    await act(async () => {
      session = await harness.current().createOrResumeAnalysisSession({
        kind: 'historical',
        scenarioId: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId,
      });
    });
    expect(session.chart).toMatchObject({ kind: 'historical', learningCredit: 'course' });
    const completed = submitEveryStep(session);
    await act(async () => {
      await harness.current().saveAnalysisSession(completed);
      await harness.current().finalizeAnalysisSession(completed);
    });
    expect(harness.current().snapshot!.attempts).toHaveLength(1);
    expect(harness.current().snapshot!.attempts[0]?.analysisChartIdentity).toEqual(session.chart);
    await harness.view.unmount();
  });

  it('refuses historical save/finalize on altered data but still allows explicit abandon', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    const mutableRegistry = structuredClone(
      historicalContentRegistry,
    ) as Mutable<HistoricalContentRegistry>;
    const harness = await renderLearning(repository, mutableRegistry);
    let session!: GuidedAnalysisSession;
    await act(async () => {
      session = await harness.current().createOrResumeAnalysisSession({
        kind: 'historical',
        scenarioId: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId,
      });
    });
    const completed = submitEveryStep(session);
    const before = JSON.stringify(await repository.load());
    mutableRegistry.datasets[0]!.candles[0]!.close += 0.01;

    await expect(harness.current().saveAnalysisSession(completed)).rejects.toThrow(
      /dataset-modified/,
    );
    await expect(harness.current().finalizeAnalysisSession(completed)).rejects.toThrow(
      /dataset-modified/,
    );
    expect(JSON.stringify(await repository.load())).toBe(before);

    let abandoned!: GuidedAnalysisSession;
    await act(async () => {
      abandoned = await harness.current().abandonAnalysisSession(session.sessionId);
    });
    expect(abandoned.status).toBe('abandoned');
    expect((await repository.load()).attempts).toEqual([]);
    await harness.view.unmount();
  });

  it('rejects spoofed or mismatched ordinary submissions before appending an attempt', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    const harness = await renderLearning(repository);
    const exercise = exercises.find(({ rubric }) => rubric.kind === 'multiple-choice')!;
    if (exercise.rubric.kind !== 'multiple-choice') throw new Error('Expected choice exercise');
    const answer = correctAnswer(exercise.rubric);
    const spoofed = { ...exercise, editorialStatus: 'draft' as const };

    await expect(
      harness.current().submitAttempt({
        exercise: spoofed,
        lessonId: lessons.find(({ exerciseIds }) => exerciseIds.includes(exercise.id))!.id,
        answer,
        hintIdsUsed: [],
        startedAt: '2026-08-24T08:00:00.000Z',
      }),
    ).rejects.toThrow(/תרגיל בדוק/);
    await expect(
      harness.current().submitAttempt({
        exercise,
        lessonId: 'lesson-u10-capstone',
        answer,
        hintIdsUsed: [],
        startedAt: '2026-08-24T08:00:00.000Z',
      }),
    ).rejects.toThrow(/תרגיל בדוק/);
    expect((await repository.load()).attempts).toEqual([]);
    await harness.view.unmount();
  });

  it('keeps canonical reviewed ordinary submission behavior unchanged', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    const harness = await renderLearning(repository);
    const exercise = exercises.find(({ rubric }) => rubric.kind === 'multiple-choice')!;
    if (exercise.rubric.kind !== 'multiple-choice') throw new Error('Expected choice exercise');
    const lesson = lessons.find(({ exerciseIds }) => exerciseIds.includes(exercise.id))!;
    await act(async () => {
      await harness.current().submitAttempt({
        exercise,
        lessonId: lesson.id,
        answer: correctAnswer(exercise.rubric),
        hintIdsUsed: [],
        startedAt: '2026-08-24T08:00:00.000Z',
      });
    });
    expect(harness.current().snapshot!.attempts).toHaveLength(1);
    expect(harness.current().snapshot!.attempts[0]).toMatchObject({
      lessonId: lesson.id,
      attempt: { exerciseId: exercise.id },
    });
    await harness.view.unmount();
  });
});
