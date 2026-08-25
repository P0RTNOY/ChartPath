import { router, type Href } from 'expo-router';
import { useState } from 'react';

import { HistoricalScenarioLibrary } from '@/components/historical-scenario-library';
import {
  publishedScenarioIdForLibraryKey,
  publishedScenarioLibraryCards,
} from '@/data/scenario-library';
import { useLearning } from '@/state/learning';

export default function HistoricalScenariosRoute() {
  const learning = useLearning();
  const [startingKey, setStartingKey] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const cards = publishedScenarioLibraryCards();

  const start = async (libraryKey: string) => {
    const scenarioId = publishedScenarioIdForLibraryKey(libraryKey);
    if (!scenarioId) {
      setError('התרחיש אינו זמין עוד בספרייה המאושרת.');
      return;
    }
    setStartingKey(libraryKey);
    setError(null);
    try {
      const session = await learning.createOrResumeAnalysisSession({
        kind: 'historical',
        scenarioId,
      });
      router.push(`/analysis?sessionId=${encodeURIComponent(session.sessionId)}` as Href);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'לא הצלחנו לפתוח את התרחיש העיוור.');
    } finally {
      setStartingKey(undefined);
    }
  };

  return (
    <HistoricalScenarioLibrary
      cards={cards}
      error={error}
      onStart={(libraryKey) => void start(libraryKey)}
      startingKey={startingKey}
    />
  );
}
