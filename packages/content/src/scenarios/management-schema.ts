import { computePositionManagementRubricChecksum } from '@chartpath/domain';
import { canonicalSerialize, sha256Hex } from '@chartpath/historical-data';
import { z } from 'zod';

import {
  buildScenarioPositionManagementExtension,
  scenarioPositionManagementVariantRegistry,
  type ScenarioPositionManagementConfigurationV1,
  type ScenarioPositionManagementExtensionV1,
} from './management.js';
import {
  SCENARIO_INPUT_LIMITS,
  formatScenarioSchemaIssues,
  preflightScenarioAuthoringInput,
} from './schema.js';

const id = z
  .string()
  .min(1)
  .max(SCENARIO_INPUT_LIMITS.maxIdentifierLength)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/iu, 'must be a stable identifier');
const text = z
  .string()
  .min(1)
  .max(SCENARIO_INPUT_LIMITS.maxTextLength)
  .refine((value) => value === value.trim(), 'must be trimmed');
const hebrewText = text.refine(
  (value) => /[\u0590-\u05ff]/u.test(value),
  'must contain Hebrew learner-facing text',
);
const version = z
  .string()
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u, 'must be canonical semver');
const checksum = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
const integer = z.number().int().safe();
const nonnegative = integer.nonnegative();
const positive = integer.positive();

const materialIntent = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('full-exit') }).strict(),
  z.object({ kind: z.literal('partial-exit'), quantityUnits: positive }).strict(),
  z
    .object({
      kind: z.literal('scale-in'),
      quantityUnits: positive,
      estimatedEntryPrice: z.number().finite().positive(),
    })
    .strict(),
  z.object({ kind: z.literal('replace-stop'), price: z.number().finite().positive() }).strict(),
  z.object({ kind: z.literal('replace-target'), price: z.number().finite().positive() }).strict(),
]);

const evidenceTag = z.enum([
  'predefined-plan',
  'visible-price-evidence',
  'structural-change',
  'risk-budget',
  'invalidation-rule',
  'target-rule',
  'voluntary-exit-rule',
  'execution-costs',
  'uncertainty-recorded',
]);
const decisionBasis = z.enum([
  'predefined-plan',
  'new-visible-evidence',
  'risk-reduction',
  'outcome-chasing',
  'future-information',
]);
const processEvidence = z
  .object({
    decisionBasis,
    riskReviewed: z.boolean(),
    evidenceTags: z.array(evidenceTag).max(8),
  })
  .strict();

const caseAction = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('material-intent'),
      actionId: id,
      authoredAtCandleIndex: nonnegative,
      intent: materialIntent,
      rationaleHe: hebrewText,
      processEvidence,
      processThroughCandleIndex: nonnegative.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('process-only'),
      actionId: id,
      processThroughCandleIndex: nonnegative,
    })
    .strict(),
  z
    .object({
      type: z.literal('cancel-pending'),
      actionId: id,
      submissionActionId: id,
      authoredAtCandleIndex: nonnegative,
    })
    .strict(),
  z
    .object({
      type: z.literal('reload-session'),
      actionId: id,
      authoredAtCandleIndex: nonnegative,
    })
    .strict(),
]);

const doctrineReference = z
  .object({
    sourceId: z.literal('ta-he-v2'),
    pageStart: positive,
    pageEnd: positive,
    bookPageStart: positive,
    bookPageEnd: positive,
    chapter: hebrewText,
    figureOrCase: hebrewText,
    reviewedContentId: id,
  })
  .strict()
  .refine((value) => value.pageEnd >= value.pageStart, { message: 'page range is reversed' })
  .refine((value) => value.bookPageEnd >= value.bookPageStart, {
    message: 'book-page range is reversed',
  });

const domainCriterion = z.discriminatedUnion('kind', [
  z
    .object({
      criterionId: id,
      kind: z.literal('decision-basis'),
      accepted: z.array(decisionBasis).min(1).max(5),
    })
    .strict(),
  z
    .object({ criterionId: id, kind: z.literal('risk-reviewed'), required: z.literal(true) })
    .strict(),
  z
    .object({
      criterionId: id,
      kind: z.literal('evidence-tags'),
      accepted: z.array(evidenceTag).min(1).max(9),
      minimumMatches: positive,
    })
    .strict(),
  z
    .object({
      criterionId: id,
      kind: z.literal('risk-warning-acknowledged'),
      required: z.literal(true),
    })
    .strict(),
  z
    .object({
      criterionId: id,
      kind: z.literal('minimum-material-actions'),
      minimum: nonnegative.max(16),
    })
    .strict(),
]);

