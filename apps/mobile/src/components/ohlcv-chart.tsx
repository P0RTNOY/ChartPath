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
  OhlcvCandle,
} from '@chartpath/domain';
import { Button, Card, LtrText, UiText, useTheme } from '@chartpath/ui';

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
  readonly revealCount?: number;
  readonly showAnnotations?: boolean;
  readonly allowAccessibleDataTable?: boolean;
  readonly onChartPress?: (anchor: ChartAnchor) => void;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
}

interface Frame {
  readonly first: number;
  readonly last: number;
  readonly low: number;
  readonly high: number;
  readonly maxVolume: number;
}

function chartFrame(candles: readonly OhlcvCandle[]): Frame {
  return candles.reduce<Frame>(
    (frame, candle) => ({
      first: Math.min(frame.first, candle.index),
      last: Math.max(frame.last, candle.index),
      low: Math.min(frame.low, candle.low),
      high: Math.max(frame.high, candle.high),
      maxVolume: Math.max(frame.maxVolume, candle.volume),
    }),
    {
      first: Number.POSITIVE_INFINITY,
      last: Number.NEGATIVE_INFINITY,
      low: Number.POSITIVE_INFINITY,
      high: Number.NEGATIVE_INFINITY,
      maxVolume: 0,
    },
  );
}

function chartDescription(
  candles: readonly OhlcvCandle[],
  ticker: string,
  timeframe: string,
): string {
  if (candles.length === 0) return `גרף ${ticker}, ללא נתונים`;
  const first = candles[0];
  const last = candles.at(-1);
  if (!first || !last) return `גרף ${ticker}, ללא נתונים`;
  const direction =
    last.close > first.open
      ? 'הסגירה האחרונה גבוהה מהפתיחה הראשונה'
      : last.close < first.open
        ? 'הסגירה האחרונה נמוכה מהפתיחה הראשונה'
        : 'הסגירה האחרונה שווה לפתיחה הראשונה';
  const frame = chartFrame(candles);
  return `גרף נרות ${ticker}, מסגרת זמן ${timeframe}, ${candles.length} נרות, ${direction}, טווח מחיר ${frame.low.toFixed(2)} עד ${frame.high.toFixed(2)}`;
}

