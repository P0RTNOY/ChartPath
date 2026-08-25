import { canonicalSerialize } from '@chartpath/historical-data';

import { scenarioPositionManagementReport } from './management.js';
import { scenarioLibraryReport } from './registry.js';

console.log(
  canonicalSerialize({
    scenarioLibrary: scenarioLibraryReport,
    positionManagement: scenarioPositionManagementReport,
  }),
);
