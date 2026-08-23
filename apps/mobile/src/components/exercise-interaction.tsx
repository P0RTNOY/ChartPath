import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { generateChart } from '@chartpath/chart-engine';
import type { ContentExercise } from '@chartpath/content';
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
import { CapstoneInteraction, type CapstoneExercise } from './capstone-interaction';
import { stablePresentationOrder } from '../data/presentation-order';

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
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
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

const fallbackDecisionOptions: readonly ExerciseOption[] = [
  { id: 'trade', labelHe: 'יש תרחיש תקף', labelEn: 'Trade scenario' },
  { id: 'wait', labelHe: 'להמתין לאישור', labelEn: 'Wait' },
  { id: 'reject', labelHe: 'לדחות את התרחיש', labelEn: 'Reject' },
  { id: 'no-trade', labelHe: 'אין עסקה', labelEn: 'No trade' },
  {
    id: 'insufficient-evidence',
    labelHe: 'אין מספיק ראיות',
    labelEn: 'Insufficient evidence',
  },
];

const tradeDecisions = new Set<TradeDecision>([
  'trade',
  'wait',
  'reject',
  'no-trade',
  'insufficient-evidence',
]);

function decisionForOption(
  id: string,
  authoredMap: Readonly<Record<string, TradeDecision>> | undefined,
): TradeDecision | undefined {
  return (
    authoredMap?.[id] ??
    (tradeDecisions.has(id as TradeDecision) ? (id as TradeDecision) : undefined)
  );
}

function DecisionInteraction(props: ExerciseInteractionProps) {
  const theme = useTheme();
  const supplied = props.exercise.options?.length
    ? props.exercise.options
    : fallbackDecisionOptions;
  const contentExercise = props.exercise as ContentExercise;
  const authoredMap = contentExercise.decisionOptionMap;
  const decisionOptions = stablePresentationOrder(
    supplied.filter((option) => decisionForOption(option.id, authoredMap)),
    `${props.exercise.id}:decision`,
  );
  const authoredReasons = contentExercise.reasonOptions;
  const reasonOptions = stablePresentationOrder(
    authoredReasons ?? supplied.filter((option) => !decisionForOption(option.id, authoredMap)),
    `${props.exercise.id}:decision-reasons`,
  );
  const selectedDecision = props.answer?.kind === 'decision' ? props.answer.decision : undefined;
  const selectedOptionId =
    (props.answer?.kind === 'decision' ? props.answer.optionId : undefined) ??
    decisionOptions.find((option) => decisionForOption(option.id, authoredMap) === selectedDecision)
      ?.id ??
    null;
  const selectedReasons = props.answer?.kind === 'decision' ? (props.answer.reasonIds ?? []) : [];
  return (
    <View style={{ gap: theme.spacing.md }}>
      <OptionGrid
        disabled={props.disabled ?? false}
        onSelect={(id) => {
          const decision = decisionForOption(id, authoredMap);
          if (!decision) return;
          props.onChange({ kind: 'decision', decision, optionId: id, reasonIds: selectedReasons });
        }}
        options={decisionOptions}
        selectedId={selectedOptionId}
      />
      {reasonOptions.length ? (
        <View style={{ gap: theme.spacing.sm }}>
          <UiText variant="label">אילו ראיות תומכות בהחלטה?</UiText>
          {!selectedDecision ? (
            <UiText color="textMuted" variant="caption">
              בחרו החלטה לפני סימון הראיות.
            </UiText>
          ) : undefined}
          {reasonOptions.map((option) => {
            const checked = selectedReasons.includes(option.id);
            return (
              <Card
                accessibilityLabel={option.labelHe}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                disabled={props.disabled || !selectedDecision}
                key={option.id}
                onPress={() => {
                  if (!selectedDecision) return;
                  const reasonIds = checked
                    ? selectedReasons.filter((id) => id !== option.id)
                    : [...selectedReasons, option.id];
                  props.onChange({
                    kind: 'decision',
                    decision: selectedDecision,
                    optionId: selectedOptionId ?? undefined,
                    reasonIds,
                  });
                }}
                variant={checked ? 'accent' : 'outlined'}
              >
                <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 12 }}>
                  {checked ? <Glyph name="check" /> : <View style={{ height: 20, width: 20 }} />}
                  <UiText style={{ flex: 1 }}>{option.labelHe}</UiText>
                </View>
              </Card>
            );
          })}
        </View>
      ) : undefined}
    </View>
  );
}

