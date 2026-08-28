import { View } from 'react-native';

import { Badge, Card, Heading, LtrText, UiText, useTheme } from '@chartpath/ui';

import type { PositionManagementDebriefView } from '@/data/position-management';

export function ManagementDebriefCard({
  debrief,
}: {
  readonly debrief: PositionManagementDebriefView;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }} testID="paper-management-debrief">
      <Card
        accessibilityLabel="תחקיר ניהול דטרמיניסטי"
        testID="paper-management-debrief-marker"
        variant="accent"
      >
        <View style={{ gap: 8 }}>
          <Badge tone="neutral">תחקיר ניהול — התהליך אינו ציון רווח</Badge>
          <Heading level={2}>תחקיר ניהול דטרמיניסטי</Heading>
          <UiText>{debrief.processQualityHe}</UiText>
          <UiText color="textMuted" variant="caption">
            רווח או הפסד מדומים אינם משנים את ציון הניתוח ואינם מעידים על תוצאה עתידית.
          </UiText>
        </View>
      </Card>

      <Card variant="outlined">
        <View style={{ gap: 8 }}>
          <Heading level={3}>איכות התהליך</Heading>
          {debrief.assessments.map((assessment) => (
            <View
              key={assessment.id}
              style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            >
              <Badge tone={assessment.tone}>{assessment.resultHe}</Badge>
              <UiText style={{ flex: 1 }} variant="bodySmall">
                {assessment.labelHe}
              </UiText>
            </View>
          ))}
        </View>
      </Card>

      <Card variant="outlined">
        <View style={{ gap: 8 }}>
          <Heading level={3}>חשבונאות סימולטור ניטרלית</Heading>
          {debrief.accounting.map((metric) => (
            <View key={metric.id} style={{ gap: 3 }}>
              <UiText color="textMuted" variant="caption">
                {metric.labelHe}
              </UiText>
              <LtrText variant="numeric">{metric.valueLtr}</LtrText>
            </View>
          ))}
          <UiText color="textMuted" variant="caption">
            הנתונים אינם P&amp;L של חשבון אמיתי ואינם ציון חינוכי.
          </UiText>
        </View>
      </Card>

      {debrief.ambiguous ? (
        <Card testID="paper-management-ambiguous" variant="outlined">
          <View style={{ gap: 8 }}>
            <Badge tone="warning">תוצאה עמומה</Badge>
            <Heading level={3}>אין סדר תוך־נרי אמין</Heading>
            <UiText>
              נתוני OHLCV אינם מאפשרים לקבוע את סדר הפעולות והספים. הסימולטור אינו ממציא מילוי או
              תוצאה.
            </UiText>
          </View>
        </Card>
      ) : undefined}

      <Card variant="subtle">
        <View style={{ gap: 6 }}>
          <Heading level={3}>הנחות שהשפיעו על התוצאה</Heading>
          {debrief.assumptionsHe.map((assumption) => (
            <UiText key={assumption} color="textMuted" variant="bodySmall">
              {`• ${assumption}`}
            </UiText>
          ))}
        </View>
      </Card>
    </View>
  );
}
