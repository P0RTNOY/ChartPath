import { useState, type ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { WORKFLOW_STEP_IDS } from '@chartpath/content';
import type { CapstoneStep, ContentExercise, WorkflowStepId } from '@chartpath/content';
import {
  gradeAnswer,
  type AtomicExerciseAnswer,
  type AttemptResult,
  type CapstoneAnswer,
  type CapstoneRubric,
  type RiskAnswerField,
  type TradeDecision,
} from '@chartpath/domain';
import {
  Badge,
  Button,
  Card,
  Heading,
  LtrText,
  ProgressBar,
  UiText,
  useTheme,
} from '@chartpath/ui';

import { Glyph } from './glyph';
import { stablePresentationOrder } from '../data/presentation-order';

export const CAPSTONE_STEP_LABELS: Readonly<Record<WorkflowStepId, string>> = {
  context: 'הקשר',
  structure: 'מבנה',
  level: 'רמה',
  setup: 'תצורה',
  confirmation: 'אישור',
  entry: 'כניסה',
  invalidation: 'ביטול תוקף',
  'position-size': 'גודל פוזיציה',
  target: 'יעד',
  management: 'ניהול',
  review: 'תחקור',
};

export interface CapstoneChoice {
  readonly id: string;
  readonly labelHe: string;
  readonly labelEn?: string;
}

export interface CapstoneStepPresentation {
  readonly options?: readonly CapstoneChoice[];
  readonly reasonOptions?: readonly CapstoneChoice[];
}

export type CapstonePresentationCatalog = Partial<
  Readonly<Record<WorkflowStepId, CapstoneStepPresentation>>
>;

export type CapstoneAnswerMap = Partial<Readonly<Record<WorkflowStepId, AtomicExerciseAnswer>>>;

export type CapstoneStepStatus = 'draft' | 'submitted' | 'invalidated' | 'finalized';

export type CapstoneStepStatusMap = Partial<Readonly<Record<WorkflowStepId, CapstoneStepStatus>>>;

export interface CapstoneStepResult {
  readonly stepId: WorkflowStepId;
  readonly answer: AtomicExerciseAnswer | null;
  readonly complete: boolean;
  readonly result: AttemptResult | null;
}

export interface CapstoneAggregateResult {
  readonly exerciseId: string;
  /** Canonical domain answer once every stage is complete; otherwise null. */
  readonly answer: CapstoneAnswer | null;
  readonly complete: boolean;
  readonly allCorrect: boolean;
  readonly answeredSteps: number;
  readonly correctSteps: number;
  /** Mean of all eleven stage scores; missing/incomplete stages contribute zero. */
  readonly score: number;
  readonly steps: readonly CapstoneStepResult[];
}

export interface CapstoneCustomStepRenderProps {
  readonly step: CapstoneStep;
  readonly answer: AtomicExerciseAnswer | null;
  readonly disabled: boolean;
  readonly onAnswer: (answer: AtomicExerciseAnswer | null) => void;
}

export type CapstoneExercise = ContentExercise & {
  readonly rubric: CapstoneRubric;
  readonly capstoneSteps: readonly CapstoneStep[];
};

export interface CapstoneInteractionProps {
  readonly exercise: CapstoneExercise;
  readonly answer: CapstoneAnswer | null;
  /** Optional controlled draft state used by resumable guided-analysis sessions. */
  readonly partialAnswers?: CapstoneAnswerMap;
  /** Receives every controlled or uncontrolled partial-answer edit. */
  readonly onPartialAnswersChange?: (
    answers: CapstoneAnswerMap,
    aggregate: CapstoneAggregateResult,
  ) => void;
  readonly activeStepId?: WorkflowStepId;
  readonly onActiveStepChange?: (stepId: WorkflowStepId) => void;
  readonly stepStatuses?: CapstoneStepStatusMap;
  readonly presentation?: CapstonePresentationCatalog;
  readonly disabled?: boolean;
  /** Emits null until all stages are complete, plus the useful partial aggregate on every edit. */
  readonly onChange: (answer: CapstoneAnswer | null, aggregate: CapstoneAggregateResult) => void;
  /** Explicitly submits only the visible, structurally complete stage. */
  readonly onSubmitStep?: (
    stepId: WorkflowStepId,
    answer: AtomicExerciseAnswer,
    result: AttemptResult,
  ) => void;
  readonly renderCustomStep?: (props: CapstoneCustomStepRenderProps) => ReactNode;
  readonly testID?: string;
}

const decisionChoices: readonly CapstoneChoice[] = [
  { id: 'trade', labelHe: 'תרחיש לביצוע', labelEn: 'Trade' },
  { id: 'wait', labelHe: 'להמתין', labelEn: 'Wait' },
  { id: 'reject', labelHe: 'לדחות את התצורה', labelEn: 'Reject' },
  { id: 'no-trade', labelHe: 'אין עסקה', labelEn: 'No trade' },
  { id: 'insufficient-evidence', labelHe: 'אין מספיק ראיות', labelEn: 'Insufficient evidence' },
];

const decisionIds = new Set<TradeDecision>(
  decisionChoices.map((choice) => choice.id as TradeDecision),
);

const riskLabels: Readonly<
  Record<RiskAnswerField, { readonly label: string; readonly suffix: string }>
> = {
  accountRisk: { label: 'סיכון חשבון', suffix: '₪' },
  stopDistance: { label: 'מרחק עצירה', suffix: '₪' },
  perUnitRisk: { label: 'סיכון ליחידה', suffix: '₪' },
  positionSize: { label: 'מספר יחידות', suffix: 'יח׳' },
  riskMultiple: { label: 'מכפיל סיכון', suffix: 'R' },
};

function finite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

export function isCapstoneStepAnswerComplete(
  step: CapstoneStep,
  answer: AtomicExerciseAnswer | undefined,
): boolean {
  if (!answer || answer.kind !== step.rubric.kind) return false;
  switch (step.rubric.kind) {
    case 'multiple-choice':
      return answer.kind === 'multiple-choice' && answer.optionId.length > 0;
    case 'selection':
      return answer.kind === 'selection' && answer.selectedIds.length > 0;
    case 'sequence':
      return (
        answer.kind === 'sequence' && answer.orderedIds.length === step.rubric.expectedOrder.length
      );
    case 'risk':
      return (
        answer.kind === 'risk' &&
        Object.keys(step.rubric.expected).every((field) =>
          finite(answer.values[field as RiskAnswerField]),
        )
      );
    case 'decision':
      return (
        answer.kind === 'decision' &&
        answer.decision.length > 0 &&
        (step.rubric.requiredReasonIds?.length ? (answer.reasonIds?.length ?? 0) > 0 : true)
      );
    case 'point':
      return answer.kind === 'point' && answer.points.length > 0;
    case 'zone':
      return answer.kind === 'zone';
    case 'line':
      return answer.kind === 'line';
    case 'label-placement':
      return (
        answer.kind === 'label-placement' && answer.placements.length === step.rubric.targets.length
      );
  }
}

const stepStatusLabels: Readonly<Record<CapstoneStepStatus, string>> = {
  draft: 'טיוטה',
  submitted: 'הוגש',
  invalidated: 'דורש בדיקה מחדש',
  finalized: 'סופי',
};

function stepStatusTone(status: CapstoneStepStatus): 'neutral' | 'teal' | 'warning' | 'success' {
  switch (status) {
    case 'draft':
      return 'neutral';
    case 'submitted':
      return 'teal';
    case 'invalidated':
      return 'warning';
    case 'finalized':
      return 'success';
  }
}

function stepStatusColor(
  status: CapstoneStepStatus,
): 'textMuted' | 'primary' | 'warning' | 'success' {
  switch (status) {
    case 'draft':
      return 'textMuted';
    case 'submitted':
      return 'primary';
    case 'invalidated':
      return 'warning';
    case 'finalized':
      return 'success';
  }
}

function hasCanonicalWorkflow(stages: readonly CapstoneStep[]): boolean {
  return (
    stages.length === WORKFLOW_STEP_IDS.length &&
    stages.every((step, index) => step.id === WORKFLOW_STEP_IDS[index])
  );
}

export function gradeCapstoneAnswers(
  exercise: Pick<ContentExercise, 'id' | 'capstoneSteps'>,
  answers: CapstoneAnswerMap,
): CapstoneAggregateResult {
  const stages = exercise.capstoneSteps ?? [];
  const steps = stages.map<CapstoneStepResult>((step) => {
    const answer = answers[step.id];
    const complete = isCapstoneStepAnswerComplete(step, answer);
    return {
      stepId: step.id,
      answer: answer ?? null,
      complete,
      result: complete && answer ? gradeAnswer(step.rubric, answer) : null,
    };
  });
  const answeredSteps = steps.filter((step) => step.complete).length;
  const correctSteps = steps.filter((step) => step.result?.correct).length;
  const complete = hasCanonicalWorkflow(stages) && answeredSteps === stages.length;
  const score =
    stages.length === 0
      ? 0
      : steps.reduce((sum, step) => sum + (step.result?.score ?? 0), 0) / stages.length;
  return {
    exerciseId: exercise.id,
    answer: complete
      ? {
          kind: 'capstone',
          stepAnswers: stages.map((step) => ({ stepId: step.id, answer: answers[step.id]! })),
        }
      : null,
    complete,
    allCorrect: complete && correctSteps === stages.length,
    answeredSteps,
    correctSteps,
    score,
    steps,
  };
}

function answersFromDomain(answer: CapstoneAnswer | null): CapstoneAnswerMap {
  if (!answer) return {};
  const knownIds = new Set<string>(WORKFLOW_STEP_IDS);
  return Object.fromEntries(
    answer.stepAnswers
      .filter((step) => knownIds.has(step.stepId))
      .map((step) => [step.stepId, step.answer]),
  ) as CapstoneAnswerMap;
}

function mergePresentation(
  step: CapstoneStep,
  presentation: CapstonePresentationCatalog | undefined,
): CapstoneStepPresentation {
  const authoredOptions = step.options?.map((option) => ({ ...option }));
  const authoredDecisionOptions =
    step.rubric.kind === 'decision'
      ? authoredOptions?.filter(
          (option) =>
            step.decisionOptionMap?.[option.id] ?? decisionIds.has(option.id as TradeDecision),
        )
      : authoredOptions;
  const authoredReasonOptions = step.rubric.kind === 'decision' ? step.reasonOptions : undefined;
  return {
    options: stablePresentationOrder(
      presentation?.[step.id]?.options ?? authoredDecisionOptions ?? [],
      `capstone:${step.id}:options`,
    ),
    reasonOptions: stablePresentationOrder(
      presentation?.[step.id]?.reasonOptions ?? authoredReasonOptions ?? [],
      `capstone:${step.id}:reasons`,
    ),
  };
}

function ensureRubricChoices(
  step: CapstoneStep,
  supplied: readonly CapstoneChoice[] | undefined,
): readonly CapstoneChoice[] {
  return stablePresentationOrder([...(supplied ?? [])], `capstone:${step.id}:${step.rubric.kind}`);
}

function ChoiceLabel({ choice }: { readonly choice: CapstoneChoice }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <UiText variant="label">{choice.labelHe}</UiText>
      {choice.labelEn ? (
        <LtrText color="textMuted" variant="caption">
          {choice.labelEn}
        </LtrText>
      ) : undefined}
    </View>
  );
}

