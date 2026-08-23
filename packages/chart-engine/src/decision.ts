import type { ChartAnnotation, ChartSpec, GeneratedChart, OhlcvCandle } from '@chartpath/domain';

export interface DecisionChartSlice {
  readonly chartId: string;
  readonly sourceCandleCount: number;
  readonly decisionCandleIndex: number;
  readonly candles: readonly OhlcvCandle[];
  readonly annotations: readonly ChartAnnotation[];
}

/**
 * Returns the only data that may be used to render or grade a decision at N.
 * Future candles and annotations that are not knowable at N are excluded.
 */
export function sliceChartAt(
  chart: GeneratedChart,
  decisionCandleIndex: number,
): DecisionChartSlice {
  assertDecisionIndex(chart, decisionCandleIndex);
  return {
    chartId: chart.spec.id,
    sourceCandleCount: chart.spec.candleCount,
    decisionCandleIndex,
    candles: chart.candles.slice(0, decisionCandleIndex + 1),
    annotations: annotationsVisibleAt(chart.annotations, decisionCandleIndex),
  };
}

/** GeneratedChart-shaped adapter for renderers that already consume that type. */
export function sliceGeneratedChartAt(
  chart: GeneratedChart,
  decisionCandleIndex: number,
): GeneratedChart {
  const slice = sliceChartAt(chart, decisionCandleIndex);
  const spec: ChartSpec = {
    ...chart.spec,
    decisionCandleIndex,
  };
  return {
    spec,
    candles: slice.candles,
    annotations: slice.annotations,
  };
}

export function annotationsVisibleAt(
  annotations: readonly ChartAnnotation[],
  decisionCandleIndex: number,
): readonly ChartAnnotation[] {
  if (!Number.isInteger(decisionCandleIndex) || decisionCandleIndex < 0) {
    throw new RangeError('Decision candle index must be a non-negative integer');
  }

  const visible: ChartAnnotation[] = [];
  for (const annotation of annotations) {
    const visibleFrom = annotation.visibleFromCandleIndex ?? lastReferencedCandleIndex(annotation);
    if (visibleFrom > decisionCandleIndex) continue;
    const clipped = clipAnnotation(annotation, decisionCandleIndex);
    if (clipped !== undefined) visible.push(clipped);
  }
  return visible;
}

export function annotationReferencesOnlyVisibleCandles(
  annotation: ChartAnnotation,
  decisionCandleIndex: number,
): boolean {
  if ((annotation.visibleFromCandleIndex ?? 0) > decisionCandleIndex) return false;
  switch (annotation.kind) {
    case 'point':
    case 'event':
      return annotation.candleIndex <= decisionCandleIndex;
    case 'line':
      return (
        annotation.start.candleIndex <= decisionCandleIndex &&
        annotation.end.candleIndex <= decisionCandleIndex
      );
    case 'zone':
    case 'range':
    case 'pattern':
      return (
        annotation.startCandleIndex <= decisionCandleIndex &&
        annotation.endCandleIndex <= decisionCandleIndex
      );
  }
}

function clipAnnotation(
  annotation: ChartAnnotation,
  decisionCandleIndex: number,
): ChartAnnotation | undefined {
  switch (annotation.kind) {
    case 'point':
    case 'event':
      return annotation.candleIndex <= decisionCandleIndex ? annotation : undefined;
    case 'line':
      return annotation.start.candleIndex <= decisionCandleIndex &&
        annotation.end.candleIndex <= decisionCandleIndex
        ? annotation
        : undefined;
    case 'zone':
      if (annotation.startCandleIndex > decisionCandleIndex) return undefined;
      return {
        ...annotation,
        endCandleIndex: Math.min(annotation.endCandleIndex, decisionCandleIndex),
      };
    case 'range':
      if (annotation.startCandleIndex > decisionCandleIndex) return undefined;
      return {
        ...annotation,
        endCandleIndex: Math.min(annotation.endCandleIndex, decisionCandleIndex),
      };
    case 'pattern':
      if (annotation.startCandleIndex > decisionCandleIndex) return undefined;
      return {
        ...annotation,
        endCandleIndex: Math.min(annotation.endCandleIndex, decisionCandleIndex),
      };
  }
}

function lastReferencedCandleIndex(annotation: ChartAnnotation): number {
  switch (annotation.kind) {
    case 'point':
    case 'event':
      return annotation.candleIndex;
    case 'line':
      return Math.max(annotation.start.candleIndex, annotation.end.candleIndex);
    case 'zone':
    case 'range':
    case 'pattern':
      return annotation.endCandleIndex;
  }
}

function assertDecisionIndex(chart: GeneratedChart, decisionCandleIndex: number): void {
  if (
    !Number.isInteger(decisionCandleIndex) ||
    decisionCandleIndex < 0 ||
    decisionCandleIndex >= chart.candles.length
  ) {
    throw new RangeError('Decision candle index must refer to a generated candle');
  }
}
