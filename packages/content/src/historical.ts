import {
  DEVELOPMENT_HISTORICAL_DATASET,
  DEVELOPMENT_HISTORICAL_SCENARIO,
  canonicalSerialize,
  evaluatePublicationGate,
  sha256Hex,
  validateHistoricalDataset,
  validateHistoricalScenario,
  verifyDatasetIdentity,
  type HistoricalDataset,
  type HistoricalReplayScenario,
  type HistoricalValidationIssue,
  type Sha256Checksum,
} from '@chartpath/historical-data';

import { catalog as bundledCatalog } from './catalog.js';
import type { ContentCatalog, ContentExercise } from './types.js';

export { DEVELOPMENT_HISTORICAL_DATASET, DEVELOPMENT_HISTORICAL_SCENARIO };

export const HISTORICAL_EDUCATIONAL_CONTENT_ID = 'u10-capstone-e03' as const;
export const HISTORICAL_GRADER_ID = 'deterministic-capstone-v1' as const;
export const HISTORICAL_PAPER_EXECUTION_ANALYSIS_CONCLUSION = 'no-trade' as const;

export type HistoricalLearningCredit = 'course' | 'none';

export interface HistoricalContentRegistry {
  readonly datasets: readonly HistoricalDataset[];
  readonly scenarios: readonly HistoricalReplayScenario[];
}

export interface HistoricalContentScenarioReport {
  readonly scenarioId: string;
  /** Structural, integrity, and canonical-content checks; publication blockers are reported separately. */
  readonly valid: boolean;
  readonly publishable: boolean;
  /** Derived by validation. Registry authors cannot opt a scenario into ordinary learning credit. */
  readonly learningCredit: HistoricalLearningCredit;
  readonly issues: readonly HistoricalValidationIssue[];
  readonly publicationBlockers: readonly HistoricalValidationIssue[];
}

export interface HistoricalContentValidationReport {
  /** Development/internal fixtures may be valid while deliberately non-publishable. */
  readonly valid: boolean;
  readonly publishable: boolean;
  readonly issues: readonly HistoricalValidationIssue[];
  readonly publicationBlockers: readonly HistoricalValidationIssue[];
  readonly scenarios: readonly HistoricalContentScenarioReport[];
  readonly counts: {
    readonly datasets: number;
    readonly scenarios: number;
    readonly internalOnly: number;
    readonly courseCreditEligible: number;
    readonly publicationBlockers: number;
  };
}

export interface ResolvedHistoricalContent {
  readonly dataset: HistoricalDataset;
  readonly scenario: HistoricalReplayScenario;
  readonly educationalExercise: ContentExercise;
  readonly learningCredit: HistoricalLearningCredit;
  readonly publicationBlockers: readonly HistoricalValidationIssue[];
}

export type HistoricalContentResolution =
  | { readonly ok: true; readonly value: ResolvedHistoricalContent }
  | { readonly ok: false; readonly issues: readonly HistoricalValidationIssue[] };

export const historicalContentRegistry: HistoricalContentRegistry = Object.freeze({
  datasets: Object.freeze([DEVELOPMENT_HISTORICAL_DATASET]),
  scenarios: Object.freeze([DEVELOPMENT_HISTORICAL_SCENARIO]),
});

function issue(
  code: string,
  path: string,
  message: string,
  severity: HistoricalValidationIssue['severity'] = 'error',
): HistoricalValidationIssue {
  return { code, path, message, severity };
}

function withPrefix(item: HistoricalValidationIssue, prefix: string): HistoricalValidationIssue {
  return { ...item, path: item.path ? `${prefix}.${item.path}` : prefix };
}

