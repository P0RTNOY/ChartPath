import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import {
  AnalysisSessionConflictError,
  AttemptConflictError,
  PaperExecutionSessionConflictError,
  ManagementJournalConflictError,
  PersistenceCorruptionError,
  PositionManagementSessionConflictError,
  type PersistenceAdapter,
  type PersistenceMutation,
} from './adapter';
import type {
  GuidedAnalysisSession,
  PaperExecutionSession,
  PositionManagementJournalEntry,
  PositionManagementSession,
} from '@chartpath/domain';
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

const CREATE_PAPER_EXECUTION_SESSION_TRIGGERS = `
  CREATE TRIGGER IF NOT EXISTS paper_execution_sessions_reject_terminal_update
  BEFORE UPDATE ON paper_execution_sessions
  WHEN OLD.status IN ('closed', 'ambiguous', 'cancelled', 'rejected', 'completed')
    AND OLD.payload_json <> NEW.payload_json BEGIN
    SELECT RAISE(ABORT, 'terminal paper execution sessions are immutable');
  END;
  CREATE TRIGGER IF NOT EXISTS paper_execution_sessions_reject_delete
  BEFORE DELETE ON paper_execution_sessions BEGIN
    SELECT RAISE(ABORT, 'paper execution sessions require explicit deletion');
  END;
`;

