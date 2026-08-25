import {
  DEFAULT_POSITION_MANAGEMENT_POLICY,
  assertValidPositionManagementSession,
  computePositionManagementRubricChecksum,
  createPaperExecutionSession,
  createPositionManagementSession,
  previewPositionManagementIntent,
  reducePaperExecutionSession,
  reducePositionManagementSession,
  selectPositionManagementSnapshot,
  type OhlcvCandle,
  type PositionManagementAuthority,
  type PositionManagementMaterialIntent,
  type PositionManagementPolicy,
  type PositionManagementProcessEvidence,
  type PositionManagementRiskCode,
  type PositionManagementRubricV1,
  type PositionManagementSession,
} from '@chartpath/domain';
import {
  canonicalSerialize,
  importHistoricalCsv,
  sha256Hex,
  type HistoricalDataset,
  type HistoricalReplayScenario,
  type HistoricalSourceManifest,
  type Sha256Checksum,
} from '@chartpath/historical-data';

import { scenarioCandidateRegistry } from './registry.js';

export const SCENARIO_POSITION_MANAGEMENT_SCHEMA_VERSION = 1 as const;
export const SCENARIO_POSITION_MANAGEMENT_PERMISSION_VERSION =
  'scenario-position-management-permission-v1' as const;
export const SCENARIO_POSITION_MANAGEMENT_RUBRIC_VERSION = '1.0.0' as const;

export type ScenarioPositionManagementUnavailableReason =
  'scenario-disabled' | 'unfilled-entry' | 'no-trade' | 'unknown-scenario' | 'credit-mismatch';

export interface ScenarioManagementDoctrineReferenceV1 {
  readonly sourceId: 'ta-he-v2';
  readonly pageStart: number;
  readonly pageEnd: number;
  readonly bookPageStart: number;
  readonly bookPageEnd: number;
  readonly chapter: string;
  readonly figureOrCase: string;
  readonly reviewedContentId: string;
}

export interface ScenarioPositionManagementRubricV1 {
  readonly rubricId: string;
  readonly rubricVersion: typeof SCENARIO_POSITION_MANAGEMENT_RUBRIC_VERSION;
  readonly criteria: readonly {
    readonly criterionId: string;
    readonly basis: 'reviewed-source' | 'neutral-simulator-mechanics';
    readonly criterionHe: string;
    readonly expectedEvidenceHe: string;
    readonly source?: ScenarioManagementDoctrineReferenceV1;
  }[];
  readonly scoring: {
    readonly profitAndLossAffectsScore: false;
    readonly futureOutcomeAffectsScore: false;
  };
  readonly domainRubric: PositionManagementRubricV1;
  readonly checksum: Sha256Checksum;
}

export type ScenarioManagementCaseActionV1 =
  | {
      readonly type: 'material-intent';
      readonly actionId: string;
      readonly authoredAtCandleIndex: number;
      readonly intent: PositionManagementMaterialIntent;
      readonly rationaleHe: string;
      readonly processEvidence: PositionManagementProcessEvidence;
      readonly processThroughCandleIndex?: number;
    }
  | {
      readonly type: 'process-only';
      readonly actionId: string;
      readonly processThroughCandleIndex: number;
    }
  | {
      readonly type: 'cancel-pending';
      readonly actionId: string;
      readonly submissionActionId: string;
      readonly authoredAtCandleIndex: number;
    }
  | {
      readonly type: 'reload-session';
      readonly actionId: string;
      readonly authoredAtCandleIndex: number;
    };

export interface ScenarioManagementSnapshotV1 {
  readonly schemaVersion: 1;
  readonly stageId: string;
  readonly status: PositionManagementSession['status'];
  readonly lastProcessedCandleIndex: number;
  readonly openQuantityUnits: number;
  readonly closedQuantityUnits: number;
  readonly activeProtectiveStopMinor: number;
  readonly activeTargetMinor: number;
  readonly currentRiskMinor: number;
  readonly grossRealizedMinor: number;
  readonly realizedNetMinor: number;
  readonly totalCommissionMinor: number;
  readonly totalModeledExecutionCostMinor: number;
  readonly journalEntryCount: number;
  readonly eventTypes: readonly string[];
  readonly pendingActionKind?: PositionManagementMaterialIntent['kind'];
  readonly draftHardRejectionCodes?: readonly PositionManagementRiskCode[];
  readonly ambiguityReason?: PositionManagementSession['ambiguityReason'];
  readonly debrief?: {
    readonly outcome: NonNullable<PositionManagementSession['debrief']>['outcome'];
    readonly outcomeDeterminate: boolean;
    readonly processQuality: NonNullable<PositionManagementSession['debrief']>['processQuality'];
    readonly realizedNetMinor: number;
    readonly materialActionCount: number;
  };
  readonly checksum: Sha256Checksum;
}

export interface ScenarioManagementExpectedCaseV1 {
  readonly caseId: string;
  readonly actions: readonly ScenarioManagementCaseActionV1[];
  readonly evidence: readonly string[];
  readonly snapshots: readonly ScenarioManagementSnapshotV1[];
}

export interface ScenarioPositionManagementEnabledV1 {
  readonly schemaVersion: typeof SCENARIO_POSITION_MANAGEMENT_SCHEMA_VERSION;
  readonly enabled: true;
  readonly permissionVersion: string;
  readonly policy: PositionManagementPolicy;
  readonly riskLimits: PositionManagementAuthority['riskLimits'];
  readonly permittedActionKinds: PositionManagementAuthority['permittedActionKinds'];
  readonly rubric: ScenarioPositionManagementRubricV1;
  readonly expectedCases: readonly ScenarioManagementExpectedCaseV1[];
}

export interface ScenarioPositionManagementDisabledV1 {
  readonly schemaVersion: typeof SCENARIO_POSITION_MANAGEMENT_SCHEMA_VERSION;
  readonly enabled: false;
  readonly reason: Exclude<
    ScenarioPositionManagementUnavailableReason,
    'unknown-scenario' | 'credit-mismatch'
  >;
}

export type ScenarioPositionManagementConfigurationV1 =
  ScenarioPositionManagementEnabledV1 | ScenarioPositionManagementDisabledV1;

