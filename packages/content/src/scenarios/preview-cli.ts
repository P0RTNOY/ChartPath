import { canonicalSerialize } from '@chartpath/historical-data';

import { buildScenarioPreview, scenarioCandidateRegistry } from './registry.js';

console.log(canonicalSerialize(scenarioCandidateRegistry.map(buildScenarioPreview)));
