import { generatePriceSeries, generateSemanticAnnotations } from '@chartpath/chart-engine';
import type { AnswerRubric, TradeDecision } from '@chartpath/domain';

import { catalog as bundledCatalog } from './catalog.js';
import { EXPECTED_ANNOTATION_FINGERPRINTS } from './expected-chart-annotations.js';
import { contentCatalogSchema } from './schemas.js';
import { WORKFLOW_STEP_IDS, type ContentCatalog, type ExactSourceReference } from './types.js';

export interface ValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface ValidationCounts {
  readonly units: number;
  readonly draftLessons: number;
  readonly lessons: number;
  readonly exercises: number;
  readonly reviewedExercises: number;
  readonly glossaryTerms: number;
  readonly nearMissAmbiguousLookalike: number;
  readonly uncertaintyAnswers: number;
  readonly riskOrPositionSize: number;
  readonly capstones: number;
  readonly categories: Readonly<Record<string, number>>;
}

export interface ValidationReport {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly counts: ValidationCounts;
}

const EXPECTED_UNIT_IDS = [
  'unit-00-orientation',
  'unit-01-chart-data',
  'unit-02-structure',
  'unit-03-levels-lines',
  'unit-04-volume',
  'unit-05-patterns',
  'unit-06-breakouts',
  'unit-07-multitimeframe',
  'unit-08-risk',
  'unit-09-evidence',
  'unit-10-capstone',
] as const;

const EXPECTED_LESSON_IDS = [
  'lesson-u00-scenarios',
  'lesson-u01-chart-data',
  'lesson-u02-market-structure',
  'lesson-u03-levels-lines',
  'lesson-u04-volume-evidence',
  'lesson-u05-reversal-patterns',
  'lesson-u05-continuation-patterns',
  'lesson-u06-gaps-breakouts-failure',
  'lesson-u07-multi-timeframe',
  'lesson-u08-risk-execution',
  'lesson-u09-evidence-uncertainty',
  'lesson-u10-capstone',
] as const;

const EXPECTED_SKILL_IDS = [
  'safe.ta-boundaries',
  'data.ohlcv',
  'data.timeframe-scale',
  'data.integrity',
  'structure.dow-trends',
  'structure.swings',
  'levels.zones',
  'levels.lines',
  'evidence.volume',
  'patterns.reversal',
  'patterns.continuation',
  'events.gaps',
  'breakouts.rules',
  'breakouts.failure',
  'context.multitimeframe',
  'workflow.eleven-step',
  'risk.invalidation-execution',
  'risk.r',
  'risk.position-size',
  'risk.management',
  'evidence.testing',
  'markets.constraints',
  'review.process',
] as const;

const EXPECTED_CATEGORIES: Readonly<Record<string, number>> = {
  visual: 18,
  explanation: 12,
  calculation: 10,
  decision: 12,
  'journal-review': 8,
};

const REQUIRED_INTERACTIONS = [
  'multiple-choice',
  'selection',
  'sequence',
  'point',
  'zone',
  'line',
  'risk',
  'decision',
  'label-placement',
  'timeframe-comparison',
  'mistake-diagnosis',
  'sequential-reveal',
] as const;

const uncertaintyDecisions = new Set(['wait', 'reject', 'no-trade', 'insufficient-evidence']);
const hebrewPattern = /[\u0590-\u05ff]/;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

function annotationFingerprint(value: unknown): string {
  const input = stable(value);
  let hash = 2_166_136_261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function add(issues: ValidationIssue[], code: string, path: string, message: string): void {
  issues.push({ code, path, message });
}

function duplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate];
}

function sameMembers(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && expected.every((id) => actual.includes(id));
}

function validateUniqueIds(catalog: ContentCatalog, issues: ValidationIssue[]): void {
  const groups: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['units', catalog.units.map((item) => item.id)],
    ['lessons', catalog.lessons.map((item) => item.id)],
    ['exercises', catalog.exercises.map((item) => item.id)],
    ['skills', catalog.skills.map((item) => item.id)],
    ['misconceptions', catalog.misconceptions.map((item) => item.id)],
    ['glossary', catalog.glossary.map((item) => item.id)],
    ['draftLessons', catalog.draftLessons.map((item) => item.id)],
  ];
  for (const [path, ids] of groups) {
    for (const duplicate of duplicates(ids)) {
      add(issues, 'duplicate-id', path, `Duplicate stable ID: ${duplicate}`);
    }
  }
}

