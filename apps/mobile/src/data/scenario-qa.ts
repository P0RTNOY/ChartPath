import { scenarioCandidateRegistry, type CompiledScenarioCandidate } from '@chartpath/content';

/** Opaque projection used before an internal reviewer reveals a candidate. */
export interface BlindQaCandidateCard {
  readonly qaKey: string;
  readonly ordinal: number;
  readonly readinessHe: string;
}

export interface RevealedQaCandidateDetail {
  readonly qaKey: string;
  readonly titleHe: string;
  readonly scenarioIdentity: string;
  readonly datasetIdentity: string;
  readonly decisionHe: string;
  readonly difficultyHe: string;
  readonly sourceIdentity: string;
  readonly sourceSectionHe: string;
  readonly sourceRationaleHe: string;
  readonly chartSpecChecksum: string;
  readonly materialArtifactChecksum: string;
  readonly datasetChecksum: string;
  readonly providerIdentity: string;
  readonly expectedExecutionHe?: string;
  readonly executionEvidence: readonly string[];
  readonly structuralIssues: readonly string[];
  readonly publicationBlockers: readonly string[];
}

const qaCandidates: readonly CompiledScenarioCandidate[] = scenarioCandidateRegistry;

function candidateForQaKey(qaKey: string): CompiledScenarioCandidate | undefined {
  const index = Number(qaKey.replace(/^candidate-/, '')) - 1;
  if (!Number.isSafeInteger(index) || index < 0) return undefined;
  return qaCandidates[index];
}

export function blindQaCandidateCards(): readonly BlindQaCandidateCard[] {
  return qaCandidates.map((candidate, index) => ({
    qaKey: `candidate-${String(index + 1).padStart(2, '0')}`,
    ordinal: index + 1,
    readinessHe: candidate.structuralIssues.length
      ? 'נמצאו כשלים מבניים — לבדיקה בלבד'
      : 'הידור מבני הושלם — עדיין לא אושר לפרסום',
  }));
}

/** Resolve only at the explicit QA action boundary; blind components never receive this identity. */
export function qaScenarioIdForKey(qaKey: string): string | undefined {
  return candidateForQaKey(qaKey)?.manifest.scenarioId;
}

function decisionLabel(candidate: CompiledScenarioCandidate): string {
  const decision = candidate.manifest.application;
  if (decision.kind === 'no-trade') return 'אין עסקה';
  return decision.direction === 'long' ? 'תרחיש לונג' : 'תרחיש שורט';
}

function difficultyLabel(candidate: CompiledScenarioCandidate): string {
  switch (candidate.manifest.difficulty) {
    case 'guided':
      return 'מונחה';
    case 'independent':
      return 'עצמאי';
    case 'blind':
      return 'עיוור';
  }
}

/** Full details are created only after the explicit QA reveal action. */
export function revealedQaCandidateDetail(qaKey: string): RevealedQaCandidateDetail | undefined {
  const candidate = candidateForQaKey(qaKey);
  if (!candidate) return undefined;
  const { manifest, dataset, scenario } = candidate;
  const execution = manifest.expectedExecution;
  return {
    qaKey,
    titleHe: manifest.titleHe,
    scenarioIdentity: `${manifest.scenarioId}@${manifest.scenarioVersion}`,
    datasetIdentity: `${manifest.datasetId}@${manifest.datasetVersion}`,
    decisionHe: decisionLabel(candidate),
    difficultyHe: difficultyLabel(candidate),
    sourceIdentity: `${manifest.source.sourceId} · PDF ${manifest.source.pageStart}–${manifest.source.pageEnd} · printed ${manifest.source.bookPageStart}–${manifest.source.bookPageEnd}`,
    sourceSectionHe: `${manifest.source.section ?? ''} · פרק ${manifest.source.chapter} · איור ${manifest.source.figure}`,
    sourceRationaleHe: manifest.source.rationaleHe,
    chartSpecChecksum: manifest.chartSpecChecksum,
    materialArtifactChecksum: manifest.materialArtifactChecksum,
    datasetChecksum: dataset.manifest.canonicalChecksum,
    providerIdentity: `${dataset.manifest.provenance.providerId} · ${scenario.publicationStatus}`,
    ...(execution
      ? {
          expectedExecutionHe: `${execution.direction === 'long' ? 'לונג' : 'שורט'} · ${execution.entryOrderType} · מצב צפוי ${execution.expectedStatus}`,
        }
      : {}),
    executionEvidence: candidate.execution?.evidence ?? [],
    structuralIssues: candidate.structuralIssues,
    publicationBlockers: candidate.publicationBlockers,
  };
}
