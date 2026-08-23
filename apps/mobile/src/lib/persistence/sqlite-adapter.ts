import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import {
  AttemptConflictError,
  PersistenceCorruptionError,
  type PersistenceAdapter,
  type PersistenceMutation,
} from './adapter';
import type { PersistedAttempt } from './types';
import { canonicalStringify, isObject } from './validation';

const DEFAULT_DATABASE_NAME = 'chartpath.db';
const MIGRATION_VERSION = 1;
const MIGRATION_NAME = 'create_local_learning_store';
const MIGRATION_CHECKSUM =
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
      const applied = await transaction.getFirstAsync<{ checksum: string }>(
        'SELECT checksum FROM schema_migrations WHERE version = ?',
        MIGRATION_VERSION,
      );
      if (applied && applied.checksum !== MIGRATION_CHECKSUM) {
        throw new PersistenceCorruptionError(
          `SQLite migration ${MIGRATION_VERSION} checksum does not match.`,
        );
      }
      if (!applied) {
        await transaction.execAsync(CREATE_SCHEMA);
        await transaction.runAsync(
          `INSERT INTO schema_migrations (version, name, checksum, applied_at)
           VALUES (?, ?, ?, ?)`,
          MIGRATION_VERSION,
          MIGRATION_NAME,
          MIGRATION_CHECKSUM,
          '2026-08-23T00:00:00.000Z',
        );
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
      const previousAttempts = byId(extractAttempts(currentValue));
      const nextAttempts = byId(extractAttempts(next.nextValue));

      const removed = [...previousAttempts.keys()].filter((id) => !nextAttempts.has(id));
      if (removed.length > 0 && next.allowAttemptDeletion !== true) {
        throw new Error('Attempt deletion is only allowed through repository reset.');
      }
      for (const [id, previous] of previousAttempts) {
        const following = nextAttempts.get(id);
        if (following && canonicalStringify(previous) !== canonicalStringify(following)) {
          throw new AttemptConflictError(id);
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
      for (const record of nextAttempts.values()) await this.insertAttempt(transaction, record);

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
