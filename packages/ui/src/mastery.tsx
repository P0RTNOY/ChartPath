import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Badge } from './badge';
import { Card } from './card';
import { defaultMasteryLevels, getMasteryLevel, type MasteryLevel } from './mastery-utils';
import { ProgressBar } from './progress';
import { normalizeProgress } from './progress-utils';
import { useTheme } from './theme';
import { Heading, UiText } from './text';

export interface MasteryProps {
  skillName: string;
  value: number;
  max?: number;
  description?: string;
  reviewText?: string;
  levels?: readonly MasteryLevel[];
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Mastery({
  skillName,
  value,
  max = 100,
  description,
  reviewText,
  levels = defaultMasteryLevels,
  accessibilityLabel,
  style,
  testID,
}: MasteryProps) {
  const theme = useTheme();
  const progress = normalizeProgress(value, max);
  const masteryLevel = getMasteryLevel(progress.percent, levels);
  const roundedPercent = Math.round(progress.percent);

  return (
    <Card
      accessibilityLabel={
        accessibilityLabel ?? `${skillName}, ${masteryLevel.label}, ${roundedPercent} אחוזים`
      }
      style={style}
      testID={testID}
    >
      <View style={{ gap: theme.spacing.sm }}>
        <View
          style={{
            alignItems: 'flex-start',
            direction: theme.direction,
            flexDirection: 'row',
            gap: theme.spacing.sm,
            justifyContent: 'space-between',
          }}
        >
          <Heading level={3} style={{ flex: 1 }}>
            {skillName}
          </Heading>
          <Badge tone={masteryLevel.tone}>{masteryLevel.label}</Badge>
        </View>
        {description !== undefined ? (
          <UiText color="textMuted" variant="bodySmall">
            {description}
          </UiText>
        ) : undefined}
        <ProgressBar
          accessibilityLabel={`שליטה ב${skillName}`}
          showValue
          tone={masteryLevel.tone === 'neutral' ? 'neutral' : 'teal'}
          value={progress.percent}
        />
        {reviewText !== undefined ? (
          <UiText color="textMuted" variant="caption">
            {reviewText}
          </UiText>
        ) : undefined}
      </View>
    </Card>
  );
}

export const MasteryCard = Mastery;
