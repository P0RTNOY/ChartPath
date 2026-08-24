import { createChartSpec } from '@chartpath/chart-engine';

import { sourceRefs } from './source.js';
import type { ContentExercise } from './types.js';
import { CONTENT_SCHEMA_VERSION, CONTENT_VERSION_ID } from './version.js';

type ExerciseDraft = Omit<
  ContentExercise,
  'contentVersionId' | 'editorialStatus' | 'schemaVersion' | 'chartPresentation'
> & {
  readonly chartPresentation?: ContentExercise['chartPresentation'];
};

function reviewed(exercise: ExerciseDraft): ContentExercise {
  return {
    ...exercise,
    chartPresentation: exercise.chartPresentation ?? 'hidden',
    editorialStatus: 'reviewed',
    schemaVersion: CONTENT_SCHEMA_VERSION,
    contentVersionId: CONTENT_VERSION_ID,
  };
}

function hints(id: string, orient: string, focus: string, procedure: string) {
  return [
    { id: `${id}-hint-1`, level: 1, textHe: orient },
    { id: `${id}-hint-2`, level: 2, textHe: focus },
    { id: `${id}-hint-3`, level: 3, textHe: procedure },
  ] as const;
}

function chart(
  id: string,
  seed: number,
  scenario: Parameters<typeof createChartSpec>[0]['scenario'],
  parameters: NonNullable<Parameters<typeof createChartSpec>[0]['parameters']>,
  decisionCandleIndex?: number,
) {
  return createChartSpec({
    id: `${id}-chart`,
    seed,
    scenario,
    candleCount: 72,
    timeframe: '1d',
    basePrice: 100,
    baseVolume: 800_000,
    volatility: 0.016,
    noise: 0.42,
    parameters,
    ...(decisionCandleIndex === undefined ? {} : { decisionCandleIndex }),
  });
}

const volumeFigureRefs = sourceRefs(34, 34, 21, 21, 'פרק 7 — מחזור דחף ותיקון; איור 7.1');
const relativeVolumeRefs = sourceRefs(33, 35, 20, 22, 'פרק 7 — מחזור יחסי ואישור');
const volumePatternRefs = sourceRefs(34, 35, 21, 22, 'פרק 7 — מחזור בתבניות');
const fragmentedVolumeRefs = [
  ...sourceRefs(35, 35, 22, 22, 'פרק 7 — מגבלות מקור המחזור'),
  ...sourceRefs(70, 71, 57, 58, 'פרק 18 — התאמה לשווקים מודרניים'),
];
const eventVolumeRefs = [
  ...sourceRefs(35, 35, 22, 22, 'פרק 7 — חריגת מחזור באירוע'),
  ...sourceRefs(71, 71, 58, 58, 'פרק 18 — חדשות, זירות ומגבלות ביצוע'),
];
const headShouldersLabelRefs = sourceRefs(
  38,
  39,
  25,
  26,
  'פרק 8 — ראש וכתפיים ומגמה קודמת; איורים 8.1–8.2',
);
const inverseHeadShouldersRefs = sourceRefs(39, 39, 26, 26, 'פרק 8 — ראש וכתפיים הפוך; איור 8.2');
const roundedBottomRefs = sourceRefs(40, 40, 27, 27, 'פרק 8 — תחתית מעוגלת; איור 8.3');
const doubleTopRefs = sourceRefs(41, 41, 28, 28, 'פרק 9 — פסגה כפולה; איור 9.1');
const rectangleRefs = sourceRefs(42, 43, 29, 30, 'פרק 9 — מלבן ותרחישי יציאה; איור 9.2');
const triangleClassificationRefs = sourceRefs(
  44,
  46,
  31,
  33,
  'פרק 10 — סיווג משולשים והטיה; איורים 10.1–10.2',
);
const triangleProjectionRefs = sourceRefs(45, 46, 32, 33, 'פרק 10 — יעדי משולש, רמות ביניים וסטופ');
const wedgeRefs = sourceRefs(
  47,
  49,
  34,
  36,
  'פרק 11 — טריזים, תבניות מתרחבות ויהלום; איורים 11.1–11.2',
);
const flagRefs = sourceRefs(50, 51, 37, 38, 'פרק 12 — דגלים, דגלונים ותבניות המשך; איור 12.1');
const gapClassificationRefs = sourceRefs(52, 54, 39, 41, 'פרק 13 — סיווג פערי מחיר; איור 13.1');
const gapAmbiguityRefs = sourceRefs(53, 54, 40, 41, 'פרק 13 — פער המשך לעומת מיצוי');
const breakoutRefs = sourceRefs(
  57,
  59,
  44,
  46,
  'פרק 14 — פריצות, חזרות ופריצות שווא; איורים 14.1–14.2',
);
const breakoutGapRiskRefs = [
  ...sourceRefs(54, 54, 41, 41, 'פרק 13 — סיכון פער ומילוי עצירה'),
  ...sourceRefs(59, 59, 46, 46, 'פרק 14 — דוגמת סיכון בפריצה ובבדיקה חוזרת'),
];

