import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';

import { generateChart } from '@chartpath/chart-engine';
import { exercises } from '@chartpath/content';
import type { ExerciseAnswer } from '@chartpath/domain';
import { ChartPathThemeProvider } from '@chartpath/ui';

import { ExerciseInteraction } from '../exercise-interaction';

function DecisionHarness({ onChange }: { readonly onChange: jest.Mock }) {
  const exercise = exercises.find((candidate) => candidate.id === 'u00-scenarios-e04')!;
  const [answer, setAnswer] = useState<ExerciseAnswer | null>(null);
  return (
    <ChartPathThemeProvider direction="rtl" mode="light">
      <ExerciseInteraction
        answer={answer}
        exercise={exercise}
        onChange={(next) => {
          setAnswer(next);
          onChange(next);
        }}
      />
    </ChartPathThemeProvider>
  );
}

describe('ExerciseInteraction', () => {
  it('requires the learner to select decision reasons instead of injecting them', async () => {
    const onChange = jest.fn();
    const screen = await render(<DecisionHarness onChange={onChange} />);

    await fireEvent.press(screen.getByRole('radio', { name: /אין מספיק ראיות/ }));
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'decision',
      decision: 'insufficient-evidence',
      optionId: 'insufficient-evidence',
      reasonIds: [],
    });

    await fireEvent.press(screen.getByRole('checkbox', { name: /הבהירות/ }));
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'decision',
      decision: 'insufficient-evidence',
      optionId: 'insufficient-evidence',
      reasonIds: ['future-only-clarity'],
    });
    expect(screen.getByRole('checkbox', { name: /תוצאה חיובית מאוחרת/ })).toBeTruthy();
  });

  it('retains a prefixed authored decision ID for targeted feedback', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u07-timeframes-e02')!;
    const onChange = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <ExerciseInteraction answer={null} exercise={exercise} onChange={onChange} />
      </ChartPathThemeProvider>,
    );

    await fireEvent.press(screen.getByRole('radio', { name: /לבצע כרגיל/ }));
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'decision',
      decision: 'trade',
      optionId: 'decision-trade',
      reasonIds: [],
    });
  });

  it('renders every explicitly mapped capstone decision alternative', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u10-capstone-e04')!;
    const onChange = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <ExerciseInteraction answer={null} exercise={exercise} onChange={onChange} />
      </ChartPathThemeProvider>,
    );

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    await fireEvent.press(screen.getByRole('radio', { name: /להצמיד עצירה/ }));
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'decision',
      decision: 'trade',
      optionId: 'decision-tighten-stop',
      reasonIds: [],
    });
  });

  it('makes authored alternative feedback choices reachable without generic fallbacks', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u05-reversal-e01')!;
    const onChange = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <ExerciseInteraction answer={null} exercise={exercise} onChange={onChange} />
      </ChartPathThemeProvider>,
    );

    await fireEvent.press(screen.getByRole('radio', { name: /שלוש פסגות/ }));
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'decision',
      decision: 'trade',
      optionId: 'accept-three-peaks',
      reasonIds: [],
    });
  });

  it('requires staged analysis updates before a sequential answer can be submitted', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u06-breakouts-e04')!;
    const chart = generateChart(exercise.chartSpec!);
    const onChange = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <ExerciseInteraction answer={null} chart={chart} exercise={exercise} onChange={onChange} />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByText(/הבחירה הזמנית אינה מאפשרת הגשה/)).toBeTruthy();
    expect(screen.getAllByRole('radio').length).toBeGreaterThan(1);
    const chooseAnalysis = async () => fireEvent.press(screen.getAllByRole('radio')[0]!);
    const reveal = async () =>
      fireEvent.press(screen.getByRole('button', { name: /תיעוד הניתוח וחשיפת/ }));

    await chooseAnalysis();
    expect(onChange).toHaveBeenLastCalledWith(null);
    for (let update = 0; update < 6; update += 1) {
      await reveal();
      if (update < 5) await chooseAnalysis();
    }
    expect(screen.getByText(/הגעתם לחלון ההחלטה לאחר 6 עדכונים/)).toBeTruthy();
    await chooseAnalysis();
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ kind: 'multiple-choice' });
  });

  it('does not accept a sequential answer when its chart failed to load', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u06-breakouts-e04')!;
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <ExerciseInteraction answer={null} exercise={exercise} onChange={jest.fn()} />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByText(/לא נרשמה תשובה/)).toBeTruthy();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('places a chart label through a relative accessible choice without exposing OHLC answers', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u01-chart-data-e01')!;
    const chart = generateChart(exercise.chartSpec!);
    const bullish = chart.candles
      .slice(Math.floor(chart.candles.length * 0.25))
      .find((candle) => candle.close > candle.open)!;
    const onChange = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <ExerciseInteraction answer={null} chart={chart} exercise={exercise} onChange={onChange} />
      </ChartPathThemeProvider>,
    );

    expect(screen.queryByRole('button', { name: 'הצגת נתוני נרות נגישים' })).toBeNull();
    expect(screen.queryByLabelText('מספר נר לתווית')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'קצה עליון של הצל' }));

    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'label-placement',
      placements: [
        {
          labelId: 'high-top',
          anchor: { candleIndex: bullish.index, price: bullish.high },
        },
      ],
    });
  });

  it('labels authored stop distance as a price distance rather than a percentage', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u08-risk-e03')!;
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <ExerciseInteraction answer={null} exercise={exercise} onChange={jest.fn()} />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByText('מרחק לסטופ')).toBeTruthy();
    expect(screen.getAllByText('₪')).toHaveLength(3);
    expect(screen.queryByText('%')).toBeNull();
  });

  it('renders three explicitly different market layers for timeframe comparison', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u02-structure-e01')!;
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <ExerciseInteraction answer={null} exercise={exercise} onChange={jest.fn()} />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByText('שבועי — זהו את השכבה הראשית')).toBeTruthy();
    expect(screen.getByText('יומי — זהו את השכבה המשנית')).toBeTruthy();
    expect(screen.getByText('שעתי — זהו את השכבה הקצרה')).toBeTruthy();
  });
});