function SelectionEditor({
  answer,
  choices,
  disabled,
  onAnswer,
}: {
  readonly answer: AtomicExerciseAnswer | undefined;
  readonly choices: readonly CapstoneChoice[];
  readonly disabled: boolean;
  readonly onAnswer: (answer: AtomicExerciseAnswer) => void;
}) {
  const theme = useTheme();
  const selected = answer?.kind === 'selection' ? answer.selectedIds : [];
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {choices.map((choice) => {
        const checked = selected.includes(choice.id);
        return (
          <Pressable
            accessibilityLabel={choice.labelHe}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled }}
            disabled={disabled}
            key={choice.id}
            onPress={() =>
              onAnswer({
                kind: 'selection',
                selectedIds: checked
                  ? selected.filter((id) => id !== choice.id)
                  : [...selected, choice.id],
              })
            }
            style={{
              alignItems: 'center',
              backgroundColor: checked ? theme.colors.primarySoft : theme.colors.surface,
              borderColor: checked ? theme.colors.primary : theme.colors.border,
              borderRadius: theme.radii.md,
              borderWidth: checked ? 2 : 1,
              flexDirection: 'row',
              gap: 12,
              minHeight: 52,
              padding: 12,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: checked ? theme.colors.primary : 'transparent',
                borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
                borderRadius: 6,
                borderWidth: 2,
                height: 24,
                justifyContent: 'center',
                width: 24,
              }}
            >
              {checked ? (
                <Glyph color={theme.colors.onPrimary} name="check" size={15} />
              ) : undefined}
            </View>
            <ChoiceLabel choice={choice} />
          </Pressable>
        );
      })}
    </View>
  );
}

