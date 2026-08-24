import { describe, expect, it } from 'vitest';

import {
  ANALYSIS_SESSION_SCHEMA_VERSION,
  ANALYSIS_WORKFLOW_STEP_IDS,
  analysisSessionHintIdsUsed,
  assertValidGuidedAnalysisSession,
  createGuidedAnalysisSession,
  isAtomicExerciseAnswerComplete,
  reduceGuidedAnalysisSession,
  type AnalysisWorkflowStepId,
  type AtomicAnswerRubric,
  type AtomicExerciseAnswer,
  type AttemptResult,
  type GuidedAnalysisSession,
} from '../src/index.js';

const BASE_TIME = Date.parse('2026-08-24T08:00:00.000Z');
const STEP_RUBRICS = Object.fromEntries(
  ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => [
    stepId,
    { kind: 'multiple-choice', acceptedOptionIds: [`answer-${stepId}`] },
  ]),
) as unknown as Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>;

function at(second: number): string {
  return new Date(BASE_TIME + second * 1_000).toISOString();
}

function result(correct = true): AttemptResult {
  return {
    correct,
    score: correct ? 1 : 0.5,
    feedbackCode: correct ? 'correct' : 'review-evidence',
    details: [{ key: 'matched', value: correct }],
    misconceptionIds: correct ? [] : ['mc-structure'],
    graderVersion: 'grader-v1',
  };
}

function completenessRubric(answer: AtomicExerciseAnswer): AtomicAnswerRubric {
  switch (answer.kind) {
    case 'multiple-choice':
      return { kind: 'multiple-choice', acceptedOptionIds: ['accepted'] };
    case 'selection':
      return { kind: 'selection', expectedIds: ['one'], mode: 'exact' };
    case 'sequence':
      return { kind: 'sequence', expectedOrder: ['context'] };
    case 'point':
      return {
        kind: 'point',
        targets: [{ candleIndex: 1, price: 100 }],
        tolerance: { horizontal: 0.1, vertical: 0.1 },
        matching: 'all',
      };
    case 'zone':
      return {
        kind: 'zone',
        target: { startCandleIndex: 1, endCandleIndex: 3, priceLow: 98, priceHigh: 102 },
        minimumIntersectionOverUnion: 0.5,
      };
    case 'line':
      return {
        kind: 'line',
        target: {
          start: { candleIndex: 1, price: 100 },
          end: { candleIndex: 5, price: 105 },
        },
        tolerance: { horizontal: 0.1, vertical: 0.1 },
      };
    case 'risk':
      return {
        kind: 'risk',
        expected: { accountRisk: 100, positionSize: 20 },
        tolerance: { absolute: 0.01 },
      };
    case 'decision':
      return { kind: 'decision', acceptedDecisions: ['insufficient-evidence'] };
    case 'label-placement':
      return {
        kind: 'label-placement',
        targets: [{ labelId: 'entry', target: { candleIndex: 4, price: 101 } }],
        tolerance: { horizontal: 0.1, vertical: 0.1 },
      };
  }
}

function createSession(): GuidedAnalysisSession {
  return createGuidedAnalysisSession({
    sessionId: 'session-001',
    attemptId: 'attempt-001',
    finalizationIdempotencyKey: 'finalize-session-001',
    exerciseId: 'u10-capstone-e01',
    contentVersionId: 'curriculum-2026-08',
    exerciseSchemaVersion: 3,
    chart: {
      id: 'capstone-chart-01',
      seed: 482_991,
      generatorVersion: 'chart-generator-v2',
      candleCount: 60,
      decisionCandleIndex: 47,
    },
    createdAt: at(0),
    initialReplayCursorCandleIndex: 23,
    workflowStepIds: ANALYSIS_WORKFLOW_STEP_IDS,
    stepRubrics: STEP_RUBRICS,
  });
}

function updateAndSubmit(session: GuidedAnalysisSession, stepIndex: number): GuidedAnalysisSession {
  const stepId = ANALYSIS_WORKFLOW_STEP_IDS[stepIndex]!;
  const answered = reduceGuidedAnalysisSession(session, {
    type: 'update-step-answer',
    stepId,
    answer: { kind: 'multiple-choice', optionId: `answer-${stepId}` },
    updatedAt: at(stepIndex * 2 + 1),
  });
  return reduceGuidedAnalysisSession(answered, {
    type: 'submit-step',
    stepId,
    result: result(),
    submittedAt: at(stepIndex * 2 + 2),
  });
}

