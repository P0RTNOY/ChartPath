import { canonicalSerialize } from '@chartpath/historical-data';
import { describe, expect, it } from 'vitest';

import {
  buildBlindScenarioPositionManagementPreview,
  buildScenarioPositionManagementExtension,
  buildScenarioPositionManagementQaPreview,
  buildScenarioPositionManagementReport,
  resolveScenarioPositionManagementAuthority,
  scenarioPositionManagementVariantRegistry,
} from '../src/scenarios/management.js';
import {
  parseScenarioPositionManagementConfiguration,
  parseScenarioPositionManagementExtension,
} from '../src/scenarios/management-schema.js';
import { scenarioCandidateRegistry } from '../src/scenarios/registry.js';

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('position-management scenario variants', () => {
  it('preserves all nine V1 candidate identities and adds immutable internal versions', () => {
    expect(
      scenarioCandidateRegistry.map(
        ({ manifest }) => `${manifest.scenarioId}@${manifest.scenarioVersion}`,
      ),
    ).toHaveLength(9);
    expect(
      scenarioCandidateRegistry.every(({ manifest }) => manifest.scenarioVersion === '1.0.0'),
    ).toBe(true);
    expect(
      scenarioPositionManagementVariantRegistry.map(
        ({ scenarioId, scenarioVersion }) => `${scenarioId}@${scenarioVersion}`,
      ),
    ).toEqual([
      'internal-long-range-breakout@2.0.0',
      'internal-long-range-breakout@2.1.0',
      'internal-short-double-top@2.0.0',
    ]);
  });

  it('increments dataset identity only for material future-candle replacements', () => {
    const base = scenarioCandidateRegistry.find(
      ({ manifest }) => manifest.scenarioId === 'internal-long-range-breakout',
    )!;
    const unchanged = scenarioPositionManagementVariantRegistry.find(
      ({ scenarioVersion }) => scenarioVersion === '2.0.0',
    )!;
    const adverse = scenarioPositionManagementVariantRegistry.find(
      ({ scenarioVersion }) => scenarioVersion === '2.1.0',
    )!;
    expect(unchanged.datasetVersion).toBe(base.dataset.manifest.datasetVersion);
    expect(unchanged.datasetChecksum).toBe(base.dataset.manifest.canonicalChecksum);
    expect(adverse.datasetVersion).not.toBe(base.dataset.manifest.datasetVersion);
    expect(adverse.datasetChecksum).not.toBe(base.dataset.manifest.canonicalChecksum);
    expect(canonicalSerialize(adverse.dataset.candles.slice(0, 65))).toBe(
      canonicalSerialize(base.dataset.candles.slice(0, 65)),
    );
    const shortBase = scenarioCandidateRegistry.find(
      ({ manifest }) => manifest.scenarioId === 'internal-short-double-top',
    )!;
    const shortGap = scenarioPositionManagementVariantRegistry.find(
      ({ scenarioId, scenarioVersion }) =>
        scenarioId === 'internal-short-double-top' && scenarioVersion === '2.0.0',
    )!;
    expect(canonicalSerialize(shortGap.dataset.candles.slice(0, 65))).toBe(
      canonicalSerialize(shortBase.dataset.candles.slice(0, 65)),
    );
    for (const [original, changed] of [
      [base.dataset.candles, adverse.dataset.candles],
      [shortBase.dataset.candles, shortGap.dataset.candles],
    ] as const) {
      const replacementIndexes = changed
        .filter(
          (candle, index) => canonicalSerialize(candle) !== canonicalSerialize(original[index]),
        )
        .map(({ index }) => index);
      expect(replacementIndexes.length).toBeGreaterThan(0);
      expect(replacementIndexes.every((index) => index > 64)).toBe(true);
    }
  });

  it('covers deterministic management mechanics with reducer-produced checksummed snapshots', () => {
    const cases = scenarioPositionManagementVariantRegistry.flatMap(
      ({ management }) => management.expectedCases,
    );
    const ids = cases.map(({ caseId }) => caseId);
    expect(ids).toEqual(
      expect.arrayContaining([
        'long-partial',
        'long-full',
        'long-scale-valid',
        'long-scale-rejected',
        'long-stop-replacement',
        'long-target-replacement',
        'long-pending-reload',
        'long-cancel-pending',
        'long-partial-then-target',
        'long-partial-then-stop',
        'long-adverse-stop',
        'long-opening-ambiguity',
        'short-action-before-later-gap',
      ]),
    );
    expect(
      cases.every(({ snapshots }) =>
        snapshots.every(({ checksum }) => checksum.startsWith('sha256:')),
      ),
    ).toBe(true);
    expect(
      cases.find(({ caseId }) => caseId === 'long-scale-rejected')?.snapshots.at(-1)
        ?.draftHardRejectionCodes,
    ).toContain('SCALE_IN_EXCEEDS_QUANTITY_LIMIT');
    expect(
      cases.find(({ caseId }) => caseId === 'long-opening-ambiguity')?.snapshots.at(-1)
        ?.ambiguityReason,
    ).toBe('voluntary-action-and-opening-threshold');
    expect(
      cases.find(({ caseId }) => caseId === 'short-action-before-later-gap')?.evidence,
    ).toContain('position-closed-stop');
    expect(
      cases.find(({ caseId }) => caseId === 'long-adverse-stop')?.snapshots.at(-1)?.debrief,
    ).toMatchObject({ outcome: 'protective-stop', processQuality: 'coherent' });
    expect(
      cases.find(({ caseId }) => caseId === 'long-adverse-stop')?.snapshots.at(-1)
        ?.realizedNetMinor,
    ).toBeLessThan(0);
    expect(
      cases.find(({ caseId }) => caseId === 'long-opening-ambiguity')?.snapshots.at(-1)?.debrief,
    ).toMatchObject({ outcome: 'ambiguous', outcomeDeterminate: false });
    expect(cases.find(({ caseId }) => caseId === 'long-cancel-pending')?.evidence).toContain(
      'management-action-cancelled',
    );
    expect(
      cases
        .find(({ caseId }) => caseId === 'long-pending-reload')
        ?.snapshots.map(({ stageId }) => stageId),
    ).toEqual([
      'handoff-open',
      'pending-before-reload',
      'pending-after-reload',
      'processed-after-reload',
    ]);
    expect(
      cases.find(({ caseId }) => caseId === 'long-partial-then-target')?.snapshots.at(-1)?.status,
    ).toBe('closed-target');
    expect(
      cases.find(({ caseId }) => caseId === 'long-partial-then-stop')?.snapshots.at(-1)?.status,
    ).toBe('closed-stop');
  });

  it('keeps every variant internal, no-credit, unapproved, and seven-scope review blocked', () => {
    const report = buildScenarioPositionManagementReport();
    expect(report.valid).toBe(true);
    expect(report.publishable).toBe(false);
    expect(report.registryChecksum).toBe(
      'sha256:ebe891433f362e9410728b5b7e84d05611943b39d3f8cedc2fd9830f9a8daffe',
    );
    expect(report.counts.expectedCases).toBe(13);
    expect(report.counts).toMatchObject({
      variants: 3,
      enabled: 3,
      originalDisabled: 9,
      reviewScopes: 7,
    });
    for (const variant of scenarioPositionManagementVariantRegistry) {
      expect(variant.publication).toMatchObject({
        status: 'human-review-required',
        learningCredit: 'none',
        records: [],
      });
      expect(variant.publication.reviewScopes).toEqual([
        'source',
        'rubric',
        'execution',
        'accessibility',
        'hebrew',
        'financial-safety',
        'publication',
      ]);
      expect(variant.publication.blockers.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('resolves enabled authority exactly and fails closed for original/no-trade/unfilled/credit mismatch', () => {
    const enabled = resolveScenarioPositionManagementAuthority({
      scenarioId: 'internal-long-range-breakout',
      scenarioVersion: '2.0.0',
      learningCredit: 'none',
    });
    expect(enabled).toMatchObject({ status: 'enabled', authority: { learningCredit: 'none' } });
    if (enabled.status === 'enabled') {
      const variant = scenarioPositionManagementVariantRegistry.find(
        ({ scenarioId, scenarioVersion }) =>
          scenarioId === 'internal-long-range-breakout' && scenarioVersion === '2.0.0',
      )!;
      expect(enabled.authority.permittedActionKinds).toEqual(
        variant.management.permittedActionKinds,
      );
      expect(enabled.authority.riskLimits).toEqual(variant.management.riskLimits);
      expect(enabled.authority.permissionVersion).toContain('internal-long-range-breakout-2-0-0');
    }
    expect(
      resolveScenarioPositionManagementAuthority({
        scenarioId: 'internal-long-range-breakout',
        scenarioVersion: '2.0.0',
        learningCredit: 'course',
      }),
    ).toEqual({ status: 'unavailable', reason: 'credit-mismatch' });
    expect(
      resolveScenarioPositionManagementAuthority({
        scenarioId: 'internal-no-trade-capstone-c',
        scenarioVersion: '1.0.0',
        learningCredit: 'none',
      }),
    ).toEqual({ status: 'unavailable', reason: 'no-trade' });
    expect(
      resolveScenarioPositionManagementAuthority({
        scenarioId: 'internal-short-rising-wedge',
        scenarioVersion: '1.0.0',
        learningCredit: 'none',
      }),
    ).toEqual({ status: 'unavailable', reason: 'unfilled-entry' });
  });

  it('keeps blind previews free of identity, outcome, source, and checksum material', () => {
    const variant = scenarioPositionManagementVariantRegistry[0]!;
    const blind = canonicalSerialize(
      buildBlindScenarioPositionManagementPreview(variant.scenarioId, variant.scenarioVersion),
    );
    for (const forbidden of [
      'scenarioId',
      'scenarioVersion',
      'datasetId',
      'datasetVersion',
      'checksum',
      'expectedCases',
      'outcome',
      'sourceId',
    ])
      expect(blind).not.toContain(forbidden);
    expect(buildScenarioPositionManagementQaPreview(variant)).toMatchObject({
      scenarioId: variant.scenarioId,
      learningCredit: 'none',
      publicationStatus: 'human-review-required',
    });
  });

  it('strictly parses the complete bounded management DSL and all derived snapshots', () => {
    const extension = buildScenarioPositionManagementExtension(
      scenarioPositionManagementVariantRegistry[0]!,
    );
    const parsed = parseScenarioPositionManagementExtension(extension);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(Object.isFrozen(parsed.value.management.expectedCases[0])).toBe(true);

    const unknown = cloneJson(extension) as typeof extension & { unexpected?: boolean };
    unknown.unexpected = true;
    expect(parseScenarioPositionManagementExtension(unknown)).toMatchObject({ ok: false });

    const staleRubric = JSON.parse(JSON.stringify(extension)) as {
      management: { rubric: { domainRubric: { criteria: unknown[] } } };
    };
    staleRubric.management.rubric.domainRubric.criteria[0] = {
      criterionId: 'mutated-after-review',
      kind: 'risk-reviewed',
      required: true,
    };
    expect(parseScenarioPositionManagementExtension(staleRubric)).toMatchObject({ ok: false });

    const staleSnapshot = JSON.parse(JSON.stringify(extension)) as {
      management: { expectedCases: { snapshots: { openQuantityUnits: number }[] }[] };
    };
    staleSnapshot.management.expectedCases[0]!.snapshots[0]!.openQuantityUnits += 1;
    expect(parseScenarioPositionManagementExtension(staleSnapshot)).toMatchObject({ ok: false });

    const nonFinite = JSON.parse(JSON.stringify(extension)) as {
      management: { expectedCases: { actions: unknown[] }[] };
    };
    nonFinite.management.expectedCases[0]!.actions[0] = {
      type: 'material-intent',
      actionId: 'invalid-non-finite-action',
      authoredAtCandleIndex: 64,
      intent: { kind: 'replace-stop', price: Number.POSITIVE_INFINITY },
      rationaleHe: 'בדיקת קלט חיצוני ללא ערך סופי.',
      processEvidence: {
        decisionBasis: 'predefined-plan',
        riskReviewed: true,
        evidenceTags: ['predefined-plan'],
      },
    };
    expect(parseScenarioPositionManagementExtension(nonFinite)).toMatchObject({ ok: false });

    const duplicateEvidence = cloneJson(extension);
    const materialAction = duplicateEvidence.management.expectedCases
      .flatMap(({ actions }) => actions)
      .find((action) => action.type === 'material-intent');
    if (materialAction?.type !== 'material-intent') throw new Error('Missing material action');
    const mutableProcessEvidence = materialAction.processEvidence as unknown as {
      evidenceTags: string[];
    };
    mutableProcessEvidence.evidenceTags = ['predefined-plan', 'predefined-plan'];
    expect(parseScenarioPositionManagementExtension(duplicateEvidence)).toMatchObject({
      ok: false,
    });

    const oversized = cloneJson(extension) as typeof extension & { padding?: string };
    oversized.padding = 'x'.repeat(9_000);
    expect(parseScenarioPositionManagementExtension(oversized)).toMatchObject({ ok: false });

    const unusualPrototype = Object.create({ inherited: true }) as Record<string, unknown>;
    unusualPrototype.schemaVersion = 1;
    expect(parseScenarioPositionManagementExtension(unusualPrototype)).toMatchObject({ ok: false });
  });

  it('strictly separates disabled configuration from permissions, rubric, and cases', () => {
    expect(
      parseScenarioPositionManagementConfiguration({
        schemaVersion: 1,
        enabled: false,
        reason: 'no-trade',
      }),
    ).toMatchObject({ ok: true, value: { enabled: false, reason: 'no-trade' } });
    expect(
      parseScenarioPositionManagementConfiguration({
        schemaVersion: 1,
        enabled: false,
        reason: 'unfilled-entry',
        permittedActionKinds: ['full-exit'],
      }),
    ).toMatchObject({ ok: false });
  });
});
