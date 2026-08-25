import { z } from 'zod';

import { WORKFLOW_STEP_IDS } from '../types.js';
import {
  SCENARIO_AUTHORING_SCHEMA_VERSION,
  SCENARIO_COMPILER_VERSION,
  type ScenarioAuthoringManifestV1,
} from './types.js';

export const SCENARIO_INPUT_LIMITS = Object.freeze({
  maxBytes: 1_048_576,
  maxDepth: 32,
  maxNodes: 50_000,
  maxObjectKeys: 128,
  maxArrayLength: 4_096,
  maxStringBytes: 8_192,
  maxIdentifierLength: 128,
  maxTextLength: 4_096,
  maxHints: 10,
  maxReferences: 64,
  maxPublicationRecords: 256,
  maxPublicationBlockers: 128,
  maxSnapshotEvents: 2_048,
} as const);

const FORBIDDEN_PROPERTY_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const utf8 = new TextEncoder();

export type ScenarioInputPreflightResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly issues: readonly string[] };

function propertyPath(parent: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$-]*$/u.test(key)
    ? `${parent}.${key}`
    : `${parent}[${JSON.stringify(key)}]`;
}

/**
 * Rejects values that cannot have originated as bounded, ordinary JSON before Zod traverses them.
 * In particular, this prevents accessors and prototype-sensitive objects from reaching compilation.
 */
export function preflightScenarioAuthoringInput(input: unknown): ScenarioInputPreflightResult {
  let value = input;
  if (typeof value === 'string') {
    if (utf8.encode(value).byteLength > SCENARIO_INPUT_LIMITS.maxBytes)
      return { ok: false, issues: ['$ exceeds the maximum serialized manifest size'] };
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return { ok: false, issues: ['$ must contain valid JSON'] };
    }
  }

  const seen = new WeakMap<object, string>();
  const active = new WeakSet<object>();
  let nodes = 0;
  let approximateBytes = 0;

  const addBytes = (count: number, path: string): string | undefined => {
    approximateBytes += count;
    return approximateBytes > SCENARIO_INPUT_LIMITS.maxBytes
      ? `${path} exceeds the maximum manifest size`
      : undefined;
  };

  const inspect = (item: unknown, path: string, depth: number): string | undefined => {
    nodes += 1;
    if (nodes > SCENARIO_INPUT_LIMITS.maxNodes)
      return `${path} exceeds the maximum manifest node count`;
    if (depth > SCENARIO_INPUT_LIMITS.maxDepth)
      return `${path} exceeds the maximum manifest nesting depth`;

    if (typeof item === 'string') {
      const bytes = utf8.encode(item).byteLength;
      if (bytes > SCENARIO_INPUT_LIMITS.maxStringBytes)
        return `${path} exceeds the maximum string size`;
      return addBytes(bytes + 2, path);
    }
    if (item === null || typeof item === 'boolean') return addBytes(5, path);
    if (typeof item === 'number') return addBytes(24, path);
    if (typeof item !== 'object') return `${path} contains a non-JSON ${typeof item} value`;

    if (active.has(item)) return `${path} contains a circular reference`;
    const firstPath = seen.get(item);
    if (firstPath !== undefined) return `${path} shares an object reference with ${firstPath}`;
    seen.set(item, path);
    active.add(item);

    const isArray = Array.isArray(item);
    const prototype = Object.getPrototypeOf(item) as unknown;
    if (prototype !== (isArray ? Array.prototype : Object.prototype))
      return `${path} must use the ordinary JSON ${isArray ? 'array' : 'object'} prototype`;

    const descriptors = Object.getOwnPropertyDescriptors(item);
    const ownKeys = Reflect.ownKeys(item);
    if (ownKeys.some((key) => typeof key === 'symbol'))
      return `${path} must not contain symbol properties`;

    if (isArray) {
      if (item.length > SCENARIO_INPUT_LIMITS.maxArrayLength)
        return `${path} exceeds the maximum array length`;
      const allowedKeys = new Set([
        'length',
        ...Array.from({ length: item.length }, (_, i) => String(i)),
      ]);
      for (const key of ownKeys as string[])
        if (!allowedKeys.has(key)) return `${propertyPath(path, key)} is a custom array property`;
      for (let index = 0; index < item.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor) return `${path}[${index}] is a sparse array element`;
        if ('get' in descriptor || 'set' in descriptor)
          return `${path}[${index}] must not be an accessor`;
        const issue = inspect(descriptor.value, `${path}[${index}]`, depth + 1);
        if (issue) return issue;
      }
    } else {
      const keys = (ownKeys as string[]).sort();
      if (keys.length > SCENARIO_INPUT_LIMITS.maxObjectKeys)
        return `${path} exceeds the maximum object key count`;
      for (const key of keys) {
        const childPath = propertyPath(path, key);
        if (FORBIDDEN_PROPERTY_KEYS.has(key))
          return `${childPath} is a prototype-sensitive property`;
        if (utf8.encode(key).byteLength > SCENARIO_INPUT_LIMITS.maxIdentifierLength)
          return `${childPath} exceeds the maximum property-name size`;
        const descriptor = descriptors[key];
        if (!descriptor || !descriptor.enumerable)
          return `${childPath} must be an enumerable data property`;
        if ('get' in descriptor || 'set' in descriptor)
          return `${childPath} must not be an accessor`;
        const sizeIssue = addBytes(utf8.encode(key).byteLength + 3, childPath);
        if (sizeIssue) return sizeIssue;
        const issue = inspect(descriptor.value, childPath, depth + 1);
        if (issue) return issue;
      }
    }

    active.delete(item);
    return addBytes(2, path);
  };

  try {
    const issue = inspect(value, '$', 0);
    return issue ? { ok: false, issues: [issue] } : { ok: true, value };
  } catch {
    return { ok: false, issues: ['$ could not be inspected safely'] };
  }
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