function validateCanonicalInventory(catalog: ContentCatalog, issues: ValidationIssue[]): void {
  if (
    !sameMembers(
      catalog.units.map((unit) => unit.id),
      EXPECTED_UNIT_IDS,
    )
  ) {
    add(issues, 'unit-inventory', 'units', 'Catalog must contain the eleven canonical unit IDs.');
  }
  if (
    !sameMembers(
      catalog.lessons.map((lesson) => lesson.id),
      EXPECTED_LESSON_IDS,
    )
  ) {
    add(
      issues,
      'lesson-inventory',
      'lessons',
      'Catalog must contain the twelve canonical lesson IDs.',
    );
  }
  if (
    !sameMembers(
      catalog.skills.map((skill) => skill.id),
      EXPECTED_SKILL_IDS,
    )
  ) {
    add(issues, 'skill-inventory', 'skills', 'Catalog must contain the canonical 23-skill graph.');
  }
  if (catalog.draftLessons.length !== 11) {
    add(
      issues,
      'draft-depth-count',
      'draftLessons',
      'Every Unit 0–10 entry needs one draft-depth record.',
    );
  }
  if (catalog.glossary.length !== 27) {
    add(
      issues,
      'glossary-count',
      'glossary',
      'The audited bilingual glossary must contain exactly 27 terms.',
    );
  }
}

function validateReferences(
  refs: readonly ExactSourceReference[],
  path: string,
  issues: ValidationIssue[],
): void {
  if (refs.length === 0) {
    add(issues, 'missing-source', path, 'At least one exact source reference is required.');
  }
  for (const [index, ref] of refs.entries()) {
    const refPath = `${path}[${index}]`;
    if (ref.sourceId !== 'ta-he-v2') {
      add(
        issues,
        'unknown-source',
        refPath,
        `Expected sourceId ta-he-v2, received ${ref.sourceId}.`,
      );
    }
    if (ref.pageStart < 1 || ref.pageEnd > 87 || ref.pageStart > ref.pageEnd) {
      add(
        issues,
        'invalid-pdf-pages',
        refPath,
        'Physical PDF pages must form an ordered range within 1–87.',
      );
    }
    if (
      typeof ref.bookPageStart === 'number' &&
      typeof ref.bookPageEnd === 'number' &&
      (ref.bookPageStart < 1 ||
        ref.bookPageEnd > 74 ||
        ref.bookPageStart > ref.bookPageEnd ||
        ref.pageStart !== ref.bookPageStart + 13 ||
        ref.pageEnd !== ref.bookPageEnd + 13)
    ) {
      add(
        issues,
        'source-page-offset',
        refPath,
        'Arabic book pages must match PDF page = book page + 13.',
      );
    }
    if (!ref.section?.trim()) {
      add(
        issues,
        'missing-source-section',
        refPath,
        'A chapter, figure, or section label is required.',
      );
    }
  }
}

interface GraphNode {
  readonly id: string;
  readonly prerequisites: readonly string[];
}

function validateGraph(nodes: readonly GraphNode[], path: string, issues: ValidationIssue[]): void {
  const ids = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    for (const prerequisite of node.prerequisites) {
      if (!ids.has(prerequisite)) {
        add(
          issues,
          'unknown-prerequisite',
          `${path}.${node.id}`,
          `Unknown prerequisite ${prerequisite}.`,
        );
      }
    }
  }
  const state = new Map<string, 'visiting' | 'visited'>();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visit = (id: string): void => {
    if (state.get(id) === 'visiting') {
      add(issues, 'prerequisite-cycle', `${path}.${id}`, 'Prerequisite graph contains a cycle.');
      return;
    }
    if (state.get(id) === 'visited') return;
    state.set(id, 'visiting');
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) visit(prerequisite);
    state.set(id, 'visited');
  };
  for (const node of nodes) visit(node.id);
}

function rubricAllowsUncertainty(rubric: ContentCatalog['exercises'][number]['rubric']): boolean {
  if (rubric.kind === 'capstone') {
    return rubric.steps.some((step) => rubricAllowsUncertainty(step.rubric));
  }
  if (rubric.kind === 'decision') {
    return rubric.acceptedDecisions.some((answer) => uncertaintyDecisions.has(answer));
  }
  if (rubric.kind === 'multiple-choice') {
    return rubric.acceptedOptionIds.some((answer) =>
      /wait|reject|no-trade|insufficient/.test(answer),
    );
  }
  if (rubric.kind === 'selection') {
    return rubric.expectedIds.some((answer) => /wait|reject|no-trade|insufficient/.test(answer));
  }
  return false;
}

function incorrectFeedbackCodes(rubric: AnswerRubric): readonly string[] {
  switch (rubric.kind) {
    case 'multiple-choice':
      return ['option-not-accepted'];
    case 'selection':
      return ['selection-mismatch'];
    case 'sequence':
      return ['sequence-order-mismatch'];
    case 'point':
      return ['point-outside-tolerance'];
    case 'zone':
      return ['zone-overlap-too-small'];
    case 'line':
      return ['line-outside-tolerance'];
    case 'risk':
      return ['risk-value-outside-tolerance'];
    case 'label-placement':
      return ['label-placement-mismatch'];
    case 'decision':
      return ['decision-not-accepted', 'decision-reason-missing'];
    case 'capstone':
      return ['capstone-incomplete', 'capstone-step-mismatch'];
  }
}

