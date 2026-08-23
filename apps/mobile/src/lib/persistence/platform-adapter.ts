import { createSQLitePersistenceAdapter, type SQLitePersistenceAdapter } from './sqlite-adapter';

export interface PlatformPersistenceAdapterOptions {
  readonly databaseName?: string;
}

export function createPlatformPersistenceAdapter(
  options: PlatformPersistenceAdapterOptions = {},
): SQLitePersistenceAdapter {
  return createSQLitePersistenceAdapter(options);
}
