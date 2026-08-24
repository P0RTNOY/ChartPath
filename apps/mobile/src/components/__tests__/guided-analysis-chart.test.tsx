import { fireEvent, render } from '@testing-library/react-native';

import { generateChart } from '@chartpath/chart-engine';
import { exercises } from '@chartpath/content';
import {
  ANALYSIS_SESSION_SCHEMA_VERSION,
  ANALYSIS_WORKFLOW_STEP_IDS,
  type AnalysisWorkflowStepId,
  type AtomicAnswerRubric,
  type GuidedAnalysisSession,
  type LearnerChartAnnotation,
} from '@chartpath/domain';
import { ChartPathThemeProvider } from '@chartpath/ui';

import { GuidedAnalysisChart } from '../guided-analysis-chart';

const exercise = exercises.find(({ id }) => id === 'u10-capstone-e03')!;
const chart = generateChart(exercise.chartSpec!);

function session(
  annotations: readonly LearnerChartAnnotation[] = [],
  cursorCandleIndex = 23,
): GuidedAnalysisSession {
  const stepRubrics = Object.fromEntries(
    exercise.capstoneSteps!.map((step) => [step.id, step.rubric]),
  ) as Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>;
  return {
    schemaVersion: ANALYSIS_SESSION_SCHEMA_VERSION,
    revision: 0,
    sessionId: 'guided-session-test',
    attemptId: 'guided-attempt-test',
    finalizationIdempotencyKey: 'guided-finalization-test',
    exerciseId: exercise.id,
    contentVersionId: exercise.contentVersionId,
    exerciseSchemaVersion: exercise.schemaVersion,
    chart: {
      id: chart.spec.id,
      seed: chart.spec.seed,
      generatorVersion: chart.spec.generatorVersion,
      candleCount: chart.candles.length,
      decisionCandleIndex: chart.spec.decisionCandleIndex!,
    },
    status: 'active',
    createdAt: '2026-08-24T09:00:00.000Z',
    updatedAt: '2026-08-24T09:00:00.000Z',
    currentStepId: 'context',
    steps: Object.fromEntries(
      ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => [
        stepId,
        {
          stepId,
          rubric: stepRubrics[stepId],
          status: 'draft',
          answerComplete: false,
          hintIdsUsed: [],
        },
      ]),
    ) as unknown as GuidedAnalysisSession['steps'],
    annotations,
    replay: {
      cursorCandleIndex,
      decisionCandleIndex: chart.spec.decisionCandleIndex!,
      checkpoints: [],
    },
  };
}

function renderChart({
  value = session(),
  onAnnotationsChange = jest.fn(),
  onReplayCursorChange = jest.fn(),
  onCheckpointRequested,
  reducedMotion = false,
}: {
  value?: GuidedAnalysisSession;
  onAnnotationsChange?: jest.Mock;
  onReplayCursorChange?: jest.Mock;
  onCheckpointRequested?: jest.Mock;
  reducedMotion?: boolean;
} = {}) {
  return render(
    <ChartPathThemeProvider direction="rtl" mode="light" reducedMotion={reducedMotion}>
      <GuidedAnalysisChart
        onAnnotationsChange={onAnnotationsChange}
        onCheckpointRequested={onCheckpointRequested}
        onReplayCursorChange={onReplayCursorChange}
        session={value}
      />
    </ChartPathThemeProvider>,
  );
}

describe('GuidedAnalysisChart', () => {
  it('labels the chart as an ungraded notebook and keeps its chronology explicitly LTR', async () => {
    const screen = await renderChart();

    expect(screen.getByText('מחברת גרף — לא מדורגת')).toBeTruthy();
    expect(screen.getByText(/אינם משפיעים.*שלבי הניתוח/)).toBeTruthy();
    expect(screen.getByTestId('guided-analysis-chart-notebook-ltr-surface')).toHaveStyle({
      direction: 'ltr',
    });
    expect(screen.queryByTestId(/expected-line/)).toBeNull();
    expect(screen.queryByTestId(/expected-zone/)).toBeNull();
    expect(screen.queryByTestId(/expected-point/)).toBeNull();
  });

  it('persists exact candle-index and price geometry through the controlled callback', async () => {
    const onAnnotationsChange = jest.fn();
    const screen = await renderChart({ onAnnotationsChange });
    const price = chart.candles[12]!.close;

    await fireEvent.press(screen.getByRole('button', { name: 'כלי מחברת נקודה' }));
    await fireEvent.press(screen.getByRole('button', { name: 'סימון מדויק לפי נר ומחיר' }));
    await fireEvent.changeText(screen.getByLabelText('מספר הנר במחברת'), '12');
    await fireEvent.changeText(screen.getByLabelText('מחיר במחברת'), String(price));
    await fireEvent.press(screen.getByRole('button', { name: 'החלת הנר והמחיר במחברת' }));

    expect(onAnnotationsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        kind: 'point',
        anchor: { candleIndex: 12, price },
      }),
    ]);
    expect(
      screen.getByRole('button', {
        name: `בחירת נקודה בנר 12, מחיר ${price.toFixed(2)}`,
      }),
    ).toBeTruthy();
  });

  it('filters learner geometry beyond the replay cursor and bounds replay at the decision cutoff', async () => {
    const future: LearnerChartAnnotation = {
      id: 'future-note',
      kind: 'point',
      anchor: { candleIndex: 40, price: chart.candles[40]!.close },
    };
    const onReplayCursorChange = jest.fn();
    const screen = await renderChart({ value: session([future]), onReplayCursorChange });

    expect(
      screen.queryByTestId('guided-analysis-chart-notebook-plot-learner-future-note'),
    ).toBeNull();
    expect(screen.queryByText(/נקודה בנר 40/)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: /עוד.*נרות/ }));
    expect(onReplayCursorChange).toHaveBeenCalledWith(27);

    await fireEvent.press(screen.getByRole('button', { name: 'לנקודת ההחלטה' }));
    expect(onReplayCursorChange).toHaveBeenLastCalledWith(chart.spec.decisionCandleIndex);
  });

  it('requires confirmation before clearing persisted learner annotations', async () => {
    const note: LearnerChartAnnotation = {
      id: 'saved-note',
      kind: 'horizontal-level',
      candleIndex: 12,
      price: chart.candles[12]!.close,
    };
    const onAnnotationsChange = jest.fn();
    const screen = await renderChart({ value: session([note]), onAnnotationsChange });

    await fireEvent.press(screen.getByRole('button', { name: 'ניקוי המחברת' }));
    expect(screen.getByLabelText('אישור ניקוי מחברת הגרף')).toBeTruthy();
    expect(onAnnotationsChange).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'מחיקת הכול' }));
    expect(onAnnotationsChange).toHaveBeenCalledWith([]);
  });

  it('announces reduced motion and emits a replay checkpoint request', async () => {
    const onCheckpointRequested = jest.fn();
    const screen = await renderChart({ onCheckpointRequested, reducedMotion: true });

    expect(screen.getByText(/מצב תנועה מופחת פעיל/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'שמירת נקודת ביקורת' }));
    expect(onCheckpointRequested).toHaveBeenCalledWith(23);
  });
});