function reachableAtomicAlternativeIds(
  rubric: Exclude<AnswerRubric, { readonly kind: 'capstone' }>,
  options: readonly { readonly id: string }[] | undefined,
  reasonOptions: readonly { readonly id: string }[] | undefined,
  decisionOptionMap: Readonly<Record<string, TradeDecision>> | undefined,
): readonly string[] {
  const optionIds = options?.map((option) => option.id) ?? [];
  switch (rubric.kind) {
    case 'multiple-choice':
      return optionIds.filter((id) => !rubric.acceptedOptionIds.includes(id));
    case 'selection':
      return rubric.mode === 'contains' || rubric.allowExtraSelections === true
        ? []
        : optionIds.filter((id) => !rubric.expectedIds.includes(id));
    case 'decision': {
      const wrongDecisions = Object.entries(decisionOptionMap ?? {})
        .filter(([, decision]) => !rubric.acceptedDecisions.includes(decision))
        .map(([id]) => id);
      const requiredReasons = new Set(rubric.requiredReasonIds ?? []);
      const wrongReasons =
        rubric.allowExtraReasons === true
          ? []
          : (reasonOptions?.map((option) => option.id) ?? []).filter(
              (id) => !requiredReasons.has(id),
            );
      return [...wrongDecisions, ...wrongReasons];
    }
    case 'sequence':
    case 'point':
    case 'zone':
    case 'line':
    case 'risk':
    case 'label-placement':
      return [];
  }
}

function reachableAlternativeAnswerIds(
  exercise: ContentCatalog['exercises'][number],
): readonly string[] {
  if (exercise.rubric.kind !== 'capstone') {
    return reachableAtomicAlternativeIds(
      exercise.rubric,
      exercise.options,
      exercise.reasonOptions,
      exercise.decisionOptionMap,
    );
  }
  return (exercise.capstoneSteps ?? []).flatMap((step) =>
    reachableAtomicAlternativeIds(
      step.rubric,
      step.options,
      step.reasonOptions,
      step.decisionOptionMap,
    ),
  );
}

