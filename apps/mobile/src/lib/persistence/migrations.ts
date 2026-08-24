import {
  AttemptConflictError,
  PersistenceCorruptionError,
  UnsupportedPersistenceVersionError,
} from './adapter';
import { assertValidGuidedAnalysisSession, type GuidedAnalysisSession } from '@chartpath/domain';
import { localDateForTimestamp, replayAttempts } from './projections';
import {
  CURRENT_PERSISTENCE_SCHEMA_VERSION,
  CURRENT_PROJECTOR_VERSION,
  DEFAULT_SETTINGS,
  type MigrationResult,
  type PersistenceSnapshot,
  type PersistenceSnapshotV1,
  type PersistenceSnapshotV3,
  type QuarantinedAnalysisSession,
} from './types';
import {
  assertNonEmptyString,
  assertUtcTimestamp,
  isObject,
  normalizeAttemptRecord,
  normalizeSettings,
  canonicalStringify,
} from './validation';

function parse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new PersistenceCorruptionError('Stored learning data is not valid JSON.', {
      cause: error,
    });
  }
}

function schemaVersionOf(value: unknown): number {
  if (!isObject(value))
    throw new PersistenceCorruptionError('Stored learning data is not an object.');
  const version = isObject(value.metadata) ? value.metadata.schemaVersion : value.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new PersistenceCorruptionError('Stored learning data has no valid schema version.');
  }
  return version;
}

function assertNow(now: string): void {
  assertUtcTimestamp(now, 'now');
}

function createMetadata(
  contentVersion: string,
  createdAt: string,
  updatedAt: string,
): PersistenceSnapshot['metadata'] {
  return {
    schemaVersion: CURRENT_PERSISTENCE_SCHEMA_VERSION,
    contentVersion,
    projectorVersion: CURRENT_PROJECTOR_VERSION,
    createdAt,
    updatedAt,
  };
}

function normalizeAttempts(values: readonly unknown[]): PersistenceSnapshot['attempts'] {
  const attempts = [];
  const known = new Map<string, string>();
  for (const value of values) {
    const attempt = normalizeAttemptRecord(value);
    const canonical = canonicalStringify(attempt);
    const previous = known.get(attempt.attempt.id);
    if (previous !== undefined) {
      if (previous !== canonical) throw new AttemptConflictError(attempt.attempt.id);
      // An idempotent retry is one logical source event and projects exactly once.
      continue;
    }
    known.set(attempt.attempt.id, canonical);
    attempts.push(attempt);
  }
  return attempts;
}

function sessionIdFrom(value: unknown): string | undefined {
  return isObject(value) && typeof value.sessionId === 'string' && value.sessionId.length > 0
    ? value.sessionId
    : undefined;
}

function analysisSessionIdentity(session: GuidedAnalysisSession): string {
  return canonicalStringify({
    chart: session.chart,
    contentVersionId: session.contentVersionId,
    exerciseId: session.exerciseId,
    exerciseSchemaVersion: session.exerciseSchemaVersion,
  });
}

function quarantineSession(
  value: unknown,
  index: number,
  now: string,
  reason: string,
): QuarantinedAnalysisSession {
  const sessionId = sessionIdFrom(value);
  return {
    quarantineId: `analysis-session:${sessionId ?? 'unknown'}:${index}`,
    ...(sessionId === undefined ? {} : { sessionId }),
    reason: reason.slice(0, 500),
    payloadJson: canonicalStringify(value),
    quarantinedAt: now,
  };
}