function uniqueIssues(
  values: readonly HistoricalValidationIssue[],
): readonly HistoricalValidationIssue[] {
  const seen = new Set<string>();
  return values.filter((item) => {
    const key = `${item.severity}\0${item.code}\0${item.path}\0${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function datasetKey(dataset: HistoricalDataset): string {
  return `${dataset.manifest.datasetId}@${dataset.manifest.datasetVersion}`;
}

function referencedDataset(
  scenario: HistoricalReplayScenario,
  registry: HistoricalContentRegistry,
): HistoricalDataset | undefined {
  return (
    registry.datasets.find(
      (dataset) =>
        dataset.manifest.datasetId === scenario.dataset.datasetId &&
        dataset.manifest.datasetVersion === scenario.dataset.datasetVersion,
    ) ??
    registry.datasets.find((dataset) => dataset.manifest.datasetId === scenario.dataset.datasetId)
  );
}

function expectedRubricIdentity(exercise: ContentExercise): {
  readonly rubricId: string;
  readonly rubricVersion: string;
  readonly graderId: string;
  readonly checksum: Sha256Checksum;
} {
  const identity = {
    rubricId: exercise.id,
    rubricVersion: `content-v${exercise.schemaVersion}`,
    graderId: HISTORICAL_GRADER_ID,
  };
  return {
    ...identity,
    checksum: `sha256:${sha256Hex(canonicalSerialize(identity))}`,
  };
}

function normalizedEducationalReferences(exercise: ContentExercise): readonly {
  readonly sourceId: string;
  readonly pageStart: number;
  readonly pageEnd: number;
  readonly section: string;
}[] {
  return exercise.sourceReferences.map(({ sourceId, pageStart, pageEnd, section }) => ({
    sourceId,
    pageStart,
    pageEnd,
    section: section ?? '',
  }));
}

function validateCanonicalContentBinding(
  scenario: HistoricalReplayScenario,
  catalog: ContentCatalog,
): {
  readonly exercise?: ContentExercise;
  readonly issues: readonly HistoricalValidationIssue[];
} {
  const issues: HistoricalValidationIssue[] = [];
  const exercise = catalog.exercises.find((item) => item.id === scenario.educationalContentId);
  if (!exercise) {
    issues.push(
      issue(
        'historical-educational-content-missing',
        'scenario.educationalContentId',
        `Historical scenario references unknown exercise ${scenario.educationalContentId}.`,
      ),
    );
    return { issues };
  }
  if (
    scenario.educationalContentId !== HISTORICAL_EDUCATIONAL_CONTENT_ID ||
    exercise.id !== HISTORICAL_EDUCATIONAL_CONTENT_ID ||
    exercise.rubric.kind !== 'capstone'
  )
    issues.push(
      issue(
        'historical-capstone-mismatch',
        'scenario.educationalContentId',
        `Historical replay must bind to the canonical ${HISTORICAL_EDUCATIONAL_CONTENT_ID} capstone.`,
      ),
    );

  const expectedReferences = normalizedEducationalReferences(exercise);
  if (
    canonicalSerialize(scenario.educationalSourceReferences) !==
    canonicalSerialize(expectedReferences)
  )
    issues.push(
      issue(
        'historical-educational-source-mismatch',
        'scenario.educationalSourceReferences',
        'Historical educational references must exactly match the canonical exercise references.',
      ),
    );

  const expectedRubric = expectedRubricIdentity(exercise);
  if (canonicalSerialize(scenario.deterministicRubric) !== canonicalSerialize(expectedRubric))
    issues.push(
      issue(
        'historical-rubric-mismatch',
        'scenario.deterministicRubric',
        'Historical deterministic-rubric identity must exactly match the canonical capstone.',
      ),
    );

  if (scenario.paperExecution !== undefined) {
    const acceptedAnalysisConclusions =
      exercise.capstoneSteps?.flatMap((step) =>
        step.rubric.kind === 'decision' ? step.rubric.acceptedDecisions : [],
      ) ?? [];
    if (
      scenario.paperExecution.analysisAlignmentConclusion !==
        HISTORICAL_PAPER_EXECUTION_ANALYSIS_CONCLUSION ||
      !acceptedAnalysisConclusions.includes(HISTORICAL_PAPER_EXECUTION_ANALYSIS_CONCLUSION)
    )
      issues.push(
        issue(
          'historical-paper-execution-analysis-mismatch',
          'scenario.paperExecution.analysisAlignmentConclusion',
          'Paper-execution alignment must preserve the canonical no-trade capstone conclusion.',
        ),
      );
    if (
      canonicalSerialize(scenario.paperExecution.permittedDirections) !==
      canonicalSerialize(['short'])
    )
      issues.push(
        issue(
          'historical-paper-execution-direction-mismatch',
          'scenario.paperExecution.permittedDirections',
          'This countertrend-short scenario may expose only the short paper direction.',
        ),
      );
  }

  return { exercise, issues };
}

function validateHistoricalPolicies(
  dataset: HistoricalDataset,
  scenario: HistoricalReplayScenario,
): readonly HistoricalValidationIssue[] {
  const issues: HistoricalValidationIssue[] = [];
  const adjustment = dataset.manifest.adjustment;
  const missingIntervals = dataset.manifest.missingIntervalPolicy;
  if (
    !adjustment ||
    adjustment.corporateActionPolicy !== 'explicit-actions-only' ||
    !missingIntervals ||
    missingIntervals.fillPolicy !== 'never-invent-candles'
  )
    issues.push(
      issue(
        'historical-adjustment-policy-mismatch',
        'manifest.adjustment',
        'Historical content requires explicit corporate actions and must never invent candles.',
      ),
    );
  const session = dataset.manifest.sessionPolicy;
  if (!session || session.timestampConvention !== 'start' || session.includedSessions.length === 0)
    issues.push(
      issue(
        'historical-session-policy-mismatch',
        'manifest.sessionPolicy',
        'Historical content requires an explicit non-empty start-timestamp session policy.',
      ),
    );
  if (scenario.blindMode !== true || scenario.revealPolicy !== 'after-finalization')
    issues.push(
      issue(
        'historical-replay-policy-mismatch',
        'scenario.revealPolicy',
        'Course-bound historical replay must remain blind until finalization.',
      ),
    );
  return issues;
}

function validateScenario(
  scenario: HistoricalReplayScenario,
  registry: HistoricalContentRegistry,
  catalog: ContentCatalog,
): HistoricalContentScenarioReport {
  const dataset = referencedDataset(scenario, registry);
  const identity = verifyDatasetIdentity(scenario.dataset, dataset);
  const content = validateCanonicalContentBinding(scenario, catalog);
  const issues: HistoricalValidationIssue[] = [...content.issues];
  const publicationBlockers: HistoricalValidationIssue[] = [];

  if (!identity.ok) {
    issues.push(
      issue(
        `historical-dataset-${identity.reason}`,
        'scenario.dataset',
        `Historical dataset identity check failed: ${identity.reason}.`,
      ),
    );
    publicationBlockers.push(
      issue(
        'publication-dataset-resolution-required',
        'scenario.dataset',
        'Publication requires an installed dataset matching the exact ID, version, and checksum.',
      ),
    );
  }

  let structurallyValid = false;
  if (dataset) {
    const scenarioReport = validateHistoricalScenario(scenario, dataset);
    issues.push(...scenarioReport.issues);
    issues.push(...validateHistoricalPolicies(dataset, scenario));
    publicationBlockers.push(...evaluatePublicationGate(dataset, scenario));
    structurallyValid = scenarioReport.valid;
  }

  for (const contentIssue of content.issues)
    publicationBlockers.push(
      issue(`publication-${contentIssue.code}`, contentIssue.path, contentIssue.message),
    );
  const deduplicatedIssues = uniqueIssues(issues);
  const deduplicatedBlockers = uniqueIssues(publicationBlockers);
  const valid =
    structurallyValid &&
    identity.ok &&
    deduplicatedIssues.every((item) => item.severity !== 'error');
  const publishable = valid && deduplicatedBlockers.length === 0;
  return {
    scenarioId: scenario.scenarioId,
    valid,
    publishable,
    learningCredit: publishable ? 'course' : 'none',
    issues: deduplicatedIssues,
    publicationBlockers: deduplicatedBlockers,
  };
}

export function validateHistoricalContentRegistry(
  registry: HistoricalContentRegistry = historicalContentRegistry,
  catalog: ContentCatalog = bundledCatalog,
): HistoricalContentValidationReport {
  const issues: HistoricalValidationIssue[] = [];
  const datasetKeys = new Set<string>();
  for (const [index, dataset] of registry.datasets.entries()) {
    const key = datasetKey(dataset);
    if (datasetKeys.has(key))
      issues.push(
        issue(
          'duplicate-historical-dataset',
          `datasets[${index}]`,
          `Historical dataset identity ${key} is duplicated.`,
        ),
      );
    datasetKeys.add(key);
    const datasetReport = validateHistoricalDataset(dataset);
    issues.push(...datasetReport.issues.map((item) => withPrefix(item, `datasets[${index}]`)));
  }

  const scenarioIds = new Set<string>();
  const scenarios = registry.scenarios.map((scenario, index) => {
    if (scenarioIds.has(scenario.scenarioId))
      issues.push(
        issue(
          'duplicate-historical-scenario',
          `scenarios[${index}].scenarioId`,
          `Historical scenario ID ${scenario.scenarioId} is duplicated.`,
        ),
      );
    scenarioIds.add(scenario.scenarioId);
    const report = validateScenario(scenario, registry, catalog);
    issues.push(...report.issues.map((item) => withPrefix(item, `scenarios[${index}]`)));
    return report;
  });

  const deduplicatedIssues = uniqueIssues(issues);
  const publicationBlockers = uniqueIssues(
    scenarios.flatMap((report, index) =>
      report.publicationBlockers.map((item) => withPrefix(item, `scenarios[${index}]`)),
    ),
  );
  const valid = deduplicatedIssues.every((item) => item.severity !== 'error');
  const courseCreditEligible = scenarios.filter(
    (scenario) => scenario.learningCredit === 'course',
  ).length;
  return {
    valid,
    publishable:
      valid && scenarios.length > 0 && scenarios.every((scenario) => scenario.publishable),
    issues: deduplicatedIssues,
    publicationBlockers,
    scenarios,
    counts: {
      datasets: registry.datasets.length,
      scenarios: registry.scenarios.length,
      internalOnly: scenarios.length - courseCreditEligible,
      courseCreditEligible,
      publicationBlockers: publicationBlockers.length,
    },
  };
}

export function resolveHistoricalContent(
  scenarioId: string,
  registry: HistoricalContentRegistry = historicalContentRegistry,
  catalog: ContentCatalog = bundledCatalog,
): HistoricalContentResolution {
  const matching = registry.scenarios.filter((scenario) => scenario.scenarioId === scenarioId);
  if (matching.length !== 1)
    return {
      ok: false,
      issues: [
        issue(
          matching.length === 0 ? 'historical-scenario-missing' : 'duplicate-historical-scenario',
          'scenarioId',
          matching.length === 0
            ? `Historical scenario ${scenarioId} is not registered.`
            : `Historical scenario ${scenarioId} is registered more than once.`,
        ),
      ],
    };

  const scenario = matching[0]!;
  const scenarioReport = validateScenario(scenario, registry, catalog);
  const dataset = referencedDataset(scenario, registry);
  const educationalExercise = catalog.exercises.find(
    (exercise) => exercise.id === scenario.educationalContentId,
  );
  if (!scenarioReport.valid || !dataset || !educationalExercise)
    return { ok: false, issues: scenarioReport.issues };
  return {
    ok: true,
    value: {
      dataset,
      scenario,
      educationalExercise,
      learningCredit: scenarioReport.learningCredit,
      publicationBlockers: scenarioReport.publicationBlockers,
    },
  };
}
