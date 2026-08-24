import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/i);
const editorialStatusSchema = z.enum(['draft', 'reviewed', 'published']);
const tradeDecisionSchema = z.enum([
  'trade',
  'wait',
  'reject',
  'no-trade',
  'insufficient-evidence',
]);
const alternativeExplanationSchema = z
  .strictObject({
    answerId: id.optional(),
    feedbackCode: id.optional(),
    explanationHe: nonEmpty,
    explanationEn: nonEmpty.optional(),
    misconceptionId: id.optional(),
  })
  .refine(
    (value) =>
      Number(value.answerId !== undefined) + Number(value.feedbackCode !== undefined) === 1,
    { message: 'Exactly one of answerId or feedbackCode is required.' },
  );

export const sourceReferenceSchema = z.strictObject({
  sourceId: id,
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
  bookPageStart: z.union([z.number().int().positive(), nonEmpty]),
  bookPageEnd: z.union([z.number().int().positive(), nonEmpty]),
  section: nonEmpty.optional(),
});

export const chartSpecSchema = z.strictObject({
  id,
  seed: z.number().int().safe(),
  generatorVersion: nonEmpty,
  candleCount: z.number().int().min(20).max(500),
  timeframe: nonEmpty,
  scenario: z.enum([
    'uptrend',
    'downtrend',
    'range',
    'breakout',
    'retest',
    'false-breakout',
    'reversal',
    'continuation',
    'ambiguous',
    'lookalike',
  ]),
  basePrice: z.number().positive(),
  baseVolume: z.number().positive(),
  volatility: z.number().positive().max(0.25),
  noise: z.number().min(0).max(2),
  decisionCandleIndex: z.number().int().nonnegative().optional(),
  parameters: z.record(z.string(), z.json()).optional(),
});

const misconceptionIds = z.array(id);
const baseRubricShape = { misconceptionIds: misconceptionIds.optional() };
const anchorSchema = z.strictObject({
  candleIndex: z.number().int().nonnegative(),
  price: z.number(),
});
const toleranceSchema = z.strictObject({
  horizontal: z.number().positive().max(1),
  vertical: z.number().positive().max(1),
});

export const atomicAnswerRubricSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...baseRubricShape,
    kind: z.literal('multiple-choice'),
    acceptedOptionIds: z.array(id).min(1),
  }),
  z.strictObject({
    ...baseRubricShape,
    kind: z.literal('selection'),
    expectedIds: z.array(id).min(1),
    mode: z.enum(['exact', 'contains']),
    allowExtraSelections: z.boolean().optional(),
  }),
  z.strictObject({
    ...baseRubricShape,
    kind: z.literal('sequence'),
    expectedOrder: z.array(id).min(2),
  }),
  z.strictObject({
    ...baseRubricShape,
    kind: z.literal('point'),
    targets: z.array(anchorSchema).min(1),
    tolerance: toleranceSchema,
    matching: z.enum(['all', 'any']),
    allowExtraPoints: z.boolean().optional(),
    decisionCandleIndex: z.number().int().nonnegative().optional(),
  }),
  z.strictObject({
    ...baseRubricShape,
    kind: z.literal('zone'),
    target: z.strictObject({
      startCandleIndex: z.number().int().nonnegative(),
      endCandleIndex: z.number().int().nonnegative(),
      priceLow: z.number(),
      priceHigh: z.number(),
    }),
    minimumIntersectionOverUnion: z.number().positive().max(1),
    decisionCandleIndex: z.number().int().nonnegative().optional(),
  }),
  z.strictObject({
    ...baseRubricShape,
    kind: z.literal('line'),
    target: z.strictObject({ start: anchorSchema, end: anchorSchema }),
    tolerance: toleranceSchema,
    directionInvariant: z.boolean().optional(),
    decisionCandleIndex: z.number().int().nonnegative().optional(),
  }),
  z.strictObject({
    ...baseRubricShape,
    kind: z.literal('risk'),
    expected: z.partialRecord(
      z.enum(['accountRisk', 'stopDistance', 'perUnitRisk', 'positionSize', 'riskMultiple']),
      z.number(),
    ),
    tolerance: z.strictObject({
      absolute: z.number().nonnegative().optional(),
      relative: z.number().nonnegative().optional(),
    }),
  }),
  z.strictObject({
    ...baseRubricShape,
    kind: z.literal('decision'),
    acceptedDecisions: z
      .array(z.enum(['trade', 'wait', 'reject', 'no-trade', 'insufficient-evidence']))
      .min(1),
    requiredReasonIds: z.array(id).optional(),
    allowExtraReasons: z.boolean().optional(),
  }),
  z.strictObject({
    ...baseRubricShape,
    kind: z.literal('label-placement'),
    targets: z
      .array(
        z.strictObject({
          labelId: id,
          target: anchorSchema,
        }),
      )
      .min(1),
    tolerance: toleranceSchema,
    decisionCandleIndex: z.number().int().nonnegative().optional(),
  }),
]);

