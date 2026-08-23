import type { ReactNode } from 'react';
import {
  Pressable,
  View,
  type AccessibilityRole,
  type AccessibilityState,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from './theme';
import type { SpacingToken } from './tokens';

export type CardVariant = 'default' | 'subtle' | 'outlined' | 'accent';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: SpacingToken;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  onLongPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  style,
  testID,
}: CardProps) {
  const theme = useTheme();
  const interactive = onPress !== undefined || onLongPress !== undefined;
  const variantStyle: ViewStyle = {
    backgroundColor:
      variant === 'subtle'
        ? theme.colors.surfaceMuted
        : variant === 'accent'
          ? theme.colors.primarySoft
          : theme.colors.surface,
    borderColor: variant === 'accent' ? theme.colors.primary : theme.colors.border,
    borderWidth: variant === 'outlined' || variant === 'accent' ? 1 : 0,
  };
  const baseStyle: ViewStyle = {
    borderRadius: theme.radii.lg,
    direction: theme.direction,
    minHeight: interactive ? theme.layout.minimumTouchTarget : undefined,
    padding: theme.spacing[padding],
    ...(variant === 'default' ? theme.shadows.card : {}),
  };

  if (!interactive) {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        accessible={accessibilityLabel !== undefined}
        style={[baseStyle, variantStyle, style]}
        testID={testID}
      >
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        baseStyle,
        variantStyle,
        pressed && !disabled
          ? {
              opacity: 0.88,
              borderColor: theme.colors.focus,
            }
          : undefined,
        disabled ? { opacity: 0.52 } : undefined,
        style,
      ]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}
