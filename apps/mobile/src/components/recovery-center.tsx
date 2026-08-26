import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, Pressable, View } from 'react-native';

import { Badge, Button, Card, Heading, LtrText, Screen, UiText, useTheme } from '@chartpath/ui';

import { LoadingState } from './app-state';
import { RecoveryBundlePanel } from './recovery-bundle-panel';
import { TopBar } from './top-bar';
import type {
  QuarantinedAnalysisSession,
  QuarantinedPaperExecutionSession,
  QuarantinedPositionManagementSession,
} from '@/lib/persistence';
import { useLearning } from '@/state/learning';

type RecoveryKind = 'analysis' | 'paper' | 'management';
type QuarantineItem =
  | QuarantinedAnalysisSession
  | QuarantinedPaperExecutionSession
  | QuarantinedPositionManagementSession;

const recoveryLabels: Readonly<Record<RecoveryKind, string>> = {
  analysis: 'טיוטות ניתוח',
  paper: 'טיוטות ביצוע על נייר',
  management: 'יומני ניהול פוזיציה',
};

function focusAccessibleTarget(target: View | null): void {
  if (!target) return;
  if (Platform.OS === 'web') {
    requestAnimationFrame(() =>
      (target as unknown as { readonly focus?: () => void }).focus?.(),
    );
    return;
  }
  const handle = findNodeHandle(target);
  if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
}

