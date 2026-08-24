import type { AnswerRubric, ExerciseOption } from '@chartpath/domain';
import type { TradeDecision } from '@chartpath/domain';

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

const decisionReasonOptions: Readonly<Record<string, readonly ExerciseOption[]>> = {
  'u00-scenarios-e04': [
    { id: 'future-only-clarity', labelHe: 'הבהירות נוצרה רק לאחר חשיפת התוצאה' },
    { id: 'rule-not-precommitted', labelHe: 'לא הוגדר כלל זיהוי ואישור מראש' },
    { id: 'later-profit-validates', labelHe: 'תוצאה חיובית מאוחרת מוכיחה שהניתוח היה תקף' },
    { id: 'one-more-candle-fixes-rule', labelHe: 'נר נוסף מחליף את הצורך בכלל מוקדם' },
  ],
  'u02-structure-e03': [
    { id: 'nonconfirmation-supporting-only', labelHe: 'אי־אישור הוא ראיה מסייעת בלבד' },
    { id: 'price-structure-intact', labelHe: 'מבנה המחיר עדיין לא נשבר' },
    { id: 'volume-overrides-price', labelHe: 'המחזור לבדו מבטל את מבנה המחיר' },
  ],
  'u02-structure-e05': [
    { id: 'below-swing-threshold', labelHe: 'השינוי קטן מסף השינוי שנקבע' },
    { id: 'new-sequence-absent', labelHe: 'עדיין אין רצף מבני חדש' },
    { id: 'single-break-is-reversal', labelHe: 'שבירה יחידה מספיקה להכרזת היפוך מלא' },
  ],
  'u03-levels-e03': [
    { id: 'contextual-significance', labelHe: 'משמעות הרמה תלויה בהקשר' },
    { id: 'tests-may-consume', labelHe: 'בדיקות חוזרות עשויות לשחוק את האזור' },
    { id: 'touch-count-only', labelHe: 'מספר הנגיעות לבדו קובע את איכות הרמה' },
  ],
  'u03-levels-e05': [
    { id: 'rule-not-met', labelHe: 'כלל האישור שנקבע מראש לא התקיים' },
    { id: 'steep-line-may-be-pace-change', labelHe: 'שבירת קו תלול עשויה להיות שינוי קצב בלבד' },
    { id: 'any-line-break-reversal', labelHe: 'כל שבירת קו מגמה מאשרת היפוך' },
  ],
  'u05-reversal-e01': [
    { id: 'missing-prior-uptrend', labelHe: 'חסרה מגמת עלייה קודמת' },
    { id: 'right-shoulder-incomplete', labelHe: 'הכתף הימנית עדיין לא הושלמה' },
    { id: 'three-peaks-are-enough', labelHe: 'שלוש פסגות מספיקות בלי קשר קודם' },
  ],
  'u05-reversal-e05': [
    { id: 'rectangle-direction-unconfirmed', labelHe: 'כיוון היציאה מן המלבן עדיין לא אושר' },
    {
      id: 'continuation-label-predicts-direction',
      labelHe: 'השם ״המשכי״ מנבא מראש את כיוון היציאה',
    },
  ],
  'u06-breakouts-e02': [
    { id: 'needs-post-gap-follow-through', labelHe: 'נדרשת תגובת מחיר לאחר הפער' },
    { id: 'gap-size-settles-type', labelHe: 'גודל הפער לבדו קובע את סוגו' },
    { id: 'volume-settles-type', labelHe: 'מחזור גבוה לבדו מוכיח מיצוי' },
  ],
  'u07-timeframes-e02': [
    { id: 'higher-timeframe-conflict', labelHe: 'קיים קונפליקט עם מסגרת הזמן הגבוהה' },
    { id: 'untested-countertrend-rule', labelHe: 'אין כלל בדוק לעסקה נגד המגמה' },
    { id: 'limited-reward', labelHe: 'הרמה הקרובה מגבילה את פוטנציאל התגמול' },
    { id: 'hourly-signal-overrides', labelHe: 'אות שעתי תקף גובר תמיד על ההקשר השבועי' },
  ],
  'u07-timeframes-e05': [
    { id: 'spread-too-wide', labelHe: 'המרווח רחב מדי' },
    { id: 'insufficient-history', labelHe: 'אין מספיק היסטוריה לבדיקה' },
    { id: 'insufficient-liquidity', labelHe: 'הנזילות אינה מספקת' },
    { id: 'scheduled-event', labelHe: 'אירוע מתוזמן קרוב משנה את הסיכון' },
    { id: 'shape-overrides-market-data', labelHe: 'צורה נקייה מבטלת מגבלות נזילות והיסטוריה' },
  ],
  'u09-evidence-e03': [
    { id: 'costs-exceed-gross-edge', labelHe: 'העלויות עולות על היתרון הגולמי' },
    { id: 'small-sample', labelHe: 'המדגם קטן מדי' },
    { id: 'missing-drawdown', labelHe: 'חסר נתון על ירידה מרבית' },
    { id: 'missing-stability', labelHe: 'יציבות התוצאה לא נבדקה' },
    { id: 'gross-backtest-enough', labelHe: 'תוצאה גולמית חיובית מספיקה בלי עלויות וסיכון' },
  ],
  'u10-capstone-e04': [
    { id: 'required-target-201.1', labelHe: 'כדי להגיע ל־1.5R נדרש יעד 201.1' },
    { id: 'weekly-resistance-conflict', labelHe: 'היעד מתנגש בהתנגדות השבועית' },
    { id: 'no-structural-tighter-stop', labelHe: 'אין עוגן מבני לעצירה צרה יותר' },
    { id: 'move-stop-to-fit', labelHe: 'אפשר להזיז עצירה רק כדי להתאים את היחס' },
  ],
};

