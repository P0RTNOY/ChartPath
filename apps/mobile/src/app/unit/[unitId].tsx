import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import {
  Badge,
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
import { isLessonUnlocked, isUnitUnlocked, unitLessons, units } from '@/data/catalog';
import { useLearning } from '@/state/learning';

export function generateStaticParams() {
  return units.map((unit) => ({ unitId: unit.id }));
}

export default function UnitScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
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
  const unit = units.find((candidate) => candidate.id === unitId);
  if (!unit)
    return (
      <Screen>
        <TopBar back title="יחידה לא נמצאה" />
        <EmptyState message="ייתכן שהתוכן עודכן. חזרו למפת הלמידה." title="אין יחידה כזו" />
      </Screen>
    );
  if (!isUnitUnlocked(unit.id, learning.snapshot.projections.lessonProgress))
    return (
      <Screen>
        <TopBar back title="יחידה נעולה" />
        <EmptyState
          message="השלימו את היחידה הקודמת כדי לפתוח את השלב הבא במסלול."
          title="היחידה עדיין נעולה"
        />
      </Screen>
    );
  const contained = unitLessons(unit.id);
  const progress = learning.snapshot.projections.lessonProgress;
  const completed = contained.filter(
    (lesson) => progress[lesson.id]?.status === 'completed',
  ).length;

  return (
    <Screen contentContainerStyle={{ gap: theme.spacing.xl }} scroll>
      <TopBar back subtitle={unit.titleEn} title={unit.titleHe} />
      <Card variant="accent">
        <View style={{ gap: theme.spacing.md }}>
          <Badge tone="teal">יחידה {unit.order}</Badge>
          <UiText>{unit.descriptionHe}</UiText>
          <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <ProgressBar
                accessibilityLabel="התקדמות ביחידה"
                showValue
                value={contained.length ? (completed / contained.length) * 100 : 0}
              />
            </View>
            <LtrText variant="numeric">
              {completed}/{contained.length}
            </LtrText>
          </View>
        </View>
      </Card>
      <View style={{ gap: theme.spacing.md }}>
        <Heading level={2}>שיעורים ביחידה</Heading>
        {contained.map((lesson, index) => {
          const state = progress[lesson.id];
          const locked = !isLessonUnlocked(lesson.id, progress);
          const isComplete = state?.status === 'completed';
          return (
            <Card
              accessibilityHint={locked ? 'יש להשלים את השיעור הקודם' : 'פתיחת פרטי השיעור'}
              disabled={locked}
              key={lesson.id}
              onPress={() => router.push(`/lesson/${lesson.id}`)}
              variant={state?.status === 'in-progress' ? 'accent' : 'outlined'}
            >
              <View style={{ alignItems: 'flex-start', flexDirection: 'row-reverse', gap: 13 }}>
                <IconBubble tone={isComplete ? 'primary' : locked ? 'muted' : 'gold'}>
                  {isComplete ? (
                    <Glyph color={theme.colors.primary} name="check" />
                  ) : locked ? (
                    <Glyph color={theme.colors.textMuted} name="lock" />
                  ) : (
                    <LtrText color="primary" variant="numeric">
                      {index + 1}
                    </LtrText>
                  )}
                </IconBubble>
                <View style={{ flex: 1, gap: 5 }}>
                  <Heading level={3}>{lesson.titleHe}</Heading>
                  {lesson.titleEn ? (
                    <LtrText color="textMuted" variant="caption">
                      {lesson.titleEn}
                    </LtrText>
                  ) : undefined}
                  <UiText color="textMuted" numberOfLines={3} variant="bodySmall">
                    {lesson.summaryHe}
                  </UiText>
                  <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 6 }}>
                    <Glyph color={theme.colors.textMuted} name="clock" size={15} />
                    <LtrText color="textMuted" variant="caption">
                      {lesson.estimatedMinutes} min
                    </LtrText>
                    <UiText color="textMuted" variant="caption">
                      • {lesson.exerciseIds.length} תרגילים
                    </UiText>
                  </View>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
