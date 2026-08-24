import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import type {
  ChartAnchor,
  ChartAnnotation,
  ChartZone,
  GeneratedChart,
  LearnerChartAnnotation,
  OhlcvCandle,
} from '@chartpath/domain';
import {
  annotationsVisibleAt,
  learnerAnnotationsVisibleAt,
  projectVisibleCandles,
  type ChartViewport,
} from '@chartpath/chart-engine';
import { Button, Card, isolateLtrRunsInHebrew, LtrText, UiText, useTheme } from '@chartpath/ui';

const CHART_HEIGHT = 320;
const PLOT_TOP = 18;
const VOLUME_TOP = 254;
const PLOT_BOTTOM = 236;
const AXIS_LEFT = 14;
const AXIS_RIGHT = 54;

export interface OhlcvChartProps {
  readonly chart: GeneratedChart;
  readonly ticker?: string;
  readonly interactive?: boolean;
  readonly highlightedCandleIndices?: readonly number[];
  readonly selectedPoints?: readonly ChartAnchor[];
  readonly selectedZone?: ChartZone;
  readonly selectedLine?: { readonly start: ChartAnchor; readonly end: ChartAnchor };
  readonly expectedPoints?: readonly ChartAnchor[];
  readonly expectedZone?: ChartZone;
  readonly expectedLine?: { readonly start: ChartAnchor; readonly end: ChartAnchor };
  /** Inclusive candle boundary shared by data, scale, overlays, and accessibility. */
  readonly cutoffCandleIndex?: number;
  readonly revealCount?: number;
  readonly viewport?: ChartViewport;
  readonly learnerAnnotations?: readonly LearnerChartAnnotation[];
  readonly selectedAnnotationId?: string;
  readonly selectedCandleIndex?: number;
  readonly crosshairAnchor?: ChartAnchor;
  readonly showAnnotations?: boolean;
  readonly allowAccessibleDataTable?: boolean;
  readonly onChartPress?: (anchor: ChartAnchor) => void;
  readonly interactionHint?: string;
  readonly accessibilityLabel?: string;
  readonly presentationPolicy?: 'standard' | 'blind';
  readonly testID?: string;
}

function chartDescription(
  candles: readonly OhlcvCandle[],
  ticker: string,
  timeframe: string,
): string {
  if (candles.length === 0) return isolateLtrRunsInHebrew(`גרף ${ticker}, ללא נתונים`);
  const first = candles[0];
  const last = candles.at(-1);
  if (!first || !last) return isolateLtrRunsInHebrew(`גרף ${ticker}, ללא נתונים`);
  const direction =
    last.close > first.open
      ? 'הסגירה האחרונה גבוהה מהפתיחה הראשונה'
      : last.close < first.open
        ? 'הסגירה האחרונה נמוכה מהפתיחה הראשונה'
        : 'הסגירה האחרונה שווה לפתיחה הראשונה';
  const low = Math.min(...candles.map((candle) => candle.low));
  const high = Math.max(...candles.map((candle) => candle.high));
  return isolateLtrRunsInHebrew(
    `גרף נרות ${ticker}, מסגרת זמן ${timeframe}, ${candles.length} נרות, ${direction}, טווח מחיר ${low.toFixed(2)} עד ${high.toFixed(2)}`,
  );
}

function blindChartDescription(
  candles: readonly {
    readonly open: number;
    readonly close: number;
    readonly low: number;
    readonly high: number;
  }[],
): string {
  if (candles.length === 0) return 'תרשים נרות היסטורי מוסתר זהות, ללא נתונים';
  const first = candles[0];
  const last = candles.at(-1);
  if (!first || !last) return 'תרשים נרות היסטורי מוסתר זהות, ללא נתונים';
  const direction =
    last.close > first.open
      ? 'הסגירה האחרונה גבוהה מהפתיחה הראשונה'
      : last.close < first.open
        ? 'הסגירה האחרונה נמוכה מהפתיחה הראשונה'
        : 'הסגירה האחרונה שווה לפתיחה הראשונה';
  const low = Math.min(...candles.map((candle) => candle.low));
  const high = Math.max(...candles.map((candle) => candle.high));
  return isolateLtrRunsInHebrew(
    `תרשים נרות היסטורי מוסתר זהות, ${candles.length} נרות גלויים, ${direction}, טווח מחיר ${low.toFixed(2)} עד ${high.toFixed(2)}`,
  );
}

