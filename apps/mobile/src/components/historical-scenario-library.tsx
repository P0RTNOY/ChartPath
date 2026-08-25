import { View } from 'react-native';

import { Badge, Button, Card, Heading, LtrText, Screen, UiText, useTheme } from '@chartpath/ui';

import { TopBar } from './top-bar';
import type { BlindScenarioLibraryCard } from '@/data/scenario-library';

export function HistoricalScenarioLibrary({
  cards,
  onStart,
  startingKey,
  error,
}: {
  readonly cards: readonly BlindScenarioLibraryCard[];
  readonly onStart: (libraryKey: string) => void;
  readonly startingKey?: string;
  readonly error?: string | null;
}) {
  const theme = useTheme();
  return (
    <Screen
      accessibilityLabel="ספריית תרחישים היסטוריים עיוורים"
      contentContainerStyle={{ gap: theme.spacing.xl }}
      scroll
      testID="scenario-library-screen"
    >
      <TopBar back subtitle="מקורות קפואים שעברו שערי פרסום" title="ספריית Replay עיוור" />

      <Card variant="accent">
        <View style={{ gap: theme.spacing.sm }}>
          <Badge tone="teal">תרגול לפני חשיפת זהות ותוצאה</Badge>
          <Heading level={1}>בחירת תרחיש מאושר</Heading>
          <UiText>
            הרשימה הרגילה מציגה רק תרחישים שפורסמו כדין, עברו ביקורת אנושית וזכאים לקרדיט למידה.
            כיוון ההחלטה, התשובה, זהות הנכס והתוצאה אינם מופיעים לפני הסיום.
          </UiText>
        </View>
      </Card>

      {cards.length ? (
        <View style={{ gap: theme.spacing.md }} testID="scenario-library-published-list">
          {cards.map((card) => (
            <Card
              accessibilityLabel={`תרחיש עיוור ${card.ordinal}. ${card.availabilityHe}. ${card.creditHe}.`}
              accessibilityRole="summary"
              key={card.libraryKey}
              testID={`scenario-card-${card.libraryKey}`}
              variant="outlined"
            >
              <View style={{ gap: theme.spacing.sm }}>
                <View
                  style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
                >
                  <Badge tone="neutral">זהות מוסתרת</Badge>
                  <LtrText color="primary" variant="numeric">{`#${card.ordinal}`}</LtrText>
                </View>
                <Heading level={2}>{card.blindTitleHe}</Heading>
                <UiText color="textMuted" variant="bodySmall">
                  {card.availabilityHe}. {card.creditHe}.
                </UiText>
                <Button
                  accessibilityLabel={`פתיחת תרחיש עיוור ${card.ordinal}`}
                  disabled={startingKey !== undefined}
                  fullWidth
                  loading={startingKey === card.libraryKey}
                  onPress={() => onStart(card.libraryKey)}
                  testID={`scenario-start-${card.libraryKey}`}
                >
                  פתיחת התרחיש העיוור
                </Button>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Card testID="scenario-library-empty" variant="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <Badge tone="warning">אין תרחישים שעמדו בכל שערי הפרסום</Badge>
            <Heading level={2}>הספרייה הרגילה עדיין ריקה</Heading>
            <UiText>
              מועמדי פיתוח, נתונים סינתטיים ורשומות ללא ביקורת אנושית אינם מוצגים כאן ואינם מעניקים
              קרדיט. הם זמינים רק בכלי QA פנימי מפורש בגרסת פיתוח.
            </UiText>
          </View>
        </Card>
      )}

      {error ? (
        <UiText accessibilityLiveRegion="polite" color="danger">
          {error}
        </UiText>
      ) : undefined}

      <Card variant="subtle">
        <UiText color="textMuted" variant="caption">
          ChartPath מלמד תהליך על ראיות היסטוריות קפואות. אין כאן מידע שוק עדכני, אות מסחר או המלצה
          אישית.
        </UiText>
      </Card>
    </Screen>
  );
}
