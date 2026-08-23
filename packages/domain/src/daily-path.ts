import type { Lesson, LessonId, ReviewState, SkillMastery } from './types.js';
import { isReviewDue } from './review.js';

export type DailyPathReason =
  'required-prerequisite' | 'current-lesson' | 'due-review' | 'weak-skill' | 'new-material';

export interface DailyPathItem {
  readonly key: string;
  readonly reason: DailyPathReason;
  readonly priority: 1 | 2 | 3 | 4 | 5;
  readonly lessonId?: LessonId;
  readonly skillId?: string;
  readonly dueAt?: string;
}

export interface DailyPathInput {
  readonly now: string;
  readonly limit: number;
  readonly lessons: readonly Lesson[];
  readonly currentLessonId?: LessonId;
  readonly completedLessonIds: readonly LessonId[];
  readonly reviewStates: readonly ReviewState[];
  readonly masteries: readonly SkillMastery[];
  /** Defaults to 0.65. */
  readonly weakSkillThreshold?: number;
}

function requireTimestamp(value: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new RangeError('now must be a valid timestamp');
}

function collectUnmetPrerequisites(
  lessonId: LessonId,
  lessons: ReadonlyMap<LessonId, Lesson>,
  completed: ReadonlySet<LessonId>,
  visiting = new Set<LessonId>(),
): readonly LessonId[] {
  const lesson = lessons.get(lessonId);
  if (!lesson || visiting.has(lessonId)) return [];
  visiting.add(lessonId);
  const result: LessonId[] = [];
  for (const prerequisiteId of lesson.prerequisiteLessonIds) {
    if (completed.has(prerequisiteId)) continue;
    result.push(...collectUnmetPrerequisites(prerequisiteId, lessons, completed, visiting));
    if (!result.includes(prerequisiteId)) result.push(prerequisiteId);
  }
  visiting.delete(lessonId);
  return result;
}

function lessonSort(left: Lesson, right: Lesson): number {
  return left.order - right.order || left.id.localeCompare(right.id);
}

/**
 * Produces a deterministic, transparent queue in the mandated order: prerequisites, current lesson,
 * due review, weak skill and finally new material. Duplicate lesson/skill actions are removed.
 */
export function buildDailyPath(input: DailyPathInput): readonly DailyPathItem[] {
  requireTimestamp(input.now);
  if (!Number.isInteger(input.limit) || input.limit < 0) {
    throw new RangeError('limit must be a non-negative integer');
  }
  const weakSkillThreshold = input.weakSkillThreshold ?? 0.65;
  if (!Number.isFinite(weakSkillThreshold) || weakSkillThreshold < 0 || weakSkillThreshold > 1) {
    throw new RangeError('weakSkillThreshold must be between 0 and 1');
  }

  const byId = new Map(input.lessons.map((lesson) => [lesson.id, lesson]));
  const completed = new Set(input.completedLessonIds);
  const output: DailyPathItem[] = [];
  const usedLessons = new Set<LessonId>();
  const usedSkills = new Set<string>();
  const push = (item: DailyPathItem): void => {
    if (output.length >= input.limit) return;
    if (item.lessonId && usedLessons.has(item.lessonId)) return;
    if (item.skillId && usedSkills.has(item.skillId)) return;
    output.push(item);
    if (item.lessonId) usedLessons.add(item.lessonId);
    if (item.skillId) usedSkills.add(item.skillId);
  };

  if (input.currentLessonId) {
    for (const prerequisiteId of collectUnmetPrerequisites(
      input.currentLessonId,
      byId,
      completed,
    )) {
      push({
        key: `lesson:${prerequisiteId}`,
        reason: 'required-prerequisite',
        priority: 1,
        lessonId: prerequisiteId,
      });
    }
    if (!completed.has(input.currentLessonId)) {
      push({
        key: `lesson:${input.currentLessonId}`,
        reason: 'current-lesson',
        priority: 2,
        lessonId: input.currentLessonId,
      });
    }
  }

  const dueReviews = input.reviewStates
    .filter((state) => isReviewDue(state, input.now))
    .sort(
      (left, right) =>
        Date.parse(left.nextDueAt) - Date.parse(right.nextDueAt) ||
        left.skillId.localeCompare(right.skillId),
    );
  for (const state of dueReviews) {
    push({
      key: `review:${state.skillId}`,
      reason: 'due-review',
      priority: 3,
      skillId: state.skillId,
      dueAt: state.nextDueAt,
    });
  }

  const weakSkills = input.masteries
    .filter((mastery) => mastery.score < weakSkillThreshold)
    .sort((left, right) => left.score - right.score || left.skillId.localeCompare(right.skillId));
  for (const mastery of weakSkills) {
    push({
      key: `weak:${mastery.skillId}`,
      reason: 'weak-skill',
      priority: 4,
      skillId: mastery.skillId,
    });
  }

  const newLessons = input.lessons
    .filter(
      (lesson) =>
        !completed.has(lesson.id) &&
        !usedLessons.has(lesson.id) &&
        lesson.prerequisiteLessonIds.every((id) => completed.has(id)),
    )
    .sort(lessonSort);
  for (const lesson of newLessons) {
    push({
      key: `lesson:${lesson.id}`,
      reason: 'new-material',
      priority: 5,
      lessonId: lesson.id,
    });
  }

  return output;
}
