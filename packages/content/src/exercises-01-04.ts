import { generateChart } from '@chartpath/chart-engine';
import type { ChartScenario, ChartSpec, JsonValue } from '@chartpath/domain';

import { sourceRefs } from './source.js';
import type { ContentExercise } from './types.js';
import { CONTENT_SCHEMA_VERSION, CONTENT_VERSION_ID } from './version.js';

const GENERATOR_VERSION = '1.0.0';

function source(
  pageStart: number,
  pageEnd: number,
  printedPages: string,
  section: string,
): ReturnType<typeof sourceRefs> {
  const normalized = printedPages.replace(/^pp?\.\s*/, '');
  const [bookPageStart = normalized, bookPageEnd = bookPageStart] = normalized.split('–');
  const parsePage = (value: string): number | string => {
    const numeric = Number(value);
    return Number.isInteger(numeric) ? numeric : value;
  };
  return sourceRefs(pageStart, pageEnd, parsePage(bookPageStart), parsePage(bookPageEnd), section);
}

function chart(
  exerciseId: string,
  seed: number,
  scenario: ChartScenario,
  overrides: Partial<
    Pick<
      ChartSpec,
      | 'candleCount'
      | 'timeframe'
      | 'basePrice'
      | 'baseVolume'
      | 'volatility'
      | 'noise'
      | 'decisionCandleIndex'
    >
  > = {},
  parameters?: Readonly<Record<string, JsonValue>>,
): ChartSpec {
  return {
    id: `chart-${exerciseId}`,
    seed,
    generatorVersion: GENERATOR_VERSION,
    candleCount: overrides.candleCount ?? 72,
    timeframe: overrides.timeframe ?? '1d',
    scenario,
    basePrice: overrides.basePrice ?? 100,
    baseVolume: overrides.baseVolume ?? 1_000_000,
    volatility: overrides.volatility ?? 0.018,
    noise: overrides.noise ?? 0.35,
    decisionCandleIndex: overrides.decisionCandleIndex ?? 71,
    ...(parameters === undefined ? {} : { parameters }),
  };
}

function hints(exerciseId: string, texts: readonly [string, string, string]) {
  return texts.map((textHe, index) => ({
    id: `${exerciseId}-hint-${index + 1}`,
    level: index + 1,
    textHe,
  }));
}

const common = {
  editorialStatus: 'reviewed' as const,
  schemaVersion: CONTENT_SCHEMA_VERSION,
  contentVersionId: CONTENT_VERSION_ID,
  isRiskOrPositionSize: false,
};

const candleLabelChartSpec = chart('u01-chart-data-e01', 10101, 'range', {
  candleCount: 40,
  decisionCandleIndex: 39,
});
const candleLabelChart = generateChart(candleLabelChartSpec);
const candleLabelCandidates = candleLabelChart.candles.slice(
  Math.floor(candleLabelChart.candles.length * 0.25),
);
const labeledBullishCandle = candleLabelCandidates.find((candle) => candle.close > candle.open);
const labeledBearishCandle = candleLabelCandidates.find((candle) => candle.close < candle.open);
if (!labeledBullishCandle || !labeledBearishCandle) {
  throw new Error(
    'The authored candle-label chart must contain one rising and one falling candle.',
  );
}

/**
 * Reviewed beta exercises for lessons 1–4 in canonical curriculum order.
 * All charts are synthetic and every grading boundary is deterministic.
 */
