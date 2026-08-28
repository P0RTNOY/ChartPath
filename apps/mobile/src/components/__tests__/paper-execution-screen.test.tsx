import { fireEvent, render, waitFor } from '@testing-library/react-native';

import {
  createPaperExecutionSession,
  reducePaperExecutionSession,
  type GuidedAnalysisSession,
  type HistoricalExecutionIdentity,
  type OhlcvCandle,
  type PaperExecutionSession,
  type TradePlanInput,
} from '@chartpath/domain';
import { ChartPathThemeProvider } from '@chartpath/ui';

import { PaperExecutionScreen } from '../paper-execution-screen';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockBack(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

const mockChartProps = jest.fn();
jest.mock('../ohlcv-chart', () => {
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    OhlcvChart: (props: {
      readonly testID: string;
      readonly chart: { readonly candles: readonly unknown[] };
      readonly cutoffCandleIndex: number;
      readonly executionOverlays: readonly unknown[];
      readonly viewport: {
        readonly startIndex: number;
        readonly endIndex: number;
      };
    }) => {
      mockChartProps(props);
      return (
        <View
          accessibilityLabel={`גרף ביצוע עם ${props.chart.candles.length} נרות`}
          testID={props.testID}
        />
      );
    },
  };
});

jest.mock('../paper-position-management', () => {
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return { PaperPositionManagement: () => <View testID="mock-position-management" /> };
});

const mockManagementAvailability = jest.fn();
const mockManagementOverlays = jest.fn((..._args: unknown[]) => []);
jest.mock('@/data/position-management', () => ({
  resolvePositionManagementAvailability: (...args: unknown[]) =>
    mockManagementAvailability(...args),
  buildPositionManagementOverlays: (...args: unknown[]) => mockManagementOverlays(...args),
}));

const mockResolveAnalysis = jest.fn();
const mockResolveExecution = jest.fn();
jest.mock('@/data/paper-execution', () => ({
  resolvePaperExecutionAnalysisSession: (...args: unknown[]) => mockResolveAnalysis(...args),
  resolvePaperExecutionSession: (...args: unknown[]) => mockResolveExecution(...args),
}));

let mockLearningContext: Record<string, unknown>;
jest.mock('@/state/learning', () => ({ useLearning: () => mockLearningContext }));

const source: HistoricalExecutionIdentity = {
  datasetId: 'fixture',
  datasetVersion: '1-dev',
  canonicalChecksum: `sha256:${'a'.repeat(64)}`,
  scenarioId: 'paper-scenario',
  scenarioVersion: '1-dev',
  analysisSessionId: 'analysis-final',
  analysisFinalizedAt: '2026-08-24T08:00:00.000Z',
  decisionCandleIndex: 2,
  candleCount: 6,
  learningCredit: 'none',
  permittedDirections: ['short'],
  permittedEntryOrderTypes: ['market', 'limit', 'stop'],
};

const candles: readonly OhlcvCandle[] = [
  {
    index: 0,
    timestamp: '2026-08-24T06:00:00.000Z',
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1_000,
  },
  {
    index: 1,
    timestamp: '2026-08-24T07:00:00.000Z',
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1_000,
  },
  {
    index: 2,
    timestamp: '2026-08-24T08:00:00.000Z',
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1_000,
  },
  {
    index: 3,
    timestamp: '2026-08-24T09:00:00.000Z',
    open: 100,
    high: 103,
    low: 96,
    close: 99,
    volume: 1_000,
  },
  {
    index: 4,
    timestamp: '2026-08-24T10:00:00.000Z',
    open: 99,
    high: 100,
    low: 97,
    close: 98,
    volume: 1_000,
  },
  {
    index: 5,
    timestamp: '2026-08-24T11:00:00.000Z',
    open: 98,
    high: 99,
    low: 96,
    close: 97,
    volume: 1_000,
  },
];

const ready = {
  status: 'ready' as const,
  content: {
    dataset: { manifest: { displaySymbol: 'Generated fixture 001' } },
    scenario: {
      educationalSourceReferences: [
        { sourceId: 'ta-he-v2', pageStart: 74, pageEnd: 75, section: 'מקרה ג׳' },
      ],
    },
  },
  source,
  candles,
  executionBoundary: { afterDecisionCandleIndex: 2, lastCandleIndex: 5 },
  learnerDisclosureHebrew: 'זהו מודל לימודי דטרמיניסטי בלבד ואינו ברוקר.',
  mode: 'hypothetical-mechanics' as const,
  application: {
    expected: { kind: 'no-trade' as const, disposition: 'no-trade' as const },
    learner: { kind: 'no-trade' as const, disposition: 'no-trade' as const },
    alignment: 'matched' as const,
    nextAction: 'no-trade-review' as const,
  },
  analysisProcessEvidence: {
    analysisDecision: 'no-trade' as const,
    entryMatchesAnalysis: true,
    invalidationMatchesAnalysis: true,
    targetMatchesAnalysis: true,
    requiredReasoningBypassed: false,
  },
};

