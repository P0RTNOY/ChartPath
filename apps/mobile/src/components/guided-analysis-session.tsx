import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, useWindowDimensions, View } from 'react-native';

import {
  contentVersion,
  exercises,
  misconceptions,
  type ContentExercise,
  type WorkflowStepId,
} from '@chartpath/content';
import {
  ANALYSIS_WORKFLOW_STEP_IDS,
  analysisSessionHintIdsUsed,
  reduceGuidedAnalysisSession,
  type AnalysisWorkflowStepId,
  type AtomicExerciseAnswer,
  type CapstoneAnswer,
  type GuidedAnalysisSession,
  type GuidedAnalysisSessionAction,
} from '@chartpath/domain';
import {
  Badge,
  Button,
  Card,
  Heading,
  LtrText,
  ProgressBar,
  Screen,
  UiText,
  useTheme,
} from '@chartpath/ui';

import {
  CAPSTONE_STEP_LABELS,
  CapstoneInteraction,
  type CapstoneAnswerMap,
  type CapstoneExercise,
  type CapstoneStepStatusMap,
} from './capstone-interaction';
import { GuidedAnalysisChart } from './guided-analysis-chart';
import { TopBar } from './top-bar';
import { GUIDED_ANALYSIS_EXERCISE_ID, useLearning } from '@/state/learning';
import { skillById } from '@/data/catalog';
import { matchingAlternativeExplanation } from '@/data/feedback-answer-ids';

type SaveStatus = 'saved' | 'saving' | 'error';

function canonicalExercise(): CapstoneExercise {
  const exercise = exercises.find(({ id }) => id === GUIDED_ANALYSIS_EXERCISE_ID);
  if (
    !exercise ||
    exercise.rubric.kind !== 'capstone' ||
    exercise.capstoneSteps?.length !== ANALYSIS_WORKFLOW_STEP_IDS.length
  ) {
    throw new Error('תוכן הניתוח המונחה אינו זמין.');
  }
  return exercise as CapstoneExercise;
}

function answerMap(session: GuidedAnalysisSession): CapstoneAnswerMap {
  return Object.fromEntries(
    ANALYSIS_WORKFLOW_STEP_IDS.flatMap((stepId) => {
      const answer = session.steps[stepId].answer;
      return answer ? [[stepId, answer] as const] : [];
    }),
  ) as CapstoneAnswerMap;
}

function statusMap(session: GuidedAnalysisSession): CapstoneStepStatusMap {
  return Object.fromEntries(
    ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => [
      stepId,
      session.status === 'finalized' ? 'finalized' : session.steps[stepId].status,
    ]),
  ) as CapstoneStepStatusMap;
}

function monotonicNow(session: GuidedAnalysisSession): string {
  const system = Date.now();
  const previous = Date.parse(session.updatedAt);
  return new Date(Math.max(system, previous)).toISOString();
}

function submittedCount(session: GuidedAnalysisSession): number {
  return ANALYSIS_WORKFLOW_STEP_IDS.filter((id) => session.steps[id].status === 'submitted').length;
}

function firstPendingIndex(session: GuidedAnalysisSession): number {
  const index = ANALYSIS_WORKFLOW_STEP_IDS.findIndex(
    (stepId) => session.steps[stepId].status !== 'submitted',
  );
  return index < 0 ? ANALYSIS_WORKFLOW_STEP_IDS.length - 1 : index;
}

function annotationDescription(annotation: GuidedAnalysisSession['annotations'][number]): string {
  switch (annotation.kind) {
    case 'point':
      return `נקודה: נר ${annotation.anchor.candleIndex}, מחיר ${annotation.anchor.price.toFixed(2)}`;
    case 'horizontal-level':
      return `רמה: ${annotation.price.toFixed(2)} בנר ${annotation.candleIndex}`;
    case 'trendline':
      return `קו: נרות ${annotation.start.candleIndex}–${annotation.end.candleIndex}`;
    case 'zone':
      return `אזור: נרות ${annotation.start.candleIndex}–${annotation.end.candleIndex}`;
  }
}

