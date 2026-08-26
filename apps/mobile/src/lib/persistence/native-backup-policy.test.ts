import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';

import {
  ensureSQLiteBackupPolicy,
  IOS_SQLITE_BACKUP_POLICY_VERSION,
  readSQLiteBackupPolicy,
} from './native-backup-policy';

jest.mock('expo', () => ({
  isRunningInExpoGo: jest.fn(() => false),
  requireOptionalNativeModule: jest.fn(),
}));

const validResult = {
  directoryKind: 'documents-sqlite' as const,
  excluded: true,
  policyVersion: IOS_SQLITE_BACKUP_POLICY_VERSION,
};

describe('native SQLite backup policy', () => {
  beforeEach(() => {
    jest.mocked(isRunningInExpoGo).mockReturnValue(false);
    jest.mocked(requireOptionalNativeModule).mockReset();
  });

  it('applies and reads back the exact versioned iOS exclusion', async () => {
    const nativeModule = {
      ensureSQLiteDirectoryExcludedAsync: jest.fn(async () => validResult),
      getSQLiteDirectoryBackupPolicyAsync: jest.fn(async () => validResult),
    };
    jest.mocked(requireOptionalNativeModule).mockReturnValue(nativeModule as never);

    await expect(ensureSQLiteBackupPolicy()).resolves.toEqual({
      kind: 'verified',
      platform: 'ios',
      ...validResult,
    });
    await expect(readSQLiteBackupPolicy()).resolves.toEqual({
      kind: 'verified',
      platform: 'ios',
      ...validResult,
    });
    expect(nativeModule.ensureSQLiteDirectoryExcludedAsync).toHaveBeenCalledTimes(1);
    expect(nativeModule.getSQLiteDirectoryBackupPolicyAsync).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ...validResult, directoryKind: 'caches' },
    { ...validResult, excluded: false },
    { ...validResult, policyVersion: 'stale-policy' },
  ])('rejects an invalid native readback %#', async (result) => {
    jest.mocked(requireOptionalNativeModule).mockReturnValue({
      ensureSQLiteDirectoryExcludedAsync: jest.fn(async () => result),
      getSQLiteDirectoryBackupPolicyAsync: jest.fn(async () => result),
    } as never);

    await expect(ensureSQLiteBackupPolicy()).rejects.toThrow(/could not verify/);
    await expect(readSQLiteBackupPolicy()).rejects.toThrow(/could not verify/);
  });

  it('allows Expo Go only as explicitly unavailable evidence', async () => {
    jest.mocked(requireOptionalNativeModule).mockReturnValue(null);
    jest.mocked(isRunningInExpoGo).mockReturnValue(true);

    await expect(ensureSQLiteBackupPolicy()).resolves.toEqual({
      kind: 'expo-go-unavailable',
      platform: 'ios',
    });
  });

  it('fails closed when a standalone iOS build omits the module', async () => {
    jest.mocked(requireOptionalNativeModule).mockReturnValue(null);

    await expect(ensureSQLiteBackupPolicy()).rejects.toThrow(/module is unavailable/);
  });
});