export const answerRubricSchema = z.discriminatedUnion('kind', [
  ...atomicAnswerRubricSchema.options,
  z.strictObject({
    ...baseRubricShape,
    kind: z.literal('capstone'),
    steps: z
      .array(
        z.strictObject({
          id,
          rubric: atomicAnswerRubricSchema,
        }),
      )
      .min(1),
  }),
]);

export const skillSchema = z.strictObject({
  id,
  titleHe: nonEmpty,
  titleEn: nonEmpty.optional(),
  descriptionHe: nonEmpty,
  descriptionEn: nonEmpty.optional(),
  prerequisiteSkillIds: z.array(id),
  order: z.number().int().nonnegative(),
  editorialStatus: editorialStatusSchema,
});

export const unitSchema = z.strictObject({
  id: z.string().regex(/^unit-\d{2}-[a-z0-9-]+$/),
  order: z.number().int().min(0).max(10),
  titleHe: nonEmpty,
  titleEn: nonEmpty.optional(),
  descriptionHe: nonEmpty,
  descriptionEn: nonEmpty.optional(),
  prerequisiteUnitIds: z.array(z.string().regex(/^unit-\d{2}-[a-z0-9-]+$/)),
  lessonIds: z.array(z.string().regex(/^lesson-u\d{2}-[a-z0-9-]+$/)),
  editorialStatus: editorialStatusSchema,
  schemaVersion: z.number().int().positive(),
  contentVersionId: nonEmpty,
  implementationStatus: z.enum(['metadata-only', 'implemented']),
  draftLessonIds: z.array(z.string().regex(/^draft-u\d{2}-[a-z0-9-]+$/)).length(1),
});

export const lessonSchema = z.strictObject({
  id: z.string().regex(/^lesson-u\d{2}-[a-z0-9-]+$/),
  unitId: z.string().regex(/^unit-\d{2}-[a-z0-9-]+$/),
  order: z.number().int().positive(),
  titleHe: nonEmpty,
  titleEn: nonEmpty.optional(),
  summaryHe: nonEmpty,
  summaryEn: nonEmpty.optional(),
  skillIds: z.array(id).min(1),
  prerequisiteLessonIds: z.array(z.string().regex(/^lesson-u\d{2}-[a-z0-9-]+$/)),
  exerciseIds: z.array(z.string().regex(/^u\d{2}-[a-z0-9-]+-e\d{2}$/)).length(5),
  estimatedMinutes: z.number().int().positive(),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
  editorialStatus: editorialStatusSchema,
  schemaVersion: z.number().int().positive(),
  contentVersionId: nonEmpty,
  termIds: z.array(id).min(1),
  doctrineHe: z.array(nonEmpty).min(2),
  workflowStepIds: z
    .array(
      z.enum([
        'context',
        'structure',
        'level',
        'setup',
        'confirmation',
        'entry',
        'invalidation',
        'position-size',
        'target',
        'management',
        'review',
      ]),
    )
    .min(1),
});

