import { exercises, lessons, skills, units } from '@chartpath/content';
import type { Exercise, Lesson, Skill, Unit } from '@chartpath/domain';

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

export { exercises, lessons, skills, units };