export interface ScenarioPositionManagementVariantV1 {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly datasetChecksum: Sha256Checksum;
  readonly baseScenarioVersion: string;
  readonly baseDatasetVersion: string;
  readonly baseDatasetChecksum: Sha256Checksum;
  readonly scenario: HistoricalReplayScenario;
  readonly dataset: HistoricalDataset;
  readonly management: ScenarioPositionManagementEnabledV1;
  readonly publication: {
    readonly status: 'human-review-required';
    readonly learningCredit: 'none';
    readonly reviewScopes: readonly [
      'source',
      'rubric',
      'execution',
      'accessibility',
      'hebrew',
      'financial-safety',
      'publication',
    ];
    readonly records: readonly [];
    readonly blockers: readonly string[];
  };
  readonly materialArtifactChecksum: Sha256Checksum;
}

export interface ScenarioPositionManagementReport {
  readonly valid: boolean;
  readonly publishable: false;
  readonly registryChecksum: Sha256Checksum;
  readonly counts: {
    readonly variants: number;
    readonly enabled: number;
    readonly originalDisabled: number;
    readonly expectedCases: number;
    readonly reviewScopes: 7;
    readonly publicationBlockers: number;
  };
  readonly variants: readonly {
    readonly scenarioId: string;
    readonly scenarioVersion: string;
    readonly datasetId: string;
    readonly datasetVersion: string;
    readonly datasetChecksum: Sha256Checksum;
    readonly baseScenarioVersion: string;
    readonly baseDatasetVersion: string;
    readonly baseDatasetChecksum: Sha256Checksum;
    readonly materialArtifactChecksum: Sha256Checksum;
    readonly permissionVersion: string;
    readonly policyVersion: PositionManagementPolicy['version'];
    readonly permittedActionKinds: PositionManagementAuthority['permittedActionKinds'];
    readonly riskLimits: PositionManagementAuthority['riskLimits'];
    readonly rubric: {
      readonly rubricId: string;
      readonly rubricVersion: string;
      readonly rubricChecksum: Sha256Checksum;
    };
    readonly expectedCases: readonly {
      readonly caseId: string;
      readonly actionIds: readonly string[];
      readonly snapshotChecksums: readonly Sha256Checksum[];
    }[];
    readonly learningCredit: 'none';
    readonly publicationStatus: 'human-review-required';
    readonly reviewScopes: ScenarioPositionManagementVariantV1['publication']['reviewScopes'];
    readonly publicationBlockers: readonly string[];
  }[];
}

/** Strict-boundary projection; compiled candles/scenarios remain behind historical-data validation. */
export interface ScenarioPositionManagementExtensionV1 {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly datasetChecksum: Sha256Checksum;
  readonly management: ScenarioPositionManagementEnabledV1;
  readonly publication: ScenarioPositionManagementVariantV1['publication'];
  readonly materialArtifactChecksum: Sha256Checksum;
  readonly extensionChecksum: Sha256Checksum;
}

export type ScenarioPositionManagementAuthorityResolution =
  | {
      readonly status: 'enabled';
      readonly authority: PositionManagementAuthority;
      readonly policy: PositionManagementPolicy;
      readonly maximumOpenQuantityUnits: number;
    }
  | {
      readonly status: 'unavailable';
      readonly reason: ScenarioPositionManagementUnavailableReason;
    };

const REVIEW_SCOPES = [
  'source',
  'rubric',
  'execution',
  'accessibility',
  'hebrew',
  'financial-safety',
  'publication',
] as const;

const ALL_ACTIONS = [
  'full-exit',
  'partial-exit',
  'scale-in',
  'replace-stop',
  'replace-target',
] as const;

const FIXED_TIME = '2031-01-01T00:00:00.000Z';

function coherentProcessEvidence(): PositionManagementProcessEvidence {
  return {
    decisionBasis: 'predefined-plan',
    riskReviewed: true,
    evidenceTags: ['predefined-plan', 'risk-budget', 'uncertainty-recorded'],
  };
}

function scenarioPermissionVersion(scenarioId: string, scenarioVersion: string): string {
  return `${SCENARIO_POSITION_MANAGEMENT_PERMISSION_VERSION}-${scenarioId}-${scenarioVersion.replaceAll('.', '-')}`;
}

