export interface ChartViewport {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly minPrice: number;
  readonly maxPrice: number;
}

export interface ChartBounds {
  readonly minIndex: number;
  readonly maxIndex: number;
  readonly minPrice: number;
  readonly maxPrice: number;
  readonly minVisibleCandles?: number;
}

export interface ScreenRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** A continuous coordinate; use candleIndexAtScreenX when snapping is required. */
export interface ChartCoordinate {
  readonly candleIndex: number;
  readonly price: number;
}

export interface ScreenCoordinate {
  readonly x: number;
  readonly y: number;
}

export function createChartViewport(
  bounds: ChartBounds,
  requested: Partial<ChartViewport> = {},
): ChartViewport {
  assertBounds(bounds);
  const startIndex = requested.startIndex ?? bounds.minIndex;
  const endIndex = requested.endIndex ?? bounds.maxIndex;
  const minPrice = requested.minPrice ?? bounds.minPrice;
  const maxPrice = requested.maxPrice ?? bounds.maxPrice;
  if (endIndex < startIndex)
    throw new RangeError('Viewport end index must not precede start index');
  if (maxPrice <= minPrice)
    throw new RangeError('Viewport maximum price must exceed minimum price');
  const indexRange = clampIndexRange(startIndex, endIndex, bounds);
  const priceRange = clampPriceRange(minPrice, maxPrice, bounds);
  return {
    ...indexRange,
    ...priceRange,
  };
}

function clampPriceRange(
  requestedMin: number,
  requestedMax: number,
  bounds: ChartBounds,
): Pick<ChartViewport, 'minPrice' | 'maxPrice'> {
  const requestedSpan = requestedMax - requestedMin;
  const availableSpan = bounds.maxPrice - bounds.minPrice;
  if (requestedSpan >= availableSpan) {
    return { minPrice: bounds.minPrice, maxPrice: bounds.maxPrice };
  }
  let minPrice = requestedMin;
  let maxPrice = requestedMax;
  if (minPrice < bounds.minPrice) {
    minPrice = bounds.minPrice;
    maxPrice = minPrice + requestedSpan;
  }
  if (maxPrice > bounds.maxPrice) {
    maxPrice = bounds.maxPrice;
    minPrice = maxPrice - requestedSpan;
  }
  return { minPrice, maxPrice };
}

/** Positive deltas move the visible window toward later candles. */
export function panChartViewport(
  viewport: ChartViewport,
  deltaCandleIndexes: number,
  bounds: ChartBounds,
): ChartViewport {
  assertViewport(viewport);
  if (!Number.isFinite(deltaCandleIndexes)) throw new RangeError('Pan delta must be finite');
  const delta = Math.round(deltaCandleIndexes);
  const range = clampIndexRange(viewport.startIndex + delta, viewport.endIndex + delta, bounds);
  return { ...viewport, ...range };
}

/** A factor above one zooms in; a factor below one zooms out. */
export function zoomChartViewport(
  viewport: ChartViewport,
  zoomFactor: number,
  centerCandleIndex: number,
  bounds: ChartBounds,
): ChartViewport {
  assertViewport(viewport);
  assertBounds(bounds);
  if (!Number.isFinite(zoomFactor) || zoomFactor <= 0) {
    throw new RangeError('Zoom factor must be positive and finite');
  }
  if (!Number.isFinite(centerCandleIndex)) throw new RangeError('Zoom center must be finite');
  const oldCount = visibleCandleCount(viewport);
  const totalCount = bounds.maxIndex - bounds.minIndex + 1;
  const minCount = Math.min(bounds.minVisibleCandles ?? 2, totalCount);
  const newCount = clamp(Math.round(oldCount / zoomFactor), minCount, totalCount);
  const clampedCenter = clamp(centerCandleIndex, viewport.startIndex, viewport.endIndex);
  const relativeCenter =
    oldCount === 1 ? 0 : (clampedCenter - viewport.startIndex) / (oldCount - 1);
  const startIndex = Math.round(clampedCenter - relativeCenter * (newCount - 1));
  const range = clampIndexRange(startIndex, startIndex + newCount - 1, bounds);
  return { ...viewport, ...range };
}

export function visibleCandleCount(viewport: ChartViewport): number {
  return viewport.endIndex - viewport.startIndex + 1;
}