function validateCurriculumLinks(catalog: ContentCatalog, issues: ValidationIssue[]): void {
  const lessonIds = new Set(catalog.lessons.map((lesson) => lesson.id));
  const exerciseIds = new Set(catalog.exercises.map((exercise) => exercise.id));
  const skillIds = new Set(catalog.skills.map((skill) => skill.id));
  const termIds = new Set(catalog.glossary.map((term) => term.id));
  const misconceptionIds = new Set(catalog.misconceptions.map((item) => item.id));
  const linkedExercises = new Set<string>();
  const linkedLessons = new Set<string>();

  for (const unit of catalog.units) {
    for (const lessonId of unit.lessonIds) {
      linkedLessons.add(lessonId);
      if (!lessonIds.has(lessonId))
        add(issues, 'unknown-lesson', `units.${unit.id}`, `Unknown lesson ${lessonId}.`);
    }
    const actualLessons = catalog.lessons
      .filter((lesson) => lesson.unitId === unit.id)
      .map((lesson) => lesson.id);
    if (!sameMembers(actualLessons, unit.lessonIds)) {
      add(
        issues,
        'unit-lesson-mismatch',
        `units.${unit.id}`,
        'Unit lessonIds must exactly match lesson.unitId records.',
      );
    }
    if (
      !sameMembers(
        unit.draftLessonIds,
        catalog.draftLessons.filter((draft) => draft.unitId === unit.id).map((draft) => draft.id),
      )
    ) {
      add(
        issues,
        'unit-draft-mismatch',
        `units.${unit.id}`,
        'Unit draftLessonIds must resolve exactly.',
      );
    }
    validateReferences(
      unit.order === 0
        ? (catalog.lessons[0]?.sourceReferences ?? [])
        : catalog.lessons
            .filter((lesson) => lesson.unitId === unit.id)
            .flatMap((lesson) => lesson.sourceReferences),
      `units.${unit.id}.derivedSources`,
      issues,
    );
  }

  for (const lesson of catalog.lessons) {
    if (!linkedLessons.has(lesson.id)) {
      add(
        issues,
        'unreachable-lesson',
        `lessons.${lesson.id}`,
        'Lesson is not linked from a unit.',
      );
    }
    if (lesson.exerciseIds.length !== 5)
      add(
        issues,
        'lesson-exercise-count',
        `lessons.${lesson.id}`,
        'Each beta lesson needs exactly five exercises.',
      );
    for (const exerciseId of lesson.exerciseIds) {
      linkedExercises.add(exerciseId);
      if (!exerciseIds.has(exerciseId))
        add(issues, 'unknown-exercise', `lessons.${lesson.id}`, `Unknown exercise ${exerciseId}.`);
    }
    for (const skillId of lesson.skillIds) {
      if (!skillIds.has(skillId))
        add(issues, 'unknown-skill', `lessons.${lesson.id}`, `Unknown skill ${skillId}.`);
    }
    for (const termId of lesson.termIds) {
      if (!termIds.has(termId))
        add(issues, 'unknown-term', `lessons.${lesson.id}`, `Unknown glossary term ${termId}.`);
    }
    validateReferences(lesson.sourceReferences, `lessons.${lesson.id}.sourceReferences`, issues);
  }
  for (const exercise of catalog.exercises) {
    if (!linkedExercises.has(exercise.id))
      add(
        issues,
        'unreachable-exercise',
        `exercises.${exercise.id}`,
        'Exercise is not linked from a lesson.',
      );
    for (const skillId of exercise.skillIds) {
      if (!skillIds.has(skillId))
        add(issues, 'unknown-skill', `exercises.${exercise.id}`, `Unknown skill ${skillId}.`);
    }
    for (const termId of exercise.termIds) {
      if (!termIds.has(termId))
        add(issues, 'unknown-term', `exercises.${exercise.id}`, `Unknown glossary term ${termId}.`);
    }
    const referencedMisconceptions = [
      ...exercise.misconceptionIds,
      ...(exercise.rubric.misconceptionIds ?? []),
      ...exercise.alternativeExplanations.flatMap((alternative) =>
        alternative.misconceptionId ? [alternative.misconceptionId] : [],
      ),
    ];
    for (const id of referencedMisconceptions) {
      if (!misconceptionIds.has(id))
        add(
          issues,
          'unknown-misconception',
          `exercises.${exercise.id}`,
          `Unknown misconception ${id}.`,
        );
    }
    validateReferences(
      exercise.sourceReferences,
      `exercises.${exercise.id}.sourceReferences`,
      issues,
    );
    const decisionEntries = [
      ...(exercise.rubric.kind === 'decision'
        ? [
            {
              path: `exercises.${exercise.id}`,
              rubric: exercise.rubric,
              options: exercise.reasonOptions,
              decisionOptions: exercise.options,
              decisionOptionMap: exercise.decisionOptionMap,
            },
          ]
        : []),
      ...(exercise.capstoneSteps ?? [])
        .filter((step) => step.rubric.kind === 'decision')
        .map((step) => ({
          path: `exercises.${exercise.id}.capstoneSteps.${step.id}`,
          rubric: step.rubric as Extract<AnswerRubric, { kind: 'decision' }>,
          options: step.reasonOptions,
          decisionOptions: step.options,
          decisionOptionMap: step.decisionOptionMap,
        })),
    ];
    for (const entry of decisionEntries) {
      const mappedIds = Object.keys(entry.decisionOptionMap ?? {});
      const authoredDecisionIds = new Set(entry.decisionOptions?.map((option) => option.id) ?? []);
      if (mappedIds.length < 2) {
        add(
          issues,
          'insufficient-decision-options',
          entry.path,
          'Decision exercises need at least two explicitly mapped choices.',
        );
      }
      if (mappedIds.some((id) => !authoredDecisionIds.has(id))) {
        add(
          issues,
          'unresolved-decision-option',
          entry.path,
          'Every mapped decision ID must resolve to an authored option.',
        );
      }
      const mappedDecisions = new Set(Object.values(entry.decisionOptionMap ?? {}));
      if (entry.rubric.acceptedDecisions.some((decision) => !mappedDecisions.has(decision))) {
        add(
          issues,
          'unreachable-accepted-decision',
          entry.path,
          'Every accepted domain decision needs a reachable authored choice.',
        );
      }
      const required = new Set(entry.rubric.requiredReasonIds ?? []);
      const optionIds = entry.options?.map((option) => option.id) ?? [];
      if (required.size === 0) continue;
      if (new Set(optionIds).size !== optionIds.length)
        add(issues, 'duplicate-reason-option', entry.path, 'Decision reason IDs must be unique.');
      if ([...required].some((id) => !optionIds.includes(id)))
        add(
          issues,
          'missing-required-reason-option',
          entry.path,
          'Every required reason needs an authored Hebrew option.',
        );
      if (!optionIds.some((id) => !required.has(id)))
        add(
          issues,
          'reason-answer-key-leak',
          entry.path,
          'Decision reasons need at least one plausible authored distractor.',
        );
    }
    if (exercise.rubric.kind === 'capstone') {
      if (exercise.options?.length) {
        add(
          issues,
          'unused-capstone-options',
          `exercises.${exercise.id}`,
          'Capstone choices must belong to a rendered workflow step.',
        );
      }
      for (const step of exercise.capstoneSteps ?? []) {
        const optionIds = step.options?.map((option) => option.id) ?? [];
        const requiredIds =
          step.rubric.kind === 'selection'
            ? step.rubric.expectedIds
            : step.rubric.kind === 'multiple-choice'
              ? step.rubric.acceptedOptionIds
              : step.rubric.kind === 'sequence'
                ? step.rubric.expectedOrder
                : [];
        if (requiredIds.length === 0) continue;
        const stepPath = `exercises.${exercise.id}.capstoneSteps.${step.id}`;
        if (new Set(optionIds).size !== optionIds.length) {
          add(issues, 'duplicate-capstone-option', stepPath, 'Capstone option IDs must be unique.');
        }
        if (requiredIds.some((id) => !optionIds.includes(id))) {
          add(
            issues,
            'missing-capstone-rubric-choice',
            stepPath,
            'Every capstone rubric choice must resolve to an authored learner-visible option.',
          );
        }
        if (step.rubric.kind !== 'sequence' && !optionIds.some((id) => !requiredIds.includes(id))) {
          add(
            issues,
            'capstone-answer-key-leak',
            stepPath,
            'Capstone choice stages need at least one authored distractor.',
          );
        }
      }
    }
    const reachableAnswerIds = new Set(reachableAlternativeAnswerIds(exercise));
    const reachableFeedbackCodes = new Set(incorrectFeedbackCodes(exercise.rubric));
    for (const [index, alternative] of exercise.alternativeExplanations.entries()) {
      const path = `exercises.${exercise.id}.alternativeExplanations[${index}]`;
      if (
        Number(alternative.answerId !== undefined) +
          Number(alternative.feedbackCode !== undefined) !==
        1
      ) {
        add(
          issues,
          'invalid-alternative-feedback-match',
          path,
          'Exactly one answerId or feedbackCode match key is required.',
        );
      }
      if (alternative.answerId && !reachableAnswerIds.has(alternative.answerId)) {
        add(
          issues,
          exercise.rubric.kind === 'capstone'
            ? 'unreachable-capstone-feedback'
            : 'unreachable-alternative-feedback',
          path,
          'Answer-specific feedback must target a rendered choice that can make the submission incorrect.',
        );
      }
      if (alternative.feedbackCode && !reachableFeedbackCodes.has(alternative.feedbackCode)) {
        add(
          issues,
          'unreachable-alternative-feedback-code',
          path,
          'Feedback-code alternative must target an incorrect outcome emitted by this rubric.',
        );
      }
    }
  }
  for (const draft of catalog.draftLessons) {
    for (const skillId of draft.skillIds) {
      if (!skillIds.has(skillId))
        add(issues, 'unknown-skill', `draftLessons.${draft.id}`, `Unknown skill ${skillId}.`);
    }
    for (const prerequisite of draft.prerequisiteLessonIds) {
      if (!lessonIds.has(prerequisite))
        add(
          issues,
          'unknown-prerequisite',
          `draftLessons.${draft.id}`,
          `Unknown prerequisite ${prerequisite}.`,
        );
    }
    validateReferences(draft.sourceReferences, `draftLessons.${draft.id}.sourceReferences`, issues);
  }
  for (const term of catalog.glossary) {
    validateReferences(term.sourceReferences, `glossary.${term.id}.sourceReferences`, issues);
  }
}

