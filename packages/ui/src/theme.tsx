import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

import { createTheme, type ChartPathTheme, type ColorScheme, type LayoutDirection } from './tokens';

export type ThemeMode = ColorScheme | 'system';
export type ReducedMotionPreference = boolean | 'system';

export interface ThemeContextValue {
  theme: ChartPathTheme;
  reducedMotion: boolean;
}

const fallbackContext: ThemeContextValue = {
  theme: createTheme('light'),
  reducedMotion: false,
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
}

export function ChartPathThemeProvider({
  children,
  mode = 'system',
  direction = 'rtl',
  reducedMotion: reducedMotionPreference = 'system',
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
  const value = useMemo<ThemeContextValue>(
    () => ({ theme: createTheme(scheme, direction), reducedMotion }),
    [direction, reducedMotion, scheme],
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

export const ThemeProvider = ChartPathThemeProvider;
