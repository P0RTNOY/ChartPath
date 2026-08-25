import { canonicalSerialize } from '@chartpath/historical-data';
import { describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import {
  internalHistoricalContentRegistry,
  resolveHistoricalContentVersion,
  validateHistoricalContentRegistry,
} from '../src/historical.js';
import {
  buildScenarioLibraryReport,
  buildScenarioPreview,
  compileScenarioSafely,
  computeScenarioMaterialChecksum,
  computeScenarioReviewRecordChecksum,
  resolveScenarioCandidate,
  scenarioAuthoringManifests,
  scenarioCandidateRegistry,
  validateScenarioVersionHistory,
  type ScenarioAuthoringManifestV1,
} from '../src/scenarios/index.js';
import { compileScenario } from '../src/scenarios/compiler.js';

function clone(index = 0): ScenarioAuthoringManifestV1 {
  return structuredClone(scenarioAuthoringManifests[index]!);
}

describe('scenario authoring library', () => {
  it('keeps the fixed catalog unchanged and provides exactly three long, short, and no-trade candidates', () => {
    const report = buildScenarioLibraryReport();
    expect(catalog.exercises).toHaveLength(60);
    expect(report.valid).toBe(true);
    expect(report.publishable).toBe(false);
    expect(report.counts).toMatchObject({
      total: 9,
      long: 3,
      short: 3,
      noTrade: 3,
      structuralErrors: 0,
    });
    expect(
      scenarioAuthoringManifests.every(
        (manifest) => manifest.publication.status === 'human-review-required',
      ),
    ).toBe(true);
  });

  it('compiles identical canonical datasets, checksums, serialization, and eleven-step rubrics', () => {
    for (const manifest of scenarioAuthoringManifests) {
      const left = compileScenario(manifest);
      const right = compileScenario(structuredClone(manifest));
      expect(canonicalSerialize(left.dataset)).toBe(canonicalSerialize(right.dataset));
      expect(left.dataset.manifest.canonicalChecksum).toBe(manifest.generatedDatasetChecksum);
      expect(left.manifest.materialArtifactChecksum).toBe(
        computeScenarioMaterialChecksum(left.manifest),
      );
      expect(left.exercise.steps).toHaveLength(11);
      expect(left.scenario.annotations).toEqual([]);
      expect(left.structuralIssues).toEqual([]);
    }
  }, 15_000);

  it('uses the real paper engine to observe all required mechanics without grading on outcome', () => {
    const evidence = new Set(
      scenarioCandidateRegistry.flatMap((candidate) => candidate.execution?.evidence ?? []),
    );
    expect(evidence).toEqual(
      new Set([
        'ambiguity',
        'limit-entry',
        'market-entry',
        'opening-gap',
        'protective-stop',
        'stop-entry',
        'target',
        'unfilled-order',
      ]),
    );
    for (const manifest of scenarioAuthoringManifests) {
      expect(manifest.processRubric.scoring).toEqual({
        executionStatusAffectsScore: false,
        profitAndLossAffectsScore: false,
      });
      expect(manifest.processRubric.requiredRationaleReasonIds.length).toBeGreaterThan(0);
    }
    expect(
      new Set(
        scenarioAuthoringManifests.map(
          (manifest) => manifest.processRubric.requiredRationaleReasonIds[0],
        ),
      ).size,
    ).toBe(9);
    expect(
      new Set(
        scenarioAuthoringManifests.map(
          (manifest) => manifest.processRubric.criteria[0]!.expectedEvidenceHe,
        ),
      ).size,
    ).toBe(9);
    for (const candidate of scenarioCandidateRegistry) {
      if (!candidate.manifest.expectedExecution) continue;
      expect(candidate.execution?.snapshot).toEqual(
        candidate.manifest.expectedExecution.expectedSnapshot,
      );
    }
  });

  it('resolves exact internal versions with zero credit and rejects unpinned versions', () => {
    const validation = validateHistoricalContentRegistry(internalHistoricalContentRegistry);
    expect(validation.valid).toBe(true);
    expect(validation.counts).toMatchObject({
      datasets: 10,
      scenarios: 10,
      internalOnly: 10,
      courseCreditEligible: 0,
    });
    const first = scenarioAuthoringManifests[0]!;
    const resolved = resolveHistoricalContentVersion(
      { scenarioId: first.scenarioId, scenarioVersion: first.scenarioVersion },
      internalHistoricalContentRegistry,
    );
    expect(resolved.ok && resolved.value.learningCredit).toBe('none');
    if (resolved.ok) {
      expect(resolved.value.learnerExercise).toEqual(
        resolveScenarioCandidate(first.scenarioId, first.scenarioVersion)?.exercise,
      );
      expect(canonicalSerialize(resolved.value.learnerExercise)).not.toMatch(
        /internal-|long-range|inverse|double-top|head-and-shoulders|breakout|triangle|wedge|לונג|שורט|מועמד/u,
      );
    }
    expect(
      resolveHistoricalContentVersion(
        { scenarioId: first.scenarioId, scenarioVersion: '9.9.9' },
        internalHistoricalContentRegistry,
      ).ok,
    ).toBe(false);
    expect(resolveScenarioCandidate(first.scenarioId, first.scenarioVersion)).toBeDefined();
  });

  it('projects only neutral blind data and serializes no semantic answer-bearing identifiers', () => {
    for (const candidate of scenarioCandidateRegistry) {
      const preview = buildScenarioPreview(candidate);
      expect(preview.candles).toHaveLength(candidate.manifest.knowledgeCutoffIndex + 1);
      const serialized = canonicalSerialize(preview);
      expect(serialized).not.toMatch(
        /internal-|long-range|inverse|double-top|head-and-shoulders|breakout|triangle|wedge|לונג|שורט|מועמד|ראש־וכתפיים|פסגה כפולה|משולש עולה|טריז עולה/u,
      );
      expect(serialized).not.toMatch(/timestamp|20\d\d-\d\d-\d\dT/u);
      expect(serialized).not.toContain(candidate.manifest.scenarioId);
      expect(serialized).not.toContain(candidate.manifest.datasetId);
    }
  });

  it('fails closed on malformed runtime input and malformed exact sources', () => {
    expect(compileScenarioSafely({ schemaVersion: 1 })).toMatchObject({ ok: false });
    expect(compileScenarioSafely(null)).toEqual({
      ok: false,
      issues: ['$: Invalid input: expected object, received null'],
    });
    const malformedSource = clone();
    Object.assign(malformedSource.source, { pageStart: 999, pageEnd: 999 });
    expect(compileScenario(malformedSource).structuralIssues).toContain(
      'source reference does not exactly match a reviewed content/source record',
    );
    expect(compileScenarioSafely(malformedSource).ok).toBe(false);
  });

  it('pins compiler version and versioned compiler contract into the material fingerprint', () => {
    const versionMismatch = clone();
    Object.assign(versionMismatch, { compilerVersion: 'scenario-compiler-v0' });
    expect(compileScenario(versionMismatch).structuralIssues).toEqual(
      expect.arrayContaining([
        'compiler version mismatch: expected scenario-compiler-v1',
        'material artifact checksum mismatch',
      ]),
    );
    expect(computeScenarioMaterialChecksum(versionMismatch)).not.toBe(
      scenarioAuthoringManifests[0]!.materialArtifactChecksum,
    );

    const contractMismatch = clone();
    Object.assign(contractMismatch, {
      compilerContractChecksum: `sha256:${'d'.repeat(64)}`,
    });
    expect(compileScenario(contractMismatch).structuralIssues).toContain(
      'compiler contract checksum mismatch',
    );
  });

  it('invalidates stale approval for every material artifact category but not lifecycle bookkeeping', () => {
    const original = clone();
    const mutations: ((manifest: ScenarioAuthoringManifestV1) => void)[] = [
      (manifest) => Object.assign(manifest, { promptHe: `${manifest.promptHe} שינוי` }),
      (manifest) =>
        Object.assign(manifest.source, { rationaleHe: `${manifest.source.rationaleHe} שינוי` }),
      (manifest) =>
        Object.assign(manifest.chartSpec, { basePrice: manifest.chartSpec.basePrice + 1 }),
      (manifest) =>
        Object.assign(manifest.processRubric.criteria[0]!, { criterionHe: 'קריטריון שונה' }),
      (manifest) =>
        Object.assign(manifest.expectedExecution!.plan, {
          targetPrice: manifest.expectedExecution!.plan.targetPrice + 1,
        }),
      (manifest) => Object.assign(manifest.licensing, { redistributionStatus: 'verified' }),
      (manifest) =>
        Object.assign(manifest, { generatedDatasetChecksum: `sha256:${'a'.repeat(64)}` }),
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(original);
      Object.assign(changed.publication, {
        records: [
          {
            reviewerRecordId: 'reviewer-record-stale-test',
            reviewedAt: '2026-01-02T00:00:00.000Z',
            decision: 'approved',
            materialArtifactChecksum: original.materialArtifactChecksum,
            scope: 'publication',
            note: 'review record for stale-artifact test',
          },
        ],
      });
      mutate(changed);
      const compiled = compileScenario(changed);
      expect(compiled.structuralIssues).toContain('material artifact checksum mismatch');
      expect(compiled.publicationBlockers).toContain(
        'stale publication review: material artifact changed after review',
      );
    }
    const bookkeeping = structuredClone(original);
    Object.assign(bookkeeping.reviewStates, { source: 'approved' });
    Object.assign(bookkeeping, {
      retirement: { status: 'retired', retiredAt: '2026-02-01T00:00:00.000Z' },
    });
    expect(computeScenarioMaterialChecksum(bookkeeping)).toBe(original.materialArtifactChecksum);
  }, 15_000);

  it('rejects fake review state, malformed records, cutoff leaks, decision/order mismatch, and stale version reuse', () => {
    const review = clone();
    Object.assign(review.publication, {
      status: 'approved',
      records: [
        {
          reviewerRecordId: ' ',
          reviewedAt: 'not-a-date',
          decision: 'approved',
          materialArtifactChecksum: review.materialArtifactChecksum,
          scope: 'publication',
          note: '',
        },
      ],
    });
    expect(compileScenario(review).publicationBlockers).toContain(
      'malformed publication human review record',
    );
    expect(compileScenario(review).publicationBlockers).toContain(
      'unauthenticated publication reviewer record cannot grant approval',
    );

    const superseded = clone();
    Object.assign(superseded.reviewStates, {
      source: 'approved',
      accessibility: 'approved',
      hebrew: 'approved',
      'financial-safety': 'approved',
    });
    Object.assign(superseded.publication, {
      status: 'approved',
      records: [
        ...(
          [
            'source',
            'rubric',
            'execution',
            'accessibility',
            'hebrew',
            'financial-safety',
            'publication',
          ] as const
        ).map((scope) => ({
          reviewerRecordId: `authenticated-${scope}-approval`,
          reviewedAt: '2026-01-02T23:00:00.000+14:00',
          decision: 'approved' as const,
          materialArtifactChecksum: superseded.materialArtifactChecksum,
          scope,
          note: 'authenticated approval under test',
        })),
        {
          reviewerRecordId: 'authenticated-publication-change-request',
          reviewedAt: '2026-01-02T10:00:00.000Z',
          decision: 'changes-requested',
          materialArtifactChecksum: superseded.materialArtifactChecksum,
          scope: 'publication',
          note: 'later changes requested must supersede approval',
        },
        {
          reviewerRecordId: 'authenticated-publication-equal-time-approval',
          reviewedAt: '2026-01-02T12:00:00.000+02:00',
          decision: 'approved',
          materialArtifactChecksum: superseded.materialArtifactChecksum,
          scope: 'publication',
          note: 'same instant approval must lose deterministically to changes requested',
        },
      ],
    });
    const trustedReviewRecordChecksums = new Map(
      superseded.publication.records.map((record) => [
        record.reviewerRecordId,
        computeScenarioReviewRecordChecksum(record),
      ]),
    );
    expect(
      compileScenario(superseded, {
        trustedReviewRecordChecksums,
      }).publicationBlockers,
    ).toContain(
      'approved/published status requires a current authenticated publication approval not superseded by changes requested',
    );

    const cutoff = clone();
    Object.assign(cutoff.initialVisibleRange, { endCandleIndex: 64 });
    expect(compileScenario(cutoff).structuralIssues).toContain(
      'future isolation cutoffs are inconsistent',
    );

    const direction = clone();
    Object.assign(direction.application, { direction: 'short' });
    expect(compileScenario(direction).structuralIssues).toContain(
      'trade application requires direction-aligned expected execution',
    );

    const exactExecution = clone();
    const expectedFill = exactExecution.expectedExecution!.expectedSnapshot.events.find(
      (event) => event.fill,
    )!.fill!;
    Object.assign(expectedFill, { price: expectedFill.price + 0.01 });
    expect(compileScenario(exactExecution).structuralIssues).toEqual(
      expect.arrayContaining([
        'expected execution snapshot checksum mismatch',
        'exact execution snapshot does not match deterministic engine output',
      ]),
    );

    const duplicated = [
      scenarioCandidateRegistry[0]!,
      structuredClone(scenarioCandidateRegistry[0]!),
    ];
    Object.assign(duplicated[1]!.manifest, {
      materialArtifactChecksum: `sha256:${'b'.repeat(64)}`,
    });
    expect(validateScenarioVersionHistory(duplicated)).toContain(
      `material mutation reused immutable scenario version ${duplicated[0]!.manifest.scenarioId}@${duplicated[0]!.manifest.scenarioVersion}`,
    );

    const retired = structuredClone(scenarioCandidateRegistry[0]!);
    const replacement = structuredClone(scenarioCandidateRegistry[0]!);
    Object.assign(replacement.manifest, {
      scenarioVersion: '2.0.0',
      materialArtifactChecksum: `sha256:${'c'.repeat(64)}`,
    });
    Object.assign(retired.manifest, {
      retirement: {
        status: 'retired',
        retiredAt: '2026-02-01T00:00:00.000Z',
        replacementScenarioId: replacement.manifest.scenarioId,
        replacementScenarioVersion: replacement.manifest.scenarioVersion,
      },
    });
    expect(validateScenarioVersionHistory([retired, replacement])).toEqual([]);
  });

  it('retains the precise third literal no-trade source-review blocker', () => {
    const third = scenarioAuthoringManifests.find(
      (manifest) => manifest.scenarioId === 'internal-no-trade-gap-uncertainty',
    )!;
    expect(third.application).toEqual({ kind: 'no-trade', disposition: 'no-trade' });
    expect(third.publication.blockers.join('\n')).toContain(
      'אין בקטלוג רובריקה שלישית, שנבדקה אנושית, להחלטת אי־עסקה מילולית מלאה',
    );
  });
});
