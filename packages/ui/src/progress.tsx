import { View, type StyleProp, type ViewStyle } from 'react-native';

import { normalizeProgress } from './progress-utils';
import { useTheme } from './theme';
import { LtrText, UiText } from './text';

export type ProgressTone = 'teal' | 'success' | 'warning' | 'danger' | 'neutral';

export interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  tone?: ProgressTone;
  showValue?: boolean;
  valueText?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'teal',
  showValue = false,
  valueText,
  accessibilityLabel,
  style,
  testID,
}: ProgressProps) {
  const theme = useTheme();
  const progress = normalizeProgress(value, max);
  const roundedPercent = Math.round(progress.percent);
  const readableValue = valueText ?? `${roundedPercent}%`;
  const fillColor = {
    teal: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
    neutral: theme.colors.chartNeutral,
  }[tone];

  return (
    <View style={[{ gap: theme.spacing.xs }, style]} testID={testID}>
      {label !== undefined || showValue ? (
        <View
          style={{
            alignItems: 'baseline',
            direction: theme.direction,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          {label !== undefined ? <UiText variant="label">{label}</UiText> : <View />}
          {showValue ? <LtrText variant="caption">{readableValue}</LtrText> : undefined}
        </View>
      ) : undefined}
      <View
        accessibilityLabel={accessibilityLabel ?? label ?? 'התקדמות'}
        accessibilityRole="progressbar"
        accessibilityValue={{
          max: Math.round(progress.max),
          min: 0,
          now: Math.round(progress.value),
          text: readableValue,
        }}
        style={{
          backgroundColor: theme.colors.surfaceMuted,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.pill,
          borderWidth: 1,
          height: 12,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <View
          style={{
            alignSelf: theme.direction === 'rtl' ? 'flex-end' : 'flex-start',
            backgroundColor: fillColor,
            borderRadius: theme.radii.pill,
            height: '100%',
            width: `${progress.percent}%`,
          }}
        />
      </View>
    </View>
  );
}

export const Progress = ProgressBar;
