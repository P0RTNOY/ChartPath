import { canonicalSerialize } from '@chartpath/historical-data';

import { resolvePublicationCandidate } from './candidates.js';
import {
  assertOnlyArguments,
  optionalArgument,
  parseArguments,
  requiredArgument,
} from './cli-arguments.js';
import { verifyProductionReviewAttestations } from './attestation-node.js';
import {
  findRepositoryRoot,
  readCanonicalAttestations,
  readTrustedReviewerRegistry,
} from './node-io.js';
import { buildReviewPacket } from './review-packet.js';
import { PRODUCTION_TRUSTED_REVIEWER_REGISTRY } from './trusted-reviewers.js';

const argumentsMap = parseArguments(process.argv.slice(2));
assertOnlyArguments(argumentsMap, ['--candidate', '--as-of', '--attestations', '--registry']);
const candidateId = requiredArgument(argumentsMap, '--candidate');
const asOf = requiredArgument(argumentsMap, '--as-of');
const repositoryRoot = await findRepositoryRoot();
const attestationsPath = optionalArgument(argumentsMap, '--attestations', 'review-attestations');
const registryPath = argumentsMap.get('--registry');
if (registryPath !== undefined && typeof registryPath !== 'string')
  throw new TypeError('Argument --registry requires a value.');
const candidate = resolvePublicationCandidate(candidateId);
if (!candidate) throw new TypeError(`Unknown publication candidate ${candidateId}.`);
const attestations = await readCanonicalAttestations(`${repositoryRoot}/${attestationsPath}`);
const registry = registryPath
  ? await readTrustedReviewerRegistry(`${repositoryRoot}/${registryPath}`)
  : PRODUCTION_TRUSTED_REVIEWER_REGISTRY;
const report = verifyProductionReviewAttestations({
  candidate,
  packet: buildReviewPacket(candidate),
  attestations,
  registry,
  asOf,
});
console.log(canonicalSerialize(report));