export function freezeValidatedScenarioManifest(value: ScenarioAuthoringManifestV1) {
  return deepFreeze(value);
}

const boundedString = (maximum: number = SCENARIO_INPUT_LIMITS.maxTextLength) =>
  z
    .string()
    .max(maximum)
    .refine((value) => value.trim().length > 0, 'must be a non-empty string');
const identifier = boundedString(SCENARIO_INPUT_LIMITS.maxIdentifierLength).regex(
  /^[a-z0-9][a-z0-9._-]*$/iu,
  'must be a stable identifier',
);
const semanticVersion = boundedString(32).regex(
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u,
  'must be a canonical semantic version',
);
const checksum = z
  .string()
  .regex(/^sha256:[0-9a-f]{64}$/u, 'must be a lowercase SHA-256 checksum')
  .transform((value) => value as `sha256:${string}`);
const finiteNumber = z
  .number()
  .finite()
  .refine((value) => !Object.is(value, -0), 'must not be negative zero');
const safeInteger = finiteNumber.int().safe();
const nonnegativeInteger = safeInteger.nonnegative();
const positiveNumber = finiteNumber.positive().max(1_000_000_000_000);
const nonnegativeNumber = finiteNumber.nonnegative().max(1_000_000_000_000);
const hebrewText = boundedString().refine(
  (value) => /[\u0590-\u05ff]/u.test(value),
  'must contain Hebrew learner-facing text',
);
const rfc3339Timestamp = boundedString(64).refine(
  (value) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) &&
    Number.isFinite(Date.parse(value)),
  'must be an RFC 3339 timestamp with an explicit offset',
);

const unique = <T>(values: readonly T[]) => new Set(values).size === values.length;

const applicationDecisionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('trade'), direction: z.enum(['long', 'short']) }),
  z.strictObject({
    kind: z.literal('no-trade'),
    disposition: z.enum(['wait', 'reject', 'no-trade', 'insufficient-evidence']),
  }),
]);

