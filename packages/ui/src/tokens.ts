import type { TextStyle, ViewStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';
export type LayoutDirection = 'rtl' | 'ltr';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  secondary: string;
  secondaryPressed: string;
  secondarySoft: string;
  border: string;
  borderStrong: string;
  focus: string;
  success: string;
  successStrong: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  danger: string;
  dangerStrong: string;
  dangerSurface: string;
  onDanger: string;
  info: string;
  infoSurface: string;
  overlay: string;
  chartGrid: string;
  chartUp: string;
  chartDown: string;
  chartNeutral: string;
}

export const lightColors: ThemeColors = {
  background: '#F3F7FA',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceMuted: '#E8F0F4',
  text: '#0A2438',
  textMuted: '#3F5D6E',
  textInverse: '#FFFFFF',
  primary: '#006C67',
  primaryPressed: '#00524F',
  primarySoft: '#D8F2EF',
  onPrimary: '#FFFFFF',
  secondary: '#165D7A',
  secondaryPressed: '#0E465E',
  secondarySoft: '#DCEEF5',
  border: '#B6CAD4',
  borderStrong: '#7695A4',
  focus: '#006E91',
  success: '#126B4A',
  successStrong: '#0A6847',
  successSurface: '#D9F2E7',
  warning: '#755500',
  warningSurface: '#FFF1BD',
  danger: '#A31D36',
  dangerStrong: '#95172F',
  dangerSurface: '#FBE5E9',
  onDanger: '#FFFFFF',
  info: '#075A82',
  infoSurface: '#DDEFFA',
  overlay: 'rgba(5, 24, 36, 0.62)',
  chartGrid: '#B6CAD4',
  chartUp: '#006C67',
  chartDown: '#A13D17',
  chartNeutral: '#526E7E',
};

export const darkColors: ThemeColors = {
  background: '#061722',
  surface: '#0C2534',
  surfaceRaised: '#123244',
  surfaceMuted: '#173A4B',
  text: '#F3F9FB',
  textMuted: '#B8CDD6',
  textInverse: '#08202D',
  primary: '#5AD5CB',
  primaryPressed: '#82E5DD',
  primarySoft: '#153F41',
  onPrimary: '#062724',
  secondary: '#85D1F0',
  secondaryPressed: '#ADE2F6',
  secondarySoft: '#153849',
  border: '#426171',
  borderStrong: '#7893A0',
  focus: '#8BE8E0',
  success: '#8AE2B9',
  successStrong: '#0B6848',
  successSurface: '#123B2E',
  warning: '#FFD875',
  warningSurface: '#3C3011',
  danger: '#FFACB7',
  dangerStrong: '#982E43',
  dangerSurface: '#471D28',
  onDanger: '#FFFFFF',
  info: '#92D8F7',
  infoSurface: '#123445',
  overlay: 'rgba(0, 9, 14, 0.72)',
  chartGrid: '#426171',
  chartUp: '#5AD5CB',
  chartDown: '#FFB170',
  chartNeutral: '#AAC0CA',
};

export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  giant: 64,
} as const;

export type SpacingToken = keyof typeof spacing;

export const radii = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heading1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  heading2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  },
  heading3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
  },
  bodySmall: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  numeric: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export function normalizeTextScale(value: number): number {
  return Number.isFinite(value) ? Math.min(1.4, Math.max(1, value)) : 1;
}

export const layout = {
  minimumTouchTarget: 44,
  comfortableTouchTarget: 48,
  readableContentWidth: 760,
  screenPaddingCompact: spacing.md,
  screenPaddingRegular: spacing.xl,
} as const;

export interface ThemeShadows {
  card: ViewStyle;
  floating: ViewStyle;
}

const lightShadows: ThemeShadows = {
  card: {
    shadowColor: '#061722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#061722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
};

const darkShadows: ThemeShadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 7,
  },
};

export interface ChartPathTheme {
  scheme: ColorScheme;
  direction: LayoutDirection;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  layout: typeof layout;
  shadows: ThemeShadows;
}

export function createTheme(
  scheme: ColorScheme,
  direction: LayoutDirection = 'rtl',
): ChartPathTheme {
  return {
    scheme,
    direction,
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radii,
    typography,
    layout,
    shadows: scheme === 'dark' ? darkShadows : lightShadows,
  };
}

export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');