function submitAll(session = createSession()): GuidedAnalysisSession {
  return ANALYSIS_WORKFLOW_STEP_IDS.reduce(
    (current, _stepId, index) => updateAndSubmit(current, index),
    session,
  );
}

describe('guided analysis session creation', () => {
  it('owns the exact canonical 11-step workflow order', () => {
    expect(ANALYSIS_WORKFLOW_STEP_IDS).toEqual([
      'context',
      'structure',
      'level',
      'setup',
      'confirmation',
      'entry',
      'invalidation',
      'position-size',
      'target',
      'management',
      'review',
    ]);
  });

  it('creates a versioned, serializable active session with explicit identities', () => {
    const session = createSession();

    expect(session).toMatchObject({
      schemaVersion: ANALYSIS_SESSION_SCHEMA_VERSION,
      revision: 0,
      sessionId: 'session-001',
      exerciseId: 'u10-capstone-e01',
      contentVersionId: 'curriculum-2026-08',
      exerciseSchemaVersion: 3,
      status: 'active',
      createdAt: at(0),
      updatedAt: at(0),
      currentStepId: 'context',
      chart: {
        id: 'capstone-chart-01',
        seed: 482_991,
        generatorVersion: 'chart-generator-v2',
        candleCount: 60,
        decisionCandleIndex: 47,
      },
      replay: { cursorCandleIndex: 23, decisionCandleIndex: 47, checkpoints: [] },
    });
    expect(Object.keys(session.steps)).toEqual(ANALYSIS_WORKFLOW_STEP_IDS);
    expect(Object.values(session.steps)).toHaveLength(11);
    expect(Object.values(session.steps)).toSatisfy((steps: unknown[]) =>
      steps.every(
        (step) =>
          typeof step === 'object' &&
          step !== null &&
          (step as { status?: string }).status === 'draft',
      ),
    );
    expect(JSON.parse(JSON.stringify(session))).toEqual(session);
  });

  it('rejects duplicate, unknown, missing, or reordered authored workflow steps', () => {
    const base = {
      sessionId: 's',
      attemptId: 'attempt-s',
      finalizationIdempotencyKey: 'finalize-s',
      exerciseId: 'e',
      contentVersionId: 'c',
      exerciseSchemaVersion: 1,
      chart: {
        id: 'chart',
        seed: 1,
        generatorVersion: 'v1',
        candleCount: 2,
        decisionCandleIndex: 1,
      },
      createdAt: at(0),
      stepRubrics: STEP_RUBRICS,
    } as const;

    expect(() =>
      createGuidedAnalysisSession({
        ...base,
        workflowStepIds: [...ANALYSIS_WORKFLOW_STEP_IDS.slice(0, -1), 'context'],
      }),
    ).toThrow('canonical 11 steps');
    expect(() =>
      createGuidedAnalysisSession({ ...base, workflowStepIds: ['context', 'unknown'] }),
    ).toThrow('canonical 11 steps');
    expect(() =>
      createGuidedAnalysisSession({
        ...base,
        workflowStepIds: [
          ANALYSIS_WORKFLOW_STEP_IDS[1],
          ANALYSIS_WORKFLOW_STEP_IDS[0],
          ...ANALYSIS_WORKFLOW_STEP_IDS.slice(2),
        ],
      }),
    ).toThrow('canonical 11 steps');
  });

  it.each([
    ['empty session ID', { sessionId: '' }, 'Session ID'],
    ['invalid exercise schema', { exerciseSchemaVersion: 0 }, 'schema version'],
    ['non-integer seed', { chart: { seed: 1.5 } }, 'seed'],
    ['empty generator', { chart: { generatorVersion: '' } }, 'generator'],
    ['zero candles', { chart: { candleCount: 0 } }, 'candle count'],
    ['decision outside chart', { chart: { decisionCandleIndex: 60 } }, 'decision candle'],
    ['cursor after boundary', { initialReplayCursorCandleIndex: 48 }, 'decision-safe'],
    ['invalid timestamp', { createdAt: 'yesterday-ish' }, 'timestamp'],
  ])('rejects %s', (_name, override, message) => {
    const valid = {
      sessionId: 'session-001',
      attemptId: 'attempt-001',
      finalizationIdempotencyKey: 'finalize-session-001',
      exerciseId: 'exercise-001',
      contentVersionId: 'content-v1',
      exerciseSchemaVersion: 1,
      chart: {
        id: 'chart-001',
        seed: 5,
        generatorVersion: 'v1',
        candleCount: 60,
        decisionCandleIndex: 47,
      },
      createdAt: at(0),
      initialReplayCursorCandleIndex: 20,
      stepRubrics: STEP_RUBRICS,
    };
    const chartOverride = 'chart' in override ? override.chart : undefined;
    expect(() =>
      createGuidedAnalysisSession({
        ...valid,
        ...override,
        chart: { ...valid.chart, ...chartOverride },
      }),
    ).toThrow(message);
  });
});

