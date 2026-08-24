import type {
  AnalysisChartIdentity,
  Attempt,
  DailyActivity,
  Difficulty,
  GuidedAnalysisSession,
  LessonId,
  PaperExecutionSession,
  ReviewState,
  SkillId,
  SkillMastery,
} from '@chartpath/domain';

export const CURRENT_PERSISTENCE_SCHEMA_VERSION = 5;
export const CURRENT_PROJECTOR_VERSION = 1;
export const ATTEMPT_RECORD_SCHEMA_VERSION = 1;

export type ThemePreference = 'system' | 'light' | 'dark';
export type TextScalePreference = 'system' | 'large' | 'extra-large';

export interface LearnerSettings {
  readonly theme: ThemePreference;
  readonly reducedMotion: boolean;
  readonly hapticsEnabled: boolean;
  readonly textScale: TextScalePreference;
  readonly dailyGoalMinutes: number;
  readonly disclaimerVersionAccepted: string | null;
  readonly disclaimerAcceptedAt: string | null;
}

export type LearnerSettingsPatch = Partial<LearnerSettings>;

export interface NewAttemptRecord {
  readonly attempt: Attempt;
  readonly lessonId: LessonId;
  readonly skillIds: readonly SkillId[];
  readonly difficulty: Difficulty;
  readonly exerciseVersion: number;
  readonly generatorVersion?: string;
  /** Pinned chart evidence. Required when a historical session grants course credit. */
  readonly analysisChartIdentity?: AnalysisChartIdentity;
  readonly isReview: boolean;
  readonly xpAwarded: number;
  /** Calendar date captured by the UI in the learner's local time zone. */
  readonly activityDate: string;
  /** Goal at submission time, so historical daily projections remain replayable. */
  readonly dailyGoalMinutes: number;
  readonly activeMinutes: number;
  readonly completesLesson: boolean;
}

/** Immutable source event stored locally. */
export interface PersistedAttempt extends NewAttemptRecord {
  readonly schemaVersion: typeof ATTEMPT_RECORD_SCHEMA_VERSION;
}

export type LessonProgressStatus = 'not-started' | 'in-progress' | 'completed';

export interface LessonProgress {
  readonly lessonId: LessonId;
  readonly status: LessonProgressStatus;
  readonly attemptCount: number;
  readonly correctAttemptCount: number;
  readonly earnedXp: number;
  readonly attemptedExerciseIds: readonly string[];
  readonly lastAttemptAt: string;
  readonly completedAt: string | null;
}

export interface LearningProjections {
  readonly projectorVersion: typeof CURRENT_PROJECTOR_VERSION;
  readonly lastAppliedAttemptId: string | null;
  readonly lessonProgress: Readonly<Record<LessonId, LessonProgress>>;
  readonly skillMastery: Readonly<Record<SkillId, SkillMastery>>;
  readonly reviewState: Readonly<Record<SkillId, ReviewState>>;
  readonly dailyActivity: Readonly<Record<string, DailyActivity>>;
  readonly totalXp: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
}

