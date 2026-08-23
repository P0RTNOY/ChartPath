import type { Attempt } from '@chartpath/domain';

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

import { AttemptConflictError, UnsupportedPersistenceVersionError } from './adapter';
import { InMemoryPersistenceAdapter } from './in-memory-adapter';
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
});
