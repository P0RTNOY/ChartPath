import type { ReviewState, SkillId } from './types.js';

export type ReviewRating = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewOutcome {
  readonly reviewedAt: string;
  readonly rating: ReviewRating;
  readonly masteryScore: number;
}

const DAY_MS = 86_400_000;

function requireTimestamp(value: string, field: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new RangeError(`${field} must be a valid timestamp`);
  return timestamp;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function addDays(timestamp: number, days: number): string {
  return new Date(timestamp + days * DAY_MS).toISOString();
}

export function createReviewState(skillId: SkillId, dueAt: string, masteryScore = 0): ReviewState {
  const timestamp = requireTimestamp(dueAt, 'dueAt');
  if (!Number.isFinite(masteryScore) || masteryScore < 0 || masteryScore > 1) {
    throw new RangeError('masteryScore must be between 0 and 1');
  }
  return {
    skillId,
    lastReviewAt: null,
    nextDueAt: new Date(timestamp).toISOString(),
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapseCount: 0,
    masteryScore,
  };
}

/** Deterministic SM-2 scheduling. Ratings below 3 reset the successful repetition chain. */
export function scheduleReview(current: ReviewState, outcome: ReviewOutcome): ReviewState {
  const reviewedAt = requireTimestamp(outcome.reviewedAt, 'reviewedAt');
  if (!Number.isInteger(outcome.rating) || outcome.rating < 0 || outcome.rating > 5) {
    throw new RangeError('rating must be an integer between 0 and 5');
  }
  if (
    !Number.isFinite(outcome.masteryScore) ||
    outcome.masteryScore < 0 ||
    outcome.masteryScore > 1
  ) {
    throw new RangeError('masteryScore must be between 0 and 1');
  }

  const qualityGap = 5 - outcome.rating;
  const easeFactor = clamp(
    current.easeFactor + (0.1 - qualityGap * (0.08 + qualityGap * 0.02)),
    1.3,
    3,
  );
  const failed = outcome.rating < 3;
  const repetitions = failed ? 0 : current.repetitions + 1;
  const intervalDays = failed
    ? 1
    : repetitions === 1
      ? 1
      : repetitions === 2
        ? 6
        : Math.max(1, Math.round(current.intervalDays * easeFactor));

  return {
    skillId: current.skillId,
    lastReviewAt: new Date(reviewedAt).toISOString(),
    nextDueAt: addDays(reviewedAt, intervalDays),
    intervalDays,
    easeFactor,
    repetitions,
    lapseCount: current.lapseCount + (failed ? 1 : 0),
    masteryScore: outcome.masteryScore,
  };
}

export function isReviewDue(state: ReviewState, at: string): boolean {
  return requireTimestamp(state.nextDueAt, 'nextDueAt') <= requireTimestamp(at, 'at');
}
