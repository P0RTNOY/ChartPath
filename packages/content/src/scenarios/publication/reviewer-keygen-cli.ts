import { canonicalSerialize } from '@chartpath/historical-data';

import { assertOnlyArguments, parseArguments, requiredArgument } from './cli-arguments.js';
import { findRepositoryRoot } from './node-io.js';
import { generateReviewerKeyMaterial } from './reviewer-keygen-node.js';

const argumentsMap = parseArguments(process.argv.slice(2));
assertOnlyArguments(argumentsMap, ['--private-key-out']);
const result = await generateReviewerKeyMaterial({
  repositoryRoot: await findRepositoryRoot(),
  privateKeyOutputPath: requiredArgument(argumentsMap, '--private-key-out'),
});

// The result deliberately contains public metadata and the destination path only, never key bytes.
console.log(canonicalSerialize(result));
