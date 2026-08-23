import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from './button';
import { useChartPathTheme } from './theme';
import { Heading, UiText } from './text';

export type FeedbackTone = 'correct' | 'corrective' | 'info' | 'warning';

export interface FeedbackProps {
  title: string;
  message: string;
  tone?: FeedbackTone;
  detail?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionAccessibilityLabel?: string;
  animationKey?: string | number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Feedback({
  title,
  message,
  tone = 'info',
  detail,
  actionLabel,
  onAction,
  actionAccessibilityLabel,
  animationKey,
  accessibilityLabel,
  style,
  testID,
}: FeedbackProps) {
  const { theme, reducedMotion } = useChartPathTheme();
  const reveal = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const palette = {
    correct: {
      background: theme.colors.successSurface,
      border: theme.colors.success,
      foreground: theme.colors.success,
      marker: '✓',
    },
    corrective: {
      background: theme.colors.dangerSurface,
      border: theme.colors.danger,
      foreground: theme.colors.danger,
      marker: '!',
    },
    info: {
      background: theme.colors.infoSurface,
      border: theme.colors.info,
      foreground: theme.colors.info,
      marker: 'i',
    },
    warning: {
      background: theme.colors.warningSurface,
      border: theme.colors.warning,
      foreground: theme.colors.warning,
      marker: '!',
    },
  }[tone];

  useEffect(() => {
    reveal.stopAnimation();

    if (reducedMotion) {
      reveal.setValue(1);
      return;
    }

    reveal.setValue(0);
    const animation = Animated.timing(reveal, {
      duration: 220,
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [animationKey, reducedMotion, reveal]);

  return (
    <Animated.View
      accessibilityLabel={accessibilityLabel ?? `${title}. ${message}`}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessible={onAction === undefined}
      style={[
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: theme.radii.lg,
          borderStartWidth: 4,
          direction: theme.direction,
          opacity: reveal,
          padding: theme.spacing.md,
          transform: [
            {
              translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: reducedMotion ? [0, 0] : [8, 0],
              }),
            },
          ],
        },
        style,
      ]}
      testID={testID}
    >
      <View style={{ gap: theme.spacing.sm }}>
        <View
          style={{
            alignItems: 'center',
            direction: theme.direction,
            flexDirection: 'row',
            gap: theme.spacing.sm,
          }}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              alignItems: 'center',
              borderColor: palette.border,
              borderRadius: theme.radii.pill,
              borderWidth: 2,
              height: 28,
              justifyContent: 'center',
              width: 28,
            }}
          >
            <UiText align="center" style={{ color: palette.foreground }} variant="label">
              {palette.marker}
            </UiText>
          </View>
          <Heading level={3} style={{ color: palette.foreground, flex: 1 }}>
            {title}
          </Heading>
        </View>
        <UiText>{message}</UiText>
        {detail}
        {actionLabel !== undefined && onAction !== undefined ? (
          <Button
            accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
            onPress={onAction}
            variant="secondary"
          >
            {actionLabel}
          </Button>
        ) : undefined}
      </View>
    </Animated.View>
  );
}

export const FeedbackPanel = Feedback;
