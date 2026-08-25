import { router, useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/app-state';
import { PaperExecutionScreen } from '@/components/paper-execution-screen';

export default function PaperExecutionRoute() {
  const { analysisSessionId, qa } = useLocalSearchParams<{
    analysisSessionId?: string | string[];
    qa?: string | string[];
  }>();
  const id = Array.isArray(analysisSessionId) ? analysisSessionId[0] : analysisSessionId;
  const qaValue = Array.isArray(qa) ? qa[0] : qa;
  if (!id) {
    return (
      <ErrorState
        message="חסר מזהה ניתוח סופי. חזרו לתחקיר ובחרו תרגול ביצוע זמין."
        onRetry={() => router.back()}
      />
    );
  }
  if (qaValue === '1' && !__DEV__) {
    return (
      <ErrorState
        message="מכניקת ביצוע היפותטית זמינה רק בגבול QA מפורש של גרסת פיתוח."
        onRetry={() => router.back()}
      />
    );
  }
  return (
    <PaperExecutionScreen
      accessMode={qaValue === '1' ? 'qa-hypothetical-mechanics' : 'ordinary'}
      analysisSessionId={id}
    />
  );
}
