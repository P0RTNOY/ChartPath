import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from './theme';
import { UiText } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'compact' | 'default' | 'large';

export interface ButtonProps {
  children: ReactNode;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  leadingAccessory?: ReactNode;
  trailingAccessory?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  loadingLabel = 'טוענים…',
  accessibilityLabel,
  accessibilityHint,
  leadingAccessory,
  trailingAccessory,
  fullWidth = false,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const palette = {
    primary: {
      background: theme.colors.primary,
      pressed: theme.colors.primaryPressed,
      foreground: theme.colors.onPrimary,
      border: theme.colors.primary,
    },
    secondary: {
      background: theme.colors.surface,
      pressed: theme.colors.secondarySoft,
      foreground: theme.colors.secondary,
      border: theme.colors.secondary,
    },
    ghost: {
      background: 'transparent',
      pressed: theme.colors.primarySoft,
      foreground: theme.colors.primary,
      border: 'transparent',
    },
    danger: {
      background: theme.colors.dangerStrong,
      pressed: theme.colors.danger,
      foreground: theme.colors.onDanger,
      border: theme.colors.dangerStrong,
    },
  }[variant];
  const height =
    size === 'compact'
      ? theme.layout.minimumTouchTarget
      : size === 'large'
        ? 56
        : theme.layout.comfortableTouchTarget;
  const horizontalPadding =
    size === 'compact' ? theme.spacing.sm : size === 'large' ? theme.spacing.xl : theme.spacing.lg;
  const visibleLabel = loading ? loadingLabel : children;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          alignSelf: fullWidth ? 'stretch' : 'auto',
          backgroundColor: pressed && !isDisabled ? palette.pressed : palette.background,
          borderColor: palette.border,
          borderRadius: theme.radii.md,
          borderWidth: variant === 'ghost' ? 0 : 1,
          direction: theme.direction,
          flexDirection: 'row',
          gap: theme.spacing.xs,
          justifyContent: 'center',
          minHeight: height,
          minWidth: theme.layout.minimumTouchTarget,
          opacity: isDisabled ? 0.52 : 1,
          paddingHorizontal: horizontalPadding,
          paddingVertical: theme.spacing.xs,
        },
        style,
      ]}
      testID={testID}
    >
      {loading ? <ActivityIndicator color={palette.foreground} size="small" /> : leadingAccessory}
      <View style={{ flexShrink: 1 }}>
        {typeof visibleLabel === 'string' || typeof visibleLabel === 'number' ? (
          <UiText align="center" color="text" style={{ color: palette.foreground }} variant="label">
            {visibleLabel}
          </UiText>
        ) : (
          visibleLabel
        )}
      </View>
      {!loading ? trailingAccessory : undefined}
    </Pressable>
  );
}
