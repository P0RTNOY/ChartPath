import { router, useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/app-state';
import { PaperExecutionScreen } from '@/components/paper-execution-screen';

export default function PaperExecutionRoute() {
  const { analysisSessionId } = useLocalSearchParams<{
    analysisSessionId?: string | string[];
  }>();
  const id = Array.isArray(analysisSessionId) ? analysisSessionId[0] : analysisSessionId;
  if (!id) {
    return (
      <ErrorState
        message="חסר מזהה ניתוח סופי. חזרו לתחקיר ובחרו תרגול ביצוע זמין."
        onRetry={() => router.back()}
      />
    );
  }
  return <PaperExecutionScreen analysisSessionId={id} />;
}
