import { createHash, generateKeyPairSync, sign } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { publicationCandidateRegistry } from '../src/scenarios/publication/candidates.js';
import {
  reviewAttestationSigningBytes,
  verifyProductionReviewAttestations,
  verifyReviewAttestationsForTesting,
} from '../src/scenarios/publication/attestation-node.js';
import { buildReviewPacket } from '../src/scenarios/publication/review-packet.js';
import {
  PUBLICATION_REVIEW_SCOPES,
  REVIEW_ATTESTATION_CONTRACT_VERSION,
  REVIEW_ATTESTATION_POLICY_VERSION,
  type PublicationReviewScope,
  type ReviewAttestationPayloadV1,
  type SignedReviewAttestationV1,
  type TrustedReviewerRegistryV1,
} from '../src/scenarios/publication/types.js';

const AS_OF = '2032-01-01T00:00:00.000Z';
const candidate = publicationCandidateRegistry[0]!;
const packet = buildReviewPacket(candidate);

function fixture() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const der = publicKey.export({ format: 'der', type: 'spki' });
  const registry: TrustedReviewerRegistryV1 = {
    schemaVersion: 1,
    environment: 'test',
    policyVersion: REVIEW_ATTESTATION_POLICY_VERSION,
    reviewers: [
      {
        reviewerId: 'test-reviewer',
        reviewerKind: 'test-fixture',
        status: 'active',
        allowedScopes: PUBLICATION_REVIEW_SCOPES,
        keys: [
          {
            keyId: 'test-key-01',
            algorithm: 'Ed25519',
            publicKeySpkiDerBase64: der.toString('base64'),
            publicKeyFingerprint: `sha256:${createHash('sha256').update(der).digest('hex')}`,
            validFrom: '2030-01-01T00:00:00.000Z',
            status: 'active',
          },
        ],
      },
    ],
  };
  const payload = (
    scope: PublicationReviewScope,
    overrides: Partial<ReviewAttestationPayloadV1> = {},
  ): ReviewAttestationPayloadV1 => ({
    schemaVersion: 1,
    contractVersion: REVIEW_ATTESTATION_CONTRACT_VERSION,
    attestationId: `test-attestation-${scope}`,
    reviewerId: 'test-reviewer',
    keyId: 'test-key-01',
    scope,
    candidateId: candidate.candidateId,
    scenario: candidate.scenario,
    dataset: candidate.dataset,
    materialSetChecksum: candidate.materialSetChecksum,
    reviewPacketChecksum: packet.reviewPacketChecksum,
    decision: 'approved',
    reviewedAt: '2031-01-01T00:00:00.000Z',
    policyVersion: REVIEW_ATTESTATION_POLICY_VERSION,
    note: 'Test-only review fixture; not a human approval.',
    ...overrides,
  });
  const signed = (value: ReviewAttestationPayloadV1): SignedReviewAttestationV1 => ({
    payload: value,
    signature: {
      algorithm: 'Ed25519',
      valueBase64: sign(null, reviewAttestationSigningBytes(value), privateKey).toString('base64'),
    },
  });
  return { registry, payload, signed };
}

