import type {
  Attempt,
  DailyActivity,
  Difficulty,
  LessonId,
  ReviewState,
  SkillId,
  SkillMastery,
} from '@chartpath/domain';

export const CURRENT_PERSISTENCE_SCHEMA_VERSION = 2;
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
  readonly projections: LearningProjections;
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
