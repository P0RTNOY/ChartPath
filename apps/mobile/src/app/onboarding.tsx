import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  Heading,
  LtrText,
  ProgressBar,
  Screen,
  UiText,
  useTheme,
} from '@chartpath/ui';

import { BrandMark } from '@/components/brand-mark';
import { ErrorState, LoadingState } from '@/components/app-state';
import { Glyph, IconBubble } from '@/components/glyph';
import { useLearning } from '@/state/learning';

const goals = [5, 10, 15, 20] as const;

export default function OnboardingScreen() {
  const theme = useTheme();
  const learning = useLearning();
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [goal, setGoal] = useState(10);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (learning.status === 'loading') return <LoadingState />;
  if (learning.status === 'error')
    return (
      <ErrorState message={learning.error ?? 'שגיאה'} onRetry={() => void learning.reload()} />
    );

  const finish = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await learning.acceptDisclaimer(goal);
      router.replace('/home');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'לא הצלחנו לשמור.');
      setSaving(false);
    }
  };

  return (
    <Screen
      accessibilityLabel="היכרות עם ChartPath"
      contentContainerStyle={{ gap: theme.spacing.xl, justifyContent: 'space-between' }}
      scroll
      style={{ direction: theme.direction }}
      testID="onboarding-screen"
    >
      <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingTop: theme.spacing.xl }}>
        <BrandMark size={68} />
        <LtrText
          align="center"
          color="primary"
          style={{ fontSize: 18, fontWeight: '800', letterSpacing: 2 }}
        >
          CHARTPATH
        </LtrText>
        <ProgressBar
          accessibilityLabel={`שלב ${step + 1} מתוך 3`}
          showValue={false}
          style={{ alignSelf: 'stretch' }}
          value={(step + 1) * (100 / 3)}
        />
      </View>

      {step === 0 ? (
        <View style={{ gap: theme.spacing.xl }}>
          <View style={{ gap: theme.spacing.sm }}>
            <Badge tone="teal">ללמוד לראות לפני שמחליטים</Badge>
            <Heading align="center" level={1}>
              מסלול ברור לקריאת גרפים
            </Heading>
            <UiText align="center" color="textMuted">
              תרגול קצר, משוב מיידי וחזרה חכמה. לומדים לזהות מבנה, ראיות וסיכון — בלי הבטחות ובלי
              קיצורי דרך.
            </UiText>
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            {[
              ['chart', 'תרגול חזותי', 'מסמנים רמות, קווים ואזורי החלטה על גרפים אינטראקטיביים.'],
              ['spark', 'משוב שמסביר', 'לא רק נכון או לא נכון — גם מה לראות בפעם הבאה.'],
              ['review', 'חזרה מותאמת', 'מיומנויות שדורשות חיזוק חוזרות בזמן המתאים.'],
            ].map(([icon, title, body]) => (
              <Card
                key={title}
                style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}
                variant="outlined"
              >
                <IconBubble>
                  <Glyph name={icon as 'chart'} />
                </IconBubble>
                <View style={{ flex: 1, gap: 3 }}>
                  <Heading level={3}>{title}</Heading>
                  <UiText color="textMuted" variant="bodySmall">
                    {body}
                  </UiText>
                </View>
              </Card>
            ))}
          </View>
          <Button
            accessibilityHint="אין חשבון ואין סנכרון ענן; פרטי גיבוי זמינים בהגדרות"
            fullWidth
            onPress={() => setStep(1)}
            size="large"
            testID="onboarding-continue-guest"
          >
            המשך כאורח
          </Button>
          <UiText align="center" color="textMuted" variant="caption">
            אין צורך בחשבון ואין סנכרון ענן. פרטי גיבוי המכשיר זמינים בהגדרות.
          </UiText>
        </View>
      ) : undefined}

      {step === 1 ? (
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <IconBubble tone="gold">
              <Glyph name="info" />
            </IconBubble>
            <Heading align="center" level={1}>
              לפני שמתחילים
            </Heading>
            <UiText align="center" color="textMuted">
              ChartPath הוא מרחב לימודי לקבלת החלטות מבוססות ראיות.
            </UiText>
          </View>
          <Card variant="outlined">
            <View style={{ gap: theme.spacing.md }}>
              <Heading level={3}>הבהרה חשובה</Heading>
              <UiText>
                התכנים והתרגילים מיועדים ללימוד בלבד. הם אינם ייעוץ השקעות, אינם מותאמים למצבך האישי
                ואינם הוראה לקנות או למכור.
              </UiText>
              <UiText>
                ניתוח טכני עוסק בתרחישים ובהסתברויות. הפסד אפשרי תמיד, וגם תבנית שנראית תקפה עלולה
                להיכשל.
              </UiText>
              <UiText color="textMuted" variant="bodySmall">
                תשובות כמו ״להמתין״, ״אין עסקה״ ו״אין מספיק ראיות״ הן החלטות מקצועיות ולגיטימיות.
              </UiText>
            </View>
          </Card>
          <Pressable
            accessibilityLabel="קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            onPress={() => setAccepted((value) => !value)}
            style={{ alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 48 }}
            testID="onboarding-disclaimer-ack"
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: accepted ? theme.colors.primary : theme.colors.surface,
                borderColor: accepted ? theme.colors.primary : theme.colors.borderStrong,
                borderRadius: 7,
                borderWidth: 2,
                height: 28,
                justifyContent: 'center',
                width: 28,
              }}
            >
              {accepted ? (
                <Glyph color={theme.colors.onPrimary} name="check" size={18} />
              ) : undefined}
            </View>
            <UiText style={{ flex: 1 }} variant="label">
              קראתי, הבנתי ואני רוצה להמשיך
            </UiText>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button onPress={() => setStep(0)} variant="ghost">
              חזרה
            </Button>
            <Button
              disabled={!accepted}
              fullWidth
              onPress={() => setStep(2)}
              style={{ flex: 1 }}
              testID="onboarding-continue-goal"
            >
              המשך
            </Button>
          </View>
        </View>
      ) : undefined}

      {step === 2 ? (
        <View style={{ gap: theme.spacing.xl }}>
          <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <IconBubble>
              <Glyph name="clock" />
            </IconBubble>
            <Heading align="center" level={1}>
              כמה זמן ביום?
            </Heading>
            <UiText align="center" color="textMuted">
              יעד קטן וקבוע עדיף על מרתון חד־פעמי. אפשר לשנות אותו בכל עת.
            </UiText>
          </View>
          <View
            accessibilityRole="radiogroup"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              justifyContent: 'center',
            }}
          >
            {goals.map((minutes) => {
              const selected = goal === minutes;
              return (
                <Pressable
                  accessibilityLabel={`${minutes} דקות ביום`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  aria-checked={selected}
                  key={minutes}
                  onPress={() => setGoal(minutes)}
                  style={{
                    alignItems: 'center',
                    backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                    borderRadius: 16,
                    borderWidth: selected ? 2 : 1,
                    minHeight: 86,
                    minWidth: 112,
                    padding: 14,
                  }}
                  testID={`onboarding-goal-${minutes}`}
                >
                  <LtrText
                    align="center"
                    color={selected ? 'primary' : 'text'}
                    style={{ fontSize: 28, fontWeight: '800' }}
                  >
                    {minutes}
                  </LtrText>
                  <UiText align="center" color="textMuted" variant="caption">
                    דקות ביום
                  </UiText>
                </Pressable>
              );
            })}
          </View>
          <Card variant="subtle">
            <UiText align="center" color="textMuted" variant="bodySmall">
              המלצה להתחלה:{' '}
              <LtrText color="primary" variant="numeric">
                10
              </LtrText>{' '}
              דקות — שיעור אחד קצר ביום.
            </UiText>
          </Card>
          {saveError ? (
            <UiText align="center" color="danger">
              {saveError}
            </UiText>
          ) : undefined}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button disabled={saving} onPress={() => setStep(1)} variant="ghost">
              חזרה
            </Button>
            <Button
              fullWidth
              loading={saving}
              onPress={() => void finish()}
              style={{ flex: 1 }}
              testID="onboarding-finish"
            >
              בנו לי מסלול
            </Button>
          </View>
        </View>
      ) : undefined}
    </Screen>
  );
}
