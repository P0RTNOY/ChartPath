import { canonicalSerialize, sha256Hex, type Sha256Checksum } from '@chartpath/historical-data';

import {
  PUBLICATION_REVIEW_SCOPES,
  type PublicationReviewScope,
  type TrustedReviewerRegistryV1,
} from './types.js';

export const REVIEWER_ONBOARDING_PROPOSAL_CONTRACT_VERSION =
  'reviewer-onboarding-proposal-v1' as const;
export const REVIEWER_REVOCATION_PROPOSAL_CONTRACT_VERSION =
  'reviewer-revocation-proposal-v1' as const;
export const REVIEWER_GOVERNANCE_POLICY_VERSION = 'reviewer-governance-policy-v1' as const;

const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{2,127}$/u;
const CHECKSUM = /^sha256:[0-9a-f]{64}$/u;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const ONBOARDING_SIGNING_DOMAIN = 'ChartPath\0reviewer-onboarding-proof\0v1\0';

export interface ReviewerEvidenceReferenceV1 {
  /** Opaque record identifier. Raw identity documents do not belong in this contract. */
  readonly evidenceId: string;
  readonly recordId: string;
  readonly checksum: Sha256Checksum;
  readonly note: string;
}

export interface ReviewerScopeAuthorizationEvidenceV1 {
  readonly scope: PublicationReviewScope;
  readonly qualificationEvidence: readonly ReviewerEvidenceReferenceV1[];
  readonly authorizationEvidence: readonly ReviewerEvidenceReferenceV1[];
}

export interface ReviewerPublicKeyMaterialV1 {
  readonly keyId: string;
  readonly algorithm: 'Ed25519';
  readonly publicKeySpkiDerBase64: string;
  readonly publicKeyFingerprint: Sha256Checksum;
  readonly validFrom: string;
  readonly validUntil?: string;
}

export interface ReviewerOnboardingProposalMaterialV1 {
  readonly schemaVersion: 1;
  readonly contractVersion: typeof REVIEWER_ONBOARDING_PROPOSAL_CONTRACT_VERSION;
  readonly policyVersion: typeof REVIEWER_GOVERNANCE_POLICY_VERSION;
  readonly proposalId: string;
  readonly reviewerId: string;
  readonly reviewerKind: 'external-human';
  readonly requestedScopes: readonly PublicationReviewScope[];
  readonly publicKey: ReviewerPublicKeyMaterialV1;
  readonly identityEvidence: readonly ReviewerEvidenceReferenceV1[];
  readonly independenceEvidence: readonly ReviewerEvidenceReferenceV1[];
  readonly scopeAuthorizationEvidence: readonly ReviewerScopeAuthorizationEvidenceV1[];
  readonly submittedAt: string;
  readonly note: string;
}

export interface ReviewerPossessionProofV1 {
  readonly algorithm: 'Ed25519';
  readonly valueBase64: string;
}

export interface ReviewerOnboardingProposalV1 extends ReviewerOnboardingProposalMaterialV1 {
  readonly possessionProof: {
    readonly algorithm: 'Ed25519';
    readonly valueBase64: string;
  };
}

export interface ReviewerRevocationProposalV1 {
  readonly schemaVersion: 1;
  readonly contractVersion: typeof REVIEWER_REVOCATION_PROPOSAL_CONTRACT_VERSION;
  readonly policyVersion: typeof REVIEWER_GOVERNANCE_POLICY_VERSION;
  readonly proposalId: string;
  readonly target: {
    readonly reviewerId: string;
    readonly keyId?: string;
  };
  readonly requestedBy: string;
  readonly proposedAt: string;
  readonly effectiveAt: string;
  readonly reasonCode:
    'key-compromise' | 'key-rotation' | 'authorization-withdrawn' | 'identity-change' | 'other';
  readonly reason: string;
  readonly incidentEvidence: readonly ReviewerEvidenceReferenceV1[];
  readonly authorizationEvidence: readonly ReviewerEvidenceReferenceV1[];
}