describe('answer completeness and step transitions', () => {
  it.each([
    [{ kind: 'multiple-choice', optionId: 'wait' }, true],
    [{ kind: 'multiple-choice', optionId: '' }, false],
    [{ kind: 'selection', selectedIds: ['higher-high'] }, true],
    [{ kind: 'selection', selectedIds: [] }, false],
    [{ kind: 'sequence', orderedIds: ['context'] }, true],
    [{ kind: 'point', points: [{ candleIndex: 1, price: 101 }] }, true],
    [{ kind: 'point', points: [{ candleIndex: -1, price: 101 }] }, false],
    [
      {
        kind: 'zone',
        zone: { startCandleIndex: 1, endCandleIndex: 3, priceLow: 98, priceHigh: 102 },
      },
      true,
    ],
    [
      {
        kind: 'zone',
        zone: { startCandleIndex: 3, endCandleIndex: 1, priceLow: 98, priceHigh: 102 },
      },
      false,
    ],
    [
      {
        kind: 'line',
        line: {
          start: { candleIndex: 1, price: 100 },
          end: { candleIndex: 5, price: 105 },
        },
      },
      true,
    ],
    [{ kind: 'risk', values: { accountRisk: 100, positionSize: 20 } }, true],
    [{ kind: 'risk', values: {} }, false],
    [{ kind: 'decision', decision: 'insufficient-evidence' }, true],
    [
      {
        kind: 'label-placement',
        placements: [{ labelId: 'entry', anchor: { candleIndex: 4, price: 101 } }],
      },
      true,
    ],
    [{ kind: 'label-placement', placements: [] }, false],
  ] as const)('computes structural completeness for %#', (answer, complete) => {
    expect(isAtomicExerciseAnswerComplete(completenessRubric(answer), answer)).toBe(complete);
  });

  it('uses the authored rubric to reject structurally partial answers', () => {
    expect(
      isAtomicExerciseAnswerComplete(
        {
          kind: 'risk',
          expected: { accountRisk: 100, stopDistance: 2, positionSize: 50 },
          tolerance: { absolute: 0.01 },
        },
        { kind: 'risk', values: { accountRisk: 100 } },
      ),
    ).toBe(false);
    expect(
      isAtomicExerciseAnswerComplete(
        {
          kind: 'decision',
          acceptedDecisions: ['wait'],
          requiredReasonIds: ['missing-confirmation'],
        },
        { kind: 'decision', decision: 'wait' },
      ),
    ).toBe(false);
    expect(
      isAtomicExerciseAnswerComplete(
        { kind: 'sequence', expectedOrder: ['context', 'structure'] },
        { kind: 'sequence', orderedIds: ['context'] },
      ),
    ).toBe(false);
    expect(
      isAtomicExerciseAnswerComplete(
        {
          kind: 'label-placement',
          targets: [
            { labelId: 'entry', target: { candleIndex: 1, price: 100 } },
            { labelId: 'stop', target: { candleIndex: 2, price: 98 } },
          ],
          tolerance: { horizontal: 0.05, vertical: 0.05 },
        },
        {
          kind: 'label-placement',
          placements: [{ labelId: 'entry', anchor: { candleIndex: 1, price: 100 } }],
        },
      ),
    ).toBe(false);
  });

  it('stores a draft, submits it deterministically, and advances in order', () => {
    const answered = reduceGuidedAnalysisSession(createSession(), {
      type: 'update-step-answer',
      stepId: 'context',
      answer: { kind: 'multiple-choice', optionId: 'daily-uptrend' },
      updatedAt: at(1),
    });
    expect(answered.steps.context).toMatchObject({
      status: 'draft',
      answerComplete: true,
      updatedAt: at(1),
    });

    const submitted = reduceGuidedAnalysisSession(answered, {
      type: 'submit-step',
      stepId: 'context',
      result: result(),
      submittedAt: at(2),
    });
    expect(submitted.steps.context).toMatchObject({
      status: 'submitted',
      result: result(),
      submittedAt: at(2),
    });
    expect(submitted.currentStepId).toBe('structure');
    expect(submitted.revision).toBe(2);
  });

  it('refuses to submit a structurally partial answer under the persisted authored rubric', () => {
    const session = createGuidedAnalysisSession({
      ...{
        sessionId: 'risk-session',
        attemptId: 'risk-attempt',
        finalizationIdempotencyKey: 'risk-finalization',
        exerciseId: 'capstone',
        contentVersionId: 'content-v1',
        exerciseSchemaVersion: 1,
        chart: {
          id: 'chart',
          seed: 1,
          generatorVersion: 'v1',
          candleCount: 60,
          decisionCandleIndex: 47,
        },
        createdAt: at(0),
      },
      stepRubrics: {
        ...STEP_RUBRICS,
        context: {
          kind: 'risk',
          expected: { accountRisk: 100, stopDistance: 2, positionSize: 50 },
          tolerance: { absolute: 0.01 },
        },
      },
    });
    const partial = reduceGuidedAnalysisSession(session, {
      type: 'update-step-answer',
      stepId: 'context',
      answer: { kind: 'risk', values: { accountRisk: 100 } },
      updatedAt: at(1),
    });
    expect(partial.steps.context.answerComplete).toBe(false);
    expect(() =>
      reduceGuidedAnalysisSession(partial, {
        type: 'submit-step',
        stepId: 'context',
        result: result(false),
        submittedAt: at(2),
      }),
    ).toThrow('incomplete');
  });

  it('rejects incomplete, out-of-order, repeat, and non-current submissions', () => {
    const session = createSession();
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'submit-step',
        stepId: 'context',
        result: result(),
        submittedAt: at(1),
      }),
    ).toThrow('incomplete');

    const answeredStructure = reduceGuidedAnalysisSession(session, {
      type: 'update-step-answer',
      stepId: 'structure',
      answer: { kind: 'multiple-choice', optionId: 'higher-high' },
      updatedAt: at(1),
    });
    expect(() =>
      reduceGuidedAnalysisSession(answeredStructure, {
        type: 'submit-step',
        stepId: 'structure',
        result: result(),
        submittedAt: at(2),
      }),
    ).toThrow('prerequisites');

    const submitted = updateAndSubmit(createSession(), 0);
    expect(() =>
      reduceGuidedAnalysisSession(
        { ...submitted, currentStepId: 'context' },
        {
          type: 'submit-step',
          stepId: 'context',
          result: result(),
          submittedAt: at(3),
        },
      ),
    ).toThrow('already submitted');
  });

  it('invalidates an edited submitted step and every downstream result while retaining answers', () => {
    let session = createSession();
    session = updateAndSubmit(session, 0);
    session = updateAndSubmit(session, 1);
    session = updateAndSubmit(session, 2);
    const originalStructureAnswer = session.steps.structure.answer;
    const originalLevelAnswer = session.steps.level.answer;

    const edited = reduceGuidedAnalysisSession(session, {
      type: 'update-step-answer',
      stepId: 'structure',
      answer: { kind: 'multiple-choice', optionId: 'changed-structure' },
      updatedAt: at(10),
    });

    expect(edited.steps.context.status).toBe('submitted');
    expect(edited.steps.structure).toMatchObject({
      status: 'invalidated',
      answer: { kind: 'multiple-choice', optionId: 'changed-structure' },
      answerComplete: true,
      invalidatedAt: at(10),
    });
    expect(edited.steps.structure.answer).not.toEqual(originalStructureAnswer);
    expect(edited.steps.structure.result).toBeUndefined();
    expect(edited.steps.level).toMatchObject({
      status: 'invalidated',
      answer: originalLevelAnswer,
      answerComplete: true,
      invalidatedAt: at(10),
    });
    expect(edited.steps.level.result).toBeUndefined();
    expect(edited.currentStepId).toBe('structure');
  });

  it('supports explicit backward navigation without mutating submitted work', () => {
    const session = updateAndSubmit(createSession(), 0);
    const navigated = reduceGuidedAnalysisSession(session, {
      type: 'navigate-to-step',
      stepId: 'context',
      navigatedAt: at(3),
    });
    expect(navigated.currentStepId).toBe('context');
    expect(navigated.steps.context).toEqual(session.steps.context);
  });

  it('rejects navigation past the next incomplete workflow step', () => {
    expect(() =>
      reduceGuidedAnalysisSession(createSession(), {
        type: 'navigate-to-step',
        stepId: 'review',
        navigatedAt: at(1),
      }),
    ).toThrow('next incomplete');
  });
});

