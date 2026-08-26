import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { findRepositoryRoot } from '../src/scenarios/publication/node-io.js';
import {
  REVIEWER_GOVERNANCE_POLICY_VERSION,
  REVIEWER_ONBOARDING_PROPOSAL_CONTRACT_VERSION,
  REVIEWER_REVOCATION_PROPOSAL_CONTRACT_VERSION,
  parseReviewerOnboardingProposal,
  reviewerOnboardingProofBytes,
  type ReviewerEvidenceReferenceV1,
  type ReviewerOnboardingProposalV1,
  type ReviewerRevocationProposalV1,
} from '../src/scenarios/publication/reviewer-governance.js';
import {
  buildReviewerGovernanceStatusMatrix,
  listReviewerAuthorizationRequirements,
  validateReviewerOnboardingProposal,
  validateReviewerRevocationProposal,
  verifyReviewerPublicKeyFingerprint,
} from '../src/scenarios/publication/reviewer-governance-node.js';
import { runReviewerGovernanceCommand } from '../src/scenarios/publication/reviewer-governance-cli.js';
import { generateReviewerKeyMaterial } from '../src/scenarios/publication/reviewer-keygen-node.js';
import { PRODUCTION_TRUSTED_REVIEWER_REGISTRY } from '../src/scenarios/publication/trusted-reviewers.js';
import {
  PUBLICATION_REVIEW_SCOPES,
  REVIEW_ATTESTATION_POLICY_VERSION,
  type PublicationReviewScope,
  type TrustedReviewerRegistryV1,
} from '../src/scenarios/publication/types.js';

const AS_OF = '2032-01-01T00:00:00.000Z';

function evidence(id: string): ReviewerEvidenceReferenceV1 {
  return {
    evidenceId: `evidence-${id}`,
    recordId: `external-record-${id}`,
    checksum: `sha256:${createHash('sha256').update(id).digest('hex')}`,
    note: `External evidence record ${id}; no raw identity document is embedded.`,
  };
}

function proposalFixture(scopes: readonly PublicationReviewScope[] = ['source', 'rubric']) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const der = publicKey.export({ format: 'der', type: 'spki' });
  const material = {
    schemaVersion: 1,
    contractVersion: REVIEWER_ONBOARDING_PROPOSAL_CONTRACT_VERSION,
    policyVersion: REVIEWER_GOVERNANCE_POLICY_VERSION,
    proposalId: 'reviewer-proposal-external-one',
    reviewerId: 'external-reviewer-one',
    reviewerKind: 'external-human',
    requestedScopes: scopes,
    publicKey: {
      keyId: 'external-reviewer-one-key-01',
      algorithm: 'Ed25519',
      publicKeySpkiDerBase64: der.toString('base64'),
      publicKeyFingerprint: `sha256:${createHash('sha256').update(der).digest('hex')}`,
      validFrom: '2030-01-01T00:00:00.000Z',
    },
    identityEvidence: [evidence('identity')],
    independenceEvidence: [evidence('independence')],
    scopeAuthorizationEvidence: scopes.map((scope) => ({
      scope,
      qualificationEvidence: [evidence(`${scope}-qualification`)],
      authorizationEvidence: [evidence(`${scope}-authorization`)],
    })),
    submittedAt: '2031-01-01T00:00:00.000Z',
    note: 'External human proposal awaiting independent repository review.',
  } as const;
  const unsigned: ReviewerOnboardingProposalV1 = {
    ...material,
    possessionProof: {
      algorithm: 'Ed25519',
      valueBase64: Buffer.alloc(64).toString('base64'),
    },
  };
  const proposal: ReviewerOnboardingProposalV1 = {
    ...material,
    possessionProof: {
      algorithm: 'Ed25519',
      valueBase64: sign(null, reviewerOnboardingProofBytes(unsigned), privateKey).toString(
        'base64',
      ),
    },
  };
  return { proposal, publicKey, privateKey };
}

