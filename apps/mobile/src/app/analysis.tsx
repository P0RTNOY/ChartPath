import { useLocalSearchParams } from 'expo-router';

import { GuidedAnalysisSessionView } from '@/components/guided-analysis-session';
import { ErrorState, LoadingState } from '@/components/app-state';
import { useLearning } from '@/state/learning';
import { historicalSessionRouteAccessAllowed } from '@/data/historical-replay';

export default function AnalysisScreen() {
  const { sessionId, qa } = useLocalSearchParams<{
    sessionId?: string | string[];
    qa?: string | string[];
  }>();
  const learning = useLearning();
  if (learning.status === 'loading') return <LoadingState />;
  if (learning.status === 'error' || !learning.snapshot) {
    return (
      <ErrorState
        message={learning.error ?? 'לא ניתן לטעון את הניתוח.'}
        onRetry={() => void learning.reload()}
      />
    );
  }
  const id = Array.isArray(sessionId) ? sessionId[0] : sessionId;
  const qaValue = Array.isArray(qa) ? qa[0] : qa;
  const session = learning.snapshot.analysisSessions.find(
    (candidate) => candidate.sessionId === id,
  );
  if (!id || !session) {
    return (
      <ErrorState
        message="סשן הניתוח לא נמצא. חזרו למעבדה או להיסטוריה ובחרו סשן זמין."
        onRetry={() => void learning.reload()}
      />
    );
  }
  const qaRequested = qaValue === '1';
  if (
    !historicalSessionRouteAccessAllowed(session, {
      qaRequested,
      developmentMode: __DEV__,
    })
  ) {
    return (
      <ErrorState
        message={
          qaRequested && !__DEV__
            ? 'גישה לסשן QA פנימי אינה זמינה בגרסת ייצור.'
            : 'סשן פנימי, לא־מפורסם או ללא קרדיט זמין רק מגבול QA מפורש בגרסת פיתוח.'
        }
        onRetry={() => void learning.reload()}
      />
    );
  }
  return (
    <GuidedAnalysisSessionView
      accessMode={qaRequested ? 'qa-internal' : 'ordinary'}
      persistedSession={session}
    />
  );
}
