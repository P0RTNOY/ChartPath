import { View } from 'react-native';

import { Badge, Card, UiText, useTheme } from '@chartpath/ui';

import type { PaperExecutionAccessMode } from '@/data/paper-execution';

export function InternalQaBoundaryBanner({
  accessMode,
}: {
  readonly accessMode: PaperExecutionAccessMode;
}) {
  const theme = useTheme();
  if (accessMode === 'ordinary') return null;

  return (
    <Card testID="internal-qa-boundary" variant="accent">
      <View
        accessibilityLabel="מצב QA פנימי. התוכן לא פורסם, אינו מקבל קרדיט ואינו אישור או המלצה."
        accessibilityRole="summary"
        accessible
        style={{ gap: theme.spacing.sm }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Badge tone="warning">QA פנימי</Badge>
          <Badge tone="neutral">לא פורסם</Badge>
          <Badge tone="neutral">ללא קרדיט</Badge>
        </View>
        <UiText color="warning" variant="bodySmall">
          גבול בדיקה פעיל: החומר מיועד לביקורת פנימית בלבד ואינו אישור לפרסום, תחזית או המלצה
          לפעולה.
        </UiText>
      </View>
    </Card>
  );
}
