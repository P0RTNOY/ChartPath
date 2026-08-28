import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { exercises, scenarioCandidateRegistry } from '@chartpath/content';
import {
  ANALYSIS_WORKFLOW_STEP_IDS,
  createGuidedAnalysisSession,
  gradeAnswer,
  reduceGuidedAnalysisSession,
  type AnalysisWorkflowStepId,
  type AtomicAnswerRubric,
  type AtomicExerciseAnswer,
  type GuidedAnalysisSession,
} from '@chartpath/domain';
import { ChartPathThemeProvider } from '@chartpath/ui';
import { router } from 'expo-router';

import type { LearningContextValue } from '@/state/learning';
import {
  CURRENT_PERSISTENCE_SCHEMA_VERSION,
  type PersistenceSnapshot,
} from '@/lib/persistence/types';

let mockLearning: LearningContextValue;
const mockRouterPush = jest.mocked(router.push);

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));
jest.mock('@/state/learning', () => ({
  GUIDED_ANALYSIS_EXERCISE_ID: 'u10-capstone-e03',
  useLearning: () => mockLearning,
}));
jest.mock('../guided-analysis-chart', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    GuidedAnalysisChart: ({ session }: { readonly session: GuidedAnalysisSession }) =>
      React.createElement(MockView, {
        accessibilityLabel: `מחברת ${session.status}`,
        testID: 'mock-guided-chart',
      }),
  };
});

import { GuidedAnalysisSessionView } from '../guided-analysis-session';
import { resolveHistoricalReplayScenario } from '@/data/historical-replay';

const exercise = exercises.find(({ id }) => id === 'u10-capstone-e03')!;

function result(correct = true) {
  return {
    correct,
    score: correct ? 1 : 0,
    feedbackCode: correct ? 'correct' : 'incorrect',
    details: [],
    misconceptionIds: [],
    graderVersion: '1.0.0',
  } as const;
}

function session(): GuidedAnalysisSession {
  const decisionCandleIndex = exercise.chartSpec!.decisionCandleIndex!;
  return createGuidedAnalysisSession({
    sessionId: 'guided-ui-session',
    attemptId: 'guided-ui-attempt',
    finalizationIdempotencyKey: 'guided-ui-finalize',
    exerciseId: exercise.id,
    contentVersionId: exercise.contentVersionId,
    exerciseSchemaVersion: exercise.schemaVersion,
    chart: {
      kind: 'synthetic',
      id: exercise.chartSpec!.id,
      seed: exercise.chartSpec!.seed,
      generatorVersion: exercise.chartSpec!.generatorVersion,
      candleCount: Math.min(exercise.chartSpec!.candleCount, decisionCandleIndex + 1),
      decisionCandleIndex,
    },
    createdAt: '2026-08-24T10:00:00.000Z',
    initialReplayCursorCandleIndex: 23,
    workflowStepIds: ANALYSIS_WORKFLOW_STEP_IDS,
    stepRubrics: Object.fromEntries(
      exercise.capstoneSteps!.map((step) => [step.id, step.rubric]),
    ) as Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>,
  });
}

function snapshot(analysisSessions: readonly GuidedAnalysisSession[]): PersistenceSnapshot {
  return {
    metadata: {
      schemaVersion: CURRENT_PERSISTENCE_SCHEMA_VERSION,
      contentVersion: exercise.contentVersionId,
      projectorVersion: 1,
      createdAt: '2026-08-24T10:00:00.000Z',
      updatedAt: '2026-08-24T10:00:00.000Z',
    },
    settings: {
      theme: 'light',
      reducedMotion: false,
      hapticsEnabled: true,
      textScale: 'system',
      dailyGoalMinutes: 10,
      disclaimerVersionAccepted: 'accepted',
      disclaimerAcceptedAt: '2026-08-24T10:00:00.000Z',
    },
    attempts: [],
    analysisSessions,
    quarantinedAnalysisSessions: [],
    paperExecutionSessions: [],
    quarantinedPaperExecutionSessions: [],
    positionManagementSessions: [],
    quarantinedPositionManagementSessions: [],
    projections: {
      projectorVersion: 1,
      lastAppliedAttemptId: null,
      lessonProgress: {},
      skillMastery: {},
      reviewState: {},
      dailyActivity: {},
      totalXp: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
  };
}

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
        placements: rubric.targets.map((target) => ({
          labelId: target.labelId,
          anchor: target.target,
        })),
      };
  }
}

