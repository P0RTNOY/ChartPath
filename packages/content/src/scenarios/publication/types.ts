import type { Sha256Checksum } from '@chartpath/historical-data';

export const PUBLICATION_CANDIDATE_SCHEMA_VERSION = 1 as const;
export const REVIEW_PACKET_CONTRACT_VERSION = 'review-packet-v1' as const;
export const REVIEW_ATTESTATION_CONTRACT_VERSION = 'review-attestation-v1' as const;
export const REVIEW_ATTESTATION_POLICY_VERSION = 'review-attestation-policy-v1' as const;
export const PUBLICATION_PREFLIGHT_POLICY_VERSION = 'publication-preflight-policy-v1' as const;

export const PUBLICATION_REVIEW_SCOPES = [
  'source',
  'rubric',
  'execution',
  'accessibility',
  'hebrew',
  'financial-safety',
  'licensing',
  'publication',
] as const;

export type PublicationReviewScope = (typeof PUBLICATION_REVIEW_SCOPES)[number];
export type PublicationCandidateState =
  'internal-qa' | 'publication-candidate' | 'approved' | 'published' | 'retired';

export interface ExactScenarioIdentityV1 {
  readonly scenarioId: string;
  readonly scenarioVersion: string;
}

export interface ExactDatasetIdentityV1 {
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly datasetChecksum: Sha256Checksum;
}

export interface PublicationCandidateV1 {
  readonly schemaVersion: typeof PUBLICATION_CANDIDATE_SCHEMA_VERSION;
  readonly candidateId: string;
  readonly state: 'publication-candidate';
  readonly kind: 'base-scenario' | 'position-management';
  readonly decisionKind: 'long' | 'short' | 'no-trade';
  readonly scenario: ExactScenarioIdentityV1;
  readonly dataset: ExactDatasetIdentityV1;
  readonly generatorSeed: number;
  readonly baseScenario: ExactScenarioIdentityV1 & {
    readonly materialArtifactChecksum: Sha256Checksum;
    readonly dataset: ExactDatasetIdentityV1;
  };
  readonly management?: {
    readonly materialArtifactChecksum: Sha256Checksum;
    readonly policyVersion: string;
    readonly permissionVersion: string;
    readonly datasetDerivation: {
      readonly schemaVersion: 1;
      readonly recipeVersion: 'management-future-candle-replacement-v1';
      readonly lastPreservedCandleIndex: number;
      readonly replacements: readonly {
        readonly candleIndex: number;
        readonly open: number;
        readonly high: number;
        readonly low: number;
        readonly close: number;
      }[];
      readonly recipeChecksum: Sha256Checksum;
    };
  };
  readonly materialSetChecksum: Sha256Checksum;
  readonly selectionRationaleHe: string;
  readonly requiredReviewScopes: typeof PUBLICATION_REVIEW_SCOPES;
  readonly licensing: {
    readonly syntheticDatasetOrigin: 'chartpath-generated';
    readonly chartGeometryCopied: false;
    readonly proseCopied: false;
    readonly generatedDataRightsStatus: 'human-decision-required';
    readonly sourceAdaptationRightsStatus: 'human-decision-required';
    readonly intendedRedistributionMode: 'not-authorized';
  };
}

export interface ReviewEvidenceFileV1 {
  readonly evidenceId: string;
  readonly kind: 'browser-screenshot' | 'simulator-screenshot' | 'document' | 'test';
  readonly path: string;
  readonly checksum: Sha256Checksum;
  readonly sizeBytes: number;
  readonly widthPixels?: number;
  readonly heightPixels?: number;
  readonly status: 'verified' | 'supporting-only' | 'open';
  readonly descriptionHe: string;
}

export interface ReviewPacketMaterialV1 {
  readonly schemaVersion: 1;
  readonly contractVersion: typeof REVIEW_PACKET_CONTRACT_VERSION;
  readonly canonicalization: 'canonical-json-v1';
  readonly candidate: PublicationCandidateV1;
  readonly compiler: {
    readonly scenarioCompilerVersion: string;
    readonly scenarioCompilerContractChecksum: Sha256Checksum;
    readonly chartGeneratorVersion: string;
  };
  readonly datasetProvenance: {
    readonly generatorSeed: number;
    readonly chartSpec: unknown;
    readonly chartSpecChecksum: Sha256Checksum;
    readonly datasetManifest: unknown;
    readonly futurePatchRecipe?: NonNullable<
      PublicationCandidateV1['management']
    >['datasetDerivation'];
  };
  readonly replay: {
    readonly decisionCandleIndex: number;
    readonly initialVisibleRange: {
      readonly startCandleIndex: number;
      readonly endCandleIndex: number;
    };
    readonly permittedReplayBoundaryIndex: number;
    readonly knowledgeCutoffIndex: number;
    readonly blind: true;
    readonly reveal: 'after-finalization';
  };
  readonly learnerMaterial: {
    readonly titleHe: string;
    readonly promptHe: string;
    readonly hintsHe: readonly string[];
    readonly blindEvidenceSummaryHe: string;
    readonly workflowPromptsHe: Readonly<Record<string, string>>;
    readonly financialSafetyDisclosureHe: string;
  };
  readonly guidedAnalysis: {
    readonly enabled: boolean;
    readonly availableHintCount: number;
    readonly preservesDecisionCutoff: true;
  };
  readonly privateReviewerEvidence: {
    readonly correctDecision: unknown;
    readonly processRubric: unknown;
    readonly paperExecutionConfiguration?: unknown;
    readonly expectedBaseExecution?: unknown;
    readonly positionManagementConfiguration?: unknown;
    readonly initialPaperPlan?: unknown;
    readonly expectedManagementCases?: unknown;
    readonly ambiguityEvidence: readonly string[];
    readonly profitAndLossAffectsScore: false;
  };
  readonly sourceProvenance: {
    readonly sourceId: string;
    readonly pdfDocumentId: string;
    readonly sourcePdfChecksum: Sha256Checksum;
    readonly physicalPages: { readonly start: number; readonly end: number };
    readonly printedPages: { readonly start: number; readonly end: number };
    readonly chapter: string;
    readonly figureOrCase: string;
    readonly reviewedContentIds: readonly string[];
    readonly concept: string;
    readonly originalSummaryHe: string;
    readonly sourcePdfRightsStatus: 'human-decision-required';
  };
  readonly licensing: PublicationCandidateV1['licensing'] & {
    readonly currentManifestRedistributionStatus: string;
    readonly currentManifestPublicationStatus: string;
    readonly unresolvedQuestionsHe: readonly string[];
  };
  readonly accessibility: {
    readonly chartAlternativeHe: string;
    readonly interactionInstructionsHe: string;
    readonly readingOrder: 'rtl';
    readonly numericDirection: 'ltr';
    readonly preservesBlindness: true;
    readonly reviewerHebrewStrings: readonly string[];
    readonly nativeVerificationStatus: 'open';
  };
  readonly evidenceFiles: readonly ReviewEvidenceFileV1[];
  readonly automatedTestReferences: readonly string[];
  readonly componentChecksums: readonly {
    readonly componentId: string;
    readonly checksum: Sha256Checksum;
  }[];
  readonly remainingBlockers: readonly {
    readonly blockerId: string;
    readonly resolutionKind: 'external-attestation' | 'external-evidence' | 'material-change';
    readonly descriptionHe: string;
  }[];
}

