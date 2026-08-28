import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ANALYSIS_WORKFLOW_STEP_IDS, type GuidedAnalysisSession } from '@chartpath/domain';
import { Badge, Button, Card, Heading, LtrText, Screen, UiText, useTheme } from '@chartpath/ui';

import { ErrorState, LoadingState } from './app-state';
import { CAPSTONE_STEP_LABELS } from './capstone-interaction';
import { TopBar } from './top-bar';
import {
  historicalSessionRequiresQa,
  resolveHistoricalAnalysisSession,
} from '@/data/historical-replay';
import { isInternalReviewerModeEnabled } from '@/lib/internal-reviewer-mode';
import { useLearning } from '@/state/learning';

function statusLabel(session: GuidedAnalysisSession): string {
  if (session.status === 'finalized') return 'סופי · קריאה בלבד';
  if (session.status === 'abandoned') return 'טיוטה שננטשה';
  return 'בתהליך';
}

function statusTone(session: GuidedAnalysisSession): 'success' | 'warning' | 'neutral' {
  if (session.status === 'finalized') return 'success';
  if (session.status === 'active') return 'warning';
  return 'neutral';
}

function submitted(session: GuidedAnalysisSession): number {
  return ANALYSIS_WORKFLOW_STEP_IDS.filter((id) => session.steps[id].status === 'submitted').length;
}

function displayDate(timestamp: string): string {
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(timestamp),
  );
}

export function AnalysisHistory({
  developmentMode = isInternalReviewerModeEnabled(),
}: {
  readonly developmentMode?: boolean;
} = {}) {
  const theme = useTheme();
  const learning = useLearning();
  const [confirmAbandonId, setConfirmAbandonId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (learning.status === 'loading') return <LoadingState />;
  if (learning.status === 'error' || !learning.snapshot) {
    return (
      <ErrorState
        message={learning.error ?? 'לא ניתן לטעון את היסטוריית הניתוחים.'}
        onRetry={() => void learning.reload()}
      />
    );
  }
  const sessions = learning.snapshot.analysisSessions
    .filter((session) => developmentMode || !historicalSessionRequiresQa(session))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

  const abandon = async () => {
    if (!confirmAbandonId) return;
    setWorking(true);
    setError(null);
    try {
      await learning.abandonAnalysisSession(confirmAbandonId);
      setConfirmAbandonId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'לא הצלחנו לנטוש את הטיוטה.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen
      accessibilityLabel="היסטוריית ניתוחים"
      contentContainerStyle={{ gap: theme.spacing.xl }}
      scroll
      testID="analysis-history-screen"
    >
      <TopBar back subtitle="נשמר מקומית במכשיר" title="היסטוריית ניתוחים" />
      <Card variant="subtle">
        <UiText color="textMuted" variant="bodySmall">
          היסטוריה זו מציגה מצב, תאריך והתקדמות בלבד. תשובות ייחוס אינן מוצגות בטיוטות שלא הסתיימו.
        </UiText>
      </Card>

      {sessions.length ? (
        sessions.map((session) => {
          const historicalResolution =
            session.chart.kind === 'historical'
              ? resolveHistoricalAnalysisSession(session)
              : undefined;
          const historical =
            historicalResolution?.status === 'ready' ? historicalResolution : undefined;
          const historicalFinalized = historical && session.status === 'finalized';
          return (
            <Card
              key={session.sessionId}
              testID={`analysis-history-${session.status}`}
              variant="outlined"
            >
              <View style={{ gap: theme.spacing.sm }}>
                <View
                  style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
                >
                  <Badge tone={statusTone(session)}>{statusLabel(session)}</Badge>
                  {session.chart.kind === 'historical' ? (
                    <Badge tone="neutral">
                      {session.status === 'finalized'
                        ? 'Replay היסטורי נחשף'
                        : 'Replay היסטורי עיוור'}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">סינתטי</Badge>
                  )}
                  {session.chart.kind === 'historical' &&
                  session.chart.learningCredit === 'none' ? (
                    <Badge tone="neutral">ללא XP/שליטה/חזרה</Badge>
                  ) : undefined}
                  <UiText style={{ flex: 1 }} variant="label">
                    {historicalFinalized
                      ? historical.content.scenario.revealedTitleHebrew
                      : session.chart.kind === 'historical'
                        ? 'תרחיש היסטורי שמור — הזהות מוסתרת'
                        : 'מקרה ג׳ — תהליך 11 השלבים'}
                  </UiText>
                  <LtrText
                    color="textMuted"
                    variant="numeric"
                  >{`${submitted(session)}/11`}</LtrText>
                </View>
                <UiText color="textMuted" variant="bodySmall">
                  שלב אחרון: {CAPSTONE_STEP_LABELS[session.currentStepId]}
                </UiText>
                <LtrText color="textMuted" variant="caption">
                  {displayDate(session.updatedAt)}
                </LtrText>
                {historicalFinalized ? (
                  <View style={{ gap: 4 }} testID="historical-history-reveal">
                    <LtrText color="textMuted" variant="caption">
                      {`${historical.content.dataset.manifest.displaySymbol} · ${historical.content.dataset.manifest.provenance.providerName}`}
                    </LtrText>
                    <LtrText color="textMuted" variant="caption">
                      {`${historical.content.dataset.manifest.startTimestampUtc} – ${historical.content.dataset.manifest.endTimestampUtc}`}
                    </LtrText>
                  </View>
                ) : session.chart.kind === 'historical' && !historical ? (
                  <UiText color="warning" variant="caption">
                    המקור המוצמד חסר או השתנה; פרטי הזהות נשארים מוסתרים.
                  </UiText>
                ) : undefined}
                {session.status !== 'abandoned' ? (
                  <Button
                    onPress={() =>
                      router.push(
                        `/analysis?sessionId=${encodeURIComponent(session.sessionId)}${historicalSessionRequiresQa(session) ? '&qa=1' : ''}` as Href,
                      )
                    }
                    variant={session.status === 'finalized' ? 'secondary' : 'primary'}
                  >
                    {session.status === 'finalized' ? 'פתיחת התחקיר' : 'המשך הניתוח'}
                  </Button>
                ) : undefined}
                {session.status === 'active' ? (
                  <Button onPress={() => setConfirmAbandonId(session.sessionId)} variant="danger">
                    נטישת הטיוטה
                  </Button>
                ) : undefined}
              </View>
            </Card>
          );
        })
      ) : (
        <Card variant="outlined">
          <Heading level={3}>עדיין אין ניתוחים</Heading>
          <UiText color="textMuted">התחילו סשן ראשון במעבדת הגרפים.</UiText>
        </Card>
      )}

      {confirmAbandonId ? (
        <Card accessibilityLabel="אישור נטישת טיוטת ניתוח" variant="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <Heading level={3}>לנטוש את הטיוטה?</Heading>
            <UiText>
              הטיוטה תישאר ברשומת ההיסטוריה ולא תהיה ניתנת לעריכה. ניסיונות סופיים לא יימחקו.
            </UiText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button onPress={() => setConfirmAbandonId(null)} variant="ghost">
                ביטול
              </Button>
              <Button disabled={working} onPress={() => void abandon()} variant="danger">
                אישור נטישה
              </Button>
            </View>
          </View>
        </Card>
      ) : undefined}
      {error ? (
        <Card variant="outlined">
          <UiText color="danger">{error}</UiText>
        </Card>
      ) : undefined}
      <Button onPress={() => router.push('/lab')}>חזרה למעבדה</Button>
    </Screen>
  );
}
