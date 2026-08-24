import { useLocalSearchParams } from 'expo-router';

import { GuidedAnalysisSessionView } from '@/components/guided-analysis-session';
import { ErrorState, LoadingState } from '@/components/app-state';
import { useLearning } from '@/state/learning';

export default function AnalysisScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
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
  return <GuidedAnalysisSessionView persistedSession={session} />;
}
