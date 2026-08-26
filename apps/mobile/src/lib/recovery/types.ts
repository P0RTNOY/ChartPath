import type {
  GuidedAnalysisSession,
  PaperExecutionSession,
  PositionManagementSession,
} from '@chartpath/domain';
import type { Sha256Checksum } from '@chartpath/historical-data';

import type {
  LearnerSettings,
  PersistedAttempt,
  PersistenceSnapshot,
  QuarantinedAnalysisSession,
  QuarantinedPaperExecutionSession,
  QuarantinedPositionManagementSession,
} from '../persistence/types';

export const RECOVERY_CATEGORIES = [
  'settings',
  'attempts',
  'analysis-sessions',
  'paper-execution-sessions',
  'position-management-sessions',
  'quarantine-records',
] as const;

export type RecoveryCategory = (typeof RECOVERY_CATEGORIES)[number];

export const SENSITIVE_RECOVERY_CATEGORIES = [
  'position-management-sessions',
  'quarantine-records',
] as const satisfies readonly RecoveryCategory[];

export type SensitiveRecoveryCategory = (typeof SENSITIVE_RECOVERY_CATEGORIES)[number];

export const DEFAULT_RECOVERY_CATEGORIES = Object.freeze([
  'settings',
  'attempts',
] as const satisfies readonly RecoveryCategory[]);

export type RecoveryPortableSettingsV1 = Pick<
  LearnerSettings,
  'theme' | 'reducedMotion' | 'hapticsEnabled' | 'textScale' | 'dailyGoalMinutes'
>;

export interface RecoverySourceV1 {
  readonly appVersion: string;
  readonly contentVersion: string;
  readonly persistenceSchemaVersion: number;
  readonly projectorVersion: number;
}

export interface RecoveryQuarantineRecordsV1 {
  readonly analysisSessions: readonly QuarantinedAnalysisSession[];
  readonly paperExecutionSessions: readonly QuarantinedPaperExecutionSession[];
  readonly positionManagementSessions: readonly QuarantinedPositionManagementSession[];
}

export interface RecoveryPayloadDataV1 {
  readonly settings?: RecoveryPortableSettingsV1;
  readonly attempts?: readonly PersistedAttempt[];
  readonly analysisSessions?: readonly GuidedAnalysisSession[];
  readonly paperExecutionSessions?: readonly PaperExecutionSession[];
  readonly positionManagementSessions?: readonly PositionManagementSession[];
  readonly quarantineRecords?: RecoveryQuarantineRecordsV1;
}

export interface RecoveryPayloadCountsV1 {
  readonly settings: 0 | 1;
  readonly attempts: number;
  readonly analysisSessions: number;
  readonly paperExecutionSessions: number;
  readonly positionManagementSessions: number;
  readonly quarantineRecords: {
    readonly analysisSessions: number;
    readonly paperExecutionSessions: number;
    readonly positionManagementSessions: number;
    readonly total: number;
  };
}

export interface RecoveryPayloadPrivacyV1 {
  readonly containsPositionManagementAndJournalText: boolean;
  readonly containsQuarantinePayloads: boolean;
  readonly sensitiveCategories: readonly SensitiveRecoveryCategory[];
}

export interface RecoveryPayloadMaterialV1 {
  readonly format: 'chartpath-recovery-payload';
  readonly payloadVersion: 1;
  readonly bundleId: string;
  readonly createdAt: string;
  readonly source: RecoverySourceV1;
  readonly includedCategories: readonly RecoveryCategory[];
  readonly data: RecoveryPayloadDataV1;
  readonly counts: RecoveryPayloadCountsV1;
  readonly privacy: RecoveryPayloadPrivacyV1;
}

export interface RecoveryPayloadV1 extends RecoveryPayloadMaterialV1 {
  readonly payloadChecksum: Sha256Checksum;
}

export interface RecoveryKdfV1 {
  readonly algorithm: 'scrypt';
  readonly saltBase64: string;
  readonly N: 32768;
  readonly r: 8;
  readonly p: 1;
  readonly dkLen: 32;
}