export function OhlcvChart({
  chart,
  ticker = 'CPTH',
  interactive = false,
  highlightedCandleIndices = [],
  selectedPoints = [],
  selectedZone,
  selectedLine,
  revealCount,
  showAnnotations = false,
  allowAccessibleDataTable = true,
  onChartPress,
  accessibilityLabel,
  testID = 'ohlcv-chart',
}: OhlcvChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(680);
  const [showAccessibleData, setShowAccessibleData] = useState(false);
  const candles = useMemo(
    () => chart.candles.slice(0, revealCount ?? chart.candles.length),
    [chart.candles, revealCount],
  );
  const frame = useMemo(() => chartFrame(candles), [candles]);
  const plotWidth = Math.max(1, width - AXIS_LEFT - AXIS_RIGHT);
  const candleSpan = Math.max(1, frame.last - frame.first + 1);
  const pricePadding = Math.max(0.01, (frame.high - frame.low) * 0.08);
  const priceLow = frame.low - pricePadding;
  const priceHigh = frame.high + pricePadding;
  const xForIndex = (index: number): number =>
    AXIS_LEFT + ((index - frame.first + 0.5) / candleSpan) * plotWidth;
  const yForPrice = (price: number): number =>
    PLOT_TOP +
    ((priceHigh - price) / Math.max(0.01, priceHigh - priceLow)) * (PLOT_BOTTOM - PLOT_TOP);
  const candleWidth = Math.max(3, Math.min(11, (plotWidth / candleSpan) * 0.58));

  const onLayout = (event: LayoutChangeEvent): void => {
    setWidth(Math.max(280, event.nativeEvent.layout.width));
  };
  const onPress = (event: GestureResponderEvent): void => {
    if (!interactive || !onChartPress || candles.length === 0) return;
    const x = Math.max(AXIS_LEFT, Math.min(width - AXIS_RIGHT, event.nativeEvent.locationX));
    const y = Math.max(PLOT_TOP, Math.min(PLOT_BOTTOM, event.nativeEvent.locationY));
    const candleIndex = Math.max(
      frame.first,
      Math.min(frame.last, Math.floor(((x - AXIS_LEFT) / plotWidth) * candleSpan) + frame.first),
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
        width={Math.max(candleWidth, xForIndex(end) - xForIndex(start))}
        x={xForIndex(start)}
        y={PLOT_TOP}
      />
    );
  };

  const description = accessibilityLabel ?? chartDescription(candles, ticker, chart.spec.timeframe);
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
        const volume = Math.max(1, (candle.volume / Math.max(1, frame.maxVolume)) * volumeHeight);
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
      {highlightedCandleIndices.map((index) => (
        <Rect
          fill={theme.colors.warning}
          fillOpacity={0.08}
          height={PLOT_BOTTOM - PLOT_TOP}
          key={`highlight-${index}`}
          stroke={theme.colors.warning}
          strokeDasharray="4 3"
          strokeWidth={2}
          width={Math.max(16, candleWidth + 8)}
          x={xForIndex(index) - Math.max(16, candleWidth + 8) / 2}
          y={PLOT_TOP}
        />
      ))}
      {showAnnotations ? chart.annotations.map(renderAnnotation) : undefined}
      {selectedZone ? (
        <Rect
          fill={theme.colors.primary}
          fillOpacity={0.15}
          height={Math.abs(yForPrice(selectedZone.priceLow) - yForPrice(selectedZone.priceHigh))}
          stroke={theme.colors.primary}
          strokeDasharray="4 3"
          strokeWidth={2}
          width={Math.abs(
            xForIndex(selectedZone.endCandleIndex) - xForIndex(selectedZone.startCandleIndex),
          )}
          x={Math.min(
            xForIndex(selectedZone.startCandleIndex),
            xForIndex(selectedZone.endCandleIndex),
          )}
          y={yForPrice(selectedZone.priceHigh)}
        />
      ) : undefined}
      {selectedLine ? (
        <Line
          stroke={theme.colors.primary}
          strokeWidth={3}
          x1={xForIndex(selectedLine.start.candleIndex)}
          x2={xForIndex(selectedLine.end.candleIndex)}
          y1={yForPrice(selectedLine.start.price)}
          y2={yForPrice(selectedLine.end.price)}
        />
      ) : undefined}
      {selectedPoints.map((point, index) => (
        <G key={`${point.candleIndex}-${point.price}-${index}`}>
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
        {`⁦${candles[0]?.timestamp.slice(5, 10)}⁩`}
      </SvgText>
      <SvgText
        fill={theme.colors.textMuted}
        fontSize="10"
        textAnchor="middle"
        x={width - AXIS_RIGHT - 18}
        y={315}
      >
        {`⁦${candles.at(-1)?.timestamp.slice(5, 10)}⁩`}
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
      <View style={styles.metaRow}>
        <View style={styles.metaGroup}>
          <LtrText variant="label">{ticker}</LtrText>
          <LtrText color="textMuted" variant="caption">
            {chart.spec.timeframe}
          </LtrText>
        </View>
        <UiText color="textMuted" variant="caption">
          {interactive ? 'הקישו על הגרף כדי לסמן' : 'מחיר ונפח'}
        </UiText>
      </View>
      <Pressable
        accessibilityHint={interactive ? 'הקישו במיקום הרצוי בתוך אזור המחיר' : undefined}
        accessibilityLabel={description}
        accessibilityRole={interactive ? 'button' : 'image'}
        onLayout={onLayout}
        onPress={onPress}
        style={[styles.chart, { borderColor: theme.colors.border }]}
        testID={testID}
      >
        {body}
      </Pressable>
      <UiText color="textMuted" variant="caption">
        קוד חזותי: נר עולה = גוף חלול; נר יורד = גוף מלא.
      </UiText>
      {allowAccessibleDataTable ? (
        <Button
          accessibilityLabel={showAccessibleData ? 'הסתרת נתוני נרות' : 'הצגת נתוני נרות נגישים'}
          onPress={() => setShowAccessibleData((visible) => !visible)}
          size="compact"
          variant="ghost"
        >
          {showAccessibleData ? 'הסתרת נתוני OHLC' : 'נתוני OHLC נגישים'}
        </Button>
      ) : undefined}
      {allowAccessibleDataTable && showAccessibleData ? (
        <Card variant="subtle">
          <View style={{ gap: 5 }}>
            <UiText variant="label">נתוני הנרות הגלויים</UiText>
            {candles.map((candle) => {
              const row = `נר ${candle.index}: פתיחה ${candle.open.toFixed(2)}, שיא ${candle.high.toFixed(2)}, שפל ${candle.low.toFixed(2)}, סגירה ${candle.close.toFixed(2)}, מחזור ${Math.round(candle.volume)}`;
              return (
                <View accessible accessibilityLabel={row} key={candle.index}>
                  <LtrText color="textMuted" variant="caption">
                    {`${candle.index} | O ${candle.open.toFixed(2)} H ${candle.high.toFixed(2)} L ${candle.low.toFixed(2)} C ${candle.close.toFixed(2)} V ${Math.round(candle.volume)}`}
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
