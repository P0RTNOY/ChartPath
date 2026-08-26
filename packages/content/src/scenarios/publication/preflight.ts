import { canonicalSerialize } from '@chartpath/historical-data';

import { historicalContentRegistry, validateHistoricalContentRegistry } from '../../historical.js';
import { resolvePublicationCandidate, validatePublicationCandidateRegistry } from './candidates.js';
import { buildReviewPacket } from './review-packet.js';
import {
  PUBLICATION_PREFLIGHT_POLICY_VERSION,
  PUBLICATION_REVIEW_SCOPES,
  type AttestationVerificationReportV1,
  type PublicationGateCategory,
  type PublicationPreflightGateV2,
  type PublicationPreflightReportV1,
  type PublicationPreflightSummaryStatus,
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
  readonly artifactVerification: {
    readonly valid: boolean;
    readonly issues: readonly string[];
  };
  readonly evidence: {
    readonly licensingAndRedistributionAuthorized: boolean;
    readonly nativeLifecycleVerified: boolean;
    readonly accessibilityMatrixVerified: boolean;
    readonly sourceAndHebrewReviewed: boolean;
    readonly executionAndRubricSnapshotsVerified: boolean;
    readonly androidRuntimeLifecycleVerified?: boolean;
    readonly voiceOverVerified?: boolean;
    readonly talkBackVerified?: boolean;
    readonly physicalIosVerified?: boolean;
    readonly physicalAndroidVerified?: boolean;
    readonly backupAndRecoveryVerified?: boolean;
    readonly distributionSigningVerified?: boolean;
  };
}