export const exercises01To04: readonly ContentExercise[] = [
  {
    ...common,
    id: 'u00-scenarios-e01',
    skillIds: ['safe.ta-boundaries'],
    difficulty: 1,
    promptHe: 'איזה משפט מתאר נכון מה ניתוח טכני יכול לעשות — ומה אינו יכול להבטיח?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'conditional-description',
        labelHe: 'לתאר מבנה ותרחיש מותנה, בלי להבטיח כיוון או תוצאה.',
      },
      { id: 'guaranteed-direction', labelHe: 'לחזות בוודאות את כיוון המחיר הבא.' },
      { id: 'intrinsic-value', labelHe: 'לקבוע לבדו את השווי הכלכלי המדויק של הנכס.' },
      { id: 'standalone-signal', labelHe: 'להפוך כל צורה בגרף לאות פעולה עצמאי.' },
    ],
    chartSpec: chart('u00-scenarios-e01', 10001, 'range'),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['conditional-description'],
      misconceptionIds: ['misconception.pattern-without-context'],
    },
    explanationHe:
      'ניתוח טכני מארגן תצפיות על מחיר, מחזור וזמן לתרחישים שניתנים לאישור או לביטול. הוא אינו מסביר בהכרח שווי כלכלי ואינו מבטיח מה יקרה.',
    alternativeExplanations: [
      {
        answerId: 'guaranteed-direction',
        explanationHe: 'כיוון אפשרי הוא תרחיש הסתברותי, לא ידיעה ודאית.',
        misconceptionId: 'misconception.forced-trade',
      },
      {
        answerId: 'intrinsic-value',
        explanationHe: 'שאלת השווי שייכת בעיקר לניתוח פונדמנטלי; הגרף מתאר התנהגות סביב מחיר.',
      },
      {
        answerId: 'standalone-signal',
        explanationHe: 'צורה ללא הקשר, תנאי אישור ונקודת ביטול אינה בסיס שלם להחלטה.',
        misconceptionId: 'misconception.pattern-without-context',
      },
    ],
    misconceptionIds: ['misconception.pattern-without-context', 'misconception.forced-trade'],
    hints: hints('u00-scenarios-e01', [
      'חפשו ניסוח שמאפשר גם לטעות.',
      'הפרידו בין תיאור התנהגות המחיר לבין הערכת שווי.',
      'התשובה הנכונה כוללת תרחיש מותנה, לא הבטחה.',
    ]),
    sourceReferences: source(
      16,
      16,
      'p. 3',
      'Ch. 1 — definition, uses, and limits of technical analysis',
    ),
    workflowStepIds: ['context', 'review'],
    termIds: ['term.trend'],
    role: 'positive',
    category: 'explanation',
    safetyNoteHe: 'זהו תרגול תיאורי על נתונים סינתטיים, לא תחזית ולא המלצה לפעולה.',
    processCriteriaHe: [
      'מבחין בין תיאור שוק לבין נבואה.',
      'אינו מייחס לתבנית כוח עצמאי מחוץ להקשר.',
    ],
  },
  {
    ...common,
    id: 'u00-scenarios-e02',
    skillIds: ['safe.ta-boundaries'],
    difficulty: 1,
    promptHe: 'בחרו רק משפטים שהם תצפיות ישירות על מחיר, מחזור או זמן — לא פרשנויות.',
    interactionType: 'selection',
    options: [
      { id: 'observed-close', labelHe: 'הנר האחרון נסגר ב־102.4.' },
      { id: 'observed-volume', labelHe: 'מחזור הנר היה 1.3 מיליון יחידות.' },
      { id: 'observed-time', labelHe: 'הטווח נמשך 18 נרות יומיים.' },
      { id: 'interpreted-demand', labelHe: 'הקונים בוודאות יחזרו ברמה הזאת.' },
      { id: 'interpreted-breakout', labelHe: 'התבנית מבטיחה פריצה כלפי מעלה.' },
    ],
    chartSpec: chart('u00-scenarios-e02', 10002, 'range', { basePrice: 102.4 }),
    rubric: {
      kind: 'selection',
      expectedIds: ['observed-close', 'observed-volume', 'observed-time'],
      mode: 'exact',
      allowExtraSelections: false,
      misconceptionIds: ['misconception.pattern-without-context'],
    },
    explanationHe:
      'מחיר סגירה, מחזור ומשך הם נתונים שניתנים לבדיקה. אמירות על כוונת קונים או על פריצה עתידית הן פרשנות שדורשת תנאי וראיות.',
    alternativeExplanations: [
      {
        answerId: 'interpreted-demand',
        explanationHe: 'הגרף אינו חושף כוונה ודאית של המשתתפים; זו השערה, לא תצפית.',
      },
      {
        answerId: 'interpreted-breakout',
        explanationHe: 'משך וצורה יכולים לתמוך בתרחיש, אך אינם מבטיחים את הנר הבא.',
        misconceptionId: 'misconception.pattern-without-context',
      },
    ],
    misconceptionIds: ['misconception.pattern-without-context'],
    hints: hints('u00-scenarios-e02', [
      'שאלו אם אפשר לקרוא את המשפט ישירות מן הנתונים.',
      'מספר שנמדד הוא תצפית; כוונה המיוחסת לשחקנים היא פירוש.',
      'בחרו את שלושת המשפטים עם מחיר, מחזור ומשך בלבד.',
    ]),
    sourceReferences: source(
      16,
      17,
      'pp. 3–4',
      'Ch. 1 — price, volume, time, and scenario language',
    ),
    workflowStepIds: ['context'],
    termIds: ['term.relative-volume'],
    role: 'positive',
    category: 'explanation',
    safetyNoteHe: 'תצפית נקייה אינה מספיקה לבדה להחלטת מסחר; היא רק חומר הגלם לניתוח.',
    processCriteriaHe: [
      'מזהה עובדות שנמדדו בזמן ההחלטה.',
      'מפריד עובדות מהשערות על עתיד או כוונות.',
    ],
  },
  {
    ...common,
    id: 'u00-scenarios-e03',
    skillIds: ['safe.ta-boundaries'],
    difficulty: 2,
    promptHe: 'החליפו את המשפט “המדד יעלה” בניסוח שמציג תרחיש חיובי, חלופה שלילית ונקודת ביטול.',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'two-sided-conditional',
        labelHe:
          'כל עוד נשמר אזור 98–100 ונוצר שפל גבוה, התרחיש החיובי נשאר אפשרי; סגירה מתחת ל־98 מבטלת אותו ומחזירה לבחינת תרחיש יורד.',
      },
      {
        id: 'absolute-up',
        labelHe: 'המדד חזק ולכן הוא יגיע ל־115.',
      },
      {
        id: 'condition-without-invalidation',
        labelHe: 'אם המחיר יעלה, התרחיש החיובי יאושר.',
      },
      {
        id: 'moving-invalidation',
        labelHe: 'התרחיש חיובי; אם 98 יישבר, נזיז את נקודת הביטול ל־95.',
      },
    ],
    chartSpec: chart(
      'u00-scenarios-e03',
      10003,
      'uptrend',
      { noise: 0.25 },
      { reaction: 'support' },
    ),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['two-sided-conditional'],
      misconceptionIds: ['misconception.forced-trade'],
    },
    explanationHe:
      'ניסוח שימושי קובע מראש מה ישמור על התרחיש, מה יבטל אותו ומה ייבחן אם הראיות ישתנו. כך אפשר לטעות באופן מוגדר בלי לשכתב את הכלל בדיעבד.',
    alternativeExplanations: [
      {
        answerId: 'absolute-up',
        explanationHe: 'חוזק נצפה אינו הופך יעד להבטחה.',
        misconceptionId: 'misconception.target-as-promise',
      },
      {
        answerId: 'condition-without-invalidation',
        explanationHe: '“אם יעלה” הוא ניסוח מעגלי ואינו מגדיר ראיה או כשל.',
      },
      {
        answerId: 'moving-invalidation',
        explanationHe: 'הזזת נקודת הביטול לאחר שנשברה מגינה על הדעה, לא על תהליך הבדיקה.',
        misconceptionId: 'misconception.future-information-leak',
      },
    ],
    misconceptionIds: [
      'misconception.forced-trade',
      'misconception.target-as-promise',
      'misconception.future-information-leak',
    ],
    hints: hints('u00-scenarios-e03', [
      'חפשו שלושה רכיבים: תנאי, חלופה וביטול.',
      'נקודת הביטול צריכה להיקבע לפני שהמחיר מגיע אליה.',
      'רק אפשרות אחת מגדירה גם שמירה מעל אזור וגם סגירה שמבטלת.',
    ]),
    sourceReferences: source(17, 18, 'pp. 4–5', 'Ch. 1 — scenario instead of forecast; checklist'),
    workflowStepIds: ['context', 'setup', 'invalidation'],
    termIds: ['term.invalidation'],
    role: 'transfer',
    category: 'explanation',
    safetyNoteHe: 'גם תרחיש מנוסח היטב עלול להיכשל; נקודת ביטול אינה מבטיחה מחיר ביצוע.',
    processCriteriaHe: ['מנסח תנאי חיובי ושלילי ללא ודאות.', 'מקבע נקודת ביטול לפני התוצאה.'],
  },
  {
    ...common,
    id: 'u00-scenarios-e04',
    skillIds: ['safe.ta-boundaries'],
    difficulty: 2,
    promptHe:
      'בחלון ההחלטה סומנו קווים רק לאחר שהמהלך כבר הושלם, ואין כלל תבנית שנכתב מראש. מהי ההחלטה המשמעתית?',
    interactionType: 'decision',
    options: [
      { id: 'trade', labelHe: 'לפעול לפי הצורה שנראית כעת.' },
      { id: 'wait', labelHe: 'להמתין לנר נוסף בתקווה שהצורה תתחזק.' },
      { id: 'reject', labelHe: 'לדחות לצמיתות כל שימוש בתבניות.' },
      {
        id: 'insufficient-evidence',
        labelHe: 'אין מספיק ראיות להעריך את הטענה בחלון ההחלטה.',
      },
      { id: 'future-only-clarity', labelHe: 'הבהירות נוצרה רק לאחר חשיפת התוצאה.' },
      { id: 'rule-not-precommitted', labelHe: 'לא הוגדר כלל זיהוי ואישור מראש.' },
    ],
    chartSpec: chart(
      'u00-scenarios-e04',
      10004,
      'ambiguous',
      { decisionCandleIndex: 45 },
      { baseScenario: 'reversal', eventIndex: 45, pattern: 'double-bottom' },
    ),
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['insufficient-evidence'],
      requiredReasonIds: ['future-only-clarity', 'rule-not-precommitted'],
      misconceptionIds: ['misconception.future-information-leak', 'misconception.outcome-bias'],
    },
    explanationHe:
      'כאשר הצורה מתבררת רק בדיעבד והכלל לא הוגדר מראש, אין בסיס הוגן להערכתה בזמן ההחלטה. הבחירה הנכונה היא “אין מספיק ראיות”, לא השלמת קווים לפי התוצאה.',
    alternativeExplanations: [
      {
        answerId: 'trade',
        explanationHe: 'פעולה על קווים שנבנו לאחר התוצאה מערבבת ראיית דפוסים והטיית בדיעבד.',
        misconceptionId: 'misconception.future-information-leak',
      },
      {
        answerId: 'wait',
        explanationHe: 'נר נוסף אינו מתקן את היעדרו של כלל שנקבע מראש לניתוח הנוכחי.',
        misconceptionId: 'misconception.outcome-bias',
      },
      {
        answerId: 'reject',
        explanationHe: 'הבעיה היא איכות הראיות במקרה הזה, לא פסילה גורפת של כל כלי גרפי.',
      },
    ],
    misconceptionIds: [
      'misconception.future-information-leak',
      'misconception.outcome-bias',
      'misconception.pattern-without-context',
    ],
    hints: hints('u00-scenarios-e04', [
      'בדקו אילו פרטים היו זמינים בזמן ההחלטה.',
      'קו שנוסף אחרי המהלך משתמש במידע עתידי.',
      'ללא כלל מוקדם וללא ראיה בזמן אמת, בחרו “אין מספיק ראיות”.',
    ]),
    sourceReferences: source(
      18,
      18,
      'p. 5',
      'Ch. 1 — hindsight, confirmation bias, and pattern projection',
    ),
    isAmbiguous: true,
    workflowStepIds: ['context', 'review'],
    termIds: ['term.confirmation-bias'],
    role: 'ambiguous',
    category: 'decision',
    safetyNoteHe: 'הימנעות מהחלטה כשאין ראיות היא תוצאה תקפה; אין צורך לכפות פעולה.',
    processCriteriaHe: [
      'משתמש רק במידע שהיה גלוי בחלון ההחלטה.',
      'מזהה היעדר כלל מוקדם כסיבה מספקת לאי־ודאות.',
    ],
  },
  {
    ...common,
    id: 'u00-scenarios-e05',
    skillIds: ['safe.ta-boundaries'],
    difficulty: 2,
    promptHe: 'עברו על פתק הלמידה ובחרו את כל המשפטים שמתאימים לתחקור אחראי.',
    interactionType: 'selection',
    options: [
      { id: 'education-framing', labelHe: 'המקרה מיועד לתרגול תהליך, לא כהמלצה.' },
      { id: 'risk-disclosure', labelHe: 'קיימת אפשרות להפסד ולביצוע שונה מהמתוכנן.' },
      { id: 'precommitted-process', labelHe: 'התנאי ונקודת הביטול נכתבו לפני חשיפת התוצאה.' },
      { id: 'separate-outcome', labelHe: 'איכות התהליך נבדקה בנפרד מתוצאת המחיר.' },
      { id: 'profit-promise', labelHe: 'הצלחה בדוגמה מוכיחה שהשיטה תייצר רווח.' },
      {
        id: 'retrofit-after-outcome',
        labelHe: 'אחרי הפסד הוזזה נקודת הביטול כדי שהרעיון יישאר נכון.',
      },
    ],
    chartSpec: chart('u00-scenarios-e05', 10005, 'lookalike', {}, { baseScenario: 'reversal' }),
    rubric: {
      kind: 'selection',
      expectedIds: [
        'education-framing',
        'risk-disclosure',
        'precommitted-process',
        'separate-outcome',
      ],
      mode: 'exact',
      allowExtraSelections: false,
      misconceptionIds: ['misconception.outcome-bias'],
    },
    explanationHe:
      'פתק למידה טוב מציג את מטרת התרגול, את הסיכון, את הכללים שנקבעו מראש ואת איכות התהליך. תוצאה אחת אינה הוכחת שיטה ואינה רשות לשנות כללים בדיעבד.',
    alternativeExplanations: [
      {
        answerId: 'profit-promise',
        explanationHe: 'דוגמה מוצלחת אחת אינה ראיה סטטיסטית ואינה הבטחת רווח.',
        misconceptionId: 'misconception.outcome-bias',
      },
      {
        answerId: 'retrofit-after-outcome',
        explanationHe: 'שינוי נקודת הביטול אחרי התוצאה מונע תחקור הוגן של הכלל המקורי.',
        misconceptionId: 'misconception.future-information-leak',
      },
    ],
    misconceptionIds: ['misconception.outcome-bias', 'misconception.future-information-leak'],
    hints: hints('u00-scenarios-e05', [
      'הפרידו בין איכות ההחלטה לבין מה שהמחיר עשה אחר כך.',
      'חפשו גילוי סיכון וכללים שנכתבו מראש.',
      'בחרו ארבעה סעיפים: מסגור לימודי, סיכון, קדם־התחייבות ותחקור תהליך.',
    ]),
    sourceReferences: [
      ...source(3, 3, 'p. i', 'Front matter — educational and financial-risk disclosure'),
      ...source(18, 18, 'p. 5', 'Ch. 1 — common mistakes and analysis checklist'),
    ],
    workflowStepIds: ['context', 'review'],
    termIds: ['term.invalidation'],
    role: 'transfer',
    category: 'journal-review',
    safetyNoteHe: 'התחקור מודד תהליך לימודי; הוא אינו מבטיח תשואה ואינו מחליף ייעוץ מוסמך.',
    processCriteriaHe: [
      'שומר מסגור לימודי וגילוי סיכון.',
      'מעריך קדם־התחייבות ותהליך בנפרד מתוצאה.',
    ],
  },
  {
    ...common,
    id: 'u01-chart-data-e01',
    skillIds: ['data.ohlcv'],
    difficulty: 1,
    promptHe: 'מקמו על הנר העולה והנר היורד את תוויות הפתיחה, השיא, השפל והסגירה במקום המתאים.',
    interactionType: 'selection',
    options: [
      { id: 'high-top', labelHe: 'שיא — נר עולה' },
      { id: 'low-bottom', labelHe: 'שפל — נר עולה' },
      { id: 'bull-open-lower', labelHe: 'פתיחה — נר עולה' },
      { id: 'bull-close-upper', labelHe: 'סגירה — נר עולה' },
      { id: 'bear-open-upper', labelHe: 'פתיחה — נר יורד' },
      { id: 'bear-close-lower', labelHe: 'סגירה — נר יורד' },
    ],
    chartSpec: candleLabelChartSpec,
    rubric: {
      kind: 'label-placement',
      targets: [
        {
          labelId: 'high-top',
          target: { candleIndex: labeledBullishCandle.index, price: labeledBullishCandle.high },
        },
        {
          labelId: 'low-bottom',
          target: { candleIndex: labeledBullishCandle.index, price: labeledBullishCandle.low },
        },
        {
          labelId: 'bull-open-lower',
          target: { candleIndex: labeledBullishCandle.index, price: labeledBullishCandle.open },
        },
        {
          labelId: 'bull-close-upper',
          target: { candleIndex: labeledBullishCandle.index, price: labeledBullishCandle.close },
        },
        {
          labelId: 'bear-open-upper',
          target: { candleIndex: labeledBearishCandle.index, price: labeledBearishCandle.open },
        },
        {
          labelId: 'bear-close-lower',
          target: { candleIndex: labeledBearishCandle.index, price: labeledBearishCandle.close },
        },
      ],
      tolerance: { horizontal: 0.04, vertical: 0.015 },
      decisionCandleIndex: 39,
      misconceptionIds: ['misconception.pattern-without-context'],
    },
    explanationHe:
      'הגוף מחבר פתיחה וסגירה, והצללים מגיעים לשיא ולשפל. כיוון הגוף קובע איזה קצה הוא פתיחה ואיזה סגירה; צבע לבדו אינו נחוץ.',
    alternativeExplanations: [
      {
        feedbackCode: 'label-placement-mismatch',
        explanationHe:
          'השיא והשפל נמצאים בקצות הצללים, לא בהכרח בקצות הגוף. בנר עולה הפתיחה היא קצה הגוף התחתון; בנר יורד הסגירה היא הקצה התחתון.',
      },
    ],
    misconceptionIds: ['misconception.pattern-without-context'],
    hints: hints('u01-chart-data-e01', [
      'הצל העליון והתחתון מייצגים את קצות הטווח.',
      'בנר עולה הסגירה מעל הפתיחה; בנר יורד להפך.',
      'בחרו שישה מיקומים: שני קצות הצל וארבעה קצות גוף לפי כיוון הנר.',
    ]),
    sourceReferences: source(19, 19, 'p. 6', 'Ch. 2; fig. 2.1 — OHLC candle anatomy'),
    workflowStepIds: ['context', 'structure'],
    termIds: ['term.volatility'],
    role: 'positive',
    category: 'visual',
    safetyNoteHe: 'קריאת נר מתארת את הטווח בתקופה; נר יחיד אינו תרחיש פעולה שלם.',
    processCriteriaHe: [
      'ממקם שיא ושפל לפי הצללים.',
      'מבדיל פתיחה וסגירה לפי כיוון הגוף ללא תלות בצבע.',
    ],
  },
  {
    ...common,
    id: 'u01-chart-data-e02',
    skillIds: ['data.ohlcv'],
    difficulty: 2,
    promptHe: 'איזו התאמה בין סוג הגרף לבין המידע שהוא שומר היא המדויקת ביותר?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'view-information-match',
        labelHe:
          'גרף קו המבוסס על סגירות מדגיש כיוון כללי; עמודות ונרות שומרים פתיחה, שיא, שפל וסגירה.',
      },
      {
        id: 'line-keeps-all',
        labelHe: 'גרף קו שומר את כל טווח המסחר, ונרות שומרים רק סגירות.',
      },
      {
        id: 'candles-always-best',
        labelHe: 'נרות תמיד נכונים יותר, בלי קשר לשאלת הניתוח.',
      },
      {
        id: 'bar-hides-range',
        labelHe: 'גרף עמודות מסתיר שיא ושפל ומשאיר רק פתיחה וסגירה.',
      },
    ],
    chartSpec: chart('u01-chart-data-e02', 10102, 'uptrend', { timeframe: '1w', noise: 0.3 }),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['view-information-match'],
      misconceptionIds: ['misconception.pattern-without-context'],
    },
    explanationHe:
      'גרף קו מסנן את המידע התוך־תקופתי כאשר הוא בנוי מסגירות. עמודות ונרות שומרים OHLC. הבחירה תלויה בשאלה, לא בדירוג קבוע של סוגי גרפים.',
    alternativeExplanations: [
      {
        answerId: 'line-keeps-all',
        explanationHe: 'קו סגירות אינו מציג את השיא, השפל או הפתיחה של כל תקופה.',
      },
      {
        answerId: 'candles-always-best',
        explanationHe: 'לסקירה רב־שנתית קו שבועי עשוי להיות נקי יותר; אין ייצוג אחד שנכון תמיד.',
      },
      {
        answerId: 'bar-hides-range',
        explanationHe: 'עמודת OHLC שומרת גם את השיא והשפל של התקופה.',
      },
    ],
    misconceptionIds: ['misconception.pattern-without-context'],
    hints: hints('u01-chart-data-e02', [
      'בדקו אילו ארבעה ערכים נשמרים בכל תקופה.',
      'קו סגירות מסנן מידע; נר ועמודת OHLC שומרים את הטווח.',
      'בחרו בהתאמה שמכירה גם בכך שסוג הגרף תלוי בשאלה.',
    ]),
    sourceReferences: source(19, 19, 'p. 6', 'Ch. 2 — line, bar, OHLC, and candlestick views'),
    workflowStepIds: ['context', 'structure'],
    termIds: ['term.trend'],
    role: 'transfer',
    category: 'visual',
    safetyNoteHe: 'סוג תצוגה משנה את המידע הנראה; אין להסיק שהייצוג הנקי ביותר הוא גם המלא ביותר.',
    processCriteriaHe: ['מזהה אילו ערכי מחיר נשמרים בכל ייצוג.', 'מתאים את הייצוג לשאלת הניתוח.'],
  },
  {
    ...common,
    id: 'u01-chart-data-e03',
    skillIds: ['data.timeframe-scale'],
    difficulty: 2,
    promptHe:
      'השוו היסטוריה רב־שנתית שבה המחיר עבר מ־10 ל־100 ואז מ־100 ל־1,000, ולצדה חלון קצר וצר. איזו בחירת סולם סבירה?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'log-long-arithmetic-short',
        labelHe: 'לוגריתמי להשוואת המהלכים האחוזיים בטווח הארוך; חשבוני עשוי להספיק לחלון הקצר.',
      },
      {
        id: 'arithmetic-long-only',
        labelHe: 'חשבוני תמיד, כי מרחק מחיר מוחלט הוא המידע היחיד שחשוב.',
      },
      {
        id: 'log-short-only',
        labelHe: 'לוגריתמי רק לחלון הקצר, וחשבוני להיסטוריה הארוכה.',
      },
      {
        id: 'scale-by-pattern',
        labelHe: 'לבחור את הסולם שמציג טוב יותר את התבנית הרצויה.',
      },
    ],
    chartSpec: chart('u01-chart-data-e03', 10103, 'uptrend', {
      candleCount: 120,
      timeframe: '1w',
      basePrice: 10,
      decisionCandleIndex: 119,
      noise: 0.2,
    }),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['log-long-arithmetic-short'],
      misconceptionIds: ['misconception.timeframe-shopping'],
    },
    explanationHe:
      'שני המהלכים הם פי עשרה אף שההפרש הכספי שונה מאוד. סולם לוגריתמי מציג יחס כפל שווה במרחק דומה; בטווח צר סולם חשבוני יכול להיות קריא ומספיק.',
    alternativeExplanations: [
      {
        answerId: 'arithmetic-long-only',
        explanationHe: 'בטווח ארוך שינוי מוחלט עלול להסתיר את הדמיון בין מהלכים אחוזיים.',
      },
      {
        answerId: 'log-short-only',
        explanationHe: 'יתרון הסולם הלוגריתמי בולט במיוחד כשהמחיר משתרע על מכפלות גדולות.',
      },
      {
        answerId: 'scale-by-pattern',
        explanationHe:
          'בחירת סולם כדי להצדיק צורה היא התאמה לדעה; הסולם נקבע לפי טווח ושאלת הניתוח.',
        misconceptionId: 'misconception.timeframe-shopping',
      },
    ],
    misconceptionIds: ['misconception.timeframe-shopping'],
    hints: hints('u01-chart-data-e03', [
      'השוו אחוזים, לא רק הפרשים כספיים.',
      '10→100 ו־100→1,000 הם אותו יחס כפל.',
      'יחסי כפל שווים מכוונים לסולם לוגריתמי בטווח הארוך.',
    ]),
    sourceReferences: source(
      20,
      20,
      'p. 7',
      'Ch. 2; fig. 2.2 — arithmetic versus logarithmic scale',
    ),
    workflowStepIds: ['context', 'structure'],
    termIds: ['term.trend'],
    role: 'transfer',
    category: 'visual',
    safetyNoteHe:
      'שינוי סולם עשוי לשנות קווים חזותיים; יש לתעד את הבחירה ולא לבחור לפי התוצאה הרצויה.',
    processCriteriaHe: [
      'מבחין בין שינוי מוחלט לשינוי יחסי.',
      'בוחר סולם לפי טווח הנתונים ולא לפי הטיה כיוונית.',
    ],
  },
  {
    ...common,
    id: 'u01-chart-data-e04',
    skillIds: ['data.integrity', 'data.ohlcv'],
    difficulty: 2,
    promptHe:
      'בסדרה גולמית נרשמו סגירות 100, 102, 51, 52 סביב פיצול 2־ל־1. מהי סדרת ההשוואה לאחר התאמת המחירים שלפני הפיצול?',
    interactionType: 'multiple-choice',
    options: [
      { id: 'adjusted-50-51-51-52', labelHe: '50, 51, 51, 52' },
      { id: 'raw-100-102-51-52', labelHe: '100, 102, 51, 52' },
      { id: 'adjusted-200-204-51-52', labelHe: '200, 204, 51, 52' },
      { id: 'delete-split-candle', labelHe: '100, 102, 52 — מוחקים את נר הפיצול.' },
    ],
    chartSpec: chart(
      'u01-chart-data-e04',
      10104,
      'range',
      { candleCount: 40, basePrice: 51, decisionCandleIndex: 39 },
      { gapKind: 'common', gapIndex: 20, gapSize: 0.25, direction: 'down' },
    ),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['adjusted-50-51-51-52'],
      misconceptionIds: ['misconception.pattern-without-context'],
    },
    explanationHe:
      'בפיצול 2־ל־1 כל יחידה ישנה הופכת לשתי יחידות, ולכן לצורך רציפות מחיר מחלקים את המחירים שלפני הפיצול בשניים. הפער הגולמי אינו בהכרח שינוי בהיצע ובביקוש.',
    alternativeExplanations: [
      {
        answerId: 'raw-100-102-51-52',
        explanationHe: 'השארת הסדרה גולמית יוצרת פער מלאכותי שעלול להיראות כתבנית.',
        misconceptionId: 'misconception.pattern-without-context',
      },
      {
        answerId: 'adjusted-200-204-51-52',
        explanationHe: 'כדי להשוות ליחידות שלאחר פיצול 2־ל־1 מחלקים, לא מכפילים, את העבר.',
      },
      {
        answerId: 'delete-split-candle',
        explanationHe: 'לא מוחקים תצפית; משתמשים בסדרה מתואמת ומתעדים את שיטת ההתאמה.',
      },
    ],
    misconceptionIds: ['misconception.pattern-without-context'],
    hints: hints('u01-chart-data-e04', [
      'אחרי פיצול 2־ל־1 מחיר כל יחידה הוא בערך מחצית.',
      'התאימו את שתי הסגירות שקדמו לפיצול לבסיס החדש.',
      '100÷2=50 ו־102÷2=51.',
    ]),
    sourceReferences: source(20, 21, 'pp. 7–8', 'Ch. 2 — adjusted data, splits, and dividends'),
    workflowStepIds: ['context', 'structure'],
    termIds: ['term.gap'],
    role: 'positive',
    category: 'calculation',
    safetyNoteHe: 'הדוגמה מלמדת בדיקת נתונים; שיטות התאמה שונות עשויות להזיז גם רמות היסטוריות.',
    processCriteriaHe: [
      'מזהה פעולה תאגידית לפני ניתוח פער.',
      'מבצע התאמה עקבית ומציין את בסיס הסדרה.',
    ],
  },
  {
    ...common,
    id: 'u01-chart-data-e05',
    skillIds: ['data.integrity', 'data.timeframe-scale'],
    difficulty: 3,
    promptHe:
      'נר חריג יחיד יוצר את כל “הפריצה”. מקור נוסף אינו מציג אותו, ובסדרה רציפה של חוזים יש מעבר חוזה באותו תאריך. מה נכון להסיק?',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'pause-and-verify-data',
        labelHe: 'להשהות את המסקנה ולבדוק טיק שגוי, מקור, שיטת גלגול, התאמה ומסגרת זמן.',
      },
      {
        id: 'accept-visible-breakout',
        labelHe: 'לקבל את הפריצה מפני שהיא נראית בבירור במקור הראשון.',
      },
      { id: 'switch-timeframe', labelHe: 'לעבור בין מסגרות עד שהפריצה נראית אמינה.' },
      { id: 'average-sources', labelHe: 'למצע את שני הגרפים בלי לבדוק מדוע הם שונים.' },
    ],
    chartSpec: chart(
      'u01-chart-data-e05',
      10105,
      'lookalike',
      { decisionCandleIndex: 46 },
      { baseScenario: 'breakout', eventIndex: 46, gapKind: 'common', gapIndex: 46 },
    ),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['pause-and-verify-data'],
      misconceptionIds: [
        'misconception.timeframe-shopping',
        'misconception.pattern-without-context',
      ],
    },
    explanationHe:
      'כאשר תצפית אחת תלויה במקור או בחיבור חוזים, תקינות הנתון קודמת לסיווג הצורה. יש לברר מקור, התאמות, גלגול ושעות מסחר לפני שמסיקים שהתרחשה פריצה.',
    alternativeExplanations: [
      {
        answerId: 'accept-visible-breakout',
        explanationHe: 'דיוק חזותי אינו מתקן נתון פגום או קפיצה טכנית בחיבור חוזים.',
        misconceptionId: 'misconception.pattern-without-context',
      },
      {
        answerId: 'switch-timeframe',
        explanationHe: 'מעבר מסגרת כדי להצדיק מסקנה הוא חיפוש אישור ואינו פותר סתירת מקורות.',
        misconceptionId: 'misconception.timeframe-shopping',
      },
      {
        answerId: 'average-sources',
        explanationHe: 'מיצוע מסתיר את הסיבה לפער; קודם צריך לזהות איזה נתון ומהי שיטת הבנייה שלו.',
      },
    ],
    misconceptionIds: ['misconception.timeframe-shopping', 'misconception.pattern-without-context'],
    hints: hints('u01-chart-data-e05', [
      'שאלו אם הנר מייצג מסחר או שינוי טכני בסדרה.',
      'סתירה בין מקורות מחייבת בדיקת מקור והתאמה.',
      'לפני סיווג הפריצה, עצרו ואמתו טיק, גלגול, שעות ומסגרת.',
    ]),
    sourceReferences: source(
      20,
      21,
      'pp. 7–8',
      'Ch. 2 — data artifacts, continuous contracts, sources, and timeframe choice',
    ),
    workflowStepIds: ['context', 'structure'],
    termIds: ['term.breakout'],
    role: 'lookalike',
    category: 'explanation',
    safetyNoteHe:
      'נתון לא מאומת אינו בסיס לפעולה; גם מקור נוסף עלול להיות חלקי ויש לתעד את שיטת ההשוואה.',
    processCriteriaHe: [
      'בודק שלמות ומקור לפני זיהוי תבנית.',
      'אינו מחליף מסגרת זמן כדי להציל מסקנה.',
    ],
  },
  {
    ...common,
    id: 'u02-structure-e01',
    skillIds: ['structure.dow-trends'],
    difficulty: 2,
    promptHe:
      'בחנו את שלושת התרשימים הנפרדים — שבועי, יומי ושעתי — וסווגו את כיוון השכבה הראשית, המשנית והקצרה.',
    interactionType: 'multiple-choice',
    options: [
      {
        id: 'primary-up-secondary-down-minor-up',
        labelHe: 'ראשית עולה; משנית יורדת; קצרה עולה.',
      },
      {
        id: 'all-up',
        labelHe: 'כל השכבות עולות כי השעתי עולה.',
      },
      {
        id: 'all-down',
        labelHe: 'כל השכבות יורדות כי היומי יורד.',
      },
      {
        id: 'primary-down-secondary-up-minor-down',
        labelHe: 'ראשית יורדת; משנית עולה; קצרה יורדת.',
      },
    ],
    chartSpec: chart('u02-structure-e01', 20201, 'uptrend', { timeframe: '1w', noise: 0.25 }),
    rubric: {
      kind: 'multiple-choice',
      acceptedOptionIds: ['primary-up-secondary-down-minor-up'],
      misconceptionIds: ['misconception.timeframe-shopping'],
    },
    explanationHe:
      'מגמות בשכבות שונות יכולות לנוע בכיוונים מנוגדים בו־זמנית. הסתירה נפתרת כשמציינים במפורש את מסגרת הזמן של כל תיאור.',
    alternativeExplanations: [
      {
        answerId: 'all-up',
        explanationHe: 'תנודה שעתית אינה משנה לבדה את המבנה השבועי או את התיקון היומי.',
        misconceptionId: 'misconception.timeframe-shopping',
      },
      {
        answerId: 'all-down',
        explanationHe: 'תיקון יומי יורד יכול להתקיים בתוך מגמה שבועית עולה.',
      },
      {
        answerId: 'primary-down-secondary-up-minor-down',
        explanationHe: 'האפשרות הופכת את התצפיות שניתנו ואינה תואמת את ההיררכיה.',
      },
    ],
    misconceptionIds: ['misconception.timeframe-shopping'],
    hints: hints('u02-structure-e01', [
      'אל תדרשו מכל מסגרות הזמן להסכים.',
      'שבועי מתאר כאן את הראשית, יומי את המשנית ושעתי את הקצרה.',
      'קראו את שלושת הכיוונים לפי הסדר: עולה, יורדת, עולה.',
    ]),
    sourceReferences: source(
      22,
      24,
      'pp. 9–11',
      'Ch. 3 — primary, secondary, and short trend hierarchy',
    ),
    workflowStepIds: ['context', 'structure'],
    termIds: ['term.trend'],
    role: 'positive',
    category: 'visual',
    safetyNoteHe: 'תיוג שכבות זמן הוא תיאור מבני; יישור או סתירה ביניהן אינם יתרון מסחר מוכח.',
    processCriteriaHe: ['מציין מסגרת זמן לכל מגמה.', 'אינו נותן לשכבה קצרה לדרוס הקשר ארוך.'],
  },
  {
    ...common,
    id: 'u02-structure-e02',
    skillIds: ['structure.dow-trends'],
    difficulty: 2,
    promptHe: 'סדרו את שלבי המגמה הראשית לפי מסגרת דאו, תוך זכירה שהתיוג בזמן אמת הוא פרשני.',
    interactionType: 'sequence',
    options: [
      { id: 'accumulation', labelHe: 'איסוף' },
      { id: 'participation', labelHe: 'השתתפות ציבורית' },
      { id: 'distribution', labelHe: 'הפצה' },
    ],
    chartSpec: chart(
      'u02-structure-e02',
      20202,
      'uptrend',
      { candleCount: 96, decisionCandleIndex: 95, noise: 0.2 },
      { relativeVolume: 'rising' },
    ),
    rubric: {
      kind: 'sequence',
      expectedOrder: ['accumulation', 'participation', 'distribution'],
      misconceptionIds: ['misconception.outcome-bias'],
    },
    explanationHe:
      'הסדר המסורתי הוא איסוף, השתתפות ציבורית והפצה. אלה תוויות פרשניות להבנת שינוי בציפיות, ולא שלבים שקל לאמת בזמן אמת או אותות פעולה עצמאיים.',
    alternativeExplanations: [
      {
        feedbackCode: 'sequence-order-mismatch',
        explanationHe:
          'הפצה מתוארת לאחר התרחבות ההשתתפות, לא לפניה; וגם מחיר גבוה לבדו אינו מוכיח שהשוק נמצא בשלב הפצה.',
        misconceptionId: 'misconception.outcome-bias',
      },
    ],
    misconceptionIds: ['misconception.outcome-bias'],
    hints: hints('u02-structure-e02', [
      'התחילו בשלב שבו ההשתתפות הרחבה עדיין קטנה.',
      'השלב האמצעי הוא התרחבות ההשתתפות הציבורית.',
      'הסדר הוא איסוף → השתתפות → הפצה.',
    ]),
    sourceReferences: source(
      23,
      23,
      'p. 10',
      'Ch. 3; fig. 3.1 — accumulation, participation, distribution',
    ),
    workflowStepIds: ['context', 'structure'],
    termIds: ['term.trend'],
    role: 'positive',
    category: 'explanation',
    safetyNoteHe: 'הסדר הוא מסגרת לימודית; אין להסיק ממנו שלב ודאי או הוראת פעולה בנכס מסוים.',
    processCriteriaHe: ['מסדר נכון את שלושת השלבים.', 'מסייג את התיוג כפרשנות ולא כעובדה ישירה.'],
  },
  {
    ...common,
    id: 'u02-structure-e03',
    skillIds: ['structure.dow-trends'],
    difficulty: 3,
    promptHe:
      'מדד רחב קבע שיא חדש, אך רוחב השוק ומדד קשור לא אישרו. המחיר עצמו טרם שבר מבנה. מהי ההחלטה הנתמכת?',
    interactionType: 'decision',
    options: [
      { id: 'trade', labelHe: 'לפתוח עסקה נגד המדד מיד.' },
      { id: 'wait', labelHe: 'להמתין בלי לתעד את הסטייה.' },
      { id: 'reject', labelHe: 'לבטל את כל ניתוח המגמה.' },
      {
        id: 'insufficient-evidence',
        labelHe: 'לתעד זהירות; אין עדיין די ראיות לשינוי מבני.',
      },
      { id: 'nonconfirmation-supporting-only', labelHe: 'אי־אישור הוא ראיה תומכת בלבד.' },
      { id: 'price-structure-intact', labelHe: 'מבנה המחיר טרם נשבר.' },
    ],
    chartSpec: chart(
      'u02-structure-e03',
      20203,
      'ambiguous',
      { decisionCandleIndex: 46 },
      { baseScenario: 'uptrend', regime: 'uptrend', eventIndex: 46, relativeVolume: 'falling' },
    ),
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['insufficient-evidence'],
      requiredReasonIds: ['nonconfirmation-supporting-only', 'price-structure-intact'],
      misconceptionIds: ['misconception.bias-as-confirmation'],
    },
    explanationHe:
      'אי־אישור ממושך מצדיק זהירות ובדיקה, אך אינו טריגר עצמאי. בלי שינוי במבנה המחיר אין עדיין ראיה מספקת להכריז על היפוך.',
    alternativeExplanations: [
      {
        answerId: 'trade',
        explanationHe: 'סטייה בין מדדים או ברוחב היא הקשר תומך, לא אישור ביצוע עצמאי.',
        misconceptionId: 'misconception.bias-as-confirmation',
      },
      {
        answerId: 'wait',
        explanationHe: 'המתנה סבירה, אך יש לתעד את הסטייה כסיבה לזהירות ולא להתעלם ממנה.',
      },
      {
        answerId: 'reject',
        explanationHe: 'אי־אישור אינו מבטל את כל מסגרת המבנה; הוא מוריד את ביטחון הפרשנות.',
      },
    ],
    misconceptionIds: ['misconception.bias-as-confirmation', 'misconception.forced-trade'],
    hints: hints('u02-structure-e03', [
      'הפרידו בין סימן אזהרה לבין טריגר.',
      'בדקו אם נוצר שינוי ממשי ברצף המחיר.',
      'אי־אישור עם מבנה שלם משאיר את המסקנה ב“אין מספיק ראיות”.',
    ]),
    sourceReferences: source(
      23,
      24,
      'pp. 10–11',
      'Ch. 3 — confirmation principle, modern analogy, and limitations',
    ),
    isAmbiguous: true,
    workflowStepIds: ['context', 'structure', 'confirmation'],
    termIds: ['term.confirmation'],
    role: 'ambiguous',
    category: 'decision',
    safetyNoteHe: 'אי־אישור עשוי להצדיק זהירות, אך אינו הוראה לקנות או למכור ואינו מבטיח היפוך.',
    processCriteriaHe: [
      'מתייחס לאי־אישור כראיה מסייעת.',
      'דורש שינוי מחיר מוגדר לפני מסקנה מבנית.',
    ],
  },
  {
    ...common,
    id: 'u02-structure-e04',
    skillIds: ['structure.swings'],
    difficulty: 2,
    promptHe: 'הקישו על כל נקודות הנדנדה המסומנות ברצף כמייצגות שיא גבוה (HH) או שפל גבוה (HL).',
    interactionType: 'point',
    chartSpec: chart('u02-structure-e04', 20204, 'uptrend', { noise: 0.25 }),
    rubric: {
      kind: 'point',
      targets: [
        { candleIndex: 13, price: 103.1061 },
        { candleIndex: 31, price: 107.8507 },
        { candleIndex: 48, price: 112.3511 },
        { candleIndex: 65, price: 117.2483 },
        { candleIndex: 21, price: 105.8884 },
        { candleIndex: 38, price: 109.8472 },
        { candleIndex: 56, price: 114.6173 },
      ],
      tolerance: { horizontal: 0.025, vertical: 0.035 },
      matching: 'all',
      allowExtraPoints: false,
      decisionCandleIndex: 71,
      misconceptionIds: ['misconception.pattern-without-context'],
    },
    explanationHe:
      'מגמה עולה ניתנת לתיאור כרצף שיאים ושפלים עולים. הסימון נעשה לפי נקודות נדנדה משמעותיות, לא לפי כל נר שזז בכיוון הנגדי.',
    alternativeExplanations: [
      {
        feedbackCode: 'point-outside-tolerance',
        explanationHe:
          'בחירת כל תנודה זעירה מערבבת רעש עם נקודת נדנדה משמעותית. הגדרת מגמה דורשת לסמן גם שיאים וגם שפלים מרכזיים.',
        misconceptionId: 'misconception.pattern-without-context',
      },
    ],
    misconceptionIds: ['misconception.pattern-without-context'],
    hints: hints('u02-structure-e04', [
      'חפשו קיצונים מקומיים ברורים, לא כל שינוי של נר.',
      'השוו כל שיא ושפל לקודם מאותו סוג.',
      'יש ארבעה HH ושלושה HL בתרשים.',
    ]),
    sourceReferences: source(25, 25, 'p. 12', 'Ch. 4; fig. 4.1 — higher highs and higher lows'),
    workflowStepIds: ['structure'],
    termIds: ['term.higher-low', 'term.trend'],
    role: 'positive',
    category: 'visual',
    safetyNoteHe: 'רצף מבני מתאר את התרשים הסינתטי; הוא אינו מבטיח המשך של המגמה.',
    processCriteriaHe: ['מסמן קיצוני נדנדה ולא רעש תוך־נרי.', 'בודק שיאים ושפלים כרצף משותף.'],
  },
  {
    ...common,
    id: 'u02-structure-e05',
    skillIds: ['structure.swings'],
    difficulty: 3,
    promptHe:
      'הכלל שנקבע מראש דורש שינוי של 3% כדי לאשר נדנדה. השפל האחרון ירד 1.2% מתחת ל־HL הקודם, ועדיין לא נוצר LH. כיצד לסווג?',
    interactionType: 'decision',
    options: [
      { id: 'trade', labelHe: 'היפוך יורד מלא אושר.' },
      { id: 'wait', labelHe: 'להמתין אך להתעלם מכלל ה־3%.' },
      { id: 'reject', labelHe: 'לדחות את כלל הנדנדה לאחר החריגה.' },
      {
        id: 'insufficient-evidence',
        labelHe: 'אין עדיין די ראיות להיפוך מלא לפי הכלל.',
      },
      { id: 'below-swing-threshold', labelHe: 'החריגה קטנה מסף הנדנדה שנקבע.' },
      { id: 'new-sequence-absent', labelHe: 'עדיין חסר רצף LH/LL חדש.' },
    ],
    chartSpec: chart(
      'u02-structure-e05',
      20205,
      'ambiguous',
      { decisionCandleIndex: 47, noise: 0.5 },
      { baseScenario: 'uptrend', regime: 'uptrend', eventIndex: 47, variant: 'ambiguous' },
    ),
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['insufficient-evidence'],
      requiredReasonIds: ['below-swing-threshold', 'new-sequence-absent'],
      misconceptionIds: ['misconception.bias-as-confirmation'],
    },
    explanationHe:
      'החריגה אינה עומדת בכלל ה־3% ואינה יוצרת לבדה רצף יורד. גם שבירה מאושרת של HL אחד יכולה להוביל לטווח או לתיקון עמוק; היפוך מלא דורש ראיות מבניות נוספות.',
    alternativeExplanations: [
      {
        answerId: 'trade',
        explanationHe: 'שבירה קטנה מהסף וללא LH חדש אינה ממלאת את כלל ההיפוך.',
        misconceptionId: 'misconception.bias-as-confirmation',
      },
      {
        answerId: 'wait',
        explanationHe: 'המתנה נכונה רק אם ממשיכים ליישם את כלל ה־3% ולא משנים אותו בדיעבד.',
        misconceptionId: 'misconception.future-information-leak',
      },
      {
        answerId: 'reject',
        explanationHe: 'תוצאה לא נוחה אינה סיבה להחליף כלל שנקבע מראש באמצע המקרה.',
        misconceptionId: 'misconception.outcome-bias',
      },
    ],
    misconceptionIds: [
      'misconception.bias-as-confirmation',
      'misconception.future-information-leak',
      'misconception.outcome-bias',
    ],
    hints: hints('u02-structure-e05', [
      'השוו את 1.2% לסף שנקבע לפני התצפית.',
      'שאלו אם קיים כבר רצף חדש של שיאים ושפלים נמוכים.',
      'הסף לא נחצה וחסר LH; לכן אין מספיק ראיות להיפוך מלא.',
    ]),
    sourceReferences: source(25, 26, 'pp. 12–13', 'Ch. 4 — swing rules and structural change'),
    isAmbiguous: true,
    workflowStepIds: ['structure', 'confirmation'],
    termIds: ['term.higher-low', 'term.lower-high', 'term.atr'],
    role: 'near-miss',
    category: 'visual',
    safetyNoteHe: 'כלל נדנדה מפחית שרירותיות אך אינו מבטל שיקול דעת ואינו מבטיח תוצאה עתידית.',
    processCriteriaHe: ['מיישם את סף הנדנדה שנקבע מראש.', 'מפריד שבירה יחידה מרצף מבני חדש.'],
  },
  {
    ...common,
    id: 'u03-levels-e01',
    skillIds: ['levels.zones'],
    difficulty: 2,
    promptHe:
      'ציירו אזור תמיכה שמכיל את רוב הפתילות והסגירות בתגובות החוזרות, במקום קו במחיר יחיד.',
    interactionType: 'zone',
    chartSpec: chart('u03-levels-e01', 30301, 'range', { volatility: 0.016, noise: 0.3 }),
    rubric: {
      kind: 'zone',
      target: {
        startCandleIndex: 0,
        endCandleIndex: 71,
        priceLow: 96.0157,
        priceHigh: 96.8465,
      },
      minimumIntersectionOverUnion: 0.55,
      decisionCandleIndex: 71,
      misconceptionIds: ['misconception.level-as-exact-price'],
    },
    explanationHe:
      'תגובות מחיר מתרכזות בטווח ולא בהכרח באגורה אחת. אזור שימושי מכסה את רוב התגובות הרלוונטיות, אך נשאר צר מספיק כדי להבחין בין החזקה לשבירה.',
    alternativeExplanations: [
      {
        feedbackCode: 'zone-overlap-too-small',
        explanationHe:
          'קו דק מדי הופך תנודה רגילה לפריצת שווא מדומה, ואזור רחב מדי אינו מספק גבול החלטה שימושי. חפשו טווח צר שמכסה את אשכול התגובות.',
        misconceptionId: 'misconception.level-as-exact-price',
      },
    ],
    misconceptionIds: ['misconception.level-as-exact-price'],
    hints: hints('u03-levels-e01', [
      'חפשו אשכול תגובות, לא מחיר בודד.',
      'כללו את רוב הפתילות והסגירות, אך לא את כל טווח התרשים.',
      'האזור המבוקש נמצא בקירוב בין 96.02 ל־96.85.',
    ]),
    sourceReferences: source(29, 30, 'pp. 16–17', 'Ch. 5 — support and resistance as zones'),
    workflowStepIds: ['structure', 'level', 'invalidation'],
    termIds: ['term.support'],
    role: 'positive',
    category: 'visual',
    safetyNoteHe: 'גבולות אזור הם סבילות לימודית, לא מחיר פעולה מדויק ולא הבטחה לתגובה.',
    processCriteriaHe: [
      'מאגד מספר תגובות לאזור בעל רוחב סביר.',
      'נמנע מדיוק כוזב ומאזור רחב חסר משמעות.',
    ],
  },
  {
    ...common,
    id: 'u03-levels-e02',
    skillIds: ['levels.zones'],
    difficulty: 2,
    promptHe:
      'המחיר נסגר מעל אזור התנגדות ולאחר מכן חזר אליו מלמעלה והגיב. אילו שתי תוויות מתארות את הרצף?',
    interactionType: 'selection',
    options: [
      { id: 'resistance-before-break', labelHe: 'לפני הפריצה: התנגדות.' },
      { id: 'support-after-retest', labelHe: 'אחרי חזרה מוצלחת: תמיכה אפשרית.' },
      { id: 'guaranteed-floor', labelHe: 'אחרי הפריצה: רצפה מובטחת.' },
      { id: 'same-resistance-forever', labelHe: 'התפקיד אינו יכול להשתנות.' },
    ],
    chartSpec: chart(
      'u03-levels-e02',
      30302,
      'retest',
      { decisionCandleIndex: 71, noise: 0.25 },
      { direction: 'up', eventIndex: 43, variant: 'positive' },
    ),
    rubric: {
      kind: 'selection',
      expectedIds: ['resistance-before-break', 'support-after-retest'],
      mode: 'exact',
      allowExtraSelections: false,
      misconceptionIds: ['misconception.level-as-exact-price'],
    },
    explanationHe:
      'אזור שבו היצע בלם עלייה יכול להפוך לאזור תמיכה לאחר פריצה ובדיקה מחדש. זהו שינוי תפקיד אפשרי שמקבל תמיכה מן התגובה, לא חוק שמבטיח החזקה.',
    alternativeExplanations: [
      {
        answerId: 'guaranteed-floor',
        explanationHe: 'בדיקה מוצלחת מוסיפה ראיה אך אינה הופכת את האזור למחסום פיזי.',
        misconceptionId: 'misconception.level-as-exact-price',
      },
      {
        answerId: 'same-resistance-forever',
        explanationHe: 'התנהגות המשתתפים סביב רמת הפריצה יכולה לשנות את תפקיד האזור.',
      },
    ],
    misconceptionIds: ['misconception.level-as-exact-price'],
    hints: hints('u03-levels-e02', [
      'תנו שם לאזור לפני הפריצה ואחריה בנפרד.',
      'חזרה מלמעלה בוחנת אם התנגדות קודמת מקבלת תפקיד חדש.',
      'בחרו “התנגדות לפני” ו“תמיכה אפשרית אחרי”.',
    ]),
    sourceReferences: source(
      29,
      29,
      'p. 16',
      'Ch. 5; fig. 5.1 — resistance-to-support role reversal',
    ),
    workflowStepIds: ['structure', 'level', 'confirmation'],
    termIds: ['term.resistance', 'term.support', 'term.retest'],
    role: 'positive',
    category: 'visual',
    safetyNoteHe: 'שינוי תפקיד הוא תרחיש מותנה; בדיקה מחדש יכולה להיכשל והאזור אינו מחיר מובטח.',
    processCriteriaHe: [
      'מתייג את תפקיד האזור בכל שלב של הרצף.',
      'מנסח את התמיכה החדשה כאפשרות מותנית.',
    ],
  },
  {
    ...common,
    id: 'u03-levels-e03',
    skillIds: ['levels.zones'],
    difficulty: 3,
    promptHe:
      'רמה א׳ נבדקה פעמיים לאורך שנה ובכמה מסגרות; רמה ב׳ נבדקה שש פעמים השבוע; רמה ג׳ היא מספר עגול ללא תגובה. האם מספר הבדיקות לבדו מספיק לבחור פעולה?',
    interactionType: 'decision',
    options: [
      { id: 'trade', labelHe: 'כן; לפעול אוטומטית ברמה ב׳ כי יש לה הכי הרבה בדיקות.' },
      { id: 'wait', labelHe: 'להמתין לראיית מחיר מוגדרת ולדרג את ההקשר לפני פעולה.' },
      { id: 'reject', labelHe: 'לדחות את כל שלוש הרמות לצמיתות.' },
      { id: 'insufficient-evidence', labelHe: 'אי אפשר בכלל להעריך משמעות של רמות.' },
      { id: 'contextual-significance', labelHe: 'משך, מסגרות ותגובות חשובים לצד מספר הבדיקות.' },
      { id: 'tests-may-consume', labelHe: 'בדיקות חוזרות יכולות גם לספוג הוראות ולהחליש אזור.' },
    ],
    chartSpec: chart(
      'u03-levels-e03',
      30303,
      'ambiguous',
      { decisionCandleIndex: 46 },
      { baseScenario: 'range', regime: 'range', eventIndex: 46, reaction: 'resistance' },
    ),
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['wait'],
      requiredReasonIds: ['contextual-significance', 'tests-may-consume'],
      misconceptionIds: ['misconception.level-as-exact-price', 'misconception.forced-trade'],
    },
    explanationHe:
      'ריבוי בדיקות הוא רק רכיב אחד: זמן, חפיפה למסגרות ותגובה בפועל עשויים לחזק את חשיבות הרמה. במקביל, בדיקות רבות יכולות לספוג את ההוראות המגינות. לכן מדרגים הקשר ומחכים לראיה שהוגדרה.',
    alternativeExplanations: [
      {
        answerId: 'trade',
        explanationHe: 'ספירת נגיעות לבדה מתעלמת משחיקת האזור ומהיעדר תנאי אישור.',
        misconceptionId: 'misconception.forced-trade',
      },
      {
        answerId: 'reject',
        explanationHe: 'אי־ודאות אינה מבטלת את מושג הרמה; היא מחייבת משקלול וראיה נוספת.',
      },
      {
        answerId: 'insufficient-evidence',
        explanationHe: 'יש מידע לדירוג יחסי, אך עדיין אין בסיס לפעולה אוטומטית.',
      },
    ],
    misconceptionIds: ['misconception.level-as-exact-price', 'misconception.forced-trade'],
    hints: hints('u03-levels-e03', [
      'מספר בדיקות אינו המשתנה היחיד.',
      'בדיקות עשויות גם לחזק את העדות וגם לצרוך הוראות באזור.',
      'בחרו להמתין, תוך שקלול משך, מסגרות וראיית מחיר.',
    ]),
    sourceReferences: source(
      29,
      30,
      'pp. 16–17',
      'Ch. 5 — level significance and repeated-test caveat',
    ),
    isAmbiguous: true,
    workflowStepIds: ['structure', 'level', 'confirmation'],
    termIds: ['term.support', 'term.resistance', 'term.confirmation'],
    role: 'ambiguous',
    category: 'decision',
    safetyNoteHe: 'דירוג רמות הוא היוריסטיקה, לא אות עצמאי; המתנה לראיה היא תשובה תקפה.',
    processCriteriaHe: [
      'מדרג רמה לפי יותר מספירת נגיעות.',
      'מכיר בכך שבדיקות חוזרות עשויות גם לשחוק אזור.',
    ],
  },
  {
    ...common,
    id: 'u03-levels-e04',
    skillIds: ['levels.lines'],
    difficulty: 3,
    promptHe:
      'חברו את שפל־העוגן הראשון והאחרון בקו מגמה עולה. לאחר מכן יש להעביר קו מקביל דרך השיאים ליצירת ערוץ.',
    interactionType: 'line',
    chartSpec: chart('u03-levels-e04', 30304, 'uptrend', { volatility: 0.015, noise: 0.2 }),
    rubric: {
      kind: 'line',
      target: {
        start: { candleIndex: 21, price: 105.938 },
        end: { candleIndex: 56, price: 115.0526 },
      },
      tolerance: { horizontal: 0.035, vertical: 0.035 },
      directionInvariant: true,
      decisionCandleIndex: 71,
      misconceptionIds: ['misconception.pattern-without-context'],
    },
    explanationHe:
      'במגמה עולה קו הבסיס מחבר שפלים עולים. שתי נקודות מאפשרות קו ונגיעה נוספת בוחנת שימושיות; קו הערוץ מועבר במקביל דרך השיאים, בלי לסובב את קו הבסיס כדי להתאים לפתיל חריג.',
    alternativeExplanations: [
      {
        feedbackCode: 'line-outside-tolerance',
        explanationHe:
          'קו הבסיס צריך לעבור מתחת לשפלים המשמעותיים ולא במרכז המחיר; קו הערוץ נשאר מקביל ואין לעוות את שניהם כדי להתאים לפתיל חריג יחיד.',
        misconceptionId: 'misconception.pattern-without-context',
      },
    ],
    misconceptionIds: ['misconception.pattern-without-context'],
    hints: hints('u03-levels-e04', [
      'במגמה עולה מתחילים מן השפלים, לא מן השיאים.',
      'בחרו עוגנים משמעותיים שהקו נשאר מתחת לרוב המבנה.',
      'חברו את נר 21 סביב 105.94 לנר 56 סביב 115.05; קו הערוץ מקביל.',
    ]),
    sourceReferences: source(
      31,
      31,
      'p. 18',
      'Ch. 6; fig. 6.1 — trendline anchors and parallel channel',
    ),
    workflowStepIds: ['structure', 'level'],
    termIds: ['term.trendline', 'term.higher-low'],
    role: 'positive',
    category: 'visual',
    safetyNoteHe: 'קו וערוץ הם כלי תיאור; נגיעה או חצייה אינן הוראת פעולה עצמאית.',
    processCriteriaHe: [
      'מחבר עוגני שפל מותרים בקו עולה.',
      'שומר את קו הערוץ מקביל ואינו מתאים את הזווית בדיעבד.',
    ],
  },
  {
    ...common,
    id: 'u03-levels-e05',
    skillIds: ['levels.lines'],
    difficulty: 4,
    promptHe:
      'לפני החשיפה נקבע: שבירה תקפה דורשת סגירה של 1% מעבר לקו ושני נרות המשך. כעת יש חדירה של 0.4% לקו תלול וחזרה אליו, בלי רצף חדש. כיצד לסווג?',
    interactionType: 'decision',
    options: [
      { id: 'trade', labelHe: 'שינוי מגמה מלא אושר.' },
      { id: 'wait', labelHe: 'להמתין להשלמת כלל השבירה או לשינוי מבני.' },
      { id: 'reject', labelHe: 'למחוק את הקו ולצייר תלול יותר.' },
      { id: 'insufficient-evidence', labelHe: 'אי אפשר להבחין כלל בין חדירה לשבירה.' },
      { id: 'rule-not-met', labelHe: 'מרחק הסגירה ושני נרות ההמשך טרם התקיימו.' },
      { id: 'steep-line-may-be-pace-change', labelHe: 'שבירת קו תלול עשויה להיות האטת קצב בלבד.' },
    ],
    chartSpec: chart(
      'u03-levels-e05',
      30305,
      'breakout',
      { decisionCandleIndex: 46, noise: 0.4 },
      { direction: 'down', regime: 'uptrend', eventIndex: 46, variant: 'near-miss' },
    ),
    rubric: {
      kind: 'decision',
      acceptedDecisions: ['wait'],
      requiredReasonIds: ['rule-not-met', 'steep-line-may-be-pace-change'],
      misconceptionIds: [
        'misconception.bias-as-confirmation',
        'misconception.future-information-leak',
      ],
    },
    explanationHe:
      'החדירה אינה עומדת במרחק או במשך שנקבעו, וקו תלול יכול להישבר בשל האטת קצב בלי היפוך מלא. משאירים את הכלל קבוע וממתינים לאישור או לרצף מבני חדש.',
    alternativeExplanations: [
      {
        answerId: 'trade',
        explanationHe: 'חדירה קטנה ללא שני נרות המשך אינה האישור שהוגדר.',
        misconceptionId: 'misconception.bias-as-confirmation',
      },
      {
        answerId: 'reject',
        explanationHe: 'ציור קו חדש כדי למחוק את השבירה משנה את הכלל בדיעבד.',
        misconceptionId: 'misconception.future-information-leak',
      },
      {
        answerId: 'insufficient-evidence',
        explanationHe: 'אפשר להעריך את החדירה מול הכלל המספרי; המסקנה היא שהכלל טרם הושלם.',
      },
    ],
    misconceptionIds: [
      'misconception.bias-as-confirmation',
      'misconception.future-information-leak',
    ],
    hints: hints('u03-levels-e05', [
      'השוו 0.4% לדרישת 1%.',
      'בדקו גם אם הופיעו שני נרות המשך ורצף מבני חדש.',
      'הכלל לא הושלם וקו תלול עשוי רק לשקף שינוי קצב; לכן ממתינים.',
    ]),
    sourceReferences: source(
      31,
      32,
      'pp. 18–19',
      'Ch. 6 — penetration, retest, slope change, and fan principle',
    ),
    isAmbiguous: true,
    workflowStepIds: ['structure', 'level', 'confirmation', 'invalidation'],
    termIds: ['term.trendline', 'term.retest', 'term.confirmation'],
    role: 'near-miss',
    category: 'decision',
    safetyNoteHe:
      'גם כלל שבירה מוגדר אינו מבטיח המשך; בדיקה מחדש עשויה להיכשל ואין להזיז כלל כדי להצדיק עמדה.',
    processCriteriaHe: [
      'משווה את התצפית לכלל חדירה שנקבע מראש.',
      'מפריד שינוי שיפוע משינוי מגמה מלא.',
    ],
  },
];
