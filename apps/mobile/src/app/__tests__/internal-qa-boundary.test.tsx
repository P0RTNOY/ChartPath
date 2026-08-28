import { render } from '@testing-library/react-native';

import type { GuidedAnalysisSession } from '@chartpath/domain';
import { ChartPathThemeProvider } from '@chartpath/ui';

import AnalysisScreen from '../analysis';
import PaperExecutionRoute from '../paper-execution';

let mockParams: Record<string, string | undefined> = {};
let mockSessions: readonly GuidedAnalysisSession[] = [];
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/state/learning', () => ({
  useLearning: () => ({
    status: 'ready',
    error: null,
    snapshot: { analysisSessions: mockSessions },
    reload: jest.fn(),
  }),
}));
jest.mock('@/components/guided-analysis-session', () => {
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return { GuidedAnalysisSessionView: () => <View testID="authorized-analysis" /> };
});
const mockPaperProps = jest.fn();
jest.mock('@/components/paper-execution-screen', () => {
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    PaperExecutionScreen: (props: unknown) => {
      mockPaperProps(props);
      return <View testID="authorized-paper" />;
    },
  };
});

const internalSession = {
  sessionId: 'persisted-internal-analysis',
  chart: { kind: 'historical', learningCredit: 'none' },
} as GuidedAnalysisSession;
const syntheticSession = {
  sessionId: 'persisted-synthetic-analysis',
  chart: { kind: 'synthetic' },
} as GuidedAnalysisSession;

const originalDevelopmentMode = __DEV__;

describe('production persisted QA route boundary', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;
    delete process.env.EXPO_PUBLIC_CHARTPATH_REVIEWER_MODE;
    mockPaperProps.mockClear();
  });

  afterEach(() => {
    (globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = originalDevelopmentMode;
    delete process.env.EXPO_PUBLIC_CHARTPATH_REVIEWER_MODE;
  });

  it('keeps a valid persisted internal analysis hidden for ordinary and qa=1 production URLs', async () => {
    mockSessions = [internalSession];
    mockParams = { sessionId: internalSession.sessionId };
    const ordinary = await render(
      <ChartPathThemeProvider mode="light">
        <AnalysisScreen />
      </ChartPathThemeProvider>,
    );
    expect(ordinary.queryByTestId('authorized-analysis')).toBeNull();
    expect(ordinary.getByText(/סשן פנימי.*גרסת פיתוח/)).toBeTruthy();
    await ordinary.unmount();

    mockParams = { sessionId: internalSession.sessionId, qa: '1' };
    const qa = await render(
      <ChartPathThemeProvider mode="light">
        <AnalysisScreen />
      </ChartPathThemeProvider>,
    );
    expect(qa.queryByTestId('authorized-analysis')).toBeNull();
    expect(qa.getByText(/מצב הסוקרים הפנימי פעיל/)).toBeTruthy();
  });

  it('keeps ordinary synthetic analysis available in production', async () => {
    mockSessions = [syntheticSession];
    mockParams = { sessionId: syntheticSession.sessionId };
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <AnalysisScreen />
      </ChartPathThemeProvider>,
    );
    expect(screen.getByTestId('authorized-analysis')).toBeTruthy();
  });

  it('rejects qa=1 before paper or management UI can mount in production', async () => {
    mockParams = { analysisSessionId: internalSession.sessionId, qa: '1' };
    const screen = await render(
      <ChartPathThemeProvider mode="light">
        <PaperExecutionRoute />
      </ChartPathThemeProvider>,
    );
    expect(screen.queryByTestId('authorized-paper')).toBeNull();
    expect(screen.getByText(/מצב הסוקרים הפנימי פעיל/)).toBeTruthy();
    expect(mockPaperProps).not.toHaveBeenCalled();
  });

  it('rejects persisted qa=1 analysis and paper deep links in development without the reviewer flag', async () => {
    (globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = true;
    mockSessions = [internalSession];
    mockParams = { sessionId: internalSession.sessionId, qa: '1' };
    const analysis = await render(
      <ChartPathThemeProvider mode="light">
        <AnalysisScreen />
      </ChartPathThemeProvider>,
    );
    expect(analysis.queryByTestId('authorized-analysis')).toBeNull();
    expect(analysis.getByText(/מצב הסוקרים הפנימי פעיל/)).toBeTruthy();
    await analysis.unmount();

    mockParams = { analysisSessionId: internalSession.sessionId, qa: '1' };
    const paper = await render(
      <ChartPathThemeProvider mode="light">
        <PaperExecutionRoute />
      </ChartPathThemeProvider>,
    );
    expect(paper.queryByTestId('authorized-paper')).toBeNull();
    expect(paper.getByText(/מצב הסוקרים הפנימי פעיל/)).toBeTruthy();
    expect(mockPaperProps).not.toHaveBeenCalled();
  });

  it('allows persisted qa=1 deep links only when development and reviewer gates are both active', async () => {
    (globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = true;
    process.env.EXPO_PUBLIC_CHARTPATH_REVIEWER_MODE = '1';
    mockSessions = [internalSession];
    mockParams = { sessionId: internalSession.sessionId, qa: '1' };
    const analysis = await render(
      <ChartPathThemeProvider mode="light">
        <AnalysisScreen />
      </ChartPathThemeProvider>,
    );
    expect(analysis.getByTestId('authorized-analysis')).toBeTruthy();
    await analysis.unmount();

    mockParams = { analysisSessionId: internalSession.sessionId, qa: '1' };
    const paper = await render(
      <ChartPathThemeProvider mode="light">
        <PaperExecutionRoute />
      </ChartPathThemeProvider>,
    );
    expect(paper.getByTestId('authorized-paper')).toBeTruthy();
    expect(mockPaperProps).toHaveBeenCalledWith({
      accessMode: 'qa-internal',
      analysisSessionId: internalSession.sessionId,
    });
  });
});
