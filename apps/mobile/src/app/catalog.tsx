import { router } from 'expo-router';
import { View } from 'react-native';

import { contentVersion, glossary } from '@chartpath/content';
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

import { EmptyState } from '@/components/app-state';
import { BrandMark } from '@/components/brand-mark';
import { Glyph, IconBubble } from '@/components/glyph';
import { TopBar } from '@/components/top-bar';
import { exercises, lessons, skills, units } from '@/data/catalog';

export default function DeveloperCatalogScreen() {
  const theme = useTheme();
  const interactions = [...new Set(exercises.map((exercise) => exercise.interactionType))];
  return (
    <Screen contentContainerStyle={{ gap: theme.spacing.xl }} scroll>
      <TopBar back subtitle={contentVersion.id} title="קטלוג מפתחים" />
      <Card variant="accent">
        <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 14 }}>
          <BrandMark />
          <View style={{ flex: 1 }}>
            <Heading level={2}>ChartPath UI + Content</Heading>
            <LtrText color="textMuted" variant="caption">
              RTL • React Native • deterministic grading
            </LtrText>
          </View>
        </View>
      </Card>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
        {[
          ['units', units.length],
          ['lessons', lessons.length],
          ['exercises', exercises.length],
          ['skills', skills.length],
          ['terms', glossary.length],
        ].map(([label, value]) => (
          <Card key={label} style={{ alignItems: 'center', minWidth: 105 }} variant="outlined">
            <LtrText color="primary" style={{ fontSize: 24, fontWeight: '800' }}>
              {value}
            </LtrText>
            <LtrText color="textMuted" variant="caption">
              {label}
            </LtrText>
          </Card>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <Heading level={2}>Interactions</Heading>
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 }}>
          {interactions.map((interaction) => (
            <Badge key={interaction} tone="info">
              <LtrText variant="caption">{interaction}</LtrText>
            </Badge>
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Heading level={2}>Components</Heading>
        <Card>
          <View style={{ gap: 12 }}>
            <Heading level={3}>Progress</Heading>
            <ProgressBar showValue value={68} />
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              <Badge tone="teal">נלמד</Badge>
              <Badge tone="warning">בתרגול</Badge>
              <Badge tone="info">חדש</Badge>
              <Badge tone="neutral">נעול</Badge>
            </View>
          </View>
        </Card>
        <Feedback
          message="כלל האישור התקיים, בלי להשתמש במידע מהעתיד."
          title="תהליך עקבי"
          tone="correct"
        />
        <Feedback
          message="הניסיון נשמר. בדקו אם חסר הקשר או כלל ביטול תוקף."
          title="נקודה לחיזוק"
          tone="corrective"
        />
        <EmptyState message="המצב הריק מסביר מה יופיע כאן ומה אפשר לעשות עכשיו." title="מצב ריק" />
      </View>
      <View style={{ gap: 10 }}>
        <Heading level={2}>Exercise catalog</Heading>
        {exercises.slice(0, 20).map((exercise) => {
          const lesson = lessons.find((candidate) => candidate.exerciseIds.includes(exercise.id));
          return (
            <Card
              key={exercise.id}
              onPress={() => lesson && router.push(`/learn/${lesson.id}?exerciseId=${exercise.id}`)}
              variant="outlined"
            >
              <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 10 }}>
                <IconBubble tone="muted">
                  <Glyph name="chart" />
                </IconBubble>
                <View style={{ flex: 1 }}>
                  <UiText numberOfLines={2} variant="label">
                    {exercise.promptHe}
                  </UiText>
                  <LtrText color="textMuted" variant="caption">
                    {exercise.id} • {exercise.interactionType}
                  </LtrText>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
      <Button fullWidth onPress={() => router.back()} variant="secondary">
        סגירת הקטלוג
      </Button>
    </Screen>
  );
}
