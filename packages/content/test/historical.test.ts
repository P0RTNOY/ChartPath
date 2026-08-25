import {
  computeCanonicalDatasetChecksum,
  type HistoricalDataset,
  type HistoricalReplayScenario,
} from '@chartpath/historical-data';
import { describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import {
  DEVELOPMENT_HISTORICAL_DATASET,
  DEVELOPMENT_HISTORICAL_SCENARIO,
  historicalContentRegistry,
  resolveHistoricalContent,
  validateHistoricalContentRegistry,
  type HistoricalContentRegistry,
} from '../src/historical.js';
import { validateCatalog } from '../src/validator.js';

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

function cloneDataset(): Mutable<HistoricalDataset> {
  return structuredClone(DEVELOPMENT_HISTORICAL_DATASET) as Mutable<HistoricalDataset>;
}

function cloneScenario(): Mutable<HistoricalReplayScenario> {
  return structuredClone(DEVELOPMENT_HISTORICAL_SCENARIO) as Mutable<HistoricalReplayScenario>;
}

function registry(
  dataset: HistoricalDataset = DEVELOPMENT_HISTORICAL_DATASET,
  scenario: HistoricalReplayScenario = DEVELOPMENT_HISTORICAL_SCENARIO,
): HistoricalContentRegistry {
  return { datasets: [dataset], scenarios: [scenario] };
}

function scenarioCodes(value: HistoricalReplayScenario): readonly string[] {
  return validateHistoricalContentRegistry(
    registry(DEVELOPMENT_HISTORICAL_DATASET, value),
  ).issues.map(({ code }) => code);
}

function publishablePair(): readonly [
  Mutable<HistoricalDataset>,
  Mutable<HistoricalReplayScenario>,
] {
  const dataset = cloneDataset();
  dataset.manifest.publicationStatus = 'published';
  dataset.manifest.provenance.license.redistributionStatus = 'verified';
  dataset.manifest.canonicalChecksum = computeCanonicalDatasetChecksum(dataset);
  const scenario = cloneScenario();
  scenario.dataset.canonicalChecksum = dataset.manifest.canonicalChecksum;
  scenario.publicationStatus = 'published';
  scenario.editorial = {
    status: 'published',
    humanReviewer: 'independent-review-record-001',
    reviewedAt: '2026-08-24T00:00:00.000Z',
  };
  scenario.paperExecution!.publicationStatus = 'published';
  return [dataset, scenario];
}

describe('historical content registry', () => {
  it('keeps the bundled development fixture valid for internal use and explicitly non-credit', () => {
    const report = validateHistoricalContentRegistry();
    expect(report).toMatchObject({
      valid: true,
      publishable: false,
      issues: [],
      counts: {
        datasets: 1,
        scenarios: 1,
        internalOnly: 1,
        courseCreditEligible: 0,
      },
      scenarios: [{ valid: true, publishable: false, learningCredit: 'none', issues: [] }],
    });
    expect(report.publicationBlockers.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'scenario-not-published',
        'dataset-not-published',
        'redistribution-not-verified',
        'human-editorial-review-required',
        'paper-execution-not-published',
      ]),
    );

    expect(resolveHistoricalContent(DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId)).toMatchObject({
      ok: true,
      value: {
        dataset: DEVELOPMENT_HISTORICAL_DATASET,
        scenario: DEVELOPMENT_HISTORICAL_SCENARIO,
        educationalExercise: { id: 'u10-capstone-e03' },
        learningCredit: 'none',
      },
    });
    expect(DEVELOPMENT_HISTORICAL_SCENARIO.paperExecution).toMatchObject({
      executionPolicyVersion: 'paper-execution-policy-v1',
      costModelVersion: 'paper-cost-model-v1',
      permittedDirections: ['short'],
      permittedEntryOrderTypes: ['market', 'limit', 'stop'],
      executionBoundary: { afterDecisionCandleIndex: 72, lastCandleIndex: 95 },
      mode: 'hypothetical-mechanics',
      publicationStatus: 'development-only',
    });
  });

  it.each([
    [
      'scenario id',
      (scenario: Mutable<HistoricalReplayScenario>) => {
        scenario.scenarioId = '';
      },
      'invalid-scenario-id',
    ],
    [
      'educational content id',
      (scenario: Mutable<HistoricalReplayScenario>) => {
        scenario.educationalContentId = '';
      },
      'missing-educational-content',
    ],
    [
      'educational references',
      (scenario: Mutable<HistoricalReplayScenario>) => {
        scenario.educationalSourceReferences = [];
      },
      'missing-educational-source',
    ],
    [
      'Hebrew disclosure',
      (scenario: Mutable<HistoricalReplayScenario>) => {
        scenario.hebrewDisclosure = '';
      },
      'missing-hebrew-disclosure',
    ],
    [
      'rubric identity',
      (scenario: Mutable<HistoricalReplayScenario>) => {
        scenario.deterministicRubric.rubricId = '';
      },
      'missing-deterministic-rubric',
    ],
    [
      'rubric checksum',
      (scenario: Mutable<HistoricalReplayScenario>) => {
        scenario.deterministicRubric.checksum = '' as `sha256:${string}`;
      },
      'invalid-checksum',
    ],
    [
      'future-leak validator',
      (scenario: Mutable<HistoricalReplayScenario>) => {
        scenario.futureLeakValidation.validatorVersion = '';
      },
      'invalid-future-leak-state',
    ],
  ] as const)('rejects a missing required %s', (_label, mutate, expectedCode) => {
    const scenario = cloneScenario();
    mutate(scenario);
    expect(scenarioCodes(scenario)).toContain(expectedCode);
  });

  it('rejects dataset version, checksum, content, source, and rubric mismatches', () => {
    const version = cloneScenario();
    version.dataset.datasetVersion = 'different-version';
    expect(scenarioCodes(version)).toContain('historical-dataset-missing');

    const checksum = cloneScenario();
    checksum.dataset.canonicalChecksum = `sha256:${'a'.repeat(64)}`;
    expect(scenarioCodes(checksum)).toContain('historical-dataset-checksum-mismatch');

    const content = cloneScenario();
    content.educationalContentId = 'u10-capstone-e04';
    expect(scenarioCodes(content)).toContain('historical-capstone-mismatch');

    const source = cloneScenario();
    source.educationalSourceReferences[0]!.pageStart += 1;
    expect(scenarioCodes(source)).toContain('historical-educational-source-mismatch');

    const rubric = cloneScenario();
    rubric.deterministicRubric.graderId = 'author-selected-grader';
    expect(scenarioCodes(rubric)).toContain('historical-rubric-mismatch');

    const analysisConclusion = cloneScenario();
    analysisConclusion.application.expectedDecision = {
      kind: 'no-trade',
      disposition: 'insufficient-evidence',
    };
    expect(scenarioCodes(analysisConclusion)).toContain(
      'historical-paper-execution-analysis-mismatch',
    );

    const direction = cloneScenario();
    direction.application.expectedDecision = { kind: 'trade', direction: 'short' };
    direction.paperExecution!.permittedDirections = ['long'];
    expect(scenarioCodes(direction)).toContain('historical-paper-execution-direction-mismatch');
  });

  it('checks adjustment, session, replay, and future-leak policy at the content boundary', () => {
    const adjustmentDataset = cloneDataset();
    adjustmentDataset.manifest.adjustment.corporateActionPolicy =
      'inferred' as 'explicit-actions-only';
    adjustmentDataset.manifest.canonicalChecksum =
      computeCanonicalDatasetChecksum(adjustmentDataset);
    const adjustmentScenario = cloneScenario();
    adjustmentScenario.dataset.canonicalChecksum = adjustmentDataset.manifest.canonicalChecksum;
    expect(
      validateHistoricalContentRegistry(registry(adjustmentDataset, adjustmentScenario)).issues.map(
        ({ code }) => code,
      ),
    ).toContain('historical-adjustment-policy-mismatch');

    const policyDataset = cloneDataset();
    policyDataset.manifest.sessionPolicy.timestampConvention = 'end' as 'start';
    policyDataset.manifest.canonicalChecksum = computeCanonicalDatasetChecksum(policyDataset);
    const policyScenario = cloneScenario();
    policyScenario.dataset.canonicalChecksum = policyDataset.manifest.canonicalChecksum;
    expect(
      validateHistoricalContentRegistry(registry(policyDataset, policyScenario)).issues.map(
        ({ code }) => code,
      ),
    ).toContain('historical-session-policy-mismatch');

    const replayScenario = cloneScenario();
    replayScenario.blindMode = false;
    expect(scenarioCodes(replayScenario)).toContain('historical-replay-policy-mismatch');

    const futureLeakScenario = cloneScenario();
    futureLeakScenario.futureLeakValidation.status = 'failed';
    const futureLeakReport = validateHistoricalContentRegistry(
      registry(DEVELOPMENT_HISTORICAL_DATASET, futureLeakScenario),
    );
    expect(futureLeakReport.valid).toBe(true);
    expect(futureLeakReport.scenarios[0]?.learningCredit).toBe('none');
    expect(futureLeakReport.publicationBlockers.map(({ code }) => code)).toContain(
      'future-leak-validation-required',
    );
  });

  it('requires independent review and verified redistribution before publication or credit', () => {
    const [dataset, scenario] = publishablePair();
    const eligible = validateHistoricalContentRegistry(registry(dataset, scenario));
    expect(eligible).toMatchObject({
      valid: true,
      publishable: true,
      counts: { courseCreditEligible: 1, publicationBlockers: 0 },
      scenarios: [{ learningCredit: 'course' }],
    });

    const unreviewed = structuredClone(scenario);
    unreviewed.editorial = { status: 'internal' };
    const reviewReport = validateHistoricalContentRegistry(registry(dataset, unreviewed));
    expect(reviewReport.valid).toBe(true);
    expect(reviewReport.scenarios[0]?.learningCredit).toBe('none');
    expect(reviewReport.publicationBlockers.map(({ code }) => code)).toContain(
      'human-editorial-review-required',
    );

    const nonRightsDataset = structuredClone(dataset);
    nonRightsDataset.manifest.provenance.license.redistributionStatus = 'prohibited';
    nonRightsDataset.manifest.canonicalChecksum = computeCanonicalDatasetChecksum(nonRightsDataset);
    const nonRightsScenario = structuredClone(scenario);
    nonRightsScenario.dataset.canonicalChecksum = nonRightsDataset.manifest.canonicalChecksum;
    const rightsReport = validateHistoricalContentRegistry(
      registry(nonRightsDataset, nonRightsScenario),
    );
    expect(rightsReport.valid).toBe(true);
    expect(rightsReport.scenarios[0]?.learningCredit).toBe('none');
    expect(rightsReport.publicationBlockers.map(({ code }) => code)).toContain(
      'redistribution-not-verified',
    );
  });

  it('does not accept an authored learning-credit escape hatch', () => {
    const scenario = {
      ...cloneScenario(),
      learningCredit: 'course',
    } as HistoricalReplayScenario & { readonly learningCredit: 'course' };
    const report = validateHistoricalContentRegistry(
      registry(DEVELOPMENT_HISTORICAL_DATASET, scenario),
    );
    expect(report.scenarios[0]?.learningCredit).toBe('none');
    expect(report.counts.courseCreditEligible).toBe(0);
  });

  it('leaves the canonical reviewed curriculum inventory completely separate and untouched', () => {
    const catalogReport = validateCatalog();
    expect(catalogReport).toMatchObject({
      valid: true,
      counts: { exercises: 60, reviewedExercises: 60, capstones: 1 },
    });
    expect(catalog.exercises).toHaveLength(60);
    expect(
      catalog.exercises.filter(
        (exercise) => exercise.id === 'u10-capstone-e03' && exercise.rubric.kind === 'capstone',
      ),
    ).toHaveLength(1);
    expect(historicalContentRegistry.scenarios).toHaveLength(1);
  });
});
