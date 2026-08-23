import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

import {
  createTheme,
  normalizeTextScale,
  type ChartPathTheme,
  type ColorScheme,
  type LayoutDirection,
} from './tokens';

export type ThemeMode = ColorScheme | 'system';
export type ReducedMotionPreference = boolean | 'system';

export interface ThemeContextValue {
  theme: ChartPathTheme;
  reducedMotion: boolean;
  textScale: number;
}

const fallbackContext: ThemeContextValue = {
  theme: createTheme('light'),
  reducedMotion: false,
  textScale: 1,
};

const ThemeContext = createContext<ThemeContextValue>(fallbackContext);

function useSystemReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReducedMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}

export interface ChartPathThemeProviderProps {
  children: ReactNode;
  mode?: ThemeMode;
  direction?: LayoutDirection;
  reducedMotion?: ReducedMotionPreference;
  textScale?: number;
}

export function ChartPathThemeProvider({
  children,
  mode = 'system',
  direction = 'rtl',
  reducedMotion: reducedMotionPreference = 'system',
  textScale = 1,
}: ChartPathThemeProviderProps) {
  const systemScheme = useColorScheme();
  const systemReducedMotion = useSystemReducedMotion();
  const scheme: ColorScheme =
    mode === 'system' && (systemScheme === 'light' || systemScheme === 'dark')
      ? systemScheme
      : mode === 'dark'
        ? 'dark'
        : 'light';
  const reducedMotion =
    reducedMotionPreference === 'system' ? systemReducedMotion : reducedMotionPreference;
  const safeTextScale = normalizeTextScale(textScale);
  const value = useMemo<ThemeContextValue>(
    () => ({ theme: createTheme(scheme, direction), reducedMotion, textScale: safeTextScale }),
    [direction, reducedMotion, safeTextScale, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useChartPathTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useTheme(): ChartPathTheme {
  return useChartPathTheme().theme;
}

export function useReducedMotion(): boolean {
  return useChartPathTheme().reducedMotion;
}

export function useTextScale(): number {
  return useChartPathTheme().textScale;
}

export const ThemeProvider = ChartPathThemeProvider;
