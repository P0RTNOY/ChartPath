import { createHash, createPublicKey, verify } from 'node:crypto';

import { canonicalSerialize } from '@chartpath/historical-data';

import { parseTrustedReviewerRegistry } from './attestation-node.js';
import {
  REVIEWER_GOVERNANCE_POLICY_VERSION,
  isCanonicalUtcTimestamp,
  missingReviewerAuthorizationEvidence,
  parseReviewerOnboardingProposal,
  parseReviewerPublicKeyMaterial,
  parseReviewerRevocationProposal,
  requiredReviewerAuthorizationEvidence,
  reviewerOnboardingProofBytes,
  reviewerRegistryChecksum,
  type ReviewerGovernanceStatusMatrixV1,
  type ReviewerOnboardingProposalV1,
  type ReviewerOnboardingValidationReportV1,
  type ReviewerPublicKeyFingerprintReportV1,
  type ReviewerRevocationValidationReportV1,
} from './reviewer-governance.js';
import {
  PUBLICATION_REVIEW_SCOPES,
  type PublicationReviewScope,
  type TrustedReviewerKeyV1,
  type TrustedReviewerRegistryV1,
} from './types.js';

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function assertAsOf(value: string): void {
  if (!isCanonicalUtcTimestamp(value))
    throw new TypeError('asOf must be an explicit canonical UTC RFC3339 timestamp.');
}

function validatedProductionRegistry(
  registry: TrustedReviewerRegistryV1,
): TrustedReviewerRegistryV1 {
  return parseTrustedReviewerRegistry(registry, 'production');
}

export function verifyReviewerPublicKeyFingerprint(
  input: unknown,
): ReviewerPublicKeyFingerprintReportV1 {
  const parsed = parseReviewerPublicKeyMaterial(input);
  if (!parsed.ok)
    return Object.freeze({
      schemaVersion: 1,
      keyId: parsed.id,
      algorithm: 'Ed25519',
      structurallyValid: false,
      canonicalPublicKey: false,
      fingerprintMatches: false,
      valid: false,
      trustGranted: false,
      issues: parsed.issues,
    });
  const material = parsed.value;
  const issues: string[] = [];
  let canonicalPublicKey = false;
  let computedFingerprint: `sha256:${string}` | undefined;
  try {
    const der = Buffer.from(material.publicKeySpkiDerBase64, 'base64');
    const publicKey = createPublicKey({ key: der, format: 'der', type: 'spki' });
    const canonicalDer = publicKey.export({ format: 'der', type: 'spki' });
    canonicalPublicKey = publicKey.asymmetricKeyType === 'ed25519' && canonicalDer.equals(der);
    if (!canonicalPublicKey) issues.push('public key must be one canonical Ed25519 SPKI DER value');
    computedFingerprint = `sha256:${createHash('sha256').update(der).digest('hex')}`;
  } catch {
    issues.push('public key is not valid canonical Ed25519 SPKI DER');
  }
  const fingerprintMatches = computedFingerprint === material.publicKeyFingerprint;
  if (!fingerprintMatches) issues.push('public key fingerprint mismatch');
  return Object.freeze({
    schemaVersion: 1,
    keyId: material.keyId,
    algorithm: 'Ed25519',
    structurallyValid: true,
    canonicalPublicKey,
    declaredFingerprint: material.publicKeyFingerprint,
    ...(computedFingerprint ? { computedFingerprint } : {}),
    fingerprintMatches,
    valid: canonicalPublicKey && fingerprintMatches,
    trustGranted: false,
    issues: sortedUnique(issues),
  });
}

function proposalPublicKeyValidation(proposal: ReviewerOnboardingProposalV1): {
  readonly canonical: boolean;
  readonly fingerprintValid: boolean;
  readonly proofValid: boolean;
  readonly issues: readonly string[];
} {
  const fingerprint = verifyReviewerPublicKeyFingerprint(proposal.publicKey);
  const issues = [...fingerprint.issues];
  let proofValid = false;
  try {
    const der = Buffer.from(proposal.publicKey.publicKeySpkiDerBase64, 'base64');
    const publicKey = createPublicKey({ key: der, format: 'der', type: 'spki' });
    if (fingerprint.canonicalPublicKey)
      proofValid = verify(
        null,
        reviewerOnboardingProofBytes(proposal),
        publicKey,
        Buffer.from(proposal.possessionProof.valueBase64, 'base64'),
      );
    if (!proofValid) issues.push('Ed25519 possession proof verification failed');
  } catch {
    issues.push('public key is not valid canonical Ed25519 SPKI DER');
  }
  return {
    canonical: fingerprint.canonicalPublicKey,
    fingerprintValid: fingerprint.fingerprintMatches,
    proofValid,
    issues: sortedUnique(issues),
  };
}

