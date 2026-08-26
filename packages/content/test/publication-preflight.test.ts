import { describe, expect, it } from 'vitest';

import { publicationCandidateRegistry } from '../src/scenarios/publication/candidates.js';
import { verifyProductionReviewAttestations } from '../src/scenarios/publication/attestation-node.js';
import { runPublicationPreflight } from '../src/scenarios/publication/preflight.js';
import { buildReviewPacket } from '../src/scenarios/publication/review-packet.js';
import {
  PUBLICATION_REVIEW_SCOPES,
  type AttestationVerificationReportV1,
} from '../src/scenarios/publication/types.js';

const AS_OF = '2032-01-01T00:00:00.000Z';
const candidate = publicationCandidateRegistry[0]!;
const packet = buildReviewPacket(candidate);
const missingReviews = verifyProductionReviewAttestations({
  candidate,
  packet,
  attestations: [],
  asOf: AS_OF,
});

function preflight(overrides: Partial<Parameters<typeof runPublicationPreflight>[0]> = {}) {
  return runPublicationPreflight({
    candidateId: candidate.candidateId,
    scenarioId: candidate.scenario.scenarioId,
    scenarioVersion: candidate.scenario.scenarioVersion,
    datasetId: candidate.dataset.datasetId,
    datasetVersion: candidate.dataset.datasetVersion,
    datasetChecksum: candidate.dataset.datasetChecksum,
    asOf: AS_OF,
    packet,
    attestations: missingReviews,
    artifactVerification: { valid: true, issues: [] },
    evidence: {
      licensingAndRedistributionAuthorized: false,
      nativeLifecycleVerified: false,
      accessibilityMatrixVerified: false,
      sourceAndHebrewReviewed: false,
      executionAndRubricSnapshotsVerified: false,
    },
    ...overrides,
  });
}

describe('fail-closed dry-run publication preflight', () => {
  it('returns a deterministic no-side-effect NO-GO with exact human and licensing blockers', () => {
    const left = preflight();
    const right = preflight();
    expect(left).toEqual(right);
    expect(left).toMatchObject({
      mode: 'dry-run',
      eligible: false,
      status: 'PUBLICATION_NO_GO',
      sideEffects: [],
    });
    expect(left.summaryStatuses).toEqual([
      'MACHINE_GATES_CLOSED',
      'NATIVE_VERIFICATION_PARTIAL',
      'EXTERNAL_REVIEW_PENDING',
      'INTERNAL_REVIEW_BUILD_READY',
      'PUBLICATION_NO_GO',
    ]);
    expect(new Set(left.gates.map((gate) => gate.category))).toEqual(
      new Set([
        'machine',
        'native-runtime',
        'accessibility',
        'physical-device',
        'human-review',
        'licensing',
        'distribution',
      ]),
    );
    expect(left.blockers.map((blocker) => blocker.code)).toEqual(
      expect.arrayContaining([
        'REVIEW_SCOPE_MISSING',
        'LICENSING_EVIDENCE_MISSING',
        'LICENSING_MATERIAL_CHANGE_REQUIRED',
        'NATIVE_LIFECYCLE_EVIDENCE_MISSING',
        'ACCESSIBILITY_EVIDENCE_MISSING',
        'SOURCE_HEBREW_EVIDENCE_MISSING',
        'EXECUTION_RUBRIC_EVIDENCE_MISSING',
      ]),
    );
    expect(left.blockers.filter((blocker) => blocker.code === 'REVIEW_SCOPE_MISSING')).toHaveLength(
      8,
    );
  });

  it('rejects exact scenario and dataset mismatches and regenerated packet mutation', () => {
    expect(preflight({ scenarioVersion: '9.9.9' }).blockers).toContainEqual(
      expect.objectContaining({ code: 'SCENARIO_IDENTITY_MISMATCH' }),
    );
    expect(preflight({ datasetChecksum: `sha256:${'a'.repeat(64)}` }).blockers).toContainEqual(
      expect.objectContaining({ code: 'DATASET_IDENTITY_MISMATCH' }),
    );
    const changedPacket = structuredClone(packet);
    Object.assign(changedPacket.learnerMaterial, {
      promptHe: `${changedPacket.learnerMaterial.promptHe} שינוי`,
    });
    expect(preflight({ packet: changedPacket }).blockers).toContainEqual(
      expect.objectContaining({ code: 'REVIEW_PACKET_STALE' }),
    );
  });

  it('fails closed when source, evidence, or tracked packet artifact verification fails', () => {
    const report = preflight({
      artifactVerification: {
        valid: false,
        issues: [
          'source PDF checksum mismatch',
          'tracked packet is stale review-packets/example/review-packet.md',
        ],
      },
    });
    expect(
      report.blockers.filter((blocker) => blocker.code === 'PUBLICATION_ARTIFACT_INTEGRITY_FAILED'),
    ).toEqual([
      expect.objectContaining({
        category: 'machine',
        gateId: 'publication-artifact-integrity',
        detail:
          'source PDF checksum mismatch; tracked packet is stale review-packets/example/review-packet.md',
      }),
    ]);
  });

  it('remains fail-closed after synthetically complete review projections because rights material is internal', () => {
    const approved: AttestationVerificationReportV1 = {
      ...missingReviews,
      complete: true,
      scopes: PUBLICATION_REVIEW_SCOPES.map((scope) => ({
        scope,
        decision: 'approved',
        attestationId: `external-${scope}`,
      })),
      issues: [],
    };
    const report = preflight({
      attestations: approved,
      evidence: {
        licensingAndRedistributionAuthorized: true,
        nativeLifecycleVerified: true,
        accessibilityMatrixVerified: true,
        sourceAndHebrewReviewed: true,
        executionAndRubricSnapshotsVerified: true,
        androidRuntimeLifecycleVerified: true,
        voiceOverVerified: true,
        talkBackVerified: true,
        physicalIosVerified: true,
        physicalAndroidVerified: true,
        backupAndRecoveryVerified: true,
        distributionSigningVerified: true,
      },
    });
    expect(report.eligible).toBe(false);
    expect(report.blockers).toEqual([
      expect.objectContaining({ code: 'LICENSING_MATERIAL_CHANGE_REQUIRED' }),
    ]);
  });

  it('requires explicit canonical evaluation time', () => {
    expect(() => preflight({ asOf: '2032-01-01T00:00:00Z' })).toThrow(/explicit canonical UTC/u);
  });
});