function finalizedSession(initial: GuidedAnalysisSession = session()): GuidedAnalysisSession {
  let current = initial;
  ANALYSIS_WORKFLOW_STEP_IDS.forEach((stepId, index) => {
    const timestamp = `2026-08-24T10:${String(index + 1).padStart(2, '0')}:00.000Z`;
    const rubric = current.steps[stepId].rubric;
    const answer = correctAnswer(rubric);
    current = reduceGuidedAnalysisSession(current, {
      type: 'update-step-answer',
      stepId,
      answer,
      updatedAt: timestamp,
    });
    current = reduceGuidedAnalysisSession(current, {
      type: 'submit-step',
      stepId,
      result: gradeAnswer(rubric, answer),
      submittedAt: timestamp,
    });
  });
  return reduceGuidedAnalysisSession(current, {
    type: 'finalize',
    attemptId: current.attemptId,
    idempotencyKey: current.finalizationIdempotencyKey,
    finalResult: result(),
    finalizedAt: '2026-08-24T11:00:00.000Z',
  });
}

function candidateSession(application: 'long' | 'short' | 'no-trade'): {
  readonly candidate: (typeof scenarioCandidateRegistry)[number];
  readonly session: GuidedAnalysisSession;
} {
  const candidate = scenarioCandidateRegistry.find(({ manifest }) =>
    application === 'no-trade'
      ? manifest.application.kind === 'no-trade'
      : manifest.application.kind === 'trade' && manifest.application.direction === application,
  )!;
  const resolved = resolveHistoricalReplayScenario(
    candidate.scenario.scenarioId,
    undefined,
    candidate.scenario.scenarioVersion,
  );
  if (resolved.status !== 'ready') throw new Error(resolved.message);
  return {
    candidate,
    session: createGuidedAnalysisSession({
      sessionId: `candidate-${application}-session`,
      attemptId: `candidate-${application}-attempt`,
      finalizationIdempotencyKey: `candidate-${application}-finalize`,
      exerciseId: candidate.gradingExercise.id,
      contentVersionId: candidate.gradingExercise.contentVersionId,
      exerciseSchemaVersion: candidate.gradingExercise.schemaVersion,
      chart: resolved.chartIdentity,
      createdAt: '2026-08-24T10:00:00.000Z',
      initialReplayCursorCandleIndex: candidate.scenario.initialVisibleRange.endCandleIndex,
      workflowStepIds: ANALYSIS_WORKFLOW_STEP_IDS,
      stepRubrics: Object.fromEntries(
        candidate.gradingExercise.capstoneSteps!.map((step) => [step.id, step.rubric]),
      ) as Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>,
    }),
  };
}

function historicalSession(): GuidedAnalysisSession {
  const resolved = resolveHistoricalReplayScenario('blind-generated-development-scenario');
  if (resolved.status !== 'ready') throw new Error('Historical fixture unavailable');
  return createGuidedAnalysisSession({
    sessionId: 'historical-ui-session',
    attemptId: 'historical-ui-attempt',
    finalizationIdempotencyKey: 'historical-ui-finalize',
    exerciseId: exercise.id,
    contentVersionId: exercise.contentVersionId,
    exerciseSchemaVersion: exercise.schemaVersion,
    chart: resolved.chartIdentity,
    createdAt: '2026-08-24T10:00:00.000Z',
    initialReplayCursorCandleIndex: 23,
    workflowStepIds: ANALYSIS_WORKFLOW_STEP_IDS,
    stepRubrics: Object.fromEntries(
      exercise.capstoneSteps!.map((step) => [step.id, step.rubric]),
    ) as Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>,
  });
}

function learningValue(current: GuidedAnalysisSession): LearningContextValue {
  return {
    status: 'ready',
    error: null,
    snapshot: snapshot([current]),
    updateSettings: jest.fn(),
    acceptDisclaimer: jest.fn(),
    submitAttempt: jest.fn(),
    createOrResumeAnalysisSession: jest.fn(async () => current),
    saveAnalysisSession: jest.fn(async (saved) => saved),
    abandonAnalysisSession: jest.fn(async () => current),
    restartAnalysisSession: jest.fn(async () => current),
    finalizeAnalysisSession: jest.fn(async () => result()),
    createOrResumePaperExecutionSession: jest.fn(),
    savePaperExecutionPlan: jest.fn(),
    submitPaperExecutionSession: jest.fn(),
    advancePaperExecutionSession: jest.fn(),
    completePaperExecutionReplay: jest.fn(),
    cancelPaperExecutionOrder: jest.fn(),
    abandonPaperExecutionSession: jest.fn(),
    createOrResumePositionManagementSession: jest.fn(),
    savePositionManagementDraft: jest.fn(),
    submitPositionManagementDraft: jest.fn(),
    cancelPendingPositionManagementAction: jest.fn(),
    recordPositionManagementObservation: jest.fn(),
    correctPositionManagementJournal: jest.fn(),
    advancePositionManagementSession: jest.fn(),
    completePositionManagementReplay: jest.fn(),
    discardQuarantinedAnalysisSessions: jest.fn(),
    discardQuarantinedPaperExecutionSessions: jest.fn(),
    discardQuarantinedPositionManagementSessions: jest.fn(),
    previewRecoveryImport: jest.fn(),
    applyRecoveryImport: jest.fn(),
    resetData: jest.fn(),
    reload: jest.fn(),
  };
}