export const exercises05To08: readonly ContentExercise[] = [
  reviewed({
    id: 'u04-volume-e01',
    skillIds: ['evidence.volume'],
    difficulty: 2,
    promptHe:
      'לפי תיאור המקרה, במגמת עלייה נצפו ארבעה גלי דחף ושלושה תיקונים. בחרו את צירוף תיאורי המחזור שתומך במגמה, אך אינו מוכיח אותה.',
    promptEn:
      'On the synthetic uptrend, select the volume descriptions that support—but do not prove—the trend.',
    interactionType: 'selection',
    options: [
      { id: 'impulses-expand', labelHe: 'בגלי הדחף המחזור נוטה להתרחב' },
      { id: 'corrections-contract', labelHe: 'בתיקונים המחזור נוטה להתכווץ' },
      { id: 'corrections-expand', labelHe: 'בתיקונים המחזור חייב להתרחב' },
      { id: 'volume-proves-trend', labelHe: 'המחזור לבדו מוכיח שהמגמה תימשך' },
    ],
    chartSpec: chart('u04-volume-e01', 40501, 'uptrend', {
      direction: 'up',
      regime: 'uptrend',
      relativeVolume: 'rising',
    }),
    rubric: {
      kind: 'selection',
      expectedIds: ['impulses-expand', 'corrections-contract'],
      mode: 'exact',
      allowExtraSelections: false,
      misconceptionIds: ['misconception.volume-as-verdict'],
    },
    explanationHe:
      'בקריאה הקלאסית, התרחבות יחסית במחזור עם גלי הדחף והתכווצות בתיקונים מוסיפות תמיכה לקריאת המחיר. זו התאמה תיאורית למסגרת ולמקור הנתונים, לא הוכחה שהמהלך יימשך.',
    alternativeExplanations: [
      {
        answerId: 'corrections-expand',
        explanationHe:
          'התצפית המבוקשת היא יחסית: התרחבות בתיקון נגד המגמה עשויה דווקא להחליש את תרחיש ההמשך; יש להשוות כל גל לבסיס עקבי.',
      },
      {
        answerId: 'volume-proves-trend',
        explanationHe:
          'מחזור הוא ראיה תומכת בלבד. גם התאמה נקייה בין מחיר למחזור אינה מבטיחה המשך.',
        misconceptionId: 'misconception.volume-as-verdict',
      },
    ],
    misconceptionIds: ['misconception.volume-as-verdict'],
    hints: hints(
      'u04-volume-e01',
      'התחילו מכיוון המחיר: אילו קטעים הם דחף ואילו תיקון?',
      'השוו את המחזור בין גל דחף לתיקון הסמוך, לא למספר מוחלט בנכס אחר.',
      'בחרו שתי נטיות יחסיות והשאירו בחוץ כל ניסוח המכיל “חייב” או “מוכיח”.',
    ),
    sourceReferences: volumeFigureRefs,
    workflowStepIds: ['context', 'setup', 'confirmation'],
    termIds: ['term.trend', 'term.relative-volume', 'term.confirmation'],
    role: 'positive',
    category: 'visual',
    safetyNoteHe: 'התנהגות מחזור תומכת בתרחיש רק בהקשר מוגדר ואינה אות פעולה עצמאי.',
    processCriteriaHe: [
      'זיהוי נפרד של דחף ותיקון',
      'השוואת מחזור יחסית באותו מקור',
      'הימנעות ממסקנה ודאית',
    ],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u04-volume-e02',
    skillIds: ['evidence.volume'],
    difficulty: 2,
    promptHe:
      'ממוצע המחזור ב־20 הימים הקודמים הוא 800,000 יחידות. בנר ההחלטה נרשמו 1,200,000 יחידות. מהו המחזור היחסי (Relative Volume) ומה ניתן לומר?',
    promptEn:
      'The prior 20-day average is 800,000 units and the decision candle records 1,200,000. Choose the relative-volume calculation and qualified conclusion.',
    interactionType: 'multiple-choice',
    options: [
      { id: 'rvol-1-5-supporting', labelHe: 'פי 1.5; השתתפות גבוהה מהבסיס שתומכת בקריאה' },
      { id: 'rvol-0-67', labelHe: 'פי 0.67; מחזור נמוך מהבסיס' },
      { id: 'rvol-1-5-proof', labelHe: 'פי 1.5; הוכחה שהפריצה אמיתית' },
      { id: 'rvol-400k', labelHe: '400,000; זהו המחזור היחסי' },
    ],
    chartSpec: chart('u04-volume-e02', 40502, 'breakout', {
      direction: 'up',
      regime: 'range',
      relativeVolume: 'rising',
      eventIndex: 50,
    }),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['rvol-1-5-supporting'],
      misconceptionIds: ['misconception.volume-as-verdict'],
    },
    explanationHe:
      'החישוב הוא 1,200,000 חלקי 800,000, ולכן המחזור היחסי הוא פי 1.5. הוא מעיד על השתתפות גבוהה מהבסיס שהוגדר, אך משמעותו תלויה במחיר, בשעת המדידה ובשלמות המקור.',
    alternativeExplanations: [
      {
        answerId: 'rvol-0-67',
        explanationHe: 'זהו היחס ההפוך. מחזור יחסי מחושב כמחזור הנוכחי חלקי הבסיס.',
      },
      {
        answerId: 'rvol-1-5-proof',
        explanationHe:
          'החשבון נכון, אך המסקנה חזקה מדי: מחזור גבוה אינו הופך פריצה לוודאית או לתקפה סטטיסטית.',
        misconceptionId: 'misconception.volume-as-verdict',
      },
      {
        answerId: 'rvol-400k',
        explanationHe:
          '400,000 הוא ההפרש המוחלט; השאלה מבקשת יחס, ולכן מחלקים את המחזור הנוכחי בבסיס.',
      },
    ],
    misconceptionIds: ['misconception.volume-as-verdict'],
    hints: hints(
      'u04-volume-e02',
      'הבסיס הוא ממוצע 20 הימים שניתן בשאלה.',
      'מחזור יחסי הוא מנה, לא הפרש.',
      'חשבו 1,200,000 ÷ 800,000 ואז בחרו מסקנה שאינה מבטיחה תוצאה.',
    ),
    sourceReferences: relativeVolumeRefs,
    workflowStepIds: ['context', 'confirmation'],
    termIds: ['term.relative-volume', 'term.confirmation'],
    role: 'transfer',
    category: 'calculation',
    safetyNoteHe: 'סף מחזור יחסי מקבל משמעות רק לאחר הגדרת נכס, שעה, בסיס ועלויות.',
    processCriteriaHe: ['שימוש בבסיס הנתון', 'חישוב מנה נכון', 'ניסוח הממצא כראיה תומכת'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u04-volume-e03',
    skillIds: ['evidence.volume', 'patterns.reversal', 'patterns.continuation'],
    difficulty: 3,
    promptHe:
      'בחרו את כל ציפיות המחזור הסבירות בשני מבנים סינתטיים: מבנה שעשוי להיות ראש וכתפיים ומשולש מתכנס. הבחירה צריכה לשמור על ההבחנה בין נטייה לבין תנאי הכרחי.',
    interactionType: 'selection',
    options: [
      { id: 'hs-components-contract', labelHe: 'בראש־וכתפיים עשויה להופיע היחלשות בין הרכיבים' },
      { id: 'hs-neckline-expand', labelHe: 'בשבירת קו הצוואר התרחבות עשויה לחזק אישור' },
      { id: 'triangle-contract', labelHe: 'במשולש המחזור עשוי להתכווץ עם הצטמצמות הטווח' },
      { id: 'triangle-exit-expand', labelHe: 'ביציאה מהמשולש התרחבות עשויה לתמוך בפריצה' },
      { id: 'volume-is-required-verdict', labelHe: 'ללא הפרופיל המושלם שתי התבניות פסולות בהכרח' },
    ],
    chartSpec: chart('u04-volume-e03', 40503, 'continuation', {
      direction: 'up',
      regime: 'uptrend',
      pattern: 'symmetrical-triangle',
      relativeVolume: 'falling',
      eventIndex: 53,
    }),
    rubric: {
      kind: 'selection',
      expectedIds: [
        'hs-components-contract',
        'hs-neckline-expand',
        'triangle-contract',
        'triangle-exit-expand',
      ],
      mode: 'exact',
      allowExtraSelections: false,
      misconceptionIds: [
        'misconception.volume-as-verdict',
        'misconception.pattern-without-context',
      ],
    },
    explanationHe:
      'בשני המבנים המחזור יכול להוסיף הקשר: היחלשות במהלך הבנייה והתרחבות באישור הן ציפיות קלאסיות, ובמשולש מקובל לבחון התכווצות עם הטווח. אף פרופיל אינו תנאי הכרחי; המחיר והכלל שהוגדרו מראש נשארים מרכזיים.',
    alternativeExplanations: [
      {
        answerId: 'volume-is-required-verdict',
        explanationHe:
          'פרופיל לא מושלם מחליש לכל היותר את משקל הראיה. הוא אינו פוסל לבדו מבנה ואינו מחליף אישור מחיר.',
        misconceptionId: 'misconception.volume-as-verdict',
      },
      {
        feedbackCode: 'selection-mismatch',
        explanationHe: 'גם צורה נאה אינה מספיקה: נדרשים הקשר, מבנה וכלל אישור שנקבע לפני התוצאה.',
        misconceptionId: 'misconception.pattern-without-context',
      },
    ],
    misconceptionIds: ['misconception.volume-as-verdict', 'misconception.pattern-without-context'],
    hints: hints(
      'u04-volume-e03',
      'הפרידו בין שלב בניית המבנה לבין רגע היציאה ממנו.',
      'חפשו התכווצות בתוך המבנה והתרחבות אפשרית באישור.',
      'בחרו את ארבע הנטיות ההקשריות ודחו את הטענה שהמחזור הוא גורם מכריע יחיד.',
    ),
    sourceReferences: volumePatternRefs,
    workflowStepIds: ['context', 'setup', 'confirmation'],
    termIds: ['term.relative-volume', 'term.neckline', 'term.confirmation'],
    role: 'near-miss',
    category: 'explanation',
    safetyNoteHe: 'פרופיל מחזור הוא היוריסטיקה ניתנת לבדיקה, לא תנאי אוניברסלי לתבנית.',
    processCriteriaHe: [
      'הפרדת שלב הבנייה מרגע האישור',
      'שימוש במחזור כמשקל ראיה',
      'שמירה על הקשר המחיר',
    ],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u04-volume-e04',
    skillIds: ['evidence.volume', 'markets.constraints'],
    difficulty: 3,
    promptHe:
      'מוצגים שלושה נתונים: מחזור טיקים מספק מט״ח אחד, מחזור של קרן סל כתחליף למדד, ומחזור מזירת קריפטו אחת. איזו מסקנה משותפת היא הזהירה ביותר?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'source-limited-context',
        labelHe: 'כל נתון מתאר מקור או זירה מוגדרים; אפשר להשתמש בו בהקשר ולציין שאינו שוק מלא',
      },
      { id: 'all-central-volume', labelHe: 'שלושתם מחזור מרכזי ומלא של השוק' },
      { id: 'all-useless', labelHe: 'אין להם כל ערך ולכן יש להתעלם מהם תמיד' },
      { id: 'one-venue-proves', labelHe: 'זירה אחת מספיקה כדי להוכיח השתתפות בכלל השוק' },
    ],
    chartSpec: chart('u04-volume-e04', 40504, 'ambiguous', {
      baseScenario: 'range',
      regime: 'range',
      variant: 'ambiguous',
      relativeVolume: 'steady',
    }),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['source-limited-context'],
      misconceptionIds: ['misconception.volume-as-verdict'],
    },
    explanationHe:
      'מחזור טיקים תלוי בספק, המדד עצמו הוא חישוב והתחליף נסחר כמכשיר אחר, וקריפטו מפוצל בין זירות. הנתונים עדיין עשויים להועיל, אך הטענה חייבת להיות מוגבלת למקור, לזירה ולשעת המדידה.',
    alternativeExplanations: [
      {
        answerId: 'all-central-volume',
        explanationHe:
          'המשותף הוא דווקא היעדר מקור מרכזי מלא: כל אחד מהנתונים מודד פרוקסי, ספק או זירה מסוימים.',
      },
      {
        answerId: 'all-useless',
        explanationHe:
          'מגבלת מקור אינה הופכת נתון לחסר ערך; היא מצמצמת את היקף המסקנה ודורשת עקביות בהשוואה.',
      },
      {
        answerId: 'one-venue-proves',
        explanationHe:
          'זירה אחת אינה מייצגת בהכרח שוק מפוצל, ולכן אין להפוך את המחזור שלה לפסק דין כולל.',
        misconceptionId: 'misconception.volume-as-verdict',
      },
    ],
    misconceptionIds: ['misconception.volume-as-verdict'],
    hints: hints(
      'u04-volume-e04',
      'שאלו מי יצר כל נתון ואיזה שוק הוא באמת מכסה.',
      'הבחינו בין נתון מוגבל לבין נתון חסר ערך.',
      'בחרו במסקנה שמציינת מקור והיקף בלי לטעון לכיסוי מלא.',
    ),
    sourceReferences: fragmentedVolumeRefs,
    isAmbiguous: true,
    workflowStepIds: ['context', 'confirmation', 'review'],
    termIds: ['term.relative-volume'],
    role: 'ambiguous',
    category: 'explanation',
    safetyNoteHe: 'נתון חלקי עשוי לתמוך בתצפית, אך אינו מייצג אוטומטית את כלל השוק.',
    processCriteriaHe: ['ציון מקור הנתון', 'הגבלת היקף המסקנה', 'הימנעות מפסילה גורפת'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u04-volume-e05',
    skillIds: ['evidence.volume', 'markets.constraints'],
    difficulty: 3,
    promptHe:
      'מחזור יום אירוע הוא 2,000,000 יחידות לעומת ממוצע קודם של 800,000. בחרו את תיעוד התחקור שמחשב נכון ומנסח מסקנה מסויגת.',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'outlier-2-5-qualified',
        labelHe: 'פי 2.5; חריגה התואמת אירוע, ולכן יש לבדוק מחיר והמשך לפני ייחוס משמעות מבנית',
      },
      { id: 'outlier-1-2', labelHe: 'פי 1.2; האירוע אינו חריג' },
      { id: 'outlier-proves-breakout', labelHe: 'פי 2.5; האירוע מוכיח שהפריצה תצליח' },
      { id: 'exclude-event-context', labelHe: 'אין לתעד את האירוע כי הוא מקלקל את הממוצע' },
    ],
    chartSpec: chart('u04-volume-e05', 40505, 'breakout', {
      direction: 'up',
      regime: 'range',
      variant: 'near-miss',
      relativeVolume: 'spike',
      eventIndex: 48,
    }),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['outlier-2-5-qualified'],
      misconceptionIds: ['misconception.volume-as-verdict', 'misconception.outcome-bias'],
    },
    explanationHe:
      '2,000,000 חלקי 800,000 שווה פי 2.5. מאחר שהחריגה חלה ביום אירוע, התחקור הנכון שומר אותה כעובדה ומפריד בין הסבר אפשרי לבין מסקנה על הצלחת הפריצה.',
    alternativeExplanations: [
      {
        answerId: 'outlier-1-2',
        explanationHe: 'היחס הוא 2.5, לא 1.2; יש לחלק את יום האירוע בבסיס הקודם.',
      },
      {
        answerId: 'outlier-proves-breakout',
        explanationHe: 'החישוב נכון אך המסקנה אינה: אירוע יכול לייצר מחזור חריג גם במהלך שנכשל.',
        misconceptionId: 'misconception.volume-as-verdict',
      },
      {
        answerId: 'exclude-event-context',
        explanationHe: 'אין למחוק את החריגה. מתעדים אותה ומסמנים שהבסיס הבא עלול להיות מושפע ממנה.',
        misconceptionId: 'misconception.outcome-bias',
      },
    ],
    misconceptionIds: ['misconception.volume-as-verdict', 'misconception.outcome-bias'],
    hints: hints(
      'u04-volume-e05',
      'חשבו תחילה את היחס מול הממוצע שקדם לאירוע.',
      'אירוע מסביר חריגה אפשרית אך אינו קובע את תוצאת המחיר.',
      'בחרו בתשובה הכוללת גם פי 2.5 וגם דרישה לבדוק מחיר והמשך.',
    ),
    sourceReferences: eventVolumeRefs,
    workflowStepIds: ['context', 'confirmation', 'review'],
    termIds: ['term.relative-volume', 'term.confirmation'],
    role: 'transfer',
    category: 'journal-review',
    safetyNoteHe: 'חריגת אירוע אינה הוכחה לכיוון ואינה בסיס יחיד להחלטת סיכון.',
    processCriteriaHe: ['חישוב המחזור היחסי', 'תיעוד האירוע', 'הפרדת תצפית ממסקנת תוצאה'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u05-reversal-e01',
    skillIds: ['patterns.reversal'],
    difficulty: 2,
    promptHe:
      'לפי תיאור המקרה, שלוש פסגות דומות מופיעות בתוך טווח, ללא מגמת עלייה קודמת, והפסגה הימנית טרם הושלמה. כיצד יש לסווג את התווית “ראש וכתפיים עליון” בנר ההחלטה?',
    interactionType: 'decision',
    options: [
      { id: 'reject-pattern', labelHe: 'לדחות את התווית בשלב זה' },
      { id: 'wait-for-right-shoulder', labelHe: 'להמתין לכתף ימין ואז לסחור מייד' },
      { id: 'accept-three-peaks', labelHe: 'לקבל את התווית כי נצפו שלוש פסגות' },
    ],
    chartSpec: chart(
      'u05-reversal-e01',
      50501,
      'lookalike',
      {
        baseScenario: 'reversal',
        direction: 'down',
        regime: 'range',
        variant: 'lookalike',
        pattern: 'head-and-shoulders',
        eventIndex: 54,
      },
      54,
    ),
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['reject'],
      requiredReasonIds: ['missing-prior-uptrend', 'right-shoulder-incomplete'],
      misconceptionIds: [
        'misconception.pattern-without-context',
        'misconception.missing-prior-trend',
      ],
    },
    explanationHe:
      'התווית נדחית בשלב זה: ראש וכתפיים עליון מקבל משמעות היפוכית רק לאחר מגמת עלייה קודמת, והמבנה כאן עדיין חסר כתף ימין מושלמת. גם קו צוואר לא נשבר לפי כלל אישור.',
    alternativeExplanations: [
      {
        answerId: 'accept-three-peaks',
        explanationHe:
          'שלוש פסגות לבדן הן דמיון חזותי. בלי מגמה קודמת ורכיב ימני מושלם אין בסיס לתווית היפוך.',
        misconceptionId: 'misconception.pattern-without-context',
      },
    ],
    misconceptionIds: [
      'misconception.pattern-without-context',
      'misconception.missing-prior-trend',
    ],
    hints: hints(
      'u05-reversal-e01',
      'בדקו קודם מה המבנה אמור להפוך.',
      'אחר כך ספרו אילו רכיבים הושלמו עד נר ההחלטה בלבד.',
      'אם אין מגמה קודמת והכתף הימנית חלקית, בחרו דחייה וציינו את שני הנימוקים.',
    ),
    sourceReferences: headShouldersLabelRefs,
    isAmbiguous: true,
    workflowStepIds: ['context', 'structure', 'setup', 'confirmation'],
    termIds: ['term.trend', 'term.neckline', 'term.confirmation'],
    role: 'lookalike',
    category: 'decision',
    safetyNoteHe: 'שם של תבנית אינו תחזית; מבנה חסר או הקשר חסר מצדיקים המתנה או דחייה.',
    processCriteriaHe: ['בדיקת מגמה קודמת', 'בדיקת שלמות הרכיבים', 'שימוש במידע עד נר ההחלטה'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u05-reversal-e02',
    skillIds: ['patterns.reversal', 'breakouts.rules'],
    difficulty: 3,
    promptHe:
      'במבנה ראש־וכתפיים הפוך סינתטי בחרו את ארבע התאמות התווית הנכונות: קו צוואר, אישור, ביטול תוקף ואומדן מדוד.',
    interactionType: 'selection',
    options: [
      { id: 'neckline-between-reaction-highs', labelHe: 'קו הצוואר מחבר את שיאי התגובה' },
      { id: 'confirmation-defined-break', labelHe: 'האישור הוא שבירה לפי כלל שנקבע מראש' },
      {
        id: 'invalidation-below-structure',
        labelHe: 'ביטול התוקף נמצא מעבר למבנה שמפריך את התרחיש',
      },
      {
        id: 'estimate-project-height',
        labelHe: 'האומדן מקרין את המרחק מהראש לקו הצוואר מנקודת השבירה',
      },
      { id: 'confirmation-at-head', labelHe: 'האישור מגיע כבר ביצירת הראש' },
      { id: 'target-guaranteed', labelHe: 'ההשלכה היא יעד מובטח' },
    ],
    chartSpec: chart('u05-reversal-e02', 50502, 'reversal', {
      direction: 'up',
      regime: 'downtrend',
      variant: 'positive',
      pattern: 'inverse-head-and-shoulders',
      relativeVolume: 'rising',
      eventIndex: 54,
    }),
    rubric: {
      kind: 'selection',
      expectedIds: [
        'neckline-between-reaction-highs',
        'confirmation-defined-break',
        'invalidation-below-structure',
        'estimate-project-height',
      ],
      mode: 'exact',
      allowExtraSelections: false,
      misconceptionIds: ['misconception.confirmation-as-entry', 'misconception.target-as-promise'],
    },
    explanationHe:
      'בגרסה ההפוכה קו הצוואר עובר באזור שיאי התגובה, והאישור מגיע רק בשבירה שעומדת בכלל שנקבע. ביטול התוקף צריך להפריך את המבנה, והמרחק האנכי מהראש לקו הצוואר יוצר אומדן גאומטרי בלבד.',
    alternativeExplanations: [
      {
        answerId: 'confirmation-at-head',
        explanationHe: 'הראש הוא רכיב במבנה, לא אישור. האישור נבחן רק לאחר יציאה תקפה מקו הצוואר.',
        misconceptionId: 'misconception.confirmation-as-entry',
      },
      {
        answerId: 'target-guaranteed',
        explanationHe:
          'השלכת הגובה היא אומדן מינימום אפשרי; רמות ביניים ותנודתיות עשויות לשנות את הניהול.',
        misconceptionId: 'misconception.target-as-promise',
      },
    ],
    misconceptionIds: ['misconception.confirmation-as-entry', 'misconception.target-as-promise'],
    hints: hints(
      'u05-reversal-e02',
      'אתרו את הראש העמוק ואת שני שיאי התגובה שסביבו.',
      'הפרידו בין תיאור המבנה, ראיית האישור ותנאי שמפריך אותו.',
      'בחרו בארבע ההתאמות המותנות ודחו אישור מוקדם או יעד מובטח.',
    ),
    sourceReferences: inverseHeadShouldersRefs,
    workflowStepIds: ['context', 'structure', 'level', 'confirmation', 'invalidation', 'target'],
    termIds: ['term.neckline', 'term.confirmation', 'term.invalidation', 'term.measured-move'],
    role: 'positive',
    category: 'visual',
    safetyNoteHe: 'האישור אינו הוראת כניסה, והאומדן המדוד אינו הבטחת מחיר.',
    processCriteriaHe: ['מיקום קו הצוואר לפי תגובות', 'הפרדת אישור מביטול', 'סימון היעד כאומדן'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u05-reversal-e03',
    skillIds: ['patterns.reversal', 'breakouts.rules'],
    difficulty: 3,
    promptHe:
      'בתחתית מעוגלת שבועית סינתטית אין קו צוואר יחיד וברור. איזה כלל אישור הוא השמרני ביותר, ושאפשר לבדוק מראש?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'weekly-close-above-swing',
        labelHe: 'סגירה שבועית מעל שיא ביניים מוגדר, ולאחריה שמירה על מבנה שפל עולה',
      },
      { id: 'shape-looks-round', labelHe: 'ברגע שהצורה נראית עגולה' },
      { id: 'first-green-candle', labelHe: 'בנר החיובי הראשון אחרי השפל' },
      { id: 'future-best-fit', labelHe: 'לבחור בדיעבד את הממוצע שהצליח הכי טוב' },
    ],
    chartSpec: chart('u05-reversal-e03', 50503, 'reversal', {
      direction: 'up',
      regime: 'downtrend',
      variant: 'positive',
      pattern: 'rounded',
      eventIndex: 56,
    }),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['weekly-close-above-swing'],
      misconceptionIds: [
        'misconception.pattern-without-context',
        'misconception.future-information-leak',
      ],
    },
    explanationHe:
      'לתחתית מעוגלת אין נקודת אישור אוניברסלית. סגירה שבועית מעל שיא ביניים שנבחר מראש, יחד עם שימור שינוי המבנה, היא כלל תצפיתי שניתן ליישם בלי להתאים אותו לתוצאה.',
    alternativeExplanations: [
      {
        answerId: 'shape-looks-round',
        explanationHe:
          'תחושת צורה אינה כלל שחוזר על עצמו. יש להגדיר מחיר, מסגרת זמן ומה ייחשב שינוי מבנה.',
        misconceptionId: 'misconception.pattern-without-context',
      },
      {
        answerId: 'first-green-candle',
        explanationHe: 'נר יחיד אינו מוכיח מעבר הדרגתי מהיצע לביקוש ואינו מגדיר מבנה חדש.',
      },
      {
        answerId: 'future-best-fit',
        explanationHe: 'בחירת כלל אחרי ראיית התוצאה מזליגה מידע עתידי ומונעת בדיקה הוגנת.',
        misconceptionId: 'misconception.future-information-leak',
      },
    ],
    misconceptionIds: [
      'misconception.pattern-without-context',
      'misconception.future-information-leak',
    ],
    hints: hints(
      'u05-reversal-e03',
      'חפשו ראיה שניתנת להגדרה לפני הנר הבא.',
      'במבנה איטי אפשר להשתמש בשיא ביניים ובשינוי מבנה במקום קו צוואר יחיד.',
      'בחרו כלל הכולל סגירה שבועית ורמת מחיר מוגדרת מראש.',
    ),
    sourceReferences: roundedBottomRefs,
    workflowStepIds: ['context', 'structure', 'setup', 'confirmation'],
    termIds: ['term.confirmation', 'term.higher-low'],
    role: 'transfer',
    category: 'decision',
    safetyNoteHe: 'כלל אישור עקבי מצמצם שיקול דעת בדיעבד אך אינו מבטיח שינוי מגמה.',
    processCriteriaHe: ['בחירת מסגרת שבועית', 'הגדרת שיא ביניים מראש', 'דרישת שינוי מבני נוסף'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u05-reversal-e04',
    chartPresentation: 'answer-evidence',
    skillIds: ['patterns.reversal', 'structure.swings'],
    difficulty: 3,
    promptHe:
      'במבנה שעשוי להיות פסגה כפולה סמנו את שפל הביניים המשמעותי בין שתי הפסגות. האישור ייבחן רק אם המחיר יסגור מתחת לשפל זה.',
    interactionType: 'point',
    chartSpec: chart(
      'u05-reversal-e04',
      50504,
      'reversal',
      {
        direction: 'down',
        regime: 'uptrend',
        variant: 'positive',
        pattern: 'double-top',
        eventIndex: 54,
      },
      53,
    ),
    rubric: {
      kind: 'point',
      targets: [{ candleIndex: 30, price: 98.8521 }],
      tolerance: { horizontal: 0.045, vertical: 0.045 },
      matching: 'all',
      allowExtraPoints: false,
      decisionCandleIndex: 53,
      misconceptionIds: [
        'misconception.pattern-without-context',
        'misconception.confirmation-as-entry',
      ],
    },
    explanationHe:
      'הנקודה המבוקשת היא שפל התגובה המפריד בין שתי הפסגות. דמיון בגובה הפסגות אינו מספיק; רק שבירה מוגדרת של השפל הביניים מוסיפה את אישור המבנה.',
    alternativeExplanations: [
      {
        feedbackCode: 'point-outside-tolerance',
        explanationHe:
          'הפסגה השנייה אינה קו האישור, ושפל קטן סמוך אינו מפריד את הפסגות. סמנו את שפל התגובה העמוק והמשמעותי שבמרכז המבנה.',
        misconceptionId: 'misconception.confirmation-as-entry',
      },
    ],
    misconceptionIds: [
      'misconception.pattern-without-context',
      'misconception.confirmation-as-entry',
    ],
    hints: hints(
      'u05-reversal-e04',
      'אתרו תחילה את שתי הפסגות הגדולות, לא תנודות קטנות.',
      'עקבו מטה מהמרווח ביניהן אל שפל התגובה העמוק ביותר.',
      'סמנו את השפל המרכזי סביב נר 30; הסבילות מאפשרת סטייה קטנה בזמן ובמחיר.',
    ),
    sourceReferences: doubleTopRefs,
    workflowStepIds: ['context', 'structure', 'level', 'confirmation'],
    termIds: ['term.confirmation', 'term.resistance'],
    role: 'near-miss',
    category: 'visual',
    safetyNoteHe: 'שתי פסגות סמוכות אינן היפוך מאושר לפני שבירת שפל הביניים לפי כלל מוגדר.',
    processCriteriaHe: ['זיהוי הפסגות המרכזיות', 'סימון שפל התגובה המפריד', 'המתנה לאישור'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u05-reversal-e05',
    skillIds: ['patterns.reversal', 'breakouts.rules'],
    difficulty: 3,
    promptHe:
      'מלבן סינתטי מופיע אחרי מגמת עלייה, אך טרם הייתה יציאה תקפה. מהי ההחלטה המדויקת בנר ההחלטה?',
    interactionType: 'decision',
    options: [
      { id: 'wait-for-breakout', labelHe: 'להמתין ליציאה תקפה ולאישור' },
      { id: 'insufficient-direction', labelHe: 'אין עדיין מספיק ראיות לכיוון' },
      { id: 'trade-up-prior-trend', labelHe: 'לסחור מעלה כי המגמה הקודמת עלתה' },
      { id: 'trade-down-long-range', labelHe: 'לסחור מטה כי הטווח נמשך זמן רב' },
    ],
    chartSpec: chart(
      'u05-reversal-e05',
      50505,
      'ambiguous',
      {
        baseScenario: 'continuation',
        direction: 'up',
        regime: 'uptrend',
        variant: 'ambiguous',
        pattern: 'rectangle',
        eventIndex: 54,
      },
      54,
    ),
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['wait', 'insufficient-evidence'],
      requiredReasonIds: ['rectangle-direction-unconfirmed'],
      misconceptionIds: [
        'misconception.pattern-without-context',
        'misconception.bias-as-confirmation',
        'misconception.forced-trade',
      ],
    },
    explanationHe:
      'המלבן הוא טווח שיכול להמשיך את המגמה, להפוך אותה או להישאר לא פתור. המגמה הקודמת יוצרת הטיה בלבד; עד יציאה שעומדת בכלל שנקבע, ההחלטה היא להמתין בשל חוסר ראיה כיוונית.',
    alternativeExplanations: [
      {
        answerId: 'trade-up-prior-trend',
        explanationHe: 'המגמה הקודמת מטה את התרחיש אך אינה מאשרת את כיוון היציאה מהמלבן.',
        misconceptionId: 'misconception.bias-as-confirmation',
      },
      {
        answerId: 'trade-down-long-range',
        explanationHe: 'טווח ממושך עשוי להעלות אפשרות היפוך, אך גם היא זקוקה לאישור יציאה.',
        misconceptionId: 'misconception.pattern-without-context',
      },
    ],
    misconceptionIds: [
      'misconception.pattern-without-context',
      'misconception.bias-as-confirmation',
      'misconception.forced-trade',
    ],
    hints: hints(
      'u05-reversal-e05',
      'הפרידו בין ההקשר שלפני המלבן לבין כיוון היציאה שעדיין לא נצפה.',
      'הטיה אינה אישור, ומלבן יכול להשתייך ליותר מתרחיש אחד.',
      'בחרו המתנה או חוסר ראיות עם הנימוק שכיוון המלבן טרם אושר.',
    ),
    sourceReferences: rectangleRefs,
    isAmbiguous: true,
    workflowStepIds: ['context', 'structure', 'level', 'setup', 'confirmation'],
    termIds: ['term.trend', 'term.breakout', 'term.confirmation'],
    role: 'ambiguous',
    category: 'decision',
    safetyNoteHe: 'המתנה היא תשובה מלאה כאשר טווח דו־כיווני טרם סיפק אישור.',
    processCriteriaHe: ['תיאור הטיית ההקשר', 'שמירת שני תרחישים', 'המתנה לכלל יציאה'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u05-continuation-e01',
    skillIds: ['patterns.continuation', 'breakouts.rules'],
    difficulty: 3,
    promptHe:
      'התאימו בין שלושת מבני המשולש המתוארים — סימטרי, עולה ויורד — לבין המשמעות הזהירה שלהם לפני פריצה.',
    interactionType: 'selection',
    options: [
      {
        id: 'symmetrical-converging',
        labelHe: 'סימטרי: שיאים יורדים ושפלים עולים; הכיוון לא הוכרע',
      },
      {
        id: 'ascending-bullish-bias',
        labelHe: 'עולה: התנגדות אופקית ושפלים עולים; הטיה שורית בלבד',
      },
      {
        id: 'descending-bearish-bias',
        labelHe: 'יורד: תמיכה אופקית ושיאים יורדים; הטיה דובית בלבד',
      },
      { id: 'bias-is-confirmation', labelHe: 'במשולש עולה או יורד ההטיה היא כבר אישור כניסה' },
    ],
    chartSpec: chart('u05-continuation-e01', 50601, 'continuation', {
      direction: 'up',
      regime: 'uptrend',
      pattern: 'symmetrical-triangle',
      variant: 'positive',
      eventIndex: 54,
    }),
    rubric: {
      kind: 'selection',
      expectedIds: ['symmetrical-converging', 'ascending-bullish-bias', 'descending-bearish-bias'],
      mode: 'exact',
      allowExtraSelections: false,
      misconceptionIds: ['misconception.bias-as-confirmation'],
    },
    explanationHe:
      'סוג המשולש נקבע לפי כיוון הגבולות. המבנה יכול ליצור הטיה סבירה, אך אף אחד משלושת הסוגים אינו מאשר כיוון לפני יציאה שעומדת בכלל שנקבע מראש.',
    alternativeExplanations: [
      {
        answerId: 'bias-is-confirmation',
        explanationHe:
          'שפלים עולים או שיאים יורדים מתארים לחץ יחסי בלבד. האישור מגיע באירוע נפרד של יציאה תקפה.',
        misconceptionId: 'misconception.bias-as-confirmation',
      },
      {
        feedbackCode: 'selection-mismatch',
        explanationHe:
          'סימטרי אינו מבטיח ניטרליות או המשך; הוא מתאר התכווצות שהכיוון שלה טרם הוכרע.',
        misconceptionId: 'misconception.pattern-without-context',
      },
    ],
    misconceptionIds: [
      'misconception.bias-as-confirmation',
      'misconception.pattern-without-context',
    ],
    hints: hints(
      'u05-continuation-e01',
      'בדקו בנפרד את כיוון קו השיאים ואת כיוון קו השפלים.',
      'אופקי למעלה ושפלים עולים שונה מאופקי למטה ושיאים יורדים.',
      'בחרו בשלוש התאמות המבנה והוציאו כל תשובה שמחליפה הטיה באישור.',
    ),
    sourceReferences: triangleClassificationRefs,
    workflowStepIds: ['context', 'structure', 'level', 'setup', 'confirmation'],
    termIds: ['term.trendline', 'term.breakout', 'term.confirmation'],
    role: 'positive',
    category: 'visual',
    safetyNoteHe: 'הטיית משולש אינה מבטיחה את כיוון הפריצה.',
    processCriteriaHe: ['זיהוי שני הגבולות', 'סיווג סוג המשולש', 'הפרדת הטיה מאישור'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u05-continuation-e02',
    skillIds: ['patterns.continuation', 'levels.lines', 'breakouts.rules'],
    difficulty: 3,
    promptHe:
      'במשולש הסינתטי יש שתי נגיעות ברורות בכל גבול. ניסיון היציאה מופיע אחרי 94% מהמרחק לקודקוד ובטווח צר מאוד. איזו הערכה משלבת נכון את הנגיעות ואת עיתוי היציאה?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'touches-valid-late-weak',
        labelHe:
          'הגבולות נתמכים בנגיעות, אך היציאה המאוחרת סמוך לקודקוד פחות שימושית ודורשת זהירות',
      },
      { id: 'one-touch-enough', labelHe: 'נגיעה אחת בכל צד מספיקה והעיתוי אינו משנה' },
      { id: 'late-is-stronger', labelHe: 'ככל שהיציאה קרובה יותר לקודקוד כך היא איכותית יותר' },
      { id: 'touches-guarantee', labelHe: 'ארבע הנגיעות מבטיחות המשך בכיוון המגמה' },
    ],
    chartSpec: chart('u05-continuation-e02', 50602, 'continuation', {
      direction: 'up',
      regime: 'uptrend',
      pattern: 'symmetrical-triangle',
      variant: 'near-miss',
      relativeVolume: 'falling',
      eventIndex: 67,
    }),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['touches-valid-late-weak'],
      misconceptionIds: [
        'misconception.bias-as-confirmation',
        'misconception.pattern-without-context',
      ],
    },
    explanationHe:
      'שתי נגיעות בכל גבול יוצרות בסיס סביר לציור, אבל יציאה אחרי 94% מהדרך לקודקוד מתרחשת כאשר מעט טווח נותר במבנה. זהו מסנן איכות שנקבע מראש, לא חוק טבע ולא הבטחה לכשל.',
    alternativeExplanations: [
      {
        answerId: 'one-touch-enough',
        explanationHe:
          'קו עם נגיעה יחידה אינו גבול מאומת, ולעיתוי יש משמעות כי הטווח מתכווץ לקראת הקודקוד.',
      },
      {
        answerId: 'late-is-stronger',
        explanationHe:
          'יציאה מאוחרת משאירה פחות טווח מובנה ולכן עשויה להיות פחות שימושית, לא חזקה יותר אוטומטית.',
      },
      {
        answerId: 'touches-guarantee',
        explanationHe: 'מספר נגיעות מחזק את שימושיות הגבולות אך אינו מאשר את כיוון היציאה.',
        misconceptionId: 'misconception.bias-as-confirmation',
      },
    ],
    misconceptionIds: [
      'misconception.bias-as-confirmation',
      'misconception.pattern-without-context',
    ],
    hints: hints(
      'u05-continuation-e02',
      'העריכו בנפרד את איכות הגבולות ואת מיקום היציאה ביחס לקודקוד.',
      'שתי נגיעות בכל צד מספיקות לציור סביר; השאלה היא כמה טווח נשאר.',
      'בחרו בתשובה שמקבלת את הגבולות אך מסייגת יציאה ב־94% מהדרך.',
    ),
    sourceReferences: triangleClassificationRefs,
    workflowStepIds: ['structure', 'level', 'setup', 'confirmation'],
    termIds: ['term.trendline', 'term.breakout', 'term.volatility'],
    role: 'near-miss',
    category: 'visual',
    safetyNoteHe: 'מיקום היציאה ביחס לקודקוד הוא מסנן עקבי אפשרי, לא אמת אוניברסלית.',
    processCriteriaHe: [
      'ספירת נגיעות תקפות',
      'הערכת מרחק לקודקוד',
      'ניסוח הסתייגות במקום פסילה מוחלטת',
    ],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u05-continuation-e03',
    skillIds: ['patterns.continuation', 'risk.r'],
    difficulty: 4,
    promptHe:
      'בסיס משולש הוא 8 נקודות. פריצה מתרחשת ב־111, עצירה מבנית ב־108 והתנגדות משמעותית ב־116. מהו היעד הגאומטרי, ומהו ה־R המעשי עד הרמה שבדרך?',
    interactionType: 'multiple-choice',
    options: [
      { id: 'target-119-r-1-67', labelHe: 'אומדן 119; עד 116 מתקבלים כ־1.67R' },
      { id: 'target-119-r-2-67', labelHe: 'אומדן 119; כולו 2.67R בלי להתחשב ב־116' },
      { id: 'target-116-r-2-67', labelHe: 'היעד הגאומטרי הוא 116 וה־R הוא 2.67' },
      { id: 'target-guaranteed-119', labelHe: '119 הוא יעד מובטח ולכן אין צורך בניהול ביניים' },
    ],
    chartSpec: chart('u05-continuation-e03', 50603, 'continuation', {
      direction: 'up',
      regime: 'uptrend',
      pattern: 'ascending-triangle',
      variant: 'positive',
      eventIndex: 52,
    }),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['target-119-r-1-67'],
      misconceptionIds: ['misconception.target-as-promise'],
    },
    explanationHe:
      'השלכת בסיס של 8 נקודות מ־111 נותנת אומדן 119. הסיכון ליחידה הוא 3 נקודות, אך ההתנגדות ב־116 נמצאת 5 נקודות מעל הכניסה, ולכן התכנון עד הרמה שבדרך הוא 5 ÷ 3, כלומר כ־1.67R.',
    alternativeExplanations: [
      {
        answerId: 'target-119-r-2-67',
        explanationHe:
          '2.67R מתאר את מלוא ההשלכה ל־119, אך מתעלם מההתנגדות המשמעותית ב־116 שהשאלה דורשת לשלב בניהול.',
        misconceptionId: 'misconception.target-as-promise',
      },
      {
        answerId: 'target-116-r-2-67',
        explanationHe: '116 היא רמה שבדרך, לא תוצאת השלכת גובה המשולש; וגם 5 חלקי 3 אינם 2.67.',
      },
      {
        answerId: 'target-guaranteed-119',
        explanationHe: 'יעד גאומטרי הוא אומדן מותנה. רמה קרובה קודמת בתכנון ליעד רחוק שאינו מובטח.',
        misconceptionId: 'misconception.target-as-promise',
      },
    ],
    misconceptionIds: ['misconception.target-as-promise'],
    hints: hints(
      'u05-continuation-e03',
      'חשבו בנפרד את ההשלכה הגאומטרית ואת הסיכון ליחידה.',
      'ההשלכה היא 111 + 8; הסיכון הוא 111 − 108.',
      'ל־R המעשי השתמשו ב־(116 − 111) ÷ 3, לא במלוא היעד הרחוק.',
    ),
    sourceReferences: triangleProjectionRefs,
    workflowStepIds: ['level', 'confirmation', 'invalidation', 'target', 'management'],
    termIds: ['term.breakout', 'term.measured-move', 'term.r', 'term.resistance'],
    role: 'transfer',
    category: 'calculation',
    safetyNoteHe: 'השלכה גאומטרית היא אומדן; רמה שבדרך עשויה להצדיק ניהול לפניה.',
    processCriteriaHe: ['חישוב גובה מהבסיס', 'חישוב הסיכון ליחידה', 'קדימות לרמה שבדרך'],
    isRiskOrPositionSize: true,
  }),
  reviewed({
    id: 'u05-continuation-e04',
    skillIds: ['patterns.continuation', 'levels.lines'],
    difficulty: 3,
    promptHe:
      'איזה סיווג מתאים לכל תיאור: (א) שני גבולות עולים ומקבילים; (ב) שני גבולות עולים ומתכנסים; (ג) שיאים עולים ושפלים יורדים; (ד) קווים שהותאמו בדיעבד להתרחבות ואז להתכווצות לא ברורה?',
    interactionType: 'sequence',
    options: [
      { id: 'ordinary-channel', labelHe: 'ערוץ עולה רגיל' },
      { id: 'rising-wedge', labelHe: 'טריז עולה' },
      { id: 'broadening', labelHe: 'תבנית מתרחבת' },
      { id: 'forced-diamond', labelHe: 'תווית יהלום כפויה — לדחות' },
    ],
    chartSpec: chart('u05-continuation-e04', 50604, 'lookalike', {
      baseScenario: 'continuation',
      direction: 'up',
      regime: 'uptrend',
      variant: 'lookalike',
      pattern: 'wedge',
      eventIndex: 53,
    }),
    rubric: {
      kind: 'sequence',
      expectedOrder: ['ordinary-channel', 'rising-wedge', 'broadening', 'forced-diamond'],
      misconceptionIds: ['misconception.pattern-without-context'],
    },
    explanationHe:
      'מקביליות מתארת ערוץ, התכנסות של שני גבולות עולים מתארת טריז עולה, והתרחבות בין שיאים גבוהים לשפלים נמוכים מתארת מבנה מתרחב. יהלום דורש מעבר ברור מהתרחבות להתכווצות; התאמת קווים בדיעבד אינה מספיקה.',
    alternativeExplanations: [
      {
        feedbackCode: 'sequence-order-mismatch',
        explanationHe:
          'ערוץ נשאר מקביל וטריז מתכנס. התרחבות לבדה אינה יהלום: נדרש אחריה גם שלב התכווצות ברור שניתן היה לזהות בזמן אמת.',
        misconceptionId: 'misconception.pattern-without-context',
      },
    ],
    misconceptionIds: ['misconception.pattern-without-context'],
    hints: hints(
      'u05-continuation-e04',
      'השוו תחילה בין מרחק הגבולות בתחילת המבנה ובסופו.',
      'מקביל, מתכנס ומתרחב הם שלושה יחסים שונים.',
      'סדרו: ערוץ, טריז, מבנה מתרחב, ואז דחיית היהלום הכפוי.',
    ),
    sourceReferences: wedgeRefs,
    isAmbiguous: true,
    workflowStepIds: ['context', 'structure', 'setup', 'confirmation', 'invalidation'],
    termIds: ['term.trendline', 'term.volatility', 'term.confirmation'],
    role: 'lookalike',
    category: 'visual',
    safetyNoteHe: 'תווית נדירה אינה מוסיפה ודאות; גבולות והקשר חשובים מהשם.',
    processCriteriaHe: ['בדיקת יחס בין הגבולות', 'הבחנת התכנסות מהתרחבות', 'דחיית התאמה בדיעבד'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u05-continuation-e05',
    skillIds: ['patterns.continuation', 'evidence.volume', 'risk.r'],
    difficulty: 4,
    promptHe:
      'לאחר מהלך חד של 12 נקודות נוצר תיקון צר של 3 נקודות במשך שישה נרות, עם מחזור מתכווץ. הפריצה פונה לתוך התנגדות קרובה לפני יעד התורן. מהו התכנון הסביר ביותר?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'credible-manage-stages',
        labelHe:
          'המבנה סביר כדגל/דגלון, אך מתכננים מימוש או הערכה מחדש בהתנגדות ורק יתרה ליעד התורן',
      },
      { id: 'full-target-guaranteed', labelHe: 'התורן מבטיח יעד מלא ולכן מתעלמים מההתנגדות' },
      { id: 'deep-long-correction', labelHe: 'כל תיקון עמוק וממושך הוא עדיין דגל איכותי' },
      { id: 'no-pole-needed', labelHe: 'אין צורך בתורן ברור כל עוד המחזור יורד' },
    ],
    chartSpec: chart('u05-continuation-e05', 50605, 'continuation', {
      direction: 'up',
      regime: 'uptrend',
      pattern: 'flag',
      variant: 'positive',
      relativeVolume: 'falling',
      eventIndex: 51,
    }),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['credible-manage-stages'],
      misconceptionIds: ['misconception.target-as-promise', 'misconception.volume-as-verdict'],
    },
    explanationHe:
      'תורן ברור, תיקון קצר ומתון ומחזור מתכווץ תומכים במועמד דגל או דגלון. יעד התורן נשאר אומדן; התנגדות קרובה מצדיקה ניהול בשלבים ולא התעלמות מרמה שנצפתה.',
    alternativeExplanations: [
      {
        answerId: 'full-target-guaranteed',
        explanationHe: 'מדידת התורן אינה גוברת על התנגדות קיימת ואינה מבטיחה שהמחיר יגיע ליעד.',
        misconceptionId: 'misconception.target-as-promise',
      },
      {
        answerId: 'deep-long-correction',
        explanationHe:
          'תיקון עמוק או ארוך מחליש את רעיון ההפסקה הקצרה ועשוי לתאר טווח או שינוי מבני.',
        misconceptionId: 'misconception.pattern-without-context',
      },
      {
        answerId: 'no-pole-needed',
        explanationHe: 'מחזור מתכווץ לבדו אינו יוצר דגל; מהלך חד קודם הוא תנאי מבני מרכזי.',
        misconceptionId: 'misconception.volume-as-verdict',
      },
    ],
    misconceptionIds: [
      'misconception.target-as-promise',
      'misconception.volume-as-verdict',
      'misconception.pattern-without-context',
    ],
    hints: hints(
      'u05-continuation-e05',
      'בדקו תורן, עומק, משך ומחזור לפני היעד.',
      'הנתונים תומכים במבנה, אבל יש התנגדות לפני ההשלכה המלאה.',
      'בחרו בתכנון שמנהל חלק ברמה הקרובה ומשאיר רק יתרה לאומדן התורן.',
    ),
    sourceReferences: flagRefs,
    workflowStepIds: [
      'context',
      'structure',
      'level',
      'setup',
      'confirmation',
      'invalidation',
      'target',
      'management',
    ],
    termIds: [
      'term.flag',
      'term.pennant',
      'term.relative-volume',
      'term.measured-move',
      'term.resistance',
    ],
    role: 'transfer',
    category: 'decision',
    safetyNoteHe: 'יעד תורן הוא אומדן מותנה; רמות ביניים ונקודת ביטול קודמות לו בתכנון.',
    processCriteriaHe: ['בדיקת תנאי המבנה', 'זיהוי התנגדות שבדרך', 'ניהול יעד בשלבים'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u06-breakouts-e01',
    skillIds: ['events.gaps'],
    difficulty: 3,
    promptHe:
      'התאימו את ארבעת תרחישי הפער להקשר שלהם: בתוך טווח ונסגר מהר; יציאה מבסיס ונשמר; באמצע מגמה חזקה; אחרי מהלך בוגר ונסגר במהירות.',
    interactionType: 'sequence',
    options: [
      { id: 'common-gap', labelHe: 'פער רגיל' },
      { id: 'breakaway-gap', labelHe: 'פער פריצה' },
      { id: 'continuation-gap', labelHe: 'פער המשך' },
      { id: 'exhaustion-gap', labelHe: 'פער מיצוי' },
    ],
    chartSpec: chart('u06-breakouts-e01', 60701, 'breakout', {
      direction: 'up',
      regime: 'range',
      gapKind: 'breakaway',
      gapSize: 0.055,
      relativeVolume: 'spike',
      eventIndex: 47,
    }),
    rubric: {
      kind: 'sequence',
      expectedOrder: ['common-gap', 'breakaway-gap', 'continuation-gap', 'exhaustion-gap'],
    },
    explanationHe:
      'פער רגיל נמצא לרוב בתוך טווח, פער פריצה יוצא ממבנה ונשמר, פער המשך מופיע באמצע מהלך, ופער מיצוי נבחן רק אחרי מהלך בוגר ותגובה מהירה נגדו. הסיווג נובע מהרצף ולא מצורת הפתיחה לבדה.',
    alternativeExplanations: [
      {
        feedbackCode: 'sequence-order-mismatch',
        explanationHe:
          'פער בתוך טווח שונה מפער שיוצא ממבנה ונשמר. פערי המשך ומיצוי עשויים להיראות דומים בפתיחה; המיקום במגמה וההמשך אחריהם מבדילים ביניהם.',
      },
    ],
    misconceptionIds: [],
    hints: hints(
      'u06-breakouts-e01',
      'מקמו כל פער בתוך הסדרה: טווח, תחילת מהלך, אמצע מהלך או סוף מהלך בוגר.',
      'בדקו גם מה קרה אחרי הפער, לא רק את גודלו.',
      'סדרו לפי התיאורים: רגיל, פריצה, המשך, מיצוי.',
    ),
    sourceReferences: gapClassificationRefs,
    workflowStepIds: ['context', 'structure', 'level', 'setup', 'confirmation'],
    termIds: ['term.gap', 'term.breakout', 'term.trend'],
    role: 'positive',
    category: 'visual',
    safetyNoteHe: 'סוג הפער אינו מבטיח מילוי או המשך; הוא מסווג לפי הקשר ותגובה.',
    processCriteriaHe: ['מיקום הפער בסדרה', 'בדיקת מבנה קודם', 'בדיקת תגובת המשך'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u06-breakouts-e02',
    skillIds: ['events.gaps', 'safe.ta-boundaries'],
    difficulty: 3,
    promptHe:
      'נכס סינתטי נמצא במגמה עולה בוגרת ופותח בפער גדול עם מחזור חריג. עדיין לא נחשף אף נר אחרי הפתיחה. האם זה פער המשך או פער מיצוי?',
    interactionType: 'decision',
    options: [
      { id: 'wait-for-follow-through', labelHe: 'להמתין לתגובת המחיר לאחר הפער' },
      { id: 'insufficient-post-gap-data', labelHe: 'אין מספיק ראיות לסיווג כעת' },
      { id: 'continuation-large-gap', labelHe: 'זהו פער המשך בגלל גודל הפער' },
      { id: 'exhaustion-high-volume', labelHe: 'זהו פער מיצוי בגלל המחזור החריג' },
    ],
    chartSpec: chart(
      'u06-breakouts-e02',
      60702,
      'ambiguous',
      {
        baseScenario: 'uptrend',
        direction: 'up',
        regime: 'uptrend',
        variant: 'ambiguous',
        gapKind: 'exhaustion',
        gapSize: 0.06,
        relativeVolume: 'spike',
        eventIndex: 60,
      },
      60,
    ),
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['insufficient-evidence', 'wait'],
      requiredReasonIds: ['needs-post-gap-follow-through'],
      misconceptionIds: ['misconception.future-information-leak', 'misconception.forced-trade'],
    },
    explanationHe:
      'בפתיחה לבדה אי אפשר להבדיל באופן אמין בין המשך למיצוי. שניהם יכולים להופיע עם פער גדול ומחזור גבוה; נדרשים מיקום מדויק במגמה ותגובה לאחר הפער, שעדיין אינם זמינים.',
    alternativeExplanations: [
      {
        answerId: 'continuation-large-gap',
        explanationHe: 'גודל הפער אינו קובע המשך. בלי נרות תגובה אין ראיה לשמירה על המהלך.',
      },
      {
        answerId: 'exhaustion-high-volume',
        explanationHe:
          'מחזור חריג ומהלך בוגר מעלים אפשרות מיצוי אך אינם מאשרים אותה לפני תגובת המחיר.',
        misconceptionId: 'misconception.future-information-leak',
      },
    ],
    misconceptionIds: ['misconception.future-information-leak', 'misconception.forced-trade'],
    hints: hints(
      'u06-breakouts-e02',
      'שאלו איזה מידע משותף לשני סוגי הפער ואיזה מידע עדיין חסר.',
      'מחזור גבוה יכול להופיע גם בהמשך וגם במיצוי.',
      'בחרו המתנה או חוסר ראיות וציינו שנדרשת תגובת המחיר לאחר הפער.',
    ),
    sourceReferences: gapAmbiguityRefs,
    isAmbiguous: true,
    workflowStepIds: ['context', 'setup', 'confirmation', 'management'],
    termIds: ['term.gap', 'term.relative-volume', 'term.confirmation'],
    role: 'ambiguous',
    category: 'decision',
    safetyNoteHe: 'אי־ודאות בזמן אמת היא חלק מהסיווג; אין להמציא את נרות ההמשך.',
    processCriteriaHe: ['שימוש במידע עד נר ההחלטה', 'זיהוי הנתון החסר', 'בחירת המתנה מפורשת'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u06-breakouts-e03',
    skillIds: ['breakouts.rules', 'evidence.volume'],
    difficulty: 4,
    promptHe:
      'לפני חשיפת הנר הבא, הגדירו כלל פריצה מעל התנגדות 100. בחרו את כל רכיבי הכלל העקבי: סגירה, מרחק מותאם ATR, מחזור יחסי וזמן.',
    interactionType: 'selection',
    options: [
      { id: 'close-above-100', labelHe: 'סגירה יומית מעל 100' },
      { id: 'distance-0-5-atr', labelHe: 'הסגירה לפחות 0.5 ATR מעל האזור' },
      { id: 'rvol-at-least-1-3', labelHe: 'מחזור יחסי לפחות פי 1.3 מול בסיס 20 יום' },
      { id: 'hold-two-closes', labelHe: 'או שתי סגירות רצופות מעל האזור לפי הכלל החלופי שנרשם' },
      { id: 'change-after-result', labelHe: 'לשנות את הסף אחרי שנראה אם המהלך הצליח' },
    ],
    chartSpec: chart(
      'u06-breakouts-e03',
      60703,
      'breakout',
      {
        direction: 'up',
        regime: 'range',
        variant: 'near-miss',
        relativeVolume: 'rising',
        eventIndex: 50,
      },
      49,
    ),
    rubric: {
      kind: 'selection',
      expectedIds: ['close-above-100', 'distance-0-5-atr', 'rvol-at-least-1-3', 'hold-two-closes'],
      mode: 'exact',
      allowExtraSelections: false,
      misconceptionIds: [
        'misconception.future-information-leak',
        'misconception.volume-as-verdict',
      ],
    },
    explanationHe:
      'הכלל קובע מראש רמה, סוג סגירה, סף מותאם תנודתיות, בסיס מחזור וחלופת זמן. אלה מסנני סיווג עקביים, לא מבחן אובייקטיבי לכך שהפריצה “אמיתית”; אין לשנותם לפי התוצאה.',
    alternativeExplanations: [
      {
        answerId: 'change-after-result',
        explanationHe:
          'שינוי הסף אחרי ראיית ההמשך הוא זליגת מידע עתידי. יש לתעד חריגה ולבחון כלל חדש במדגם אחר.',
        misconceptionId: 'misconception.future-information-leak',
      },
      {
        feedbackCode: 'selection-mismatch',
        explanationHe: 'סף מחזור יכול להיות רכיב בכלל, אך אינו מחליף את תנאי המחיר והזמן.',
        misconceptionId: 'misconception.volume-as-verdict',
      },
    ],
    misconceptionIds: ['misconception.future-information-leak', 'misconception.volume-as-verdict'],
    hints: hints(
      'u06-breakouts-e03',
      'כתבו כלל שאפשר להחיל בלי לדעת מה יקרה בנר הבא.',
      'שלבו רמת מחיר, תנודתיות, בסיס מחזור וממד זמן.',
      'בחרו בארבעת הרכיבים הקבועים מראש והשאירו בחוץ שינוי לפי התוצאה.',
    ),
    sourceReferences: breakoutRefs,
    workflowStepIds: ['level', 'setup', 'confirmation', 'invalidation', 'management'],
    termIds: ['term.breakout', 'term.atr', 'term.relative-volume', 'term.confirmation'],
    role: 'transfer',
    category: 'explanation',
    safetyNoteHe: 'סף פריצה הוא כלל סיווג לבדיקת עקביות, לא הבטחה להמשך.',
    processCriteriaHe: ['הגדרת הרמה מראש', 'התאמה לתנודתיות ולמחזור', 'מניעת שינוי בדיעבד'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u06-breakouts-e04',
    chartPresentation: 'answer-evidence',
    skillIds: ['breakouts.rules', 'breakouts.failure', 'risk.invalidation-execution'],
    difficulty: 4,
    promptHe:
      'חשפו את הנרות בהדרגה ועקבו אחר ניסיון הפריצה. בחלון האחרון בחרו את התיאור שמתאים למה שנראה בגרף ושומר על כלל כשל שנקבע מראש.',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'tradeoffs-and-failure-rule',
        labelHe:
          'הפריצה התקדמה תחילה, אך החזרה העמוקה והסגירה מחדש בתוך הטווח מפעילות את כלל הכשל שנקבע מראש.',
      },
      { id: 'retest-always-best', labelHe: 'בדיקה חוזרת תמיד עדיפה ותמיד מתרחשת' },
      { id: 'close-guarantees', labelHe: 'כניסה בסגירה מבטיחה שהמחיר לא יחזור לטווח' },
      { id: 'any-return-failure', labelHe: 'כל מגע באזור הפריצה הוא כשל מיידי' },
    ],
    chartSpec: chart(
      'u06-breakouts-e04',
      60704,
      'false-breakout',
      {
        direction: 'up',
        regime: 'range',
        relativeVolume: 'spike',
        eventIndex: 46,
      },
      56,
    ),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['tradeoffs-and-failure-rule'],
      misconceptionIds: [
        'misconception.confirmation-as-entry',
        'misconception.bias-as-confirmation',
      ],
    },
    explanationHe:
      'לכל תזמון מחיר וסיכון שונים. בדיקה חוזרת שמכבדת את אזור הפריצה יכולה להיות תקינה; הכשל הראשון אינו עצם החזרה אלא הסגירה הראשונה שעומדת בכלל הכשל — חזרה עמוקה ושבירת מבנה קצר.',
    alternativeExplanations: [
      {
        answerId: 'retest-always-best',
        explanationHe:
          'בדיקה חוזרת עשויה לשפר יחס סיכון אך אינה מובטחת, ולעיתים המהלך ממשיך בלעדיה.',
      },
      {
        answerId: 'close-guarantees',
        explanationHe: 'סגירה מפחיתה תגובה לפתיל אך אינה מבטיחה שהפריצה תחזיק.',
        misconceptionId: 'misconception.confirmation-as-entry',
      },
      {
        answerId: 'any-return-failure',
        explanationHe:
          'מגע או חזרה רדודה יכולים להיות בדיקה תקינה. הכשל מוגדר בעומק, בסגירה ובשינוי המבנה.',
        misconceptionId: 'misconception.bias-as-confirmation',
      },
    ],
    misconceptionIds: ['misconception.confirmation-as-entry', 'misconception.bias-as-confirmation'],
    hints: hints(
      'u06-breakouts-e04',
      'השוו מחיר מוקדם, סינון פתילים והאפשרות שהמחיר לא יחזור.',
      'הפרידו בין בדיקה של האזור לבין סגירה שמבטלת את המבנה הקצר.',
      'בחרו בתשובה שמציגה פשרה לכל כניסה וכלל כשל שנקבע מראש.',
    ),
    sourceReferences: breakoutRefs,
    workflowStepIds: ['level', 'confirmation', 'entry', 'invalidation', 'management'],
    termIds: [
      'term.breakout',
      'term.retest',
      'term.false-breakout',
      'term.entry-trigger',
      'term.invalidation',
    ],
    role: 'near-miss',
    category: 'decision',
    safetyNoteHe: 'אישור וכניסה הם החלטות נפרדות, וחזרה לאזור אינה כשל אוטומטי.',
    processCriteriaHe: ['השוואת שלוש דרכי כניסה', 'הגדרת כשל מראש', 'הבחנת בדיקה חוזרת מכשל'],
    isRiskOrPositionSize: false,
  }),
  reviewed({
    id: 'u06-breakouts-e05',
    skillIds: [
      'breakouts.rules',
      'breakouts.failure',
      'risk.invalidation-execution',
      'risk.r',
      'risk.position-size',
    ],
    difficulty: 4,
    promptHe:
      'סיכון החשבון הוא 350. בכניסת פריצה: כניסה 108, עצירה 104 ועלות צפויה 0.5 ליחידה. בכניסת בדיקה חוזרת: כניסה 106, עצירה 103 ועלות 0.5. מהן הכמויות המרביות השלמות, ומה מסווג כשל אם בהמשך יש סגירה עמוקה מתחת לאזור?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'sizes-77-100-failure',
        labelHe: '77 יחידות בפריצה, 100 בבדיקה החוזרת; הסגירה העמוקה היא כשל לפי הכלל',
      },
      { id: 'sizes-87-116', labelHe: '87 ו־116 יחידות, כי מתעלמים מהעלויות' },
      { id: 'same-size-normal-retest', labelHe: 'אותה כמות בשתי הכניסות; כל חזרה היא בדיקה תקינה' },
      { id: 'increase-after-failure', labelHe: 'מגדילים כמות אחרי הכשל כדי לשמור על היעד' },
    ],
    chartSpec: chart('u06-breakouts-e05', 60705, 'false-breakout', {
      direction: 'up',
      regime: 'range',
      relativeVolume: 'steady',
      eventIndex: 47,
    }),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['sizes-77-100-failure'],
      misconceptionIds: [
        'misconception.costs-omitted',
        'misconception.position-size-before-risk',
        'misconception.forced-trade',
      ],
    },
    explanationHe:
      'בפריצה הסיכון ליחידה הוא 4.5 ולכן 350 ÷ 4.5 מאפשר 77 יחידות שלמות. בבדיקה החוזרת הסיכון הוא 3.5 ולכן הכמות היא 100. סגירה עמוקה מתחת לאזור שעומדת בכלל הכשל מבטלת את התרחיש; אין להגדיל סיכון אחריה.',
    alternativeExplanations: [
      {
        answerId: 'sizes-87-116',
        explanationHe:
          'הכמויות מתקבלות רק מהשמטת 0.5 עלות צפויה ליחידה. העלות שייכת לסיכון לפני חלוקת סיכון החשבון.',
        misconceptionId: 'misconception.costs-omitted',
      },
      {
        answerId: 'same-size-normal-retest',
        explanationHe:
          'מרחקי הסיכון שונים ולכן גם הכמויות שונות. חזרה עמוקה לפי כלל כשל אינה בדיקה תקינה.',
        misconceptionId: 'misconception.position-size-before-risk',
      },
      {
        answerId: 'increase-after-failure',
        explanationHe:
          'אחרי ביטול התרחיש אין הצדקה להגדיל סיכון. הפעולה התקינה היא לפעול לפי תכנית הכשל.',
        misconceptionId: 'misconception.forced-trade',
      },
    ],
    misconceptionIds: [
      'misconception.costs-omitted',
      'misconception.position-size-before-risk',
      'misconception.forced-trade',
    ],
    hints: hints(
      'u06-breakouts-e05',
      'חשבו סיכון ליחידה בכל דרך כניסה לפני הכמות.',
      'הוסיפו 0.5 למרחק כניסה–עצירה ועגלו את הכמות כלפי מטה.',
      'חשבו 350 ÷ 4.5 ו־350 ÷ 3.5; סגירה עמוקה לפי הכלל היא כשל, לא בדיקה רגילה.',
    ),
    sourceReferences: breakoutGapRiskRefs,
    workflowStepIds: [
      'level',
      'confirmation',
      'entry',
      'invalidation',
      'position-size',
      'management',
    ],
    termIds: [
      'term.breakout',
      'term.retest',
      'term.false-breakout',
      'term.slippage',
      'term.position-size',
    ],
    role: 'transfer',
    category: 'calculation',
    safetyNoteHe: 'עצירה אינה מבטיחה מחיר מילוי; פער או החלקה עלולים להגדיל את ההפסד בפועל.',
    processCriteriaHe: [
      'חישוב סיכון ליחידה כולל עלויות',
      'עיגול הכמות כלפי מטה',
      'יישום כלל הכשל בלי להגדיל סיכון',
    ],
    isRiskOrPositionSize: true,
  }),
];
