import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { generateChart } from '@chartpath/chart-engine';
import type {
  ChartAnchor,
  ChartZone,
  Exercise,
  ExerciseAnswer,
  ExerciseOption,
  GeneratedChart,
  RiskAnswerField,
  TradeDecision,
} from '@chartpath/domain';
import { Button, Card, LtrText, UiText, useTheme } from '@chartpath/ui';

import { Glyph } from './glyph';
import { OhlcvChart } from './ohlcv-chart';

export interface ExerciseInteractionProps {
  readonly exercise: Exercise;
  readonly chart?: GeneratedChart;
  readonly answer: ExerciseAnswer | null;
  readonly onChange: (answer: ExerciseAnswer | null) => void;
  readonly disabled?: boolean;
}

function answerOptionId(answer: ExerciseAnswer | null): string | null {
  if (answer?.kind === 'multiple-choice') return answer.optionId;
  if (answer?.kind === 'decision') return answer.decision;
  return null;
}

function OptionGrid({
  options,
  selectedId,
  onSelect,
  disabled,
}: {
  readonly options: readonly ExerciseOption[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly disabled: boolean;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ gap: theme.spacing.sm }}>
      {options.map((option, index) => {
        const selected = selectedId === option.id;
        return (
          <Card
            accessibilityLabel={`${option.labelHe}${option.labelEn ? `, ${option.labelEn}` : ''}`}
            disabled={disabled}
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={{
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              borderWidth: selected ? 2 : 1,
              flexDirection: 'row-reverse',
              gap: 12,
            }}
            variant={selected ? 'accent' : 'outlined'}
          >
            <View
              style={{
                alignItems: 'center',
                borderColor: selected ? theme.colors.primary : theme.colors.borderStrong,
                borderRadius: 11,
                borderWidth: 2,
                height: 22,
                justifyContent: 'center',
                width: 22,
              }}
            >
              {selected ? (
                <View
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: 6,
                    height: 12,
                    width: 12,
                  }}
                />
              ) : undefined}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <UiText variant="label">{option.labelHe}</UiText>
              {option.labelEn ? (
                <LtrText color="textMuted" variant="caption">
                  {option.labelEn}
                </LtrText>
              ) : undefined}
            </View>
            <LtrText color="textMuted" variant="caption">
              {String.fromCharCode(65 + index)}
            </LtrText>
          </Card>
        );
      })}
    </View>
  );
}

function DecisionInteraction(props: ExerciseInteractionProps) {
  const fallback: readonly ExerciseOption[] = [
    { id: 'trade', labelHe: 'יש תרחיש תקף', labelEn: 'Trade scenario' },
    { id: 'wait', labelHe: 'להמתין לאישור', labelEn: 'Wait' },
    { id: 'no-trade', labelHe: 'אין עסקה', labelEn: 'No trade' },
    { id: 'insufficient-evidence', labelHe: 'אין מספיק ראיות', labelEn: 'Insufficient evidence' },
  ];
  const options = props.exercise.options?.length ? props.exercise.options : fallback;
  return (
    <OptionGrid
      disabled={props.disabled ?? false}
      onSelect={(id) =>
        props.onChange({
          kind: 'decision',
          decision: id as TradeDecision,
          reasonIds:
            props.exercise.rubric.kind === 'decision'
              ? props.exercise.rubric.requiredReasonIds
              : undefined,
        })
      }
      options={options}
      selectedId={answerOptionId(props.answer)}
    />
  );
}

