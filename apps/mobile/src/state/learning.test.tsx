import { act, render, waitFor } from '@testing-library/react-native';

import {
  DEVELOPMENT_HISTORICAL_DATASET,
  DEVELOPMENT_HISTORICAL_SCENARIO,
  contentVersion,
  exercises,
  historicalContentRegistry,
  scenarioCandidateRegistry,
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
  type PaperExecutionSession,
  type TradePlanInput,
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

const QA_HYPOTHETICAL = 'qa-hypothetical-mechanics' as const;

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
  scenario.paperExecution!.publicationStatus = 'published';
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

function paperPlan(
  entryIntent: TradePlanInput['entryIntent'] = {
    type: 'market',
    estimatedEntryPrice: 107.86,
  },
): TradePlanInput {
  return {
    planId: 'caller-plan-id-is-not-authoritative',
    direction: 'short',
    entryIntent,
    protectiveStopPrice: 109.5,
    targetPrice: 105,
    fictionalAccountValue: 100_000,
    intendedRiskAmount: 500,
    quantity: 100,
    authoredAtCandleIndex: 999,
    processEvidence: {
      analysisDecision: 'short',
      entryMatchesAnalysis: false,
      invalidationMatchesAnalysis: false,
      targetMatchesAnalysis: false,
      requiredReasoningBypassed: true,
    },
  };
}

async function finalizeHistoricalAnalysis(current: () => LearningContextValue): Promise<string> {
  let session = await current().createOrResumeAnalysisSession({
    kind: 'historical',
    scenarioId: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId,
    accessMode: 'qa-internal',
  });
  session = submitEveryStep(session);
  await current().saveAnalysisSession(session);
  await current().finalizeAnalysisSession(session);
  return session.sessionId;
}

describe('guided analysis learning integration', () => {
  it('requires explicit QA access before allocating an internal historical scenario', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    const harness = await renderLearning(repository);
    const candidate = scenarioCandidateRegistry[0]!;
    await expect(
      harness.current().createOrResumeAnalysisSession({
        kind: 'historical',
        scenarioId: candidate.scenario.scenarioId,
      }),
    ).rejects.toThrow(/internal-scenario-restricted/);
    expect((await repository.load()).analysisSessions).toEqual([]);
    await harness.view.unmount();
  });

  it.each([
    ['long', 'trade', 'long'],
    ['short', 'trade', 'short'],
    ['no-trade', 'no-trade', undefined],
  ] as const)(
    'creates and finalizes a no-credit internal %s candidate through QA',
    async (_label, kind, direction) => {
      const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
        contentVersion: contentVersion.id,
      });
      const harness = await renderLearning(repository);
      const candidate = scenarioCandidateRegistry.find(({ manifest }) => {
        const application = manifest.application;
        return kind === 'no-trade'
          ? application.kind === 'no-trade'
          : application.kind === 'trade' && application.direction === direction;
      })!;
      let session!: GuidedAnalysisSession;
      await act(async () => {
        session = await harness.current().createOrResumeAnalysisSession({
          kind: 'historical',
          scenarioId: candidate.scenario.scenarioId,
          accessMode: 'qa-internal',
        });
      });
      expect(session).toMatchObject({
        exerciseId: candidate.gradingExercise.id,
        contentVersionId: candidate.gradingExercise.contentVersionId,
        chart: {
          kind: 'historical',
          scenarioId: candidate.scenario.scenarioId,
          learningCredit: 'none',
        },
      });
      const completed = submitEveryStep(session);
      await act(async () => {
        await harness.current().saveAnalysisSession(completed);
        await harness.current().finalizeAnalysisSession(completed);
      });
      expect(
        harness
          .current()
          .snapshot!.analysisSessions.find(({ sessionId }) => sessionId === session.sessionId)
          ?.status,
      ).toBe('finalized');
      expect(harness.current().snapshot!.attempts).toEqual([]);
      expect(harness.current().snapshot!.projections.totalXp).toBe(0);
      if (kind === 'trade') {
        let execution!: PaperExecutionSession;
        await act(async () => {
          execution = await harness
            .current()
            .createOrResumePaperExecutionSession(
              session.sessionId,
              candidate.manifest.expectedExecution!.plan,
            );
        });
        expect(execution).toMatchObject({
          status: 'draft',
          plan: { direction },
          source: {
            analysisSessionId: session.sessionId,
            learningCredit: 'none',
            permittedDirections: [direction],
          },
        });
      } else {
        await expect(
          harness.current().createOrResumePaperExecutionSession(session.sessionId, paperPlan()),
        ).rejects.toThrow(/execution-not-enabled/);
        expect(harness.current().snapshot!.paperExecutionSessions).toEqual([]);
      }
      await harness.view.unmount();
    },
  );

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
        accessMode: 'qa-internal',
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
        accessMode: 'qa-internal',
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
        accessMode: 'qa-internal',
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
        accessMode: 'qa-internal',
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
    const answer = correctAnswer(exercise.rubric);
    await act(async () => {
      await harness.current().submitAttempt({
        exercise,
        lessonId: lesson.id,
        answer,
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

  it('creates execution only from finalized analysis and processes every revealed candle once', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    const harness = await renderLearning(repository);
    let activeAnalysis!: GuidedAnalysisSession;
    await act(async () => {
      activeAnalysis = await harness.current().createOrResumeAnalysisSession({
        kind: 'historical',
        scenarioId: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId,
        accessMode: 'qa-internal',
      });
    });
    await expect(
      harness
        .current()
        .createOrResumePaperExecutionSession(
          activeAnalysis.sessionId,
          paperPlan(),
          QA_HYPOTHETICAL,
        ),
    ).rejects.toThrow(/analysis-not-finalized/);

    let finalized!: GuidedAnalysisSession;
    await act(async () => {
      const completed = submitEveryStep(activeAnalysis);
      await harness.current().saveAnalysisSession(completed);
      await harness.current().finalizeAnalysisSession(completed);
    });
    finalized = harness
      .current()
      .snapshot!.analysisSessions.find(({ sessionId }) => sessionId === activeAnalysis.sessionId)!;
    await expect(
      harness.current().createOrResumePaperExecutionSession(finalized.sessionId, paperPlan()),
    ).rejects.toThrow(/hypothetical-mechanics-restricted/);
    await expect(
      harness
        .current()
        .createOrResumePaperExecutionSession(
          finalized.sessionId,
          { ...paperPlan(), direction: 'long' },
          QA_HYPOTHETICAL,
        ),
    ).rejects.toThrow(/execution-direction-mismatch/);
    expect((await repository.load()).paperExecutionSessions).toEqual([]);
    const beforeLearning = JSON.stringify({
      attempts: harness.current().snapshot!.attempts,
      projections: harness.current().snapshot!.projections,
    });

    let execution!: PaperExecutionSession;
    await act(async () => {
      execution = await harness
        .current()
        .createOrResumePaperExecutionSession(finalized.sessionId, paperPlan(), QA_HYPOTHETICAL);
    });
    expect(execution).toMatchObject({
      status: 'draft',
      source: {
        analysisSessionId: finalized.sessionId,
        canonicalChecksum: DEVELOPMENT_HISTORICAL_SCENARIO.dataset.canonicalChecksum,
        decisionCandleIndex: 72,
        learningCredit: 'none',
      },
      plan: {
        authoredAtCandleIndex: 72,
        processEvidence: {
          analysisDecision: 'no-trade',
          entryMatchesAnalysis: false,
          invalidationMatchesAnalysis: false,
          targetMatchesAnalysis: false,
          requiredReasoningBypassed: true,
        },
      },
      lastProcessedCandleIndex: 72,
    });
    expect(execution.plan.planId).toMatch(/^paper-plan-/);
    await act(async () => {
      const resumed = await harness
        .current()
        .createOrResumePaperExecutionSession(finalized.sessionId, paperPlan(), QA_HYPOTHETICAL);
      expect(resumed.sessionId).toBe(execution.sessionId);
      execution = await harness
        .current()
        .submitPaperExecutionSession(execution.sessionId, 'confirm-market-submit', QA_HYPOTHETICAL);
      execution = await harness
        .current()
        .advancePaperExecutionSession(execution.sessionId, 13, QA_HYPOTHETICAL);
    });
    expect(execution.status).toBe('closed');
    expect(execution.position?.status).toBe('closed-stop');
    expect(execution.debrief?.processQuality).toBe('needs-review');
    expect(execution.processedCandles.map(({ index }) => index)).toEqual(
      Array.from({ length: 13 }, (_, offset) => 73 + offset),
    );
    expect(execution.events.filter(({ type }) => type === 'order-filled')).toHaveLength(1);
    expect(execution.events.filter(({ type }) => type === 'position-closed-stop')).toHaveLength(1);
    const canonicalAfterClose = JSON.stringify(execution);

    await act(async () => {
      const repeated = await harness
        .current()
        .advancePaperExecutionSession(execution.sessionId, 13, QA_HYPOTHETICAL);
      expect(JSON.stringify(repeated)).toBe(canonicalAfterClose);
      await harness.current().reload();
    });
    await waitFor(() => expect(harness.current().status).toBe('ready'));
    expect(
      JSON.stringify(
        harness
          .current()
          .snapshot!.paperExecutionSessions.find(
            ({ sessionId }) => sessionId === execution.sessionId,
          ),
      ),
    ).toBe(canonicalAfterClose);
    expect(
      JSON.stringify({
        attempts: harness.current().snapshot!.attempts,
        projections: harness.current().snapshot!.projections,
      }),
    ).toBe(beforeLearning);
    await harness.view.unmount();
  });

  it('resumes and explicitly cancels a working order after provider reload', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    const first = await renderLearning(repository);
    let analysisSessionId!: string;
    let finalized!: GuidedAnalysisSession;
    await act(async () => {
      analysisSessionId = await finalizeHistoricalAnalysis(first.current);
    });
    finalized = first
      .current()
      .snapshot!.analysisSessions.find(({ sessionId }) => sessionId === analysisSessionId)!;
    const workingPlan = {
      ...paperPlan({ type: 'limit', limitPrice: 120 }),
      protectiveStopPrice: 121,
    };
    let working!: PaperExecutionSession;
    await act(async () => {
      working = await first
        .current()
        .createOrResumePaperExecutionSession(finalized.sessionId, workingPlan, QA_HYPOTHETICAL);
      working = await first
        .current()
        .submitPaperExecutionSession(working.sessionId, 'confirm-working-submit', QA_HYPOTHETICAL);
    });
    expect(working.status).toBe('working');
    await first.view.unmount();

    const resumed = await renderLearning(repository);
    expect(
      resumed
        .current()
        .snapshot!.paperExecutionSessions.find(({ sessionId }) => sessionId === working.sessionId),
    ).toEqual(working);
    let cancelled!: PaperExecutionSession;
    await act(async () => {
      cancelled = await resumed
        .current()
        .cancelPaperExecutionOrder(working.sessionId, 'confirm-working-cancel', QA_HYPOTHETICAL);
    });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.workingOrder?.status).toBe('cancelled');
    expect(cancelled.events.at(-1)).toMatchObject({
      type: 'order-cancelled',
      confirmationId: 'confirm-working-cancel',
    });
    const revision = cancelled.revision;
    await act(async () => {
      cancelled = await resumed
        .current()
        .cancelPaperExecutionOrder(working.sessionId, 'confirm-working-cancel', QA_HYPOTHETICAL);
    });
    expect(cancelled.revision).toBe(revision);
    expect((await repository.load()).attempts).toEqual([]);
    await resumed.view.unmount();
  });

  it('fails closed after a checksum mismatch while preserving explicit audited abandon', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    const registry = structuredClone(
      historicalContentRegistry,
    ) as Mutable<HistoricalContentRegistry>;
    const harness = await renderLearning(repository, registry);
    let analysisSessionId!: string;
    let finalized!: GuidedAnalysisSession;
    let draft!: PaperExecutionSession;
    await act(async () => {
      analysisSessionId = await finalizeHistoricalAnalysis(harness.current);
    });
    finalized = harness
      .current()
      .snapshot!.analysisSessions.find(({ sessionId }) => sessionId === analysisSessionId)!;
    await act(async () => {
      draft = await harness
        .current()
        .createOrResumePaperExecutionSession(finalized.sessionId, paperPlan(), QA_HYPOTHETICAL);
    });
    registry.datasets[0]!.candles[0]!.close += 0.01;
    await expect(
      harness.current().savePaperExecutionPlan(draft.sessionId, paperPlan(), QA_HYPOTHETICAL),
    ).rejects.toThrow(/dataset-modified/);

    let abandoned!: PaperExecutionSession;
    await act(async () => {
      abandoned = await harness
        .current()
        .abandonPaperExecutionSession(draft.sessionId, 'confirm-explicit-recovery');
    });
    expect(abandoned.status).toBe('cancelled');
    expect(abandoned.events.at(-1)).toMatchObject({
      type: 'execution-abandoned',
      confirmationId: 'confirm-explicit-recovery',
    });
    expect((await repository.load()).attempts).toEqual([]);
    await harness.view.unmount();
  });
});