export interface PersistenceMetadata {
  readonly schemaVersion: typeof CURRENT_PERSISTENCE_SCHEMA_VERSION;
  readonly contentVersion: string;
  readonly projectorVersion: typeof CURRENT_PROJECTOR_VERSION;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PersistenceSnapshot {
  readonly metadata: PersistenceMetadata;
  readonly settings: LearnerSettings;
  readonly attempts: readonly PersistedAttempt[];
  readonly analysisSessions: readonly GuidedAnalysisSession[];
  readonly quarantinedAnalysisSessions: readonly QuarantinedAnalysisSession[];
  readonly paperExecutionSessions: readonly PaperExecutionSession[];
  readonly quarantinedPaperExecutionSessions: readonly QuarantinedPaperExecutionSession[];
  readonly projections: LearningProjections;
}

export interface QuarantinedAnalysisSession {
  readonly quarantineId: string;
  readonly sessionId?: string;
  readonly reason: string;
  /** Canonical JSON retained so recovery never silently discards a learner draft. */
  readonly payloadJson: string;
  readonly quarantinedAt: string;
}

export interface QuarantinedPaperExecutionSession {
  readonly quarantineId: string;
  readonly sessionId?: string;
  readonly reason: string;
  /** Canonical JSON retained so recovery never silently discards a paper-trade draft. */
  readonly payloadJson: string;
  readonly quarantinedAt: string;
}

/** Fixture shape retained so beta schema 1 can always migrate forward. */
export interface PersistenceSnapshotV1 {
  readonly schemaVersion: 1;
  readonly contentVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly settings: LearnerSettings;
  readonly attempts: readonly PersistedAttempt[];
}

/** Fixture shape retained so payload schema 2 can always migrate forward. */
export interface PersistenceSnapshotV2 {
  readonly metadata: {
    readonly schemaVersion: 2;
    readonly contentVersion: string;
    readonly projectorVersion: number;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly settings: LearnerSettings;
  readonly attempts: readonly PersistedAttempt[];
  readonly projections: LearningProjections;
}

/** Fixture shape retained so guided-analysis payload schema 3 can migrate forward. */
export interface PersistenceSnapshotV3 {
  readonly metadata: {
    readonly schemaVersion: 3;
    readonly contentVersion: string;
    readonly projectorVersion: number;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly settings: LearnerSettings;
  readonly attempts: readonly PersistedAttempt[];
  readonly analysisSessions: readonly unknown[];
  readonly quarantinedAnalysisSessions: readonly QuarantinedAnalysisSession[];
  readonly projections: LearningProjections;
}

/** Fixture shape retained so historical-replay payload schema 4 can migrate forward. */
export interface PersistenceSnapshotV4 {
  readonly metadata: {
    readonly schemaVersion: 4;
    readonly contentVersion: string;
    readonly projectorVersion: number;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly settings: LearnerSettings;
  readonly attempts: readonly PersistedAttempt[];
  readonly analysisSessions: readonly unknown[];
  readonly quarantinedAnalysisSessions: readonly QuarantinedAnalysisSession[];
  readonly projections: LearningProjections;
}

export interface RepositoryOptions {
  readonly contentVersion: string;
  /** Explicit clock keeps initialization and migrations reproducible in tests. */
  readonly now?: () => string;
}

export interface AppendAttemptResult {
  readonly attempt: PersistedAttempt;
  readonly inserted: boolean;
  readonly snapshot: PersistenceSnapshot;
}

export interface CreateOrResumeAnalysisSessionResult {
  readonly session: GuidedAnalysisSession;
  readonly created: boolean;
  readonly snapshot: PersistenceSnapshot;
}

export interface SaveAnalysisSessionResult {
  readonly session: GuidedAnalysisSession;
  readonly saved: boolean;
  readonly snapshot: PersistenceSnapshot;
}

export interface FinalizeAnalysisSessionInput {
  readonly session: GuidedAnalysisSession;
  readonly attemptRecord: NewAttemptRecord;
}

export interface FinalizeAnalysisSessionResult {
  readonly session: GuidedAnalysisSession;
  readonly attempt: PersistedAttempt;
  readonly inserted: boolean;
  readonly snapshot: PersistenceSnapshot;
}

export interface FinalizePracticeAnalysisSessionResult {
  readonly session: GuidedAnalysisSession;
  /** True only when this call performed the active-to-finalized transition. */
  readonly inserted: boolean;
  readonly snapshot: PersistenceSnapshot;
}

export interface CreateOrResumePaperExecutionSessionResult {
  readonly session: PaperExecutionSession;
  readonly created: boolean;
  readonly snapshot: PersistenceSnapshot;
}

export interface SavePaperExecutionSessionResult {
  readonly session: PaperExecutionSession;
  readonly saved: boolean;
  readonly snapshot: PersistenceSnapshot;
}

export interface MigrationResult {
  readonly snapshot: PersistenceSnapshot;
  readonly migrated: boolean;
  readonly fromSchemaVersion: number | null;
  readonly contentVersionChanged: boolean;
}

export const DEFAULT_SETTINGS: LearnerSettings = Object.freeze({
  theme: 'system',
  reducedMotion: false,
  hapticsEnabled: true,
  textScale: 'system',
  dailyGoalMinutes: 10,
  disclaimerVersionAccepted: null,
  disclaimerAcceptedAt: null,
});
