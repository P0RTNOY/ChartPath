import { fireEvent, render } from '@testing-library/react-native';

import { exercises, type ContentExercise, type WorkflowStepId } from '@chartpath/content';
import {
  gradeAnswer,
  type AtomicAnswerRubric,
  type AtomicExerciseAnswer,
  type CapstoneAnswer,
} from '@chartpath/domain';
import { ChartPathThemeProvider } from '@chartpath/ui';

import {
  CAPSTONE_STEP_LABELS,
  CapstoneInteraction,
  gradeCapstoneAnswers,
  type CapstoneAnswerMap,
  type CapstoneExercise,
} from '../capstone-interaction';

function isCapstoneExercise(exercise: ContentExercise): exercise is CapstoneExercise {
  return exercise.rubric.kind === 'capstone' && exercise.capstoneSteps?.length === 11;
}

function findCapstone(): CapstoneExercise {
  const exercise = exercises.find(isCapstoneExercise);
  if (!exercise) throw new Error('The content catalog must include an eleven-stage capstone.');
  return exercise;
}

function correctAnswer(rubric: AtomicAnswerRubric): AtomicExerciseAnswer {
  switch (rubric.kind) {
    case 'multiple-choice':
      return { kind: 'multiple-choice', optionId: rubric.acceptedOptionIds[0]! };
    case 'selection':
      return { kind: 'selection', selectedIds: rubric.expectedIds };
    case 'sequence':
      return { kind: 'sequence', orderedIds: rubric.expectedOrder };
    case 'point':
      return { kind: 'point', points: rubric.targets };
    case 'zone':
      return { kind: 'zone', zone: rubric.target };
    case 'line':
      return { kind: 'line', line: rubric.target };
    case 'risk':
      return { kind: 'risk', values: rubric.expected };
    case 'decision':
      return {
        kind: 'decision',
        decision: rubric.acceptedDecisions[0]!,
        reasonIds: rubric.requiredReasonIds,
      };
    case 'label-placement':
      return {
        kind: 'label-placement',
        placements: rubric.targets.map((target) => ({
          labelId: target.labelId,
          anchor: target.target,
        })),
      };
  }
}

function correctCapstoneAnswers(exercise: ContentExercise): CapstoneAnswerMap {
  const answers: Partial<Record<WorkflowStepId, AtomicExerciseAnswer>> = {};
  for (const step of exercise.capstoneSteps ?? []) answers[step.id] = correctAnswer(step.rubric);
  return answers;
}

function renderCapstone(
  exercise: CapstoneExercise,
  props: Partial<React.ComponentProps<typeof CapstoneInteraction>> = {},
) {
  return render(
    <ChartPathThemeProvider direction="rtl" mode="light">
      <CapstoneInteraction answer={null} exercise={exercise} onChange={jest.fn()} {...props} />
    </ChartPathThemeProvider>,
  );
}

