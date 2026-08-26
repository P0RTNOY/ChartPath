import { canonicalSerialize } from '@chartpath/historical-data';

import {
  publicationCandidateRegistry,
  validatePublicationCandidateRegistry,
} from './candidates.js';

const issues = validatePublicationCandidateRegistry();
if (issues.length) throw new Error(issues.join('; '));
console.log(
  canonicalSerialize({
    schemaVersion: 1,
    valid: true,
    publishable: false,
    counts: { candidates: 3, long: 1, short: 1, noTrade: 1 },
    candidates: publicationCandidateRegistry,
  }),
);