function sourceLabel(exercise: ContentExercise): string {
  return exercise.sourceReferences
    .map(
      (reference) =>
        `PDF ${reference.pageStart}–${reference.pageEnd} / ספר ${reference.bookPageStart}–${reference.bookPageEnd}`,
    )
    .join(' · ');
}

function sessionMatchesExercise(
  session: GuidedAnalysisSession,
  exercise: CapstoneExercise,
): boolean {
  const chartSpec = exercise.chartSpec;
  const permittedCandleCount =
    chartSpec?.decisionCandleIndex === undefined
      ? chartSpec?.candleCount
      : Math.min(chartSpec.candleCount, chartSpec.decisionCandleIndex + 1);
  return Boolean(
    chartSpec &&
    session.exerciseId === exercise.id &&
    session.contentVersionId === contentVersion.id &&
    session.exerciseSchemaVersion === exercise.schemaVersion &&
    session.chart.id === chartSpec.id &&
    session.chart.seed === chartSpec.seed &&
    session.chart.generatorVersion === chartSpec.generatorVersion &&
    session.chart.candleCount === permittedCandleCount &&
    session.chart.decisionCandleIndex === chartSpec.decisionCandleIndex,
  );
}

function capstoneAnswer(session: GuidedAnalysisSession): CapstoneAnswer | null {
  const stepAnswers = ANALYSIS_WORKFLOW_STEP_IDS.flatMap((stepId) => {
    const answer = session.steps[stepId].answer;
    return answer ? [{ stepId, answer }] : [];
  });
  return stepAnswers.length === ANALYSIS_WORKFLOW_STEP_IDS.length
    ? { kind: 'capstone', stepAnswers }
    : null;
}

