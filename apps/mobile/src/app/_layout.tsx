import '@/global.css';

import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChartPathThemeProvider, useReducedMotion } from '@chartpath/ui';

import { DISCLAIMER_VERSION, LearningProvider, useLearning } from '@/state/learning';

if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  I18nManager.swapLeftAndRightInRTL(false);
}

function AppTheme({ children }: { readonly children: React.ReactNode }) {
  const { snapshot } = useLearning();
  const preference = snapshot?.settings.theme ?? 'system';
  const reducedMotion = snapshot?.settings.reducedMotion ?? false;
  const textScalePreference = snapshot?.settings.textScale ?? 'system';
  const textScale =
    textScalePreference === 'extra-large' ? 1.3 : textScalePreference === 'large' ? 1.15 : 1;
  return (
    <ChartPathThemeProvider
      direction="rtl"
      mode={preference}
      reducedMotion={reducedMotion}
      textScale={textScale}
    >
      {children}
      <StatusBar style={preference === 'dark' ? 'light' : 'auto'} />
    </ChartPathThemeProvider>
  );
}

function NavigationGuard({ children }: { readonly children: React.ReactNode }) {
  const { snapshot, status } = useLearning();
  const segments = useSegments();
  const onboarded = snapshot?.settings.disclaimerVersionAccepted === DISCLAIMER_VERSION;

  useEffect(() => {
    if (status !== 'ready' || onboarded || segments[0] === 'onboarding') return;
    router.replace('/onboarding');
  }, [onboarded, segments, status]);

  return children;
}

function RootNavigator() {
  const reducedMotion = useReducedMotion();
  return (
    <Stack screenOptions={{ animation: reducedMotion ? 'none' : 'fade', headerShown: false }} />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LearningProvider>
        <AppTheme>
          <NavigationGuard>
            <RootNavigator />
          </NavigationGuard>
        </AppTheme>
      </LearningProvider>
    </GestureHandlerRootView>
  );
}