export type ReviewerOnboardingProposalStatus =
  | 'invalid'
  | 'incomplete'
  | 'conflicts-with-registry'
  | 'already-registered'
  | 'proof-verified-human-review-required';

export interface ReviewerOnboardingValidationReportV1 {
  readonly schemaVersion: 1;
  readonly proposalId: string;
  readonly reviewerId?: string;
  readonly keyId?: string;
  readonly asOf: string;
  readonly status: ReviewerOnboardingProposalStatus;
  readonly structurallyValid: boolean;
  readonly canonicalPublicKey: boolean;
  readonly fingerprintValid: boolean;
  readonly possessionProofValid: boolean;
  readonly readyForHumanReview: boolean;
  readonly trustGranted: false;
  readonly requiredEvidence: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly registryConflicts: readonly string[];
  readonly issues: readonly string[];
}

export interface ReviewerPublicKeyFingerprintReportV1 {
  readonly schemaVersion: 1;
  readonly keyId: string;
  readonly algorithm: 'Ed25519';
  readonly structurallyValid: boolean;
  readonly canonicalPublicKey: boolean;
  readonly declaredFingerprint?: Sha256Checksum;
  readonly computedFingerprint?: Sha256Checksum;
  readonly fingerprintMatches: boolean;
  readonly valid: boolean;
  readonly trustGranted: false;
  readonly issues: readonly string[];
}

export type ReviewerRevocationProposalStatus =
  'invalid' | 'incomplete' | 'target-missing' | 'already-revoked' | 'human-review-required';

export interface ReviewerRevocationValidationReportV1 {
  readonly schemaVersion: 1;
  readonly proposalId: string;
  readonly reviewerId?: string;
  readonly keyId?: string;
  readonly asOf: string;
  readonly status: ReviewerRevocationProposalStatus;
  readonly structurallyValid: boolean;
  readonly readyForHumanReview: boolean;
  readonly trustChanged: false;
  readonly requiredEvidence: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly issues: readonly string[];
}

export interface ReviewerGovernanceStatusMatrixV1 {
  readonly schemaVersion: 1;
  readonly policyVersion: typeof REVIEWER_GOVERNANCE_POLICY_VERSION;
  readonly asOf: string;
  readonly registryChecksum: Sha256Checksum;
  readonly issues: readonly string[];
  readonly requiredScopes: typeof PUBLICATION_REVIEW_SCOPES;
  readonly missingScopes: readonly PublicationReviewScope[];
  readonly reviewers: readonly {
    readonly reviewerId: string;
    readonly status: 'active' | 'revoked' | 'no-current-key';
    readonly allowedScopes: readonly PublicationReviewScope[];
    readonly keys: readonly {
      readonly keyId: string;
      readonly status: 'active' | 'not-yet-valid' | 'expired' | 'revoked';
      readonly fingerprint: Sha256Checksum;
    }[];
  }[];
  readonly onboardingProposals: readonly ReviewerOnboardingValidationReportV1[];
  readonly revocationProposals: readonly ReviewerRevocationValidationReportV1[];
  readonly scopes: readonly {
    readonly scope: PublicationReviewScope;
    readonly registeredReviewerIds: readonly string[];
    readonly proposalIds: readonly string[];
    readonly revocationProposalIds: readonly string[];
    readonly status:
      | 'registered-authority-available'
      | 'revocation-pending'
      | 'proposal-only-human-review-required'
      | 'missing';
  }[];
}

export type ReviewerProposalParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly id: string; readonly issues: readonly string[] };

function plainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const accepted = new Set([...required, ...optional]);
  return (
    required.every((key) => key in value) && Object.keys(value).every((key) => accepted.has(key))
  );
}

