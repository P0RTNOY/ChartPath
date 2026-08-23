import type { ReactNode } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from './theme';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  accessibilityLabel?: string;
  testID?: string;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  accessibilityLabel,
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const screenPadding =
    width >= 600 ? theme.layout.screenPaddingRegular : theme.layout.screenPaddingCompact;
  const rootStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: theme.colors.background,
      direction: theme.direction,
      flex: 1,
    },
    style,
  ];
  const contentStyle: StyleProp<ViewStyle> = [
    {
      alignSelf: 'center',
      flexGrow: 1,
      padding: padded ? screenPadding : 0,
      width: '100%',
      maxWidth: theme.layout.readableContentWidth,
    },
    contentContainerStyle,
  ];

  if (scroll) {
    return (
      <ScrollView
        accessibilityLabel={accessibilityLabel}
        contentContainerStyle={contentStyle}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        style={rootStyle}
        testID={testID}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={rootStyle} testID={testID}>
      <View style={contentStyle}>{children}</View>
    </View>
  );
}
