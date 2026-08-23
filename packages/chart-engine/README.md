# `@chartpath/chart-engine`

Pure TypeScript, deterministic synthetic OHLCV generation for ChartPath exercises. The package has
no React or React Native dependency, does not use market data, and never grades an answer.

## Public workflow

```ts
import { createChartSpec, generateChart, generateFullChart } from '@chartpath/chart-engine';

const spec = createChartSpec({
  seed: 42,
  scenario: 'retest',
  decisionCandleIndex: 51,
  parameters: { direction: 'up', relativeVolume: 'spike' },
});

const decisionChart = generateChart(spec); // only candles 0...51 and knowable annotations
const postAnswerReveal = generateFullChart(spec); // complete model for an explicit later reveal
```

For authoring and validation, `generatePriceSeries(spec)` and
`generateSemanticAnnotations(spec, candles)` expose the separated model phases. The same complete
spec always reproduces the same candles and annotations.

## Supported parameters

`ChartSpec.parameters` accepts these optional generator controls:

- `direction`: `up` or `down`
- `regime`: `uptrend`, `downtrend`, or `range`
- `variant`: `positive`, `near-miss`, `ambiguous`, or `lookalike`
- `reaction`: `support`, `resistance`, or `none`
- `relativeVolume`: `steady`, `rising`, `falling`, or `spike`
- `gapKind`: `none`, `common`, `breakaway`, `continuation`, or `exhaustion`
- `gapSize` and `gapIndex`
- `pattern`: a reversal or continuation structure exported by the package
- `eventIndex`, `startTimestamp`, and `intervalMs`
- `baseScenario`: the underlying structure for `ambiguous` and `lookalike` chart scenarios

Invalid parameter values fail early with a `RangeError` rather than silently producing a different
chart.

## Decision-candle safety

`generateChart` automatically honors `decisionCandleIndex`. `sliceChartAt` is available when one
complete chart is reused at multiple reveal points. It removes future candles, excludes annotations
that are not knowable yet, and clips evolving ranges and zones to the cutoff. Grading code should
consume that slice, never the complete chart.