export function runPublicationPreflight(
  input: PublicationPreflightInputV1,
): PublicationPreflightReportV1 {
  if (!strictUtc(input.asOf))
    throw new TypeError('Preflight asOf must be an explicit canonical UTC RFC3339 timestamp.');
  const gates: PublicationPreflightGateV2[] = [];
  const blockers: {
    code: string;
    category: PublicationGateCategory;
    gateId: string;
    detail: string;
  }[] = [];
  const addGate = (
    gateId: string,
    category: PublicationGateCategory,
    status: PublicationPreflightGateV2['status'],
    detail: string,
    blockerCode?: string,
  ) => {
    gates.push({ gateId, category, required: true, status, detail });
    if (status !== 'passed' && blockerCode)
      blockers.push({ code: blockerCode, category, gateId, detail });
  };
  const candidate = resolvePublicationCandidate(input.candidateId);
  if (!candidate) throw new TypeError(`Unknown publication candidate ${input.candidateId}.`);
  const candidateRegistryIssues = validatePublicationCandidateRegistry();
  addGate(
    'candidate-registry-integrity',
    'machine',
    candidateRegistryIssues.length === 0 ? 'passed' : 'failed',
    candidateRegistryIssues.length === 0
      ? 'The exact three-candidate registry is structurally valid and immutable.'
      : candidateRegistryIssues.join('; '),
    'CANDIDATE_REGISTRY_INVALID',
  );
  const scenarioIdentityMatches =
    candidate.scenario.scenarioId !== input.scenarioId ||
    candidate.scenario.scenarioVersion !== input.scenarioVersion;
  addGate(
    'scenario-identity',
    'machine',
    scenarioIdentityMatches ? 'failed' : 'passed',
    scenarioIdentityMatches
      ? 'Exact scenario ID/version does not match the selected candidate.'
      : 'Exact scenario ID/version matches the selected candidate.',
    'SCENARIO_IDENTITY_MISMATCH',
  );
  const datasetIdentityMatches =
    candidate.dataset.datasetId !== input.datasetId ||
    candidate.dataset.datasetVersion !== input.datasetVersion ||
    candidate.dataset.datasetChecksum !== input.datasetChecksum;
  addGate(
    'dataset-identity',
    'machine',
    datasetIdentityMatches ? 'failed' : 'passed',
    datasetIdentityMatches
      ? 'Exact dataset ID/version/checksum does not match the selected candidate.'
      : 'Exact dataset ID/version/checksum matches the selected candidate.',
    'DATASET_IDENTITY_MISMATCH',
  );
  const regeneratedPacket = buildReviewPacket(candidate);
  const packetMatches = canonicalSerialize(regeneratedPacket) === canonicalSerialize(input.packet);
  addGate(
    'review-packet-freshness',
    'machine',
    packetMatches ? 'passed' : 'failed',
    packetMatches
      ? 'The supplied review packet matches exact deterministic regeneration.'
      : 'The supplied review packet is not the exact regenerated packet.',
    'REVIEW_PACKET_STALE',
  );
  addGate(
    'publication-artifact-integrity',
    'machine',
    input.artifactVerification.valid ? 'passed' : 'failed',
    input.artifactVerification.valid
      ? 'Source, evidence and tracked review-packet artifacts match their pinned bytes.'
      : input.artifactVerification.issues.join('; ') ||
          'Publication artifact verification failed without a diagnostic.',
    'PUBLICATION_ARTIFACT_INTEGRITY_FAILED',
  );
  const attestationIdentityMatches =
    input.attestations.candidateId !== candidate.candidateId ||
    input.attestations.asOf !== input.asOf;
  addGate(
    'attestation-report-identity',
    'human-review',
    attestationIdentityMatches ? 'failed' : 'passed',
    attestationIdentityMatches
      ? 'Attestation verification was performed for a different candidate or evaluation instant.'
      : 'Attestation verification targets the exact candidate and evaluation instant.',
    'ATTESTATION_REPORT_IDENTITY_MISMATCH',
  );
  for (const scope of PUBLICATION_REVIEW_SCOPES) {
    const decision = input.attestations.scopes.find((item) => item.scope === scope)?.decision;
    addGate(
      `review-scope:${scope}`,
      'human-review',
      decision === 'approved' ? 'passed' : 'blocked',
      `${scope}: ${decision ?? 'missing'}`,
      decision === 'changes-requested' ? 'REVIEW_CHANGES_REQUESTED' : 'REVIEW_SCOPE_MISSING',
    );
  }
  addGate(
    'attestation-record-integrity',
    'human-review',
    input.attestations.issues.length === 0 ? 'passed' : 'blocked',
    input.attestations.issues.length === 0
      ? 'No stale, invalid, duplicate-conflict or missing attestation issue was reported.'
      : input.attestations.issues.join('; '),
    'ATTESTATION_INCOMPLETE',
  );
  addGate(
    'licensing-authorization',
    'licensing',
    input.evidence.licensingAndRedistributionAuthorized ? 'passed' : 'blocked',
    input.evidence.licensingAndRedistributionAuthorized
      ? 'A separately authenticated licensing and redistribution decision is recorded.'
      : 'No legitimate licensing and redistribution authorization is recorded.',
    'LICENSING_EVIDENCE_MISSING',
  );
  const failClosedLicensingMaterial =
    candidate.licensing.intendedRedistributionMode !== 'not-authorized' ||
    regeneratedPacket.licensing.currentManifestRedistributionStatus !== 'prohibited' ||
    regeneratedPacket.licensing.currentManifestPublicationStatus !== 'internal';
  addGate(
    'licensing-material-boundary',
    'licensing',
    'blocked',
    failClosedLicensingMaterial
      ? 'Candidate licensing material differs from the fail-closed internal contract.'
      : 'Current immutable material explicitly prohibits redistribution and remains internal.',
    failClosedLicensingMaterial
      ? 'LICENSING_MATERIAL_UNEXPECTED'
      : 'LICENSING_MATERIAL_CHANGE_REQUIRED',
  );
  addGate(
    'ios-standalone-lifecycle',
    'native-runtime',
    input.evidence.nativeLifecycleVerified ? 'passed' : 'not-run',
    input.evidence.nativeLifecycleVerified
      ? 'Exact standalone iOS candidate lifecycles are verified.'
      : 'Exact standalone iOS candidate lifecycle evidence is incomplete.',
    'NATIVE_LIFECYCLE_EVIDENCE_MISSING',
  );
  addGate(
    'android-runtime-lifecycle',
    'native-runtime',
    input.evidence.androidRuntimeLifecycleVerified ? 'passed' : 'not-run',
    input.evidence.androidRuntimeLifecycleVerified
      ? 'Exact standalone Android lifecycle evidence is verified.'
      : 'No authorized ChartPath Android runtime lifecycle has been completed.',
    'ANDROID_RUNTIME_EVIDENCE_MISSING',
  );
  addGate(
    'native-backup-and-recovery',
    'native-runtime',
    input.evidence.backupAndRecoveryVerified ? 'passed' : 'not-run',
    input.evidence.backupAndRecoveryVerified
      ? 'Native backup exclusion and encrypted user-controlled recovery are verified.'
      : 'Combined native backup-exclusion and encrypted recovery evidence is incomplete.',
    'RECOVERY_NATIVE_EVIDENCE_MISSING',
  );
  addGate(
    'os-accessibility-matrix',
    'accessibility',
    input.evidence.accessibilityMatrixVerified ? 'passed' : 'not-run',
    input.evidence.accessibilityMatrixVerified
      ? 'The required native OS accessibility matrix is verified.'
      : 'Required native OS accessibility evidence is incomplete.',
    'ACCESSIBILITY_EVIDENCE_MISSING',
  );
  addGate(
    'voiceover',
    'accessibility',
    input.evidence.voiceOverVerified ? 'passed' : 'not-run',
    input.evidence.voiceOverVerified
      ? 'A real VoiceOver focus and speech pass is recorded.'
      : 'A real VoiceOver focus and speech pass is still required.',
    'VOICEOVER_EVIDENCE_MISSING',
  );
  addGate(
    'talkback',
    'accessibility',
    input.evidence.talkBackVerified ? 'passed' : 'not-run',
    input.evidence.talkBackVerified
      ? 'A real TalkBack focus and speech pass is recorded.'
      : 'A real TalkBack focus and speech pass is still required.',
    'TALKBACK_EVIDENCE_MISSING',
  );
  addGate(
    'physical-ios-device',
    'physical-device',
    input.evidence.physicalIosVerified ? 'passed' : 'not-run',
    input.evidence.physicalIosVerified
      ? 'The bounded physical iPhone lifecycle and ergonomics pass is verified.'
      : 'The bounded physical iPhone pass is incomplete.',
    'PHYSICAL_IOS_EVIDENCE_MISSING',
  );
  addGate(
    'physical-android-device',
    'physical-device',
    input.evidence.physicalAndroidVerified ? 'passed' : 'not-run',
    input.evidence.physicalAndroidVerified
      ? 'The bounded physical Android lifecycle and ergonomics pass is verified.'
      : 'No authorized physical Android pass is recorded.',
    'PHYSICAL_ANDROID_EVIDENCE_MISSING',
  );
  addGate(
    'source-hebrew-supporting-evidence',
    'human-review',
    input.evidence.sourceAndHebrewReviewed ? 'passed' : 'blocked',
    input.evidence.sourceAndHebrewReviewed
      ? 'Independent source and Hebrew supporting evidence is recorded.'
      : 'Independent source and Hebrew review evidence is incomplete.',
    'SOURCE_HEBREW_EVIDENCE_MISSING',
  );
  addGate(
    'execution-rubric-supporting-evidence',
    'human-review',
    input.evidence.executionAndRubricSnapshotsVerified ? 'passed' : 'blocked',
    input.evidence.executionAndRubricSnapshotsVerified
      ? 'Execution and process-rubric supporting evidence is recorded.'
      : 'Execution and process-rubric snapshot review is incomplete.',
    'EXECUTION_RUBRIC_EVIDENCE_MISSING',
  );
  const ordinary = validateHistoricalContentRegistry(historicalContentRegistry);
  const ordinaryCatalogIsolated = !(
    ordinary.publishable ||
    ordinary.counts.courseCreditEligible !== 0 ||
    historicalContentRegistry.scenarios.some(
      (scenario) =>
        scenario.scenarioId === candidate.scenario.scenarioId &&
        scenario.scenarioVersion === candidate.scenario.scenarioVersion,
    )
  );
  addGate(
    'ordinary-catalog-isolation',
    'machine',
    ordinaryCatalogIsolated ? 'passed' : 'failed',
    ordinaryCatalogIsolated
      ? 'Publication candidates remain outside the ordinary learner registry and grant no credit.'
      : 'Publication candidate entered the ordinary learner registry.',
    'ORDINARY_CATALOG_BOUNDARY_BROKEN',
  );
  addGate(
    'internal-reviewer-configuration',
    'distribution',
    ordinaryCatalogIsolated && candidate.state === 'publication-candidate' ? 'passed' : 'failed',
    ordinaryCatalogIsolated && candidate.state === 'publication-candidate'
      ? 'The local reviewer-only candidate configuration is isolated and no-credit.'
      : 'The reviewer-only candidate configuration is not safely isolated.',
    'INTERNAL_REVIEWER_CONFIGURATION_INVALID',
  );
  addGate(
    'distribution-signing',
    'distribution',
    input.evidence.distributionSigningVerified ? 'passed' : 'not-run',
    input.evidence.distributionSigningVerified
      ? 'Separately authorized distribution signing evidence is recorded.'
      : 'Distribution signing, upload and store submission are not authorized or complete.',
    'DISTRIBUTION_GATE_OPEN',
  );
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
  const sortedGates = [...gates].sort((left, right) =>
    left.category !== right.category
      ? left.category < right.category
        ? -1
        : 1
      : left.gateId < right.gateId
        ? -1
        : left.gateId > right.gateId
          ? 1
          : 0,
  );
  const machineClosed = sortedGates
    .filter((gate) => gate.category === 'machine')
    .every((gate) => gate.status === 'passed');
  const humanPending = sortedGates
    .filter((gate) => gate.category === 'human-review')
    .some((gate) => gate.status !== 'passed');
  const summaryStatuses: PublicationPreflightSummaryStatus[] = [
    machineClosed ? 'MACHINE_GATES_CLOSED' : 'MACHINE_GATES_OPEN',
    'NATIVE_VERIFICATION_PARTIAL',
    ...(humanPending ? (['EXTERNAL_REVIEW_PENDING'] as const) : []),
    ...(machineClosed ? (['INTERNAL_REVIEW_BUILD_READY'] as const) : []),
    'PUBLICATION_NO_GO',
  ];
  return Object.freeze({
    schemaVersion: 2,
    policyVersion: PUBLICATION_PREFLIGHT_POLICY_VERSION,
    mode: 'dry-run',
    candidateId: candidate.candidateId,
    asOf: input.asOf,
    eligible: false,
    status: 'PUBLICATION_NO_GO',
    summaryStatuses,
    reviewPacketChecksum: regeneratedPacket.reviewPacketChecksum,
    materialSetChecksum: candidate.materialSetChecksum,
    gates: sortedGates,
    blockers: sorted,
    sideEffects: [] as const,
  });
}
