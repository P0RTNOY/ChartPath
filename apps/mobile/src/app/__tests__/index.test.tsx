import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import IndexScreen from '../index';

const mockResetData = jest.fn(async () => undefined);

jest.mock('expo-router', () => ({ Redirect: () => null }));
jest.mock('@/state/learning', () => ({
  DISCLAIMER_VERSION: 'test-disclaimer',
  useLearning: () => ({
    status: 'error',
    error: 'המסד המקומי פגום',
    snapshot: null,
    reload: jest.fn(),
    resetData: mockResetData,
  }),
}));

describe('startup recovery', () => {
  beforeEach(() => mockResetData.mockClear());

  it('requires confirmation and then resets a corrupt local snapshot', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <IndexScreen />
      </ChartPathThemeProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'איפוס נתונים פגומים' }));
    expect(mockResetData).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'אישור מחיקה ואיפוס' }));
    await waitFor(() => expect(mockResetData).toHaveBeenCalledTimes(1));
  });
});
