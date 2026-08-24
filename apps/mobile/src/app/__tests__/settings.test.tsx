import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import SettingsScreen from '../settings';

const mockUpdateSettings = jest.fn(async () => undefined);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => '/settings',
}));
jest.mock('@chartpath/content', () => ({ contentVersion: { id: 'test-content' } }), {
  virtual: true,
});
jest.mock('@/state/learning', () => ({
  useLearning: () => ({
    status: 'ready',
    error: null,
    snapshot: {
      settings: {
        theme: 'system',
        reducedMotion: false,
        textScale: 'system',
        dailyGoalMinutes: 10,
      },
    },
    updateSettings: mockUpdateSettings,
    resetData: jest.fn(),
    reload: jest.fn(),
  }),
}));

describe('settings accessibility preferences', () => {
  beforeEach(() => mockUpdateSettings.mockClear());

  it('persists reduced-motion preference from the accessible switch', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <SettingsScreen />
      </ChartPathThemeProvider>,
    );
    await fireEvent(screen.getByTestId('reduced-motion-switch'), 'valueChange', true);
    await waitFor(() => expect(mockUpdateSettings).toHaveBeenCalledWith({ reducedMotion: true }));
  });

  it('discloses platform backup behavior alongside local-data controls', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <SettingsScreen />
      </ChartPathThemeProvider>,
    );
    expect(screen.getByText(/גיבוי האפליקציה מושבת/)).toBeTruthy();
    expect(screen.getByText(/iCloud/)).toBeTruthy();
  });
});
