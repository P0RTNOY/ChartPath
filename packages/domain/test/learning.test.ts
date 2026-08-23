import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  buildDailyPath,
  createDisabledTutorProvider,
  createReviewState,
  createSkillMastery,
  isReviewDue,
  scheduleReview,
  updateSkillMastery,
  type AttemptResult,
  type Lesson,
  type SkillMastery,
} from '../src/index.js';

const NOW = '2026-08-23T09:00:00.000Z';

describe('mastery', () => {
  it('updates deterministically and ignores response time', () => {
    const baseline = createSkillMastery('structure', NOW);
    const evidence = {
      skillId: 'structure',
      attemptedAt: NOW,
      correct: true,
      score: 1,
      difficulty: 3,
      hintsUsed: 0,
      misconceptionIds: [],
      isReview: false,
    } as const;
    expect(updateSkillMastery(baseline, { ...evidence, responseTimeMs: 1_000 })).toEqual(
      updateSkillMastery(baseline, { ...evidence, responseTimeMs: 100_000 }),
    );
  });

  it('gives less mastery evidence after hints', () => {
    const baseline = createSkillMastery('levels', NOW);
    const baseEvidence = {
      skillId: 'levels',
      attemptedAt: NOW,
      correct: true,
      score: 1,
      difficulty: 3,
      misconceptionIds: [],
      isReview: false,
    } as const;
    const withoutHints = updateSkillMastery(baseline, { ...baseEvidence, hintsUsed: 0 });
    const withHints = updateSkillMastery(baseline, { ...baseEvidence, hintsUsed: 3 });
    expect(withHints.score).toBeLessThan(withoutHints.score);
  });

  it('tracks and discounts a repeated misconception', () => {
    const first = updateSkillMastery(undefined, {
      skillId: 'confirmation',
      attemptedAt: '2026-08-20T09:00:00Z',
      correct: false,
      score: 0,
      difficulty: 2,
      hintsUsed: 0,
      misconceptionIds: ['bias-is-confirmation'],
      isReview: false,
    });
    const repeated = updateSkillMastery(first, {
      skillId: 'confirmation',
      attemptedAt: NOW,
      correct: true,
      score: 1,
      difficulty: 2,
      hintsUsed: 0,
      misconceptionIds: ['bias-is-confirmation'],
      isReview: true,
    });
    const clean = updateSkillMastery(first, {
      skillId: 'confirmation',
      attemptedAt: NOW,
      correct: true,
      score: 1,
      difficulty: 2,
      hintsUsed: 0,
      misconceptionIds: [],
      isReview: true,
    });
    expect(repeated.misconceptionCounts['bias-is-confirmation']).toBe(2);
    expect(repeated.score).toBeLessThan(clean.score);
  });

  it('keeps mastery within 0..1 under arbitrary attempt streams', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            correct: fc.boolean(),
            score: fc.double({ min: 0, max: 1, noNaN: true }),
            difficulty: fc.integer({ min: 1, max: 5 }),
            hintsUsed: fc.integer({ min: 0, max: 10 }),
            isReview: fc.boolean(),
          }),
          { minLength: 1, maxLength: 200 },
        ),
        (attempts) => {
          let mastery: SkillMastery | undefined;
          for (const [index, attempt] of attempts.entries()) {
            mastery = updateSkillMastery(mastery, {
              ...attempt,
              difficulty: attempt.difficulty as 1 | 2 | 3 | 4 | 5,
              skillId: 'risk',
              attemptedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
              misconceptionIds: [],
            });
            expect(mastery.score).toBeGreaterThanOrEqual(0);
            expect(mastery.score).toBeLessThanOrEqual(1);
          }
        },
      ),
    );
  });
});

