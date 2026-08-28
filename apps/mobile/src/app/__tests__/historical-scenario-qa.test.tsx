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
let mockSnapshot: {
  readonly analysisSessions: readonly {
    readonly sessionId: string;
    readonly status: string;
    readonly updatedAt: string;
    readonly chart: {
      readonly kind: string;
      readonly scenarioId: string;
      readonly scenarioVersion: string;
    };
  }[];
  readonly paperExecutionSessions: readonly {
    readonly source: { readonly analysisSessionId: string };
    readonly status: string;
  }[];
} | null;
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
    {
      qaKey: 'candidate-11',
      ordinal: 11,
      readinessHe: 'הידור מבני הושלם — עדיין לא אושר לפרסום',
    },
    {
      qaKey: 'candidate-12',
      ordinal: 12,
      readinessHe: 'הידור מבני הושלם — עדיין לא אושר לפרסום',
    },
  ],
  qaScenarioIdentityForKey: (qaKey: string) =>
    qaKey === 'candidate-11'
      ? { scenarioId: 'internal-long-range-breakout', scenarioVersion: '2.1.0' }
      : qaKey === 'candidate-12'
        ? { scenarioId: 'internal-short-double-top', scenarioVersion: '2.0.0' }
        : { scenarioId: 'SECRET-SCENARIO-ID', scenarioVersion: '2.1.0' },
  positionManagementQaJourneyForKey: (...args: unknown[]) =>
    mockPositionManagementJourneyForKey(...args),
  completePositionManagementQaAnalysis: (session: unknown) =>
    mockCompletePositionManagementQaAnalysis(session),
  revealedQaCandidateDetail: jest.fn(),
}));
jest.mock('@/state/learning', () => ({
  useLearning: () => ({
    snapshot: mockSnapshot,
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
    jest.clearAllMocks();
    mockCreateOrResumeAnalysisSession.mockReset();
    mockPositionManagementJourneyForKey.mockReset();
    mockSnapshot = null;
    process.env.EXPO_PUBLIC_CHARTPATH_REVIEWER_MODE = '1';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_CHARTPATH_REVIEWER_MODE;
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
      expect(mockCreatePaper).toHaveBeenCalledWith(
        'qa-management-analysis',
        { planId: 'authored-plan' },
        'qa-internal',
      );
      expect(mockSubmitPaper).toHaveBeenCalledWith(
        'qa-paper',
        'management-qa-submit:qa-paper',
        'qa-internal',
      );
      expect(mockAdvancePaper).toHaveBeenCalledWith('qa-paper', 1, 'qa-internal');
      expect(mockCreateManagement).toHaveBeenCalledWith('qa-paper', 'qa-internal');
      expect(mockPush).toHaveBeenCalledWith(
        '/paper-execution?analysisSessionId=qa-management-analysis&qa=1',
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

  it('fails closed when the reviewer build flag is absent', async () => {
    mockDeveloper = '1';
    delete process.env.EXPO_PUBLIC_CHARTPATH_REVIEWER_MODE;
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
      expect(mockPush).toHaveBeenCalledWith('/analysis?sessionId=qa-session-1&qa=1');
    });
  });

  it.each(['candidate-11', 'candidate-12'])(
    'starts %s at ordinary Guided Analysis without invoking the management shortcut',
    async (qaKey) => {
      mockDeveloper = '1';
      mockCreateOrResumeAnalysisSession.mockResolvedValue({
        sessionId: `full-lifecycle-${qaKey}`,
        status: 'active',
      });
      const screen = await render(
        <ChartPathThemeProvider direction="rtl" mode="light">
          <HistoricalScenarioQaRoute />
        </ChartPathThemeProvider>,
      );

      await fireEvent.press(screen.getByTestId('scenario-qa-ack'));
      await fireEvent.press(screen.getByTestId('scenario-qa-enter'));
      await fireEvent.press(screen.getByTestId(`scenario-qa-select-${qaKey}`));
      await act(async () => {
        fireEvent.press(screen.getByTestId(`scenario-qa-start-full-lifecycle-${qaKey}`));
        await Promise.resolve();
      });

      await waitFor(() => {
        const expectedIdentity =
          qaKey === 'candidate-11'
            ? { scenarioId: 'internal-long-range-breakout', scenarioVersion: '2.1.0' }
            : { scenarioId: 'internal-short-double-top', scenarioVersion: '2.0.0' };
        expect(mockCreateOrResumeAnalysisSession).toHaveBeenCalledWith({
          kind: 'historical',
          ...expectedIdentity,
          accessMode: 'qa-internal',
        });
        expect(mockPush).toHaveBeenCalledWith(`/analysis?sessionId=full-lifecycle-${qaKey}&qa=1`);
      });
      expect(mockPositionManagementJourneyForKey).not.toHaveBeenCalled();
      expect(mockSaveAnalysisSession).not.toHaveBeenCalled();
      expect(mockFinalizeAnalysisSession).not.toHaveBeenCalled();
      expect(mockCreatePaper).not.toHaveBeenCalled();
      expect(mockCreateManagement).not.toHaveBeenCalled();
    },
  );

  it('reopens the exact finalized full-lifecycle analysis linked to paper execution', async () => {
    mockDeveloper = '1';
    mockSnapshot = {
      analysisSessions: [
        {
          sessionId: 'finalized-long-analysis',
          status: 'finalized',
          updatedAt: '2026-08-28T12:00:00.000Z',
          chart: {
            kind: 'historical',
            scenarioId: 'internal-long-range-breakout',
            scenarioVersion: '2.1.0',
          },
        },
      ],
      paperExecutionSessions: [
        { source: { analysisSessionId: 'finalized-long-analysis' }, status: 'open' },
      ],
    };
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <HistoricalScenarioQaRoute />
      </ChartPathThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId('scenario-qa-ack'));
    await fireEvent.press(screen.getByTestId('scenario-qa-enter'));
    await fireEvent.press(screen.getByTestId('scenario-qa-select-candidate-11'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('scenario-qa-start-full-lifecycle-candidate-11'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/analysis?sessionId=finalized-long-analysis&qa=1');
    });
    expect(mockCreateOrResumeAnalysisSession).not.toHaveBeenCalled();
  });

  it('reopens an exact finalized non-management candidate instead of creating a duplicate', async () => {
    mockDeveloper = '1';
    mockSnapshot = {
      analysisSessions: [
        {
          sessionId: 'finalized-no-trade-analysis',
          status: 'finalized',
          updatedAt: '2026-08-28T12:00:00.000Z',
          chart: {
            kind: 'historical',
            scenarioId: 'SECRET-SCENARIO-ID',
            scenarioVersion: '2.1.0',
          },
        },
      ],
      paperExecutionSessions: [],
    };
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
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/analysis?sessionId=finalized-no-trade-analysis&qa=1');
    });
    expect(mockCreateOrResumeAnalysisSession).not.toHaveBeenCalled();
  });
});
