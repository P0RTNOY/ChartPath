import {
  DEVELOPMENT_HISTORICAL_SCENARIO,
  historicalContentRegistry,
  type HistoricalContentRegistry,
} from '@chartpath/content';
import {
  ANALYSIS_WORKFLOW_STEP_IDS,
  createGuidedAnalysisSession,
  createPaperExecutionSession,
  gradeAnswer,
  reduceGuidedAnalysisSession,
  type AtomicAnswerRubric,
  type AtomicExerciseAnswer,
  type GuidedAnalysisSession,
  type TradePlanInput,
} from '@chartpath/domain';

import { resolveHistoricalReplayScenario } from './historical-replay';
import {
  resolvePaperExecutionAnalysisSession,
  resolvePaperExecutionSession,
} from './paper-execution';

const QA_HYPOTHETICAL = { accessMode: 'qa-hypothetical-mechanics' } as const;

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

function correctAnswer(rubric: AtomicAnswerRubric): AtomicExerciseAnswer {
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

function finalizedAnalysis(): GuidedAnalysisSession {
  const resolved = resolveHistoricalReplayScenario(DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId);
  if (resolved.status !== 'ready') throw new Error(resolved.message);
  const stepRubrics = Object.fromEntries(
    resolved.content.educationalExercise.capstoneSteps!.map((step) => [step.id, step.rubric]),
  ) as Record<(typeof ANALYSIS_WORKFLOW_STEP_IDS)[number], AtomicAnswerRubric>;
  let session = createGuidedAnalysisSession({
    sessionId: 'analysis-finalized',
    attemptId: 'analysis-attempt',
    finalizationIdempotencyKey: 'analysis-finalize',
    exerciseId: resolved.content.educationalExercise.id,
    contentVersionId: resolved.content.educationalExercise.contentVersionId,
    exerciseSchemaVersion: resolved.content.educationalExercise.schemaVersion,
    chart: resolved.chartIdentity,
    createdAt: '2026-08-24T08:00:00.000Z',
    initialReplayCursorCandleIndex: 23,
    stepRubrics,
  });
  for (const stepId of ANALYSIS_WORKFLOW_STEP_IDS) {
    const rubric = session.steps[stepId].rubric;
    const answer = correctAnswer(rubric);
    session = reduceGuidedAnalysisSession(session, {
      type: 'update-step-answer',
      stepId,
      answer,
      updatedAt: '2026-08-24T08:01:00.000Z',
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'submit-step',
      stepId,
      result: gradeAnswer(rubric, answer),
      submittedAt: '2026-08-24T08:01:00.000Z',
    });
  }
  return reduceGuidedAnalysisSession(session, {
    type: 'finalize',
    attemptId: session.attemptId,
    idempotencyKey: session.finalizationIdempotencyKey,
    finalResult: gradeAnswer(
      resolved.content.educationalExercise.rubric,
      {
        kind: 'capstone',
        stepAnswers: ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => ({
          stepId,
          answer: session.steps[stepId].answer!,
        })),
      },
      resolved.chartEvidence,
    ),
    finalizedAt: '2026-08-24T08:02:00.000Z',
  });
}

function validPlan(): TradePlanInput {
  return {
    planId: 'plan-1',
    direction: 'short',
    entryIntent: { type: 'market', estimatedEntryPrice: 107.86 },
    protectiveStopPrice: 109.5,
    targetPrice: 105,
    fictionalAccountValue: 100_000,
    intendedRiskAmount: 500,
    quantity: 100,
    authoredAtCandleIndex: 72,
    processEvidence: {
      analysisDecision: 'no-trade',
      entryMatchesAnalysis: true,
      invalidationMatchesAnalysis: true,
      targetMatchesAnalysis: true,
      requiredReasoningBypassed: false,
    },
  };
}

