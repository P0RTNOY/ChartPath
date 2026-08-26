import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import SettingsScreen from '../settings';

const mockUpdateSettings = jest.fn(async () => undefined);
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), replace: jest.fn() },
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
      quarantinedAnalysisSessions: [{ quarantineId: 'analysis-q' }],
      quarantinedPaperExecutionSessions: [],
      quarantinedPositionManagementSessions: [],
    },
    updateSettings: mockUpdateSettings,
    resetData: jest.fn(),
    reload: jest.fn(),
  }),
}));

describe('settings accessibility preferences', () => {
  beforeEach(() => {
    mockUpdateSettings.mockClear();
    mockPush.mockClear();
  });

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
    expect(screen.getByText(/מוחרג מגיבויי מערכת ההפעלה/)).toBeTruthy();
    expect(screen.getByText(/אינם מסלול שחזור נתמך/)).toBeTruthy();
    expect(screen.queryByText(/ייתכן.*iCloud/)).toBeNull();
  });

  it('wraps segmented controls and links the quarantine count to data recovery', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <SettingsScreen />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByText(/1.*בהסגר/)).toBeTruthy();
    expect(screen.getByLabelText('בחירת ערכת נושא').props.style).toMatchObject({
      flexWrap: 'wrap',
      width: '100%',
    });
    await fireEvent.press(screen.getByTestId('settings-recovery'));
    expect(mockPush).toHaveBeenCalledWith('/data-recovery');
  });
});
