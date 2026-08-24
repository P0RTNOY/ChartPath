import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@chartpath/ui';

const glyphs = {
  home: '⌂',
  review: '↻',
  glossary: 'א',
  progress: '◔',
  settings: '⚙',
  back: '‹',
  lock: '•',
  check: '✓',
  flame: '◆',
  spark: '✦',
  chart: '⌁',
  clock: '◷',
  book: '▤',
  close: '×',
  up: '↑',
  down: '↓',
  info: 'i',
} as const;

export type GlyphName = keyof typeof glyphs;

export function Glyph({
  name,
  color,
  size = 20,
}: {
  readonly name: GlyphName;
  readonly color?: string;
  readonly size?: number;
}) {
  const theme = useTheme();
  const glyph = name === 'back' && theme.direction === 'rtl' ? '›' : glyphs[name];
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        color: color ?? theme.colors.text,
        fontSize: size,
        fontWeight: '700',
        lineHeight: size + 3,
      }}
    >
      {glyph}
    </Text>
  );
}

export function IconBubble({
  children,
  tone = 'primary',
}: {
  readonly children: ReactNode;
  readonly tone?: 'primary' | 'gold' | 'muted';
}) {
  const theme = useTheme();
  const backgroundColor =
    tone === 'primary'
      ? theme.colors.primarySoft
      : tone === 'gold'
        ? theme.colors.warningSurface
        : theme.colors.surfaceMuted;
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor,
        borderRadius: 14,
        height: 44,
        justifyContent: 'center',
        width: 44,
      }}
    >
      {children}
    </View>
  );
}
