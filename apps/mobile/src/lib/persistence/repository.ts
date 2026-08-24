import {
  analysisChartIdentitiesEqual,
  assertValidGuidedAnalysisSession,
  assertValidPaperExecutionSession,
  executionIdentitiesEqual,
  reduceGuidedAnalysisSession,
  reducePaperExecutionSession,
  type GuidedAnalysisSession,
  type PaperExecutionSession,
  type ReviewState,
} from '@chartpath/domain';

import {
  AnalysisSessionConflictError,
  AnalysisSessionNotFoundError,
  AttemptConflictError,
  PaperExecutionSessionConflictError,
  PaperExecutionSessionNotFoundError,
  type PersistenceAdapter,
} from './adapter';
import { createEmptySnapshot, migratePersistence } from './migrations';
import { localDateForTimestamp, replayAttempts } from './projections';
import type {
  AppendAttemptResult,
  CreateOrResumePaperExecutionSessionResult,
  CreateOrResumeAnalysisSessionResult,
  FinalizeAnalysisSessionInput,
  FinalizeAnalysisSessionResult,
  FinalizePracticeAnalysisSessionResult,
  LearnerSettingsPatch,
  NewAttemptRecord,
  PersistedAttempt,
  PersistenceSnapshot,
  RepositoryOptions,
  SaveAnalysisSessionResult,
  SavePaperExecutionSessionResult,
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

function clonePaperExecutionSession(session: PaperExecutionSession): PaperExecutionSession {
  return JSON.parse(canonicalStringify(session)) as PaperExecutionSession;
}

function paperExecutionLogicalIdentity(session: PaperExecutionSession): string {
  return session.source.analysisSessionId;
}

function isActivePaperExecutionSession(session: PaperExecutionSession): boolean {
  return ['draft', 'working', 'open'].includes(session.status);
}

function assertPaperExecutionSourceBound(
  analysisSessions: readonly GuidedAnalysisSession[],
  candidate: PaperExecutionSession,
): void {
  const analysis = analysisSessions.find(
    ({ sessionId }) => sessionId === candidate.source.analysisSessionId,
  );
  if (!analysis || analysis.status !== 'finalized' || analysis.chart.kind !== 'historical') {
    throw new PaperExecutionSessionConflictError(
      candidate.sessionId,
      'Paper execution requires its exact finalized historical analysis session.',
    );
  }
  if (
    analysis.finalizedAt !== candidate.source.analysisFinalizedAt ||
    analysis.chart.datasetId !== candidate.source.datasetId ||
    analysis.chart.datasetVersion !== candidate.source.datasetVersion ||
    analysis.chart.canonicalChecksum !== candidate.source.canonicalChecksum ||
    analysis.chart.scenarioId !== candidate.source.scenarioId ||
    analysis.chart.scenarioVersion !== candidate.source.scenarioVersion ||
    analysis.chart.decisionCandleIndex !== candidate.source.decisionCandleIndex ||
    analysis.chart.candleCount !== candidate.source.candleCount ||
    analysis.chart.learningCredit !== candidate.source.learningCredit
  ) {
    throw new PaperExecutionSessionConflictError(
      candidate.sessionId,
      'Paper execution evidence does not match the pinned historical analysis.',
    );
  }
}

function assertSamePaperExecutionIdentity(
  persisted: PaperExecutionSession,
  candidate: PaperExecutionSession,
): void {
  if (
    persisted.sessionId !== candidate.sessionId ||
    persisted.createdAt !== candidate.createdAt ||
    persisted.orderId !== candidate.orderId ||
    persisted.positionId !== candidate.positionId ||
    persisted.debriefId !== candidate.debriefId ||
    !executionIdentitiesEqual(persisted.source, candidate.source) ||
    canonicalStringify(persisted.executionPolicy) !==
      canonicalStringify(candidate.executionPolicy) ||
    canonicalStringify(persisted.costModel) !== canonicalStringify(candidate.costModel)
  ) {
    throw new PaperExecutionSessionConflictError(
      candidate.sessionId,
      'Paper execution identity or versioned assumptions changed.',
    );
  }
}

function assertPaperExecutionHistoryPrefix(
  persisted: PaperExecutionSession,
  candidate: PaperExecutionSession,
): void {
  if (
    candidate.events.length < persisted.events.length ||
    candidate.processedCandles.length < persisted.processedCandles.length
  ) {
    throw new PaperExecutionSessionConflictError(
      candidate.sessionId,
      'Paper execution event and candle histories are append-only.',
    );
  }
  for (const [index, event] of persisted.events.entries()) {
    if (canonicalStringify(event) !== canonicalStringify(candidate.events[index])) {
      throw new PaperExecutionSessionConflictError(
        candidate.sessionId,
        'Paper execution event history is append-only.',
      );
    }
  }
  for (const [index, candle] of persisted.processedCandles.entries()) {
    if (canonicalStringify(candle) !== canonicalStringify(candidate.processedCandles[index])) {
      throw new PaperExecutionSessionConflictError(
        candidate.sessionId,
        'Processed execution candle history is append-only.',
      );
    }
  }
  if (candidate.lastProcessedCandleIndex < persisted.lastProcessedCandleIndex) {
    throw new PaperExecutionSessionConflictError(
      candidate.sessionId,
      'Paper execution replay cannot move backwards.',
    );
  }
}

function analysisSessionIdentity(session: GuidedAnalysisSession): string {
  return canonicalStringify({
    chart: session.chart,
    contentVersionId: session.contentVersionId,
    exerciseId: session.exerciseId,
    exerciseSchemaVersion: session.exerciseSchemaVersion,
  });
}

function historicalLogicalIdentity(session: GuidedAnalysisSession): string | null {
  if (session.chart.kind !== 'historical') return null;
  return canonicalStringify({
    contentVersionId: session.contentVersionId,
    exerciseId: session.exerciseId,
    exerciseSchemaVersion: session.exerciseSchemaVersion,
    scenarioId: session.chart.scenarioId,
    scenarioVersion: session.chart.scenarioVersion,
    datasetId: session.chart.datasetId,
    datasetVersion: session.chart.datasetVersion,
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

function assertCheckpointHistoryPrefix(
  persisted: GuidedAnalysisSession,
  candidate: GuidedAnalysisSession,
): void {
  if (candidate.replay.checkpoints.length < persisted.replay.checkpoints.length) {
    throw new AnalysisSessionConflictError(
      candidate.sessionId,
      'Replay checkpoint history is append-only.',
    );
  }
  for (const [index, checkpoint] of persisted.replay.checkpoints.entries()) {
    if (
      canonicalStringify(checkpoint) !== canonicalStringify(candidate.replay.checkpoints[index])
    ) {
      throw new AnalysisSessionConflictError(
        candidate.sessionId,
        'Replay checkpoint history is append-only.',
      );
    }
  }
}

function assertFinalizationTransition(
  persisted: GuidedAnalysisSession,
  candidate: GuidedAnalysisSession,
): boolean {
  assertSameSessionIdentity(persisted, candidate);
  assertCheckpointHistoryPrefix(persisted, candidate);
  if (persisted.status === 'abandoned') {
    throw new AnalysisSessionConflictError(
      candidate.sessionId,
      'Abandoned session cannot finalize.',
    );
  }
  if (persisted.status === 'finalized') {
    if (canonicalStringify(persisted) !== canonicalStringify(candidate)) {
      throw new AnalysisSessionConflictError(
        candidate.sessionId,
        'Finalized session data is immutable.',
      );
    }
    return false;
  }
  if (candidate.revision !== persisted.revision + 1) {
    throw new AnalysisSessionConflictError(
      candidate.sessionId,
      'Finalization must directly follow the persisted active revision.',
    );
  }
  return true;
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
          (migration.fromSchemaVersion === 4 || migration.fromSchemaVersion === 5) &&
          migration.migrated &&
          migration.snapshot.quarantinedAnalysisSessions.length > 0,
        allowAnalysisSessionMigration: migration.fromSchemaVersion === 3 && migration.migrated,
        allowPaperExecutionSessionDeletion:
          migration.fromSchemaVersion === 5 &&
          migration.migrated &&
          migration.snapshot.quarantinedPaperExecutionSessions.length > 0,
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

  public async createOrResumePaperExecutionSession(
    candidate: PaperExecutionSession,
  ): Promise<CreateOrResumePaperExecutionSessionResult> {
    assertValidPaperExecutionSession(candidate);
    if (candidate.status !== 'draft' || candidate.revision !== 0) {
      throw new PaperExecutionSessionConflictError(
        candidate.sessionId,
        'A new paper execution session must be a revision-zero draft.',
      );
    }
    await this.initializeAdapter();
    const migrationAt = this.now();
    return this.adapter.transact<CreateOrResumePaperExecutionSessionResult>((raw) => {
      const current = migratePersistence(raw, this.contentVersion, migrationAt).snapshot;
      assertPaperExecutionSourceBound(current.analysisSessions, candidate);
      const byId = current.paperExecutionSessions.find(
        ({ sessionId }) => sessionId === candidate.sessionId,
      );
      if (byId) {
        if (canonicalStringify(byId) !== canonicalStringify(candidate)) {
          throw new PaperExecutionSessionConflictError(candidate.sessionId);
        }
        return {
          nextValue: canonicalStringify(current),
          result: {
            session: clonePaperExecutionSession(byId),
            created: false,
            snapshot: cloneSnapshot(current),
          },
        };
      }
      const logical = current.paperExecutionSessions
        .filter(
          (session) =>
            paperExecutionLogicalIdentity(session) === paperExecutionLogicalIdentity(candidate),
        )
        .sort(
          (left, right) =>
            Number(isActivePaperExecutionSession(right)) -
              Number(isActivePaperExecutionSession(left)) ||
            Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
            compareStrings(left.sessionId, right.sessionId),
        )[0];
      if (logical) {
        if (
          !executionIdentitiesEqual(logical.source, candidate.source) ||
          canonicalStringify(logical.executionPolicy) !==
            canonicalStringify(candidate.executionPolicy) ||
          canonicalStringify(logical.costModel) !== canonicalStringify(candidate.costModel)
        ) {
          throw new PaperExecutionSessionConflictError(
            candidate.sessionId,
            'A paper execution for this analysis pins different evidence or assumptions.',
          );
        }
        return {
          nextValue: canonicalStringify(current),
          result: {
            session: clonePaperExecutionSession(logical),
            created: false,
            snapshot: cloneSnapshot(current),
          },
        };
      }
      const session = clonePaperExecutionSession(candidate);
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: withSessionUpdatedAt(current, session.updatedAt),
        paperExecutionSessions: [...current.paperExecutionSessions, session],
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: { session, created: true, snapshot: cloneSnapshot(snapshot) },
      };
    });
  }

  public async savePaperExecutionSession(
    candidate: PaperExecutionSession,
  ): Promise<SavePaperExecutionSessionResult> {
    assertValidPaperExecutionSession(candidate);
    await this.initializeAdapter();
    const migrationAt = this.now();
    return this.adapter.transact<SavePaperExecutionSessionResult>((raw) => {
      const current = migratePersistence(raw, this.contentVersion, migrationAt).snapshot;
      assertPaperExecutionSourceBound(current.analysisSessions, candidate);
      const index = current.paperExecutionSessions.findIndex(
        ({ sessionId }) => sessionId === candidate.sessionId,
      );
      const persisted = current.paperExecutionSessions[index];
      if (!persisted) throw new PaperExecutionSessionNotFoundError(candidate.sessionId);
      assertSamePaperExecutionIdentity(persisted, candidate);
      const canonicalPersisted = canonicalStringify(persisted);
      const canonicalCandidate = canonicalStringify(candidate);
      if (persisted.revision === candidate.revision) {
        if (canonicalPersisted !== canonicalCandidate) {
          throw new PaperExecutionSessionConflictError(
            candidate.sessionId,
            'Equal paper execution revisions contain different data.',
          );
        }
        return {
          nextValue: canonicalStringify(current),
          result: {
            session: clonePaperExecutionSession(persisted),
            saved: false,
            snapshot: cloneSnapshot(current),
          },
        };
      }
      if (candidate.revision !== persisted.revision + 1) {
        throw new PaperExecutionSessionConflictError(
          candidate.sessionId,
          'Paper execution saves must apply exactly one deterministic revision.',
        );
      }
      if (Date.parse(candidate.updatedAt) < Date.parse(persisted.updatedAt)) {
        throw new PaperExecutionSessionConflictError(
          candidate.sessionId,
          'Paper execution timestamps cannot move backwards.',
        );
      }
      if (!isActivePaperExecutionSession(persisted)) {
        throw new PaperExecutionSessionConflictError(
          candidate.sessionId,
          'Terminal paper execution sessions are immutable.',
        );
      }
      assertPaperExecutionHistoryPrefix(persisted, candidate);
      const sessions = [...current.paperExecutionSessions];
      const session = clonePaperExecutionSession(candidate);
      sessions[index] = session;
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: withSessionUpdatedAt(current, session.updatedAt),
        paperExecutionSessions: sessions,
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: { session, saved: true, snapshot: cloneSnapshot(snapshot) },
      };
    });
  }

  public async getPaperExecutionSession(sessionId: string): Promise<PaperExecutionSession | null> {
    assertNonEmptyString(sessionId, 'sessionId');
    const snapshot = await this.load();
    const session = snapshot.paperExecutionSessions.find(
      (candidate) => candidate.sessionId === sessionId,
    );
    return session ? clonePaperExecutionSession(session) : null;
  }

  public async listPaperExecutionSessions(): Promise<readonly PaperExecutionSession[]> {
    const snapshot = await this.load();
    return [...snapshot.paperExecutionSessions]
      .sort(
        (left, right) =>
          Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
          compareStrings(left.sessionId, right.sessionId),
      )
      .map(clonePaperExecutionSession);
  }

  public async abandonPaperExecutionSession(
    sessionId: string,
    confirmationId: string,
    abandonedAt: string = this.now(),
  ): Promise<SavePaperExecutionSessionResult> {
    assertNonEmptyString(sessionId, 'sessionId');
    assertNonEmptyString(confirmationId, 'confirmationId');
    assertUtcTimestamp(abandonedAt, 'abandonedAt');
    await this.initializeAdapter();
    return this.adapter.transact<SavePaperExecutionSessionResult>((raw) => {
      const current = migratePersistence(raw, this.contentVersion, abandonedAt).snapshot;
      const index = current.paperExecutionSessions.findIndex(
        (session) => session.sessionId === sessionId,
      );
      const persisted = current.paperExecutionSessions[index];
      if (!persisted) throw new PaperExecutionSessionNotFoundError(sessionId);
      assertPaperExecutionSourceBound(current.analysisSessions, persisted);
      let abandoned: PaperExecutionSession;
      try {
        abandoned = reducePaperExecutionSession(persisted, {
          type: 'abandon',
          confirmationId,
          abandonedAt,
        });
      } catch (error) {
        throw new PaperExecutionSessionConflictError(
          sessionId,
          error instanceof Error ? error.message : 'Paper execution cannot be abandoned.',
        );
      }
      if (canonicalStringify(abandoned) === canonicalStringify(persisted)) {
        return {
          nextValue: canonicalStringify(current),
          result: {
            session: clonePaperExecutionSession(persisted),
            saved: false,
            snapshot: cloneSnapshot(current),
          },
        };
      }
      assertPaperExecutionHistoryPrefix(persisted, abandoned);
      const sessions = [...current.paperExecutionSessions];
      sessions[index] = clonePaperExecutionSession(abandoned);
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: withSessionUpdatedAt(current, abandoned.updatedAt),
        paperExecutionSessions: sessions,
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: {
          session: clonePaperExecutionSession(abandoned),
          saved: true,
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
      const logicalHistoricalIdentity = historicalLogicalIdentity(candidate);
      const incompatibleHistorical =
        logicalHistoricalIdentity === null
          ? undefined
          : current.analysisSessions.find(
              (session) =>
                session.status === 'active' &&
                historicalLogicalIdentity(session) === logicalHistoricalIdentity,
            );
      if (incompatibleHistorical) {
        throw new AnalysisSessionConflictError(
          candidate.sessionId,
          'The active historical session pins different dataset evidence; abandon it explicitly before starting again.',
        );
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
      assertCheckpointHistoryPrefix(persisted, candidate);
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
    if (
      input.session.chart.kind === 'historical' &&
      input.session.chart.learningCredit !== 'course'
    ) {
      throw new AnalysisSessionConflictError(
        input.session.sessionId,
        'Practice-only historical sessions cannot create learning attempts.',
      );
    }
    const normalized = normalizeAttemptRecord(input.attemptRecord);
    const chartEvidenceMatches =
      input.session.chart.kind === 'synthetic'
        ? input.session.chart.generatorVersion === normalized.generatorVersion &&
          (normalized.analysisChartIdentity === undefined ||
            analysisChartIdentitiesEqual(input.session.chart, normalized.analysisChartIdentity))
        : normalized.analysisChartIdentity !== undefined &&
          analysisChartIdentitiesEqual(input.session.chart, normalized.analysisChartIdentity);
    if (
      input.session.attemptId !== normalized.attempt.id ||
      input.session.exerciseId !== normalized.attempt.exerciseId ||
      input.session.contentVersionId !== normalized.attempt.contentVersionId ||
      input.session.exerciseSchemaVersion !== normalized.exerciseVersion ||
      !chartEvidenceMatches ||
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
      assertFinalizationTransition(persistedSession, input.session);
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

  public async finalizePracticeAnalysisSession(
    session: GuidedAnalysisSession,
  ): Promise<FinalizePracticeAnalysisSessionResult> {
    assertValidGuidedAnalysisSession(session);
    if (
      session.status !== 'finalized' ||
      session.chart.kind !== 'historical' ||
      session.chart.learningCredit !== 'none'
    ) {
      throw new AnalysisSessionConflictError(
        session.sessionId,
        'Practice finalization requires a finalized, non-credit historical session.',
      );
    }
    await this.initializeAdapter();
    const migrationAt = this.now();
    return this.adapter.transact<FinalizePracticeAnalysisSessionResult>((raw) => {
      const current = migratePersistence(raw, this.contentVersion, migrationAt).snapshot;
      const sessionIndex = current.analysisSessions.findIndex(
        ({ sessionId }) => sessionId === session.sessionId,
      );
      const persisted = current.analysisSessions[sessionIndex];
      if (!persisted) throw new AnalysisSessionNotFoundError(session.sessionId);
      const inserted = assertFinalizationTransition(persisted, session);
      if (!inserted) {
        return {
          nextValue: canonicalStringify(current),
          result: {
            session: cloneSession(persisted),
            inserted: false,
            snapshot: cloneSnapshot(current),
          },
        };
      }
      const sessions = [...current.analysisSessions];
      sessions[sessionIndex] = cloneSession(session);
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata: withSessionUpdatedAt(current, session.updatedAt),
        analysisSessions: sessions,
      };
      return {
        nextValue: canonicalStringify(snapshot),
        result: {
          session: cloneSession(session),
          inserted: true,
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

  public async discardQuarantinedPaperExecutionSessions(
    quarantineIds: readonly string[],
    recoveredAt: string = this.now(),
  ): Promise<PersistenceSnapshot> {
    assertUtcTimestamp(recoveredAt, 'recoveredAt');
    quarantineIds.forEach((id, index) => assertNonEmptyString(id, `quarantineIds[${index}]`));
    const ids = new Set(quarantineIds);
    await this.initializeAdapter();
    return this.adapter.transact((raw) => {
      const current = migratePersistence(raw, this.contentVersion, recoveredAt).snapshot;
      const quarantinedPaperExecutionSessions = current.quarantinedPaperExecutionSessions.filter(
        ({ quarantineId }) => !ids.has(quarantineId),
      );
      const snapshot: PersistenceSnapshot = {
        ...current,
        metadata:
          quarantinedPaperExecutionSessions.length ===
          current.quarantinedPaperExecutionSessions.length
            ? current.metadata
            : withSessionUpdatedAt(current, recoveredAt),
        quarantinedPaperExecutionSessions,
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
      allowPaperExecutionSessionDeletion: true,
    }));
  }

  public async close(): Promise<void> {
    await this.adapter.close?.();
    this.adapterInitialization = undefined;
  }
}
