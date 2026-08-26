import { createHash, createPublicKey, verify } from 'node:crypto';

import { canonicalSerialize, sha256Hex, type Sha256Checksum } from '@chartpath/historical-data';

import {
  PUBLICATION_REVIEW_SCOPES,
  REVIEW_ATTESTATION_CONTRACT_VERSION,
  REVIEW_ATTESTATION_POLICY_VERSION,
  type AttestationVerificationReportV1,
  type PublicationCandidateV1,
  type PublicationReviewScope,
  type ReviewAttestationPayloadV1,
  type ReviewPacketV1,
  type SignedReviewAttestationV1,
  type TrustedReviewerRegistryV1,
} from './types.js';
import { PRODUCTION_TRUSTED_REVIEWER_REGISTRY } from './trusted-reviewers.js';

const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{2,127}$/u;
const CHECKSUM = /^sha256:[0-9a-f]{64}$/u;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const SIGNING_DOMAIN = 'ChartPath\0review-attestation\0v1\0';

function checksum(value: unknown): Sha256Checksum {
  return `sha256:${sha256Hex(canonicalSerialize(value))}`;
}

function strictUtcTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    UTC_TIMESTAMP.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function canonicalBase64(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)
  )
    return false;
  return Buffer.from(value, 'base64').toString('base64') === value;
}

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

