import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { generateChart } from '@chartpath/chart-engine';
import { contentVersion, exercises, lessons } from '@chartpath/content';
import {
  ANALYSIS_WORKFLOW_STEP_IDS,
  analysisSessionHintIdsUsed,
  createGuidedAnalysisSession,
  gradeAnswer,
  reduceGuidedAnalysisSession,
  type AnalysisWorkflowStepId,
  type AtomicAnswerRubric,
  type AttemptResult,
  type CapstoneAnswer,
  type Exercise,
  type ExerciseAnswer,
  type GeneratedChart,
  type GuidedAnalysisSession,
} from '@chartpath/domain';

import {
  AnalysisSessionConflictError,
  AnalysisSessionNotFoundError,
  AttemptConflictError,
  createPlatformPersistenceAdapter,
  LearningRepository,
  PersistenceCorruptionError,
  UnsupportedPersistenceVersionError,
  type LearnerSettingsPatch,
  type NewAttemptRecord,
  type PersistenceSnapshot,
} from '@/lib/persistence';
import { boundedAttemptTiming } from '@/data/attempt-timing';

export const DISCLAIMER_VERSION = 'chartpath-education-he-2026-08';
export const GUIDED_ANALYSIS_EXERCISE_ID = 'u10-capstone-e03';
export const GUIDED_ANALYSIS_LESSON_ID = 'lesson-u10-capstone';

const INITIAL_GUIDED_REPLAY_CANDLE_COUNT = 24;

export interface AttemptSubmission {
  readonly exercise: Exercise;
  readonly lessonId: string;
  readonly answer: ExerciseAnswer;
  readonly chart?: GeneratedChart;
  readonly hintIdsUsed: readonly string[];
  readonly startedAt: string;
  readonly isReview?: boolean;
  readonly completesLesson?: boolean;
}

export interface LearningContextValue {
  readonly status: 'loading' | 'ready' | 'error';
  readonly error: string | null;
  readonly snapshot: PersistenceSnapshot | null;
  readonly updateSettings: (patch: LearnerSettingsPatch) => Promise<void>;
  readonly acceptDisclaimer: (dailyGoalMinutes: number) => Promise<void>;
  readonly submitAttempt: (input: AttemptSubmission) => Promise<AttemptResult>;
  readonly createOrResumeAnalysisSession: () => Promise<GuidedAnalysisSession>;
  readonly saveAnalysisSession: (session: GuidedAnalysisSession) => Promise<GuidedAnalysisSession>;
  readonly abandonAnalysisSession: (sessionId: string) => Promise<GuidedAnalysisSession>;
  readonly restartAnalysisSession: (sessionId: string) => Promise<GuidedAnalysisSession>;
  readonly finalizeAnalysisSession: (session: GuidedAnalysisSession) => Promise<AttemptResult>;
  /** Explicit recovery only removes selected quarantined drafts; attempt history is untouched. */
  readonly discardQuarantinedAnalysisSessions: (quarantineIds: readonly string[]) => Promise<void>;
  readonly resetData: () => Promise<void>;
  readonly reload: () => Promise<void>;
}

const LearningContext = createContext<LearningContextValue | null>(null);

function errorMessage(error: unknown): string {
  if (error instanceof UnsupportedPersistenceVersionError)
    return 'גרסת נתוני הלמידה המקומיים חדשה יותר מגרסת היישום. עדכנו את היישום לפני פתיחת הנתונים.';
  if (error instanceof PersistenceCorruptionError)
    return 'נתוני הלמידה המקומיים פגומים. היסטוריית הניסיונות לא נמחקה; אפשר לבחור פעולת שחזור מפורשת.';
  if (error instanceof AnalysisSessionNotFoundError)
    return 'טיוטת הניתוח לא נמצאה. חזרו להיסטוריית הניתוחים ובחרו טיוטה זמינה.';
  if (error instanceof AnalysisSessionConflictError)
    return 'טיוטת הניתוח השתנתה מאז שנפתחה. טענו אותה מחדש לפני המשך העריכה.';
  if (error instanceof AttemptConflictError)
    return 'הניתוח כבר נשמר עם נתונים אחרים. טענו מחדש את היסטוריית הלמידה לפני ניסיון נוסף.';
  return error instanceof Error ? error.message : 'אירעה שגיאה לא צפויה.';
}

