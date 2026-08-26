import { canonicalSerialize } from '@chartpath/historical-data';

import type { PersistenceSnapshot } from '../persistence/types';
import { RECOVERY_PAYLOAD_FORMAT, RECOVERY_PAYLOAD_VERSION } from './constants';
import { recoveryChecksum } from './encoding';
import {
  DEFAULT_RECOVERY_CATEGORIES,
  RECOVERY_CATEGORIES,
  type CreateRecoveryPayloadOptions,
  type RecoveryCategory,
  type RecoveryPayloadDataV1,
  type RecoveryPayloadPreviewV1,
  type RecoveryPayloadV1,
} from './types';
import {
  expectedRecoveryCounts,
  expectedRecoveryPrivacy,
  isRecoverableAnalysisSession,
  isRecoverablePaperExecutionSession,
  isRecoverablePositionManagementSession,
  parseRecoveryPayload,
  validateSensitiveRecoveryConsent,
} from './validation';

function orderedUniqueCategories(categories: readonly RecoveryCategory[]): RecoveryCategory[] {
  if (
    categories.length === 0 ||
    new Set(categories).size !== categories.length ||
    categories.some((category) => !(RECOVERY_CATEGORIES as readonly string[]).includes(category))
  )
    throw new TypeError('Recovery categories must be a non-empty unique supported set.');
  return RECOVERY_CATEGORIES.filter((category) => categories.includes(category));
}

function recoverableQuarantines(snapshot: PersistenceSnapshot) {
  const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
  const recoverable = (payloadJson: string, kind: 'analysis' | 'paper' | 'management') => {
    try {
      const payload = JSON.parse(payloadJson) as unknown;
      if (!isPlainRecord(payload)) return false;
      if (kind === 'analysis') {
        const chart = payload.chart;
        return (
          isPlainRecord(chart) && (chart.kind !== 'historical' || chart.learningCredit === 'course')
        );
      }
      const source = payload.source;
      return isPlainRecord(source) && source.learningCredit === 'course';
    } catch {
      return false;
    }
  };
  return {
    analysisSessions: snapshot.quarantinedAnalysisSessions.filter((record) =>
      recoverable(record.payloadJson, 'analysis'),
    ),
    paperExecutionSessions: snapshot.quarantinedPaperExecutionSessions.filter((record) =>
      recoverable(record.payloadJson, 'paper'),
    ),
    positionManagementSessions: snapshot.quarantinedPositionManagementSessions.filter((record) =>
      recoverable(record.payloadJson, 'management'),
    ),
  };
}

export function createRecoveryPayload(
  snapshot: PersistenceSnapshot,
  options: CreateRecoveryPayloadOptions,
): RecoveryPayloadV1 {
  const categories = orderedUniqueCategories(options.categories ?? DEFAULT_RECOVERY_CATEGORIES);
  validateSensitiveRecoveryConsent(categories, options.sensitiveCategoryConsents ?? []);
  const data: RecoveryPayloadDataV1 = {};
  if (categories.includes('settings'))
    Object.assign(data, {
      settings: {
        theme: snapshot.settings.theme,
        reducedMotion: snapshot.settings.reducedMotion,
        hapticsEnabled: snapshot.settings.hapticsEnabled,
        textScale: snapshot.settings.textScale,
        dailyGoalMinutes: snapshot.settings.dailyGoalMinutes,
      },
    });
  if (categories.includes('attempts'))
    Object.assign(data, {
      attempts: snapshot.attempts.filter(
        (attempt) =>
          attempt.analysisChartIdentity?.kind !== 'historical' ||
          attempt.analysisChartIdentity.learningCredit === 'course',
      ),
    });
  if (categories.includes('analysis-sessions'))
    Object.assign(data, {
      analysisSessions: snapshot.analysisSessions.filter(isRecoverableAnalysisSession),
    });
  if (categories.includes('paper-execution-sessions'))
    Object.assign(data, {
      paperExecutionSessions: snapshot.paperExecutionSessions.filter(
        isRecoverablePaperExecutionSession,
      ),
    });
  if (categories.includes('position-management-sessions'))
    Object.assign(data, {
      positionManagementSessions: snapshot.positionManagementSessions.filter(
        isRecoverablePositionManagementSession,
      ),
    });
  if (categories.includes('quarantine-records'))
    Object.assign(data, { quarantineRecords: recoverableQuarantines(snapshot) });
  const material = {
    format: RECOVERY_PAYLOAD_FORMAT,
    payloadVersion: RECOVERY_PAYLOAD_VERSION,
    bundleId: options.bundleId,
    createdAt: options.createdAt,
    source: {
      appVersion: options.appVersion,
      contentVersion: snapshot.metadata.contentVersion,
      persistenceSchemaVersion: snapshot.metadata.schemaVersion,
      projectorVersion: snapshot.metadata.projectorVersion,
    },
    includedCategories: categories,
    data,
    counts: expectedRecoveryCounts(data),
    privacy: expectedRecoveryPrivacy(categories),
  } as const;
  return parseRecoveryPayload({
    ...material,
    payloadChecksum: recoveryChecksum(canonicalSerialize(material)),
  });
}

export function recoveryPayloadPreview(payload: RecoveryPayloadV1): RecoveryPayloadPreviewV1 {
  const parsed = parseRecoveryPayload(payload);
  return Object.freeze({
    bundleId: parsed.bundleId,
    createdAt: parsed.createdAt,
    source: parsed.source,
    includedCategories: parsed.includedCategories,
    counts: parsed.counts,
    privacy: parsed.privacy,
    payloadChecksum: parsed.payloadChecksum,
  });
}
