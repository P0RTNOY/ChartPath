import type { PersistenceAdapter, PersistenceMutation } from './adapter';

/** Deterministic adapter for repository and migration tests. */
export class InMemoryPersistenceAdapter implements PersistenceAdapter {
  private value: string | null;
  private queue: Promise<void> = Promise.resolve();

  public constructor(initialValue: string | null = null) {
    this.value = initialValue;
  }

  public async initialize(): Promise<void> {}

  public async read(): Promise<string | null> {
    await this.queue;
    return this.value;
  }

  public transact<T>(
    mutation: (currentValue: string | null) => PersistenceMutation<T>,
  ): Promise<T> {
    let resolveResult!: (result: T) => void;
    let rejectResult!: (error: unknown) => void;
    const result = new Promise<T>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });

    this.queue = this.queue.then(() => {
      try {
        const next = mutation(this.value);
        this.value = next.nextValue;
        resolveResult(next.result);
      } catch (error) {
        rejectResult(error);
      }
    });
    return result;
  }

  public async clear(): Promise<void> {
    await this.transact(() => ({ nextValue: null, result: undefined }));
  }

  /** Returns the exact serialized value for migration fixtures and diagnostics. */
  public async dump(): Promise<string | null> {
    return this.read();
  }
}
