import { canonicalSerialize } from '@chartpath/historical-data';

import { verifyProductionReviewAttestations } from './attestation-node.js';
import { resolvePublicationCandidate } from './candidates.js';
import {
  assertOnlyArguments,
  optionalArgument,
  parseArguments,
  requiredArgument,
} from './cli-arguments.js';
import {
  findRepositoryRoot,
  readCanonicalAttestations,
  readTrustedReviewerRegistry,
} from './node-io.js';
import { runPublicationPreflight } from './preflight.js';
import { buildReviewPacket } from './review-packet.js';
import { PRODUCTION_TRUSTED_REVIEWER_REGISTRY } from './trusted-reviewers.js';

const argumentsMap = parseArguments(process.argv.slice(2));
assertOnlyArguments(argumentsMap, [
  '--dry-run',
  '--candidate',
  '--scenario-id',
  '--scenario-version',
  '--dataset-id',
  '--dataset-version',
  '--dataset-checksum',
  '--as-of',
  '--attestations',
  '--registry',
]);
if (argumentsMap.get('--dry-run') !== true)
  throw new TypeError('Only the explicit --dry-run promotion workflow is implemented.');
const candidateId = requiredArgument(argumentsMap, '--candidate');
const asOf = requiredArgument(argumentsMap, '--as-of');
const candidate = resolvePublicationCandidate(candidateId);
if (!candidate) throw new TypeError(`Unknown publication candidate ${candidateId}.`);
const repositoryRoot = await findRepositoryRoot();
const attestations = await readCanonicalAttestations(
  `${repositoryRoot}/${optionalArgument(argumentsMap, '--attestations', 'review-attestations')}`,
);
const registryPath = argumentsMap.get('--registry');
if (registryPath !== undefined && typeof registryPath !== 'string')
  throw new TypeError('Argument --registry requires a value.');
const registry = registryPath
  ? await readTrustedReviewerRegistry(`${repositoryRoot}/${registryPath}`)
  : PRODUCTION_TRUSTED_REVIEWER_REGISTRY;
const packet = buildReviewPacket(candidate);
const verification = verifyProductionReviewAttestations({
  candidate,
  packet,
  attestations,
  registry,
  asOf,
});
const report = runPublicationPreflight({
  candidateId,
  scenarioId: requiredArgument(argumentsMap, '--scenario-id'),
  scenarioVersion: requiredArgument(argumentsMap, '--scenario-version'),
  datasetId: requiredArgument(argumentsMap, '--dataset-id'),
  datasetVersion: requiredArgument(argumentsMap, '--dataset-version'),
  datasetChecksum: requiredArgument(argumentsMap, '--dataset-checksum'),
  asOf,
  packet,
  attestations: verification,
  evidence: {
    licensingAndRedistributionAuthorized: false,
    nativeLifecycleVerified: false,
    accessibilityMatrixVerified: false,
    sourceAndHebrewReviewed: false,
    executionAndRubricSnapshotsVerified: false,
  },
});
console.log(canonicalSerialize(report));
