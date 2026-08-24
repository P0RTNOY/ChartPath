import { useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { generateChart, learnerAnnotationsVisibleAt } from '@chartpath/chart-engine';
import { exercises } from '@chartpath/content';
import {
  createAnalysisDraft,
  reduceAnalysisDraft,
  type AnalysisDraft,
  type AnalysisDraftAction,
  type ChartAnchor,
  type ChartSpec,
  type ChartTool,
  type GeneratedChart,
  type GuidedAnalysisSession,
  type LearnerChartAnnotation,
  type OhlcvCandle,
} from '@chartpath/domain';
import {
  Badge,
  Button,
  Card,
  Heading,
  LtrText,
  UiText,
  useReducedMotion,
  useTheme,
} from '@chartpath/ui';

import { CAPSTONE_STEP_LABELS } from './capstone-interaction';
import { OhlcvChart } from './ohlcv-chart';

const GUIDED_ANALYSIS_EXERCISE_ID = 'u10-capstone-e03';
const INITIAL_VISIBLE_CANDLE_COUNT = 24;
const FIXED_REPLAY_GROUP_SIZE = 4;

const toolChoices: readonly { readonly tool: ChartTool; readonly label: string }[] = [
  { tool: { kind: 'inspect' }, label: 'בדיקה' },
  { tool: { kind: 'point' }, label: 'נקודה' },
  { tool: { kind: 'horizontal-level' }, label: 'רמה אופקית' },
  { tool: { kind: 'trendline' }, label: 'קו מגמה' },
  { tool: { kind: 'zone' }, label: 'אזור' },
  { tool: { kind: 'select' }, label: 'בחירה ומחיקה' },
];

export interface GuidedAnalysisChartProps {
  readonly session: GuidedAnalysisSession;
  readonly onAnnotationsChange: (annotations: readonly LearnerChartAnnotation[]) => void;
  readonly onReplayCursorChange: (cursorCandleIndex: number) => void;
  readonly onCheckpointRequested?: (cursorCandleIndex: number) => void;
  readonly availableWidth?: number;
  readonly disabled?: boolean;
  readonly testID?: string;
}

interface LocalDraftState {
  readonly sessionId: string;
  readonly sourceAnnotationsKey: string;
  readonly draft: AnalysisDraft;
}

function canonicalChart(): GeneratedChart {
  const exercise = exercises.find(({ id }) => id === GUIDED_ANALYSIS_EXERCISE_ID);
  if (!exercise?.chartSpec || exercise.chartPresentation !== 'hidden') {
    throw new Error('The reviewed guided-analysis notebook chart is unavailable');
  }
  return generateChart(exercise.chartSpec as ChartSpec);
}

function annotationLabel(annotation: LearnerChartAnnotation): string {
  switch (annotation.kind) {
    case 'point':
      return `נקודה בנר ${annotation.anchor.candleIndex}, מחיר ${annotation.anchor.price.toFixed(2)}`;
    case 'horizontal-level':
      return `רמה אופקית במחיר ${annotation.price.toFixed(2)}, מנר ${annotation.candleIndex}`;
    case 'trendline':
      return `קו מגמה מנר ${annotation.start.candleIndex} לנר ${annotation.end.candleIndex}`;
    case 'zone':
      return `אזור מנר ${Math.min(annotation.start.candleIndex, annotation.end.candleIndex)} לנר ${Math.max(annotation.start.candleIndex, annotation.end.candleIndex)}`;
  }
}

function toolStatus(draft: AnalysisDraft): string {
  if (draft.pendingDrawing?.kind === 'trendline') return 'סמנו עוגן שני להשלמת קו המגמה.';
  if (draft.pendingDrawing?.kind === 'zone') return 'סמנו פינה נגדית להשלמת האזור.';
  switch (draft.activeTool.kind) {
    case 'inspect':
      return 'הקישו על נר כדי לבדוק את נתוני המחיר והמחזור שלו.';
    case 'point':
      return 'הקישו כדי להצמיד נקודה לנר הגלוי הקרוב.';
    case 'horizontal-level':
      return 'הקישו במחיר הרצוי כדי להוסיף רמה אופקית.';
    case 'trendline':
      return 'סמנו שני עוגנים לפי סדר הופעתם על הגרף.';
    case 'zone':
      return 'סמנו שתי פינות מנוגדות של האזור.';
    case 'select':
      return 'בחרו סימון מהרשימה כדי להדגיש או למחוק אותו.';
  }
}

function findCandle(chart: GeneratedChart, index: number | undefined): OhlcvCandle | undefined {
  return index === undefined ? undefined : chart.candles.find((candle) => candle.index === index);
}

function annotationsKey(annotations: readonly LearnerChartAnnotation[]): string {
  return JSON.stringify(annotations);
}

export function GuidedAnalysisChart({
  session,
  onAnnotationsChange,
  onReplayCursorChange,
  onCheckpointRequested,
  availableWidth,
  disabled = false,
  testID = 'guided-analysis-chart-notebook',
}: GuidedAnalysisChartProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const chart = useMemo(() => canonicalChart(), []);
  const sourceAnnotationsKey = annotationsKey(session.annotations);
  const [localDraft, setLocalDraft] = useState<LocalDraftState>(() => ({
    sessionId: session.sessionId,
    sourceAnnotationsKey,
    draft: createAnalysisDraft({ kind: 'inspect' }, session.annotations),
  }));
  const draft =
    localDraft.sessionId === session.sessionId &&
    localDraft.sourceAnnotationsKey === sourceAnnotationsKey
      ? localDraft.draft
      : createAnalysisDraft(localDraft.draft.activeTool, session.annotations);
  const [selectedCandleIndex, setSelectedCandleIndex] = useState<number>();
  const [crosshair, setCrosshair] = useState<ChartAnchor>();
  const [showPreciseInput, setShowPreciseInput] = useState(false);
  const [candleInput, setCandleInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const annotationSequence = useRef(0);

  const cursor = Math.min(session.replay.cursorCandleIndex, session.replay.decisionCandleIndex);
  const readOnly = disabled || session.status !== 'active';
  const visibleAnnotations = useMemo(
    () => learnerAnnotationsVisibleAt(draft.annotations, cursor),
    [cursor, draft.annotations],
  );
  const visibleChart = useMemo<GeneratedChart>(
    () => ({
      spec: { ...chart.spec, decisionCandleIndex: cursor },
      candles: chart.candles.filter(({ index }) => index <= cursor),
      // chartPresentation="hidden" is preserved: no semantic/reference geometry enters the view.
      annotations: [],
    }),
    [chart, cursor],
  );
  const selectedCandle = findCandle(visibleChart, selectedCandleIndex);
  const priceFrame = useMemo(
    () =>
      visibleChart.candles.reduce(
        (frame, candle) => ({
          low: Math.min(frame.low, candle.low),
          high: Math.max(frame.high, candle.high),
        }),
        { low: Number.POSITIVE_INFINITY, high: Number.NEGATIVE_INFINITY },
      ),
    [visibleChart.candles],
  );
  const preciseCandle = Number(candleInput);
  const precisePrice = Number(priceInput.trim().replace(',', '.'));
  const preciseCandleValid =
    Number.isInteger(preciseCandle) && preciseCandle >= 0 && preciseCandle <= cursor;
  const precisePriceValid =
    Number.isFinite(precisePrice) &&
    precisePrice >= priceFrame.low &&
    precisePrice <= priceFrame.high;
  const compact = availableWidth !== undefined && availableWidth < 420;

  const nextAnnotationId = () => {
    annotationSequence.current += 1;
    return `${session.sessionId}-note-${Date.now()}-${annotationSequence.current}`;
  };

  const updateDraft = (action: AnalysisDraftAction) => {
    const next = reduceAnalysisDraft(draft, action);
    setLocalDraft({ sessionId: session.sessionId, sourceAnnotationsKey, draft: next });
    if (next.annotations !== draft.annotations) onAnnotationsChange(next.annotations);
    setConfirmClear(false);
  };

  const placeAnchor = (anchor: ChartAnchor) => {
    if (readOnly) return;
    setSelectedCandleIndex(anchor.candleIndex);
    setCrosshair(anchor);
    if (draft.activeTool.kind === 'inspect' || draft.activeTool.kind === 'select') return;
    updateDraft({ type: 'place-anchor', id: nextAnnotationId(), anchor });
  };

  const moveReplayTo = (requestedCursor: number) => {
    if (readOnly) return;
    const bounded = Math.max(0, Math.min(session.replay.decisionCandleIndex, requestedCursor));
    if (bounded !== cursor) onReplayCursorChange(bounded);
    setSelectedCandleIndex(undefined);
    setCrosshair(undefined);
  };

  const identityMatches =
    session.exerciseId === GUIDED_ANALYSIS_EXERCISE_ID &&
    session.chart.id === chart.spec.id &&
    session.chart.seed === chart.spec.seed &&
    session.chart.generatorVersion === chart.spec.generatorVersion &&
    session.chart.candleCount === chart.candles.length &&
    session.chart.decisionCandleIndex === chart.spec.decisionCandleIndex;

  if (!identityMatches) {
    return (
      <Card testID={`${testID}-incompatible`} variant="outlined">
        <Heading level={3}>המחברת אינה זמינה</Heading>
        <UiText color="textMuted">
          נתוני הגרף השמורים אינם תואמים לגרסה שנבדקה. אפשר לחזור למסך הניתוח ולפתוח תהליך חדש.
        </UiText>
      </Card>
    );
  }

  return (
    <View style={{ gap: theme.spacing.md, width: '100%' }} testID={testID}>
      <Card variant="subtle">
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Badge tone="neutral">מחברת גרף — לא מדורגת</Badge>
            <Badge tone={readOnly ? 'neutral' : 'teal'}>
              {readOnly ? 'קריאה בלבד' : CAPSTONE_STEP_LABELS[session.currentStepId]}
            </Badge>
          </View>
          <UiText color="textMuted" variant="bodySmall">
            זהו משטח הקשר וטיוטה בלבד. הסימונים כאן אינם ראיות לתשובה, אינם חושפים תשובת ייחוס ואינם
            משפיעים על דירוג אף אחד מ־11 שלבי הניתוח.
          </UiText>
        </View>
      </Card>

      <Card padding="sm" variant="outlined">
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {toolChoices.map((choice) => {
              const active = draft.activeTool.kind === choice.tool.kind;
              return (
                <Pressable
                  accessibilityLabel={`כלי מחברת ${choice.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: readOnly, selected: active }}
                  disabled={readOnly}
                  key={choice.tool.kind}
                  onPress={() => updateDraft({ type: 'set-tool', tool: choice.tool })}
                  style={{
                    alignItems: 'center',
                    backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                    borderRadius: theme.radii.md,
                    borderWidth: active ? 2 : 1,
                    justifyContent: 'center',
                    minHeight: 48,
                    paddingHorizontal: 12,
                  }}
                  testID={`${testID}-tool-${choice.tool.kind}`}
                >
                  <UiText color={active ? 'primary' : 'text'} variant="label">
                    {choice.label}
                  </UiText>
                </Pressable>
              );
            })}
          </View>
          <UiText accessibilityLiveRegion="polite" color="textMuted" variant="bodySmall">
            {readOnly ? 'המחברת נשמרה והיא מוצגת לקריאה בלבד.' : toolStatus(draft)}
          </UiText>
        </View>
      </Card>

      <View style={{ direction: 'ltr', width: '100%' }} testID={`${testID}-ltr-surface`}>
        <OhlcvChart
          accessibilityLabel="גרף מחברת הניתוח, כרונולוגיה משמאל לימין, ללא סימוני ייחוס"
          chart={visibleChart}
          crosshairAnchor={crosshair}
          interactionHint={toolStatus(draft)}
          interactive={!readOnly && draft.activeTool.kind !== 'select'}
          learnerAnnotations={visibleAnnotations}
          onChartPress={placeAnchor}
          selectedAnnotationId={draft.selectedAnnotationId}
          selectedCandleIndex={selectedCandleIndex}
          selectedPoints={draft.pendingDrawing ? [draft.pendingDrawing.start] : []}
          showAnnotations={false}
          testID={`${testID}-plot`}
          ticker="CPTH"
        />
      </View>

      {selectedCandle ? (
        <Card padding="sm" testID={`${testID}-candle-details`} variant="accent">
          <View style={{ gap: 5 }}>
            <UiText variant="label">נתוני הנר שנבחר</UiText>
            <LtrText color="textMuted" variant="numeric">
              {`#${selectedCandle.index} | ${selectedCandle.timestamp} | O ${selectedCandle.open.toFixed(2)} H ${selectedCandle.high.toFixed(2)} L ${selectedCandle.low.toFixed(2)} C ${selectedCandle.close.toFixed(2)} V ${Math.round(selectedCandle.volume)}`}
            </LtrText>
          </View>
        </Card>
      ) : undefined}

      <Card padding="sm" variant="subtle">
        <View style={{ gap: theme.spacing.sm }}>
          <UiText variant="label">ניווט נגיש וקלט מדויק</UiText>
          <UiText color="textMuted" variant="caption">
            ציר הזמן ונתוני OHLCV מוצגים משמאל לימין. אין ניגון אוטומטי.
            {reducedMotion ? ' מצב תנועה מופחת פעיל; המעבר בין נקודות החשיפה מיידי.' : ''}
          </UiText>
          <Button
            disabled={readOnly}
            onPress={() => setShowPreciseInput((visible) => !visible)}
            size="compact"
            variant="secondary"
          >
            {showPreciseInput ? 'הסתרת קלט מדויק' : 'סימון מדויק לפי נר ומחיר'}
          </Button>
          {showPreciseInput ? (
            <View style={{ gap: 8 }}>
              <LtrText color="textMuted" variant="caption">
                {`#0–#${cursor} | ${priceFrame.low.toFixed(2)}–${priceFrame.high.toFixed(2)}`}
              </LtrText>
              <View
                style={{
                  alignItems: compact ? 'stretch' : 'center',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <TextInput
                  accessibilityLabel="מספר הנר במחברת"
                  editable={!readOnly}
                  keyboardType="number-pad"
                  onChangeText={setCandleInput}
                  placeholder="נר"
                  placeholderTextColor={theme.colors.textMuted}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      preciseCandleValid || !candleInput
                        ? theme.colors.border
                        : theme.colors.danger,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    color: theme.colors.text,
                    direction: 'ltr',
                    minHeight: 48,
                    minWidth: 112,
                    paddingHorizontal: 12,
                    textAlign: 'left',
                    writingDirection: 'ltr',
                  }}
                  value={candleInput}
                />
                <TextInput
                  accessibilityLabel="מחיר במחברת"
                  editable={!readOnly}
                  keyboardType="decimal-pad"
                  onChangeText={setPriceInput}
                  placeholder="מחיר"
                  placeholderTextColor={theme.colors.textMuted}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      precisePriceValid || !priceInput ? theme.colors.border : theme.colors.danger,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    color: theme.colors.text,
                    direction: 'ltr',
                    minHeight: 48,
                    minWidth: 132,
                    paddingHorizontal: 12,
                    textAlign: 'left',
                    writingDirection: 'ltr',
                  }}
                  value={priceInput}
                />
                <Button
                  accessibilityLabel="החלת הנר והמחיר במחברת"
                  disabled={readOnly || !preciseCandleValid || !precisePriceValid}
                  onPress={() => placeAnchor({ candleIndex: preciseCandle, price: precisePrice })}
                  size="compact"
                >
                  החלה
                </Button>
              </View>
            </View>
          ) : undefined}
        </View>
      </Card>

      <Card padding="sm" variant="outlined">
        <View style={{ gap: theme.spacing.sm }}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'space-between',
            }}
          >
            <UiText variant="label">חשיפת נרות עד נקודת ההחלטה</UiText>
            <LtrText color="primary" variant="numeric">
              {`${cursor + 1}/${session.replay.decisionCandleIndex + 1}`}
            </LtrText>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              disabled={
                readOnly ||
                cursor ===
                  Math.min(INITIAL_VISIBLE_CANDLE_COUNT - 1, session.replay.decisionCandleIndex)
              }
              onPress={() =>
                moveReplayTo(
                  Math.min(INITIAL_VISIBLE_CANDLE_COUNT - 1, session.replay.decisionCandleIndex),
                )
              }
              size="compact"
              variant="ghost"
            >
              איפוס
            </Button>
            <Button
              disabled={readOnly || cursor >= session.replay.decisionCandleIndex}
              onPress={() => moveReplayTo(cursor + 1)}
              size="compact"
              variant="secondary"
            >
              הנר הבא
            </Button>
            <Button
              disabled={readOnly || cursor >= session.replay.decisionCandleIndex}
              onPress={() => moveReplayTo(cursor + FIXED_REPLAY_GROUP_SIZE)}
              size="compact"
              variant="secondary"
            >
              {`עוד ${FIXED_REPLAY_GROUP_SIZE} נרות`}
            </Button>
            <Button
              disabled={readOnly || cursor >= session.replay.decisionCandleIndex}
              onPress={() => moveReplayTo(session.replay.decisionCandleIndex)}
              size="compact"
              variant="ghost"
            >
              לנקודת ההחלטה
            </Button>
            {onCheckpointRequested ? (
              <Button
                disabled={readOnly}
                onPress={() => onCheckpointRequested(cursor)}
                size="compact"
                variant="ghost"
              >
                שמירת נקודת ביקורת
              </Button>
            ) : undefined}
          </View>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          disabled={readOnly || draft.undoStack.length === 0}
          onPress={() => updateDraft({ type: 'undo' })}
          size="compact"
          variant="ghost"
        >
          ביטול סימון
        </Button>
        <Button
          disabled={readOnly || draft.redoStack.length === 0}
          onPress={() => updateDraft({ type: 'redo' })}
          size="compact"
          variant="ghost"
        >
          ביצוע סימון מחדש
        </Button>
        <Button
          disabled={readOnly || draft.annotations.length === 0}
          onPress={() => setConfirmClear(true)}
          size="compact"
          variant="danger"
        >
          ניקוי המחברת
        </Button>
      </View>

      {confirmClear ? (
        <Card accessibilityLabel="אישור ניקוי מחברת הגרף" variant="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <UiText>למחוק את כל סימוני המחברת? הפעולה תישמר בסשן.</UiText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button onPress={() => setConfirmClear(false)} size="compact" variant="ghost">
                השארת הסימונים
              </Button>
              <Button
                onPress={() => updateDraft({ type: 'clear' })}
                size="compact"
                variant="danger"
              >
                מחיקת הכול
              </Button>
            </View>
          </View>
        </Card>
      ) : undefined}

      {visibleAnnotations.length ? (
        <Card padding="sm" variant="outlined">
          <View style={{ gap: 8 }}>
            <UiText variant="label">סימוני מחברת גלויים</UiText>
            {visibleAnnotations.map((annotation) => (
              <View
                key={annotation.id}
                style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
              >
                <Pressable
                  accessibilityLabel={`בחירת ${annotationLabel(annotation)}`}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: readOnly,
                    selected: draft.selectedAnnotationId === annotation.id,
                  }}
                  disabled={readOnly}
                  onPress={() => updateDraft({ type: 'select-annotation', id: annotation.id })}
                  style={{
                    backgroundColor:
                      draft.selectedAnnotationId === annotation.id
                        ? theme.colors.primarySoft
                        : theme.colors.surface,
                    borderColor:
                      draft.selectedAnnotationId === annotation.id
                        ? theme.colors.primary
                        : theme.colors.border,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    flexGrow: 1,
                    minHeight: 48,
                    minWidth: compact ? '100%' : 220,
                    padding: 10,
                  }}
                >
                  <UiText variant="caption">{annotationLabel(annotation)}</UiText>
                </Pressable>
                <Button
                  accessibilityLabel={`מחיקת ${annotationLabel(annotation)}`}
                  disabled={readOnly}
                  onPress={() => updateDraft({ type: 'delete-annotation', id: annotation.id })}
                  size="compact"
                  variant="danger"
                >
                  מחיקה
                </Button>
              </View>
            ))}
          </View>
        </Card>
      ) : undefined}
    </View>
  );
}
