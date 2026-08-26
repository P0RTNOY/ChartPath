import type { Attempt, GuidedAnalysisSession } from '@chartpath/domain';

interface TestMatchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toHaveLength(expected: number): void;
  toMatchObject(expected: unknown): void;
  toBeInstanceOf(expected: unknown): void;
  toThrow(expected: unknown): void;
  readonly rejects: TestMatchers;
  readonly not: TestMatchers;
}

declare const describe: (name: string, suite: () => void) => void;
declare const it: (name: string, test: () => Promise<void> | void) => void;
declare const expect: (actual: unknown) => TestMatchers;
declare const jest: {
  mock(moduleName: string, factory: () => unknown, options: { virtual: boolean }): void;
};

// The mobile Jest preset does not map workspace ESM `.js` exports back to TypeScript sources.
// Domain reducers have their own package tests; this virtual module verifies repository replay wiring.
jest.mock(
  '@chartpath/domain',
  () => ({
    assertValidGuidedAnalysisSession: (session: GuidedAnalysisSession) => {
      if (
        session?.schemaVersion !== 2 ||
        typeof session.sessionId !== 'string' ||
        !Number.isSafeInteger(session.revision)
      ) {
        throw new Error('Invalid guided analysis session');
      }
    },
    reduceGuidedAnalysisSession: (
      session: GuidedAnalysisSession,
      action: { type: string; abandonedAt?: string },
    ) => {
      if (action.type !== 'abandon' || !action.abandonedAt) return session;
      if (session.status === 'abandoned') return session;
      return {
        ...session,
        status: 'abandoned',
        abandonedAt: action.abandonedAt,
        updatedAt: action.abandonedAt,
        revision: session.revision + 1,
      };
    },
    createReviewState: (skillId: string, dueAt: string, masteryScore = 0) => ({
      skillId,
      lastReviewAt: null,
      nextDueAt: dueAt,
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapseCount: 0,
      masteryScore,
    }),
    scheduleReview: (
      current: Record<string, unknown>,
      outcome: { reviewedAt: string; masteryScore: number },
    ) => ({
      ...current,
      lastReviewAt: outcome.reviewedAt,
      nextDueAt: '2026-08-21T08:02:00.000Z',
      intervalDays: 1,
      repetitions: 1,
      masteryScore: outcome.masteryScore,
    }),
    assertCompatibleAnalysisChartIdentity: (left: unknown, right: unknown) => {
      if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error('Chart mismatch');
    },
    analysisChartIdentitiesEqual: (left: unknown, right: unknown) =>
      JSON.stringify(left) === JSON.stringify(right),
    updateSkillMastery: (
      current: { score: number; attemptCount: number } | undefined,
      evidence: {
        skillId: string;
        score: number;
        correct: boolean;
        isReview: boolean;
        hintsUsed: number;
        attemptedAt: string;
      },
    ) => ({
      skillId: evidence.skillId,
      score: evidence.score,
      attemptCount: (current?.attemptCount ?? 0) + 1,
      correctAttemptCount: evidence.correct ? 1 : 0,
      reviewAttemptCount: evidence.isReview ? 1 : 0,
      totalHintsUsed: evidence.hintsUsed,
      misconceptionCounts: {},
      updatedAt: evidence.attemptedAt,
    }),
  }),
  { virtual: true },
);

import {
  AnalysisSessionConflictError,
  AttemptConflictError,
  classifyPersistenceInitializationFailure,
  PersistenceCorruptionError,
  UnsupportedPersistenceVersionError,
} from './adapter';
import { InMemoryPersistenceAdapter } from './in-memory-adapter';
import { LocalStoragePersistenceAdapter } from './local-storage-adapter';
import { RecoveryImportConflictError, RecoveryImportStalePlanError } from './recovery-import';
import { LearningRepository } from './repository';
import { createRecoveryPayload } from '../recovery/payload';
import {
  ATTEMPT_RECORD_SCHEMA_VERSION,
  CURRENT_PERSISTENCE_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  type NewAttemptRecord,
  type PersistedAttempt,
  type PersistenceSnapshotV1,
} from './types';

const CREATED_AT = '2026-08-20T08:00:00.000Z';
const SUBMITTED_AT = '2026-08-20T08:02:00.000Z';
const REOPENED_AT = '2026-08-21T08:00:00.000Z';
const FINALIZED_AT = '2026-08-21T08:04:00.000Z';
const STEP_IDS = [
  'context',
  'structure',
  'level',
  'setup',
  'confirmation',
  'entry',
  'invalidation',
  'position-size',
  'target',
  'management',
  'review',
] as const;