function checksum(value: unknown): Sha256Checksum {
  return `sha256:${sha256Hex(canonicalSerialize(value))}`;
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function domainCandles(dataset: HistoricalDataset): readonly OhlcvCandle[] {
  return dataset.candles.map((candle) => ({
    index: candle.index,
    timestamp: candle.timestampUtc,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));
}

function candidate(scenarioId: string) {
  const resolved = scenarioCandidateRegistry.find(
    (item) => item.manifest.scenarioId === scenarioId && item.manifest.scenarioVersion === '1.0.0',
  );
  if (!resolved) throw new Error(`Missing pinned management base candidate: ${scenarioId}@1.0.0`);
  return resolved;
}

function cloneDatasetWithFutureCandles(
  base: HistoricalDataset,
  datasetVersion: string,
  lastPreservedCandleIndex: number,
  replacements: Readonly<Record<number, Pick<OhlcvCandle, 'open' | 'high' | 'low' | 'close'>>>,
): HistoricalDataset {
  const replacementIndexes = Object.keys(replacements).map(Number);
  if (
    replacementIndexes.length === 0 ||
    replacementIndexes.some(
      (index) => !Number.isSafeInteger(index) || index <= lastPreservedCandleIndex,
    )
  )
    throw new Error('Management dataset replacements must be strictly after the preserved cutoff');
  const candles = base.candles.map((candle) => ({ ...candle, ...replacements[candle.index] }));
  const rawCsv = [
    'timestamp,open,high,low,close,volume,session',
    ...candles.map(
      (candle) =>
        `${candle.timestampUtc},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume},${candle.session}`,
    ),
  ].join('\n');
  const manifest = base.manifest;
  const source: HistoricalSourceManifest = {
    datasetId: manifest.datasetId,
    schemaVersion: manifest.schemaVersion,
    datasetVersion,
    provenance: {
      ...manifest.provenance,
      datasetOrEndpointId: `${manifest.provenance.datasetOrEndpointId}:management:${datasetVersion}`,
      knownLimitations: [
        ...manifest.provenance.knownLimitations,
        'Future-only candles were deterministically replaced for internal position-management QA.',
      ],
    },
    symbol: manifest.symbol,
    displaySymbol: manifest.displaySymbol,
    exchange: manifest.exchange,
    ...(manifest.mic ? { mic: manifest.mic } : {}),
    currency: manifest.currency,
    exchangeTimezone: manifest.exchangeTimezone,
    interval: manifest.interval,
    pricePrecision: manifest.pricePrecision,
    volumeUnit: manifest.volumeUnit,
    adjustment: manifest.adjustment,
    sessionPolicy: manifest.sessionPolicy,
    missingIntervalPolicy: manifest.missingIntervalPolicy,
    publicationStatus: 'internal',
    ...(manifest.anonymizedLearnerIdentity
      ? { anonymizedLearnerIdentity: manifest.anonymizedLearnerIdentity }
      : {}),
    expectedCandleCount: candles.length,
    corporateActions: base.corporateActions,
  };
  const imported = importHistoricalCsv(rawCsv, source);
  if (!imported.ok)
    throw new Error(
      `Management dataset import failed: ${imported.report.issues.map((issue) => issue.code).join(', ')}`,
    );
  return imported.dataset;
}

function variantScenario(
  base: HistoricalReplayScenario,
  scenarioVersion: string,
  dataset: HistoricalDataset,
): HistoricalReplayScenario {
  return deepFreeze({
    ...structuredClone(base),
    scenarioVersion,
    dataset: {
      datasetId: dataset.manifest.datasetId,
      datasetVersion: dataset.manifest.datasetVersion,
      canonicalChecksum: dataset.manifest.canonicalChecksum,
    },
    hebrewDisclosure: `${base.hebrewDisclosure} ניהול הפוזיציה הוא תרגיל QA פנימי, סינתטי וללא קרדיט.`,
  });
}

function rubric(scenarioId: string, scenarioVersion: string): ScenarioPositionManagementRubricV1 {
  const domainRubric: PositionManagementRubricV1 = {
    schemaVersion: 1,
    criteria: [
      {
        criterionId: 'management-predefined-or-visible-evidence',
        kind: 'decision-basis',
        accepted: ['predefined-plan', 'new-visible-evidence', 'risk-reduction'],
      },
      { criterionId: 'management-risk-reviewed', kind: 'risk-reviewed', required: true },
      {
        criterionId: 'management-evidence-recorded',
        kind: 'evidence-tags',
        accepted: [
          'predefined-plan',
          'visible-price-evidence',
          'risk-budget',
          'uncertainty-recorded',
        ],
        minimumMatches: 2,
      },
      {
        criterionId: 'management-warning-acknowledged',
        kind: 'risk-warning-acknowledged',
        required: true,
      },
    ],
  };
  const material = {
    rubricId: `${scenarioId}-${scenarioVersion.replaceAll('.', '-')}-management-rubric`,
    rubricVersion: SCENARIO_POSITION_MANAGEMENT_RUBRIC_VERSION,
    criteria: [
      {
        criterionId: 'management-plan-recorded-before-outcome',
        basis: 'reviewed-source' as const,
        criterionHe: 'הנימוק והפעולה נרשמו לפני חשיפת הנר הבא.',
        expectedEvidenceHe: 'חותמת החיתוך קודמת לנר הזכאות, והיסטוריית היומן נשמרת.',
        source: {
          sourceId: 'ta-he-v2' as const,
          pageStart: 76,
          pageEnd: 79,
          bookPageStart: 63,
          bookPageEnd: 66,
          chapter: '20 ודף העזר',
          figureOrCase: '11 שלבי התהליך',
          reviewedContentId: 'u10-capstone-e05',
        },
      },
      {
        criterionId: 'management-risk-and-invalidation-recorded',
        basis: 'reviewed-source' as const,
        criterionHe: 'הסיכון ונקודת ביטול התזה נבדקו לפני פעולת הניהול.',
        expectedEvidenceHe: 'הרשומה מציינת בדיקת סיכון וראיה גלויה, בלי להסתמך על התוצאה.',
        source: {
          sourceId: 'ta-he-v2' as const,
          pageStart: 78,
          pageEnd: 78,
          bookPageStart: 65,
          bookPageEnd: 65,
          chapter: 'דף עזר מהיר',
          figureOrCase: 'סטופ, גודל פוזיציה וניהול',
          reviewedContentId: 'u10-capstone-e05',
        },
      },
      {
        criterionId: 'management-simulator-assumptions-explicit',
        basis: 'neutral-simulator-mechanics' as const,
        criterionHe: 'הפעולה הוערכה כמנגנון סימולטור ולא ככלל מסחר אוניברסלי.',
        expectedEvidenceHe: 'הרווח או ההפסד אינם משנים את ציון התהליך.',
      },
    ],
    scoring: {
      profitAndLossAffectsScore: false as const,
      futureOutcomeAffectsScore: false as const,
    },
    domainRubric,
  };
  return {
    ...material,
    checksum: computePositionManagementRubricChecksum(domainRubric) as Sha256Checksum,
  };
}

function authority(
  scenarioId: string,
  scenarioVersion: string,
  managementRubric: ScenarioPositionManagementRubricV1,
  riskLimits: PositionManagementAuthority['riskLimits'],
  permittedActionKinds: PositionManagementAuthority['permittedActionKinds'],
  permissionVersion: string,
): PositionManagementAuthority {
  if (permissionVersion !== scenarioPermissionVersion(scenarioId, scenarioVersion))
    throw new Error('Management permission version must bind the exact scenario identity');
  return {
    schemaVersion: 1,
    permissionVersion,
    permittedActionKinds,
    rubricId: managementRubric.rubricId,
    rubricVersion: managementRubric.rubricVersion,
    rubricChecksum: managementRubric.checksum,
    rubric: managementRubric.domainRubric,
    riskLimits,
    learningCredit: 'none',
  };
}

function openPaperSession(
  scenario: HistoricalReplayScenario,
  dataset: HistoricalDataset,
  baseScenarioId: string,
) {
  const base = candidate(baseScenarioId);
  const expected = base.manifest.expectedExecution;
  const paper = scenario.paperExecution;
  if (!expected || !paper) throw new Error('Management variant requires authored paper execution');
  let session = createPaperExecutionSession({
    sessionId: `management-paper-${scenario.scenarioId}-${scenario.scenarioVersion}`,
    orderId: `management-order-${scenario.scenarioId}-${scenario.scenarioVersion}`,
    positionId: `management-position-${scenario.scenarioId}-${scenario.scenarioVersion}`,
    debriefId: `management-paper-debrief-${scenario.scenarioId}-${scenario.scenarioVersion}`,
    source: {
      datasetId: dataset.manifest.datasetId,
      datasetVersion: dataset.manifest.datasetVersion,
      canonicalChecksum: dataset.manifest.canonicalChecksum,
      scenarioId: scenario.scenarioId,
      scenarioVersion: scenario.scenarioVersion,
      analysisSessionId: `management-analysis-${scenario.scenarioId}-${scenario.scenarioVersion}`,
      analysisFinalizedAt: FIXED_TIME,
      decisionCandleIndex: scenario.decisionCandleIndex,
      candleCount: dataset.candles.length,
      learningCredit: 'none',
      permittedDirections: paper.permittedDirections,
      permittedEntryOrderTypes: paper.permittedEntryOrderTypes,
    },
    plan: expected.plan,
    createdAt: '2031-01-01T00:00:01.000Z',
  });
  session = reducePaperExecutionSession(session, {
    type: 'submit',
    confirmationId: `management-confirm-${scenario.scenarioId}-${scenario.scenarioVersion}`,
    submittedAt: '2031-01-01T00:00:02.000Z',
  });
  session = reducePaperExecutionSession(session, {
    type: 'process-candles',
    candles: domainCandles(dataset).slice(
      scenario.decisionCandleIndex + 1,
      scenario.decisionCandleIndex + 2,
    ),
    processedAt: '2031-01-01T00:00:03.000Z',
  });
  if (session.status !== 'open')
    throw new Error(`Management handoff did not remain open: ${scenario.scenarioId}`);
  return session;
}

function createManagementSession(
  scenario: HistoricalReplayScenario,
  dataset: HistoricalDataset,
  baseScenarioId: string,
  managementRubric: ScenarioPositionManagementRubricV1,
  caseId: string,
): PositionManagementSession {
  const initialQuantity = candidate(baseScenarioId).manifest.expectedExecution!.plan.quantity;
  return createPositionManagementSession({
    sessionId: `management-${caseId}`,
    debriefId: `management-debrief-${caseId}`,
    openPaperExecutionSession: openPaperSession(scenario, dataset, baseScenarioId),
    authority: authority(
      scenario.scenarioId,
      scenario.scenarioVersion,
      managementRubric,
      {
        maxOpenQuantityUnits: initialQuantity * 2,
        maxScaleInInitialQuantityBps: 10_000,
        softRiskLimitOriginalRBps: 10_000,
        hardRiskLimitOriginalRBps: 20_000,
      },
      ALL_ACTIONS,
      scenarioPermissionVersion(scenario.scenarioId, scenario.scenarioVersion),
    ),
    policy: DEFAULT_POSITION_MANAGEMENT_POLICY,
    createdAt: '2031-01-01T00:00:04.000Z',
  });
}

function snapshot(
  stageId: string,
  session: PositionManagementSession,
  dataset: HistoricalDataset,
): ScenarioManagementSnapshotV1 {
  const candle = domainCandles(dataset)[session.lastProcessedCandleIndex];
  if (!candle) throw new Error('Management snapshot cutoff candle is missing');
  const selected = selectPositionManagementSnapshot(session, candle);
  const material = {
    schemaVersion: 1 as const,
    stageId,
    status: session.status,
    lastProcessedCandleIndex: session.lastProcessedCandleIndex,
    openQuantityUnits: selected.openQuantityUnits,
    closedQuantityUnits: selected.closedQuantityUnits,
    activeProtectiveStopMinor: selected.activeProtectiveStopMinor,
    activeTargetMinor: selected.activeTargetMinor,
    currentRiskMinor: selected.currentRiskMinor,
    grossRealizedMinor: selected.grossRealizedMinor,
    realizedNetMinor: selected.realizedNetMinor,
    totalCommissionMinor: selected.totalCommissionMinor,
    totalModeledExecutionCostMinor: selected.totalModeledExecutionCostMinor,
    journalEntryCount: session.journal.length,
    eventTypes: session.events.map(({ type }) => type),
    ...(session.pendingAction ? { pendingActionKind: session.pendingAction.intent.kind } : {}),
    ...(session.draft?.riskAssessment.hardRejectionCodes.length
      ? { draftHardRejectionCodes: session.draft.riskAssessment.hardRejectionCodes }
      : {}),
    ...(session.ambiguityReason ? { ambiguityReason: session.ambiguityReason } : {}),
    ...(session.debrief
      ? {
          debrief: {
            outcome: session.debrief.outcome,
            outcomeDeterminate: session.debrief.outcomeDeterminate,
            processQuality: session.debrief.processQuality,
            realizedNetMinor: session.debrief.realizedNetMinor,
            materialActionCount: session.debrief.materialActionCount,
          },
        }
      : {}),
  };
  return deepFreeze({ ...material, checksum: checksum(material) });
}

function submitIntent(
  session: PositionManagementSession,
  caseId: string,
  intent: PositionManagementMaterialIntent,
  updatedAt = '2031-01-01T00:00:05.000Z',
  submittedAt = '2031-01-01T00:00:06.000Z',
): PositionManagementSession {
  const preview = previewPositionManagementIntent(session, intent);
  let next = reducePositionManagementSession(session, {
    type: 'edit-draft',
    editId: `${caseId}-edit`,
    draftId: `${caseId}-draft`,
    intent,
    rationale: 'פעולת סימולטור מתועדת לפי הראיות הגלויות בלבד וללא שימוש בתוצאה עתידית.',
    processEvidence: coherentProcessEvidence(),
    authoredAtCandleIndex: session.lastProcessedCandleIndex,
    updatedAt,
  });
  if (preview.riskAssessment.hardRejectionCodes.length) return next;
  next = reducePositionManagementSession(next, {
    type: 'submit-draft',
    submissionId: `${caseId}-submission`,
    draftId: `${caseId}-draft`,
    acknowledgedRiskWarningCodes: preview.riskAssessment.warningCodes,
    submittedAt,
  });
  return next;
}

function processThrough(
  session: PositionManagementSession,
  dataset: HistoricalDataset,
  candleIndex: number,
  processedAt = '2031-01-01T00:00:07.000Z',
): PositionManagementSession {
  return reducePositionManagementSession(session, {
    type: 'process-candles',
    candles: domainCandles(dataset).slice(session.lastProcessedCandleIndex + 1, candleIndex + 1),
    processedAt,
  });
}

function intentCase(
  caseId: string,
  scenario: HistoricalReplayScenario,
  dataset: HistoricalDataset,
  baseScenarioId: string,
  managementRubric: ScenarioPositionManagementRubricV1,
  intent: PositionManagementMaterialIntent,
  processTo?: number,
): ScenarioManagementExpectedCaseV1 {
  const initial = createManagementSession(
    scenario,
    dataset,
    baseScenarioId,
    managementRubric,
    caseId,
  );
  const submitted = submitIntent(initial, caseId, intent);
  const snapshots = [snapshot('handoff-open', initial, dataset)];
  if (submitted.pendingAction) snapshots.push(snapshot('action-pending', submitted, dataset));
  else snapshots.push(snapshot('risk-rejected', submitted, dataset));
  let terminal = submitted;
  if (processTo !== undefined && submitted.pendingAction) {
    terminal = processThrough(submitted, dataset, processTo);
    snapshots.push(snapshot('after-eligible-candles', terminal, dataset));
  }
  const evidence = [
    intent.kind,
    ...(submitted.draft?.riskAssessment.hardRejectionCodes ?? []),
    ...terminal.events.slice(initial.events.length).map(({ type }) => type),
    ...(terminal.ambiguityReason ? [terminal.ambiguityReason] : []),
  ];
  return deepFreeze({
    caseId,
    actions: [
      {
        type: 'material-intent',
        actionId: `${caseId}-material-intent`,
        authoredAtCandleIndex: initial.lastProcessedCandleIndex,
        intent,
        rationaleHe: 'פעולת סימולטור מתועדת לפי הראיות הגלויות בלבד וללא שימוש בתוצאה עתידית.',
        processEvidence: coherentProcessEvidence(),
        ...(processTo === undefined ? {} : { processThroughCandleIndex: processTo }),
      },
    ],
    evidence: [...new Set(evidence)].sort(),
    snapshots,
  });
}

function passiveCase(
  caseId: string,
  scenario: HistoricalReplayScenario,
  dataset: HistoricalDataset,
  baseScenarioId: string,
  managementRubric: ScenarioPositionManagementRubricV1,
  processTo: number,
): ScenarioManagementExpectedCaseV1 {
  const initial = createManagementSession(
    scenario,
    dataset,
    baseScenarioId,
    managementRubric,
    caseId,
  );
  const processed = processThrough(initial, dataset, processTo);
  return deepFreeze({
    caseId,
    actions: [
      {
        type: 'process-only',
        actionId: `${caseId}-process-only`,
        processThroughCandleIndex: processTo,
      },
    ],
    evidence: [...new Set(processed.events.slice(initial.events.length).map(({ type }) => type))],
    snapshots: [
      snapshot('handoff-open', initial, dataset),
      snapshot('after-eligible-candles', processed, dataset),
    ],
  });
}

function cancellationCase(
  caseId: string,
  scenario: HistoricalReplayScenario,
  dataset: HistoricalDataset,
  baseScenarioId: string,
  managementRubric: ScenarioPositionManagementRubricV1,
  intent: PositionManagementMaterialIntent,
): ScenarioManagementExpectedCaseV1 {
  const initial = createManagementSession(
    scenario,
    dataset,
    baseScenarioId,
    managementRubric,
    caseId,
  );
  const submitted = submitIntent(initial, caseId, intent);
  if (!submitted.pendingAction) throw new Error('Cancellation case requires a pending action');
  const cancelled = reducePositionManagementSession(submitted, {
    type: 'cancel-pending',
    cancellationId: `${caseId}-cancellation`,
    submissionId: submitted.pendingAction.submissionId,
    cancelledAt: '2031-01-01T00:00:06.500Z',
  });
  return deepFreeze({
    caseId,
    actions: [
      {
        type: 'material-intent',
        actionId: `${caseId}-material-intent`,
        authoredAtCandleIndex: initial.lastProcessedCandleIndex,
        intent,
        rationaleHe: 'פעולת סימולטור מתועדת לפי הראיות הגלויות בלבד וללא שימוש בתוצאה עתידית.',
        processEvidence: coherentProcessEvidence(),
      },
      {
        type: 'cancel-pending',
        actionId: `${caseId}-cancel-pending`,
        submissionActionId: `${caseId}-material-intent`,
        authoredAtCandleIndex: submitted.lastProcessedCandleIndex,
      },
    ],
    evidence: ['management-action-cancelled', intent.kind],
    snapshots: [
      snapshot('handoff-open', initial, dataset),
      snapshot('action-pending', submitted, dataset),
      snapshot('action-cancelled', cancelled, dataset),
    ],
  });
}

function managedOpenReloadCase(
  caseId: string,
  scenario: HistoricalReplayScenario,
  dataset: HistoricalDataset,
  baseScenarioId: string,
  managementRubric: ScenarioPositionManagementRubricV1,
): ScenarioManagementExpectedCaseV1 {
  const initial = createManagementSession(
    scenario,
    dataset,
    baseScenarioId,
    managementRubric,
    caseId,
  );
  const submitted = submitIntent(initial, caseId, { kind: 'replace-stop', price: 104 });
  if (!submitted.pendingAction) throw new Error('Managed-open reload requires a pending action');
  const restored = JSON.parse(JSON.stringify(submitted)) as PositionManagementSession;
  assertValidPositionManagementSession(restored);
  const processed = processThrough(restored, dataset, 65, '2031-01-01T00:00:08.000Z');
  return deepFreeze({
    caseId,
    actions: [
      {
        type: 'material-intent',
        actionId: `${caseId}-material-intent`,
        authoredAtCandleIndex: initial.lastProcessedCandleIndex,
        intent: { kind: 'replace-stop', price: 104 },
        rationaleHe: 'פעולת סימולטור מתועדת לפי הראיות הגלויות בלבד וללא שימוש בתוצאה עתידית.',
        processEvidence: coherentProcessEvidence(),
      },
      {
        type: 'reload-session',
        actionId: `${caseId}-reload-session`,
        authoredAtCandleIndex: restored.lastProcessedCandleIndex,
      },
      {
        type: 'process-only',
        actionId: `${caseId}-process-after-reload`,
        processThroughCandleIndex: 65,
      },
    ],
    evidence: ['managed-open-restored', 'management-action-submitted', 'protective-stop-replaced'],
    snapshots: [
      snapshot('handoff-open', initial, dataset),
      snapshot('pending-before-reload', submitted, dataset),
      snapshot('pending-after-reload', restored, dataset),
      snapshot('processed-after-reload', processed, dataset),
    ],
  });
}

function partialThenTerminalCase(
  caseId: string,
  terminal: 'stop' | 'target',
  scenario: HistoricalReplayScenario,
  dataset: HistoricalDataset,
  baseScenarioId: string,
  managementRubric: ScenarioPositionManagementRubricV1,
): ScenarioManagementExpectedCaseV1 {
  const initial = createManagementSession(
    scenario,
    dataset,
    baseScenarioId,
    managementRubric,
    caseId,
  );
  const partialSubmitted = submitIntent(initial, `${caseId}-partial`, {
    kind: 'partial-exit',
    quantityUnits: 4,
  });
  const partialFilled = processThrough(partialSubmitted, dataset, 65);
  let completed: PositionManagementSession;
  const actions: ScenarioManagementCaseActionV1[] = [
    {
      type: 'material-intent',
      actionId: `${caseId}-partial`,
      authoredAtCandleIndex: initial.lastProcessedCandleIndex,
      intent: { kind: 'partial-exit', quantityUnits: 4 },
      rationaleHe: 'יציאה חלקית מתועדת כהנחת סימולטור שנקבעה לפני חשיפת הנר הבא.',
      processEvidence: coherentProcessEvidence(),
      processThroughCandleIndex: 65,
    },
  ];
  if (terminal === 'target') {
    completed = processThrough(partialFilled, dataset, 81, '2031-01-01T00:00:08.000Z');
    actions.push({
      type: 'process-only',
      actionId: `${caseId}-process-to-target`,
      processThroughCandleIndex: 81,
    });
  } else {
    const stopSubmitted = submitIntent(
      partialFilled,
      `${caseId}-stop`,
      { kind: 'replace-stop', price: 106.5 },
      '2031-01-01T00:00:08.000Z',
      '2031-01-01T00:00:09.000Z',
    );
    completed = processThrough(stopSubmitted, dataset, 66, '2031-01-01T00:00:10.000Z');
    actions.push({
      type: 'material-intent',
      actionId: `${caseId}-stop`,
      authoredAtCandleIndex: partialFilled.lastProcessedCandleIndex,
      intent: { kind: 'replace-stop', price: 106.5 },
      rationaleHe: 'החלפת הסטופ מתועדת לפי הראיות הגלויות ובהתאם למגבלת הסיכון של הסימולטור.',
      processEvidence: coherentProcessEvidence(),
      processThroughCandleIndex: 66,
    });
  }
  if (completed.status !== (terminal === 'target' ? 'closed-target' : 'closed-stop'))
    throw new Error(`Partial-exit terminal case did not reach ${terminal}`);
  return deepFreeze({
    caseId,
    actions,
    evidence: [
      'partial-exit-before-terminal',
      'voluntary-exit-filled',
      terminal === 'target' ? 'position-closed-target' : 'position-closed-stop',
    ],
    snapshots: [
      snapshot('handoff-open', initial, dataset),
      snapshot('partial-exit-filled', partialFilled, dataset),
      snapshot(`remainder-closed-${terminal}`, completed, dataset),
    ],
  });
}

function enabledConfiguration(
  scenario: HistoricalReplayScenario,
  dataset: HistoricalDataset,
  baseScenarioId: string,
  cases: (
    managementRubric: ScenarioPositionManagementRubricV1,
  ) => readonly ScenarioManagementExpectedCaseV1[],
): ScenarioPositionManagementEnabledV1 {
  const managementRubric = rubric(scenario.scenarioId, scenario.scenarioVersion);
  return deepFreeze({
    schemaVersion: 1,
    enabled: true,
    permissionVersion: scenarioPermissionVersion(scenario.scenarioId, scenario.scenarioVersion),
    policy: DEFAULT_POSITION_MANAGEMENT_POLICY,
    riskLimits: {
      maxOpenQuantityUnits: candidate(baseScenarioId).manifest.expectedExecution!.plan.quantity * 2,
      maxScaleInInitialQuantityBps: 10_000,
      softRiskLimitOriginalRBps: 10_000,
      hardRiskLimitOriginalRBps: 20_000,
    },
    permittedActionKinds: ALL_ACTIONS,
    rubric: managementRubric,
    expectedCases: cases(managementRubric),
  });
}

function buildVariant(
  baseScenarioId: string,
  scenarioVersion: string,
  dataset: HistoricalDataset,
  cases: (
    scenario: HistoricalReplayScenario,
    managementRubric: ScenarioPositionManagementRubricV1,
  ) => readonly ScenarioManagementExpectedCaseV1[],
): ScenarioPositionManagementVariantV1 {
  const base = candidate(baseScenarioId);
  const scenario = variantScenario(base.scenario, scenarioVersion, dataset);
  const management = enabledConfiguration(scenario, dataset, baseScenarioId, (managementRubric) =>
    cases(scenario, managementRubric),
  );
  const blockers = [
    ...base.publicationBlockers,
    'ניהול פוזיציה הוא הרחבת QA סינתטית פנימית ללא ביקורת אנושית או קרדיט.',
    'הרשאות, מקרי קצה ותצלומי מצב של ניהול דורשים ביקורת מקור, רובריקה, ביצוע, נגישות, עברית, בטיחות ופרסום.',
  ];
  const material = {
    schemaVersion: 1 as const,
    scenarioId: scenario.scenarioId,
    scenarioVersion,
    datasetId: dataset.manifest.datasetId,
    datasetVersion: dataset.manifest.datasetVersion,
    datasetChecksum: dataset.manifest.canonicalChecksum,
    baseScenarioVersion: base.manifest.scenarioVersion,
    baseDatasetVersion: base.dataset.manifest.datasetVersion,
    baseDatasetChecksum: base.dataset.manifest.canonicalChecksum,
    scenario,
    dataset,
    management,
  };
  return deepFreeze({
    ...material,
    publication: {
      status: 'human-review-required',
      learningCredit: 'none',
      reviewScopes: REVIEW_SCOPES,
      records: [],
      blockers,
    },
    materialArtifactChecksum: checksum(material),
  });
}

export function computeScenarioPositionManagementMaterialChecksum(
  variant: Omit<ScenarioPositionManagementVariantV1, 'materialArtifactChecksum' | 'publication'>,
): Sha256Checksum {
  return checksum(variant);
}

const longBase = candidate('internal-long-range-breakout');
const longAdverseDataset = cloneDatasetWithFutureCandles(longBase.dataset, '2.0.0', 64, {
  65: { open: 102, high: 102.5, low: 101.4, close: 101.8 },
});
const shortBase = candidate('internal-short-double-top');
const shortLaterGapDataset = cloneDatasetWithFutureCandles(shortBase.dataset, '2.0.0', 64, {
  65: { open: 94.2, high: 95, low: 93.6, close: 94.4 },
  66: { open: 94.5, high: 95.2, low: 93.9, close: 94.8 },
  67: { open: 98, high: 99, low: 97.5, close: 98.5 },
});

const variants: readonly ScenarioPositionManagementVariantV1[] = [
  buildVariant('internal-long-range-breakout', '2.0.0', longBase.dataset, (scenario, rubric) => [
    intentCase(
      'long-partial',
      scenario,
      longBase.dataset,
      scenario.scenarioId,
      rubric,
      { kind: 'partial-exit', quantityUnits: 4 },
      65,
    ),
    intentCase(
      'long-full',
      scenario,
      longBase.dataset,
      scenario.scenarioId,
      rubric,
      { kind: 'full-exit' },
      65,
    ),
    intentCase(
      'long-scale-valid',
      scenario,
      longBase.dataset,
      scenario.scenarioId,
      rubric,
      { kind: 'scale-in', quantityUnits: 2, estimatedEntryPrice: 106 },
      65,
    ),
    intentCase('long-scale-rejected', scenario, longBase.dataset, scenario.scenarioId, rubric, {
      kind: 'scale-in',
      quantityUnits: 11,
      estimatedEntryPrice: 106,
    }),
    intentCase(
      'long-stop-replacement',
      scenario,
      longBase.dataset,
      scenario.scenarioId,
      rubric,
      { kind: 'replace-stop', price: 104 },
      65,
    ),
    intentCase(
      'long-target-replacement',
      scenario,
      longBase.dataset,
      scenario.scenarioId,
      rubric,
      { kind: 'replace-target', price: 113 },
      65,
    ),
    managedOpenReloadCase(
      'long-pending-reload',
      scenario,
      longBase.dataset,
      scenario.scenarioId,
      rubric,
    ),
    cancellationCase(
      'long-cancel-pending',
      scenario,
      longBase.dataset,
      scenario.scenarioId,
      rubric,
      { kind: 'replace-target', price: 113 },
    ),
    partialThenTerminalCase(
      'long-partial-then-target',
      'target',
      scenario,
      longBase.dataset,
      scenario.scenarioId,
      rubric,
    ),
    partialThenTerminalCase(
      'long-partial-then-stop',
      'stop',
      scenario,
      longBase.dataset,
      scenario.scenarioId,
      rubric,
    ),
  ]),
  buildVariant('internal-long-range-breakout', '2.1.0', longAdverseDataset, (scenario, rubric) => [
    passiveCase('long-adverse-stop', scenario, longAdverseDataset, scenario.scenarioId, rubric, 65),
    intentCase(
      'long-opening-ambiguity',
      scenario,
      longAdverseDataset,
      scenario.scenarioId,
      rubric,
      { kind: 'partial-exit', quantityUnits: 4 },
      65,
    ),
  ]),
  buildVariant('internal-short-double-top', '2.0.0', shortLaterGapDataset, (scenario, rubric) => [
    intentCase(
      'short-action-before-later-gap',
      scenario,
      shortLaterGapDataset,
      scenario.scenarioId,
      rubric,
      { kind: 'replace-stop', price: 96 },
      67,
    ),
  ]),
];

export const scenarioPositionManagementVariantRegistry = deepFreeze(
  [...variants].sort((left, right) =>
    `${left.scenarioId}@${left.scenarioVersion}`.localeCompare(
      `${right.scenarioId}@${right.scenarioVersion}`,
    ),
  ),
);

const disabledOriginals = new Map<string, ScenarioPositionManagementDisabledV1>(
  scenarioCandidateRegistry.map((item) => {
    const reason =
      item.manifest.application.kind === 'no-trade'
        ? 'no-trade'
        : item.execution?.evidence.includes('unfilled-order')
          ? 'unfilled-entry'
          : 'scenario-disabled';
    return [
      `${item.manifest.scenarioId}@${item.manifest.scenarioVersion}`,
      { schemaVersion: 1, enabled: false, reason },
    ];
  }),
);

export function resolveScenarioPositionManagementAuthority(input: {
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly learningCredit: 'course' | 'none';
}): ScenarioPositionManagementAuthorityResolution {
  const variant = scenarioPositionManagementVariantRegistry.find(
    (item) =>
      item.scenarioId === input.scenarioId && item.scenarioVersion === input.scenarioVersion,
  );
  if (variant) {
    if (input.learningCredit !== variant.publication.learningCredit)
      return { status: 'unavailable', reason: 'credit-mismatch' };
    return {
      status: 'enabled',
      authority: authority(
        variant.scenarioId,
        variant.scenarioVersion,
        variant.management.rubric,
        variant.management.riskLimits,
        variant.management.permittedActionKinds,
        variant.management.permissionVersion,
      ),
      policy: variant.management.policy,
      maximumOpenQuantityUnits: variant.management.riskLimits.maxOpenQuantityUnits,
    };
  }
  const disabled = disabledOriginals.get(`${input.scenarioId}@${input.scenarioVersion}`);
  return disabled
    ? { status: 'unavailable', reason: disabled.reason }
    : { status: 'unavailable', reason: 'unknown-scenario' };
}

export function buildScenarioPositionManagementQaPreview(
  variant: ScenarioPositionManagementVariantV1,
) {
  return deepFreeze({
    schemaVersion: 1 as const,
    scenarioId: variant.scenarioId,
    scenarioVersion: variant.scenarioVersion,
    datasetId: variant.datasetId,
    datasetVersion: variant.datasetVersion,
    datasetChecksum: variant.datasetChecksum,
    enabled: true as const,
    permittedActionKinds: variant.management.permittedActionKinds,
    expectedCases: variant.management.expectedCases,
    publicationStatus: variant.publication.status,
    learningCredit: variant.publication.learningCredit,
    publicationBlockers: variant.publication.blockers,
    materialArtifactChecksum: variant.materialArtifactChecksum,
  });
}

export function buildScenarioPositionManagementExtension(
  variant: ScenarioPositionManagementVariantV1,
): ScenarioPositionManagementExtensionV1 {
  const material = {
    schemaVersion: 1 as const,
    scenarioId: variant.scenarioId,
    scenarioVersion: variant.scenarioVersion,
    datasetId: variant.datasetId,
    datasetVersion: variant.datasetVersion,
    datasetChecksum: variant.datasetChecksum,
    management: variant.management,
    publication: variant.publication,
    materialArtifactChecksum: variant.materialArtifactChecksum,
  };
  return deepFreeze({ ...material, extensionChecksum: checksum(material) });
}

export function buildBlindScenarioPositionManagementPreview(
  scenarioId: string,
  scenarioVersion: string,
) {
  const variant = scenarioPositionManagementVariantRegistry.find(
    (item) => item.scenarioId === scenarioId && item.scenarioVersion === scenarioVersion,
  );
  return variant
    ? deepFreeze({
        schemaVersion: 1 as const,
        enabled: true as const,
        permittedActionKinds: variant.management.permittedActionKinds,
        learningCredit: 'none' as const,
        simulatorDisclosureHe:
          'פעולות הניהול הן הנחות סימולטור סינתטיות וללא קרדיט; הן אינן כלל מסחר או המלצה.',
      })
    : deepFreeze({ schemaVersion: 1 as const, enabled: false as const });
}

export function buildScenarioPositionManagementReport(
  registry: readonly ScenarioPositionManagementVariantV1[] = scenarioPositionManagementVariantRegistry,
): ScenarioPositionManagementReport {
  const projected = [...registry]
    .sort((left, right) =>
      `${left.scenarioId}@${left.scenarioVersion}`.localeCompare(
        `${right.scenarioId}@${right.scenarioVersion}`,
      ),
    )
    .map((variant) => ({
      scenarioId: variant.scenarioId,
      scenarioVersion: variant.scenarioVersion,
      datasetId: variant.datasetId,
      datasetVersion: variant.datasetVersion,
      datasetChecksum: variant.datasetChecksum,
      baseScenarioVersion: variant.baseScenarioVersion,
      baseDatasetVersion: variant.baseDatasetVersion,
      baseDatasetChecksum: variant.baseDatasetChecksum,
      materialArtifactChecksum: variant.materialArtifactChecksum,
      permissionVersion: variant.management.permissionVersion,
      policyVersion: variant.management.policy.version,
      permittedActionKinds: variant.management.permittedActionKinds,
      riskLimits: variant.management.riskLimits,
      rubric: {
        rubricId: variant.management.rubric.rubricId,
        rubricVersion: variant.management.rubric.rubricVersion,
        rubricChecksum: variant.management.rubric.checksum,
      },
      expectedCases: variant.management.expectedCases.map((expectedCase) => ({
        caseId: expectedCase.caseId,
        actionIds: expectedCase.actions.map(({ actionId }) => actionId),
        snapshotChecksums: expectedCase.snapshots.map(({ checksum: value }) => value),
      })),
      learningCredit: variant.publication.learningCredit,
      publicationStatus: variant.publication.status,
      reviewScopes: variant.publication.reviewScopes,
      publicationBlockers: variant.publication.blockers,
    }));
  const identities = projected.map(
    ({ scenarioId, scenarioVersion }) => `${scenarioId}@${scenarioVersion}`,
  );
  const valid =
    new Set(identities).size === identities.length &&
    registry.every(
      (variant) =>
        variant.publication.learningCredit === 'none' &&
        variant.publication.status === 'human-review-required' &&
        variant.publication.records.length === 0 &&
        canonicalSerialize(variant.publication.reviewScopes) ===
          canonicalSerialize(REVIEW_SCOPES) &&
        variant.publication.blockers.length >= 2 &&
        variant.scenario.scenarioId === variant.scenarioId &&
        variant.scenario.scenarioVersion === variant.scenarioVersion &&
        variant.scenario.dataset.datasetId === variant.datasetId &&
        variant.scenario.dataset.datasetVersion === variant.datasetVersion &&
        variant.scenario.dataset.canonicalChecksum === variant.datasetChecksum &&
        variant.dataset.manifest.datasetId === variant.datasetId &&
        variant.dataset.manifest.datasetVersion === variant.datasetVersion &&
        variant.dataset.manifest.canonicalChecksum === variant.datasetChecksum &&
        candidate(variant.scenarioId).manifest.scenarioVersion === variant.baseScenarioVersion &&
        candidate(variant.scenarioId).dataset.manifest.datasetVersion ===
          variant.baseDatasetVersion &&
        candidate(variant.scenarioId).dataset.manifest.canonicalChecksum ===
          variant.baseDatasetChecksum &&
        computePositionManagementRubricChecksum(variant.management.rubric.domainRubric) ===
          variant.management.rubric.checksum &&
        variant.materialArtifactChecksum ===
          computeScenarioPositionManagementMaterialChecksum({
            schemaVersion: variant.schemaVersion,
            scenarioId: variant.scenarioId,
            scenarioVersion: variant.scenarioVersion,
            datasetId: variant.datasetId,
            datasetVersion: variant.datasetVersion,
            datasetChecksum: variant.datasetChecksum,
            baseScenarioVersion: variant.baseScenarioVersion,
            baseDatasetVersion: variant.baseDatasetVersion,
            baseDatasetChecksum: variant.baseDatasetChecksum,
            scenario: variant.scenario,
            dataset: variant.dataset,
            management: variant.management,
          }),
    );
  const material = { schemaVersion: 1 as const, variants: projected };
  return deepFreeze({
    valid,
    publishable: false,
    registryChecksum: checksum(material),
    counts: {
      variants: registry.length,
      enabled: registry.length,
      originalDisabled: disabledOriginals.size,
      expectedCases: registry.reduce(
        (count, variant) => count + variant.management.expectedCases.length,
        0,
      ),
      reviewScopes: 7,
      publicationBlockers: registry.reduce(
        (count, variant) => count + variant.publication.blockers.length,
        0,
      ),
    },
    variants: projected,
  });
}

export const scenarioPositionManagementReport = buildScenarioPositionManagementReport();