const CREATE_PAPER_EXECUTION_SESSIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS paper_execution_sessions (
    session_id TEXT PRIMARY KEY NOT NULL,
    analysis_session_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    scenario_version TEXT NOT NULL,
    dataset_id TEXT NOT NULL,
    dataset_version TEXT NOT NULL,
    dataset_checksum TEXT NOT NULL,
    execution_policy_version TEXT NOT NULL,
    cost_model_version TEXT NOT NULL,
    learning_credit TEXT NOT NULL CHECK (learning_credit IN ('course', 'none')),
    status TEXT NOT NULL,
    last_processed_candle_index INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    payload_json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS paper_execution_sessions_status_updated_idx
    ON paper_execution_sessions(status, updated_at);
  CREATE INDEX IF NOT EXISTS paper_execution_sessions_analysis_idx
    ON paper_execution_sessions(analysis_session_id);
  ${CREATE_PAPER_EXECUTION_SESSION_TRIGGERS}
`;

const CREATE_POSITION_MANAGEMENT_TRIGGERS = `
  CREATE TRIGGER IF NOT EXISTS position_management_sessions_reject_terminal_update
  BEFORE UPDATE ON position_management_sessions
  WHEN OLD.status IN (
    'closed-voluntary', 'closed-stop', 'closed-target', 'ambiguous', 'completed-open'
  ) BEGIN
    SELECT RAISE(ABORT, 'terminal position management sessions are immutable');
  END;
  CREATE TRIGGER IF NOT EXISTS position_management_sessions_reject_delete
  BEFORE DELETE ON position_management_sessions BEGIN
    SELECT RAISE(ABORT, 'position management sessions require explicit deletion');
  END;
`;

const CREATE_MANAGEMENT_JOURNAL_TRIGGERS = `
  CREATE TRIGGER IF NOT EXISTS management_journal_entries_reject_update
  BEFORE UPDATE ON management_journal_entries BEGIN
    SELECT RAISE(ABORT, 'management journal entries are append-only');
  END;
  CREATE TRIGGER IF NOT EXISTS management_journal_entries_reject_delete
  BEFORE DELETE ON management_journal_entries BEGIN
    SELECT RAISE(ABORT, 'management journal entries are append-only');
  END;
`;

const CREATE_POSITION_MANAGEMENT_SCHEMA = `
  CREATE TABLE IF NOT EXISTS position_management_sessions (
    session_id TEXT PRIMARY KEY NOT NULL,
    paper_execution_session_id TEXT NOT NULL UNIQUE,
    analysis_session_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    scenario_version TEXT NOT NULL,
    dataset_id TEXT NOT NULL,
    dataset_version TEXT NOT NULL,
    dataset_checksum TEXT NOT NULL,
    decision_candle_index INTEGER NOT NULL,
    handoff_candle_index INTEGER NOT NULL,
    paper_execution_revision INTEGER NOT NULL,
    execution_policy_version TEXT NOT NULL,
    cost_model_version TEXT NOT NULL,
    management_policy_version TEXT NOT NULL,
    permission_version TEXT NOT NULL,
    permitted_action_kinds_json TEXT NOT NULL,
    risk_limits_json TEXT NOT NULL,
    rubric_id TEXT NOT NULL,
    rubric_version TEXT NOT NULL,
    rubric_checksum TEXT NOT NULL,
    rubric_json TEXT NOT NULL,
    learning_credit TEXT NOT NULL CHECK (learning_credit IN ('course', 'none')),
    status TEXT NOT NULL,
    revision INTEGER NOT NULL,
    original_risk_minor INTEGER NOT NULL,
    initial_quantity_units INTEGER NOT NULL,
    open_quantity_units INTEGER NOT NULL,
    last_processed_candle_index INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    payload_json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS position_management_sessions_status_updated_idx
    ON position_management_sessions(status, updated_at);
  CREATE INDEX IF NOT EXISTS position_management_sessions_paper_idx
    ON position_management_sessions(paper_execution_session_id);
  CREATE TABLE IF NOT EXISTS management_journal_entries (
    entry_id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('observation', 'action-rationale', 'correction')),
    corrects_entry_id TEXT,
    related_action_id TEXT,
    submission_order INTEGER,
    candle_index INTEGER,
    candle_timestamp TEXT NOT NULL,
    evidence_tags_json TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    UNIQUE (session_id, sequence)
  );
  CREATE INDEX IF NOT EXISTS management_journal_entries_session_sequence_idx
    ON management_journal_entries(session_id, sequence);
  ${CREATE_POSITION_MANAGEMENT_TRIGGERS}
  ${CREATE_MANAGEMENT_JOURNAL_TRIGGERS}
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
  {
    version: 4,
    name: 'create_paper_execution_sessions',
    checksum: 'sha256:69b340db961bc3b8e26e8e70544ae5dbe62cb5f0b9e72a9f83ab6ea715e64016',
    appliedAt: '2026-08-24T00:00:00.000Z',
    sql: CREATE_PAPER_EXECUTION_SESSIONS_SCHEMA,
  },
  {
    version: 5,
    name: 'create_position_management_and_journal',
    checksum: 'sha256:ddfdc6589ba3ea48862156293c60bb904a3a781fd4c3a73400a193fd1d25eb8a',
    appliedAt: '2026-08-25T00:00:00.000Z',
    sql: CREATE_POSITION_MANAGEMENT_SCHEMA,
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

function extractPaperExecutionSessions(
  serialized: string | null,
): readonly PaperExecutionSession[] {
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
  if ([1, 2, 3, 4].includes(Number(schemaVersion))) return [];
  if (!Array.isArray(parsed.paperExecutionSessions)) {
    throw new PersistenceCorruptionError(
      'SQLite repository state has no paper execution sessions.',
    );
  }
  for (const session of parsed.paperExecutionSessions) {
    if (!isObject(session) || typeof session.sessionId !== 'string') {
      throw new PersistenceCorruptionError(
        'SQLite repository state has an invalid paper execution session.',
      );
    }
  }
  return parsed.paperExecutionSessions as unknown as readonly PaperExecutionSession[];
}

function paperExecutionSessionsById(
  sessions: readonly PaperExecutionSession[],
): ReadonlyMap<string, PaperExecutionSession> {
  return new Map(sessions.map((session) => [session.sessionId, session]));
}

function extractPositionManagementSessions(
  serialized: string | null,
): readonly PositionManagementSession[] {
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
  if ([1, 2, 3, 4, 5].includes(Number(schemaVersion))) {
    for (const field of [
      'positionManagementSessions',
      'quarantinedPositionManagementSessions',
    ] as const) {
      const records = parsed[field];
      if (records !== undefined && (!Array.isArray(records) || records.length > 0)) {
        throw new PersistenceCorruptionError(
          `Legacy SQLite repository payload contains unsupported ${field}.`,
        );
      }
    }
    return [];
  }
  if (!Array.isArray(parsed.positionManagementSessions)) {
    throw new PersistenceCorruptionError(
      'SQLite repository state has no position management sessions.',
    );
  }
  for (const session of parsed.positionManagementSessions) {
    if (
      !isObject(session) ||
      typeof session.sessionId !== 'string' ||
      !isObject(session.handoff) ||
      typeof session.handoff.sessionId !== 'string'
    ) {
      throw new PersistenceCorruptionError(
        'SQLite repository state has an invalid position management session.',
      );
    }
  }
  return parsed.positionManagementSessions as unknown as readonly PositionManagementSession[];
}

function positionManagementSessionsById(
  sessions: readonly PositionManagementSession[],
): ReadonlyMap<string, PositionManagementSession> {
  return new Map(sessions.map((session) => [session.sessionId, session]));
}

interface ManagementJournalMirrorEntry {
  readonly sessionId: string;
  readonly sequence: number;
  readonly schemaVersion: number;
  readonly entry: PositionManagementJournalEntry;
}

function managementJournalEntries(
  sessions: readonly PositionManagementSession[],
): readonly ManagementJournalMirrorEntry[] {
  return sessions.flatMap((session) =>
    session.journal.map((entry) => ({
      sessionId: session.sessionId,
      sequence: entry.entryOrder,
      schemaVersion: session.schemaVersion,
      entry,
    })),
  );
}

function managementJournalEntriesById(
  entries: readonly ManagementJournalMirrorEntry[],
): ReadonlyMap<string, ManagementJournalMirrorEntry> {
  return new Map(entries.map((entry) => [entry.entry.entryId, entry]));
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

function extractPayloadSchemaVersion(serialized: string | null): number | null {
  if (serialized === null) return null;
  const parsed = JSON.parse(serialized) as unknown;
  if (!isObject(parsed)) return null;
  const version = isObject(parsed.metadata) ? parsed.metadata.schemaVersion : parsed.schemaVersion;
  return typeof version === 'number' && Number.isInteger(version) ? version : null;
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

  private async upsertPaperExecutionSession(
    database: SQLiteDatabase,
    session: PaperExecutionSession,
    allowSchemaMigration = false,
  ): Promise<void> {
    const payload = canonicalStringify(session);
    const existing = await database.getFirstAsync<{ payload_json: string; status: string }>(
      'SELECT payload_json, status FROM paper_execution_sessions WHERE session_id = ?',
      session.sessionId,
    );
    if (existing?.payload_json === payload) return;
    if (
      existing &&
      ['closed', 'ambiguous', 'cancelled', 'rejected', 'completed'].includes(existing.status) &&
      !allowSchemaMigration
    ) {
      throw new PaperExecutionSessionConflictError(
        session.sessionId,
        'Terminal SQLite paper execution session is immutable.',
      );
    }
    await database.runAsync(
      `INSERT INTO paper_execution_sessions (
        session_id, analysis_session_id, scenario_id, scenario_version, dataset_id,
        dataset_version, dataset_checksum, execution_policy_version, cost_model_version,
        learning_credit, status, last_processed_candle_index, created_at, updated_at,
        schema_version, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        status = excluded.status,
        last_processed_candle_index = excluded.last_processed_candle_index,
        updated_at = excluded.updated_at,
        schema_version = excluded.schema_version,
        payload_json = excluded.payload_json`,
      session.sessionId,
      session.source.analysisSessionId,
      session.source.scenarioId,
      session.source.scenarioVersion,
      session.source.datasetId,
      session.source.datasetVersion,
      session.source.canonicalChecksum,
      session.executionPolicy.version,
      session.costModel.version,
      session.source.learningCredit,
      session.status,
      session.lastProcessedCandleIndex,
      session.createdAt,
      session.updatedAt,
      session.schemaVersion,
      payload,
    );
  }

  private async upsertPositionManagementSession(
    database: SQLiteDatabase,
    session: PositionManagementSession,
    allowSchemaMigration = false,
  ): Promise<void> {
    const payload = canonicalStringify(session);
    const existing = await database.getFirstAsync<{ payload_json: string; status: string }>(
      'SELECT payload_json, status FROM position_management_sessions WHERE session_id = ?',
      session.sessionId,
    );
    if (existing?.payload_json === payload) return;
    if (existing && existing.status !== 'active' && !allowSchemaMigration) {
      throw new PositionManagementSessionConflictError(
        session.sessionId,
        'Terminal SQLite position management session is immutable.',
      );
    }
    await database.runAsync(
      `INSERT INTO position_management_sessions (
        session_id, paper_execution_session_id, analysis_session_id, scenario_id,
        scenario_version, dataset_id, dataset_version, dataset_checksum,
        decision_candle_index, handoff_candle_index, paper_execution_revision,
        execution_policy_version, cost_model_version, management_policy_version,
        permission_version, permitted_action_kinds_json, risk_limits_json, rubric_id,
        rubric_version, rubric_checksum, rubric_json, learning_credit, status, revision, original_risk_minor,
        initial_quantity_units, open_quantity_units, last_processed_candle_index,
        created_at, updated_at, schema_version, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        status = excluded.status,
        revision = excluded.revision,
        open_quantity_units = excluded.open_quantity_units,
        last_processed_candle_index = excluded.last_processed_candle_index,
        updated_at = excluded.updated_at,
        schema_version = excluded.schema_version,
        payload_json = excluded.payload_json`,
      session.sessionId,
      session.handoff.sessionId,
      session.source.analysisSessionId,
      session.source.scenarioId,
      session.source.scenarioVersion,
      session.source.datasetId,
      session.source.datasetVersion,
      session.source.canonicalChecksum,
      session.source.decisionCandleIndex,
      session.handoff.lastProcessedCandleIndex,
      session.handoff.revision,
      session.handoff.executionPolicy.version,
      session.costModel.version,
      session.policy.version,
      session.authority.permissionVersion,
      canonicalStringify(session.authority.permittedActionKinds),
      canonicalStringify(session.authority.riskLimits),
      session.authority.rubricId,
      session.authority.rubricVersion,
      session.authority.rubricChecksum,
      canonicalStringify(session.authority.rubric),
      session.source.learningCredit,
      session.status,
      session.revision,
      session.originalRiskMinor,
      session.initialQuantityUnits,
      session.openQuantityUnits,
      session.lastProcessedCandleIndex,
      session.createdAt,
      session.updatedAt,
      session.schemaVersion,
      payload,
    );
  }

  private async insertManagementJournalEntry(
    database: SQLiteDatabase,
    record: ManagementJournalMirrorEntry,
  ): Promise<void> {
    const payload = canonicalStringify(record.entry);
    const existing = await database.getFirstAsync<{
      payload_json: string;
      session_id: string;
      sequence: number;
    }>(
      'SELECT payload_json, session_id, sequence FROM management_journal_entries WHERE entry_id = ?',
      record.entry.entryId,
    );
    if (existing) {
      if (
        existing.payload_json !== payload ||
        existing.session_id !== record.sessionId ||
        existing.sequence !== record.sequence
      ) {
        throw new ManagementJournalConflictError(record.entry.entryId);
      }
      return;
    }
    const sequenceConflict = await database.getFirstAsync<{ entry_id: string }>(
      'SELECT entry_id FROM management_journal_entries WHERE session_id = ? AND sequence = ?',
      record.sessionId,
      record.sequence,
    );
    if (sequenceConflict) throw new ManagementJournalConflictError(record.entry.entryId);
    await database.runAsync(
      `INSERT INTO management_journal_entries (
        entry_id, session_id, sequence, kind, corrects_entry_id, related_action_id,
        submission_order, candle_index, candle_timestamp, evidence_tags_json, recorded_at, schema_version,
        payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.entry.entryId,
      record.sessionId,
      record.sequence,
      record.entry.kind,
      record.entry.kind === 'correction' ? record.entry.correctsEntryId : null,
      record.entry.kind === 'action-rationale' ? record.entry.relatedActionId : null,
      record.entry.kind === 'action-rationale' ? record.entry.submissionOrder : null,
      record.entry.candleIndex,
      record.entry.candleTimestamp,
      canonicalStringify(record.entry.evidenceTags),
      record.entry.recordedAt,
      record.schemaVersion,
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
      const nextPaperExecutions = paperExecutionSessionsById(
        extractPaperExecutionSessions(next.nextValue),
      );
      const nextManagementSessions = positionManagementSessionsById(
        extractPositionManagementSessions(next.nextValue),
      );
      const nextJournalEntries = managementJournalEntriesById(
        managementJournalEntries([...nextManagementSessions.values()]),
      );

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

      if (
        next.allowPaperExecutionSessionDeletion !== true &&
        next.allowPaperExecutionSessionMigration !== true
      ) {
        const previousPaperExecutions = paperExecutionSessionsById(
          extractPaperExecutionSessions(currentValue),
        );
        const removed = [...previousPaperExecutions.keys()].filter(
          (id) => !nextPaperExecutions.has(id),
        );
        if (removed.length > 0) {
          throw new Error(
            'Paper execution session deletion requires an explicit repository operation.',
          );
        }
        for (const [id, previous] of previousPaperExecutions) {
          const following = nextPaperExecutions.get(id);
          const managementClaimsPaper = [...nextManagementSessions.values()].some(
            ({ handoff }) => handoff.sessionId === id,
          );
          if (
            following &&
            managementClaimsPaper &&
            canonicalStringify(previous) !== canonicalStringify(following)
          ) {
            throw new PaperExecutionSessionConflictError(
              id,
              'Paper execution is frozen after its open position enters management.',
            );
          }
          if (
            following &&
            ['closed', 'ambiguous', 'cancelled', 'rejected', 'completed'].includes(
              previous.status,
            ) &&
            canonicalStringify(previous) !== canonicalStringify(following)
          ) {
            throw new PaperExecutionSessionConflictError(
              id,
              'Terminal paper execution session is immutable.',
            );
          }
        }
      }

      if (
        next.allowPositionManagementSessionDeletion !== true &&
        next.allowPositionManagementSessionMigration !== true
      ) {
        const previousManagement = positionManagementSessionsById(
          extractPositionManagementSessions(currentValue),
        );
        const removed = [...previousManagement.keys()].filter(
          (id) => !nextManagementSessions.has(id),
        );
        if (removed.length > 0) {
          throw new Error(
            'Position management session deletion requires an explicit repository operation.',
          );
        }
        for (const [id, previous] of previousManagement) {
          const following = nextManagementSessions.get(id);
          if (
            following &&
            previous.status !== 'active' &&
            canonicalStringify(previous) !== canonicalStringify(following)
          ) {
            throw new PositionManagementSessionConflictError(
              id,
              'Terminal position management session is immutable.',
            );
          }
        }
      }

      if (
        next.allowManagementJournalDeletion !== true &&
        next.allowManagementJournalMigration !== true
      ) {
        const previousJournal = managementJournalEntriesById(
          managementJournalEntries(extractPositionManagementSessions(currentValue)),
        );
        const removed = [...previousJournal.keys()].filter((id) => !nextJournalEntries.has(id));
        if (removed.length > 0) {
          throw new Error('Management journal entries are append-only.');
        }
        for (const [id, previous] of previousJournal) {
          const following = nextJournalEntries.get(id);
          if (following && canonicalStringify(previous) !== canonicalStringify(following)) {
            throw new ManagementJournalConflictError(id);
          }
        }
      }

      if (
        next.allowPositionManagementSessionDeletion !== true ||
        next.allowManagementJournalDeletion !== true
      ) {
        const currentPayloadSchemaVersion = extractPayloadSchemaVersion(currentValue);
        if (currentPayloadSchemaVersion !== null && currentPayloadSchemaVersion <= 5) {
          const mirrors = await transaction.getFirstAsync<{
            management_count: number;
            journal_count: number;
          }>(`
            SELECT
              (SELECT COUNT(*) FROM position_management_sessions) AS management_count,
              (SELECT COUNT(*) FROM management_journal_entries) AS journal_count
          `);
          if (
            ((mirrors?.management_count ?? 0) > 0 &&
              next.allowPositionManagementSessionDeletion !== true) ||
            ((mirrors?.journal_count ?? 0) > 0 && next.allowManagementJournalDeletion !== true)
          ) {
            throw new PersistenceCorruptionError(
              'Legacy repository payload conflicts with Milestone 6 SQLite mirrors.',
            );
          }
        }
      }

      if (next.allowManagementJournalDeletion === true) {
        await transaction.execAsync(`
          DROP TRIGGER IF EXISTS management_journal_entries_reject_update;
          DROP TRIGGER IF EXISTS management_journal_entries_reject_delete;
          DELETE FROM management_journal_entries;
          ${CREATE_MANAGEMENT_JOURNAL_TRIGGERS}
        `);
      }
      if (
        next.allowManagementJournalMigration === true &&
        next.allowManagementJournalDeletion !== true
      ) {
        await transaction.execAsync(`
          DROP TRIGGER IF EXISTS management_journal_entries_reject_update;
          DROP TRIGGER IF EXISTS management_journal_entries_reject_delete;
          DELETE FROM management_journal_entries;
          ${CREATE_MANAGEMENT_JOURNAL_TRIGGERS}
        `);
      }
      if (next.allowPositionManagementSessionDeletion === true) {
        await transaction.execAsync(`
          DROP TRIGGER IF EXISTS position_management_sessions_reject_terminal_update;
          DROP TRIGGER IF EXISTS position_management_sessions_reject_delete;
          DELETE FROM position_management_sessions;
          ${CREATE_POSITION_MANAGEMENT_TRIGGERS}
        `);
      }
      if (
        next.allowPositionManagementSessionMigration === true &&
        next.allowPositionManagementSessionDeletion !== true
      ) {
        await transaction.execAsync(`
          DROP TRIGGER IF EXISTS position_management_sessions_reject_terminal_update;
          DROP TRIGGER IF EXISTS position_management_sessions_reject_delete;
          DELETE FROM position_management_sessions;
          ${CREATE_POSITION_MANAGEMENT_TRIGGERS}
        `);
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
      if (next.allowPaperExecutionSessionDeletion === true) {
        await transaction.execAsync(`
          DROP TRIGGER IF EXISTS paper_execution_sessions_reject_terminal_update;
          DROP TRIGGER IF EXISTS paper_execution_sessions_reject_delete;
          DELETE FROM paper_execution_sessions;
          ${CREATE_PAPER_EXECUTION_SESSION_TRIGGERS}
        `);
      }
      if (
        next.allowPaperExecutionSessionMigration === true &&
        next.allowPaperExecutionSessionDeletion !== true
      ) {
        await transaction.execAsync(`
          DROP TRIGGER IF EXISTS paper_execution_sessions_reject_terminal_update;
          DROP TRIGGER IF EXISTS paper_execution_sessions_reject_delete;
          DELETE FROM paper_execution_sessions;
          ${CREATE_PAPER_EXECUTION_SESSION_TRIGGERS}
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
      for (const session of nextPaperExecutions.values()) {
        await this.upsertPaperExecutionSession(
          transaction,
          session,
          next.allowPaperExecutionSessionMigration === true,
        );
      }
      for (const session of nextManagementSessions.values()) {
        await this.upsertPositionManagementSession(
          transaction,
          session,
          next.allowPositionManagementSessionMigration === true,
        );
      }
      for (const record of nextJournalEntries.values()) {
        await this.insertManagementJournalEntry(transaction, record);
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
      allowPaperExecutionSessionDeletion: true,
      allowPositionManagementSessionDeletion: true,
      allowManagementJournalDeletion: true,
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