/**
 * Authored UI option → domain decision mappings. Keeping this explicit prevents
 * labels such as `decision-tighten-stop` from being guessed from substrings.
 */
const decisionOptionMaps: Readonly<Record<string, Readonly<Record<string, TradeDecision>>>> = {
  'u00-scenarios-e04': {
    trade: 'trade',
    wait: 'wait',
    reject: 'reject',
    'insufficient-evidence': 'insufficient-evidence',
  },
  'u02-structure-e03': {
    trade: 'trade',
    wait: 'wait',
    reject: 'reject',
    'insufficient-evidence': 'insufficient-evidence',
  },
  'u02-structure-e05': {
    trade: 'trade',
    wait: 'wait',
    reject: 'reject',
    'insufficient-evidence': 'insufficient-evidence',
  },
  'u03-levels-e03': {
    trade: 'trade',
    wait: 'wait',
    reject: 'reject',
    'insufficient-evidence': 'insufficient-evidence',
  },
  'u03-levels-e05': {
    trade: 'trade',
    wait: 'wait',
    reject: 'reject',
    'insufficient-evidence': 'insufficient-evidence',
  },
  'u05-reversal-e01': {
    'reject-pattern': 'reject',
    'wait-for-right-shoulder': 'wait',
    'accept-three-peaks': 'trade',
  },
  'u05-reversal-e05': {
    'wait-for-breakout': 'wait',
    'insufficient-direction': 'insufficient-evidence',
    'trade-up-prior-trend': 'trade',
    'trade-down-long-range': 'trade',
  },
  'u06-breakouts-e02': {
    'wait-for-follow-through': 'wait',
    'insufficient-post-gap-data': 'insufficient-evidence',
    'continuation-large-gap': 'trade',
    'exhaustion-high-volume': 'reject',
  },
  'u07-timeframes-e02': {
    'decision-trade': 'trade',
    'decision-wait': 'wait',
    'decision-reject-context': 'reject',
  },
  'u07-timeframes-e05': {
    'decision-trade': 'trade',
    'decision-reject': 'reject',
    'decision-wait-event-only': 'wait',
  },
  'u09-evidence-e03': {
    'decision-trade': 'trade',
    'decision-insufficient': 'insufficient-evidence',
    'decision-reject-forever': 'reject',
  },
  'u10-capstone-e04': {
    'decision-no-trade-honest': 'no-trade',
    'decision-move-target': 'trade',
    'decision-tighten-stop': 'trade',
  },
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

function canonicalRubric<T extends AnswerRubric>(rubric: T): T {
  if (!rubric.misconceptionIds) return rubric;
  return {
    ...rubric,
    misconceptionIds: rubric.misconceptionIds.map(canonicalMisconceptionId),
  } as T;
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
    ...(decisionReasonOptions[exercise.id]
      ? { reasonOptions: decisionReasonOptions[exercise.id] }
      : {}),
    ...(decisionOptionMaps[exercise.id]
      ? { decisionOptionMap: decisionOptionMaps[exercise.id] }
      : {}),
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
