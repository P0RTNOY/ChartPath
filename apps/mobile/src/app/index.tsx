import { Redirect, router, type Href } from 'expo-router';

import { ErrorState, LoadingState } from '@/components/app-state';
import { DISCLAIMER_VERSION, useLearning } from '@/state/learning';

export default function IndexScreen() {
  const learning = useLearning();
  if (learning.status === 'loading') return <LoadingState />;
  if (learning.status === 'error')
    return (
      <ErrorState
        message={learning.error ?? 'שגיאה לא ידועה'}
        onRetry={() => void learning.reload()}
        {...(learning.initializationFailure?.reason === 'corrupt-store'
          ? {
              onSecondaryAction: () => router.push('/data-recovery' as Href),
              secondaryActionLabel: 'פתיחת מרכז שחזור',
              secondaryActionVariant: 'secondary' as const,
            }
          : {})}
      />
    );
  const onboarded = learning.snapshot?.settings.disclaimerVersionAccepted === DISCLAIMER_VERSION;
  return <Redirect href={onboarded ? '/home' : '/onboarding'} />;
}
