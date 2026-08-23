import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  gradeAnswer,
  normalizeScreenPoint,
  type AnswerRubric,
  type ChartGradingContext,
  type ExerciseAnswer,
  type OhlcvCandle,
} from '../src/index.js';

function candle(index: number, low = 90, high = 110): OhlcvCandle {
  return {
    index,
    timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    open: 100,
    high,
    low,
    close: 101,
    volume: 1_000,
  };
}

const context: ChartGradingContext = {
  candles: Array.from({ length: 10 }, (_, index) => candle(index)),
  decisionCandleIndex: 9,
};

describe('identifier-based graders', () => {
  it.each([
    {
      name: 'multiple choice accepted answer',
      rubric: { kind: 'multiple-choice', acceptedOptionIds: ['wait'] },
      answer: { kind: 'multiple-choice', optionId: 'wait' },
      correct: true,
    },
    {
      name: 'multiple choice rejected answer',
      rubric: { kind: 'multiple-choice', acceptedOptionIds: ['wait'] },
      answer: { kind: 'multiple-choice', optionId: 'trade' },
      correct: false,
    },
    {
      name: 'exact selection ignores duplicate taps',
      rubric: { kind: 'selection', expectedIds: ['hh', 'hl'], mode: 'exact' },
      answer: { kind: 'selection', selectedIds: ['hh', 'hl', 'hl'] },
      correct: true,
    },
    {
      name: 'contains selection permits supporting evidence',
      rubric: { kind: 'selection', expectedIds: ['close'], mode: 'contains' },
      answer: { kind: 'selection', selectedIds: ['close', 'volume'] },
      correct: true,
    },
    {
      name: 'uncertainty is an ordinary curated answer',
      rubric: {
        kind: 'selection',
        expectedIds: ['insufficient-evidence'],
        mode: 'exact',
      },
      answer: { kind: 'selection', selectedIds: ['insufficient-evidence'] },
      correct: true,
    },
  ] as const)('$name', ({ rubric, answer, correct }) => {
    expect(gradeAnswer(rubric, answer).correct).toBe(correct);
  });

  it('grades the canonical analysis workflow as an exact sequence', () => {
    const expectedOrder = [
      'context',
      'structure',
      'level',
      'setup',
      'confirmation',
      'entry',
      'invalidation',
      'position-size',
      'target',
      'management',
      'review',
    ];
    const correct = gradeAnswer(
      { kind: 'sequence', expectedOrder },
      { kind: 'sequence', orderedIds: expectedOrder },
    );
    const wrong = gradeAnswer(
      { kind: 'sequence', expectedOrder },
      {
        kind: 'sequence',
        orderedIds: [
          ...expectedOrder.slice(0, 4),
          'entry',
          'confirmation',
          ...expectedOrder.slice(6),
        ],
      },
    );
    expect(correct).toMatchObject({ correct: true, score: 1 });
    expect(wrong.correct).toBe(false);
    expect(wrong.score).toBeGreaterThan(0);
    expect(wrong.score).toBeLessThan(1);
  });

  it('rejects an answer kind that does not match the rubric', () => {
    expect(
      gradeAnswer(
        { kind: 'multiple-choice', acceptedOptionIds: ['wait'] },
        { kind: 'decision', decision: 'wait' },
      ),
    ).toMatchObject({ correct: false, score: 0, feedbackCode: 'answer-kind-mismatch' });
  });
});