export function chartToScreen(
  coordinate: ChartCoordinate,
  viewport: ChartViewport,
  screen: ScreenRect,
): ScreenCoordinate {
  assertViewport(viewport);
  assertScreenRect(screen);
  const indexSpan = viewport.endIndex - viewport.startIndex;
  const xRatio = indexSpan === 0 ? 0.5 : (coordinate.candleIndex - viewport.startIndex) / indexSpan;
  const yRatio = (viewport.maxPrice - coordinate.price) / (viewport.maxPrice - viewport.minPrice);
  return { x: screen.left + xRatio * screen.width, y: screen.top + yRatio * screen.height };
}

export function screenToChart(
  coordinate: ScreenCoordinate,
  viewport: ChartViewport,
  screen: ScreenRect,
): ChartCoordinate {
  assertViewport(viewport);
  assertScreenRect(screen);
  const xRatio = (coordinate.x - screen.left) / screen.width;
  const yRatio = (coordinate.y - screen.top) / screen.height;
  return {
    candleIndex: viewport.startIndex + xRatio * (viewport.endIndex - viewport.startIndex),
    price: viewport.maxPrice - yRatio * (viewport.maxPrice - viewport.minPrice),
  };
}

export function candleIndexAtScreenX(
  screenX: number,
  viewport: ChartViewport,
  screen: ScreenRect,
): number {
  const coordinate = screenToChart({ x: screenX, y: screen.top }, viewport, screen);
  return clamp(Math.round(coordinate.candleIndex), viewport.startIndex, viewport.endIndex);
}

function clampIndexRange(
  requestedStart: number,
  requestedEnd: number,
  bounds: ChartBounds,
): Pick<ChartViewport, 'startIndex' | 'endIndex'> {
  assertBounds(bounds);
  const totalCount = bounds.maxIndex - bounds.minIndex + 1;
  const requestedCount = Math.round(requestedEnd) - Math.round(requestedStart) + 1;
  const minCount = Math.min(bounds.minVisibleCandles ?? 2, totalCount);
  const count = clamp(requestedCount, minCount, totalCount);
  let startIndex = Math.round(requestedStart);
  let endIndex = startIndex + count - 1;
  if (startIndex < bounds.minIndex) {
    startIndex = bounds.minIndex;
    endIndex = startIndex + count - 1;
  }
  if (endIndex > bounds.maxIndex) {
    endIndex = bounds.maxIndex;
    startIndex = endIndex - count + 1;
  }
  return { startIndex, endIndex };
}

function assertBounds(bounds: ChartBounds): void {
  if (!Number.isInteger(bounds.minIndex) || !Number.isInteger(bounds.maxIndex)) {
    throw new RangeError('Chart bounds indexes must be integers');
  }
  if (bounds.minIndex < 0 || bounds.maxIndex < bounds.minIndex) {
    throw new RangeError('Chart bounds index range is invalid');
  }
  if (!Number.isFinite(bounds.minPrice) || !Number.isFinite(bounds.maxPrice)) {
    throw new RangeError('Chart bounds prices must be finite');
  }
  if (bounds.maxPrice <= bounds.minPrice) {
    throw new RangeError('Chart bounds maximum price must exceed minimum price');
  }
  if (
    bounds.minVisibleCandles !== undefined &&
    (!Number.isInteger(bounds.minVisibleCandles) || bounds.minVisibleCandles < 1)
  ) {
    throw new RangeError('Minimum visible candle count must be a positive integer');
  }
}

function assertViewport(viewport: ChartViewport): void {
  if (
    !Number.isInteger(viewport.startIndex) ||
    !Number.isInteger(viewport.endIndex) ||
    viewport.startIndex < 0 ||
    viewport.endIndex < viewport.startIndex
  ) {
    throw new RangeError('Chart viewport index range is invalid');
  }
  if (
    !Number.isFinite(viewport.minPrice) ||
    !Number.isFinite(viewport.maxPrice) ||
    viewport.maxPrice <= viewport.minPrice
  ) {
    throw new RangeError('Chart viewport price range is invalid');
  }
}

function assertScreenRect(screen: ScreenRect): void {
  if (
    !Number.isFinite(screen.left) ||
    !Number.isFinite(screen.top) ||
    !Number.isFinite(screen.width) ||
    !Number.isFinite(screen.height) ||
    screen.width <= 0 ||
    screen.height <= 0
  ) {
    throw new RangeError('Screen rectangle must be finite with positive width and height');
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
