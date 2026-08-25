import { openDatabaseAsync } from 'expo-sqlite';

import { PersistenceCorruptionError } from './adapter';
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
    expect(executed.some((sql) => sql.includes('DELETE FROM paper_execution_sessions'))).toBe(true);
    expect(executed.some((sql) => sql.includes('DELETE FROM position_management_sessions'))).toBe(
      true,
    );
    expect(executed.some((sql) => sql.includes('DELETE FROM management_journal_entries'))).toBe(
      true,
    );
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

  it('creates and mirrors versioned checksum-pinned paper execution sessions', async () => {
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
    const adapter = new SQLitePersistenceAdapter({ databaseName: 'paper-execution-test.db' });
    const checksum = `sha256:${'c'.repeat(64)}`;
    const session = {
      schemaVersion: 1,
      sessionId: 'paper-session-1',
      source: {
        analysisSessionId: 'historical-analysis-1',
        scenarioId: 'scenario-1',
        scenarioVersion: '1.0.0',
        datasetId: 'dataset-1',
        datasetVersion: '1.0.0',
        canonicalChecksum: checksum,
        learningCredit: 'none',
      },
      executionPolicy: { version: 'paper-execution-policy-v1' },
      costModel: { version: 'paper-cost-model-v1' },
      status: 'working',
      lastProcessedCandleIndex: 71,
      createdAt: '2026-08-24T08:31:00.000Z',
      updatedAt: '2026-08-24T08:32:00.000Z',
    };
    const nextValue = JSON.stringify({
      metadata: {
        schemaVersion: 5,
        updatedAt: session.updatedAt,
      },
      attempts: [],
      analysisSessions: [],
      paperExecutionSessions: [session],
    });

    await adapter.transact(() => ({ nextValue, result: undefined }));

    const migration = executed.find((entry) =>
      entry.sql.includes('CREATE TABLE IF NOT EXISTS paper_execution_sessions'),
    );
    expect(migration?.sql).toContain('dataset_checksum TEXT NOT NULL');
    expect(migration?.sql).toContain('execution_policy_version TEXT NOT NULL');
    expect(migration?.sql).toContain('paper_execution_sessions_reject_terminal_update');
    const mirrored = executed.find(
      (entry) =>
        entry.parameters.length > 0 && entry.sql.includes('INSERT INTO paper_execution_sessions'),
    );
    expect(mirrored?.parameters.slice(0, 12)).toEqual([
      'paper-session-1',
      'historical-analysis-1',
      'scenario-1',
      '1.0.0',
      'dataset-1',
      '1.0.0',
      checksum,
      'paper-execution-policy-v1',
      'paper-cost-model-v1',
      'none',
      'working',
      71,
    ]);

    const terminal = { ...session, status: 'closed', updatedAt: '2026-08-24T09:00:00.000Z' };
    const terminalValue = JSON.stringify({
      metadata: { schemaVersion: 5, updatedAt: terminal.updatedAt },
      attempts: [],
      analysisSessions: [],
      paperExecutionSessions: [terminal],
    });
    await adapter.transact(() => ({ nextValue: terminalValue, result: undefined }));
    await expect(
      adapter.transact(() => ({
        nextValue: JSON.stringify({
          metadata: { schemaVersion: 5, updatedAt: '2026-08-24T09:01:00.000Z' },
          attempts: [],
          analysisSessions: [],
          paperExecutionSessions: [{ ...terminal, revision: 99 }],
        }),
        result: undefined,
      })),
    ).rejects.toThrow('Terminal paper execution session is immutable.');
  });

  it('creates protected position-management and append-only journal mirrors', async () => {
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
    const adapter = new SQLitePersistenceAdapter({ databaseName: 'position-management-test.db' });
    const checksum = `sha256:${'d'.repeat(64)}`;
    const session = {
      schemaVersion: 1,
      revision: 2,
      sessionId: 'management-session-1',
      handoff: {
        sessionId: 'paper-session-1',
        revision: 3,
        lastProcessedCandleIndex: 64,
        executionPolicy: { version: 'paper-execution-policy-v1' },
      },
      source: {
        analysisSessionId: 'analysis-session-1',
        scenarioId: 'scenario-1',
        scenarioVersion: '1.0.0',
        datasetId: 'dataset-1',
        datasetVersion: '1.0.0',
        canonicalChecksum: checksum,
        decisionCandleIndex: 63,
        learningCredit: 'none',
      },
      authority: {
        permissionVersion: 'management-permissions-v1',
        permittedActionKinds: ['full-exit'],
        riskLimits: {
          maxOpenQuantityUnits: 10,
          maxScaleInInitialQuantityBps: 10_000,
          softRiskLimitOriginalRBps: 10_000,
          hardRiskLimitOriginalRBps: 20_000,
        },
        rubricId: 'management-rubric-1',
        rubricVersion: '1.0.0',
        rubricChecksum: `sha256:${'e'.repeat(64)}`,
        rubric: { schemaVersion: 1, criteria: [] },
      },
      policy: { version: 'position-management-policy-v1' },
      costModel: { version: 'paper-cost-model-v1' },
      status: 'active',
      originalRiskMinor: 5_000,
      initialQuantityUnits: 5,
      openQuantityUnits: 5,
      lastProcessedCandleIndex: 64,
      createdAt: '2026-08-25T09:00:00.000Z',
      updatedAt: '2026-08-25T09:02:00.000Z',
      journal: [
        {
          kind: 'observation',
          entryId: 'journal-entry-1',
          sessionId: 'management-session-1',
          entryOrder: 0,
          candleIndex: 64,
          candleTimestamp: '2026-08-25T09:00:00.000Z',
          text: 'Evidence remains mixed.',
          evidenceTags: [],
          recordedAt: '2026-08-25T09:02:00.000Z',
        },
        {
          kind: 'action-rationale',
          entryId: 'journal-entry-2',
          sessionId: 'management-session-1',
          entryOrder: 1,
          candleIndex: 64,
          candleTimestamp: '2026-08-25T09:00:00.000Z',
          relatedActionId: 'management-submission-1',
          submissionOrder: 1,
          text: 'Reduce risk at the next eligible open.',
          evidenceTags: ['risk-budget'],
          recordedAt: '2026-08-25T09:03:00.000Z',
        },
      ],
    };
    const nextValue = JSON.stringify({
      metadata: { schemaVersion: 6, updatedAt: session.updatedAt },
      attempts: [],
      analysisSessions: [],
      paperExecutionSessions: [],
      positionManagementSessions: [session],
    });

    await adapter.transact(() => ({ nextValue, result: undefined }));

    const migration = executed.find((entry) =>
      entry.sql.includes('CREATE TABLE IF NOT EXISTS position_management_sessions'),
    );
    expect(migration?.sql).toContain('paper_execution_revision INTEGER NOT NULL');
    expect(migration?.sql).toContain('handoff_candle_index INTEGER NOT NULL');
    expect(migration?.sql).toContain('permitted_action_kinds_json TEXT NOT NULL');
    expect(migration?.sql).toContain('risk_limits_json TEXT NOT NULL');
    expect(migration?.sql).toContain('rubric_checksum TEXT NOT NULL');
    expect(migration?.sql).toContain('management_journal_entries_reject_update');
    expect(migration?.sql).toContain('management_journal_entries_reject_delete');
    expect(migration?.sql).toContain('position_management_sessions_reject_terminal_update');
    expect(migration?.sql).toContain("'completed-open'\n  ) BEGIN");
    expect(migration?.sql).not.toContain(') AND OLD.payload_json <> NEW.payload_json BEGIN');
    const mirroredSession = executed.find(
      (entry) =>
        entry.parameters.length > 0 &&
        entry.sql.includes('INSERT INTO position_management_sessions'),
    );
    expect(mirroredSession?.parameters.slice(0, 23)).toEqual([
      'management-session-1',
      'paper-session-1',
      'analysis-session-1',
      'scenario-1',
      '1.0.0',
      'dataset-1',
      '1.0.0',
      checksum,
      63,
      64,
      3,
      'paper-execution-policy-v1',
      'paper-cost-model-v1',
      'position-management-policy-v1',
      'management-permissions-v1',
      '["full-exit"]',
      '{"hardRiskLimitOriginalRBps":20000,"maxOpenQuantityUnits":10,"maxScaleInInitialQuantityBps":10000,"softRiskLimitOriginalRBps":10000}',
      'management-rubric-1',
      '1.0.0',
      `sha256:${'e'.repeat(64)}`,
      '{"criteria":[],"schemaVersion":1}',
      'none',
      'active',
    ]);
    const mirroredJournals = executed.filter(
      (entry) =>
        entry.parameters.length > 0 && entry.sql.includes('INSERT INTO management_journal_entries'),
    );
    expect(mirroredJournals).toHaveLength(2);
    expect(mirroredJournals[0]?.parameters.slice(0, 12)).toEqual([
      'journal-entry-1',
      'management-session-1',
      0,
      'observation',
      null,
      null,
      null,
      64,
      '2026-08-25T09:00:00.000Z',
      '[]',
      '2026-08-25T09:02:00.000Z',
      1,
    ]);
    expect(mirroredJournals[1]?.parameters.slice(0, 12)).toEqual([
      'journal-entry-2',
      'management-session-1',
      1,
      'action-rationale',
      null,
      'management-submission-1',
      1,
      64,
      '2026-08-25T09:00:00.000Z',
      '["risk-budget"]',
      '2026-08-25T09:03:00.000Z',
      1,
    ]);
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

  it('fails closed when a legacy payload conflicts with Milestone 6 SQLite mirrors', async () => {
    const currentValue = JSON.stringify({
      metadata: {
        schemaVersion: 5,
        updatedAt: '2026-08-25T08:00:00.000Z',
      },
      attempts: [],
      analysisSessions: [],
      paperExecutionSessions: [],
    });
    const executed: string[] = [];
    const database: FakeDatabase = {
      execAsync: jest.fn(async (sql: string) => {
        executed.push(sql);
      }),
      getFirstAsync: jest.fn(async (sql: string) => {
        if (sql.includes('schema_migrations')) return null;
        if (sql.includes('repository_state')) return { payload_json: currentValue };
        if (
          sql.includes('SELECT COUNT(*) FROM position_management_sessions') &&
          sql.includes('SELECT COUNT(*) FROM management_journal_entries')
        ) {
          return { management_count: 1, journal_count: 1 };
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
    const adapter = new SQLitePersistenceAdapter({ databaseName: 'legacy-mirror-conflict.db' });

    await expect(
      adapter.transact(() => ({
        nextValue: currentValue,
        result: undefined,
        // Management deletion alone must not authorize orphan journal mirrors.
        allowPositionManagementSessionDeletion: true,
      })),
    ).rejects.toBeInstanceOf(PersistenceCorruptionError);
    expect(executed.some((sql) => sql.includes('INSERT INTO repository_state'))).toBe(false);
  });
});
