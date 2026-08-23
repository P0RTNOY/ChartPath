import type { AlternativeExplanation, AttemptResult, ExerciseAnswer } from '@chartpath/domain';

/** Returns every authored answer ID that can select misconception-specific feedback. */
export function feedbackAnswerIds(answer: ExerciseAnswer | null): readonly string[] {
  if (!answer) return [];

  switch (answer.kind) {
    case 'multiple-choice':
      return [answer.optionId];
    case 'selection':
      return answer.selectedIds;
    case 'sequence':
      // Every valid sequence contains the same IDs, so an ID cannot identify an ordering mistake.
      return [];
    case 'decision':
      return [answer.optionId ?? answer.decision, ...(answer.reasonIds ?? [])];
    case 'capstone':
      return answer.stepAnswers.flatMap((step) => feedbackAnswerIds(step.answer));
    case 'point':
    case 'zone':
    case 'line':
    case 'risk':
    case 'label-placement':
      return [];
  }
}

export function matchingAlternativeExplanation(
  alternatives: readonly AlternativeExplanation[],
  answer: ExerciseAnswer | null,
  result: AttemptResult | null,
): AlternativeExplanation | undefined {
  if (!result || result.correct) return undefined;
  const answerIds = feedbackAnswerIds(answer);
  return alternatives.find(
    (alternative) =>
      (alternative.answerId !== undefined && answerIds.includes(alternative.answerId)) ||
      (alternative.feedbackCode !== undefined && alternative.feedbackCode === result.feedbackCode),
  );
}
