import type {
  AtomicAnswerRubric,
  AtomicExerciseAnswer,
  AttemptResult,
  ExerciseId,
} from './types.js';
import type { LearnerChartAnnotation } from './workbench.js';

export const ANALYSIS_SESSION_SCHEMA_VERSION = 1 as const;

/** The reviewed ChartPath analysis workflow. Its order is part of the persisted contract. */
export const ANALYSIS_WORKFLOW_STEP_IDS = [
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
] as const;

export type AnalysisWorkflowStepId = (typeof ANALYSIS_WORKFLOW_STEP_IDS)[number];
export type AnalysisSessionStatus = 'active' | 'finalized' | 'abandoned';
export type AnalysisStepStatus = 'draft' | 'submitted' | 'invalidated';

export interface AnalysisChartIdentity {
  readonly id: string;
  readonly seed: number;
  readonly generatorVersion: string;
  readonly candleCount: number;
  readonly decisionCandleIndex: number;
}

export interface AnalysisReplayCheckpoint {
  readonly id: string;
  readonly stepId: AnalysisWorkflowStepId;
  readonly cursorCandleIndex: number;
  readonly capturedAt: string;
}

export interface AnalysisReplayState {
  readonly cursorCandleIndex: number;
  readonly decisionCandleIndex: number;
  readonly checkpoints: readonly AnalysisReplayCheckpoint[];
}

export interface AnalysisSessionStepState {
  readonly stepId: AnalysisWorkflowStepId;
  readonly rubric: AtomicAnswerRubric;
  readonly status: AnalysisStepStatus;
  readonly answer?: AtomicExerciseAnswer;
  readonly answerComplete: boolean;
  readonly result?: AttemptResult;
  readonly hintIdsUsed: readonly string[];
  readonly updatedAt?: string;
  readonly submittedAt?: string;
  readonly invalidatedAt?: string;
}

export interface GuidedAnalysisSession {
  readonly schemaVersion: typeof ANALYSIS_SESSION_SCHEMA_VERSION;
  /** Monotonic optimistic-concurrency token. It increments on every state change. */
  readonly revision: number;
  readonly sessionId: string;
  readonly exerciseId: ExerciseId;
  readonly contentVersionId: string;
  readonly exerciseSchemaVersion: number;
  readonly chart: AnalysisChartIdentity;
  readonly status: AnalysisSessionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly finalizedAt?: string;
  readonly abandonedAt?: string;
  readonly currentStepId: AnalysisWorkflowStepId;
  readonly steps: Readonly<Record<AnalysisWorkflowStepId, AnalysisSessionStepState>>;
  readonly annotations: readonly LearnerChartAnnotation[];
  readonly replay: AnalysisReplayState;
  readonly finalResult?: AttemptResult;
  /** Stable IDs allocated with the session, before any transactional finalization attempt. */
  readonly attemptId: string;
  readonly finalizationIdempotencyKey: string;
}

export interface CreateGuidedAnalysisSessionInput {
  readonly sessionId: string;
  readonly attemptId: string;
  readonly finalizationIdempotencyKey: string;
  readonly exerciseId: ExerciseId;
  readonly contentVersionId: string;
  readonly exerciseSchemaVersion: number;
  readonly chart: AnalysisChartIdentity;
  readonly createdAt: string;
  readonly initialReplayCursorCandleIndex?: number;
  /** Optional persisted/authored assertion; when supplied it must be the canonical 11-step order. */
  readonly workflowStepIds?: readonly string[];
  readonly stepRubrics: Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>;
}

export type GuidedAnalysisSessionAction =
  | {
      readonly type: 'update-step-answer';
      readonly stepId: AnalysisWorkflowStepId;
      readonly answer?: AtomicExerciseAnswer;
      readonly updatedAt: string;
    }
  | {
      readonly type: 'submit-step';
      readonly stepId: AnalysisWorkflowStepId;
      readonly result: AttemptResult;
      readonly submittedAt: string;
    }
  | {
      readonly type: 'navigate-to-step';
      readonly stepId: AnalysisWorkflowStepId;
      readonly navigatedAt: string;
    }
  | {
      readonly type: 'record-hint';
      readonly stepId: AnalysisWorkflowStepId;
      readonly hintId: string;
      readonly usedAt: string;
    }
  | {
      readonly type: 'replace-annotations';
      readonly annotations: readonly LearnerChartAnnotation[];
      readonly updatedAt: string;
    }
  | {
      readonly type: 'set-replay-cursor';
      readonly cursorCandleIndex: number;
      readonly updatedAt: string;
    }
  | {
      readonly type: 'add-replay-checkpoint';
      readonly checkpoint: AnalysisReplayCheckpoint;
    }
  | {
      readonly type: 'finalize';
      readonly attemptId: string;
      readonly idempotencyKey: string;
      readonly finalResult: AttemptResult;
      readonly finalizedAt: string;
    }
  | {
      readonly type: 'abandon';
      readonly abandonedAt: string;
    };

