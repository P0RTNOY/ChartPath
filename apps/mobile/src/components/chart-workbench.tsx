import { useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import {
  createChartViewport,
  createReplayState,
  generateChart,
  learnerAnnotationsVisibleAt,
  panChartViewport,
  projectVisibleCandles,
  reduceReplayState,
  replayChartSlice,
  zoomChartViewport,
  type ChartViewport,
  type ReplayAction,
} from '@chartpath/chart-engine';
import { exercises, type ContentExercise } from '@chartpath/content';
import {
  createAnalysisDraft,
  gradeAnswer,
  reduceAnalysisDraft,
  type AnalysisDraft,
  type AnalysisDraftAction,
  type AttemptResult,
  type ChartAnchor,
  type ChartSpec,
  type ChartTool,
  type GeneratedChart,
  type LearnerChartAnnotation,
  type LineRubric,
  type OhlcvCandle,
} from '@chartpath/domain';
import {
  Badge,
  Button,
  Card,
  Heading,
  LtrText,
  Screen,
  UiText,
  useReducedMotion,
  useTheme,
} from '@chartpath/ui';

import { TopBar } from './top-bar';
import { OhlcvChart } from './ohlcv-chart';

const LAB_EXERCISE_ID = 'u03-levels-e04';
const INITIAL_VISIBLE_CANDLES = 24;
const REPLAY_GROUP_SIZE = 4;
const MIN_VISIBLE_CANDLES = 12;

const toolChoices: readonly { readonly tool: ChartTool; readonly label: string }[] = [
  { tool: { kind: 'inspect' }, label: 'בדיקה' },
  { tool: { kind: 'point' }, label: 'נקודה' },
  { tool: { kind: 'horizontal-level' }, label: 'רמה אופקית' },
  { tool: { kind: 'trendline' }, label: 'קו מגמה' },
  { tool: { kind: 'zone' }, label: 'אזור' },
  { tool: { kind: 'select' }, label: 'בחירה ומחיקה' },
];

function toolLabel(tool: ChartTool): string {
  return toolChoices.find((choice) => choice.tool.kind === tool.kind)?.label ?? tool.kind;
}

function annotationLabel(annotation: LearnerChartAnnotation): string {
  switch (annotation.kind) {
    case 'point':
      return `נקודה בנר ${annotation.anchor.candleIndex}, מחיר ${annotation.anchor.price.toFixed(2)}`;
    case 'horizontal-level':
      return `רמה אופקית במחיר ${annotation.price.toFixed(2)}`;
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
      return 'הקישו על נר כדי להציג את ערכי הפתיחה, השיא, השפל, הסגירה והמחזור.';
    case 'point':
      return 'הקישו כדי להצמיד נקודה לנר הגלוי הקרוב.';
    case 'horizontal-level':
      return 'הקישו במחיר הרצוי כדי ליצור רמה אופקית.';
    case 'trendline':
      return 'סמנו שני עוגנים לפי סדר הופעתם על הגרף.';
    case 'zone':
      return 'סמנו שתי פינות מנוגדות של אזור.';
    case 'select':
      return 'בחרו סימון מהרשימה כדי להדגיש או למחוק אותו.';
  }
}

function selectedCandle(chart: GeneratedChart, index: number | undefined): OhlcvCandle | undefined {
  return index === undefined ? undefined : chart.candles.find((candle) => candle.index === index);
}

function latestTrendline(
  annotations: readonly LearnerChartAnnotation[],
): Extract<LearnerChartAnnotation, { kind: 'trendline' }> | undefined {
  return [...annotations].reverse().find((annotation) => annotation.kind === 'trendline') as
    Extract<LearnerChartAnnotation, { kind: 'trendline' }> | undefined;
}

type LabExercise = ContentExercise & { readonly chartSpec: ChartSpec; readonly rubric: LineRubric };

function authoredExercise(): LabExercise {
  const exercise = exercises.find((candidate) => candidate.id === LAB_EXERCISE_ID);
  if (!exercise || !exercise.chartSpec || exercise.rubric.kind !== 'line') {
    throw new Error('The reviewed Chart Lab exercise is unavailable');
  }
  return exercise as LabExercise;
}

export function ChartWorkbench({ availableWidth }: { readonly availableWidth?: number } = {}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const exercise = useMemo(() => authoredExercise(), []);
  const rubric = exercise.rubric;
  const chart = useMemo(() => generateChart(exercise.chartSpec), [exercise.chartSpec]);
  const decisionCandleIndex = rubric.decisionCandleIndex ?? chart.candles.length - 1;
  const initialEndIndex = Math.min(INITIAL_VISIBLE_CANDLES - 1, decisionCandleIndex);
  const initialBounds = useMemo(
    () =>
      projectVisibleCandles(chart.candles, {
        cutoffCandleIndex: initialEndIndex,
        minVisibleCandles: MIN_VISIBLE_CANDLES,
      }).bounds,
    [chart.candles, initialEndIndex],
  );
  if (!initialBounds) throw new Error('The Chart Lab exercise has no visible candles');
  const [draft, setDraft] = useState<AnalysisDraft>(() => createAnalysisDraft({ kind: 'inspect' }));
  const [replay, setReplay] = useState(() =>
    createReplayState(chart, {
      decisionCandleIndex,
      fixedGroupSize: REPLAY_GROUP_SIZE,
      initialVisibleCandleCount: Math.min(INITIAL_VISIBLE_CANDLES, decisionCandleIndex + 1),
    }),
  );
  const initialViewport = useMemo(
    () =>
      createChartViewport(initialBounds, {
        startIndex: initialBounds.minIndex,
        endIndex: initialEndIndex,
      }),
    [initialBounds, initialEndIndex],
  );
  const [viewport, setViewport] = useState<ChartViewport>(initialViewport);
  const [selectedCandleIndex, setSelectedCandleIndex] = useState<number>();
  const [crosshair, setCrosshair] = useState<ChartAnchor>();
  const [candleInput, setCandleInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [showPreciseInput, setShowPreciseInput] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [result, setResult] = useState<AttemptResult>();
  const annotationSequence = useRef(0);

  const replayWithDrawings = useMemo(
    () => reduceReplayState(replay, { type: 'set-drawings', annotations: draft.annotations }),
    [draft.annotations, replay],
  );
  const safeSlice = useMemo(
    () => replayChartSlice(chart, replayWithDrawings),
    [chart, replayWithDrawings],
  );
  const currentBounds = projectVisibleCandles(chart.candles, {
    cutoffCandleIndex: replay.visibleCandleIndex,
    minVisibleCandles: MIN_VISIBLE_CANDLES,
  }).bounds;
  if (!currentBounds) throw new Error('Replay has no visible candles');
  const viewportBounds = projectVisibleCandles(chart.candles, {
    cutoffCandleIndex: replay.visibleCandleIndex,
    startCandleIndex: viewport.startIndex,
    endCandleIndex: viewport.endIndex,
    minVisibleCandles: MIN_VISIBLE_CANDLES,
  }).bounds;
  const displayViewport: ChartViewport = viewportBounds
    ? {
        ...viewport,
        minPrice: viewportBounds.minPrice,
        maxPrice: viewportBounds.maxPrice,
      }
    : viewport;
  const visibleAnnotations = learnerAnnotationsVisibleAt(
    draft.annotations,
    replay.visibleCandleIndex,
  );
  const visibleAnnotationIds = new Set(visibleAnnotations.map(({ id }) => id));
  const visiblePendingDrawing =
    draft.pendingDrawing && draft.pendingDrawing.start.candleIndex <= replay.visibleCandleIndex
      ? draft.pendingDrawing
      : undefined;
  const visibleSelectedAnnotationId =
    draft.selectedAnnotationId && visibleAnnotationIds.has(draft.selectedAnnotationId)
      ? draft.selectedAnnotationId
      : undefined;
  const selected = selectedCandle({ ...chart, candles: safeSlice.candles }, selectedCandleIndex);
  const gradedTrendline = latestTrendline(visibleAnnotations);
  const atDecision = replay.visibleCandleIndex === replay.decisionCandleIndex;
  const drawingReady = gradedTrendline !== undefined && visiblePendingDrawing === undefined;
  const preciseCandle = Number(candleInput);
  const precisePrice = Number(priceInput.trim().replace(',', '.'));
  const preciseCandleValid =
    Number.isInteger(preciseCandle) &&
    preciseCandle >= displayViewport.startIndex &&
    preciseCandle <= displayViewport.endIndex;
  const precisePriceValid =
    Number.isFinite(precisePrice) &&
    precisePrice >= displayViewport.minPrice &&
    precisePrice <= displayViewport.maxPrice;
  const wide = (availableWidth ?? windowWidth) >= 900;

  const updateDraft = (action: AnalysisDraftAction) => {
    setDraft((current) => reduceAnalysisDraft(current, action));
    setResult(undefined);
    setConfirmClear(false);
  };

  const nextAnnotationId = () => {
    annotationSequence.current += 1;
    return `learner-${annotationSequence.current}`;
  };

  const placeAnchor = (anchor: ChartAnchor) => {
    setSelectedCandleIndex(anchor.candleIndex);
    setCrosshair(anchor);
    if (draft.activeTool.kind === 'inspect' || draft.activeTool.kind === 'select') return;
    const requestedId = nextAnnotationId();
    setDraft((current) => {
      const committedId = current.pendingDrawing?.id ?? requestedId;
      const next = reduceAnalysisDraft(current, {
        type: 'place-anchor',
        id: requestedId,
        anchor,
      });
      return {
        ...next,
        annotations: next.annotations.map((annotation) =>
          annotation.id === committedId && annotation.authoredAtCursorCandleIndex === undefined
            ? { ...annotation, authoredAtCursorCandleIndex: replay.visibleCandleIndex }
            : annotation,
        ),
      };
    });
    setResult(undefined);
    setConfirmClear(false);
  };

  const changeReplay = (action: ReplayAction) => {
    const next = reduceReplayState(replayWithDrawings, action);
    setReplay(next);
    setResult(undefined);
    setConfirmClear(false);
    setSelectedCandleIndex(undefined);
    setCrosshair(undefined);
    setDraft((current) => {
      const withoutPending =
        current.pendingDrawing && current.pendingDrawing.start.candleIndex > next.visibleCandleIndex
          ? reduceAnalysisDraft(current, { type: 'cancel-drawing' })
          : current;
      const selectedStillVisible = learnerAnnotationsVisibleAt(
        withoutPending.annotations,
        next.visibleCandleIndex,
      ).some(({ id }) => id === withoutPending.selectedAnnotationId);
      const projectedDraft =
        !selectedStillVisible && withoutPending.selectedAnnotationId
          ? reduceAnalysisDraft(withoutPending, { type: 'select-annotation', id: undefined })
          : withoutPending;
      return { ...projectedDraft, undoStack: [], redoStack: [] };
    });
    const nextBounds = projectVisibleCandles(chart.candles, {
      cutoffCandleIndex: next.visibleCandleIndex,
      minVisibleCandles: MIN_VISIBLE_CANDLES,
    }).bounds;
    if (!nextBounds) return;
    if (action.type === 'reset') {
      setViewport(initialViewport);
      return;
    }
    const advance = next.visibleCandleIndex - replay.visibleCandleIndex;
    setViewport((current) => {
      const bounded = createChartViewport(nextBounds, current);
      return advance > 0
        ? panChartViewport(
            bounded,
            Math.min(advance, nextBounds.maxIndex - bounded.endIndex),
            nextBounds,
          )
        : bounded;
    });
  };

  const zoom = (factor: number) => {
    setViewport((current) =>
      zoomChartViewport(
        current,
        factor,
        selectedCandleIndex ?? (current.startIndex + current.endIndex) / 2,
        currentBounds,
      ),
    );
  };

  const pan = (delta: number) => {
    setViewport((current) => panChartViewport(current, delta, currentBounds));
  };

  const nativeGesture = useMemo(
    () =>
      Gesture.Simultaneous(
        Gesture.Pinch()
          .runOnJS(true)
          .onEnd((event) => zoom(event.scale)),
        Gesture.Pan()
          .activeOffsetX([-12, 12])
          .runOnJS(true)
          .onEnd((event) => pan(Math.round(-event.translationX / 28))),
      ),
    // The gesture is rebuilt when the viewport changes so its JS callbacks use current bounds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentBounds.maxIndex, selectedCandleIndex],
  );

  const submit = () => {
    if (!drawingReady || !gradedTrendline || !atDecision) return;
    const graded = gradeAnswer(
      rubric,
      { kind: 'line', line: { start: gradedTrendline.start, end: gradedTrendline.end } },
      { candles: chart.candles, decisionCandleIndex: replay.visibleCandleIndex },
    );
    setDraft((current) =>
      reduceAnalysisDraft(current, {
        type: 'select-annotation',
        id: gradedTrendline.id,
      }),
    );
    setResult(graded);
  };

  const chartSurface = (
    <View style={{ gap: theme.spacing.md }}>
      <Card padding="sm" variant="outlined">
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {toolChoices.map((choice) => {
              const active = draft.activeTool.kind === choice.tool.kind;
              return (
                <Pressable
                  accessibilityLabel={`כלי ${choice.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
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
                  testID={`chart-tool-${choice.tool.kind}`}
                >
                  <UiText color={active ? 'primary' : 'text'} variant="label">
                    {choice.label}
                  </UiText>
                </Pressable>
              );
            })}
          </View>
          <UiText accessibilityLiveRegion="polite" color="textMuted" variant="bodySmall">
            {toolStatus(draft)}
          </UiText>
        </View>
      </Card>

      <GestureDetector gesture={nativeGesture}>
        <View>
          <OhlcvChart
            accessibilityLabel="גרף מעבדת הניתוח, כרונולוגיה משמאל לימין"
            chart={chart}
            crosshairAnchor={crosshair}
            cutoffCandleIndex={replay.visibleCandleIndex}
            expectedLine={atDecision && result ? rubric.target : undefined}
            interactionHint={toolStatus(draft)}
            interactive={draft.activeTool.kind !== 'select'}
            learnerAnnotations={visibleAnnotations}
            onChartPress={placeAnchor}
            selectedAnnotationId={visibleSelectedAnnotationId}
            selectedCandleIndex={selectedCandleIndex}
            selectedPoints={visiblePendingDrawing ? [visiblePendingDrawing.start] : []}
            showAnnotations={false}
            testID="workbench-chart"
            ticker="CPTH"
            viewport={displayViewport}
          />
        </View>
      </GestureDetector>

      {selected ? (
        <Card padding="sm" testID="selected-candle-details" variant="accent">
          <View style={{ gap: 5 }}>
            <UiText variant="label">פרטי הנר שנבחר</UiText>
            <LtrText color="textMuted" variant="numeric">
              {`#${selected.index} | ${selected.timestamp} | O ${selected.open.toFixed(2)} H ${selected.high.toFixed(2)} L ${selected.low.toFixed(2)} C ${selected.close.toFixed(2)} V ${Math.round(selected.volume)}`}
            </LtrText>
          </View>
        </Card>
      ) : undefined}

      <Card padding="sm" variant="subtle">
        <View style={{ gap: theme.spacing.sm }}>
          <UiText variant="label">ניווט נגיש בגרף</UiText>
          <UiText color="textMuted" variant="caption">
            אפשר לצבוט ולהחליק אופקית במכשיר נתמך, או להשתמש בכפתורים ובקלט המדויק.
            {reducedMotion ? ' מצב תנועה מופחת פעיל; אין ניגון אוטומטי.' : ''}
          </UiText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              accessibilityLabel="הזזת הגרף לנרות מוקדמים"
              onPress={() => pan(-4)}
              size="compact"
              variant="ghost"
            >
              מוקדם
            </Button>
            <Button
              accessibilityLabel="הזזת הגרף לנרות מאוחרים"
              onPress={() => pan(4)}
              size="compact"
              variant="ghost"
            >
              מאוחר
            </Button>
            <Button
              accessibilityLabel="הגדלת הגרף"
              onPress={() => zoom(1.35)}
              size="compact"
              variant="ghost"
            >
              הגדלה +
            </Button>
            <Button
              accessibilityLabel="הקטנת הגרף"
              onPress={() => zoom(0.75)}
              size="compact"
              variant="ghost"
            >
              הקטנה −
            </Button>
            <LtrText color="textMuted" variant="caption">
              {`${displayViewport.startIndex}–${displayViewport.endIndex}`}
            </LtrText>
          </View>
          <Button
            onPress={() => setShowPreciseInput((visible) => !visible)}
            size="compact"
            variant="secondary"
          >
            {showPreciseInput ? 'הסתרת קלט מדויק' : 'סימון מדויק לפי נר ומחיר'}
          </Button>
          {showPreciseInput ? (
            <View style={{ gap: 8 }}>
              <UiText color="textMuted" variant="caption">
                טווח החלון הגלוי:{' '}
                <LtrText color="textMuted" variant="caption">
                  {`#${displayViewport.startIndex}–#${displayViewport.endIndex} | ${displayViewport.minPrice.toFixed(2)}–${displayViewport.maxPrice.toFixed(2)}`}
                </LtrText>
              </UiText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TextInput
                  accessibilityLabel="מספר הנר במעבדה"
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
                  accessibilityLabel="מחיר במעבדה"
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
                  accessibilityLabel="החלת הנר והמחיר"
                  disabled={!preciseCandleValid || !precisePriceValid}
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

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          disabled={draft.undoStack.length === 0}
          onPress={() => updateDraft({ type: 'undo' })}
          size="compact"
          variant="ghost"
        >
          ביטול
        </Button>
        <Button
          disabled={draft.redoStack.length === 0}
          onPress={() => updateDraft({ type: 'redo' })}
          size="compact"
          variant="ghost"
        >
          ביצוע חוזר
        </Button>
        <Button
          disabled={visibleAnnotations.length === 0 && !visiblePendingDrawing}
          onPress={() => setConfirmClear(true)}
          size="compact"
          variant="danger"
        >
          ניקוי השרטוט
        </Button>
      </View>
      {confirmClear ? (
        <Card accessibilityLabel="אישור ניקוי השרטוט" variant="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <UiText>למחוק את כל סימוני הלומד בשרטוט הנוכחי?</UiText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button onPress={() => setConfirmClear(false)} size="compact" variant="ghost">
                ביטול
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
            <UiText variant="label">סימוני הלומד</UiText>
            {visibleAnnotations.map((annotation) => (
              <View
                key={annotation.id}
                style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}
              >
                <Pressable
                  accessibilityLabel={`בחירת ${annotationLabel(annotation)}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: visibleSelectedAnnotationId === annotation.id }}
                  onPress={() => updateDraft({ type: 'select-annotation', id: annotation.id })}
                  style={{
                    backgroundColor:
                      visibleSelectedAnnotationId === annotation.id
                        ? theme.colors.primarySoft
                        : theme.colors.surface,
                    borderColor:
                      visibleSelectedAnnotationId === annotation.id
                        ? theme.colors.primary
                        : theme.colors.border,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    flex: 1,
                    minHeight: 48,
                    padding: 10,
                  }}
                >
                  <UiText variant="caption">{annotationLabel(annotation)}</UiText>
                </Pressable>
                <Button
                  accessibilityLabel={`מחיקת ${annotationLabel(annotation)}`}
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

  const guidedPanel = (
    <View style={{ gap: theme.spacing.md }} testID="guided-analysis-panel">
      <Card variant="accent">
        <View style={{ gap: theme.spacing.sm }}>
          <Badge tone="teal">שלב 3 מתוך 11 — רמה</Badge>
          <Heading level={2}>משימת הניתוח</Heading>
          <UiText>{exercise.promptHe}</UiText>
          <UiText color="textMuted" variant="bodySmall">
            שלב המבנה מספק את נקודות המפנה; בשלב הרמה מחברים עוגנים מותרים בלי להתאים את הקו בדיעבד.
          </UiText>
          <UiText color="textMuted" variant="caption">
            {exercise.safetyNoteHe}
          </UiText>
        </View>
      </Card>

      <Card variant="outlined">
        <View style={{ gap: theme.spacing.sm }}>
          <View
            style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <UiText variant="label">מצב החשיפה</UiText>
            <LtrText color="primary" variant="numeric">
              {`${replay.visibleCandleIndex + 1}/${replay.decisionCandleIndex + 1}`}
            </LtrText>
          </View>
          <UiText color="textMuted" variant="caption">
            מוצגים רק נרות ונתונים שהיו זמינים עד המיקום הנוכחי. תשובת הייחוס מוסתרת עד ההגשה.
          </UiText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button onPress={() => changeReplay({ type: 'reset' })} size="compact" variant="ghost">
              איפוס
            </Button>
            <Button
              disabled={atDecision}
              onPress={() => changeReplay({ type: 'next' })}
              size="compact"
              variant="secondary"
            >
              הנר הבא
            </Button>
            <Button
              disabled={atDecision}
              onPress={() => changeReplay({ type: 'fixed-group' })}
              size="compact"
              variant="secondary"
            >
              {`עוד ${REPLAY_GROUP_SIZE} נרות`}
            </Button>
            <Button
              disabled={atDecision}
              onPress={() => changeReplay({ type: 'to-decision' })}
              size="compact"
              variant="ghost"
            >
              לחלון ההחלטה
            </Button>
          </View>
        </View>
      </Card>

      <Card variant="outlined">
        <View style={{ gap: theme.spacing.sm }}>
          <UiText variant="label">התקדמות השרטוט</UiText>
          <UiText color="textMuted" variant="bodySmall">
            כלי נבחר: {toolLabel(draft.activeTool)} · סימונים שהושלמו:{' '}
            <LtrText color="textMuted" variant="numeric">
              {visibleAnnotations.length}
            </LtrText>
          </UiText>
          <UiText color={drawingReady ? 'primary' : 'warning'} variant="bodySmall">
            {drawingReady
              ? 'קו מגמה הושלם ומוכן להשוואה בחלון ההחלטה.'
              : 'כדי להגיש, בחרו בכלי קו מגמה וסמנו שני עוגנים.'}
          </UiText>
          {!atDecision ? (
            <UiText color="warning" variant="caption">
              ההגשה תיפתח רק בנר ההחלטה כדי שהדירוג לא ישתמש במידע עתידי.
            </UiText>
          ) : undefined}
          <Button disabled={!drawingReady || !atDecision} fullWidth onPress={submit}>
            השוואת הניתוח
          </Button>
        </View>
      </Card>

      <Card variant="subtle">
        <View style={{ gap: theme.spacing.sm }}>
          <UiText variant="label">רמזים קיימים מהתרגיל</UiText>
          {exercise.hints.slice(0, hintCount).map((hint) => (
            <UiText key={hint.id} color="textMuted" variant="bodySmall">
              {hint.textHe}
            </UiText>
          ))}
          <Button
            disabled={hintCount >= exercise.hints.length}
            onPress={() => setHintCount((count) => Math.min(exercise.hints.length, count + 1))}
            size="compact"
            variant="ghost"
          >
            {hintCount === 0 ? 'רמז ראשון' : 'רמז נוסף'}
          </Button>
        </View>
      </Card>

      {atDecision && result ? (
        <Card testID="workbench-feedback" variant={result.correct ? 'accent' : 'outlined'}>
          <View style={{ gap: theme.spacing.sm }}>
            <Badge tone={result.correct ? 'teal' : 'warning'}>
              {result.correct ? 'הסימון נמצא בתוך הסבילות' : 'כדאי להשוות לקו הייחוס'}
            </Badge>
            <Heading level={3}>{result.correct ? 'סימון מדויק' : 'הקו עדיין מחוץ לסבילות'}</Heading>
            <UiText>
              {result.correct
                ? exercise.explanationHe
                : (exercise.alternativeExplanations[0]?.explanationHe ?? exercise.explanationHe)}
            </UiText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <UiText color="primary" variant="caption">
                קו מלא — הסימון שלך
              </UiText>
              <UiText color="warning" variant="caption">
                קו מקווקו — תשובת הייחוס
              </UiText>
            </View>
            <UiText color="textMuted" variant="caption">
              הדירוג דטרמיניסטי לפי עוגנים בנר ובמחיר. תנועת התצוגה ושינוי קנה המידה אינם משנים
              אותו.
            </UiText>
          </View>
        </Card>
      ) : undefined}

      <Card variant="subtle">
        <UiText color="textMuted" variant="caption">
          מקור התרחיש: PDF עמ׳ 31 / עמ׳ 18 בספר, פרק 6 ואיור 6.1. התרשים סינתטי ונוצר מחדש; המעבדה
          מלמדת ניתוח ראיות ואינה המלצה לפעולה.
        </UiText>
      </Card>
    </View>
  );

  return (
    <Screen
      accessibilityLabel="מעבדת גרפים"
      contentContainerStyle={{ gap: theme.spacing.xl }}
      scroll
      testID="chart-lab-screen"
    >
      <TopBar back subtitle="תרחיש סינתטי · עבודה בראיות" title="מעבדת הגרפים" />
      <Card padding="sm" variant="subtle">
        <UiText color="textMuted" variant="bodySmall">
          הוראות הלמידה נמצאות בלוח המודרך. סרגל הכלים והניווט משנים רק את אופן העבודה על הגרף.
        </UiText>
      </Card>
      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: wide ? 'row' : 'column',
          gap: theme.spacing.lg,
        }}
        testID="workbench-responsive-layout"
      >
        <View style={{ flex: wide ? 2 : undefined, width: wide ? undefined : '100%' }}>
          {chartSurface}
        </View>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          {guidedPanel}
        </View>
      </View>
    </Screen>
  );
}
