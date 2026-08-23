import type { AnswerRubric, AttemptResult, ExerciseId, SourceReference } from './types.js';

export interface TutorRequest {
  readonly exerciseId: ExerciseId;
  readonly promptHe: string;
  readonly rubric: AnswerRubric;
  readonly deterministicResult: AttemptResult;
  readonly approvedSourceContextHe: string;
  readonly sourceReferences: readonly SourceReference[];
}

export interface TutorExplanation {
  readonly explanationHe: string;
  readonly source: 'provider' | 'safe-local-fallback';
  readonly acknowledgesAmbiguity: boolean;
  /** Must always echo, never replace, the curated grader result. */
  readonly deterministicResult: AttemptResult;
}

export interface TutorProvider {
  readonly id: string;
  readonly status: 'disabled' | 'available';
  explain(request: TutorRequest): Promise<TutorExplanation>;
}

export interface DisabledTutorProviderOptions {
  readonly fallbackExplanationHe?: string;
}

const DEFAULT_FALLBACK_HE =
  'ההסבר האוצר באפליקציה הוא הסמכות בתרגיל זה. המורה האופציונלי אינו פעיל בגרסת הבטא.';

/** The beta provider performs no network or model call and can never override deterministic grading. */
export function createDisabledTutorProvider(
  options: DisabledTutorProviderOptions = {},
): TutorProvider {
  const fallback = options.fallbackExplanationHe?.trim() || DEFAULT_FALLBACK_HE;
  return {
    id: 'disabled-local-tutor',
    status: 'disabled',
    explain: (request) =>
      Promise.resolve({
        explanationHe: fallback,
        source: 'safe-local-fallback',
        acknowledgesAmbiguity: true,
        deterministicResult: request.deterministicResult,
      }),
  };
}
