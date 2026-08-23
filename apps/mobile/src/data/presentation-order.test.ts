import { exercises } from '@chartpath/content';

import { stablePresentationOrder } from './presentation-order';

describe('stablePresentationOrder', () => {
  it('is deterministic and never leaves a non-trivial list untouched', () => {
    const choices = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const first = stablePresentationOrder(choices, 'exercise:test');
    expect(stablePresentationOrder(choices, 'exercise:test')).toEqual(first);
    expect(first).not.toEqual(choices);
  });

  it('breaks catalog-wide answer-position patterns without reading rubrics', () => {
    const multipleChoice = exercises.filter(
      (exercise) => exercise.rubric.kind === 'multiple-choice',
    );
    const acceptedFirst = multipleChoice.filter((exercise) => {
      if (exercise.rubric.kind !== 'multiple-choice') return false;
      const first = stablePresentationOrder(
        exercise.options ?? [],
        `${exercise.id}:multiple-choice`,
      )[0];
      return first ? exercise.rubric.acceptedOptionIds.includes(first.id) : false;
    });
    expect(acceptedFirst.length).toBeLessThan(multipleChoice.length / 2);

    for (const exercise of exercises) {
      if (exercise.rubric.kind === 'sequence') {
        expect(
          stablePresentationOrder(exercise.options ?? [], `${exercise.id}:sequence`).map(
            (option) => option.id,
          ),
        ).not.toEqual(exercise.rubric.expectedOrder);
      }
      if (exercise.rubric.kind === 'selection') {
        const expectedIds = exercise.rubric.expectedIds;
        const presented = stablePresentationOrder(
          exercise.options ?? [],
          `${exercise.id}:selection:order`,
        );
        const leadingBlockIsEntirelyCorrect = presented
          .slice(0, expectedIds.length)
          .every((option) => expectedIds.includes(option.id));
        expect(leadingBlockIsEntirelyCorrect).toBe(false);
      }
    }
  });
});