describe('CapstoneInteraction', () => {
  it('grades all eleven stage answers independently and returns a complete aggregate', () => {
    const exercise = findCapstone();
    const result = gradeCapstoneAnswers(exercise, correctCapstoneAnswers(exercise));

    expect(result).toMatchObject({
      exerciseId: exercise.id,
      answer: expect.objectContaining({ kind: 'capstone' }),
      complete: true,
      allCorrect: true,
      answeredSteps: 11,
      correctSteps: 11,
      score: 1,
    });
    expect(result.steps).toHaveLength(11);
    expect(result.steps.every((step) => step.complete && step.result?.correct)).toBe(true);
    expect(result.answer?.stepAnswers.map((step) => step.stepId)).toEqual(
      exercise.capstoneSteps.map((step) => step.id),
    );
    expect(gradeAnswer(exercise.rubric, result.answer!).correct).toBe(true);
  });

  it('renders every canonical stage in Hebrew without revealing correctness', async () => {
    const screen = await renderCapstone(findCapstone());

    for (const label of Object.values(CAPSTONE_STEP_LABELS)) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('0/11')).toBeTruthy();
    expect(screen.queryByText('דורש תיקון')).toBeNull();
    expect(screen.queryByText('נכון')).toBeNull();
  });

  it('retains an independently graded selection when the learner leaves and edits a stage', async () => {
    const onChange = jest.fn();
    const screen = await renderCapstone(findCapstone(), { onChange });

    await fireEvent.press(screen.getByRole('checkbox', { name: 'המגמה השבועית עולה' }));
    await fireEvent.press(
      screen.getByRole('checkbox', { name: 'הרעיון הוא מכירה בחסר נגד המגמה' }),
    );

    const [domainAnswer, aggregate] = onChange.mock.calls.at(-1)!;
    expect(domainAnswer).toBeNull();
    expect(aggregate).toMatchObject({ answeredSteps: 1, correctSteps: 1 });
    expect(aggregate.steps[0]).toMatchObject({ stepId: 'context', complete: true });

    await fireEvent.press(screen.getByRole('button', { name: /שלב 2: מבנה/ }));
    await fireEvent.press(screen.getByRole('button', { name: /שלב 1: הקשר/ }));

    expect(screen.getByRole('checkbox', { name: 'המגמה השבועית עולה' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'הרעיון הוא מכירה בחסר נגד המגמה' })).toBeChecked();
  });

  it('does not inject a required reason when a decision is selected', async () => {
    const onChange = jest.fn();
    const screen = await renderCapstone(findCapstone(), { onChange });

    await fireEvent.press(screen.getByRole('button', { name: /שלב 10: ניהול/ }));
    await fireEvent.press(screen.getByRole('radio', { name: 'אין עסקה ואין פוזיציה לניהול' }));

    const [decisionOnly, incompleteAggregate] = onChange.mock.calls.at(-1)!;
    expect(decisionOnly).toBeNull();
    expect(incompleteAggregate.steps[9]).toMatchObject({
      stepId: 'management',
      answer: { kind: 'decision', decision: 'no-trade', reasonIds: [] },
      complete: false,
      result: null,
    });

    await fireEvent.press(screen.getByRole('checkbox', { name: 'לא נפתחה פוזיציה לאחר הפסילה' }));

    const [withReason, gradedAggregate] = onChange.mock.calls.at(-1)!;
    expect(withReason).toBeNull();
    expect(gradedAggregate.steps[9]).toMatchObject({
      stepId: 'management',
      answer: {
        kind: 'decision',
        decision: 'no-trade',
        reasonIds: ['no-open-position'],
      },
      complete: true,
      result: expect.objectContaining({ correct: true }),
    });
  });

  it('collects numeric risk fields in explicit LTR inputs and grades the stage', async () => {
    const onChange = jest.fn();
    const screen = await renderCapstone(findCapstone(), { onChange });

    await fireEvent.press(screen.getByRole('button', { name: /שלב 8: גודל פוזיציה/ }));
    const accountRisk = screen.getByLabelText('סיכון חשבון');
    expect(accountRisk).toHaveStyle({ direction: 'ltr', writingDirection: 'ltr' });

    await fireEvent.changeText(accountRisk, '600');
    await fireEvent.changeText(screen.getByLabelText('סיכון ליחידה'), '11');
    await fireEvent.changeText(screen.getByLabelText('מספר יחידות'), '54');

    const [answer, aggregate] = onChange.mock.calls.at(-1)!;
    expect(answer).toBeNull();
    expect(aggregate.steps[7]).toMatchObject({
      stepId: 'position-size',
      answer: {
        kind: 'risk',
        values: { accountRisk: 600, perUnitRisk: 11, positionSize: 54 },
      },
      complete: true,
      result: expect.objectContaining({ correct: true }),
    });
  });

  it('labels stop distance as an absolute price unit in a capstone risk stage', async () => {
    const source = findCapstone();
    const first = source.capstoneSteps![0]!;
    const exercise: CapstoneExercise = {
      ...source,
      capstoneSteps: source.capstoneSteps!.map((step, index) =>
        index === 0
          ? {
              ...first,
              rubric: {
                kind: 'risk',
                expected: { stopDistance: 4.7 },
                tolerance: { absolute: 0.01 },
              },
            }
          : step,
      ),
    };
    const screen = await renderCapstone(exercise);

    expect(screen.getByText('מרחק עצירה')).toBeTruthy();
    expect(screen.getByText('₪')).toBeTruthy();
    expect(screen.queryByText('%')).toBeNull();
  });

  it('starts a sequence out of order and lets the learner revise it to the rubric order', async () => {
    const source = findCapstone();
    const exercise: CapstoneExercise = {
      ...source,
      capstoneSteps: source.capstoneSteps!.map((step, index) =>
        index === 0
          ? { ...step, rubric: { kind: 'sequence', expectedOrder: ['a', 'b', 'c'] } }
          : step,
      ),
    };
    const onChange = jest.fn();
    const screen = await renderCapstone(exercise, {
      onChange,
      presentation: {
        context: {
          options: [
            { id: 'a', labelHe: 'ראשון' },
            { id: 'b', labelHe: 'שני' },
            { id: 'c', labelHe: 'שלישי' },
          ],
        },
      },
    });

    await fireEvent.press(screen.getByRole('button', { name: 'אישור הסדר' }));
    expect(onChange.mock.calls.at(-1)![0]).toBeNull();
    const initialOrder = onChange.mock.calls.at(-1)![1].steps[0].answer.orderedIds;
    expect(initialOrder).not.toEqual(['a', 'b', 'c']);
    expect(onChange.mock.calls.at(-1)![1].steps[0].result.correct).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'העברת ראשון למעלה' }));
    await fireEvent.press(screen.getByRole('button', { name: 'העברת ראשון למעלה' }));
    await fireEvent.press(screen.getByRole('button', { name: 'העברת שני למעלה' }));

    expect(onChange.mock.calls.at(-1)![1].steps[0].answer.orderedIds).toEqual(['a', 'b', 'c']);
    expect(onChange.mock.calls.at(-1)![1].steps[0].result.correct).toBe(true);
  });

  it('never synthesizes a missing accepted choice from a rubric ID', async () => {
    const source = findCapstone();
    const first = source.capstoneSteps![0]!;
    const exercise: CapstoneExercise = {
      ...source,
      capstoneSteps: source.capstoneSteps!.map((step, index) =>
        index === 0
          ? {
              ...first,
              options: first.options?.filter((option) => option.id !== 'weekly-uptrend'),
            }
          : step,
      ),
    };
    const screen = await renderCapstone(exercise);

    expect(screen.queryByText('weekly-uptrend')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: 'weekly-uptrend' })).toBeNull();
  });

  it('emits a canonical domain answer only when the eleventh stage becomes complete', async () => {
    const exercise = findCapstone();
    const completeAnswers = correctCapstoneAnswers(exercise);
    const partialAnswer: CapstoneAnswer = {
      kind: 'capstone',
      stepAnswers: exercise.capstoneSteps
        .filter((step) => step.id !== 'management')
        .map((step) => ({ stepId: step.id, answer: completeAnswers[step.id]! })),
    };
    const onChange = jest.fn();
    const screen = await renderCapstone(exercise, {
      answer: partialAnswer,
      onChange,
    });

    expect(screen.getByText('10/11')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /שלב 10: ניהול/ }));
    await fireEvent.press(screen.getByRole('radio', { name: 'אין עסקה ואין פוזיציה לניהול' }));
    expect(onChange.mock.calls.at(-1)![0]).toBeNull();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'לא נפתחה פוזיציה לאחר הפסילה' }));

    const [domainAnswer, aggregate] = onChange.mock.calls.at(-1)!;
    expect(domainAnswer).toMatchObject({ kind: 'capstone' });
    expect(domainAnswer.stepAnswers).toHaveLength(11);
    expect(gradeAnswer(exercise.rubric, domainAnswer).correct).toBe(true);
    expect(aggregate).toMatchObject({
      complete: true,
      allCorrect: true,
      answeredSteps: 11,
      correctSteps: 11,
    });
  });
});