export function createGuidedAnalysisSession(
  input: CreateGuidedAnalysisSessionInput,
): GuidedAnalysisSession {
  if (input.workflowStepIds !== undefined) assertCanonicalWorkflow(input.workflowStepIds);
  assertStepRubrics(input.stepRubrics);
  const cursor = input.initialReplayCursorCandleIndex ?? input.chart.decisionCandleIndex;
  const session: GuidedAnalysisSession = {
    schemaVersion: ANALYSIS_SESSION_SCHEMA_VERSION,
    revision: 0,
    sessionId: input.sessionId,
    attemptId: input.attemptId,
    finalizationIdempotencyKey: input.finalizationIdempotencyKey,
    exerciseId: input.exerciseId,
    contentVersionId: input.contentVersionId,
    exerciseSchemaVersion: input.exerciseSchemaVersion,
    chart: { ...input.chart },
    status: 'active',
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    currentStepId: ANALYSIS_WORKFLOW_STEP_IDS[0],
    steps: Object.fromEntries(
      ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => [
        stepId,
        {
          stepId,
          rubric: input.stepRubrics[stepId],
          status: 'draft',
          answerComplete: false,
          hintIdsUsed: [],
        } satisfies AnalysisSessionStepState,
      ]),
    ) as unknown as Readonly<Record<AnalysisWorkflowStepId, AnalysisSessionStepState>>,
    annotations: [],
    replay: {
      cursorCandleIndex: cursor,
      decisionCandleIndex: input.chart.decisionCandleIndex,
      checkpoints: [],
    },
  };
  assertValidGuidedAnalysisSession(session);
  return session;
}

export function reduceGuidedAnalysisSession(
  session: GuidedAnalysisSession,
  action: GuidedAnalysisSessionAction,
): GuidedAnalysisSession {
  assertValidGuidedAnalysisSession(session);

  if (session.status !== 'active') {
    if (
      session.status === 'finalized' &&
      action.type === 'finalize' &&
      isSameFinalization(session, action)
    ) {
      return session;
    }
    if (
      session.status === 'abandoned' &&
      action.type === 'abandon' &&
      action.abandonedAt === session.abandonedAt
    ) {
      return session;
    }
    throw new Error(
      `${session.status === 'finalized' ? 'Finalized' : 'Abandoned'} analysis sessions are read-only`,
    );
  }

  let next: GuidedAnalysisSession;
  switch (action.type) {
    case 'update-step-answer':
      next = updateStepAnswer(session, action);
      break;
    case 'submit-step':
      next = submitStep(session, action);
      break;
    case 'navigate-to-step':
      assertActionTime(session, action.navigatedAt);
      if (stepIndex(action.stepId) > firstUnsubmittedStepIndex(session.steps)) {
        throw new Error(`Cannot navigate past the next incomplete analysis step: ${action.stepId}`);
      }
      next =
        action.stepId === session.currentStepId
          ? session
          : { ...session, currentStepId: action.stepId, updatedAt: action.navigatedAt };
      break;
    case 'record-hint':
      next = recordHint(session, action);
      break;
    case 'replace-annotations':
      assertActionTime(session, action.updatedAt);
      assertValidAnnotations(action.annotations, session.chart.decisionCandleIndex + 1);
      next = {
        ...session,
        annotations: [...action.annotations],
        updatedAt: action.updatedAt,
      };
      break;
    case 'set-replay-cursor':
      assertActionTime(session, action.updatedAt);
      assertReplayCursor(action.cursorCandleIndex, session.replay.decisionCandleIndex);
      next =
        action.cursorCandleIndex === session.replay.cursorCandleIndex
          ? session
          : {
              ...session,
              replay: { ...session.replay, cursorCandleIndex: action.cursorCandleIndex },
              updatedAt: action.updatedAt,
            };
      break;
    case 'add-replay-checkpoint':
      next = addReplayCheckpoint(session, action.checkpoint);
      break;
    case 'finalize':
      next = finalizeSession(session, action);
      break;
    case 'abandon':
      assertActionTime(session, action.abandonedAt);
      next = {
        ...session,
        status: 'abandoned',
        abandonedAt: action.abandonedAt,
        updatedAt: action.abandonedAt,
      };
      break;
  }

  if (next === session) return session;
  const revised = { ...next, revision: session.revision + 1 };
  assertValidGuidedAnalysisSession(revised);
  return revised;
}

