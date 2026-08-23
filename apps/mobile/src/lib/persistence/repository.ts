import type { ReviewState } from '@chartpath/domain';

import { AttemptConflictError, type PersistenceAdapter } from './adapter';
import { createEmptySnapshot, migratePersistence } from './migrations';
import { localDateForTimestamp, replayAttempts } from './projections';
import type {
  AppendAttemptResult,
  LearnerSettingsPatch,
  NewAttemptRecord,
  PersistedAttempt,
  PersistenceSnapshot,
  RepositoryOptions,
} from './types';
import {
  assertNonEmptyString,
  assertUtcTimestamp,
  canonicalStringify,
  normalizeAttemptRecord,
  normalizeSettings,
} from './validation';

function systemNow(): string {
  return new Date().toISOString();
}

function cloneSnapshot(snapshot: PersistenceSnapshot): PersistenceSnapshot {
  return JSON.parse(canonicalStringify(snapshot)) as PersistenceSnapshot;
}

function latestTimestamp(left: string, right: string): string {
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Local, offline repository. It has no network or telemetry dependencies. */
export class LearningRepository {
  private readonly now: () => string;
  private contentVersion: string;
  private adapterInitialization: Promise<void> | undefined;

  public constructor(
    private readonly adapter: PersistenceAdapter,
    options: RepositoryOptions,
  ) {
    assertNonEmptyString(options.contentVersion, 'contentVersion');
    this.contentVersion = options.contentVersion;
    this.now = options.now ?? systemNow;
  }

  private initializeAdapter(): Promise<void> {
    this.adapterInitialization ??= this.adapter.initialize();
    return this.adapterInitialization;
  }

  public async initialize(): Promise<PersistenceSnapshot> {
    await this.initializeAdapter();
    const at = this.now();
    return this.adapter.transact((raw) => {
      const migration = migratePersistence(raw, this.contentVersion, at);
      const serialized = canonicalStringify(migration.snapshot);
      return {
        nextValue: serialized,
        result: cloneSnapshot(migration.snapshot),
      };
    });
  }

  public async load(): Promise<PersistenceSnapshot> {
    return this.initialize();
  }

  public async appendAttempt(record: NewAttemptRecord): Promise<AppendAttemptResult> {
    await this.initializeAdapter();
    const normalized = normalizeAttemptRecord(record);
    const migrationAt = this.now();
    return this.adapter.transact<AppendAttemptResult>((raw) => {
      const current = migratePersistence(raw, this.contentVersion, migrationAt).snapshot;
      const duplicate = current.attempts.find(
        (candidate) => candidate.attempt.id === normalized.attempt.id,
      );
      if (duplicate) {
        if (canonicalStringify(duplicate) !== canonicalStringify(normalized)) {
          throw new AttemptConflictError(normalized.attempt.id);
        }
        return {
          nextValue: canonicalStringify(current),
          result: {
            attempt: duplicate,
            inserted: false,
            snapshot: cloneSnapshot(current),
          },
        };
      }

      const attempts = [...current.attempts, normalized];
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: {
          ...current.metadata,
          updatedAt: latestTimestamp(current.metadata.updatedAt, normalized.attempt.submittedAt),
        },
        attempts,
        projections: replayAttempts(attempts, localDateForTimestamp(migrationAt)),
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: {
          attempt: normalized,
          inserted: true,
          snapshot: cloneSnapshot(snapshot),
        },
      };
    });
  }

  public async updateSettings(
    patch: LearnerSettingsPatch,
    updatedAt: string = this.now(),
  ): Promise<PersistenceSnapshot> {
    await this.initializeAdapter();
    assertUtcTimestamp(updatedAt, 'updatedAt');
    return this.adapter.transact((raw) => {
      const current = migratePersistence(raw, this.contentVersion, updatedAt).snapshot;
      const settings = normalizeSettings({ ...current.settings, ...patch });
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: {
          ...current.metadata,
          updatedAt: latestTimestamp(current.metadata.updatedAt, updatedAt),
        },
        settings,
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: cloneSnapshot(snapshot),
      };
    });
  }

  /** Changes bundled content metadata without rewriting historical attempt identities. */
  public async migrateContent(
    nextContentVersion: string,
    migratedAt: string = this.now(),
  ): Promise<PersistenceSnapshot> {
    assertNonEmptyString(nextContentVersion, 'nextContentVersion');
    assertUtcTimestamp(migratedAt, 'migratedAt');
    await this.initializeAdapter();
    const snapshot = await this.adapter.transact((raw) => {
      const migrated = migratePersistence(raw, nextContentVersion, migratedAt).snapshot;
      return {
        nextValue: canonicalStringify(migrated),
        result: cloneSnapshot(migrated),
      };
    });
    this.contentVersion = nextContentVersion;
    return snapshot;
  }

  /** Explicit repair/debug operation; projections remain subordinate to attempts. */
  public async rebuildProjections(rebuiltAt: string = this.now()): Promise<PersistenceSnapshot> {
    await this.initializeAdapter();
    assertUtcTimestamp(rebuiltAt, 'rebuiltAt');
    return this.adapter.transact((raw) => {
      const current = migratePersistence(raw, this.contentVersion, rebuiltAt).snapshot;
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: {
          ...current.metadata,
          updatedAt: latestTimestamp(current.metadata.updatedAt, rebuiltAt),
        },
        projections: replayAttempts(current.attempts, localDateForTimestamp(rebuiltAt)),
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: cloneSnapshot(snapshot),
      };
    });
  }

  public async getAttempt(attemptId: string): Promise<PersistedAttempt | null> {
    assertNonEmptyString(attemptId, 'attemptId');
    const snapshot = await this.load();
    return snapshot.attempts.find((record) => record.attempt.id === attemptId) ?? null;
  }

  public async getDueReviews(at: string): Promise<readonly ReviewState[]> {
    assertUtcTimestamp(at, 'at');
    const snapshot = await this.load();
    return Object.values(snapshot.projections.reviewState)
      .filter((review) => Date.parse(review.nextDueAt) <= Date.parse(at))
      .sort(
        (left, right) =>
          Date.parse(left.nextDueAt) - Date.parse(right.nextDueAt) ||
          compareStrings(left.skillId, right.skillId),
      );
  }

  /** Deliberate learner-requested erasure: the sole repository path that removes attempts. */
  public async reset(resetAt: string = this.now()): Promise<PersistenceSnapshot> {
    await this.initializeAdapter();
    const snapshot = createEmptySnapshot(this.contentVersion, resetAt);
    return this.adapter.transact(() => ({
      nextValue: canonicalStringify(snapshot),
      result: cloneSnapshot(snapshot),
      allowAttemptDeletion: true,
    }));
  }

  public async close(): Promise<void> {
    await this.adapter.close?.();
    this.adapterInitialization = undefined;
  }
}