function attempt(id = 'attempt-1'): Attempt {
  return {
    id,
    exerciseId: 'exercise-structure-1',
    contentVersionId: 'catalog-1',
    startedAt: CREATED_AT,
    submittedAt: SUBMITTED_AT,
    answer: { kind: 'multiple-choice', optionId: 'higher-high' },
    result: {
      correct: true,
      score: 1,
      feedbackCode: 'correct',
      details: [],
      misconceptionIds: [],
      graderVersion: '1.0.0',
    },
    hintIdsUsed: [],
    responseTimeMs: 120_000,
  };
}

function attemptRecord(id = 'attempt-1'): NewAttemptRecord {
  return {
    attempt: attempt(id),
    lessonId: 'lesson-market-structure',
    skillIds: ['skill-market-structure'],
    difficulty: 2,
    exerciseVersion: 1,
    generatorVersion: '1.0.0',
    isReview: false,
    xpAwarded: 12,
    activityDate: '2026-08-20',
    dailyGoalMinutes: 10,
    activeMinutes: 2,
    completesLesson: true,
  };
}

function activeSession(
  sessionId = 'analysis-session-1',
  revision = 0,
  updatedAt = CREATED_AT,
): GuidedAnalysisSession {
  return {
    schemaVersion: 2,
    revision,
    sessionId,
    attemptId: `analysis-attempt:${sessionId}`,
    finalizationIdempotencyKey: `analysis-finalize:${sessionId}`,
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
    status: 'active',
    createdAt: CREATED_AT,
    updatedAt,
    currentStepId: 'context',
    steps: Object.fromEntries(
      STEP_IDS.map((stepId) => [
        stepId,
        {
          stepId,
          rubric: { kind: 'selection', expectedIds: ['answer'], mode: 'exact' },
          status: 'draft',
          answerComplete: false,
          hintIdsUsed: [],
        },
      ]),
    ) as unknown as GuidedAnalysisSession['steps'],
    annotations: [],
    replay: {
      initialCursorCandleIndex: 0,
      cursorCandleIndex: 23,
      maxCursorSeenCandleIndex: 23,
      decisionCandleIndex: 71,
      checkpoints: [],
    },
  };
}

function finalizedSession(active: GuidedAnalysisSession): GuidedAnalysisSession {
  const result = attempt().result;
  return {
    ...active,
    revision: active.revision + 1,
    status: 'finalized',
    updatedAt: FINALIZED_AT,
    finalizedAt: FINALIZED_AT,
    finalResult: result,
    steps: Object.fromEntries(
      STEP_IDS.map((stepId) => [
        stepId,
        {
          ...active.steps[stepId],
          answer: { kind: 'selection', selectedIds: ['answer'] },
          answerComplete: true,
          status: 'submitted',
          result,
          updatedAt: FINALIZED_AT,
          submittedAt: FINALIZED_AT,
        },
      ]),
    ) as unknown as GuidedAnalysisSession['steps'],
  };
}

function finalizationAttempt(session: GuidedAnalysisSession): NewAttemptRecord {
  const base = attemptRecord(session.attemptId);
  return {
    ...base,
    attempt: {
      ...base.attempt,
      id: session.attemptId,
      exerciseId: session.exerciseId,
      contentVersionId: session.contentVersionId,
      submittedAt: FINALIZED_AT,
      answer: {
        kind: 'capstone',
        stepAnswers: STEP_IDS.map((stepId) => ({
          stepId,
          answer: { kind: 'selection', selectedIds: ['answer'] },
        })),
      },
      result: session.finalResult!,
    },
    lessonId: 'lesson-u10-capstone',
    skillIds: ['workflow.eleven-step'],
    difficulty: 5,
    xpAwarded: 20,
    activityDate: '2026-08-21',
    completesLesson: false,
  };
}

function historicalSession(
  sessionId: string,
  canonicalChecksum = `sha256:${'a'.repeat(64)}`,
  learningCredit: 'course' | 'none' = 'none',
): GuidedAnalysisSession {
  return {
    ...activeSession(sessionId),
    chart: {
      kind: 'historical',
      id: 'historical-chart-1',
      scenarioId: 'scenario-breakout-1',
      scenarioVersion: '1.0.0',
      datasetId: 'dataset-daily-1',
      datasetVersion: '2026-08',
      canonicalChecksum,
      candleCount: 96,
      interval: '1d',
      firstCandleTimestamp: '2026-01-01T00:00:00.000Z',
      lastCandleTimestamp: '2026-04-06T00:00:00.000Z',
      decisionCandleIndex: 71,
      learningCredit,
    },
  };
}

function creditedHistoricalAttempt(session: GuidedAnalysisSession): NewAttemptRecord {
  const { generatorVersion: _generatorVersion, ...record } = finalizationAttempt(session);
  return { ...record, analysisChartIdentity: session.chart };
}