export function analysisSessionHintIdsUsed(session: GuidedAnalysisSession): readonly string[] {
  return [...new Set(ANALYSIS_WORKFLOW_STEP_IDS.flatMap((id) => session.steps[id].hintIdsUsed))];
}

export function isAtomicExerciseAnswerComplete(
  rubric: AtomicAnswerRubric,
  answer: AtomicExerciseAnswer | undefined,
): boolean {
  if (answer === undefined) return false;
  switch (rubric.kind) {
    case 'multiple-choice':
      return answer.kind === rubric.kind && isNonEmptyId(answer.optionId);
    case 'selection':
      return (
        answer.kind === rubric.kind &&
        answer.selectedIds.length >= rubric.expectedIds.length &&
        answer.selectedIds.every(isNonEmptyId)
      );
    case 'sequence':
      return (
        answer.kind === rubric.kind &&
        answer.orderedIds.length === rubric.expectedOrder.length &&
        answer.orderedIds.every(isNonEmptyId)
      );
    case 'point':
      return (
        answer.kind === rubric.kind &&
        answer.points.length >= (rubric.matching === 'all' ? rubric.targets.length : 1) &&
        answer.points.every(isValidAnchor)
      );
    case 'zone':
      return (
        answer.kind === rubric.kind &&
        isNonNegativeInteger(answer.zone.startCandleIndex) &&
        isNonNegativeInteger(answer.zone.endCandleIndex) &&
        answer.zone.startCandleIndex <= answer.zone.endCandleIndex &&
        Number.isFinite(answer.zone.priceLow) &&
        Number.isFinite(answer.zone.priceHigh) &&
        answer.zone.priceLow <= answer.zone.priceHigh
      );
    case 'line':
      return (
        answer.kind === rubric.kind &&
        isValidAnchor(answer.line.start) &&
        isValidAnchor(answer.line.end)
      );
    case 'risk': {
      if (answer.kind !== rubric.kind) return false;
      const expectedFields = Object.keys(rubric.expected) as (keyof typeof answer.values)[];
      return (
        expectedFields.length > 0 &&
        expectedFields.every((field) => Number.isFinite(answer.values[field])) &&
        Object.values(answer.values).every((value) => Number.isFinite(value))
      );
    }
    case 'decision':
      return (
        answer.kind === rubric.kind &&
        ['trade', 'wait', 'reject', 'no-trade', 'insufficient-evidence'].includes(
          answer.decision,
        ) &&
        (rubric.requiredReasonIds === undefined ||
          (answer.reasonIds !== undefined &&
            answer.reasonIds.length >= rubric.requiredReasonIds.length)) &&
        (answer.reasonIds === undefined || answer.reasonIds.every(isNonEmptyId)) &&
        (answer.optionId === undefined || isNonEmptyId(answer.optionId))
      );
    case 'label-placement':
      return (
        answer.kind === rubric.kind &&
        answer.placements.length >= rubric.targets.length &&
        answer.placements.every(
          ({ labelId, anchor }) => isNonEmptyId(labelId) && isValidAnchor(anchor),
        )
      );
  }
}

