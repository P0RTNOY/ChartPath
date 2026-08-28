import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

const mockExportRecoveryBundle = jest.fn();
const mockDecryptRecoveryBundle = jest.fn();
const mockGetDocumentAsync = jest.fn();
const mockShareAsync = jest.fn(async (_uri: string, _options?: unknown) => undefined);
const mockPreviewRecoveryImport = jest.fn();
const mockApplyRecoveryImport = jest.fn();

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
  decryptRecoveryBundle: (...args: unknown[]) => mockDecryptRecoveryBundle(...args),
  expoRecoveryCryptoProvider: { providerId: 'test' },
  exportRecoveryBundle: (...args: unknown[]) => mockExportRecoveryBundle(...args),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000001' }));
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));
jest.mock('expo-file-system', () => ({
  File: class MockFile {
    uri = 'file:///cache/recovery.json';
    create = jest.fn();
    write = jest.fn();
    text = jest.fn(async () => 'encrypted bundle');
  },
  Paths: { cache: 'file:///cache' },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: (uri: string, options: unknown) => mockShareAsync(uri, options),
}));
jest.mock('@/state/learning', () => ({
  useLearning: () => ({
    snapshot: { metadata: {} },
    previewRecoveryImport: (...args: unknown[]) => mockPreviewRecoveryImport(...args),
    applyRecoveryImport: (...args: unknown[]) => mockApplyRecoveryImport(...args),
  }),
}));

import { RecoveryBundlePanel } from '../recovery-bundle-panel';

const counts = {
  settings: 1 as const,
  attempts: 2,
  analysisSessions: 0,
  paperExecutionSessions: 0,
  positionManagementSessions: 1,
  quarantineRecords: {
    analysisSessions: 0,
    paperExecutionSessions: 0,
    positionManagementSessions: 0,
    total: 0,
  },
};
const payload = {
  bundleId: 'recovery-test',
  createdAt: '2026-08-28T08:30:00.000Z',
  payloadChecksum: `sha256:${'a'.repeat(64)}`,
  source: {
    appVersion: '0.1.0',
    contentVersion: 'chartpath-content-v8',
    persistenceSchemaVersion: 6,
    projectorVersion: 1,
  },
  includedCategories: ['settings', 'attempts', 'position-management-sessions'],
  privacy: {
    containsPositionManagementAndJournalText: true,
    containsQuarantinePayloads: false,
  },
};

const importPlan = {
  bundleId: 'recovery-test',
  payloadChecksum: payload.payloadChecksum,
  currentSnapshotChecksum: `sha256:${'c'.repeat(64)}`,
  planToken: `sha256:${'d'.repeat(64)}`,
  selectedCategories: ['attempts', 'position-management-sessions'],
  incoming: counts,
  added: counts,
  unchanged: { ...counts, settings: 0 as const, attempts: 0, positionManagementSessions: 0 },
  conflicts: [],
  canApply: true,
  hasChanges: true,
};

