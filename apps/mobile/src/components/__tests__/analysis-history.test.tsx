import { fireEvent, render, within } from '@testing-library/react-native';

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

import { AnalysisHistory } from '../analysis-history';
import { resolveHistoricalReplayScenario } from '@/data/historical-replay';
import type { LearningContextValue } from '@/state/learning';

let mockLearning: LearningContextValue;

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/state/learning', () => ({ useLearning: () => mockLearning }));

const exercise = exercises.find(({ id }) => id === 'u10-capstone-e03')!;
const mockPush = jest.mocked(router.push);

function historicalSession(
  sessionId: string,
  status: GuidedAnalysisSession['status'],
): GuidedAnalysisSession {
  const resolved = resolveHistoricalReplayScenario('blind-generated-development-scenario');
  if (resolved.status !== 'ready') throw new Error('Historical fixture unavailable');
  const created = createGuidedAnalysisSession({
    sessionId,
    attemptId: `${sessionId}-attempt`,
    finalizationIdempotencyKey: `${sessionId}-finalize`,
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
  return { ...created, status };
}

function renderHistory(sessions: readonly GuidedAnalysisSession[], developmentMode = true) {
  mockLearning = {
    status: 'ready',
    error: null,
    snapshot: {
      analysisSessions: sessions,
      quarantinedAnalysisSessions: [],
    } as unknown as NonNullable<LearningContextValue['snapshot']>,
    abandonAnalysisSession: jest.fn(),
    reload: jest.fn(),
  } as unknown as LearningContextValue;
  return render(
    <ChartPathThemeProvider direction="rtl" mode="light">
      <AnalysisHistory developmentMode={developmentMode} />
    </ChartPathThemeProvider>,
  );
}

describe('AnalysisHistory historical replay', () => {
  beforeEach(() => mockPush.mockClear());

  it('keeps active identity blind and reveals provenance only for finalized read-only debriefs', async () => {
    const active = historicalSession('historical-active', 'active');
    const finalized = historicalSession('historical-finalized', 'finalized');
    const screen = await renderHistory([active, finalized]);
    const activeCard = screen.getAllByTestId('analysis-history-active')[0]!;

    expect(screen.getByText('תרחיש היסטורי שמור — הזהות מוסתרת')).toBeTruthy();
    expect(within(activeCard).queryByText(/Generated fixture 001|2025-01-05/)).toBeNull();
    expect(screen.getByTestId('historical-history-reveal')).toBeTruthy();
    expect(screen.getByText(/Generated fixture 001/)).toBeTruthy();
    expect(screen.getAllByText(/ללא.*XP.*שליטה.*חזרה/)).toHaveLength(2);

    fireEvent.press(screen.getByRole('button', { name: 'פתיחת התחקיר' }));
    expect(mockPush).toHaveBeenCalledWith('/analysis?sessionId=historical-finalized&qa=1');
    expect(screen.queryByRole('button', { name: /עריכה/ })).toBeNull();
  });

  it('preserves but hides persisted internal QA sessions in production history', async () => {
    const persisted = historicalSession('persisted-production-hidden', 'finalized');
    const screen = await renderHistory([persisted], false);
    expect(screen.queryByTestId('historical-history-reveal')).toBeNull();
    expect(screen.queryByText(/Generated fixture 001/)).toBeNull();
    expect(screen.getByText('עדיין אין ניתוחים')).toBeTruthy();
    expect(mockLearning.snapshot?.analysisSessions).toEqual([persisted]);
  });
});
