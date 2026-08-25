import {
  validateHistoricalContentRegistry,
  internalHistoricalContentRegistry,
} from '../historical.js';
import {
  buildScenarioPositionManagementExtension,
  scenarioPositionManagementReport,
  scenarioPositionManagementVariantRegistry,
} from './management.js';
import { parseScenarioPositionManagementExtension } from './management-schema.js';
import { scenarioLibraryReport } from './registry.js';

console.log(
  `Scenario library: ${scenarioLibraryReport.counts.total} candidates (${scenarioLibraryReport.counts.long} long / ${scenarioLibraryReport.counts.short} short / ${scenarioLibraryReport.counts.noTrade} no-trade)`,
);
console.log(
  `Structural errors: ${scenarioLibraryReport.counts.structuralErrors}; publication blockers: ${scenarioLibraryReport.counts.publicationBlockers}; publishable: no`,
);
for (const candidate of scenarioLibraryReport.candidates) {
  console.log(
    `${candidate.valid ? 'PASS' : 'FAIL'} ${candidate.scenarioId}@${candidate.scenarioVersion} ${candidate.datasetChecksum} blockers=${candidate.publicationBlockers.length}`,
  );
}
console.log(
  'Exact sorted structural issues, provenance, rubric, execution evidence, and publication blockers: pnpm scenarios:report',
);

const managementExtensionsValid = scenarioPositionManagementVariantRegistry.every(
  (variant) =>
    parseScenarioPositionManagementExtension(buildScenarioPositionManagementExtension(variant)).ok,
);
const internalRegistryReport = validateHistoricalContentRegistry(internalHistoricalContentRegistry);
const combinedPublicationBlockers =
  scenarioLibraryReport.counts.publicationBlockers +
  scenarioPositionManagementReport.counts.publicationBlockers;
const managementValid =
  scenarioPositionManagementReport.valid &&
  !scenarioPositionManagementReport.publishable &&
  managementExtensionsValid &&
  scenarioPositionManagementReport.counts.variants === 3 &&
  scenarioPositionManagementReport.counts.enabled === 3 &&
  scenarioPositionManagementReport.counts.originalDisabled === 9 &&
  scenarioPositionManagementReport.counts.expectedCases === 13 &&
  scenarioPositionManagementReport.counts.reviewScopes === 7 &&
  scenarioPositionManagementReport.counts.publicationBlockers === 39 &&
  combinedPublicationBlockers === 136 &&
  internalRegistryReport.valid &&
  internalRegistryReport.counts.datasets === 12 &&
  internalRegistryReport.counts.scenarios === 13 &&
  internalRegistryReport.counts.internalOnly === 13 &&
  internalRegistryReport.counts.courseCreditEligible === 0;

console.log(
  `Position management: ${scenarioPositionManagementReport.counts.variants} variants / ${scenarioPositionManagementReport.counts.expectedCases} reducer cases; blockers: ${scenarioPositionManagementReport.counts.publicationBlockers}; combined blockers: ${combinedPublicationBlockers}; publishable: no`,
);
console.log(
  `Internal exact-version registry: ${internalRegistryReport.counts.datasets} datasets / ${internalRegistryReport.counts.scenarios} scenarios / ${internalRegistryReport.counts.courseCreditEligible} credit eligible`,
);
console.log(`Management strict envelopes: ${managementExtensionsValid ? 'PASS' : 'FAIL'}`);

if (!scenarioLibraryReport.valid || !managementValid) process.exitCode = 1;