function RadioEditor({
  choices,
  selectedId,
  disabled,
  onSelect,
}: {
  readonly choices: readonly CapstoneChoice[];
  readonly selectedId: string | null;
  readonly disabled: boolean;
  readonly onSelect: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ gap: theme.spacing.sm }}>
      {choices.map((choice) => {
        const selected = selectedId === choice.id;
        return (
          <Pressable
            accessibilityLabel={choice.labelHe}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            key={choice.id}
            onPress={() => onSelect(choice.id)}
            style={{
              alignItems: 'center',
              backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              borderRadius: theme.radii.md,
              borderWidth: selected ? 2 : 1,
              flexDirection: 'row',
              gap: 12,
              minHeight: 52,
              padding: 12,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                borderColor: selected ? theme.colors.primary : theme.colors.borderStrong,
                borderRadius: 12,
                borderWidth: 2,
                height: 24,
                justifyContent: 'center',
                width: 24,
              }}
            >
              {selected ? (
                <View
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: 7,
                    height: 14,
                    width: 14,
                  }}
                />
              ) : undefined}
            </View>
            <ChoiceLabel choice={choice} />
          </Pressable>
        );
      })}
    </View>
  );
}

function RiskEditor({
  step,
  answer,
  disabled,
  onAnswer,
}: {
  readonly step: CapstoneStep;
  readonly answer: AtomicExerciseAnswer | undefined;
  readonly disabled: boolean;
  readonly onAnswer: (answer: AtomicExerciseAnswer) => void;
}) {
  const theme = useTheme();
  if (step.rubric.kind !== 'risk') return null;
  const values = answer?.kind === 'risk' ? answer.values : {};
  const fields = Object.keys(step.rubric.expected) as RiskAnswerField[];
  return (
    <View style={{ gap: theme.spacing.md }}>
      {fields.map((field) => (
        <View key={field} style={{ gap: 6 }}>
          <UiText variant="label">{riskLabels[field].label}</UiText>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              flexDirection: 'row',
              minHeight: 52,
              paddingHorizontal: 14,
            }}
          >
            <LtrText color="textMuted" variant="label">
              {riskLabels[field].suffix}
            </LtrText>
            <TextInput
              accessibilityLabel={riskLabels[field].label}
              editable={!disabled}
              keyboardType="decimal-pad"
              onChangeText={(text) => {
                const normalized = text.trim().replace(',', '.');
                const parsed = normalized.length ? Number(normalized) : undefined;
                const next = { ...values };
                if (finite(parsed)) next[field] = parsed;
                else delete next[field];
                onAnswer({ kind: 'risk', values: next });
              }}
              placeholder="0"
              placeholderTextColor={theme.colors.textMuted}
              style={{
                color: theme.colors.text,
                direction: 'ltr',
                flex: 1,
                fontSize: 18,
                fontVariant: ['tabular-nums'],
                minHeight: 50,
                textAlign: 'left',
                writingDirection: 'ltr',
              }}
              value={values[field]?.toString() ?? ''}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function DecisionEditor({
  step,
  answer,
  presentation,
  disabled,
  onAnswer,
}: {
  readonly step: CapstoneStep;
  readonly answer: AtomicExerciseAnswer | undefined;
  readonly presentation: CapstoneStepPresentation;
  readonly disabled: boolean;
  readonly onAnswer: (answer: AtomicExerciseAnswer) => void;
}) {
  const theme = useTheme();
  if (step.rubric.kind !== 'decision') return null;
  const current = answer?.kind === 'decision' ? answer : undefined;
  const reasons = current?.reasonIds ?? [];
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ gap: 7 }}>
        <UiText variant="label">החלטה</UiText>
        <RadioEditor
          choices={presentation.options?.length ? presentation.options : decisionChoices}
          disabled={disabled}
          onSelect={(id) => {
            const decision =
              step.decisionOptionMap?.[id] ??
              (decisionIds.has(id as TradeDecision) ? (id as TradeDecision) : undefined);
            if (!decision) return;
            onAnswer({ kind: 'decision', decision, optionId: id, reasonIds: reasons });
          }}
          selectedId={current?.optionId ?? current?.decision ?? null}
        />
      </View>
      {step.rubric.requiredReasonIds?.length ? (
        <View style={{ gap: 7 }}>
          <UiText variant="label">נימוק להחלטה</UiText>
          <UiText color="textMuted" variant="caption">
            בחרו את הראיות שתומכות בהחלטה. ההחלטה והנימוק נבדקים בנפרד.
          </UiText>
          <SelectionEditor
            answer={{ kind: 'selection', selectedIds: reasons }}
            choices={presentation.reasonOptions ?? []}
            disabled={disabled}
            onAnswer={(selection) => {
              if (selection.kind !== 'selection') return;
              onAnswer({
                kind: 'decision',
                decision: current?.decision ?? 'insufficient-evidence',
                optionId: current?.optionId,
                reasonIds: selection.selectedIds,
              });
            }}
          />
        </View>
      ) : undefined}
    </View>
  );
}

