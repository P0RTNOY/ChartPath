import {
  AttemptConflictError,
  PersistenceCorruptionError,
  UnsupportedPersistenceVersionError,
} from './adapter';
import {
  assertValidGuidedAnalysisSession,
  assertValidPaperExecutionSession,
  assertValidPositionManagementSession,
  type GuidedAnalysisSession,
  type PaperExecutionSession,
  type PositionManagementSession,
} from '@chartpath/domain';
import { localDateForTimestamp, replayAttempts } from './projections';
import {
  CURRENT_PERSISTENCE_SCHEMA_VERSION,
  CURRENT_PROJECTOR_VERSION,
  DEFAULT_SETTINGS,
  type MigrationResult,
  type PersistenceSnapshot,
  type PersistenceSnapshotV1,
  type PersistenceSnapshotV3,
  type PersistenceSnapshotV4,
  type QuarantinedAnalysisSession,
  type QuarantinedPaperExecutionSession,
  type QuarantinedPositionManagementSession,
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

function assertLegacyPayloadHasNoPositionManagementState(
  value: Record<string, unknown>,
  schemaVersion: number,
): void {
  if (schemaVersion > 5) return;
  for (const field of [
    'positionManagementSessions',
    'quarantinedPositionManagementSessions',
  ] as const) {
    const records = value[field];
    if (records === undefined) continue;
    if (!Array.isArray(records) || records.length > 0) {
      throw new PersistenceCorruptionError(
        `Schema ${schemaVersion} payload contains unsupported Milestone 6 ${field}.`,
      );
    }
  }
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

function paperExecutionSessionIdFrom(value: unknown): string | undefined {
  if (!isObject(value) || !isObject(value.handoff)) return undefined;
  return typeof value.handoff.sessionId === 'string' && value.handoff.sessionId.length > 0
    ? value.handoff.sessionId
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

function quarantinePaperExecutionSession(
  value: unknown,
  index: number,
  now: string,
  reason: string,
): QuarantinedPaperExecutionSession {
  const sessionId = sessionIdFrom(value);
  return {
    quarantineId: `paper-execution-session:${sessionId ?? 'unknown'}:${index}`,
    ...(sessionId === undefined ? {} : { sessionId }),
    reason: reason.slice(0, 500),
    payloadJson: canonicalStringify(value),
    quarantinedAt: now,
  };
}

function quarantinePositionManagementSession(
  value: unknown,
  index: number,
  now: string,
  reason: string,
): QuarantinedPositionManagementSession {
  const sessionId = sessionIdFrom(value);
  const paperExecutionSessionId = paperExecutionSessionIdFrom(value);
  return {
    quarantineId: `position-management-session:${sessionId ?? 'unknown'}:${index}`,
    ...(sessionId === undefined ? {} : { sessionId }),
    ...(paperExecutionSessionId === undefined ? {} : { paperExecutionSessionId }),
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

function normalizePaperExecutionSessions(
  values: readonly unknown[],
  now: string,
): {
  readonly sessions: readonly PaperExecutionSession[];
  readonly quarantined: readonly QuarantinedPaperExecutionSession[];
  readonly changed: boolean;
} {
  const sessions: PaperExecutionSession[] = [];
  const quarantined: QuarantinedPaperExecutionSession[] = [];
  const byId = new Map<string, string>();
  const activeAnalysisSessionIds = new Set<string>();
  let changed = false;

  values.forEach((value, index) => {
    try {
      const session = JSON.parse(canonicalStringify(value)) as PaperExecutionSession;
      assertValidPaperExecutionSession(session);
      const canonical = canonicalStringify(session);
      const previous = byId.get(session.sessionId);
      if (previous !== undefined) {
        changed = true;
        if (previous !== canonical) {
          quarantined.push(
            quarantinePaperExecutionSession(
              value,
              index,
              now,
              'Duplicate paper execution session ID has conflicting data.',
            ),
          );
        }
        return;
      }
      const active = ['draft', 'working', 'open'].includes(session.status);
      if (active && activeAnalysisSessionIds.has(session.source.analysisSessionId)) {
        changed = true;
        quarantined.push(
          quarantinePaperExecutionSession(
            value,
            index,
            now,
            'Duplicate active paper execution for one analysis session.',
          ),
        );
        return;
      }
      byId.set(session.sessionId, canonical);
      if (active) activeAnalysisSessionIds.add(session.source.analysisSessionId);
      sessions.push(session);
    } catch (error) {
      changed = true;
      quarantined.push(
        quarantinePaperExecutionSession(
          value,
          index,
          now,
          error instanceof Error ? error.message : 'Invalid paper execution session.',
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

function normalizeQuarantinedPaperExecutionSessions(
  values: readonly unknown[],
): QuarantinedPaperExecutionSession[] {
  return values.map((value, index) => {
    if (!isObject(value)) {
      throw new PersistenceCorruptionError(`Quarantined paper execution ${index} is invalid.`);
    }
    assertNonEmptyString(
      value.quarantineId,
      `quarantinedPaperExecutionSessions[${index}].quarantineId`,
    );
    if (value.sessionId !== undefined) {
      assertNonEmptyString(
        value.sessionId,
        `quarantinedPaperExecutionSessions[${index}].sessionId`,
      );
    }
    assertNonEmptyString(value.reason, `quarantinedPaperExecutionSessions[${index}].reason`);
    if (typeof value.payloadJson !== 'string') {
      throw new PersistenceCorruptionError(
        `quarantinedPaperExecutionSessions[${index}].payloadJson must be a string.`,
      );
    }
    assertUtcTimestamp(
      value.quarantinedAt,
      `quarantinedPaperExecutionSessions[${index}].quarantinedAt`,
    );
    return {
      quarantineId: value.quarantineId,
      ...(value.sessionId === undefined ? {} : { sessionId: value.sessionId }),
      reason: value.reason,
      payloadJson: value.payloadJson,
      quarantinedAt: value.quarantinedAt,
    };
  });
}

function normalizePositionManagementSessions(
  values: readonly unknown[],
  analysisSessions: readonly GuidedAnalysisSession[],
  paperExecutionSessions: readonly PaperExecutionSession[],
  now: string,
): {
  readonly sessions: readonly PositionManagementSession[];
  readonly quarantined: readonly QuarantinedPositionManagementSession[];
  readonly changed: boolean;
} {
  const sessions: PositionManagementSession[] = [];
  const quarantined: QuarantinedPositionManagementSession[] = [];
  const byId = new Map<string, string>();
  const paperExecutionSessionIds = new Set<string>();
  let changed = false;

  values.forEach((value, index) => {
    try {
      const session = JSON.parse(canonicalStringify(value)) as PositionManagementSession;
      assertValidPositionManagementSession(session);
      const paper = paperExecutionSessions.find(
        ({ sessionId }) => sessionId === session.handoff.sessionId,
      );
      if (!paper) {
        throw new Error('Position management session has no persisted paper execution handoff.');
      }
      if (canonicalStringify(paper) !== canonicalStringify(session.handoff)) {
        throw new Error(
          'Position management handoff differs from its exact persisted paper execution.',
        );
      }
      const analysis = analysisSessions.find(
        ({ sessionId }) => sessionId === session.source.analysisSessionId,
      );
      if (!analysis || analysis.status !== 'finalized' || analysis.chart.kind !== 'historical') {
        throw new Error(
          'Position management source has no exact finalized historical analysis session.',
        );
      }
      if (
        analysis.finalizedAt !== session.source.analysisFinalizedAt ||
        analysis.chart.datasetId !== session.source.datasetId ||
        analysis.chart.datasetVersion !== session.source.datasetVersion ||
        analysis.chart.canonicalChecksum !== session.source.canonicalChecksum ||
        analysis.chart.scenarioId !== session.source.scenarioId ||
        analysis.chart.scenarioVersion !== session.source.scenarioVersion ||
        analysis.chart.decisionCandleIndex !== session.source.decisionCandleIndex ||
        analysis.chart.candleCount !== session.source.candleCount ||
        analysis.chart.learningCredit !== session.source.learningCredit
      ) {
        throw new Error(
          'Position management source differs from its exact persisted historical analysis.',
        );
      }
      const canonical = canonicalStringify(session);
      const previous = byId.get(session.sessionId);
      if (previous !== undefined) {
        changed = true;
        if (previous !== canonical) {
          quarantined.push(
            quarantinePositionManagementSession(
              value,
              index,
              now,
              'Duplicate position management session ID has conflicting data.',
            ),
          );
        }
        return;
      }
      if (paperExecutionSessionIds.has(session.handoff.sessionId)) {
        changed = true;
        quarantined.push(
          quarantinePositionManagementSession(
            value,
            index,
            now,
            'Duplicate position management session for one paper execution.',
          ),
        );
        return;
      }
      byId.set(session.sessionId, canonical);
      paperExecutionSessionIds.add(session.handoff.sessionId);
      sessions.push(session);
    } catch (error) {
      changed = true;
      quarantined.push(
        quarantinePositionManagementSession(
          value,
          index,
          now,
          error instanceof Error ? error.message : 'Invalid position management session.',
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

function normalizeQuarantinedPositionManagementSessions(
  values: readonly unknown[],
): QuarantinedPositionManagementSession[] {
  return values.map((value, index) => {
    if (!isObject(value)) {
      throw new PersistenceCorruptionError(`Quarantined position management ${index} is invalid.`);
    }
    assertNonEmptyString(
      value.quarantineId,
      `quarantinedPositionManagementSessions[${index}].quarantineId`,
    );
    if (value.sessionId !== undefined) {
      assertNonEmptyString(
        value.sessionId,
        `quarantinedPositionManagementSessions[${index}].sessionId`,
      );
    }
    if (value.paperExecutionSessionId !== undefined) {
      assertNonEmptyString(
        value.paperExecutionSessionId,
        `quarantinedPositionManagementSessions[${index}].paperExecutionSessionId`,
      );
    }
    assertNonEmptyString(value.reason, `quarantinedPositionManagementSessions[${index}].reason`);
    if (typeof value.payloadJson !== 'string') {
      throw new PersistenceCorruptionError(
        `quarantinedPositionManagementSessions[${index}].payloadJson must be a string.`,
      );
    }
    assertUtcTimestamp(
      value.quarantinedAt,
      `quarantinedPositionManagementSessions[${index}].quarantinedAt`,
    );
    return {
      quarantineId: value.quarantineId,
      ...(value.sessionId === undefined ? {} : { sessionId: value.sessionId }),
      ...(value.paperExecutionSessionId === undefined
        ? {}
        : { paperExecutionSessionId: value.paperExecutionSessionId }),
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
    paperExecutionSessions: [],
    quarantinedPaperExecutionSessions: [],
    positionManagementSessions: [],
    quarantinedPositionManagementSessions: [],
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
    paperExecutionSessions: [],
    quarantinedPaperExecutionSessions: [],
    positionManagementSessions: [],
    quarantinedPositionManagementSessions: [],
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
    paperExecutionSessions: [],
    quarantinedPaperExecutionSessions: [],
    positionManagementSessions: [],
    quarantinedPositionManagementSessions: [],
    projections: replayAttempts(attempts, localDateForTimestamp(now)),
  };
}

function migrateV4(
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
  const normalizedSessions = normalizeAnalysisSessions(value.analysisSessions, now);
  const existingQuarantines = normalizeQuarantinedSessions(value.quarantinedAnalysisSessions);
  return {
    metadata: createMetadata(targetContentVersion, value.metadata.createdAt, now),
    settings: normalizeSettings(value.settings),
    attempts,
    analysisSessions: normalizedSessions.sessions,
    quarantinedAnalysisSessions: [...existingQuarantines, ...normalizedSessions.quarantined],
    paperExecutionSessions: [],
    quarantinedPaperExecutionSessions: [],
    positionManagementSessions: [],
    quarantinedPositionManagementSessions: [],
    // Schema 4 projections are derived from the exact preserved attempt stream.
    projections: (value as unknown as PersistenceSnapshotV4).projections,
  };
}

function normalizeV5(
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
  if (!Array.isArray(value.paperExecutionSessions)) {
    throw new PersistenceCorruptionError('Stored paper execution sessions must be an array.');
  }
  if (!Array.isArray(value.quarantinedPaperExecutionSessions)) {
    throw new PersistenceCorruptionError(
      'Stored quarantined paper execution sessions must be an array.',
    );
  }
  const attempts = normalizeAttempts(value.attempts);
  const normalizedAnalysis = normalizeAnalysisSessions(value.analysisSessions, now);
  const existingAnalysisQuarantines = normalizeQuarantinedSessions(
    value.quarantinedAnalysisSessions,
  );
  const normalizedExecution = normalizePaperExecutionSessions(value.paperExecutionSessions, now);
  const existingExecutionQuarantines = normalizeQuarantinedPaperExecutionSessions(
    value.quarantinedPaperExecutionSessions,
  );
  const contentVersionChanged = value.metadata.contentVersion !== targetContentVersion;
  const projectorChanged = value.metadata.projectorVersion !== CURRENT_PROJECTOR_VERSION;
  const changed =
    contentVersionChanged ||
    projectorChanged ||
    normalizedAnalysis.changed ||
    normalizedExecution.changed;
  return {
    snapshot: {
      metadata: createMetadata(
        targetContentVersion,
        value.metadata.createdAt,
        changed ? now : value.metadata.updatedAt,
      ),
      settings: normalizeSettings(value.settings),
      attempts,
      analysisSessions: normalizedAnalysis.sessions,
      quarantinedAnalysisSessions: [
        ...existingAnalysisQuarantines,
        ...normalizedAnalysis.quarantined,
      ],
      paperExecutionSessions: normalizedExecution.sessions,
      quarantinedPaperExecutionSessions: [
        ...existingExecutionQuarantines,
        ...normalizedExecution.quarantined,
      ],
      positionManagementSessions: [],
      quarantinedPositionManagementSessions: [],
      // Projections are rebuildable and never trust paper simulation state.
      projections: replayAttempts(attempts, localDateForTimestamp(now)),
    },
    changed,
  };
}

function normalizeV6(
  value: Record<string, unknown>,
  targetContentVersion: string,
  now: string,
): { readonly snapshot: PersistenceSnapshot; readonly changed: boolean } {
  if (!Array.isArray(value.positionManagementSessions)) {
    throw new PersistenceCorruptionError('Stored position management sessions must be an array.');
  }
  if (!Array.isArray(value.quarantinedPositionManagementSessions)) {
    throw new PersistenceCorruptionError(
      'Stored quarantined position management sessions must be an array.',
    );
  }
  const base = normalizeV5(value, targetContentVersion, now);
  const normalizedManagement = normalizePositionManagementSessions(
    value.positionManagementSessions,
    base.snapshot.analysisSessions,
    base.snapshot.paperExecutionSessions,
    now,
  );
  const existingQuarantines = normalizeQuarantinedPositionManagementSessions(
    value.quarantinedPositionManagementSessions,
  );
  const changed = base.changed || normalizedManagement.changed;
  return {
    snapshot: {
      ...base.snapshot,
      metadata: changed ? { ...base.snapshot.metadata, updatedAt: now } : base.snapshot.metadata,
      positionManagementSessions: normalizedManagement.sessions,
      quarantinedPositionManagementSessions: [
        ...existingQuarantines,
        ...normalizedManagement.quarantined,
      ],
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
    paperExecutionSessions: [],
    quarantinedPaperExecutionSessions: [],
    positionManagementSessions: [],
    quarantinedPositionManagementSessions: [],
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
  assertLegacyPayloadHasNoPositionManagementState(parsed, version);
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
  if (version === 4) {
    const previousContentVersion = isObject(parsed.metadata)
      ? parsed.metadata.contentVersion
      : undefined;
    return {
      snapshot: migrateV4(parsed, targetContentVersion, now),
      migrated: true,
      fromSchemaVersion: 4,
      contentVersionChanged: previousContentVersion !== targetContentVersion,
    };
  }
  if (version === 5) {
    const normalized = normalizeV5(parsed, targetContentVersion, now);
    return {
      snapshot: {
        ...normalized.snapshot,
        metadata: { ...normalized.snapshot.metadata, updatedAt: now },
      },
      migrated: true,
      fromSchemaVersion: 5,
      contentVersionChanged:
        isObject(parsed.metadata) && parsed.metadata.contentVersion !== targetContentVersion,
    };
  }
  if (version !== 6) throw new UnsupportedPersistenceVersionError(version);

  const normalized = normalizeV6(parsed, targetContentVersion, now);
  return {
    snapshot: normalized.snapshot,
    migrated: normalized.changed,
    fromSchemaVersion: 6,
    contentVersionChanged:
      isObject(parsed.metadata) && parsed.metadata.contentVersion !== targetContentVersion,
  };
}