describe('chart graders', () => {
  it('matches all point targets once and rejects unrelated extra points', () => {
    const rubric = {
      kind: 'point',
      targets: [
        { candleIndex: 2, price: 100 },
        { candleIndex: 7, price: 104 },
      ],
      tolerance: { horizontal: 0.12, vertical: 0.12 },
      matching: 'all',
    } as const;
    expect(
      gradeAnswer(
        rubric,
        {
          kind: 'point',
          points: [
            { candleIndex: 2, price: 100 },
            { candleIndex: 7, price: 104 },
          ],
        },
        context,
      ).correct,
    ).toBe(true);
    expect(
      gradeAnswer(
        rubric,
        {
          kind: 'point',
          points: [
            { candleIndex: 2, price: 100 },
            { candleIndex: 7, price: 104 },
            { candleIndex: 9, price: 90 },
          ],
        },
        context,
      ),
    ).toMatchObject({ correct: false, feedbackCode: 'point-outside-tolerance' });
  });

  it('grades support/resistance zones by meaningful overlap', () => {
    const rubric = {
      kind: 'zone',
      target: { startCandleIndex: 1, endCandleIndex: 8, priceLow: 98, priceHigh: 102 },
      minimumIntersectionOverUnion: 0.5,
    } as const;
    const tolerant = gradeAnswer(
      rubric,
      {
        kind: 'zone',
        zone: { startCandleIndex: 1, endCandleIndex: 8, priceLow: 97.5, priceHigh: 102.5 },
      },
      context,
    );
    const tooBroad = gradeAnswer(
      rubric,
      {
        kind: 'zone',
        zone: { startCandleIndex: 0, endCandleIndex: 9, priceLow: 90, priceHigh: 110 },
      },
      context,
    );
    expect(tolerant.correct).toBe(true);
    expect(tooBroad).toMatchObject({ correct: false, feedbackCode: 'zone-overlap-too-small' });
  });

  it('can treat a trendline drawn in either direction as equivalent', () => {
    const rubric = {
      kind: 'line',
      target: {
        start: { candleIndex: 1, price: 94 },
        end: { candleIndex: 8, price: 101 },
      },
      tolerance: { horizontal: 0.05, vertical: 0.05 },
      directionInvariant: true,
    } as const;
    expect(
      gradeAnswer(
        rubric,
        {
          kind: 'line',
          line: {
            start: { candleIndex: 8, price: 101 },
            end: { candleIndex: 1, price: 94 },
          },
        },
        context,
      ),
    ).toMatchObject({ correct: true, score: 1 });
  });

  it('rejects any answer or rubric that reaches beyond the decision candle', () => {
    const cutoffContext = { ...context, decisionCandleIndex: 4 };
    expect(
      gradeAnswer(
        {
          kind: 'point',
          targets: [{ candleIndex: 2, price: 100 }],
          tolerance: { horizontal: 0.1, vertical: 0.1 },
          matching: 'all',
        },
        { kind: 'point', points: [{ candleIndex: 5, price: 100 }] },
        cutoffContext,
      ).feedbackCode,
    ).toBe('answer-uses-future-candle');
    expect(
      gradeAnswer(
        {
          kind: 'line',
          target: {
            start: { candleIndex: 1, price: 95 },
            end: { candleIndex: 6, price: 100 },
          },
          tolerance: { horizontal: 0.1, vertical: 0.1 },
        },
        {
          kind: 'line',
          line: {
            start: { candleIndex: 1, price: 95 },
            end: { candleIndex: 4, price: 100 },
          },
        },
        cutoffContext,
      ).feedbackCode,
    ).toBe('rubric-uses-future-candle');
  });

  it('does not let future candle ranges change a current point grade', () => {
    const rubric = {
      kind: 'point',
      targets: [{ candleIndex: 2, price: 100 }],
      tolerance: { horizontal: 0.1, vertical: 0.1 },
      matching: 'all',
      decisionCandleIndex: 4,
    } as const;
    const answer = { kind: 'point', points: [{ candleIndex: 2, price: 100.5 }] } as const;
    const ordinaryFuture = Array.from({ length: 5 }, (_, index) => candle(index + 5));
    const extremeFuture = Array.from({ length: 5 }, (_, index) =>
      candle(index + 5, -100_000, 100_000),
    );
    const visible = Array.from({ length: 5 }, (_, index) => candle(index));
    expect(gradeAnswer(rubric, answer, { candles: [...visible, ...ordinaryFuture] })).toEqual(
      gradeAnswer(rubric, answer, { candles: [...visible, ...extremeFuture] }),
    );
  });

  it('normalizes identical plot locations at phone and tablet sizes', () => {
    const phone = normalizeScreenPoint(
      { x: 176, y: 168 },
      { left: 16, top: 48, width: 320, height: 240 },
    );
    const tablet = normalizeScreenPoint(
      { x: 536, y: 348 },
      { left: 24, top: 60, width: 1_024, height: 576 },
    );
    expect(phone).toEqual({ x: 0.5, y: 0.5 });
    expect(tablet).toEqual({ x: 0.5, y: 0.5 });
  });

  it('maps the visual top to high normalized price and the bottom to low price', () => {
    const plot = { left: 10, top: 20, width: 200, height: 100 };
    expect(normalizeScreenPoint({ x: 10, y: 20 }, plot)).toEqual({ x: 0, y: 1 });
    expect(normalizeScreenPoint({ x: 210, y: 120 }, plot)).toEqual({ x: 1, y: 0 });
  });
});

