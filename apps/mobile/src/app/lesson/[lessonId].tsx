import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

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

import { EmptyState, ErrorState, LoadingState } from '@/components/app-state';
import { Glyph, IconBubble } from '@/components/glyph';
import { TopBar } from '@/components/top-bar';
import { lessonExercises, lessons, skillById } from '@/data/catalog';
import { useLearning } from '@/state/learning';

export function generateStaticParams() {
  return lessons.map((lesson) => ({ lessonId: lesson.id }));
}

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const theme = useTheme();
  const learning = useLearning();
  if (learning.status === 'loading') return <LoadingState />;
  if (learning.status === 'error' || !learning.snapshot)
    return (
      <ErrorState
        message={learning.error ?? 'שגיאה בטעינה'}
        onRetry={() => void learning.reload()}
      />
    );
  const lesson = lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson)
    return (
      <Screen>
        <TopBar back title="שיעור לא נמצא" />
        <EmptyState message="ייתכן שהתוכן עודכן. חזרו למסלול ונסו שוב." title="אין שיעור כזה" />
      </Screen>
    );
  const exercises = lessonExercises(lesson.id);
  const progress = learning.snapshot.projections.lessonProgress[lesson.id];
  const completedCount = progress?.attemptedExerciseIds.length ?? 0;
  const percent = exercises.length ? (completedCount / exercises.length) * 100 : 0;
  const sourcePages = lesson.sourceReferences
    .map((source) =>
      source.pageStart === source.pageEnd
        ? `${source.pageStart}`
        : `${source.pageStart}–${source.pageEnd}`,
    )
    .join(', ');

  return (
    <Screen contentContainerStyle={{ gap: theme.spacing.xl }} scroll>
      <TopBar back subtitle={lesson.titleEn} title={lesson.titleHe} />
      <Card variant="accent">
        <View style={{ gap: theme.spacing.md }}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row-reverse',
              justifyContent: 'space-between',
            }}
          >
            <Badge tone="teal">שיעור {lesson.order} מתוך 12</Badge>
            <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 5 }}>
              <Glyph color={theme.colors.textMuted} name="clock" size={16} />
              <LtrText color="textMuted" variant="caption">
                {lesson.estimatedMinutes} min
              </LtrText>
            </View>
          </View>
          <UiText>{lesson.summaryHe}</UiText>
          <ProgressBar accessibilityLabel="התקדמות בשיעור" showValue value={percent} />
        </View>
      </Card>

      <View style={{ gap: theme.spacing.md }}>
        <Heading level={2}>מה נלמד</Heading>
        {lesson.doctrineHe.map((principle, index) => (
          <View
            key={principle}
            style={{ alignItems: 'flex-start', flexDirection: 'row-reverse', gap: 12 }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: theme.colors.primarySoft,
                borderRadius: 10,
                height: 32,
                justifyContent: 'center',
                width: 32,
              }}
            >
              <LtrText color="primary" variant="numeric">
                {index + 1}
              </LtrText>
            </View>
            <UiText style={{ flex: 1 }}>{principle}</UiText>
          </View>
        ))}
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <Heading level={2}>מיומנויות</Heading>
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
          {lesson.skillIds.map((id) => (
            <Badge key={id} tone="info">
              {skillById.get(id)?.titleHe ?? id}
            </Badge>
          ))}
        </View>
      </View>

      <Card variant="outlined">
        <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 12 }}>
          <IconBubble tone="muted">
            <Glyph name="book" />
          </IconBubble>
          <View style={{ flex: 1, gap: 4 }}>
            <UiText variant="label">תוכן מבוסס מקור</UiText>
            <UiText color="textMuted" variant="caption">
              עמודים{' '}
              <LtrText color="textMuted" variant="caption">
                {sourcePages}
              </LtrText>{' '}
              • הניסוחים עובדו לתרגול לימודי
            </UiText>
          </View>
        </View>
      </Card>

      {exercises.length ? (
        <Button fullWidth onPress={() => router.push(`/learn/${lesson.id}`)} size="large">
          {progress?.status === 'completed'
            ? 'תרגול מחדש'
            : completedCount
              ? 'המשך מהתרגיל הבא'
              : 'התחלת השיעור'}
        </Button>
      ) : (
        <EmptyState message="התוכן לשיעור הזה עוד לא פורסם במכשיר." title="התרגילים בדרך" />
      )}
      <UiText align="center" color="textMuted" variant="caption">
        אפשר לעצור בכל שלב. ההתקדמות נשמרת אוטומטית במכשיר.
      </UiText>
    </Screen>
  );
}