function localDate(timestamp: string): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function xpForResult(result: AttemptResult): number {
  return result.correct ? 20 : Math.max(4, Math.round(result.score * 12));
}

interface AttemptRecordInput {
  readonly attemptId: string;
  readonly exercise: Exercise;
  readonly lessonId: string;
  readonly answer: ExerciseAnswer;
  readonly result: AttemptResult;
  readonly hintIdsUsed: readonly string[];
  readonly startedAt: string;
  readonly submittedAt: string;
  readonly isReview: boolean;
  readonly completesLesson: boolean;
  readonly dailyGoalMinutes: number;
}

/** Shared immutable event construction for ordinary and guided submissions. */
export function createAttemptRecord(input: AttemptRecordInput): NewAttemptRecord {
  const { responseTimeMs, activeMinutes } = boundedAttemptTiming(
    input.startedAt,
    input.submittedAt,
  );
  return {
    attempt: {
      id: input.attemptId,
      exerciseId: input.exercise.id,
      contentVersionId: contentVersion.id,
      startedAt: input.startedAt,
      submittedAt: input.submittedAt,
      answer: input.answer,
      result: input.result,
      hintIdsUsed: [...new Set(input.hintIdsUsed)],
      responseTimeMs,
    },
    lessonId: input.lessonId,
    skillIds: input.exercise.skillIds,
    difficulty: input.exercise.difficulty,
    exerciseVersion: input.exercise.schemaVersion,
    generatorVersion: input.exercise.chartSpec?.generatorVersion,
    isReview: input.isReview,
    xpAwarded: xpForResult(input.result),
    activityDate: localDate(input.submittedAt),
    dailyGoalMinutes: input.dailyGoalMinutes,
    activeMinutes,
    completesLesson: input.completesLesson,
  };
}

function guidedAnalysisContent() {
  const exercise = exercises.find(({ id }) => id === GUIDED_ANALYSIS_EXERCISE_ID);
  const lesson = lessons.find(({ id }) => id === GUIDED_ANALYSIS_LESSON_ID);
  if (
    !exercise?.chartSpec ||
    exercise.rubric.kind !== 'capstone' ||
    exercise.capstoneSteps?.length !== ANALYSIS_WORKFLOW_STEP_IDS.length ||
    !lesson ||
    !lesson.exerciseIds.includes(exercise.id)
  ) {
    throw new Error('תוכן הניתוח המונחה שנבדק אינו זמין בגרסה זו.');
  }
  const chart = generateChart(exercise.chartSpec);
  const decisionCandleIndex = chart.spec.decisionCandleIndex ?? chart.candles.at(-1)?.index;
  if (decisionCandleIndex === undefined) {
    throw new Error('גרף הניתוח המונחה אינו כולל נקודת החלטה תקפה.');
  }
  return { exercise, lesson, chart, decisionCandleIndex };
}

