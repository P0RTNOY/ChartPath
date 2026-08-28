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
import { resolveHistoricalReplayScenario } from '@/data/historical-replay';

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
      kind: 'synthetic',
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
      initialCursorCandleIndex: 23,
      cursorCandleIndex,
      maxCursorSeenCandleIndex: cursorCandleIndex,
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

function historicalSession(
  cursorCandleIndex = 23,
  status: GuidedAnalysisSession['status'] = 'active',
): GuidedAnalysisSession {
  const resolved = resolveHistoricalReplayScenario('blind-generated-development-scenario');
  if (resolved.status !== 'ready') throw new Error('Historical test fixture is unavailable');
  return {
    ...session(),
    chart: resolved.chartIdentity,
    status,
    replay: {
      initialCursorCandleIndex: resolved.content.scenario.initialVisibleRange.endCandleIndex,
      cursorCandleIndex,
      maxCursorSeenCandleIndex: cursorCandleIndex,
      decisionCandleIndex: resolved.content.scenario.decisionCandleIndex,
      checkpoints: [],
    },
  };
}

function candidateHistoricalSession(): GuidedAnalysisSession {
  const resolved = resolveHistoricalReplayScenario('internal-no-trade-capstone-c');
  if (resolved.status !== 'ready') throw new Error('Candidate historical fixture is unavailable');
  return {
    ...session(),
    exerciseId: resolved.content.educationalExercise.id,
    contentVersionId: resolved.content.educationalExercise.contentVersionId,
    exerciseSchemaVersion: resolved.content.educationalExercise.schemaVersion,
    chart: resolved.chartIdentity,
    replay: {
      initialCursorCandleIndex: resolved.content.scenario.initialVisibleRange.endCandleIndex,
      cursorCandleIndex: resolved.content.scenario.decisionCandleIndex,
      maxCursorSeenCandleIndex: resolved.content.scenario.decisionCandleIndex,
      decisionCandleIndex: resolved.content.scenario.decisionCandleIndex,
      checkpoints: [],
    },
  };
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

  it('renders the exact historical knowledge view without pre-final identity or future rows', async () => {
    const screen = await renderChart({ value: historicalSession() });
    const beforeData = JSON.stringify(screen.toJSON());

    expect(screen.getByText(/Replay.*היסטורי עיוור/)).toBeTruthy();
    expect(beforeData).not.toMatch(
      /DEV-BLIND-001|Generated fixture 001|2025-01-05|github\.com|future fixture annotation/,
    );

    await fireEvent.press(screen.getByTestId('guided-analysis-chart-notebook-plot'), {
      nativeEvent: { locationX: 100, locationY: 100 },
    });
    expect(screen.getByTestId('guided-analysis-chart-notebook-candle-details')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/2025-01-05|T07:00:00/);

    await fireEvent.press(screen.getByRole('button', { name: 'הצגת נתוני הנרות' }));
    expect(screen.getByLabelText(/נר רציף 24:/)).toBeTruthy();
    expect(screen.queryByLabelText(/נר רציף 25:/)).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(
      /DEV-BLIND-001|Generated fixture 001|2025-01-05|github\.com|future fixture annotation/,
    );
  });

  it('accepts the exact virtual exercise identity for an internal candidate chart', async () => {
    const screen = await renderChart({ value: candidateHistoricalSession() });

    expect(screen.queryByTestId('guided-analysis-chart-notebook-incompatible')).toBeNull();
    expect(screen.getByTestId('guided-analysis-chart-notebook-plot')).toBeTruthy();
    expect(screen.getByText(/Replay.*היסטורי עיוור/)).toBeTruthy();
  });

  it('offers cutoff-safe accessible viewport controls on an exact candidate chart', async () => {
    const value = candidateHistoricalSession();
    const cutoff = value.replay.cursorCandleIndex;
    const screen = await renderChart({ value });

    expect(screen.getByTestId('guided-analysis-chart-notebook-pan-earlier')).toBeTruthy();
    expect(screen.getByTestId('guided-analysis-chart-notebook-pan-later')).toBeTruthy();
    expect(screen.getByTestId('guided-analysis-chart-notebook-zoom-in')).toBeTruthy();
    expect(screen.getByTestId('guided-analysis-chart-notebook-zoom-out')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('guided-analysis-chart-notebook-zoom-in'));
    await fireEvent.press(screen.getByTestId('guided-analysis-chart-notebook-pan-later'));

    const range = screen.getByTestId('guided-analysis-chart-notebook-viewport-range');
    const displayedEnd = Number(String(range.props.children).split('–#')[1]);
    expect(displayedEnd).toBeLessThanOrEqual(cutoff);

    await fireEvent.press(screen.getByRole('button', { name: 'הצגת נתוני הנרות' }));
    expect(screen.queryByLabelText(new RegExp(`נר רציף ${cutoff + 2}:`))).toBeNull();
  });

  it('stamps historical geometry with its authorship cursor and resets to the persisted minimum', async () => {
    const resolved = resolveHistoricalReplayScenario('blind-generated-development-scenario');
    if (resolved.status !== 'ready') throw new Error('Historical test fixture is unavailable');
    const onAnnotationsChange = jest.fn();
    const onReplayCursorChange = jest.fn();
    const screen = await renderChart({
      value: historicalSession(27),
      onAnnotationsChange,
      onReplayCursorChange,
    });
    const price = resolved.initialKnowledgeView.candles[12]!.close;

    await fireEvent.press(screen.getByRole('button', { name: 'כלי מחברת נקודה' }));
    await fireEvent.press(screen.getByRole('button', { name: 'סימון מדויק לפי נר ומחיר' }));
    await fireEvent.changeText(screen.getByLabelText('מספר הנר במחברת'), '12');
    await fireEvent.changeText(screen.getByLabelText('מחיר במחברת'), String(price));
    await fireEvent.press(screen.getByRole('button', { name: 'החלת הנר והמחיר במחברת' }));

    expect(onAnnotationsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ authoredAtCursorCandleIndex: 27 }),
    ]);
    await fireEvent.press(screen.getByRole('button', { name: 'איפוס' }));
    expect(onReplayCursorChange).toHaveBeenCalledWith(23);
  });

  it('fails closed for a modified pinned dataset and reveals identity only after finalization', async () => {
    const modified = historicalSession();
    if (modified.chart.kind !== 'historical') throw new Error('Expected historical identity');
    const recovery = await renderChart({
      value: {
        ...modified,
        chart: { ...modified.chart, datasetVersion: 'modified-version' },
      },
    });
    expect(recovery.getByTestId('guided-analysis-chart-notebook-incompatible')).toBeTruthy();
    expect(JSON.stringify(recovery.toJSON())).not.toMatch(/Generated fixture 001|2025-01-05/);

    recovery.unmount();
    const revealed = await renderChart({ value: historicalSession(72, 'finalized') });
    expect(JSON.stringify(revealed.toJSON())).toMatch(/Generated fixture 001|2025-01-05/);
    expect(revealed.queryByRole('button', { name: 'החלת הנר והמחיר במחברת' })).toBeNull();
  });
});