function SelectionInteraction(props: ExerciseInteractionProps) {
  const theme = useTheme();
  const selected = props.answer?.kind === 'selection' ? props.answer.selectedIds : [];
  const options = stablePresentationOrder(
    props.exercise.options ?? [],
    `${props.exercise.id}:selection:order`,
  );
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {options.map((option) => {
        const checked = selected.includes(option.id);
        return (
          <Card
            accessibilityLabel={option.labelHe}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
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
  const presentedOptions = stablePresentationOrder(options, `${props.exercise.id}:sequence`);
  const initial =
    props.answer?.kind === 'sequence'
      ? props.answer.orderedIds
      : presentedOptions.map((option) => option.id);
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
                  width: 44,
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
                  width: 44,
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
  stopDistance: { he: 'מרחק לסטופ', suffix: '₪' },
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
  const [draftCandleIndex, setDraftCandleIndex] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
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
      <Card variant="subtle">
        <View style={{ gap: theme.spacing.sm }}>
          <UiText variant="label">חלופה נגישה לסימון על הגרף</UiText>
          <UiText color="textMuted" variant="caption">
            הזינו מספר נר ומחיר כדי להוסיף נקודה בלי מחוות מדויקות.
          </UiText>
          <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
            <TextInput
              accessibilityLabel="מספר נר לסימון"
              editable={!props.disabled}
              keyboardType="number-pad"
              onChangeText={setDraftCandleIndex}
              placeholder="נר"
              placeholderTextColor={theme.colors.textMuted}
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: 10,
                borderWidth: 1,
                color: theme.colors.text,
                flex: 1,
                minHeight: 48,
                paddingHorizontal: 12,
                direction: 'ltr',
                textAlign: 'left',
                writingDirection: 'ltr',
              }}
              value={draftCandleIndex}
            />
            <TextInput
              accessibilityLabel="מחיר לסימון"
              editable={!props.disabled}
              keyboardType="decimal-pad"
              onChangeText={setDraftPrice}
              placeholder="מחיר"
              placeholderTextColor={theme.colors.textMuted}
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: 10,
                borderWidth: 1,
                color: theme.colors.text,
                flex: 1,
                minHeight: 48,
                paddingHorizontal: 12,
                direction: 'ltr',
                textAlign: 'left',
                writingDirection: 'ltr',
              }}
              value={draftPrice}
            />
          </View>
          <Button
            disabled={
              props.disabled ||
              draftCandleIndex.trim() === '' ||
              draftPrice.trim() === '' ||
              !Number.isInteger(Number(draftCandleIndex)) ||
              !Number.isFinite(Number(draftPrice)) ||
              !props.chart.candles.some((candle) => candle.index === Number(draftCandleIndex))
            }
            onPress={() => {
              handlePress({
                candleIndex: Number(draftCandleIndex),
                price: Number(draftPrice),
              });
              setDraftCandleIndex('');
              setDraftPrice('');
            }}
            variant="secondary"
          >
            הוספת נקודה
          </Button>
        </View>
      </Card>
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

interface LabelPlacement {
  readonly anchor: ChartAnchor;
}

function LabelPlacementInteraction(props: ExerciseInteractionProps) {
  const theme = useTheme();
  const options = props.exercise.options ?? [];
  const [activeLabelId, setActiveLabelId] = useState<string | null>(options[0]?.id ?? null);
  const [placements, setPlacements] = useState<Readonly<Record<string, LabelPlacement>>>({});
  const chart = props.chart;

  if (!chart) return <EmptyInteraction message="הגרף לתרגיל התוויות אינו זמין." />;
  if (props.exercise.rubric.kind !== 'label-placement')
    return <EmptyInteraction message="רובריקת התוויות אינה זמינה." />;
  const targets = new Map(
    props.exercise.rubric.targets.map((target) => [target.labelId, target.target]),
  );
  const bullishIndex = targets.get('high-top')?.candleIndex;
  const bearishIndex = targets.get('bear-open-upper')?.candleIndex;
  const activeTarget = activeLabelId ? targets.get(activeLabelId) : undefined;
  const activeCandle = chart.candles.find((candle) => candle.index === activeTarget?.candleIndex);
  const relativePositions = activeCandle
    ? [
        { label: 'קצה עליון של הצל', price: activeCandle.high },
        { label: 'קצה עליון של הגוף', price: Math.max(activeCandle.open, activeCandle.close) },
        { label: 'קצה תחתון של הגוף', price: Math.min(activeCandle.open, activeCandle.close) },
        { label: 'קצה תחתון של הצל', price: activeCandle.low },
      ]
    : [];

  const placeActiveLabel = (anchor: ChartAnchor) => {
    if (props.disabled || !activeLabelId) return;
    const next = { ...placements, [activeLabelId]: { anchor } };
    setPlacements(next);
    props.onChange({
      kind: 'label-placement',
      placements: Object.entries(next).map(([labelId, placement]) => ({
        labelId,
        anchor: placement.anchor,
      })),
    });
    const currentIndex = options.findIndex((option) => option.id === activeLabelId);
    setActiveLabelId(options[currentIndex + 1]?.id ?? activeLabelId);
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      <UiText color="textMuted" variant="bodySmall">
        בחרו תווית ואז הקישו על נקודת המחיר המתאימה. אפשר לבחור תווית שוב ולמקם מחדש.
      </UiText>
      <UiText color="textMuted" variant="caption">
        שני נרות התרגול מסומנים במסגרת מקווקוות; מיקום יחסי נגיש זמין מתחת לגרף.
      </UiText>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}
      >
        {options.map((option) => {
          const selected = activeLabelId === option.id;
          const placed = placements[option.id] !== undefined;
          return (
            <Card
              accessibilityHint={
                placed ? 'בחירה מחדש תאפשר לשנות את המיקום' : 'לאחר הבחירה יש לסמן נקודה בגרף'
              }
              accessibilityLabel={option.labelHe}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.id}
              onPress={() => setActiveLabelId(option.id)}
              padding="sm"
              variant={selected ? 'accent' : 'outlined'}
            >
              <UiText variant="label">
                {placed ? '✓ ' : ''}
                {option.labelHe}
              </UiText>
            </Card>
          );
        })}
      </View>
      <OhlcvChart
        allowAccessibleDataTable={false}
        chart={chart}
        highlightedCandleIndices={[bullishIndex, bearishIndex].filter(
          (index): index is number => index !== undefined,
        )}
        interactive={!props.disabled}
        onChartPress={placeActiveLabel}
        selectedPoints={Object.values(placements).map((placement) => placement.anchor)}
        ticker="CPTH"
      />
      <Card variant="subtle">
        <View style={{ gap: theme.spacing.sm }}>
          <UiText variant="label">חלופת מיקום נגישה</UiText>
          <UiText color="textMuted" variant="caption">
            בחרו את המיקום היחסי של התווית הפעילה; אין צורך להקליד מספר נר או מחיר.
          </UiText>
          {relativePositions.map((position) => (
            <Button
              disabled={props.disabled || !activeTarget}
              key={position.label}
              onPress={() =>
                activeTarget &&
                placeActiveLabel({
                  candleIndex: activeTarget.candleIndex,
                  price: position.price,
                })
              }
              variant="secondary"
            >
              {position.label}
            </Button>
          ))}
        </View>
      </Card>
    </View>
  );
}

