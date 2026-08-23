import type { Difficulty, MisconceptionId, SkillId, SkillMastery } from './types.js';

export interface MasteryEvidence {
  readonly skillId: SkillId;
  readonly attemptedAt: string;
  readonly correct: boolean;
  /** Grader score in the inclusive range 0..1. */
  readonly score: number;
  readonly difficulty: Difficulty;
  readonly hintsUsed: number;
  readonly misconceptionIds: readonly MisconceptionId[];
  readonly isReview: boolean;
  /** Accepted for diagnostics, deliberately ignored by the update calculation. */
  readonly responseTimeMs?: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function validTimestamp(timestamp: string): boolean {
  return Number.isFinite(Date.parse(timestamp));
}

export function createSkillMastery(skillId: SkillId, at: string): SkillMastery {
  if (!validTimestamp(at)) throw new RangeError('at must be a valid timestamp');
  return {
    skillId,
    score: 0,
    attemptCount: 0,
    correctAttemptCount: 0,
    reviewAttemptCount: 0,
    totalHintsUsed: 0,
    misconceptionCounts: {},
    updatedAt: at,
  };
}

/**
 * Transparent mastery update. Correctness and rubric score set the target; difficulty controls how
 * much evidence the attempt contributes. Hints and repeated misconceptions lower confidence, while
 * response time is intentionally excluded for accessibility and language fairness.
 */
export function updateSkillMastery(
  current: SkillMastery | undefined,
  evidence: MasteryEvidence,
): SkillMastery {
  if (!validTimestamp(evidence.attemptedAt)) {
    throw new RangeError('attemptedAt must be a valid timestamp');
  }
  if (!Number.isFinite(evidence.score) || evidence.score < 0 || evidence.score > 1) {
    throw new RangeError('score must be between 0 and 1');
  }
  if (!Number.isInteger(evidence.hintsUsed) || evidence.hintsUsed < 0) {
    throw new RangeError('hintsUsed must be a non-negative integer');
  }
  if (current && current.skillId !== evidence.skillId) {
    throw new RangeError('mastery and evidence skill IDs must match');
  }
  const previous = current ?? createSkillMastery(evidence.skillId, evidence.attemptedAt);
  const misconceptionCounts: Record<MisconceptionId, number> = {
    ...previous.misconceptionCounts,
  };
  let repeatedMisconceptions = 0;
  for (const id of evidence.misconceptionIds) {
    repeatedMisconceptions += misconceptionCounts[id] ?? 0;
    misconceptionCounts[id] = (misconceptionCounts[id] ?? 0) + 1;
  }

  const hintFactor = clamp(1 - evidence.hintsUsed * 0.1, 0.55, 1);
  const misconceptionFactor = clamp(1 - repeatedMisconceptions * 0.05, 0.6, 1);
  const outcomeTarget = evidence.correct
    ? evidence.score * hintFactor * misconceptionFactor
    : evidence.score * 0.2;
  const difficultyWeight = 0.75 + evidence.difficulty * 0.1;
  const baseLearningRate = evidence.isReview ? 0.22 : 0.16;
  const learningRate = clamp(baseLearningRate * difficultyWeight, 0.08, 0.35);
  const score = clamp(previous.score + learningRate * (outcomeTarget - previous.score), 0, 1);

  return {
    skillId: evidence.skillId,
    score,
    attemptCount: previous.attemptCount + 1,
    correctAttemptCount: previous.correctAttemptCount + (evidence.correct ? 1 : 0),
    reviewAttemptCount: previous.reviewAttemptCount + (evidence.isReview ? 1 : 0),
    totalHintsUsed: previous.totalHintsUsed + evidence.hintsUsed,
    misconceptionCounts,
    updatedAt: evidence.attemptedAt,
  };
}
