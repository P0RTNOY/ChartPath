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
  /** Reserved for explicit reset/recovery paths; ordinary session writes are append-preserving. */
  readonly allowAnalysisSessionDeletion?: boolean;
  /** Reserved for the forward schema migration that rewrites finalized session envelopes. */
  readonly allowAnalysisSessionMigration?: boolean;
  /** Reserved for explicit erasure/recovery; ordinary paper sessions are append-preserving. */
  readonly allowPaperExecutionSessionDeletion?: boolean;
  /** Reserved for a forward schema migration of physical paper-session mirrors. */
  readonly allowPaperExecutionSessionMigration?: boolean;
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

export class AnalysisSessionConflictError extends Error {
  public constructor(
    public readonly sessionId: string,
    message?: string,
  ) {
    super(message ?? `Analysis session ${sessionId} conflicts with persisted state.`);
    this.name = 'AnalysisSessionConflictError';
  }
}

export class AnalysisSessionNotFoundError extends Error {
  public constructor(public readonly sessionId: string) {
    super(`Analysis session ${sessionId} does not exist.`);
    this.name = 'AnalysisSessionNotFoundError';
  }
}

export class PaperExecutionSessionConflictError extends Error {
  public constructor(
    public readonly sessionId: string,
    message?: string,
  ) {
    super(message ?? `Paper execution session ${sessionId} conflicts with persisted state.`);
    this.name = 'PaperExecutionSessionConflictError';
  }
}

export class PaperExecutionSessionNotFoundError extends Error {
  public constructor(public readonly sessionId: string) {
    super(`Paper execution session ${sessionId} does not exist.`);
    this.name = 'PaperExecutionSessionNotFoundError';
  }
}
