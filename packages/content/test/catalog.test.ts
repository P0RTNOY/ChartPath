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

  it('rejects semantic chart drift from the editorial annotation fingerprint', () => {
    const copy = cloneCatalog();
    const exercise = copy.exercises[0]!;
    (copy.exercises as ContentCatalog['exercises'][number][])[0] = {
      ...exercise,
      chartSpec: { ...exercise.chartSpec!, seed: exercise.chartSpec!.seed + 1_000_000 },
    };
    expect(issueCodes(copy)).toContain('expected-annotations-mismatch');
  });

  it('rejects decision choices without an explicit reachable mapping', () => {
    const copy = cloneCatalog();
    const exercise = copy.exercises.find((item) => item.id === 'u10-capstone-e04')!;
    const index = copy.exercises.findIndex((item) => item.id === exercise.id);
    (copy.exercises as ContentCatalog['exercises'][number][])[index] = {
      ...exercise,
      decisionOptionMap: { 'decision-no-trade-honest': 'no-trade' },
    };
    expect(issueCodes(copy)).toContain('insufficient-decision-options');
  });

  it('rejects decision feedback that no rendered choice or reason can reach', () => {
    const copy = cloneCatalog();
    const exercise = copy.exercises.find((item) => item.id === 'u05-reversal-e01')!;
    const index = copy.exercises.findIndex((item) => item.id === exercise.id);
    (copy.exercises as ContentCatalog['exercises'][number][])[index] = {
      ...exercise,
      alternativeExplanations: [
        { ...exercise.alternativeExplanations[0]!, answerId: 'unreachable-answer' },
      ],
    };
    expect(issueCodes(copy)).toContain('unreachable-alternative-feedback');
  });

  it('rejects capstone feedback that no rendered workflow-step answer can reach', () => {
    const copy = cloneCatalog();
    const exercise = copy.exercises.find((item) => item.id === 'u10-capstone-e03')!;
    const index = copy.exercises.findIndex((item) => item.id === exercise.id);
    (copy.exercises as ContentCatalog['exercises'][number][])[index] = {
      ...exercise,
      alternativeExplanations: [
        { ...exercise.alternativeExplanations[0]!, answerId: 'unreachable-capstone-answer' },
      ],
    };
    expect(issueCodes(copy)).toContain('unreachable-capstone-feedback');
  });

  it('rejects a feedback code that the exercise rubric cannot emit', () => {
    const copy = cloneCatalog();
    const exercise = copy.exercises.find((item) => item.id === 'u08-risk-e03')!;
    const index = copy.exercises.findIndex((item) => item.id === exercise.id);
    (copy.exercises as ContentCatalog['exercises'][number][])[index] = {
      ...exercise,
      alternativeExplanations: [
        {
          ...exercise.alternativeExplanations[0]!,
          feedbackCode: 'option-not-accepted',
        },
      ],
    };
    expect(issueCodes(copy)).toContain('unreachable-alternative-feedback-code');
  });

  it('rejects a capstone rubric answer without an authored learner-visible choice', () => {
    const copy = cloneCatalog();
    const exercise = copy.exercises.find((item) => item.id === 'u10-capstone-e03')!;
    const index = copy.exercises.findIndex((item) => item.id === exercise.id);
    const setup = exercise.capstoneSteps!.find((step) => step.id === 'setup')!;
    (copy.exercises as ContentCatalog['exercises'][number][])[index] = {
      ...exercise,
      capstoneSteps: exercise.capstoneSteps!.map((step) =>
        step.id === 'setup'
          ? {
              ...setup,
              options: setup.options?.filter(
                (option) => option.id !== 'possible-head-and-shoulders',
              ),
            }
          : step,
      ),
    };
    expect(issueCodes(copy)).toContain('missing-capstone-rubric-choice');
  });

  it('rejects label-placement targets beyond the decision window', () => {
    const copy = cloneCatalog();
    const exercise = copy.exercises.find((item) => item.id === 'u01-chart-data-e01')!;
    if (exercise.rubric.kind !== 'label-placement') throw new Error('Expected label rubric.');
    const index = copy.exercises.findIndex((item) => item.id === exercise.id);
    (copy.exercises as ContentCatalog['exercises'][number][])[index] = {
      ...exercise,
      rubric: {
        ...exercise.rubric,
        targets: [
          {
            ...exercise.rubric.targets[0]!,
            target: {
              ...exercise.rubric.targets[0]!.target,
              candleIndex: exercise.chartSpec!.decisionCandleIndex! + 1,
            },
          },
        ],
      },
    };
    expect(issueCodes(copy)).toContain('future-rubric-target');
  });
});