describe('LearningRepository', () => {
  it('classifies initialization failures without discarding their original cause', () => {
    const newer = new UnsupportedPersistenceVersionError(99);
    const corrupt = new PersistenceCorruptionError('invalid payload');
    const transient = new Error('database temporarily unavailable');

    expect(classifyPersistenceInitializationFailure(newer)).toMatchObject({
      reason: 'unsupported-newer-schema',
      cause: newer,
    });
    expect(classifyPersistenceInitializationFailure(corrupt)).toMatchObject({
      reason: 'corrupt-store',
      cause: corrupt,
    });
    expect(classifyPersistenceInitializationFailure(transient)).toMatchObject({
      reason: 'transient',
      cause: transient,
    });
  });

  it('persists a completed lesson across repository recreation and deduplicates retries', async () => {
    const adapter = new InMemoryPersistenceAdapter();
    const firstRepository = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });

    await firstRepository.initialize();
    const inserted = await firstRepository.appendAttempt(attemptRecord());
    const retried = await firstRepository.appendAttempt(attemptRecord());

    expect(inserted.inserted).toBe(true);
    expect(retried.inserted).toBe(false);
    expect(retried.snapshot.attempts).toHaveLength(1);
    expect(retried.snapshot.projections.totalXp).toBe(12);

    const recreatedRepository = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => REOPENED_AT,
    });
    const reopened = await recreatedRepository.initialize();

    expect(reopened.attempts.map((record) => record.attempt.id)).toEqual(['attempt-1']);
    expect(reopened.projections.lessonProgress['lesson-market-structure']).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      correctAttemptCount: 1,
      earnedXp: 12,
      completedAt: SUBMITTED_AT,
    });
    expect(reopened.projections.skillMastery['skill-market-structure']?.attemptCount).toBe(1);
    expect(reopened.projections.dailyActivity['2026-08-20']).toMatchObject({
      xp: 12,
      activeMinutes: 2,
      completedLessonIds: ['lesson-market-structure'],
      attemptIds: ['attempt-1'],
    });
  });

  it('previews and atomically applies additive recovery with idempotent exact-ID replay', async () => {
    const source = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    await source.appendAttempt(attemptRecord());
    await source.updateSettings({ theme: 'dark', dailyGoalMinutes: 20 });
    const payload = createRecoveryPayload(await source.load(), {
      appVersion: '0.1.0',
      bundleId: 'recovery-test-additive',
      createdAt: CREATED_AT,
      categories: ['settings', 'attempts'],
    });

    const adapter = new InMemoryPersistenceAdapter();
    const target = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => REOPENED_AT,
    });
    await target.updateSettings({
      disclaimerVersionAccepted: 'disclaimer-local-only',
      disclaimerAcceptedAt: REOPENED_AT,
    });
    const beforePreview = await adapter.dump();
    const plan = await target.previewRecoveryImport(payload);

    expect(await adapter.dump()).toBe(beforePreview);
    expect(plan.canApply).toBe(true);
    expect(plan.added).toMatchObject({ settings: 1, attempts: 1 });
    const applied = await target.applyRecoveryImport(payload, {
      selectedCategories: plan.selectedCategories,
      expectedPlanToken: plan.planToken,
    });
    expect(applied.applied).toBe(true);
    expect(applied.snapshot.attempts).toHaveLength(1);
    expect(applied.snapshot.projections.totalXp).toBe(12);
    expect(applied.snapshot.settings).toMatchObject({
      theme: 'dark',
      dailyGoalMinutes: 20,
      disclaimerVersionAccepted: 'disclaimer-local-only',
    });

    const retryPlan = await target.previewRecoveryImport(payload);
    const retried = await target.applyRecoveryImport(payload, {
      selectedCategories: retryPlan.selectedCategories,
      expectedPlanToken: retryPlan.planToken,
    });
    expect(retryPlan.selectedCategories).toEqual(['attempts']);
    expect(retryPlan.unchanged).toMatchObject({ settings: 0, attempts: 1 });
    expect(retried.applied).toBe(false);
    expect(retried.snapshot.attempts).toHaveLength(1);
  });

  it('binds an explicit import-category selection and keeps settings off by default for existing learners', async () => {
    const source = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    await source.appendAttempt(attemptRecord());
    await source.updateSettings({ theme: 'dark', dailyGoalMinutes: 20 });
    const payload = createRecoveryPayload(await source.load(), {
      appVersion: '0.1.0',
      bundleId: 'recovery-test-selection',
      createdAt: CREATED_AT,
      categories: ['settings', 'attempts'],
    });

    const target = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => REOPENED_AT,
    });
    await target.appendAttempt(attemptRecord('local-existing-attempt'));

    const defaultPlan = await target.previewRecoveryImport(payload);
    expect(defaultPlan.selectedCategories).toEqual(['attempts']);
    expect(defaultPlan.incoming).toMatchObject({ settings: 0, attempts: 1 });
    await expect(
      target.applyRecoveryImport(payload, {
        selectedCategories: ['settings'],
        expectedPlanToken: defaultPlan.planToken,
      }),
    ).rejects.toBeInstanceOf(RecoveryImportStalePlanError);
    const importedAttempts = await target.applyRecoveryImport(payload, {
      selectedCategories: defaultPlan.selectedCategories,
      expectedPlanToken: defaultPlan.planToken,
    });
    expect(importedAttempts.snapshot.attempts).toHaveLength(2);
    expect(importedAttempts.snapshot.settings.theme).toBe('system');

    const settingsPlan = await target.previewRecoveryImport(payload, {
      selectedCategories: ['settings'],
    });
    expect(settingsPlan.selectedCategories).toEqual(['settings']);
    const importedSettings = await target.applyRecoveryImport(payload, {
      selectedCategories: settingsPlan.selectedCategories,
      expectedPlanToken: settingsPlan.planToken,
    });
    expect(importedSettings.snapshot.settings).toMatchObject({
      theme: 'dark',
      dailyGoalMinutes: 20,
    });
    expect(importedSettings.snapshot.attempts).toHaveLength(2);

    await expect(target.previewRecoveryImport(payload, { selectedCategories: [] })).rejects.toThrow(
      'at least one',
    );
    await expect(
      target.previewRecoveryImport(payload, { selectedCategories: ['analysis-sessions'] }),
    ).rejects.toThrow('included');
  });

  it('rejects stable-ID conflicts and stale preview tokens without mutating local data', async () => {
    const source = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    await source.appendAttempt(attemptRecord());
    const payload = createRecoveryPayload(await source.load(), {
      appVersion: '0.1.0',
      bundleId: 'recovery-test-conflict',
      createdAt: CREATED_AT,
      categories: ['attempts'],
    });

    const conflictingAdapter = new InMemoryPersistenceAdapter();
    const conflicting = new LearningRepository(conflictingAdapter, {
      contentVersion: 'catalog-1',
      now: () => REOPENED_AT,
    });
    await conflicting.appendAttempt({ ...attemptRecord(), xpAwarded: 99 });
    const conflictPlan = await conflicting.previewRecoveryImport(payload);
    const beforeConflict = await conflictingAdapter.dump();
    expect(conflictPlan.canApply).toBe(false);
    expect(conflictPlan.conflicts).toHaveLength(1);
    await expect(
      conflicting.applyRecoveryImport(payload, {
        selectedCategories: conflictPlan.selectedCategories,
        expectedPlanToken: conflictPlan.planToken,
      }),
    ).rejects.toBeInstanceOf(RecoveryImportConflictError);
    expect(await conflictingAdapter.dump()).toBe(beforeConflict);

    const staleAdapter = new InMemoryPersistenceAdapter();
    const stale = new LearningRepository(staleAdapter, {
      contentVersion: 'catalog-1',
      now: () => REOPENED_AT,
    });
    const stalePlan = await stale.previewRecoveryImport(payload);
    await stale.appendAttempt(attemptRecord('local-after-preview'));
    const beforeStaleApply = await staleAdapter.dump();
    await expect(
      stale.applyRecoveryImport(payload, {
        selectedCategories: stalePlan.selectedCategories,
        expectedPlanToken: stalePlan.planToken,
      }),
    ).rejects.toBeInstanceOf(RecoveryImportStalePlanError);
    expect(await staleAdapter.dump()).toBe(beforeStaleApply);
  });

  it('persists and reloads an independently answered capstone attempt', async () => {
    const adapter = new InMemoryPersistenceAdapter();
    const repository = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    const base = attemptRecord('capstone-attempt');
    const capstoneRecord: NewAttemptRecord = {
      ...base,
      attempt: {
        ...base.attempt,
        exerciseId: 'u10-capstone-e03',
        answer: {
          kind: 'capstone',
          stepAnswers: [
            {
              stepId: 'context',
              answer: { kind: 'selection', selectedIds: ['weekly-uptrend'] },
            },
            {
              stepId: 'management',
              answer: {
                kind: 'decision',
                decision: 'no-trade',
                reasonIds: ['no-open-position'],
              },
            },
          ],
        },
      },
    };

    await repository.appendAttempt(capstoneRecord);
    const reopened = await new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => REOPENED_AT,
    }).initialize();

    expect(reopened.attempts[0]?.attempt.answer).toEqual(capstoneRecord.attempt.answer);
  });

  it('persists label coordinates instead of UI-derived correctness tokens', async () => {
    const adapter = new InMemoryPersistenceAdapter();
    const repository = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    const base = attemptRecord('label-attempt');
    const record: NewAttemptRecord = {
      ...base,
      attempt: {
        ...base.attempt,
        answer: {
          kind: 'label-placement',
          placements: [{ labelId: 'high-top', anchor: { candleIndex: 12, price: 103.5 } }],
        },
      },
    };

    const stored = await repository.appendAttempt(record);
    expect(stored.attempt.attempt.answer).toEqual(record.attempt.answer);
  });

  it('expires the current streak after a missed local calendar day', async () => {
    const adapter = new InMemoryPersistenceAdapter();
    const repository = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    await repository.appendAttempt(attemptRecord());

    const afterMissedDay = await new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => '2026-08-23T08:00:00.000Z',
    }).initialize();

    expect(afterMissedDay.projections.currentStreak).toBe(0);
    expect(afterMissedDay.projections.longestStreak).toBe(1);
  });

  it('rejects reuse of an attempt ID with different immutable data', async () => {
    const adapter = new InMemoryPersistenceAdapter();
    const repository = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    await repository.appendAttempt(attemptRecord());

    await expect(
      repository.appendAttempt({ ...attemptRecord(), xpAwarded: 999 }),
    ).rejects.toBeInstanceOf(AttemptConflictError);
    expect((await repository.load()).projections.totalXp).toBe(12);
  });

  it('migrates schema and content metadata without rewriting attempts or progress', async () => {
    const record: PersistedAttempt = {
      ...attemptRecord(),
      schemaVersion: ATTEMPT_RECORD_SCHEMA_VERSION,
    };
    const legacy: PersistenceSnapshotV1 = {
      schemaVersion: 1,
      contentVersion: 'catalog-1',
      createdAt: CREATED_AT,
      updatedAt: SUBMITTED_AT,
      settings: DEFAULT_SETTINGS,
      attempts: [record],
    };
    const adapter = new InMemoryPersistenceAdapter(JSON.stringify(legacy));
    const repository = new LearningRepository(adapter, {
      contentVersion: 'catalog-2',
      now: () => REOPENED_AT,
    });

    const migrated = await repository.initialize();

    expect(migrated.metadata).toMatchObject({
      schemaVersion: CURRENT_PERSISTENCE_SCHEMA_VERSION,
      contentVersion: 'catalog-2',
      createdAt: CREATED_AT,
      updatedAt: REOPENED_AT,
    });
    expect(migrated.attempts).toHaveLength(1);
    expect(migrated.attempts[0]?.attempt).toEqual(attempt());
    expect(migrated.attempts[0]?.attempt.contentVersionId).toBe('catalog-1');
    expect(migrated.projections.lessonProgress['lesson-market-structure']?.status).toBe(
      'completed',
    );

    const afterContentMigration = await repository.migrateContent(
      'catalog-3',
      '2026-08-22T08:00:00.000Z',
    );
    expect(afterContentMigration.metadata.contentVersion).toBe('catalog-3');
    expect(afterContentMigration.attempts).toEqual(migrated.attempts);
    expect(afterContentMigration.projections).toMatchObject({
      lessonProgress: migrated.projections.lessonProgress,
      skillMastery: migrated.projections.skillMastery,
      reviewState: migrated.projections.reviewState,
      dailyActivity: migrated.projections.dailyActivity,
      totalXp: migrated.projections.totalXp,
      longestStreak: migrated.projections.longestStreak,
      currentStreak: 0,
    });
  });

  it('leaves an unknown future schema untouched instead of resetting it', async () => {
    const futureData = JSON.stringify({
      metadata: { schemaVersion: CURRENT_PERSISTENCE_SCHEMA_VERSION + 1 },
      attempts: [{ irreplaceable: true }],
    });
    const adapter = new InMemoryPersistenceAdapter(futureData);
    const repository = new LearningRepository(adapter, {
      contentVersion: 'catalog-2',
      now: () => REOPENED_AT,
    });

    await expect(repository.initialize()).rejects.toBeInstanceOf(
      UnsupportedPersistenceVersionError,
    );
    expect(await adapter.dump()).toBe(futureData);
  });

  it('allows an explicit learner reset to recover from an unreadable snapshot', async () => {
    const adapter = new InMemoryPersistenceAdapter('{not valid json');
    const repository = new LearningRepository(adapter, {
      contentVersion: 'catalog-2',
      now: () => REOPENED_AT,
    });

    await expect(repository.initialize()).rejects.toBeInstanceOf(Error);
    const recovered = await repository.reset();

    expect(recovered.attempts).toEqual([]);
    expect(recovered.metadata.contentVersion).toBe('catalog-2');
    expect(await adapter.dump()).not.toBe('{not valid json');
  });

  it('migrates a schema-2 snapshot with no sessions to the current schema', async () => {
    const seed = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    const current = await seed.initialize();
    const legacyV2 = {
      metadata: { ...current.metadata, schemaVersion: 2 },
      settings: current.settings,
      attempts: current.attempts,
      projections: current.projections,
    };
    const repository = new LearningRepository(
      new InMemoryPersistenceAdapter(JSON.stringify(legacyV2)),
      { contentVersion: 'catalog-1', now: () => REOPENED_AT },
    );

    const migrated = await repository.initialize();

    expect(migrated.metadata.schemaVersion).toBe(CURRENT_PERSISTENCE_SCHEMA_VERSION);
    expect(migrated.analysisSessions).toEqual([]);
    expect(migrated.quarantinedAnalysisSessions).toEqual([]);
  });

  it('migrates every schema-3 session to synthetic v2 without losing learner data', async () => {
    const seed = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    const seeded = await seed.appendAttempt(attemptRecord());
    const toLegacy = (session: GuidedAnalysisSession, withCheckpoint: boolean) => {
      const { kind: _kind, ...chart } = session.chart as Extract<
        GuidedAnalysisSession['chart'],
        { kind: 'synthetic' }
      >;
      return {
        ...session,
        schemaVersion: 1,
        chart,
        replay: {
          cursorCandleIndex: session.replay.cursorCandleIndex,
          decisionCandleIndex: session.replay.decisionCandleIndex,
          checkpoints: withCheckpoint
            ? [
                {
                  id: `checkpoint:${session.sessionId}:1`,
                  stepId: 'context',
                  cursorCandleIndex: 40,
                  capturedAt: session.createdAt,
                },
                {
                  id: `checkpoint:${session.sessionId}:2`,
                  stepId: 'structure',
                  cursorCandleIndex: 8,
                  capturedAt: session.createdAt,
                },
              ]
            : [],
        },
      };
    };
    const active = activeSession('legacy-active');
    const finalized = finalizedSession(activeSession('legacy-finalized'));
    const quarantine = {
      quarantineId: 'existing-quarantine',
      sessionId: 'older-damaged-session',
      reason: 'Retained for recovery.',
      payloadJson: '{"damaged":true}',
      quarantinedAt: CREATED_AT,
    };
    const legacyV3 = {
      ...seeded.snapshot,
      metadata: { ...seeded.snapshot.metadata, schemaVersion: 3 },
      settings: { ...seeded.snapshot.settings, reducedMotion: true },
      analysisSessions: [toLegacy(active, true), toLegacy(finalized, false)],
      quarantinedAnalysisSessions: [quarantine],
    };
    const repository = new LearningRepository(
      new InMemoryPersistenceAdapter(JSON.stringify(legacyV3)),
      { contentVersion: 'catalog-1', now: () => REOPENED_AT },
    );

    const migrated = await repository.initialize();

    expect(migrated.metadata.schemaVersion).toBe(CURRENT_PERSISTENCE_SCHEMA_VERSION);
    expect(migrated.attempts).toEqual(seeded.snapshot.attempts);
    expect(migrated.settings).toEqual(legacyV3.settings);
    expect(migrated.projections).toEqual(seeded.snapshot.projections);
    expect(migrated.quarantinedAnalysisSessions).toEqual([quarantine]);
    expect(migrated.analysisSessions).toHaveLength(2);
    expect(migrated.analysisSessions.map(({ status }) => status)).toEqual(['active', 'finalized']);
    const migratedActive = migrated.analysisSessions[0]!;
    expect(migratedActive.chart).toMatchObject({ kind: 'synthetic', seed: 91003 });
    expect(migratedActive.replay).toMatchObject({
      initialCursorCandleIndex: 0,
      cursorCandleIndex: 23,
      maxCursorSeenCandleIndex: 40,
    });
    expect(migratedActive.replay.checkpoints[0]).toMatchObject({
      sequence: 1,
      maxCursorSeenCandleIndex: 40,
      annotations: [],
    });
    expect(migratedActive.replay.checkpoints[1]).toMatchObject({
      sequence: 2,
      maxCursorSeenCandleIndex: 40,
      annotations: [],
    });
  });

  it('creates or resumes one active identity and accepts a higher revision at the same timestamp', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    const first = activeSession();
    const duplicateIdentity = activeSession('analysis-session-duplicate');

    const created = await repository.createOrResumeAnalysisSession(first);
    const resumed = await repository.createOrResumeAnalysisSession(duplicateIdentity);
    const saved = await repository.saveAnalysisSession({
      ...first,
      revision: 1,
      replay: {
        ...first.replay,
        cursorCandleIndex: 24,
        maxCursorSeenCandleIndex: 24,
      },
    });

    expect(created.created).toBe(true);
    expect(resumed.created).toBe(false);
    expect(resumed.session.sessionId).toBe(first.sessionId);
    expect(saved.saved).toBe(true);
    expect(saved.session.revision).toBe(1);
    expect(await repository.listAnalysisSessions()).toHaveLength(1);
    await expect(repository.saveAnalysisSession(first)).rejects.toBeInstanceOf(
      AnalysisSessionConflictError,
    );
  });

  it('enforces replay checkpoints as an exact append-only prefix', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    const active = activeSession();
    await repository.createOrResumeAnalysisSession(active);
    const firstCheckpoint = {
      id: 'checkpoint-1',
      sequence: 1,
      stepId: 'context' as const,
      cursorCandleIndex: 23,
      maxCursorSeenCandleIndex: 23,
      annotations: [],
      capturedAt: CREATED_AT,
    };
    const withFirst = {
      ...active,
      revision: 1,
      replay: { ...active.replay, checkpoints: [firstCheckpoint] },
    };
    await repository.saveAnalysisSession(withFirst);

    await expect(
      repository.saveAnalysisSession({
        ...withFirst,
        revision: 2,
        replay: { ...withFirst.replay, checkpoints: [] },
      }),
    ).rejects.toBeInstanceOf(AnalysisSessionConflictError);
    await expect(
      repository.saveAnalysisSession({
        ...withFirst,
        revision: 2,
        replay: {
          ...withFirst.replay,
          checkpoints: [{ ...firstCheckpoint, id: 'mutated-checkpoint' }],
        },
      }),
    ).rejects.toBeInstanceOf(AnalysisSessionConflictError);

    const secondCheckpoint = {
      ...firstCheckpoint,
      id: 'checkpoint-2',
      sequence: 2,
      stepId: 'structure' as const,
    };
    const withSecond = {
      ...withFirst,
      revision: 2,
      replay: { ...withFirst.replay, checkpoints: [firstCheckpoint, secondCheckpoint] },
    };
    await repository.saveAnalysisSession(withSecond);
    await expect(
      repository.saveAnalysisSession({
        ...withSecond,
        revision: 3,
        replay: {
          ...withSecond.replay,
          checkpoints: [
            { ...secondCheckpoint, sequence: 1 },
            { ...firstCheckpoint, sequence: 2 },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(AnalysisSessionConflictError);
  });

  it('resumes exact historical evidence and rejects a changed checksum until abandon', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    const pinned = historicalSession('historical-pinned');
    await repository.createOrResumeAnalysisSession(pinned);

    const resumed = await repository.createOrResumeAnalysisSession(
      historicalSession('historical-retry'),
    );
    expect(resumed.created).toBe(false);
    expect(resumed.session.sessionId).toBe(pinned.sessionId);
    await expect(
      repository.createOrResumeAnalysisSession(
        historicalSession('historical-modified', `sha256:${'b'.repeat(64)}`),
      ),
    ).rejects.toBeInstanceOf(AnalysisSessionConflictError);

    await repository.abandonAnalysisSession(pinned.sessionId, REOPENED_AT);
    const replacement = await repository.createOrResumeAnalysisSession(
      historicalSession('historical-modified', `sha256:${'b'.repeat(64)}`),
    );
    expect(replacement.created).toBe(true);
  });

  it('restarts an active draft without deleting immutable attempts', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    await repository.appendAttempt(attemptRecord());
    await repository.createOrResumeAnalysisSession(activeSession());

    const restarted = await repository.restartAnalysisSession(
      'analysis-session-1',
      activeSession('analysis-session-2', 0, REOPENED_AT),
      REOPENED_AT,
    );

    expect(restarted.snapshot.attempts).toHaveLength(1);
    expect(restarted.snapshot.projections.totalXp).toBe(12);
    expect(restarted.snapshot.analysisSessions).toHaveLength(2);
    expect(restarted.snapshot.analysisSessions[0]?.status).toBe('abandoned');
    expect(restarted.snapshot.analysisSessions[1]?.status).toBe('active');
  });

  it('quarantines a corrupt draft while preserving attempts and projections', async () => {
    const adapter = new InMemoryPersistenceAdapter();
    const seed = new LearningRepository(adapter, {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    const withAttempt = await seed.appendAttempt(attemptRecord());
    const corrupt = {
      ...withAttempt.snapshot,
      analysisSessions: [{ schemaVersion: 99, sessionId: 'damaged-session', revision: 0 }],
    };
    const repository = new LearningRepository(
      new InMemoryPersistenceAdapter(JSON.stringify(corrupt)),
      { contentVersion: 'catalog-1', now: () => REOPENED_AT },
    );

    const recovered = await repository.initialize();

    expect(recovered.attempts).toHaveLength(1);
    expect(recovered.projections.totalXp).toBe(12);
    expect(recovered.analysisSessions).toEqual([]);
    expect(recovered.quarantinedAnalysisSessions).toHaveLength(1);
    expect(recovered.quarantinedAnalysisSessions[0]?.sessionId).toBe('damaged-session');

    const cleared = await repository.discardQuarantinedAnalysisSessions(
      [recovered.quarantinedAnalysisSessions[0]!.quarantineId],
      FINALIZED_AT,
    );
    expect(cleared.quarantinedAnalysisSessions).toEqual([]);
    expect(cleared.attempts).toHaveLength(1);
    expect(cleared.projections.totalXp).toBe(12);
  });

  it('finalizes session and attempt atomically and projects an idempotent retry once', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => FINALIZED_AT,
    });
    const active = activeSession();
    const finalized = finalizedSession(active);
    await repository.createOrResumeAnalysisSession(active);
    const input = { session: finalized, attemptRecord: finalizationAttempt(finalized) };

    const inserted = await repository.finalizeAnalysisSession(input);
    const retried = await repository.finalizeAnalysisSession(input);

    expect(inserted.inserted).toBe(true);
    expect(retried.inserted).toBe(false);
    expect(retried.snapshot.attempts).toHaveLength(1);
    expect(retried.snapshot.projections.totalXp).toBe(20);
    expect(retried.snapshot.projections.skillMastery['workflow.eleven-step']?.attemptCount).toBe(1);
    expect(retried.session.status).toBe('finalized');
    await expect(
      repository.finalizeAnalysisSession({
        session: finalized,
        attemptRecord: { ...input.attemptRecord, xpAwarded: 999 },
      }),
    ).rejects.toBeInstanceOf(AttemptConflictError);
    expect((await repository.load()).projections.totalXp).toBe(20);
  });

  it('finalizes non-credit historical practice without an attempt or projection changes', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => FINALIZED_AT,
    });
    await repository.appendAttempt(attemptRecord());
    const active = historicalSession('practice-session');
    await repository.createOrResumeAnalysisSession(active);
    const before = await repository.load();
    const finalized = finalizedSession(active);

    const first = await repository.finalizePracticeAnalysisSession(finalized);
    const retry = await repository.finalizePracticeAnalysisSession(finalized);

    expect(first.inserted).toBe(true);
    expect(retry.inserted).toBe(false);
    expect(retry.snapshot.attempts).toEqual(before.attempts);
    expect(retry.snapshot.projections).toEqual(before.projections);
    await expect(
      repository.finalizePracticeAnalysisSession({
        ...finalized,
        finalResult: { ...finalized.finalResult!, score: 0 },
      }),
    ).rejects.toBeInstanceOf(AnalysisSessionConflictError);
    await expect(
      repository.finalizeAnalysisSession({
        session: finalized,
        attemptRecord: creditedHistoricalAttempt(finalized),
      }),
    ).rejects.toBeInstanceOf(AnalysisSessionConflictError);
  });

  it('requires exact pinned evidence before credited historical finalization', async () => {
    const repository = new LearningRepository(new InMemoryPersistenceAdapter(), {
      contentVersion: 'catalog-1',
      now: () => FINALIZED_AT,
    });
    const active = historicalSession('credited-session', `sha256:${'c'.repeat(64)}`, 'course');
    const finalized = finalizedSession(active);
    await repository.createOrResumeAnalysisSession(active);
    const { analysisChartIdentity: _identity, ...missingEvidence } =
      creditedHistoricalAttempt(finalized);

    await expect(
      repository.finalizeAnalysisSession({ session: finalized, attemptRecord: missingEvidence }),
    ).rejects.toBeInstanceOf(AnalysisSessionConflictError);
    await expect(
      repository.finalizeAnalysisSession({
        session: finalized,
        attemptRecord: {
          ...missingEvidence,
          analysisChartIdentity: historicalSession(
            'other-evidence',
            `sha256:${'d'.repeat(64)}`,
            'course',
          ).chart,
        },
      }),
    ).rejects.toBeInstanceOf(AnalysisSessionConflictError);

    const result = await repository.finalizeAnalysisSession({
      session: finalized,
      attemptRecord: creditedHistoricalAttempt(finalized),
    });
    expect(result.inserted).toBe(true);
    expect(result.attempt.analysisChartIdentity).toEqual(finalized.chart);
  });

  it('shares create-or-resume semantics across web repository instances', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const options = { storage, storageKey: 'analysis-session-parity' };
    const first = new LearningRepository(new LocalStoragePersistenceAdapter(options), {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });
    const second = new LearningRepository(new LocalStoragePersistenceAdapter(options), {
      contentVersion: 'catalog-1',
      now: () => CREATED_AT,
    });

    const [left, right] = await Promise.all([
      first.createOrResumeAnalysisSession(activeSession('web-session-a')),
      second.createOrResumeAnalysisSession(activeSession('web-session-b')),
    ]);

    expect([left.created, right.created].filter(Boolean)).toHaveLength(1);
    expect(left.session.sessionId).toBe(right.session.sessionId);
    expect(await first.listAnalysisSessions()).toHaveLength(1);
  });
});