function TimeframeComparison(props: ExerciseInteractionProps) {
  const theme = useTheme();
  const comparisonCharts = useMemo(() => {
    if (!props.exercise.chartSpec) return undefined;
    try {
      const weekly = generateChart({
        ...props.exercise.chartSpec,
        id: `${props.exercise.chartSpec.id}-weekly`,
        timeframe: '1W',
        scenario: 'uptrend',
      });
      const daily = generateChart({
        ...props.exercise.chartSpec,
        id: `${props.exercise.chartSpec.id}-daily`,
        seed: props.exercise.chartSpec.seed + 101,
        timeframe: '1D',
        scenario: 'downtrend',
      });
      const hourly = generateChart({
        ...props.exercise.chartSpec,
        id: `${props.exercise.chartSpec.id}-hourly`,
        seed: props.exercise.chartSpec.seed + 202,
        timeframe: '1H',
        scenario: 'uptrend',
      });
      return [
        { chart: weekly, label: 'שבועי — זהו את השכבה הראשית' },
        { chart: daily, label: 'יומי — זהו את השכבה המשנית' },
        { chart: hourly, label: 'שעתי — זהו את השכבה הקצרה' },
      ] as const;
    } catch {
      return undefined;
    }
  }, [props.exercise.chartSpec]);
  return (
    <View style={{ gap: theme.spacing.md }}>
      {comparisonCharts?.map((item) => (
        <View key={item.chart.spec.id} style={{ gap: theme.spacing.xs }}>
          <UiText variant="label">{item.label}</UiText>
          <OhlcvChart chart={item.chart} ticker="CPTH" />
        </View>
      ))}
      {!comparisonCharts ? <EmptyInteraction message="לא ניתן לטעון את מסגרות הזמן." /> : undefined}
      <RubricInteraction {...props} />
    </View>
  );
}

