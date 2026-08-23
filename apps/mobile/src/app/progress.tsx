import { View } from 'react-native';

import { Card, Heading, LtrText, Mastery, ProgressBar, UiText, useTheme } from '@chartpath/ui';

import { ErrorState, LoadingState } from '@/components/app-state';
import { Glyph, IconBubble } from '@/components/glyph';
import { MainScreen } from '@/components/main-screen';
import { TopBar } from '@/components/top-bar';
import { lessons, skillById } from '@/data/catalog';
import { useLearning } from '@/state/learning';

function dayKeys(): readonly string[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - offset));
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const date = String(day.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  });
}

export default function ProgressScreen() {
  const theme = useTheme();
  const learning = useLearning();
  if (learning.status === 'loading') return <LoadingState />;
  if (learning.status === 'error' || !learning.snapshot)
    return (
      <ErrorState
        message={learning.error ?? 'שגיאה בטעינת ההתקדמות'}
        onRetry={() => void learning.reload()}
      />
    );
  const { projections } = learning.snapshot;
  const attempts = learning.snapshot.attempts;
  const correct = attempts.filter((record) => record.attempt.result.correct).length;
  const accuracy = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;
  const completed = Object.values(projections.lessonProgress).filter(
    (item) => item.status === 'completed',
  ).length;
  const masteries = Object.values(projections.skillMastery).sort(
    (left, right) => right.attemptCount - left.attemptCount,
  );
  const days = dayKeys();
  const maxMinutes = Math.max(
    1,
    ...days.map((day) => projections.dailyActivity[day]?.activeMinutes ?? 0),
  );

  return (
    <MainScreen contentContainerStyle={{ gap: theme.spacing.xl }} scroll>
      <TopBar subtitle="התקדמות היא תהליך, לא תחזית" title="ההתקדמות שלי" />
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 }}>
        {[
          ['נקודות', String(projections.totalXp), 'spark'],
          ['רצף נוכחי', `${projections.currentStreak}d`, 'flame'],
          ['דיוק', `${accuracy}%`, 'check'],
          ['שיעורים', `${completed}/${lessons.length}`, 'book'],
        ].map(([label, value, icon]) => (
          <Card key={label} style={{ flexBasis: '47%', flexGrow: 1 }} variant="outlined">
            <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 10 }}>
              <IconBubble tone="muted">
                <Glyph name={icon as 'spark'} />
              </IconBubble>
              <View style={{ flex: 1 }}>
                <LtrText color="primary" style={{ fontSize: 24, fontWeight: '800' }}>
                  {value}
                </LtrText>
                <UiText color="textMuted" variant="caption">
                  {label}
                </UiText>
              </View>
            </View>
          </Card>
        ))}
      </View>
      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View>
            <Heading level={2}>שבעת הימים האחרונים</Heading>
            <UiText color="textMuted" variant="bodySmall">
              דקות פעילות שנשמרו במכשיר
            </UiText>
          </View>
          <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8, height: 142 }}>
            {days.map((day) => {
              const minutes = projections.dailyActivity[day]?.activeMinutes ?? 0;
              return (
                <View
                  accessibilityLabel={`${day}, ${minutes} דקות`}
                  key={day}
                  style={{ alignItems: 'center', flex: 1, gap: 5, justifyContent: 'flex-end' }}
                >
                  <LtrText color="textMuted" variant="caption">
                    {minutes}
                  </LtrText>
                  <View
                    style={{
                      backgroundColor: minutes ? theme.colors.primary : theme.colors.surfaceMuted,
                      borderRadius: 6,
                      height: Math.max(5, (minutes / maxMinutes) * 88),
                      width: '72%',
                    }}
                  />
                  <LtrText color="textMuted" style={{ fontSize: 10 }}>
                    {day.slice(8)}
                  </LtrText>
                </View>
              );
            })}
          </View>
        </View>
      </Card>
      <View style={{ gap: theme.spacing.md }}>
        <Heading level={2}>שליטה במיומנויות</Heading>
        {masteries.length ? (
          masteries.map((mastery) => {
            const skill = skillById.get(mastery.skillId);
            const review = projections.reviewState[mastery.skillId];
            return (
              <Mastery
                description={skill?.descriptionHe}
                key={mastery.skillId}
                reviewText={
                  review
                    ? `החזרה הבאה: ${new Date(review.nextDueAt).toLocaleDateString('he-IL')}`
                    : undefined
                }
                skillName={skill?.titleHe ?? mastery.skillId}
                value={mastery.score * 100}
              />
            );
          })
        ) : (
          <Card variant="subtle">
            <UiText align="center" color="textMuted">
              לאחר ניסיון ראשון יוצגו כאן שליטה, נקודות לחיזוק ומועד החזרה הבא.
            </UiText>
          </Card>
        )}
      </View>
      <Card variant="accent">
        <View style={{ gap: 8 }}>
          <Heading level={3}>המסלול הכולל</Heading>
          <ProgressBar showValue value={lessons.length ? (completed / lessons.length) * 100 : 0} />
          <UiText color="textMuted" variant="caption">
            השלמה אינה מבטיחה יכולת מסחר או תוצאה פיננסית. המשיכו לתרגל תהליך עקבי.
          </UiText>
        </View>
      </Card>
    </MainScreen>
  );
}
