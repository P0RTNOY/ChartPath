import type { AttemptResult, ExerciseAnswer } from '@chartpath/domain';

import { feedbackAnswerIds, matchingAlternativeExplanation } from './feedback-answer-ids';

function result(correct: boolean, feedbackCode: string): AttemptResult {
  return {
    correct,
    feedbackCode,
    score: correct ? 1 : 0,
    details: [],
    misconceptionIds: [],
    graderVersion: 'test',
  };
}

describe('feedbackAnswerIds', () => {
  it('collects reachable choice and reason IDs from nested capstone answers', () => {
    const answer: ExerciseAnswer = {
      kind: 'capstone',
      stepAnswers: [
        {
          stepId: 'setup',
          answer: {
            kind: 'selection',
            selectedIds: ['confirmed-head-and-shoulders'],
          },
        },
        {
          stepId: 'management',
          answer: {
            kind: 'decision',
            decision: 'trade',
            optionId: 'trade-anyway',
            reasonIds: ['pattern-name-is-enough'],
          },
        },
      ],
    };

    expect(feedbackAnswerIds(answer)).toEqual([
      'confirmed-head-and-shoulders',
      'trade-anyway',
      'pattern-name-is-enough',
    ]);
  });

  it('returns no feedback IDs for absent or geometry-only answers', () => {
    expect(feedbackAnswerIds(null)).toEqual([]);
    expect(feedbackAnswerIds({ kind: 'point', points: [] })).toEqual([]);
    expect(feedbackAnswerIds({ kind: 'sequence', orderedIds: ['b', 'a'] })).toEqual([]);
  });

  it('matches a grader-code explanation for a non-discrete wrong answer', () => {
    const explanation = {
      feedbackCode: 'risk-value-outside-tolerance',
      explanationHe: 'יש לכלול את העלות ליחידה.',
    };
    expect(
      matchingAlternativeExplanation(
        [explanation],
        { kind: 'risk', values: { positionSize: 200 } },
        result(false, 'risk-value-outside-tolerance'),
      ),
    ).toBe(explanation);
  });

  it('never shows alternative feedback for a correct sequence', () => {
    expect(
      matchingAlternativeExplanation(
        [{ feedbackCode: 'sequence-order-mismatch', explanationHe: 'סדר שגוי' }],
        { kind: 'sequence', orderedIds: ['a', 'b'] },
        result(true, 'correct'),
      ),
    ).toBeUndefined();
  });
});
