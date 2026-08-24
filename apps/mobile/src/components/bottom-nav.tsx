import { router, usePathname } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';

import { UiText, useTheme } from '@chartpath/ui';

import { Glyph, type GlyphName } from './glyph';

const items: readonly {
  readonly href: '/home' | '/review' | '/glossary' | '/progress' | '/settings';
  readonly label: string;
  readonly icon: GlyphName;
}[] = [
  { href: '/home', label: 'המסלול', icon: 'home' },
  { href: '/review', label: 'חזרות', icon: 'review' },
  { href: '/glossary', label: 'מילון', icon: 'glossary' },
  { href: '/progress', label: 'התקדמות', icon: 'progress' },
  { href: '/settings', label: 'הגדרות', icon: 'settings' },
];

export function BottomNav() {
  const theme = useTheme();
  const pathname = usePathname();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderTopWidth: 1,
        bottom: 0,
        direction: theme.direction,
        flexDirection: 'row',
        justifyContent: 'space-around',
        left: 0,
        paddingBottom: Platform.OS === 'ios' ? 20 : 7,
        paddingHorizontal: 8,
        paddingTop: 7,
        position: 'absolute',
        right: 0,
        zIndex: 20,
      }}
    >
      {items.map((item) => {
        const selected = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={item.href}
            onPress={() => router.replace(item.href)}
            style={{
              alignItems: 'center',
              borderRadius: 12,
              gap: 2,
              minHeight: 48,
              minWidth: 56,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Glyph
              color={selected ? theme.colors.primary : theme.colors.textMuted}
              name={item.icon}
              size={21}
            />
            <UiText color={selected ? 'primary' : 'textMuted'} variant="caption">
              {item.label}
            </UiText>
          </Pressable>
        );
      })}
    </View>
  );
}

export const navigationInset = Platform.OS === 'ios' ? 92 : 76;