function productionRegistry(input: {
  readonly proposal: ReviewerOnboardingProposalV1;
  readonly allowedScopes?: readonly PublicationReviewScope[];
  readonly status?: 'active' | 'revoked';
}): TrustedReviewerRegistryV1 {
  return {
    schemaVersion: 1,
    environment: 'production',
    policyVersion: REVIEW_ATTESTATION_POLICY_VERSION,
    reviewers: [
      {
        reviewerId: input.proposal.reviewerId,
        reviewerKind: 'external-human',
        status: input.status ?? 'active',
        allowedScopes: input.allowedScopes ?? input.proposal.requestedScopes,
        keys: [
          {
            ...input.proposal.publicKey,
            status: 'active',
          },
        ],
      },
    ],
  };
}

function revocationFixture(proposal: ReviewerOnboardingProposalV1): ReviewerRevocationProposalV1 {
  return {
    schemaVersion: 1,
    contractVersion: REVIEWER_REVOCATION_PROPOSAL_CONTRACT_VERSION,
    policyVersion: REVIEWER_GOVERNANCE_POLICY_VERSION,
    proposalId: 'revocation-proposal-external-one',
    target: {
      reviewerId: proposal.reviewerId,
      keyId: proposal.publicKey.keyId,
    },
    requestedBy: 'repository-security-owner',
    proposedAt: '2031-06-01T00:00:00.000Z',
    effectiveAt: '2031-06-01T00:00:00.000Z',
    reasonCode: 'authorization-withdrawn',
    reason: 'Authorization withdrawal requires independent human repository review.',
    incidentEvidence: [evidence('revocation-incident')],
    authorizationEvidence: [evidence('revocation-authorization')],
  };
}

