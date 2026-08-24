import { Children, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { isTextOnlyBadgeContent } from './badge-utils';
import { useTheme } from './theme';
import { UiText } from './text';

export type BadgeTone = 'neutral' | 'teal' | 'info' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Badge({
  children,
  tone = 'neutral',
  accessibilityLabel,
  style,
  testID,
}: BadgeProps) {
  const theme = useTheme();
  const childNodes = Children.toArray(children);
  const palette = {
    neutral: { background: theme.colors.surfaceMuted, foreground: theme.colors.text },
    teal: { background: theme.colors.primarySoft, foreground: theme.colors.primary },
    info: { background: theme.colors.infoSurface, foreground: theme.colors.info },
    success: { background: theme.colors.successSurface, foreground: theme.colors.success },
    warning: { background: theme.colors.warningSurface, foreground: theme.colors.warning },
    danger: { background: theme.colors.dangerSurface, foreground: theme.colors.danger },
  }[tone];

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible={accessibilityLabel !== undefined}
      style={[
        {
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: palette.background,
          borderRadius: theme.radii.pill,
          direction: theme.direction,
          flexDirection: 'row',
          minHeight: 28,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xxs,
        },
        style,
      ]}
      testID={testID}
    >
      {isTextOnlyBadgeContent(childNodes) ? (
        <UiText style={{ color: palette.foreground }} variant="caption">
          {children}
        </UiText>
      ) : (
        children
      )}
    </View>
  );
}
