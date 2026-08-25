import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ChartPathThemeProvider } from '@chartpath/ui';

import HistoricalScenarioQaRoute from '../historical-scenario-qa';

let mockDeveloper: string | undefined;
const mockCreateOrResumeAnalysisSession = jest.fn();
const mockPositionManagementJourneyForKey = jest.fn();
const mockCompletePositionManagementQaAnalysis = jest.fn((session) => session);
const mockSaveAnalysisSession = jest.fn();
const mockFinalizeAnalysisSession = jest.fn();
const mockCreatePaper = jest.fn();
const mockSubmitPaper = jest.fn();
const mockAdvancePaper = jest.fn();
const mockCreateManagement = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ developer: mockDeveloper }),
}));
jest.mock('@/data/scenario-qa', () => ({
  blindQaCandidateCards: () => [
    {
      qaKey: 'candidate-01',
      ordinal: 1,
      readinessHe: 'הידור מבני הושלם — עדיין לא אושר לפרסום',
    },
  ],
  qaScenarioIdentityForKey: () => ({
    scenarioId: 'SECRET-SCENARIO-ID',
    scenarioVersion: '2.1.0',
  }),
  positionManagementQaJourneyForKey: (...args: unknown[]) =>
    mockPositionManagementJourneyForKey(...args),
  completePositionManagementQaAnalysis: (session: unknown) =>
    mockCompletePositionManagementQaAnalysis(session),
  revealedQaCandidateDetail: jest.fn(),
}));
jest.mock('@/state/learning', () => ({
  useLearning: () => ({
    createOrResumeAnalysisSession: mockCreateOrResumeAnalysisSession,
    restartAnalysisSession: jest.fn(),
    saveAnalysisSession: mockSaveAnalysisSession,
    finalizeAnalysisSession: mockFinalizeAnalysisSession,
    createOrResumePaperExecutionSession: mockCreatePaper,
    submitPaperExecutionSession: mockSubmitPaper,
    advancePaperExecutionSession: mockAdvancePaper,
    createOrResumePositionManagementSession: mockCreateManagement,
  }),
}));

const mockPush = jest.mocked(router.push);

describe('HistoricalScenarioQaRoute', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockCreateOrResumeAnalysisSession.mockReset();
    mockPositionManagementJourneyForKey.mockReset();
  });

  it('builds a real exact-version open-paper management journey before routing', async () => {
    mockDeveloper = '1';
    mockPositionManagementJourneyForKey.mockReturnValue({
      scenarioId: 'SECRET-SCENARIO-ID',
      scenarioVersion: '2.1.0',
      plan: { planId: 'authored-plan' },
    });
    const active = { sessionId: 'qa-management-analysis', status: 'active' };
    const completed = { ...active, status: 'active', completed: true };
    const saved = { ...completed };
    mockCompletePositionManagementQaAnalysis.mockReturnValue(completed);
    mockCreateOrResumeAnalysisSession.mockResolvedValue(active);
    mockSaveAnalysisSession.mockResolvedValue(saved);
    mockFinalizeAnalysisSession.mockResolvedValue({});
    mockCreatePaper.mockResolvedValue({ sessionId: 'qa-paper', status: 'draft' });
    mockSubmitPaper.mockResolvedValue({ sessionId: 'qa-paper', status: 'working' });
    mockAdvancePaper.mockResolvedValue({
      sessionId: 'qa-paper',
      status: 'open',
      position: { status: 'open' },
    });
    mockCreateManagement.mockResolvedValue({ sessionId: 'qa-management' });
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <HistoricalScenarioQaRoute />
      </ChartPathThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId('scenario-qa-ack'));
    await fireEvent.press(screen.getByTestId('scenario-qa-enter'));
    await fireEvent.press(screen.getByTestId('scenario-qa-select-candidate-01'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('scenario-qa-start-candidate-01'));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockSaveAnalysisSession).toHaveBeenCalledWith(completed);
      expect(mockFinalizeAnalysisSession).toHaveBeenCalledWith(saved);
      expect(mockCreatePaper).toHaveBeenCalledWith('qa-management-analysis', {
        planId: 'authored-plan',
      });
      expect(mockSubmitPaper).toHaveBeenCalledWith('qa-paper', 'management-qa-submit:qa-paper');
      expect(mockAdvancePaper).toHaveBeenCalledWith('qa-paper', 1);
      expect(mockCreateManagement).toHaveBeenCalledWith('qa-paper');
      expect(mockPush).toHaveBeenCalledWith(
        '/paper-execution?analysisSessionId=qa-management-analysis',
      );
    });
  });

  it('fails closed without the explicit developer route flag', async () => {
    mockDeveloper = undefined;
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <HistoricalScenarioQaRoute />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByTestId('scenario-qa-unavailable')).toBeTruthy();
    expect(screen.queryByTestId('scenario-qa-gate')).toBeNull();
  });

  it('opens only the acknowledgment gate and keeps candidate details absent', async () => {
    mockDeveloper = '1';
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <HistoricalScenarioQaRoute />
      </ChartPathThemeProvider>,
    );
    const serialized = JSON.stringify(screen.toJSON());

    expect(screen.getByTestId('scenario-qa-gate')).toBeTruthy();
    expect(serialized).not.toMatch(/candidate-01|לונג|שורט|ta-he-v2|PDF|sha256|checksum/);
  });

  it('resolves and starts the selected candidate only from the acknowledged blind action', async () => {
    mockDeveloper = '1';
    mockCreateOrResumeAnalysisSession.mockImplementation(async () => ({
      sessionId: 'qa-session-1',
    }));
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <HistoricalScenarioQaRoute />
      </ChartPathThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId('scenario-qa-ack'));
    await fireEvent.press(screen.getByTestId('scenario-qa-enter'));
    await fireEvent.press(screen.getByTestId('scenario-qa-select-candidate-01'));
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/SECRET-SCENARIO-ID/);
    await act(async () => {
      fireEvent.press(screen.getByTestId('scenario-qa-start-candidate-01'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockCreateOrResumeAnalysisSession).toHaveBeenCalledWith({
        kind: 'historical',
        scenarioId: 'SECRET-SCENARIO-ID',
        scenarioVersion: '2.1.0',
        accessMode: 'qa-internal',
      });
      expect(mockPush).toHaveBeenCalledWith('/analysis?sessionId=qa-session-1');
    });
  });
});