function SequentialReveal(props: ExerciseInteractionProps) {
  const theme = useTheme();
  const total = props.chart?.candles.length ?? 0;
  const decisionWindow = Math.min(
    total,
    (props.chart?.spec.decisionCandleIndex ?? Math.max(0, total - 1)) + 1,
  );
  const [revealed, setRevealed] = useState(
    props.answer ? decisionWindow : Math.min(12, decisionWindow),
  );
  const [draftAnswer, setDraftAnswer] = useState<ExerciseAnswer | null>(props.answer);
  const [recordedUpdates, setRecordedUpdates] = useState(0);
  const atDecisionWindow = revealed >= decisionWindow;
  if (!props.chart || decisionWindow === 0) {
    return <EmptyInteraction message="לא ניתן לטעון את רצף הנרות; לא נרשמה תשובה." />;
  }
  return (
    <View style={{ gap: theme.spacing.md }}>
      <OhlcvChart chart={props.chart} revealCount={revealed} ticker="CPTH" />
      <View style={{ alignItems: 'center', flexDirection: 'row-reverse', gap: 12 }}>
        <Button
          disabled={atDecisionWindow || !draftAnswer}
          onPress={() => {
            setRecordedUpdates((value) => value + 1);
            setDraftAnswer(null);
            props.onChange(null);
            setRevealed((value) => Math.min(decisionWindow, value + 8));
          }}
          variant="secondary"
        >
          {draftAnswer ? 'תיעוד הניתוח וחשיפת 8 נרות' : 'בחרו ניתוח לפני החשיפה'}
        </Button>
        <LtrText color="textMuted" variant="numeric">
          {revealed}/{decisionWindow}
        </LtrText>
      </View>
      <UiText color="textMuted" variant="bodySmall">
        {atDecisionWindow
          ? `הגעתם לחלון ההחלטה לאחר ${recordedUpdates} עדכונים. הבחירה הבאה תהיה התשובה הסופית.`
          : 'בחרו ניתוח לפי הנרות הגלויים, ורק אז ייחשפו הנרות הבאים. הבחירה הזמנית אינה מאפשרת הגשה.'}
      </UiText>
      <RubricInteraction
        {...props}
        answer={draftAnswer}
        onChange={(next) => {
          setDraftAnswer(next);
          props.onChange(atDecisionWindow ? next : null);
        }}
      />
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

  if (props.exercise.interactionType === 'capstone' && props.exercise.rubric.kind === 'capstone') {
    const exercise = props.exercise as CapstoneExercise;
    if (!exercise.capstoneSteps?.length)
      return <EmptyInteraction message="שלבי התהליך המסכם אינם זמינים." />;
    return (
      <CapstoneInteraction
        answer={props.answer?.kind === 'capstone' ? props.answer : null}
        disabled={props.disabled}
        exercise={exercise}
        onChange={(answer) => props.onChange(answer)}
      />
    );
  }
  if (props.exercise.interactionType === 'timeframe-comparison')
    return <TimeframeComparison {...props} />;
  if (props.exercise.interactionType === 'sequential-reveal')
    return <SequentialReveal {...props} />;
  if (props.exercise.interactionType === 'label-placement')
    return <LabelPlacementInteraction {...props} />;
  if (props.exercise.interactionType === 'mistake-diagnosis') {
    return <RubricInteraction {...props} />;
  }
  return <RubricInteraction {...props} />;
}

function RubricInteraction(props: ExerciseInteractionProps) {
  switch (props.exercise.rubric.kind) {
    case 'decision':
      return <DecisionInteraction {...props} />;
    case 'label-placement':
      return <LabelPlacementInteraction {...props} />;
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
      options={stablePresentationOrder(
        props.exercise.options ?? [],
        `${props.exercise.id}:multiple-choice`,
      )}
      selectedId={answerOptionId(props.answer)}
    />
  );
}
