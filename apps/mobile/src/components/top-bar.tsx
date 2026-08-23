import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Heading, LtrText, UiText, useTheme } from '@chartpath/ui';

import { BrandMark } from './brand-mark';
import { Glyph } from './glyph';

export function TopBar({
  title,
  subtitle,
  back = false,
  trailing,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly back?: boolean;
  readonly trailing?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row-reverse',
        gap: theme.spacing.sm,
        minHeight: 54,
      }}
    >
      {back ? (
        <Pressable
          accessibilityLabel="חזרה"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={{
            alignItems: 'center',
            borderColor: theme.colors.border,
            borderRadius: 13,
            borderWidth: 1,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}
        >
          <Glyph name="back" size={28} />
        </Pressable>
      ) : (
        <BrandMark size={42} />
      )}
      <View style={{ flex: 1 }}>
        <Heading level={2}>{title}</Heading>
        {subtitle ? (
          <UiText color="textMuted" variant="caption">
            {subtitle}
          </UiText>
        ) : undefined}
      </View>
      {trailing}
    </View>
  );
}

export function MetricPill({
  label,
  value,
  icon,
}: {
  readonly label: string;
  readonly value: string;
  readonly icon?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={`${label}, ${value}`}
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: theme.radii.pill,
        flexDirection: 'row-reverse',
        gap: 6,
        minHeight: 38,
        paddingHorizontal: 12,
      }}
    >
      {icon}
      <LtrText variant="numeric">{value}</LtrText>
    </View>
  );
}