export function isCanonicalUtcTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    UTC_TIMESTAMP.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function normalizedBoundedString(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  if (typeof value !== 'string' || value.length < minimum || value.length > maximum) return false;
  if (value !== value.normalize('NFC')) return false;
  return ![...value].some((character) => {
    const code = character.codePointAt(0)!;
    return (code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0x7f;
  });
}

function canonicalBase64(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)
  )
    return false;
  return Buffer.from(value, 'base64').toString('base64') === value;
}

function isScope(value: unknown): value is PublicationReviewScope {
  return (PUBLICATION_REVIEW_SCOPES as readonly unknown[]).includes(value);
}

function parseEvidenceReference(
  value: unknown,
  location: string,
  issues: string[],
): ReviewerEvidenceReferenceV1 | undefined {
  if (
    !plainObject(value) ||
    !exactKeys(value, ['evidenceId', 'recordId', 'checksum', 'note']) ||
    typeof value.evidenceId !== 'string' ||
    !IDENTIFIER.test(value.evidenceId) ||
    typeof value.recordId !== 'string' ||
    !IDENTIFIER.test(value.recordId) ||
    typeof value.checksum !== 'string' ||
    !CHECKSUM.test(value.checksum) ||
    !normalizedBoundedString(value.note, 1, 500)
  ) {
    issues.push(`${location} must be an exact checksum-pinned evidence reference`);
    return undefined;
  }
  return value as unknown as ReviewerEvidenceReferenceV1;
}

function parseEvidenceArray(
  value: unknown,
  location: string,
  issues: string[],
): readonly ReviewerEvidenceReferenceV1[] {
  if (!Array.isArray(value) || value.length > 64) {
    issues.push(`${location} must be an array with at most 64 entries`);
    return [];
  }
  const parsed = value.flatMap((item, index) => {
    const result = parseEvidenceReference(item, `${location}[${index}]`, issues);
    return result ? [result] : [];
  });
  const ids = new Set<string>();
  for (const item of parsed) {
    if (ids.has(item.evidenceId))
      issues.push(`${location} contains duplicate evidence ID ${item.evidenceId}`);
    ids.add(item.evidenceId);
  }
  return parsed;
}

function canonicalScopeTuple(value: readonly PublicationReviewScope[]): boolean {
  const positions = value.map((item) => PUBLICATION_REVIEW_SCOPES.indexOf(item));
  return positions.every((position, index) => index === 0 || position > positions[index - 1]!);
}

export function parseReviewerPublicKeyMaterial(
  input: unknown,
): ReviewerProposalParseResult<ReviewerPublicKeyMaterialV1> {
  const issues: string[] = [];
  const id = plainObject(input) && typeof input.keyId === 'string' ? input.keyId : 'invalid-key';
  if (
    !plainObject(input) ||
    !exactKeys(
      input,
      ['keyId', 'algorithm', 'publicKeySpkiDerBase64', 'publicKeyFingerprint', 'validFrom'],
      ['validUntil'],
    )
  )
    return {
      ok: false,
      id,
      issues: ['public key must be an exact Ed25519 public-key material object'],
    };
  if (typeof input.keyId !== 'string' || !IDENTIFIER.test(input.keyId))
    issues.push('keyId is invalid');
  if (input.algorithm !== 'Ed25519') issues.push('public key algorithm must be Ed25519');
  if (!canonicalBase64(input.publicKeySpkiDerBase64))
    issues.push('public key must use canonical Base64');
  if (typeof input.publicKeyFingerprint !== 'string' || !CHECKSUM.test(input.publicKeyFingerprint))
    issues.push('public key fingerprint is invalid');
  if (!isCanonicalUtcTimestamp(input.validFrom)) issues.push('key validFrom is invalid');
  if (input.validUntil !== undefined && !isCanonicalUtcTimestamp(input.validUntil))
    issues.push('key validUntil is invalid');
  if (
    isCanonicalUtcTimestamp(input.validFrom) &&
    isCanonicalUtcTimestamp(input.validUntil) &&
    input.validUntil <= input.validFrom
  )
    issues.push('key validUntil must be later than validFrom');
  return issues.length
    ? { ok: false, id, issues: [...new Set(issues)].sort() }
    : { ok: true, value: input as unknown as ReviewerPublicKeyMaterialV1 };
}

