import {
  historicalContentRegistry,
  validateHistoricalContentRegistry,
  type HistoricalContentRegistry,
} from '@chartpath/content';

/**
 * Deliberately narrow learner projection. It contains no source identity, dataset identity,
 * checksum, expected decision, direction, rubric, provenance, or future outcome.
 */
export interface BlindScenarioLibraryCard {
  readonly libraryKey: string;
  readonly ordinal: number;
  readonly blindTitleHe: string;
  readonly availabilityHe: string;
  readonly creditHe: string;
}

function publishedEntries(registry: HistoricalContentRegistry) {
  const report = validateHistoricalContentRegistry(registry);
  const reports = new Map(report.scenarios.map((scenario) => [scenario.scenarioId, scenario]));
  return registry.scenarios.filter((scenario) => {
    const scenarioReport = reports.get(scenario.scenarioId);
    return (
      scenario.publicationStatus === 'published' &&
      scenario.editorial.status === 'reviewed' &&
      scenarioReport?.valid === true &&
      scenarioReport.publishable === true &&
      scenarioReport.learningCredit === 'course' &&
      scenarioReport.publicationBlockers.length === 0
    );
  });
}

export function publishedScenarioLibraryCards(
  registry: HistoricalContentRegistry = historicalContentRegistry,
): readonly BlindScenarioLibraryCard[] {
  return publishedEntries(registry).map((scenario, index) => ({
    libraryKey: `published-${String(index + 1).padStart(2, '0')}`,
    ordinal: index + 1,
    blindTitleHe: scenario.blindTitleHebrew,
    availabilityHe: 'זמין לתרגול עיוור',
    creditHe: 'זכאי לקרדיט לאחר השלמה תקינה',
  }));
}

/** Resolve only at the action boundary; learner components never receive this identity. */
export function publishedScenarioIdForLibraryKey(
  libraryKey: string,
  registry: HistoricalContentRegistry = historicalContentRegistry,
): string | undefined {
  const index = Number(libraryKey.replace(/^published-/, '')) - 1;
  if (!Number.isSafeInteger(index) || index < 0) return undefined;
  return publishedEntries(registry)[index]?.scenarioId;
}