const plan: TradePlanInput = {
  planId: 'paper-plan',
  direction: 'short',
  entryIntent: { type: 'market', estimatedEntryPrice: 100 },
  protectiveStopPrice: 102,
  targetPrice: 97,
  fictionalAccountValue: 100_000,
  intendedRiskAmount: 600,
  quantity: 10,
  authoredAtCandleIndex: 2,
  processEvidence: ready.analysisProcessEvidence,
};

function draft(): PaperExecutionSession {
  return createPaperExecutionSession({
    sessionId: 'paper-session',
    orderId: 'paper-order',
    positionId: 'paper-position',
    debriefId: 'paper-debrief',
    source,
    plan,
    createdAt: '2026-08-24T08:01:00.000Z',
  });
}

function submitted(): PaperExecutionSession {
  return reducePaperExecutionSession(draft(), {
    type: 'submit',
    confirmationId: 'paper-confirmation',
    submittedAt: '2026-08-24T08:02:00.000Z',
  });
}

function ambiguous(): PaperExecutionSession {
  return reducePaperExecutionSession(submitted(), {
    type: 'process-candles',
    candles: [candles[3]!],
    processedAt: '2026-08-24T09:00:00.000Z',
  });
}

function openPosition(): PaperExecutionSession {
  return reducePaperExecutionSession(submitted(), {
    type: 'process-candles',
    candles: [{ ...candles[3]!, high: 101, low: 98 }],
    processedAt: '2026-08-24T09:00:00.000Z',
  });
}

function analysis(): GuidedAnalysisSession {
  return { sessionId: 'analysis-final', status: 'finalized' } as GuidedAnalysisSession;
}

function mockLearning(execution: PaperExecutionSession) {
  const savePaperExecutionPlan = jest.fn(async () => execution);
  const submitPaperExecutionSession = jest.fn(async () => submitted());
  const advancePaperExecutionSession = jest.fn(async () => execution);
  const cancelPaperExecutionOrder = jest.fn(async () => execution);
  const abandonPaperExecutionSession = jest.fn(async () => execution);
  mockLearningContext = {
    status: 'ready',
    error: null,
    snapshot: {
      analysisSessions: [analysis()],
      paperExecutionSessions: [execution],
      positionManagementSessions: [],
    },
    reload: jest.fn(),
    createOrResumePaperExecutionSession: jest.fn(async () => execution),
    savePaperExecutionPlan,
    submitPaperExecutionSession,
    advancePaperExecutionSession,
    completePaperExecutionReplay: jest.fn(async () => execution),
    cancelPaperExecutionOrder,
    abandonPaperExecutionSession,
    createOrResumePositionManagementSession: jest.fn(async () => undefined),
  };
  return {
    abandonPaperExecutionSession,
    advancePaperExecutionSession,
    cancelPaperExecutionOrder,
    savePaperExecutionPlan,
    submitPaperExecutionSession,
  };
}

