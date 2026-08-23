import {
  AttemptConflictError,
  PersistenceCorruptionError,
  UnsupportedPersistenceVersionError,
} from './adapter';
import { replayAttempts } from './projections';
import {
  CURRENT_PERSISTENCE_SCHEMA_VERSION,
  CURRENT_PROJECTOR_VERSION,
  DEFAULT_SETTINGS,
  type MigrationResult,
  type PersistenceSnapshot,
  type PersistenceSnapshotV1,
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

export function createEmptySnapshot(contentVersion: string, now: string): PersistenceSnapshot {
  assertNonEmptyString(contentVersion, 'contentVersion');
  assertNow(now);
  return {
    metadata: createMetadata(contentVersion, now, now),
    settings: DEFAULT_SETTINGS,
    attempts: [],
    projections: replayAttempts([]),
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
    projections: replayAttempts(attempts),
  };
}

function normalizeV2(
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
  const attempts = normalizeAttempts(value.attempts);
  const contentVersionChanged = value.metadata.contentVersion !== targetContentVersion;
  const projectorChanged = value.metadata.projectorVersion !== CURRENT_PROJECTOR_VERSION;
  return {
    snapshot: {
      metadata: createMetadata(
        targetContentVersion,
        value.metadata.createdAt,
        contentVersionChanged || projectorChanged ? now : value.metadata.updatedAt,
      ),
      settings: normalizeSettings(value.settings),
      attempts,
      // Projections are rebuildable and never trusted over the event log.
      projections: replayAttempts(attempts),
    },
    changed: contentVersionChanged || projectorChanged,
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
  if (version !== CURRENT_PERSISTENCE_SCHEMA_VERSION) {
    throw new UnsupportedPersistenceVersionError(version);
  }

  const normalized = normalizeV2(parsed, targetContentVersion, now);
  return {
    snapshot: normalized.snapshot,
    migrated: normalized.changed,
    fromSchemaVersion: CURRENT_PERSISTENCE_SCHEMA_VERSION,
    contentVersionChanged:
      isObject(parsed.metadata) && parsed.metadata.contentVersion !== targetContentVersion,
  };
}
