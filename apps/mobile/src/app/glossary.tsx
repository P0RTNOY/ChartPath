import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { glossary } from '@chartpath/content';
import { Badge, Card, Heading, LtrText, UiText, useTheme } from '@chartpath/ui';

import { EmptyState } from '@/components/app-state';
import { Glyph } from '@/components/glyph';
import { MainScreen } from '@/components/main-screen';
import { TopBar } from '@/components/top-bar';

export default function GlossaryScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const ltrQuery = /[A-Za-z]/.test(query);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('he');
    if (!normalized) return glossary;
    return glossary.filter((term) =>
      [term.termHe, term.termEn, term.definitionHe, term.definitionEn, ...term.aliases].some(
        (value) => value.toLocaleLowerCase('he').includes(normalized),
      ),
    );
  }, [query]);

  return (
    <MainScreen contentContainerStyle={{ gap: theme.spacing.lg }} scroll>
      <TopBar subtitle="עברית ואנגלית, לפי מונחי המקור" title="מילון מונחים" />
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: 15,
          borderWidth: 1,
          flexDirection: 'row-reverse',
          gap: 10,
          minHeight: 54,
          paddingHorizontal: 14,
        }}
      >
        <Glyph color={theme.colors.textMuted} name="glossary" />
        <TextInput
          accessibilityLabel="חיפוש במילון בעברית או באנגלית"
          onChangeText={setQuery}
          placeholder="חיפוש: תמיכה, Breakout…"
          placeholderTextColor={theme.colors.textMuted}
          style={{
            color: theme.colors.text,
            direction: ltrQuery ? 'ltr' : 'rtl',
            flex: 1,
            fontSize: 17,
            minHeight: 52,
            textAlign: ltrQuery ? 'left' : 'right',
            writingDirection: ltrQuery ? 'ltr' : 'rtl',
          }}
          value={query}
        />
        {query ? (
          <Pressable
            accessibilityLabel="ניקוי החיפוש"
            onPress={() => setQuery('')}
            style={{ alignItems: 'center', height: 44, justifyContent: 'center', width: 36 }}
          >
            <Glyph name="close" />
          </Pressable>
        ) : undefined}
      </View>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
        }}
      >
        <Heading level={2}>{query ? 'תוצאות' : 'כל המונחים'}</Heading>
        <LtrText color="textMuted" variant="caption">
          {results.length} terms
        </LtrText>
      </View>
      <View style={{ gap: 10 }}>
        {results.length === 0 ? (
          <EmptyState
            message="נסו מילה אחרת בעברית, באנגלית או קיצור מקובל."
            title="לא נמצאו מונחים"
          />
        ) : (
          results.map((term) => {
            const open = expanded === term.id;
            return (
              <Card
                accessibilityHint={open ? 'סגירת ההגדרה' : 'פתיחת ההגדרה'}
                key={term.id}
                onPress={() => setExpanded(open ? null : term.id)}
                variant={open ? 'accent' : 'outlined'}
              >
                <View style={{ gap: 10 }}>
                  <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Heading level={3}>{term.termHe}</Heading>
                      <LtrText color="textMuted" variant="bodySmall">
                        {term.termEn}
                      </LtrText>
                    </View>
                    <LtrText color="primary" style={{ fontSize: 24 }}>
                      {open ? '−' : '+'}
                    </LtrText>
                  </View>
                  {open ? (
                    <View
                      style={{
                        borderTopColor: theme.colors.border,
                        borderTopWidth: 1,
                        gap: 10,
                        paddingTop: 12,
                      }}
                    >
                      <UiText>{term.definitionHe}</UiText>
                      <LtrText color="textMuted" variant="bodySmall">
                        {term.definitionEn}
                      </LtrText>
                      {term.aliases.length ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {term.aliases.map((alias) => (
                            <Badge key={alias} tone="neutral">
                              <LtrText variant="caption">{alias}</LtrText>
                            </Badge>
                          ))}
                        </View>
                      ) : undefined}
                      <UiText color="textMuted" variant="caption">
                        מקור: עמ׳{' '}
                        <LtrText color="textMuted" variant="caption">
                          {term.sourceReferences
                            .map((ref) => `${ref.pageStart}–${ref.pageEnd}`)
                            .join(', ')}
                        </LtrText>
                      </UiText>
                    </View>
                  ) : undefined}
                </View>
              </Card>
            );
          })
        )}
      </View>
    </MainScreen>
  );
}
