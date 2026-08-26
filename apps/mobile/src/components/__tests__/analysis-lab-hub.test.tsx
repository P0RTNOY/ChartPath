import { fireEvent, render } from '@testing-library/react-native';

import { exercises } from '@chartpath/content';
import {
  ANALYSIS_WORKFLOW_STEP_IDS,
  createGuidedAnalysisSession,
  type AnalysisWorkflowStepId,
  type AtomicAnswerRubric,
  type GuidedAnalysisSession,
} from '@chartpath/domain';
import { ChartPathThemeProvider } from '@chartpath/ui';
import { router } from 'expo-router';

import { AnalysisLabHub } from '../analysis-lab-hub';
import { resolveHistoricalReplayScenario } from '@/data/historical-replay';
import type { LearningContextValue } from '@/state/learning';

let mockLearning: LearningContextValue;

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/state/learning', () => ({
  GUIDED_ANALYSIS_EXERCISE_ID: 'u10-capstone-e03',
  useLearning: () => mockLearning,
}));

const exercise = exercises.find(({ id }) => id === 'u10-capstone-e03')!;
const mockPush = jest.mocked(router.push);

function historicalSession(): GuidedAnalysisSession {
  const resolved = resolveHistoricalReplayScenario('blind-generated-development-scenario');
  if (resolved.status !== 'ready') throw new Error('Historical fixture unavailable');
  return createGuidedAnalysisSession({
    sessionId: 'historical-active-session',
    attemptId: 'historical-attempt',
    finalizationIdempotencyKey: 'historical-finalize',
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

function learning(sessions: readonly GuidedAnalysisSession[]): LearningContextValue {
  const createOrResumeAnalysisSession = jest.fn(async () => historicalSession());
  return {
    status: 'ready',
    error: null,
    snapshot: {
      analysisSessions: sessions,
      quarantinedAnalysisSessions: [],
      paperExecutionSessions: [],
      quarantinedPaperExecutionSessions: [],
      positionManagementSessions: [],
      quarantinedPositionManagementSessions: [],
      attempts: [],
      projections: {},
      settings: {},
      metadata: {},
    } as unknown as NonNullable<LearningContextValue['snapshot']>,
    createOrResumeAnalysisSession,
    restartAnalysisSession: jest.fn(async () => historicalSession()),
    discardQuarantinedAnalysisSessions: jest.fn(),
    discardQuarantinedPaperExecutionSessions: jest.fn(),
    discardQuarantinedPositionManagementSessions: jest.fn(),
    previewRecoveryImport: jest.fn(),
    applyRecoveryImport: jest.fn(),
    updateSettings: jest.fn(),
    acceptDisclaimer: jest.fn(),
    submitAttempt: jest.fn(),
    saveAnalysisSession: jest.fn(),
    abandonAnalysisSession: jest.fn(),
    finalizeAnalysisSession: jest.fn(),
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
    resetData: jest.fn(),
    reload: jest.fn(),
  } as LearningContextValue;
}

function renderHub(sessions: readonly GuidedAnalysisSession[] = [], developmentMode = true) {
  mockLearning = learning(sessions);
  return render(
    <ChartPathThemeProvider direction="rtl" mode="light">
      <AnalysisLabHub developmentMode={developmentMode} />
    </ChartPathThemeProvider>,
  );
}

describe('AnalysisLabHub historical replay', () => {
  beforeEach(() => mockPush.mockClear());

  it('keeps synthetic entry intact and routes ordinary users to the publication-gated library', async () => {
    const screen = await renderHub();

    expect(screen.getByRole('button', { name: 'התחלת ניתוח חדש' })).toBeTruthy();
    expect(screen.getByTestId('historical-scenario-library-entry')).toBeTruthy();
    expect(screen.getByText(/שערי פרסום וביקורת/)).toBeTruthy();
    expect(screen.getByText(/מועמדים סינתטיים.*אינם מופיעים/)).toBeTruthy();

    fireEvent.press(screen.getByTestId('historical-scenario-library-open'));
    expect(mockPush).toHaveBeenCalledWith('/historical-scenarios');
    expect(mockLearning.createOrResumeAnalysisSession).not.toHaveBeenCalled();
  });

  it('shows a separate blind resume action without revealing market identity', async () => {
    const screen = await renderHub([historicalSession()]);
    const serialized = JSON.stringify(screen.toJSON());

    expect(screen.getByTestId('historical-analysis-resume-card')).toBeTruthy();
    expect(screen.getByRole('button', { name: /המשך.*Replay.*עיוור/ })).toBeTruthy();
    expect(serialized).not.toMatch(/DEV-BLIND-001|Generated fixture 001|2025-01-05/);
    fireEvent.press(screen.getByRole('button', { name: /המשך.*Replay.*עיוור/ }));
    expect(mockPush).toHaveBeenCalledWith('/analysis?sessionId=historical-active-session&qa=1');
  });

  it('preserves but does not advertise persisted internal QA analysis in production Lab', async () => {
    const persisted = historicalSession();
    const screen = await renderHub([persisted], false);
    expect(screen.queryByTestId('historical-analysis-resume-card')).toBeNull();
    expect(screen.queryByRole('button', { name: /המשך.*Replay/ })).toBeNull();
    expect(mockLearning.snapshot?.analysisSessions).toEqual([persisted]);
  });
});