describe('RecoveryBundlePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportRecoveryBundle.mockResolvedValue({
      bundleText: '{"encrypted":true}',
      bundleDigest: `sha256:${'b'.repeat(64)}`,
      payload,
      preview: {
        counts,
        privacy: {
          containsPositionManagementAndJournalText: true,
          containsQuarantinePayloads: false,
        },
      },
    });
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'backup.json',
          uri: 'file:///picked/backup.json',
          file: { text: async () => 'encrypted bundle' },
        },
      ],
    });
    mockDecryptRecoveryBundle.mockResolvedValue({ payload });
    mockPreviewRecoveryImport.mockResolvedValue(importPlan);
    mockApplyRecoveryImport.mockResolvedValue({ applied: true, plan: importPlan });
  });

  function renderPanel() {
    return render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <RecoveryBundlePanel />
      </ChartPathThemeProvider>,
    );
  }

  it('requires explicit consent before exporting management journal text', async () => {
    const screen = await renderPanel();
    await fireEvent.press(
      screen.getByTestId('recovery-export-category-position-management-sessions'),
    );
    await fireEvent.changeText(
      screen.getByTestId('recovery-export-password'),
      'a-secure-password-123',
    );

    expect(screen.getByTestId('recovery-export-create').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(screen.getByTestId('recovery-export-consent-position-management-sessions')).toBeTruthy();
    await fireEvent.press(
      screen.getByTestId('recovery-export-consent-position-management-sessions'),
    );
    await fireEvent.press(screen.getByTestId('recovery-export-create'));

    await waitFor(() => expect(mockExportRecoveryBundle).toHaveBeenCalledTimes(1));
    expect(mockExportRecoveryBundle.mock.calls[0]?.[0]).toMatchObject({
      options: {
        categories: ['settings', 'attempts', 'position-management-sessions'],
        sensitiveCategoryConsents: ['position-management-sessions'],
      },
      passphrase: 'a-secure-password-123',
    });
    expect(screen.getByTestId('recovery-export-summary')).toBeTruthy();
    expect(screen.getByText('כולל טקסט יומן וניהול פוזיציה')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('recovery-export-share'));
    await waitFor(() =>
      expect(mockShareAsync).toHaveBeenCalledWith(
        'file:///cache/recovery.json',
        expect.objectContaining({ mimeType: 'application/json' }),
      ),
    );
  });

  it('performs decrypt and dry-run before exposing a separate additive import confirmation', async () => {
    const screen = await renderPanel();
    await fireEvent.press(screen.getByTestId('recovery-import-pick'));
    await waitFor(() => expect(screen.getByText('backup.json')).toBeTruthy());
    await fireEvent.changeText(
      screen.getByTestId('recovery-import-password'),
      'a-secure-password-123',
    );
    await fireEvent.press(screen.getByTestId('recovery-import-preview'));

    await waitFor(() => expect(mockPreviewRecoveryImport).toHaveBeenCalledWith(payload));
    expect(screen.getByTestId('recovery-import-summary')).toBeTruthy();
    expect(screen.getByTestId('recovery-import-identity')).toBeTruthy();
    expect(screen.getByTestId('recovery-import-bundle-id').props.children).toBe('recovery-test');
    expect(screen.getByTestId('recovery-import-created-at').props.children).toBe(
      '2026-08-28T08:30:00.000Z',
    );
    expect(screen.getByTestId('recovery-import-source-app-version').props.children).toBe('0.1.0');
    expect(screen.getByTestId('recovery-import-source-content-version').props.children).toBe(
      'chartpath-content-v8',
    );
    expect(screen.getByTestId('recovery-import-source-persistence-schema').props.children).toBe(6);
    expect(screen.getByTestId('recovery-import-source-projector-version').props.children).toBe(1);
    expect(screen.getByTestId('recovery-import-payload-checksum').props.children).toBe(
      `sha256:${'a'.repeat(64)}`,
    );
    expect(screen.getByTestId('recovery-import-current-snapshot-checksum').props.children).toBe(
      `sha256:${'c'.repeat(64)}`,
    );
    expect(screen.getByTestId('recovery-import-plan-token').props.children).toBe(
      `sha256:${'d'.repeat(64)}`,
    );
    expect(screen.getByTestId('recovery-import-counts-incoming')).toBeTruthy();
    expect(screen.getByTestId('recovery-import-counts-added')).toBeTruthy();
    expect(screen.getByTestId('recovery-import-counts-unchanged')).toBeTruthy();
    expect(screen.getByTestId('recovery-import-conflict-count').props.children).toBe(0);
    expect(screen.getByTestId('recovery-import-missing-ancestry-count').props.children).toBe(0);
    expect(
      screen.getByTestId('recovery-import-category-settings').props.accessibilityState.checked,
    ).toBe(false);
    expect(
      screen.getByTestId('recovery-import-category-attempts').props.accessibilityState.checked,
    ).toBe(true);
    await fireEvent.press(screen.getByTestId('recovery-import-category-settings'));
    await waitFor(() =>
      expect(mockPreviewRecoveryImport).toHaveBeenLastCalledWith(payload, {
        selectedCategories: ['settings', 'attempts', 'position-management-sessions'],
      }),
    );
    expect(mockApplyRecoveryImport).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('recovery-import-request-confirm'));
    expect(screen.getByTestId('recovery-import-confirmation')).toBeTruthy();
    expect(mockApplyRecoveryImport).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('recovery-import-cancel'));
    expect(screen.queryByTestId('recovery-import-confirmation')).toBeNull();
    expect(screen.getByTestId('recovery-bundle-message').props.children).toContain(
      'אישור היבוא בוטל',
    );
    expect(mockApplyRecoveryImport).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('recovery-import-request-confirm'));
    await fireEvent.press(screen.getByTestId('recovery-import-apply'));

    await waitFor(() =>
      expect(mockApplyRecoveryImport).toHaveBeenCalledWith(payload, {
        selectedCategories: ['attempts', 'position-management-sessions'],
        expectedPlanToken: `sha256:${'d'.repeat(64)}`,
      }),
    );
    expect(screen.getByTestId('recovery-import-result')).toBeTruthy();
    expect(screen.getByTestId('recovery-import-result-status')).toBeTruthy();
    expect(screen.getByTestId('recovery-import-result-added')).toBeTruthy();
    expect(screen.getByTestId('recovery-import-result-unchanged')).toBeTruthy();
  });

  it('keeps missing ancestry fail closed and exposes its exact blocking count', async () => {
    mockPreviewRecoveryImport.mockResolvedValue({
      ...importPlan,
      conflicts: [
        {
          category: 'paper-execution-sessions',
          stableId: 'paper-without-analysis',
          code: 'missing-ancestry',
          message: 'Paper execution has no exact finalized analysis.',
        },
      ],
      canApply: false,
    });
    const screen = await renderPanel();
    await fireEvent.press(screen.getByTestId('recovery-import-pick'));
    await fireEvent.changeText(
      screen.getByTestId('recovery-import-password'),
      'a-secure-password-123',
    );
    await fireEvent.press(screen.getByTestId('recovery-import-preview'));

    await waitFor(() => expect(screen.getByTestId('recovery-import-summary')).toBeTruthy());
    expect(screen.getByTestId('recovery-import-conflict-count').props.children).toBe(1);
    expect(screen.getByTestId('recovery-import-missing-ancestry-count').props.children).toBe(1);
    expect(screen.getByTestId('recovery-import-conflict-1')).toBeTruthy();
    expect(screen.queryByTestId('recovery-import-request-confirm')).toBeNull();
    expect(mockApplyRecoveryImport).not.toHaveBeenCalled();
  });
});