export const exerciseSchema = z.strictObject({
  id: z.string().regex(/^u\d{2}-[a-z0-9-]+-e\d{2}$/),
  skillIds: z.array(id).min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  promptHe: nonEmpty,
  promptEn: nonEmpty.optional(),
  interactionType: z.enum([
    'multiple-choice',
    'selection',
    'sequence',
    'point',
    'zone',
    'line',
    'risk',
    'decision',
    'capstone',
    'label-placement',
    'timeframe-comparison',
    'mistake-diagnosis',
    'sequential-reveal',
  ]),
  options: z
    .array(z.strictObject({ id, labelHe: nonEmpty, labelEn: nonEmpty.optional() }))
    .optional(),
  reasonOptions: z
    .array(z.strictObject({ id, labelHe: nonEmpty, labelEn: nonEmpty.optional() }))
    .optional(),
  decisionOptionMap: z.record(id, tradeDecisionSchema).optional(),
  chartSpec: chartSpecSchema,
  chartPresentation: z.enum(['hidden', 'answer-evidence']),
  rubric: answerRubricSchema,
  explanationHe: nonEmpty,
  explanationEn: nonEmpty.optional(),
  alternativeExplanations: z.array(alternativeExplanationSchema).min(1),
  misconceptionIds,
  hints: z
    .array(
      z.strictObject({
        id,
        level: z.number().int().min(1).max(5),
        textHe: nonEmpty,
        textEn: nonEmpty.optional(),
      }),
    )
    .min(3),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
  isAmbiguous: z.boolean().optional(),
  editorialStatus: editorialStatusSchema,
  schemaVersion: z.number().int().positive(),
  contentVersionId: nonEmpty,
  workflowStepIds: z
    .array(
      z.enum([
        'context',
        'structure',
        'level',
        'setup',
        'confirmation',
        'entry',
        'invalidation',
        'position-size',
        'target',
        'management',
        'review',
      ]),
    )
    .min(1),
  termIds: z.array(id).min(1),
  role: z.enum(['positive', 'near-miss', 'ambiguous', 'lookalike', 'transfer']),
  category: z.enum(['visual', 'explanation', 'calculation', 'decision', 'journal-review']),
  safetyNoteHe: nonEmpty,
  processCriteriaHe: z.array(nonEmpty).min(1),
  isRiskOrPositionSize: z.boolean(),
  capstoneSteps: z
    .array(
      z.strictObject({
        id: z.enum([
          'context',
          'structure',
          'level',
          'setup',
          'confirmation',
          'entry',
          'invalidation',
          'position-size',
          'target',
          'management',
          'review',
        ]),
        promptHe: nonEmpty,
        promptEn: nonEmpty.optional(),
        rubric: atomicAnswerRubricSchema,
        options: z
          .array(z.strictObject({ id, labelHe: nonEmpty, labelEn: nonEmpty.optional() }))
          .optional(),
        reasonOptions: z
          .array(z.strictObject({ id, labelHe: nonEmpty, labelEn: nonEmpty.optional() }))
          .optional(),
        decisionOptionMap: z.record(id, tradeDecisionSchema).optional(),
      }),
    )
    .optional(),
});

export const misconceptionSchema = z.strictObject({
  id,
  titleHe: nonEmpty,
  titleEn: nonEmpty.optional(),
  explanationHe: nonEmpty,
  explanationEn: nonEmpty.optional(),
  skillIds: z.array(id).min(1),
  remediationLessonIds: z.array(z.string().regex(/^lesson-u\d{2}-[a-z0-9-]+$/)).min(1),
});

export const glossaryTermSchema = z.strictObject({
  id,
  termHe: nonEmpty,
  termEn: nonEmpty,
  definitionHe: nonEmpty,
  definitionEn: nonEmpty,
  aliases: z.array(nonEmpty),
  termHeDirection: z.literal('rtl'),
  termEnDirection: z.literal('ltr'),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
  editorialStatus: z.literal('reviewed'),
});

export const contentVersionSchema = z.strictObject({
  id: nonEmpty,
  schemaVersion: z.number().int().positive(),
  generatorVersion: nonEmpty,
  titleHe: nonEmpty,
  releasedAt: z.iso.datetime(),
  sourceIds: z.array(id).min(1),
  editorialStatus: z.literal('reviewed'),
});

export const contentMigrationSchema = z.strictObject({
  id,
  fromContentVersionId: nonEmpty,
  toContentVersionId: nonEmpty,
  aliases: z.record(id, id),
  retiredIds: z.array(id),
  invalidatedProjectionSkillIds: z.array(id),
  preservesAttempts: z.literal(true),
});

export const contentCatalogSchema = z.strictObject({
  version: contentVersionSchema,
  units: z.array(unitSchema),
  lessons: z.array(lessonSchema),
  exercises: z.array(exerciseSchema),
  skills: z.array(skillSchema),
  misconceptions: z.array(misconceptionSchema),
  glossary: z.array(glossaryTermSchema),
  migrations: z.array(contentMigrationSchema),
  draftLessons: z
    .array(
      z.strictObject({
        id: z.string().regex(/^draft-u\d{2}-[a-z0-9-]+$/),
        unitId: z.string().regex(/^unit-\d{2}-[a-z0-9-]+$/),
        titleHe: nonEmpty,
        titleEn: nonEmpty,
        prerequisiteLessonIds: z.array(z.string().regex(/^lesson-u\d{2}-[a-z0-9-]+$/)).min(1),
        skillIds: z.array(id).min(1),
        plannedScopeHe: nonEmpty,
        sourceReferences: z.array(sourceReferenceSchema).min(1),
        editorialStatus: z.literal('draft'),
        schemaVersion: z.number().int().positive(),
        contentVersionId: nonEmpty,
      }),
    )
    .length(11),
});