describe('SM-2 review scheduling', () => {
  it('uses one day, six days, then ease-scaled intervals for successful reviews', () => {
    const initial = createReviewState('trend', NOW, 0.2);
    const first = scheduleReview(initial, { reviewedAt: NOW, rating: 5, masteryScore: 0.4 });
    const second = scheduleReview(first, {
      reviewedAt: first.nextDueAt,
      rating: 5,
      masteryScore: 0.6,
    });
    const third = scheduleReview(second, {
      reviewedAt: second.nextDueAt,
      rating: 4,
      masteryScore: 0.7,
    });
    expect(first.intervalDays).toBe(1);
    expect(second.intervalDays).toBe(6);
    expect(third.intervalDays).toBeGreaterThan(6);
    expect(third.repetitions).toBe(3);
  });

  it('resets failed reviews, increments lapses, and makes them due the next day', () => {
    const learned = {
      ...createReviewState('levels', NOW, 0.7),
      repetitions: 4,
      intervalDays: 20,
      easeFactor: 2.4,
    };
    const failed = scheduleReview(learned, { reviewedAt: NOW, rating: 2, masteryScore: 0.55 });
    expect(failed).toMatchObject({ repetitions: 0, intervalDays: 1, lapseCount: 1 });
    expect(isReviewDue(failed, '2026-08-24T08:59:59.999Z')).toBe(false);
    expect(isReviewDue(failed, '2026-08-24T09:00:00.000Z')).toBe(true);
  });

  it('is deterministic for the same prior state and explicit timestamp', () => {
    const state = createReviewState('volume', NOW);
    const outcome = { reviewedAt: NOW, rating: 4, masteryScore: 0.4 } as const;
    expect(scheduleReview(state, outcome)).toEqual(scheduleReview(state, outcome));
  });
});

function lesson(id: string, order: number, prerequisites: readonly string[] = []): Lesson {
  return {
    id,
    unitId: 'unit-1',
    order,
    titleHe: id,
    summaryHe: id,
    skillIds: [`skill-${id}`],
    prerequisiteLessonIds: prerequisites,
    exerciseIds: [],
    estimatedMinutes: 5,
    sourceReferences: [{ sourceId: 'book', pageStart: 1, pageEnd: 1 }],
    editorialStatus: 'reviewed',
    schemaVersion: 1,
  };
}

describe('daily path', () => {
  it('prioritizes prerequisites, current work, due reviews, weak skills, then new material', () => {
    const lessons = [
      lesson('foundation', 1),
      lesson('structure', 2, ['foundation']),
      lesson('confirmation', 3, ['structure']),
      lesson('new', 4),
    ];
    const due = {
      ...createReviewState('due-skill', '2026-08-20T09:00:00Z'),
      nextDueAt: '2026-08-22T09:00:00Z',
    };
    const weak: SkillMastery = {
      ...createSkillMastery('weak-skill', NOW),
      score: 0.3,
    };
    expect(
      buildDailyPath({
        now: NOW,
        limit: 10,
        lessons,
        currentLessonId: 'confirmation',
        completedLessonIds: [],
        reviewStates: [due],
        masteries: [weak],
      }).map((item) => item.reason),
    ).toEqual([
      'required-prerequisite',
      'required-prerequisite',
      'current-lesson',
      'due-review',
      'weak-skill',
      'new-material',
    ]);
  });

  it('deduplicates a due skill from the weak-skill queue and obeys the limit', () => {
    const due = createReviewState('same-skill', '2026-08-20T09:00:00Z');
    const weak = { ...createSkillMastery('same-skill', NOW), score: 0.1 };
    const path = buildDailyPath({
      now: NOW,
      limit: 1,
      lessons: [lesson('new', 1)],
      completedLessonIds: [],
      reviewStates: [due],
      masteries: [weak],
    });
    expect(path).toHaveLength(1);
    expect(path[0]?.reason).toBe('due-review');
  });
});

describe('disabled tutor contract', () => {
  it('uses a local fallback and preserves the deterministic grade', async () => {
    const deterministicResult: AttemptResult = {
      correct: false,
      score: 0,
      feedbackCode: 'decision-not-accepted',
      details: [],
      misconceptionIds: ['prediction-without-confirmation'],
      graderVersion: '1.0.0',
    };
    const provider = createDisabledTutorProvider();
    const explanation = await provider.explain({
      exerciseId: 'wait-for-confirmation',
      promptHe: 'מה עושים לפני אישור?',
      rubric: { kind: 'decision', acceptedDecisions: ['wait'] },
      deterministicResult,
      approvedSourceContextHe: 'הטיה כיוונית אינה אישור.',
      sourceReferences: [{ sourceId: 'book', pageStart: 42, pageEnd: 42 }],
    });
    expect(provider.status).toBe('disabled');
    expect(explanation.source).toBe('safe-local-fallback');
    expect(explanation.deterministicResult).toBe(deterministicResult);
  });
});
