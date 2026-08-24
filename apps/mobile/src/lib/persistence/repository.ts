import {
  assertValidGuidedAnalysisSession,
  reduceGuidedAnalysisSession,
  type GuidedAnalysisSession,
  type ReviewState,
} from '@chartpath/domain';

import {
  AnalysisSessionConflictError,
  AnalysisSessionNotFoundError,
  AttemptConflictError,
  type PersistenceAdapter,
} from './adapter';
import { createEmptySnapshot, migratePersistence } from './migrations';
import { localDateForTimestamp, replayAttempts } from './projections';
import type {
  AppendAttemptResult,
  CreateOrResumeAnalysisSessionResult,
  FinalizeAnalysisSessionInput,
  FinalizeAnalysisSessionResult,
  LearnerSettingsPatch,
  NewAttemptRecord,
  PersistedAttempt,
  PersistenceSnapshot,
  RepositoryOptions,
  SaveAnalysisSessionResult,
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

function cloneSession(session: GuidedAnalysisSession): GuidedAnalysisSession {
  return JSON.parse(canonicalStringify(session)) as GuidedAnalysisSession;
}

function analysisSessionIdentity(session: GuidedAnalysisSession): string {
  return canonicalStringify({
    chart: session.chart,
    contentVersionId: session.contentVersionId,
    exerciseId: session.exerciseId,
    exerciseSchemaVersion: session.exerciseSchemaVersion,
  });
}

function assertSameSessionIdentity(
  current: GuidedAnalysisSession,
  candidate: GuidedAnalysisSession,
): void {
  if (
    current.sessionId !== candidate.sessionId ||
    analysisSessionIdentity(current) !== analysisSessionIdentity(candidate) ||
    current.createdAt !== candidate.createdAt
  ) {
    throw new AnalysisSessionConflictError(
      candidate.sessionId,
      'Analysis session identity changed.',
    );
  }
}

function withSessionUpdatedAt(
  snapshot: PersistenceSnapshot,
  updatedAt: string,
): PersistenceSnapshot['metadata'] {
  return {
    ...snapshot.metadata,
    updatedAt: latestTimestamp(snapshot.metadata.updatedAt, updatedAt),
  };
}

function assertUniqueFinalizationIdentity(
  sessions: readonly GuidedAnalysisSession[],
  candidate: GuidedAnalysisSession,
): void {
  const conflict = sessions.find(
    (session) =>
      session.sessionId !== candidate.sessionId &&
      (session.attemptId === candidate.attemptId ||
        session.finalizationIdempotencyKey === candidate.finalizationIdempotencyKey),
  );
  if (conflict) {
    throw new AnalysisSessionConflictError(
      candidate.sessionId,
      'Analysis finalization identity is already owned by another session.',
    );
  }
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
    return this.adapter.transact<PersistenceSnapshot>((raw) => {
      const migration = migratePersistence(raw, this.contentVersion, at);
      const serialized = canonicalStringify(migration.snapshot);
      return {
        nextValue: serialized,
        result: cloneSnapshot(migration.snapshot),
        allowAnalysisSessionDeletion:
          migration.fromSchemaVersion === 3 &&
          migration.migrated &&
          migration.snapshot.quarantinedAnalysisSessions.length > 0,
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

  public async createOrResumeAnalysisSession(
    candidate: GuidedAnalysisSession,
  ): Promise<CreateOrResumeAnalysisSessionResult> {
    assertValidGuidedAnalysisSession(candidate);
    if (candidate.status !== 'active' || candidate.revision !== 0) {
      throw new AnalysisSessionConflictError(
        candidate.sessionId,
        'A new analysis session must be an active revision-zero draft.',
      );
    }
    await this.initializeAdapter();
    const migrationAt = this.now();
    return this.adapter.transact<CreateOrResumeAnalysisSessionResult>((raw) => {
      const current = migratePersistence(raw, this.contentVersion, migrationAt).snapshot;
      assertUniqueFinalizationIdentity(current.analysisSessions, candidate);
      const byId = current.analysisSessions.find(
        ({ sessionId }) => sessionId === candidate.sessionId,
      );
      if (byId) {
        if (canonicalStringify(byId) !== canonicalStringify(candidate)) {
          throw new AnalysisSessionConflictError(candidate.sessionId);
        }
        return {
          nextValue: canonicalStringify(current),
          result: {
            session: cloneSession(byId),
            created: false,
            snapshot: cloneSnapshot(current),
          },
        };
      }
      const identity = analysisSessionIdentity(candidate);
      const resumable = current.analysisSessions.find(
        (session) => session.status === 'active' && analysisSessionIdentity(session) === identity,
      );
      if (resumable) {
        return {
          nextValue: canonicalStringify(current),
          result: {
            session: cloneSession(resumable),
            created: false,
            snapshot: cloneSnapshot(current),
          },
        };
      }
      const session = cloneSession(candidate);
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: withSessionUpdatedAt(current, session.updatedAt),
        analysisSessions: [...current.analysisSessions, session],
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: { session, created: true, snapshot: cloneSnapshot(snapshot) },
      };
    });
  }

  public async saveAnalysisSession(
    candidate: GuidedAnalysisSession,
  ): Promise<SaveAnalysisSessionResult> {
    assertValidGuidedAnalysisSession(candidate);
    if (candidate.status !== 'active') {
      throw new AnalysisSessionConflictError(
        candidate.sessionId,
        'Only active sessions can autosave.',
      );
    }
    await this.initializeAdapter();
    const migrationAt = this.now();
    return this.adapter.transact<SaveAnalysisSessionResult>((raw) => {
      const current = migratePersistence(raw, this.contentVersion, migrationAt).snapshot;
      const index = current.analysisSessions.findIndex(
        ({ sessionId }) => sessionId === candidate.sessionId,
      );
      const persisted = current.analysisSessions[index];
      if (!persisted) throw new AnalysisSessionNotFoundError(candidate.sessionId);
      assertSameSessionIdentity(persisted, candidate);
      if (persisted.status !== 'active') {
        throw new AnalysisSessionConflictError(
          candidate.sessionId,
          'Persisted session is read-only.',
        );
      }
      const canonicalPersisted = canonicalStringify(persisted);
      const canonicalCandidate = canonicalStringify(candidate);
      if (persisted.revision === candidate.revision) {
        if (canonicalPersisted !== canonicalCandidate) {
          throw new AnalysisSessionConflictError(
            candidate.sessionId,
            'Equal analysis revisions contain different data.',
          );
        }
        return {
          nextValue: canonicalStringify(current),
          result: {
            session: cloneSession(persisted),
            saved: false,
            snapshot: cloneSnapshot(current),
          },
        };
      }
      if (candidate.revision < persisted.revision) {
        throw new AnalysisSessionConflictError(
          candidate.sessionId,
          'A stale autosave was rejected.',
        );
      }
      if (Date.parse(candidate.updatedAt) < Date.parse(persisted.updatedAt)) {
        throw new AnalysisSessionConflictError(
          candidate.sessionId,
          'A newer revision cannot move the session timestamp backwards.',
        );
      }
      const sessions = [...current.analysisSessions];
      const session = cloneSession(candidate);
      sessions[index] = session;
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: withSessionUpdatedAt(current, session.updatedAt),
        analysisSessions: sessions,
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: { session, saved: true, snapshot: cloneSnapshot(snapshot) },
      };
    });
  }

  public async getAnalysisSession(sessionId: string): Promise<GuidedAnalysisSession | null> {
    assertNonEmptyString(sessionId, 'sessionId');
    const snapshot = await this.load();
    const session = snapshot.analysisSessions.find(
      (candidate) => candidate.sessionId === sessionId,
    );
    return session ? cloneSession(session) : null;
  }

  public async listAnalysisSessions(): Promise<readonly GuidedAnalysisSession[]> {
    const snapshot = await this.load();
    return [...snapshot.analysisSessions]
      .sort(
        (left, right) =>
          Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
          compareStrings(left.sessionId, right.sessionId),
      )
      .map(cloneSession);
  }

  public async abandonAnalysisSession(
    sessionId: string,
    abandonedAt: string = this.now(),
  ): Promise<SaveAnalysisSessionResult> {
    assertNonEmptyString(sessionId, 'sessionId');
    assertUtcTimestamp(abandonedAt, 'abandonedAt');
    await this.initializeAdapter();
    return this.adapter.transact<SaveAnalysisSessionResult>((raw) => {
      const current = migratePersistence(raw, this.contentVersion, abandonedAt).snapshot;
      const index = current.analysisSessions.findIndex(
        (session) => session.sessionId === sessionId,
      );
      const persisted = current.analysisSessions[index];
      if (!persisted) throw new AnalysisSessionNotFoundError(sessionId);
      if (persisted.status === 'finalized') {
        throw new AnalysisSessionConflictError(
          sessionId,
          'Finalized analysis sessions are immutable.',
        );
      }
      const abandoned = reduceGuidedAnalysisSession(persisted, { type: 'abandon', abandonedAt });
      if (canonicalStringify(abandoned) === canonicalStringify(persisted)) {
        return {
          nextValue: canonicalStringify(current),
          result: {
            session: cloneSession(persisted),
            saved: false,
            snapshot: cloneSnapshot(current),
          },
        };
      }
      const sessions = [...current.analysisSessions];
      sessions[index] = abandoned;
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: withSessionUpdatedAt(current, abandoned.updatedAt),
        analysisSessions: sessions,
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: {
          session: cloneSession(abandoned),
          saved: true,
          snapshot: cloneSnapshot(snapshot),
        },
      };
    });
  }

  public async restartAnalysisSession(
    sessionId: string,
    replacement: GuidedAnalysisSession,
    abandonedAt: string,
  ): Promise<CreateOrResumeAnalysisSessionResult> {
    assertValidGuidedAnalysisSession(replacement);
    assertUtcTimestamp(abandonedAt, 'abandonedAt');
    if (
      replacement.status !== 'active' ||
      replacement.revision !== 0 ||
      replacement.sessionId === sessionId
    ) {
      throw new AnalysisSessionConflictError(
        replacement.sessionId,
        'Replacement session is invalid.',
      );
    }
    await this.initializeAdapter();
    return this.adapter.transact<CreateOrResumeAnalysisSessionResult>((raw) => {
      const current = migratePersistence(raw, this.contentVersion, abandonedAt).snapshot;
      const index = current.analysisSessions.findIndex(
        (session) => session.sessionId === sessionId,
      );
      const persisted = current.analysisSessions[index];
      if (!persisted) throw new AnalysisSessionNotFoundError(sessionId);
      if (persisted.status !== 'active') {
        throw new AnalysisSessionConflictError(sessionId, 'Only an active draft can restart.');
      }
      if (current.analysisSessions.some(({ sessionId: id }) => id === replacement.sessionId)) {
        throw new AnalysisSessionConflictError(replacement.sessionId);
      }
      assertUniqueFinalizationIdentity(current.analysisSessions, replacement);
      const abandoned = reduceGuidedAnalysisSession(persisted, { type: 'abandon', abandonedAt });
      const sessions = [...current.analysisSessions];
      sessions[index] = abandoned;
      sessions.push(cloneSession(replacement));
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: withSessionUpdatedAt(
          current,
          latestTimestamp(abandoned.updatedAt, replacement.updatedAt),
        ),
        analysisSessions: sessions,
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: {
          session: cloneSession(replacement),
          created: true,
          snapshot: cloneSnapshot(snapshot),
        },
      };
    });
  }

  public async finalizeAnalysisSession(
    input: FinalizeAnalysisSessionInput,
  ): Promise<FinalizeAnalysisSessionResult> {
    assertValidGuidedAnalysisSession(input.session);
    if (input.session.status !== 'finalized') {
      throw new AnalysisSessionConflictError(input.session.sessionId, 'Session is not finalized.');
    }
    const normalized = normalizeAttemptRecord(input.attemptRecord);
    if (
      input.session.attemptId !== normalized.attempt.id ||
      input.session.exerciseId !== normalized.attempt.exerciseId ||
      input.session.contentVersionId !== normalized.attempt.contentVersionId ||
      input.session.exerciseSchemaVersion !== normalized.exerciseVersion ||
      input.session.chart.generatorVersion !== normalized.generatorVersion ||
      canonicalStringify(input.session.finalResult) !==
        canonicalStringify(normalized.attempt.result)
    ) {
      throw new AnalysisSessionConflictError(
        input.session.sessionId,
        'Finalized session and immutable attempt disagree.',
      );
    }
    await this.initializeAdapter();
    const migrationAt = this.now();
    return this.adapter.transact<FinalizeAnalysisSessionResult>((raw) => {
      const current = migratePersistence(raw, this.contentVersion, migrationAt).snapshot;
      const sessionIndex = current.analysisSessions.findIndex(
        ({ sessionId }) => sessionId === input.session.sessionId,
      );
      const persistedSession = current.analysisSessions[sessionIndex];
      if (!persistedSession) throw new AnalysisSessionNotFoundError(input.session.sessionId);
      assertSameSessionIdentity(persistedSession, input.session);
      if (persistedSession.status === 'abandoned') {
        throw new AnalysisSessionConflictError(
          input.session.sessionId,
          'Abandoned session cannot finalize.',
        );
      }
      if (
        persistedSession.status === 'finalized' &&
        canonicalStringify(persistedSession) !== canonicalStringify(input.session)
      ) {
        throw new AnalysisSessionConflictError(
          input.session.sessionId,
          'Finalized session data is immutable.',
        );
      }
      if (
        persistedSession.status === 'active' &&
        input.session.revision !== persistedSession.revision + 1
      ) {
        throw new AnalysisSessionConflictError(
          input.session.sessionId,
          'Finalization must directly follow the persisted active revision.',
        );
      }
      const duplicate = current.attempts.find(
        (candidate) => candidate.attempt.id === normalized.attempt.id,
      );
      if (duplicate && canonicalStringify(duplicate) !== canonicalStringify(normalized)) {
        throw new AttemptConflictError(normalized.attempt.id);
      }
      const attempts = duplicate ? current.attempts : [...current.attempts, normalized];
      const sessions = [...current.analysisSessions];
      sessions[sessionIndex] = cloneSession(input.session);
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: withSessionUpdatedAt(current, input.session.updatedAt),
        attempts,
        analysisSessions: sessions,
        projections: replayAttempts(attempts, localDateForTimestamp(migrationAt)),
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: {
          session: cloneSession(input.session),
          attempt: duplicate ?? normalized,
          inserted: duplicate === undefined,
          snapshot: cloneSnapshot(snapshot),
        },
      };
    });
  }

  public async discardQuarantinedAnalysisSessions(
    quarantineIds: readonly string[],
    recoveredAt: string = this.now(),
  ): Promise<PersistenceSnapshot> {
    assertUtcTimestamp(recoveredAt, 'recoveredAt');
    quarantineIds.forEach((id, index) => assertNonEmptyString(id, `quarantineIds[${index}]`));
    const ids = new Set(quarantineIds);
    await this.initializeAdapter();
    return this.adapter.transact((raw) => {
      const current = migratePersistence(raw, this.contentVersion, recoveredAt).snapshot;
      const quarantinedAnalysisSessions = current.quarantinedAnalysisSessions.filter(
        ({ quarantineId }) => !ids.has(quarantineId),
      );
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata:
          quarantinedAnalysisSessions.length === current.quarantinedAnalysisSessions.length
            ? current.metadata
            : withSessionUpdatedAt(current, recoveredAt),
        quarantinedAnalysisSessions,
      };
      return { nextValue: canonicalStringify(snapshot), result: cloneSnapshot(snapshot) };
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
      allowAnalysisSessionDeletion: true,
    }));
  }

  public async close(): Promise<void> {
    await this.adapter.close?.();
    this.adapterInitialization = undefined;
  }
}
