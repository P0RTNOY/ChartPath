import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Heading, LtrText, UiText, useTheme } from '@chartpath/ui';

import { EmptyState, ErrorState, LoadingState } from '@/components/app-state';
import { Glyph, IconBubble } from '@/components/glyph';
import { MainScreen } from '@/components/main-screen';
import { TopBar } from '@/components/top-bar';
import { exercises, lessons, skillById } from '@/data/catalog';
import { useLearning } from '@/state/learning';

export default function ReviewScreen() {
  const theme = useTheme();
  const learning = useLearning();
  const [reviewTime] = useState(() => Date.now());
  if (learning.status === 'loading') return <LoadingState label="מכינים את החזרה…" />;
  if (learning.status === 'error' || !learning.snapshot)
    return (
      <ErrorState
        message={learning.error ?? 'שגיאה בטעינת החזרה'}
        onRetry={() => void learning.reload()}
      />
    );
  const reviewStates = Object.values(learning.snapshot.projections.reviewState);
  const due = reviewStates.filter((item) => Date.parse(item.nextDueAt) <= reviewTime);
  const masteries = Object.values(learning.snapshot.projections.skillMastery).sort(
    (a, b) => a.score - b.score,
  );
  const queue = due.length
    ? due
    : masteries
        .slice(0, 3)
        .map((mastery) => reviewStates.find((state) => state.skillId === mastery.skillId))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const startReview = (skillId: string) => {
    const exercise = exercises.find((candidate) => candidate.skillIds.includes(skillId));
    const lesson = exercise
      ? lessons.find((candidate) => candidate.exerciseIds.includes(exercise.id))
      : undefined;
    if (exercise && lesson) router.push(`/learn/${lesson.id}?review=1&exerciseId=${exercise.id}`);
  };

  return (
    <MainScreen contentContainerStyle={{ gap: theme.spacing.xl }} scroll>
      <TopBar subtitle="חזרה מרווחת לפי המיומנויות שלך" title="חזרה חכמה" />
      <Card variant="accent">
        <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 14 }}>
          <IconBubble tone="gold">
            <Glyph name="review" size={25} />
          </IconBubble>
          <View style={{ flex: 1, gap: 3 }}>
            <Heading level={2}>
              {due.length ? `${due.length} מיומנויות הגיעו למועד חזרה` : 'אין חזרות דחופות כרגע'}
            </Heading>
            <UiText color="textMuted" variant="bodySmall">
              התרגול נקבע לפי ניסיונות שמורים. הסבר אופציונלי לעולם אינו משנה את הציון.
            </UiText>
          </View>
        </View>
      </Card>
      <View style={{ gap: theme.spacing.md }}>
        <Heading level={2}>{due.length ? 'ממתינות עכשיו' : 'חיזוק מומלץ'}</Heading>
        {queue.length === 0 ? (
          <EmptyState
            action={
              <Button onPress={() => router.replace('/home')} variant="secondary">
                לשיעור הבא
              </Button>
            }
            message="לאחר כמה תרגילים המערכת תזהה מיומנויות שכדאי לחזק ותתזמן אותן כאן."
            title="החזרה תיבנה עם ההתקדמות"
          />
        ) : (
          queue.map((item) => {
            const skill = skillById.get(item.skillId);
            const mastery = learning.snapshot?.projections.skillMastery[item.skillId];
            const dueNow = Date.parse(item.nextDueAt) <= reviewTime;
            return (
              <Card
                key={item.skillId}
                onPress={() => startReview(item.skillId)}
                variant={dueNow ? 'outlined' : 'subtle'}
              >
                <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 12 }}>
                  <IconBubble tone={dueNow ? 'gold' : 'muted'}>
                    <Glyph name="spark" />
                  </IconBubble>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 7 }}>
                      <Heading level={3} style={{ flex: 1 }}>
                        {skill?.titleHe ?? item.skillId}
                      </Heading>
                      {dueNow ? <Badge tone="warning">להיום</Badge> : undefined}
                    </View>
                    {skill?.titleEn ? (
                      <LtrText color="textMuted" variant="caption">
                        {skill.titleEn}
                      </LtrText>
                    ) : undefined}
                    <UiText color="textMuted" variant="caption">
                      שליטה נוכחית:{' '}
                      <LtrText color="textMuted" variant="caption">
                        {Math.round((mastery?.score ?? 0) * 100)}%
                      </LtrText>{' '}
                      • מרווח:{' '}
                      <LtrText color="textMuted" variant="caption">
                        {item.intervalDays}d
                      </LtrText>
                    </UiText>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </View>
      <Card variant="subtle">
        <UiText color="textMuted" variant="caption">
          גם ״להמתין״ ו״אין מספיק ראיות״ עשויות להיות התשובה המדויקת בחזרה.
        </UiText>
      </Card>
    </MainScreen>
  );
}
