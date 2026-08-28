import { useState } from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, TextInput, View } from 'react-native';

import { Button, Card, Heading, LtrText, UiText, useTheme } from '@chartpath/ui';

import {
  managementDecisionBasisLabels,
  managementEvidenceTagLabels,
  positionManagementActionLabels,
  type PendingPositionManagementActionView,
  type PositionManagementActionKind,
  type PositionManagementDraftView,
  type PositionManagementPreviewView,
} from '@/data/position-management';

const quantityActions: readonly PositionManagementActionKind[] = [
  'full-exit',
  'partial-exit',
  'scale-in',
];
const priceActions: readonly PositionManagementActionKind[] = ['replace-stop', 'replace-target'];

function Choice({
  checked,
  disabled = false,
  label,
  onPress,
  role = 'checkbox',
  testID,
}: {
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onPress: () => void;
  readonly role?: 'checkbox' | 'radio';
  readonly testID?: string;
}) {
  const theme = useTheme();
  return (
    <>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole={role}
        accessibilityState={{ checked, disabled, selected: role === 'radio' ? checked : undefined }}
        disabled={disabled}
        onPress={onPress}
        style={{
          alignItems: 'center',
          backgroundColor: checked ? theme.colors.primarySoft : theme.colors.surface,
          borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
          borderRadius: theme.radii.md,
          borderWidth: checked ? 2 : 1,
          flexDirection: 'row',
          flexGrow: role === 'radio' ? 1 : 0,
          gap: 8,
          minHeight: 48,
          minWidth: role === 'radio' ? 150 : 44,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
        testID={testID}
      >
        <LtrText color={checked ? 'primary' : 'textMuted'} variant="label">
          {role === 'radio' ? (checked ? '◉' : '○') : checked ? '☑' : '☐'}
        </LtrText>
        <UiText style={{ flexShrink: 1 }} variant="bodySmall">
          {label}
        </UiText>
      </Pressable>
    </>
  );
}

function ManagementInput({
  label,
  multiline = false,
  onChange,
  testID,
  value,
}: {
  readonly label: string;
  readonly multiline?: boolean;
  readonly onChange: (value: string) => void;
  readonly testID: string;
  readonly value: string;
}) {
  const theme = useTheme();
  const accessoryId = `${testID}-keyboard-accessory`;
  return (
    <View style={{ gap: 6 }}>
      <UiText variant="label">{label}</UiText>
      <TextInput
        accessibilityLabel={label}
        keyboardType={multiline ? 'default' : 'decimal-pad'}
        inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
        maxLength={multiline ? 500 : 32}
        multiline={multiline}
        onChangeText={onChange}
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          color: theme.colors.text,
          direction: multiline ? 'rtl' : 'ltr',
          fontSize: 17,
          minHeight: multiline ? 112 : 52,
          padding: 12,
          textAlign: multiline ? 'right' : 'left',
          textAlignVertical: multiline ? 'top' : 'center',
          writingDirection: multiline ? 'rtl' : 'ltr',
        }}
        testID={testID}
        value={value}
      />
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={accessoryId}>
          <View
            style={{
              alignItems: 'flex-end',
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              borderTopWidth: 1,
              padding: 6,
            }}
          >
            <Button onPress={Keyboard.dismiss} testID={`${testID}-keyboard-done`} variant="ghost">
              סיום עריכה
            </Button>
          </View>
        </InputAccessoryView>
      ) : undefined}
    </View>
  );
}

