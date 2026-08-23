import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from './theme';
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

  if (alignment === 'start') {
    return direction === 'rtl' ? 'right' : 'left';
  }

  return direction === 'rtl' ? 'left' : 'right';
}

export function UiText({
  variant = 'body',
  color = 'text',
  direction,
  align = 'start',
  style,
  allowFontScaling = true,
  maxFontSizeMultiplier = 2,
  ...props
}: UiTextProps) {
  const theme = useTheme();
  const resolvedDirection = direction ?? theme.direction;

  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        theme.typography[variant],
        {
          color: theme.colors[color],
          direction: resolvedDirection,
          textAlign: alignmentFor(resolvedDirection, align),
          writingDirection: resolvedDirection,
        },
        style,
      ]}
      {...props}
    />
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