function SelectionInteraction(props: ExerciseInteractionProps) {
  const theme = useTheme();
  const selected = props.answer?.kind === 'selection' ? props.answer.selectedIds : [];
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {props.exercise.options?.map((option) => {
        const checked = selected.includes(option.id);
        return (
          <Card
            accessibilityLabel={option.labelHe}
            disabled={props.disabled}
            key={option.id}
            onPress={() => {
              const next = checked
                ? selected.filter((id) => id !== option.id)
                : [...selected, option.id];
              props.onChange({ kind: 'selection', selectedIds: next });
            }}
            style={{
              alignItems: 'center',
              borderColor: checked ? theme.colors.primary : theme.colors.border,
              borderWidth: checked ? 2 : 1,
              flexDirection: 'row-reverse',
              gap: 12,
            }}
            variant={checked ? 'accent' : 'outlined'}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: checked ? theme.colors.primary : 'transparent',
                borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
                borderRadius: 6,
                borderWidth: 2,
                height: 24,
                justifyContent: 'center',
                width: 24,
              }}
            >
              {checked ? (
                <Glyph color={theme.colors.onPrimary} name="check" size={15} />
              ) : undefined}
            </View>
            <View style={{ flex: 1 }}>
              <UiText variant="label">{option.labelHe}</UiText>
              {option.labelEn ? (
                <LtrText color="textMuted" variant="caption">
                  {option.labelEn}
                </LtrText>
              ) : undefined}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

function SequenceInteraction(props: ExerciseInteractionProps) {
  const theme = useTheme();
  const options = props.exercise.options ?? [];
  const initial =
    props.answer?.kind === 'sequence'
      ? props.answer.orderedIds
      : options.map((option) => option.id);
  const optionMap = new Map(options.map((option) => [option.id, option]));
  const move = (index: number, delta: -1 | 1) => {
    const next = [...initial];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    props.onChange({ kind: 'sequence', orderedIds: next });
  };
  return (
    <View accessibilityLabel={`סידור ${options.length} שלבים`} style={{ gap: 8 }}>
      {initial.map((id, index) => {
        const option = optionMap.get(id);
        if (!option) return null;
        return (
          <Card
            key={id}
            padding="sm"
            style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 10 }}
            variant="outlined"
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: theme.colors.primarySoft,
                borderRadius: 10,
                height: 34,
                justifyContent: 'center',
                width: 34,
              }}
            >
              <LtrText color="primary" variant="numeric">
                {index + 1}
              </LtrText>
            </View>
            <UiText style={{ flex: 1 }} variant="label">
              {option.labelHe}
            </UiText>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              <Pressable
                accessibilityLabel={`העבר את ${option.labelHe} למעלה`}
                disabled={props.disabled || index === 0}
                onPress={() => move(index, -1)}
                style={{
                  alignItems: 'center',
                  height: 44,
                  justifyContent: 'center',
                  opacity: index === 0 ? 0.3 : 1,
                  width: 40,
                }}
              >
                <Glyph name="up" />
              </Pressable>
              <Pressable
                accessibilityLabel={`העבר את ${option.labelHe} למטה`}
                disabled={props.disabled || index === initial.length - 1}
                onPress={() => move(index, 1)}
                style={{
                  alignItems: 'center',
                  height: 44,
                  justifyContent: 'center',
                  opacity: index === initial.length - 1 ? 0.3 : 1,
                  width: 40,
                }}
              >
                <Glyph name="down" />
              </Pressable>
            </View>
          </Card>
        );
      })}
      <Button
        disabled={props.disabled}
        onPress={() => props.onChange({ kind: 'sequence', orderedIds: initial })}
        variant="secondary"
      >
        אישור הסדר
      </Button>
    </View>
  );
}

const riskLabels: Readonly<
  Record<RiskAnswerField, { readonly he: string; readonly suffix: string }>
> = {
  accountRisk: { he: 'סיכון כספי בחשבון', suffix: '₪' },
  stopDistance: { he: 'מרחק לסטופ', suffix: '%' },
  perUnitRisk: { he: 'סיכון ליחידה', suffix: '₪' },
  positionSize: { he: 'גודל פוזיציה', suffix: 'יח׳' },
  riskMultiple: { he: 'מכפיל סיכון', suffix: 'R' },
};

