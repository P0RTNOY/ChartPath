/**
 * Small atomic storage boundary shared by SQLite, localStorage, and tests.
 *
 * The repository owns serialization and migrations. Adapters only guarantee that a
 * read/transform/write operation is serialized for one local data store.
 */
export interface PersistenceMutation<T> {
  readonly nextValue: string | null;
  readonly result: T;
  /** Reserved for the explicit learner-requested reset path. */
  readonly allowAttemptDeletion?: boolean;
}

export interface PersistenceAdapter {
  initialize(): Promise<void>;
  read(): Promise<string | null>;
  transact<T>(mutation: (currentValue: string | null) => PersistenceMutation<T>): Promise<T>;
  clear(): Promise<void>;
  close?(): Promise<void>;
}

export class PersistenceCorruptionError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PersistenceCorruptionError';
  }
}

export class UnsupportedPersistenceVersionError extends Error {
  public constructor(public readonly foundVersion: number) {
    super(`Persistence schema ${foundVersion} is newer than this app supports.`);
    this.name = 'UnsupportedPersistenceVersionError';
  }
}

export class AttemptConflictError extends Error {
  public constructor(public readonly attemptId: string) {
    super(`Attempt ${attemptId} already exists with different immutable data.`);
    this.name = 'AttemptConflictError';
  }
}
