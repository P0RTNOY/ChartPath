import { router, useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/app-state';
import { PaperExecutionScreen } from '@/components/paper-execution-screen';
import { isInternalQaDeepLinkAllowed } from '@/lib/internal-reviewer-mode';

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
  if (!isInternalQaDeepLinkAllowed(qaValue === '1')) {
    return (
      <ErrorState
        message="סשן ביצוע או ניהול QA פנימי זמין רק בבניית פיתוח עם מצב הסוקרים הפנימי פעיל."
        onRetry={() => router.back()}
      />
    );
  }
  return (
    <PaperExecutionScreen
      accessMode={qaValue === '1' ? 'qa-internal' : 'ordinary'}
      analysisSessionId={id}
    />
  );
}
