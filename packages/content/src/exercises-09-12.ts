import type { AnswerRubric, ChartScenario } from '@chartpath/domain';

import { sourceRefs } from './source.js';
import type {
  CapstoneStep,
  ContentExercise,
  ExerciseCategory,
  ExerciseRole,
  WorkflowStepId,
} from './types.js';
import { CONTENT_SCHEMA_VERSION, CONTENT_VERSION_ID } from './version.js';

const ALL_WORKFLOW_STEPS: readonly WorkflowStepId[] = [
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
];

const WORKFLOW_STEP_LABELS_HE: Readonly<Record<WorkflowStepId, string>> = {
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

interface ExerciseSeed {
  readonly id: string;
  readonly seed: number;
  readonly timeframe: string;
  readonly scenario: ChartScenario;
  readonly chartParameters?: Readonly<Record<string, null | boolean | number | string>>;
  readonly skillIds: readonly string[];
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly promptHe: string;
  readonly interactionType: ContentExercise['interactionType'];
  readonly options?: ContentExercise['options'];
  readonly rubric: AnswerRubric;
  readonly explanationHe: string;
  readonly alternativeExplanations: ContentExercise['alternativeExplanations'];
  readonly misconceptionIds: readonly string[];
  readonly hintTexts: readonly [string, string, string];
  readonly sourceReferences: ContentExercise['sourceReferences'];
  readonly isAmbiguous?: boolean;
  readonly workflowStepIds: readonly WorkflowStepId[];
  readonly termIds: readonly string[];
  readonly role: ExerciseRole;
  readonly category: ExerciseCategory;
  readonly safetyNoteHe: string;
  readonly processCriteriaHe: readonly string[];
  readonly isRiskOrPositionSize: boolean;
  readonly capstoneSteps?: readonly CapstoneStep[];
}

function authoredExercise(seed: ExerciseSeed): ContentExercise {
  return {
    id: seed.id,
    skillIds: seed.skillIds,
    difficulty: seed.difficulty,
    promptHe: seed.promptHe,
    interactionType: seed.interactionType,
    options: seed.options,
    chartSpec: {
      id: `${seed.id}-chart`,
      seed: seed.seed,
      generatorVersion: '1.0.0',
      candleCount: 72,
      timeframe: seed.timeframe,
      scenario: seed.scenario,
      basePrice:
        typeof seed.chartParameters?.basePrice === 'number' ? seed.chartParameters.basePrice : 100,
      baseVolume: 1_000_000,
      volatility: 0.018,
      noise: 0.32,
      decisionCandleIndex: 59,
      parameters: {
        exerciseId: seed.id,
        variant: seed.role,
        ...seed.chartParameters,
      },
    },
    rubric: seed.rubric,
    explanationHe: seed.explanationHe,
    alternativeExplanations: seed.alternativeExplanations,
    misconceptionIds: seed.misconceptionIds,
    hints: seed.hintTexts.map((textHe, index) => ({
      id: `${seed.id}-hint-${index + 1}`,
      level: index + 1,
      textHe,
    })),
    sourceReferences: seed.sourceReferences,
    isAmbiguous: seed.isAmbiguous,
    editorialStatus: 'reviewed',
    schemaVersion: CONTENT_SCHEMA_VERSION,
    contentVersionId: CONTENT_VERSION_ID,
    workflowStepIds: seed.workflowStepIds,
    termIds: seed.termIds,
    role: seed.role,
    category: seed.category,
    safetyNoteHe: seed.safetyNoteHe,
    processCriteriaHe: seed.processCriteriaHe,
    isRiskOrPositionSize: seed.isRiskOrPositionSize,
    capstoneSteps: seed.capstoneSteps,
  };
}

const caseCWorkflow: readonly CapstoneStep[] = [
  {
    id: 'context',
    promptHe: 'בחרו את ההקשר שהיה ידוע בזמן ההחלטה: מגמה שבועית עולה מול רעיון מכירה בחסר.',
    options: [
      { id: 'weekly-uptrend', labelHe: 'המגמה השבועית עולה' },
      { id: 'countertrend-short', labelHe: 'הרעיון הוא מכירה בחסר נגד המגמה' },
      { id: 'weekly-downtrend', labelHe: 'המגמה השבועית יורדת' },
    ],
    rubric: {
      kind: 'selection',
      expectedIds: ['weekly-uptrend', 'countertrend-short'],
      mode: 'exact',
    },
  },
  {
    id: 'structure',
    promptHe: 'סמנו את המבנה הנצפה בלבד: שלושה שיאים אפשריים ושפל ביניים, בלי לקבוע שההיפוך הושלם.',
    options: [
      { id: 'three-peak-candidate', labelHe: 'מועמד לשלושה שיאים' },
      { id: 'intermediate-low', labelHe: 'שפל ביניים נצפה' },
      { id: 'confirmed-reversal', labelHe: 'היפוך מאושר כבר הושלם' },
    ],
    rubric: {
      kind: 'selection',
      expectedIds: ['three-peak-candidate', 'intermediate-low'],
      mode: 'exact',
    },
  },
  {
    id: 'level',
    promptHe: 'סמנו את רמת התמיכה שבדרך, 82.7, ואת אזור קו הצוואר, 88.',
    options: [
      { id: 'support-82.7', labelHe: 'תמיכה שבועית 82.7' },
      { id: 'neckline-88', labelHe: 'אזור קו צוואר 88' },
      { id: 'measured-target-72', labelHe: 'יעד מדוד 72 בלבד' },
    ],
    rubric: { kind: 'selection', expectedIds: ['support-82.7', 'neckline-88'], mode: 'exact' },
  },
  {
    id: 'setup',
    promptHe: 'סווגו את התצורה כראש וכתפיים אפשרי, לא כהיפוך מאושר.',
    options: [
      { id: 'possible-head-and-shoulders', labelHe: 'ראש וכתפיים אפשרי' },
      { id: 'confirmed-head-and-shoulders', labelHe: 'ראש וכתפיים מאושר' },
      { id: 'no-structure', labelHe: 'אין מבנה שניתן לתאר' },
    ],
    rubric: { kind: 'selection', expectedIds: ['possible-head-and-shoulders'], mode: 'exact' },
  },
  {
    id: 'confirmation',
    promptHe: 'בחרו את האישור שנקבע מראש: סגירה יומית מתחת לקו הצוואר 88.',
    options: [
      { id: 'daily-close-below-88', labelHe: 'סגירה יומית מתחת ל־88' },
      { id: 'intraday-touch-88', labelHe: 'מגע תוך־יומי ב־88' },
      { id: 'later-price-decline', labelHe: 'ירידה שנראתה רק בדיעבד' },
    ],
    rubric: { kind: 'selection', expectedIds: ['daily-close-below-88'], mode: 'exact' },
  },
  {
    id: 'entry',
    promptHe: 'תעדו את טריגר הכניסה התאורטי 87.8 בנפרד מן האישור ומן המילוי.',
    options: [
      { id: 'entry-trigger-87.8', labelHe: 'טריגר כניסה תאורטי 87.8' },
      { id: 'confirmation-is-fill', labelHe: 'האישור הוא בהכרח מחיר המילוי' },
      { id: 'enter-before-confirmation', labelHe: 'כניסה לפני האישור' },
    ],
    rubric: { kind: 'selection', expectedIds: ['entry-trigger-87.8'], mode: 'exact' },
  },
  {
    id: 'invalidation',
    promptHe: 'בחרו ביטול תוקף מעל הכתף הימנית והוראת עצירה אפשרית 98.6 כשני שדות נפרדים.',
    options: [
      { id: 'right-shoulder-invalidation', labelHe: 'ביטול תוקף מעל הכתף הימנית' },
      { id: 'stop-order-98.6', labelHe: 'הוראת עצירה אפשרית 98.6' },
      { id: 'stop-guarantees-98.6', labelHe: 'העצירה מבטיחה מילוי בדיוק ב־98.6' },
      { id: 'move-stop-to-improve-r', labelHe: 'להצמיד עצירה ללא עוגן כדי לשפר R' },
    ],
    rubric: {
      kind: 'selection',
      expectedIds: ['right-shoulder-invalidation', 'stop-order-98.6'],
      mode: 'exact',
    },
  },
  {
    id: 'position-size',
    promptHe:
      'לסיכון חשבון 600 ש״ח וסיכון מתוכנן של 11 ש״ח ליחידה, חשבו כמות מרבית של יחידות שלמות.',
    rubric: {
      kind: 'risk',
      expected: { accountRisk: 600, perUnitRisk: 11, positionSize: 54 },
      tolerance: { absolute: 0.01 },
    },
  },
  {
    id: 'target',
    promptHe: 'ציינו את היעד המדוד, 72, אך גם שהתמיכה 82.7 משאירה רק כ־0.48R עד המכשול הראשון.',
    rubric: { kind: 'risk', expected: { riskMultiple: 0.48 }, tolerance: { absolute: 0.02 } },
  },
  {
    id: 'management',
    promptHe: 'בחרו מה לעשות לאחר שהתצורה נפסלה עוד לפני הכניסה.',
    options: [
      { id: 'trade', labelHe: 'לנהל פוזיציה כאילו נפתחה' },
      { id: 'wait', labelHe: 'להמשיך להמתין בתוך עסקה פתוחה' },
      { id: 'no-trade', labelHe: 'אין עסקה ואין פוזיציה לניהול' },
    ],
    decisionOptionMap: { trade: 'trade', wait: 'wait', 'no-trade': 'no-trade' },
    reasonOptions: [
      { id: 'no-open-position', labelHe: 'לא נפתחה פוזיציה לאחר הפסילה' },
      { id: 'manage-hypothetical-position', labelHe: 'יש לנהל גם פוזיציה שלא נפתחה' },
      { id: 'outcome-decides-management', labelHe: 'מה שקרה אחר כך קובע אם הייתה פוזיציה' },
    ],
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['no-trade'],
      requiredReasonIds: ['no-open-position'],
    },
  },
  {
    id: 'review',
    promptHe: 'דרגו את התהליך לפי ההקשר, המכשול והיחס שתועדו מראש, ולא לפי מה שהמחיר עשה אחר כך.',
    options: [
      { id: 'context-checked', labelHe: 'ההקשר נבדק לפני התבנית' },
      { id: 'risk-checked', labelHe: 'המכשול והיחס נבדקו מראש' },
      { id: 'outcome-independent', labelHe: 'איכות התהליך נפרדת מן התוצאה' },
      { id: 'outcome-proves-process', labelHe: 'תוצאת המחיר לבדה מוכיחה את איכות התהליך' },
    ],
    rubric: {
      kind: 'selection',
      expectedIds: ['context-checked', 'risk-checked', 'outcome-independent'],
      mode: 'exact',
    },
  },
];

