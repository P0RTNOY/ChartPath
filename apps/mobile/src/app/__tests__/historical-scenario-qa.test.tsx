import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ChartPathThemeProvider } from '@chartpath/ui';

import HistoricalScenarioQaRoute from '../historical-scenario-qa';

let mockDeveloper: string | undefined;
const mockCreateOrResumeAnalysisSession = jest.fn();
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
  qaScenarioIdForKey: () => 'SECRET-SCENARIO-ID',
  revealedQaCandidateDetail: jest.fn(),
}));
jest.mock('@/state/learning', () => ({
  useLearning: () => ({ createOrResumeAnalysisSession: mockCreateOrResumeAnalysisSession }),
}));

const mockPush = jest.mocked(router.push);

describe('HistoricalScenarioQaRoute', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockCreateOrResumeAnalysisSession.mockReset();
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
        accessMode: 'qa-internal',
      });
      expect(mockPush).toHaveBeenCalledWith('/analysis?sessionId=qa-session-1');
    });
  });
});
