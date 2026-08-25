import { canonicalSerialize } from '@chartpath/historical-data';

import {
  buildBlindScenarioPositionManagementPreview,
  scenarioPositionManagementVariantRegistry,
} from './management.js';
import { buildScenarioPreview, scenarioCandidateRegistry } from './registry.js';

console.log(
  canonicalSerialize({
    learnerScenarios: scenarioCandidateRegistry.map(buildScenarioPreview),
    positionManagement: scenarioPositionManagementVariantRegistry.map((variant) =>
      buildBlindScenarioPositionManagementPreview(variant.scenarioId, variant.scenarioVersion),
    ),
  }),
);
