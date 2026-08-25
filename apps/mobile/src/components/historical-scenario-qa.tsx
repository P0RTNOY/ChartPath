import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, Heading, LtrText, Screen, UiText, useTheme } from '@chartpath/ui';

import { TopBar } from './top-bar';
import type { BlindQaCandidateCard, RevealedQaCandidateDetail } from '@/data/scenario-qa';

export function HistoricalScenarioQa({
  cards,
  onStart,
  revealDetail,
  startError,
  startingKey,
}: {
  readonly cards: readonly BlindQaCandidateCard[];
  readonly onStart: (qaKey: string) => void;
  readonly revealDetail: (qaKey: string) => RevealedQaCandidateDetail | undefined;
  readonly startError?: string | null;
  readonly startingKey?: string;
}) {
  const theme = useTheme();
  const [acknowledged, setAcknowledged] = useState(false);
  const [entered, setEntered] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<RevealedQaCandidateDetail | null>(null);

  if (!entered) {
    return (
      <Screen
        accessibilityLabel="שער כניסה ל־QA תרחישים פנימי"
        contentContainerStyle={{ gap: theme.spacing.xl }}
        scroll
        testID="scenario-qa-gate"
      >
        <TopBar back subtitle="כלי פיתוח שאינו חלק ממסלול הלמידה" title="QA תרחישים פנימי" />
        <Card variant="accent">
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Badge tone="warning">QA פנימי</Badge>
              <Badge tone="neutral">נתונים סינתטיים</Badge>
              <Badge tone="neutral">ללא קרדיט</Badge>
            </View>
            <Heading level={1}>המשך עלול לחשוף תשובות וחומרי ביקורת</Heading>
            <UiText>
              הכלי כולל מועמדים שלא אושרו לפרסום, חסמי מקור ורישוי, תשובות צפויות ומצבי ביצוע. המידע
              מיועד לבדיקת איכות בלבד.
            </UiText>
            <Pressable
              accessibilityLabel="אישור הבנת גבול QA פנימי"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acknowledged }}
              onPress={() => setAcknowledged((value) => !value)}
              style={{
                alignItems: 'center',
                borderColor: acknowledged ? theme.colors.primary : theme.colors.borderStrong,
                borderRadius: theme.radii.md,
                borderWidth: acknowledged ? 2 : 1,
                flexDirection: 'row',
                gap: 10,
                minHeight: 52,
                padding: 10,
              }}
              testID="scenario-qa-ack"
            >
              <LtrText color={acknowledged ? 'primary' : 'textMuted'} variant="label">
                {acknowledged ? '☑' : '☐'}
              </LtrText>
              <UiText style={{ flex: 1 }} variant="bodySmall">
                אני מבין/ה שזהו כלי QA פנימי, שהמועמדים סינתטיים ואינם תוכן מאושר או המלצה.
              </UiText>
            </Pressable>
            <Button
              disabled={!acknowledged}
              fullWidth
              onPress={() => setEntered(true)}
              testID="scenario-qa-enter"
            >
              כניסה לרשימת המועמדים
            </Button>
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      accessibilityLabel="רשימת מועמדי QA פנימיים"
      contentContainerStyle={{ gap: theme.spacing.xl }}
      scroll
      testID="scenario-qa-screen"
    >
      <TopBar back subtitle="תשובות נחשפות רק בפעולה נפרדת" title="QA תרחישים פנימי" />
      <Card testID="scenario-qa-persistent-warning" variant="accent">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Badge tone="warning">QA פנימי</Badge>
          <Badge tone="neutral">נתונים סינתטיים</Badge>
          <Badge tone="neutral">ללא קרדיט</Badge>
          <Badge tone="neutral">לא פורסם</Badge>
        </View>
      </Card>

      <View style={{ gap: theme.spacing.md }} testID="scenario-qa-candidate-list">
        {cards.map((card) => (
          <Card
            accessibilityLabel={`מועמד QA ${card.ordinal}. ${card.readinessHe}. התשובה עדיין מוסתרת.`}
            accessibilityRole="summary"
            key={card.qaKey}
            testID={`scenario-qa-candidate-${card.qaKey}`}
            variant="outlined"
          >
            <View style={{ gap: theme.spacing.sm }}>
              <View
                style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
              >
                <LtrText color="primary" variant="numeric">{`QA #${card.ordinal}`}</LtrText>
                <Badge tone="neutral">התשובה מוסתרת</Badge>
              </View>
              <Heading level={2}>{`מועמד QA ${card.ordinal}`}</Heading>
              <UiText color="textMuted" variant="bodySmall">
                {card.readinessHe}
              </UiText>
              <Button
                accessibilityLabel={`בחירת מועמד QA ${card.ordinal} לפני חשיפה`}
                onPress={() => {
                  setSelectedKey(card.qaKey);
                  setDetail(null);
                }}
                testID={`scenario-qa-select-${card.qaKey}`}
                variant="secondary"
              >
                בחירה לפני חשיפה
              </Button>
            </View>
          </Card>
        ))}
      </View>

      {selectedKey && !detail ? (
        <Card accessibilityLabel="בחירת פעולה למועמד QA נבחר" variant="accent">
          <View style={{ gap: theme.spacing.sm }}>
            <Badge tone="warning">QA פנימי · סינתטי · ללא קרדיט</Badge>
            <Heading level={2}>פתיחה עיוורת או חשיפת פרטי QA?</Heading>
            <UiText>
              פתיחה עיוורת אינה חושפת את זהות התרחיש או את התשובה. החשיפה היא פעולה נפרדת ותציג
              מזהים, החלטה צפויה, checksum, חסמי פרסום וראיות ביצוע.
            </UiText>
            {startError ? (
              <UiText accessibilityRole="alert" color="danger" testID="scenario-qa-start-error">
                {startError}
              </UiText>
            ) : undefined}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button onPress={() => setSelectedKey(null)} variant="ghost">
                חזרה לרשימה העיוורת
              </Button>
              <Button
                accessibilityLabel="פתיחת מועמד QA נבחר לתרגול עיוור ללא קרדיט"
                disabled={startingKey !== undefined}
                loading={startingKey === selectedKey}
                onPress={() => onStart(selectedKey)}
                testID={
                  cards.find(({ qaKey }) => qaKey === selectedKey)?.startTestID ??
                  `scenario-qa-start-${selectedKey}`
                }
              >
                פתיחה עיוורת ללא קרדיט
              </Button>
              <Button
                accessibilityLabel="חשיפת פרטי מועמד QA ותשובת הבדיקה"
                onPress={() => setDetail(revealDetail(selectedKey) ?? null)}
                testID={`scenario-qa-reveal-${selectedKey}`}
                variant="danger"
              >
                חשיפת פרטי מועמד ותשובת QA
              </Button>
            </View>
          </View>
        </Card>
      ) : undefined}

      {detail ? (
        <View style={{ gap: theme.spacing.md }} testID="scenario-qa-revealed-detail">
          <Card variant="accent">
            <View style={{ gap: 8 }}>
              <Badge tone="warning">מידע גלוי ל־QA בלבד</Badge>
              <Heading level={1}>{detail.titleHe}</Heading>
              <UiText variant="label">{detail.decisionHe}</UiText>
              <UiText color="textMuted">רמת עבודה: {detail.difficultyHe}</UiText>
              <LtrText color="textMuted" variant="caption">
                {detail.scenarioIdentity}
              </LtrText>
              <LtrText color="textMuted" variant="caption">
                {detail.datasetIdentity}
              </LtrText>
            </View>
          </Card>

          <Card variant="outlined">
            <View style={{ gap: 7 }}>
              <Heading level={2}>מקור פדגוגי שנבדק</Heading>
              <LtrText color="textMuted" variant="caption">
                {detail.sourceIdentity}
              </LtrText>
              <UiText color="textMuted" variant="bodySmall">
                {detail.sourceSectionHe}
              </UiText>
              <UiText>{detail.sourceRationaleHe}</UiText>
            </View>
          </Card>

          <Card variant="outlined">
            <View style={{ gap: 7 }}>
              <Heading level={2}>זהות דטרמיניסטית</Heading>
              <LtrText color="textMuted" variant="caption">
                {`chart ${detail.chartSpecChecksum}`}
              </LtrText>
              <LtrText color="textMuted" variant="caption">
                {`material ${detail.materialArtifactChecksum}`}
              </LtrText>
              <LtrText color="textMuted" variant="caption">
                {`dataset ${detail.datasetChecksum}`}
              </LtrText>
              <LtrText color="textMuted" variant="caption">
                {detail.providerIdentity}
              </LtrText>
              {detail.expectedExecutionHe ? (
                <UiText>{detail.expectedExecutionHe}</UiText>
              ) : undefined}
              {detail.executionEvidence.length ? (
                <LtrText color="textMuted" variant="caption">
                  {detail.executionEvidence.join(' · ')}
                </LtrText>
              ) : undefined}
            </View>
          </Card>

          <Card testID="scenario-qa-blockers" variant="outlined">
            <View style={{ gap: 8 }}>
              <Heading level={2}>חסמי מבנה ופרסום</Heading>
              {detail.structuralIssues.length ? (
                detail.structuralIssues.map((issue) => (
                  <LtrText key={issue} color="danger" variant="caption">
                    {issue}
                  </LtrText>
                ))
              ) : (
                <UiText color="textMuted">לא נמצאו כשלים מבניים בהידור הנוכחי.</UiText>
              )}
              {detail.publicationBlockers.map((blocker) => (
                <UiText key={blocker} color="warning" variant="bodySmall">
                  {blocker}
                </UiText>
              ))}
            </View>
          </Card>
        </View>
      ) : undefined}
    </Screen>
  );
}
