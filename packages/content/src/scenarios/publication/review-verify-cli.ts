import { canonicalSerialize } from '@chartpath/historical-data';

import { resolvePublicationCandidate } from './candidates.js';
import {
  assertOnlyArguments,
  optionalArgument,
  parseArguments,
  requiredArgument,
} from './cli-arguments.js';
import { verifyProductionReviewAttestations } from './attestation-node.js';
import { findRepositoryRoot, readCanonicalAttestations } from './node-io.js';
import { buildReviewPacket } from './review-packet.js';

const argumentsMap = parseArguments(process.argv.slice(2));
assertOnlyArguments(argumentsMap, ['--candidate', '--as-of', '--attestations']);
const candidateId = requiredArgument(argumentsMap, '--candidate');
const asOf = requiredArgument(argumentsMap, '--as-of');
const repositoryRoot = await findRepositoryRoot();
const attestationsPath = optionalArgument(argumentsMap, '--attestations', 'review-attestations');
const candidate = resolvePublicationCandidate(candidateId);
if (!candidate) throw new TypeError(`Unknown publication candidate ${candidateId}.`);
const attestations = await readCanonicalAttestations(`${repositoryRoot}/${attestationsPath}`);
const report = verifyProductionReviewAttestations({
  candidate,
  packet: buildReviewPacket(candidate),
  attestations,
  asOf,
});
console.log(canonicalSerialize(report));