const sourceSchema = z.strictObject({
  sourceId: identifier,
  pageStart: safeInteger.positive(),
  pageEnd: safeInteger.positive(),
  bookPageStart: z.union([safeInteger.positive(), boundedString(32)]),
  bookPageEnd: z.union([safeInteger.positive(), boundedString(32)]),
  section: boundedString().optional(),
  pdfDocumentId: boundedString(256),
  reviewedContentIds: z.array(identifier).min(1).max(SCENARIO_INPUT_LIMITS.maxReferences),
  chapter: boundedString(128),
  figure: boundedString(256),
  concept: hebrewText,
  rationaleHe: hebrewText,
});

const chartParametersSchema = z.strictObject({
  direction: z.enum(['up', 'down']).optional(),
  regime: z.enum(['uptrend', 'downtrend', 'range']).optional(),
  variant: z.enum(['positive', 'near-miss', 'ambiguous', 'lookalike']).optional(),
  reaction: z.enum(['support', 'resistance', 'none']).optional(),
  relativeVolume: z.enum(['steady', 'rising', 'falling', 'spike']).optional(),
  gapKind: z.enum(['none', 'common', 'breakaway', 'continuation', 'exhaustion']).optional(),
  gapSize: finiteNumber.min(0.01).max(0.3).optional(),
  gapIndex: nonnegativeInteger.optional(),
  pattern: z
    .enum([
      'double-top',
      'double-bottom',
      'head-and-shoulders',
      'inverse-head-and-shoulders',
      'rounded',
      'rectangle',
      'symmetrical-triangle',
      'ascending-triangle',
      'descending-triangle',
      'flag',
      'pennant',
      'wedge',
    ])
    .optional(),
  eventIndex: nonnegativeInteger.optional(),
  startTimestamp: rfc3339Timestamp.optional(),
  intervalMs: safeInteger
    .min(60_000)
    .max(31 * 24 * 60 * 60_000)
    .optional(),
});

const chartSpecSchema = z
  .strictObject({
    id: identifier,
    seed: safeInteger,
    generatorVersion: semanticVersion,
    candleCount: safeInteger.min(20).max(500),
    timeframe: z.enum(['5m', '15m', '30m', '1h', '4h', '1d', '1w']),
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
    basePrice: positiveNumber,
    baseVolume: positiveNumber,
    volatility: finiteNumber.positive().max(0.25),
    noise: finiteNumber.nonnegative().max(2),
    decisionCandleIndex: nonnegativeInteger.optional(),
    parameters: chartParametersSchema.optional(),
  })
  .superRefine((value, context) => {
    for (const [field, index] of [
      ['decisionCandleIndex', value.decisionCandleIndex],
      ['parameters.eventIndex', value.parameters?.eventIndex],
      ['parameters.gapIndex', value.parameters?.gapIndex],
    ] as const)
      if (index !== undefined && index >= value.candleCount)
        context.addIssue({
          code: 'custom',
          path: field.split('.'),
          message: 'must refer to a chart candle',
        });
  });

const entryIntentSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('market'), estimatedEntryPrice: positiveNumber }),
  z.strictObject({ type: z.literal('limit'), limitPrice: positiveNumber }),
  z.strictObject({ type: z.literal('stop'), triggerPrice: positiveNumber }),
]);

const tradePlanSchema = z.strictObject({
  planId: identifier,
  direction: z.enum(['long', 'short']),
  entryIntent: entryIntentSchema,
  protectiveStopPrice: positiveNumber,
  targetPrice: positiveNumber,
  fictionalAccountValue: positiveNumber,
  intendedRiskAmount: positiveNumber,
  quantity: safeInteger.positive().max(1_000_000_000),
  authoredAtCandleIndex: nonnegativeInteger,
  processEvidence: z.strictObject({
    analysisDecision: z.enum(['long', 'short', 'wait', 'no-trade', 'insufficient-evidence']),
    entryMatchesAnalysis: z.boolean(),
    invalidationMatchesAnalysis: z.boolean(),
    targetMatchesAnalysis: z.boolean(),
    requiredReasoningBypassed: z.boolean(),
  }),
});