describe('PaperExecutionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveAnalysis.mockReturnValue(ready);
    mockResolveExecution.mockReturnValue(ready);
    mockManagementAvailability.mockReturnValue({
      status: 'unavailable',
      reason: 'scenario-disabled',
      messageHe: 'ניהול אינו מופעל.',
    });
  });

  it('renders a progressive Hebrew ticket and requires explicit simulator confirmation', async () => {
    const api = mockLearning(draft());
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <PaperExecutionScreen
          accessMode="qa-hypothetical-mechanics"
          analysisSessionId="analysis-final"
        />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByTestId('paper-execution-ticket')).toBeTruthy();
    expect(screen.getByTestId('internal-qa-boundary')).toBeTruthy();
    expect(screen.getByText('הניתוח קבע: אין עסקה')).toBeTruthy();
    expect(screen.getByText(/מצב.*מכניקה היפותטית/)).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'הוראת שוק', selected: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'הוראת לימיט' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'הוראת סטופ' })).toBeTruthy();
    expect(screen.getByLabelText('מחיר ייחוס להערכה')).toBeTruthy();
    expect(screen.getByLabelText('עצירה מגינה')).toBeTruthy();
    expect(screen.getByLabelText('יעד מותנה')).toBeTruthy();
    expect(screen.getByLabelText('שווי חשבון דמיוני')).toBeTruthy();
    expect(screen.getByLabelText('תקציב סיכון לתרגיל')).toBeTruthy();
    expect(screen.getByLabelText('כמות יחידות')).toBeTruthy();

    const submitButton = screen.getByTestId('paper-submit-order');
    expect(submitButton.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'אישור הבנת מגבלות הסימולטור' }));
    await fireEvent.press(screen.getByTestId('paper-submit-order'));
    await waitFor(() => expect(api.savePaperExecutionPlan).toHaveBeenCalledTimes(1));
    expect(api.submitPaperExecutionSession).toHaveBeenCalledTimes(1);
    expect(api.submitPaperExecutionSession).toHaveBeenCalledWith(
      'paper-session',
      expect.any(String),
      'qa-hypothetical-mechanics',
    );
  });

  it('renders only the current candle prefix and exposes a non-gesture next-candle action', async () => {
    const api = mockLearning(submitted());
    const screen = await render(
      <ChartPathThemeProvider mode="dark" reducedMotion textScale={1.3}>
        <PaperExecutionScreen
          accessMode="qa-hypothetical-mechanics"
          analysisSessionId="analysis-final"
        />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByLabelText('גרף ביצוע עם 3 נרות')).toBeTruthy();
    expect(screen.getByTestId('paper-execution-status-working')).toBeTruthy();
    expect(screen.getByTestId('paper-execution-processed-candle-2')).toBeTruthy();
    expect(screen.getByText(/מצב תנועה מופחת פעיל/)).toBeTruthy();
    expect(screen.getAllByText('ההוראה ממתינה לביצוע').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId('paper-advance-one'));
    await waitFor(() =>
      expect(api.advancePaperExecutionSession).toHaveBeenCalledWith(
        'paper-session',
        1,
        'qa-hypothetical-mechanics',
      ),
    );
  });

  it('keeps paper viewport pan and zoom inside the processed-candle boundary', async () => {
    const extendedCandles = Array.from({ length: 24 }, (_, index) => ({
      ...candles[index % candles.length]!,
      index,
      timestamp: `2026-08-25T${String(index).padStart(2, '0')}:00:00.000Z`,
    }));
    const execution = { ...submitted(), lastProcessedCandleIndex: 23 };
    mockLearning(execution);
    mockResolveExecution.mockReturnValue({
      ...ready,
      candles: extendedCandles,
      executionBoundary: { afterDecisionCandleIndex: 2, lastCandleIndex: 23 },
    });
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <PaperExecutionScreen
          accessMode="qa-hypothetical-mechanics"
          analysisSessionId="analysis-final"
        />
      </ChartPathThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId('paper-chart-zoom-in'));
    await fireEvent.press(screen.getByTestId('paper-chart-pan-later'));

    const latestChartProps = mockChartProps.mock.calls.at(-1)?.[0] as {
      readonly chart: { readonly candles: readonly { readonly index: number }[] };
      readonly cutoffCandleIndex: number;
      readonly viewport: { readonly startIndex: number; readonly endIndex: number };
    };
    expect(latestChartProps.cutoffCandleIndex).toBe(23);
    expect(latestChartProps.viewport.endIndex).toBeLessThanOrEqual(23);
    expect(Math.max(...latestChartProps.chart.candles.map(({ index }) => index))).toBe(23);
    expect(screen.getByTestId('paper-chart-viewport-range')).toBeTruthy();
  });

  it('requires explicit confirmation before cancelling or abandoning active execution', async () => {
    const api = mockLearning(submitted());
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <PaperExecutionScreen
          accessMode="qa-hypothetical-mechanics"
          analysisSessionId="analysis-final"
        />
      </ChartPathThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId('paper-cancel-order'));
    expect(screen.getByLabelText('אישור ביטול הוראת נייר')).toBeTruthy();
    expect(api.cancelPaperExecutionOrder).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('אישור ביטול'));
    await waitFor(() => expect(api.cancelPaperExecutionOrder).toHaveBeenCalledTimes(1));

    await fireEvent.press(screen.getByText('הפסקת סימולציה מפורשת'));
    expect(screen.getByTestId('paper-abandon-confirmation')).toBeTruthy();
    expect(api.abandonPaperExecutionSession).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('אישור הפסקה'));
    await waitFor(() => expect(api.abandonPaperExecutionSession).toHaveBeenCalledTimes(1));
  });

  it('shows an honest ambiguity debrief without selecting a profitable outcome', async () => {
    const execution = ambiguous();
    expect(execution.status).toBe('ambiguous');
    mockLearning(execution);
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <PaperExecutionScreen
          accessMode="qa-hypothetical-mechanics"
          analysisSessionId="analysis-final"
        />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByTestId('paper-execution-debrief')).toBeTruthy();
    expect(screen.getByTestId('paper-execution-status-ambiguous')).toBeTruthy();
    expect(screen.getByTestId('paper-execution-ambiguous')).toBeTruthy();
    expect(screen.getByText('אין רצף תוך־נרי אמין')).toBeTruthy();
    expect(screen.getByText(/הסימולטור לא בחר תוצאה רווחית או הפסדית/)).toBeTruthy();
    expect(screen.getByText('תחקיר תהליך — לא ציון רווח')).toBeTruthy();
  });

  it('fails closed when the pinned execution source cannot be verified', async () => {
    mockLearning(draft());
    mockResolveExecution.mockReturnValue({
      status: 'execution-identity-mismatch',
      message: 'Pinned checksum mismatch',
    });
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <PaperExecutionScreen
          accessMode="qa-hypothetical-mechanics"
          analysisSessionId="analysis-final"
        />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByTestId('paper-execution-recovery')).toBeTruthy();
    expect(screen.getByText('Pinned checksum mismatch')).toBeTruthy();
    expect(screen.queryByTestId('paper-submit-order')).toBeNull();
  });

  it('keeps persisted internal paper and management records hidden on ordinary access', async () => {
    const execution = openPosition();
    mockLearning(execution);
    const management = {
      sessionId: 'persisted-internal-management',
      handoff: execution,
      lastProcessedCandleIndex: execution.lastProcessedCandleIndex,
    };
    (
      mockLearningContext.snapshot as { positionManagementSessions: unknown[] }
    ).positionManagementSessions = [management];
    const persistedBefore = JSON.stringify(mockLearningContext.snapshot);
    mockResolveExecution.mockReturnValue({
      status: 'internal-scenario-restricted',
      message: 'Internal QA identity requires explicit development access.',
    });

    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <PaperExecutionScreen accessMode="ordinary" analysisSessionId="analysis-final" />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByTestId('paper-execution-recovery')).toBeTruthy();
    expect(screen.queryByTestId('paper-management-screen')).toBeNull();
    expect(screen.queryByTestId('paper-execution-ticket')).toBeNull();
    expect(JSON.stringify(mockLearningContext.snapshot)).toBe(persistedBefore);
  });

  it('creates the separate management aggregate only for an enabled exact open position', async () => {
    const execution = openPosition();
    expect(execution.status).toBe('open');
    mockManagementAvailability.mockReturnValue({ status: 'enabled', binding: {} });
    mockLearning(execution);

    await render(
      <ChartPathThemeProvider mode="light">
        <PaperExecutionScreen
          accessMode="qa-hypothetical-mechanics"
          analysisSessionId="analysis-final"
        />
      </ChartPathThemeProvider>,
    );

    await waitFor(() =>
      expect(mockLearningContext.createOrResumePositionManagementSession).toHaveBeenCalledWith(
        'paper-session',
        'qa-hypothetical-mechanics',
      ),
    );
  });

  it('uses the management cursor and removes mutable paper controls after handoff', async () => {
    const execution = openPosition();
    const management = {
      sessionId: 'management-session',
      handoff: execution,
      lastProcessedCandleIndex: 4,
    };
    mockManagementAvailability.mockReturnValue({ status: 'enabled', binding: {} });
    mockLearning(execution);
    (
      mockLearningContext.snapshot as { positionManagementSessions: unknown[] }
    ).positionManagementSessions = [management];

    const screen = await render(
      <ChartPathThemeProvider mode="dark" reducedMotion textScale={1.5}>
        <PaperExecutionScreen
          accessMode="qa-hypothetical-mechanics"
          analysisSessionId="analysis-final"
        />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByTestId('paper-management-screen')).toBeTruthy();
    expect(screen.getByTestId('paper-management-responsive-layout')).toBeTruthy();
    expect(screen.getByTestId('paper-management-chart')).toBeTruthy();
    expect(screen.getByTestId('mock-position-management')).toBeTruthy();
    expect(screen.getByLabelText('גרף ביצוע עם 5 נרות')).toBeTruthy();
    expect(screen.queryByText('הפסקת סימולציה מפורשת')).toBeNull();
    expect(mockManagementOverlays).toHaveBeenCalledWith(management, false);
  });
});
