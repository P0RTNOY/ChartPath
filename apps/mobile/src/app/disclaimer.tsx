import { View } from 'react-native';

import { Badge, Card, Heading, Screen, UiText, useTheme } from '@chartpath/ui';

import { Glyph, IconBubble } from '@/components/glyph';
import { TopBar } from '@/components/top-bar';

export default function DisclaimerScreen() {
  const theme = useTheme();
  return (
    <Screen contentContainerStyle={{ gap: theme.spacing.xl }} scroll>
      <TopBar back title="הבהרה לימודית" />
      <View style={{ alignItems: 'center', gap: 12 }}>
        <IconBubble tone="gold">
          <Glyph name="info" />
        </IconBubble>
        <Badge tone="warning">חשוב לקרוא</Badge>
        <Heading align="center" level={1}>
          למידה, לא ייעוץ
        </Heading>
      </View>
      <Card variant="outlined">
        <View style={{ gap: 14 }}>
          <UiText>
            ChartPath מיועד ללימוד ותרגול של תהליך ניתוח טכני. הוא אינו מספק ייעוץ השקעות, ייעוץ מס
            או ייעוץ משפטי, ואינו מתאים את התוכן לנסיבות אישיות.
          </UiText>
          <UiText>
            הגרפים באפליקציה הם תרחישים סינתטיים או דוגמאות לימודיות. טיקר, מחיר, יעד או גודל
            פוזיציה המופיעים בהם אינם הוראה לקנות, למכור או להחזיק נכס.
          </UiText>
          <UiText>
            כל תרחיש הוא הסתברותי. גם ניתוח עקבי עשוי להסתיים בהפסד, פער או מילוי שונה מהמתוכנן.
            ביצוע בפועל כרוך בסיכונים נוספים.
          </UiText>
        </View>
      </Card>
      <Card variant="accent">
        <View style={{ gap: 10 }}>
          <Heading level={3}>תשובות נכונות כוללות גם עצירה</Heading>
          <UiText>
            ״להמתין״, ״אין עסקה״ ו״אין מספיק ראיות״ הן תשובות מלאות כאשר כללי התרחיש אינם מתקיימים.
          </UiText>
        </View>
      </Card>
      <Card variant="subtle">
        <UiText color="textMuted" variant="caption">
          במקרה של צורך בהחלטה פיננסית אישית, יש לפנות לבעל רישיון מתאים ולבדוק את המידע ממקורות
          רשמיים.
        </UiText>
      </Card>
    </Screen>
  );
}