function registryConflicts(
  proposal: ReviewerOnboardingProposalV1,
  registry: TrustedReviewerRegistryV1,
): { readonly conflicts: readonly string[]; readonly alreadyRegistered: boolean } {
  const reviewer = registry.reviewers.find((item) => item.reviewerId === proposal.reviewerId);
  const keys = registry.reviewers.flatMap((item) =>
    item.keys.map((key) => ({ reviewerId: item.reviewerId, key })),
  );
  const sameKey = reviewer?.keys.find(
    (key) =>
      key.keyId === proposal.publicKey.keyId &&
      key.publicKeyFingerprint === proposal.publicKey.publicKeyFingerprint,
  );
  const alreadyRegistered =
    reviewer !== undefined &&
    sameKey !== undefined &&
    proposal.requestedScopes.every((scope) => reviewer.allowedScopes.includes(scope));
  if (alreadyRegistered) return { conflicts: [], alreadyRegistered: true };
  const conflicts: string[] = [];
  if (reviewer) conflicts.push(`reviewer ID is already registered: ${proposal.reviewerId}`);
  const keyIdOwner = keys.find(({ key }) => key.keyId === proposal.publicKey.keyId);
  if (keyIdOwner)
    conflicts.push(
      `key ID is already registered to ${keyIdOwner.reviewerId}: ${proposal.publicKey.keyId}`,
    );
  const fingerprintOwner = keys.find(
    ({ key }) => key.publicKeyFingerprint === proposal.publicKey.publicKeyFingerprint,
  );
  if (fingerprintOwner)
    conflicts.push(
      `public key fingerprint is already registered to ${fingerprintOwner.reviewerId}`,
    );
  return { conflicts: sortedUnique(conflicts), alreadyRegistered: false };
}

export function validateReviewerOnboardingProposal(input: {
  readonly proposal: unknown;
  readonly registry: TrustedReviewerRegistryV1;
  readonly asOf: string;
}): ReviewerOnboardingValidationReportV1 {
  assertAsOf(input.asOf);
  const registry = validatedProductionRegistry(input.registry);
  const parsed = parseReviewerOnboardingProposal(input.proposal);
  if (!parsed.ok)
    return Object.freeze({
      schemaVersion: 1,
      proposalId: parsed.id,
      asOf: input.asOf,
      status: 'invalid',
      structurallyValid: false,
      canonicalPublicKey: false,
      fingerprintValid: false,
      possessionProofValid: false,
      readyForHumanReview: false,
      trustGranted: false,
      requiredEvidence: [],
      missingEvidence: [],
      registryConflicts: [],
      issues: parsed.issues,
    });
  const proposal = parsed.value;
  const requiredEvidence = requiredReviewerAuthorizationEvidence(proposal.requestedScopes);
  const missingEvidence = missingReviewerAuthorizationEvidence(proposal);
  const crypto = proposalPublicKeyValidation(proposal);
  const registryState = registryConflicts(proposal, registry);
  const issues = [
    ...crypto.issues,
    ...(proposal.submittedAt > input.asOf
      ? ['proposal submission time is after the evaluation instant']
      : []),
    ...(proposal.publicKey.validUntil !== undefined && proposal.publicKey.validUntil <= input.asOf
      ? ['proposed public key is expired at the evaluation instant']
      : []),
  ];
  const status = registryState.alreadyRegistered
    ? ('already-registered' as const)
    : registryState.conflicts.length > 0
      ? ('conflicts-with-registry' as const)
      : issues.length > 0
        ? ('invalid' as const)
        : missingEvidence.length > 0
          ? ('incomplete' as const)
          : ('proof-verified-human-review-required' as const);
  return Object.freeze({
    schemaVersion: 1,
    proposalId: proposal.proposalId,
    reviewerId: proposal.reviewerId,
    keyId: proposal.publicKey.keyId,
    asOf: input.asOf,
    status,
    structurallyValid: true,
    canonicalPublicKey: crypto.canonical,
    fingerprintValid: crypto.fingerprintValid,
    possessionProofValid: crypto.proofValid,
    readyForHumanReview: status === 'proof-verified-human-review-required',
    trustGranted: false,
    requiredEvidence,
    missingEvidence,
    registryConflicts: registryState.conflicts,
    issues: sortedUnique(issues),
  });
}