const executionFillFactSchema = z.strictObject({
  referencePrice: positiveNumber,
  price: positiveNumber,
  commission: nonnegativeNumber,
  gap: z.boolean(),
  priceCappedByLimit: z.boolean(),
});

const executionEventTypeSchema = z.enum([
  'session-created',
  'plan-replaced',
  'order-rejected',
  'order-submitted',
  'order-working',
  'order-filled',
  'position-opened',
  'position-closed-stop',
  'position-closed-target',
  'execution-ambiguous',
  'order-cancelled',
  'order-expired',
  'execution-abandoned',
]);

const fillEventTypes = new Set([
  'order-filled',
  'position-opened',
  'position-closed-stop',
  'position-closed-target',
]);

const executionEventFactSchema = z
  .strictObject({
    sequence: nonnegativeInteger,
    type: executionEventTypeSchema,
    candleIndex: nonnegativeInteger.optional(),
    fill: executionFillFactSchema.optional(),
  })
  .superRefine((value, context) => {
    const requiresFill = fillEventTypes.has(value.type);
    if (requiresFill !== (value.fill !== undefined))
      context.addIssue({
        code: 'custom',
        path: ['fill'],
        message: requiresFill
          ? 'is required for this event type'
          : 'is forbidden for this event type',
      });
  });

const executionSnapshotSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    terminalStatus: z.enum([
      'draft',
      'working',
      'open',
      'closed',
      'ambiguous',
      'cancelled',
      'rejected',
      'completed',
    ]),
    workingOrderStatus: z
      .enum(['submitted', 'working', 'filled', 'cancelled', 'rejected', 'expired'])
      .optional(),
    positionStatus: z.enum(['open', 'closed-stop', 'closed-target', 'ambiguous']).optional(),
    events: z.array(executionEventFactSchema).max(SCENARIO_INPUT_LIMITS.maxSnapshotEvents),
    debrief: z
      .strictObject({
        outcome: z.enum(['protective-stop', 'target', 'ambiguous']),
        outcomeDeterminate: z.boolean(),
        totalCommissions: nonnegativeNumber,
        modeledSpreadAndSlippage: nonnegativeNumber,
        netSimulatedOutcome: finiteNumber.optional(),
        riskMultiple: finiteNumber.optional(),
        ambiguityReason: boundedString(512).optional(),
      })
      .optional(),
    checksum,
  })
  .superRefine((value, context) => {
    value.events.forEach((event, index) => {
      if (event.sequence !== index)
        context.addIssue({
          code: 'custom',
          path: ['events', index, 'sequence'],
          message: 'must be contiguous and equal to the event index',
        });
    });
    if (!value.debrief) return;
    const ambiguous = value.debrief.outcome === 'ambiguous';
    if (value.debrief.outcomeDeterminate === ambiguous)
      context.addIssue({
        code: 'custom',
        path: ['debrief', 'outcomeDeterminate'],
        message: 'must agree with the debrief outcome',
      });
    if (ambiguous && !value.debrief.ambiguityReason)
      context.addIssue({
        code: 'custom',
        path: ['debrief', 'ambiguityReason'],
        message: 'is required for an ambiguous outcome',
      });
    if (
      ambiguous &&
      (value.debrief.netSimulatedOutcome !== undefined || value.debrief.riskMultiple !== undefined)
    )
      context.addIssue({
        code: 'custom',
        path: ['debrief'],
        message: 'ambiguous outcomes must not invent profit or risk-multiple results',
      });
  });

