import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { exercises } from '@chartpath/content';
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

import type { LearningContextValue } from '@/state/learning';
import { CURRENT_PERSISTENCE_SCHEMA_VERSION, type PersistenceSnapshot } from '@/lib/persistence';

let mockLearning: LearningContextValue;

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
  exercise.capstoneSteps!.forEach((step, index) => {
    const timestamp = `2026-08-24T10:${String(index + 1).padStart(2, '0')}:00.000Z`;
    const answer = correctAnswer(step.rubric);
    current = reduceGuidedAnalysisSession(current, {
      type: 'update-step-answer',
      stepId: step.id,
      answer,
      updatedAt: timestamp,
    });
    current = reduceGuidedAnalysisSession(current, {
      type: 'submit-step',
      stepId: step.id,
      result: gradeAnswer(step.rubric, answer),
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
    discardQuarantinedAnalysisSessions: jest.fn(),
    resetData: jest.fn(),
    reload: jest.fn(),
  };
}

function renderSession(current: GuidedAnalysisSession) {
  mockLearning = learningValue(current);
  return render(
    <ChartPathThemeProvider direction="rtl" mode="light">
      <GuidedAnalysisSessionView persistedSession={current} />
    </ChartPathThemeProvider>,
  );
}

describe('GuidedAnalysisSessionView', () => {
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

  it('reveals finalized provenance, explains no-credit behavior, and restarts the same source', async () => {
    const current = finalizedSession(historicalSession());
    const screen = await renderSession(current);

    expect(screen.getByTestId('historical-replay-reveal')).toBeTruthy();
    expect(screen.getByText(/Generated fixture 001/)).toBeTruthy();
    expect(screen.getByText(/2025-01-05/)).toBeTruthy();
    expect(screen.getByText('זהו תרשים היסטורי; הזהות והתוצאה הוסתרו עד לסיום.')).toBeTruthy();
    expect(screen.getByText('הציון מעריך את תהליך הניתוח, לא את תוצאת השוק.')).toBeTruthy();
    expect(screen.getByText('תוצאה היסטורית אינה מבטיחה תוצאה עתידית.')).toBeTruthy();
    expect(screen.getByText('אין כאן המלצה עדכנית לקנייה, מכירה או פעולה.')).toBeTruthy();
    expect(screen.getByTestId('historical-no-credit')).toBeTruthy();
    expect(screen.queryByText('מיומנויות שהודגמו')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'ניתוח חדש' }));
    expect(mockLearning.createOrResumeAnalysisSession).toHaveBeenCalledWith({
      kind: 'historical',
      scenarioId: 'blind-generated-development-scenario',
    });
  });
});