describe('annotations, replay, and hints', () => {
  it('stores chart-space annotations and rejects duplicate IDs or out-of-bounds geometry', () => {
    const annotation = {
      id: 'learner-level-1',
      kind: 'horizontal-level' as const,
      candleIndex: 47,
      price: 104.25,
    };
    const session = reduceGuidedAnalysisSession(createSession(), {
      type: 'replace-annotations',
      annotations: [annotation],
      updatedAt: at(1),
    });
    expect(session.annotations).toEqual([annotation]);

    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'replace-annotations',
        annotations: [annotation, annotation],
        updatedAt: at(2),
      }),
    ).toThrow('Duplicate learner annotation ID');
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'replace-annotations',
        annotations: [{ ...annotation, id: 'future', candleIndex: 48 }],
        updatedAt: at(2),
      }),
    ).toThrow('outside chart bounds');
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'replace-annotations',
        annotations: [{ ...annotation, id: '', price: Number.NaN }],
        updatedAt: at(2),
      }),
    ).toThrow('must not be empty');
  });

  it('rejects answer geometry after the decision cutoff even when candles exist there', () => {
    const pointRubrics = {
      ...STEP_RUBRICS,
      context: {
        kind: 'point' as const,
        targets: [{ candleIndex: 47, price: 100 }],
        tolerance: { horizontal: 0.1, vertical: 0.1 },
        matching: 'all' as const,
      },
    };
    const session = createGuidedAnalysisSession({
      sessionId: 'point-session',
      attemptId: 'point-attempt',
      finalizationIdempotencyKey: 'point-finalization',
      exerciseId: 'capstone',
      contentVersionId: 'content-v1',
      exerciseSchemaVersion: 1,
      chart: {
        id: 'chart',
        seed: 1,
        generatorVersion: 'v1',
        candleCount: 60,
        decisionCandleIndex: 47,
      },
      createdAt: at(0),
      stepRubrics: pointRubrics,
    });
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'update-step-answer',
        stepId: 'context',
        answer: { kind: 'point', points: [{ candleIndex: 48, price: 100 }] },
        updatedAt: at(1),
      }),
    ).toThrow('outside chart bounds');
  });

  it('tracks a decision-safe replay cursor and versionable checkpoints', () => {
    let session = reduceGuidedAnalysisSession(createSession(), {
      type: 'set-replay-cursor',
      cursorCandleIndex: 31,
      updatedAt: at(1),
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'add-replay-checkpoint',
      checkpoint: {
        id: 'checkpoint-context',
        stepId: 'context',
        cursorCandleIndex: 31,
        capturedAt: at(2),
      },
    });
    expect(session.replay).toMatchObject({
      cursorCandleIndex: 31,
      decisionCandleIndex: 47,
      checkpoints: [{ id: 'checkpoint-context', stepId: 'context' }],
    });

    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'set-replay-cursor',
        cursorCandleIndex: 48,
        updatedAt: at(3),
      }),
    ).toThrow('decision-safe');
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'add-replay-checkpoint',
        checkpoint: {
          ...session.replay.checkpoints[0]!,
          capturedAt: at(3),
        },
      }),
    ).toThrow('already exists');
  });

  it('records unique per-step hints and exposes a session-wide unique list', () => {
    let session = reduceGuidedAnalysisSession(createSession(), {
      type: 'record-hint',
      stepId: 'context',
      hintId: 'hint-evidence',
      usedAt: at(1),
    });
    const afterDuplicate = reduceGuidedAnalysisSession(session, {
      type: 'record-hint',
      stepId: 'context',
      hintId: 'hint-evidence',
      usedAt: at(2),
    });
    expect(afterDuplicate).toBe(session);
    session = reduceGuidedAnalysisSession(session, {
      type: 'record-hint',
      stepId: 'structure',
      hintId: 'hint-evidence',
      usedAt: at(2),
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'record-hint',
      stepId: 'structure',
      hintId: 'hint-structure',
      usedAt: at(3),
    });
    expect(analysisSessionHintIdsUsed(session)).toEqual(['hint-evidence', 'hint-structure']);
  });

  it('rejects timestamps older than the latest persisted state', () => {
    const session = reduceGuidedAnalysisSession(createSession(), {
      type: 'set-replay-cursor',
      cursorCandleIndex: 24,
      updatedAt: at(3),
    });
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'navigate-to-step',
        stepId: 'context',
        navigatedAt: at(2),
      }),
    ).toThrow('precedes');
  });
});

