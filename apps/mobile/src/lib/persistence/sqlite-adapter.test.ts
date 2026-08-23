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
  });
});