describe('external reviewer governance proposals', () => {
  it('validates canonical Ed25519 possession and complete scope evidence without granting trust', () => {
    const { proposal } = proposalFixture();
    const report = validateReviewerOnboardingProposal({
      proposal,
      registry: PRODUCTION_TRUSTED_REVIEWER_REGISTRY,
      asOf: AS_OF,
    });
    expect(report).toMatchObject({
      status: 'proof-verified-human-review-required',
      structurallyValid: true,
      canonicalPublicKey: true,
      fingerprintValid: true,
      possessionProofValid: true,
      readyForHumanReview: true,
      trustGranted: false,
      missingEvidence: [],
      registryConflicts: [],
      issues: [],
    });
    expect(report.requiredEvidence).toEqual([
      'identity',
      'independence',
      'scope:source:qualification',
      'scope:source:authorization',
      'scope:rubric:qualification',
      'scope:rubric:authorization',
    ]);
  });

  it('fails altered proofs and reports missing authorization evidence deterministically', () => {
    const { proposal, privateKey } = proposalFixture();
    const incompleteMaterial = {
      ...proposal,
      identityEvidence: [],
      scopeAuthorizationEvidence: proposal.scopeAuthorizationEvidence.map((item, index) =>
        index === 0 ? { ...item, authorizationEvidence: [] } : item,
      ),
    };
    const incomplete: ReviewerOnboardingProposalV1 = {
      ...incompleteMaterial,
      possessionProof: {
        algorithm: 'Ed25519',
        valueBase64: sign(
          null,
          reviewerOnboardingProofBytes(incompleteMaterial),
          privateKey,
        ).toString('base64'),
      },
    };
    const incompleteReport = validateReviewerOnboardingProposal({
      proposal: incomplete,
      registry: PRODUCTION_TRUSTED_REVIEWER_REGISTRY,
      asOf: AS_OF,
    });
    expect(incompleteReport.status).toBe('incomplete');
    expect(incompleteReport.possessionProofValid).toBe(true);
    expect(incompleteReport.missingEvidence).toEqual(['identity', 'scope:source:authorization']);

    const invalidProof = {
      ...incomplete,
      possessionProof: {
        ...incomplete.possessionProof,
        valueBase64: Buffer.alloc(64, 7).toString('base64'),
      },
    };
    expect(
      validateReviewerOnboardingProposal({
        proposal: invalidProof,
        registry: PRODUCTION_TRUSTED_REVIEWER_REGISTRY,
        asOf: AS_OF,
      }).status,
    ).toBe('invalid');
  });

  it('strictly rejects unknown fields, noncanonical scope order, fingerprints, and key conflicts', () => {
    const { proposal } = proposalFixture();
    expect(verifyReviewerPublicKeyFingerprint(proposal.publicKey)).toMatchObject({
      canonicalPublicKey: true,
      declaredFingerprint: proposal.publicKey.publicKeyFingerprint,
      computedFingerprint: proposal.publicKey.publicKeyFingerprint,
      fingerprintMatches: true,
      valid: true,
      trustGranted: false,
      issues: [],
    });
    expect(parseReviewerOnboardingProposal({ ...proposal, trusted: true })).toMatchObject({
      ok: false,
    });
    const reordered = { ...proposal, requestedScopes: ['rubric', 'source'] };
    expect(parseReviewerOnboardingProposal(reordered)).toMatchObject({ ok: false });
    const wrongFingerprint = {
      ...proposal,
      publicKey: { ...proposal.publicKey, publicKeyFingerprint: `sha256:${'a'.repeat(64)}` },
    };
    expect(
      validateReviewerOnboardingProposal({
        proposal: wrongFingerprint,
        registry: PRODUCTION_TRUSTED_REVIEWER_REGISTRY,
        asOf: AS_OF,
      }),
    ).toMatchObject({ status: 'invalid', fingerprintValid: false, trustGranted: false });
    expect(verifyReviewerPublicKeyFingerprint(wrongFingerprint.publicKey)).toMatchObject({
      fingerprintMatches: false,
      valid: false,
      trustGranted: false,
      issues: ['public key fingerprint mismatch'],
    });
    const registry = productionRegistry({ proposal });
    expect(validateReviewerOnboardingProposal({ proposal, registry, asOf: AS_OF })).toMatchObject({
      status: 'already-registered',
      trustGranted: false,
    });
    const conflicting = {
      ...proposal,
      publicKey: { ...proposal.publicKey, keyId: 'different-key-id' },
    };
    expect(
      validateReviewerOnboardingProposal({ proposal: conflicting, registry, asOf: AS_OF }),
    ).toMatchObject({ status: 'conflicts-with-registry', trustGranted: false });
  });

  it('validates revocation proposals as non-mutating requests and fails missing targets/evidence', () => {
    const { proposal } = proposalFixture();
    const registry = productionRegistry({ proposal });
    const revocation = revocationFixture(proposal);
    expect(
      validateReviewerRevocationProposal({ proposal: revocation, registry, asOf: AS_OF }),
    ).toMatchObject({
      status: 'human-review-required',
      readyForHumanReview: true,
      trustChanged: false,
      missingEvidence: [],
    });
    const incomplete = { ...revocation, authorizationEvidence: [] };
    expect(
      validateReviewerRevocationProposal({ proposal: incomplete, registry, asOf: AS_OF }),
    ).toMatchObject({ status: 'incomplete', missingEvidence: ['authorization'] });
    const missing = { ...revocation, target: { ...revocation.target, keyId: 'unknown-key-id' } };
    expect(
      validateReviewerRevocationProposal({ proposal: missing, registry, asOf: AS_OF }),
    ).toMatchObject({ status: 'target-missing', trustChanged: false });
  });

  it('builds deterministic required, missing, reviewer, proposal, and revocation status matrices', () => {
    const { proposal } = proposalFixture(['source']);
    const empty = buildReviewerGovernanceStatusMatrix({
      registry: PRODUCTION_TRUSTED_REVIEWER_REGISTRY,
      onboardingProposals: [proposal],
      revocationProposals: [],
      asOf: AS_OF,
    });
    expect(empty.requiredScopes).toEqual(PUBLICATION_REVIEW_SCOPES);
    expect(empty.missingScopes).toEqual(PUBLICATION_REVIEW_SCOPES);
    expect(empty.scopes.find((item) => item.scope === 'source')).toMatchObject({
      status: 'proposal-only-human-review-required',
      proposalIds: [proposal.proposalId],
      registeredReviewerIds: [],
    });
    expect(empty.scopes.find((item) => item.scope === 'rubric')).toMatchObject({
      status: 'missing',
    });
    const registry = productionRegistry({ proposal, allowedScopes: ['source'] });
    const revocation = revocationFixture(proposal);
    const left = buildReviewerGovernanceStatusMatrix({
      registry,
      onboardingProposals: [proposal],
      revocationProposals: [revocation],
      asOf: AS_OF,
    });
    const right = buildReviewerGovernanceStatusMatrix({
      registry,
      onboardingProposals: [...[proposal]].reverse(),
      revocationProposals: [...[revocation]].reverse(),
      asOf: AS_OF,
    });
    expect(left).toEqual(right);
    expect(left.scopes.find((item) => item.scope === 'source')).toMatchObject({
      status: 'revocation-pending',
      registeredReviewerIds: [proposal.reviewerId],
      revocationProposalIds: [revocation.proposalId],
    });
    expect(left.missingScopes).toContain('source');
    expect(listReviewerAuthorizationRequirements(['source'])).toEqual([
      { requirement: 'identity' },
      { requirement: 'independence' },
      { scope: 'source', requirement: 'qualification' },
      { scope: 'source', requirement: 'authorization' },
    ]);
  });

  it('provides deterministic non-mutating CLI preparation, creation, validation, requirements, and status actions', async () => {
    const { proposal } = proposalFixture(['source']);
    const { possessionProof, ...material } = proposal;
    const revocation = revocationFixture(proposal);
    const documents = new Map<string, unknown>([
      ['material.json', material],
      ['proof.json', possessionProof],
      ['public-key.json', proposal.publicKey],
      ['proposal.json', proposal],
      ['revocation.json', revocation],
    ]);
    const readers = {
      readJson: async (path: string) => documents.get(path),
      readDirectory: async (path: string) =>
        path === 'onboarding' ? [proposal] : path === 'revocations' ? [revocation] : [],
    };
    const requirements = await runReviewerGovernanceCommand(['--action', 'requirements'], readers);
    expect(requirements).toMatchObject({
      trustGranted: false,
      requiredScopes: PUBLICATION_REVIEW_SCOPES,
    });
    const prepared = await runReviewerGovernanceCommand(
      ['--action', 'prepare-onboarding', '--material', 'material.json'],
      readers,
    );
    expect(prepared).toMatchObject({
      created: false,
      status: 'unsigned-possession-proof-required',
      trustGranted: false,
      proposalMaterial: material,
    });
    expect((prepared as { signingBytesBase64: string }).signingBytesBase64).toBe(
      Buffer.from(reviewerOnboardingProofBytes(proposal)).toString('base64'),
    );
    const fingerprintFromKey = await runReviewerGovernanceCommand(
      ['--action', 'verify-fingerprint', '--public-key', 'public-key.json'],
      readers,
    );
    const fingerprintFromProposal = await runReviewerGovernanceCommand(
      ['--action', 'verify-fingerprint', '--proposal', 'proposal.json'],
      readers,
    );
    expect(fingerprintFromKey).toMatchObject({
      source: 'public-key-material',
      fingerprint: {
        computedFingerprint: proposal.publicKey.publicKeyFingerprint,
        fingerprintMatches: true,
        valid: true,
        trustGranted: false,
      },
    });
    expect(fingerprintFromProposal).toMatchObject({
      source: 'onboarding-proposal',
      proposalId: proposal.proposalId,
      fingerprint: {
        computedFingerprint: proposal.publicKey.publicKeyFingerprint,
        fingerprintMatches: true,
        valid: true,
        trustGranted: false,
      },
    });
    expect(
      await runReviewerGovernanceCommand(
        ['--action', 'verify-fingerprint', '--proposal', 'proposal.json'],
        readers,
      ),
    ).toEqual(fingerprintFromProposal);
    const created = await runReviewerGovernanceCommand(
      [
        '--action',
        'create-onboarding',
        '--material',
        'material.json',
        '--proof',
        'proof.json',
        '--as-of',
        AS_OF,
      ],
      readers,
    );
    expect(created).toMatchObject({
      created: true,
      trustGranted: false,
      validation: {
        status: 'proof-verified-human-review-required',
        trustGranted: false,
      },
    });
    expect(
      await runReviewerGovernanceCommand(
        ['--action', 'validate-onboarding', '--proposal', 'proposal.json', '--as-of', AS_OF],
        readers,
      ),
    ).toMatchObject({ status: 'proof-verified-human-review-required', trustGranted: false });
    expect(
      await runReviewerGovernanceCommand(
        ['--action', 'validate-revocation', '--proposal', 'revocation.json', '--as-of', AS_OF],
        readers,
      ),
    ).toMatchObject({ status: 'target-missing', trustChanged: false });
    const statusArguments = [
      '--action',
      'status',
      '--as-of',
      AS_OF,
      '--onboarding-dir',
      'onboarding',
      '--revocation-dir',
      'revocations',
    ];
    const left = await runReviewerGovernanceCommand(statusArguments, readers);
    const right = await runReviewerGovernanceCommand(statusArguments, readers);
    expect(left).toEqual(right);
    expect(left).toMatchObject({
      requiredScopes: PUBLICATION_REVIEW_SCOPES,
      missingScopes: PUBLICATION_REVIEW_SCOPES,
    });
    await expect(
      runReviewerGovernanceCommand(['--action', 'status', '--registry', 'untrusted.json'], readers),
    ).rejects.toThrow(/Unknown argument: --registry/u);
  });
});