export interface ReviewPacketV1 extends ReviewPacketMaterialV1 {
  readonly reviewPacketChecksum: Sha256Checksum;
}

export interface ReviewPacketArtifactIndexV1 {
  readonly schemaVersion: 1;
  readonly contractVersion: typeof REVIEW_PACKET_CONTRACT_VERSION;
  readonly artifacts: readonly {
    readonly candidateId: string;
    readonly reviewPacketChecksum: Sha256Checksum;
    readonly json: {
      readonly path: string;
      readonly checksum: Sha256Checksum;
      readonly sizeBytes: number;
    };
    readonly markdown: {
      readonly path: string;
      readonly checksum: Sha256Checksum;
      readonly sizeBytes: number;
    };
  }[];
}

export interface ReviewAttestationPayloadV1 {
  readonly schemaVersion: 1;
  readonly contractVersion: typeof REVIEW_ATTESTATION_CONTRACT_VERSION;
  readonly attestationId: string;
  readonly reviewerId: string;
  readonly keyId: string;
  readonly scope: PublicationReviewScope;
  readonly candidateId: string;
  readonly scenario: ExactScenarioIdentityV1;
  readonly dataset: ExactDatasetIdentityV1;
  readonly materialSetChecksum: Sha256Checksum;
  readonly reviewPacketChecksum: Sha256Checksum;
  readonly decision: 'approved' | 'changes-requested';
  readonly reviewedAt: string;
  readonly expiresAt?: string;
  readonly supersedesAttestationId?: string;
  readonly policyVersion: typeof REVIEW_ATTESTATION_POLICY_VERSION;
  readonly note: string;
}

export interface SignedReviewAttestationV1 {
  readonly payload: ReviewAttestationPayloadV1;
  readonly signature: {
    readonly algorithm: 'Ed25519';
    readonly valueBase64: string;
  };
}

export interface TrustedReviewerKeyV1 {
  readonly keyId: string;
  readonly algorithm: 'Ed25519';
  readonly publicKeySpkiDerBase64: string;
  readonly publicKeyFingerprint: Sha256Checksum;
  readonly validFrom: string;
  readonly validUntil?: string;
  readonly status: 'active' | 'revoked';
  readonly revokedAt?: string;
}

export interface TrustedReviewerV1 {
  readonly reviewerId: string;
  readonly reviewerKind: 'external-human' | 'test-fixture';
  readonly status: 'active' | 'revoked';
  readonly allowedScopes: readonly PublicationReviewScope[];
  readonly keys: readonly TrustedReviewerKeyV1[];
}

export interface TrustedReviewerRegistryV1 {
  readonly schemaVersion: 1;
  readonly environment: 'production' | 'test';
  readonly policyVersion: typeof REVIEW_ATTESTATION_POLICY_VERSION;
  readonly reviewers: readonly TrustedReviewerV1[];
}

export interface AttestationVerificationReportV1 {
  readonly schemaVersion: 1;
  readonly candidateId: string;
  readonly asOf: string;
  readonly complete: boolean;
  readonly registryChecksum: Sha256Checksum;
  readonly records: readonly {
    readonly attestationId: string;
    readonly status: 'valid' | 'stale' | 'invalid' | 'duplicate';
    readonly issues: readonly string[];
  }[];
  readonly scopes: readonly {
    readonly scope: PublicationReviewScope;
    readonly decision: 'approved' | 'changes-requested' | 'missing';
    readonly attestationId?: string;
  }[];
  readonly issues: readonly string[];
}

export interface PublicationPreflightReportV1 {
  readonly schemaVersion: 1;
  readonly policyVersion: typeof PUBLICATION_PREFLIGHT_POLICY_VERSION;
  readonly mode: 'dry-run';
  readonly candidateId: string;
  readonly asOf: string;
  readonly eligible: false;
  readonly status: 'NO-GO';
  readonly reviewPacketChecksum: Sha256Checksum;
  readonly materialSetChecksum: Sha256Checksum;
  readonly blockers: readonly { readonly code: string; readonly detail: string }[];
  readonly sideEffects: readonly [];
}
