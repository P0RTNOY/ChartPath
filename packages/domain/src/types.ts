export type SkillId = string;
export type UnitId = string;
export type LessonId = string;
export type ExerciseId = string;
export type MisconceptionId = string;

export type JsonValue =
  null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type EditorialStatus = 'draft' | 'reviewed' | 'published';
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface SourceReference {
  readonly sourceId: string;
  readonly pageStart: number;
  readonly pageEnd: number;
  readonly section?: string;
}

export interface Skill {
  readonly id: SkillId;
  readonly titleHe: string;
  readonly titleEn?: string;
  readonly descriptionHe: string;
  readonly descriptionEn?: string;
  readonly prerequisiteSkillIds: readonly SkillId[];
  readonly order: number;
  readonly editorialStatus: EditorialStatus;
}

export interface Unit {
  readonly id: UnitId;
  readonly order: number;
  readonly titleHe: string;
  readonly titleEn?: string;
  readonly descriptionHe: string;
  readonly descriptionEn?: string;
  readonly prerequisiteUnitIds: readonly UnitId[];
  readonly lessonIds: readonly LessonId[];
  readonly editorialStatus: EditorialStatus;
  readonly schemaVersion: number;
}

export interface Lesson {
  readonly id: LessonId;
  readonly unitId: UnitId;
  readonly order: number;
  readonly titleHe: string;
  readonly titleEn?: string;
  readonly summaryHe: string;
  readonly summaryEn?: string;
  readonly skillIds: readonly SkillId[];
  readonly prerequisiteLessonIds: readonly LessonId[];
  readonly exerciseIds: readonly ExerciseId[];
  readonly estimatedMinutes: number;
  readonly sourceReferences: readonly SourceReference[];
  readonly editorialStatus: EditorialStatus;
  readonly schemaVersion: number;
}

