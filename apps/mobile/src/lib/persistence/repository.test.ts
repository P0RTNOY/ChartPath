import type { Attempt, GuidedAnalysisSession } from '@chartpath/domain';

interface TestMatchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toHaveLength(expected: number): void;
  toMatchObject(expected: unknown): void;
  toBeInstanceOf(expected: unknown): void;
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
        session?.schemaVersion !== 1 ||
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
  UnsupportedPersistenceVersionError,
} from './adapter';
import { InMemoryPersistenceAdapter } from './in-memory-adapter';
import { LocalStoragePersistenceAdapter } from './local-storage-adapter';
import { LearningRepository } from './repository';
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
    schemaVersion: 1,
    revision,
    sessionId,
    attemptId: `analysis-attempt:${sessionId}`,
    finalizationIdempotencyKey: `analysis-finalize:${sessionId}`,
    exerciseId: 'u10-capstone-e03',
    contentVersionId: 'catalog-1',
    exerciseSchemaVersion: 1,
    chart: {
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
    replay: { cursorCandleIndex: 23, decisionCandleIndex: 71, checkpoints: [] },
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

describe('LearningRepository', () => {
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

  it('migrates a schema-2 snapshot with no sessions to schema 3', async () => {
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

    expect(migrated.metadata.schemaVersion).toBe(3);
    expect(migrated.analysisSessions).toEqual([]);
    expect(migrated.quarantinedAnalysisSessions).toEqual([]);
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
      replay: { ...first.replay, cursorCandleIndex: 24 },
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
