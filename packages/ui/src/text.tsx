import type { ReactNode } from 'react';
import { Platform, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { isolateLtrRunsInHebrew } from './bidi';
import { useChartPathTheme } from './theme';
import type { LayoutDirection, ThemeColors, TypographyVariant } from './tokens';

export type TextColor = keyof ThemeColors;
export type TextAlignment = 'start' | 'center' | 'end';

export interface UiTextProps extends TextProps {
  children?: ReactNode;
  variant?: TypographyVariant;
  color?: TextColor;
  direction?: LayoutDirection;
  align?: TextAlignment;
  style?: StyleProp<TextStyle>;
}

function alignmentFor(
  direction: LayoutDirection,
  alignment: TextAlignment,
): TextStyle['textAlign'] {
  if (alignment === 'center') {
    return 'center';
  }

  const logicalAlignment =
    alignment === 'start'
      ? direction === 'rtl'
        ? 'right'
        : 'left'
      : direction === 'rtl'
        ? 'left'
        : 'right';

  // Fabric mirrors physical text alignment inside an RTL root on native. Supplying
  // the opposite physical edge yields the requested logical start/end alignment.
  if (Platform.OS !== 'web') return logicalAlignment === 'right' ? 'left' : 'right';
  return logicalAlignment;
}

function isolateMixedChildren(children: ReactNode): ReactNode {
  if (typeof children === 'string') return isolateLtrRunsInHebrew(children);
  if (Array.isArray(children)) return children.map(isolateMixedChildren);
  return children;
}

export function UiText({
  variant = 'body',
  color = 'text',
  direction,
  align = 'start',
  style,
  allowFontScaling = true,
  maxFontSizeMultiplier = 2,
  children,
  ...props
}: UiTextProps) {
  const { theme, textScale } = useChartPathTheme();
  const resolvedDirection = direction ?? theme.direction;
  const typography = theme.typography[variant];
  const scaledTypography: TextStyle = {
    ...typography,
    fontSize: typeof typography.fontSize === 'number' ? typography.fontSize * textScale : undefined,
    lineHeight:
      typeof typography.lineHeight === 'number' ? typography.lineHeight * textScale : undefined,
  };

  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        scaledTypography,
        {
          color: theme.colors[color],
          // On native, Yoga applies `direction` to the Text node's layout and iOS then
          // mirrors the already-physical `textAlign` value. Keep CSS direction on web,
          // while native uses writingDirection for glyph flow and an explicit alignment.
          direction: Platform.OS === 'web' ? resolvedDirection : undefined,
          textAlign: alignmentFor(resolvedDirection, align),
          writingDirection: resolvedDirection,
        },
        style,
      ]}
      {...props}
    >
      {resolvedDirection === 'rtl' ? isolateMixedChildren(children) : children}
    </Text>
  );
}

export interface HeadingProps extends Omit<UiTextProps, 'variant'> {
  level?: 1 | 2 | 3;
}

export function Heading({ level = 2, accessibilityRole = 'header', ...props }: HeadingProps) {
  const variant: TypographyVariant =
    level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3';

  return <UiText accessibilityRole={accessibilityRole} variant={variant} {...props} />;
}

export function LtrText({ align = 'start', ...props }: Omit<UiTextProps, 'direction'>) {
  return <UiText align={align} direction="ltr" {...props} />;
}