function SequenceEditor({
  step,
  answer,
  choices,
  disabled,
  onAnswer,
}: {
  readonly step: CapstoneStep;
  readonly answer: AtomicExerciseAnswer | undefined;
  readonly choices: readonly CapstoneChoice[];
  readonly disabled: boolean;
  readonly onAnswer: (answer: AtomicExerciseAnswer) => void;
}) {
  if (step.rubric.kind !== 'sequence') return null;
  const orderedIds =
    answer?.kind === 'sequence' ? answer.orderedIds : choices.map((choice) => choice.id);
  const choiceMap = new Map(choices.map((choice) => [choice.id, choice]));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onAnswer({ kind: 'sequence', orderedIds: next });
  };
  return (
    <View style={{ gap: 8 }}>
      {orderedIds.map((id, index) => {
        const choice = choiceMap.get(id) ?? { id, labelHe: id };
        return (
          <Card
            key={id}
            padding="sm"
            style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}
            variant="outlined"
          >
            <LtrText color="primary" variant="numeric">
              {index + 1}
            </LtrText>
            <ChoiceLabel choice={choice} />
            <View style={{ flexDirection: 'row', gap: 2 }}>
              <Pressable
                accessibilityLabel={`העברת ${choice.labelHe} למעלה`}
                accessibilityRole="button"
                accessibilityState={{ disabled: disabled || index === 0 }}
                disabled={disabled || index === 0}
                onPress={() => move(index, -1)}
                style={{
                  alignItems: 'center',
                  height: 44,
                  justifyContent: 'center',
                  opacity: index === 0 ? 0.3 : 1,
                  width: 44,
                }}
              >
                <Glyph name="up" />
              </Pressable>
              <Pressable
                accessibilityLabel={`העברת ${choice.labelHe} למטה`}
                accessibilityRole="button"
                accessibilityState={{ disabled: disabled || index === orderedIds.length - 1 }}
                disabled={disabled || index === orderedIds.length - 1}
                onPress={() => move(index, 1)}
                style={{
                  alignItems: 'center',
                  height: 44,
                  justifyContent: 'center',
                  opacity: index === orderedIds.length - 1 ? 0.3 : 1,
                  width: 44,
                }}
              >
                <Glyph name="down" />
              </Pressable>
            </View>
          </Card>
        );
      })}
      {answer?.kind !== 'sequence' ? (
        <Button
          disabled={disabled}
          onPress={() => onAnswer({ kind: 'sequence', orderedIds })}
          variant="secondary"
        >
          אשרו את הסדר
        </Button>
      ) : undefined}
    </View>
  );
}

