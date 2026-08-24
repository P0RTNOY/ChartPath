import { fireEvent, render } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import { ChartWorkbench } from '../chart-workbench';

function renderWorkbench({
  reducedMotion = false,
  availableWidth,
}: { reducedMotion?: boolean; availableWidth?: number } = {}) {
  return render(
    <ChartPathThemeProvider direction="rtl" mode="light" reducedMotion={reducedMotion}>
      <ChartWorkbench availableWidth={availableWidth} />
    </ChartPathThemeProvider>,
  );
}

async function openPreciseInput(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(screen.getByRole('button', { name: 'סימון מדויק לפי נר ומחיר' }));
}

async function placePreciseAnchor(
  screen: Awaited<ReturnType<typeof render>>,
  candleIndex: number,
  price: number,
) {
  await fireEvent.changeText(screen.getByLabelText('מספר הנר במעבדה'), String(candleIndex));
  await fireEvent.changeText(screen.getByLabelText('מחיר במעבדה'), String(price));
  await fireEvent.press(screen.getByRole('button', { name: 'החלת הנר והמחיר' }));
}

describe('ChartWorkbench', () => {
  it('keeps the Hebrew shell RTL while declaring chronological chart content LTR', async () => {
    const screen = await renderWorkbench();

    expect(screen.getByTestId('chart-lab-screen')).toBeTruthy();
    expect(screen.getByLabelText('גרף מעבדת הניתוח, כרונולוגיה משמאל לימין')).toHaveStyle({
      direction: 'ltr',
    });
    expect(screen.getByTestId('workbench-responsive-layout')).toHaveStyle({
      flexDirection: 'column',
    });
    expect(screen.queryByTestId('workbench-chart-expected-line')).toBeNull();
  });

  it('places chart and guidance side by side at tablet width', async () => {
    const screen = await renderWorkbench({ availableWidth: 1024 });
    expect(screen.getByTestId('workbench-responsive-layout')).toHaveStyle({
      flexDirection: 'row',
    });
    expect(screen.getByTestId('guided-analysis-panel')).toBeTruthy();
  });

  it('selects a candle with the inspect crosshair and reports exact OHLCV', async () => {
    const screen = await renderWorkbench();

    await fireEvent.press(screen.getByTestId('workbench-chart'), {
      nativeEvent: { locationX: 170, locationY: 120 },
    });

    expect(
      screen.getByTestId('workbench-chart-crosshair', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.getByTestId('workbench-chart-selected-candle', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByTestId('selected-candle-details')).toBeTruthy();
    expect(screen.getByText(/ O .* H .* L .* C .* V /)).toBeTruthy();
  });

  it('preserves a trendline across replay, supports undo and redo, and grades only at decision', async () => {
    const screen = await renderWorkbench();
    await fireEvent.press(screen.getByRole('button', { name: 'כלי קו מגמה' }));
    await openPreciseInput(screen);
    await placePreciseAnchor(screen, 21, 105.938);

    expect(screen.getByText('סמנו עוגן שני להשלמת קו המגמה.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'השוואת הניתוח' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'לחלון ההחלטה' }));
    await placePreciseAnchor(screen, 56, 115.0526);

    expect(screen.getByText(/קו מגמה הושלם/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'השוואת הניתוח' })).toBeEnabled();
    expect(screen.queryByTestId('workbench-chart-expected-line')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'ביטול' }));
    expect(screen.getByRole('button', { name: 'השוואת הניתוח' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'ביצוע חוזר' }));
    expect(screen.getByRole('button', { name: 'השוואת הניתוח' })).toBeEnabled();

    await fireEvent.press(screen.getByRole('button', { name: 'השוואת הניתוח' }));
    expect(screen.getByTestId('workbench-feedback')).toBeTruthy();
    expect(
      screen.getByTestId('workbench-chart-expected-line', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByText('סימון מדויק')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'איפוס' }));
    expect(screen.queryByTestId('workbench-feedback')).toBeNull();
    expect(screen.queryByTestId('workbench-chart-expected-line')).toBeNull();
    expect(screen.queryByRole('button', { name: /בחירת קו מגמה/ })).toBeNull();
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'השוואת הניתוח' })).toBeDisabled();
  });

  it('creates and specifically deletes scratch geometry without exposing reference geometry', async () => {
    const screen = await renderWorkbench();
    await fireEvent.press(screen.getByRole('button', { name: 'כלי נקודה' }));
    await openPreciseInput(screen);
    await placePreciseAnchor(screen, 12, 102);

    expect(screen.getByRole('button', { name: /בחירת נקודה בנר 12/ })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /מחיקת נקודה בנר 12/ }));
    expect(screen.queryByRole('button', { name: /בחירת נקודה בנר 12/ })).toBeNull();
    expect(screen.queryByTestId('workbench-chart-expected-line')).toBeNull();
  });

  it('announces reduced-motion behavior and requires confirmation before clearing', async () => {
    const screen = await renderWorkbench({ reducedMotion: true });
    expect(screen.getByText(/מצב תנועה מופחת פעיל/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'כלי רמה אופקית' }));
    await openPreciseInput(screen);
    await placePreciseAnchor(screen, 12, 102);
    await fireEvent.press(screen.getByRole('button', { name: 'ניקוי השרטוט' }));
    expect(screen.getByLabelText('אישור ניקוי השרטוט')).toBeTruthy();
    expect(screen.getByText(/רמה אופקית במחיר/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'מחיקת הכול' }));
    expect(screen.queryByText(/רמה אופקית במחיר/)).toBeNull();
  });
});