describe('terminal transitions and persisted-state validation', () => {
  it('requires all 11 results before finalizing', () => {
    expect(() =>
      reduceGuidedAnalysisSession(updateAndSubmit(createSession(), 0), {
        type: 'finalize',
        attemptId: 'attempt-001',
        idempotencyKey: 'finalize-session-001',
        finalResult: result(),
        finalizedAt: at(30),
      }),
    ).toThrow('every analysis step');
  });

  it('finalizes once, permits only an identical keyed retry, and becomes read-only', () => {
    const ready = submitAll();
    const finalAction = {
      type: 'finalize' as const,
      attemptId: 'attempt-001',
      idempotencyKey: 'finalize-session-001',
      finalResult: result(),
      finalizedAt: at(30),
    };
    const finalized = reduceGuidedAnalysisSession(ready, finalAction);
    expect(finalized).toMatchObject({
      status: 'finalized',
      finalizedAt: at(30),
      updatedAt: at(30),
      attemptId: 'attempt-001',
      finalizationIdempotencyKey: 'finalize-session-001',
      finalResult: result(),
    });
    expect(reduceGuidedAnalysisSession(finalized, { ...finalAction, finalizedAt: at(31) })).toBe(
      finalized,
    );

    expect(() =>
      reduceGuidedAnalysisSession(finalized, {
        ...finalAction,
        idempotencyKey: 'different-key',
      }),
    ).toThrow('read-only');
    expect(() =>
      reduceGuidedAnalysisSession(finalized, {
        ...finalAction,
        finalResult: result(false),
      }),
    ).toThrow('read-only');
    expect(() =>
      reduceGuidedAnalysisSession(finalized, {
        type: 'navigate-to-step',
        stepId: 'review',
        navigatedAt: at(31),
      }),
    ).toThrow('read-only');
  });

  it('abandons idempotently, retains work and timestamp, and blocks edits/finalization', () => {
    const inProgress = updateAndSubmit(createSession(), 0);
    const abandoned = reduceGuidedAnalysisSession(inProgress, {
      type: 'abandon',
      abandonedAt: at(3),
    });
    expect(abandoned).toMatchObject({
      status: 'abandoned',
      abandonedAt: at(3),
      updatedAt: at(3),
    });
    expect(abandoned.steps.context).toEqual(inProgress.steps.context);
    expect(reduceGuidedAnalysisSession(abandoned, { type: 'abandon', abandonedAt: at(3) })).toBe(
      abandoned,
    );
    expect(() =>
      reduceGuidedAnalysisSession(abandoned, { type: 'abandon', abandonedAt: at(10) }),
    ).toThrow('read-only');
    expect(() =>
      reduceGuidedAnalysisSession(abandoned, {
        type: 'update-step-answer',
        stepId: 'context',
        answer: { kind: 'multiple-choice', optionId: 'changed' },
        updatedAt: at(4),
      }),
    ).toThrow('read-only');
    expect(() =>
      reduceGuidedAnalysisSession(abandoned, {
        type: 'finalize',
        attemptId: 'attempt-x',
        idempotencyKey: 'key-x',
        finalResult: result(),
        finalizedAt: at(4),
      }),
    ).toThrow('read-only');
  });

  it('rejects corrupt or incompatible persisted aggregates', () => {
    const session = createSession();
    expect(() =>
      assertValidGuidedAnalysisSession({ ...session, schemaVersion: 99 } as never),
    ).toThrow('Unsupported');
    expect(() =>
      assertValidGuidedAnalysisSession({
        ...session,
        steps: {
          ...session.steps,
          context: { ...session.steps.context, answerComplete: true },
        },
      }),
    ).toThrow('completeness');
    expect(() =>
      assertValidGuidedAnalysisSession({
        ...session,
        steps: { ...session.steps, surprise: session.steps.context },
      } as GuidedAnalysisSession),
    ).toThrow('exactly');
    expect(() => assertValidGuidedAnalysisSession({ ...session, updatedAt: at(-1) })).toThrow(
      'precedes',
    );
  });
});
