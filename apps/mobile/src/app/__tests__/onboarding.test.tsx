import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import OnboardingScreen from '../onboarding';

const mockAcceptDisclaimer = jest.fn(async () => undefined);

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@/state/learning', () => ({
  useLearning: () => ({
    status: 'ready',
    error: null,
    snapshot: { settings: { dailyGoalMinutes: 10 } },
    acceptDisclaimer: mockAcceptDisclaimer,
    reload: jest.fn(),
  }),
}));

describe('onboarding', () => {
  beforeEach(() => mockAcceptDisclaimer.mockClear());

  it('is Hebrew-first, RTL and persists disclaimer plus daily goal', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <OnboardingScreen />
      </ChartPathThemeProvider>,
    );
    expect(screen.getByTestId('onboarding-screen').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ direction: 'rtl' })]),
    );
    expect(screen.getByText('מסלול ברור לקריאת גרפים')).toBeTruthy();
    expect(screen.getByText(/אין צורך בחשבון ואין סנכרון ענן/)).toBeTruthy();
    expect(screen.queryByText(/במכשיר בלבד/)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'המשך כאורח' }));
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByRole('button', { name: 'המשך' }));
    await fireEvent.press(screen.getByRole('radio', { name: '15 דקות ביום' }));
    await fireEvent.press(screen.getByRole('button', { name: 'בניית המסלול שלי' }));

    await waitFor(() => expect(mockAcceptDisclaimer).toHaveBeenCalledWith(15));
  });
});
