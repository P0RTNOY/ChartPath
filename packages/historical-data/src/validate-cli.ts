#!/usr/bin/env node
import { DEVELOPMENT_HISTORICAL_DATASET, DEVELOPMENT_HISTORICAL_SCENARIO } from './fixture.js';
import { evaluatePublicationGate, validateHistoricalDataset } from './validation.js';

declare const process: { exitCode?: number };

const report = validateHistoricalDataset(DEVELOPMENT_HISTORICAL_DATASET);
const publicationIssues = evaluatePublicationGate(
  DEVELOPMENT_HISTORICAL_DATASET,
  DEVELOPMENT_HISTORICAL_SCENARIO,
);

if (!report.valid) {
  console.error(`Historical dataset validation failed with ${report.issues.length} issue(s):`);
  for (const item of report.issues)
    console.error(`- [${item.severity}:${item.code}] ${item.path}: ${item.message}`);
  process.exitCode = 1;
} else if (publicationIssues.length === 0) {
  console.error('Historical fixture unexpectedly passed the publication gate.');
  process.exitCode = 1;
} else {
  console.log(
    [
      'Historical dataset validation passed.',
      `dataset=${DEVELOPMENT_HISTORICAL_DATASET.manifest.datasetId}`,
      `version=${DEVELOPMENT_HISTORICAL_DATASET.manifest.datasetVersion}`,
      `candles=${report.counts.candles}`,
      `actions=${report.counts.corporateActions}`,
      `recorded-gaps=${report.counts.missingIntervals}`,
      `checksum=${DEVELOPMENT_HISTORICAL_DATASET.manifest.canonicalChecksum}`,
      `publication=blocked-as-${DEVELOPMENT_HISTORICAL_DATASET.manifest.publicationStatus}`,
      `gate-issues=${publicationIssues.map((item) => item.code).join(',')}`,
    ].join(' | '),
  );
}
