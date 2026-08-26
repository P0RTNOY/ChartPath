import {
  assertValidGuidedAnalysisSession,
  assertValidPaperExecutionSession,
  assertValidPositionManagementSession,
  type GuidedAnalysisSession,
  type PaperExecutionSession,
  type PositionManagementSession,
} from '@chartpath/domain';
import { canonicalSerialize } from '@chartpath/historical-data';

import {
  CURRENT_PERSISTENCE_SCHEMA_VERSION,
  CURRENT_PROJECTOR_VERSION,
  type PersistedAttempt,
  type QuarantinedAnalysisSession,
  type QuarantinedPaperExecutionSession,
  type QuarantinedPositionManagementSession,
} from '../persistence/types';
import { normalizeAttemptRecord } from '../persistence/validation';
import {
  MAX_RECOVERY_ATTEMPTS,
  MAX_RECOVERY_CIPHERTEXT_BYTES,
  MAX_RECOVERY_ENVELOPE_BYTES,
  MAX_RECOVERY_QUARANTINE_PAYLOAD_BYTES,
  MAX_RECOVERY_QUARANTINES_PER_CATEGORY,
  MAX_RECOVERY_SESSIONS_PER_CATEGORY,
  MAX_RECOVERY_SESSION_EVENTS,
  RECOVERY_ENCODING,
  RECOVERY_ENVELOPE_FORMAT,
  RECOVERY_ENVELOPE_VERSION,
  RECOVERY_KEY_BYTES,
  RECOVERY_NONCE_BYTES,
  RECOVERY_PAYLOAD_FORMAT,
  RECOVERY_PAYLOAD_VERSION,
  RECOVERY_SALT_BYTES,
  RECOVERY_SCRYPT_N,
  RECOVERY_SCRYPT_P,
  RECOVERY_SCRYPT_R,
  RECOVERY_SUITE,
  RECOVERY_TAG_BYTES,
} from './constants';
import { decodeCanonicalBase64, recoveryChecksum, utf8 } from './encoding';
import { boundedRecoveryPreflight, deepFrozenCanonicalCopy } from './preflight';
import {
  RECOVERY_CATEGORIES,
  SENSITIVE_RECOVERY_CATEGORIES,
  RecoveryBundleError,
  type RecoveryCategory,
  type RecoveryEnvelopeV1,
  type RecoveryPayloadCountsV1,
  type RecoveryPayloadDataV1,
  type RecoveryPayloadPrivacyV1,
  type RecoveryPayloadV1,
  type SensitiveRecoveryCategory,
} from './types';

const CHECKSUM = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{2,127}$/u;
const VERSION = /^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$/u;

function fail(message: string): never {
  throw new RecoveryBundleError('RECOVERY_PAYLOAD_INVALID', message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

function assertExactKeys(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
  label = 'value',
): asserts value is Record<string, unknown> {
  if (!isPlainObject(value)) fail(`${label} must be a plain object.`);
  const accepted = new Set([...required, ...optional]);
  if (
    required.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) ||
    Object.keys(value).some((key) => !accepted.has(key))
  )
    fail(`${label} has missing or unknown fields.`);
}

function assertString(value: unknown, label: string, maximum = 200): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maximum ||
    value !== value.normalize('NFC')
  )
    fail(`${label} must be a bounded NFC string.`);
}

function assertTimestamp(value: unknown, label: string): asserts value is string {
  assertString(value, label, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value))
    fail(`${label} must be canonical UTC RFC3339.`);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value)
    fail(`${label} must be canonical UTC RFC3339.`);
}

function assertBoundedInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum)
    fail(`${label} must be an integer between ${minimum} and ${maximum}.`);
}

function orderedCategories(value: unknown): RecoveryCategory[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > RECOVERY_CATEGORIES.length)
    fail('includedCategories must be a non-empty bounded array.');
  const result = value.map((item) => {
    if (!(RECOVERY_CATEGORIES as readonly unknown[]).includes(item))
      fail(`Unknown recovery category ${String(item)}.`);
    return item as RecoveryCategory;
  });
  if (new Set(result).size !== result.length) fail('includedCategories contains duplicates.');
  const sorted = RECOVERY_CATEGORIES.filter((category) => result.includes(category));
  if (canonicalSerialize(result) !== canonicalSerialize(sorted))
    fail('includedCategories must use canonical category order.');
  return sorted;
}

