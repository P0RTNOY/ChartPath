import { View } from 'react-native';

import { Badge, Button, Card, Heading, LtrText, UiText, useTheme } from '@chartpath/ui';

import type { ManagementJournalEntryView } from '@/data/position-management';

export function TradeManagementJournal({
  entries,
  onCorrect,
}: {
  readonly entries: readonly ManagementJournalEntryView[];
  readonly onCorrect: (entryId: string) => void;
}) {
  const theme = useTheme();
  return (
    <Card accessibilityLabel="יומן החלטות ניהול" testID="paper-management-journal" variant="subtle">
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ gap: 5 }}>
          <Heading level={2}>יומן החלטות</Heading>
          <UiText color="textMuted" variant="caption">
            רשומות שהוגשו אינן נערכות. תיקון נשמר כרשומה חדשה המקושרת לרשומה הקודמת.
          </UiText>
        </View>
        {entries.length === 0 ? (
          <UiText color="textMuted">עדיין לא הוגשו רשומות ניהול.</UiText>
        ) : (
          entries.map((entry) => (
            <View
              accessible
              accessibilityLabel={`רשומת יומן ${entry.sequenceLtr}, נר ${entry.candleLtr}, ${entry.typeHe}. ${entry.rationaleHe}`}
              key={entry.entryId}
              style={{
                borderBottomColor: theme.colors.border,
                borderBottomWidth: 1,
                gap: 7,
                paddingVertical: 9,
              }}
              testID={`paper-management-journal-entry-${entry.entryId}`}
            >
              <View
                style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
              >
                <Badge tone="neutral">{entry.typeHe}</Badge>
                <LtrText color="textMuted" variant="caption">
                  {`#${entry.sequenceLtr} · candle ${entry.candleLtr}`}
                </LtrText>
              </View>
              <UiText>{entry.rationaleHe}</UiText>
              {entry.tagsHe.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {entry.tagsHe.map((tag) => (
                    <Badge key={tag} tone="neutral">
                      {tag}
                    </Badge>
                  ))}
                </View>
              ) : undefined}
              {entry.correctionOfLtr ? (
                <LtrText color="textMuted" variant="caption">
                  {`correction of ${entry.correctionOfLtr}`}
                </LtrText>
              ) : undefined}
              {entry.correctable ? (
                <Button
                  accessibilityLabel={`הוספת תיקון לרשומת יומן ${entry.sequenceLtr}`}
                  onPress={() => onCorrect(entry.entryId)}
                  size="compact"
                  testID={`management-journal-correct-${entry.entryId}`}
                  variant="ghost"
                >
                  הוספת תיקון
                </Button>
              ) : undefined}
            </View>
          ))
        )}
      </View>
    </Card>
  );
}
