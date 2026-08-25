import { render } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import HistoricalScenariosRoute from '../historical-scenarios';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/data/scenario-library', () => ({
  publishedScenarioLibraryCards: () => [],
  publishedScenarioIdForLibraryKey: () => undefined,
}));
jest.mock('@/state/learning', () => ({
  useLearning: () => ({ createOrResumeAnalysisSession: jest.fn() }),
}));

describe('HistoricalScenariosRoute', () => {
  it('is discoverable but renders an honest empty ordinary catalog with no candidate leakage', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <HistoricalScenariosRoute />
      </ChartPathThemeProvider>,
    );
    const serialized = JSON.stringify(screen.toJSON());

    expect(screen.getByTestId('scenario-library-screen')).toBeTruthy();
    expect(screen.getByTestId('scenario-library-empty')).toBeTruthy();
    expect(serialized).not.toMatch(
      /internal-|candidate-|לונג|שורט|מקרה ג׳|ta-he-v2|PDF|sha256|checksum|target|stop/,
    );
  });
});
