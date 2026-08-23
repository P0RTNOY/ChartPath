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

import { contentVersion } from '@chartpath/content';
import {
  gradeAnswer,
  type AttemptResult,
  type Exercise,
  type ExerciseAnswer,
  type GeneratedChart,
} from '@chartpath/domain';

import {
  createPlatformPersistenceAdapter,
  LearningRepository,
  type LearnerSettingsPatch,
  type PersistenceSnapshot,
} from '@/lib/persistence';
import { boundedAttemptTiming } from '@/data/attempt-timing';

export const DISCLAIMER_VERSION = 'chartpath-education-he-2026-08';

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

interface LearningContextValue {
  readonly status: 'loading' | 'ready' | 'error';
  readonly error: string | null;
  readonly snapshot: PersistenceSnapshot | null;
  readonly updateSettings: (patch: LearnerSettingsPatch) => Promise<void>;
  readonly acceptDisclaimer: (dailyGoalMinutes: number) => Promise<void>;
  readonly submitAttempt: (input: AttemptSubmission) => Promise<AttemptResult>;
  readonly resetData: () => Promise<void>;
  readonly reload: () => Promise<void>;
}

const LearningContext = createContext<LearningContextValue | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'אירעה שגיאה לא צפויה.';
}

function localDate(timestamp: string): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function LearningProvider({ children }: { readonly children: ReactNode }) {
  const repositoryRef = useRef<LearningRepository | null>(null);
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
      // Timing is diagnostic only. A suspended/backgrounded app must not make
      // the learner's answer impossible to save after a long session.
      const { responseTimeMs, activeMinutes } = boundedAttemptTiming(input.startedAt, submittedAt);
      const append = await repository().appendAttempt({
        attempt: {
          id: attemptId,
          exerciseId: input.exercise.id,
          contentVersionId: contentVersion.id,
          startedAt: input.startedAt,
          submittedAt,
          answer: input.answer,
          result,
          hintIdsUsed: input.hintIdsUsed,
          responseTimeMs,
        },
        lessonId: input.lessonId,
        skillIds: input.exercise.skillIds,
        difficulty: input.exercise.difficulty,
        exerciseVersion: input.exercise.schemaVersion,
        generatorVersion: input.exercise.chartSpec?.generatorVersion,
        isReview: input.isReview ?? false,
        xpAwarded: result.correct ? 20 : Math.max(4, Math.round(result.score * 12)),
        activityDate: localDate(submittedAt),
        dailyGoalMinutes: snapshot.settings.dailyGoalMinutes,
        activeMinutes,
        completesLesson: input.completesLesson ?? false,
      });
      setSnapshot(append.snapshot);
      return result;
    },
    [repository, snapshot],
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
      resetData,
      reload,
    }),
    [acceptDisclaimer, error, reload, resetData, snapshot, status, submitAttempt, updateSettings],
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning(): LearningContextValue {
  const value = useContext(LearningContext);
  if (!value) throw new Error('useLearning must be used inside LearningProvider');
  return value;
}
