import type { ContentCatalog } from '../src/types.js';
import { describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import { contentCatalogSchema } from '../src/schemas.js';
import { WORKFLOW_STEP_IDS } from '../src/types.js';
import { validateCatalog } from '../src/validator.js';

function cloneCatalog(): ContentCatalog {
  return structuredClone(catalog);
}

function issueCodes(value: ContentCatalog): readonly string[] {
  return validateCatalog(value).issues.map((issue) => issue.code);
}

describe('reviewed curriculum catalog', () => {
  it('passes schema and full semantic validation', () => {
    expect(contentCatalogSchema.safeParse(catalog).success).toBe(true);
    const report = validateCatalog(catalog);
    expect(report.issues).toEqual([]);
    expect(report.counts).toMatchObject({
      units: 11,
      draftLessons: 11,
      lessons: 12,
      exercises: 60,
      reviewedExercises: 60,
      glossaryTerms: 27,
      nearMissAmbiguousLookalike: 25,
      uncertaintyAnswers: 13,
      riskOrPositionSize: 13,
      capstones: 1,
      categories: {
        visual: 18,
        explanation: 12,
        calculation: 10,
        decision: 12,
        'journal-review': 8,
      },
    });
  });

  it('links five exercises from every lesson without orphan records', () => {
    const linked = catalog.lessons.flatMap((lesson) => lesson.exerciseIds);
    expect(new Set(linked).size).toBe(60);
    expect(new Set(linked)).toEqual(new Set(catalog.exercises.map((exercise) => exercise.id)));
    expect(catalog.lessons.every((lesson) => lesson.exerciseIds.length === 5)).toBe(true);
  });

  it('keeps the capstone as one independently graded eleven-stage workflow', () => {
    const capstones = catalog.exercises.filter((exercise) => exercise.capstoneSteps);
    expect(capstones).toHaveLength(1);
    expect(capstones[0]?.capstoneSteps?.map((step) => step.id)).toEqual(WORKFLOW_STEP_IDS);
    expect(
      new Set(capstones[0]?.capstoneSteps?.map((step) => step.rubric.kind)).size,
    ).toBeGreaterThan(1);
  });

  it.each([
    [
      'duplicate stable ID',
      'duplicate-id',
      (copy: ContentCatalog) => {
        (copy.exercises as ContentCatalog['exercises'][number][])[1] = copy.exercises[0]!;
      },
    ],
    [
      'unknown prerequisite',
      'unknown-prerequisite',
      (copy: ContentCatalog) => {
        const lesson = copy.lessons[1]!;
        (copy.lessons as ContentCatalog['lessons'][number][])[1] = {
          ...lesson,
          prerequisiteLessonIds: ['lesson-u99-missing'],
        };
      },
    ],
    [
      'missing explanation',
      'missing-explanation',
      (copy: ContentCatalog) => {
        const exercise = copy.exercises[0]!;
        (copy.exercises as ContentCatalog['exercises'][number][])[0] = {
          ...exercise,
          explanationHe: '',
        };
      },
    ],
    [
      'missing source',
      'missing-source',
      (copy: ContentCatalog) => {
        const exercise = copy.exercises[0]!;
        (copy.exercises as ContentCatalog['exercises'][number][])[0] = {
          ...exercise,
          sourceReferences: [],
        };
      },
    ],
    [
      'missing Hebrew',
      'missing-hebrew',
      (copy: ContentCatalog) => {
        const exercise = copy.exercises[0]!;
        (copy.exercises as ContentCatalog['exercises'][number][])[0] = {
          ...exercise,
          promptHe: 'English only',
        };
      },
    ],
    [
      'unknown skill',
      'unknown-skill',
      (copy: ContentCatalog) => {
        const exercise = copy.exercises[0]!;
        (copy.exercises as ContentCatalog['exercises'][number][])[0] = {
          ...exercise,
          skillIds: ['skill.missing'],
        };
      },
    ],
    [
      'unreachable lesson',
      'unreachable-lesson',
      (copy: ContentCatalog) => {
        const unit = copy.units[0]!;
        (copy.units as ContentCatalog['units'][number][])[0] = { ...unit, lessonIds: [] };
      },
    ],
    [
      'ambiguous task without uncertainty answer',
      'ambiguous-without-uncertainty-answer',
      (copy: ContentCatalog) => {
        const exercise = copy.exercises.find((item) => item.rubric.kind === 'multiple-choice')!;
        const index = copy.exercises.findIndex((item) => item.id === exercise.id);
        (copy.exercises as ContentCatalog['exercises'][number][])[index] = {
          ...exercise,
          isAmbiguous: true,
        };
      },
    ],
    [
      'unreproducible chart contract',
      'chart-reproduction-error',
      (copy: ContentCatalog) => {
        const exercise = copy.exercises[0]!;
        (copy.exercises as ContentCatalog['exercises'][number][])[0] = {
          ...exercise,
          chartSpec: { ...exercise.chartSpec!, generatorVersion: 'unsupported-test-version' },
        };
      },
    ],
  ] as const)('rejects %s', (_label, expectedCode, mutate) => {
    const copy = cloneCatalog();
    mutate(copy);
    expect(issueCodes(copy)).toContain(expectedCode);
  });

  it('rejects a mismatched physical/printed source page pair', () => {
    const copy = cloneCatalog();
    const exercise = copy.exercises[0]!;
    const source = exercise.sourceReferences[0]!;
    (copy.exercises as ContentCatalog['exercises'][number][])[0] = {
      ...exercise,
      sourceReferences: [{ ...source, bookPageStart: 70, bookPageEnd: 70 }],
    };
    expect(issueCodes(copy)).toContain('source-page-offset');
  });
});
