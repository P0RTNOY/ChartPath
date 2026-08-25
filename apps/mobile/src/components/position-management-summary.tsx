import { View } from 'react-native';

import { Badge, Card, Heading, LtrText, UiText, useTheme } from '@chartpath/ui';

import type { PositionManagementSummaryView } from '@/data/position-management';

export function PositionManagementSummary({
  summary,
}: {
  readonly summary: PositionManagementSummaryView;
}) {
  const theme = useTheme();
  return (
    <Card
      accessibilityLabel="מצב הפוזיציה המנוהלת"
      testID="paper-management-position-summary"
      variant="outlined"
    >
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Heading level={2}>מצב הפוזיציה</Heading>
          <Badge tone={summary.statusTone}>{summary.statusHe}</Badge>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {summary.metrics.map((metric) => (
            <View
              accessible
              accessibilityLabel={`${metric.labelHe}: ${metric.valueLtr}${metric.detailHe ? `. ${metric.detailHe}` : ''}`}
              key={metric.id}
              style={{
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                flexGrow: 1,
                gap: 4,
                minWidth: 145,
                padding: theme.spacing.sm,
              }}
              testID={`management-metric-${metric.id}`}
            >
              <UiText color="textMuted" variant="caption">
                {metric.labelHe}
              </UiText>
              <LtrText variant="numeric">{metric.valueLtr}</LtrText>
              {metric.detailHe ? (
                <UiText color="textMuted" variant="caption">
                  {metric.detailHe}
                </UiText>
              ) : undefined}
            </View>
          ))}
        </View>
        <UiText color="textMuted" variant="caption">
          {summary.disclosureHe}
        </UiText>
      </View>
    </Card>
  );
}