describe('reviewer key generation safety', () => {
  it('writes a new PKCS8 private key outside the repository with mode 0600 and returns public data only', async () => {
    const repositoryRoot = await findRepositoryRoot();
    const directory = await mkdtemp(join(tmpdir(), 'chartpath-reviewer-key-'));
    const output = join(directory, 'reviewer-private-key.pem');
    try {
      const generated = await generateReviewerKeyMaterial({
        repositoryRoot,
        privateKeyOutputPath: output,
      });
      expect(generated).toMatchObject({
        algorithm: 'Ed25519',
        privateKeyOutputPath: await realpath(output),
        privateKeyFormat: 'PKCS8-PEM',
        privateKeyPermissions: '0600',
      });
      expect(generated.publicKeyFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(JSON.stringify(generated)).not.toMatch(/BEGIN PRIVATE KEY|privateKeyPem/u);
      expect(await readFile(output, 'utf8')).toMatch(/^-----BEGIN PRIVATE KEY-----/u);
      expect((await stat(output)).mode & 0o777).toBe(0o600);
      await expect(
        generateReviewerKeyMaterial({ repositoryRoot, privateKeyOutputPath: output }),
      ).rejects.toThrow(/already exists/u);
      await expect(
        generateReviewerKeyMaterial({
          repositoryRoot,
          privateKeyOutputPath: 'relative-private-key.pem',
        }),
      ).rejects.toThrow(/must be absolute/u);
      await expect(
        generateReviewerKeyMaterial({
          repositoryRoot,
          privateKeyOutputPath: join(repositoryRoot, 'private-key.pem'),
        }),
      ).rejects.toThrow(/outside the repository/u);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
