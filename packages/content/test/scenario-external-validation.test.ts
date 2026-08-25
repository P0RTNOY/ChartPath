import { canonicalSerialize } from '@chartpath/historical-data';
import { describe, expect, it } from 'vitest';

import { compileScenario } from '../src/scenarios/compiler.js';
import * as publicScenarioApi from '../src/scenarios/index.js';
import {
  SCENARIO_INPUT_LIMITS,
  compileScenarioSafely,
  computeScenarioMaterialChecksum,
  computeScenarioReviewRecordChecksum,
  parseScenarioAuthoringManifest,
  preflightScenarioAuthoringInput,
  scenarioAuthoringManifests,
  type ScenarioAuthoringManifestV1,
  type ScenarioReviewRecordV1,
} from '../src/scenarios/index.js';

function externalClone(index = 0): ScenarioAuthoringManifestV1 {
  return JSON.parse(
    canonicalSerialize(scenarioAuthoringManifests[index]),
  ) as ScenarioAuthoringManifestV1;
}

describe('external scenario authoring validation', () => {
  it('parses every serialized candidate into a distinct deeply frozen trusted value', () => {
    for (const manifest of scenarioAuthoringManifests) {
      const input = JSON.parse(canonicalSerialize(manifest)) as unknown;
      const parsed = parseScenarioAuthoringManifest(input);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;
      expect(parsed.value).not.toBe(input);
      expect(canonicalSerialize(parsed.value)).toBe(canonicalSerialize(manifest));
      expect(Object.isFrozen(parsed.value)).toBe(true);
      expect(Object.isFrozen(parsed.value.source)).toBe(true);
      expect(Object.isFrozen(parsed.value.processRubric.criteria)).toBe(true);
      expect(Object.isFrozen(parsed.value.expectedExecution?.expectedSnapshot.events)).toBe(true);
    }
  });

  it('rejects unknown fields, deep type mismatches, non-finite values, and invalid unions', () => {
    const cases: readonly [string, (manifest: ScenarioAuthoringManifestV1) => void][] = [
      ['$.unexpected', (manifest) => Object.assign(manifest, { unexpected: true })],
      ['$.source.unexpected', (manifest) => Object.assign(manifest.source, { unexpected: true })],
      ['$.source.pageStart', (manifest) => Object.assign(manifest.source, { pageStart: '72' })],
      [
        '$.processRubric.criteria',
        (manifest) => Object.assign(manifest.processRubric, { criteria: 'not-an-array' }),
      ],
      [
        '$.chartSpec.basePrice',
        (manifest) => Object.assign(manifest.chartSpec, { basePrice: Infinity }),
      ],
      [
        '$.chartSpec.candleCount',
        (manifest) => Object.assign(manifest.chartSpec, { candleCount: 501 }),
      ],
      [
        '$.chartSpec.seed',
        (manifest) => Object.assign(manifest.chartSpec, { seed: Number.MAX_SAFE_INTEGER + 1 }),
      ],
      [
        '$.decisionCandleIndex',
        (manifest) => Object.assign(manifest, { decisionCandleIndex: 63.5 }),
      ],
      [
        '$.expectedExecution.plan.quantity',
        (manifest) => Object.assign(manifest.expectedExecution!.plan, { quantity: 0 }),
      ],
      ['$.scenarioVersion', (manifest) => Object.assign(manifest, { scenarioVersion: '01.0.0' })],
      [
        '$.chartSpecChecksum',
        (manifest) => Object.assign(manifest, { chartSpecChecksum: 'sha256:not-a-checksum' }),
      ],
      [
        '$.application.direction',
        (manifest) => Object.assign(manifest.application, { direction: 'sideways' }),
      ],
      [
        '$.expectedExecution.expectedSnapshot.events',
        (manifest) =>
          Object.assign(manifest.expectedExecution!.expectedSnapshot, { events: { length: 1 } }),
      ],
      [
        '$.publication.records[0].scope',
        (manifest) =>
          Object.assign(manifest.publication, {
            records: [
              {
                reviewerRecordId: 'invalid-review',
                reviewedAt: '2026-01-01T00:00:00.000Z',
                decision: 'approved',
                materialArtifactChecksum: manifest.materialArtifactChecksum,
                scope: 5,
                note: 'invalid scope',
              },
            ],
          }),
      ],
    ];

    for (const [path, mutate] of cases) {
      const manifest = externalClone();
      mutate(manifest);
      const left = parseScenarioAuthoringManifest(manifest);
      const right = parseScenarioAuthoringManifest(manifest);
      expect(left.ok, path).toBe(false);
      expect(right).toEqual(left);
      if (!left.ok) expect(left.issues.join('\n'), path).toContain(path);
      expect(compileScenarioSafely(manifest).ok, path).toBe(false);
    }
  });

  it('rejects prototype-sensitive keys, custom prototypes, accessors, cycles, and shared references', () => {
    const prototypeKey = externalClone();
    Object.defineProperty(prototypeKey.chartSpec.parameters!, '__proto__', {
      configurable: true,
      enumerable: true,
      value: { polluted: true },
      writable: true,
    });
    expect(parseScenarioAuthoringManifest(prototypeKey)).toEqual({
      ok: false,
      issues: ['$.chartSpec.parameters.__proto__ is a prototype-sensitive property'],
    });
    expect(Object.prototype).not.toHaveProperty('polluted');

    const accessor = externalClone();
    Object.defineProperty(accessor.source, 'chapter', {
      configurable: true,
      enumerable: true,
      get: () => '19',
    });
    expect(parseScenarioAuthoringManifest(accessor)).toEqual({
      ok: false,
      issues: ['$.source.chapter must not be an accessor'],
    });

    const customPrototype = Object.create({ inherited: true }) as Record<string, unknown>;
    customPrototype.schemaVersion = 1;
    expect(preflightScenarioAuthoringInput(customPrototype)).toEqual({
      ok: false,
      issues: ['$ must use the ordinary JSON object prototype'],
    });

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(preflightScenarioAuthoringInput(circular)).toEqual({
      ok: false,
      issues: ['$.self contains a circular reference'],
    });

    const sharedChild = { value: 1 };
    expect(preflightScenarioAuthoringInput({ left: sharedChild, right: sharedChild })).toEqual({
      ok: false,
      issues: ['$.right shares an object reference with $.left'],
    });
  });

  it('rejects sparse/custom arrays and bounded-size violations before schema compilation', () => {
    expect(parseScenarioAuthoringManifest('{')).toEqual({
      ok: false,
      issues: ['$ must contain valid JSON'],
    });
    expect(parseScenarioAuthoringManifest(' '.repeat(SCENARIO_INPUT_LIMITS.maxBytes + 1))).toEqual({
      ok: false,
      issues: ['$ exceeds the maximum serialized manifest size'],
    });

    const sparse = externalClone();
    const sparseHints = new Array<string>(2);
    sparseHints[1] = 'רמז';
    Object.assign(sparse, { hintsHe: sparseHints });
    expect(parseScenarioAuthoringManifest(sparse)).toEqual({
      ok: false,
      issues: ['$.hintsHe[0] is a sparse array element'],
    });

    const custom = externalClone();
    const customHints = ['רמז'];
    Object.defineProperty(customHints, 'metadata', { enumerable: true, value: true });
    Object.assign(custom, { hintsHe: customHints });
    expect(parseScenarioAuthoringManifest(custom)).toEqual({
      ok: false,
      issues: ['$.hintsHe.metadata is a custom array property'],
    });

    const longString = externalClone();
    Object.assign(longString, { promptHe: 'א'.repeat(SCENARIO_INPUT_LIMITS.maxStringBytes + 1) });
    const longStringResult = parseScenarioAuthoringManifest(longString);
    expect(longStringResult.ok).toBe(false);
    if (!longStringResult.ok)
      expect(longStringResult.issues).toEqual(['$.promptHe exceeds the maximum string size']);

    const longArray = externalClone();
    Object.assign(longArray, {
      hintsHe: new Array(SCENARIO_INPUT_LIMITS.maxArrayLength + 1).fill('רמז'),
    });
    const longArrayResult = parseScenarioAuthoringManifest(longArray);
    expect(longArrayResult.ok).toBe(false);
    if (!longArrayResult.ok)
      expect(longArrayResult.issues).toEqual(['$.hintsHe exceeds the maximum array length']);

    let deep: Record<string, unknown> = {};
    const root = deep;
    for (let index = 0; index <= SCENARIO_INPUT_LIMITS.maxDepth; index += 1) {
      const next: Record<string, unknown> = {};
      deep.next = next;
      deep = next;
    }
    const deepResult = preflightScenarioAuthoringInput(root);
    expect(deepResult.ok).toBe(false);
    if (!deepResult.ok) expect(deepResult.issues[0]).toContain('maximum manifest nesting depth');
  });

  it('validates exact execution event/fill and terminal snapshot relationships', () => {
    const missingFill = externalClone();
    const fillEvent = missingFill.expectedExecution!.expectedSnapshot.events.find(
      (event) => event.type === 'order-filled',
    )!;
    delete (fillEvent as { fill?: unknown }).fill;
    const missingFillResult = parseScenarioAuthoringManifest(missingFill);
    expect(missingFillResult.ok).toBe(false);
    if (!missingFillResult.ok)
      expect(missingFillResult.issues.join('\n')).toContain('.fill: is required');

    const inventedFill = externalClone();
    Object.assign(inventedFill.expectedExecution!.expectedSnapshot.events[0]!, {
      fill: {
        referencePrice: 100,
        price: 100,
        commission: 0,
        gap: false,
        priceCappedByLimit: false,
      },
    });
    const inventedFillResult = parseScenarioAuthoringManifest(inventedFill);
    expect(inventedFillResult.ok).toBe(false);
    if (!inventedFillResult.ok)
      expect(inventedFillResult.issues.join('\n')).toContain('.fill: is forbidden');

    const terminalMismatch = externalClone();
    Object.assign(terminalMismatch.expectedExecution!, { expectedStatus: 'open' });
    const mismatchResult = parseScenarioAuthoringManifest(terminalMismatch);
    expect(mismatchResult.ok).toBe(false);
    if (!mismatchResult.ok)
      expect(mismatchResult.issues).toContain(
        '$.expectedExecution.expectedStatus: must match the expected snapshot terminal status',
      );
  });

  it('binds authority trust to the exact immutable review record and rejects duplicate IDs', () => {
    const manifest = externalClone();
    const record: ScenarioReviewRecordV1 = {
      reviewerRecordId: 'trusted-publication-review',
      reviewedAt: '2026-08-25T12:00:00.000Z',
      decision: 'approved',
      materialArtifactChecksum: manifest.materialArtifactChecksum,
      scope: 'publication',
      note: 'exact authority-reviewed record',
    };
    const trustedReviewRecordChecksums = new Map([
      [record.reviewerRecordId, computeScenarioReviewRecordChecksum(record)],
    ]);
    const forgedRecord = { ...record, note: 'forged content reusing a trusted ID' };
    Object.assign(manifest.publication, { records: [forgedRecord] });
    expect(
      compileScenario(manifest, { trustedReviewRecordChecksums }).publicationBlockers,
    ).toContain('unauthenticated publication reviewer record cannot grant approval');

    const duplicated = externalClone();
    Object.assign(duplicated.publication, { records: [record, { ...record }] });
    const parsed = parseScenarioAuthoringManifest(duplicated);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok)
      expect(parsed.issues).toContain(
        '$.publication.records: reviewerRecordId values must be globally unique',
      );
    expect(compileScenario(duplicated).structuralIssues).toContain(
      'human review record IDs must be globally unique',
    );
  });

  it('makes management-step rubric material stale without trusting lifecycle bookkeeping', () => {
    const manifest = externalClone();
    const record: ScenarioReviewRecordV1 = {
      reviewerRecordId: 'old-management-rubric-review',
      reviewedAt: '2026-08-25T12:00:00.000Z',
      decision: 'approved',
      materialArtifactChecksum: manifest.materialArtifactChecksum,
      scope: 'rubric',
      note: 'approval before management-step material changed',
    };
    Object.assign(manifest.publication, { records: [record] });
    const managementCriterion = manifest.processRubric.criteria.find(
      ({ workflowStepId }) => workflowStepId === 'management',
    )!;
    Object.assign(managementCriterion, { criterionHe: `${managementCriterion.criterionHe} שינוי` });
    const compiled = compileScenario(manifest);
    expect(compiled.structuralIssues).toContain('material artifact checksum mismatch');
    expect(compiled.publicationBlockers).toContain(
      'stale rubric review: material artifact changed after review',
    );

    const futureManagementMaterial = externalClone();
    Object.assign(futureManagementMaterial, {
      management: {
        schemaVersion: 1,
        enabled: false,
        policyVersion: 'position-management-policy-v1',
      },
    });
    expect(computeScenarioMaterialChecksum(futureManagementMaterial)).not.toBe(
      computeScenarioMaterialChecksum(externalClone()),
    );
  });

  it('exposes only the safe untrusted compiler through the package scenario barrel', () => {
    expect('compileScenarioSafely' in publicScenarioApi).toBe(true);
    expect('compileScenario' in publicScenarioApi).toBe(false);
    expect(compileScenarioSafely(canonicalSerialize(scenarioAuthoringManifests[0])).ok).toBe(true);
  });
});
