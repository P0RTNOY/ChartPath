import { fireEvent, render } from '@testing-library/react-native';

import type { GeneratedChart } from '@chartpath/domain';
import { ChartPathThemeProvider } from '@chartpath/ui';

import { OhlcvChart } from '../ohlcv-chart';

const chart: GeneratedChart = {
  spec: {
    id: 'accessible-chart',
    seed: 1,
    generatorVersion: '1.0.0',
    candleCount: 3,
    timeframe: '1D',
    scenario: 'uptrend',
    basePrice: 100,
    baseVolume: 1_000,
    volatility: 0.02,
    noise: 0.1,
  },
  candles: [
    {
      index: 0,
      timestamp: '2026-01-01T00:00:00.000Z',
      open: 100,
      high: 103,
      low: 99,
      close: 102,
      volume: 900,
    },
    {
      index: 1,
      timestamp: '2026-01-02T00:00:00.000Z',
      open: 102,
      high: 105,
      low: 101,
      close: 104,
      volume: 1_100,
    },
    {
      index: 2,
      timestamp: '2026-01-03T00:00:00.000Z',
      open: 104,
      high: 108,
      low: 103,
      close: 107,
      volume: 1_400,
    },
  ],
  annotations: [],
};

describe('OhlcvChart accessibility', () => {
  it('exposes a concise Hebrew chart summary while hiding individual SVG marks', async () => {
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <OhlcvChart chart={chart} ticker="CPTH" />
      </ChartPathThemeProvider>,
    );
    expect(screen.getByLabelText(/גרף נרות .*CPTH/)).toBeTruthy();
    expect(screen.getByLabelText(/נרות, הסגירה האחרונה גבוהה מהפתיחה הראשונה/)).toBeTruthy();
    expect(screen.getByText(/נר עולה = גוף חלול/)).toBeTruthy();
  });

  it('describes an interactive chart as a button', async () => {
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <OhlcvChart chart={chart} interactive onChartPress={jest.fn()} />
      </ChartPathThemeProvider>,
    );
    expect(screen.getByRole('button', { name: /גרף נרות .*CPTH/ })).toBeTruthy();
  });

  it('provides every visible candle as screen-reader-operable OHLC data', async () => {
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <OhlcvChart chart={chart} />
      </ChartPathThemeProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'הצגת נתוני הנרות' }));
    expect(screen.getByLabelText(/נר 0: פתיחה 100.00, שיא 103.00/)).toBeTruthy();
    expect(screen.getByLabelText(/נר 2: פתיחה 104.00, שיא 108.00/)).toBeTruthy();
  });

  it('maps presses inside the price plot and ignores the axes and volume area', async () => {
    const onChartPress = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <OhlcvChart chart={chart} interactive onChartPress={onChartPress} />
      </ChartPathThemeProvider>,
    );
    const interactiveChart = screen.getByTestId('ohlcv-chart');
    await fireEvent(interactiveChart, 'layout', { nativeEvent: { layout: { width: 360 } } });

    await fireEvent.press(interactiveChart, { nativeEvent: { locationX: 100, locationY: 100 } });
    expect(onChartPress).toHaveBeenCalledTimes(1);
    expect(onChartPress.mock.calls[0]?.[0].candleIndex).toBe(0);

    await fireEvent.press(interactiveChart, { nativeEvent: { locationX: 100, locationY: 280 } });
    await fireEvent.press(interactiveChart, { nativeEvent: { locationX: 350, locationY: 100 } });
    expect(onChartPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/מחוץ לאזור המחיר/)).toBeTruthy();
  });

  it('renders learner and reference geometry as separate chart layers', async () => {
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <OhlcvChart
          chart={chart}
          expectedLine={{
            start: { candleIndex: 0, price: 100 },
            end: { candleIndex: 2, price: 107 },
          }}
          expectedPoints={[{ candleIndex: 1, price: 105 }]}
          selectedLine={{
            start: { candleIndex: 0, price: 99 },
            end: { candleIndex: 2, price: 106 },
          }}
          selectedPoints={[{ candleIndex: 1, price: 104 }]}
        />
      </ChartPathThemeProvider>,
    );

    expect(
      screen.getByTestId('ohlcv-chart-expected-line', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.getByTestId('ohlcv-chart-expected-point-0', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.getByTestId('ohlcv-chart-selected-line', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.getByTestId('ohlcv-chart-selected-point-0', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/הסימון שלך כולל נקודה אחת/)).toBeTruthy();
  });
});