export function parseReviewerOnboardingProposal(
  input: unknown,
): ReviewerProposalParseResult<ReviewerOnboardingProposalV1> {
  const issues: string[] = [];
  const id =
    plainObject(input) && typeof input.proposalId === 'string'
      ? input.proposalId
      : 'invalid-record';
  if (
    !plainObject(input) ||
    !exactKeys(input, [
      'schemaVersion',
      'contractVersion',
      'policyVersion',
      'proposalId',
      'reviewerId',
      'reviewerKind',
      'requestedScopes',
      'publicKey',
      'identityEvidence',
      'independenceEvidence',
      'scopeAuthorizationEvidence',
      'submittedAt',
      'note',
      'possessionProof',
    ])
  )
    return { ok: false, id, issues: ['proposal must be an exact onboarding-proposal-v1 object'] };
  if (
    input.schemaVersion !== 1 ||
    input.contractVersion !== REVIEWER_ONBOARDING_PROPOSAL_CONTRACT_VERSION ||
    input.policyVersion !== REVIEWER_GOVERNANCE_POLICY_VERSION
  )
    issues.push('unsupported onboarding proposal contract or policy');
  if (typeof input.proposalId !== 'string' || !IDENTIFIER.test(input.proposalId))
    issues.push('proposalId is invalid');
  if (typeof input.reviewerId !== 'string' || !IDENTIFIER.test(input.reviewerId))
    issues.push('reviewerId is invalid');
  if (input.reviewerKind !== 'external-human')
    issues.push('onboarding proposals accept external-human reviewers only');
  const requestedScopes = Array.isArray(input.requestedScopes)
    ? input.requestedScopes.filter(isScope)
    : [];
  if (
    !Array.isArray(input.requestedScopes) ||
    input.requestedScopes.length === 0 ||
    input.requestedScopes.length > PUBLICATION_REVIEW_SCOPES.length ||
    requestedScopes.length !== input.requestedScopes.length ||
    new Set(requestedScopes).size !== requestedScopes.length ||
    !canonicalScopeTuple(requestedScopes)
  )
    issues.push('requestedScopes must be a non-empty canonical subset of publication scopes');
  const parsedKey = parseReviewerPublicKeyMaterial(input.publicKey);
  if (!parsedKey.ok) issues.push(...parsedKey.issues.map((issue) => `publicKey: ${issue}`));
  const identityEvidence = parseEvidenceArray(input.identityEvidence, 'identityEvidence', issues);
  const independenceEvidence = parseEvidenceArray(
    input.independenceEvidence,
    'independenceEvidence',
    issues,
  );
  const scopeEvidence: ReviewerScopeAuthorizationEvidenceV1[] = [];
  if (
    !Array.isArray(input.scopeAuthorizationEvidence) ||
    input.scopeAuthorizationEvidence.length > 8
  )
    issues.push('scopeAuthorizationEvidence must be an array with at most eight entries');
  else
    for (const [index, item] of input.scopeAuthorizationEvidence.entries()) {
      if (
        !plainObject(item) ||
        !exactKeys(item, ['scope', 'qualificationEvidence', 'authorizationEvidence']) ||
        !isScope(item.scope)
      ) {
        issues.push(`scopeAuthorizationEvidence[${index}] is invalid`);
        continue;
      }
      scopeEvidence.push({
        scope: item.scope,
        qualificationEvidence: parseEvidenceArray(
          item.qualificationEvidence,
          `scopeAuthorizationEvidence[${index}].qualificationEvidence`,
          issues,
        ),
        authorizationEvidence: parseEvidenceArray(
          item.authorizationEvidence,
          `scopeAuthorizationEvidence[${index}].authorizationEvidence`,
          issues,
        ),
      });
    }
  if (
    new Set(scopeEvidence.map((item) => item.scope)).size !== scopeEvidence.length ||
    !canonicalScopeTuple(scopeEvidence.map((item) => item.scope))
  )
    issues.push('scopeAuthorizationEvidence must contain unique scopes in canonical order');
  if (
    canonicalSerialize(scopeEvidence.map((item) => item.scope)) !==
    canonicalSerialize(requestedScopes)
  )
    issues.push('scopeAuthorizationEvidence scopes must exactly match requestedScopes');
  const allEvidence = [
    ...identityEvidence,
    ...independenceEvidence,
    ...scopeEvidence.flatMap((item) => [
      ...item.qualificationEvidence,
      ...item.authorizationEvidence,
    ]),
  ];
  if (new Set(allEvidence.map((item) => item.evidenceId)).size !== allEvidence.length)
    issues.push('onboarding proposal evidence IDs must be globally unique');
  if (!isCanonicalUtcTimestamp(input.submittedAt)) issues.push('submittedAt is invalid');
  if (!normalizedBoundedString(input.note, 1, 2_000)) issues.push('proposal note is invalid');
  const proof = input.possessionProof;
  if (
    !plainObject(proof) ||
    !exactKeys(proof, ['algorithm', 'valueBase64']) ||
    proof.algorithm !== 'Ed25519' ||
    !canonicalBase64(proof.valueBase64) ||
    (typeof proof.valueBase64 === 'string' &&
      Buffer.from(proof.valueBase64, 'base64').byteLength !== 64)
  )
    issues.push('possessionProof must be one canonical 64-byte Ed25519 signature');
  return issues.length
    ? { ok: false, id, issues: [...new Set(issues)].sort() }
    : { ok: true, value: input as unknown as ReviewerOnboardingProposalV1 };
}