export interface RecoveryAeadV1 {
  readonly algorithm: 'AES-256-GCM';
  readonly nonceBase64: string;
  readonly tagLength: 16;
}

export interface RecoveryEnvelopeV1 {
  readonly format: 'chartpath-recovery';
  readonly envelopeVersion: 1;
  readonly suite: 'scrypt-rfc7914-n32768-r8-p1-aes-256-gcm-v1';
  readonly encoding: 'canonical-json-v1';
  readonly kdf: RecoveryKdfV1;
  readonly aead: RecoveryAeadV1;
  readonly ciphertextByteLength: number;
  readonly ciphertextBase64: string;
  readonly tagBase64: string;
}

export interface RecoveryCryptoProvider {
  readonly providerId: string;
  randomBytes(byteLength: number): Promise<Uint8Array>;
  encryptAes256Gcm(input: {
    readonly key: Uint8Array;
    readonly nonce: Uint8Array;
    readonly plaintext: Uint8Array;
    readonly additionalData: Uint8Array;
  }): Promise<{ readonly ciphertext: Uint8Array; readonly tag: Uint8Array }>;
  decryptAes256Gcm(input: {
    readonly key: Uint8Array;
    readonly nonce: Uint8Array;
    readonly ciphertext: Uint8Array;
    readonly tag: Uint8Array;
    readonly additionalData: Uint8Array;
  }): Promise<Uint8Array>;
}

export interface CreateRecoveryPayloadOptions {
  readonly appVersion: string;
  readonly bundleId: string;
  readonly createdAt: string;
  readonly categories?: readonly RecoveryCategory[];
  readonly sensitiveCategoryConsents?: readonly SensitiveRecoveryCategory[];
}

export interface RecoveryPayloadPreviewV1 {
  readonly bundleId: string;
  readonly createdAt: string;
  readonly source: RecoverySourceV1;
  readonly includedCategories: readonly RecoveryCategory[];
  readonly counts: RecoveryPayloadCountsV1;
  readonly privacy: RecoveryPayloadPrivacyV1;
  readonly payloadChecksum: Sha256Checksum;
}

export interface RecoveryBundleExportResultV1 {
  readonly bundleBytes: Uint8Array;
  readonly bundleText: string;
  readonly bundleDigest: Sha256Checksum;
  readonly payload: RecoveryPayloadV1;
  readonly preview: RecoveryPayloadPreviewV1;
}

export interface EncryptedRecoveryPayloadV1 {
  readonly bundleBytes: Uint8Array;
  readonly bundleText: string;
  readonly bundleDigest: Sha256Checksum;
}

export interface RecoveryBundleDecryptResultV1 {
  readonly bundleDigest: Sha256Checksum;
  readonly payload: RecoveryPayloadV1;
  readonly preview: RecoveryPayloadPreviewV1;
}

export interface ExportRecoveryBundleInput {
  readonly snapshot: PersistenceSnapshot;
  readonly options: CreateRecoveryPayloadOptions;
  readonly passphrase: string;
  readonly cryptoProvider: RecoveryCryptoProvider;
}

export type RecoveryBundleErrorCode =
  | 'RECOVERY_AUTHENTICATION_FAILED'
  | 'RECOVERY_FORMAT_INVALID'
  | 'RECOVERY_PAYLOAD_INVALID'
  | 'RECOVERY_PASSPHRASE_INVALID'
  | 'RECOVERY_SENSITIVE_CONSENT_REQUIRED'
  | 'RECOVERY_SIZE_LIMIT_EXCEEDED';

export class RecoveryBundleError extends Error {
  readonly code: RecoveryBundleErrorCode;

  constructor(code: RecoveryBundleErrorCode, message: string) {
    super(message);
    this.name = 'RecoveryBundleError';
    this.code = code;
  }
}

export class RecoveryAuthenticationError extends RecoveryBundleError {
  constructor() {
    super(
      'RECOVERY_AUTHENTICATION_FAILED',
      'The recovery password is incorrect or the recovery bundle was modified.',
    );
    this.name = 'RecoveryAuthenticationError';
  }
}
