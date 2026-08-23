import {
  catalog,
  contentCatalogSchema,
  exercises,
  lessons,
  skills,
  units,
} from '@chartpath/content';
import type { Exercise, Lesson, Skill, Unit } from '@chartpath/domain';

const runtimeValidation = contentCatalogSchema.safeParse(catalog);
if (!runtimeValidation.success) {
  throw new Error(`Bundled content failed runtime validation: ${runtimeValidation.error.message}`);
}

export type LessonProgressLookup = Readonly<
  Record<string, { readonly status: string } | undefined>
>;

export const lessonById = new Map<string, Lesson>(lessons.map((lesson) => [lesson.id, lesson]));
export const unitById = new Map<string, Unit>(units.map((unit) => [unit.id, unit]));
export const exerciseById = new Map<string, Exercise>(
  exercises.map((exercise) => [exercise.id, exercise]),
);
export const skillById = new Map<string, Skill>(skills.map((skill) => [skill.id, skill]));

export function unitLessons(unitId: string): readonly Lesson[] {
  return lessons
    .filter((lesson) => lesson.unitId === unitId)
    .sort((left, right) => left.order - right.order);
}

export function lessonExercises(lessonId: string): readonly Exercise[] {
  const lesson = lessonById.get(lessonId);
  if (!lesson) return [];
  return lesson.exerciseIds.flatMap((id) => {
    const exercise = exerciseById.get(id);
    return exercise ? [exercise] : [];
  });
}

export function isLessonUnlocked(lessonId: string, progress: LessonProgressLookup): boolean {
  const lesson = lessonById.get(lessonId);
  if (!lesson) return false;
  return lesson.prerequisiteLessonIds.every((id) => progress[id]?.status === 'completed');
}

export function isUnitUnlocked(unitId: string, progress: LessonProgressLookup): boolean {
  const unit = unitById.get(unitId);
  if (!unit) return false;
  return unit.prerequisiteUnitIds.every((prerequisiteUnitId) =>
    unitLessons(prerequisiteUnitId).every((lesson) => progress[lesson.id]?.status === 'completed'),
  );
}

export { exercises, lessons, skills, units };
