import { ActivityIndicator, View } from 'react-native';

import { Button, Card, Heading, Screen, UiText, useTheme } from '@chartpath/ui';

import { BrandMark } from './brand-mark';

export function LoadingState({ label = 'טוענים את מסלול הלמידה…' }: { readonly label?: string }) {
  const theme = useTheme();
  return (
    <Screen accessibilityLabel={label}>
      <View
        style={{ alignItems: 'center', flex: 1, gap: theme.spacing.lg, justifyContent: 'center' }}
      >
        <BrandMark size={64} />
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <UiText align="center" color="textMuted">
          {label}
        </UiText>
      </View>
    </Screen>
  );
}

export function ErrorState({
  message,
  onRetry,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  readonly message: string;
  readonly onRetry: () => void;
  readonly secondaryActionLabel?: string;
  readonly onSecondaryAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, gap: theme.spacing.lg, justifyContent: 'center' }}>
        <Card variant="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <Heading level={2}>לא הצלחנו לטעון את הנתונים</Heading>
            <UiText color="textMuted">{message}</UiText>
            <UiText color="textMuted" variant="caption">
              הנתונים נשמרים מקומית בלבד. אפשר לנסות שוב בלי לאבד התקדמות.
            </UiText>
          </View>
        </Card>
        <Button fullWidth onPress={onRetry}>
          נסו שוב
        </Button>
        {secondaryActionLabel && onSecondaryAction ? (
          <Button fullWidth onPress={onSecondaryAction} variant="danger">
            {secondaryActionLabel}
          </Button>
        ) : undefined}
      </View>
    </Screen>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  readonly title: string;
  readonly message: string;
  readonly action?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Card variant="subtle">
      <View
        style={{ alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.lg }}
      >
        <Heading align="center" level={3}>
          {title}
        </Heading>
        <UiText align="center" color="textMuted">
          {message}
        </UiText>
        {action}
      </View>
    </Card>
  );
}