const rubric = z
  .object({
    rubricId: id,
    rubricVersion: z.literal('1.0.0'),
    criteria: z
      .array(
        z
          .object({
            criterionId: id,
            basis: z.enum(['reviewed-source', 'neutral-simulator-mechanics']),
            criterionHe: hebrewText,
            expectedEvidenceHe: hebrewText,
            source: doctrineReference.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(16),
    scoring: z
      .object({
        profitAndLossAffectsScore: z.literal(false),
        futureOutcomeAffectsScore: z.literal(false),
      })
      .strict(),
    domainRubric: z
      .object({ schemaVersion: z.literal(1), criteria: z.array(domainCriterion).min(1).max(16) })
      .strict(),
    checksum,
  })
  .strict();

const snapshot = z
  .object({
    schemaVersion: z.literal(1),
    stageId: id,
    status: z.enum([
      'active',
      'closed-voluntary',
      'closed-stop',
      'closed-target',
      'ambiguous',
      'completed-open',
    ]),
    lastProcessedCandleIndex: nonnegative,
    openQuantityUnits: nonnegative,
    closedQuantityUnits: nonnegative,
    activeProtectiveStopMinor: positive,
    activeTargetMinor: positive,
    currentRiskMinor: nonnegative,
    grossRealizedMinor: integer,
    realizedNetMinor: integer,
    totalCommissionMinor: nonnegative,
    totalModeledExecutionCostMinor: nonnegative,
    journalEntryCount: nonnegative,
    eventTypes: z
      .array(
        z.enum([
          'management-session-created',
          'management-draft-edited',
          'management-action-submitted',
          'management-action-cancelled',
          'management-action-risk-rejected',
          'protective-stop-replaced',
          'target-replaced',
          'voluntary-exit-filled',
          'scale-in-filled',
          'position-closed-stop',
          'position-closed-target',
          'position-management-ambiguous',
          'management-observation-recorded',
          'management-journal-corrected',
          'position-open-at-replay-end',
        ]),
      )
      .max(SCENARIO_INPUT_LIMITS.maxSnapshotEvents),
    pendingActionKind: z
      .enum(['full-exit', 'partial-exit', 'scale-in', 'replace-stop', 'replace-target'])
      .optional(),
    draftHardRejectionCodes: z
      .array(
        z.enum([
          'PROJECTED_RISK_EXCEEDS_ORIGINAL_1R',
          'PROJECTED_RISK_EXCEEDS_HARD_LIMIT',
          'SCALE_IN_EXCEEDS_QUANTITY_LIMIT',
        ]),
      )
      .max(3)
      .optional(),
    ambiguityReason: z
      .enum(['voluntary-action-and-opening-threshold', 'stop-and-target-same-candle'])
      .optional(),
    debrief: z
      .object({
        outcome: z.enum([
          'voluntary-exit',
          'protective-stop',
          'target',
          'ambiguous',
          'open-at-replay-end',
        ]),
        outcomeDeterminate: z.boolean(),
        processQuality: z.enum(['coherent', 'mixed', 'needs-review']),
        realizedNetMinor: integer,
        materialActionCount: nonnegative,
      })
      .strict()
      .optional(),
    checksum,
  })
  .strict();

const policy = z
  .object({
    version: z.literal('position-management-policy-v1'),
    actionTiming: z.literal('cutoff-n-eligible-n-plus-one'),
    replacementPriority: z.literal('activate-before-opening-thresholds'),
    voluntaryOpeningConflict: z.literal('pause-as-ambiguous'),
    intrabarThresholdConflict: z.literal('pause-as-ambiguous'),
    voluntaryFillPoint: z.literal('next-candle-open'),
    scaleInMaximumInitialQuantityBps: z.literal(10_000),
    softRiskLimitOriginalRBps: z.literal(10_000),
    hardRiskLimitOriginalRBps: z.literal(20_000),
    automaticTrailing: z.literal(false),
  })
  .strict();

const management = z
  .object({
    schemaVersion: z.literal(1),
    enabled: z.literal(true),
    permissionVersion: id,
    policy,
    riskLimits: z
      .object({
        maxOpenQuantityUnits: positive.max(1_000_000),
        maxScaleInInitialQuantityBps: positive.max(1_000_000),
        softRiskLimitOriginalRBps: positive.max(1_000_000),
        hardRiskLimitOriginalRBps: positive.max(1_000_000),
      })
      .strict(),
    permittedActionKinds: z
      .array(z.enum(['full-exit', 'partial-exit', 'scale-in', 'replace-stop', 'replace-target']))
      .min(1)
      .max(5),
    rubric,
    expectedCases: z
      .array(
        z
          .object({
            caseId: id,
            actions: z.array(caseAction).min(1).max(16),
            evidence: z.array(text).max(64),
            snapshots: z.array(snapshot).min(1).max(32),
          })
          .strict(),
      )
      .min(1)
      .max(32),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.permittedActionKinds).size !== value.permittedActionKinds.length)
      context.addIssue({
        code: 'custom',
        path: ['permittedActionKinds'],
        message: 'must be unique',
      });
    value.expectedCases.forEach((expectedCase, caseIndex) => {
      expectedCase.actions.forEach((action, actionIndex) => {
        if (
          action.type === 'material-intent' &&
          new Set(action.processEvidence.evidenceTags).size !==
            action.processEvidence.evidenceTags.length
        )
          context.addIssue({
            code: 'custom',
            path: [
              'expectedCases',
              caseIndex,
              'actions',
              actionIndex,
              'processEvidence',
              'evidenceTags',
            ],
            message: 'process evidence tags must be unique',
          });
      });
    });
    if (value.riskLimits.softRiskLimitOriginalRBps > value.riskLimits.hardRiskLimitOriginalRBps)
      context.addIssue({
        code: 'custom',
        path: ['riskLimits'],
        message: 'soft risk limit exceeds hard limit',
      });
    if (
      value.permittedActionKinds.includes('scale-in') &&
      value.riskLimits.maxScaleInInitialQuantityBps < 10_000
    )
      context.addIssue({
        code: 'custom',
        path: ['riskLimits', 'maxScaleInInitialQuantityBps'],
        message: 'must permit the authored scale-in ceiling',
      });
    const criterionIds = value.rubric.domainRubric.criteria.map(({ criterionId }) => criterionId);
    if (new Set(criterionIds).size !== criterionIds.length)
      context.addIssue({
        code: 'custom',
        path: ['rubric', 'domainRubric'],
        message: 'criterion IDs must be unique',
      });
    for (const [index, criterion] of value.rubric.domainRubric.criteria.entries()) {
      if ('accepted' in criterion && new Set(criterion.accepted).size !== criterion.accepted.length)
        context.addIssue({
          code: 'custom',
          path: ['rubric', 'domainRubric', 'criteria', index, 'accepted'],
          message: 'accepted values must be unique',
        });
      if (
        criterion.kind === 'evidence-tags' &&
        criterion.minimumMatches > criterion.accepted.length
      )
        context.addIssue({
          code: 'custom',
          path: ['rubric', 'domainRubric', 'criteria', index, 'minimumMatches'],
          message: 'minimum matches exceeds accepted evidence tags',
        });
    }
    value.rubric.criteria.forEach((criterion, index) => {
      if ((criterion.basis === 'reviewed-source') !== (criterion.source !== undefined))
        context.addIssue({
          code: 'custom',
          path: ['rubric', 'criteria', index, 'source'],
          message: 'source is required only for reviewed-source criteria',
        });
    });
    const learnerCriterionIds = value.rubric.criteria.map(({ criterionId }) => criterionId);
    if (new Set(learnerCriterionIds).size !== learnerCriterionIds.length)
      context.addIssue({
        code: 'custom',
        path: ['rubric', 'criteria'],
        message: 'learner-facing criterion IDs must be unique',
      });
    const caseIds = value.expectedCases.map(({ caseId }) => caseId);
    if (new Set(caseIds).size !== caseIds.length)
      context.addIssue({
        code: 'custom',
        path: ['expectedCases'],
        message: 'case IDs must be unique',
      });
    value.expectedCases.forEach((expectedCase, caseIndex) => {
      const actionIds = expectedCase.actions.map(({ actionId }) => actionId);
      if (new Set(actionIds).size !== actionIds.length)
        context.addIssue({
          code: 'custom',
          path: ['expectedCases', caseIndex, 'actions'],
          message: 'action IDs must be unique within a case',
        });
      let lastCutoff = -1;
      expectedCase.actions.forEach((action, actionIndex) => {
        const cutoff =
          action.type === 'material-intent'
            ? action.authoredAtCandleIndex
            : action.type === 'process-only'
              ? action.processThroughCandleIndex
              : action.authoredAtCandleIndex;
        if (cutoff < lastCutoff)
          context.addIssue({
            code: 'custom',
            path: ['expectedCases', caseIndex, 'actions', actionIndex],
            message: 'action cutoffs must be monotonic',
          });
        lastCutoff = cutoff;
        if (
          action.type === 'material-intent' &&
          action.processThroughCandleIndex !== undefined &&
          action.processThroughCandleIndex <= action.authoredAtCandleIndex
        )
          context.addIssue({
            code: 'custom',
            path: ['expectedCases', caseIndex, 'actions', actionIndex, 'processThroughCandleIndex'],
            message: 'processed candles must follow the authored cutoff',
          });
        if (
          action.type === 'material-intent' &&
          !value.permittedActionKinds.includes(action.intent.kind)
        )
          context.addIssue({
            code: 'custom',
            path: ['expectedCases', caseIndex, 'actions', actionIndex, 'intent', 'kind'],
            message: 'action kind is not permitted by this scenario',
          });
        if (
          action.type === 'cancel-pending' &&
          (!actionIds.includes(action.submissionActionId) ||
            actionIds.indexOf(action.submissionActionId) >= actionIndex)
        )
          context.addIssue({
            code: 'custom',
            path: ['expectedCases', caseIndex, 'actions', actionIndex, 'submissionActionId'],
            message: 'cancellation must reference an earlier action in the same case',
          });
      });
      if (new Set(expectedCase.evidence).size !== expectedCase.evidence.length)
        context.addIssue({
          code: 'custom',
          path: ['expectedCases', caseIndex, 'evidence'],
          message: 'case evidence must be unique',
        });
      const snapshotStages = expectedCase.snapshots.map(({ stageId }) => stageId);
      if (new Set(snapshotStages).size !== snapshotStages.length)
        context.addIssue({
          code: 'custom',
          path: ['expectedCases', caseIndex, 'snapshots'],
          message: 'snapshot stage IDs must be unique within a case',
        });
      for (let index = 1; index < expectedCase.snapshots.length; index += 1)
        if (
          expectedCase.snapshots[index]!.lastProcessedCandleIndex <
          expectedCase.snapshots[index - 1]!.lastProcessedCandleIndex
        )
          context.addIssue({
            code: 'custom',
            path: ['expectedCases', caseIndex, 'snapshots', index, 'lastProcessedCandleIndex'],
            message: 'snapshot cutoffs must be monotonic',
          });
    });
  });

const disabledManagement = z
  .object({
    schemaVersion: z.literal(1),
    enabled: z.literal(false),
    reason: z.enum(['scenario-disabled', 'unfilled-entry', 'no-trade']),
  })
  .strict();

export const scenarioPositionManagementConfigurationSchema = z.union([
  management,
  disabledManagement,
]);

export const scenarioPositionManagementExtensionSchema = z
  .object({
    schemaVersion: z.literal(1),
    scenarioId: id,
    scenarioVersion: version,
    datasetId: id,
    datasetVersion: version,
    datasetChecksum: checksum,
    management,
    publication: z
      .object({
        status: z.literal('human-review-required'),
        learningCredit: z.literal('none'),
        reviewScopes: z.tuple([
          z.literal('source'),
          z.literal('rubric'),
          z.literal('execution'),
          z.literal('accessibility'),
          z.literal('hebrew'),
          z.literal('financial-safety'),
          z.literal('publication'),
        ]),
        records: z.tuple([]),
        blockers: z.array(text).min(1).max(SCENARIO_INPUT_LIMITS.maxPublicationBlockers),
      })
      .strict(),
    materialArtifactChecksum: checksum,
    extensionChecksum: checksum,
  })
  .strict()
  .superRefine((value, context) => {
    const expectedPermissionVersion = `scenario-position-management-permission-v1-${value.scenarioId}-${value.scenarioVersion.replaceAll('.', '-')}`;
    if (value.management.permissionVersion !== expectedPermissionVersion)
      context.addIssue({
        code: 'custom',
        path: ['management', 'permissionVersion'],
        message: 'must bind the exact scenario identity',
      });
  });

export type ScenarioPositionManagementExtensionParseResult =
  | { readonly ok: true; readonly value: ScenarioPositionManagementExtensionV1 }
  | { readonly ok: false; readonly issues: readonly string[] };

export type ScenarioPositionManagementConfigurationParseResult =
  | { readonly ok: true; readonly value: ScenarioPositionManagementConfigurationV1 }
  | { readonly ok: false; readonly issues: readonly string[] };

function sha256(value: unknown): string {
  return `sha256:${sha256Hex(canonicalSerialize(value))}`;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function parseScenarioPositionManagementExtension(
  input: unknown,
): ScenarioPositionManagementExtensionParseResult {
  const preflight = preflightScenarioAuthoringInput(input);
  if (!preflight.ok) return preflight;
  const parsed = scenarioPositionManagementExtensionSchema.safeParse(preflight.value);
  if (!parsed.success) return { ok: false, issues: formatScenarioSchemaIssues(parsed.error) };
  const value = parsed.data as ScenarioPositionManagementExtensionV1;
  const issues: string[] = [];
  const rubricChecksum = computePositionManagementRubricChecksum(
    value.management.rubric.domainRubric,
  );
  if (rubricChecksum !== value.management.rubric.checksum)
    issues.push('$.management.rubric.checksum: canonical rubric checksum mismatch');
  for (const [caseIndex, expectedCase] of value.management.expectedCases.entries()) {
    for (const [snapshotIndex, item] of expectedCase.snapshots.entries()) {
      const { checksum: expected, ...material } = item;
      if (sha256(material) !== expected)
        issues.push(
          `$.management.expectedCases[${caseIndex}].snapshots[${snapshotIndex}].checksum: canonical snapshot checksum mismatch`,
        );
    }
  }
  const { extensionChecksum, ...material } = value;
  if (sha256(material) !== extensionChecksum)
    issues.push('$.extensionChecksum: canonical management extension checksum mismatch');
  const compiled = scenarioPositionManagementVariantRegistry.find(
    (variant) =>
      variant.scenarioId === value.scenarioId && variant.scenarioVersion === value.scenarioVersion,
  );
  if (!compiled) issues.push('$: management extension is not in the immutable internal registry');
  else if (
    canonicalSerialize(buildScenarioPositionManagementExtension(compiled)) !==
    canonicalSerialize(value)
  )
    issues.push('$: management extension differs from the reducer-produced immutable artifact');
  return issues.length
    ? { ok: false, issues: Object.freeze(issues.sort()) }
    : { ok: true, value: deepFreeze(structuredClone(value)) };
}

export function parseScenarioPositionManagementConfiguration(
  input: unknown,
): ScenarioPositionManagementConfigurationParseResult {
  const preflight = preflightScenarioAuthoringInput(input);
  if (!preflight.ok) return preflight;
  const parsed = scenarioPositionManagementConfigurationSchema.safeParse(preflight.value);
  if (!parsed.success) return { ok: false, issues: formatScenarioSchemaIssues(parsed.error) };
  if (parsed.data.enabled) {
    const issues: string[] = [];
    if (
      computePositionManagementRubricChecksum(parsed.data.rubric.domainRubric) !==
      parsed.data.rubric.checksum
    )
      issues.push('$.rubric.checksum: canonical rubric checksum mismatch');
    for (const [caseIndex, expectedCase] of parsed.data.expectedCases.entries()) {
      for (const [snapshotIndex, item] of expectedCase.snapshots.entries()) {
        const { checksum: expected, ...material } = item;
        if (sha256(material) !== expected)
          issues.push(
            `$.expectedCases[${caseIndex}].snapshots[${snapshotIndex}].checksum: canonical snapshot checksum mismatch`,
          );
      }
    }
    if (issues.length > 0) return { ok: false, issues: Object.freeze(issues.sort()) };
  }
  return {
    ok: true,
    value: deepFreeze(structuredClone(parsed.data)) as ScenarioPositionManagementConfigurationV1,
  };
}
