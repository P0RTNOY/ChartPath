import { router } from 'expo-router';
import { View } from 'react-native';

import { buildDailyPath } from '@chartpath/domain';
import {
  Badge,
  Button,
  Card,
  Heading,
  LtrText,
  ProgressBar,
  UiText,
  useTheme,
} from '@chartpath/ui';

import { ErrorState, LoadingState } from '@/components/app-state';
import { Glyph, IconBubble } from '@/components/glyph';
import { MainScreen } from '@/components/main-screen';
import { MetricPill, TopBar } from '@/components/top-bar';
import { isUnitUnlocked, lessons, unitLessons, units } from '@/data/catalog';
import { useLearning } from '@/state/learning';

function todayKey(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function HomeScreen() {
  const theme = useTheme();
  const learning = useLearning();
  if (learning.status === 'loading') return <LoadingState />;
  if (learning.status === 'error' || !learning.snapshot)
    return (
      <ErrorState
        message={learning.error ?? 'לא נמצאו נתוני למידה'}
        onRetry={() => void learning.reload()}
      />
    );

  const { snapshot } = learning;
  const progress = snapshot.projections.lessonProgress;
  const completedIds = Object.values(progress)
    .filter((item) => item.status === 'completed')
    .map((item) => item.lessonId);
  const currentLesson =
    lessons.find((lesson) => progress[lesson.id]?.status === 'in-progress') ??
    lessons.find((lesson) => !completedIds.includes(lesson.id));
  const dailyPath = buildDailyPath({
    now: new Date().toISOString(),
    limit: 3,
    lessons,
    currentLessonId: currentLesson?.id,
    completedLessonIds: completedIds,
    reviewStates: Object.values(snapshot.projections.reviewState),
    masteries: Object.values(snapshot.projections.skillMastery),
  });
  const today = snapshot.projections.dailyActivity[todayKey()];
  const activeMinutes = today?.activeMinutes ?? 0;
  const goalMinutes = snapshot.settings.dailyGoalMinutes;
  const coursePercent = lessons.length === 0 ? 0 : (completedIds.length / lessons.length) * 100;

  return (
    <MainScreen
      accessibilityLabel="מסלול הלמידה"
      contentContainerStyle={{ gap: theme.spacing.xl }}
      scroll
    >
      <TopBar
        subtitle="לימוד ניתוח טכני מבוסס ראיות"
        title="המסלול שלי"
        trailing={
          <MetricPill
            icon={<Glyph color={theme.colors.warning} name="flame" size={15} />}
            label="רצף ימים"
            value={String(snapshot.projections.currentStreak)}
          />
        }
      />

      <Card style={{ overflow: 'hidden' }} variant="accent">
        <View style={{ gap: theme.spacing.md }}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Badge tone="teal">היום במסלול</Badge>
              <Heading level={2}>{currentLesson?.titleHe ?? 'כל השיעורים הושלמו'}</Heading>
              {currentLesson?.titleEn ? (
                <LtrText color="textMuted" variant="caption">
                  {currentLesson.titleEn}
                </LtrText>
              ) : undefined}
            </View>
            <IconBubble>
              <Glyph name="spark" />
            </IconBubble>
          </View>
          <UiText color="textMuted" variant="bodySmall">
            {currentLesson?.summaryHe ?? 'זה זמן טוב לחזרה ממוקדת על מיומנויות שכבר למדת.'}
          </UiText>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <ProgressBar
                accessibilityLabel="התקדמות ביעד היומי"
                showValue
                value={(activeMinutes / Math.max(1, goalMinutes)) * 100}
              />
            </View>
            <UiText color="textMuted" variant="caption">
              <LtrText color="textMuted" variant="numeric">
                {activeMinutes}/{goalMinutes}
              </LtrText>{' '}
              דק׳
            </UiText>
          </View>
          <Button
            fullWidth
            onPress={() =>
              currentLesson ? router.push(`/lesson/${currentLesson.id}`) : router.push('/review')
            }
            size="large"
          >
            {currentLesson
              ? progress[currentLesson.id]
                ? 'המשך השיעור'
                : 'התחילו את השיעור'
              : 'עברו לחזרה'}
          </Button>
        </View>
      </Card>

      <Card
        accessibilityLabel="פתיחת מעבדת הגרפים"
        onPress={() => router.push('/lab')}
        variant="outlined"
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
          <IconBubble tone="gold">
            <Glyph name="chart" />
          </IconBubble>
          <View style={{ flex: 1, gap: 3 }}>
            <Badge tone="warning">מעבדת גרפים</Badge>
            <Heading level={3}>תרגול על משטח ניתוח מלא</Heading>
            <UiText color="textMuted" variant="bodySmall">
              בדקו נרות, התקדמו בזמן ושרטטו ראיות בתרחיש סינתטי מבוקר.
            </UiText>
          </View>
          <Glyph name="back" />
        </View>
      </Card>

      <View style={{ gap: theme.spacing.md }}>
        <View
          style={{
            alignItems: 'flex-end',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Heading level={2}>מפת הלמידה</Heading>
            <UiText color="textMuted" variant="bodySmall">
              מתקדמים מהבנת ההקשר והנתונים אל תהליך מלא.
            </UiText>
          </View>
          <LtrText color="primary" variant="numeric">
            {Math.round(coursePercent)}%
          </LtrText>
        </View>
        {units
          .filter((unit) => unit.lessonIds.length > 0)
          .map((unit, index) => {
            const contained = unitLessons(unit.id);
            const done = contained.filter(
              (lesson) => progress[lesson.id]?.status === 'completed',
            ).length;
            const active = contained.some(
              (lesson) =>
                lesson.id === currentLesson?.id || progress[lesson.id]?.status === 'in-progress',
            );
            const locked = !isUnitUnlocked(unit.id, progress);
            return (
              <View key={unit.id} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ alignItems: 'center', width: 38 }}>
                  <View
                    style={{
                      alignItems: 'center',
                      backgroundColor:
                        done === contained.length && done > 0
                          ? theme.colors.primary
                          : active
                            ? theme.colors.warningSurface
                            : theme.colors.surfaceMuted,
                      borderColor: active ? theme.colors.warning : theme.colors.border,
                      borderRadius: 19,
                      borderWidth: active ? 2 : 1,
                      height: 38,
                      justifyContent: 'center',
                      width: 38,
                    }}
                  >
                    {done === contained.length && done > 0 ? (
                      <Glyph color={theme.colors.onPrimary} name="check" />
                    ) : (
                      <LtrText color={active ? 'warning' : 'textMuted'} variant="numeric">
                        {index + 1}
                      </LtrText>
                    )}
                  </View>
                  {index <
                  units.filter((candidate) => candidate.lessonIds.length > 0).length - 1 ? (
                    <View
                      style={{
                        backgroundColor: theme.colors.border,
                        flex: 1,
                        minHeight: 24,
                        width: 2,
                      }}
                    />
                  ) : undefined}
                </View>
                <Card
                  accessibilityHint={locked ? 'יש להשלים את היחידה הקודמת' : 'פתיחת היחידה'}
                  disabled={locked}
                  onPress={() => router.push(`/unit/${unit.id}`)}
                  style={{ flex: 1, marginBottom: 10 }}
                  variant={active ? 'accent' : 'outlined'}
                >
                  <View style={{ gap: 7 }}>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                      <Heading level={3} style={{ flex: 1 }}>
                        {unit.titleHe}
                      </Heading>
                      {locked ? (
                        <Glyph color={theme.colors.textMuted} name="lock" />
                      ) : active ? (
                        <Badge tone="warning">בתהליך</Badge>
                      ) : undefined}
                    </View>
                    <UiText color="textMuted" numberOfLines={2} variant="bodySmall">
                      {unit.descriptionHe}
                    </UiText>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 9 }}>
                      <View style={{ flex: 1 }}>
                        <ProgressBar
                          showValue={false}
                          value={contained.length ? (done / contained.length) * 100 : 0}
                        />
                      </View>
                      <LtrText color="textMuted" variant="caption">
                        {done}/{contained.length}
                      </LtrText>
                    </View>
                  </View>
                </Card>
              </View>
            );
          })}
      </View>

      {dailyPath.some((item) => item.reason === 'due-review') ? (
        <Card onPress={() => router.push('/review')} variant="outlined">
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
            <IconBubble tone="gold">
              <Glyph name="review" />
            </IconBubble>
            <View style={{ flex: 1 }}>
              <Heading level={3}>יש חזרה שמחכה לך</Heading>
              <UiText color="textMuted" variant="bodySmall">
                כמה דקות עכשיו יחזקו את הזיכרון לטווח ארוך.
              </UiText>
            </View>
          </View>
        </Card>
      ) : undefined}
      <Card variant="subtle">
        <UiText color="textMuted" variant="caption">
          ChartPath מלמד תהליך וחשיבה הסתברותית. הוא אינו ייעוץ השקעות או הנחיה לפעולה.
        </UiText>
      </Card>
    </MainScreen>
  );
}
