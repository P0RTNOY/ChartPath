import { fireEvent, render } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import { HistoricalScenarioLibrary } from '../historical-scenario-library';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

describe('HistoricalScenarioLibrary', () => {
  it('shows an honest ordinary-catalog empty state without internal QA content', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <HistoricalScenarioLibrary cards={[]} onStart={jest.fn()} />
      </ChartPathThemeProvider>,
    );
    const serialized = JSON.stringify(screen.toJSON());

    expect(screen.getByTestId('scenario-library-empty')).toBeTruthy();
    expect(screen.getByText('הספרייה הרגילה עדיין ריקה')).toBeTruthy();
    expect(serialized).not.toMatch(/internal-long|internal-short|checksum|מקרה ג׳|תשובה צפויה/);
  });

  it('renders only the blind projection and starts by opaque library key', async () => {
    const onStart = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="dark" reducedMotion textScale={1.3}>
        <HistoricalScenarioLibrary
          cards={[
            {
              libraryKey: 'published-01',
              ordinal: 1,
              blindTitleHe: 'תרחיש היסטורי עיוור',
              availabilityHe: 'זמין לתרגול עיוור',
              creditHe: 'זכאי לקרדיט לאחר השלמה תקינה',
            },
          ]}
          onStart={onStart}
        />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByLabelText(/תרחיש עיוור 1.*זמין לתרגול עיוור.*זכאי לקרדיט/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('scenario-start-published-01'));
    expect(onStart).toHaveBeenCalledWith('published-01');
  });
});