function GuidedDebrief({ session }: { readonly session: GuidedAnalysisSession }) {
  const theme = useTheme();
  const learning = useLearning();
  const exercise = useMemo(() => canonicalExercise(), []);
  const [starting, setStarting] = useState(false);
  const result = session.finalResult;
  if (!result) return null;
  const hints = new Set(analysisSessionHintIdsUsed(session));
  const rubricMisconceptions = misconceptions.filter((item) =>
    result.misconceptionIds.includes(item.id),
  );
  const submittedAnswer = capstoneAnswer(session);
  const alternative = matchingAlternativeExplanation(
    exercise.alternativeExplanations,
    submittedAnswer,
    result,
  );
  const demonstrated = result.correct
    ? exercise.skillIds
    : exercise.skillIds.filter(
        (skillId) => (learning.snapshot?.projections.skillMastery[skillId]?.score ?? 0) >= 0.7,
      );
  const review = exercise.skillIds.filter((skillId) => !demonstrated.includes(skillId));
  const scheduledReviews = exercise.skillIds.flatMap((skillId) => {
    const state = learning.snapshot?.projections.reviewState[skillId];
    return state ? [state] : [];
  });
  const management = session.steps.management;
  const safeDecision =
    management.result?.correct &&
    management.answer?.kind === 'decision' &&
    ['wait', 'reject', 'no-trade', 'insufficient-evidence'].includes(management.answer.decision);

  const startNew = async () => {
    setStarting(true);
    try {
      const created = await learning.createOrResumeAnalysisSession();
      router.replace(`/analysis?sessionId=${encodeURIComponent(created.sessionId)}` as Href);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen
      accessibilityLabel="תחקיר ניתוח מונחה"
      contentContainerStyle={{ gap: theme.spacing.xl }}
      scroll
      testID="guided-analysis-debrief"
    >
      <TopBar back subtitle="נשמר לקריאה בלבד" title="תחקיר תהליך מלא" />

      <Card variant="accent">
        <View style={{ gap: theme.spacing.md }}>
          <Badge tone={result.correct ? 'success' : 'warning'}>
            {result.correct ? 'כל 11 השלבים מדויקים' : 'הניתוח הושלם ונשמר'}
          </Badge>
          <Heading level={1}>ציון תהליך</Heading>
          <LtrText color="primary" style={{ fontSize: 42 }} variant="numeric">
            {`${Math.round(result.score * 100)}%`}
          </LtrText>
          <UiText>{alternative?.explanationHe ?? exercise.explanationHe}</UiText>
          <UiText color="textMuted" variant="caption">
            הציון מתאר התאמה לרובריקה שנקבעה מראש. הוא אינו מתאר רווח או הפסד ואינו המלצה לפעולה.
          </UiText>
        </View>
      </Card>

      {safeDecision ? (
        <Card variant="subtle">
          <UiText variant="label">תועדה נכון גם החלטה לא לפעול.</UiText>
          <UiText color="textMuted" variant="bodySmall">
            ״אין עסקה״ היא תשובת תהליך מלאה במקרה הזה, ולא תחזית למחיר מאוחר יותר.
          </UiText>
        </Card>
      ) : undefined}

      <View style={{ gap: theme.spacing.sm }}>
        <Heading level={2}>פירוט 11 השלבים</Heading>
        {ANALYSIS_WORKFLOW_STEP_IDS.map((stepId, index) => {
          const step = session.steps[stepId];
          return (
            <Card key={stepId} padding="sm" variant="outlined">
              <View style={{ gap: 6 }}>
                <View
                  style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
                >
                  <LtrText color="primary" variant="numeric">
                    {index + 1}
                  </LtrText>
                  <UiText style={{ flex: 1 }} variant="label">
                    {CAPSTONE_STEP_LABELS[stepId]}
                  </UiText>
                  <Badge tone={step.result?.correct ? 'success' : 'warning'}>
                    {step.result?.correct ? 'מדויק' : 'לחזרה'}
                  </Badge>
                  <LtrText color="textMuted" variant="numeric">
                    {`${Math.round((step.result?.score ?? 0) * 100)}%`}
                  </LtrText>
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      <Card variant="outlined">
        <View style={{ gap: theme.spacing.sm }}>
          <Heading level={3}>מיומנויות ותזכורות</Heading>
          <UiText variant="label">מיומנויות שהודגמו</UiText>
          <UiText color="textMuted" variant="bodySmall">
            {demonstrated.map((id) => skillById.get(id)?.titleHe ?? id).join(' · ') ||
              'טרם זוהתה מיומנות מעל סף 70%.'}
          </UiText>
          <UiText variant="label">מיומנויות לחזרה</UiText>
          <UiText color="textMuted" variant="bodySmall">
            {review.map((id) => skillById.get(id)?.titleHe ?? id).join(' · ') ||
              'אין כרגע פריט נוסף שנדרש לחזרה.'}
          </UiText>
          {rubricMisconceptions.length ? (
            <>
              <UiText variant="label">נושאים שהרובריקה מפנה אליהם</UiText>
              {rubricMisconceptions.map((item) => (
                <UiText key={item.id} color="textMuted" variant="bodySmall">
                  {item.titleHe}: {item.explanationHe}
                </UiText>
              ))}
            </>
          ) : undefined}
          <UiText variant="label">רמזים שנפתחו</UiText>
          <LtrText color="textMuted" variant="numeric">
            {`${hints.size}/${exercise.hints.length}`}
          </LtrText>
          <UiText variant="label">דיוק סיכון וגודל פוזיציה</UiText>
          <LtrText color="textMuted" variant="numeric">
            {`${Math.round((((session.steps['position-size'].result?.score ?? 0) + (session.steps.target.result?.score ?? 0)) / 2) * 100)}%`}
          </LtrText>
          <UiText variant="label">חזרה מתוזמנת</UiText>
          <UiText color="textMuted" variant="bodySmall">
            {scheduledReviews.length
              ? scheduledReviews
                  .map(
                    (state) =>
                      `${skillById.get(state.skillId)?.titleHe ?? state.skillId}: ${new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(new Date(state.nextDueAt))}`,
                  )
                  .join(' · ')
              : 'לא נוצרה כרגע חזרה נוספת.'}
          </UiText>
        </View>
      </Card>

      <GuidedAnalysisChart
        disabled
        onAnnotationsChange={() => undefined}
        onReplayCursorChange={() => undefined}
        session={session}
      />

      <Card variant="outlined">
        <View style={{ gap: theme.spacing.sm }}>
          <Heading level={3}>סימוני המחברת שנשמרו</Heading>
          {session.annotations.length ? (
            session.annotations.map((annotation) => (
              <UiText key={annotation.id} color="textMuted" variant="bodySmall">
                {annotationDescription(annotation)}
              </UiText>
            ))
          ) : (
            <UiText color="textMuted" variant="bodySmall">
              לא נשמרו סימוני מחברת.
            </UiText>
          )}
          <UiText color="textMuted" variant="caption">
            אין גאומטריית ייחוס להצגה: רובריקות הקאפסטון שנבדק אינן רובריקות שרטוט.
          </UiText>
        </View>
      </Card>

      <Card variant="subtle">
        <View style={{ gap: 6 }}>
          <UiText variant="label">מקור התרחיש וכל 11 השלבים</UiText>
          <LtrText color="textMuted" variant="caption">
            {sourceLabel(exercise)}
          </LtrText>
          <UiText color="textMuted" variant="caption">
            {exercise.sourceReferences
              .map((reference) => reference.section)
              .filter(Boolean)
              .join(' · ')}
          </UiText>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button onPress={() => router.replace('/home')} style={{ flexGrow: 1 }} variant="secondary">
          חזרה למסלול
        </Button>
        <Button
          onPress={() => router.push('/analysis-history' as Href)}
          style={{ flexGrow: 1 }}
          variant="ghost"
        >
          היסטוריית ניתוחים
        </Button>
        <Button disabled={starting} onPress={() => void startNew()} style={{ flexGrow: 1 }}>
          {starting ? 'פותח ניתוח…' : 'ניתוח חדש'}
        </Button>
      </View>
    </Screen>
  );
}

export function GuidedAnalysisSessionView({
  persistedSession,
}: {
  readonly persistedSession: GuidedAnalysisSession;
}) {
  const theme = useTheme();
  const learning = useLearning();
  const { saveAnalysisSession } = learning;
  const { width } = useWindowDimensions();
  const exercise = useMemo(() => canonicalExercise(), []);
  const [session, setSession] = useState(persistedSession);
  const sessionRef = useRef(session);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const lastSaveFailed = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [message, setMessage] = useState<string | null>(null);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const enqueue = useCallback(
    (next: GuidedAnalysisSession) => {
      sessionRef.current = next;
      setSession(next);
      setSaveStatus('saving');
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          const saved = await saveAnalysisSession(next);
          lastSaveFailed.current = false;
          if (sessionRef.current.revision <= saved.revision) {
            sessionRef.current = saved;
            setSession(saved);
          }
          if (sessionRef.current.revision === saved.revision) setSaveStatus('saved');
        })
        .catch(() => {
          lastSaveFailed.current = true;
          setSaveStatus('error');
          setMessage('לא הצלחנו לשמור את השינוי. הטיוטה נשארה על המסך; נסו שוב לפני יציאה.');
        });
    },
    [saveAnalysisSession],
  );

  useEffect(() => {
    if (persistedSession.revision <= sessionRef.current.revision) return;
    sessionRef.current = persistedSession;
    setSession(persistedSession);
  }, [persistedSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' || sessionRef.current.status !== 'active') return;
      // Meaningful edits already save immediately. Re-enqueuing the exact latest revision here is
      // idempotent and also retries a failed write before the process can be suspended.
      enqueue(sessionRef.current);
    });
    return () => subscription?.remove();
  }, [enqueue]);

  if (persistedSession.status === 'finalized') return <GuidedDebrief session={persistedSession} />;
  if (persistedSession.status === 'abandoned') {
    return (
      <Screen contentContainerStyle={{ gap: theme.spacing.xl }} scroll>
        <TopBar back subtitle="טיוטה שננטשה" title="הניתוח אינו ניתן לעריכה" />
        <Card variant="outlined">
          <UiText>
            הטיוטה נשמרה בהיסטוריה אך אינה פתוחה לעריכה. אפשר להתחיל ניתוח חדש ממעבדת הגרפים.
          </UiText>
        </Card>
        <Button onPress={() => router.replace('/lab')}>חזרה למעבדה</Button>
      </Screen>
    );
  }

  const exitAfterSave = async () => {
    setMessage(null);
    await saveQueue.current;
    if (lastSaveFailed.current) {
      setMessage('לא ניתן לצאת בבטחה לפני שהטיוטה נשמרת. בצעו שינוי קטן כדי לנסות שמירה מחדש.');
      return;
    }
    router.back();
  };

  if (!sessionMatchesExercise(persistedSession, exercise)) {
    const recover = async () => {
      setRecovering(true);
      setMessage(null);
      try {
        const replacement = await learning.restartAnalysisSession(persistedSession.sessionId);
        router.replace(`/analysis?sessionId=${encodeURIComponent(replacement.sessionId)}` as Href);
      } catch (reason) {
        setMessage(reason instanceof Error ? reason.message : 'לא הצלחנו ליצור טיוטה תואמת.');
      } finally {
        setRecovering(false);
      }
    };
    return (
      <Screen contentContainerStyle={{ gap: theme.spacing.xl }} scroll>
        <TopBar back subtitle="נדרשת החלטת שחזור" title="גרסת הטיוטה אינה תואמת" />
        <Card variant="outlined">
          <UiText>
            הטיוטה נוצרה מול גרסת תוכן או גרף אחרת ולכן אינה נפתחת לעריכה אוטומטית. אפשר לשמור אותה
            בהיסטוריה כטיוטה שננטשה וליצור טיוטה תואמת חדשה.
          </UiText>
        </Card>
        {message ? <UiText color="danger">{message}</UiText> : undefined}
        <Button disabled={recovering} onPress={() => void recover()}>
          {recovering ? 'יוצר טיוטה תואמת…' : 'שמירת הישנה ופתיחת טיוטה חדשה'}
        </Button>
      </Screen>
    );
  }

  const transition = (action: GuidedAnalysisSessionAction) => {
    try {
      enqueue(reduceGuidedAnalysisSession(sessionRef.current, action));
      setMessage(null);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'השינוי אינו חוקי בסשן הזה.');
    }
  };

  const updateCurrentAnswer = (answers: CapstoneAnswerMap) => {
    const current = sessionRef.current;
    transition({
      type: 'update-step-answer',
      stepId: current.currentStepId,
      answer: answers[current.currentStepId as WorkflowStepId],
      updatedAt: monotonicNow(current),
    });
  };

  const navigate = (stepId: WorkflowStepId) => {
    const current = sessionRef.current;
    const requested = ANALYSIS_WORKFLOW_STEP_IDS.indexOf(stepId as AnalysisWorkflowStepId);
    if (requested > firstPendingIndex(current)) {
      setMessage('יש להגיש את השלב הנדרש שלפניו כדי להתקדם. אפשר לחזור לכל שלב קודם.');
      return;
    }
    if (current.currentStepId === stepId) return;
    transition({ type: 'navigate-to-step', stepId, navigatedAt: monotonicNow(current) });
  };

  const submitStep = (
    stepId: WorkflowStepId,
    _answer: AtomicExerciseAnswer,
    result: NonNullable<GuidedAnalysisSession['steps'][AnalysisWorkflowStepId]['result']>,
  ) => {
    const current = sessionRef.current;
    const authoredStep = exercise.capstoneSteps.find((step) => step.id === stepId);
    if (!authoredStep) {
      setMessage('השלב אינו קיים בקאפסטון שנבדק.');
      return;
    }
    const submittedAt = monotonicNow(current);
    try {
      let next = reduceGuidedAnalysisSession(current, {
        type: 'submit-step',
        stepId,
        result,
        submittedAt,
      });
      next = reduceGuidedAnalysisSession(next, {
        type: 'add-replay-checkpoint',
        checkpoint: {
          id: `${current.sessionId}:${stepId}:${next.revision}`,
          stepId,
          cursorCandleIndex: current.replay.cursorCandleIndex,
          capturedAt: submittedAt,
        },
      });
      enqueue(next);
      setMessage(null);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'לא ניתן להגיש את השלב.');
    }
  };

  const revealHint = () => {
    const current = sessionRef.current;
    const used = new Set(analysisSessionHintIdsUsed(current));
    const hint = exercise.hints.find((candidate) => !used.has(candidate.id));
    if (!hint) return;
    transition({
      type: 'record-hint',
      stepId: current.currentStepId,
      hintId: hint.id,
      usedAt: monotonicNow(current),
    });
  };

  const finalize = async () => {
    setFinalizing(true);
    setMessage(null);
    try {
      await saveQueue.current;
      await learning.finalizeAnalysisSession(sessionRef.current);
      setConfirmFinalize(false);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'לא הצלחנו לסיים את הניתוח.');
    } finally {
      setFinalizing(false);
    }
  };

  const usedHints = new Set(analysisSessionHintIdsUsed(session));
  const submitted = submittedCount(session);
  const wide = width >= 980;

  return (
    <Screen
      accessibilityLabel="סשן ניתוח מונחה"
      contentContainerStyle={{ gap: theme.spacing.xl }}
      scroll
      testID="guided-analysis-session"
    >
      <TopBar
        back
        onBack={() => void exitAfterSave()}
        subtitle="תרחיש סינתטי · תהליך מקור־מגובה"
        title="ניתוח מונחה"
      />

      <Card variant="subtle">
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Badge tone="teal">{`שלב ${ANALYSIS_WORKFLOW_STEP_IDS.indexOf(session.currentStepId) + 1} מתוך 11`}</Badge>
            <Badge tone={saveStatus === 'error' ? 'warning' : 'neutral'}>
              {saveStatus === 'saving'
                ? 'שומר במכשיר…'
                : saveStatus === 'saved'
                  ? 'נשמר במכשיר'
                  : 'השמירה דורשת ניסיון נוסף'}
            </Badge>
            <LtrText color="textMuted" variant="numeric">{`${submitted}/11`}</LtrText>
          </View>
          <ProgressBar
            accessibilityLabel="התקדמות בניתוח המונחה"
            showValue
            value={(submitted / 11) * 100}
          />
          <UiText color="textMuted" variant="caption">
            טיוטה היא תשובה שטרם הוגשה. עריכת שלב שהוגש מבטלת במפורש את תוצאותיו ואת תוצאות כל
            השלבים התלויים שאחריו.
          </UiText>
        </View>
      </Card>

      {message ? (
        <Card variant="outlined">
          <UiText accessibilityLiveRegion="polite" color="danger">
            {message}
          </UiText>
        </Card>
      ) : undefined}

      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: wide ? 'row' : 'column',
          gap: theme.spacing.lg,
        }}
        testID="guided-analysis-responsive-layout"
      >
        <View style={{ flex: wide ? 1.15 : undefined, width: wide ? undefined : '100%' }}>
          <GuidedAnalysisChart
            availableWidth={wide ? width * 0.52 : width}
            onAnnotationsChange={(annotations) => {
              const current = sessionRef.current;
              transition({
                type: 'replace-annotations',
                annotations,
                updatedAt: monotonicNow(current),
              });
            }}
            onCheckpointRequested={(cursorCandleIndex) => {
              const current = sessionRef.current;
              transition({
                type: 'add-replay-checkpoint',
                checkpoint: {
                  id: `${current.sessionId}:manual:${current.revision + 1}`,
                  stepId: current.currentStepId,
                  cursorCandleIndex,
                  capturedAt: monotonicNow(current),
                },
              });
            }}
            onReplayCursorChange={(cursorCandleIndex) => {
              const current = sessionRef.current;
              transition({
                type: 'set-replay-cursor',
                cursorCandleIndex,
                updatedAt: monotonicNow(current),
              });
            }}
            session={session}
          />
        </View>

        <View
          style={{
            flex: wide ? 1 : undefined,
            gap: theme.spacing.md,
            width: wide ? undefined : '100%',
          }}
        >
          <Card variant="accent">
            <View style={{ gap: 6 }}>
              <Heading level={2}>המשימה שנבדקה</Heading>
              <UiText>{exercise.promptHe}</UiText>
              <UiText color="textMuted" variant="caption">
                {exercise.safetyNoteHe}
              </UiText>
            </View>
          </Card>

          <CapstoneInteraction
            activeStepId={session.currentStepId}
            answer={null}
            exercise={exercise}
            onActiveStepChange={navigate}
            onChange={() => undefined}
            onPartialAnswersChange={updateCurrentAnswer}
            onSubmitStep={submitStep}
            partialAnswers={answerMap(session)}
            stepStatuses={statusMap(session)}
          />

          <Card variant="subtle">
            <View style={{ gap: theme.spacing.sm }}>
              <UiText variant="label">רמזים קיימים מן התרגיל</UiText>
              {exercise.hints
                .filter((hint) => usedHints.has(hint.id))
                .map((hint) => (
                  <UiText key={hint.id} color="textMuted" variant="bodySmall">
                    {hint.textHe}
                  </UiText>
                ))}
              <Button
                disabled={usedHints.size >= exercise.hints.length}
                onPress={revealHint}
                size="compact"
                variant="ghost"
              >
                {usedHints.size === 0
                  ? 'פתיחת רמז ראשון'
                  : usedHints.size < exercise.hints.length
                    ? 'פתיחת רמז נוסף'
                    : 'כל הרמזים נפתחו'}
              </Button>
              <LtrText
                color="textMuted"
                variant="caption"
              >{`${usedHints.size}/${exercise.hints.length}`}</LtrText>
            </View>
          </Card>

          {submitted === ANALYSIS_WORKFLOW_STEP_IDS.length ? (
            <Card variant="outlined">
              <View style={{ gap: theme.spacing.sm }}>
                <Heading level={3}>כל 11 השלבים הוגשו</Heading>
                <UiText color="textMuted" variant="bodySmall">
                  הסיום ייצור ניסיון למידה סמכותי אחד ויקפיא את הניתוח לקריאה בלבד.
                </UiText>
                <Button fullWidth onPress={() => setConfirmFinalize(true)}>
                  סיום מפורש של הניתוח
                </Button>
              </View>
            </Card>
          ) : undefined}

          {confirmFinalize ? (
            <Card accessibilityLabel="אישור סיום הניתוח" variant="accent">
              <View style={{ gap: theme.spacing.sm }}>
                <UiText>לסיים ולקבע את כל 11 התשובות? לאחר הסיום לא ניתן לערוך את הסשן.</UiText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button
                    disabled={finalizing}
                    onPress={() => setConfirmFinalize(false)}
                    variant="ghost"
                  >
                    חזרה לעריכה
                  </Button>
                  <Button disabled={finalizing} onPress={() => void finalize()}>
                    {finalizing ? 'מסיים ושומר…' : 'אישור וסיום'}
                  </Button>
                </View>
              </View>
            </Card>
          ) : undefined}

          <Card variant="subtle">
            <UiText color="textMuted" variant="caption">
              מקור כל שלבי המקרה:
            </UiText>
            <LtrText color="textMuted" variant="caption">
              {sourceLabel(exercise)}
            </LtrText>
          </Card>
        </View>
      </View>
    </Screen>
  );
}
