import { openDatabaseAsync } from 'expo-sqlite';

import { LearningRepository } from './repository';
import { SQLitePersistenceAdapter } from './sqlite-adapter';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

interface FakeDatabase {
  execAsync(sql: string): Promise<void>;
  getFirstAsync(sql: string): Promise<unknown>;
  runAsync(sql: string, ...parameters: unknown[]): Promise<unknown>;
  withExclusiveTransactionAsync(
    operation: (transaction: FakeDatabase) => Promise<void>,
  ): Promise<void>;
}

describe('SQLitePersistenceAdapter recovery', () => {
  it('lets an explicit repository reset replace a corrupt payload and clear attempts', async () => {
    let repositoryPayload = '{broken-json';
    const executed: string[] = [];
    const database: FakeDatabase = {
      execAsync: jest.fn(async (sql: string) => {
        executed.push(sql);
      }),
      getFirstAsync: jest.fn(async (sql: string) => {
        if (sql.includes('schema_migrations')) return null;
        if (sql.includes('repository_state')) return { payload_json: repositoryPayload };
        return null;
      }),
      runAsync: jest.fn(async (sql: string, ...parameters: unknown[]) => {
        executed.push(sql);
        if (sql.includes('INSERT INTO repository_state')) {
          repositoryPayload = String(parameters[0]);
        }
        if (sql.includes('DELETE FROM repository_state')) repositoryPayload = '';
        return {};
      }),
      withExclusiveTransactionAsync: jest.fn(
        async (operation: (transaction: FakeDatabase) => Promise<void>): Promise<void> =>
          operation(database),
      ),
    };
    jest.mocked(openDatabaseAsync).mockResolvedValue(database as never);
    const repository = new LearningRepository(new SQLitePersistenceAdapter(), {
      contentVersion: 'catalog-recovery',
      now: () => '2026-08-23T12:00:00.000Z',
    });

    const recovered = await repository.reset();

    expect(recovered.attempts).toEqual([]);
    expect(recovered.metadata.contentVersion).toBe('catalog-recovery');
    expect(repositoryPayload).not.toBe('{broken-json');
    expect(executed.some((sql) => sql.includes('DELETE FROM attempts'))).toBe(true);
    expect(
      executed.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS analysis_sessions')),
    ).toBe(true);
    expect(executed.some((sql) => sql.includes('DELETE FROM analysis_sessions'))).toBe(true);
  });

  it('mirrors a canonical active session through the versioned SQLite table', async () => {
    let repositoryPayload: string | null = null;
    const executed: { readonly sql: string; readonly parameters: readonly unknown[] }[] = [];
    const database: FakeDatabase = {
      execAsync: jest.fn(async (sql: string) => {
        executed.push({ sql, parameters: [] });
      }),
      getFirstAsync: jest.fn(async (sql: string) => {
        if (sql.includes('schema_migrations')) return null;
        if (sql.includes('repository_state')) {
          return repositoryPayload === null ? null : { payload_json: repositoryPayload };
        }
        if (sql.includes('analysis_sessions')) return null;
        return null;
      }),
      runAsync: jest.fn(async (sql: string, ...parameters: unknown[]) => {
        executed.push({ sql, parameters });
        if (sql.includes('INSERT INTO repository_state')) {
          repositoryPayload = String(parameters[0]);
        }
        return {};
      }),
      withExclusiveTransactionAsync: jest.fn(
        async (operation: (transaction: FakeDatabase) => Promise<void>): Promise<void> =>
          operation(database),
      ),
    };
    jest.mocked(openDatabaseAsync).mockResolvedValue(database as never);
    const adapter = new SQLitePersistenceAdapter({ databaseName: 'analysis-session-test.db' });
    const session = {
      schemaVersion: 2,
      revision: 0,
      sessionId: 'sqlite-analysis-1',
      attemptId: 'sqlite-attempt-1',
      finalizationIdempotencyKey: 'sqlite-finalization-1',
      exerciseId: 'u10-capstone-e03',
      contentVersionId: 'catalog-1',
      exerciseSchemaVersion: 1,
      chart: {
        kind: 'synthetic',
        id: 'capstone-chart',
        seed: 91003,
        generatorVersion: '1.0.0',
        candleCount: 96,
        decisionCandleIndex: 71,
      },
      status: 'active',
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
      replay: {
        initialCursorCandleIndex: 0,
        cursorCandleIndex: 23,
        maxCursorSeenCandleIndex: 23,
        decisionCandleIndex: 71,
        checkpoints: [],
      },
    };
    const nextValue = JSON.stringify({
      metadata: {
        schemaVersion: 4,
        contentVersion: 'catalog-1',
        projectorVersion: 1,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      attempts: [],
      analysisSessions: [session],
    });

    await adapter.transact(() => ({ nextValue, result: undefined }));

    const mirrored = executed.find(
      (entry) => entry.parameters.length > 0 && entry.sql.includes('INSERT INTO analysis_sessions'),
    );
    expect(mirrored).toBeTruthy();
    expect(mirrored?.parameters[0]).toBe('sqlite-analysis-1');
    expect(mirrored?.parameters[5]).toBe('synthetic');
    expect(mirrored?.parameters[13]).toBe('active');
    const historicalMigration = executed.find((entry) =>
      entry.sql.includes('ALTER TABLE analysis_sessions RENAME TO analysis_sessions_v2'),
    );
    expect(historicalMigration?.sql).toContain('source_kind TEXT NOT NULL');
    expect(historicalMigration?.sql).toContain('generator_version TEXT,');
    expect(historicalMigration?.sql).toContain('historical_scenario_id TEXT');
    expect(historicalMigration?.sql).toContain('historical_dataset_checksum TEXT');
    expect(historicalMigration?.sql).toContain('analysis_sessions_reject_finalized_update');
    expect(repositoryPayload).toBe(nextValue);
  });

  it('mirrors pinned historical identity fields without a synthetic generator', async () => {
    let repositoryPayload: string | null = null;
    const executed: { readonly sql: string; readonly parameters: readonly unknown[] }[] = [];
    const database: FakeDatabase = {
      execAsync: jest.fn(async (sql: string) => {
        executed.push({ sql, parameters: [] });
      }),
      getFirstAsync: jest.fn(async (sql: string) => {
        if (sql.includes('schema_migrations')) return null;
        if (sql.includes('repository_state')) {
          return repositoryPayload === null ? null : { payload_json: repositoryPayload };
        }
        return null;
      }),
      runAsync: jest.fn(async (sql: string, ...parameters: unknown[]) => {
        executed.push({ sql, parameters });
        if (sql.includes('INSERT INTO repository_state')) {
          repositoryPayload = String(parameters[0]);
        }
        return {};
      }),
      withExclusiveTransactionAsync: jest.fn(
        async (operation: (transaction: FakeDatabase) => Promise<void>): Promise<void> =>
          operation(database),
      ),
    };
    jest.mocked(openDatabaseAsync).mockResolvedValue(database as never);
    const adapter = new SQLitePersistenceAdapter({ databaseName: 'historical-session-test.db' });
    const checksum = `sha256:${'a'.repeat(64)}`;
    const session = {
      sessionId: 'historical-session-1',
      exerciseId: 'historical-exercise-1',
      contentVersionId: 'catalog-1',
      exerciseSchemaVersion: 1,
      chart: {
        kind: 'historical',
        id: 'historical-chart-1',
        scenarioId: 'scenario-1',
        scenarioVersion: '2.0.0',
        datasetId: 'dataset-1',
        datasetVersion: '2026-08',
        canonicalChecksum: checksum,
        learningCredit: 'none',
      },
      status: 'active',
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
      attemptId: 'historical-attempt-1',
      schemaVersion: 2,
    };
    const nextValue = JSON.stringify({
      metadata: {
        schemaVersion: 4,
        updatedAt: session.updatedAt,
      },
      attempts: [],
      analysisSessions: [session],
    });

    await adapter.transact(() => ({ nextValue, result: undefined }));

    const mirrored = executed.find(
      (entry) => entry.parameters.length > 0 && entry.sql.includes('INSERT INTO analysis_sessions'),
    );
    expect(mirrored?.parameters[5]).toBe('historical');
    expect(mirrored?.parameters[6]).toBe(null);
    expect(mirrored?.parameters[7]).toBe('scenario-1');
    expect(mirrored?.parameters[8]).toBe('2.0.0');
    expect(mirrored?.parameters[9]).toBe('dataset-1');
    expect(mirrored?.parameters[10]).toBe('2026-08');
    expect(mirrored?.parameters[11]).toBe(checksum);
    expect(mirrored?.parameters[12]).toBe('none');
  });

  it('narrowly permits the v3-to-v4 rewrite of a finalized session mirror', async () => {
    const legacySession = {
      sessionId: 'legacy-finalized-session',
      exerciseId: 'legacy-exercise',
      contentVersionId: 'catalog-1',
      exerciseSchemaVersion: 1,
      chart: {
        id: 'legacy-chart',
        seed: 7,
        generatorVersion: '1.0.0',
        candleCount: 20,
        decisionCandleIndex: 15,
      },
      status: 'finalized',
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:30:00.000Z',
      attemptId: 'legacy-attempt',
      schemaVersion: 1,
    };
    const migratedSession = {
      ...legacySession,
      schemaVersion: 2,
      chart: { ...legacySession.chart, kind: 'synthetic' },
    };
    const currentValue = JSON.stringify({
      metadata: { schemaVersion: 3, updatedAt: legacySession.updatedAt },
      attempts: [],
      analysisSessions: [legacySession],
    });
    const nextValue = JSON.stringify({
      metadata: { schemaVersion: 4, updatedAt: legacySession.updatedAt },
      attempts: [],
      analysisSessions: [migratedSession],
    });
    const executed: string[] = [];
    const database: FakeDatabase = {
      execAsync: jest.fn(async (sql: string) => {
        executed.push(sql);
      }),
      getFirstAsync: jest.fn(async (sql: string) => {
        if (sql.includes('schema_migrations')) return null;
        if (sql.includes('repository_state')) return { payload_json: currentValue };
        if (sql.includes('analysis_sessions')) {
          return { payload_json: JSON.stringify(legacySession), status: 'finalized' };
        }
        return null;
      }),
      runAsync: jest.fn(async (sql: string) => {
        executed.push(sql);
        return {};
      }),
      withExclusiveTransactionAsync: jest.fn(
        async (operation: (transaction: FakeDatabase) => Promise<void>): Promise<void> =>
          operation(database),
      ),
    };
    jest.mocked(openDatabaseAsync).mockResolvedValue(database as never);
    const adapter = new SQLitePersistenceAdapter({ databaseName: 'session-migration-test.db' });

    await adapter.transact(() => ({
      nextValue,
      result: undefined,
      allowAnalysisSessionMigration: true,
    }));

    expect(executed.some((sql) => sql.includes('DELETE FROM analysis_sessions'))).toBe(true);
    expect(executed.some((sql) => sql.includes('INSERT INTO analysis_sessions'))).toBe(true);
  });
});
