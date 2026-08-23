import {
  createReviewState,
  scheduleReview,
  updateSkillMastery,
  type DailyActivity,
  type LessonId,
  type ReviewRating,
  type ReviewState,
  type SkillId,
  type SkillMastery,
} from '@chartpath/domain';

import {
  CURRENT_PROJECTOR_VERSION,
  type LearningProjections,
  type LessonProgress,
  type PersistedAttempt,
} from './types';

const DAY_MS = 86_400_000;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareAttempts(left: PersistedAttempt, right: PersistedAttempt): number {
  return (
    Date.parse(left.attempt.submittedAt) - Date.parse(right.attempt.submittedAt) ||
    compareStrings(left.attempt.id, right.attempt.id)
  );
}

function reviewRating(record: PersistedAttempt): ReviewRating {
  const { result } = record.attempt;
  if (!result.correct) return result.score >= 0.4 ? 2 : 1;
  if (result.score >= 0.95 && record.attempt.hintIdsUsed.length === 0) return 5;
  if (result.score >= 0.8) return 4;
  return 3;
}

function distinct<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function calendarDayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / DAY_MS;
}

function applyDailyStreaks(activity: Readonly<Record<string, DailyActivity>>): {
  readonly activity: Readonly<Record<string, DailyActivity>>;
  readonly currentStreak: number;
  readonly longestStreak: number;
} {
  const dates = Object.keys(activity).sort();
  const result: Record<string, DailyActivity> = {};
  let previousDay: number | undefined;
  let currentStreak = 0;
  let longestStreak = 0;

  for (const date of dates) {
    const daily = activity[date];
    if (!daily) continue;
    const day = calendarDayNumber(date);
    currentStreak = previousDay !== undefined && day - previousDay === 1 ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    result[date] = { ...daily, streakCount: currentStreak };
    previousDay = day;
  }

  return { activity: result, currentStreak, longestStreak };
}

/**
 * Rebuilds every projection from the immutable attempt stream. The sort tie-breaker
 * makes the result independent from adapter enumeration order.
 */
export function replayAttempts(attempts: readonly PersistedAttempt[]): LearningProjections {
  const lessonProgress: Record<LessonId, LessonProgress> = {};
  const skillMastery: Record<SkillId, SkillMastery> = {};
  const reviewState: Record<SkillId, ReviewState> = {};
  const dailyActivity: Record<string, DailyActivity> = {};
  const ordered = [...attempts].sort(compareAttempts);
  let totalXp = 0;

  for (const record of ordered) {
    const { attempt } = record;
    totalXp += record.xpAwarded;

    const previousLesson = lessonProgress[record.lessonId];
    const completedAt =
      previousLesson?.completedAt ?? (record.completesLesson ? attempt.submittedAt : null);
    lessonProgress[record.lessonId] = {
      lessonId: record.lessonId,
      status: completedAt ? 'completed' : 'in-progress',
      attemptCount: (previousLesson?.attemptCount ?? 0) + 1,
      correctAttemptCount:
        (previousLesson?.correctAttemptCount ?? 0) + (attempt.result.correct ? 1 : 0),
      earnedXp: (previousLesson?.earnedXp ?? 0) + record.xpAwarded,
      attemptedExerciseIds: distinct([
        ...(previousLesson?.attemptedExerciseIds ?? []),
        attempt.exerciseId,
      ]),
      lastAttemptAt: attempt.submittedAt,
      completedAt,
    };

    for (const skillId of record.skillIds) {
      const mastery = updateSkillMastery(skillMastery[skillId], {
        skillId,
        attemptedAt: attempt.submittedAt,
        correct: attempt.result.correct,
        score: attempt.result.score,
        difficulty: record.difficulty,
        hintsUsed: attempt.hintIdsUsed.length,
        misconceptionIds: attempt.result.misconceptionIds,
        isReview: record.isReview,
        responseTimeMs: attempt.responseTimeMs,
      });
      skillMastery[skillId] = mastery;
      reviewState[skillId] = scheduleReview(
        reviewState[skillId] ?? createReviewState(skillId, attempt.submittedAt),
        {
          reviewedAt: attempt.submittedAt,
          rating: reviewRating(record),
          masteryScore: mastery.score,
        },
      );
    }

    const previousDaily = dailyActivity[record.activityDate];
    dailyActivity[record.activityDate] = {
      date: record.activityDate,
      goalMinutes: record.dailyGoalMinutes,
      activeMinutes: (previousDaily?.activeMinutes ?? 0) + record.activeMinutes,
      xp: (previousDaily?.xp ?? 0) + record.xpAwarded,
      streakCount: 0,
      completedLessonIds: record.completesLesson
        ? distinct([...(previousDaily?.completedLessonIds ?? []), record.lessonId])
        : (previousDaily?.completedLessonIds ?? []),
      reviewCount: (previousDaily?.reviewCount ?? 0) + (record.isReview ? 1 : 0),
      attemptIds: [...(previousDaily?.attemptIds ?? []), attempt.id],
    };
  }

  const streaks = applyDailyStreaks(dailyActivity);
  return {
    projectorVersion: CURRENT_PROJECTOR_VERSION,
    lastAppliedAttemptId: ordered.at(-1)?.attempt.id ?? null,
    lessonProgress,
    skillMastery,
    reviewState,
    dailyActivity: streaks.activity,
    totalXp,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
  };
}