function renderSession(current: GuidedAnalysisSession) {
  mockLearning = learningValue(current);
  return render(
    <ChartPathThemeProvider direction="rtl" mode="light">
      <GuidedAnalysisSessionView
        accessMode={
          current.chart.kind === 'historical' && current.chart.learningCredit === 'none'
            ? 'qa-internal'
            : 'ordinary'
        }
        persistedSession={current}
      />
    </ChartPathThemeProvider>,
  );
}

describe('GuidedAnalysisSessionView', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_CHARTPATH_REVIEWER_MODE = '1';
  });

  it('accepts the persisted full source count even when the decision cutoff is earlier', async () => {
    const current = session();
    expect(current.chart.candleCount).toBe(current.chart.decisionCandleIndex + 1);

    const screen = await renderSession(current);
    expect(screen.getByTestId('guided-analysis-session')).toBeTruthy();
  });

  it('flushes the current revision through the serialized save queue when backgrounded', async () => {
    let onAppStateChange: ((state: AppStateStatus) => void) | undefined;
    const subscription = { remove: jest.fn() };
    const listener = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, handler) => {
        onAppStateChange = handler;
        return subscription;
      });
    const current = session();
    const screen = await renderSession(current);
    const save = mockLearning.saveAnalysisSession as jest.Mock;
    save.mockClear();

    await act(async () => onAppStateChange?.('background'));
    await waitFor(() => expect(save).toHaveBeenCalledWith(current));

    await act(async () => screen.unmount());
    await waitFor(() => expect(subscription.remove).toHaveBeenCalled());
    listener.mockRestore();
  });

  it('shows progress, gates submission, autosaves, and visibly invalidates a revised step', async () => {
    const screen = await renderSession(session());

    expect(screen.getByTestId('guided-analysis-session')).toBeTruthy();
    expect(screen.getAllByText('0/11').length).toBeGreaterThan(0);
    expect(screen.getAllByText('טיוטה').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'הגשת השלב' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'השלב הבא' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'המגמה השבועית עולה' }));
    await fireEvent.press(
      screen.getByRole('checkbox', { name: 'הרעיון הוא מכירה בחסר נגד המגמה' }),
    );
    expect(screen.getByRole('button', { name: 'הגשת השלב' })).toBeEnabled();
    await fireEvent.press(screen.getByRole('button', { name: 'הגשת השלב' }));

    await waitFor(() => expect(mockLearning.saveAnalysisSession).toHaveBeenCalled());
    expect(screen.getAllByText('1/11').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('button', { name: /שלב 1: הקשר, הוגש/ }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'המגמה השבועית עולה' }));
    expect(screen.getAllByText('דורש בדיקה מחדש').length).toBeGreaterThan(0);
  });

  it('renders a finalized session as a read-only process debrief', async () => {
    const current = finalizedSession();
    const screen = await renderSession(current);

    expect(screen.getByTestId('guided-analysis-debrief')).toBeTruthy();
    expect(screen.getByText('ציון תהליך')).toBeTruthy();
    expect(screen.getAllByText('מדויק')).toHaveLength(11);
    expect(screen.getByLabelText('מחברת finalized')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'הגשת השלב' })).toBeNull();
  });

  it('shows a verified blind historical shell without pre-final identity or terms', async () => {
    const screen = await renderSession(historicalSession());
    const serialized = JSON.stringify(screen.toJSON());

    expect(screen.getByTestId('historical-session-disclosure')).toBeTruthy();
    expect(screen.getByText(/הזהות והתאריכים מוסתרים עד הסיום/)).toBeTruthy();
    expect(screen.getByText(/ללא.*XP.*רגיל/)).toBeTruthy();
    expect(serialized).not.toMatch(/DEV-BLIND-001|Generated fixture 001|2025-01-05|github\.com/);
  });

  it('blocks editing when the pinned historical dataset identity changed', async () => {
    const current = historicalSession();
    if (current.chart.kind !== 'historical') throw new Error('Expected historical identity');
    const screen = await renderSession({
      ...current,
      chart: { ...current.chart, datasetVersion: 'modified-version' },
    });

    expect(screen.getByText('גרסת הטיוטה אינה תואמת')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'הגשת השלב' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'סיום מפורש של הניתוח' })).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/Generated fixture 001|2025-01-05/);
  });

  it.each(['long', 'short', 'no-trade'] as const)(
    'keeps an internal %s candidate blind until finalization and then uses its own rubric',
    async (application) => {
      const candidate = candidateSession(application);
      const active = await renderSession(candidate.session);
      const hidden = JSON.stringify(active.toJSON());
      expect(active.getByTestId('historical-session-disclosure')).toBeTruthy();
      expect(hidden).not.toContain(candidate.candidate.manifest.titleHe);
      expect(hidden).not.toContain(candidate.candidate.manifest.scenarioId);
      expect(hidden).not.toContain(candidate.candidate.manifest.datasetId);
      expect(hidden).not.toContain(candidate.candidate.dataset.manifest.canonicalChecksum);
      expect(hidden).not.toContain(candidate.candidate.manifest.source.sourceId);
      expect(hidden).not.toContain(candidate.candidate.manifest.source.section);
      expect(hidden).not.toContain(candidate.candidate.exercise.safetyNoteHe);
      expect(hidden).not.toMatch(/לונג|שורט/);
      if (candidate.candidate.manifest.application.kind === 'trade') {
        expect(hidden).not.toContain(candidate.candidate.manifest.application.direction);
      }
      await active.unmount();

      const debrief = await renderSession(finalizedSession(candidate.session));
      expect(debrief.getByText(candidate.candidate.scenario.revealedTitleHebrew)).toBeTruthy();
      if (application === 'no-trade') {
        expect(debrief.getByTestId('guided-analysis-no-trade-terminal')).toBeTruthy();
        expect(debrief.queryByTestId('paper-execution-launch-card')).toBeNull();
      } else {
        expect(debrief.getByTestId('paper-execution-launch-card')).toBeTruthy();
        expect(
          debrief.getByText(`הניתוח קבע: ${application === 'long' ? 'לונג' : 'שורט'}`),
        ).toBeTruthy();
      }
      await debrief.unmount();
    },
  );

  it('reveals finalized provenance, keeps no-trade out of paper execution, and restarts the source', async () => {
    const current = finalizedSession(historicalSession());
    const screen = await renderSession(current);

    expect(screen.getByTestId('historical-replay-reveal')).toBeTruthy();
    expect(screen.getByTestId('internal-qa-boundary')).toBeTruthy();
    expect(screen.getByText(/Generated fixture 001/)).toBeTruthy();
    expect(screen.getByText(/2025-01-05/)).toBeTruthy();
    expect(screen.getByText('זהו תרשים היסטורי; הזהות והתוצאה הוסתרו עד לסיום.')).toBeTruthy();
    expect(screen.getByText('הציון מעריך את תהליך הניתוח, לא את תוצאת השוק.')).toBeTruthy();
    expect(screen.getByText('תוצאה היסטורית אינה מבטיחה תוצאה עתידית.')).toBeTruthy();
    expect(screen.getByText('אין כאן המלצה עדכנית לקנייה, מכירה או פעולה.')).toBeTruthy();
    expect(screen.getByTestId('historical-no-credit')).toBeTruthy();
    expect(screen.queryByTestId('paper-execution-launch-card')).toBeNull();
    expect(screen.getByTestId('guided-analysis-no-trade-terminal')).toBeTruthy();
    expect(screen.queryByTestId('paper-execution-launch')).toBeNull();
    expect(screen.getByText(/״אין עסקה״ היא תשובת תהליך מלאה/)).toBeTruthy();
    expect(screen.queryByText('מיומנויות שהודגמו')).toBeNull();
    expect(mockRouterPush).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'ניתוח חדש' }));
    expect(mockLearning.createOrResumeAnalysisSession).toHaveBeenCalledWith({
      kind: 'historical',
      scenarioId: 'blind-generated-development-scenario',
      scenarioVersion: '1.0.0-dev',
      accessMode: 'qa-internal',
    });
  });
});
