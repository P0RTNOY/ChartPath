import type {
  AtomicAnswerRubric,
  Exercise,
  ExerciseOption,
  Lesson,
  Misconception,
  Skill,
  SourceReference,
  TradeDecision,
  Unit,
} from '@chartpath/domain';

export interface ExactSourceReference extends SourceReference {
  /** Physical page number shown by a PDF viewer. */
  readonly pageStart: number;
  readonly pageEnd: number;
  /** Printed Arabic page, or Roman front-matter page such as `i`. */
  readonly bookPageStart: number | string;
  readonly bookPageEnd: number | string;
}

export const WORKFLOW_STEP_IDS = [
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
] as const;

export type WorkflowStepId = (typeof WORKFLOW_STEP_IDS)[number];
export type ExerciseRole = 'positive' | 'near-miss' | 'ambiguous' | 'lookalike' | 'transfer';
export type ExerciseCategory =
  'visual' | 'explanation' | 'calculation' | 'decision' | 'journal-review';

export interface CapstoneStep {
  readonly id: WorkflowStepId;
  readonly promptHe: string;
  readonly promptEn?: string;
  readonly rubric: AtomicAnswerRubric;
  readonly options?: readonly ExerciseOption[];
  readonly reasonOptions?: readonly ExerciseOption[];
  /** Explicit authored mapping; option IDs must never be interpreted heuristically. */
  readonly decisionOptionMap?: Readonly<Record<string, TradeDecision>>;
}

export interface ContentExercise extends Exercise {
  readonly contentVersionId: string;
  readonly workflowStepIds: readonly WorkflowStepId[];
  readonly termIds: readonly string[];
  readonly role: ExerciseRole;
  readonly category: ExerciseCategory;
  readonly safetyNoteHe: string;
  readonly processCriteriaHe: readonly string[];
  readonly isRiskOrPositionSize: boolean;
  readonly capstoneSteps?: readonly CapstoneStep[];
  readonly reasonOptions?: readonly ExerciseOption[];
  /** Explicit authored mapping; option IDs must never be interpreted heuristically. */
  readonly decisionOptionMap?: Readonly<Record<string, TradeDecision>>;
  readonly sourceReferences: readonly ExactSourceReference[];
}

export interface ContentLesson extends Lesson {
  readonly contentVersionId: string;
  readonly termIds: readonly string[];
  readonly doctrineHe: readonly string[];
  readonly sourceReferences: readonly ExactSourceReference[];
  readonly workflowStepIds: readonly WorkflowStepId[];
}

export interface ContentUnit extends Unit {
  readonly contentVersionId: string;
  readonly implementationStatus: 'metadata-only' | 'implemented';
  readonly draftLessonIds: readonly string[];
}

export interface DraftLessonMetadata {
  readonly id: string;
  readonly unitId: string;
  readonly titleHe: string;
  readonly titleEn: string;
  readonly prerequisiteLessonIds: readonly string[];
  readonly skillIds: readonly string[];
  readonly plannedScopeHe: string;
  readonly sourceReferences: readonly ExactSourceReference[];
  readonly editorialStatus: 'draft';
  readonly schemaVersion: number;
  readonly contentVersionId: string;
}

export interface GlossaryTerm {
  readonly id: string;
  readonly termHe: string;
  readonly termEn: string;
  readonly definitionHe: string;
  readonly definitionEn: string;
  readonly aliases: readonly string[];
  readonly termHeDirection: 'rtl';
  readonly termEnDirection: 'ltr';
  readonly sourceReferences: readonly ExactSourceReference[];
  readonly editorialStatus: 'reviewed';
}

export interface ContentVersion {
  readonly id: string;
  readonly schemaVersion: number;
  readonly generatorVersion: string;
  readonly titleHe: string;
  readonly releasedAt: string;
  readonly sourceIds: readonly string[];
  readonly editorialStatus: 'reviewed';
}

export interface ContentMigrationManifest {
  readonly id: string;
  readonly fromContentVersionId: string;
  readonly toContentVersionId: string;
  readonly aliases: Readonly<Record<string, string>>;
  readonly retiredIds: readonly string[];
  readonly invalidatedProjectionSkillIds: readonly string[];
  readonly preservesAttempts: true;
}

export interface ContentCatalog {
  readonly version: ContentVersion;
  readonly units: readonly ContentUnit[];
  readonly lessons: readonly ContentLesson[];
  readonly exercises: readonly ContentExercise[];
  readonly skills: readonly Skill[];
  readonly misconceptions: readonly Misconception[];
  readonly glossary: readonly GlossaryTerm[];
  readonly migrations: readonly ContentMigrationManifest[];
  readonly draftLessons: readonly DraftLessonMetadata[];
}
