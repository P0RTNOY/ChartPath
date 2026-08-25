import { View } from 'react-native';

import { Card, Heading, LtrText, UiText, useTheme } from '@chartpath/ui';

import type { ManagementTimelineEntryView } from '@/data/position-management';

export function ManagementTimeline({
  entries,
}: {
  readonly entries: readonly ManagementTimelineEntryView[];
}) {
  const theme = useTheme();
  return (
    <Card
      accessibilityLabel="ציר זמן משולב של ביצוע וניהול"
      testID="paper-management-timeline"
      variant="subtle"
    >
      <View style={{ gap: 8 }}>
        <Heading level={2}>ציר זמן</Heading>
        {entries.map((entry) => (
          <View
            accessible
            accessibilityLabel={`${entry.titleHe}, אירוע ${entry.sequenceLtr}${entry.candleLtr ? `, נר ${entry.candleLtr}` : ''}${entry.detailHe ? `. ${entry.detailHe}` : ''}${entry.numericDetailLtr ? `. ${entry.numericDetailLtr}` : ''}`}
            key={entry.eventId}
            style={{
              borderBottomColor: theme.colors.border,
              borderBottomWidth: 1,
              gap: 4,
              paddingVertical: 8,
            }}
            testID={`management-timeline-event-${entry.eventId}`}
          >
            <UiText variant="label">{entry.titleHe}</UiText>
            <LtrText color="textMuted" variant="caption">
              {`#${entry.sequenceLtr}${entry.candleLtr ? ` · candle ${entry.candleLtr}` : ''} · ${entry.occurredAtLtr}`}
            </LtrText>
            {entry.detailHe ? <UiText variant="bodySmall">{entry.detailHe}</UiText> : undefined}
            {entry.numericDetailLtr ? (
              <LtrText color="textMuted" variant="caption">
                {entry.numericDetailLtr}
              </LtrText>
            ) : undefined}
          </View>
        ))}
      </View>
    </Card>
  );
}