export interface OhlcvCandle {
  readonly index: number;
  readonly timestamp: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

export type ChartScenario =
  | 'uptrend'
  | 'downtrend'
  | 'range'
  | 'breakout'
  | 'retest'
  | 'false-breakout'
  | 'reversal'
  | 'continuation'
  | 'ambiguous'
  | 'lookalike';

export interface ChartSpec {
  readonly id: string;
  readonly seed: number;
  readonly generatorVersion: string;
  readonly candleCount: number;
  readonly timeframe: string;
  readonly scenario: ChartScenario;
  readonly basePrice: number;
  readonly baseVolume: number;
  readonly volatility: number;
  readonly noise: number;
  readonly decisionCandleIndex?: number;
  readonly parameters?: Readonly<Record<string, JsonValue>>;
}

export interface ChartAnchor {
  readonly candleIndex: number;
  readonly price: number;
}

interface BaseChartAnnotation {
  readonly id: string;
  readonly role: string;
  readonly visibleFromCandleIndex?: number;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}

export interface PointChartAnnotation extends BaseChartAnnotation {
  readonly kind: 'point';
  readonly candleIndex: number;
  readonly price: number;
}

export interface ZoneChartAnnotation extends BaseChartAnnotation {
  readonly kind: 'zone';
  readonly startCandleIndex: number;
  readonly endCandleIndex: number;
  readonly priceLow: number;
  readonly priceHigh: number;
}

export interface LineChartAnnotation extends BaseChartAnnotation {
  readonly kind: 'line';
  readonly start: ChartAnchor;
  readonly end: ChartAnchor;
}

export interface RangeChartAnnotation extends BaseChartAnnotation {
  readonly kind: 'range';
  readonly startCandleIndex: number;
  readonly endCandleIndex: number;
}

export interface PatternChartAnnotation extends BaseChartAnnotation {
  readonly kind: 'pattern';
  readonly startCandleIndex: number;
  readonly endCandleIndex: number;
  readonly label: string;
}

export interface EventChartAnnotation extends BaseChartAnnotation {
  readonly kind: 'event';
  readonly candleIndex: number;
  readonly label?: string;
}

export type ChartAnnotation =
  | PointChartAnnotation
  | ZoneChartAnnotation
  | LineChartAnnotation
  | RangeChartAnnotation
  | PatternChartAnnotation
  | EventChartAnnotation;

export interface GeneratedChart {
  readonly spec: ChartSpec;
  readonly candles: readonly OhlcvCandle[];
  readonly annotations: readonly ChartAnnotation[];
}

export interface ChartZone {
  readonly startCandleIndex: number;
  readonly endCandleIndex: number;
  readonly priceLow: number;
  readonly priceHigh: number;
}

export interface NormalizedTolerance {
  /** Fraction of the visible candle span, between 0 and 1. */
  readonly horizontal: number;
  /** Fraction of the visible price span, between 0 and 1. */
  readonly vertical: number;
}

export interface NumericTolerance {
  readonly absolute?: number;
  /** A fraction, so 0.01 means one percent. */
  readonly relative?: number;
}

interface BaseRubric {
  readonly misconceptionIds?: readonly MisconceptionId[];
}

export interface MultipleChoiceRubric extends BaseRubric {
  readonly kind: 'multiple-choice';
  readonly acceptedOptionIds: readonly string[];
}

export interface SelectionRubric extends BaseRubric {
  readonly kind: 'selection';
  readonly expectedIds: readonly string[];
  readonly mode: 'exact' | 'contains';
  readonly allowExtraSelections?: boolean;
}

export interface SequenceRubric extends BaseRubric {
  readonly kind: 'sequence';
  readonly expectedOrder: readonly string[];
}

export interface PointRubric extends BaseRubric {
  readonly kind: 'point';
  readonly targets: readonly ChartAnchor[];
  readonly tolerance: NormalizedTolerance;
  readonly matching: 'all' | 'any';
  readonly allowExtraPoints?: boolean;
  readonly decisionCandleIndex?: number;
}

export interface ZoneRubric extends BaseRubric {
  readonly kind: 'zone';
  readonly target: ChartZone;
  readonly minimumIntersectionOverUnion: number;
  readonly decisionCandleIndex?: number;
}

export interface LineRubric extends BaseRubric {
  readonly kind: 'line';
  readonly target: {
    readonly start: ChartAnchor;
    readonly end: ChartAnchor;
  };
  readonly tolerance: NormalizedTolerance;
  readonly directionInvariant?: boolean;
  readonly decisionCandleIndex?: number;
}

export type RiskAnswerField =
  'accountRisk' | 'stopDistance' | 'perUnitRisk' | 'positionSize' | 'riskMultiple';

export interface RiskRubric extends BaseRubric {
  readonly kind: 'risk';
  readonly expected: Partial<Readonly<Record<RiskAnswerField, number>>>;
  readonly tolerance: NumericTolerance;
}

export type TradeDecision = 'trade' | 'wait' | 'reject' | 'no-trade' | 'insufficient-evidence';

export interface DecisionRubric extends BaseRubric {
  readonly kind: 'decision';
  readonly acceptedDecisions: readonly TradeDecision[];
  readonly requiredReasonIds?: readonly string[];
  readonly allowExtraReasons?: boolean;
}

export interface LabelPlacementTarget {
  readonly labelId: string;
  readonly target: ChartAnchor;
}

export interface LabelPlacementRubric extends BaseRubric {
  readonly kind: 'label-placement';
  readonly targets: readonly LabelPlacementTarget[];
  readonly tolerance: NormalizedTolerance;
  readonly decisionCandleIndex?: number;
}

export type AtomicAnswerRubric =
  | MultipleChoiceRubric
  | SelectionRubric
  | SequenceRubric
  | PointRubric
  | ZoneRubric
  | LineRubric
  | RiskRubric
  | DecisionRubric
  | LabelPlacementRubric;

export interface CapstoneStepRubric {
  readonly id: string;
  readonly rubric: AtomicAnswerRubric;
}

export interface CapstoneRubric extends BaseRubric {
  readonly kind: 'capstone';
  readonly steps: readonly CapstoneStepRubric[];
}

export type AnswerRubric = AtomicAnswerRubric | CapstoneRubric;

export interface MultipleChoiceAnswer {
  readonly kind: 'multiple-choice';
  readonly optionId: string;
}

export interface SelectionAnswer {
  readonly kind: 'selection';
  readonly selectedIds: readonly string[];
}

export interface SequenceAnswer {
  readonly kind: 'sequence';
  readonly orderedIds: readonly string[];
}

export interface PointAnswer {
  readonly kind: 'point';
  readonly points: readonly ChartAnchor[];
}

export interface ZoneAnswer {
  readonly kind: 'zone';
  readonly zone: ChartZone;
}

export interface LineAnswer {
  readonly kind: 'line';
  readonly line: {
    readonly start: ChartAnchor;
    readonly end: ChartAnchor;
  };
}

export interface RiskAnswer {
  readonly kind: 'risk';
  readonly values: Partial<Readonly<Record<RiskAnswerField, number>>>;
}

export interface DecisionAnswer {
  readonly kind: 'decision';
  readonly decision: TradeDecision;
  readonly reasonIds?: readonly string[];
  /** Authored presentation ID retained for misconception-specific feedback. */
  readonly optionId?: string;
}

export interface LabelPlacementAnswer {
  readonly kind: 'label-placement';
  readonly placements: readonly {
    readonly labelId: string;
    readonly anchor: ChartAnchor;
  }[];
}

export type AtomicExerciseAnswer =
  | MultipleChoiceAnswer
  | SelectionAnswer
  | SequenceAnswer
  | PointAnswer
  | ZoneAnswer
  | LineAnswer
  | RiskAnswer
  | DecisionAnswer
  | LabelPlacementAnswer;

export interface CapstoneStepAnswer {
  readonly stepId: string;
  readonly answer: AtomicExerciseAnswer;
}

export interface CapstoneAnswer {
  readonly kind: 'capstone';
  readonly stepAnswers: readonly CapstoneStepAnswer[];
}

export type ExerciseAnswer = AtomicExerciseAnswer | CapstoneAnswer;

export type ExerciseInteractionType =
  AnswerRubric['kind'] | 'timeframe-comparison' | 'mistake-diagnosis' | 'sequential-reveal';

export interface ExerciseOption {
  readonly id: string;
  readonly labelHe: string;
  readonly labelEn?: string;
}

export interface ExerciseHint {
  readonly id: string;
  readonly level: number;
  readonly textHe: string;
  readonly textEn?: string;
}

export interface AlternativeExplanation {
  /** Exactly one match key is authored: a learner-visible answer ID or a grader feedback code. */
  readonly answerId?: string;
  readonly feedbackCode?: string;
  readonly explanationHe: string;
  readonly explanationEn?: string;
  readonly misconceptionId?: MisconceptionId;
}

export interface Exercise {
  readonly id: ExerciseId;
  readonly skillIds: readonly SkillId[];
  readonly difficulty: Difficulty;
  readonly promptHe: string;
  readonly promptEn?: string;
  readonly interactionType: ExerciseInteractionType;
  readonly options?: readonly ExerciseOption[];
  readonly chartSpec?: ChartSpec;
  readonly rubric: AnswerRubric;
  readonly explanationHe: string;
  readonly explanationEn?: string;
  readonly alternativeExplanations: readonly AlternativeExplanation[];
  readonly misconceptionIds: readonly MisconceptionId[];
  readonly hints: readonly ExerciseHint[];
  readonly sourceReferences: readonly SourceReference[];
  readonly isAmbiguous?: boolean;
  readonly editorialStatus: EditorialStatus;
  readonly schemaVersion: number;
}

export interface GradeDetail {
  readonly key: string;
  readonly value: string | number | boolean;
}

export interface AttemptResult {
  readonly correct: boolean;
  /** A deterministic value in the inclusive range 0..1. */
  readonly score: number;
  readonly feedbackCode: string;
  readonly details: readonly GradeDetail[];
  readonly misconceptionIds: readonly MisconceptionId[];
  readonly graderVersion: string;
}

export interface Attempt {
  readonly id: string;
  readonly exerciseId: ExerciseId;
  readonly contentVersionId: string;
  readonly startedAt: string;
  readonly submittedAt: string;
  readonly answer: ExerciseAnswer;
  readonly result: AttemptResult;
  readonly hintIdsUsed: readonly string[];
  /** Diagnostic only. It must not affect grading or mastery. */
  readonly responseTimeMs?: number;
}

export interface Misconception {
  readonly id: MisconceptionId;
  readonly titleHe: string;
  readonly titleEn?: string;
  readonly explanationHe: string;
  readonly explanationEn?: string;
  readonly skillIds: readonly SkillId[];
  readonly remediationLessonIds: readonly LessonId[];
}

export interface SkillMastery {
  readonly skillId: SkillId;
  /** Inclusive range 0..1. */
  readonly score: number;
  readonly attemptCount: number;
  readonly correctAttemptCount: number;
  readonly reviewAttemptCount: number;
  readonly totalHintsUsed: number;
  readonly misconceptionCounts: Readonly<Record<MisconceptionId, number>>;
  readonly updatedAt: string;
}

export interface ReviewState {
  readonly skillId: SkillId;
  readonly lastReviewAt: string | null;
  readonly nextDueAt: string;
  readonly intervalDays: number;
  readonly easeFactor: number;
  readonly repetitions: number;
  readonly lapseCount: number;
  readonly masteryScore: number;
}

export interface DailyActivity {
  /** Local calendar date in YYYY-MM-DD form. */
  readonly date: string;
  readonly goalMinutes: number;
  readonly activeMinutes: number;
  readonly xp: number;
  readonly streakCount: number;
  readonly completedLessonIds: readonly LessonId[];
  readonly reviewCount: number;
  readonly attemptIds: readonly string[];
}

export interface ContentVersion {
  readonly id: string;
  readonly schemaVersion: number;
  readonly curriculumVersion: string;
  readonly publishedAt: string;
  readonly sourceHash: string;
  readonly minimumAppVersion?: string;
}