const expectedExecutionSchema = z.strictObject({
  direction: z.enum(['long', 'short']),
  entryOrderType: z.enum(['market', 'limit', 'stop']),
  plan: tradePlanSchema,
  expectedStatus: z.enum([
    'draft',
    'working',
    'open',
    'closed',
    'ambiguous',
    'cancelled',
    'rejected',
    'completed',
  ]),
  requiredEvidence: z
    .array(
      z.enum([
        'market-entry',
        'limit-entry',
        'stop-entry',
        'opening-gap',
        'protective-stop',
        'target',
        'unfilled-order',
        'ambiguity',
      ]),
    )
    .min(1)
    .max(8)
    .refine(unique, 'must not contain duplicate evidence'),
  expectedSnapshot: executionSnapshotSchema,
});

const processRubricSchema = z.strictObject({
  rubricId: identifier,
  rubricVersion: semanticVersion,
  checksum,
  criteria: z
    .array(
      z.strictObject({
        workflowStepId: z.enum(WORKFLOW_STEP_IDS),
        criterionHe: hebrewText,
        expectedEvidenceHe: hebrewText,
      }),
    )
    .length(WORKFLOW_STEP_IDS.length),
  expectedDecision: applicationDecisionSchema,
  requiredRationaleReasonIds: z
    .array(identifier)
    .min(1)
    .max(32)
    .refine(unique, 'must not contain duplicate rationale IDs'),
  scoring: z.strictObject({
    executionStatusAffectsScore: z.literal(false),
    profitAndLossAffectsScore: z.literal(false),
  }),
});

const reviewScopeSchema = z.enum([
  'source',
  'rubric',
  'execution',
  'accessibility',
  'hebrew',
  'financial-safety',
  'publication',
]);

const reviewRecordSchema = z.strictObject({
  reviewerRecordId: identifier,
  reviewedAt: rfc3339Timestamp,
  decision: z.enum(['approved', 'changes-requested']),
  materialArtifactChecksum: checksum,
  scope: reviewScopeSchema,
  note: boundedString(),
});

const publicationSchema = z.strictObject({
  status: z.enum([
    'draft',
    'auto-validated',
    'human-review-required',
    'approved',
    'published',
    'retired',
  ]),
  records: z.array(reviewRecordSchema).max(SCENARIO_INPUT_LIMITS.maxPublicationRecords),
  blockers: z.array(boundedString()).max(SCENARIO_INPUT_LIMITS.maxPublicationBlockers),
});

const retirementSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('active') }),
  z.strictObject({
    status: z.literal('retired'),
    retiredAt: rfc3339Timestamp,
    replacementScenarioId: identifier.optional(),
    replacementScenarioVersion: semanticVersion.optional(),
  }),
]);

const workflowPromptsSchema = z.strictObject(
  Object.fromEntries(WORKFLOW_STEP_IDS.map((step) => [step, hebrewText])) as Record<
    (typeof WORKFLOW_STEP_IDS)[number],
    typeof hebrewText
  >,
);