function StepEditor({
  step,
  answer,
  presentation,
  disabled,
  onAnswer,
  renderCustomStep,
}: {
  readonly step: CapstoneStep;
  readonly answer: AtomicExerciseAnswer | undefined;
  readonly presentation: CapstoneStepPresentation;
  readonly disabled: boolean;
  readonly onAnswer: (answer: AtomicExerciseAnswer | null) => void;
  readonly renderCustomStep?: CapstoneInteractionProps['renderCustomStep'];
}) {
  const choices = ensureRubricChoices(step, presentation.options);
  if (step.rubric.kind === 'selection') {
    return (
      <SelectionEditor answer={answer} choices={choices} disabled={disabled} onAnswer={onAnswer} />
    );
  }
  if (step.rubric.kind === 'multiple-choice') {
    return (
      <RadioEditor
        choices={choices}
        disabled={disabled}
        onSelect={(optionId) => onAnswer({ kind: 'multiple-choice', optionId })}
        selectedId={answer?.kind === 'multiple-choice' ? answer.optionId : null}
      />
    );
  }
  if (step.rubric.kind === 'risk') {
    return <RiskEditor answer={answer} disabled={disabled} onAnswer={onAnswer} step={step} />;
  }
  if (step.rubric.kind === 'decision') {
    return (
      <DecisionEditor
        answer={answer}
        disabled={disabled}
        onAnswer={onAnswer}
        presentation={presentation}
        step={step}
      />
    );
  }
  if (step.rubric.kind === 'sequence') {
    return (
      <SequenceEditor
        answer={answer}
        choices={choices}
        disabled={disabled}
        onAnswer={onAnswer}
        step={step}
      />
    );
  }
  if (renderCustomStep)
    return renderCustomStep({ step, answer: answer ?? null, disabled, onAnswer });
  return (
    <Card variant="subtle">
      <UiText color="danger">שלב השרטוט אינו זמין כרגע; לא נשמרה תשובה.</UiText>
    </Card>
  );
}