function allocateGuidedAnalysisSession(createdAt: string): GuidedAnalysisSession {
  const { exercise, chart, decisionCandleIndex } = guidedAnalysisContent();
  const token = `${Date.parse(createdAt).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return createGuidedAnalysisSession({
    sessionId: `analysis-session-${token}`,
    attemptId: `analysis-attempt-${token}`,
    finalizationIdempotencyKey: `analysis-finalization-${token}`,
    exerciseId: exercise.id,
    contentVersionId: contentVersion.id,
    exerciseSchemaVersion: exercise.schemaVersion,
    chart: {
      id: chart.spec.id,
      seed: chart.spec.seed,
      generatorVersion: chart.spec.generatorVersion,
      candleCount: chart.candles.length,
      decisionCandleIndex,
    },
    createdAt,
    initialReplayCursorCandleIndex: Math.min(
      INITIAL_GUIDED_REPLAY_CANDLE_COUNT - 1,
      decisionCandleIndex,
    ),
    workflowStepIds: ANALYSIS_WORKFLOW_STEP_IDS,
    stepRubrics: Object.fromEntries(
      exercise.capstoneSteps!.map((step) => [step.id, step.rubric]),
    ) as Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>,
  });
}

function capstoneAnswerForSession(session: GuidedAnalysisSession): CapstoneAnswer {
  const stepAnswers = ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => {
    const answer = session.steps[stepId].answer;
    if (!answer) throw new Error(`שלב הניתוח ${stepId} עדיין אינו מלא.`);
    return { stepId, answer };
  });
  return { kind: 'capstone', stepAnswers };
}

function guidedAnalysisCompletesLesson(
  snapshot: PersistenceSnapshot,
  lessonExerciseIds: readonly string[],
): boolean {
  const attempted = new Set(
    snapshot.projections.lessonProgress[GUIDED_ANALYSIS_LESSON_ID]?.attemptedExerciseIds ?? [],
  );
  return lessonExerciseIds
    .filter((exerciseId) => exerciseId !== GUIDED_ANALYSIS_EXERCISE_ID)
    .every((exerciseId) => attempted.has(exerciseId));
}

function localizedGuidedAnalysisError(reason: unknown): Error {
  return new Error(errorMessage(reason), { cause: reason });
}

export interface LearningProviderProps {
  readonly children: ReactNode;
  /** Test/offline composition seam; production always uses the platform adapter. */
  readonly repositoryOverride?: LearningRepository;
}

export function LearningProvider({ children, repositoryOverride }: LearningProviderProps) {
  const repositoryRef = useRef<LearningRepository | null>(repositoryOverride ?? null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<PersistenceSnapshot | null>(null);

  const repository = useCallback((): LearningRepository => {
    repositoryRef.current ??= new LearningRepository(createPlatformPersistenceAdapter(), {
      contentVersion: contentVersion.id,
    });
    return repositoryRef.current;
  }, []);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const next = await repository().initialize();
      setSnapshot(next);
      setStatus('ready');
    } catch (reason) {
      setError(errorMessage(reason));
      setStatus('error');
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    void repository()
      .initialize()
      .then((next) => {
        if (!active) return;
        setSnapshot(next);
        setStatus('ready');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(errorMessage(reason));
        setStatus('error');
      });
    return () => {
      active = false;
      void repositoryRef.current?.close();
    };
  }, [repository]);

  const updateSettings = useCallback(
    async (patch: LearnerSettingsPatch) => {
      const next = await repository().updateSettings(patch);
      setSnapshot(next);
    },
    [repository],
  );

  const acceptDisclaimer = useCallback(
    async (dailyGoalMinutes: number) => {
      const now = new Date().toISOString();
      const next = await repository().updateSettings(
        {
          dailyGoalMinutes,
          disclaimerAcceptedAt: now,
          disclaimerVersionAccepted: DISCLAIMER_VERSION,
        },
        now,
      );
      setSnapshot(next);
    },
    [repository],
  );

  const submitAttempt = useCallback(
    async (input: AttemptSubmission): Promise<AttemptResult> => {
      if (!snapshot) throw new Error('הנתונים עדיין נטענים.');
      const submittedAt = new Date().toISOString();
      const result = gradeAnswer(
        input.exercise.rubric,
        input.answer,
        input.chart
          ? {
              candles: input.chart.candles,
              decisionCandleIndex: input.chart.spec.decisionCandleIndex,
            }
          : undefined,
      );
      const attemptId = `${input.exercise.id}:${submittedAt}:${Math.random().toString(36).slice(2, 8)}`;
      const append = await repository().appendAttempt(
        createAttemptRecord({
          attemptId,
          exercise: input.exercise,
          lessonId: input.lessonId,
          answer: input.answer,
          result,
          hintIdsUsed: input.hintIdsUsed,
          startedAt: input.startedAt,
          submittedAt,
          isReview: input.isReview ?? false,
          completesLesson: input.completesLesson ?? false,
          dailyGoalMinutes: snapshot.settings.dailyGoalMinutes,
        }),
      );
      setSnapshot(append.snapshot);
      return result;
    },
    [repository, snapshot],
  );

  const createOrResumeAnalysisSession = useCallback(async (): Promise<GuidedAnalysisSession> => {
    try {
      const createdAt = new Date().toISOString();
      const created = await repository().createOrResumeAnalysisSession(
        allocateGuidedAnalysisSession(createdAt),
      );
      setSnapshot(created.snapshot);
      return created.session;
    } catch (reason) {
      throw localizedGuidedAnalysisError(reason);
    }
  }, [repository]);

  const saveAnalysisSession = useCallback(
    async (session: GuidedAnalysisSession): Promise<GuidedAnalysisSession> => {
      try {
        const saved = await repository().saveAnalysisSession(session);
        setSnapshot(saved.snapshot);
        return saved.session;
      } catch (reason) {
        throw localizedGuidedAnalysisError(reason);
      }
    },
    [repository],
  );

  const abandonAnalysisSession = useCallback(
    async (sessionId: string): Promise<GuidedAnalysisSession> => {
      try {
        const abandonedAt = new Date().toISOString();
        const abandoned = await repository().abandonAnalysisSession(sessionId, abandonedAt);
        setSnapshot(abandoned.snapshot);
        return abandoned.session;
      } catch (reason) {
        throw localizedGuidedAnalysisError(reason);
      }
    },
    [repository],
  );

  const restartAnalysisSession = useCallback(
    async (sessionId: string): Promise<GuidedAnalysisSession> => {
      try {
        const restartedAt = new Date().toISOString();
        const restarted = await repository().restartAnalysisSession(
          sessionId,
          allocateGuidedAnalysisSession(restartedAt),
          restartedAt,
        );
        setSnapshot(restarted.snapshot);
        return restarted.session;
      } catch (reason) {
        throw localizedGuidedAnalysisError(reason);
      }
    },
    [repository],
  );

  const finalizeAnalysisSession = useCallback(
    async (session: GuidedAnalysisSession): Promise<AttemptResult> => {
      if (!snapshot) throw new Error('הנתונים עדיין נטענים.');
      try {
        const { exercise, lesson, chart, decisionCandleIndex } = guidedAnalysisContent();
        if (session.status === 'abandoned') {
          throw new Error('ניתוח שננטש נשמר בהיסטוריה ואי אפשר להשלים אותו. פתחו ניתוח חדש.');
        }
        if (
          session.status === 'active' &&
          ANALYSIS_WORKFLOW_STEP_IDS.some((stepId) => session.steps[stepId].status !== 'submitted')
        ) {
          throw new Error('יש להגיש את כל 11 שלבי הניתוח לפני השלמה סופית.');
        }
        if (
          session.exerciseId !== exercise.id ||
          session.contentVersionId !== contentVersion.id ||
          session.exerciseSchemaVersion !== exercise.schemaVersion ||
          session.chart.id !== chart.spec.id ||
          session.chart.seed !== chart.spec.seed ||
          session.chart.generatorVersion !== chart.spec.generatorVersion ||
          session.chart.candleCount !== chart.candles.length ||
          session.chart.decisionCandleIndex !== decisionCandleIndex
        ) {
          throw new Error(
            'טיוטת הניתוח אינה תואמת לתוכן ולגרף שנבדקו בגרסה זו. פתחו ניתוח חדש ושמרו את הטיוטה הישנה בהיסטוריה.',
          );
        }

        const answer = capstoneAnswerForSession(session);
        const chartEvidence = {
          candles: chart.candles,
          decisionCandleIndex,
        };
        // The aggregate capstone grader deterministically grades the authored rubric for all 11
        // steps. The persisted per-step results remain useful for the debrief, but do not replace it.
        const finalResult = gradeAnswer(exercise.rubric, answer, chartEvidence);

        const existingAttempt = snapshot.attempts.find(
          ({ attempt }) => attempt.id === session.attemptId,
        );
        if (session.status === 'finalized' && existingAttempt) {
          const retried = await repository().finalizeAnalysisSession({
            session,
            attemptRecord: existingAttempt,
          });
          setSnapshot(retried.snapshot);
          return retried.session.finalResult ?? finalResult;
        }

        const finalizedAt = session.finalizedAt ?? new Date().toISOString();
        const finalized = reduceGuidedAnalysisSession(session, {
          type: 'finalize',
          attemptId: session.attemptId,
          idempotencyKey: session.finalizationIdempotencyKey,
          finalResult,
          finalizedAt,
        });
        const finalizedAttempt = createAttemptRecord({
          attemptId: session.attemptId,
          exercise,
          lessonId: lesson.id,
          answer,
          result: finalResult,
          hintIdsUsed: analysisSessionHintIdsUsed(session),
          startedAt: session.createdAt,
          submittedAt: finalizedAt,
          isReview: false,
          completesLesson: guidedAnalysisCompletesLesson(snapshot, lesson.exerciseIds),
          dailyGoalMinutes: snapshot.settings.dailyGoalMinutes,
        });
        const stored = await repository().finalizeAnalysisSession({
          session: finalized,
          attemptRecord: finalizedAttempt,
        });
        setSnapshot(stored.snapshot);
        return stored.session.finalResult ?? finalResult;
      } catch (reason) {
        if (
          reason instanceof AnalysisSessionConflictError ||
          reason instanceof AttemptConflictError
        ) {
          // A process interruption or double press can leave the caller with the active in-memory
          // object after the atomic transaction already committed. Read back the immutable pair and
          // recognize the same allocation as a successful idempotent retry.
          const refreshed = await repository().load();
          setSnapshot(refreshed);
          const persistedSession = refreshed.analysisSessions.find(
            ({ sessionId }) => sessionId === session.sessionId,
          );
          const persistedAttempt = refreshed.attempts.find(
            ({ attempt }) => attempt.id === session.attemptId,
          );
          if (
            persistedSession?.status === 'finalized' &&
            persistedSession.attemptId === session.attemptId &&
            persistedSession.finalizationIdempotencyKey === session.finalizationIdempotencyKey &&
            persistedAttempt
          ) {
            return persistedSession.finalResult!;
          }
        }
        throw localizedGuidedAnalysisError(reason);
      }
    },
    [repository, snapshot],
  );

  const discardQuarantinedAnalysisSessions = useCallback(
    async (quarantineIds: readonly string[]): Promise<void> => {
      try {
        const recoveredAt = new Date().toISOString();
        const next = await repository().discardQuarantinedAnalysisSessions(
          quarantineIds,
          recoveredAt,
        );
        setSnapshot(next);
      } catch (reason) {
        throw localizedGuidedAnalysisError(reason);
      }
    },
    [repository],
  );

  const resetData = useCallback(async () => {
    const next = await repository().reset();
    setSnapshot(next);
    setError(null);
    setStatus('ready');
  }, [repository]);

  const value = useMemo<LearningContextValue>(
    () => ({
      status,
      error,
      snapshot,
      updateSettings,
      acceptDisclaimer,
      submitAttempt,
      createOrResumeAnalysisSession,
      saveAnalysisSession,
      abandonAnalysisSession,
      restartAnalysisSession,
      finalizeAnalysisSession,
      discardQuarantinedAnalysisSessions,
      resetData,
      reload,
    }),
    [
      abandonAnalysisSession,
      acceptDisclaimer,
      createOrResumeAnalysisSession,
      discardQuarantinedAnalysisSessions,
      error,
      finalizeAnalysisSession,
      reload,
      resetData,
      restartAnalysisSession,
      saveAnalysisSession,
      snapshot,
      status,
      submitAttempt,
      updateSettings,
    ],
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning(): LearningContextValue {
  const value = useContext(LearningContext);
  if (!value) throw new Error('useLearning must be used inside LearningProvider');
  return value;
}
