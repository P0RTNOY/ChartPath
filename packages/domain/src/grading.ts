import type {
  AnswerRubric,
  AttemptResult,
  ChartAnchor,
  ChartZone,
  ExerciseAnswer,
  GradeDetail,
  LineAnswer,
  LineRubric,
  NormalizedTolerance,
  OhlcvCandle,
  PointAnswer,
  PointRubric,
  RiskAnswerField,
  RiskRubric,
  ZoneRubric,
} from './types.js';

export const GRADER_VERSION = '1.0.0';

export interface ChartGradingContext {
  readonly candles: readonly OhlcvCandle[];
  readonly decisionCandleIndex?: number;
  readonly visibleStartCandleIndex?: number;
}

export interface NormalizedChartPoint {
  readonly x: number;
  readonly y: number;
}

export interface ScreenPlotBounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface NormalizationFrame {
  readonly firstCandleIndex: number;
  readonly lastCandleIndex: number;
  readonly minimumPrice: number;
  readonly maximumPrice: number;
}

interface PointMatch {
  readonly expectedIndex: number;
  readonly answerIndex: number;
  readonly distance: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function result(
  correct: boolean,
  score: number,
  feedbackCode: string,
  details: readonly GradeDetail[] = [],
  misconceptionIds: readonly string[] = [],
): AttemptResult {
  return {
    correct,
    score: clamp01(score),
    feedbackCode,
    details,
    misconceptionIds: correct ? [] : misconceptionIds,
    graderVersion: GRADER_VERSION,
  };
}

function invalid(feedbackCode: string, details: readonly GradeDetail[] = []): AttemptResult {
  return result(false, 0, feedbackCode, details);
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function symmetricDifferenceSize(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let count = 0;
  for (const value of left) {
    if (!right.has(value)) count += 1;
  }
  for (const value of right) {
    if (!left.has(value)) count += 1;
  }
  return count;
}

function resolveCutoff(
  rubricCutoff: number | undefined,
  context: ChartGradingContext,
): number | undefined {
  if (rubricCutoff === undefined) return context.decisionCandleIndex;
  if (context.decisionCandleIndex === undefined) return rubricCutoff;
  return Math.min(rubricCutoff, context.decisionCandleIndex);
}

function normalizationFrame(
  context: ChartGradingContext,
  rubricCutoff?: number,
): NormalizationFrame | undefined {
  const cutoff = resolveCutoff(rubricCutoff, context);
  const eligible = context.candles.filter(
    (candle) =>
      candle.index >= (context.visibleStartCandleIndex ?? Number.NEGATIVE_INFINITY) &&
      (cutoff === undefined || candle.index <= cutoff),
  );
  if (eligible.length === 0) return undefined;

  let minimumPrice = Number.POSITIVE_INFINITY;
  let maximumPrice = Number.NEGATIVE_INFINITY;
  let firstCandleIndex = Number.POSITIVE_INFINITY;
  let lastCandleIndex = Number.NEGATIVE_INFINITY;
  for (const candle of eligible) {
    if (![candle.index, candle.low, candle.high].every(finite)) return undefined;
    minimumPrice = Math.min(minimumPrice, candle.low);
    maximumPrice = Math.max(maximumPrice, candle.high);
    firstCandleIndex = Math.min(firstCandleIndex, candle.index);
    lastCandleIndex = Math.max(lastCandleIndex, candle.index);
  }
  if (maximumPrice <= minimumPrice) return undefined;
  return { firstCandleIndex, lastCandleIndex, minimumPrice, maximumPrice };
}

function normalizeAnchor(anchor: ChartAnchor, frame: NormalizationFrame): NormalizedChartPoint {
  const candleSpan = Math.max(1, frame.lastCandleIndex - frame.firstCandleIndex);
  const priceSpan = frame.maximumPrice - frame.minimumPrice;
  return {
    x: (anchor.candleIndex - frame.firstCandleIndex) / candleSpan,
    y: (anchor.price - frame.minimumPrice) / priceSpan,
  };
}

function anchorIsValid(anchor: ChartAnchor): boolean {
  return finite(anchor.candleIndex) && finite(anchor.price);
}

function anchorUsesFuture(anchor: ChartAnchor, cutoff: number | undefined): boolean {
  return cutoff !== undefined && anchor.candleIndex > cutoff;
}

function zoneIsValid(zone: ChartZone): boolean {
  return (
    [zone.startCandleIndex, zone.endCandleIndex, zone.priceLow, zone.priceHigh].every(finite) &&
    zone.startCandleIndex <= zone.endCandleIndex &&
    zone.priceLow <= zone.priceHigh
  );
}

function toleranceIsValid(tolerance: NormalizedTolerance): boolean {
  return (
    finite(tolerance.horizontal) &&
    finite(tolerance.vertical) &&
    tolerance.horizontal > 0 &&
    tolerance.horizontal <= 1 &&
    tolerance.vertical > 0 &&
    tolerance.vertical <= 1
  );
}

function ellipticalDistance(
  left: NormalizedChartPoint,
  right: NormalizedChartPoint,
  tolerance: NormalizedTolerance,
): number {
  const x = (left.x - right.x) / tolerance.horizontal;
  const y = (left.y - right.y) / tolerance.vertical;
  return Math.sqrt(x * x + y * y);
}

function bestPointMatches(
  expected: readonly NormalizedChartPoint[],
  answers: readonly NormalizedChartPoint[],
  tolerance: NormalizedTolerance,
): readonly PointMatch[] {
  const candidates: PointMatch[] = [];
  for (let expectedIndex = 0; expectedIndex < expected.length; expectedIndex += 1) {
    const expectedPoint = expected[expectedIndex];
    if (!expectedPoint) continue;
    for (let answerIndex = 0; answerIndex < answers.length; answerIndex += 1) {
      const answerPoint = answers[answerIndex];
      if (!answerPoint) continue;
      candidates.push({
        expectedIndex,
        answerIndex,
        distance: ellipticalDistance(expectedPoint, answerPoint, tolerance),
      });
    }
  }
  candidates.sort(
    (left, right) =>
      left.distance - right.distance ||
      left.expectedIndex - right.expectedIndex ||
      left.answerIndex - right.answerIndex,
  );
  const usedExpected = new Set<number>();
  const usedAnswers = new Set<number>();
  const matches: PointMatch[] = [];
  for (const candidate of candidates) {
    if (candidate.distance > 1) break;
    if (usedExpected.has(candidate.expectedIndex) || usedAnswers.has(candidate.answerIndex))
      continue;
    usedExpected.add(candidate.expectedIndex);
    usedAnswers.add(candidate.answerIndex);
    matches.push(candidate);
  }
  return matches;
}

function gradePoint(
  rubric: PointRubric,
  answer: PointAnswer,
  context: ChartGradingContext | undefined,
): AttemptResult {
  if (!context) return invalid('chart-context-required');
  if (!toleranceIsValid(rubric.tolerance) || rubric.targets.length === 0) {
    return invalid('invalid-rubric');
  }
  if (answer.points.some((point) => !anchorIsValid(point))) return invalid('invalid-answer');
  const cutoff = resolveCutoff(rubric.decisionCandleIndex, context);
  if (rubric.targets.some((point) => anchorUsesFuture(point, cutoff))) {
    return invalid('rubric-uses-future-candle');
  }
  if (answer.points.some((point) => anchorUsesFuture(point, cutoff))) {
    return invalid('answer-uses-future-candle');
  }
  const frame = normalizationFrame(context, rubric.decisionCandleIndex);
  if (!frame) return invalid('invalid-chart-context');

  const expected = rubric.targets.map((point) => normalizeAnchor(point, frame));
  const answers = answer.points.map((point) => normalizeAnchor(point, frame));
  const matches = bestPointMatches(expected, answers, rubric.tolerance);
  const requiredMatches = rubric.matching === 'all' ? expected.length : 1;
  const extraAnswers = Math.max(0, answers.length - matches.length);
  const correct =
    matches.length >= requiredMatches && (rubric.allowExtraPoints === true || extraAnswers === 0);
  const denominator = rubric.matching === 'all' ? expected.length : 1;
  const matchScore = Math.min(1, matches.length / denominator);
  const extraPenalty =
    rubric.allowExtraPoints === true ? 0 : extraAnswers / Math.max(1, answers.length);
  return result(
    correct,
    matchScore * (1 - 0.25 * extraPenalty),
    correct ? 'correct' : 'point-outside-tolerance',
    [
      { key: 'matchedPoints', value: matches.length },
      { key: 'requiredPoints', value: requiredMatches },
      { key: 'extraPoints', value: extraAnswers },
    ],
    rubric.misconceptionIds,
  );
}

interface NormalizedRectangle {
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly top: number;
}

function normalizeZone(zone: ChartZone, frame: NormalizationFrame): NormalizedRectangle {
  const start = normalizeAnchor(
    { candleIndex: zone.startCandleIndex, price: zone.priceLow },
    frame,
  );
  const end = normalizeAnchor({ candleIndex: zone.endCandleIndex, price: zone.priceHigh }, frame);
  return { left: start.x, right: end.x, bottom: start.y, top: end.y };
}

function rectangleIntersectionOverUnion(
  left: NormalizedRectangle,
  right: NormalizedRectangle,
): number {
  const intersectionWidth = Math.max(
    0,
    Math.min(left.right, right.right) - Math.max(left.left, right.left),
  );
  const intersectionHeight = Math.max(
    0,
    Math.min(left.top, right.top) - Math.max(left.bottom, right.bottom),
  );
  const intersection = intersectionWidth * intersectionHeight;
  const leftArea = Math.max(0, left.right - left.left) * Math.max(0, left.top - left.bottom);
  const rightArea = Math.max(0, right.right - right.left) * Math.max(0, right.top - right.bottom);
  const union = leftArea + rightArea - intersection;
  if (union === 0) return leftArea === 0 && rightArea === 0 ? 1 : 0;
  return intersection / union;
}

function gradeZone(
  rubric: ZoneRubric,
  answer: Extract<ExerciseAnswer, { kind: 'zone' }>,
  context: ChartGradingContext | undefined,
): AttemptResult {
  if (!context) return invalid('chart-context-required');
  if (
    !zoneIsValid(rubric.target) ||
    !finite(rubric.minimumIntersectionOverUnion) ||
    rubric.minimumIntersectionOverUnion <= 0 ||
    rubric.minimumIntersectionOverUnion > 1
  ) {
    return invalid('invalid-rubric');
  }
  if (!zoneIsValid(answer.zone)) return invalid('invalid-answer');
  const cutoff = resolveCutoff(rubric.decisionCandleIndex, context);
  if (cutoff !== undefined && rubric.target.endCandleIndex > cutoff) {
    return invalid('rubric-uses-future-candle');
  }
  if (cutoff !== undefined && answer.zone.endCandleIndex > cutoff) {
    return invalid('answer-uses-future-candle');
  }
  const frame = normalizationFrame(context, rubric.decisionCandleIndex);
  if (!frame) return invalid('invalid-chart-context');
  const overlap = rectangleIntersectionOverUnion(
    normalizeZone(rubric.target, frame),
    normalizeZone(answer.zone, frame),
  );
  const correct = overlap >= rubric.minimumIntersectionOverUnion;
  return result(
    correct,
    overlap,
    correct ? 'correct' : 'zone-overlap-too-small',
    [
      { key: 'intersectionOverUnion', value: overlap },
      { key: 'minimumIntersectionOverUnion', value: rubric.minimumIntersectionOverUnion },
    ],
    rubric.misconceptionIds,
  );
}

function lineDistances(
  rubric: LineRubric,
  answer: LineAnswer,
  frame: NormalizationFrame,
  reversed: boolean,
): readonly [number, number] {
  const targetStart = normalizeAnchor(rubric.target.start, frame);
  const targetEnd = normalizeAnchor(rubric.target.end, frame);
  const answerStart = normalizeAnchor(reversed ? answer.line.end : answer.line.start, frame);
  const answerEnd = normalizeAnchor(reversed ? answer.line.start : answer.line.end, frame);
  return [
    ellipticalDistance(targetStart, answerStart, rubric.tolerance),
    ellipticalDistance(targetEnd, answerEnd, rubric.tolerance),
  ];
}

function gradeLine(
  rubric: LineRubric,
  answer: LineAnswer,
  context: ChartGradingContext | undefined,
): AttemptResult {
  if (!context) return invalid('chart-context-required');
  if (
    !toleranceIsValid(rubric.tolerance) ||
    !anchorIsValid(rubric.target.start) ||
    !anchorIsValid(rubric.target.end)
  ) {
    return invalid('invalid-rubric');
  }
  if (!anchorIsValid(answer.line.start) || !anchorIsValid(answer.line.end)) {
    return invalid('invalid-answer');
  }
  const cutoff = resolveCutoff(rubric.decisionCandleIndex, context);
  if (
    anchorUsesFuture(rubric.target.start, cutoff) ||
    anchorUsesFuture(rubric.target.end, cutoff)
  ) {
    return invalid('rubric-uses-future-candle');
  }
  if (anchorUsesFuture(answer.line.start, cutoff) || anchorUsesFuture(answer.line.end, cutoff)) {
    return invalid('answer-uses-future-candle');
  }
  const frame = normalizationFrame(context, rubric.decisionCandleIndex);
  if (!frame) return invalid('invalid-chart-context');

  const direct = lineDistances(rubric, answer, frame, false);
  const reverse =
    rubric.directionInvariant === true ? lineDistances(rubric, answer, frame, true) : undefined;
  const selected = reverse && reverse[0] + reverse[1] < direct[0] + direct[1] ? reverse : direct;
  const correct = selected.every((distance) => distance <= 1);
  const score = selected.reduce((total, distance) => total + clamp01(1 - distance), 0) / 2;
  return result(
    correct,
    score,
    correct ? 'correct' : 'line-outside-tolerance',
    [
      { key: 'startDistance', value: selected[0] },
      { key: 'endDistance', value: selected[1] },
    ],
    rubric.misconceptionIds,
  );
}

function numberMatches(actual: number, expected: number, rubric: RiskRubric): boolean {
  const absolute = rubric.tolerance.absolute ?? 0;
  const relative = rubric.tolerance.relative ?? 0;
  const allowed = Math.max(absolute, Math.abs(expected) * relative);
  return Math.abs(actual - expected) <= allowed;
}

function gradeRisk(
  rubric: RiskRubric,
  answer: Extract<ExerciseAnswer, { kind: 'risk' }>,
): AttemptResult {
  const expectedEntries = Object.entries(rubric.expected) as [RiskAnswerField, number][];
  if (
    expectedEntries.length === 0 ||
    (rubric.tolerance.absolute !== undefined &&
      (!finite(rubric.tolerance.absolute) || rubric.tolerance.absolute < 0)) ||
    (rubric.tolerance.relative !== undefined &&
      (!finite(rubric.tolerance.relative) || rubric.tolerance.relative < 0))
  ) {
    return invalid('invalid-rubric');
  }
  let matched = 0;
  for (const [field, expected] of expectedEntries) {
    const actual = answer.values[field];
    if (!finite(expected)) return invalid('invalid-rubric');
    if (actual !== undefined && finite(actual) && numberMatches(actual, expected, rubric)) {
      matched += 1;
    }
  }
  const score = matched / expectedEntries.length;
  const correct = matched === expectedEntries.length;
  return result(
    correct,
    score,
    correct ? 'correct' : 'risk-value-outside-tolerance',
    [
      { key: 'matchedValues', value: matched },
      { key: 'requiredValues', value: expectedEntries.length },
    ],
    rubric.misconceptionIds,
  );
}

export function normalizeScreenPoint(
  point: { readonly x: number; readonly y: number },
  plot: ScreenPlotBounds,
): NormalizedChartPoint | undefined {
  if (
    ![point.x, point.y, plot.left, plot.top, plot.width, plot.height].every(finite) ||
    plot.width <= 0 ||
    plot.height <= 0
  ) {
    return undefined;
  }
  return {
    x: (point.x - plot.left) / plot.width,
    // Screen Y grows downward while normalized chart price grows upward.
    y: 1 - (point.y - plot.top) / plot.height,
  };
}

export function gradeAnswer(
  rubric: AnswerRubric,
  answer: ExerciseAnswer,
  context?: ChartGradingContext,
): AttemptResult {
  if (rubric.kind !== answer.kind) {
    return invalid('answer-kind-mismatch', [
      { key: 'expectedKind', value: rubric.kind },
      { key: 'actualKind', value: answer.kind },
    ]);
  }

  switch (rubric.kind) {
    case 'multiple-choice': {
      if (rubric.acceptedOptionIds.length === 0) return invalid('invalid-rubric');
      const selected = (answer as Extract<ExerciseAnswer, { kind: 'multiple-choice' }>).optionId;
      const correct = rubric.acceptedOptionIds.includes(selected);
      return result(
        correct,
        correct ? 1 : 0,
        correct ? 'correct' : 'option-not-accepted',
        [],
        rubric.misconceptionIds,
      );
    }
    case 'selection': {
      const selected = new Set(
        unique((answer as Extract<ExerciseAnswer, { kind: 'selection' }>).selectedIds),
      );
      const expected = new Set(unique(rubric.expectedIds));
      if (expected.size === 0) return invalid('invalid-rubric');
      const matched = [...expected].filter((id) => selected.has(id)).length;
      const extras = [...selected].filter((id) => !expected.has(id)).length;
      const containsExpected = matched === expected.size;
      const correct =
        containsExpected &&
        (rubric.mode === 'contains' || rubric.allowExtraSelections === true || extras === 0);
      const unionSize = expected.size + selected.size - matched;
      const score = unionSize === 0 ? 1 : matched / unionSize;
      return result(
        correct,
        score,
        correct ? 'correct' : 'selection-mismatch',
        [
          { key: 'matchedSelections', value: matched },
          { key: 'extraSelections', value: extras },
          { key: 'symmetricDifference', value: symmetricDifferenceSize(expected, selected) },
        ],
        rubric.misconceptionIds,
      );
    }
    case 'sequence': {
      const actual = (answer as Extract<ExerciseAnswer, { kind: 'sequence' }>).orderedIds;
      if (rubric.expectedOrder.length === 0) return invalid('invalid-rubric');
      let positions = 0;
      for (let index = 0; index < rubric.expectedOrder.length; index += 1) {
        if (rubric.expectedOrder[index] === actual[index]) positions += 1;
      }
      const correct =
        actual.length === rubric.expectedOrder.length && positions === rubric.expectedOrder.length;
      return result(
        correct,
        positions / rubric.expectedOrder.length,
        correct ? 'correct' : 'sequence-order-mismatch',
        [{ key: 'correctPositions', value: positions }],
        rubric.misconceptionIds,
      );
    }
    case 'point':
      return gradePoint(rubric, answer as PointAnswer, context);
    case 'zone':
      return gradeZone(rubric, answer as Extract<ExerciseAnswer, { kind: 'zone' }>, context);
    case 'line':
      return gradeLine(rubric, answer as LineAnswer, context);
    case 'risk':
      return gradeRisk(rubric, answer as Extract<ExerciseAnswer, { kind: 'risk' }>);
    case 'label-placement': {
      if (rubric.targets.length === 0) return invalid('invalid-rubric');
      const placementAnswer = answer as Extract<ExerciseAnswer, { kind: 'label-placement' }>;
      const expectedIds = new Set(rubric.targets.map((target) => target.labelId));
      const placementIds = placementAnswer.placements.map((placement) => placement.labelId);
      if (
        expectedIds.size !== rubric.targets.length ||
        new Set(placementIds).size !== placementIds.length
      ) {
        return invalid('invalid-label-placement');
      }
      let matched = 0;
      for (const target of rubric.targets) {
        const placement = placementAnswer.placements.find(
          (candidate) => candidate.labelId === target.labelId,
        );
        if (!placement) continue;
        const pointResult = gradePoint(
          {
            kind: 'point',
            targets: [target.target],
            tolerance: rubric.tolerance,
            matching: 'all',
            decisionCandleIndex: rubric.decisionCandleIndex,
          },
          { kind: 'point', points: [placement.anchor] },
          context,
        );
        if (pointResult.correct) matched += 1;
      }
      const extras = placementIds.filter((id) => !expectedIds.has(id)).length;
      const correct = matched === rubric.targets.length && extras === 0;
      return result(
        correct,
        matched / rubric.targets.length,
        correct ? 'correct' : 'label-placement-mismatch',
        [
          { key: 'matchedLabels', value: matched },
          { key: 'requiredLabels', value: rubric.targets.length },
          { key: 'extraLabels', value: extras },
        ],
        rubric.misconceptionIds,
      );
    }
    case 'decision': {
      if (rubric.acceptedDecisions.length === 0) return invalid('invalid-rubric');
      const decisionAnswer = answer as Extract<ExerciseAnswer, { kind: 'decision' }>;
      const accepted = rubric.acceptedDecisions.includes(decisionAnswer.decision);
      const requiredReasons = new Set(rubric.requiredReasonIds ?? []);
      const actualReasons = new Set(decisionAnswer.reasonIds ?? []);
      const matchedReasons = [...requiredReasons].filter((reason) =>
        actualReasons.has(reason),
      ).length;
      const extraReasons = [...actualReasons].filter(
        (reason) => !requiredReasons.has(reason),
      ).length;
      const reasonsCorrect =
        matchedReasons === requiredReasons.size &&
        (rubric.allowExtraReasons === true || extraReasons === 0);
      const correct = accepted && reasonsCorrect;
      const reasonScore = requiredReasons.size === 0 ? 1 : matchedReasons / requiredReasons.size;
      const extraPenalty = rubric.allowExtraReasons === true ? 0 : Math.min(1, extraReasons * 0.25);
      const score = accepted ? (0.7 + 0.3 * reasonScore) * (1 - extraPenalty) : 0;
      return result(
        correct,
        score,
        correct ? 'correct' : accepted ? 'decision-reason-missing' : 'decision-not-accepted',
        [
          { key: 'matchedReasons', value: matchedReasons },
          { key: 'extraReasons', value: extraReasons },
        ],
        rubric.misconceptionIds,
      );
    }
    case 'capstone': {
      if (rubric.steps.length === 0) return invalid('invalid-rubric');
      const capstoneAnswer = answer as Extract<ExerciseAnswer, { kind: 'capstone' }>;
      const requiredStepIds = new Set(rubric.steps.map((step) => step.id));
      const submittedStepIds = capstoneAnswer.stepAnswers.map((step) => step.stepId);
      if (
        new Set(submittedStepIds).size !== submittedStepIds.length ||
        submittedStepIds.some((stepId) => !requiredStepIds.has(stepId))
      ) {
        return invalid('invalid-capstone-steps');
      }
      const answerByStep = new Map(
        capstoneAnswer.stepAnswers.map((stepAnswer) => [stepAnswer.stepId, stepAnswer.answer]),
      );
      const stepResults = rubric.steps.map((step) => {
        const stepAnswer = answerByStep.get(step.id);
        return stepAnswer ? gradeAnswer(step.rubric, stepAnswer, context) : undefined;
      });
      const completedSteps = stepResults.filter((stepResult) => stepResult !== undefined).length;
      const correctSteps = stepResults.filter((stepResult) => stepResult?.correct).length;
      const score =
        stepResults.reduce((sum, stepResult) => sum + (stepResult?.score ?? 0), 0) /
        rubric.steps.length;
      const correct = correctSteps === rubric.steps.length;
      const misconceptions = unique([
        ...(rubric.misconceptionIds ?? []),
        ...stepResults.flatMap((stepResult) => stepResult?.misconceptionIds ?? []),
      ]);
      return result(
        correct,
        score,
        correct
          ? 'correct'
          : completedSteps < rubric.steps.length
            ? 'capstone-incomplete'
            : 'capstone-step-mismatch',
        [
          { key: 'completedSteps', value: completedSteps },
          { key: 'correctSteps', value: correctSteps },
          { key: 'requiredSteps', value: rubric.steps.length },
        ],
        misconceptions,
      );
    }
  }
}
