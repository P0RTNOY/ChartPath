import { canonicalSerialize } from '@chartpath/historical-data';

import { historicalContentRegistry, validateHistoricalContentRegistry } from '../../historical.js';
import { resolvePublicationCandidate, validatePublicationCandidateRegistry } from './candidates.js';
import { buildReviewPacket } from './review-packet.js';
import {
  PUBLICATION_PREFLIGHT_POLICY_VERSION,
  PUBLICATION_REVIEW_SCOPES,
  type AttestationVerificationReportV1,
  type PublicationPreflightReportV1,
  type ReviewPacketV1,
} from './types.js';

function strictUtc(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

export interface PublicationPreflightInputV1 {
  readonly candidateId: string;
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly datasetChecksum: string;
  readonly asOf: string;
  readonly packet: ReviewPacketV1;
  readonly attestations: AttestationVerificationReportV1;
  readonly evidence: {
    readonly licensingAndRedistributionAuthorized: boolean;
    readonly nativeLifecycleVerified: boolean;
    readonly accessibilityMatrixVerified: boolean;
    readonly sourceAndHebrewReviewed: boolean;
    readonly executionAndRubricSnapshotsVerified: boolean;
  };
}

export function runPublicationPreflight(
  input: PublicationPreflightInputV1,
): PublicationPreflightReportV1 {
  if (!strictUtc(input.asOf))
    throw new TypeError('Preflight asOf must be an explicit canonical UTC RFC3339 timestamp.');
  const blockers: { code: string; detail: string }[] = [];
  const candidate = resolvePublicationCandidate(input.candidateId);
  if (!candidate) throw new TypeError(`Unknown publication candidate ${input.candidateId}.`);
  for (const issue of validatePublicationCandidateRegistry())
    blockers.push({ code: 'CANDIDATE_REGISTRY_INVALID', detail: issue });
  if (
    candidate.scenario.scenarioId !== input.scenarioId ||
    candidate.scenario.scenarioVersion !== input.scenarioVersion
  )
    blockers.push({
      code: 'SCENARIO_IDENTITY_MISMATCH',
      detail: 'Exact scenario ID/version does not match the selected candidate.',
    });
  if (
    candidate.dataset.datasetId !== input.datasetId ||
    candidate.dataset.datasetVersion !== input.datasetVersion ||
    candidate.dataset.datasetChecksum !== input.datasetChecksum
  )
    blockers.push({
      code: 'DATASET_IDENTITY_MISMATCH',
      detail: 'Exact dataset ID/version/checksum does not match the selected candidate.',
    });
  const regeneratedPacket = buildReviewPacket(candidate);
  if (canonicalSerialize(regeneratedPacket) !== canonicalSerialize(input.packet))
    blockers.push({
      code: 'REVIEW_PACKET_STALE',
      detail: 'The supplied review packet is not the exact regenerated packet.',
    });
  if (
    input.attestations.candidateId !== candidate.candidateId ||
    input.attestations.asOf !== input.asOf
  )
    blockers.push({
      code: 'ATTESTATION_REPORT_IDENTITY_MISMATCH',
      detail:
        'Attestation verification was performed for a different candidate or evaluation instant.',
    });
  for (const scope of PUBLICATION_REVIEW_SCOPES) {
    const decision = input.attestations.scopes.find((item) => item.scope === scope)?.decision;
    if (decision !== 'approved')
      blockers.push({
        code:
          decision === 'changes-requested' ? 'REVIEW_CHANGES_REQUESTED' : 'REVIEW_SCOPE_MISSING',
        detail: `${scope}: ${decision ?? 'missing'}`,
      });
  }
  for (const issue of input.attestations.issues)
    blockers.push({ code: 'ATTESTATION_INCOMPLETE', detail: issue });
  if (!input.evidence.licensingAndRedistributionAuthorized)
    blockers.push({
      code: 'LICENSING_EVIDENCE_MISSING',
      detail: 'No legitimate licensing and redistribution authorization is recorded.',
    });
  if (
    candidate.licensing.intendedRedistributionMode !== 'not-authorized' ||
    regeneratedPacket.licensing.currentManifestRedistributionStatus !== 'prohibited' ||
    regeneratedPacket.licensing.currentManifestPublicationStatus !== 'internal'
  )
    blockers.push({
      code: 'LICENSING_MATERIAL_UNEXPECTED',
      detail: 'Candidate licensing material differs from the fail-closed internal contract.',
    });
  else
    blockers.push({
      code: 'LICENSING_MATERIAL_CHANGE_REQUIRED',
      detail:
        'Current immutable material explicitly prohibits redistribution and remains internal.',
    });
  if (!input.evidence.nativeLifecycleVerified)
    blockers.push({
      code: 'NATIVE_LIFECYCLE_EVIDENCE_MISSING',
      detail: 'Exact candidate native lifecycle evidence is incomplete.',
    });
  if (!input.evidence.accessibilityMatrixVerified)
    blockers.push({
      code: 'ACCESSIBILITY_EVIDENCE_MISSING',
      detail: 'Required screen-reader and OS-accessibility evidence is incomplete.',
    });
  if (!input.evidence.sourceAndHebrewReviewed)
    blockers.push({
      code: 'SOURCE_HEBREW_EVIDENCE_MISSING',
      detail: 'Independent source and Hebrew review evidence is incomplete.',
    });
  if (!input.evidence.executionAndRubricSnapshotsVerified)
    blockers.push({
      code: 'EXECUTION_RUBRIC_EVIDENCE_MISSING',
      detail: 'Execution and process-rubric snapshot review is incomplete.',
    });
  const ordinary = validateHistoricalContentRegistry(historicalContentRegistry);
  if (
    ordinary.publishable ||
    ordinary.counts.courseCreditEligible !== 0 ||
    historicalContentRegistry.scenarios.some(
      (scenario) =>
        scenario.scenarioId === candidate.scenario.scenarioId &&
        scenario.scenarioVersion === candidate.scenario.scenarioVersion,
    )
  )
    blockers.push({
      code: 'ORDINARY_CATALOG_BOUNDARY_BROKEN',
      detail: 'Publication candidate entered the ordinary learner registry.',
    });
  const sorted = [
    ...new Map(blockers.map((blocker) => [`${blocker.code}\0${blocker.detail}`, blocker])).values(),
  ].sort((left, right) =>
    left.code !== right.code
      ? left.code < right.code
        ? -1
        : 1
      : left.detail < right.detail
        ? -1
        : left.detail > right.detail
          ? 1
          : 0,
  );
  return Object.freeze({
    schemaVersion: 1,
    policyVersion: PUBLICATION_PREFLIGHT_POLICY_VERSION,
    mode: 'dry-run',
    candidateId: candidate.candidateId,
    asOf: input.asOf,
    eligible: false,
    status: 'NO-GO',
    reviewPacketChecksum: regeneratedPacket.reviewPacketChecksum,
    materialSetChecksum: candidate.materialSetChecksum,
    blockers: sorted,
    sideEffects: [] as const,
  });
}
