import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ANALYSIS_WORKFLOW_STEP_IDS, type GuidedAnalysisSession } from '@chartpath/domain';
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

import { ErrorState, LoadingState } from './app-state';
import { CAPSTONE_STEP_LABELS } from './capstone-interaction';
import { TopBar } from './top-bar';
import { GUIDED_ANALYSIS_EXERCISE_ID, useLearning } from '@/state/learning';

function progress(session: GuidedAnalysisSession): number {
  return ANALYSIS_WORKFLOW_STEP_IDS.filter((id) => session.steps[id].status === 'submitted').length;
}

function sessionDate(value: string): string {
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function AnalysisLabHub() {
  const theme = useTheme();
  const learning = useLearning();
  const [working, setWorking] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (learning.status === 'loading') return <LoadingState />;
  if (learning.status === 'error' || !learning.snapshot) {
    return (
      <ErrorState
        message={learning.error ?? 'לא ניתן לטעון את מעבדת הגרפים.'}
        onRetry={() => void learning.reload()}
      />
    );
  }

  const active = [...learning.snapshot.analysisSessions]
    .filter(
      (session) =>
        session.status === 'active' && session.exerciseId === GUIDED_ANALYSIS_EXERCISE_ID,
    )
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
  const finalizedCount = learning.snapshot.analysisSessions.filter(
    (session) => session.status === 'finalized',
  ).length;

  const openSession = (session: GuidedAnalysisSession) => {
    router.push(`/analysis?sessionId=${encodeURIComponent(session.sessionId)}` as Href);
  };

  const start = async () => {
    setWorking(true);
    setError(null);
    try {
      const session = await learning.createOrResumeAnalysisSession();
      openSession(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'לא הצלחנו לפתוח ניתוח.');
    } finally {
      setWorking(false);
    }
  };

  const restart = async () => {
    if (!active) return;
    setWorking(true);
    setError(null);
    try {
      const session = await learning.restartAnalysisSession(active.sessionId);
      setConfirmRestart(false);
      openSession(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'לא הצלחנו להתחיל מחדש.');
    } finally {
      setWorking(false);
    }
  };

  const recoverDrafts = async () => {
    setWorking(true);
    setError(null);
    try {
      await learning.discardQuarantinedAnalysisSessions(
        learning.snapshot!.quarantinedAnalysisSessions.map(({ quarantineId }) => quarantineId),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'לא הצלחנו להסיר את הטיוטה הפגומה.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen
      accessibilityLabel="מרכז מעבדת הגרפים"
      contentContainerStyle={{ gap: theme.spacing.xl }}
      scroll
      testID="analysis-lab-hub"
    >
      <TopBar back subtitle="סשנים מקומיים, לא מקוונים" title="מעבדת הגרפים" />

      <Card variant="accent">
        <View style={{ gap: theme.spacing.md }}>
          <Badge tone="teal">ניתוח מונחה ב־11 שלבים</Badge>
          <Heading level={1}>מתרגמים ראיות לתהליך מלא</Heading>
          <UiText>
            הסשן משתמש בקאפסטון העברי שנבדק: הקשר, מבנה, רמה, תצורה, אישור, כניסה, נקודת ביטול, גודל
            פוזיציה, יעד, ניהול ותחקור.
          </UiText>
          <UiText color="textMuted" variant="caption">
            התרחיש סינתטי ומיועד ללמידה בלבד. אין בו אות, תחזית או המלצה אישית.
          </UiText>
          {!active ? (
            <Button disabled={working} fullWidth onPress={() => void start()} size="large">
              {working ? 'פותח ניתוח…' : 'התחלת ניתוח חדש'}
            </Button>
          ) : undefined}
        </View>
      </Card>

      {active ? (
        <Card testID="analysis-resume-card" variant="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Badge tone="warning">ניתוח בתהליך</Badge>
              <UiText style={{ flex: 1 }} variant="label">
                {CAPSTONE_STEP_LABELS[active.currentStepId]}
              </UiText>
              <LtrText color="textMuted" variant="numeric">{`${progress(active)}/11`}</LtrText>
            </View>
            <ProgressBar
              accessibilityLabel="התקדמות בטיוטת הניתוח"
              showValue
              value={(progress(active) / 11) * 100}
            />
            <LtrText color="textMuted" variant="caption">
              {sessionDate(active.updatedAt)}
            </LtrText>
            <UiText color="textMuted" variant="caption">
              התשובות, הסימונים, הרמזים ומיקום ה-replay נשמרו במכשיר.
            </UiText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                disabled={working}
                onPress={() => openSession(active)}
                style={{ flexGrow: 1 }}
              >
                המשך הניתוח
              </Button>
              <Button disabled={working} onPress={() => setConfirmRestart(true)} variant="danger">
                התחלה מחדש
              </Button>
            </View>
          </View>
        </Card>
      ) : undefined}

      {confirmRestart && active ? (
        <Card accessibilityLabel="אישור התחלת ניתוח מחדש" variant="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <Heading level={3}>להתחיל מחדש?</Heading>
            <UiText>
              הטיוטה הנוכחית תסומן כנטושה ותישאר בהיסטוריה. ניסיונות שהושלמו ו־XP לא יימחקו.
            </UiText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button onPress={() => setConfirmRestart(false)} variant="ghost">
                שמירת הטיוטה
              </Button>
              <Button disabled={working} onPress={() => void restart()} variant="danger">
                אישור והתחלה מחדש
              </Button>
            </View>
          </View>
        </Card>
      ) : undefined}

      {learning.snapshot.quarantinedAnalysisSessions.length ? (
        <Card testID="analysis-recovery-card" variant="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <Badge tone="warning">טיוטה דורשת שחזור</Badge>
            <Heading level={3}>נמצאה טיוטת ניתוח פגומה</Heading>
            <UiText>
              אפשר להסיר רק את הטיוטה הפגומה. היסטוריית הניסיונות, ההתקדמות וה־XP נשארים ללא שינוי.
            </UiText>
            <Button disabled={working} onPress={() => void recoverDrafts()} variant="danger">
              הסרת הטיוטה הפגומה בלבד
            </Button>
          </View>
        </Card>
      ) : undefined}

      {error ? (
        <Card variant="outlined">
          <UiText accessibilityLiveRegion="polite" color="danger">
            {error}
          </UiText>
        </Card>
      ) : undefined}

      <View style={{ gap: theme.spacing.sm }}>
        <Heading level={2}>כלי המעבדה</Heading>
        <Card
          accessibilityLabel="פתיחת תרגול קו המגמה"
          onPress={() => router.push('/workbench' as Href)}
          variant="outlined"
        >
          <View style={{ gap: 4 }}>
            <UiText variant="label">תרגול קו מגמה עצמאי</UiText>
            <UiText color="textMuted" variant="bodySmall">
              חזרה למשטח Milestone 1 עם viewport, replay, שרטוט ודירוג דטרמיניסטי.
            </UiText>
          </View>
        </Card>
        <Card
          accessibilityLabel="פתיחת היסטוריית הניתוחים"
          onPress={() => router.push('/analysis-history' as Href)}
          variant="outlined"
        >
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <UiText variant="label">היסטוריית ניתוחים מקומית</UiText>
              <UiText color="textMuted" variant="bodySmall">
                טיוטות, ניתוחים סופיים ותחקירים לקריאה בלבד.
              </UiText>
            </View>
            <LtrText color="primary" variant="numeric">
              {finalizedCount}
            </LtrText>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
