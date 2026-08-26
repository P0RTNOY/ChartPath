import { fireEvent, render } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import IndexScreen from '../index';

const mockPush = jest.fn();
let mockFailureReason: 'corrupt-store' | 'unsupported-newer-schema' | 'transient' = 'corrupt-store';

jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));
jest.mock('@/state/learning', () => ({
  DISCLAIMER_VERSION: 'test-disclaimer',
  useLearning: () => ({
    status: 'error',
    error: 'המסד המקומי לא נטען',
    initializationFailure: { reason: mockFailureReason },
    snapshot: null,
    reload: jest.fn(),
  }),
}));

describe('startup recovery routing', () => {
  beforeEach(() => mockPush.mockClear());

  it('routes a classified corrupt store to the dedicated recovery screen without inline reset', async () => {
    mockFailureReason = 'corrupt-store';
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <IndexScreen />
      </ChartPathThemeProvider>,
    );

    expect(screen.queryByText(/איפוס נתונים פגומים|אישור מחיקה/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'פתיחת מרכז שחזור' }));
    expect(mockPush).toHaveBeenCalledWith('/data-recovery');
  });

  it.each(['unsupported-newer-schema', 'transient'] as const)(
    'offers retry only for %s',
    async (reason) => {
      mockFailureReason = reason;
      const screen = await render(
        <ChartPathThemeProvider direction="rtl" mode="light">
          <IndexScreen />
        </ChartPathThemeProvider>,
      );

      expect(screen.getByRole('button', { name: 'נסו שוב' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'פתיחת מרכז שחזור' })).toBeNull();
      expect(screen.queryByText(/איפוס|מחיקה/)).toBeNull();
    },
  );
});