export const exercises09To12: readonly ContentExercise[] = [
  authoredExercise({
    id: 'u07-timeframes-e01',
    seed: 90701,
    timeframe: 'weekly/daily/hourly',
    scenario: 'continuation',
    chartParameters: { basePrice: 56, sharedAnchorIndex: 42, panelCount: 3 },
    skillIds: ['context.multitimeframe', 'workflow.eleven-step'],
    difficulty: 2,
    promptHe:
      'אותה סדרה סינתטית מוצגת בגרף שבועי, יומי ושעתי סביב אירוע עוגן משותף. סדרו את הגרפים לפי תפקידם: הקשר אסטרטגי, תצורה טקטית וטריגר ביצועי.',
    interactionType: 'sequence',
    options: [
      { id: 'weekly-context', labelHe: 'שבועי — הקשר אסטרטגי' },
      { id: 'daily-setup', labelHe: 'יומי — תצורה טקטית' },
      { id: 'hourly-trigger', labelHe: 'שעתי — טריגר ביצועי' },
    ],
    rubric: {
      kind: 'sequence',
      expectedOrder: ['weekly-context', 'daily-setup', 'hourly-trigger'],
      misconceptionIds: ['misconception.timeframe-shopping'],
    },
    explanationHe:
      'הטווח הגבוה מגדיר הקשר ומגמה, הטווח האמצעי מציג את התיקון או התצורה, והטווח הנמוך משמש להגדרת טריגר. התפקידים נקבעים לפני חיפוש אות ואינם מתחלפים כדי להצדיק דעה קיימת.',
    alternativeExplanations: [
      {
        feedbackCode: 'sequence-order-mismatch',
        explanationHe:
          'התחלה מן הגרף הנמוך וחיפוש הצדקה כלפי מעלה הופכת את סדר העבודה ומגדילה הטיית אישוש.',
        misconceptionId: 'misconception.timeframe-shopping',
      },
    ],
    misconceptionIds: ['misconception.timeframe-shopping'],
    hintTexts: [
      'שאלו איזה גרף משתנה לאט מספיק כדי למסגר את מצב השוק.',
      'התצורה נמצאת בין ההקשר לבין אירוע ביצוע מדויק.',
      'הסדר הוא גבוה → אמצעי → נמוך.',
    ],
    sourceReferences: sourceRefs(60, 61, 47, 48, 'פרק 15; איור 15.1 — הקשר, תצורה וטריגר'),
    workflowStepIds: ['context', 'structure', 'setup', 'confirmation', 'entry'],
    termIds: ['term.trend', 'term.confirmation', 'term.entry-trigger'],
    role: 'positive',
    category: 'explanation',
    safetyNoteHe: 'בחירת יחס בין מסגרות זמן היא כלל עבודה; היא אינה מבטיחה יתרון סטטיסטי.',
    processCriteriaHe: ['הוקצה תפקיד נפרד לכל מסגרת.', 'הסדר נקבע מן ההקשר אל הטריגר.'],
    isRiskOrPositionSize: false,
  }),
  authoredExercise({
    id: 'u07-timeframes-e02',
    seed: 90702,
    timeframe: 'weekly/hourly',
    scenario: 'ambiguous',
    chartParameters: {
      basePrice: 84,
      weeklyDirection: 'down',
      hourlySignal: 'bullish',
      nearbyResistanceR: 0.8,
    },
    skillIds: ['context.multitimeframe', 'workflow.eleven-step'],
    difficulty: 3,
    promptHe:
      'בגרף השבועי נמשכת מגמת שיאים ושפלים יורדים. בגרף השעתי הופיע אות שורי תקין, אך התנגדות שבועית מגבילה את היעד ל־0.8R ואין במערכת כלל בדוק לעסקאות נגד המגמה. מהי החלטת התהליך?',
    interactionType: 'decision',
    options: [
      { id: 'decision-trade', labelHe: 'לבצע כרגיל כי האות השעתי תקין' },
      { id: 'decision-wait', labelHe: 'להמתין עד שיוגדר וייבדק כלל למצב הנגדי' },
      { id: 'decision-reject-context', labelHe: 'לקבוע שכל אות נגד שבועי חסר ערך' },
    ],
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['wait'],
      requiredReasonIds: [
        'higher-timeframe-conflict',
        'untested-countertrend-rule',
        'limited-reward',
      ],
      misconceptionIds: ['misconception.bias-as-confirmation', 'misconception.forced-trade'],
    },
    explanationHe:
      'אות קצר נגד הטווח הגבוה עשוי להיות ראוי לבדיקה, אך המקור אינו מעניק ליישור מסגרות יתרון מוכח. כאן אין כלל בדוק והתגמול עד הרמה שבדרך נמוך; לכן המתנה שומרת על כלליות התהליך בלי לטעון שהאות חסר ערך תמיד.',
    alternativeExplanations: [
      {
        answerId: 'decision-trade',
        explanationHe:
          'תקינות האות השעתי אינה מבטלת את מחיר חוסר ההתאמה, את הרמה הקרובה או את היעדר הכלל שנקבע מראש.',
        misconceptionId: 'misconception.bias-as-confirmation',
      },
    ],
    misconceptionIds: [
      'misconception.bias-as-confirmation',
      'misconception.forced-trade',
      'misconception.timeframe-shopping',
    ],
    hintTexts: [
      'הפרידו בין אות נצפה לבין כלל שנבדק למצבי קונפליקט.',
      'בדקו את המרחק עד המכשול הראשון ביחידות R.',
      'המתנה היא תשובה מלאה כשהמערכת אינה מגדירה את המצב.',
    ],
    sourceReferences: sourceRefs(61, 63, 48, 50, 'פרק 15 — הקשר לפני צורה ושגרת ניתוח'),
    isAmbiguous: true,
    workflowStepIds: [
      'context',
      'setup',
      'confirmation',
      'entry',
      'position-size',
      'target',
      'review',
    ],
    termIds: ['term.trend', 'term.confirmation', 'term.r'],
    role: 'ambiguous',
    category: 'decision',
    safetyNoteHe: 'התאמת מסגרות היא מסנן אפשרי לבדיקה, לא הבטחת הצלחה ולא המלצה לפעולה.',
    processCriteriaHe: [
      'הקונפליקט נרשם במפורש.',
      'היעד המתערב נבחן לפני החלטה.',
      'לא הומצא כלל בדיעבד.',
    ],
    isRiskOrPositionSize: true,
  }),
  authoredExercise({
    id: 'u07-timeframes-e03',
    seed: 90703,
    timeframe: 'daily',
    scenario: 'range',
    chartParameters: { basePrice: 112, workflowCards: 11 },
    skillIds: ['workflow.eleven-step'],
    difficulty: 2,
    promptHe: 'סדרו את 11 כרטיסי תהליך העבודה הקנוני מן השאלה הראשונה ועד התחקור.',
    interactionType: 'sequence',
    options: ALL_WORKFLOW_STEPS.map((id) => ({ id, labelHe: WORKFLOW_STEP_LABELS_HE[id] })),
    rubric: { kind: 'sequence', expectedOrder: ALL_WORKFLOW_STEPS },
    explanationHe:
      'הסדר הקנוני הוא: הקשר, מבנה, רמה, תצורה, אישור, כניסה, נקודת ביטול, גודל פוזיציה, יעד, ניהול ותחקור. הסדר מונע קביעת כמות או יעד לפני שהתרחיש והכשל שלו הוגדרו.',
    alternativeExplanations: [
      {
        feedbackCode: 'sequence-order-mismatch',
        explanationHe:
          'פתיחה בכניסה מדלגת על ההקשר ועל תנאי התצורה והופכת את שאר השלבים להצדקה בדיעבד.',
        misconceptionId: 'misconception.confirmation-as-entry',
      },
    ],
    misconceptionIds: [
      'misconception.confirmation-as-entry',
      'misconception.position-size-before-risk',
    ],
    hintTexts: [
      'התחילו במה שקיים לפני רעיון העסקה: מצב השוק.',
      'נקודת הביטול קודמת לחישוב הכמות.',
      'השלב האחרון בוחן ביצוע מול תוכנית.',
    ],
    sourceReferences: sourceRefs(62, 62, 49, 49, 'פרק 15; איור 15.2 — מסגרת העבודה הקנונית'),
    workflowStepIds: ALL_WORKFLOW_STEPS,
    termIds: [
      'term.confirmation',
      'term.entry-trigger',
      'term.invalidation',
      'term.position-size',
      'term.r',
    ],
    role: 'transfer',
    category: 'journal-review',
    safetyNoteHe: 'התהליך מארגן החלטות בתנאי אי־ודאות; הוא אינו הופך תרחיש לוודאי.',
    processCriteriaHe: ['כל 11 השלבים נכללו פעם אחת.', 'הסדר הקנוני נשמר.'],
    isRiskOrPositionSize: false,
  }),
  authoredExercise({
    id: 'u07-timeframes-e04',
    seed: 90704,
    timeframe: 'daily/hourly',
    scenario: 'breakout',
    chartParameters: { basePrice: 64, journalMode: true },
    skillIds: ['context.multitimeframe', 'workflow.eleven-step', 'review.process'],
    difficulty: 3,
    promptHe:
      'השלימו רשומת יומן כך ששלבי התהליך נשמרים בנפרד. בחרו את ששת השדות: מה נצפה, מה הייתה התצורה, מה אישר, מה הפעיל כניסה, היכן היה מחיר הביצוע ומה נבדק בתחקור.',
    interactionType: 'selection',
    options: [
      { id: 'observation', labelHe: 'תצפית לפני החלטה' },
      { id: 'setup', labelHe: 'תצורה מוגדרת' },
      { id: 'confirmation', labelHe: 'אישור' },
      { id: 'entry-trigger', labelHe: 'טריגר כניסה' },
      { id: 'actual-fill', labelHe: 'מילוי בפועל' },
      { id: 'process-review', labelHe: 'תחקור ביצוע מול הכלל' },
      { id: 'later-outcome-as-signal', labelHe: 'התוצאה המאוחרת כאילו הייתה אות מוקדם' },
    ],
    rubric: {
      kind: 'selection',
      expectedIds: [
        'observation',
        'setup',
        'confirmation',
        'entry-trigger',
        'actual-fill',
        'process-review',
      ],
      mode: 'exact',
      misconceptionIds: ['misconception.future-information-leak', 'misconception.outcome-bias'],
    },
    explanationHe:
      'רשומה שימושית מפרידה בין מידע שהיה זמין בזמן ההחלטה, תנאי התרחיש, אירוע האישור, טריגר הביצוע, מחיר המילוי והתחקור. תוצאת המחיר המאוחרת אינה יכולה לשכתב את הראיות המקוריות.',
    alternativeExplanations: [
      {
        answerId: 'later-outcome-as-signal',
        explanationHe: 'הכנסת התוצאה המאוחרת לשדה האות יוצרת זליגת מידע עתידי והטיית תוצאה.',
        misconceptionId: 'misconception.future-information-leak',
      },
    ],
    misconceptionIds: [
      'misconception.future-information-leak',
      'misconception.outcome-bias',
      'misconception.confirmation-as-entry',
    ],
    hintTexts: [
      'הפרידו בין נתון שנצפה לבין פירוש התצורה.',
      'אישור, טריגר ומילוי הם שלושה אירועים שונים.',
      'התחקור מגיע אחרי התוצאה, אך אינו משנה את העבר.',
    ],
    sourceReferences: sourceRefs(62, 63, 49, 50, 'פרק 15 — תבנית תיעוד, צילום ותחקור'),
    workflowStepIds: ['context', 'setup', 'confirmation', 'entry', 'review'],
    termIds: ['term.confirmation', 'term.entry-trigger', 'term.slippage'],
    role: 'transfer',
    category: 'journal-review',
    safetyNoteHe: 'יומן מתעד תהליך; הצלחה או הפסד בודדים אינם מוכיחים את איכות השיטה.',
    processCriteriaHe: [
      'נשמר סדר זמנים.',
      'אישור הופרד מטריגר וממילוי.',
      'התחקור בלתי תלוי בתוצאה.',
    ],
    isRiskOrPositionSize: false,
  }),
  authoredExercise({
    id: 'u07-timeframes-e05',
    seed: 90705,
    timeframe: 'daily',
    scenario: 'lookalike',
    chartParameters: { basePrice: 18, averageSpreadPercent: 1.8, historyDays: 24, eventHours: 6 },
    skillIds: ['context.multitimeframe', 'workflow.eleven-step', 'markets.constraints'],
    difficulty: 3,
    promptHe:
      'נכס מציג תצורה ברורה, אך המרווח הממוצע 1.8%, ההיסטוריה הזמינה 24 ימים בלבד, הכמות הרצויה גדולה מן הנזילות הנצפית, ודוח מתוכנן בעוד שש שעות. האם הוא כשיר לתרגול הביצוע המתוכנן?',
    interactionType: 'decision',
    options: [
      { id: 'decision-trade', labelHe: 'כן, כי הצורה ברורה' },
      { id: 'decision-reject', labelHe: 'לא; לדחות לפי מסנן הכשירות' },
      { id: 'decision-wait-event-only', labelHe: 'להתעלם מהנזילות ולהמתין רק לדוח' },
    ],
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['reject'],
      requiredReasonIds: [
        'spread-too-wide',
        'insufficient-history',
        'insufficient-liquidity',
        'scheduled-event',
      ],
      misconceptionIds: ['misconception.forced-trade'],
    },
    explanationHe:
      'בחירת נכס היא חלק מהתהליך. מרווח, נזילות, היסטוריה ואירועים קובעים אם אפשר לבצע ולבדוק את הרעיון. כאן כל ארבעת התנאים פוגעים בכשירות, ולכן צורה נאה אינה מספיקה.',
    alternativeExplanations: [
      {
        answerId: 'decision-trade',
        explanationHe:
          'הצורה אינה גוברת על מגבלת ביצוע; הזדמנות שאי אפשר לבצע בכמות ובעלות סבירות אינה כשירה.',
        misconceptionId: 'misconception.forced-trade',
      },
    ],
    misconceptionIds: ['misconception.forced-trade', 'misconception.costs-omitted'],
    hintTexts: [
      'בדקו אם הכמות יכולה להתבצע בלי לשנות מהותית את המחיר.',
      'היסטוריה קצרה מקשה להעריך התנהגות קודמת.',
      'מסנן הכשירות קודם לזיהוי התצורה.',
    ],
    sourceReferences: sourceRefs(63, 63, 50, 50, 'פרק 15 — בחירת נכסים, נזילות ולוח אירועים'),
    workflowStepIds: ['context', 'setup', 'entry', 'position-size', 'management', 'review'],
    termIds: ['term.slippage', 'term.position-size', 'term.volatility'],
    role: 'near-miss',
    category: 'decision',
    safetyNoteHe: 'דחייה היא החלטת תהליך תקפה כשאין דרך סבירה לבצע; אין בכך תחזית למחיר הנכס.',
    processCriteriaHe: [
      'נבדקו מרווח ונזילות.',
      'נבדקו אורך היסטוריה ואירוע קרוב.',
      'הצורה לא עקפה את המסנן.',
    ],
    isRiskOrPositionSize: false,
  }),

  authoredExercise({
    id: 'u08-risk-e01',
    seed: 90801,
    timeframe: 'daily',
    scenario: 'false-breakout',
    chartParameters: {
      basePrice: 52,
      invalidationClose: 48,
      stopTrigger: 47.8,
      possibleFill: 47.3,
      target: 61,
    },
    skillIds: ['risk.invalidation-execution', 'risk.r'],
    difficulty: 3,
    promptHe:
      'איזו אפשרות מפרידה נכון בין ארבעה מושגים: כשל אנליטי, הפעלת הוראת עצירה, מחיר מילוי אפשרי וכלל יציאה ברווח?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'four-fields-separated',
        labelHe:
          'סגירה מתחת 48 מבטלת; 47.8 מפעיל עצירה; המילוי עשוי להיות 47.3; יעד 61 הוא כלל נפרד',
      },
      {
        id: 'stop-equals-fill',
        labelHe: '47.8 הוא גם הביטול וגם מחיר מילוי מובטח; יעד 61 מובטח אם לא הופעל',
      },
      { id: 'target-is-invalidation', labelHe: 'יעד 61 קובע גם את נקודת הביטול ואת מחיר המילוי' },
    ],
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['four-fields-separated'],
      misconceptionIds: [
        'misconception.invalidation-as-guaranteed-fill',
        'misconception.target-as-promise',
      ],
    },
    explanationHe:
      'נקודת ביטול מתארת מתי התזה נכשלה. הוראת עצירה היא מנגנון ביצוע, ומחיר המילוי עלול להיות גרוע ממחיר ההפעלה. יעד הרווח הוא כלל יציאה אחר ואינו מאחד את השדות.',
    alternativeExplanations: [
      {
        answerId: 'stop-equals-fill',
        explanationHe: 'מחיר ההפעלה אינו הבטחת מילוי, במיוחד בפער, שוק מהיר או נזילות חלשה.',
        misconceptionId: 'misconception.invalidation-as-guaranteed-fill',
      },
    ],
    misconceptionIds: [
      'misconception.invalidation-as-guaranteed-fill',
      'misconception.target-as-promise',
    ],
    hintTexts: [
      'שאלו איזה שדה מתאר רעיון ואיזה שדה שולח הוראה.',
      'הפעלה ומילוי יכולים להתרחש במחירים שונים.',
      'יעד אינו מנגנון ביטול.',
    ],
    sourceReferences: sourceRefs(64, 67, 51, 54, 'פרק 16 — נקודת ביטול, הוראת סטופ, יעד וביצוע'),
    workflowStepIds: ['entry', 'invalidation', 'target', 'management', 'review'],
    termIds: ['term.invalidation', 'term.stop-order', 'term.slippage', 'term.measured-move'],
    role: 'near-miss',
    category: 'calculation',
    safetyNoteHe: 'הפסד בפועל עלול לחרוג מן ההפסד המתוכנן; פקודת עצירה אינה מבטיחה מחיר.',
    processCriteriaHe: ['הביטול הופרד מן העצירה.', 'הפעלה הופרדה ממילוי.', 'היעד תועד ככלל נפרד.'],
    isRiskOrPositionSize: true,
  }),
  authoredExercise({
    id: 'u08-risk-e02',
    seed: 90802,
    timeframe: 'daily',
    scenario: 'continuation',
    chartParameters: { basePrice: 50, oneR: 1000, targetR: 2, winProbability: 0.4 },
    skillIds: ['risk.r', 'risk.management'],
    difficulty: 3,
    promptHe:
      'הסיכון המתוכנן הוא 1,000 ש״ח. היעד הוא 2,000 ש״ח, הסתברות הרווח שנאמדה בבדיקה היא 40% והפסד מלא מתרחש ב־60%. התעלמו לרגע מעלויות שכבר נכללו ב־R. איזה תיאור נכון?',
    interactionType: 'multiple-choice',
    options: [
      { id: 'r-and-ev-correct', labelHe: '1R=1,000; היעד 2R; הערך הצפוי 0.2R לעסקה' },
      { id: 'high-r-guarantees-profit', labelHe: 'יעד 2R מבטיח רווח ולכן אין צורך בהסתברות' },
      { id: 'ev-is-two-r', labelHe: 'הערך הצפוי הוא 2R כי זה היעד המרבי' },
    ],
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['r-and-ev-correct'],
      misconceptionIds: ['misconception.target-as-promise'],
    },
    explanationHe:
      '1R הוא 1,000 ש״ח ויעד 2,000 הוא 2R. הערך הצפוי הוא 0.4×2R פחות 0.6×1R, כלומר 0.2R. יחס גבוה לבדו אינו מספיק: נדרשות הסתברויות שנמדדו וכל העלויות.',
    alternativeExplanations: [
      {
        answerId: 'high-r-guarantees-profit',
        explanationHe: 'יעד רחוק אינו הבטחה; בלי שיעור הגעה והפסד ממוצע אי אפשר להעריך תוחלת.',
        misconceptionId: 'misconception.target-as-promise',
      },
    ],
    misconceptionIds: ['misconception.target-as-promise', 'misconception.single-example-as-proof'],
    hintTexts: [
      'חלקו כל סכום בסיכון המתוכנן 1,000.',
      'תוחלת: הסתברות רווח×רווח פחות הסתברות הפסד×הפסד.',
      '0.4×2 פחות 0.6×1 שווה 0.2.',
    ],
    sourceReferences: sourceRefs(
      65,
      65,
      52,
      52,
      'פרק 16; איור 16.1 — R, יחס סיכון־סיכוי וערך צפוי',
    ),
    workflowStepIds: ['position-size', 'target', 'management', 'review'],
    termIds: ['term.r', 'term.measured-move'],
    role: 'positive',
    category: 'calculation',
    safetyNoteHe: 'הסתברות משוערת חייבת להגיע מבדיקה הוגנת; יעד ותוחלת אינם הבטחת תשואה.',
    processCriteriaHe: [
      'R חושב מן הסיכון המתוכנן.',
      'התוחלת כללה רווח והפסד.',
      'היעד לא הוצג כהבטחה.',
    ],
    isRiskOrPositionSize: true,
  }),
  authoredExercise({
    id: 'u08-risk-e03',
    seed: 90803,
    timeframe: 'daily',
    scenario: 'breakout',
    chartParameters: {
      basePrice: 50,
      accountValue: 100000,
      riskFraction: 0.01,
      entry: 50,
      stop: 45,
      costs: 0.2,
    },
    skillIds: ['risk.invalidation-execution', 'risk.r', 'risk.position-size'],
    difficulty: 3,
    promptHe:
      'חשבון התרגול הוא 100,000 ש״ח וסיכון התרגיל 1%. כניסה 50, הוראת עצירה 45 ועלות צפויה לעמלה ולהחלקה 0.20 ש״ח ליחידה. חשבו סיכון חשבון, מרחק עצירה, סיכון ליחידה וכמות מרבית של יחידות שלמות.',
    interactionType: 'risk',
    rubric: {
      kind: 'risk',
      expected: { accountRisk: 1000, stopDistance: 5, perUnitRisk: 5.2, positionSize: 192 },
      tolerance: { absolute: 0.01 },
      misconceptionIds: ['misconception.costs-omitted', 'misconception.position-size-before-risk'],
    },
    explanationHe:
      'סיכון החשבון הוא 1,000 ש״ח. מרחק העצירה 5, והעלות הצפויה מעלה את הסיכון ליחידה ל־5.20. מחלקים 1,000 ב־5.20 ומעגלים מטה ל־192 יחידות, כדי לא לחרוג מתקציב הסיכון.',
    alternativeExplanations: [
      {
        feedbackCode: 'risk-value-outside-tolerance',
        explanationHe: '200 מתקבל מהשמטת 0.20 ש״ח עלות ליחידה ולכן חורג מתקציב הסיכון המתוכנן.',
        misconceptionId: 'misconception.costs-omitted',
      },
    ],
    misconceptionIds: ['misconception.costs-omitted', 'misconception.position-size-before-risk'],
    hintTexts: [
      '1% מתוך 100,000 הוא 1,000.',
      'הסיכון ליחידה הוא |50−45| ועוד 0.20.',
      'יש לעגל את 1,000÷5.20 מטה, לא למספר הקרוב.',
    ],
    sourceReferences: sourceRefs(65, 66, 52, 53, 'פרק 16 — נוסחת גודל פוזיציה; איור 16.2'),
    workflowStepIds: ['entry', 'invalidation', 'position-size', 'review'],
    termIds: ['term.position-size', 'term.stop-order', 'term.slippage', 'term.r'],
    role: 'positive',
    category: 'calculation',
    safetyNoteHe:
      'הנוסחה מעריכה סיכון בתנאי ביצוע רגילים; פער, עצירת מסחר או כשל נזילות עלולים להגדיל הפסד.',
    processCriteriaHe: ['הביטול והעצירה קדמו לכמות.', 'עלויות נכללו ליחידה.', 'הכמות עוגלה מטה.'],
    isRiskOrPositionSize: true,
  }),
  authoredExercise({
    id: 'u08-risk-e04',
    seed: 90804,
    timeframe: 'daily',
    scenario: 'uptrend',
    chartParameters: {
      basePrice: 60,
      currentStop: 52,
      candidateNoiseLow: 57,
      confirmedHigherLow: 55,
    },
    skillIds: ['risk.invalidation-execution', 'risk.management'],
    difficulty: 3,
    promptHe:
      'הוראת העצירה המבנית נמצאת ב־52. המחיר הגיע ל־63, ירד תוך־יומית ל־57 בלי ליצור שפל מבני, עלה לשיא חדש, ורק אחר כך נוצר ואושר שפל עולה ב־55. מתי ולאן מותר לקדם את העצירה לפי הכלל?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'trail-after-confirmed-swing',
        labelHe: 'רק לאחר אישור השפל המבני החדש, אל מתחת ל־55 לפי הסבילות שנקבעה',
      },
      { id: 'trail-on-any-dip', labelHe: 'מיד אל 57 כי כל ירידה תוך־יומית היא שפל מבני' },
      { id: 'widen-stop', labelHe: 'להרחיק מתחת 52 כדי להימנע ממימוש הפסד' },
    ],
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['trail-after-confirmed-swing'],
      misconceptionIds: ['misconception.invalidation-as-guaranteed-fill'],
    },
    explanationHe:
      'עצירה מבנית מתקדמת רק לאחר היווצרות שפל מבני חדש לפי כלל עקבי לזיהוי נקודות מפנה. רעש תוך־יומי אינו מספיק, והזזת העצירה רחוק יותר משנה את הסיכון לאחר הכניסה.',
    alternativeExplanations: [
      {
        answerId: 'trail-on-any-dip',
        explanationHe:
          'קידום על כל תנודה מחליף כלל מבני בתגובה לרעש ועלול להוציא עסקה בלי שהמבנה השתנה.',
      },
    ],
    misconceptionIds: ['misconception.outcome-bias'],
    hintTexts: [
      'הכלל דורש שפל מבני, לא רק מחיר נמוך זמני.',
      'חפשו את השפל שנוצר לפני שיא חדש ואושר אחריו.',
      'העצירה יכולה להתקדם בכיוון צמצום הסיכון, לא להתרחק.',
    ],
    sourceReferences: sourceRefs(66, 66, 53, 53, 'פרק 16; איור 16.3 — סטופ מבני מתקדם'),
    workflowStepIds: ['invalidation', 'position-size', 'management', 'review'],
    termIds: ['term.stop-order', 'term.higher-low', 'term.invalidation'],
    role: 'near-miss',
    category: 'calculation',
    safetyNoteHe: 'גם עצירה שקודמה אינה מבטיחה מילוי במחירה במקרה של פער או שוק מהיר.',
    processCriteriaHe: ['השפל הוגדר לפי כלל עקבי.', 'לא בוצע קידום על רעש.', 'הסיכון לא הורחב.'],
    isRiskOrPositionSize: true,
  }),
  authoredExercise({
    id: 'u08-risk-e05',
    seed: 90805,
    timeframe: 'daily',
    scenario: 'downtrend',
    chartParameters: {
      basePrice: 74,
      correlatedPositions: 3,
      plannedRisk: 1000,
      gapStressMultiplier: 1.6,
    },
    skillIds: ['risk.position-size', 'risk.management', 'markets.constraints'],
    difficulty: 4,
    promptHe:
      'שלוש פוזיציות סינתטיות באותו ענף מסכנות 400, 300 ו־300 ש״ח. בתרחיש פער משותף אומדן ההפסד הוא פי 1.6 מן המתוכנן. מהו הסיכון המצטבר המתוכנן, מהו אומדן הלחץ, ומה נכון להסיק?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'aggregate-risk-correct',
        labelHe: '1,000 ש״ח מתוכננים; 1,600 ש״ח בתרחיש הלחץ; קורלציה ופער עלולים להתנהג כסיכון אחד',
      },
      { id: 'diversified-by-count', labelHe: '300 ש״ח בלבד כי שלוש פוזיציות תמיד מפזרות סיכון' },
      { id: 'stop-caps-loss', labelHe: '1,000 ש״ח הם הפסד מרבי מובטח כי לכל פוזיציה יש עצירה' },
    ],
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['aggregate-risk-correct'],
      misconceptionIds: ['misconception.invalidation-as-guaranteed-fill'],
    },
    explanationHe:
      'הסיכון המתוכנן מצטבר ל־1,000 ש״ח. בתרחיש הלחץ הוא 1,600. מספר שמות אינו פיזור כאשר כולם תלויים באותו גורם; מינוף, פער, מרווח ובטוחות עשויים להגדיל את ההפסד מעבר ל־R המתוכנן.',
    alternativeExplanations: [
      {
        answerId: 'diversified-by-count',
        explanationHe: 'ספירת פוזיציות אינה מודדת פיזור; יש לאגד חשיפה לפי גורם ותרחיש שוק.',
      },
    ],
    misconceptionIds: [
      'misconception.invalidation-as-guaranteed-fill',
      'misconception.costs-omitted',
    ],
    hintTexts: [
      'חברו תחילה את שלושת תקציבי הסיכון.',
      'הכפילו את הסכום ב־1.6 לתרחיש הלחץ.',
      'בדקו אם שלושת הנכסים תלויים באותו גורם.',
    ],
    sourceReferences: sourceRefs(66, 67, 53, 54, 'פרק 16 — סיכון מצטבר, קורלציה, מינוף ופער'),
    workflowStepIds: ['position-size', 'management', 'review'],
    termIds: ['term.position-size', 'term.r', 'term.gap', 'term.slippage'],
    role: 'transfer',
    category: 'decision',
    safetyNoteHe:
      'מינוף, פערים ודרישות בטוחה עשויים ליצור הפסד גדול מן המתוכנן ואף מעבר להון שהוקצה.',
    processCriteriaHe: [
      'הסיכון אוגד לפי גורם משותף.',
      'נבדק תרחיש פער.',
      'לא הונחה תקרת הפסד מובטחת.',
    ],
    isRiskOrPositionSize: true,
  }),

  authoredExercise({
    id: 'u09-evidence-e01',
    seed: 90901,
    timeframe: 'daily',
    scenario: 'lookalike',
    chartParameters: {
      basePrice: 100,
      testedVariants: 500,
      survivorsOnly: true,
      costsIncluded: false,
    },
    skillIds: ['evidence.testing'],
    difficulty: 3,
    promptHe:
      'בדיקה בחרה בדיעבד את הטוב מבין 500 פרמטרים, כללה רק נכסים שעדיין נסחרים, ביצעה במחיר סגירה שנודע רק לאחר האות, ודיווחה תשואה ברוטו. סמנו את ארבע הטיות הבדיקה.',
    interactionType: 'selection',
    options: [
      { id: 'data-snooping', labelHe: 'כריית נתונים / בחירת מנצח' },
      { id: 'survivorship', labelHe: 'הטיית הישרדות' },
      { id: 'look-ahead', labelHe: 'מבט לעתיד במחיר הביצוע' },
      { id: 'omitted-costs', labelHe: 'השמטת מרווח, עמלה והחלקה' },
      { id: 'too-many-losses', labelHe: 'עצם קיומן של עסקאות מפסידות' },
    ],
    rubric: {
      kind: 'selection',
      expectedIds: ['data-snooping', 'survivorship', 'look-ahead', 'omitted-costs'],
      mode: 'exact',
      misconceptionIds: [
        'misconception.future-information-leak',
        'misconception.costs-omitted',
        'misconception.single-example-as-proof',
      ],
    },
    explanationHe:
      'בחירת פרמטר אחרי מאות ניסיונות מגדילה תוצאה מקרית; השמטת נכסים שנמחקו מטה את המדגם; שימוש בסגירה שלא הייתה זמינה מכניס מידע עתידי; ותשואה ברוטו אינה תוצאה ניתנת לביצוע.',
    alternativeExplanations: [
      {
        answerId: 'too-many-losses',
        explanationHe:
          'עסקאות מפסידות אינן כשלעצמן הטיית מחקר. השאלה היא אם הכלל, המדגם, הזמן והעלויות הוגדרו בהגינות.',
      },
    ],
    misconceptionIds: [
      'misconception.future-information-leak',
      'misconception.costs-omitted',
      'misconception.single-example-as-proof',
    ],
    hintTexts: [
      'שאלו כמה כללים נבדקו לפני בחירת המנצח.',
      'בדקו אילו נכסים ואיזה מידע היו זמינים בכל תאריך.',
      'עברו מתשואה ברוטו למחיר ביצוע ועלויות סבירים.',
    ],
    sourceReferences: sourceRefs(
      68,
      69,
      55,
      56,
      'פרק 17 — כריית נתונים, הישרדות, מבט לעתיד ועלויות',
    ),
    workflowStepIds: ['context', 'setup', 'confirmation', 'review'],
    termIds: ['term.confirmation', 'term.slippage'],
    role: 'lookalike',
    category: 'explanation',
    safetyNoteHe: 'תוצאה היסטורית מרשימה אינה הוכחת רווחיות עתידית, במיוחד לאחר חיפוש רחב והטיות.',
    processCriteriaHe: [
      'זוהה יקום הניסיונות.',
      'נבדקה זמינות מידע בזמן.',
      'נכללו עלויות ונכסים שנמחקו.',
    ],
    isRiskOrPositionSize: false,
  }),
  authoredExercise({
    id: 'u09-evidence-e02',
    seed: 90902,
    timeframe: 'daily',
    scenario: 'range',
    chartParameters: { basePrice: 92, developmentYears: 4, testYears: 2, rollingWindows: 3 },
    skillIds: ['evidence.testing'],
    difficulty: 4,
    promptHe:
      'סדרו פרוטוקול בדיקה הוגנת: הגדרת הכלל והעלויות, פיתוח במדגם אימון, הקפאת הפרמטרים, בדיקה מחוץ למדגם, ולבסוף דיווח על כל הניסיונות והרגישות.',
    interactionType: 'sequence',
    options: [
      { id: 'predefine', labelHe: 'להגדיר נתונים, כניסה, יציאה, עצירה ועלויות' },
      { id: 'develop', labelHe: 'לפתח במדגם אימון בלבד' },
      { id: 'freeze', labelHe: 'להקפיא כלל ופרמטרים' },
      { id: 'test', labelHe: 'להעריך מחוץ למדגם או בחלון מתגלגל הבא' },
      { id: 'report', labelHe: 'לדווח תוצאות, כישלונות, ניסיונות ורגישות' },
    ],
    rubric: {
      kind: 'sequence',
      expectedOrder: ['predefine', 'develop', 'freeze', 'test', 'report'],
    },
    explanationHe:
      'הגדרה מוקדמת מונעת התאמת הסיפור לתוצאה. הפיתוח נשאר במדגם האימון; אחרי הקפאה עוברים לנתונים שלא שימשו לבחירה. דיווח כולל ניסיונות חלשים ורגישות לשינויים קטנים.',
    alternativeExplanations: [
      {
        feedbackCode: 'sequence-order-mismatch',
        explanationHe: 'שינוי הכלל לאחר צפייה במדגם הבדיקה הופך אותו בפועל לחלק ממדגם הפיתוח.',
        misconceptionId: 'misconception.future-information-leak',
      },
    ],
    misconceptionIds: [
      'misconception.future-information-leak',
      'misconception.single-example-as-proof',
    ],
    hintTexts: [
      'הכלל חייב להתקיים לפני צפייה בתוצאה שמעריכה אותו.',
      'מדגם הבדיקה אינו מקום לכוונון נוסף.',
      'הדיווח מגיע אחרון וכולל גם ניסיונות שלא ניצחו.',
    ],
    sourceReferences: sourceRefs(68, 69, 55, 56, 'פרק 17 — תכנון מדגם אימון/בדיקה ובדיקת רגישות'),
    workflowStepIds: ['context', 'setup', 'confirmation', 'review'],
    termIds: ['term.confirmation', 'term.stop-order', 'term.slippage'],
    role: 'transfer',
    category: 'journal-review',
    safetyNoteHe:
      'גם בדיקה מחוץ למדגם אינה מבטיחה שהכלל ימשיך לעבוד; היא מפחיתה הטיות מוגדרות בלבד.',
    processCriteriaHe: ['הכלל הוגדר מראש.', 'האימון הופרד מן הבדיקה.', 'כישלונות ורגישות דווחו.'],
    isRiskOrPositionSize: false,
  }),
  authoredExercise({
    id: 'u09-evidence-e03',
    seed: 90903,
    timeframe: 'daily',
    scenario: 'ambiguous',
    chartParameters: {
      basePrice: 108,
      grossEdgePercent: 0.18,
      roundTripCostPercent: 0.22,
      sampleTrades: 34,
    },
    skillIds: ['evidence.testing', 'markets.constraints', 'risk.management'],
    difficulty: 4,
    promptHe:
      'כלל הראה שינוי חיובי ממוצע של 0.18% אחרי אות, אך אומדן העלות הלוך־ושוב הוא 0.22%, נצפו רק 34 עסקאות, ולא דווחו ירידה מרבית או יציבות בין תקופות. האם הוכחה כדאיות נטו לאחר עלויות?',
    interactionType: 'decision',
    options: [
      { id: 'decision-trade', labelHe: 'כן; סימן חיובי ממוצע מספיק' },
      { id: 'decision-insufficient', labelHe: 'אין מספיק מידע לכדאיות נטו לאחר עלויות' },
      { id: 'decision-reject-forever', labelHe: 'הכלל הופרך לכל שוק ולכל תקופה' },
    ],
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['insufficient-evidence'],
      requiredReasonIds: [
        'costs-exceed-gross-edge',
        'small-sample',
        'missing-drawdown',
        'missing-stability',
      ],
      misconceptionIds: ['misconception.costs-omitted', 'misconception.single-example-as-proof'],
    },
    explanationHe:
      'יכולת חיזוי קטנה אינה זהה לכדאיות לאחר עלויות. כאן העלות המשוערת גבוהה מן השינוי הגולמי, המדגם קטן וחסרים מדדי סיכון ויציבות. לכן אין די ראיות לכדאיות נטו, אך גם אין בסיס לקביעה שהרעיון בלתי אפשרי בכל מקום.',
    alternativeExplanations: [
      {
        answerId: 'decision-trade',
        explanationHe:
          'הממוצע החיובי נבלע באומדן העלות עוד לפני שבוחנים שונות, ירידה מרבית ויציבות.',
        misconceptionId: 'misconception.costs-omitted',
      },
    ],
    misconceptionIds: ['misconception.costs-omitted', 'misconception.single-example-as-proof'],
    hintTexts: [
      'השוו את 0.18% ל־0.22% לפני מסקנה.',
      'ממוצע אינו מתאר ירידה מרבית או פיזור תוצאות.',
      'הבחינו בין ״לא הוכח״ לבין ״הופרך תמיד״.',
    ],
    sourceReferences: sourceRefs(68, 69, 55, 56, 'פרק 17 — זיהוי סטטיסטי לעומת רווח מעשי'),
    isAmbiguous: true,
    workflowStepIds: ['context', 'setup', 'confirmation', 'management', 'review'],
    termIds: ['term.slippage', 'term.r', 'term.confirmation'],
    role: 'ambiguous',
    category: 'decision',
    safetyNoteHe:
      'מובהקות או שינוי ממוצע אינם המלצה לפעולה; נדרשים ביצוע, עלויות, סיכון ובדיקה מחוץ למדגם.',
    processCriteriaHe: [
      'נבדקה תוצאה נטו.',
      'נבדקו גודל מדגם וסיכון.',
      'המסקנה נוסחה במידת הראיות.',
    ],
    isRiskOrPositionSize: true,
  }),
  authoredExercise({
    id: 'u09-evidence-e04',
    seed: 90904,
    timeframe: 'multi-market',
    scenario: 'lookalike',
    chartParameters: { basePrice: 100, marketCount: 6 },
    skillIds: ['markets.constraints', 'evidence.testing'],
    difficulty: 4,
    promptHe: 'סמנו את כל ההתאמות הנכונות בין סוג שוק לבין מגבלת נתונים או ביצוע שיש לתעד.',
    interactionType: 'selection',
    options: [
      { id: 'stocks-events', labelHe: 'מניות — שעות מסחר, דוחות, פערים והתאמות' },
      { id: 'etf-underlying', labelHe: 'קרן סל — ריכוז, נזילות נכסי בסיס ופרמיה/הנחה' },
      {
        id: 'index-calculation',
        labelHe: 'מדד — חישוב שאינו בהכרח נכס; מחזור המדד אינו מחזור רכיביו',
      },
      { id: 'futures-roll', labelHe: 'חוזים — פקיעה, גלגול, מכפיל והתחשבנות' },
      { id: 'fx-provider', labelHe: 'מט״ח — מקור מבוזר, ספק, אזור זמן ומחזור תלוי־מקור' },
      { id: 'crypto-venue', labelHe: 'קריפטו — זירה, מסחר רציף, מינוף, חיסולים ומימון' },
      { id: 'one-rule-fits-all', labelHe: 'אותו מקור מחזור ואותו כלל ביצוע מתאימים לכל השווקים' },
    ],
    rubric: {
      kind: 'selection',
      expectedIds: [
        'stocks-events',
        'etf-underlying',
        'index-calculation',
        'futures-roll',
        'fx-provider',
        'crypto-venue',
      ],
      mode: 'exact',
    },
    explanationHe:
      'אותו עיקרון טכני דורש התאמות שונות: שעות ואירועים במניות; נכסי בסיס בקרן; אופן חישוב במדד; פקיעה ומכפיל בחוזה; ספק ואזור זמן במט״ח; וזירה, מינוף ונתוני נגזרים בקריפטו.',
    alternativeExplanations: [
      {
        answerId: 'one-rule-fits-all',
        explanationHe:
          'מחזור, שעות ומנגנון ביצוע אינם אחידים בין זירות ומכשירים, ולכן העתקה ללא תיעוד פוגעת בטענה.',
        misconceptionId: 'misconception.volume-as-verdict',
      },
    ],
    misconceptionIds: ['misconception.volume-as-verdict', 'misconception.costs-omitted'],
    hintTexts: [
      'שאלו אם הנכס עצמו נסחר או רק מחושב.',
      'חפשו פקיעה וגלגול בחוזים, וספק וזמן במט״ח.',
      'בקריפטו יש לתעד זירה ונתוני נגזרים תלויי זירה.',
    ],
    sourceReferences: sourceRefs(70, 71, 57, 58, 'פרק 18 — מניות, ETF, מדדים, חוזים, מט״ח וקריפטו'),
    workflowStepIds: ['context', 'setup', 'management', 'review'],
    termIds: [
      'term.relative-volume',
      'term.open-interest',
      'term.funding-rate',
      'term.slippage',
      'term.gap',
    ],
    role: 'transfer',
    category: 'explanation',
    safetyNoteHe:
      'מגבלות זירה ומוצר משתנות; התרגיל מלמד תיעוד עקרוני ואינו קובע התנהגות ברוקר או זירה מסוימים.',
    processCriteriaHe: ['זוהה מקור הנתון.', 'נבדקו מגבלות ביצוע.', 'לא הוחל כלל שוק אחד על כולם.'],
    isRiskOrPositionSize: false,
  }),
  authoredExercise({
    id: 'u09-evidence-e05',
    seed: 90905,
    timeframe: 'hourly',
    scenario: 'lookalike',
    chartParameters: {
      basePrice: 4200,
      venueDeclared: false,
      timezoneDeclared: false,
      costsDeclared: false,
    },
    skillIds: ['markets.constraints', 'evidence.testing'],
    difficulty: 4,
    promptHe:
      'רשומת בדיקה טוענת ש״הפריצה עבדה בחוזה ובקריפטו״ אך אינה מציינת זירה, מקור, אזור זמן, שעות מסחר, התאמה או גלגול, מרווח, עצירות מסחר ואירועים. סמנו את כל השדות שיש להוסיף לפני שאפשר להעריך את הטענה.',
    interactionType: 'selection',
    options: [
      { id: 'venue-source', labelHe: 'זירה ומקור מחיר/מחזור' },
      { id: 'timezone-session', labelHe: 'אזור זמן ושעות מסחר' },
      { id: 'adjustment-roll', labelHe: 'שיטת התאמה וגלגול חוזה' },
      { id: 'spread-slippage', labelHe: 'מרווח והחלקה' },
      { id: 'halts-limits', labelHe: 'עצירות ומגבלות תנודה' },
      { id: 'events', labelHe: 'אירועים מתוזמנים וחריגים' },
      { id: 'pattern-name-only', labelHe: 'רק שם התבנית, ללא נתוני ביצוע' },
    ],
    rubric: {
      kind: 'selection',
      expectedIds: [
        'venue-source',
        'timezone-session',
        'adjustment-roll',
        'spread-slippage',
        'halts-limits',
        'events',
      ],
      mode: 'exact',
    },
    explanationHe:
      'טענה ניתנת לביקורת רק כשהסדרה והביצוע ניתנים לשחזור. זירה, מקור, זמן, שעות מסחר, התאמות, גלגול, עלויות, מגבלות ואירועים יכולים לשנות גם את הגרף וגם את מחיר הביצוע.',
    alternativeExplanations: [
      {
        answerId: 'pattern-name-only',
        explanationHe: 'שם תבנית אינו משחזר נתונים או ביצוע ולכן אינו פותר אף אחת ממגבלות הבדיקה.',
        misconceptionId: 'misconception.pattern-without-context',
      },
    ],
    misconceptionIds: [
      'misconception.pattern-without-context',
      'misconception.costs-omitted',
      'misconception.future-information-leak',
    ],
    hintTexts: [
      'התחילו בשאלה מאיפה הגיע כל מחיר ובאיזה שעון.',
      'בחוזים בדקו גלגול; בביצוע בדקו מרווח והחלקה.',
      'אירוע או עצירה יכולים למנוע ביצוע רגיל.',
    ],
    sourceReferences: sourceRefs(70, 71, 57, 58, 'פרק 18 — רשימת בדיקת שוק, נתונים וביצוע'),
    workflowStepIds: ['context', 'setup', 'management', 'review'],
    termIds: ['term.slippage', 'term.gap', 'term.open-interest', 'term.funding-rate'],
    role: 'near-miss',
    category: 'journal-review',
    safetyNoteHe:
      'בלי הנחות זירה וביצוע אי אפשר להעביר תוצאה היסטורית להחלטה מעשית או להבטיח שניתן היה לסחור בה.',
    processCriteriaHe: ['הסדרה ניתנת לשחזור.', 'העלויות ניתנות לשחזור.', 'אירועים ומגבלות תועדו.'],
    isRiskOrPositionSize: false,
  }),

  authoredExercise({
    id: 'u10-capstone-e01',
    seed: 91001,
    timeframe: 'daily',
    scenario: 'breakout',
    chartParameters: {
      basePrice: 56.5,
      entry: 56.5,
      stop: 51.8,
      target: 65.5,
      accountRisk: 750,
      expectedCost: 0.5,
    },
    skillIds: ['workflow.eleven-step', 'risk.r', 'risk.position-size', 'review.process'],
    difficulty: 4,
    promptHe:
      'במקרה א׳ המעובד: כניסה 56.5, עצירה 51.8, יעד ראשון 65.5 ותקציב סיכון 750 ש״ח. ההחלקה והעמלה הצפויות עלו מ־0.20 ל־0.50 ש״ח ליחידה. חשבו מרחק עצירה, סיכון ליחידה, כמות שלמה מרבית ו־R מתוכנן עד היעד.',
    interactionType: 'risk',
    rubric: {
      kind: 'risk',
      expected: {
        accountRisk: 750,
        stopDistance: 4.7,
        perUnitRisk: 5.2,
        positionSize: 144,
        riskMultiple: 1.73,
      },
      tolerance: { absolute: 0.02 },
      misconceptionIds: ['misconception.costs-omitted', 'misconception.target-as-promise'],
    },
    explanationHe:
      'מרחק העצירה הוא 4.7 והסיכון המתוכנן ליחידה 5.20. 750÷5.20 נותן 144 יחידות שלמות לכל היותר. מרחק היעד 9, ולכן אומדן היעד הוא כ־1.73R מתוכנן. עלייה בעלות מקטינה כמות וגם יחס יעד־לסיכון.',
    alternativeExplanations: [
      {
        feedbackCode: 'risk-value-outside-tolerance',
        explanationHe:
          'שימוש בכמות 153 או ב־1.84R משאיר את העלות הישנה 0.20 ואינו מעדכן את התוכנית.',
        misconceptionId: 'misconception.costs-omitted',
      },
    ],
    misconceptionIds: ['misconception.costs-omitted', 'misconception.target-as-promise'],
    hintTexts: [
      'מרחק העצירה נשאר 56.5−51.8.',
      'הוסיפו 0.50 למרחק לפני חלוקת 750.',
      'ל־R המתוכנן חלקו את מרחק היעד 9 בסיכון ליחידה 5.20.',
    ],
    sourceReferences: sourceRefs(
      72,
      73,
      59,
      60,
      'פרק 19; מקרה א׳ ואיור 19.1 — גודל ו־R לאחר שינוי החלקה',
    ),
    workflowStepIds: ALL_WORKFLOW_STEPS,
    termIds: [
      'term.slippage',
      'term.position-size',
      'term.r',
      'term.stop-order',
      'term.measured-move',
    ],
    role: 'transfer',
    category: 'calculation',
    safetyNoteHe:
      'יעד הוא אומדן; פער מטה או נזילות חלשה עלולים ליצור מילוי גרוע ולהפסד גדול מ־R המתוכנן.',
    processCriteriaHe: ['העלות החדשה נכללה.', 'הכמות עוגלה מטה.', 'היעד הוצג כאומדן.'],
    isRiskOrPositionSize: true,
  }),
  authoredExercise({
    id: 'u10-capstone-e02',
    seed: 91002,
    timeframe: 'daily',
    scenario: 'false-breakout',
    chartParameters: {
      basePrice: 50.8,
      entry: 50.8,
      failureClose: 48,
      plannedStop: 48.4,
      actualFill: 48.2,
      costs: 0.15,
    },
    skillIds: ['workflow.eleven-step', 'risk.invalidation-execution', 'risk.r', 'review.process'],
    difficulty: 4,
    promptHe:
      'במקרה ב׳ המעובד: הכניסה הייתה 50.8, ביום הבא המחיר חזר לטווח וסגר 48, העצירה 48.4 בוצעה ב־48.2, והעלות הייתה 0.15 ליחידה. הסיכון המתוכנן היה 2.55 ליחידה. איזה שחזור ואיזה תחקור נכונים?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'failure-review-correct',
        labelHe:
          'החזרה והסגירה 48 היו ראיית הכשל; המילוי 48.2; הפסד 2.75 ליחידה, כ־1.08R; ביצוע העצירה שמר על הכלל',
      },
      {
        id: 'later-low-first-failure',
        labelHe: 'השפל המאוחר 45 היה ראיית הכשל הראשונה ולכן היה צריך להמתין לו',
      },
      {
        id: 'move-stop-to-entry',
        labelHe: 'היה נכון להזיז את העצירה מעל הכניסה אחרי שכבר הופעלה כדי למחוק את ההפסד',
      },
    ],
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['failure-review-correct'],
      misconceptionIds: [
        'misconception.future-information-leak',
        'misconception.outcome-bias',
        'misconception.invalidation-as-guaranteed-fill',
      ],
    },
    explanationHe:
      'הראיה הראשונה הייתה חזרה לטווח וסגירה 48, לא הירידה המאוחרת. ההפסד בפועל ליחידה הוא 50.8−48.2+0.15=2.75, כלומר כ־1.08R מול 2.55 המתוכננים. החלקה הגדילה את ההפסד, אך ציות לעצירה מנע שינוי כלל בדיעבד.',
    alternativeExplanations: [
      {
        answerId: 'later-low-first-failure',
        explanationHe: 'שימוש בשפל שנראה רק לאחר היציאה מכניס מידע עתידי לתחקור ההחלטה.',
        misconceptionId: 'misconception.future-information-leak',
      },
    ],
    misconceptionIds: [
      'misconception.future-information-leak',
      'misconception.outcome-bias',
      'misconception.invalidation-as-guaranteed-fill',
    ],
    hintTexts: [
      'חפשו את האירוע הראשון שעמד בכלל הכשל שנקבע מראש.',
      'הפסד ליחידה כולל את מרחק הכניסה־מילוי ואת העלות.',
      'חלקו 2.75 ב־2.55 כדי לקבל כ־1.08R.',
    ],
    sourceReferences: sourceRefs(73, 74, 60, 61, 'פרק 19; מקרה ב׳ ואיור 19.2 — כשל, מילוי ותחקור'),
    workflowStepIds: ALL_WORKFLOW_STEPS,
    termIds: [
      'term.false-breakout',
      'term.invalidation',
      'term.stop-order',
      'term.slippage',
      'term.r',
    ],
    role: 'near-miss',
    category: 'journal-review',
    safetyNoteHe:
      'העצירה אינה תקרת הפסד: במקרה זה המילוי היה גרוע מן המתוכנן, ובפער ההפרש עלול להיות גדול יותר.',
    processCriteriaHe: [
      'ראיית הכשל זוהתה בזמן.',
      'המילוי בפועל נרשם.',
      'התהליך הוערך בנפרד מן ההפסד.',
    ],
    isRiskOrPositionSize: true,
  }),
  authoredExercise({
    id: 'u10-capstone-e03',
    seed: 91003,
    timeframe: 'weekly/daily',
    scenario: 'ambiguous',
    chartParameters: {
      basePrice: 88,
      neckline: 88,
      stop: 98.6,
      interveningSupport: 82.7,
      measuredTarget: 72,
    },
    skillIds: [
      'workflow.eleven-step',
      'risk.r',
      'risk.position-size',
      'risk.management',
      'review.process',
    ],
    difficulty: 5,
    promptHe:
      'מקרה ג׳ המעובד מציג ראש וכתפיים ברור לכאורה, אך המגמה השבועית עדיין עולה. קו הצוואר 88, כניסה אפשרית 87.8, עצירה 98.6, עלות 0.40 ותמיכה שבועית 82.7. עד התמיכה יש רק כ־0.48R. מהי החלטת התהליך?',
    interactionType: 'capstone',
    rubric: {
      kind: 'capstone',
      steps: caseCWorkflow.map((step) => ({ id: step.id, rubric: step.rubric })),
      misconceptionIds: [
        'misconception.pattern-without-context',
        'misconception.forced-trade',
        'misconception.target-as-promise',
      ],
    },
    explanationHe:
      'התבנית ניתנת לזיהוי, אך מכירה נגד מגמה שבועית עולה ופוטנציאל של 0.48R בלבד עד תמיכה קרובה אינם מצדיקים את הסיכון. היעד המדוד הרחוק אינו גובר על הרמה שבדרך, ואין להמציא עצירה צרה בלי עוגן מבני.',
    alternativeExplanations: [
      {
        answerId: 'confirmed-head-and-shoulders',
        explanationHe: 'שם תבנית אינו מספיק בלי מגמה קודמת מתאימה, רמות ביניים ויחס סיכון מעשי.',
        misconceptionId: 'misconception.pattern-without-context',
      },
      {
        answerId: 'move-stop-to-improve-r',
        explanationHe:
          'שינוי הביטול רק כדי לשפר R אינו מוצדק מבחינה מבנית ומשנה את התזה במקום לבדוק אותה.',
        misconceptionId: 'misconception.position-size-before-risk',
      },
    ],
    misconceptionIds: [
      'misconception.pattern-without-context',
      'misconception.forced-trade',
      'misconception.target-as-promise',
      'misconception.position-size-before-risk',
    ],
    hintTexts: [
      'בדקו את כיוון הטווח השבועי לפני שם התבנית.',
      'הרמה הראשונה בדרך חשובה יותר מן היעד המדוד הרחוק.',
      '0.48R עד תמיכה אינו משתפר על ידי הזזת ביטול ללא מבנה.',
    ],
    sourceReferences: sourceRefs(74, 75, 61, 62, 'פרק 19 — מקרה ג׳: תבנית ברורה ללא יחס מתאים'),
    isAmbiguous: true,
    workflowStepIds: ALL_WORKFLOW_STEPS,
    termIds: [
      'term.neckline',
      'term.invalidation',
      'term.stop-order',
      'term.r',
      'term.measured-move',
      'term.support',
    ],
    role: 'ambiguous',
    category: 'decision',
    safetyNoteHe: '״אין עסקה״ היא מסקנה מלאה; היא אינה תחזית שהמחיר לא ירד ואינה הוראה אישית.',
    processCriteriaHe: [
      'ההקשר קדם לתבנית.',
      'הרמה שבדרך קודמת ליעד.',
      'לא שונה ביטול כדי לכפות יחס.',
    ],
    isRiskOrPositionSize: true,
    capstoneSteps: caseCWorkflow,
  }),
  authoredExercise({
    id: 'u10-capstone-e04',
    seed: 91004,
    timeframe: 'weekly/hourly',
    scenario: 'lookalike',
    chartParameters: {
      basePrice: 197.2,
      entry: 197.2,
      stop: 194.8,
      costs: 0.2,
      firstTarget: 199.5,
      weeklyResistance: 201,
    },
    skillIds: ['workflow.eleven-step', 'risk.r', 'risk.management', 'review.process'],
    difficulty: 5,
    promptHe:
      'במקרה ד׳ המעובד: כניסה 197.2, עצירה מבנית 194.8 ועלות 0.20 נותנות 2.60 סיכון ליחידה. היעד המעשי לפני התנגדות שבועית הוא 199.5. מה יידרש כדי להציג לפחות 1.5R, והאם השינוי מוצדק מבחינה מבנית?',
    interactionType: 'decision',
    options: [
      {
        id: 'decision-no-trade-honest',
        labelHe:
          'יידרש יעד 201.1 או עצירה סביב 195.87; הראשון בתוך התנגדות והשנייה חסרת עוגן, לכן אין עסקה',
      },
      { id: 'decision-move-target', labelHe: 'להכריז על 201.1 כיעד מובטח כי החישוב דורש זאת' },
      { id: 'decision-tighten-stop', labelHe: 'להצמיד עצירה ל־195.87 גם בלי שפל או רמת ביטול' },
    ],
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['no-trade'],
      requiredReasonIds: [
        'required-target-201.1',
        'weekly-resistance-conflict',
        'no-structural-tighter-stop',
      ],
      misconceptionIds: [
        'misconception.target-as-promise',
        'misconception.position-size-before-risk',
        'misconception.forced-trade',
      ],
    },
    explanationHe:
      '1.5R דורש 3.90 נקודות מעל 197.2, כלומר יעד 201.1, שכבר מתנגש באזור ההתנגדות השבועי. לחלופין, יעד 199.5 דורש סיכון מרבי 1.53 ליחידה ועצירה סביב 195.87 אחרי עלות, אך אין שם עוגן מבני. לכן אין שינוי כן שמצדיק עסקה.',
    alternativeExplanations: [
      {
        answerId: 'decision-tighten-stop',
        explanationHe:
          'עצירה מחושבת לאחור מן היחס, בלי נקודת ביטול אמיתית, אינה מגדירה את כשל התזה.',
        misconceptionId: 'misconception.position-size-before-risk',
      },
    ],
    misconceptionIds: [
      'misconception.target-as-promise',
      'misconception.position-size-before-risk',
      'misconception.forced-trade',
    ],
    hintTexts: [
      '1.5×2.60 הם 3.90 נקודות.',
      'הוסיפו 3.90 לכניסה והשוו להתנגדות השבועית.',
      'עצירה צרה יותר תקפה רק אם יש לה עוגן ביטול מבני.',
    ],
    sourceReferences: sourceRefs(75, 75, 62, 62, 'פרק 19 — מקרה ד׳: יעד 1.5R מול התנגדות וביטול'),
    workflowStepIds: ALL_WORKFLOW_STEPS,
    termIds: [
      'term.resistance',
      'term.invalidation',
      'term.stop-order',
      'term.r',
      'term.measured-move',
    ],
    role: 'near-miss',
    category: 'journal-review',
    safetyNoteHe: 'יחס R נאה על הנייר אינו מצדיק הזזת ביטול או יעד מעבר לרמות ללא ראיה; אפשר לדלג.',
    processCriteriaHe: [
      'היחס חושב בשתי דרכים.',
      'היעד נבדק מול התנגדות.',
      'הביטול לא הוזז ללא עוגן.',
    ],
    isRiskOrPositionSize: true,
  }),
  authoredExercise({
    id: 'u10-capstone-e05',
    seed: 91005,
    timeframe: 'weekly/daily/hourly',
    scenario: 'range',
    chartParameters: {
      basePrice: 100,
      practiceOnly: true,
      weeklyReview: true,
      monthlyReview: true,
    },
    skillIds: ['workflow.eleven-step', 'review.process', 'risk.management'],
    difficulty: 5,
    promptHe:
      'בנו מסמך כללים מצומצם לתרגול מדומה. סמנו את כל הרכיבים שחייבים להיכתב מראש: שוק ונכסים, מסגרות, שתי תצורות לכל היותר, טריגר, ביטול וסיכון, יעד וניהול, מגבלות סביב אירועים, מדדי תהליך, סקירה שבועית וחודשית ותנאי הפסקה.',
    interactionType: 'selection',
    options: [
      { id: 'market-assets', labelHe: 'שוק, נכסים ומינימום נזילות' },
      { id: 'fixed-timeframes', labelHe: 'מסגרות זמן קבועות ותפקיד כל אחת' },
      { id: 'narrow-setups', labelHe: 'תצורה אחת או שתיים בהגדרה קבועה' },
      { id: 'entry-trigger', labelHe: 'טריגר כניסה מדויק' },
      { id: 'invalidation-risk', labelHe: 'ביטול, עצירה, עלויות וסיכון מרבי' },
      { id: 'target-management', labelHe: 'יעד מותנה וכלל ניהול' },
      { id: 'event-blockers', labelHe: 'אירועים שאוסרים כניסה' },
      { id: 'process-metrics', labelHe: 'R, ירידה, החלקה וציות לכלל' },
      { id: 'review-cadence', labelHe: 'סקירה שבועית וחודשית' },
      { id: 'pause-criteria', labelHe: 'חריגת סיכון, בעיית ביצוע, נזילות, תקלה או מצב רגשי' },
      { id: 'change-after-one-loss', labelHe: 'החלפת שיטה מיד אחרי הפסד אחד' },
    ],
    rubric: {
      kind: 'selection',
      expectedIds: [
        'market-assets',
        'fixed-timeframes',
        'narrow-setups',
        'entry-trigger',
        'invalidation-risk',
        'target-management',
        'event-blockers',
        'process-metrics',
        'review-cadence',
        'pause-criteria',
      ],
      mode: 'exact',
      misconceptionIds: ['misconception.outcome-bias'],
    },
    explanationHe:
      'מסמך תרגול שימושי מצמצם שוק, מסגרות ותצורות; מגדיר טריגר, ביטול, סיכון, עלויות, יעד וניהול; ומפרט מדדי תהליך, מועדי סקירה ותנאי עצירה. שינוי אינו תגובה לעסקה יחידה אלא להשערה ולבדיקה נפרדת על מדגם.',
    alternativeExplanations: [
      {
        answerId: 'change-after-one-loss',
        explanationHe:
          'עסקה אחת אינה מספקת מדגם, ושינוי בעקבותיה מערבב הטיית תוצאה עם שיפור שיטתי.',
        misconceptionId: 'misconception.outcome-bias',
      },
    ],
    misconceptionIds: [
      'misconception.outcome-bias',
      'misconception.single-example-as-proof',
      'misconception.forced-trade',
    ],
    hintTexts: [
      'המסמך צריך להיות צר מספיק כדי לצבור מדגם עקבי.',
      'הפרידו מדדי תהליך מתוצאה כספית.',
      'תנאי הפסקה הם מנגנון הגנה, לא כישלון.',
    ],
    sourceReferences: [
      ...sourceRefs(76, 77, 63, 64, 'פרק 20 — מסמך כללים, מדדים, סקירה והפסקה'),
      ...sourceRefs(78, 79, 65, 66, 'דף עזר מרוכז — 11 השלבים וכללי זהב'),
    ],
    workflowStepIds: ALL_WORKFLOW_STEPS,
    termIds: [
      'term.entry-trigger',
      'term.invalidation',
      'term.stop-order',
      'term.position-size',
      'term.r',
      'term.slippage',
    ],
    role: 'transfer',
    category: 'journal-review',
    safetyNoteHe:
      'המסמך מיועד לתרגול מדומה ולבדיקה הוגנת; הוא אינו תוכנית השקעה אישית או הבטחת תשואה.',
    processCriteriaHe: ['הכללים נכתבו מראש.', 'תהליך נמדד בנפרד מתוצאה.', 'נקבעו סקירה והפסקה.'],
    isRiskOrPositionSize: false,
  }),
];