export function PositionManagementPanel({
  allowedActions,
  draft,
  onCancelPending,
  onChangeDraft,
  onSelectAction,
  onSubmit,
  pending,
  preview,
  working = false,
}: {
  readonly allowedActions: readonly PositionManagementActionKind[];
  readonly draft?: PositionManagementDraftView;
  readonly onCancelPending: (actionId: string) => void;
  readonly onChangeDraft: (draft: PositionManagementDraftView) => void;
  readonly onSelectAction: (kind: PositionManagementActionKind) => void;
  readonly onSubmit: () => void;
  readonly pending?: PendingPositionManagementActionView;
  readonly preview?: PositionManagementPreviewView;
  readonly working?: boolean;
}) {
  const theme = useTheme();
  const [confirmed, setConfirmed] = useState(false);
  const [warningsConfirmed, setWarningsConfirmed] = useState(false);
  const changeDraft = (next: PositionManagementDraftView) => {
    setConfirmed(false);
    setWarningsConfirmed(false);
    onChangeDraft(next);
  };
  const selectAction = (kind: PositionManagementActionKind) => {
    setConfirmed(false);
    setWarningsConfirmed(false);
    onSelectAction(kind);
  };

  if (pending) {
    return (
      <Card
        accessibilityLabel="פעולת ניהול ממתינה"
        testID="paper-management-pending"
        variant="accent"
      >
        <View style={{ gap: theme.spacing.sm }}>
          <Heading level={2}>פעולת ניהול ממתינה</Heading>
          <UiText>{pending.actionHe}</UiText>
          <LtrText color="textMuted" variant="numeric">
            {`submitted after candle ${pending.submittedAfterCandleLtr} · eligible ${pending.firstEligibleCandleLtr}`}
          </LtrText>
          <UiText color="textMuted" variant="caption">
            הפעולה אינה מקבלת מחיר מנר שכבר הושלם. היא תיבדק לפי סדר העיבוד הדטרמיניסטי בנר הזכאי
            הבא.
          </UiText>
          {pending.cancellable ? (
            <Button
              disabled={working}
              onPress={() => onCancelPending(pending.actionId)}
              testID="paper-management-cancel-pending"
              variant="danger"
            >
              ביטול הפעולה הממתינה
            </Button>
          ) : undefined}
        </View>
      </Card>
    );
  }

  return (
    <Card
      accessibilityLabel="פעולת ניהול חדשה"
      testID="paper-management-action-selector"
      variant="outlined"
    >
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ gap: 8 }}>
          <Heading level={2}>פעולת ניהול חדשה</Heading>
          <UiText color="textMuted" variant="bodySmall">
            בחירת פעולה מתעדת כוונה בסימולטור בלבד. היא אינה המלצה ואינה מבטיחה מחיר ביצוע.
          </UiText>
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          >
            {allowedActions.map((kind) => (
              <Choice
                checked={draft?.kind === kind}
                key={kind}
                label={positionManagementActionLabels[kind]}
                onPress={() => selectAction(kind)}
                role="radio"
                testID={`paper-management-action-${kind === 'journal-only' ? 'journal' : kind}`}
              />
            ))}
          </View>
        </View>

        {draft ? (
          <>
            {quantityActions.includes(draft.kind) ? (
              <ManagementInput
                label="כמות יחידות מדויקת"
                onChange={(quantity) => changeDraft({ ...draft, quantity })}
                testID="paper-management-input-quantity"
                value={draft.quantity ?? ''}
              />
            ) : undefined}
            {priceActions.includes(draft.kind) ? (
              <ManagementInput
                label={draft.kind === 'replace-stop' ? 'רמת סטופ חדשה' : 'רמת יעד חדשה'}
                onChange={(price) => changeDraft({ ...draft, price })}
                testID="paper-management-input-level"
                value={draft.price ?? ''}
              />
            ) : undefined}
            <ManagementInput
              label="למה הפעולה מתועדת עכשיו?"
              multiline
              onChange={(rationale) => changeDraft({ ...draft, rationale })}
              testID="paper-management-input-rationale"
              value={draft.rationale}
            />

            <View style={{ gap: 8 }} testID="paper-management-process-evidence">
              <UiText variant="label">בסיס ההחלטה</UiText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(managementDecisionBasisLabels).map(([basis, labelHe]) => (
                  <Choice
                    checked={draft.decisionBasis === basis}
                    key={basis}
                    label={labelHe}
                    onPress={() =>
                      changeDraft({
                        ...draft,
                        decisionBasis: basis as PositionManagementDraftView['decisionBasis'],
                      })
                    }
                    role="radio"
                    testID={`paper-management-basis-${basis}`}
                  />
                ))}
              </View>
              <Choice
                checked={draft.riskReviewed}
                label="בדקתי את הסיכון לפני הפעולה"
                onPress={() => changeDraft({ ...draft, riskReviewed: !draft.riskReviewed })}
                testID="paper-management-risk-reviewed"
              />
              <UiText variant="label">ראיות מתועדות</UiText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(managementEvidenceTagLabels).map(([tag, labelHe]) => {
                  const evidenceTag = tag as PositionManagementDraftView['evidenceTags'][number];
                  const checked = draft.evidenceTags.includes(evidenceTag);
                  return (
                    <Choice
                      checked={checked}
                      key={tag}
                      label={labelHe}
                      onPress={() =>
                        changeDraft({
                          ...draft,
                          evidenceTags: checked
                            ? draft.evidenceTags.filter((candidate) => candidate !== evidenceTag)
                            : [...draft.evidenceTags, evidenceTag],
                        })
                      }
                      testID={`paper-management-tag-${tag}`}
                    />
                  );
                })}
              </View>
            </View>

            {preview ? (
              <View style={{ gap: theme.spacing.sm }} testID="paper-management-risk-comparison">
                <Heading level={3}>לפני הפעולה · אם תתבצע לפי המודל</Heading>
                {preview.comparisons.map((comparison) => (
                  <View
                    accessible
                    accessibilityLabel={`${comparison.labelHe}: לפני ${comparison.beforeLtr}, אחרי ${comparison.afterLtr}`}
                    key={comparison.id}
                    style={{
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: 1,
                      gap: 4,
                      paddingVertical: 7,
                    }}
                  >
                    <UiText variant="label">{comparison.labelHe}</UiText>
                    <LtrText variant="numeric">{`${comparison.beforeLtr} → ${comparison.afterLtr}`}</LtrText>
                  </View>
                ))}
                <UiText color="textMuted" variant="caption">
                  {preview.timingHe}
                </UiText>
                {preview.hardErrorsHe.map((error) => (
                  <UiText
                    accessibilityRole="alert"
                    color="danger"
                    key={error}
                    testID="paper-management-hard-error"
                  >
                    {error}
                  </UiText>
                ))}
                {preview.softWarningsHe.map((warning) => (
                  <UiText color="warning" key={warning} testID="paper-management-soft-warning">
                    {warning}
                  </UiText>
                ))}
                {preview.softWarningsHe.length ? (
                  <Choice
                    checked={warningsConfirmed}
                    label="קראתי את אזהרות הסיכון והסטייה מן התכנית"
                    onPress={() => setWarningsConfirmed((value) => !value)}
                    testID="paper-management-warning-confirmation"
                  />
                ) : undefined}
                <View style={{ gap: 8 }} testID="paper-management-review">
                  <View testID="paper-management-confirmation">
                    <Choice
                      checked={confirmed}
                      disabled={preview.hardErrorsHe.length > 0}
                      label="בדקתי את הכמות, הסיכון, העיתוי והנחות הסימולטור"
                      onPress={() => setConfirmed((value) => !value)}
                      testID="paper-management-confirm"
                    />
                  </View>
                  <Button
                    disabled={
                      working ||
                      !draft.rationale.trim() ||
                      preview.hardErrorsHe.length > 0 ||
                      !confirmed ||
                      (preview.softWarningsHe.length > 0 && !warningsConfirmed)
                    }
                    fullWidth
                    loading={working}
                    loadingLabel="מגישים פעולת ניהול…"
                    onPress={onSubmit}
                    testID="paper-management-submit"
                  >
                    הגשת פעולת ניהול
                  </Button>
                </View>
              </View>
            ) : undefined}
          </>
        ) : undefined}
      </View>
    </Card>
  );
}
