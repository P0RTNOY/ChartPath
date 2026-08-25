import { generateFullChart } from '@chartpath/chart-engine';
import {
  createPaperExecutionSession,
  reducePaperExecutionSession,
  type OhlcvCandle,
  type PaperExecutionSession,
} from '@chartpath/domain';
import {
  HISTORICAL_APPLICATION_SCHEMA_VERSION,
  HISTORICAL_SCENARIO_SCHEMA_VERSION,
  PAPER_EXECUTION_COST_MODEL_VERSION,
  PAPER_EXECUTION_POLICY_VERSION,
  PAPER_EXECUTION_SCENARIO_SCHEMA_VERSION,
  canonicalSerialize,
  evaluatePublicationGate,
  importHistoricalCsv,
  sha256Hex,
  validateHistoricalScenario,
  type HistoricalDataset,
  type HistoricalReplayScenario,
  type HistoricalSourceManifest,
  type Sha256Checksum,
} from '@chartpath/historical-data';

import { WORKFLOW_STEP_IDS, type CapstoneStep, type ContentExercise } from '../types.js';
import { catalog as bundledCatalog } from '../catalog.js';
import {
  SCENARIO_COMPILER_CONTRACT_V1,
  SCENARIO_COMPILER_VERSION,
  type CompiledScenarioCandidate,
  type ScenarioAuthoringManifestV1,
  type ScenarioExecutionSnapshotV1,
  type ScenarioLearnerExerciseProjection,
} from './types.js';

const FIXED_COMPILATION_TIME = '2026-01-01T00:00:00.000Z';

export type ScenarioManifestParseResult =
  | { readonly ok: true; readonly value: ScenarioAuthoringManifestV1 }
  | { readonly ok: false; readonly issues: readonly string[] };