describe('detached Ed25519 review attestations', () => {
  it('verifies all eight exact scopes with ephemeral test-only keys', () => {
    const { registry, payload, signed } = fixture();
    const attestations = PUBLICATION_REVIEW_SCOPES.map((scope) => signed(payload(scope)));
    const report = verifyReviewAttestationsForTesting({
      candidate,
      packet,
      attestations,
      registry,
      asOf: AS_OF,
    });
    expect(report.complete).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.scopes).toHaveLength(8);
    expect(report.scopes.every((scope) => scope.decision === 'approved')).toBe(true);
    expect(JSON.stringify({ attestations, registry })).not.toMatch(/PRIVATE KEY|privateKey/u);
  });

  it('rejects test registries in the production path and keeps the real empty registry incomplete', () => {
    const { registry } = fixture();
    expect(() =>
      verifyProductionReviewAttestations({
        candidate,
        packet,
        attestations: [],
        registry,
        asOf: AS_OF,
      }),
    ).toThrow(/production verification rejects test/u);
    const production: TrustedReviewerRegistryV1 = {
      schemaVersion: 1,
      environment: 'production',
      policyVersion: REVIEW_ATTESTATION_POLICY_VERSION,
      reviewers: [],
    };
    const report = verifyProductionReviewAttestations({
      candidate,
      packet,
      attestations: [],
      registry: production,
      asOf: AS_OF,
    });
    expect(report.complete).toBe(false);
    expect(report.records).toEqual([]);
    expect(report.scopes.every((scope) => scope.decision === 'missing')).toBe(true);
  });

  it('fails wrong keys, unknown or revoked reviewers, wrong scopes, and noncanonical time', () => {
    const { registry, payload, signed } = fixture();
    const wrongSignature = signed(payload('source'));
    Object.assign(wrongSignature.signature, {
      valueBase64: Buffer.alloc(64, 7).toString('base64'),
    });
    const unknown = signed(
      payload('rubric', {
        attestationId: 'test-attestation-unknown',
        reviewerId: 'unknown-reviewer',
      }),
    );
    const wrongScopeRegistry = structuredClone(registry);
    Object.assign(wrongScopeRegistry.reviewers[0]!, { allowedScopes: ['source'] });
    const wrongScope = signed(payload('execution'));
    const wrongScopeReport = verifyReviewAttestationsForTesting({
      candidate,
      packet,
      attestations: [wrongScope],
      registry: wrongScopeRegistry,
      asOf: AS_OF,
    });
    expect(wrongScopeReport.records[0]).toMatchObject({ status: 'invalid' });
    expect(wrongScopeReport.records[0]!.issues).toContain('reviewer is not trusted for this scope');
    const revoked = structuredClone(registry);
    Object.assign(revoked.reviewers[0]!, { status: 'revoked' });
    const revokedReport = verifyReviewAttestationsForTesting({
      candidate,
      packet,
      attestations: [signed(payload('accessibility'))],
      registry: revoked,
      asOf: AS_OF,
    });
    expect(revokedReport.records[0]!.issues).toContain('reviewer is revoked');
    const revokedKey = structuredClone(registry);
    Object.assign(revokedKey.reviewers[0]!.keys[0]!, {
      status: 'revoked',
      revokedAt: '2031-06-01T00:00:00.000Z',
    });
    const revokedKeyReport = verifyReviewAttestationsForTesting({
      candidate,
      packet,
      attestations: [signed(payload('financial-safety'))],
      registry: revokedKey,
      asOf: AS_OF,
    });
    expect(revokedKeyReport.records[0]!.issues).toContain('reviewer key is revoked');
    const unknownKey = signed(
      payload('licensing', {
        attestationId: 'test-attestation-unknown-key',
        keyId: 'unknown-key',
      }),
    );
    const report = verifyReviewAttestationsForTesting({
      candidate,
      packet,
      attestations: [wrongSignature, unknown, unknownKey],
      registry,
      asOf: AS_OF,
    });
    expect(report.records.every((record) => record.status === 'invalid')).toBe(true);
    expect(report.issues.join('\n')).toMatch(/signature verification failed|unknown reviewer/u);
    const looseTime = signed(payload('hebrew', { reviewedAt: '2031-01-01T00:00:00Z' }));
    expect(
      verifyReviewAttestationsForTesting({
        candidate,
        packet,
        attestations: [looseTime],
        registry,
        asOf: AS_OF,
      }).records[0],
    ).toMatchObject({ status: 'invalid' });
  });

  it('marks wrong identity, material, packet, expiry, and future review times stale', () => {
    const { registry, payload, signed } = fixture();
    const records = [
      signed(payload('source', { candidateId: 'publication-candidate-wrong' })),
      signed(payload('rubric', { scenario: { ...candidate.scenario, scenarioVersion: '9.9.9' } })),
      signed(payload('execution', { materialSetChecksum: `sha256:${'a'.repeat(64)}` })),
      signed(payload('accessibility', { reviewPacketChecksum: `sha256:${'b'.repeat(64)}` })),
      signed(payload('hebrew', { expiresAt: '2031-06-01T00:00:00.000Z' })),
      signed(
        payload('financial-safety', {
          reviewedAt: '2033-01-01T00:00:00.000Z',
          attestationId: 'test-attestation-from-the-future',
        }),
      ),
    ];
    const report = verifyReviewAttestationsForTesting({
      candidate,
      packet,
      attestations: records,
      registry,
      asOf: AS_OF,
    });
    expect(report.records.every((record) => record.status === 'stale')).toBe(true);
    expect(report.issues.join('\n')).toMatch(
      /candidate ID changed|scenario identity changed|candidate material changed|review packet changed|expired|after the evaluation instant/u,
    );
  });

  it('deduplicates replay and applies deterministic changes-requested precedence', () => {
    const { registry, payload, signed } = fixture();
    const approval = signed(payload('publication'));
    const duplicate = structuredClone(approval);
    const change = signed(
      payload('publication', {
        attestationId: 'test-attestation-publication-change',
        decision: 'changes-requested',
        reviewedAt: '2031-01-02T00:00:00.000Z',
        supersedesAttestationId: approval.payload.attestationId,
      }),
    );
    const report = verifyReviewAttestationsForTesting({
      candidate,
      packet,
      attestations: [approval, duplicate, change],
      registry,
      asOf: AS_OF,
    });
    expect(report.records.map((record) => record.status)).toEqual(
      expect.arrayContaining(['valid', 'duplicate']),
    );
    expect(report.scopes.find((item) => item.scope === 'publication')).toMatchObject({
      decision: 'changes-requested',
      attestationId: 'test-attestation-publication-change',
    });
    expect(report.complete).toBe(false);
  });

  it('rejects conflicting reuse of an attestation ID and cross-scope supersession', () => {
    const { registry, payload, signed } = fixture();
    const first = signed(payload('source'));
    const conflicting = signed(
      payload('source', {
        note: 'Different signed test-only material under the same ID.',
        decision: 'changes-requested',
      }),
    );
    const crossScope = signed(
      payload('rubric', {
        attestationId: 'test-attestation-cross-scope',
        reviewedAt: '2031-01-02T00:00:00.000Z',
        supersedesAttestationId: first.payload.attestationId,
      }),
    );
    const report = verifyReviewAttestationsForTesting({
      candidate,
      packet,
      attestations: [first, conflicting, crossScope],
      registry,
      asOf: AS_OF,
    });
    expect(
      report.records.filter((record) => record.attestationId === first.payload.attestationId),
    ).toSatisfy((records: typeof report.records) =>
      records.every((record) => record.status === 'invalid'),
    );
    expect(
      report.records.find((record) => record.attestationId === 'test-attestation-cross-scope'),
    ).toMatchObject({
      status: 'invalid',
    });
  });
});
