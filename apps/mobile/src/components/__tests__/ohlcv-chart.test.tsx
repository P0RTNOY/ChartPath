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

  it('applies one cutoff to candles, overlays, scale inputs, and accessible rows', async () => {
    const cutoffChart: GeneratedChart = {
      ...chart,
      annotations: [
        {
          id: 'future-semantic',
          kind: 'point',
          role: 'future',
          candleIndex: 2,
          price: 107,
          visibleFromCandleIndex: 2,
        },
      ],
    };
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <OhlcvChart
          chart={cutoffChart}
          crosshairAnchor={{ candleIndex: 2, price: 107 }}
          cutoffCandleIndex={1}
          expectedLine={{
            start: { candleIndex: 0, price: 100 },
            end: { candleIndex: 2, price: 107 },
          }}
          expectedPoints={[{ candleIndex: 2, price: 107 }]}
          expectedZone={{
            startCandleIndex: 2,
            endCandleIndex: 2,
            priceLow: 106,
            priceHigh: 108,
          }}
          executionOverlays={[
            {
              id: 'known-plan',
              kind: 'planned-entry',
              labelHe: 'כניסה מתוכננת 104.00',
              price: 104,
              visibleFromCandleIndex: 1,
            },
            {
              id: 'future-fill',
              kind: 'fill',
              labelHe: 'מילוי עתידי 107.00',
              price: 107,
              candleIndex: 2,
              visibleFromCandleIndex: 2,
            },
          ]}
          highlightedCandleIndices={[1, 2]}
          learnerAnnotations={[
            {
              id: 'future-anchor',
              kind: 'point',
              anchor: { candleIndex: 2, price: 107 },
            },
            {
              id: 'later-authored',
              kind: 'point',
              anchor: { candleIndex: 0, price: 100 },
              authoredAtCursorCandleIndex: 2,
            },
          ]}
          selectedCandleIndex={2}
          selectedLine={{
            start: { candleIndex: 0, price: 100 },
            end: { candleIndex: 2, price: 107 },
          }}
          selectedPoints={[{ candleIndex: 2, price: 107 }]}
          selectedZone={{
            startCandleIndex: 2,
            endCandleIndex: 2,
            priceLow: 106,
            priceHigh: 108,
          }}
          showAnnotations
        />
      </ChartPathThemeProvider>,
    );

    expect(screen.queryByTestId('ohlcv-chart-semantic-future-semantic')).toBeNull();
    expect(screen.queryByTestId('ohlcv-chart-learner-future-anchor')).toBeNull();
    expect(screen.queryByTestId('ohlcv-chart-learner-later-authored')).toBeNull();
    expect(screen.queryByTestId('ohlcv-chart-highlight-2')).toBeNull();
    expect(screen.queryByTestId('ohlcv-chart-selected-candle')).toBeNull();
    expect(screen.queryByTestId('ohlcv-chart-crosshair')).toBeNull();
    expect(screen.queryByTestId('ohlcv-chart-expected-line')).toBeNull();
    expect(screen.queryByTestId('ohlcv-chart-expected-point-0')).toBeNull();
    expect(screen.queryByTestId('ohlcv-chart-expected-zone')).toBeNull();
    expect(screen.queryByTestId('ohlcv-chart-selected-line')).toBeNull();
    expect(screen.queryByTestId('ohlcv-chart-selected-point-0')).toBeNull();
    expect(screen.queryByTestId('ohlcv-chart-selected-zone')).toBeNull();
    expect(
      screen.getByTestId('ohlcv-chart-execution-planned-entry-known-plan', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(screen.queryByTestId('ohlcv-chart-execution-fill-future-fill')).toBeNull();
    expect(screen.getByLabelText(/כניסה מתוכננת .*104.00/)).toBeTruthy();
    expect(screen.queryByLabelText(/מילוי עתידי .*107.00/)).toBeNull();
    expect(
      screen.getByTestId('ohlcv-chart-highlight-1', { includeHiddenElements: true }),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'הצגת נתוני הנרות' }));
    expect(screen.getByLabelText(/נר 1: פתיחה 102.00/)).toBeTruthy();
    expect(screen.queryByLabelText(/נר 2:/)).toBeNull();
  });

  it('distinguishes every execution state by shape, text, and an accessible legend', async () => {
    const screen = await render(
      <ChartPathThemeProvider mode="dark" reducedMotion textScale={1.3}>
        <OhlcvChart
          chart={chart}
          executionOverlays={[
            {
              id: 'plan',
              kind: 'planned-entry',
              labelHe: 'כניסה מתוכננת 103.00',
              price: 103,
              visibleFromCandleIndex: 0,
            },
            {
              id: 'working',
              kind: 'working-order',
              labelHe: 'הוראה עובדת 103.00',
              price: 103,
              visibleFromCandleIndex: 0,
            },
            {
              id: 'fill',
              kind: 'fill',
              labelHe: 'מילוי בפועל 104.00',
              price: 104,
              candleIndex: 1,
              visibleFromCandleIndex: 1,
            },
            {
              id: 'stop',
              kind: 'protective-stop',
              labelHe: 'עצירה מגינה 99.00',
              price: 99,
              visibleFromCandleIndex: 0,
            },
            {
              id: 'target',
              kind: 'target',
              labelHe: 'יעד מותנה 108.00',
              price: 108,
              visibleFromCandleIndex: 0,
            },
            {
              id: 'position',
              kind: 'open-position',
              labelHe: 'פוזיציה מדומה פתוחה',
              entryPrice: 104,
              startCandleIndex: 1,
              visibleFromCandleIndex: 1,
            },
            {
              id: 'exit',
              kind: 'exit',
              labelHe: 'יציאה מדומה 107.00',
              price: 107,
              candleIndex: 2,
              visibleFromCandleIndex: 2,
            },
            {
              id: 'ambiguous',
              kind: 'ambiguous',
              labelHe: 'סדר האירועים אינו ניתן לקביעה',
              candleIndex: 2,
              relevantPrices: [99, 108],
              visibleFromCandleIndex: 2,
            },
          ]}
        />
      </ChartPathThemeProvider>,
    );

    for (const kind of [
      'planned-entry',
      'working-order',
      'fill',
      'protective-stop',
      'target',
      'open-position',
      'exit',
      'ambiguous',
    ]) {
      expect(
        screen.getByTestId(new RegExp(`ohlcv-chart-execution-${kind}`), {
          includeHiddenElements: true,
        }),
      ).toBeTruthy();
    }
    expect(screen.getByTestId('ohlcv-chart-execution-legend')).toBeTruthy();
    expect(screen.getByLabelText(/שכבת ביצוע נוכחית:.*כניסה מתוכננת/)).toBeTruthy();
    expect(screen.getByText('סדר האירועים אינו ניתן לקביעה')).toBeTruthy();
  });

  it('produces identical cutoff output for identical prefixes with different tails', async () => {
    const extremeTailChart: GeneratedChart = {
      ...chart,
      candles: [
        chart.candles[0]!,
        chart.candles[1]!,
        {
          ...chart.candles[2]!,
          open: 9_500,
          high: 10_000,
          low: 9_000,
          close: 9_600,
          volume: 99_000_000,
        },
      ],
    };
    const ordinary = await render(
      <ChartPathThemeProvider mode="light">
        <OhlcvChart chart={chart} cutoffCandleIndex={1} />
      </ChartPathThemeProvider>,
    );
    const extreme = await render(
      <ChartPathThemeProvider mode="light">
        <OhlcvChart chart={extremeTailChart} cutoffCandleIndex={1} />
      </ChartPathThemeProvider>,
    );

    expect(JSON.stringify(extreme.toJSON())).toBe(JSON.stringify(ordinary.toJSON()));
  });

  it('redacts identity and dates in blind presentation, including accessibility text', async () => {
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <OhlcvChart
          accessibilityLabel="SECRET ticker on 2026-01-03"
          chart={chart}
          interactionHint="SECRET on 2026-01-03"
          interactive
          onChartPress={jest.fn()}
          presentationPolicy="blind"
          ticker="SECRET"
          viewport={{
            startIndex: 1,
            endIndex: 2,
            minPrice: -999,
            maxPrice: 999,
          }}
        />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByLabelText(/תרשים נרות היסטורי מוסתר זהות/)).toBeTruthy();
    expect(screen.queryByText('SECRET')).toBeNull();
    expect(screen.queryByText('1D')).toBeNull();
    expect(screen.queryByLabelText(/SECRET|2026-01-03/)).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/SECRET|2026-01-03|01\/01|03\/01|1D/);

    await fireEvent.press(screen.getByRole('button', { name: 'הצגת נתוני הנרות' }));
    expect(screen.getByLabelText(/נר רציף 2: פתיחה 102.00/)).toBeTruthy();
    expect(screen.getByText(/#2 \| O 102.00/)).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/SECRET|2026-01-03|01\/01|03\/01|1D/);
  });
});