export interface ScenarioCompilerOptions {
  /** IDs verified by an external authenticated human-review authority. Empty by default. */
  readonly authenticatedReviewerRecordIds?: readonly string[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Runtime boundary for JSON/untrusted authoring input. It fails closed before compilation. */
export function parseScenarioAuthoringManifest(input: unknown): ScenarioManifestParseResult {
  if (!record(input)) return { ok: false, issues: ['manifest must be an object'] };
  const issues: string[] = [];
  const requiredStrings = [
    'scenarioId',
    'scenarioVersion',
    'compilerVersion',
    'compilerContractChecksum',
    'datasetId',
    'datasetVersion',
    'titleHe',
    'promptHe',
    'chartSpecChecksum',
    'generatedDatasetChecksum',
    'materialArtifactChecksum',
    'reviewFingerprint',
  ];
  for (const field of requiredStrings)
    if (typeof input[field] !== 'string' || (input[field] as string).trim() === '')
      issues.push(`${field} must be a non-empty string`);
  if (input.schemaVersion !== 1) issues.push('unsupported scenario authoring schema version');
  if (!record(input.source)) issues.push('source must be an object');
  if (!record(input.chartSpec)) issues.push('chartSpec must be an object');
  if (!record(input.application)) issues.push('application must be an object');
  if (!record(input.processRubric)) issues.push('processRubric must be an object');
  if (!record(input.publication)) issues.push('publication must be an object');
  if (!record(input.reviewStates)) issues.push('reviewStates must be an object');
  if (!record(input.retirement)) issues.push('retirement must be an object');
  if (!Array.isArray(input.hintsHe)) issues.push('hintsHe must be an array');
  if (!Number.isInteger(input.decisionCandleIndex))
    issues.push('decisionCandleIndex must be an integer');
  return issues.length === 0
    ? { ok: true, value: input as unknown as ScenarioAuthoringManifestV1 }
    : { ok: false, issues };
}

function checksum(value: unknown): Sha256Checksum {
  return `sha256:${sha256Hex(canonicalSerialize(value))}`;
}

export function computeScenarioMaterialChecksum(
  manifest: Omit<ScenarioAuthoringManifestV1, 'materialArtifactChecksum'>,
): Sha256Checksum {
  const {
    schemaVersion: _schemaVersion,
    publication: _publication,
    materialArtifactChecksum: _impossible,
    reviewStates: _reviewStates,
    reviewFingerprint: _reviewFingerprint,
    retirement: _retirement,
    ...material
  } = manifest as ScenarioAuthoringManifestV1;
  void _schemaVersion;
  void _publication;
  void _impossible;
  void _reviewStates;
  void _reviewFingerprint;
  void _retirement;
  return checksum(material);
}

export function buildGeneratedScenarioDataset(
  manifest: Pick<
    ScenarioAuthoringManifestV1,
    'datasetId' | 'datasetVersion' | 'chartSpec' | 'scenarioId'
  >,
): HistoricalDataset {
  const generated = generateFullChart(manifest.chartSpec);
  const rawCsv = [
    'timestamp,open,high,low,close,volume,session',
    ...generated.candles.map(
      (candle) =>
        `${candle.timestamp},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume},continuous`,
    ),
  ].join('\n');
  const source: HistoricalSourceManifest = {
    datasetId: manifest.datasetId,
    schemaVersion: 1,
    datasetVersion: manifest.datasetVersion,
    provenance: {
      providerId: 'chartpath-scenario-generator',
      providerName: 'ChartPath deterministic scenario generator',
      origin: 'chartpath-generated',
      sourceUrl: 'https://chartpath.invalid/internal/scenario-generator',
      datasetOrEndpointId: `${manifest.chartSpec.id}@${manifest.chartSpec.generatorVersion}`,
      retrievedAt: FIXED_COMPILATION_TIME,
      termsUrl: 'https://chartpath.invalid/internal/generated-data-terms',
      license: {
        licenseName: 'ChartPath internal generated candidate data',
        permittedUseStatus: 'blocked',
        redistributionStatus: 'prohibited',
        attributionRequirements:
          'ChartPath-generated synthetic data; never describe as market data.',
        evidenceReviewedAt: FIXED_COMPILATION_TIME,
        evidenceNotes:
          'Development candidate only; publication permission has not been reviewed or granted.',
      },
      knownLimitations: [
        'Synthetic prices are not observations of any security.',
        'Generated only for deterministic internal curriculum review.',
      ],
    },
    symbol: `CP-${manifest.chartSpec.seed}`,
    displaySymbol: 'נכס סינתטי',
    exchange: 'ChartPath generator',
    currency: 'XXX',
    exchangeTimezone: 'Asia/Jerusalem',
    interval: { unit: 'hour', value: 1, milliseconds: 3_600_000 },
    pricePrecision: 4,
    volumeUnit: 'synthetic-units',
    adjustment: {
      mode: 'raw',
      splitPolicy: 'unadjusted',
      dividendPolicy: 'unadjusted',
      corporateActionPolicy: 'explicit-actions-only',
    },
    sessionPolicy: {
      calendarId: 'continuous-24x7',
      includedSessions: ['continuous'],
      regularSessionOpen: '00:00',
      regularSessionClose: '23:59',
      timestampConvention: 'start',
    },
    missingIntervalPolicy: {
      behavior: 'record-and-preserve',
      fillPolicy: 'never-invent-candles',
      declaredIrregularities: [],
    },
    publicationStatus: 'internal',
    anonymizedLearnerIdentity: `blind-${manifest.scenarioId}`,
    expectedCandleCount: manifest.chartSpec.candleCount,
    corporateActions: [],
  };
  const imported = importHistoricalCsv(rawCsv, source);
  if (!imported.ok) {
    throw new Error(
      `Scenario CSV import failed for ${manifest.scenarioId}: ${imported.report.issues.map((item) => item.code).join(', ')}`,
    );
  }
  return imported.dataset;
}

function virtualExercise(manifest: ScenarioAuthoringManifestV1): ContentExercise {
  const expectedDecision =
    manifest.application.kind === 'trade' ? 'trade' : manifest.application.disposition;
  const optionNamespace = sha256Hex(`${manifest.scenarioId}@${manifest.scenarioVersion}`).slice(
    0,
    12,
  );
  const steps: readonly CapstoneStep[] = WORKFLOW_STEP_IDS.map((stepId, stepIndex) => {
    if (stepId === 'management') {
      const authoredReasons = [
        ...manifest.processRubric.requiredRationaleReasonIds.map((id) => ({
          id,
          labelHe: `${manifest.blindEvidenceSummaryHe} ${SCENARIO_COMPILER_CONTRACT_V1.managementCorrectSuffixHe}`,
        })),
        {
          id: `reason-${optionNamespace}-b`,
          labelHe: SCENARIO_COMPILER_CONTRACT_V1.managementLatestCloseDistractorHe,
        },
        {
          id: `reason-${optionNamespace}-c`,
          labelHe: SCENARIO_COMPILER_CONTRACT_V1.managementFutureDistractorHe,
        },
      ];
      const reasonRotation = manifest.chartSpec.seed % authoredReasons.length;
      return {
        id: stepId,
        promptHe: manifest.workflowPromptsHe[stepId],
        rubric: {
          kind: 'decision',
          acceptedDecisions: [expectedDecision],
          requiredReasonIds: manifest.processRubric.requiredRationaleReasonIds,
        },
        options: [
          { id: 'trade', labelHe: SCENARIO_COMPILER_CONTRACT_V1.decisionLabelsHe.trade },
          { id: 'wait', labelHe: SCENARIO_COMPILER_CONTRACT_V1.decisionLabelsHe.wait },
          { id: 'no-trade', labelHe: SCENARIO_COMPILER_CONTRACT_V1.decisionLabelsHe['no-trade'] },
          {
            id: 'insufficient-evidence',
            labelHe: SCENARIO_COMPILER_CONTRACT_V1.decisionLabelsHe['insufficient-evidence'],
          },
        ],
        reasonOptions: [
          ...authoredReasons.slice(reasonRotation),
          ...authoredReasons.slice(0, reasonRotation),
        ],
        decisionOptionMap: {
          trade: 'trade',
          wait: 'wait',
          'no-trade': 'no-trade',
          'insufficient-evidence': 'insufficient-evidence',
        },
      };
    }
    const optionIds = [
      `option-${optionNamespace}-${stepId}-a`,
      `option-${optionNamespace}-${stepId}-b`,
      `option-${optionNamespace}-${stepId}-c`,
    ] as const;
    const authoredOptions = [
      {
        id: optionIds[0],
        labelHe: `${manifest.blindEvidenceSummaryHe} ${manifest.workflowPromptsHe[stepId]} ${SCENARIO_COMPILER_CONTRACT_V1.correctEvidenceSuffixHe}`,
      },
      {
        id: optionIds[1],
        labelHe: SCENARIO_COMPILER_CONTRACT_V1.latestCloseDistractorHe,
      },
      {
        id: optionIds[2],
        labelHe: SCENARIO_COMPILER_CONTRACT_V1.futureDistractorHe,
      },
    ];
    const rotation = (manifest.chartSpec.seed + stepIndex) % authoredOptions.length;
    return {
      id: stepId,
      promptHe: manifest.workflowPromptsHe[stepId],
      rubric: {
        kind: 'multiple-choice',
        acceptedOptionIds: [optionIds[0]],
      },
      options: [...authoredOptions.slice(rotation), ...authoredOptions.slice(0, rotation)],
    };
  });
  return {
    id: `virtual-${optionNamespace}`,
    contentVersionId: `scenario-${optionNamespace}-v1`,
    skillIds: ['workflow.eleven-step', 'risk.invalidation-execution'],
    difficulty:
      manifest.difficulty === 'guided' ? 3 : manifest.difficulty === 'independent' ? 4 : 5,
    promptHe: SCENARIO_COMPILER_CONTRACT_V1.neutralExercisePromptHe,
    interactionType: 'capstone',
    chartPresentation: 'answer-evidence',
    rubric: { kind: 'capstone', steps: steps.map(({ id, rubric }) => ({ id, rubric })) },
    capstoneSteps: steps,
    explanationHe: SCENARIO_COMPILER_CONTRACT_V1.neutralExplanationHe,
    alternativeExplanations: [],
    misconceptionIds: ['misconception.future-information-leak', 'misconception.forced-trade'],
    hints: manifest.hintsHe.map((textHe, index) => ({
      id: `hint-${index + 1}`,
      level: index + 1,
      textHe,
    })),
    sourceReferences: [
      {
        sourceId: manifest.source.sourceId,
        pageStart: manifest.source.pageStart,
        pageEnd: manifest.source.pageEnd,
        bookPageStart: manifest.source.bookPageStart,
        bookPageEnd: manifest.source.bookPageEnd,
        section: SCENARIO_COMPILER_CONTRACT_V1.neutralSourceSectionHe,
      },
    ],
    editorialStatus: 'draft',
    schemaVersion: 1,
    workflowStepIds: WORKFLOW_STEP_IDS,
    termIds: [],
    role: 'transfer',
    category: 'decision',
    safetyNoteHe: manifest.financialSafetyDisclosureHe,
    processCriteriaHe: WORKFLOW_STEP_IDS.map(
      (step) => `${manifest.blindEvidenceSummaryHe} ${manifest.workflowPromptsHe[step]}`,
    ),
    isRiskOrPositionSize: true,
  };
}

export function buildBlindExerciseProjection(
  exercise: ContentExercise,
  manifest: ScenarioAuthoringManifestV1,
): ScenarioLearnerExerciseProjection {
  return Object.freeze({
    exerciseId: exercise.id,
    promptHe: exercise.promptHe,
    safetyNoteHe: exercise.safetyNoteHe,
    accessibility: manifest.accessibility,
    steps: Object.freeze(
      (exercise.capstoneSteps ?? []).map((step) =>
        Object.freeze({
          id: step.id,
          promptHe: step.promptHe,
          options: Object.freeze(step.options ?? []),
          reasonOptions: Object.freeze(step.reasonOptions ?? []),
        }),
      ),
    ),
  });
}

export function scenarioRubricIdentity(exercise: ContentExercise) {
  const identity = {
    rubricId: exercise.id,
    rubricVersion: exercise.contentVersionId,
    graderId: SCENARIO_COMPILER_CONTRACT_V1.graderId,
    material: { rubric: exercise.rubric, capstoneSteps: exercise.capstoneSteps },
  };
  return { ...identity, checksum: checksum(identity) };
}

function replayScenario(
  manifest: ScenarioAuthoringManifestV1,
  dataset: HistoricalDataset,
  exercise: ContentExercise,
): HistoricalReplayScenario {
  const paperExecution =
    manifest.expectedExecution && manifest.planConstraints
      ? {
          enabled: true as const,
          schemaVersion: PAPER_EXECUTION_SCENARIO_SCHEMA_VERSION,
          mode: 'aligned' as const,
          executionPolicyVersion: PAPER_EXECUTION_POLICY_VERSION,
          costModelVersion: PAPER_EXECUTION_COST_MODEL_VERSION,
          permittedDirections: manifest.planConstraints.permittedDirections,
          permittedEntryOrderTypes: manifest.planConstraints.permittedEntryOrderTypes,
          executionBoundary: {
            afterDecisionCandleIndex: manifest.decisionCandleIndex,
            lastCandleIndex: manifest.chartSpec.candleCount - 1,
          },
          learnerDisclosureHebrew: `${SCENARIO_COMPILER_CONTRACT_V1.paperDisclosureHe} ${manifest.financialSafetyDisclosureHe}`,
          publicationStatus: 'internal' as const,
        }
      : undefined;
  return {
    scenarioId: manifest.scenarioId,
    schemaVersion: HISTORICAL_SCENARIO_SCHEMA_VERSION,
    scenarioVersion: manifest.scenarioVersion,
    dataset: {
      datasetId: dataset.manifest.datasetId,
      datasetVersion: dataset.manifest.datasetVersion,
      canonicalChecksum: dataset.manifest.canonicalChecksum,
    },
    educationalContentId: exercise.id,
    decisionCandleIndex: manifest.decisionCandleIndex,
    initialVisibleRange: manifest.initialVisibleRange,
    permittedReplayBoundaryIndex: manifest.permittedReplayBoundaryIndex,
    knowledgeCutoffIndex: manifest.knowledgeCutoffIndex,
    blindMode: true,
    revealPolicy: 'after-finalization',
    blindTitleHebrew: SCENARIO_COMPILER_CONTRACT_V1.blindTitleHe,
    revealedTitleHebrew: manifest.titleHe,
    educationalSourceReferences: exercise.sourceReferences.map(
      ({ sourceId, pageStart, pageEnd, section }) => ({
        sourceId,
        pageStart,
        pageEnd,
        section: section ?? '',
      }),
    ),
    marketDataProvenance: {
      providerId: dataset.manifest.provenance.providerId,
      sourceUrl: dataset.manifest.provenance.sourceUrl,
      termsUrl: dataset.manifest.provenance.termsUrl,
    },
    publicationStatus: 'internal',
    editorial: { status: 'internal' },
    annotations: [],
    hebrewDisclosure: manifest.financialSafetyDisclosureHe,
    deterministicRubric: scenarioRubricIdentity(exercise),
    futureLeakValidation: {
      status: 'passed',
      validatedAt: FIXED_COMPILATION_TIME,
      validatorVersion: SCENARIO_COMPILER_VERSION,
    },
    application: {
      schemaVersion: HISTORICAL_APPLICATION_SCHEMA_VERSION,
      expectedDecision: manifest.application,
    },
    ...(paperExecution ? { paperExecution } : {}),
  };
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

function executionEvidence(session: PaperExecutionSession): readonly string[] {
  const evidence = [`${session.plan.entryIntent.type}-entry`];
  for (const event of session.events) {
    if (event.type === 'order-filled' && event.fill.gap) evidence.push('opening-gap');
    if (event.type === 'position-closed-stop') evidence.push('protective-stop');
    if (event.type === 'position-closed-target') evidence.push('target');
    if (event.type === 'execution-ambiguous') evidence.push('ambiguity');
    if (event.type === 'order-expired') evidence.push('unfilled-order');
  }
  return [...new Set(evidence)].sort();
}

export function buildExecutionSnapshot(
  session: PaperExecutionSession,
): ScenarioExecutionSnapshotV1 {
  const material = {
    schemaVersion: 1 as const,
    terminalStatus: session.status,
    ...(session.workingOrder ? { workingOrderStatus: session.workingOrder.status } : {}),
    ...(session.position ? { positionStatus: session.position.status } : {}),
    events: session.events.map((event) => ({
      sequence: event.sequence,
      type: event.type,
      ...(event.candleIndex === undefined ? {} : { candleIndex: event.candleIndex }),
      ...('fill' in event
        ? {
            fill: {
              referencePrice: event.fill.referencePrice,
              price: event.fill.price,
              commission: event.fill.commission,
              gap: event.fill.gap,
              priceCappedByLimit: event.fill.priceCappedByLimit,
            },
          }
        : {}),
    })),
    ...(session.debrief
      ? {
          debrief: {
            outcome: session.debrief.outcome,
            outcomeDeterminate: session.debrief.outcomeDeterminate,
            totalCommissions: session.debrief.totalCommissions,
            modeledSpreadAndSlippage: session.debrief.modeledSpreadAndSlippage,
            ...(session.debrief.netSimulatedOutcome === undefined
              ? {}
              : { netSimulatedOutcome: session.debrief.netSimulatedOutcome }),
            ...(session.debrief.riskMultiple === undefined
              ? {}
              : { riskMultiple: session.debrief.riskMultiple }),
            ...(session.position?.ambiguityReason === undefined
              ? {}
              : { ambiguityReason: session.position.ambiguityReason }),
          },
        }
      : {}),
  };
  return { ...material, checksum: checksum(material) };
}

function simulate(
  manifest: ScenarioAuthoringManifestV1,
  dataset: HistoricalDataset,
): { session?: PaperExecutionSession; issues: string[] } {
  if (!manifest.expectedExecution || !manifest.planConstraints) return { issues: [] };
  const identity = {
    datasetId: dataset.manifest.datasetId,
    datasetVersion: dataset.manifest.datasetVersion,
    canonicalChecksum: dataset.manifest.canonicalChecksum,
    scenarioId: manifest.scenarioId,
    scenarioVersion: manifest.scenarioVersion,
    analysisSessionId: `authoring-${manifest.scenarioId}`,
    analysisFinalizedAt: '2030-01-01T00:00:00.000Z',
    decisionCandleIndex: manifest.decisionCandleIndex,
    candleCount: dataset.candles.length,
    learningCredit: 'none' as const,
    permittedDirections: manifest.planConstraints.permittedDirections,
    permittedEntryOrderTypes: manifest.planConstraints.permittedEntryOrderTypes,
  };
  let session = createPaperExecutionSession({
    sessionId: `execution-${manifest.scenarioId}`,
    orderId: `order-${manifest.scenarioId}`,
    positionId: `position-${manifest.scenarioId}`,
    debriefId: `debrief-${manifest.scenarioId}`,
    source: identity,
    plan: manifest.expectedExecution.plan,
    createdAt: '2030-01-01T00:00:01.000Z',
  });
  session = reducePaperExecutionSession(session, {
    type: 'submit',
    confirmationId: `confirm-${manifest.scenarioId}`,
    submittedAt: '2030-01-01T00:00:02.000Z',
  });
  session = reducePaperExecutionSession(session, {
    type: 'process-candles',
    candles: domainCandles(dataset).slice(manifest.decisionCandleIndex + 1),
    processedAt: '2030-01-01T00:00:03.000Z',
  });
  session = reducePaperExecutionSession(session, {
    type: 'complete-replay',
    completedAt: '2030-01-01T00:00:04.000Z',
  });
  const actualEvidence = executionEvidence(session);
  const issues: string[] = [];
  if (session.status !== manifest.expectedExecution.expectedStatus)
    issues.push(
      `expected execution status ${manifest.expectedExecution.expectedStatus}; received ${session.status}`,
    );
  for (const required of manifest.expectedExecution.requiredEvidence)
    if (!actualEvidence.includes(required))
      issues.push(`required execution evidence not observed: ${required}`);
  const actualSnapshot = buildExecutionSnapshot(session);
  if (!manifest.expectedExecution.expectedSnapshot)
    issues.push('expected execution snapshot is missing');
  else {
    const { checksum: expectedChecksum, ...expectedMaterial } =
      manifest.expectedExecution.expectedSnapshot;
    if (expectedChecksum !== checksum(expectedMaterial))
      issues.push('expected execution snapshot checksum mismatch');
    if (
      canonicalSerialize(manifest.expectedExecution.expectedSnapshot) !==
      canonicalSerialize(actualSnapshot)
    )
      issues.push('exact execution snapshot does not match deterministic engine output');
  }
  return { session, issues };
}

export function compileScenario(
  manifest: ScenarioAuthoringManifestV1,
  options: ScenarioCompilerOptions = {},
): CompiledScenarioCandidate {
  const structuralIssues: string[] = [];
  if (manifest.compilerVersion !== SCENARIO_COMPILER_VERSION)
    structuralIssues.push(`compiler version mismatch: expected ${SCENARIO_COMPILER_VERSION}`);
  if (manifest.compilerContractChecksum !== checksum(SCENARIO_COMPILER_CONTRACT_V1))
    structuralIssues.push('compiler contract checksum mismatch');
  if (manifest.chartSpecChecksum !== checksum(manifest.chartSpec))
    structuralIssues.push('chart spec checksum mismatch');
  const { checksum: rubricChecksum, ...rubricMaterial } = manifest.processRubric;
  if (rubricChecksum !== checksum(rubricMaterial))
    structuralIssues.push('process rubric checksum mismatch');
  if (
    canonicalSerialize(manifest.processRubric.expectedDecision) !==
    canonicalSerialize(manifest.application)
  )
    structuralIssues.push('process rubric decision does not match application');
  if (manifest.processRubric.requiredRationaleReasonIds.length === 0)
    structuralIssues.push('process rubric requires at least one authored decision rationale');
  if (
    manifest.processRubric.criteria.length !== WORKFLOW_STEP_IDS.length ||
    WORKFLOW_STEP_IDS.some(
      (step) =>
        !manifest.processRubric.criteria.some((criterion) => criterion.workflowStepId === step),
    )
  )
    structuralIssues.push('process rubric must key one criterion to every canonical workflow step');
  const canonicalMaterialChecksum = computeScenarioMaterialChecksum(manifest);
  if (manifest.materialArtifactChecksum !== canonicalMaterialChecksum)
    structuralIssues.push('material artifact checksum mismatch');
  if (manifest.reviewFingerprint !== canonicalMaterialChecksum)
    structuralIssues.push('review fingerprint must equal the canonical material artifact checksum');
  if (
    !/^\d+\.\d+\.\d+$/u.test(manifest.scenarioVersion) ||
    !/^\d+\.\d+\.\d+$/u.test(manifest.datasetVersion)
  )
    structuralIssues.push('scenario and dataset versions must be immutable semantic versions');
  if (
    manifest.retirement.status === 'retired' &&
    Boolean(manifest.retirement.replacementScenarioId) !==
      Boolean(manifest.retirement.replacementScenarioVersion)
  )
    structuralIssues.push('retirement replacement must pin both scenario ID and version');
  if (
    manifest.chartSpec.seed !== Number(manifest.chartSpec.seed) ||
    !Number.isSafeInteger(manifest.chartSpec.seed)
  )
    structuralIssues.push('chart seed must be a stable safe integer');
  if (
    manifest.decisionCandleIndex !== manifest.knowledgeCutoffIndex ||
    manifest.initialVisibleRange.endCandleIndex > manifest.knowledgeCutoffIndex
  )
    structuralIssues.push('future isolation cutoffs are inconsistent');
  if (
    !/[\u0590-\u05ff]/u.test(manifest.promptHe) ||
    Object.values(manifest.workflowPromptsHe).some((value) => !/[\u0590-\u05ff]/u.test(value))
  )
    structuralIssues.push('Hebrew learner text is required');
  const reviewedSourceReferences = [
    ...bundledCatalog.exercises.flatMap((exercise) => exercise.sourceReferences),
    ...bundledCatalog.lessons.flatMap((lesson) => lesson.sourceReferences),
  ];
  const exactSource = {
    sourceId: manifest.source.sourceId,
    pageStart: manifest.source.pageStart,
    pageEnd: manifest.source.pageEnd,
    bookPageStart: manifest.source.bookPageStart,
    bookPageEnd: manifest.source.bookPageEnd,
    section: manifest.source.section,
  };
  if (
    !reviewedSourceReferences.some(
      (reference) => canonicalSerialize(reference) === canonicalSerialize(exactSource),
    )
  )
    structuralIssues.push(
      'source reference does not exactly match a reviewed content/source record',
    );
  if (
    manifest.source.reviewedContentIds.length === 0 ||
    manifest.source.reviewedContentIds.some((contentId) => {
      const content = bundledCatalog.exercises.find((exercise) => exercise.id === contentId);
      return (
        !content ||
        !content.sourceReferences.some(
          (reference) => canonicalSerialize(reference) === canonicalSerialize(exactSource),
        )
      );
    })
  )
    structuralIssues.push('source must bind to an exact reviewed catalog content record');
  if (
    canonicalSerialize(manifest.prerequisites.exerciseIds) !==
      canonicalSerialize(manifest.source.reviewedContentIds) ||
    manifest.prerequisites.conceptIds.length === 0
  )
    structuralIssues.push('scenario prerequisites must pin reviewed content and concepts');
  for (const field of ['pdfDocumentId', 'chapter', 'figure', 'concept', 'rationaleHe'] as const)
    if (manifest.source[field].trim() === '')
      structuralIssues.push(`source.${field} must be non-empty`);
  if (
    !/[\u0590-\u05ff]/u.test(manifest.accessibility.chartDescriptionHe) ||
    !/[\u0590-\u05ff]/u.test(manifest.accessibility.interactionInstructionsHe) ||
    manifest.accessibility.preservesBlindness !== true ||
    !/[\u0590-\u05ff]/u.test(manifest.financialSafetyDisclosureHe)
  )
    structuralIssues.push('Hebrew accessibility and financial-safety disclosures are required');
  if (
    manifest.replayPolicy.blind !== true ||
    manifest.replayPolicy.reveal !== 'after-finalization' ||
    manifest.guidedAnalysis.preservesDecisionCutoff !== true ||
    manifest.guidedAnalysis.availableHintCount !== manifest.hintsHe.length
  )
    structuralIssues.push('blind replay and guided-analysis policy is inconsistent');
  if (manifest.application.kind === 'trade') {
    if (
      !manifest.expectedExecution ||
      manifest.expectedExecution.direction !== manifest.application.direction
    )
      structuralIssues.push('trade application requires direction-aligned expected execution');
    if (
      manifest.expectedExecution &&
      (manifest.expectedExecution.entryOrderType !==
        manifest.expectedExecution.plan.entryIntent.type ||
        !manifest.planConstraints?.permittedDirections.includes(
          manifest.expectedExecution.direction,
        ) ||
        !manifest.planConstraints.permittedEntryOrderTypes.includes(
          manifest.expectedExecution.entryOrderType,
        ))
    )
      structuralIssues.push('expected execution must match exact direction and order constraints');
  } else if (manifest.expectedExecution)
    structuralIssues.push('no-trade application cannot carry an expected execution plan');
  const dataset = buildGeneratedScenarioDataset(manifest);
  if (manifest.generatedDatasetChecksum !== dataset.manifest.canonicalChecksum)
    structuralIssues.push('generated dataset checksum mismatch');
  const gradingExercise = virtualExercise(manifest);
  const exercise = buildBlindExerciseProjection(gradingExercise, manifest);
  const scenario = replayScenario(manifest, dataset, gradingExercise);
  const scenarioValidation = validateHistoricalScenario(scenario, dataset);
  structuralIssues.push(
    ...scenarioValidation.issues
      .filter((item) => item.severity === 'error')
      .map((item) => `${item.code}: ${item.message}`),
  );
  const simulated = simulate(manifest, dataset);
  structuralIssues.push(...simulated.issues);
  const publicationBlockers = [
    ...manifest.publication.blockers,
    ...evaluatePublicationGate(dataset, scenario).map((item) => `${item.code}: ${item.message}`),
  ];
  for (const [area, status] of Object.entries(manifest.reviewStates)) {
    if (status !== 'approved') publicationBlockers.push(`${area} review is pending`);
  }
  for (const record of manifest.publication.records) {
    if (
      record.reviewerRecordId.trim() === '' ||
      record.note.trim() === '' ||
      !Number.isFinite(Date.parse(record.reviewedAt))
    )
      publicationBlockers.push(`malformed ${record.scope} human review record`);
    if (!options.authenticatedReviewerRecordIds?.includes(record.reviewerRecordId))
      publicationBlockers.push(
        `unauthenticated ${record.scope} reviewer record cannot grant approval`,
      );
    if (record.materialArtifactChecksum !== canonicalMaterialChecksum)
      publicationBlockers.push(
        `stale ${record.scope} review: material artifact changed after review`,
      );
  }
  if (['approved', 'published'].includes(manifest.publication.status)) {
    for (const scope of [
      'source',
      'rubric',
      'execution',
      'accessibility',
      'hebrew',
      'financial-safety',
      'publication',
    ] as const) {
      const currentRecords = manifest.publication.records
        .filter(
          (record) =>
            record.scope === scope &&
            record.materialArtifactChecksum === canonicalMaterialChecksum &&
            options.authenticatedReviewerRecordIds?.includes(record.reviewerRecordId) &&
            Number.isFinite(Date.parse(record.reviewedAt)),
        )
        .sort((left, right) => {
          const instantDifference = Date.parse(left.reviewedAt) - Date.parse(right.reviewedAt);
          if (instantDifference !== 0) return instantDifference;
          if (left.decision !== right.decision)
            return left.decision === 'changes-requested' ? 1 : -1;
          return canonicalSerialize(left).localeCompare(canonicalSerialize(right));
        });
      if (currentRecords.at(-1)?.decision !== 'approved')
        publicationBlockers.push(
          `approved/published status requires a current authenticated ${scope} approval not superseded by changes requested`,
        );
    }
  }
  if (manifest.publication.status === 'retired' && manifest.retirement.status !== 'retired')
    structuralIssues.push('retired publication lifecycle requires retirement metadata');
  if (manifest.publication.status !== 'retired' && manifest.retirement.status === 'retired')
    publicationBlockers.push(
      'retirement metadata requires retired publication lifecycle before publication',
    );
  if (manifest.retirement.status === 'retired')
    publicationBlockers.push('retired scenario cannot be published as current');
  return {
    manifest,
    exercise,
    gradingExercise,
    dataset,
    scenario,
    ...(simulated.session
      ? {
          execution: {
            status: simulated.session.status,
            eventTypes: simulated.session.events.map((event) => event.type),
            evidence: executionEvidence(simulated.session),
            snapshot: buildExecutionSnapshot(simulated.session),
          },
        }
      : {}),
    structuralIssues: [...new Set(structuralIssues)].sort(),
    publicationBlockers: [...new Set(publicationBlockers)].sort(),
  };
}

export type ScenarioCompilationResult =
  | { readonly ok: true; readonly candidate: CompiledScenarioCandidate }
  | { readonly ok: false; readonly issues: readonly string[] };

export function compileScenarioSafely(
  input: unknown,
  options: ScenarioCompilerOptions = {},
): ScenarioCompilationResult {
  const parsed = parseScenarioAuthoringManifest(input);
  if (!parsed.ok) return parsed;
  try {
    const candidate = compileScenario(parsed.value, options);
    return candidate.structuralIssues.length === 0
      ? { ok: true, candidate }
      : { ok: false, issues: candidate.structuralIssues };
  } catch (error) {
    return {
      ok: false,
      issues: [error instanceof Error ? error.message : 'unknown scenario compilation failure'],
    };
  }
}