function validateHebrewAndFeedback(catalog: ContentCatalog, issues: ValidationIssue[]): void {
  const requireHebrew = (value: string, path: string): void => {
    if (!hebrewPattern.test(value))
      add(issues, 'missing-hebrew', path, 'Published Hebrew-first text must contain Hebrew.');
  };
  for (const lesson of catalog.lessons) {
    requireHebrew(lesson.titleHe, `lessons.${lesson.id}.titleHe`);
    requireHebrew(lesson.summaryHe, `lessons.${lesson.id}.summaryHe`);
  }
  for (const exercise of catalog.exercises) {
    const path = `exercises.${exercise.id}`;
    requireHebrew(exercise.promptHe, `${path}.promptHe`);
    requireHebrew(exercise.explanationHe, `${path}.explanationHe`);
    if (!exercise.explanationHe.trim()) {
      add(
        issues,
        'missing-explanation',
        `${path}.explanationHe`,
        'A reviewed explanation is required.',
      );
    }
    requireHebrew(exercise.safetyNoteHe, `${path}.safetyNoteHe`);
    if (exercise.editorialStatus !== 'reviewed')
      add(issues, 'exercise-not-reviewed', path, 'All 60 beta exercises must be reviewed.');
    if (exercise.alternativeExplanations.length === 0)
      add(issues, 'missing-alternative-feedback', path, 'Common-alternative feedback is required.');
    for (const alternative of exercise.alternativeExplanations)
      requireHebrew(alternative.explanationHe, `${path}.alternativeExplanations`);
    if (exercise.hints.length < 3)
      add(
        issues,
        'short-hint-ladder',
        path,
        'Each exercise needs at least three progressive hints.',
      );
    const levels = exercise.hints.map((hint) => hint.level);
    if (
      new Set(levels).size !== levels.length ||
      levels.some((level, index) => index > 0 && level <= levels[index - 1]!)
    ) {
      add(
        issues,
        'invalid-hint-ladder',
        path,
        'Hint levels must be unique and strictly increasing.',
      );
    }
    for (const hint of exercise.hints) requireHebrew(hint.textHe, `${path}.hints.${hint.id}`);
    if (exercise.processCriteriaHe.length === 0)
      add(
        issues,
        'missing-process-criteria',
        path,
        'Outcome-independent process criteria are required.',
      );
    if (exercise.isAmbiguous && !rubricAllowsUncertainty(exercise.rubric)) {
      add(
        issues,
        'ambiguous-without-uncertainty-answer',
        path,
        'Ambiguous exercises need a permitted uncertainty answer.',
      );
    }
    if (
      exercise.skillIds.includes('risk.position-size') &&
      !/עלות|עמלה|מרווח|החלק/.test(
        [
          exercise.promptHe,
          exercise.explanationHe,
          exercise.safetyNoteHe,
          ...exercise.processCriteriaHe,
        ].join(' '),
      )
    ) {
      add(
        issues,
        'sizing-without-costs',
        path,
        'Position-size work must include expected per-unit costs.',
      );
    }
  }
  for (const term of catalog.glossary) {
    requireHebrew(term.termHe, `glossary.${term.id}.termHe`);
    requireHebrew(term.definitionHe, `glossary.${term.id}.definitionHe`);
    if (term.termHeDirection !== 'rtl' || term.termEnDirection !== 'ltr') {
      add(
        issues,
        'glossary-direction',
        `glossary.${term.id}`,
        'Bilingual terms need explicit RTL/LTR direction metadata.',
      );
    }
  }
}