export function validateReviewerRevocationProposal(input: {
  readonly proposal: unknown;
  readonly registry: TrustedReviewerRegistryV1;
  readonly asOf: string;
}): ReviewerRevocationValidationReportV1 {
  assertAsOf(input.asOf);
  const registry = validatedProductionRegistry(input.registry);
  const parsed = parseReviewerRevocationProposal(input.proposal);
  if (!parsed.ok)
    return Object.freeze({
      schemaVersion: 1,
      proposalId: parsed.id,
      asOf: input.asOf,
      status: 'invalid',
      structurallyValid: false,
      readyForHumanReview: false,
      trustChanged: false,
      requiredEvidence: ['incident', 'authorization'],
      missingEvidence: [],
      issues: parsed.issues,
    });
  const proposal = parsed.value;
  const reviewer = registry.reviewers.find(
    (item) => item.reviewerId === proposal.target.reviewerId,
  );
  const key = proposal.target.keyId
    ? reviewer?.keys.find((item) => item.keyId === proposal.target.keyId)
    : undefined;
  const targetMissing = !reviewer || (proposal.target.keyId !== undefined && !key);
  const alreadyRevoked = reviewer?.status === 'revoked' || key?.status === 'revoked';
  const missingEvidence = [
    ...(proposal.incidentEvidence.length === 0 ? ['incident'] : []),
    ...(proposal.authorizationEvidence.length === 0 ? ['authorization'] : []),
  ];
  const issues = [
    ...(proposal.proposedAt > input.asOf
      ? ['revocation proposal time is after the evaluation instant']
      : []),
  ];
  const status = issues.length
    ? ('invalid' as const)
    : targetMissing
      ? ('target-missing' as const)
      : alreadyRevoked
        ? ('already-revoked' as const)
        : missingEvidence.length
          ? ('incomplete' as const)
          : ('human-review-required' as const);
  return Object.freeze({
    schemaVersion: 1,
    proposalId: proposal.proposalId,
    reviewerId: proposal.target.reviewerId,
    ...(proposal.target.keyId ? { keyId: proposal.target.keyId } : {}),
    asOf: input.asOf,
    status,
    structurallyValid: true,
    readyForHumanReview: status === 'human-review-required',
    trustChanged: false,
    requiredEvidence: ['incident', 'authorization'],
    missingEvidence,
    issues: sortedUnique(issues),
  });
}

function keyStatus(
  key: TrustedReviewerKeyV1,
  asOf: string,
): 'active' | 'not-yet-valid' | 'expired' | 'revoked' {
  if (key.status === 'revoked') return 'revoked';
  if (asOf < key.validFrom) return 'not-yet-valid';
  if (key.validUntil !== undefined && asOf >= key.validUntil) return 'expired';
  return 'active';
}

function sortedReports<T extends { readonly proposalId: string; readonly status: string }>(
  values: readonly T[],
): readonly T[] {
  return [
    ...new Map(values.map((value) => [canonicalSerialize(value), value] as const)).values(),
  ].sort((left, right) => {
    if (left.proposalId !== right.proposalId) return left.proposalId < right.proposalId ? -1 : 1;
    const leftMaterial = canonicalSerialize(left);
    const rightMaterial = canonicalSerialize(right);
    return leftMaterial < rightMaterial ? -1 : leftMaterial > rightMaterial ? 1 : 0;
  });
}

function conflictingProposalIds(
  values: readonly {
    readonly proposal: unknown;
    readonly parsed: { readonly ok: boolean };
    readonly report: { readonly proposalId: string };
  }[],
): ReadonlySet<string> {
  const materialById = new Map<string, Set<string>>();
  for (const value of values) {
    if (!value.parsed.ok) continue;
    const material = materialById.get(value.report.proposalId) ?? new Set<string>();
    material.add(canonicalSerialize(value.proposal));
    materialById.set(value.report.proposalId, material);
  }
  return new Set(
    [...materialById].filter(([, material]) => material.size > 1).map(([proposalId]) => proposalId),
  );
}