describe('risk and decision graders', () => {
  it('accepts numeric risk answers within absolute or relative tolerance', () => {
    const rubric = {
      kind: 'risk',
      expected: { positionSize: 40, riskMultiple: 2 },
      tolerance: { absolute: 0.01, relative: 0.01 },
    } as const;
    expect(
      gradeAnswer(rubric, {
        kind: 'risk',
        values: { positionSize: 40, riskMultiple: 2.019 },
      }).correct,
    ).toBe(true);
    expect(
      gradeAnswer(rubric, {
        kind: 'risk',
        values: { positionSize: 44, riskMultiple: 2 },
      }),
    ).toMatchObject({ correct: false, score: 0.5 });
  });

  it.each(['wait', 'no-trade', 'insufficient-evidence'] as const)(
    'treats %s as a first-class correct decision',
    (decision) => {
      expect(
        gradeAnswer(
          { kind: 'decision', acceptedDecisions: [decision] },
          { kind: 'decision', decision },
        ).correct,
      ).toBe(true);
    },
  );

  it('requires the curated reason without changing the accepted decision', () => {
    const rubric = {
      kind: 'decision',
      acceptedDecisions: ['wait'],
      requiredReasonIds: ['confirmation-missing'],
    } as const;
    expect(gradeAnswer(rubric, { kind: 'decision', decision: 'wait' })).toMatchObject({
      correct: false,
      feedbackCode: 'decision-reason-missing',
    });
    expect(
      gradeAnswer(rubric, {
        kind: 'decision',
        decision: 'wait',
        reasonIds: ['confirmation-missing'],
      }).correct,
    ).toBe(true);
  });
});

describe('grading properties', () => {
  it('always returns a bounded score for arbitrary selection sets', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string(), { minLength: 1, maxLength: 20 }),
        fc.array(fc.string(), { maxLength: 30 }),
        (expectedIds, selectedIds) => {
          const outcome = gradeAnswer(
            { kind: 'selection', expectedIds, mode: 'exact' },
            { kind: 'selection', selectedIds },
          );
          expect(outcome.score).toBeGreaterThanOrEqual(0);
          expect(outcome.score).toBeLessThanOrEqual(1);
        },
      ),
    );
  });

  it('screen normalization is scale invariant', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 100, max: 2_000, noNaN: true }),
        fc.double({ min: 100, max: 2_000, noNaN: true }),
        (xRatio, yRatio, width, height) => {
          const normalized = normalizeScreenPoint(
            { x: 12 + xRatio * width, y: 20 + yRatio * height },
            { left: 12, top: 20, width, height },
          );
          expect(normalized?.x).toBeCloseTo(xRatio, 10);
          expect(normalized?.y).toBeCloseTo(1 - yRatio, 10);
        },
      ),
    );
  });

  it('future prices cannot influence grading at a cutoff', () => {
    fc.assert(
      fc.property(fc.double({ min: 1_000, max: 100_000, noNaN: true }), (futureMagnitude) => {
        const rubric: AnswerRubric = {
          kind: 'point',
          targets: [{ candleIndex: 2, price: 100 }],
          tolerance: { horizontal: 0.2, vertical: 0.2 },
          matching: 'all',
          decisionCandleIndex: 4,
        };
        const answer: ExerciseAnswer = {
          kind: 'point',
          points: [{ candleIndex: 2, price: 100 }],
        };
        const visible = Array.from({ length: 5 }, (_, index) => candle(index));
        const baseline = gradeAnswer(rubric, answer, { candles: visible });
        const withFuture = gradeAnswer(rubric, answer, {
          candles: [...visible, candle(5, -futureMagnitude, futureMagnitude)],
        });
        expect(withFuture).toEqual(baseline);
      }),
    );
  });
});