describe('paper execution source resolution', () => {
  it('pins the exact finalized analysis, dataset, policy permissions, and boundary', () => {
    const analysis = finalizedAnalysis();
    const resolved = resolvePaperExecutionAnalysisSession(
      analysis,
      historicalContentRegistry,
      QA_HYPOTHETICAL,
    );
    expect(resolved.status).toBe('ready');
    if (resolved.status !== 'ready') return;
    expect(resolved.source).toEqual({
      datasetId: DEVELOPMENT_HISTORICAL_SCENARIO.dataset.datasetId,
      datasetVersion: DEVELOPMENT_HISTORICAL_SCENARIO.dataset.datasetVersion,
      canonicalChecksum: DEVELOPMENT_HISTORICAL_SCENARIO.dataset.canonicalChecksum,
      scenarioId: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId,
      scenarioVersion: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioVersion,
      analysisSessionId: analysis.sessionId,
      analysisFinalizedAt: analysis.finalizedAt,
      decisionCandleIndex: 72,
      candleCount: 96,
      learningCredit: 'none',
      permittedDirections: ['short'],
      permittedEntryOrderTypes: ['market', 'limit', 'stop'],
    });
    expect(resolved.executionBoundary).toEqual({
      afterDecisionCandleIndex: 72,
      lastCandleIndex: 95,
    });
    expect(resolved.candles).toHaveLength(96);
    expect(resolved.candles[73]).toMatchObject({ index: 73, timestamp: expect.any(String) });
    expect(resolved.analysisProcessEvidence).toEqual({
      analysisDecision: 'no-trade',
      entryMatchesAnalysis: false,
      invalidationMatchesAnalysis: false,
      targetMatchesAnalysis: false,
      requiredReasoningBypassed: true,
    });
    expect(resolved).toMatchObject({
      mode: 'hypothetical-mechanics',
      application: {
        alignment: 'matched',
        nextAction: 'no-trade-review',
        learner: { kind: 'no-trade', disposition: 'no-trade' },
      },
    });
  });

  it('keeps hypothetical mechanics unavailable to the ordinary no-trade path', () => {
    expect(resolvePaperExecutionAnalysisSession(finalizedAnalysis()).status).toBe(
      'hypothetical-mechanics-restricted',
    );
  });

  it('fails closed when the proposed paper direction is not authorized', () => {
    expect(
      resolvePaperExecutionAnalysisSession(finalizedAnalysis(), historicalContentRegistry, {
        ...QA_HYPOTHETICAL,
        proposedDirection: 'long',
      }).status,
    ).toBe('execution-direction-mismatch');
  });

  it('fails closed before finalization and when canonical data is modified', () => {
    const finalized = finalizedAnalysis();
    expect(
      resolvePaperExecutionAnalysisSession({
        ...finalized,
        status: 'active',
        finalizedAt: undefined,
        finalResult: undefined,
      } as GuidedAnalysisSession).status,
    ).toBe('analysis-not-finalized');

    const registry = structuredClone(
      historicalContentRegistry,
    ) as Mutable<HistoricalContentRegistry>;
    registry.datasets[0]!.candles[0]!.close += 0.01;
    expect(resolvePaperExecutionAnalysisSession(finalized, registry).status).toBe(
      'dataset-modified',
    );
  });

  it('fails closed for unsupported configuration and altered execution boundaries', () => {
    const analysis = finalizedAnalysis();
    const policyRegistry = structuredClone(
      historicalContentRegistry,
    ) as Mutable<HistoricalContentRegistry>;
    policyRegistry.scenarios[0]!.paperExecution!.executionPolicyVersion =
      'future-policy' as 'paper-execution-policy-v1';
    expect(resolvePaperExecutionAnalysisSession(analysis, policyRegistry).status).toBe(
      'metadata-mismatch',
    );

    const boundaryRegistry = structuredClone(
      historicalContentRegistry,
    ) as Mutable<HistoricalContentRegistry>;
    boundaryRegistry.scenarios[0]!.paperExecution!.executionBoundary.lastCandleIndex = 94;
    expect(resolvePaperExecutionAnalysisSession(analysis, boundaryRegistry).status).toBe(
      'execution-boundary-mismatch',
    );
  });

  it('refuses to reattach a persisted execution to a different analysis identity', () => {
    const analysis = finalizedAnalysis();
    const resolved = resolvePaperExecutionAnalysisSession(
      analysis,
      historicalContentRegistry,
      QA_HYPOTHETICAL,
    );
    if (resolved.status !== 'ready') throw new Error(resolved.message);
    const execution = createPaperExecutionSession({
      sessionId: 'execution-1',
      orderId: 'order-1',
      positionId: 'position-1',
      debriefId: 'debrief-1',
      source: resolved.source,
      plan: validPlan(),
      createdAt: '2026-08-24T08:03:00.000Z',
    });
    expect(
      resolvePaperExecutionSession(
        execution,
        [analysis],
        historicalContentRegistry,
        QA_HYPOTHETICAL,
      ).status,
    ).toBe('ready');
    expect(resolvePaperExecutionSession(execution, [analysis]).status).toBe(
      'hypothetical-mechanics-restricted',
    );
    expect(
      resolvePaperExecutionSession(
        {
          ...execution,
          source: { ...execution.source, scenarioVersion: 'different-version' },
        },
        [analysis],
        historicalContentRegistry,
        QA_HYPOTHETICAL,
      ).status,
    ).toBe('execution-identity-mismatch');
    expect(
      resolvePaperExecutionSession(execution, [], historicalContentRegistry, QA_HYPOTHETICAL)
        .status,
    ).toBe('execution-identity-mismatch');
  });
});
