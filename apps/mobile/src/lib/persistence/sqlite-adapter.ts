import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import {
  AnalysisSessionConflictError,
  AttemptConflictError,
  PersistenceCorruptionError,
  type PersistenceAdapter,
  type PersistenceMutation,
} from './adapter';
import type { GuidedAnalysisSession } from '@chartpath/domain';
import type { PersistedAttempt } from './types';
import { canonicalStringify, isObject } from './validation';

const DEFAULT_DATABASE_NAME = 'chartpath.db';
const MIGRATION_1_CHECKSUM =
  'sha256:b71ddc422c78200f5b15b416aee6f07595fef159ae4cb0d80740f50c2fa3902d';

const CREATE_IMMUTABILITY_TRIGGERS = `
  CREATE TRIGGER IF NOT EXISTS attempts_reject_update
  BEFORE UPDATE ON attempts BEGIN
    SELECT RAISE(ABORT, 'attempts are append-only');
  END;
  CREATE TRIGGER IF NOT EXISTS attempts_reject_delete
  BEFORE DELETE ON attempts BEGIN
    SELECT RAISE(ABORT, 'attempts are append-only');
  END;
`;

const CREATE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS repository_state (
    singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS attempts (
    attempt_id TEXT PRIMARY KEY NOT NULL,
    exercise_id TEXT NOT NULL,
    exercise_version INTEGER NOT NULL,
    lesson_id TEXT NOT NULL,
    content_version TEXT NOT NULL,
    generator_version TEXT,
    skill_ids_json TEXT NOT NULL,
    answer_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    hint_count INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    elapsed_ms INTEGER,
    schema_version INTEGER NOT NULL,
    payload_json TEXT NOT NULL
  );
  ${CREATE_IMMUTABILITY_TRIGGERS}
`;

const CREATE_ANALYSIS_SESSION_TRIGGERS = `
  CREATE TRIGGER IF NOT EXISTS analysis_sessions_reject_finalized_update
  BEFORE UPDATE ON analysis_sessions
  WHEN OLD.status = 'finalized' AND OLD.payload_json <> NEW.payload_json BEGIN
    SELECT RAISE(ABORT, 'finalized analysis sessions are immutable');
  END;
  CREATE TRIGGER IF NOT EXISTS analysis_sessions_reject_delete
  BEFORE DELETE ON analysis_sessions BEGIN
    SELECT RAISE(ABORT, 'analysis sessions require explicit deletion');
  END;
`;

const CREATE_ANALYSIS_SESSIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS analysis_sessions (
    session_id TEXT PRIMARY KEY NOT NULL,
    exercise_id TEXT NOT NULL,
    content_version TEXT NOT NULL,
    exercise_schema_version INTEGER NOT NULL,
    chart_id TEXT NOT NULL,
    generator_version TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    attempt_id TEXT,
    schema_version INTEGER NOT NULL,
    payload_json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS analysis_sessions_status_updated_idx
    ON analysis_sessions(status, updated_at);
  ${CREATE_ANALYSIS_SESSION_TRIGGERS}
`;

const MIGRATE_ANALYSIS_SESSIONS_TO_HISTORICAL_SCHEMA = `
  DROP TRIGGER IF EXISTS analysis_sessions_reject_finalized_update;
  DROP TRIGGER IF EXISTS analysis_sessions_reject_delete;
  DROP INDEX IF EXISTS analysis_sessions_status_updated_idx;
  ALTER TABLE analysis_sessions RENAME TO analysis_sessions_v2;
  CREATE TABLE analysis_sessions (
    session_id TEXT PRIMARY KEY NOT NULL,
    exercise_id TEXT NOT NULL,
    content_version TEXT NOT NULL,
    exercise_schema_version INTEGER NOT NULL,
    chart_id TEXT NOT NULL,
    source_kind TEXT NOT NULL CHECK (source_kind IN ('synthetic', 'historical')),
    generator_version TEXT,
    historical_scenario_id TEXT,
    historical_scenario_version TEXT,
    historical_dataset_id TEXT,
    historical_dataset_version TEXT,
    historical_dataset_checksum TEXT,
    historical_learning_credit TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    attempt_id TEXT,
    schema_version INTEGER NOT NULL,
    payload_json TEXT NOT NULL
  );
  INSERT INTO analysis_sessions (
    session_id, exercise_id, content_version, exercise_schema_version, chart_id,
    source_kind, generator_version, historical_scenario_id, historical_scenario_version,
    historical_dataset_id, historical_dataset_version, historical_dataset_checksum,
    historical_learning_credit, status, created_at, updated_at, attempt_id, schema_version,
    payload_json
  )
  SELECT
    session_id, exercise_id, content_version, exercise_schema_version, chart_id,
    'synthetic', generator_version, NULL, NULL, NULL, NULL, NULL, NULL,
    status, created_at, updated_at, attempt_id, schema_version, payload_json
  FROM analysis_sessions_v2;
  DROP TABLE analysis_sessions_v2;
  CREATE INDEX analysis_sessions_status_updated_idx
    ON analysis_sessions(status, updated_at);
  ${CREATE_ANALYSIS_SESSION_TRIGGERS}
`;

const SQLITE_MIGRATIONS = [
  {
    version: 1,
    name: 'create_local_learning_store',
    checksum: MIGRATION_1_CHECKSUM,
    appliedAt: '2026-08-23T00:00:00.000Z',
    sql: CREATE_SCHEMA,
  },
  {
    version: 2,
    name: 'create_guided_analysis_sessions',
    checksum: 'sha256:5a5c057716114c61e925393653a1d11fb9ed4d3a1d50ce14434f06720b00836b',
    appliedAt: '2026-08-24T00:00:00.000Z',
    sql: CREATE_ANALYSIS_SESSIONS_SCHEMA,
  },
  {
    version: 3,
    name: 'pin_historical_analysis_session_evidence',
    checksum: 'sha256:da1ca5901e6cc9574c0366c258b6f1dc55895bd482b83439765c820b35ed8fe4',
    appliedAt: '2026-08-24T00:00:00.000Z',
    sql: MIGRATE_ANALYSIS_SESSIONS_TO_HISTORICAL_SCHEMA,
  },
] as const;

interface SQLiteAdapterOptions {
  readonly databaseName?: string;
}

function extractAttempts(serialized: string | null): readonly PersistedAttempt[] {
  if (serialized === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new PersistenceCorruptionError('SQLite repository state is not valid JSON.', {
      cause: error,
    });
  }
  if (!isObject(parsed) || !Array.isArray(parsed.attempts)) {
    throw new PersistenceCorruptionError('SQLite repository state has no attempt stream.');
  }
  for (const record of parsed.attempts) {
    if (!isObject(record) || !isObject(record.attempt) || typeof record.attempt.id !== 'string') {
      throw new PersistenceCorruptionError('SQLite repository state has an invalid attempt.');
    }
  }
  return parsed.attempts as unknown as readonly PersistedAttempt[];
}

function byId(records: readonly PersistedAttempt[]): ReadonlyMap<string, PersistedAttempt> {
  return new Map(records.map((record) => [record.attempt.id, record]));
}

function extractAnalysisSessions(serialized: string | null): readonly GuidedAnalysisSession[] {
  if (serialized === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new PersistenceCorruptionError('SQLite repository state is not valid JSON.', {
      cause: error,
    });
  }
  if (!isObject(parsed)) {
    throw new PersistenceCorruptionError('SQLite repository state is not an object.');
  }
  const schemaVersion = isObject(parsed.metadata)
    ? parsed.metadata.schemaVersion
    : parsed.schemaVersion;
  if (schemaVersion === 1 || schemaVersion === 2) return [];
  if (!Array.isArray(parsed.analysisSessions)) {
    throw new PersistenceCorruptionError('SQLite repository state has no analysis sessions.');
  }
  for (const session of parsed.analysisSessions) {
    if (!isObject(session) || typeof session.sessionId !== 'string') {
      throw new PersistenceCorruptionError(
        'SQLite repository state has an invalid analysis session.',
      );
    }
  }
  return parsed.analysisSessions as unknown as readonly GuidedAnalysisSession[];
}

function sessionsById(
  sessions: readonly GuidedAnalysisSession[],
): ReadonlyMap<string, GuidedAnalysisSession> {
  return new Map(sessions.map((session) => [session.sessionId, session]));
}

function extractUpdatedAt(serialized: string): string {
  const parsed = JSON.parse(serialized) as unknown;
  if (
    isObject(parsed) &&
    isObject(parsed.metadata) &&
    typeof parsed.metadata.updatedAt === 'string'
  ) {
    return parsed.metadata.updatedAt;
  }
  return '1970-01-01T00:00:00.000Z';
}

export class SQLitePersistenceAdapter implements PersistenceAdapter {
  private database: SQLiteDatabase | undefined;
  private initialization: Promise<void> | undefined;

  public constructor(private readonly options: SQLiteAdapterOptions = {}) {}

  private async open(): Promise<SQLiteDatabase> {
    this.database ??= await openDatabaseAsync(this.options.databaseName ?? DEFAULT_DATABASE_NAME);
    return this.database;
  }

  public initialize(): Promise<void> {
    this.initialization ??= this.initializeOnce();
    return this.initialization;
  }

  private async initializeOnce(): Promise<void> {
    const database = await this.open();
    await database.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          checksum TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
      `);
      const latest = await transaction.getFirstAsync<{ version: number | null }>(
        'SELECT MAX(version) AS version FROM schema_migrations',
      );
      if ((latest?.version ?? 0) > SQLITE_MIGRATIONS.length) {
        throw new PersistenceCorruptionError(
          `SQLite migration ${String(latest?.version)} is newer than this app supports.`,
        );
      }
      for (const migration of SQLITE_MIGRATIONS) {
        const applied = await transaction.getFirstAsync<{ checksum: string }>(
          'SELECT checksum FROM schema_migrations WHERE version = ?',
          migration.version,
        );
        if (applied && applied.checksum !== migration.checksum) {
          throw new PersistenceCorruptionError(
            `SQLite migration ${migration.version} checksum does not match.`,
          );
        }
        if (!applied) {
          await transaction.execAsync(migration.sql);
          await transaction.runAsync(
            `INSERT INTO schema_migrations (version, name, checksum, applied_at)
             VALUES (?, ?, ?, ?)`,
            migration.version,
            migration.name,
            migration.checksum,
            migration.appliedAt,
          );
        }
      }
    });
  }

  public async read(): Promise<string | null> {
    await this.initialize();
    const row = await this.database?.getFirstAsync<{ payload_json: string }>(
      'SELECT payload_json FROM repository_state WHERE singleton_id = 1',
    );
    return row?.payload_json ?? null;
  }

  private async insertAttempt(database: SQLiteDatabase, record: PersistedAttempt): Promise<void> {
    const payload = canonicalStringify(record);
    const existing = await database.getFirstAsync<{ payload_json: string }>(
      'SELECT payload_json FROM attempts WHERE attempt_id = ?',
      record.attempt.id,
    );
    if (existing) {
      if (existing.payload_json !== payload) throw new AttemptConflictError(record.attempt.id);
      return;
    }
    await database.runAsync(
      `INSERT INTO attempts (
        attempt_id, exercise_id, exercise_version, lesson_id, content_version,
        generator_version, skill_ids_json, answer_json, result_json, hint_count,
        started_at, submitted_at, elapsed_ms, schema_version, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.attempt.id,
      record.attempt.exerciseId,
      record.exerciseVersion,
      record.lessonId,
      record.attempt.contentVersionId,
      record.generatorVersion ?? null,
      canonicalStringify(record.skillIds),
      canonicalStringify(record.attempt.answer),
      canonicalStringify(record.attempt.result),
      record.attempt.hintIdsUsed.length,
      record.attempt.startedAt,
      record.attempt.submittedAt,
      record.attempt.responseTimeMs ?? null,
      record.schemaVersion,
      payload,
    );
  }

  private async upsertAnalysisSession(
    database: SQLiteDatabase,
    session: GuidedAnalysisSession,
    allowSchemaMigration = false,
  ): Promise<void> {
    const payload = canonicalStringify(session);
    const existing = await database.getFirstAsync<{ payload_json: string; status: string }>(
      'SELECT payload_json, status FROM analysis_sessions WHERE session_id = ?',
      session.sessionId,
    );
    if (existing?.payload_json === payload) return;
    if (existing?.status === 'finalized' && !allowSchemaMigration) {
      throw new AnalysisSessionConflictError(
        session.sessionId,
        'Finalized SQLite analysis session is immutable.',
      );
    }
    await database.runAsync(
      `INSERT INTO analysis_sessions (
        session_id, exercise_id, content_version, exercise_schema_version, chart_id,
        source_kind, generator_version, historical_scenario_id, historical_scenario_version,
        historical_dataset_id, historical_dataset_version, historical_dataset_checksum,
        historical_learning_credit, status, created_at, updated_at, attempt_id, schema_version,
        payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at,
        attempt_id = excluded.attempt_id,
        schema_version = excluded.schema_version,
        payload_json = excluded.payload_json`,
      session.sessionId,
      session.exerciseId,
      session.contentVersionId,
      session.exerciseSchemaVersion,
      session.chart.id,
      session.chart.kind,
      session.chart.kind === 'synthetic' ? session.chart.generatorVersion : null,
      session.chart.kind === 'historical' ? session.chart.scenarioId : null,
      session.chart.kind === 'historical' ? session.chart.scenarioVersion : null,
      session.chart.kind === 'historical' ? session.chart.datasetId : null,
      session.chart.kind === 'historical' ? session.chart.datasetVersion : null,
      session.chart.kind === 'historical' ? session.chart.canonicalChecksum : null,
      session.chart.kind === 'historical' ? session.chart.learningCredit : null,
      session.status,
      session.createdAt,
      session.updatedAt,
      session.attemptId ?? null,
      session.schemaVersion,
      payload,
    );
  }

  public async transact<T>(
    mutation: (currentValue: string | null) => PersistenceMutation<T>,
  ): Promise<T> {
    await this.initialize();
    const database = this.database;
    if (!database) throw new Error('SQLite database was not initialized.');
    let operationResult!: T;
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync<{ payload_json: string }>(
        'SELECT payload_json FROM repository_state WHERE singleton_id = 1',
      );
      const currentValue = row?.payload_json ?? null;
      const next = mutation(currentValue);
      const nextAttempts = byId(extractAttempts(next.nextValue));
      const nextSessions = sessionsById(extractAnalysisSessions(next.nextValue));

      // An explicit learner-authorized reset must be able to recover even when
      // the previous snapshot is too corrupt to parse. Normal writes retain the
      // append-only comparison and fail closed.
      if (next.allowAttemptDeletion !== true) {
        const previousAttempts = byId(extractAttempts(currentValue));
        const removed = [...previousAttempts.keys()].filter((id) => !nextAttempts.has(id));
        if (removed.length > 0) {
          throw new Error('Attempt deletion is only allowed through repository reset.');
        }
        for (const [id, previous] of previousAttempts) {
          const following = nextAttempts.get(id);
          if (following && canonicalStringify(previous) !== canonicalStringify(following)) {
            throw new AttemptConflictError(id);
          }
        }
      }

      if (
        next.allowAnalysisSessionDeletion !== true &&
        next.allowAnalysisSessionMigration !== true
      ) {
        const previousSessions = sessionsById(extractAnalysisSessions(currentValue));
        const removed = [...previousSessions.keys()].filter((id) => !nextSessions.has(id));
        if (removed.length > 0) {
          throw new Error('Analysis session deletion requires an explicit repository operation.');
        }
        for (const [id, previous] of previousSessions) {
          const following = nextSessions.get(id);
          if (
            following &&
            previous.status === 'finalized' &&
            canonicalStringify(previous) !== canonicalStringify(following)
          ) {
            throw new AnalysisSessionConflictError(id, 'Finalized analysis session is immutable.');
          }
        }
      }

      if (next.allowAttemptDeletion === true) {
        await transaction.execAsync(`
          DROP TRIGGER IF EXISTS attempts_reject_update;
          DROP TRIGGER IF EXISTS attempts_reject_delete;
          DELETE FROM attempts;
          ${CREATE_IMMUTABILITY_TRIGGERS}
        `);
      }
      if (next.allowAnalysisSessionDeletion === true) {
        await transaction.execAsync(`
          DROP TRIGGER IF EXISTS analysis_sessions_reject_finalized_update;
          DROP TRIGGER IF EXISTS analysis_sessions_reject_delete;
          DELETE FROM analysis_sessions;
          ${CREATE_ANALYSIS_SESSION_TRIGGERS}
        `);
      }
      if (
        next.allowAnalysisSessionMigration === true &&
        next.allowAnalysisSessionDeletion !== true
      ) {
        await transaction.execAsync(`
          DROP TRIGGER IF EXISTS analysis_sessions_reject_finalized_update;
          DROP TRIGGER IF EXISTS analysis_sessions_reject_delete;
          DELETE FROM analysis_sessions;
          ${CREATE_ANALYSIS_SESSION_TRIGGERS}
        `);
      }
      for (const record of nextAttempts.values()) await this.insertAttempt(transaction, record);
      for (const session of nextSessions.values()) {
        await this.upsertAnalysisSession(
          transaction,
          session,
          next.allowAnalysisSessionMigration === true,
        );
      }

      if (next.nextValue === null) {
        await transaction.runAsync('DELETE FROM repository_state WHERE singleton_id = 1');
      } else {
        await transaction.runAsync(
          `INSERT INTO repository_state (singleton_id, payload_json, updated_at)
           VALUES (1, ?, ?)
           ON CONFLICT(singleton_id) DO UPDATE SET
             payload_json = excluded.payload_json,
             updated_at = excluded.updated_at`,
          next.nextValue,
          extractUpdatedAt(next.nextValue),
        );
      }
      operationResult = next.result;
    });
    return operationResult;
  }

  public async clear(): Promise<void> {
    await this.transact(() => ({
      nextValue: null,
      result: undefined,
      allowAttemptDeletion: true,
      allowAnalysisSessionDeletion: true,
    }));
  }

  public async close(): Promise<void> {
    await this.database?.closeAsync();
    this.database = undefined;
    this.initialization = undefined;
  }
}

export function createSQLitePersistenceAdapter(
  options: SQLiteAdapterOptions = {},
): SQLitePersistenceAdapter {
  return new SQLitePersistenceAdapter(options);
}