export const scenarioAuthoringManifestSchema: z.ZodType<ScenarioAuthoringManifestV1> = z
  .strictObject({
    schemaVersion: z.literal(SCENARIO_AUTHORING_SCHEMA_VERSION),
    compilerVersion: z.literal(SCENARIO_COMPILER_VERSION),
    compilerContractChecksum: checksum,
    scenarioId: identifier,
    scenarioVersion: semanticVersion,
    datasetId: identifier,
    datasetVersion: semanticVersion,
    titleHe: hebrewText,
    difficulty: z.enum(['guided', 'independent', 'blind']),
    prerequisites: z.strictObject({
      exerciseIds: z.array(identifier).min(1).max(SCENARIO_INPUT_LIMITS.maxReferences),
      conceptIds: z.array(boundedString(512)).min(1).max(SCENARIO_INPUT_LIMITS.maxReferences),
    }),
    source: sourceSchema,
    chartSpec: chartSpecSchema,
    chartSpecChecksum: checksum,
    generatedDatasetChecksum: checksum,
    decisionCandleIndex: nonnegativeInteger,
    initialVisibleRange: z.strictObject({
      startCandleIndex: nonnegativeInteger,
      endCandleIndex: nonnegativeInteger,
    }),
    permittedReplayBoundaryIndex: nonnegativeInteger,
    knowledgeCutoffIndex: nonnegativeInteger,
    promptHe: hebrewText,
    blindEvidenceSummaryHe: hebrewText,
    hintsHe: z.array(hebrewText).max(SCENARIO_INPUT_LIMITS.maxHints),
    accessibility: z.strictObject({
      chartDescriptionHe: hebrewText,
      interactionInstructionsHe: hebrewText,
      preservesBlindness: z.literal(true),
    }),
    financialSafetyDisclosureHe: hebrewText,
    replayPolicy: z.strictObject({
      blind: z.literal(true),
      reveal: z.literal('after-finalization'),
    }),
    guidedAnalysis: z.strictObject({
      enabled: z.boolean(),
      availableHintCount: nonnegativeInteger.max(SCENARIO_INPUT_LIMITS.maxHints),
      preservesDecisionCutoff: z.literal(true),
    }),
    workflowPromptsHe: workflowPromptsSchema,
    processRubric: processRubricSchema,
    application: applicationDecisionSchema,
    planConstraints: z
      .strictObject({
        permittedDirections: z
          .array(z.enum(['long', 'short']))
          .min(1)
          .max(2)
          .refine(unique, 'must not contain duplicate directions'),
        permittedEntryOrderTypes: z
          .array(z.enum(['market', 'limit', 'stop']))
          .min(1)
          .max(3)
          .refine(unique, 'must not contain duplicate order types'),
      })
      .optional(),
    expectedExecution: expectedExecutionSchema.optional(),
    licensing: z.strictObject({
      owner: z.literal('ChartPath'),
      generatedDataOnly: z.literal(true),
      redistributionStatus: z.literal('prohibited'),
      publicationStatus: z.literal('internal'),
    }),
    materialArtifactChecksum: checksum,
    publication: publicationSchema,
    reviewStates: z.strictObject({
      source: z.enum(['pending', 'approved']),
      accessibility: z.enum(['pending', 'approved']),
      hebrew: z.enum(['pending', 'approved']),
      'financial-safety': z.enum(['pending', 'approved']),
    }),
    reviewFingerprint: checksum,
    retirement: retirementSchema,
  })
  .superRefine((value, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message });

    if (value.source.pageStart > value.source.pageEnd)
      issue(['source', 'pageEnd'], 'must not precede source.pageStart');
    if (!unique(value.source.reviewedContentIds))
      issue(['source', 'reviewedContentIds'], 'must not contain duplicate content IDs');
    if (!unique(value.prerequisites.exerciseIds))
      issue(['prerequisites', 'exerciseIds'], 'must not contain duplicate exercise IDs');
    if (!unique(value.prerequisites.conceptIds))
      issue(['prerequisites', 'conceptIds'], 'must not contain duplicate concept IDs');
    if (value.initialVisibleRange.startCandleIndex > value.initialVisibleRange.endCandleIndex)
      issue(['initialVisibleRange'], 'start candle must not follow end candle');
    if (value.initialVisibleRange.endCandleIndex > value.knowledgeCutoffIndex)
      issue(['initialVisibleRange', 'endCandleIndex'], 'must not exceed the knowledge cutoff');
    if (value.knowledgeCutoffIndex > value.permittedReplayBoundaryIndex)
      issue(['knowledgeCutoffIndex'], 'must not exceed the permitted replay boundary');
    if (value.permittedReplayBoundaryIndex > value.decisionCandleIndex)
      issue(['permittedReplayBoundaryIndex'], 'must not exceed the decision candle');
    if (value.decisionCandleIndex >= value.chartSpec.candleCount)
      issue(['decisionCandleIndex'], 'must refer to a generated chart candle');
    if (
      value.chartSpec.decisionCandleIndex !== undefined &&
      value.chartSpec.decisionCandleIndex !== value.decisionCandleIndex
    )
      issue(['chartSpec', 'decisionCandleIndex'], 'must equal the manifest decision candle');
    if (value.guidedAnalysis.availableHintCount !== value.hintsHe.length)
      issue(['guidedAnalysis', 'availableHintCount'], 'must equal the authored hint count');

    const rubricSteps = value.processRubric.criteria.map(({ workflowStepId }) => workflowStepId);
    if (!unique(rubricSteps) || WORKFLOW_STEP_IDS.some((step) => !rubricSteps.includes(step)))
      issue(['processRubric', 'criteria'], 'must contain every workflow step exactly once');
    if (JSON.stringify(value.processRubric.expectedDecision) !== JSON.stringify(value.application))
      issue(['processRubric', 'expectedDecision'], 'must exactly match application');

    if (value.application.kind === 'trade') {
      if (!value.expectedExecution)
        issue(['expectedExecution'], 'is required for a trade application');
      if (!value.planConstraints) issue(['planConstraints'], 'is required for a trade application');
      if (value.expectedExecution) {
        if (value.expectedExecution.direction !== value.application.direction)
          issue(['expectedExecution', 'direction'], 'must match the application direction');
        if (value.expectedExecution.plan.direction !== value.application.direction)
          issue(['expectedExecution', 'plan', 'direction'], 'must match the application direction');
        if (
          value.expectedExecution.entryOrderType !== value.expectedExecution.plan.entryIntent.type
        )
          issue(['expectedExecution', 'entryOrderType'], 'must match the plan entry intent');
        if (value.expectedExecution.plan.authoredAtCandleIndex !== value.decisionCandleIndex)
          issue(
            ['expectedExecution', 'plan', 'authoredAtCandleIndex'],
            'must equal the decision candle',
          );
        if (
          value.expectedExecution.expectedStatus !==
          value.expectedExecution.expectedSnapshot.terminalStatus
        )
          issue(
            ['expectedExecution', 'expectedStatus'],
            'must match the expected snapshot terminal status',
          );
        value.expectedExecution.expectedSnapshot.events.forEach((event, index) => {
          if (event.candleIndex !== undefined && event.candleIndex >= value.chartSpec.candleCount)
            issue(
              ['expectedExecution', 'expectedSnapshot', 'events', index, 'candleIndex'],
              'must refer to a generated chart candle',
            );
        });
      }
      if (
        value.planConstraints &&
        !value.planConstraints.permittedDirections.includes(value.application.direction)
      )
        issue(['planConstraints', 'permittedDirections'], 'must include the application direction');
      if (
        value.planConstraints &&
        value.expectedExecution &&
        !value.planConstraints.permittedEntryOrderTypes.includes(
          value.expectedExecution.entryOrderType,
        )
      )
        issue(
          ['planConstraints', 'permittedEntryOrderTypes'],
          'must include the expected entry type',
        );
    } else {
      if (value.expectedExecution)
        issue(['expectedExecution'], 'is forbidden for a no-trade application');
      if (value.planConstraints)
        issue(['planConstraints'], 'is forbidden for a no-trade application');
    }

    const recordIds = value.publication.records.map(({ reviewerRecordId }) => reviewerRecordId);
    if (!unique(recordIds))
      issue(['publication', 'records'], 'reviewerRecordId values must be globally unique');
    if (
      value.retirement.status === 'retired' &&
      (value.retirement.replacementScenarioId === undefined) !==
        (value.retirement.replacementScenarioVersion === undefined)
    )
      issue(['retirement'], 'replacement must pin both scenario ID and semantic version');
  });

export function formatScenarioSchemaIssues(error: z.ZodError): readonly string[] {
  const issues = error.issues.flatMap((item) => {
    const path = item.path.reduce<string>((current, segment) => {
      if (typeof segment === 'number') return `${current}[${segment}]`;
      return propertyPath(current, String(segment));
    }, '$');
    if (item.code === 'unrecognized_keys')
      return [...item.keys].sort().map((key) => `${propertyPath(path, key)}: unrecognized field`);
    return [`${path}: ${item.message}`];
  });
  return [...new Set(issues)].sort();
}