function categoryDataKey(category: RecoveryCategory): keyof RecoveryPayloadDataV1 {
  switch (category) {
    case 'settings':
      return 'settings';
    case 'attempts':
      return 'attempts';
    case 'analysis-sessions':
      return 'analysisSessions';
    case 'paper-execution-sessions':
      return 'paperExecutionSessions';
    case 'position-management-sessions':
      return 'positionManagementSessions';
    case 'quarantine-records':
      return 'quarantineRecords';
  }
}

function assertPortableSettings(value: unknown): void {
  assertExactKeys(
    value,
    ['theme', 'reducedMotion', 'hapticsEnabled', 'textScale', 'dailyGoalMinutes'],
    [],
    'data.settings',
  );
  if (!['system', 'light', 'dark'].includes(String(value.theme))) fail('Invalid recovery theme.');
  if (typeof value.reducedMotion !== 'boolean' || typeof value.hapticsEnabled !== 'boolean')
    fail('Recovery motion and haptics settings must be boolean.');
  if (!['system', 'large', 'extra-large'].includes(String(value.textScale)))
    fail('Invalid recovery text scale.');
  assertBoundedInteger(value.dailyGoalMinutes, 'data.settings.dailyGoalMinutes', 1, 1_440);
}

function assertUniqueIds<T>(values: readonly T[], id: (value: T) => string, label: string): void {
  const ids = new Set<string>();
  for (const value of values) {
    const itemId = id(value);
    if (ids.has(itemId)) fail(`${label} contains duplicate stable ID ${itemId}.`);
    ids.add(itemId);
  }
}

export function isRecoverableAnalysisSession(session: GuidedAnalysisSession): boolean {
  return session.chart.kind !== 'historical' || session.chart.learningCredit === 'course';
}

export function isRecoverablePaperExecutionSession(session: PaperExecutionSession): boolean {
  return session.source.learningCredit === 'course';
}

export function isRecoverablePositionManagementSession(
  session: PositionManagementSession,
): boolean {
  return session.source.learningCredit === 'course';
}

