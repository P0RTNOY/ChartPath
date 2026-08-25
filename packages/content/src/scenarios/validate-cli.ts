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
if (!scenarioLibraryReport.valid) process.exitCode = 1;
