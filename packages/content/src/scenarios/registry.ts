import { DEVELOPMENT_HISTORICAL_SCENARIO } from '@chartpath/historical-data';

import { compileScenario } from './compiler.js';
import { scenarioAuthoringManifests } from './candidates.js';
import {
  SCENARIO_COMPILER_VERSION,
  type CompiledScenarioCandidate,
  type ScenarioLibraryReport,
} from './types.js';

function key(scenarioId: string, scenarioVersion: string): string {
  return `${scenarioId}@${scenarioVersion}`;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

export const legacyDevelopmentScenarioAuthoringMetadata = Object.freeze({
  schemaVersion: 1 as const,
  scenarioId: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId,
  scenarioVersion: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioVersion,
  provenance: 'legacy-generated-development-fixture' as const,
  publicationStatus: 'development-only' as const,
  learningCredit: 'none' as const,
  authoringBlockers: Object.freeze([
    'Legacy fixture has no reviewed ScenarioAuthoringManifestV1.',
    'Development-only provenance and publication status cannot grant course credit.',
  ]),
});

const compiled = scenarioAuthoringManifests
  .map((manifest) => compileScenario(manifest))
  .sort((left, right) =>
    key(left.manifest.scenarioId, left.manifest.scenarioVersion).localeCompare(
      key(right.manifest.scenarioId, right.manifest.scenarioVersion),
    ),
  );

export const scenarioCandidateRegistry: readonly CompiledScenarioCandidate[] = deepFreeze(compiled);

export function resolveScenarioCandidate(
  scenarioId: string,
  scenarioVersion: string,
  registry: readonly CompiledScenarioCandidate[] = scenarioCandidateRegistry,
): CompiledScenarioCandidate | undefined {
  return registry.find(
    (candidate) =>
      candidate.manifest.scenarioId === scenarioId &&
      candidate.manifest.scenarioVersion === scenarioVersion,
  );
}

export function buildScenarioLibraryReport(
  registry: readonly CompiledScenarioCandidate[] = scenarioCandidateRegistry,
): ScenarioLibraryReport {
  const candidates = [...registry]
    .sort((left, right) =>
      key(left.manifest.scenarioId, left.manifest.scenarioVersion).localeCompare(
        key(right.manifest.scenarioId, right.manifest.scenarioVersion),
      ),
    )
    .map((candidate) => ({
      scenarioId: candidate.manifest.scenarioId,
      scenarioVersion: candidate.manifest.scenarioVersion,
      decision: candidate.manifest.application,
      datasetChecksum: candidate.dataset.manifest.canonicalChecksum,
      materialArtifactChecksum: candidate.manifest.materialArtifactChecksum,
      valid: candidate.structuralIssues.length === 0,
      structuralIssues: candidate.structuralIssues,
      publicationBlockers: candidate.publicationBlockers,
      source: candidate.manifest.source,
      provenance: candidate.dataset.manifest.provenance,
      rubric: {
        rubricId: candidate.manifest.processRubric.rubricId,
        rubricVersion: candidate.manifest.processRubric.rubricVersion,
        checksum: candidate.manifest.processRubric.checksum,
      },
      ...(candidate.manifest.expectedExecution
        ? { expectedExecution: candidate.manifest.expectedExecution }
        : {}),
      ...(candidate.execution ? { actualExecutionStatus: candidate.execution.status } : {}),
      executionEvidence: candidate.execution?.evidence ?? [],
    }));
  const long = candidates.filter(
    (candidate) => candidate.decision.kind === 'trade' && candidate.decision.direction === 'long',
  ).length;
  const short = candidates.filter(
    (candidate) => candidate.decision.kind === 'trade' && candidate.decision.direction === 'short',
  ).length;
  const noTrade = candidates.filter((candidate) => candidate.decision.kind === 'no-trade').length;
  const registryIssues = [...validateScenarioVersionHistory(registry)];
  const datasetIdentities = new Set<string>();
  for (const candidate of registry) {
    const identity = `${candidate.dataset.manifest.datasetId}@${candidate.dataset.manifest.datasetVersion}`;
    if (datasetIdentities.has(identity))
      registryIssues.push(`duplicate dataset identity ${identity}`);
    datasetIdentities.add(identity);
  }
  const structuralErrors =
    registry.reduce((count, candidate) => count + candidate.structuralIssues.length, 0) +
    registryIssues.length;
  const publicationBlockers = registry.reduce(
    (count, candidate) => count + candidate.publicationBlockers.length,
    0,
  );
  return Object.freeze({
    valid:
      candidates.length === 9 &&
      long === 3 &&
      short === 3 &&
      noTrade === 3 &&
      structuralErrors === 0,
    publishable: false,
    compilerVersion: SCENARIO_COMPILER_VERSION,
    candidates,
    counts: {
      total: candidates.length,
      long,
      short,
      noTrade,
      structuralErrors,
      publicationBlockers,
    },
    registryIssues: registryIssues.sort(),
  });
}

export const scenarioLibraryReport = buildScenarioLibraryReport();

export function validateScenarioVersionHistory(
  registry: readonly CompiledScenarioCandidate[] = scenarioCandidateRegistry,
): readonly string[] {
  const issues: string[] = [];
  const identities = new Map<string, string>();
  for (const candidate of registry) {
    const identity = key(candidate.manifest.scenarioId, candidate.manifest.scenarioVersion);
    const prior = identities.get(identity);
    if (prior !== undefined)
      issues.push(
        prior === candidate.manifest.materialArtifactChecksum
          ? `duplicate immutable scenario version ${identity}`
          : `material mutation reused immutable scenario version ${identity}`,
      );
    identities.set(identity, candidate.manifest.materialArtifactChecksum);
  }
  for (const candidate of registry) {
    const retirement = candidate.manifest.retirement;
    if (retirement.status !== 'retired' || !retirement.replacementScenarioId) continue;
    const replacement = key(
      retirement.replacementScenarioId,
      retirement.replacementScenarioVersion!,
    );
    if (replacement === key(candidate.manifest.scenarioId, candidate.manifest.scenarioVersion))
      issues.push(`retired scenario cannot replace itself: ${replacement}`);
    else if (!identities.has(replacement))
      issues.push(`retirement replacement is missing: ${replacement}`);
  }
  return Object.freeze(issues.sort());
}

/** Learner-safe projection. It intentionally contains no candles after the decision cutoff. */
export function buildScenarioPreview(candidate: CompiledScenarioCandidate) {
  const cutoff = candidate.manifest.knowledgeCutoffIndex;
  return Object.freeze({
    opaqueScenarioHandle: candidate.manifest.materialArtifactChecksum,
    titleHe: 'תרחיש עיוור — נכס סינתטי',
    difficulty: candidate.manifest.difficulty,
    promptHe: 'בצעו ניתוח עצמאי לפי 11 שלבי התהליך, על סמך הנרות הגלויים בלבד.',
    exercise: candidate.exercise,
    decisionCandleIndex: candidate.manifest.decisionCandleIndex,
    knowledgeCutoffIndex: cutoff,
    candles: Object.freeze(
      candidate.dataset.candles.slice(0, cutoff + 1).map((candle) => ({
        index: candle.index,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        session: candle.session,
        ...(candle.adjustment ? { adjustment: candle.adjustment } : {}),
      })),
    ),
    annotations: Object.freeze(
      candidate.scenario.annotations.filter(
        (annotation) => annotation.visibleFromCandleIndex <= cutoff,
      ),
    ),
  });
}