function QuarantineSection({
  items,
  kind,
  selected,
  toggle,
  requestDiscard,
}: {
  readonly items: readonly QuarantineItem[];
  readonly kind: RecoveryKind;
  readonly selected: ReadonlySet<string>;
  readonly toggle: (quarantineId: string) => void;
  readonly requestDiscard: () => void;
}) {
  const theme = useTheme();
  if (!items.length) return null;

  return (
    <Card testID={`recovery-section-${kind}`} variant="outlined">
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Heading level={2}>{recoveryLabels[kind]}</Heading>
          <Badge tone="warning">{`${items.length} בהסגר`}</Badge>
        </View>
        <UiText color="textMuted" variant="bodySmall">
          הרשומה המקורית נשמרת מקומית ולא מוצגת במסך. הסרה מוחקת רק את הטיוטות שסומנו ואינה
          מוחקת ניסיונות או התקדמות.
        </UiText>
        {items.map((item, index) => {
          const checked = selected.has(item.quarantineId);
          return (
            <Pressable
              accessibilityLabel={`${recoveryLabels[kind]}, רשומה ${index + 1}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              aria-checked={checked}
              key={item.quarantineId}
              onPress={() => toggle(item.quarantineId)}
              style={{
                borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
                borderRadius: theme.radii.md,
                borderWidth: checked ? 2 : 1,
                gap: 6,
                minHeight: 64,
                padding: theme.spacing.sm,
              }}
              testID={`recovery-item-${kind}-${index + 1}`}
            >
              <UiText variant="label">{checked ? '☑ מסומן להסרה' : '☐ שמור בהסגר'}</UiText>
              <LtrText color="textMuted" style={{ flexShrink: 1 }} variant="caption">
                {item.quarantineId}
              </LtrText>
              <LtrText color="textMuted" variant="caption">
                {item.quarantinedAt}
              </LtrText>
            </Pressable>
          );
        })}
        <Button
          disabled={!selected.size}
          fullWidth
          onPress={requestDiscard}
          testID={`recovery-discard-${kind}`}
          variant="danger"
        >
          {`בדיקה והסרה של ${selected.size} רשומות מסומנות`}
        </Button>
      </View>
    </Card>
  );
}

export function RecoveryCenter() {
  const theme = useTheme();
  const learning = useLearning();
  const [selected, setSelected] = useState<Record<RecoveryKind, ReadonlySet<string>>>(() => ({
    analysis: new Set(),
    paper: new Set(),
    management: new Set(),
  }));
  const [pendingKind, setPendingKind] = useState<RecoveryKind | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const confirmationRef = useRef<View>(null);

  useEffect(() => {
    if (!pendingKind && !confirmReset) return;
    focusAccessibleTarget(confirmationRef.current);
  }, [confirmReset, pendingKind]);

  const sections = useMemo(
    () =>
      learning.snapshot
        ? {
            analysis: learning.snapshot.quarantinedAnalysisSessions,
            paper: learning.snapshot.quarantinedPaperExecutionSessions,
            management: learning.snapshot.quarantinedPositionManagementSessions,
          }
        : null,
    [learning.snapshot],
  );
  const quarantineCount = sections
    ? sections.analysis.length + sections.paper.length + sections.management.length
    : 0;

  const toggle = (kind: RecoveryKind, quarantineId: string) => {
    setSelected((current) => {
      const next = new Set(current[kind]);
      if (next.has(quarantineId)) next.delete(quarantineId);
      else next.add(quarantineId);
      return { ...current, [kind]: next };
    });
  };

  const discardSelected = async () => {
    if (!pendingKind) return;
    const ids = [...selected[pendingKind]];
    if (!ids.length) return;
    setWorking(true);
    setMessage(null);
    try {
      if (pendingKind === 'analysis') await learning.discardQuarantinedAnalysisSessions(ids);
      else if (pendingKind === 'paper')
        await learning.discardQuarantinedPaperExecutionSessions(ids);
      else await learning.discardQuarantinedPositionManagementSessions(ids);
      setSelected((current) => ({ ...current, [pendingKind]: new Set() }));
      setMessage(`${ids.length} רשומות הוסרו מההסגר. היסטוריית הניסיונות וההתקדמות נשארה.`);
      setPendingKind(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'לא הצלחנו לעדכן את ההסגר. נסו שוב.');
    } finally {
      setWorking(false);
    }
  };

  const reset = async () => {
    setWorking(true);
    setMessage(null);
    try {
      await learning.resetData();
      router.replace('/onboarding');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'האיפוס נכשל. הנתונים לא שונו.');
    } finally {
      setWorking(false);
    }
  };

  if (learning.status === 'loading') return <LoadingState label="טוענים אפשרויות שחזור…" />;

  if (learning.status === 'error' || !sections) {
    const failure = learning.initializationFailure;
    const corrupt = failure?.reason === 'corrupt-store';
    const newer = failure?.reason === 'unsupported-newer-schema';
    return (
      <Screen contentContainerStyle={{ gap: theme.spacing.xl }} scroll testID="recovery-startup">
        <TopBar back subtitle="הנתונים נשארים מקומיים" title="שחזור נתוני למידה" />
        <Card variant="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <Badge tone={corrupt ? 'warning' : 'neutral'}>
              {newer ? 'נדרש עדכון יישום' : corrupt ? 'נדרשת החלטת שחזור' : 'ניסיון טעינה נוסף'}
            </Badge>
            <Heading level={1}>
              {newer
                ? 'אין לפתוח נתונים מגרסה חדשה יותר'
                : corrupt
                  ? 'המאגר המקומי לא עבר אימות'
                  : 'הטעינה המקומית לא הושלמה'}
            </Heading>
            <UiText>{learning.error ?? 'לא ניתן לטעון כרגע את הנתונים המקומיים.'}</UiText>
            <UiText color="textMuted" variant="bodySmall">
              {newer
                ? 'עדכנו את היישום לפני ניסיון נוסף. איפוס אינו מוצע במצב זה כדי לא למחוק נתונים תקינים מגרסה חדשה.'
                : corrupt
                  ? 'אפשר לנסות שוב. איפוס מלא מוצע רק אחרי אישור מפורש וימחק את כל הנתונים המקומיים.'
                  : 'נסו שוב. איפוס אינו מוצע לשגיאה זמנית.'}
            </UiText>
          </View>
        </Card>
        <Button fullWidth onPress={() => void learning.reload()}>
          ניסיון טעינה נוסף
        </Button>
        {corrupt && !confirmReset ? (
          <Button fullWidth onPress={() => setConfirmReset(true)} variant="danger">
            בדיקת אפשרות לאיפוס מלא
          </Button>
        ) : undefined}
        {corrupt && confirmReset ? (
          <Card testID="recovery-reset-confirmation" variant="accent">
            <View style={{ gap: theme.spacing.md }}>
              <View
                accessibilityLabel="אישור איפוס מלא. הפעולה תמחק את כל נתוני הלמידה המקומיים ולא ניתן לבטל אותה."
                accessibilityRole={Platform.OS === 'web' ? undefined : 'header'}
                accessible={Platform.OS !== 'web'}
                ref={confirmationRef}
                tabIndex={-1}
              >
                <Heading level={2}>אישור איפוס מלא</Heading>
              </View>
              <UiText accessibilityLiveRegion="assertive" color="danger">
                הפעולה תמחק מהמכשיר את כל הניסיונות, ההתקדמות והטיוטות ולא ניתן לבטל אותה.
              </UiText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button loading={working} onPress={() => void reset()} variant="danger">
                  מחיקה ואיפוס
                </Button>
                <Button disabled={working} onPress={() => setConfirmReset(false)} variant="ghost">
                  ביטול
                </Button>
              </View>
            </View>
          </Card>
        ) : undefined}
        {message ? (
          <UiText accessibilityLiveRegion="assertive" color="danger" testID="recovery-message">
            {message}
          </UiText>
        ) : undefined}
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ gap: theme.spacing.xl }} scroll testID="recovery-center">
      <TopBar back subtitle="שחזור מפורש ושומר־היסטוריה" title="מרכז שחזור" />
      <Card variant="accent">
        <View style={{ gap: theme.spacing.sm }}>
          <Badge tone={quarantineCount ? 'warning' : 'success'}>
            {quarantineCount ? `${quarantineCount} רשומות בהסגר` : 'אין רשומות בהסגר'}
          </Badge>
          <Heading level={1}>הטיוטות המבודדות אינן פעילות</Heading>
          <UiText>
            נתונים שלא עברו אימות נשמרים בהסגר ואינם נטענים לתרגול. הסרה היא פעולה מפורשת לכל סוג
            רשומה ואינה יוצרת קרדיט או משנה ניסיונות שמורים.
          </UiText>
        </View>
      </Card>

      <Card testID="recovery-privacy" variant="subtle">
        <View style={{ gap: theme.spacing.sm }}>
          <Heading level={2}>פרטיות וגיבוי</Heading>
          <UiText>
            כל נתוני הלמידה נשמרים מקומית בלבד. אין חשבון, אין סנכרון ענן ואין שחזור דרך שרת של
            ChartPath.
          </UiText>
          <UiText color="textMuted" variant="bodySmall">
            מאגר הלמידה מוחרג מגיבויי מערכת ההפעלה. מסלול ההעברה הנתמך הוא קובץ השחזור המוצפן
            שנוצר ונשמר ביוזמתכם.
          </UiText>
        </View>
      </Card>

      <RecoveryBundlePanel />

      {(['analysis', 'paper', 'management'] as const).map((kind) => (
        <QuarantineSection
          items={sections[kind]}
          key={kind}
          kind={kind}
          requestDiscard={() => setPendingKind(kind)}
          selected={selected[kind]}
          toggle={(id) => toggle(kind, id)}
        />
      ))}

      {pendingKind ? (
        <Card testID="recovery-discard-confirmation" variant="accent">
          <View style={{ gap: theme.spacing.md }}>
            <View
              accessibilityLabel={`אישור הסרת ${selected[pendingKind].size} רשומות מהסגר. היסטוריית הניסיונות לא תימחק.`}
              accessibilityRole={Platform.OS === 'web' ? undefined : 'header'}
              accessible={Platform.OS !== 'web'}
              ref={confirmationRef}
              tabIndex={-1}
            >
              <Heading level={2}>להסיר את הרשומות המסומנות?</Heading>
            </View>
            <UiText accessibilityLiveRegion="assertive">
              הטיוטות המסומנות יימחקו מהמכשיר. היסטוריית הניסיונות, ההתקדמות והרשומות שלא סומנו
              יישארו ללא שינוי.
            </UiText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button loading={working} onPress={() => void discardSelected()} variant="danger">
                הסרת המסומנות בלבד
              </Button>
              <Button disabled={working} onPress={() => setPendingKind(null)} variant="ghost">
                ביטול
              </Button>
            </View>
          </View>
        </Card>
      ) : undefined}

      {message ? (
        <UiText accessibilityLiveRegion="polite" testID="recovery-message">
          {message}
        </UiText>
      ) : undefined}
    </Screen>
  );
}
