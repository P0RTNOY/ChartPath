import type { AnswerRubric } from '@chartpath/domain';

import { draftLessons, lessons, misconceptions, skills, units } from './curriculum.js';
import { exercises01To04 } from './exercises-01-04.js';
import { exercises05To08 } from './exercises-05-08.js';
import { exercises09To12 } from './exercises-09-12.js';
import { glossary } from './glossary.js';
import type { ContentCatalog, ContentExercise } from './types.js';
import { contentMigrations, contentVersion } from './version.js';

const legacySkillIds: Readonly<Record<string, string>> = {
  'safe-scenarios': 'safe.ta-boundaries',
  'chart-data': 'data.ohlcv',
  'timeframe-scale': 'data.timeframe-scale',
  'trend-layers': 'structure.dow-trends',
  'market-structure': 'structure.swings',
  levels: 'levels.zones',
  trendlines: 'levels.lines',
  'volume-context': 'evidence.volume',
  'reversal-structures': 'patterns.reversal',
  'continuation-structures': 'patterns.continuation',
  'gap-context': 'events.gaps',
  'breakout-rules': 'breakouts.rules',
  'multi-timeframe': 'context.multitimeframe',
  workflow: 'workflow.eleven-step',
  'invalidation-execution': 'risk.invalidation-execution',
  'risk-r': 'risk.r',
  'position-sizing': 'risk.position-size',
  'evidence-testing': 'evidence.testing',
  'market-adaptation': 'markets.constraints',
  'review-system': 'review.process',
};

const categoryOverrides: Readonly<Record<string, ContentExercise['category']>> = {
  'u04-volume-e03': 'visual',
  'u04-volume-e05': 'calculation',
  'u05-reversal-e03': 'visual',
  'u05-reversal-e05': 'explanation',
  'u05-continuation-e05': 'explanation',
};

const interactionOverrides: Readonly<Record<string, ContentExercise['interactionType']>> = {
  'u00-scenarios-e04': 'mistake-diagnosis',
  'u01-chart-data-e01': 'label-placement',
  'u02-structure-e01': 'timeframe-comparison',
  'u06-breakouts-e04': 'sequential-reveal',
};

// These charts are ambiguous/lookalike examples, but their learner tasks have one
// deterministic classification. `isAmbiguous` is reserved for answer ambiguity.
const deterministicAmbiguousChartTasks = new Set(['u04-volume-e04', 'u05-continuation-e04']);

function canonicalMisconceptionId(id: string): string {
  if (id.startsWith('misconception.')) return id.replaceAll('_', '-');
  return `misconception.${id.replaceAll('_', '-')}`;
}

function canonicalTermId(id: string): string {
  if (id.startsWith('term.')) return id;
  if (id === 'risk-unit-r') return 'term.r';
  return `term.${id}`;
}

function canonicalRubric(rubric: AnswerRubric): AnswerRubric {
  if (!rubric.misconceptionIds) return rubric;
  return {
    ...rubric,
    misconceptionIds: rubric.misconceptionIds.map(canonicalMisconceptionId),
  };
}

function canonicalExercise(exercise: ContentExercise): ContentExercise {
  const variant = exercise.chartSpec?.parameters?.variant;
  const chartSpec =
    exercise.chartSpec && variant === 'transfer'
      ? {
          ...exercise.chartSpec,
          parameters: { ...exercise.chartSpec.parameters, variant: 'positive' },
        }
      : exercise.chartSpec;
  return {
    ...exercise,
    skillIds: exercise.skillIds.map((id) => legacySkillIds[id] ?? id),
    termIds: exercise.termIds.map(canonicalTermId),
    misconceptionIds: exercise.misconceptionIds.map(canonicalMisconceptionId),
    rubric: canonicalRubric(exercise.rubric),
    ...(chartSpec ? { chartSpec } : {}),
    alternativeExplanations: exercise.alternativeExplanations.map((alternative) => ({
      ...alternative,
      ...(alternative.misconceptionId
        ? { misconceptionId: canonicalMisconceptionId(alternative.misconceptionId) }
        : {}),
    })),
    category: categoryOverrides[exercise.id] ?? exercise.category,
    interactionType: interactionOverrides[exercise.id] ?? exercise.interactionType,
    ...(deterministicAmbiguousChartTasks.has(exercise.id) ? { isAmbiguous: false } : {}),
    ...(exercise.capstoneSteps
      ? {
          capstoneSteps: exercise.capstoneSteps.map((step) => ({
            ...step,
            rubric: canonicalRubric(step.rubric),
          })),
        }
      : {}),
  };
}

export const exercises: readonly ContentExercise[] = [
  ...exercises01To04,
  ...exercises05To08,
  ...exercises09To12,
].map(canonicalExercise);

export const catalog: ContentCatalog = {
  version: contentVersion,
  units,
  lessons,
  exercises,
  skills,
  misconceptions,
  glossary,
  migrations: contentMigrations,
  draftLessons,
};