function anchorVisible(anchor: ChartAnchor, cutoffCandleIndex: number): boolean {
  return anchor.candleIndex <= cutoffCandleIndex;
}

function lineVisible(
  line: { readonly start: ChartAnchor; readonly end: ChartAnchor } | undefined,
  cutoffCandleIndex: number,
) {
  return line &&
    anchorVisible(line.start, cutoffCandleIndex) &&
    anchorVisible(line.end, cutoffCandleIndex)
    ? line
    : undefined;
}

function clipZone(zone: ChartZone | undefined, cutoffCandleIndex: number): ChartZone | undefined {
  if (!zone) return undefined;
  const start = Math.min(zone.startCandleIndex, zone.endCandleIndex);
  const end = Math.max(zone.startCandleIndex, zone.endCandleIndex);
  if (start > cutoffCandleIndex) return undefined;
  return {
    ...zone,
    startCandleIndex: start,
    endCandleIndex: Math.min(end, cutoffCandleIndex),
  };
}

function shortChartDate(timestamp: string | undefined): string {
  if (!timestamp) return '';
  const [yearMonthDay] = timestamp.split('T');
  const [, month, day] = yearMonthDay?.split('-') ?? [];
  return month && day ? `${day}/${month}` : timestamp;
}

export function OhlcvChart({
  chart,
  ticker = 'CPTH',
  interactive = false,
  highlightedCandleIndices = [],
  selectedPoints = [],
  selectedZone,
  selectedLine,
  expectedPoints = [],
  expectedZone,
  expectedLine,
  cutoffCandleIndex,
  revealCount,
  viewport,
  learnerAnnotations = [],
  selectedAnnotationId,
  selectedCandleIndex,
  crosshairAnchor,
  showAnnotations = false,
  allowAccessibleDataTable = true,
  onChartPress,
  interactionHint,
  accessibilityLabel,
  presentationPolicy = 'standard',
  testID = 'ohlcv-chart',
}: OhlcvChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(680);
  const [showAccessibleData, setShowAccessibleData] = useState(false);
  const [interactionStatus, setInteractionStatus] = useState<string | undefined>();
  const sourceLastCandleIndex = chart.candles.at(-1)?.index ?? -1;
  const revealCutoff =
    revealCount === undefined
      ? sourceLastCandleIndex
      : (chart.candles[Math.max(0, Math.min(chart.candles.length, revealCount)) - 1]?.index ?? -1);
  const cutoff = Math.min(cutoffCandleIndex ?? sourceLastCandleIndex, revealCutoff);
  const candleSequence = useMemo(
    () => new Map(chart.candles.map((candle, position) => [candle.index, position + 1])),
    [chart.candles],
  );
  const projection = useMemo(
    () =>
      projectVisibleCandles(chart.candles, {
        cutoffCandleIndex: cutoff,
        startCandleIndex: viewport?.startIndex,
        endCandleIndex: viewport?.endIndex,
      }),
    [chart.candles, cutoff, viewport?.endIndex, viewport?.startIndex],
  );
  const candles = projection.candles;
  const frame = projection.stats;
  const safeSemanticAnnotations =
    showAnnotations && cutoff >= 0 ? annotationsVisibleAt(chart.annotations, cutoff) : [];
  const safeLearnerAnnotations =
    cutoff >= 0 ? learnerAnnotationsVisibleAt(learnerAnnotations, cutoff) : [];
  const safeHighlightedCandleIndices = highlightedCandleIndices.filter((index) => index <= cutoff);
  const safeSelectedPoints = selectedPoints.filter((point) => anchorVisible(point, cutoff));
  const safeExpectedPoints = expectedPoints.filter((point) => anchorVisible(point, cutoff));
  const safeSelectedZone = clipZone(selectedZone, cutoff);
  const safeExpectedZone = clipZone(expectedZone, cutoff);
  const safeSelectedLine = lineVisible(selectedLine, cutoff);
  const safeExpectedLine = lineVisible(expectedLine, cutoff);
  const safeSelectedCandleIndex =
    selectedCandleIndex !== undefined && selectedCandleIndex <= cutoff
      ? selectedCandleIndex
      : undefined;
  const safeCrosshairAnchor =
    crosshairAnchor && anchorVisible(crosshairAnchor, cutoff) ? crosshairAnchor : undefined;
  const safeSelectedAnnotationId = safeLearnerAnnotations.some(
    ({ id }) => id === selectedAnnotationId,
  )
    ? selectedAnnotationId
    : undefined;
  const plotWidth = Math.max(1, width - AXIS_LEFT - AXIS_RIGHT);
  const firstIndex = frame?.firstCandleIndex ?? 0;
  const lastIndex = frame?.lastCandleIndex ?? firstIndex;
  const candleSpan = Math.max(1, lastIndex - firstIndex + 1);
  const priceLow = projection.bounds?.minPrice ?? 0;
  const priceHigh = projection.bounds?.maxPrice ?? 1;
  const xForIndex = (index: number): number =>
    AXIS_LEFT + ((index - firstIndex + 0.5) / candleSpan) * plotWidth;
  const yForPrice = (price: number): number =>
    PLOT_TOP +
    ((priceHigh - price) / Math.max(0.01, priceHigh - priceLow)) * (PLOT_BOTTOM - PLOT_TOP);
  const candleWidth = Math.max(3, Math.min(11, (plotWidth / candleSpan) * 0.58));

  const onLayout = (event: LayoutChangeEvent): void => {
    setWidth(Math.max(280, event.nativeEvent.layout.width));
  };
  const onPress = (event: GestureResponderEvent): void => {
    if (!interactive || !onChartPress || candles.length === 0) return;
    const { locationX, locationY } = event.nativeEvent;
    if (
      locationX < AXIS_LEFT ||
      locationX > width - AXIS_RIGHT ||
      locationY < PLOT_TOP ||
      locationY > PLOT_BOTTOM
    ) {
      setInteractionStatus('ההקשה הייתה מחוץ לאזור המחיר. נסו שוב בתוך הגרף העליון.');
      return;
    }
    setInteractionStatus(undefined);
    const x = locationX;
    const y = locationY;
    const candleIndex = Math.max(
      firstIndex,
      Math.min(lastIndex, Math.floor(((x - AXIS_LEFT) / plotWidth) * candleSpan) + firstIndex),
    );
    const price = priceHigh - ((y - PLOT_TOP) / (PLOT_BOTTOM - PLOT_TOP)) * (priceHigh - priceLow);
    onChartPress({ candleIndex, price });
  };

  const renderAnnotation = (annotation: ChartAnnotation) => {
    if (annotation.kind === 'point') {
      return (
        <Circle
          cx={xForIndex(annotation.candleIndex)}
          cy={yForPrice(annotation.price)}
          fill={theme.colors.warning}
          key={annotation.id}
          r={5}
          testID={`${testID}-semantic-${annotation.id}`}
        />
      );
    }
    if (annotation.kind === 'zone') {
      const left = xForIndex(annotation.startCandleIndex) - candleWidth / 2;
      const right = xForIndex(annotation.endCandleIndex) + candleWidth / 2;
      return (
        <Rect
          fill={theme.colors.info}
          fillOpacity={0.15}
          height={Math.abs(yForPrice(annotation.priceLow) - yForPrice(annotation.priceHigh))}
          key={annotation.id}
          stroke={theme.colors.info}
          strokeDasharray="5 4"
          testID={`${testID}-semantic-${annotation.id}`}
          width={right - left}
          x={left}
          y={yForPrice(annotation.priceHigh)}
        />
      );
    }
    if (annotation.kind === 'line') {
      return (
        <Line
          key={annotation.id}
          stroke={theme.colors.warning}
          strokeDasharray="6 4"
          strokeWidth={2}
          testID={`${testID}-semantic-${annotation.id}`}
          x1={xForIndex(annotation.start.candleIndex)}
          x2={xForIndex(annotation.end.candleIndex)}
          y1={yForPrice(annotation.start.price)}
          y2={yForPrice(annotation.end.price)}
        />
      );
    }
    const start =
      'candleIndex' in annotation ? annotation.candleIndex : annotation.startCandleIndex;
    const end = 'endCandleIndex' in annotation ? annotation.endCandleIndex : start;
    return (
      <Rect
        fill={theme.colors.secondary}
        fillOpacity={0.08}
        height={PLOT_BOTTOM - PLOT_TOP}
        key={annotation.id}
        testID={`${testID}-semantic-${annotation.id}`}
        width={Math.max(candleWidth, xForIndex(end) - xForIndex(start))}
        x={xForIndex(start)}
        y={PLOT_TOP}
      />
    );
  };

  const renderLearnerAnnotation = (annotation: LearnerChartAnnotation) => {
    const selected = annotation.id === safeSelectedAnnotationId;
    const stroke = selected ? theme.colors.warning : theme.colors.primary;
    const strokeWidth = selected ? 4 : 2.5;
    if (annotation.kind === 'point') {
      return (
        <Circle
          cx={xForIndex(annotation.anchor.candleIndex)}
          cy={yForPrice(annotation.anchor.price)}
          fill={theme.colors.surface}
          key={annotation.id}
          r={selected ? 8 : 6}
          stroke={stroke}
          strokeWidth={strokeWidth}
          testID={`${testID}-learner-${annotation.id}`}
        />
      );
    }
    if (annotation.kind === 'horizontal-level') {
      return (
        <Line
          key={annotation.id}
          stroke={stroke}
          strokeDasharray={selected ? '3 2' : undefined}
          strokeWidth={strokeWidth}
          testID={`${testID}-learner-${annotation.id}`}
          x1={AXIS_LEFT}
          x2={width - AXIS_RIGHT}
          y1={yForPrice(annotation.price)}
          y2={yForPrice(annotation.price)}
        />
      );
    }
    if (annotation.kind === 'trendline') {
      return (
        <Line
          key={annotation.id}
          stroke={stroke}
          strokeDasharray={selected ? '3 2' : undefined}
          strokeWidth={strokeWidth}
          testID={`${testID}-learner-${annotation.id}`}
          x1={xForIndex(annotation.start.candleIndex)}
          x2={xForIndex(annotation.end.candleIndex)}
          y1={yForPrice(annotation.start.price)}
          y2={yForPrice(annotation.end.price)}
        />
      );
    }
    const left = Math.min(
      xForIndex(annotation.start.candleIndex),
      xForIndex(annotation.end.candleIndex),
    );
    const right = Math.max(
      xForIndex(annotation.start.candleIndex),
      xForIndex(annotation.end.candleIndex),
    );
    const top = yForPrice(Math.max(annotation.start.price, annotation.end.price));
    const bottom = yForPrice(Math.min(annotation.start.price, annotation.end.price));
    return (
      <Rect
        fill={theme.colors.primary}
        fillOpacity={0.12}
        height={Math.abs(bottom - top)}
        key={annotation.id}
        stroke={stroke}
        strokeDasharray={selected ? '3 2' : '5 3'}
        strokeWidth={strokeWidth}
        testID={`${testID}-learner-${annotation.id}`}
        width={Math.max(candleWidth, right - left)}
        x={left}
        y={top}
      />
    );
  };

  const baseDescription =
    presentationPolicy === 'blind'
      ? blindChartDescription(candles)
      : (accessibilityLabel ?? chartDescription(candles, ticker, chart.spec.timeframe));
  const description = safeSelectedPoints.length
    ? `${baseDescription}. ${isolateLtrRunsInHebrew(
        safeSelectedPoints.length === 1
          ? 'הסימון שלך כולל נקודה אחת'
          : `הסימון שלך כולל ${safeSelectedPoints.length} נקודות`,
      )}`
    : safeExpectedPoints.length
      ? `${baseDescription}. ${isolateLtrRunsInHebrew(
          safeExpectedPoints.length === 1
            ? 'מוצגת נקודת ייחוס אחת'
            : `מוצגות ${safeExpectedPoints.length} נקודות ייחוס`,
        )}`
      : baseDescription;
  if (candles.length === 0) {
    return (
      <View
        accessible
        accessibilityLabel={description}
        style={[styles.empty, { borderColor: theme.colors.border }]}
        testID={testID}
      >
        <UiText align="center" color="textMuted">
          אין עדיין נתוני גרף להצגה.
        </UiText>
      </View>
    );
  }

  const priceTicks = [0, 0.25, 0.5, 0.75, 1];
  const volumeHeight = 44;
  const body = (
    <Svg
      accessibilityElementsHidden
      height={CHART_HEIGHT}
      importantForAccessibility="no-hide-descendants"
      width={width}
    >
      <Rect fill={theme.colors.surfaceRaised} height={CHART_HEIGHT} rx={16} width={width} />
      {priceTicks.map((ratio) => {
        const y = PLOT_TOP + ratio * (PLOT_BOTTOM - PLOT_TOP);
        const value = priceHigh - ratio * (priceHigh - priceLow);
        return (
          <G key={ratio}>
            <Line
              stroke={theme.colors.chartGrid}
              strokeDasharray="3 6"
              strokeOpacity={0.55}
              x1={AXIS_LEFT}
              x2={width - AXIS_RIGHT}
              y1={y}
              y2={y}
            />
            <SvgText
              fill={theme.colors.textMuted}
              fontSize="10"
              textAnchor="start"
              x={width - AXIS_RIGHT + 7}
              y={y + 4}
            >
              {value.toFixed(1)}
            </SvgText>
          </G>
        );
      })}
      {candles.map((candle) => {
        const x = xForIndex(candle.index);
        const rising = candle.close >= candle.open;
        const color = rising ? theme.colors.chartUp : theme.colors.chartDown;
        const bodyTop = yForPrice(Math.max(candle.open, candle.close));
        const bodyBottom = yForPrice(Math.min(candle.open, candle.close));
        const volume = Math.max(
          1,
          (candle.volume / Math.max(1, frame?.maximumVolume ?? 1)) * volumeHeight,
        );
        return (
          <G key={candle.index}>
            <Line
              stroke={color}
              strokeWidth={1.4}
              x1={x}
              x2={x}
              y1={yForPrice(candle.high)}
              y2={yForPrice(candle.low)}
            />
            <Rect
              fill={rising ? theme.colors.surfaceRaised : color}
              height={Math.max(2, bodyBottom - bodyTop)}
              rx={1}
              stroke={color}
              strokeWidth={rising ? 2 : 1}
              width={candleWidth}
              x={x - candleWidth / 2}
              y={bodyTop}
            />
            <Rect
              fill={rising ? theme.colors.surfaceRaised : color}
              fillOpacity={rising ? 1 : 0.36}
              height={volume}
              stroke={color}
              strokeWidth={rising ? 1.5 : 0}
              width={candleWidth}
              x={x - candleWidth / 2}
              y={VOLUME_TOP + volumeHeight - volume}
            />
          </G>
        );
      })}
      {safeHighlightedCandleIndices.map((index) => (
        <Rect
          fill={theme.colors.warning}
          fillOpacity={0.08}
          height={PLOT_BOTTOM - PLOT_TOP}
          key={`highlight-${index}`}
          stroke={theme.colors.warning}
          strokeDasharray="4 3"
          strokeWidth={2}
          testID={`${testID}-highlight-${index}`}
          width={Math.max(16, candleWidth + 8)}
          x={xForIndex(index) - Math.max(16, candleWidth + 8) / 2}
          y={PLOT_TOP}
        />
      ))}
      {safeSelectedCandleIndex !== undefined ? (
        <Rect
          fill={theme.colors.info}
          fillOpacity={0.09}
          height={PLOT_BOTTOM - PLOT_TOP}
          stroke={theme.colors.info}
          strokeWidth={2}
          testID={`${testID}-selected-candle`}
          width={Math.max(18, candleWidth + 10)}
          x={xForIndex(safeSelectedCandleIndex) - Math.max(18, candleWidth + 10) / 2}
          y={PLOT_TOP}
        />
      ) : undefined}
      {safeCrosshairAnchor ? (
        <G testID={`${testID}-crosshair`}>
          <Line
            stroke={theme.colors.info}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            x1={xForIndex(safeCrosshairAnchor.candleIndex)}
            x2={xForIndex(safeCrosshairAnchor.candleIndex)}
            y1={PLOT_TOP}
            y2={PLOT_BOTTOM}
          />
          <Line
            stroke={theme.colors.info}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            x1={AXIS_LEFT}
            x2={width - AXIS_RIGHT}
            y1={yForPrice(safeCrosshairAnchor.price)}
            y2={yForPrice(safeCrosshairAnchor.price)}
          />
        </G>
      ) : undefined}
      {safeSemanticAnnotations.map(renderAnnotation)}
      {safeLearnerAnnotations.map(renderLearnerAnnotation)}
      {safeExpectedZone ? (
        <Rect
          fill={theme.colors.warning}
          fillOpacity={0.09}
          height={Math.abs(
            yForPrice(safeExpectedZone.priceLow) - yForPrice(safeExpectedZone.priceHigh),
          )}
          stroke={theme.colors.warning}
          strokeDasharray="7 4"
          strokeWidth={2}
          testID={`${testID}-expected-zone`}
          width={Math.abs(
            xForIndex(safeExpectedZone.endCandleIndex) -
              xForIndex(safeExpectedZone.startCandleIndex),
          )}
          x={Math.min(
            xForIndex(safeExpectedZone.startCandleIndex),
            xForIndex(safeExpectedZone.endCandleIndex),
          )}
          y={yForPrice(safeExpectedZone.priceHigh)}
        />
      ) : undefined}
      {safeExpectedLine ? (
        <Line
          stroke={theme.colors.warning}
          strokeDasharray="7 4"
          strokeWidth={3}
          testID={`${testID}-expected-line`}
          x1={xForIndex(safeExpectedLine.start.candleIndex)}
          x2={xForIndex(safeExpectedLine.end.candleIndex)}
          y1={yForPrice(safeExpectedLine.start.price)}
          y2={yForPrice(safeExpectedLine.end.price)}
        />
      ) : undefined}
      {safeExpectedPoints.map((point, index) => (
        <Circle
          cx={xForIndex(point.candleIndex)}
          cy={yForPrice(point.price)}
          fill={theme.colors.warning}
          key={`expected-${point.candleIndex}-${point.price}-${index}`}
          r={6}
          stroke={theme.colors.surface}
          strokeWidth={2}
          testID={`${testID}-expected-point-${index}`}
        />
      ))}
      {safeSelectedZone ? (
        <Rect
          fill={theme.colors.primary}
          fillOpacity={0.15}
          height={Math.abs(
            yForPrice(safeSelectedZone.priceLow) - yForPrice(safeSelectedZone.priceHigh),
          )}
          stroke={theme.colors.primary}
          strokeDasharray="4 3"
          strokeWidth={2}
          testID={`${testID}-selected-zone`}
          width={Math.abs(
            xForIndex(safeSelectedZone.endCandleIndex) -
              xForIndex(safeSelectedZone.startCandleIndex),
          )}
          x={Math.min(
            xForIndex(safeSelectedZone.startCandleIndex),
            xForIndex(safeSelectedZone.endCandleIndex),
          )}
          y={yForPrice(safeSelectedZone.priceHigh)}
        />
      ) : undefined}
      {safeSelectedLine ? (
        <Line
          stroke={theme.colors.primary}
          strokeWidth={3}
          testID={`${testID}-selected-line`}
          x1={xForIndex(safeSelectedLine.start.candleIndex)}
          x2={xForIndex(safeSelectedLine.end.candleIndex)}
          y1={yForPrice(safeSelectedLine.start.price)}
          y2={yForPrice(safeSelectedLine.end.price)}
        />
      ) : undefined}
      {safeSelectedPoints.map((point, index) => (
        <G
          key={`${point.candleIndex}-${point.price}-${index}`}
          testID={`${testID}-selected-point-${index}`}
        >
          <Circle
            cx={xForIndex(point.candleIndex)}
            cy={yForPrice(point.price)}
            fill={theme.colors.surface}
            r={7}
            stroke={theme.colors.primary}
            strokeWidth={3}
          />
          <SvgText
            fill={theme.colors.primary}
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            x={xForIndex(point.candleIndex)}
            y={yForPrice(point.price) - 11}
          >
            {index + 1}
          </SvgText>
        </G>
      ))}
      <SvgText
        fill={theme.colors.textMuted}
        fontSize="10"
        textAnchor="middle"
        x={AXIS_LEFT + 18}
        y={315}
      >
        {presentationPolicy === 'blind'
          ? `#${candleSequence.get(candles[0]?.index ?? -1) ?? 1}`
          : `⁦${shortChartDate(candles[0]?.timestamp)}⁩`}
      </SvgText>
      <SvgText
        fill={theme.colors.textMuted}
        fontSize="10"
        textAnchor="middle"
        x={width - AXIS_RIGHT - 18}
        y={315}
      >
        {presentationPolicy === 'blind'
          ? `#${candleSequence.get(candles.at(-1)?.index ?? -1) ?? candles.length}`
          : `⁦${shortChartDate(candles.at(-1)?.timestamp)}⁩`}
      </SvgText>
      <SvgText
        fill={theme.colors.textMuted}
        fontSize="10"
        textAnchor="middle"
        x={AXIS_LEFT + 10}
        y={249}
      >
        VOL
      </SvgText>
    </Svg>
  );

  return (
    <View style={{ gap: 7 }}>
      <View style={[styles.metaRow, { direction: theme.direction }]}>
        <UiText color="textMuted" variant="caption">
          {interactive ? 'הקישו על הגרף כדי לסמן' : 'מחיר ומחזור'}
        </UiText>
        {presentationPolicy === 'blind' ? (
          <UiText color="textMuted" variant="caption">
            תרשים היסטורי מוסתר זהות
          </UiText>
        ) : (
          <View style={[styles.metaGroup, { direction: 'ltr' }]}>
            <LtrText variant="label">{ticker}</LtrText>
            <LtrText color="textMuted" variant="caption">
              {chart.spec.timeframe}
            </LtrText>
          </View>
        )}
      </View>
      <Pressable
        accessibilityHint={
          interactive
            ? `${
                presentationPolicy === 'blind'
                  ? 'הקישו במיקום הרצוי בתוך אזור המחיר'
                  : (interactionHint ?? 'הקישו במיקום הרצוי בתוך אזור המחיר')
              } הגרף מצמיד את הבחירה לנר הקרוב.`
            : undefined
        }
        accessibilityLabel={description}
        accessibilityRole={interactive ? 'button' : 'image'}
        onLayout={onLayout}
        onPress={onPress}
        style={[styles.chart, { borderColor: theme.colors.border, direction: 'ltr' }]}
        testID={testID}
      >
        {body}
      </Pressable>
      <UiText color="textMuted" variant="caption">
        מקרא: נר עולה = גוף חלול; נר יורד = גוף מלא.
      </UiText>
      {interactionStatus ? (
        <UiText accessibilityLiveRegion="polite" color="warning" variant="caption">
          {interactionStatus}
        </UiText>
      ) : undefined}
      {allowAccessibleDataTable ? (
        <Button
          accessibilityLabel={showAccessibleData ? 'הסתרת נתוני הנרות' : 'הצגת נתוני הנרות'}
          onPress={() => setShowAccessibleData((visible) => !visible)}
          size="compact"
          variant="ghost"
        >
          {showAccessibleData ? 'הסתרת נתוני הנרות' : 'הצגת נתוני הנרות'}
        </Button>
      ) : undefined}
      {allowAccessibleDataTable && showAccessibleData ? (
        <Card variant="subtle">
          <View style={{ gap: 5 }}>
            <UiText variant="label">נתוני הנרות הגלויים</UiText>
            {candles.map((candle) => {
              const sequence = candleSequence.get(candle.index) ?? 1;
              const candleLabel =
                presentationPolicy === 'blind' ? `רציף ${sequence}` : `${candle.index}`;
              const displayIndex =
                presentationPolicy === 'blind' ? `#${sequence}` : `${candle.index}`;
              const row = `נר ${candleLabel}: פתיחה ${candle.open.toFixed(2)}, שיא ${candle.high.toFixed(2)}, שפל ${candle.low.toFixed(2)}, סגירה ${candle.close.toFixed(2)}, מחזור ${Math.round(candle.volume)}`;
              return (
                <View accessible accessibilityLabel={row} key={candle.index}>
                  <LtrText color="textMuted" variant="caption">
                    {`${displayIndex} | O ${candle.open.toFixed(2)} H ${candle.high.toFixed(2)} L ${candle.low.toFixed(2)} C ${candle.close.toFixed(2)} V ${Math.round(candle.volume)}`}
                  </LtrText>
                </View>
              );
            })}
          </View>
        </Card>
      ) : undefined}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    borderRadius: 16,
    borderWidth: 1,
    height: CHART_HEIGHT,
    overflow: 'hidden',
    width: '100%',
  },
  empty: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 240,
    justifyContent: 'center',
    padding: 24,
  },
  metaGroup: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
  },
});
