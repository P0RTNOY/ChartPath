import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export const IOS_SQLITE_BACKUP_POLICY_VERSION = 'ios-sqlite-exclusion-v1';

export interface NativeBackupPolicyResult {
  readonly directoryKind: 'documents-sqlite';
  readonly excluded: boolean;
  readonly policyVersion: typeof IOS_SQLITE_BACKUP_POLICY_VERSION;
}

interface NativeBackupPolicyModule {
  ensureSQLiteDirectoryExcludedAsync(): Promise<NativeBackupPolicyResult>;
  getSQLiteDirectoryBackupPolicyAsync(): Promise<NativeBackupPolicyResult>;
}

export type SQLiteBackupPolicyStatus =
  | { readonly kind: 'not-applicable'; readonly platform: string }
  | { readonly kind: 'expo-go-unavailable'; readonly platform: 'ios' }
  | ({ readonly kind: 'verified'; readonly platform: 'ios' } & NativeBackupPolicyResult);

function optionalModule(): NativeBackupPolicyModule | null {
  if (Platform.OS !== 'ios') return null;
  return requireOptionalNativeModule<NativeBackupPolicyModule>('ChartPathBackupPolicy');
}

function validateResult(result: NativeBackupPolicyResult): NativeBackupPolicyResult {
  if (
    result.directoryKind !== 'documents-sqlite' ||
    result.policyVersion !== IOS_SQLITE_BACKUP_POLICY_VERSION ||
    result.excluded !== true
  ) {
    throw new Error('ChartPath could not verify the required iOS SQLite backup exclusion.');
  }
  return result;
}

export async function ensureSQLiteBackupPolicy(): Promise<SQLiteBackupPolicyStatus> {
  if (Platform.OS !== 'ios') return { kind: 'not-applicable', platform: Platform.OS };

  const nativeModule = optionalModule();
  if (!nativeModule) {
    if (isRunningInExpoGo()) return { kind: 'expo-go-unavailable', platform: 'ios' };
    throw new Error('The required ChartPath iOS backup-policy module is unavailable.');
  }

  const result = validateResult(await nativeModule.ensureSQLiteDirectoryExcludedAsync());
  return { kind: 'verified', platform: 'ios', ...result };
}

export async function readSQLiteBackupPolicy(): Promise<SQLiteBackupPolicyStatus> {
  if (Platform.OS !== 'ios') return { kind: 'not-applicable', platform: Platform.OS };

  const nativeModule = optionalModule();
  if (!nativeModule) {
    if (isRunningInExpoGo()) return { kind: 'expo-go-unavailable', platform: 'ios' };
    throw new Error('The required ChartPath iOS backup-policy module is unavailable.');
  }

  const result = validateResult(await nativeModule.getSQLiteDirectoryBackupPolicyAsync());
  return { kind: 'verified', platform: 'ios', ...result };
}
