import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { contentVersion } from '@chartpath/content';
import { Badge, Button, Card, Heading, LtrText, UiText, useTheme } from '@chartpath/ui';

import { ErrorState, LoadingState } from '@/components/app-state';
import { BrandMark } from '@/components/brand-mark';
import { Glyph, IconBubble } from '@/components/glyph';
import { MainScreen } from '@/components/main-screen';
import { TopBar } from '@/components/top-bar';
import type { TextScalePreference, ThemePreference } from '@/lib/persistence';
import { useLearning } from '@/state/learning';

function SettingRow({
  title,
  description,
  control,
}: {
  readonly title: string;
  readonly description: string;
  readonly control: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.spacing.md,
        minHeight: 58,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <UiText variant="label">{title}</UiText>
        <UiText color="textMuted" variant="caption">
          {description}
        </UiText>
      </View>
      {control}
    </View>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
  readonly label: string;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="radiogroup"
      style={{
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: 13,
        flexDirection: 'row',
        gap: 3,
        padding: 3,
      }}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              backgroundColor: selected ? theme.colors.surface : 'transparent',
              borderRadius: 10,
              minHeight: 44,
              minWidth: 65,
              paddingHorizontal: 10,
              paddingVertical: 9,
            }}
          >
            <UiText align="center" color={selected ? 'primary' : 'textMuted'} variant="caption">
              {option.label}
            </UiText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const learning = useLearning();
  const [confirmReset, setConfirmReset] = useState(false);
  const [working, setWorking] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const reset = async () => {
    setWorking(true);
    setResetError(null);
    try {
      await learning.resetData();
      router.replace('/onboarding');
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'האיפוס נכשל. נסו שוב.');
    } finally {
      setWorking(false);
    }
  };
  if (learning.status === 'loading') return <LoadingState />;
  if (learning.status === 'error' || !learning.snapshot)
    return (
      <ErrorState
        message={resetError ?? learning.error ?? 'שגיאה בטעינת ההגדרות'}
        onRetry={() => void learning.reload()}
        onSecondaryAction={() => {
          if (!confirmReset) {
            setConfirmReset(true);
            return;
          }
          void reset();
        }}
        secondaryActionLabel={confirmReset ? 'אישור מחיקה ואיפוס' : 'איפוס נתונים פגומים'}
      />
    );
  const settings = learning.snapshot.settings;
  const update = async (patch: Parameters<typeof learning.updateSettings>[0]) => {
    setWorking(true);
    try {
      await learning.updateSettings(patch);
    } finally {
      setWorking(false);
    }
  };
  return (
    <MainScreen contentContainerStyle={{ gap: theme.spacing.xl }} scroll>
      <TopBar subtitle="התאמה אישית, נגישות ונתונים" title="הגדרות" />
      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <Heading level={2}>תצוגה</Heading>
          <SettingRow
            control={
              <Segmented<ThemePreference>
                label="בחירת ערכת נושא"
                onChange={(value) => void update({ theme: value })}
                options={[
                  { value: 'system', label: 'מערכת' },
                  { value: 'light', label: 'בהיר' },
                  { value: 'dark', label: 'כהה' },
                ]}
                value={settings.theme}
              />
            }
            description="בהיר, כהה או לפי הגדרת המכשיר"
            title="ערכת נושא"
          />
          <View style={{ backgroundColor: theme.colors.border, height: 1 }} />
          <SettingRow
            control={
              <Switch
                accessibilityLabel="הפחתת תנועה"
                disabled={working}
                onValueChange={(value) => void update({ reducedMotion: value })}
                testID="reduced-motion-switch"
                thumbColor={settings.reducedMotion ? theme.colors.primary : undefined}
                trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primarySoft }}
                value={settings.reducedMotion}
              />
            }
            description="מבטל אנימציות שאינן חיוניות"
            title="הפחתת תנועה"
          />
          <View style={{ backgroundColor: theme.colors.border, height: 1 }} />
          <SettingRow
            control={
              <Segmented<TextScalePreference>
                label="גודל טקסט"
                onChange={(value) => void update({ textScale: value })}
                options={[
                  { value: 'system', label: 'רגיל' },
                  { value: 'large', label: 'גדול' },
                  { value: 'extra-large', label: 'גדול מאוד' },
                ]}
                value={settings.textScale}
              />
            }
            description="גודל הטקסט מותאם גם להגדרות המכשיר"
            title="טקסט גדול"
          />
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <Heading level={2}>למידה יומית</Heading>
          <UiText color="textMuted" variant="bodySmall">
            יעד דקות ליום
          </UiText>
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          >
            {[5, 10, 15, 20].map((minutes) => {
              const selected = settings.dailyGoalMinutes === minutes;
              return (
                <Pressable
                  accessibilityLabel={`${minutes} דקות`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  aria-checked={selected}
                  key={minutes}
                  onPress={() => void update({ dailyGoalMinutes: minutes })}
                  style={{
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceMuted,
                    borderRadius: 12,
                    minHeight: 44,
                    minWidth: 64,
                    padding: 11,
                  }}
                >
                  <LtrText align="center" color={selected ? 'onPrimary' : 'text'} variant="numeric">
                    {minutes}
                  </LtrText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Card onPress={() => router.push('/disclaimer')} variant="outlined">
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
          <IconBubble tone="gold">
            <Glyph name="info" />
          </IconBubble>
          <View style={{ flex: 1 }}>
            <Heading level={3}>הבהרה לימודית</Heading>
            <UiText color="textMuted" variant="bodySmall">
              צפייה מחדש בהבהרה ובגבולות התוכן
            </UiText>
          </View>
        </View>
      </Card>

      <Card variant="outlined">
        <View style={{ gap: theme.spacing.md }}>
          <Heading level={2}>הנתונים שלי</Heading>
          <UiText color="textMuted" variant="bodySmall">
            הניסיונות, ההתקדמות וההגדרות נשמרים מקומית במכשיר. אין חשבון ואין סנכרון ענן.
          </UiText>
          <UiText color="textMuted" variant="caption">
            גיבוי האפליקציה מושבת ב־Android. ב־iOS ייתכן שנתוני הלימוד המקומיים ייכללו בגיבוי המכשיר
            או iCloud, לפי הגדרות המערכת.
          </UiText>
          {!confirmReset ? (
            <Button fullWidth onPress={() => setConfirmReset(true)} variant="danger">
              איפוס כל הנתונים
            </Button>
          ) : (
            <Card variant="subtle">
              <View style={{ gap: 12 }}>
                <UiText color="danger" variant="label">
                  האיפוס ימחק מהמכשיר את כל הניסיונות וההתקדמות, ולא ניתן לבטל אותו.
                </UiText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button loading={working} onPress={() => void reset()} variant="danger">
                    מחיקה ואיפוס
                  </Button>
                  <Button disabled={working} onPress={() => setConfirmReset(false)} variant="ghost">
                    ביטול
                  </Button>
                </View>
                {resetError ? <UiText color="danger">{resetError}</UiText> : undefined}
              </View>
            </Card>
          )}
        </View>
      </Card>

      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
        <BrandMark size={38} />
        {__DEV__ ? (
          <Pressable
            accessibilityHint="לחיצה ארוכה פותחת כלי בדיקה למפתחים"
            accessibilityLabel={`ChartPath ${contentVersion.id}`}
            delayLongPress={800}
            onLongPress={() => router.push('/catalog?developer=1')}
          >
            <LtrText align="center" color="textMuted" variant="caption">
              ChartPath • {contentVersion.id}
            </LtrText>
          </Pressable>
        ) : (
          <LtrText align="center" color="textMuted" variant="caption">
            ChartPath • {contentVersion.id}
          </LtrText>
        )}
        <Badge tone="neutral">תוכן לימודי בלבד</Badge>
      </View>
    </MainScreen>
  );
}