function CapstoneSession({
  exercise,
  answer,
  partialAnswers,
  onPartialAnswersChange,
  activeStepId: controlledActiveStepId,
  onActiveStepChange,
  stepStatuses,
  presentation,
  disabled = false,
  onChange,
  onSubmitStep,
  renderCustomStep,
  testID = 'capstone-interaction',
}: CapstoneInteractionProps) {
  const theme = useTheme();
  const stages = exercise.capstoneSteps;
  const [internalAnswers, setInternalAnswers] = useState<CapstoneAnswerMap>(() =>
    answersFromDomain(answer),
  );
  const [internalActiveStepId, setInternalActiveStepId] = useState<WorkflowStepId>(
    stages[0]?.id ?? 'context',
  );
  const answers = partialAnswers ?? internalAnswers;
  const activeStepId = controlledActiveStepId ?? internalActiveStepId;
  const aggregate = gradeCapstoneAnswers(exercise, answers);
  const activeIndex = Math.max(
    0,
    stages.findIndex((step) => step.id === activeStepId),
  );
  const activeStep = stages[activeIndex];
  const activeAnswer = activeStep ? answers[activeStep.id] : undefined;
  const activeStatus = activeStep ? stepStatuses?.[activeStep.id] : undefined;
  const activeStepDisabled = disabled || activeStatus === 'finalized';
  const activeStepComplete = activeStep
    ? isCapstoneStepAnswerComplete(activeStep, activeAnswer)
    : false;

  const navigateTo = (stepId: WorkflowStepId) => {
    if (controlledActiveStepId === undefined) setInternalActiveStepId(stepId);
    onActiveStepChange?.(stepId);
  };

  const commit = (stepId: WorkflowStepId, stepAnswer: AtomicExerciseAnswer | null) => {
    const next = { ...answers };
    if (stepAnswer) next[stepId] = stepAnswer;
    else delete next[stepId];
    if (partialAnswers === undefined) setInternalAnswers(next);
    const nextAggregate = gradeCapstoneAnswers(exercise, next);
    onPartialAnswersChange?.(next, nextAggregate);
    onChange(nextAggregate.answer, nextAggregate);
  };

  const submitActiveStep = () => {
    if (
      !onSubmitStep ||
      !activeStep ||
      !activeAnswer ||
      !activeStepComplete ||
      activeStepDisabled
    ) {
      return;
    }
    onSubmitStep(activeStep.id, activeAnswer, gradeAnswer(activeStep.rubric, activeAnswer));
  };

  if (!hasCanonicalWorkflow(stages) || !activeStep) {
    return (
      <Card testID={testID} variant="outlined">
        <View style={{ gap: theme.spacing.sm }}>
          <Heading level={3}>התרגיל המסכם אינו זמין</Heading>
          <UiText color="danger">
            נדרשים כל 11 שלבי התהליך עם רובריקה עצמאית לכל שלב. לא נרשמה השלמה.
          </UiText>
        </View>
      </Card>
    );
  }

  return (
    <View
      accessibilityLabel="תרגיל מסכם, תהליך 11 השלבים"
      style={{ direction: theme.direction, gap: theme.spacing.xl }}
      testID={testID}
    >
      <View style={{ gap: theme.spacing.sm }}>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Heading level={2}>תהליך 11 השלבים</Heading>
          <LtrText color="primary" variant="numeric">
            {aggregate.answeredSteps}/11
          </LtrText>
        </View>
        <ProgressBar
          accessibilityLabel="התקדמות בתרגיל המסכם"
          showValue
          value={(aggregate.answeredSteps / 11) * 100}
        />
        <UiText color="textMuted" variant="bodySmall">
          {partialAnswers
            ? 'כל שינוי נשמר כטיוטה במכשיר. הגשת שלב וסיום הניתוח הן פעולות נפרדות ומפורשות.'
            : 'כל שלב נשמר בזיכרון כל עוד התרגיל פתוח. לאחר מענה על כל 11 השלבים, ההגשה המלאה נשמרת במכשיר.'}
        </UiText>
      </View>

      <View
        accessibilityLabel="ניווט בין שלבי התהליך"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
      >
        {stages.map((step, index) => {
          const answered = isCapstoneStepAnswerComplete(step, answers[step.id]);
          const selected = step.id === activeStep.id;
          const visualStatus = stepStatuses?.[step.id];
          const status = visualStatus
            ? stepStatusLabels[visualStatus]
            : answered
              ? 'נענה'
              : 'טרם נענה';
          const showCheck = visualStatus
            ? visualStatus === 'submitted' || visualStatus === 'finalized'
            : answered;
          return (
            <Pressable
              accessibilityLabel={`שלב ${index + 1}: ${CAPSTONE_STEP_LABELS[step.id]}, ${status}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={step.id}
              onPress={() => navigateTo(step.id)}
              style={{
                alignItems: 'center',
                backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                borderRadius: theme.radii.md,
                borderWidth: selected ? 2 : 1,
                flexBasis: '30%',
                flexGrow: 1,
                flexDirection: 'row',
                gap: 8,
                minHeight: 48,
                minWidth: 132,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: showCheck ? theme.colors.primary : theme.colors.surfaceMuted,
                  borderRadius: 12,
                  height: 24,
                  justifyContent: 'center',
                  width: 24,
                }}
              >
                {showCheck ? (
                  <Glyph color={theme.colors.onPrimary} name="check" size={14} />
                ) : (
                  <LtrText align="center" color="textMuted" style={{ fontSize: 11 }}>
                    {index + 1}
                  </LtrText>
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <UiText color={selected ? 'primary' : 'text'} variant="caption">
                  {CAPSTONE_STEP_LABELS[step.id]}
                </UiText>
                {visualStatus ? (
                  <UiText color={stepStatusColor(visualStatus)} style={{ fontSize: 11 }}>
                    {stepStatusLabels[visualStatus]}
                  </UiText>
                ) : undefined}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Card variant="accent">
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: 6 }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
              <Badge tone="teal">{`שלב ${activeIndex + 1} מתוך 11`}</Badge>
              {activeStatus ? (
                <Badge tone={stepStatusTone(activeStatus)}>{stepStatusLabels[activeStatus]}</Badge>
              ) : undefined}
              <Heading level={3}>{CAPSTONE_STEP_LABELS[activeStep.id]}</Heading>
            </View>
            <UiText>{activeStep.promptHe}</UiText>
            {activeStep.promptEn ? (
              <LtrText color="textMuted" variant="bodySmall">
                {activeStep.promptEn}
              </LtrText>
            ) : undefined}
          </View>
          <StepEditor
            answer={answers[activeStep.id]}
            disabled={activeStepDisabled}
            onAnswer={(answer) => commit(activeStep.id, answer)}
            presentation={mergePresentation(activeStep, presentation)}
            renderCustomStep={renderCustomStep}
            step={activeStep}
          />
          {onSubmitStep ? (
            <View style={{ gap: 6 }}>
              <Button
                disabled={!activeStepComplete || activeStepDisabled || activeStatus === 'submitted'}
                fullWidth
                onPress={submitActiveStep}
              >
                {activeStatus === 'invalidated'
                  ? 'הגשת השלב מחדש'
                  : activeStatus === 'submitted'
                    ? 'השלב הוגש'
                    : activeStatus === 'finalized'
                      ? 'השלב סופי'
                      : 'הגשת השלב'}
              </Button>
              {!activeStepComplete ? (
                <UiText align="center" color="textMuted" variant="caption">
                  יש להשלים את התשובה לפני הגשת השלב.
                </UiText>
              ) : undefined}
            </View>
          ) : undefined}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              disabled={activeIndex === 0}
              onPress={() => navigateTo(stages[activeIndex - 1]!.id)}
              variant="ghost"
            >
              השלב הקודם
            </Button>
            <Button
              disabled={
                activeIndex === stages.length - 1 ||
                (onSubmitStep !== undefined && activeStatus !== 'submitted')
              }
              onPress={() => navigateTo(stages[activeIndex + 1]!.id)}
              style={{ flex: 1 }}
              variant="secondary"
            >
              השלב הבא
            </Button>
          </View>
        </View>
      </Card>

      <UiText align="center" color="textMuted" variant="caption">
        התרגיל בוחן תהליך הסתברותי ולימודי בלבד. הוא אינו המלצה לפעולה.
      </UiText>
    </View>
  );
}

/**
 * Drop-in capstone answer collector. Partial stage state remains local while the parent answer is
 * null; changing the exercise id remounts the session and safely clears those partial edits.
 */
export function CapstoneInteraction(props: CapstoneInteractionProps) {
  return <CapstoneSession key={props.exercise.id} {...props} />;
}
