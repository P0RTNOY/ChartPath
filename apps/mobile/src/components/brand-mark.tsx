import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { useTheme } from '@chartpath/ui';

export function BrandMark({ size = 42 }: { readonly size?: number }) {
  const theme = useTheme();

  return (
    <Svg
      accessibilityLabel="סמל ChartPath"
      height={size}
      role="img"
      viewBox="0 0 48 48"
      width={size}
    >
      <Rect fill={theme.colors.primary} height="48" rx="14" width="48" />
      <Line stroke={theme.colors.onPrimary} strokeWidth="2" x1="13" x2="13" y1="13" y2="33" />
      <Rect fill={theme.colors.onPrimary} height="10" rx="2" width="6" x="10" y="18" />
      <Line stroke={theme.colors.onPrimary} strokeWidth="2" x1="24" x2="24" y1="10" y2="35" />
      <Rect fill={theme.colors.onPrimary} height="13" rx="2" width="6" x="21" y="15" />
      <Line stroke={theme.colors.onPrimary} strokeWidth="2" x1="35" x2="35" y1="14" y2="37" />
      <Rect fill={theme.colors.onPrimary} height="9" rx="2" width="6" x="32" y="23" />
      <Path
        d="M10 37 C18 33 27 36 39 11"
        fill="none"
        stroke="#FFCE67"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <Circle cx="39" cy="11" fill="#FFCE67" r="2" />
    </Svg>
  );
}