function normalizeAnalysisSessions(
  values: readonly unknown[],
  now: string,
): {
  readonly sessions: readonly GuidedAnalysisSession[];
  readonly quarantined: readonly QuarantinedAnalysisSession[];
  readonly changed: boolean;
} {
  const sessions: GuidedAnalysisSession[] = [];
  const quarantined: QuarantinedAnalysisSession[] = [];
  const byId = new Map<string, string>();
  const activeIdentities = new Set<string>();
  let changed = false;

  values.forEach((value, index) => {
    try {
      const session = JSON.parse(canonicalStringify(value)) as GuidedAnalysisSession;
      assertValidGuidedAnalysisSession(session);
      const canonical = canonicalStringify(session);
      const previous = byId.get(session.sessionId);
      if (previous !== undefined) {
        changed = true;
        if (previous !== canonical) {
          quarantined.push(
            quarantineSession(value, index, now, 'Duplicate session ID has conflicting data.'),
          );
        }
        return;
      }
      const identity = analysisSessionIdentity(session);
      if (session.status === 'active' && activeIdentities.has(identity)) {
        changed = true;
        quarantined.push(
          quarantineSession(value, index, now, 'Duplicate active analysis identity.'),
        );
        return;
      }
      byId.set(session.sessionId, canonical);
      if (session.status === 'active') activeIdentities.add(identity);
      sessions.push(session);
    } catch (error) {
      changed = true;
      quarantined.push(
        quarantineSession(
          value,
          index,
          now,
          error instanceof Error ? error.message : 'Invalid guided analysis session.',
        ),
      );
    }
  });

  sessions.sort(
    (left, right) =>
      Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
      left.sessionId.localeCompare(right.sessionId),
  );
  return { sessions, quarantined, changed };
}

function normalizeQuarantinedSessions(values: readonly unknown[]): QuarantinedAnalysisSession[] {
  return values.map((value, index) => {
    if (!isObject(value)) {
      throw new PersistenceCorruptionError(`Quarantined analysis session ${index} is invalid.`);
    }
    assertNonEmptyString(value.quarantineId, `quarantinedAnalysisSessions[${index}].quarantineId`);
    if (value.sessionId !== undefined) {
      assertNonEmptyString(value.sessionId, `quarantinedAnalysisSessions[${index}].sessionId`);
    }
    assertNonEmptyString(value.reason, `quarantinedAnalysisSessions[${index}].reason`);
    if (typeof value.payloadJson !== 'string') {
      throw new PersistenceCorruptionError(
        `quarantinedAnalysisSessions[${index}].payloadJson must be a string.`,
      );
    }
    assertUtcTimestamp(value.quarantinedAt, `quarantinedAnalysisSessions[${index}].quarantinedAt`);
    return {
      quarantineId: value.quarantineId,
      ...(value.sessionId === undefined ? {} : { sessionId: value.sessionId }),
      reason: value.reason,
      payloadJson: value.payloadJson,
      quarantinedAt: value.quarantinedAt,
    };
  });
}

export function createEmptySnapshot(contentVersion: string, now: string): PersistenceSnapshot {
  assertNonEmptyString(contentVersion, 'contentVersion');
  assertNow(now);
  return {
    metadata: createMetadata(contentVersion, now, now),
    settings: DEFAULT_SETTINGS,
    attempts: [],
    analysisSessions: [],
    quarantinedAnalysisSessions: [],
    projections: replayAttempts([], localDateForTimestamp(now)),
  };
}

function migrateV1(
  value: Record<string, unknown>,
  targetContentVersion: string,
  now: string,
): PersistenceSnapshot {
  const legacy = value as unknown as PersistenceSnapshotV1;
  assertNonEmptyString(legacy.contentVersion, 'contentVersion');
  assertUtcTimestamp(legacy.createdAt, 'createdAt');
  assertUtcTimestamp(legacy.updatedAt, 'updatedAt');
  if (!Array.isArray(legacy.attempts)) {
    throw new PersistenceCorruptionError('Stored attempts must be an array.');
  }
  const attempts = normalizeAttempts(legacy.attempts);
  return {
    metadata: createMetadata(targetContentVersion, legacy.createdAt, now),
    settings: normalizeSettings(legacy.settings),
    attempts,
    analysisSessions: [],
    quarantinedAnalysisSessions: [],
    projections: replayAttempts(attempts, localDateForTimestamp(now)),
  };
}

function migrateV2(
  value: Record<string, unknown>,
  targetContentVersion: string,
  now: string,
): PersistenceSnapshot {
  if (!isObject(value.metadata)) {
    throw new PersistenceCorruptionError('Stored metadata is missing.');
  }
  assertNonEmptyString(value.metadata.contentVersion, 'metadata.contentVersion');
  assertUtcTimestamp(value.metadata.createdAt, 'metadata.createdAt');
  assertUtcTimestamp(value.metadata.updatedAt, 'metadata.updatedAt');
  if (!Array.isArray(value.attempts)) {
    throw new PersistenceCorruptionError('Stored attempts must be an array.');
  }
  const attempts = normalizeAttempts(value.attempts);
  return {
    metadata: createMetadata(targetContentVersion, value.metadata.createdAt, now),
    settings: normalizeSettings(value.settings),
    attempts,
    analysisSessions: [],
    quarantinedAnalysisSessions: [],
    projections: replayAttempts(attempts, localDateForTimestamp(now)),
  };
}

