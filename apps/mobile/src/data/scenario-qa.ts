import {
  scenarioCandidateRegistry,
  scenarioPositionManagementVariantRegistry,
  type CompiledScenarioCandidate,
  type ScenarioPositionManagementVariantV1,
} from '@chartpath/content';
import {
  ANALYSIS_WORKFLOW_STEP_IDS,
  gradeAnswer,
  reduceGuidedAnalysisSession,
  type AtomicAnswerRubric,
  type AtomicExerciseAnswer,
  type GuidedAnalysisSession,
  type TradePlanInput,
} from '@chartpath/domain';

/** Opaque projection used before an internal reviewer reveals a candidate. */
export interface BlindQaCandidateCard {
  readonly qaKey: string;
  readonly ordinal: number;
  readonly readinessHe: string;
  readonly startTestID?: string;
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

export interface PositionManagementQaJourney {
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly plan: TradePlanInput;
}

type QaCandidate =
  | { readonly kind: 'analysis'; readonly candidate: CompiledScenarioCandidate }
  | { readonly kind: 'management'; readonly variant: ScenarioPositionManagementVariantV1 };

const qaCandidates: readonly QaCandidate[] = [
  ...scenarioCandidateRegistry.map((candidate) => ({ kind: 'analysis' as const, candidate })),
  ...scenarioPositionManagementVariantRegistry.map((variant) => ({
    kind: 'management' as const,
    variant,
  })),
];

function candidateForQaKey(qaKey: string): QaCandidate | undefined {
  const index = Number(qaKey.replace(/^candidate-/, '')) - 1;
  if (!Number.isSafeInteger(index) || index < 0) return undefined;
  return qaCandidates[index];
}

export function blindQaCandidateCards(): readonly BlindQaCandidateCard[] {
  return qaCandidates.map((item, index) => {
    const managementTestID =
      item.kind === 'management'
        ? `scenario-management-qa-start-${item.variant.scenarioId.includes('short') ? 'short' : 'long'}-${item.variant.scenarioVersion.split('.').slice(0, 2).join('-')}`
        : undefined;
    return {
      qaKey: `candidate-${String(index + 1).padStart(2, '0')}`,
      ordinal: index + 1,
      readinessHe:
        item.kind === 'analysis' && item.candidate.structuralIssues.length
          ? 'נמצאו כשלים מבניים — לבדיקה בלבד'
          : 'הידור מבני הושלם — עדיין לא אושר לפרסום',
      ...(managementTestID ? { startTestID: managementTestID } : {}),
    };
  });
}

/** Resolve only at the explicit QA action boundary; blind components never receive this identity. */
export function qaScenarioIdentityForKey(
  qaKey: string,
): { readonly scenarioId: string; readonly scenarioVersion: string } | undefined {
  const item = candidateForQaKey(qaKey);
  if (!item) return undefined;
  return item.kind === 'analysis'
    ? {
        scenarioId: item.candidate.manifest.scenarioId,
        scenarioVersion: item.candidate.manifest.scenarioVersion,
      }
    : { scenarioId: item.variant.scenarioId, scenarioVersion: item.variant.scenarioVersion };
}

/** Authored journey inputs are released only at the explicit dev-QA start boundary. */
export function positionManagementQaJourneyForKey(
  qaKey: string,
): PositionManagementQaJourney | undefined {
  const item = candidateForQaKey(qaKey);
  if (item?.kind !== 'management') return undefined;
  const base = scenarioCandidateRegistry.find(
    ({ manifest }) => manifest.scenarioId === item.variant.scenarioId,
  );
  const plan = base?.manifest.expectedExecution?.plan;
  return plan
    ? {
        scenarioId: item.variant.scenarioId,
        scenarioVersion: item.variant.scenarioVersion,
        plan,
      }
    : undefined;
}

function correctQaAnswer(rubric: AtomicAnswerRubric): AtomicExerciseAnswer {
  switch (rubric.kind) {
    case 'multiple-choice':
      return { kind: 'multiple-choice', optionId: rubric.acceptedOptionIds[0]! };
    case 'selection':
      return { kind: 'selection', selectedIds: rubric.expectedIds };
    case 'sequence':
      return { kind: 'sequence', orderedIds: rubric.expectedOrder };
    case 'point':
      return { kind: 'point', points: rubric.targets };
    case 'zone':
      return { kind: 'zone', zone: rubric.target };
    case 'line':
      return { kind: 'line', line: rubric.target };
    case 'risk':
      return { kind: 'risk', values: rubric.expected };
    case 'decision':
      return {
        kind: 'decision',
        decision: rubric.acceptedDecisions[0]!,
        reasonIds: rubric.requiredReasonIds,
      };
    case 'label-placement':
      return {
        kind: 'label-placement',
        placements: rubric.targets.map(({ labelId, target }) => ({ labelId, anchor: target })),
      };
  }
}

/** Dev-QA only helper: completes the real immutable Guided reducer with curated rubric answers. */
export function completePositionManagementQaAnalysis(
  session: GuidedAnalysisSession,
): GuidedAnalysisSession {
  if (session.status !== 'active') return session;
  return ANALYSIS_WORKFLOW_STEP_IDS.reduce((current, stepId) => {
    const rubric = current.steps[stepId].rubric;
    const answer = correctQaAnswer(rubric);
    const answered = reduceGuidedAnalysisSession(current, {
      type: 'update-step-answer',
      stepId,
      answer,
      updatedAt: current.updatedAt,
    });
    return reduceGuidedAnalysisSession(answered, {
      type: 'submit-step',
      stepId,
      result: gradeAnswer(rubric, answer),
      submittedAt: answered.updatedAt,
    });
  }, session);
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
  const item = candidateForQaKey(qaKey);
  if (!item) return undefined;
  if (item.kind === 'management') {
    const { variant } = item;
    const source = variant.scenario.educationalSourceReferences[0];
    const expected = variant.scenario.application.expectedDecision;
    const direction = expected.kind === 'trade' ? expected.direction : undefined;
    return {
      qaKey,
      titleHe: 'תרחיש QA לניהול פוזיציה',
      scenarioIdentity: `${variant.scenarioId}@${variant.scenarioVersion}`,
      datasetIdentity: `${variant.datasetId}@${variant.datasetVersion}`,
      decisionHe:
        expected.kind === 'trade'
          ? expected.direction === 'long'
            ? 'תרחיש לונג'
            : 'תרחיש שורט'
          : 'אין עסקה',
      difficultyHe: 'QA ניהול פנימי',
      sourceIdentity: source
        ? `${source.sourceId} · PDF ${source.pageStart}–${source.pageEnd}`
        : 'מקור חינוכי מוצמד לתרחיש',
      sourceSectionHe: source?.section ?? 'סעיף מקור יוצג לאחר חשיפה',
      sourceRationaleHe: variant.scenario.paperExecution?.learnerDisclosureHebrew ?? '',
      chartSpecChecksum: variant.materialArtifactChecksum,
      materialArtifactChecksum: variant.materialArtifactChecksum,
      datasetChecksum: variant.datasetChecksum,
      providerIdentity: `${variant.dataset.manifest.provenance.providerId} · ${variant.publication.status}`,
      ...(direction
        ? {
            expectedExecutionHe: `${direction === 'long' ? 'לונג' : 'שורט'} · ניהול פוזיציה מופעל`,
          }
        : {}),
      executionEvidence: variant.management.expectedCases.flatMap(({ evidence }) => evidence),
      structuralIssues: [],
      publicationBlockers: variant.publication.blockers,
    };
  }
  const { candidate } = item;
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