function normalizedBoundedString(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  const hasForbiddenControl =
    typeof value === 'string' &&
    [...value].some((character) => {
      const code = character.codePointAt(0)!;
      return (code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0x7f;
    });
  return (
    typeof value === 'string' &&
    value.length >= minimum &&
    value.length <= maximum &&
    value === value.normalize('NFC') &&
    !hasForbiddenControl
  );
}

function scope(value: unknown): value is PublicationReviewScope {
  return (PUBLICATION_REVIEW_SCOPES as readonly unknown[]).includes(value);
}

function parseAttestation(
  input: unknown,
):
  | { readonly ok: true; readonly value: SignedReviewAttestationV1 }
  | { readonly ok: false; readonly issues: readonly string[]; readonly id: string } {
  const issues: string[] = [];
  if (!plainObject(input) || !exactKeys(input, ['payload', 'signature']))
    return {
      ok: false,
      issues: ['attestation envelope must be an exact plain object'],
      id: 'invalid-record',
    };
  const payload = input.payload;
  const signature = input.signature;
  const id =
    plainObject(payload) && typeof payload.attestationId === 'string'
      ? payload.attestationId
      : 'invalid-record';
  if (
    !plainObject(payload) ||
    !exactKeys(
      payload,
      [
        'schemaVersion',
        'contractVersion',
        'attestationId',
        'reviewerId',
        'keyId',
        'scope',
        'candidateId',
        'scenario',
        'dataset',
        'materialSetChecksum',
        'reviewPacketChecksum',
        'decision',
        'reviewedAt',
        'policyVersion',
        'note',
      ],
      ['expiresAt', 'supersedesAttestationId'],
    )
  )
    issues.push('payload must be an exact review-attestation-v1 object');
  if (!plainObject(payload)) return { ok: false, issues, id };
  if (
    payload.schemaVersion !== 1 ||
    payload.contractVersion !== REVIEW_ATTESTATION_CONTRACT_VERSION
  )
    issues.push('unsupported attestation contract');
  for (const [field, value] of [
    ['attestationId', payload.attestationId],
    ['reviewerId', payload.reviewerId],
    ['keyId', payload.keyId],
    ['candidateId', payload.candidateId],
  ] as const)
    if (typeof value !== 'string' || !IDENTIFIER.test(value)) issues.push(`${field} is invalid`);
  if (!scope(payload.scope)) issues.push('scope is invalid');
  if (
    !plainObject(payload.scenario) ||
    !exactKeys(payload.scenario, ['scenarioId', 'scenarioVersion'])
  )
    issues.push('scenario identity is invalid');
  if (
    !plainObject(payload.dataset) ||
    !exactKeys(payload.dataset, ['datasetId', 'datasetVersion', 'datasetChecksum'])
  )
    issues.push('dataset identity is invalid');
  if (plainObject(payload.scenario)) {
    if (
      typeof payload.scenario.scenarioId !== 'string' ||
      !IDENTIFIER.test(payload.scenario.scenarioId)
    )
      issues.push('scenarioId is invalid');
    if (
      typeof payload.scenario.scenarioVersion !== 'string' ||
      !/^\d+\.\d+\.\d+$/u.test(payload.scenario.scenarioVersion)
    )
      issues.push('scenarioVersion is invalid');
  }
  if (plainObject(payload.dataset)) {
    if (
      typeof payload.dataset.datasetId !== 'string' ||
      !IDENTIFIER.test(payload.dataset.datasetId)
    )
      issues.push('datasetId is invalid');
    if (
      typeof payload.dataset.datasetVersion !== 'string' ||
      !/^\d+\.\d+\.\d+$/u.test(payload.dataset.datasetVersion)
    )
      issues.push('datasetVersion is invalid');
    if (
      typeof payload.dataset.datasetChecksum !== 'string' ||
      !CHECKSUM.test(payload.dataset.datasetChecksum)
    )
      issues.push('datasetChecksum is invalid');
  }
  for (const [field, value] of [
    ['materialSetChecksum', payload.materialSetChecksum],
    ['reviewPacketChecksum', payload.reviewPacketChecksum],
  ] as const)
    if (typeof value !== 'string' || !CHECKSUM.test(value)) issues.push(`${field} is invalid`);
  if (payload.decision !== 'approved' && payload.decision !== 'changes-requested')
    issues.push('decision is invalid');
  if (!strictUtcTimestamp(payload.reviewedAt))
    issues.push('reviewedAt must be canonical UTC RFC3339');
  if (payload.expiresAt !== undefined && !strictUtcTimestamp(payload.expiresAt))
    issues.push('expiresAt must be canonical UTC RFC3339');
  if (
    typeof payload.reviewedAt === 'string' &&
    typeof payload.expiresAt === 'string' &&
    strictUtcTimestamp(payload.reviewedAt) &&
    strictUtcTimestamp(payload.expiresAt) &&
    payload.expiresAt <= payload.reviewedAt
  )
    issues.push('expiresAt must be later than reviewedAt');
  if (
    payload.supersedesAttestationId !== undefined &&
    (typeof payload.supersedesAttestationId !== 'string' ||
      !IDENTIFIER.test(payload.supersedesAttestationId))
  )
    issues.push('supersedesAttestationId is invalid');
  if (payload.policyVersion !== REVIEW_ATTESTATION_POLICY_VERSION)
    issues.push('attestation policy version mismatch');
  if (!normalizedBoundedString(payload.note, 1, 2_000)) issues.push('signed note is invalid');
  if (
    !plainObject(signature) ||
    !exactKeys(signature, ['algorithm', 'valueBase64']) ||
    signature.algorithm !== 'Ed25519' ||
    !canonicalBase64(signature.valueBase64) ||
    (typeof signature.valueBase64 === 'string' &&
      Buffer.from(signature.valueBase64, 'base64').byteLength !== 64)
  )
    issues.push('signature must be one canonical 64-byte Ed25519 value');
  return issues.length
    ? { ok: false, issues: [...new Set(issues)].sort(), id }
    : { ok: true, value: input as unknown as SignedReviewAttestationV1 };
}

export function reviewAttestationSigningBytes(payload: ReviewAttestationPayloadV1): Uint8Array {
  return new TextEncoder().encode(`${SIGNING_DOMAIN}${canonicalSerialize(payload)}`);
}

function validateRegistry(
  registry: TrustedReviewerRegistryV1,
  environment: 'production' | 'test',
): readonly string[] {
  const issues: string[] = [];
  if (registry.schemaVersion !== 1 || registry.policyVersion !== REVIEW_ATTESTATION_POLICY_VERSION)
    issues.push('trusted reviewer registry contract mismatch');
  if (registry.environment !== environment)
    issues.push(
      `${environment} verification rejects ${registry.environment} trusted reviewer registry`,
    );
  const reviewerIds = new Set<string>();
  const keyIds = new Set<string>();
  const fingerprints = new Set<string>();
  for (const reviewer of registry.reviewers) {
    if (!IDENTIFIER.test(reviewer.reviewerId))
      issues.push(`invalid reviewer ID ${reviewer.reviewerId}`);
    if (reviewerIds.has(reviewer.reviewerId))
      issues.push(`duplicate reviewer ID ${reviewer.reviewerId}`);
    reviewerIds.add(reviewer.reviewerId);
    if (environment === 'production' && reviewer.reviewerKind !== 'external-human')
      issues.push(`production registry rejects test reviewer ${reviewer.reviewerId}`);
    if (environment === 'test' && reviewer.reviewerKind !== 'test-fixture')
      issues.push(`test registry requires test-fixture reviewer ${reviewer.reviewerId}`);
    if (!['active', 'revoked'].includes(reviewer.status))
      issues.push(`invalid reviewer status ${reviewer.reviewerId}`);
    if (
      reviewer.allowedScopes.length === 0 ||
      new Set(reviewer.allowedScopes).size !== reviewer.allowedScopes.length ||
      reviewer.allowedScopes.some((item) => !scope(item))
    )
      issues.push(`invalid allowed scopes for ${reviewer.reviewerId}`);
    for (const key of reviewer.keys) {
      if (!IDENTIFIER.test(key.keyId)) issues.push(`invalid key ID ${key.keyId}`);
      if (keyIds.has(key.keyId)) issues.push(`duplicate key ID ${key.keyId}`);
      keyIds.add(key.keyId);
      if (key.algorithm !== 'Ed25519') issues.push(`unsupported key algorithm ${key.keyId}`);
      if (!canonicalBase64(key.publicKeySpkiDerBase64)) {
        issues.push(`invalid public key encoding ${key.keyId}`);
        continue;
      }
      const der = Buffer.from(key.publicKeySpkiDerBase64, 'base64');
      const fingerprint = `sha256:${createHash('sha256').update(der).digest('hex')}`;
      if (fingerprint !== key.publicKeyFingerprint)
        issues.push(`public key fingerprint mismatch ${key.keyId}`);
      if (fingerprints.has(fingerprint))
        issues.push(`duplicate public key fingerprint ${key.keyId}`);
      fingerprints.add(fingerprint);
      if (!strictUtcTimestamp(key.validFrom)) issues.push(`invalid key validFrom ${key.keyId}`);
      if (key.validUntil !== undefined && !strictUtcTimestamp(key.validUntil))
        issues.push(`invalid key validUntil ${key.keyId}`);
      if (key.revokedAt !== undefined && !strictUtcTimestamp(key.revokedAt))
        issues.push(`invalid key revokedAt ${key.keyId}`);
      if (key.status === 'active' && key.revokedAt !== undefined)
        issues.push(`active key cannot carry revokedAt ${key.keyId}`);
      if (key.status === 'revoked' && key.revokedAt === undefined)
        issues.push(`revoked key requires revokedAt ${key.keyId}`);
      try {
        const publicKey = createPublicKey({ key: der, format: 'der', type: 'spki' });
        if (publicKey.asymmetricKeyType !== 'ed25519')
          issues.push(`public key is not Ed25519 ${key.keyId}`);
      } catch {
        issues.push(`invalid SPKI public key ${key.keyId}`);
      }
    }
  }
  return [...new Set(issues)].sort();
}

export function parseTrustedReviewerRegistry(
  input: unknown,
  expectedEnvironment: 'production' | 'test',
): TrustedReviewerRegistryV1 {
  if (
    !plainObject(input) ||
    !exactKeys(input, ['schemaVersion', 'environment', 'policyVersion', 'reviewers']) ||
    input.schemaVersion !== 1 ||
    (input.environment !== 'production' && input.environment !== 'test') ||
    input.policyVersion !== REVIEW_ATTESTATION_POLICY_VERSION ||
    !Array.isArray(input.reviewers)
  )
    throw new TypeError(
      'Trusted reviewer registry must be an exact review-attestation-policy-v1 object.',
    );
  for (const reviewer of input.reviewers) {
    if (
      !plainObject(reviewer) ||
      !exactKeys(reviewer, ['reviewerId', 'reviewerKind', 'status', 'allowedScopes', 'keys']) ||
      typeof reviewer.reviewerId !== 'string' ||
      (reviewer.reviewerKind !== 'external-human' && reviewer.reviewerKind !== 'test-fixture') ||
      (reviewer.status !== 'active' && reviewer.status !== 'revoked') ||
      !Array.isArray(reviewer.allowedScopes) ||
      !Array.isArray(reviewer.keys)
    )
      throw new TypeError('Trusted reviewer entry is malformed.');
    for (const key of reviewer.keys)
      if (
        !plainObject(key) ||
        !exactKeys(
          key,
          [
            'keyId',
            'algorithm',
            'publicKeySpkiDerBase64',
            'publicKeyFingerprint',
            'validFrom',
            'status',
          ],
          ['validUntil', 'revokedAt'],
        )
      )
        throw new TypeError('Trusted reviewer key entry is malformed.');
  }
  const registry = input as unknown as TrustedReviewerRegistryV1;
  const issues = validateRegistry(registry, expectedEnvironment);
  if (issues.length) throw new TypeError(issues.join('; '));
  return registry;
}

function verifyWithEnvironment(input: {
  readonly candidate: PublicationCandidateV1;
  readonly packet: ReviewPacketV1;
  readonly attestations: readonly unknown[];
  readonly registry: TrustedReviewerRegistryV1;
  readonly asOf: string;
  readonly environment: 'production' | 'test';
}): AttestationVerificationReportV1 {
  if (!strictUtcTimestamp(input.asOf))
    throw new TypeError('asOf must be an explicit canonical UTC RFC3339 timestamp.');
  const registryIssues = validateRegistry(input.registry, input.environment);
  if (registryIssues.length) throw new TypeError(registryIssues.join('; '));
  const parsed = input.attestations.map((attestation, index) => {
    const result = parseAttestation(attestation);
    return { index, result, canonical: result.ok ? canonicalSerialize(result.value) : '' };
  });
  const idMaterial = new Map<string, Set<string>>();
  for (const item of parsed) {
    const id = item.result.ok
      ? item.result.value.payload.attestationId
      : `${item.result.id}:${item.index}`;
    const materials = idMaterial.get(id) ?? new Set<string>();
    materials.add(item.canonical || `invalid:${item.index}`);
    idMaterial.set(id, materials);
  }
  const seenCanonical = new Set<string>();
  const records: {
    attestationId: string;
    status: 'valid' | 'stale' | 'invalid' | 'duplicate';
    issues: string[];
    value?: SignedReviewAttestationV1;
  }[] = [];
  for (const item of parsed) {
    if (!item.result.ok) {
      records.push({
        attestationId: `${item.result.id}:${item.index}`,
        status: 'invalid',
        issues: [...item.result.issues],
      });
      continue;
    }
    const attestation = item.result.value;
    const payload = attestation.payload;
    const issues: string[] = [];
    const stale: string[] = [];
    if ((idMaterial.get(payload.attestationId)?.size ?? 0) > 1)
      issues.push('attestation ID is reused with different material');
    if (seenCanonical.has(item.canonical)) {
      records.push({
        attestationId: payload.attestationId,
        status: 'duplicate',
        issues: [],
        value: attestation,
      });
      continue;
    }
    seenCanonical.add(item.canonical);
    const reviewer = input.registry.reviewers.find(
      (entry) => entry.reviewerId === payload.reviewerId,
    );
    const key = reviewer?.keys.find((entry) => entry.keyId === payload.keyId);
    if (!reviewer) issues.push('unknown reviewer');
    else {
      if (reviewer.status === 'revoked') issues.push('reviewer is revoked');
      if (!reviewer.allowedScopes.includes(payload.scope))
        issues.push('reviewer is not trusted for this scope');
    }
    if (!key) issues.push('unknown reviewer key');
    else {
      if (key.status === 'revoked') issues.push('reviewer key is revoked');
      if (payload.reviewedAt < key.validFrom) issues.push('attestation predates key validity');
      if (key.validUntil !== undefined && payload.reviewedAt >= key.validUntil)
        issues.push('attestation is outside key validity');
      try {
        const publicKey = createPublicKey({
          key: Buffer.from(key.publicKeySpkiDerBase64, 'base64'),
          format: 'der',
          type: 'spki',
        });
        if (
          !verify(
            null,
            reviewAttestationSigningBytes(payload),
            publicKey,
            Buffer.from(attestation.signature.valueBase64, 'base64'),
          )
        )
          issues.push('Ed25519 signature verification failed');
      } catch {
        issues.push('Ed25519 signature verification failed');
      }
    }
    if (payload.candidateId !== input.candidate.candidateId) stale.push('candidate ID changed');
    if (canonicalSerialize(payload.scenario) !== canonicalSerialize(input.candidate.scenario))
      stale.push('scenario identity changed');
    if (canonicalSerialize(payload.dataset) !== canonicalSerialize(input.candidate.dataset))
      stale.push('dataset identity changed');
    if (payload.materialSetChecksum !== input.candidate.materialSetChecksum)
      stale.push('candidate material changed');
    if (payload.reviewPacketChecksum !== input.packet.reviewPacketChecksum)
      stale.push('review packet changed');
    if (payload.expiresAt !== undefined && payload.expiresAt <= input.asOf)
      stale.push('attestation expired');
    if (payload.reviewedAt > input.asOf)
      stale.push('attestation review time is after the evaluation instant');
    records.push({
      attestationId: payload.attestationId,
      status: issues.length ? 'invalid' : stale.length ? 'stale' : 'valid',
      issues: [...new Set([...issues, ...stale])].sort(),
      value: attestation,
    });
  }
  const validById = new Map(
    records
      .filter((record) => record.status === 'valid' && record.value)
      .map((record) => [record.attestationId, record.value!] as const),
  );
  const initiallyValidById = new Map(validById);
  const supersessionCycleIds = new Set<string>();
  const visited = new Set<string>();
  for (const startId of [...initiallyValidById.keys()].sort()) {
    if (visited.has(startId)) continue;
    const path: string[] = [];
    const pathIndex = new Map<string, number>();
    let currentId: string | undefined = startId;
    while (
      currentId !== undefined &&
      initiallyValidById.has(currentId) &&
      !visited.has(currentId)
    ) {
      const existingIndex = pathIndex.get(currentId);
      if (existingIndex !== undefined) {
        for (const cycleId of path.slice(existingIndex)) supersessionCycleIds.add(cycleId);
        break;
      }
      pathIndex.set(currentId, path.length);
      path.push(currentId);
      currentId = initiallyValidById.get(currentId)!.payload.supersedesAttestationId;
    }
    for (const pathId of path) visited.add(pathId);
  }
  for (const record of records) {
    const payload = record.value?.payload;
    if (record.status !== 'valid' || !payload?.supersedesAttestationId) continue;
    const superseded = initiallyValidById.get(payload.supersedesAttestationId)?.payload;
    if (payload.supersedesAttestationId === payload.attestationId)
      record.issues.push('attestation cannot supersede itself');
    if (supersessionCycleIds.has(payload.attestationId))
      record.issues.push('supersession cycle detected');
    if (
      !superseded ||
      superseded.candidateId !== payload.candidateId ||
      superseded.scope !== payload.scope ||
      superseded.reviewedAt >= payload.reviewedAt
    )
      record.issues.push(
        'supersedes reference must identify a strictly earlier valid attestation in the same candidate and scope',
      );
    if (record.issues.length > 0) {
      record.status = 'invalid';
      validById.delete(record.attestationId);
    }
  }
  let invalidatedReference = true;
  while (invalidatedReference) {
    invalidatedReference = false;
    for (const record of records) {
      const payload = record.value?.payload;
      if (
        record.status !== 'valid' ||
        !payload?.supersedesAttestationId ||
        validById.has(payload.supersedesAttestationId)
      )
        continue;
      record.status = 'invalid';
      record.issues.push(
        'supersedes reference must identify a strictly earlier valid attestation in the same candidate and scope',
      );
      validById.delete(record.attestationId);
      invalidatedReference = true;
    }
  }
  const scopes = PUBLICATION_REVIEW_SCOPES.map((reviewScope) => {
    const current = records
      .filter((record) => record.status === 'valid' && record.value?.payload.scope === reviewScope)
      .sort((left, right) => {
        const leftPayload = left.value!.payload;
        const rightPayload = right.value!.payload;
        if (leftPayload.reviewedAt !== rightPayload.reviewedAt)
          return leftPayload.reviewedAt < rightPayload.reviewedAt ? -1 : 1;
        if (leftPayload.decision !== rightPayload.decision)
          return leftPayload.decision === 'changes-requested' ? 1 : -1;
        return left.attestationId < right.attestationId
          ? -1
          : left.attestationId > right.attestationId
            ? 1
            : 0;
      })
      .at(-1);
    return current
      ? {
          scope: reviewScope,
          decision: current.value!.payload.decision,
          attestationId: current.attestationId,
        }
      : { scope: reviewScope, decision: 'missing' as const };
  });
  const reportIssues = [
    ...records.flatMap((record) =>
      record.status === 'invalid' || record.status === 'stale'
        ? record.issues.map((issue) => `${record.attestationId}: ${issue}`)
        : [],
    ),
    ...scopes
      .filter((item) => item.decision !== 'approved')
      .map((item) =>
        item.decision === 'changes-requested'
          ? `${item.scope}: changes requested supersedes approval`
          : `${item.scope}: approval is missing`,
      ),
  ].sort();
  return Object.freeze({
    schemaVersion: 1,
    candidateId: input.candidate.candidateId,
    asOf: input.asOf,
    complete: reportIssues.length === 0 && scopes.every((item) => item.decision === 'approved'),
    registryChecksum: checksum(input.registry),
    records: records
      .map(({ value: _value, ...record }) => {
        void _value;
        return { ...record, issues: [...new Set(record.issues)].sort() };
      })
      .sort((left, right) =>
        left.attestationId < right.attestationId
          ? -1
          : left.attestationId > right.attestationId
            ? 1
            : 0,
      ),
    scopes,
    issues: [...new Set(reportIssues)],
  }) as AttestationVerificationReportV1;
}

export function verifyProductionReviewAttestations(input: {
  readonly candidate: PublicationCandidateV1;
  readonly packet: ReviewPacketV1;
  readonly attestations: readonly unknown[];
  /** Compatibility only for repository-owned callers; arbitrary production registries are rejected. */
  readonly registry?: TrustedReviewerRegistryV1;
  readonly asOf: string;
}): AttestationVerificationReportV1 {
  if (input.registry !== undefined && input.registry !== PRODUCTION_TRUSTED_REVIEWER_REGISTRY)
    throw new TypeError(
      'Production verification is bound to the repository trusted reviewer registry.',
    );
  const { registry: _registry, ...verificationInput } = input;
  void _registry;
  return verifyWithEnvironment({
    ...verificationInput,
    registry: PRODUCTION_TRUSTED_REVIEWER_REGISTRY,
    environment: 'production',
  });
}

/** Test-only entry point. It is intentionally not exported from the mobile-facing package root. */
export function verifyReviewAttestationsForTesting(input: {
  readonly candidate: PublicationCandidateV1;
  readonly packet: ReviewPacketV1;
  readonly attestations: readonly unknown[];
  readonly registry: TrustedReviewerRegistryV1;
  readonly asOf: string;
}): AttestationVerificationReportV1 {
  return verifyWithEnvironment({ ...input, environment: 'test' });
}