function normalizeV4(
  value: Record<string, unknown>,
  targetContentVersion: string,
  now: string,
): { readonly snapshot: PersistenceSnapshot; readonly changed: boolean } {
  if (!isObject(value.metadata)) {
    throw new PersistenceCorruptionError('Stored metadata is missing.');
  }
  assertNonEmptyString(value.metadata.contentVersion, 'metadata.contentVersion');
  assertUtcTimestamp(value.metadata.createdAt, 'metadata.createdAt');
  assertUtcTimestamp(value.metadata.updatedAt, 'metadata.updatedAt');
  if (!Array.isArray(value.attempts)) {
    throw new PersistenceCorruptionError('Stored attempts must be an array.');
  }
  if (!Array.isArray(value.analysisSessions)) {
    throw new PersistenceCorruptionError('Stored analysis sessions must be an array.');
  }
  if (!Array.isArray(value.quarantinedAnalysisSessions)) {
    throw new PersistenceCorruptionError('Stored quarantined analysis sessions must be an array.');
  }
  const attempts = normalizeAttempts(value.attempts);
  const normalizedSessions = normalizeAnalysisSessions(value.analysisSessions, now);
  const existingQuarantines = normalizeQuarantinedSessions(value.quarantinedAnalysisSessions);
  const contentVersionChanged = value.metadata.contentVersion !== targetContentVersion;
  const projectorChanged = value.metadata.projectorVersion !== CURRENT_PROJECTOR_VERSION;
  const changed = contentVersionChanged || projectorChanged || normalizedSessions.changed;
  return {
    snapshot: {
      metadata: createMetadata(
        targetContentVersion,
        value.metadata.createdAt,
        changed ? now : value.metadata.updatedAt,
      ),
      settings: normalizeSettings(value.settings),
      attempts,
      analysisSessions: normalizedSessions.sessions,
      quarantinedAnalysisSessions: [...existingQuarantines, ...normalizedSessions.quarantined],
      // Projections are rebuildable and never trusted over the event log.
      projections: replayAttempts(attempts, localDateForTimestamp(now)),
    },
    changed,
  };
}

function migrateLegacyAnalysisSession(value: unknown): unknown {
  if (!isObject(value) || value.schemaVersion !== 1) return value;
  if (!isObject(value.chart) || !isObject(value.replay)) return value;
  const cursor = value.replay.cursorCandleIndex;
  if (typeof cursor !== 'number' || !Number.isInteger(cursor) || cursor < 0) return value;
  if (!Array.isArray(value.replay.checkpoints)) return value;

  let runningMaximum = 0;
  let previousCapturedAt = typeof value.createdAt === 'string' ? value.createdAt : undefined;
  const checkpoints = value.replay.checkpoints.map((checkpoint, index) => {
    if (!isObject(checkpoint)) return checkpoint;
    const checkpointCursor = checkpoint.cursorCandleIndex;
    if (
      typeof checkpointCursor === 'number' &&
      Number.isInteger(checkpointCursor) &&
      checkpointCursor >= 0
    ) {
      runningMaximum = Math.max(runningMaximum, checkpointCursor);
    }
    const capturedAt =
      typeof checkpoint.capturedAt === 'string' &&
      (previousCapturedAt === undefined ||
        Date.parse(checkpoint.capturedAt) >= Date.parse(previousCapturedAt))
        ? checkpoint.capturedAt
        : previousCapturedAt;
    if (capturedAt !== undefined) previousCapturedAt = capturedAt;
    return {
      ...checkpoint,
      sequence: index + 1,
      maxCursorSeenCandleIndex: runningMaximum,
      // Legacy drafts did not capture annotation state at checkpoint time. Empty is the
      // only deterministic snapshot that does not manufacture historical evidence.
      annotations: [],
      ...(capturedAt === undefined ? {} : { capturedAt }),
    };
  });
  const maxCursorSeenCandleIndex = Math.max(cursor, runningMaximum);
  return {
    ...value,
    schemaVersion: 2,
    chart: { ...value.chart, kind: 'synthetic' },
    replay: {
      ...value.replay,
      initialCursorCandleIndex: 0,
      maxCursorSeenCandleIndex,
      checkpoints,
    },
  };
}