/** Throws when persisted data is corrupt or from an unsupported schema. */
export function assertValidGuidedAnalysisSession(
  session: GuidedAnalysisSession,
): asserts session is GuidedAnalysisSession {
  if (session.schemaVersion !== ANALYSIS_SESSION_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported analysis session schema version: ${String(session.schemaVersion)}`,
    );
  }
  assertId(session.sessionId, 'Session ID');
  assertId(session.attemptId, 'Attempt ID');
  assertId(session.finalizationIdempotencyKey, 'Finalization idempotency key');
  if (!Number.isSafeInteger(session.revision) || session.revision < 0) {
    throw new RangeError('Analysis session revision must be a non-negative safe integer');
  }
  assertId(session.exerciseId, 'Exercise ID');
  assertId(session.contentVersionId, 'Content version ID');
  if (!Number.isInteger(session.exerciseSchemaVersion) || session.exerciseSchemaVersion < 1) {
    throw new RangeError('Exercise schema version must be a positive integer');
  }
  assertChartIdentity(session.chart);
  assertTimestamp(session.createdAt, 'Session created timestamp');
  assertTimestamp(session.updatedAt, 'Session updated timestamp');
  if (toTime(session.updatedAt) < toTime(session.createdAt)) {
    throw new RangeError('Session updated timestamp precedes creation');
  }
  if (!ANALYSIS_WORKFLOW_STEP_IDS.includes(session.currentStepId)) {
    throw new Error(`Unknown current analysis step: ${String(session.currentStepId)}`);
  }

  const keys = Object.keys(session.steps);
  if (
    keys.length !== ANALYSIS_WORKFLOW_STEP_IDS.length ||
    keys.some((key) => !ANALYSIS_WORKFLOW_STEP_IDS.includes(key as AnalysisWorkflowStepId))
  ) {
    throw new Error('Analysis session must contain exactly the canonical workflow steps');
  }
  for (const stepId of ANALYSIS_WORKFLOW_STEP_IDS) {
    assertValidStep(
      session.steps[stepId],
      stepId,
      session.createdAt,
      session.updatedAt,
      session.chart.decisionCandleIndex + 1,
    );
  }
  assertSequentialSubmissions(session.steps);
  assertValidAnnotations(session.annotations, session.chart.decisionCandleIndex + 1);
  assertReplay(session.replay, session.chart, session.createdAt, session.updatedAt);

  if (session.status === 'active') {
    if (session.finalizedAt !== undefined || session.finalResult !== undefined) {
      throw new Error('Active analysis session contains finalization data');
    }
    if (session.abandonedAt !== undefined) {
      throw new Error('Active analysis session contains abandonment data');
    }
  } else if (session.status === 'finalized') {
    assertTimestamp(session.finalizedAt, 'Session finalized timestamp');
    if (session.finalizedAt !== session.updatedAt) {
      throw new Error('Finalized and updated timestamps must match');
    }
    if (!ANALYSIS_WORKFLOW_STEP_IDS.every((id) => session.steps[id].status === 'submitted')) {
      throw new Error('A finalized analysis session must have every step submitted');
    }
    assertAttemptResult(session.finalResult);
    if (session.abandonedAt !== undefined) {
      throw new Error('Finalized analysis session contains abandonment data');
    }
  } else if (session.status === 'abandoned') {
    assertTimestamp(session.abandonedAt, 'Session abandoned timestamp');
    if (session.abandonedAt !== session.updatedAt) {
      throw new Error('Abandoned and updated timestamps must match');
    }
    if (session.finalizedAt !== undefined || session.finalResult !== undefined) {
      throw new Error('Abandoned analysis session contains finalization data');
    }
  } else {
    throw new Error(`Unknown analysis session status: ${String(session.status)}`);
  }
}

function updateStepAnswer(
  session: GuidedAnalysisSession,
  action: Extract<GuidedAnalysisSessionAction, { type: 'update-step-answer' }>,
): GuidedAnalysisSession {
  assertActionTime(session, action.updatedAt);
  const rubric = session.steps[action.stepId].rubric;
  const answerComplete = isAtomicExerciseAnswerComplete(rubric, action.answer);
  if (action.answer !== undefined) {
    assertAnswerBounds(action.answer, session.chart.decisionCandleIndex + 1);
  }
  const changedIndex = stepIndex(action.stepId);
  const steps = { ...session.steps };

  for (let index = changedIndex; index < ANALYSIS_WORKFLOW_STEP_IDS.length; index += 1) {
    const stepId = ANALYSIS_WORKFLOW_STEP_IDS[index]!;
    const existing = steps[stepId];
    const wasSubmitted = existing.status === 'submitted';
    steps[stepId] = {
      ...existing,
      ...(index === changedIndex ? { answer: action.answer, answerComplete } : {}),
      status: wasSubmitted ? 'invalidated' : existing.status,
      result: undefined,
      submittedAt: undefined,
      invalidatedAt: wasSubmitted ? action.updatedAt : existing.invalidatedAt,
      updatedAt: index === changedIndex || wasSubmitted ? action.updatedAt : existing.updatedAt,
    };
  }

  return {
    ...session,
    steps,
    currentStepId: action.stepId,
    updatedAt: action.updatedAt,
  };
}

function submitStep(
  session: GuidedAnalysisSession,
  action: Extract<GuidedAnalysisSessionAction, { type: 'submit-step' }>,
): GuidedAnalysisSession {
  assertActionTime(session, action.submittedAt);
  assertAttemptResult(action.result);
  const index = stepIndex(action.stepId);
  const step = session.steps[action.stepId];
  if (session.currentStepId !== action.stepId) {
    throw new Error(`Cannot submit ${action.stepId} while ${session.currentStepId} is current`);
  }
  if (
    !step.answerComplete ||
    step.answer === undefined ||
    !isAtomicExerciseAnswerComplete(step.rubric, step.answer)
  ) {
    throw new Error(`Cannot submit incomplete analysis step: ${action.stepId}`);
  }
  if (step.status === 'submitted') {
    throw new Error(`Analysis step is already submitted: ${action.stepId}`);
  }
  if (
    ANALYSIS_WORKFLOW_STEP_IDS.slice(0, index).some(
      (id) => session.steps[id].status !== 'submitted',
    )
  ) {
    throw new Error(`Cannot submit analysis step before its prerequisites: ${action.stepId}`);
  }

  const steps = {
    ...session.steps,
    [action.stepId]: {
      ...step,
      status: 'submitted' as const,
      result: action.result,
      submittedAt: action.submittedAt,
      invalidatedAt: undefined,
      updatedAt: action.submittedAt,
    },
  };
  const nextStepId = ANALYSIS_WORKFLOW_STEP_IDS[index + 1] ?? action.stepId;
  return {
    ...session,
    steps,
    currentStepId: nextStepId,
    updatedAt: action.submittedAt,
  };
}

function recordHint(
  session: GuidedAnalysisSession,
  action: Extract<GuidedAnalysisSessionAction, { type: 'record-hint' }>,
): GuidedAnalysisSession {
  assertActionTime(session, action.usedAt);
  assertId(action.hintId, 'Hint ID');
  const step = session.steps[action.stepId];
  if (step.hintIdsUsed.includes(action.hintId)) return session;
  return {
    ...session,
    steps: {
      ...session.steps,
      [action.stepId]: {
        ...step,
        hintIdsUsed: [...step.hintIdsUsed, action.hintId],
        updatedAt: action.usedAt,
      },
    },
    updatedAt: action.usedAt,
  };
}

function addReplayCheckpoint(
  session: GuidedAnalysisSession,
  checkpoint: AnalysisReplayCheckpoint,
): GuidedAnalysisSession {
  assertActionTime(session, checkpoint.capturedAt);
  assertId(checkpoint.id, 'Replay checkpoint ID');
  if (session.replay.checkpoints.some(({ id }) => id === checkpoint.id)) {
    throw new Error(`Replay checkpoint ID already exists: ${checkpoint.id}`);
  }
  assertReplayCursor(checkpoint.cursorCandleIndex, session.replay.decisionCandleIndex);
  return {
    ...session,
    replay: {
      ...session.replay,
      cursorCandleIndex: checkpoint.cursorCandleIndex,
      checkpoints: [...session.replay.checkpoints, checkpoint],
    },
    updatedAt: checkpoint.capturedAt,
  };
}

function finalizeSession(
  session: GuidedAnalysisSession,
  action: Extract<GuidedAnalysisSessionAction, { type: 'finalize' }>,
): GuidedAnalysisSession {
  assertActionTime(session, action.finalizedAt);
  assertId(action.attemptId, 'Attempt ID');
  assertId(action.idempotencyKey, 'Finalization idempotency key');
  assertAttemptResult(action.finalResult);
  if (
    action.attemptId !== session.attemptId ||
    action.idempotencyKey !== session.finalizationIdempotencyKey
  ) {
    throw new Error('Finalization identifiers do not match the session allocation');
  }
  if (!ANALYSIS_WORKFLOW_STEP_IDS.every((id) => session.steps[id].status === 'submitted')) {
    throw new Error('Cannot finalize until every analysis step is submitted');
  }
  return {
    ...session,
    status: 'finalized',
    updatedAt: action.finalizedAt,
    finalizedAt: action.finalizedAt,
    finalResult: action.finalResult,
  };
}

function isSameFinalization(
  session: GuidedAnalysisSession,
  action: Extract<GuidedAnalysisSessionAction, { type: 'finalize' }>,
): boolean {
  return (
    session.finalizationIdempotencyKey === action.idempotencyKey &&
    session.attemptId === action.attemptId &&
    attemptResultsEqual(session.finalResult, action.finalResult)
  );
}

function attemptResultsEqual(left: AttemptResult | undefined, right: AttemptResult): boolean {
  if (left === undefined) return false;
  return (
    left.correct === right.correct &&
    left.score === right.score &&
    left.feedbackCode === right.feedbackCode &&
    left.graderVersion === right.graderVersion &&
    JSON.stringify(left.details) === JSON.stringify(right.details) &&
    JSON.stringify(left.misconceptionIds) === JSON.stringify(right.misconceptionIds)
  );
}

function assertValidStep(
  step: AnalysisSessionStepState,
  expectedId: AnalysisWorkflowStepId,
  createdAt: string,
  updatedAt: string,
  visibleCandleCount: number,
): void {
  if (step?.stepId !== expectedId)
    throw new Error(`Invalid state for analysis step: ${expectedId}`);
  assertAtomicRubric(step.rubric, expectedId);
  if (!['draft', 'submitted', 'invalidated'].includes(step.status)) {
    throw new Error(`Unknown analysis step status: ${String(step.status)}`);
  }
  const complete = isAtomicExerciseAnswerComplete(step.rubric, step.answer);
  if (step.answerComplete !== complete) {
    throw new Error(`Stored completeness disagrees with answer for analysis step: ${expectedId}`);
  }
  if (step.answer !== undefined) assertAnswerBounds(step.answer, visibleCandleCount);
  if (new Set(step.hintIdsUsed).size !== step.hintIdsUsed.length) {
    throw new Error(`Duplicate hint IDs for analysis step: ${expectedId}`);
  }
  step.hintIdsUsed.forEach((id) => assertId(id, 'Hint ID'));
  for (const value of [step.updatedAt, step.submittedAt, step.invalidatedAt]) {
    if (value !== undefined) {
      assertTimestamp(value, 'Analysis step timestamp');
      if (toTime(value) < toTime(createdAt) || toTime(value) > toTime(updatedAt)) {
        throw new RangeError(`Analysis step timestamp is outside session bounds: ${expectedId}`);
      }
    }
  }
  if (step.status === 'submitted') {
    if (!step.answerComplete || step.result === undefined || step.submittedAt === undefined) {
      throw new Error(`Submitted analysis step is incomplete: ${expectedId}`);
    }
    if (step.invalidatedAt !== undefined) {
      throw new Error(`Submitted analysis step retains invalidation time: ${expectedId}`);
    }
    assertAttemptResult(step.result);
  } else {
    if (step.result !== undefined || step.submittedAt !== undefined) {
      throw new Error(`Unsubmitted analysis step retains a grading result: ${expectedId}`);
    }
    if (step.status === 'invalidated' && step.invalidatedAt === undefined) {
      throw new Error(`Invalidated analysis step lacks invalidation time: ${expectedId}`);
    }
    if (step.status === 'draft' && step.invalidatedAt !== undefined) {
      throw new Error(`Draft analysis step retains invalidation time: ${expectedId}`);
    }
  }
}

function assertSequentialSubmissions(
  steps: Readonly<Record<AnalysisWorkflowStepId, AnalysisSessionStepState>>,
): void {
  let encounteredUnsubmitted = false;
  for (const id of ANALYSIS_WORKFLOW_STEP_IDS) {
    if (steps[id].status === 'submitted') {
      if (encounteredUnsubmitted)
        throw new Error(`Submitted analysis step has a prerequisite gap: ${id}`);
    } else {
      encounteredUnsubmitted = true;
    }
  }
}

function assertChartIdentity(chart: AnalysisChartIdentity): void {
  assertId(chart.id, 'Chart ID');
  assertId(chart.generatorVersion, 'Chart generator version');
  if (!Number.isSafeInteger(chart.seed)) throw new RangeError('Chart seed must be a safe integer');
  if (!Number.isInteger(chart.candleCount) || chart.candleCount < 1) {
    throw new RangeError('Chart candle count must be a positive integer');
  }
  if (
    !isNonNegativeInteger(chart.decisionCandleIndex) ||
    chart.decisionCandleIndex >= chart.candleCount
  ) {
    throw new RangeError('Chart decision candle is outside chart bounds');
  }
}

function assertReplay(
  replay: AnalysisReplayState,
  chart: AnalysisChartIdentity,
  createdAt: string,
  updatedAt: string,
): void {
  if (replay.decisionCandleIndex !== chart.decisionCandleIndex) {
    throw new Error('Replay and chart decision boundaries disagree');
  }
  assertReplayCursor(replay.cursorCandleIndex, replay.decisionCandleIndex);
  const ids = new Set<string>();
  for (const checkpoint of replay.checkpoints) {
    assertId(checkpoint.id, 'Replay checkpoint ID');
    if (ids.has(checkpoint.id)) throw new Error(`Duplicate replay checkpoint ID: ${checkpoint.id}`);
    ids.add(checkpoint.id);
    if (!ANALYSIS_WORKFLOW_STEP_IDS.includes(checkpoint.stepId)) {
      throw new Error(`Unknown replay checkpoint step: ${String(checkpoint.stepId)}`);
    }
    assertReplayCursor(checkpoint.cursorCandleIndex, replay.decisionCandleIndex);
    assertTimestamp(checkpoint.capturedAt, 'Replay checkpoint timestamp');
    if (
      toTime(checkpoint.capturedAt) < toTime(createdAt) ||
      toTime(checkpoint.capturedAt) > toTime(updatedAt)
    ) {
      throw new RangeError('Replay checkpoint timestamp is outside session bounds');
    }
  }
}

function assertValidAnnotations(
  annotations: readonly LearnerChartAnnotation[],
  candleCount: number,
): void {
  const ids = new Set<string>();
  for (const annotation of annotations) {
    assertId(annotation.id, 'Learner annotation ID');
    if (ids.has(annotation.id))
      throw new Error(`Duplicate learner annotation ID: ${annotation.id}`);
    ids.add(annotation.id);
    switch (annotation.kind) {
      case 'point':
        assertBoundedAnchor(annotation.anchor, candleCount);
        break;
      case 'horizontal-level':
        assertBoundedAnchor(
          { candleIndex: annotation.candleIndex, price: annotation.price },
          candleCount,
        );
        break;
      case 'trendline':
      case 'zone':
        assertBoundedAnchor(annotation.start, candleCount);
        assertBoundedAnchor(annotation.end, candleCount);
        break;
      default:
        throw new Error('Unknown learner annotation kind');
    }
  }
}

function assertAnswerBounds(answer: AtomicExerciseAnswer, visibleCandleCount: number): void {
  switch (answer.kind) {
    case 'point':
      answer.points.forEach((anchor) => assertBoundedAnchor(anchor, visibleCandleCount));
      return;
    case 'zone':
      if (
        answer.zone.startCandleIndex >= visibleCandleCount ||
        answer.zone.endCandleIndex >= visibleCandleCount
      ) {
        throw new RangeError('Analysis answer is outside the decision-safe chart bounds');
      }
      return;
    case 'line':
      assertBoundedAnchor(answer.line.start, visibleCandleCount);
      assertBoundedAnchor(answer.line.end, visibleCandleCount);
      return;
    case 'label-placement':
      answer.placements.forEach(({ anchor }) => assertBoundedAnchor(anchor, visibleCandleCount));
      return;
    case 'multiple-choice':
    case 'selection':
    case 'sequence':
    case 'risk':
    case 'decision':
      return;
  }
}

function assertAttemptResult(result: AttemptResult | undefined): asserts result is AttemptResult {
  if (result === undefined) throw new Error('Attempt result is required');
  if (typeof result.correct !== 'boolean')
    throw new TypeError('Attempt result correctness is invalid');
  if (!Number.isFinite(result.score) || result.score < 0 || result.score > 1) {
    throw new RangeError('Attempt result score must be within 0..1');
  }
  assertId(result.feedbackCode, 'Attempt feedback code');
  assertId(result.graderVersion, 'Grader version');
  for (const detail of result.details) {
    assertId(detail.key, 'Grade detail key');
    if (!['string', 'number', 'boolean'].includes(typeof detail.value)) {
      throw new TypeError('Grade detail value is invalid');
    }
    if (typeof detail.value === 'number' && !Number.isFinite(detail.value)) {
      throw new RangeError('Grade detail number must be finite');
    }
  }
  result.misconceptionIds.forEach((id) => assertId(id, 'Misconception ID'));
}

function assertActionTime(session: GuidedAnalysisSession, value: string): void {
  assertTimestamp(value, 'Action timestamp');
  if (toTime(value) < toTime(session.updatedAt)) {
    throw new RangeError('Action timestamp precedes the latest session update');
  }
}

function assertReplayCursor(cursor: number, decisionBoundary: number): void {
  if (!isNonNegativeInteger(cursor) || cursor > decisionBoundary) {
    throw new RangeError('Replay cursor is outside the decision-safe boundary');
  }
}

function assertBoundedAnchor(
  anchor: { readonly candleIndex: number; readonly price: number },
  candleCount: number,
): void {
  if (!isValidAnchor(anchor) || anchor.candleIndex >= candleCount) {
    throw new RangeError('Learner annotation anchor is outside chart bounds');
  }
}

function isValidAnchor(anchor: { readonly candleIndex: number; readonly price: number }): boolean {
  return isNonNegativeInteger(anchor.candleIndex) && Number.isFinite(anchor.price);
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function stepIndex(stepId: AnalysisWorkflowStepId): number {
  const index = ANALYSIS_WORKFLOW_STEP_IDS.indexOf(stepId);
  if (index < 0) throw new Error(`Unknown analysis workflow step: ${String(stepId)}`);
  return index;
}

function firstUnsubmittedStepIndex(
  steps: Readonly<Record<AnalysisWorkflowStepId, AnalysisSessionStepState>>,
): number {
  const index = ANALYSIS_WORKFLOW_STEP_IDS.findIndex(
    (stepId) => steps[stepId].status !== 'submitted',
  );
  return index < 0 ? ANALYSIS_WORKFLOW_STEP_IDS.length - 1 : index;
}

function assertCanonicalWorkflow(stepIds: readonly string[]): void {
  if (
    stepIds.length !== ANALYSIS_WORKFLOW_STEP_IDS.length ||
    stepIds.some((stepId, index) => stepId !== ANALYSIS_WORKFLOW_STEP_IDS[index])
  ) {
    throw new Error('Analysis workflow must contain the canonical 11 steps in order');
  }
}

function assertStepRubrics(
  rubrics: Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>,
): void {
  if (rubrics === null || typeof rubrics !== 'object') {
    throw new Error('Analysis step rubrics are required');
  }
  const keys = Object.keys(rubrics);
  if (
    keys.length !== ANALYSIS_WORKFLOW_STEP_IDS.length ||
    keys.some((key) => !ANALYSIS_WORKFLOW_STEP_IDS.includes(key as AnalysisWorkflowStepId))
  ) {
    throw new Error('Analysis session must provide exactly the canonical step rubrics');
  }
  for (const stepId of ANALYSIS_WORKFLOW_STEP_IDS) {
    assertAtomicRubric(rubrics[stepId], stepId);
  }
}

function assertAtomicRubric(
  rubric: AtomicAnswerRubric | undefined,
  stepId: AnalysisWorkflowStepId,
): asserts rubric is AtomicAnswerRubric {
  if (
    rubric === undefined ||
    ![
      'multiple-choice',
      'selection',
      'sequence',
      'point',
      'zone',
      'line',
      'risk',
      'decision',
      'label-placement',
    ].includes(rubric.kind)
  ) {
    throw new Error(`Invalid rubric for analysis step: ${stepId}`);
  }
}

function assertId(value: string | undefined, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new Error(`${label} must not be empty`);
}

function isNonEmptyId(value: string): boolean {
  return value.trim().length > 0;
}

function assertTimestamp(value: string | undefined, label: string): asserts value is string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be a valid timestamp`);
  }
}

function toTime(value: string): number {
  return Date.parse(value);
}