function parsedQuarantinePayload(value: string): unknown | undefined {
  if (utf8(value).byteLength > MAX_RECOVERY_QUARANTINE_PAYLOAD_BYTES) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    boundedRecoveryPreflight(parsed, 'quarantine payload');
    return canonicalSerialize(parsed) === value ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isRecoverableQuarantinePayload(
  value: string,
  kind: 'analysis' | 'paper' | 'position-management',
): boolean {
  const parsed = parsedQuarantinePayload(value);
  if (!isPlainObject(parsed)) return false;
  if (kind === 'analysis') {
    const chart = parsed.chart;
    return (
      isPlainObject(chart) && (chart.kind !== 'historical' || chart.learningCredit === 'course')
    );
  }
  const source = parsed.source;
  return isPlainObject(source) && source.learningCredit === 'course';
}

function assertQuarantineRecord(
  value: unknown,
  kind: 'analysis' | 'paper' | 'position-management',
  label: string,
): void {
  const optional =
    kind === 'analysis'
      ? ['sessionId']
      : kind === 'paper'
        ? ['sessionId']
        : ['sessionId', 'paperExecutionSessionId'];
  assertExactKeys(
    value,
    ['quarantineId', 'reason', 'payloadJson', 'quarantinedAt'],
    optional,
    label,
  );
  assertString(value.quarantineId, `${label}.quarantineId`);
  if (value.sessionId !== undefined) assertString(value.sessionId, `${label}.sessionId`);
  if (value.paperExecutionSessionId !== undefined)
    assertString(value.paperExecutionSessionId, `${label}.paperExecutionSessionId`);
  assertString(value.reason, `${label}.reason`, 500);
  if (typeof value.payloadJson !== 'string') fail(`${label}.payloadJson must be a string.`);
  assertTimestamp(value.quarantinedAt, `${label}.quarantinedAt`);
  if (!isRecoverableQuarantinePayload(value.payloadJson, kind))
    fail(`${label} cannot be proven free of internal QA state.`);
}

function assertAttempts(value: unknown): asserts value is readonly PersistedAttempt[] {
  if (!Array.isArray(value) || value.length > MAX_RECOVERY_ATTEMPTS)
    fail('data.attempts exceeds the supported record count.');
  value.forEach((item, index) => {
    let normalized: PersistedAttempt;
    try {
      normalized = normalizeAttemptRecord(item);
    } catch {
      fail(`data.attempts[${index}] is invalid.`);
    }
    if (canonicalSerialize(normalized) !== canonicalSerialize(item))
      fail(`data.attempts[${index}] is not an exact normalized attempt.`);
    if (
      normalized.analysisChartIdentity?.kind === 'historical' &&
      normalized.analysisChartIdentity.learningCredit === 'none'
    )
      fail(`data.attempts[${index}] contains internal QA state.`);
  });
  assertUniqueIds(value, (item) => item.attempt.id, 'data.attempts');
}

function assertAnalysisSessions(value: unknown): asserts value is readonly GuidedAnalysisSession[] {
  if (!Array.isArray(value) || value.length > MAX_RECOVERY_SESSIONS_PER_CATEGORY)
    fail('data.analysisSessions exceeds the supported record count.');
  value.forEach((session, index) => {
    assertExactKeys(
      session,
      [
        'schemaVersion',
        'revision',
        'sessionId',
        'exerciseId',
        'contentVersionId',
        'exerciseSchemaVersion',
        'chart',
        'status',
        'createdAt',
        'updatedAt',
        'currentStepId',
        'steps',
        'annotations',
        'replay',
        'attemptId',
        'finalizationIdempotencyKey',
      ],
      ['finalizedAt', 'abandonedAt', 'finalResult'],
      `data.analysisSessions[${index}]`,
    );
    const candidate = session as unknown as GuidedAnalysisSession;
    try {
      assertValidGuidedAnalysisSession(candidate);
    } catch {
      fail(`data.analysisSessions[${index}] is invalid.`);
    }
    if (!isRecoverableAnalysisSession(candidate))
      fail(`data.analysisSessions[${index}] contains internal QA state.`);
  });
  assertUniqueIds(
    value as GuidedAnalysisSession[],
    (session) => session.sessionId,
    'data.analysisSessions',
  );
}

function assertPaperSessionShape(value: unknown, label: string): void {
  assertExactKeys(
    value,
    [
      'schemaVersion',
      'revision',
      'sessionId',
      'source',
      'executionPolicy',
      'costModel',
      'plan',
      'status',
      'orderId',
      'positionId',
      'debriefId',
      'createdAt',
      'updatedAt',
      'events',
      'processedCandles',
      'lastProcessedCandleIndex',
    ],
    ['submittedAt', 'workingOrder', 'position', 'debrief'],
    label,
  );
}

function assertPaperSessions(value: unknown): asserts value is readonly PaperExecutionSession[] {
  if (!Array.isArray(value) || value.length > MAX_RECOVERY_SESSIONS_PER_CATEGORY)
    fail('data.paperExecutionSessions exceeds the supported record count.');
  value.forEach((session, index) => {
    assertPaperSessionShape(session, `data.paperExecutionSessions[${index}]`);
    try {
      assertValidPaperExecutionSession(session as PaperExecutionSession);
    } catch {
      fail(`data.paperExecutionSessions[${index}] is invalid.`);
    }
    const typed = session as PaperExecutionSession;
    if (typed.events.length > MAX_RECOVERY_SESSION_EVENTS)
      fail(`data.paperExecutionSessions[${index}] has too many events.`);
    if (!isRecoverablePaperExecutionSession(typed))
      fail(`data.paperExecutionSessions[${index}] contains internal QA state.`);
  });
  assertUniqueIds(
    value as PaperExecutionSession[],
    (session) => session.sessionId,
    'data.paperExecutionSessions',
  );
}

function assertManagementSessions(
  value: unknown,
): asserts value is readonly PositionManagementSession[] {
  if (!Array.isArray(value) || value.length > MAX_RECOVERY_SESSIONS_PER_CATEGORY)
    fail('data.positionManagementSessions exceeds the supported record count.');
  value.forEach((session, index) => {
    assertExactKeys(
      session,
      [
        'schemaVersion',
        'revision',
        'sessionId',
        'debriefId',
        'handoff',
        'source',
        'authority',
        'policy',
        'costModel',
        'status',
        'direction',
        'priceTickMinor',
        'currencyDecimals',
        'quantityIncrement',
        'originalRiskMinor',
        'initialQuantityUnits',
        'openQuantityUnits',
        'activeProtectiveStopTicks',
        'activeTargetTicks',
        'lots',
        'fills',
        'accounting',
        'journal',
        'events',
        'processedCandles',
        'lastProcessedCandleIndex',
        'createdAt',
        'updatedAt',
      ],
      ['draft', 'pendingAction', 'ambiguityReason', 'debrief'],
      `data.positionManagementSessions[${index}]`,
    );
    assertPaperSessionShape(session.handoff, `data.positionManagementSessions[${index}].handoff`);
    const candidate = session as unknown as PositionManagementSession;
    try {
      assertValidPositionManagementSession(candidate);
    } catch {
      fail(`data.positionManagementSessions[${index}] is invalid.`);
    }
    const typed = candidate;
    if (
      typed.events.length > MAX_RECOVERY_SESSION_EVENTS ||
      typed.journal.length > MAX_RECOVERY_SESSION_EVENTS
    )
      fail(`data.positionManagementSessions[${index}] has too many events or journal entries.`);
    if (!isRecoverablePositionManagementSession(typed))
      fail(`data.positionManagementSessions[${index}] contains internal QA state.`);
  });
  assertUniqueIds(
    value as PositionManagementSession[],
    (session) => session.sessionId,
    'data.positionManagementSessions',
  );
}

function assertQuarantineRecords(value: unknown): void {
  assertExactKeys(
    value,
    ['analysisSessions', 'paperExecutionSessions', 'positionManagementSessions'],
    [],
    'data.quarantineRecords',
  );
  for (const [field, kind] of [
    ['analysisSessions', 'analysis'],
    ['paperExecutionSessions', 'paper'],
    ['positionManagementSessions', 'position-management'],
  ] as const) {
    const records = value[field];
    if (!Array.isArray(records) || records.length > MAX_RECOVERY_QUARANTINES_PER_CATEGORY)
      fail(`data.quarantineRecords.${field} exceeds the supported record count.`);
    records.forEach((record, index) =>
      assertQuarantineRecord(record, kind, `data.quarantineRecords.${field}[${index}]`),
    );
    assertUniqueIds(
      records as ({ readonly quarantineId: string } & (
        | QuarantinedAnalysisSession
        | QuarantinedPaperExecutionSession
        | QuarantinedPositionManagementSession
      ))[],
      (record) => record.quarantineId,
      `data.quarantineRecords.${field}`,
    );
  }
}

export function expectedRecoveryCounts(data: RecoveryPayloadDataV1): RecoveryPayloadCountsV1 {
  const quarantines = data.quarantineRecords;
  const analysisQuarantines = quarantines?.analysisSessions.length ?? 0;
  const paperQuarantines = quarantines?.paperExecutionSessions.length ?? 0;
  const managementQuarantines = quarantines?.positionManagementSessions.length ?? 0;
  return {
    settings: data.settings === undefined ? 0 : 1,
    attempts: data.attempts?.length ?? 0,
    analysisSessions: data.analysisSessions?.length ?? 0,
    paperExecutionSessions: data.paperExecutionSessions?.length ?? 0,
    positionManagementSessions: data.positionManagementSessions?.length ?? 0,
    quarantineRecords: {
      analysisSessions: analysisQuarantines,
      paperExecutionSessions: paperQuarantines,
      positionManagementSessions: managementQuarantines,
      total: analysisQuarantines + paperQuarantines + managementQuarantines,
    },
  };
}

export function expectedRecoveryPrivacy(
  categories: readonly RecoveryCategory[],
): RecoveryPayloadPrivacyV1 {
  const sensitiveCategories = SENSITIVE_RECOVERY_CATEGORIES.filter((category) =>
    categories.includes(category),
  );
  return {
    containsPositionManagementAndJournalText: categories.includes('position-management-sessions'),
    containsQuarantinePayloads: categories.includes('quarantine-records'),
    sensitiveCategories,
  };
}

export function parseRecoveryPayload(input: unknown): RecoveryPayloadV1 {
  boundedRecoveryPreflight(input, 'recovery payload');
  assertExactKeys(
    input,
    [
      'format',
      'payloadVersion',
      'bundleId',
      'createdAt',
      'source',
      'includedCategories',
      'data',
      'counts',
      'privacy',
      'payloadChecksum',
    ],
    [],
    'recovery payload',
  );
  if (input.format !== RECOVERY_PAYLOAD_FORMAT || input.payloadVersion !== RECOVERY_PAYLOAD_VERSION)
    fail('Unsupported recovery payload format or version.');
  if (typeof input.bundleId !== 'string' || !IDENTIFIER.test(input.bundleId))
    fail('bundleId is invalid.');
  assertTimestamp(input.createdAt, 'createdAt');
  assertExactKeys(
    input.source,
    ['appVersion', 'contentVersion', 'persistenceSchemaVersion', 'projectorVersion'],
    [],
    'source',
  );
  if (typeof input.source.appVersion !== 'string' || !VERSION.test(input.source.appVersion))
    fail('source.appVersion is invalid.');
  assertString(input.source.contentVersion, 'source.contentVersion');
  if (input.source.persistenceSchemaVersion !== CURRENT_PERSISTENCE_SCHEMA_VERSION)
    fail('Unsupported source persistence schema version.');
  if (input.source.projectorVersion !== CURRENT_PROJECTOR_VERSION)
    fail('Unsupported source projector version.');
  const categories = orderedCategories(input.includedCategories);
  assertExactKeys(input.data, categories.map(categoryDataKey), [], 'data');
  if (input.data.settings !== undefined) assertPortableSettings(input.data.settings);
  if (input.data.attempts !== undefined) assertAttempts(input.data.attempts);
  if (input.data.analysisSessions !== undefined)
    assertAnalysisSessions(input.data.analysisSessions);
  if (input.data.paperExecutionSessions !== undefined)
    assertPaperSessions(input.data.paperExecutionSessions);
  if (input.data.positionManagementSessions !== undefined)
    assertManagementSessions(input.data.positionManagementSessions);
  if (input.data.quarantineRecords !== undefined)
    assertQuarantineRecords(input.data.quarantineRecords);
  assertExactKeys(
    input.counts,
    [
      'settings',
      'attempts',
      'analysisSessions',
      'paperExecutionSessions',
      'positionManagementSessions',
      'quarantineRecords',
    ],
    [],
    'counts',
  );
  assertExactKeys(
    input.counts.quarantineRecords,
    ['analysisSessions', 'paperExecutionSessions', 'positionManagementSessions', 'total'],
    [],
    'counts.quarantineRecords',
  );
  const expectedCounts = expectedRecoveryCounts(input.data as RecoveryPayloadDataV1);
  if (canonicalSerialize(input.counts) !== canonicalSerialize(expectedCounts))
    fail('Recovery payload counts do not match included records.');
  assertExactKeys(
    input.privacy,
    [
      'containsPositionManagementAndJournalText',
      'containsQuarantinePayloads',
      'sensitiveCategories',
    ],
    [],
    'privacy',
  );
  const expectedPrivacy = expectedRecoveryPrivacy(categories);
  if (canonicalSerialize(input.privacy) !== canonicalSerialize(expectedPrivacy))
    fail('Recovery payload privacy flags do not match included categories.');
  if (typeof input.payloadChecksum !== 'string' || !CHECKSUM.test(input.payloadChecksum))
    fail('payloadChecksum is invalid.');
  const { payloadChecksum: _checksum, ...material } = input;
  void _checksum;
  if (recoveryChecksum(canonicalSerialize(material)) !== input.payloadChecksum)
    fail('Recovery payload checksum mismatch.');
  return deepFrozenCanonicalCopy(input as unknown as RecoveryPayloadV1);
}

export function parseRecoveryEnvelope(input: unknown): RecoveryEnvelopeV1 {
  try {
    boundedRecoveryPreflight(input, 'recovery envelope', {
      maximumStringBytes: MAX_RECOVERY_ENVELOPE_BYTES,
      maximumTotalStringBytes: MAX_RECOVERY_ENVELOPE_BYTES,
    });
    assertExactKeys(
      input,
      [
        'format',
        'envelopeVersion',
        'suite',
        'encoding',
        'kdf',
        'aead',
        'ciphertextByteLength',
        'ciphertextBase64',
        'tagBase64',
      ],
      [],
      'recovery envelope',
    );
    if (
      input.format !== RECOVERY_ENVELOPE_FORMAT ||
      input.envelopeVersion !== RECOVERY_ENVELOPE_VERSION ||
      input.suite !== RECOVERY_SUITE ||
      input.encoding !== RECOVERY_ENCODING
    )
      fail('Unsupported recovery envelope format, version, suite, or encoding.');
    assertExactKeys(input.kdf, ['algorithm', 'saltBase64', 'N', 'r', 'p', 'dkLen'], [], 'kdf');
    if (
      input.kdf.algorithm !== 'scrypt' ||
      input.kdf.N !== RECOVERY_SCRYPT_N ||
      input.kdf.r !== RECOVERY_SCRYPT_R ||
      input.kdf.p !== RECOVERY_SCRYPT_P ||
      input.kdf.dkLen !== RECOVERY_KEY_BYTES
    )
      fail('Unsupported recovery KDF profile.');
    const salt = decodeCanonicalBase64(input.kdf.saltBase64, 'kdf.saltBase64');
    if (salt.byteLength !== RECOVERY_SALT_BYTES) fail('Recovery salt length is invalid.');
    assertExactKeys(input.aead, ['algorithm', 'nonceBase64', 'tagLength'], [], 'aead');
    if (input.aead.algorithm !== 'AES-256-GCM' || input.aead.tagLength !== RECOVERY_TAG_BYTES)
      fail('Unsupported recovery AEAD profile.');
    const nonce = decodeCanonicalBase64(input.aead.nonceBase64, 'aead.nonceBase64');
    if (nonce.byteLength !== RECOVERY_NONCE_BYTES) fail('Recovery nonce length is invalid.');
    assertBoundedInteger(
      input.ciphertextByteLength,
      'ciphertextByteLength',
      1,
      MAX_RECOVERY_CIPHERTEXT_BYTES,
    );
    const ciphertext = decodeCanonicalBase64(input.ciphertextBase64, 'ciphertextBase64');
    if (ciphertext.byteLength !== input.ciphertextByteLength)
      fail('ciphertextByteLength does not match ciphertext.');
    const tag = decodeCanonicalBase64(input.tagBase64, 'tagBase64');
    if (tag.byteLength !== RECOVERY_TAG_BYTES)
      fail('Recovery authentication tag length is invalid.');
    return deepFrozenCanonicalCopy(input as unknown as RecoveryEnvelopeV1);
  } catch (error) {
    if (error instanceof RecoveryBundleError && error.code === 'RECOVERY_SIZE_LIMIT_EXCEEDED')
      throw error;
    if (error instanceof RecoveryBundleError && error.code === 'RECOVERY_FORMAT_INVALID')
      throw error;
    throw new RecoveryBundleError(
      'RECOVERY_FORMAT_INVALID',
      error instanceof Error ? error.message : 'Recovery envelope is invalid.',
    );
  }
}

export function validateSensitiveRecoveryConsent(
  categories: readonly RecoveryCategory[],
  consents: readonly SensitiveRecoveryCategory[],
): void {
  const uniqueConsents = new Set(consents);
  if (
    uniqueConsents.size !== consents.length ||
    consents.some(
      (category) => !(SENSITIVE_RECOVERY_CATEGORIES as readonly string[]).includes(category),
    )
  )
    fail('Sensitive recovery consent list is invalid.');
  for (const category of SENSITIVE_RECOVERY_CATEGORIES)
    if (categories.includes(category) && !uniqueConsents.has(category))
      throw new RecoveryBundleError(
        'RECOVERY_SENSITIVE_CONSENT_REQUIRED',
        `Explicit consent is required for ${category}.`,
      );
}