function migrateV3(
  value: Record<string, unknown>,
  targetContentVersion: string,
  now: string,
): PersistenceSnapshot {
  if (!isObject(value.metadata)) {
    throw new PersistenceCorruptionError('Stored metadata is missing.');
  }
  assertNonEmptyString(value.metadata.contentVersion, 'metadata.contentVersion');
  assertUtcTimestamp(value.metadata.createdAt, 'metadata.createdAt');
  assertUtcTimestamp(value.metadata.updatedAt, 'metadata.updatedAt');
  if (!Array.isArray(value.attempts)) {
    throw new PersistenceCorruptionError('Stored attempts must be an array.');
  }
  if (!Array.isArray(value.analysisSessions)) {
    throw new PersistenceCorruptionError('Stored analysis sessions must be an array.');
  }
  if (!Array.isArray(value.quarantinedAnalysisSessions)) {
    throw new PersistenceCorruptionError('Stored quarantined analysis sessions must be an array.');
  }
  if (!isObject(value.projections)) {
    throw new PersistenceCorruptionError('Stored learning projections are missing.');
  }
  const attempts = normalizeAttempts(value.attempts);
  const migratedValues = value.analysisSessions.map(migrateLegacyAnalysisSession);
  const normalizedSessions = normalizeAnalysisSessions(migratedValues, now);
  const existingQuarantines = normalizeQuarantinedSessions(value.quarantinedAnalysisSessions);
  return {
    metadata: createMetadata(targetContentVersion, value.metadata.createdAt, now),
    settings: normalizeSettings(value.settings),
    attempts,
    analysisSessions: normalizedSessions.sessions,
    quarantinedAnalysisSessions: [...existingQuarantines, ...normalizedSessions.quarantined],
    // Schema 3 projections are already derived from the exact preserved attempt stream.
    projections: (value as unknown as PersistenceSnapshotV3).projections,
  };
}

/** Forward-only migration. Unknown future schemas fail without clearing data. */
export function migratePersistence(
  raw: string | null,
  targetContentVersion: string,
  now: string,
): MigrationResult {
  assertNonEmptyString(targetContentVersion, 'contentVersion');
  assertNow(now);
  if (raw === null) {
    return {
      snapshot: createEmptySnapshot(targetContentVersion, now),
      migrated: true,
      fromSchemaVersion: null,
      contentVersionChanged: false,
    };
  }

  const parsed = parse(raw);
  const version = schemaVersionOf(parsed);
  if (version > CURRENT_PERSISTENCE_SCHEMA_VERSION) {
    throw new UnsupportedPersistenceVersionError(version);
  }
  if (!isObject(parsed)) {
    throw new PersistenceCorruptionError('Stored learning data is not an object.');
  }
  if (version === 1) {
    const previousContentVersion = parsed.contentVersion;
    return {
      snapshot: migrateV1(parsed, targetContentVersion, now),
      migrated: true,
      fromSchemaVersion: 1,
      contentVersionChanged: previousContentVersion !== targetContentVersion,
    };
  }
  if (version === 2) {
    const previousContentVersion = isObject(parsed.metadata)
      ? parsed.metadata.contentVersion
      : undefined;
    return {
      snapshot: migrateV2(parsed, targetContentVersion, now),
      migrated: true,
      fromSchemaVersion: 2,
      contentVersionChanged: previousContentVersion !== targetContentVersion,
    };
  }
  if (version === 3) {
    const previousContentVersion = isObject(parsed.metadata)
      ? parsed.metadata.contentVersion
      : undefined;
    return {
      snapshot: migrateV3(parsed, targetContentVersion, now),
      migrated: true,
      fromSchemaVersion: 3,
      contentVersionChanged: previousContentVersion !== targetContentVersion,
    };
  }
  if (version !== 4) {
    throw new UnsupportedPersistenceVersionError(version);
  }

  const normalized = normalizeV4(parsed, targetContentVersion, now);
  return {
    snapshot: normalized.snapshot,
    migrated: normalized.changed,
    fromSchemaVersion: 4,
    contentVersionChanged:
      isObject(parsed.metadata) && parsed.metadata.contentVersion !== targetContentVersion,
  };
}
