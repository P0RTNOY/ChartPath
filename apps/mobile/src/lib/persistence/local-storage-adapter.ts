import type { PersistenceAdapter, PersistenceMutation } from './adapter';

export interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalStorageAdapterOptions {
  readonly storage?: LocalStorageLike;
  readonly storageKey?: string;
}

const DEFAULT_STORAGE_KEY = 'chartpath:guest-learning-data:v1';
const queues = new WeakMap<object, Map<string, Promise<void>>>();

function queueMap(storage: object): Map<string, Promise<void>> {
  const existing = queues.get(storage);
  if (existing) return existing;
  const created = new Map<string, Promise<void>>();
  queues.set(storage, created);
  return created;
}

/** Browser guest-mode adapter. It never touches a network API. */
export class LocalStoragePersistenceAdapter implements PersistenceAdapter {
  private readonly storage: LocalStorageLike;
  private readonly storageKey: string;

  public constructor(options: LocalStorageAdapterOptions = {}) {
    const storage = options.storage ?? globalThis.localStorage;
    if (!storage) throw new Error('localStorage is unavailable in this environment.');
    this.storage = storage;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  }

  public async initialize(): Promise<void> {}

  private runExclusive<T>(operation: () => T): Promise<T> {
    const storageQueues = queueMap(this.storage);
    const previous = storageQueues.get(this.storageKey) ?? Promise.resolve();
    let resolveResult!: (result: T) => void;
    let rejectResult!: (error: unknown) => void;
    const result = new Promise<T>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    const next = previous.then(() => {
      try {
        resolveResult(operation());
      } catch (error) {
        rejectResult(error);
      }
    });
    storageQueues.set(this.storageKey, next);
    return result;
  }

  public read(): Promise<string | null> {
    return this.runExclusive(() => this.storage.getItem(this.storageKey));
  }

  public transact<T>(
    mutation: (currentValue: string | null) => PersistenceMutation<T>,
  ): Promise<T> {
    return this.runExclusive(() => {
      const next = mutation(this.storage.getItem(this.storageKey));
      if (next.nextValue === null) this.storage.removeItem(this.storageKey);
      else this.storage.setItem(this.storageKey, next.nextValue);
      return next.result;
    });
  }

  public clear(): Promise<void> {
    return this.runExclusive(() => this.storage.removeItem(this.storageKey));
  }
}
