import { router } from 'expo-router';

import { Button, Screen, useTheme } from '@chartpath/ui';

import { EmptyState } from '@/components/app-state';
import { TopBar } from '@/components/top-bar';

export default function NotFoundScreen() {
  const theme = useTheme();
  return (
    <Screen contentContainerStyle={{ gap: theme.spacing.xl, justifyContent: 'center' }}>
      <TopBar back title="העמוד לא נמצא" />
      <EmptyState
        action={<Button onPress={() => router.replace('/home')}>חזרה למסלול</Button>}
        message="ייתכן שהקישור ישן או שהתוכן עודכן. ההתקדמות השמורה לא נפגעה."
        title="סטינו מהמסלול"
      />
    </Screen>
  );
}
