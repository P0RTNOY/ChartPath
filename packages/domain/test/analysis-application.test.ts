import { describe, expect, it } from 'vitest';

import {
  resolveAnalysisApplication,
  type AnalysisApplicationDecision,
  type NoTradeDisposition,
} from '../src/index.js';

describe('analysis application decision', () => {
  it.each(['long', 'short'] as const)('matches an authored %s trade direction', (direction) => {
    expect(
      resolveAnalysisApplication({
        expected: { kind: 'trade', direction },
        learnerDecision: 'trade',
        learnerTradeDirection: direction,
      }),
    ).toEqual({
      expected: { kind: 'trade', direction },
      learner: { kind: 'trade', direction },
      alignment: 'matched',
      nextAction: 'paper-execution',
    });
  });

  it.each([
    'wait',
    'reject',
    'no-trade',
    'insufficient-evidence',
  ] as const satisfies readonly NoTradeDisposition[])(
    'preserves the distinct %s no-trade disposition',
    (disposition) => {
      expect(
        resolveAnalysisApplication({
          expected: { kind: 'no-trade', disposition },
          learnerDecision: disposition,
        }),
      ).toEqual({
        expected: { kind: 'no-trade', disposition },
        learner: { kind: 'no-trade', disposition },
        alignment: 'matched',
        nextAction: 'no-trade-review',
      });
    },
  );

  it.each([
    [{ kind: 'trade', direction: 'long' }, 'trade', 'short'],
    [{ kind: 'trade', direction: 'short' }, 'no-trade', undefined],
    [{ kind: 'no-trade', disposition: 'no-trade' }, 'trade', 'short'],
    [{ kind: 'no-trade', disposition: 'wait' }, 'reject', undefined],
  ] as const satisfies readonly [
    AnalysisApplicationDecision,
    'trade' | NoTradeDisposition,
    'long' | 'short' | undefined,
  ][])('returns a review action for a mismatched application', (expected, decision, direction) => {
    expect(
      resolveAnalysisApplication({
        expected,
        learnerDecision: decision,
        ...(direction === undefined ? {} : { learnerTradeDirection: direction }),
      }),
    ).toMatchObject({ alignment: 'mismatched', nextAction: 'review-analysis' });
  });

  it('leaves a missing learner decision unresolved', () => {
    expect(
      resolveAnalysisApplication({ expected: { kind: 'no-trade', disposition: 'no-trade' } }),
    ).toEqual({
      expected: { kind: 'no-trade', disposition: 'no-trade' },
      alignment: 'unresolved',
      nextAction: 'review-analysis',
    });
  });

  it('never guesses the direction of a directionless trade answer', () => {
    expect(
      resolveAnalysisApplication({
        expected: { kind: 'trade', direction: 'long' },
        learnerDecision: 'trade',
      }),
    ).toEqual({
      expected: { kind: 'trade', direction: 'long' },
      alignment: 'unresolved',
      nextAction: 'review-analysis',
    });
  });

  it('does not mutate authored decision input', () => {
    const expected: AnalysisApplicationDecision = Object.freeze({
      kind: 'trade',
      direction: 'short',
    });
    const resolved = resolveAnalysisApplication({
      expected,
      learnerDecision: 'trade',
      learnerTradeDirection: 'short',
    });
    expect(resolved.expected).toEqual(expected);
    expect(resolved.expected).not.toBe(expected);
  });
});
