import { REVIEW_ATTESTATION_POLICY_VERSION, type TrustedReviewerRegistryV1 } from './types.js';

/**
 * Repository root of trust for real candidate review. It is deliberately empty until legitimate
 * external reviewers provide public Ed25519 keys through an independently reviewed change.
 * Private keys and test-fixture keys are not valid members of this registry.
 */
export const PRODUCTION_TRUSTED_REVIEWER_REGISTRY: TrustedReviewerRegistryV1 = Object.freeze({
  schemaVersion: 1,
  environment: 'production',
  policyVersion: REVIEW_ATTESTATION_POLICY_VERSION,
  reviewers: Object.freeze([]),
});
