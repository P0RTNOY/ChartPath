import { canonicalSerialize } from '@chartpath/historical-data';

import { assertOnlyArguments, optionalArgument, parseArguments } from './cli-arguments.js';
import {
  REVIEW_PACKET_OUTPUT_DIRECTORY,
  findRepositoryRoot,
  verifyPublicationArtifacts,
  writeReviewPacketArtifacts,
} from './node-io.js';
import { buildReviewPacketArtifacts } from './review-packet.js';

const argumentsMap = parseArguments(process.argv.slice(2));
assertOnlyArguments(argumentsMap, ['--out', '--check']);
if (argumentsMap.get('--check') !== undefined && argumentsMap.get('--check') !== true)
  throw new TypeError('--check does not accept a value.');
const checkOnly = argumentsMap.get('--check') === true;
const outputDirectory = optionalArgument(argumentsMap, '--out', REVIEW_PACKET_OUTPUT_DIRECTORY);
const repositoryRoot = await findRepositoryRoot();
const bundles = buildReviewPacketArtifacts();
if (!checkOnly) await writeReviewPacketArtifacts({ repositoryRoot, outputDirectory, bundles });
const verification = await verifyPublicationArtifacts({
  repositoryRoot,
  outputDirectory,
  bundles,
});
console.log(
  canonicalSerialize({
    schemaVersion: 1,
    deterministic: true,
    publishable: false,
    mode: checkOnly ? 'check' : 'write',
    outputDirectory,
    verification,
  }),
);
if (!verification.valid) process.exitCode = 1;
