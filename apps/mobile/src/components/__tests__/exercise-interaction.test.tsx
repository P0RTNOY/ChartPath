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

function ChartExerciseHarness({
  exerciseId,
  onChange,
}: {
  readonly exerciseId: string;
  readonly onChange: jest.Mock;
}) {
  const exercise = exercises.find((candidate) => candidate.id === exerciseId)!;
  const chart = generateChart(exercise.chartSpec!);
  const [answer, setAnswer] = useState<ExerciseAnswer | null>(null);
  return (
    <ChartPathThemeProvider direction="rtl" mode="light">
      <ExerciseInteraction
        answer={answer}
        chart={chart}
        exercise={exercise}
        onChange={(next) => {
          setAnswer(next);
          onChange(next);
        }}
      />
    </ChartPathThemeProvider>
  );
}

async function enterAnchor(
  screen: Awaited<ReturnType<typeof render>>,
  candleIndex: number,
  price: number,
  actionName: string | RegExp,
  useComma = false,
) {
  if (!screen.queryByLabelText('מספר הנר לסימון')) {
    await fireEvent.press(screen.getByRole('button', { name: 'סימון מדויק באמצעות ערכים' }));
  }
  await fireEvent.changeText(screen.getByLabelText('מספר הנר לסימון'), String(candleIndex));
  await fireEvent.changeText(
    screen.getByLabelText('מחיר לסימון'),
    useComma ? String(price).replace('.', ',') : String(price),
  );
  await fireEvent.press(screen.getByRole('button', { name: actionName }));
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

  it('reveals chart evidence in stages before allowing the final answer', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u06-breakouts-e04')!;
    const chart = generateChart(exercise.chartSpec!);
    const onChange = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <ExerciseInteraction answer={null} chart={chart} exercise={exercise} onChange={onChange} />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByText(/אפשר לבחור תשובה רק לאחר חשיפת חלון ההחלטה/)).toBeTruthy();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    for (let reveal = 0; reveal < 6; reveal += 1) {
      await fireEvent.press(screen.getByRole('button', { name: /חשיפת.*נרות נוספים/ }));
    }
    expect(screen.getByText(/הגעתם לחלון ההחלטה/)).toBeTruthy();
    expect(screen.getAllByRole('radio').length).toBeGreaterThan(1);
    await fireEvent.press(screen.getAllByRole('radio')[0]!);
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
    const onChange = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <ExerciseInteraction answer={null} chart={chart} exercise={exercise} onChange={onChange} />
      </ChartPathThemeProvider>,
    );

    expect(screen.queryByRole('button', { name: 'הצגת נתוני הנרות' })).toBeNull();
    expect(screen.queryByLabelText('מספר נר לתווית')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'קצה עליון של הצל' }));

    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText(/מוקמו/)).toBeTruthy();
    expect(screen.getByText(/✓.*שיא.*נר עולה/)).toBeTruthy();

    for (const position of [
      'קצה תחתון של הצל',
      'קצה תחתון של הגוף',
      'קצה עליון של הגוף',
      'קצה עליון של הגוף',
      'קצה תחתון של הגוף',
    ]) {
      await fireEvent.press(screen.getByRole('button', { name: position }));
    }
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ kind: 'label-placement' });
    expect(onChange.mock.calls.at(-1)?.[0].placements).toHaveLength(6);
    expect(screen.getByText(/כל התוויות מוקמו/)).toBeTruthy();
  });

  it('labels authored stop distance as a price distance rather than a percentage', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u08-risk-e03')!;
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <ExerciseInteraction answer={null} exercise={exercise} onChange={jest.fn()} />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByText('מרחק עצירה')).toBeTruthy();
    expect(screen.getAllByText('₪')).toHaveLength(3);
    expect(screen.queryByText('%')).toBeNull();
  });

  it('keeps a multi-point drawing as a draft until every required point is marked', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u02-structure-e04')!;
    if (exercise.rubric.kind !== 'point') throw new Error('Expected point rubric');
    const onChange = jest.fn();
    const screen = await render(
      <ChartExerciseHarness exerciseId={exercise.id} onChange={onChange} />,
    );

    for (const [index, target] of exercise.rubric.targets.entries()) {
      await enterAnchor(screen, target.candleIndex, target.price, 'הוסיפו נקודה', index === 0);
      if (index < exercise.rubric.targets.length - 1) {
        expect(onChange).toHaveBeenLastCalledWith(null);
      }
    }

    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'point',
      points: exercise.rubric.targets,
    });
    expect(screen.getByText(/הסימון הושלם/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'ביטול הסימון האחרון' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText(/הסימון הושלם/)).toBeNull();
  });

  it('builds a line only after two anchors and supports correcting the last one', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u03-levels-e04')!;
    if (exercise.rubric.kind !== 'line') throw new Error('Expected line rubric');
    const onChange = jest.fn();
    const screen = await render(
      <ChartExerciseHarness exerciseId={exercise.id} onChange={onChange} />,
    );

    await enterAnchor(
      screen,
      exercise.rubric.target.start.candleIndex,
      exercise.rubric.target.start.price,
      'הוספת עוגן',
    );
    expect(onChange).toHaveBeenLastCalledWith(null);
    await enterAnchor(
      screen,
      exercise.rubric.target.end.candleIndex,
      exercise.rubric.target.end.price,
      'הוספת עוגן',
    );
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'line', line: exercise.rubric.target });

    await fireEvent.press(screen.getByRole('button', { name: 'ביטול הסימון האחרון' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('normalizes two opposite corners into a valid support zone', async () => {
    const exercise = exercises.find((candidate) => candidate.id === 'u03-levels-e01')!;
    if (exercise.rubric.kind !== 'zone') throw new Error('Expected zone rubric');
    const onChange = jest.fn();
    const screen = await render(
      <ChartExerciseHarness exerciseId={exercise.id} onChange={onChange} />,
    );
    const target = exercise.rubric.target;

    await enterAnchor(screen, target.endCandleIndex, target.priceHigh, 'הוספת פינה');
    expect(onChange).toHaveBeenLastCalledWith(null);
    await enterAnchor(screen, target.startCandleIndex, target.priceLow, 'הוספת פינה');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'zone', zone: target });
  });

  it('explains invalid precise coordinates instead of silently disabling the action', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <ChartExerciseHarness exerciseId="u05-reversal-e04" onChange={onChange} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'סימון מדויק באמצעות ערכים' }));
    await fireEvent.changeText(screen.getByLabelText('מספר הנר לסימון'), '999');
    expect(screen.getByText(/מספר הנר חייב להיות בין/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('מספר הנר לסימון'), '30');
    await fireEvent.changeText(screen.getByLabelText('מחיר לסימון'), '999999');
    expect(screen.getByText(/המחיר חייב להיות בין/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'הוסיפו נקודה' })).toBeDisabled();
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
