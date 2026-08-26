import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import { RecoveryCenter } from '../recovery-center';

const discardAnalysis = jest.fn(async () => undefined);
const discardPaper = jest.fn(async () => undefined);
const discardManagement = jest.fn(async () => undefined);
const resetData = jest.fn(async () => undefined);
let mockLearning: Record<string, unknown>;

jest.mock('@/lib/recovery', () => ({
  DEFAULT_RECOVERY_CATEGORIES: ['settings', 'attempts'],
  RECOVERY_CATEGORIES: [
    'settings',
    'attempts',
    'analysis-sessions',
    'paper-execution-sessions',
    'position-management-sessions',
    'quarantine-records',
  ],
  decryptRecoveryBundle: jest.fn(),
  expoRecoveryCryptoProvider: {},
  exportRecoveryBundle: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
}));
jest.mock('@/state/learning', () => ({ useLearning: () => mockLearning }));

function renderCenter() {
  return render(
    <ChartPathThemeProvider direction="rtl" mode="light">
      <RecoveryCenter />
    </ChartPathThemeProvider>,
  );
}

describe('RecoveryCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLearning = {
      status: 'ready',
      error: null,
      snapshot: {
        quarantinedAnalysisSessions: [
          {
            quarantineId: 'analysis-quarantine-1',
            reason: 'secret technical reason',
            payloadJson: '{"private":"journal secret"}',
            quarantinedAt: '2026-08-26T10:00:00.000Z',
          },
        ],
        quarantinedPaperExecutionSessions: [],
        quarantinedPositionManagementSessions: [],
      },
      discardQuarantinedAnalysisSessions: discardAnalysis,
      discardQuarantinedPaperExecutionSessions: discardPaper,
      discardQuarantinedPositionManagementSessions: discardManagement,
      resetData,
      reload: jest.fn(),
      previewRecoveryImport: jest.fn(),
      applyRecoveryImport: jest.fn(),
    };
  });

  it('keeps payload and reason private and discards only explicitly selected records', async () => {
    const screen = await renderCenter();
    const serialized = JSON.stringify(screen.toJSON());

    expect(screen.getByTestId('recovery-privacy')).toBeTruthy();
    expect(serialized).not.toMatch(/journal secret|secret technical reason|payloadJson/);
    expect(screen.getByTestId('recovery-discard-analysis').props.accessibilityState.disabled).toBe(
      true,
    );

    await fireEvent.press(screen.getByTestId('recovery-item-analysis-1'));
    expect(
      screen.getByTestId('recovery-item-analysis-1').props.accessibilityState.checked,
    ).toBe(true);
    await fireEvent.press(screen.getByTestId('recovery-discard-analysis'));
    expect(screen.getByTestId('recovery-discard-confirmation')).toBeTruthy();
    expect(discardAnalysis).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'הסרת המסומנות בלבד' }));

    await waitFor(() =>
      expect(discardAnalysis).toHaveBeenCalledWith(['analysis-quarantine-1']),
    );
    expect(discardPaper).not.toHaveBeenCalled();
    expect(discardManagement).not.toHaveBeenCalled();
    expect(screen.getByTestId('recovery-message').props.accessibilityLiveRegion).toBe('polite');
  });

  it.each(['unsupported-newer-schema', 'transient'] as const)(
    'never offers reset for %s startup failures',
    async (reason) => {
      mockLearning = {
        ...mockLearning,
        status: 'error',
        snapshot: null,
        initializationFailure: { reason },
      };
      const screen = await renderCenter();
      expect(screen.getByTestId('recovery-startup')).toBeTruthy();
      expect(screen.queryByText('בדיקת אפשרות לאיפוס מלא')).toBeNull();
      expect(screen.getAllByText('ניסיון טעינה נוסף').length).toBeGreaterThan(0);
    },
  );

  it('gates a corrupt-store reset behind a focused explicit confirmation', async () => {
    mockLearning = {
      ...mockLearning,
      status: 'error',
      snapshot: null,
      initializationFailure: { reason: 'corrupt-store' },
    };
    const screen = await renderCenter();

    await fireEvent.press(screen.getByText('בדיקת אפשרות לאיפוס מלא'));
    expect(screen.getByTestId('recovery-reset-confirmation')).toBeTruthy();
    expect(resetData).not.toHaveBeenCalled();
    expect(screen.getByText(/הפעולה תמחק מהמכשיר/).props.accessibilityLiveRegion).toBe('assertive');
  });
});