export function parseReviewerOnboardingProposalMaterial(
  input: unknown,
): ReviewerProposalParseResult<ReviewerOnboardingProposalMaterialV1> {
  if (!plainObject(input) || 'possessionProof' in input)
    return {
      ok: false,
      id: 'invalid-record',
      issues: ['proposal material must be an exact onboarding-proposal-v1 material object'],
    };
  const parsed = parseReviewerOnboardingProposal({
    ...input,
    possessionProof: {
      algorithm: 'Ed25519',
      valueBase64: Buffer.alloc(64).toString('base64'),
    },
  });
  if (!parsed.ok) return parsed;
  const { possessionProof: _proof, ...material } = parsed.value;
  void _proof;
  return { ok: true, value: material };
}

export function createReviewerOnboardingProposal(input: {
  readonly material: unknown;
  readonly possessionProof: unknown;
}): ReviewerProposalParseResult<ReviewerOnboardingProposalV1> {
  const parsedMaterial = parseReviewerOnboardingProposalMaterial(input.material);
  if (!parsedMaterial.ok) return parsedMaterial;
  return parseReviewerOnboardingProposal({
    ...parsedMaterial.value,
    possessionProof: input.possessionProof,
  });
}

export function parseReviewerRevocationProposal(
  input: unknown,
): ReviewerProposalParseResult<ReviewerRevocationProposalV1> {
  const issues: string[] = [];
  const id =
    plainObject(input) && typeof input.proposalId === 'string'
      ? input.proposalId
      : 'invalid-record';
  if (
    !plainObject(input) ||
    !exactKeys(input, [
      'schemaVersion',
      'contractVersion',
      'policyVersion',
      'proposalId',
      'target',
      'requestedBy',
      'proposedAt',
      'effectiveAt',
      'reasonCode',
      'reason',
      'incidentEvidence',
      'authorizationEvidence',
    ])
  )
    return { ok: false, id, issues: ['proposal must be an exact revocation-proposal-v1 object'] };
  if (
    input.schemaVersion !== 1 ||
    input.contractVersion !== REVIEWER_REVOCATION_PROPOSAL_CONTRACT_VERSION ||
    input.policyVersion !== REVIEWER_GOVERNANCE_POLICY_VERSION
  )
    issues.push('unsupported revocation proposal contract or policy');
  if (typeof input.proposalId !== 'string' || !IDENTIFIER.test(input.proposalId))
    issues.push('proposalId is invalid');
  if (
    !plainObject(input.target) ||
    !exactKeys(input.target, ['reviewerId'], ['keyId']) ||
    typeof input.target.reviewerId !== 'string' ||
    !IDENTIFIER.test(input.target.reviewerId) ||
    (input.target.keyId !== undefined &&
      (typeof input.target.keyId !== 'string' || !IDENTIFIER.test(input.target.keyId)))
  )
    issues.push('revocation target is invalid');
  if (typeof input.requestedBy !== 'string' || !IDENTIFIER.test(input.requestedBy))
    issues.push('requestedBy is invalid');
  if (!isCanonicalUtcTimestamp(input.proposedAt)) issues.push('proposedAt is invalid');
  if (!isCanonicalUtcTimestamp(input.effectiveAt)) issues.push('effectiveAt is invalid');
  if (
    isCanonicalUtcTimestamp(input.proposedAt) &&
    isCanonicalUtcTimestamp(input.effectiveAt) &&
    input.effectiveAt < input.proposedAt
  )
    issues.push('effectiveAt cannot precede proposedAt');
  if (
    ![
      'key-compromise',
      'key-rotation',
      'authorization-withdrawn',
      'identity-change',
      'other',
    ].includes(input.reasonCode as string)
  )
    issues.push('reasonCode is invalid');
  if (!normalizedBoundedString(input.reason, 1, 2_000)) issues.push('revocation reason is invalid');
  const incidentEvidence = parseEvidenceArray(input.incidentEvidence, 'incidentEvidence', issues);
  const authorizationEvidence = parseEvidenceArray(
    input.authorizationEvidence,
    'authorizationEvidence',
    issues,
  );
  const allEvidence = [...incidentEvidence, ...authorizationEvidence];
  if (new Set(allEvidence.map((item) => item.evidenceId)).size !== allEvidence.length)
    issues.push('revocation proposal evidence IDs must be globally unique');
  return issues.length
    ? { ok: false, id, issues: [...new Set(issues)].sort() }
    : { ok: true, value: input as unknown as ReviewerRevocationProposalV1 };
}