function RiskInteraction(props: ExerciseInteractionProps) {
  const theme = useTheme();
  const fields =
    props.exercise.rubric.kind === 'risk'
      ? (Object.keys(props.exercise.rubric.expected) as RiskAnswerField[])
      : (Object.keys(riskLabels) as RiskAnswerField[]);
  const values = props.answer?.kind === 'risk' ? props.answer.values : {};
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {fields.map((field) => (
        <View key={field} style={{ gap: 6 }}>
          <UiText variant="label">{riskLabels[field].he}</UiText>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: 13,
              borderWidth: 1,
              flexDirection: 'row',
              minHeight: 52,
              paddingHorizontal: 14,
            }}
          >
            <LtrText color="textMuted" variant="label">
              {riskLabels[field].suffix}
            </LtrText>
            <TextInput
              accessibilityLabel={riskLabels[field].he}
              editable={!props.disabled}
              keyboardType="decimal-pad"
              onChangeText={(text) => {
                const parsed = Number(text.replace(',', '.'));
                props.onChange({
                  kind: 'risk',
                  values: { ...values, [field]: Number.isFinite(parsed) ? parsed : undefined },
                });
              }}
              placeholder="0"
              placeholderTextColor={theme.colors.textMuted}
              style={{
                color: theme.colors.text,
                direction: 'ltr',
                flex: 1,
                fontSize: 18,
                fontVariant: ['tabular-nums'],
                minHeight: 50,
                textAlign: 'left',
                writingDirection: 'ltr',
              }}
              value={values[field]?.toString() ?? ''}
            />
          </View>
        </View>
      ))}
      <Card variant="subtle">
        <UiText color="textMuted" variant="caption">
          התרגיל מלמד ניהול סיכון עקבי. הוא אינו המלצה לפעולה בנייר ערך.
        </UiText>
      </Card>
    </View>
  );
}

function DrawingInteraction(props: ExerciseInteractionProps) {
  const theme = useTheme();
  const [anchors, setAnchors] = useState<readonly ChartAnchor[]>(() => {
    if (props.answer?.kind === 'point') return props.answer.points;
    if (props.answer?.kind === 'line') return [props.answer.line.start, props.answer.line.end];
    if (props.answer?.kind === 'zone')
      return [
        { candleIndex: props.answer.zone.startCandleIndex, price: props.answer.zone.priceLow },
        { candleIndex: props.answer.zone.endCandleIndex, price: props.answer.zone.priceHigh },
      ];
    return [];
  });
  if (!props.chart)
    return <EmptyInteraction message="הגרף אינו זמין כרגע. אפשר לחזור ולנסות שוב." />;
  const mode = props.exercise.rubric.kind;
  const requiredPoints = mode === 'point' ? Math.max(1, props.exercise.rubric.targets.length) : 2;
  const handlePress = (anchor: ChartAnchor) => {
    if (props.disabled) return;
    const next = anchors.length >= requiredPoints ? [anchor] : [...anchors, anchor];
    setAnchors(next);
    if (mode === 'point') {
      props.onChange({ kind: 'point', points: next });
    } else if (mode === 'line' && next.length === 2) {
      props.onChange({ kind: 'line', line: { start: next[0]!, end: next[1]! } });
    } else if (mode === 'zone' && next.length === 2) {
      props.onChange({
        kind: 'zone',
        zone: {
          startCandleIndex: Math.min(next[0]!.candleIndex, next[1]!.candleIndex),
          endCandleIndex: Math.max(next[0]!.candleIndex, next[1]!.candleIndex),
          priceLow: Math.min(next[0]!.price, next[1]!.price),
          priceHigh: Math.max(next[0]!.price, next[1]!.price),
        },
      });
    } else {
      props.onChange(null);
    }
  };
  const zone: ChartZone | undefined = props.answer?.kind === 'zone' ? props.answer.zone : undefined;
  const line = props.answer?.kind === 'line' ? props.answer.line : undefined;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <OhlcvChart
        chart={props.chart}
        interactive={!props.disabled}
        onChartPress={handlePress}
        selectedLine={line}
        selectedPoints={anchors}
        selectedZone={zone}
      />
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
        }}
      >
        <UiText color="textMuted" variant="caption">
          {anchors.length} מתוך {requiredPoints} נקודות סומנו
        </UiText>
        <Button
          onPress={() => {
            setAnchors([]);
            props.onChange(null);
          }}
          size="compact"
          variant="ghost"
        >
          ניקוי סימון
        </Button>
      </View>
    </View>
  );
}