function validateRubricCutoff(
  exercise: ContentCatalog['exercises'][number],
  issues: ValidationIssue[],
): void {
  const cutoff = exercise.chartSpec?.decisionCandleIndex;
  if (cutoff === undefined) return;
  const rubrics =
    exercise.rubric.kind === 'capstone'
      ? exercise.rubric.steps.map((step) => ({
          path: `exercises.${exercise.id}.rubric.steps.${step.id}`,
          rubric: step.rubric,
        }))
      : [{ path: `exercises.${exercise.id}.rubric`, rubric: exercise.rubric }];
  for (const { path, rubric } of rubrics) {
    if (rubric.kind === 'point' && rubric.targets.some((target) => target.candleIndex > cutoff)) {
      add(
        issues,
        'future-rubric-target',
        path,
        'Point target uses a candle after the decision cutoff.',
      );
    }
    if (rubric.kind === 'zone' && rubric.target.endCandleIndex > cutoff) {
      add(
        issues,
        'future-rubric-target',
        path,
        'Zone target uses a candle after the decision cutoff.',
      );
    }
    if (
      rubric.kind === 'line' &&
      (rubric.target.start.candleIndex > cutoff || rubric.target.end.candleIndex > cutoff)
    ) {
      add(
        issues,
        'future-rubric-target',
        path,
        'Line target uses a candle after the decision cutoff.',
      );
    }
    if (
      rubric.kind === 'label-placement' &&
      rubric.targets.some((target) => target.target.candleIndex > cutoff)
    ) {
      add(
        issues,
        'future-rubric-target',
        path,
        'Label target uses a candle after the decision cutoff.',
      );
    }
  }
}

