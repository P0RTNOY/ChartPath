import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';

import { EmptyState } from '@/components/app-state';
import { HistoricalScenarioQa } from '@/components/historical-scenario-qa';
import { TopBar } from '@/components/top-bar';
import {
  blindQaCandidateCards,
  qaScenarioIdForKey,
  revealedQaCandidateDetail,
} from '@/data/scenario-qa';
import { useLearning } from '@/state/learning';
import { Screen } from '@chartpath/ui';

export default function HistoricalScenarioQaRoute() {
  const learning = useLearning();
  const { developer } = useLocalSearchParams<{ developer?: string | string[] }>();
  const [startingKey, setStartingKey] = useState<string>();
  const [startError, setStartError] = useState<string | null>(null);
  const developerFlag = Array.isArray(developer) ? developer[0] : developer;
  if (!__DEV__ || developerFlag !== '1') {
    return (
      <Screen testID="scenario-qa-unavailable">
        <TopBar back title="QA תרחישים" />
        <EmptyState
          message="הכלי אינו זמין במסלול הלמידה הרגיל ונפתח רק מתוך קטלוג המפתחים."
          title="כלי QA פנימי אינו פעיל"
        />
      </Screen>
    );
  }

  const start = async (qaKey: string) => {
    const scenarioId = qaScenarioIdForKey(qaKey);
    if (!scenarioId) {
      setStartError('מועמד ה־QA אינו זמין עוד ברישום הפנימי.');
      return;
    }
    setStartingKey(qaKey);
    setStartError(null);
    try {
      const session = await learning.createOrResumeAnalysisSession({
        kind: 'historical',
        scenarioId,
        accessMode: 'qa-internal',
      });
      router.push(`/analysis?sessionId=${encodeURIComponent(session.sessionId)}` as Href);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'לא הצלחנו לפתוח את מועמד ה־QA.');
    } finally {
      setStartingKey(undefined);
    }
  };

  return (
    <HistoricalScenarioQa
      cards={blindQaCandidateCards()}
      onStart={(qaKey) => void start(qaKey)}
      revealDetail={revealedQaCandidateDetail}
      startError={startError}
      startingKey={startingKey}
    />
  );
}