export function reviewerOnboardingProofBytes(proposal: ReviewerOnboardingProposalV1): Uint8Array {
  const { possessionProof: _proof, ...material } = proposal;
  void _proof;
  return reviewerOnboardingMaterialProofBytes(material);
}

export function reviewerOnboardingMaterialProofBytes(
  material: ReviewerOnboardingProposalMaterialV1,
): Uint8Array {
  return new TextEncoder().encode(`${ONBOARDING_SIGNING_DOMAIN}${canonicalSerialize(material)}`);
}

export function requiredReviewerAuthorizationEvidence(
  scopes: readonly PublicationReviewScope[],
): readonly string[] {
  return [
    'identity',
    'independence',
    ...scopes.flatMap((scope) => [`scope:${scope}:qualification`, `scope:${scope}:authorization`]),
  ];
}

export function missingReviewerAuthorizationEvidence(
  proposal: ReviewerOnboardingProposalV1,
): readonly string[] {
  const missing: string[] = [];
  if (proposal.identityEvidence.length === 0) missing.push('identity');
  if (proposal.independenceEvidence.length === 0) missing.push('independence');
  for (const scope of proposal.requestedScopes) {
    const evidence = proposal.scopeAuthorizationEvidence.find((item) => item.scope === scope);
    if (!evidence?.qualificationEvidence.length) missing.push(`scope:${scope}:qualification`);
    if (!evidence?.authorizationEvidence.length) missing.push(`scope:${scope}:authorization`);
  }
  return missing;
}

export function reviewerRegistryChecksum(registry: TrustedReviewerRegistryV1): Sha256Checksum {
  return `sha256:${sha256Hex(canonicalSerialize(registry))}`;
}