function validateChartReproduction(catalog: ContentCatalog, issues: ValidationIssue[]): void {
  const seeds = new Set<number>();
  for (const exercise of catalog.exercises) {
    const path = `exercises.${exercise.id}.chartSpec`;
    const spec = exercise.chartSpec;
    if (!spec) {
      add(
        issues,
        'missing-chart-spec',
        path,
        'Every reviewed exercise needs a deterministic chart spec.',
      );
      continue;
    }
    if (seeds.has(spec.seed))
      add(issues, 'duplicate-chart-seed', path, `Chart seed ${spec.seed} is reused.`);
    seeds.add(spec.seed);
    try {
      const firstCandles = generatePriceSeries(spec);
      const secondCandles = generatePriceSeries(spec);
      const firstAnnotations = generateSemanticAnnotations(spec, firstCandles);
      const secondAnnotations = generateSemanticAnnotations(spec, secondCandles);
      if (stable(firstCandles) !== stable(secondCandles))
        add(issues, 'unreproducible-seed', path, 'The same seed produced different candles.');
      if (stable(firstAnnotations) !== stable(secondAnnotations))
        add(
          issues,
          'unreproducible-annotations',
          path,
          'The same chart produced different semantic annotations.',
        );
      const expectedFingerprint = EXPECTED_ANNOTATION_FINGERPRINTS[exercise.id];
      if (!expectedFingerprint)
        add(
          issues,
          'missing-expected-annotations',
          path,
          'Reviewed chart is missing an editorial annotation fingerprint.',
        );
      else if (annotationFingerprint(firstAnnotations) !== expectedFingerprint)
        add(
          issues,
          'expected-annotations-mismatch',
          path,
          'Generated semantic annotations no longer match the editorially approved chart.',
        );
      if (firstCandles.length !== spec.candleCount)
        add(
          issues,
          'chart-length-mismatch',
          path,
          'Generated candle count does not match the spec.',
        );
      if (firstAnnotations.length === 0)
        add(issues, 'missing-annotations', path, 'Generated chart has no semantic annotations.');
      if (duplicates(firstAnnotations.map((annotation) => annotation.id)).length > 0)
        add(issues, 'duplicate-annotation-id', path, 'Generated annotation IDs must be unique.');
    } catch (error) {
      add(
        issues,
        'chart-reproduction-error',
        path,
        error instanceof Error ? error.message : String(error),
      );
    }
    validateRubricCutoff(exercise, issues);
  }
}

function validateQuotas(catalog: ContentCatalog, issues: ValidationIssue[]): void {
  const categoryCounts: Record<string, number> = {};
  for (const exercise of catalog.exercises)
    categoryCounts[exercise.category] = (categoryCounts[exercise.category] ?? 0) + 1;
  for (const [category, expected] of Object.entries(EXPECTED_CATEGORIES)) {
    if ((categoryCounts[category] ?? 0) !== expected)
      add(
        issues,
        'category-quota',
        `exercises.category.${category}`,
        `Expected ${expected}, received ${categoryCounts[category] ?? 0}.`,
      );
  }
  const interactionTypes = new Set(catalog.exercises.map((exercise) => exercise.interactionType));
  for (const interaction of REQUIRED_INTERACTIONS) {
    if (!interactionTypes.has(interaction))
      add(
        issues,
        'missing-interaction',
        'exercises.interactionType',
        `Missing requested interaction ${interaction}.`,
      );
  }
  const ambiguous = catalog.exercises.filter((exercise) =>
    ['near-miss', 'ambiguous', 'lookalike'].includes(exercise.role),
  ).length;
  if (ambiguous < 10)
    add(
      issues,
      'ambiguity-quota',
      'exercises',
      `Expected at least 10 near-miss/ambiguous/lookalike records, received ${ambiguous}.`,
    );
  const uncertainty = catalog.exercises.filter((exercise) =>
    rubricAllowsUncertainty(exercise.rubric),
  ).length;
  if (uncertainty < 10)
    add(
      issues,
      'uncertainty-quota',
      'exercises',
      `Expected at least 10 disciplined uncertainty answers, received ${uncertainty}.`,
    );
  const riskCount = catalog.exercises.filter((exercise) => exercise.isRiskOrPositionSize).length;
  if (riskCount < 10)
    add(
      issues,
      'risk-quota',
      'exercises',
      `Expected at least 10 risk/position-size records, received ${riskCount}.`,
    );
  const noTrade = catalog.exercises.reduce((count, exercise) => {
    if (exercise.rubric.kind === 'decision')
      return count + (exercise.rubric.acceptedDecisions.includes('no-trade') ? 1 : 0);
    if (exercise.rubric.kind === 'capstone')
      return (
        count +
        exercise.rubric.steps.filter(
          (step) =>
            step.rubric.kind === 'decision' && step.rubric.acceptedDecisions.includes('no-trade'),
        ).length
      );
    return count;
  }, 0);
  if (noTrade < 2)
    add(
      issues,
      'no-trade-quota',
      'exercises',
      `Expected at least two integrated no-trade answers, received ${noTrade}.`,
    );
}