export function buildReviewerGovernanceStatusMatrix(input: {
  readonly registry: TrustedReviewerRegistryV1;
  readonly onboardingProposals: readonly unknown[];
  readonly revocationProposals: readonly unknown[];
  readonly asOf: string;
}): ReviewerGovernanceStatusMatrixV1 {
  assertAsOf(input.asOf);
  const registry = validatedProductionRegistry(input.registry);
  const onboarding = input.onboardingProposals.map((proposal) => ({
    proposal,
    parsed: parseReviewerOnboardingProposal(proposal),
    report: validateReviewerOnboardingProposal({
      proposal,
      registry,
      asOf: input.asOf,
    }),
  }));
  const revocations = input.revocationProposals.map((proposal) => ({
    proposal,
    parsed: parseReviewerRevocationProposal(proposal),
    report: validateReviewerRevocationProposal({ proposal, registry, asOf: input.asOf }),
  }));
  const conflictingOnboardingIds = conflictingProposalIds(onboarding);
  const conflictingRevocationIds = conflictingProposalIds(revocations);
  const matrixIssues = sortedUnique([
    ...[...conflictingOnboardingIds].map(
      (id) => `onboarding proposal ID is reused with different material: ${id}`,
    ),
    ...[...conflictingRevocationIds].map(
      (id) => `revocation proposal ID is reused with different material: ${id}`,
    ),
  ]);
  const reviewers = registry.reviewers
    .map((reviewer) => {
      const keys = reviewer.keys
        .map((key) => ({
          keyId: key.keyId,
          status: keyStatus(key, input.asOf),
          fingerprint: key.publicKeyFingerprint,
        }))
        .sort((left, right) => (left.keyId < right.keyId ? -1 : left.keyId > right.keyId ? 1 : 0));
      return {
        reviewerId: reviewer.reviewerId,
        status:
          reviewer.status === 'revoked'
            ? ('revoked' as const)
            : keys.some((key) => key.status === 'active')
              ? ('active' as const)
              : ('no-current-key' as const),
        allowedScopes: [...reviewer.allowedScopes],
        keys,
      };
    })
    .sort((left, right) =>
      left.reviewerId < right.reviewerId ? -1 : left.reviewerId > right.reviewerId ? 1 : 0,
    );
  const scopes = PUBLICATION_REVIEW_SCOPES.map((scope) => {
    const registeredReviewerIds = reviewers
      .filter((reviewer) => reviewer.status === 'active' && reviewer.allowedScopes.includes(scope))
      .map((reviewer) => reviewer.reviewerId)
      .sort();
    const proposalIds = sortedUnique(
      onboarding
        .filter(
          (item) =>
            item.report.readyForHumanReview &&
            item.parsed.ok &&
            !conflictingOnboardingIds.has(item.report.proposalId) &&
            item.parsed.value.requestedScopes.includes(scope),
        )
        .map((item) => item.report.proposalId),
    );
    const revocationProposalIds = sortedUnique(
      revocations
        .filter((item) => {
          const parsed = item.parsed;
          if (
            !item.report.readyForHumanReview ||
            !parsed.ok ||
            conflictingRevocationIds.has(item.report.proposalId)
          )
            return false;
          const reviewer = registry.reviewers.find(
            (candidate) => candidate.reviewerId === parsed.value.target.reviewerId,
          );
          return reviewer?.allowedScopes.includes(scope) ?? false;
        })
        .map((item) => item.report.proposalId),
    );
    const status =
      registeredReviewerIds.length > 0 && revocationProposalIds.length > 0
        ? ('revocation-pending' as const)
        : registeredReviewerIds.length > 0
          ? ('registered-authority-available' as const)
          : proposalIds.length > 0
            ? ('proposal-only-human-review-required' as const)
            : ('missing' as const);
    return { scope, registeredReviewerIds, proposalIds, revocationProposalIds, status };
  });
  return Object.freeze({
    schemaVersion: 1,
    policyVersion: REVIEWER_GOVERNANCE_POLICY_VERSION,
    asOf: input.asOf,
    registryChecksum: reviewerRegistryChecksum(registry),
    issues: matrixIssues,
    requiredScopes: PUBLICATION_REVIEW_SCOPES,
    missingScopes: scopes
      .filter((item) => item.status !== 'registered-authority-available')
      .map((item) => item.scope),
    reviewers,
    onboardingProposals: sortedReports(onboarding.map((item) => item.report)),
    revocationProposals: sortedReports(revocations.map((item) => item.report)),
    scopes,
  });
}

export function listReviewerAuthorizationRequirements(
  scopes: readonly PublicationReviewScope[] = PUBLICATION_REVIEW_SCOPES,
): readonly { readonly scope?: PublicationReviewScope; readonly requirement: string }[] {
  const requested = PUBLICATION_REVIEW_SCOPES.filter((scope) => scopes.includes(scope));
  return [
    { requirement: 'identity' },
    { requirement: 'independence' },
    ...requested.flatMap((scope) => [
      { scope, requirement: 'qualification' },
      { scope, requirement: 'authorization' },
    ]),
  ];
}
