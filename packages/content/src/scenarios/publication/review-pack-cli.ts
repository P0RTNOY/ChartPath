import { canonicalSerialize } from '@chartpath/historical-data';

import { publicationCandidateEvidence } from './candidates.js';
import { assertOnlyArguments, optionalArgument, parseArguments } from './cli-arguments.js';
import { findRepositoryRoot, verifyEvidenceFiles, writeReviewPacketArtifacts } from './node-io.js';
import { buildReviewPacketArtifacts } from './review-packet.js';

const argumentsMap = parseArguments(process.argv.slice(2));
assertOnlyArguments(argumentsMap, ['--out']);
const outputDirectory = optionalArgument(argumentsMap, '--out', 'review-packets');
const repositoryRoot = await findRepositoryRoot();
await verifyEvidenceFiles(repositoryRoot, Object.values(publicationCandidateEvidence).flat());
const bundles = buildReviewPacketArtifacts();
const written = await writeReviewPacketArtifacts({ repositoryRoot, outputDirectory, bundles });
console.log(
  canonicalSerialize({
    schemaVersion: 1,
    deterministic: true,
    publishable: false,
    outputDirectory,
    indexPath: written.indexPath.slice(repositoryRoot.length + 1),
    index: written.index,
  }),
);
