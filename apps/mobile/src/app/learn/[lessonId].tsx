import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { generateChart } from '@chartpath/chart-engine';
import type { AttemptResult, ExerciseAnswer, GeneratedChart } from '@chartpath/domain';
import {
  Badge,
  Button,
  Card,
  Feedback,
  Heading,
  LtrText,
  ProgressBar,
  Screen,
  UiText,
  useTheme,
} from '@chartpath/ui';

import { EmptyState, ErrorState, LoadingState } from '@/components/app-state';
import { ExerciseInteraction } from '@/components/exercise-interaction';
import { Glyph } from '@/components/glyph';
import { OhlcvChart } from '@/components/ohlcv-chart';
import { lessonExercises, lessons } from '@/data/catalog';
import { useLearning } from '@/state/learning';

export function generateStaticParams() {
  return lessons.map((lesson) => ({ lessonId: lesson.id }));
}

type PlayerPhase = 'question' | 'feedback' | 'summary';

function generateExerciseChart(
  spec: Parameters<typeof generateChart>[0] | undefined,
): GeneratedChart | undefined {
  if (!spec) return undefined;
  try {
    return generateChart(spec);
  } catch {
    return undefined;
  }
}

export default function LessonPlayerScreen() {
  const { lessonId, review, exerciseId } = useLocalSearchParams<{
    lessonId: string;
    review?: string;
    exerciseId?: string;
  }>();
  const theme = useTheme();
  const learning = useLearning();
  const lesson = lessons.find((candidate) => candidate.id === lessonId);
  const exercises = lesson ? lessonExercises(lesson.id) : [];
  const persistedProgress = learning.snapshot?.projections.lessonProgress[lessonId];
  const initialIndex = Math.max(
    0,
    exerciseId
      ? exercises.findIndex((item) => item.id === exerciseId)
      : exercises.findIndex((item) => !persistedProgress?.attemptedExerciseIds.includes(item.id)),
  );
  const [index, setIndex] = useState(initialIndex < 0 ? 0 : initialIndex);
  const [phase, setPhase] = useState<PlayerPhase>('question');
  const [answer, setAnswer] = useState<ExerciseAnswer | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [sessionResults, setSessionResults] = useState<readonly AttemptResult[]>([]);
  const exercise = exercises[index];
  const chart = generateExerciseChart(exercise?.chartSpec);

  if (learning.status === 'loading') return <LoadingState label="מחזירים אותך לתרגיל האחרון…" />;
  if (learning.status === 'error' || !learning.snapshot)
    return (
      <ErrorState
        message={learning.error ?? 'שגיאה בטעינת השיעור'}
        onRetry={() => void learning.reload()}
      />
    );
  if (!lesson || exercises.length === 0 || !exercise)
    return (
      <Screen>
        <EmptyState
          action={<Button onPress={() => router.back()}>חזרה</Button>}
          message="אין כרגע תרגילים זמינים לשיעור הזה."
          title="השיעור אינו זמין"
        />
      </Screen>
    );

  const hints = exercise.hints.slice(0, hintCount);
  const answerAlternativeId =
    answer?.kind === 'multiple-choice'
      ? answer.optionId
      : answer?.kind === 'decision'
        ? answer.decision
        : undefined;
  const alternative = exercise.alternativeExplanations.find(
    (item) => item.answerId === answerAlternativeId,
  );

  const submit = async () => {
    if (!answer) return;
    setSubmitting(true);
    setSubmissionError(null);
    try {
      const graded = await learning.submitAttempt({
        exercise,
        lessonId: lesson.id,
        answer,
        chart,
        hintIdsUsed: hints.map((hint) => hint.id),
        startedAt,
        isReview: review === '1',
        completesLesson:
          review !== '1' &&
          index === exercises.length - 1 &&
          exercises
            .slice(0, -1)
            .every((candidate) => persistedProgress?.attemptedExerciseIds.includes(candidate.id)),
      });
      setResult(graded);
      setSessionResults((previous) => [...previous, graded]);
      setPhase('feedback');
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'לא הצלחנו לשמור את התשובה.');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (index >= exercises.length - 1 || review === '1') {
      setPhase('summary');
      return;
    }
    setIndex((value) => value + 1);
    setPhase('question');
    setAnswer(null);
    setResult(null);
    setHintCount(0);
    setStartedAt(new Date().toISOString());
  };

  if (phase === 'summary') {
    const correct = sessionResults.filter((item) => item.correct).length;
    const average = sessionResults.length
      ? Math.round(
          (sessionResults.reduce((sum, item) => sum + item.score, 0) / sessionResults.length) * 100,
        )
      : 0;
    return (
      <Screen contentContainerStyle={{ gap: theme.spacing.xl, justifyContent: 'center' }} scroll>
        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.primarySoft,
              borderRadius: 42,
              height: 84,
              justifyContent: 'center',
              width: 84,
            }}
          >
            <Glyph color={theme.colors.primary} name="check" size={44} />
          </View>
          <Badge tone="teal">{review === '1' ? 'חזרה הושלמה' : 'שיעור הושלם'}</Badge>
          <Heading align="center" level={1}>
            עבודה טובה על התהליך
          </Heading>
          <UiText align="center" color="textMuted">
            לא התוצאה הבודדת קובעת, אלא היכולת לתאר הקשר, ראיות וביטול תוקף באופן עקבי.
          </UiText>
        </View>
        <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
          <Card style={{ alignItems: 'center', flex: 1 }} variant="outlined">
            <LtrText align="center" color="primary" style={{ fontSize: 27, fontWeight: '800' }}>
              {correct}/{sessionResults.length}
            </LtrText>
            <UiText align="center" color="textMuted" variant="caption">
              תשובות נכונות
            </UiText>
          </Card>
          <Card style={{ alignItems: 'center', flex: 1 }} variant="outlined">
            <LtrText align="center" color="primary" style={{ fontSize: 27, fontWeight: '800' }}>
              {average}%
            </LtrText>
            <UiText align="center" color="textMuted" variant="caption">
              דיוק ממוצע
            </UiText>
          </Card>
        </View>
        <Card variant="subtle">
          <UiText align="center">
            השלב הבא:{' '}
            {review === '1'
              ? 'חזרה נוספת תופיע כשהמיומנות תגיע למועד המתאים.'
              : 'הניסיון נשמר, והמיומנויות ישובצו בחזרה החכמה.'}
          </UiText>
        </Card>
        <Button fullWidth onPress={() => router.replace('/home')} size="large">
          חזרה למסלול
        </Button>
        <Button fullWidth onPress={() => router.replace('/progress')} variant="ghost">
          צפייה בהתקדמות
        </Button>
      </Screen>
    );
  }

  return (
    <Screen
      contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
      scroll
    >
      <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 12 }}>
        <Pressable
          accessibilityLabel="יציאה מהשיעור"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={{
            alignItems: 'center',
            borderColor: theme.colors.border,
            borderRadius: 12,
            borderWidth: 1,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}
        >
          <Glyph name="close" size={25} />
        </Pressable>
        <View style={{ flex: 1, gap: 5 }}>
          <UiText numberOfLines={1} variant="label">
            {lesson.titleHe}
          </UiText>
          <ProgressBar
            accessibilityLabel={`תרגיל ${index + 1} מתוך ${exercises.length}`}
            showValue={false}
            value={((index + (phase === 'feedback' ? 1 : 0)) / exercises.length) * 100}
          />
        </View>
        <LtrText color="textMuted" variant="numeric">
          {index + 1}/{exercises.length}
        </LtrText>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 8 }}>
          <Badge tone={exercise.isAmbiguous ? 'warning' : 'info'}>
            {exercise.isAmbiguous ? 'מקרה עמום' : interactionLabel(exercise.interactionType)}
          </Badge>
          <LtrText color="textMuted" variant="caption">
            {exercise.id}
          </LtrText>
        </View>
        <Heading level={2}>{exercise.promptHe}</Heading>
        {exercise.promptEn ? (
          <LtrText color="textMuted" variant="bodySmall">
            {exercise.promptEn}
          </LtrText>
        ) : undefined}
      </View>

      {phase === 'question' ? (
        <>
          <ExerciseInteraction
            answer={answer}
            chart={chart}
            exercise={exercise}
            onChange={setAnswer}
          />
          {hints.map((hint) => (
            <Card key={hint.id} variant="subtle">
              <View style={{ gap: 4 }}>
                <Badge tone="warning">רמז {hint.level}</Badge>
                <UiText>{hint.textHe}</UiText>
                {hint.textEn ? (
                  <LtrText color="textMuted" variant="caption">
                    {hint.textEn}
                  </LtrText>
                ) : undefined}
              </View>
            </Card>
          ))}
          {submissionError ? (
            <UiText align="center" color="danger">
              {submissionError}
            </UiText>
          ) : undefined}
          <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 10 }}>
            <Button
              disabled={hintCount >= exercise.hints.length || submitting}
              onPress={() => setHintCount((value) => Math.min(exercise.hints.length, value + 1))}
              variant="ghost"
            >
              {hintCount ? 'רמז נוסף' : 'אפשר רמז'}
            </Button>
            <Button
              disabled={!answer}
              fullWidth
              loading={submitting}
              onPress={() => void submit()}
              style={{ flex: 1 }}
            >
              בדיקת התשובה
            </Button>
          </View>
        </>
      ) : undefined}

      {phase === 'feedback' && result ? (
        <View style={{ gap: theme.spacing.lg }}>
          {chart ? <OhlcvChart chart={chart} showAnnotations ticker="CPTH" /> : undefined}
          <Feedback
            actionLabel={index === exercises.length - 1 || review === '1' ? 'סיכום' : 'לתרגיל הבא'}
            animationKey={`${exercise.id}-${result.feedbackCode}`}
            detail={
              <View style={{ gap: theme.spacing.sm }}>
                <UiText>{alternative?.explanationHe ?? exercise.explanationHe}</UiText>
                {result.misconceptionIds.length ? (
                  <UiText color="textMuted" variant="caption">
                    זוהתה נקודה לחיזוק. היא תופיע שוב בחזרה מותאמת.
                  </UiText>
                ) : undefined}
                {hints.length ? (
                  <UiText color="textMuted" variant="caption">
                    נעשה שימוש ב־
                    <LtrText color="textMuted" variant="caption">
                      {hints.length}
                    </LtrText>{' '}
                    רמזים. הציון הדטרמיניסטי לא השתנה בדיעבד.
                  </UiText>
                ) : undefined}
              </View>
            }
            message={
              result.correct
                ? 'הראיות שסימנת מתאימות לכלל שהוגדר.'
                : 'התרגיל נשמר. עברו על ההסבר ונסו לזהות את הכלל, לא רק את התוצאה.'
            }
            onAction={next}
            title={result.correct ? 'הבחנה מדויקת' : 'כדאי לחדד את הראיות'}
            tone={result.correct ? 'correct' : 'corrective'}
          />
        </View>
      ) : undefined}
    </Screen>
  );
}

function interactionLabel(type: string): string {
  const labels: Readonly<Record<string, string>> = {
    'multiple-choice': 'בחירה',
    selection: 'אבחון',
    sequence: 'סידור תהליך',
    point: 'סימון נקודה',
    zone: 'סימון אזור',
    line: 'שרטוט קו',
    risk: 'חישוב סיכון',
    decision: 'החלטה',
    'label-placement': 'מיקום תוויות',
    'timeframe-comparison': 'השוואת מסגרות',
    'mistake-diagnosis': 'אבחון טעות',
    'sequential-reveal': 'חשיפה הדרגתית',
  };
  return labels[type] ?? 'תרגול';
}
