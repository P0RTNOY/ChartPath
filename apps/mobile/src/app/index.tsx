import { Redirect } from 'expo-router';
import { useState } from 'react';

import { ErrorState, LoadingState } from '@/components/app-state';
import { DISCLAIMER_VERSION, useLearning } from '@/state/learning';

export default function IndexScreen() {
  const learning = useLearning();
  const [confirmReset, setConfirmReset] = useState(false);
  if (learning.status === 'loading') return <LoadingState />;
  if (learning.status === 'error')
    return (
      <ErrorState
        message={learning.error ?? 'שגיאה לא ידועה'}
        onRetry={() => void learning.reload()}
        onSecondaryAction={() => {
          if (!confirmReset) {
            setConfirmReset(true);
            return;
          }
          void learning.resetData();
        }}
        secondaryActionLabel={confirmReset ? 'אישור מחיקה ואיפוס' : 'איפוס נתונים פגומים'}
      />
    );
  const onboarded = learning.snapshot?.settings.disclaimerVersionAccepted === DISCLAIMER_VERSION;
  return <Redirect href={onboarded ? '/home' : '/onboarding'} />;
}
