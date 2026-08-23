import type { ChartSpec, GeneratedChart } from '@chartpath/domain';

import { generateSemanticAnnotations } from './annotations.js';
import { assertValidChartSpec } from './config.js';
import { sliceGeneratedChartAt } from './decision.js';
import { generatePriceSeries } from './price-model.js';

/**
 * Generates the complete reproducible model. Use this only for authoring,
 * validation, or post-answer reveals; pre-answer UI should call generateChart.
 */
export function generateFullChart(spec: ChartSpec): GeneratedChart {
  assertValidChartSpec(spec);
  const candles = generatePriceSeries(spec);
  const annotations = generateSemanticAnnotations(spec, candles);
  return { spec, candles, annotations };
}

/**
 * Safe default entry point. A spec with decisionCandleIndex is automatically
 * truncated, preventing a renderer or grader from receiving future candles.
 */
export function generateChart(spec: ChartSpec): GeneratedChart {
  const fullChart = generateFullChart(spec);
  if (spec.decisionCandleIndex === undefined) return fullChart;
  return sliceGeneratedChartAt(fullChart, spec.decisionCandleIndex);
}