function validateCapstone(catalog: ContentCatalog, issues: ValidationIssue[]): void {
  const capstones = catalog.exercises.filter((exercise) => exercise.capstoneSteps !== undefined);
  if (capstones.length !== 1) {
    add(
      issues,
      'capstone-count',
      'exercises',
      `Expected exactly one multi-step capstone, received ${capstones.length}.`,
    );
    return;
  }
  const capstone = capstones[0]!;
  const stepIds = capstone.capstoneSteps?.map((step) => step.id) ?? [];
  if (stable(stepIds) !== stable(WORKFLOW_STEP_IDS))
    add(
      issues,
      'capstone-workflow',
      `exercises.${capstone.id}`,
      'Capstone steps must use all eleven canonical stages in order.',
    );
  if (new Set(capstone.capstoneSteps?.map((step) => step.rubric.kind)).size < 2)
    add(
      issues,
      'capstone-rubric-variety',
      `exercises.${capstone.id}`,
      'Capstone stages must be graded independently with more than one rubric family.',
    );
  if (capstone.rubric.kind !== 'capstone') {
    add(
      issues,
      'capstone-runtime-rubric',
      `exercises.${capstone.id}.rubric`,
      'A learner-facing capstone must use the aggregate capstone rubric.',
    );
  } else if (
    stable(capstone.rubric.steps.map((step) => step.id)) !== stable(stepIds) ||
    capstone.rubric.steps.some(
      (step, index) => step.rubric.kind !== capstone.capstoneSteps?.[index]?.rubric.kind,
    )
  ) {
    add(
      issues,
      'capstone-runtime-step-mismatch',
      `exercises.${capstone.id}.rubric`,
      'The aggregate capstone rubric must mirror every authored workflow stage.',
    );
  }
}

function computeCounts(catalog: ContentCatalog): ValidationCounts {
  const categories: Record<string, number> = {};
  for (const exercise of catalog.exercises)
    categories[exercise.category] = (categories[exercise.category] ?? 0) + 1;
  return {
    units: catalog.units.length,
    draftLessons: catalog.draftLessons.length,
    lessons: catalog.lessons.length,
    exercises: catalog.exercises.length,
    reviewedExercises: catalog.exercises.filter(
      (exercise) => exercise.editorialStatus === 'reviewed',
    ).length,
    glossaryTerms: catalog.glossary.length,
    nearMissAmbiguousLookalike: catalog.exercises.filter((exercise) =>
      ['near-miss', 'ambiguous', 'lookalike'].includes(exercise.role),
    ).length,
    uncertaintyAnswers: catalog.exercises.filter((exercise) =>
      rubricAllowsUncertainty(exercise.rubric),
    ).length,
    riskOrPositionSize: catalog.exercises.filter((exercise) => exercise.isRiskOrPositionSize)
      .length,
    capstones: catalog.exercises.filter((exercise) => exercise.capstoneSteps !== undefined).length,
    categories,
  };
}

export function validateCatalog(catalog: ContentCatalog = bundledCatalog): ValidationReport {
  const issues: ValidationIssue[] = [];
  const parsed = contentCatalogSchema.safeParse(catalog);
  if (!parsed.success) {
    for (const issue of parsed.error.issues)
      add(issues, 'schema', issue.path.join('.'), issue.message);
  }
  validateUniqueIds(catalog, issues);
  validateCanonicalInventory(catalog, issues);
  validateGraph(
    catalog.units.map((unit) => ({ id: unit.id, prerequisites: unit.prerequisiteUnitIds })),
    'units',
    issues,
  );
  validateGraph(
    catalog.lessons.map((lesson) => ({
      id: lesson.id,
      prerequisites: lesson.prerequisiteLessonIds,
    })),
    'lessons',
    issues,
  );
  validateGraph(
    catalog.skills.map((skill) => ({ id: skill.id, prerequisites: skill.prerequisiteSkillIds })),
    'skills',
    issues,
  );
  validateCurriculumLinks(catalog, issues);
  validateHebrewAndFeedback(catalog, issues);
  validateChartReproduction(catalog, issues);
  validateQuotas(catalog, issues);
  validateCapstone(catalog, issues);
  if (catalog.exercises.length !== 60)
    add(
      issues,
      'exercise-count',
      'exercises',
      `Expected exactly 60 exercises, received ${catalog.exercises.length}.`,
    );
  if (catalog.lessons.length !== 12)
    add(
      issues,
      'lesson-count',
      'lessons',
      `Expected exactly 12 lessons, received ${catalog.lessons.length}.`,
    );
  const promptDuplicates = duplicates(
    catalog.exercises.map((exercise) => exercise.promptHe.trim()),
  );
  if (promptDuplicates.length > 0)
    add(
      issues,
      'duplicate-prompt',
      'exercises.promptHe',
      'Learner prompts must be original and unique.',
    );
  return { valid: issues.length === 0, issues, counts: computeCounts(catalog) };
}

export function assertValidCatalog(catalog: ContentCatalog = bundledCatalog): void {
  const report = validateCatalog(catalog);
  if (!report.valid) {
    throw new Error(
      report.issues.map((issue) => `[${issue.code}] ${issue.path}: ${issue.message}`).join('\n'),
    );
  }
}