function TimeframeComparison(props: ExerciseInteractionProps) {
  const theme = useTheme();
  const secondary = useMemo(() => {
    if (!props.exercise.chartSpec) return undefined;
    try {
      return generateChart({
        ...props.exercise.chartSpec,
        id: `${props.exercise.chartSpec.id}-higher`,
        seed: props.exercise.chartSpec.seed + 101,
        timeframe: props.exercise.chartSpec.timeframe === '1D' ? '1W' : '1D',
      });
    } catch {
      return undefined;
    }
  }, [props.exercise.chartSpec]);
  return (
    <View style={{ gap: theme.spacing.md }}>
      {props.chart ? <OhlcvChart chart={props.chart} ticker="CPTH" /> : undefined}
      {secondary ? <OhlcvChart chart={secondary} ticker="CPTH" /> : undefined}
      <RubricInteraction {...props} />
    </View>
  );
}

function SequentialReveal(props: ExerciseInteractionProps) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(Math.min(12, props.chart?.candles.length ?? 0));
  const total = props.chart?.candles.length ?? 0;
  return (
    <View style={{ gap: theme.spacing.md }}>
      {props.chart ? (
        <OhlcvChart chart={props.chart} revealCount={revealed} ticker="CPTH" />
      ) : (
        <EmptyInteraction message="לא ניתן לטעון את רצף הנרות." />
      )}
      <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 12 }}>
        <Button
          disabled={revealed >= total}
          onPress={() => setRevealed((value) => Math.min(total, value + 4))}
          variant="secondary"
        >
          חשיפת 4 נרות
        </Button>
        <LtrText color="textMuted" variant="numeric">
          {revealed}/{total}
        </LtrText>
      </View>
      {revealed >= total ? (
        <RubricInteraction {...props} />
      ) : (
        <UiText color="textMuted" variant="bodySmall">
          בכל שלב עצרו, תארו את הראיות, ובחרו אם להמתין. העתיד אינו גלוי בזמן החלטה אמיתית.
        </UiText>
      )}
    </View>
  );
}

function EmptyInteraction({ message }: { readonly message: string }) {
  return (
    <Card variant="subtle">
      <UiText align="center" color="textMuted">
        {message}
      </UiText>
    </Card>
  );
}

export function ExerciseInteraction(props: ExerciseInteractionProps) {
  useEffect(() => {
    props.onChange(null);
    // Reset the controlled answer only when a different exercise loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.exercise.id]);

  if (props.exercise.interactionType === 'timeframe-comparison')
    return <TimeframeComparison {...props} />;
  if (props.exercise.interactionType === 'sequential-reveal')
    return <SequentialReveal {...props} />;
  if (
    props.exercise.interactionType === 'mistake-diagnosis' ||
    props.exercise.interactionType === 'label-placement'
  ) {
    return <RubricInteraction {...props} />;
  }
  return <RubricInteraction {...props} />;
}

function RubricInteraction(props: ExerciseInteractionProps) {
  switch (props.exercise.rubric.kind) {
    case 'decision':
      return <DecisionInteraction {...props} />;
    case 'multiple-choice':
      return <MultipleChoiceInteraction {...props} />;
    case 'selection':
      return <SelectionInteraction {...props} />;
    case 'sequence':
      return <SequenceInteraction {...props} />;
    case 'risk':
      return <RiskInteraction {...props} />;
    case 'point':
    case 'zone':
    case 'line':
      return <DrawingInteraction {...props} />;
  }
}

function MultipleChoiceInteraction(props: ExerciseInteractionProps) {
  return (
    <OptionGrid
      disabled={props.disabled ?? false}
      onSelect={(optionId) => props.onChange({ kind: 'multiple-choice', optionId })}
      options={props.exercise.options ?? []}
      selectedId={answerOptionId(props.answer)}
    />
  );
}
