import {
  previewPositionManagementIntent,
  selectPositionManagementSnapshot,
  type OhlcvCandle,
  type PositionManagementDebrief,
  type PositionManagementEvent,
  type PositionManagementDecisionBasis,
  type PositionManagementEvidenceTag,
  type PositionManagementMaterialIntent,
  type PositionManagementRiskCode,
  type PositionManagementSession,
  type PaperExecutionSession,
} from '@chartpath/domain';
import {
  resolveScenarioPositionManagementAuthority,
  type ScenarioPositionManagementAuthorityResolution,
  type ScenarioPositionManagementUnavailableReason,
} from '@chartpath/content';

import type { ExecutionChartOverlay } from '@/components/ohlcv-chart';

export type PositionManagementAvailability =
  | {
      readonly status: 'enabled';
      readonly binding: Extract<
        ScenarioPositionManagementAuthorityResolution,
        { status: 'enabled' }
      >;
    }
  | {
      readonly status: 'unavailable';
      readonly reason: ScenarioPositionManagementUnavailableReason;
      readonly messageHe: string;
    };

const unavailableMessages: Readonly<Record<ScenarioPositionManagementUnavailableReason, string>> = {
  'scenario-disabled': 'ניהול פוזיציה אינו מופעל בזהות התרחיש הזאת.',
  'unfilled-entry': 'לא נפתחה פוזיציה ולכן אין מה להעביר לניהול.',
  'no-trade': 'מסקנת ״אין עסקה״ אינה חושפת מכניקת ניהול היפותטית במסלול הרגיל.',
  'unknown-scenario': 'לא נמצאה הרשאת ניהול מוצמדת לזהות התרחיש המדויקת.',
  'credit-mismatch': 'הרשאת הניהול אינה תואמת לסיווג הקרדיט המוצמד לסשן.',
};

/** Fail-closed binding between an immutable paper handoff and authored scenario authority. */
export function resolvePositionManagementAvailability(
  paper: PaperExecutionSession,
): PositionManagementAvailability {
  const resolved = resolveScenarioPositionManagementAuthority({
    scenarioId: paper.source.scenarioId,
    scenarioVersion: paper.source.scenarioVersion,
    learningCredit: paper.source.learningCredit,
  });
  return resolved.status === 'enabled'
    ? { status: 'enabled', binding: resolved }
    : {
        status: 'unavailable',
        reason: resolved.reason,
        messageHe: unavailableMessages[resolved.reason],
      };
}

/**
 * Cutoff-safe presentation contracts for the position-management screen.
 *
 * Authoritative quantities, prices, risk, costs, eligibility and assessment are produced by the
 * pure domain aggregate. Mobile components consume already-derived display values and never
 * reproduce management accounting or execution timing.
 */
export type PositionManagementActionKind =
  'full-exit' | 'partial-exit' | 'scale-in' | 'replace-stop' | 'replace-target' | 'journal-only';

export interface PositionManagementMetricView {
  readonly id: string;
  readonly labelHe: string;
  readonly valueLtr: string;
  readonly detailHe?: string;
}

export interface PositionManagementSummaryView {
  readonly statusHe: string;
  readonly statusTone: 'neutral' | 'warning' | 'success';
  readonly metrics: readonly PositionManagementMetricView[];
  readonly disclosureHe: string;
}

export interface PositionManagementDraftView {
  readonly draftId: string;
  readonly kind: PositionManagementActionKind;
  readonly quantity?: string;
  readonly price?: string;
  readonly rationale: string;
  readonly decisionBasis: PositionManagementDecisionBasis;
  readonly riskReviewed: boolean;
  readonly evidenceTags: readonly PositionManagementEvidenceTag[];
  readonly correctsEntryId?: string;
}

export interface PositionManagementComparisonView {
  readonly id: string;
  readonly labelHe: string;
  readonly beforeLtr: string;
  readonly afterLtr: string;
}

export interface PositionManagementPreviewView {
  readonly comparisons: readonly PositionManagementComparisonView[];
  readonly hardErrorsHe: readonly string[];
  readonly softWarningsHe: readonly string[];
  readonly timingHe: string;
}

export type PositionManagementIntentParseResult =
  | { readonly ok: true; readonly intent: PositionManagementMaterialIntent }
  | { readonly ok: false; readonly messageHe: string };

export interface PendingPositionManagementActionView {
  readonly actionId: string;
  readonly actionHe: string;
  readonly submittedAfterCandleLtr: string;
  readonly firstEligibleCandleLtr: string;
  readonly cancellable: boolean;
}

export interface ManagementJournalEntryView {
  readonly entryId: string;
  readonly sequenceLtr: string;
  readonly candleLtr: string;
  readonly typeHe: string;
  readonly rationaleHe: string;
  readonly tagsHe: readonly string[];
  readonly correctionOfLtr?: string;
  readonly correctable: boolean;
}

export interface ManagementTimelineEntryView {
  readonly eventId: string;
  readonly sequenceLtr: string;
  readonly candleLtr?: string;
  readonly occurredAtLtr: string;
  readonly titleHe: string;
  readonly detailHe?: string;
  readonly numericDetailLtr?: string;
}

export interface ManagementDebriefAssessmentView {
  readonly id: string;
  readonly labelHe: string;
  readonly resultHe: string;
  readonly tone: 'neutral' | 'warning';
}

export interface PositionManagementDebriefView {
  readonly processQualityHe: string;
  readonly assessments: readonly ManagementDebriefAssessmentView[];
  readonly accounting: readonly PositionManagementMetricView[];
  readonly assumptionsHe: readonly string[];
  readonly ambiguous: boolean;
}

export const positionManagementActionLabels: Readonly<
  Record<PositionManagementActionKind, string>
> = {
  'full-exit': 'סגירת כל היתרה',
  'partial-exit': 'הפחתת כמות',
  'scale-in': 'הוספת כמות',
  'replace-stop': 'החלפת סטופ',
  'replace-target': 'החלפת יעד',
  'journal-only': 'תצפית ביומן',
};

export const managementDecisionBasisLabels: Readonly<
  Record<PositionManagementDecisionBasis, string>
> = {
  'predefined-plan': 'כלל שנכתב בתכנית המקורית',
  'new-visible-evidence': 'ראיה חדשה שנראית בנרות הגלויים',
  'risk-reduction': 'צמצום סיכון מתועד',
  'outcome-chasing': 'תגובה לתוצאה המדומה',
  'future-information': 'מידע שלא היה גלוי בנקודת ההחלטה',
};

export const managementEvidenceTagLabels: Readonly<Record<PositionManagementEvidenceTag, string>> =
  {
    'predefined-plan': 'תכנית שנקבעה מראש',
    'visible-price-evidence': 'ראיית מחיר גלויה',
    'structural-change': 'שינוי מבני',
    'risk-budget': 'תקציב סיכון',
    'invalidation-rule': 'כלל ביטול',
    'target-rule': 'כלל יעד',
    'voluntary-exit-rule': 'כלל יציאה יזומה',
    'execution-costs': 'עלויות ביצוע',
    'uncertainty-recorded': 'אי־ודאות מתועדת',
  };

export function positionManagementDraftView(
  session: PositionManagementSession,
  fallbackKind: PositionManagementActionKind = 'partial-exit',
): PositionManagementDraftView {
  const draft = session.draft;
  if (!draft) {
    return {
      draftId: `management-draft:${session.sessionId}`,
      kind: fallbackKind,
      quantity: '1',
      rationale: '',
      decisionBasis: 'new-visible-evidence',
      riskReviewed: false,
      evidenceTags: [],
    };
  }
  return {
    draftId: draft.draftId,
    kind: draft.intent.kind,
    ...(draft.intent.kind === 'partial-exit' || draft.intent.kind === 'scale-in'
      ? { quantity: String(draft.intent.quantityUnits) }
      : {}),
    ...(draft.intent.kind === 'replace-stop' || draft.intent.kind === 'replace-target'
      ? { price: draft.intent.price.toFixed(session.currencyDecimals) }
      : {}),
    rationale: draft.rationale,
    decisionBasis: draft.processEvidence.decisionBasis,
    riskReviewed: draft.processEvidence.riskReviewed,
    evidenceTags: [...draft.processEvidence.evidenceTags],
  };
}

export function parsePositionManagementIntent(
  draft: PositionManagementDraftView,
  lastVisibleClose: number,
): PositionManagementIntentParseResult {
  if (draft.kind === 'journal-only')
    return { ok: false, messageHe: 'תצפית ביומן אינה פעולת מחיר.' };
  if (draft.kind === 'full-exit') return { ok: true, intent: { kind: 'full-exit' } };
  if (draft.kind === 'partial-exit' || draft.kind === 'scale-in') {
    const quantity = Number(draft.quantity?.trim());
    if (!Number.isSafeInteger(quantity) || quantity <= 0)
      return { ok: false, messageHe: 'הכמות חייבת להיות מספר שלם וחיובי.' };
    return draft.kind === 'partial-exit'
      ? { ok: true, intent: { kind: 'partial-exit', quantityUnits: quantity } }
      : {
          ok: true,
          intent: {
            kind: 'scale-in',
            quantityUnits: quantity,
            estimatedEntryPrice: lastVisibleClose,
          },
        };
  }
  const level = Number(draft.price?.trim().replace(',', '.'));
  if (!Number.isFinite(level) || level <= 0)
    return { ok: false, messageHe: 'רמת המחיר חייבת להיות מספר חיובי וסופי.' };
  return {
    ok: true,
    intent:
      draft.kind === 'replace-stop'
        ? { kind: 'replace-stop', price: level }
        : { kind: 'replace-target', price: level },
  };
}

const riskLabels: Readonly<Record<PositionManagementRiskCode, string>> = {
  PROJECTED_RISK_EXCEEDS_ORIGINAL_1R: 'הסיכון החזוי גבוה מן הסיכון המקורי שנקבע כ־1R.',
  PROJECTED_RISK_EXCEEDS_HARD_LIMIT: 'הפעולה חורגת מגבול הסיכון הקשיח של התרחיש.',
  SCALE_IN_EXCEEDS_QUANTITY_LIMIT: 'הכמות לאחר ההוספה חורגת מגבול הכמות של התרחיש.',
};

const eventLabels: Readonly<Record<PositionManagementEvent['type'], string>> = {
  'management-session-created': 'הפוזיציה הועברה לניהול',
  'management-draft-edited': 'טיוטת פעולת הניהול נשמרה',
  'management-action-submitted': 'פעולת ניהול הוגשה',
  'management-action-cancelled': 'פעולת הניהול הממתינה בוטלה',
  'management-action-risk-rejected': 'פעולת הניהול נדחתה בגבול סיכון קשיח',
  'protective-stop-replaced': 'הסטופ הפעיל הוחלף',
  'target-replaced': 'היעד הפעיל הוחלף',
  'voluntary-exit-filled': 'יציאה יזומה בוצעה',
  'scale-in-filled': 'הוספת כמות בוצעה',
  'position-closed-stop': 'הפוזיציה נסגרה בסטופ',
  'position-closed-target': 'הפוזיציה נסגרה ביעד',
  'position-management-ambiguous': 'סדר אירועי הניהול עמום',
  'management-observation-recorded': 'תצפית נוספה ליומן',
  'management-journal-corrected': 'תיקון נוסף ליומן',
  'position-open-at-replay-end': 'ה־Replay הסתיים עם פוזיציה פתוחה',
};

const assessmentLabels: Readonly<
  Record<PositionManagementDebrief['processAssessment'][number]['id'], string>
> = {
  'original-risk-frozen': 'יחידת הסיכון המקורית נשמרה ללא שינוי',
  'material-rationale-recorded': 'נימוק נרשם לפני כל פעולה מהותית',
  'risk-warnings-acknowledged': 'אזהרות סיכון אושרו במפורש',
  'future-evidence-excluded': 'הפעולות הסתמכו רק על נרות גלויים',
  'journal-history-preserved': 'היסטוריית היומן נשמרה כתוספות בלבד',
  'outcome-not-used-for-process-grade': 'הרווח או ההפסד לא שימשו כציון התהליך',
};

function formatMinor(value: number, decimals: number): string {
  const sign = value < 0 ? '-' : '';
  const digits = String(Math.abs(value)).padStart(decimals + 1, '0');
  if (decimals === 0) return `${sign}${digits}`;
  return `${sign}${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}

function formatWeightedAverage(
  numeratorMinorUnits: number,
  denominatorUnits: number,
  decimals: number,
): string {
  if (denominatorUnits === 0) return '—';
  return `≈ ${formatMinor(Math.round(numeratorMinorUnits / denominatorUnits), decimals)}`;
}

function positionStatusHe(
  session: PositionManagementSession,
): PositionManagementSummaryView['statusHe'] {
  switch (session.status) {
    case 'active':
      return session.pendingAction ? 'פעולת ניהול ממתינה' : 'פתוחה';
    case 'closed-voluntary':
      return 'נסגרה ביציאה יזומה';
    case 'closed-stop':
      return 'נסגרה בסטופ';
    case 'closed-target':
      return 'נסגרה ביעד';
    case 'ambiguous':
      return 'תוצאה עמומה';
    case 'completed-open':
      return 'ה־Replay הסתיים כשהפוזיציה פתוחה';
  }
}

export function buildPositionManagementSummary(
  session: PositionManagementSession,
  lastVisibleCandle: OhlcvCandle,
): PositionManagementSummaryView {
  const snapshot = selectPositionManagementSnapshot(session, lastVisibleCandle);
  return {
    statusHe: positionStatusHe(session),
    statusTone:
      session.status === 'active'
        ? session.pendingAction
          ? 'warning'
          : 'success'
        : session.status === 'ambiguous'
          ? 'warning'
          : 'neutral',
    metrics: [
      {
        id: 'quantity',
        labelHe: 'הכמות הנוכחית',
        valueLtr: `${snapshot.openQuantityUnits} units`,
      },
      {
        id: 'average-entry',
        labelHe: 'מחיר כניסה ממוצע',
        valueLtr: formatWeightedAverage(
          snapshot.weightedAverageEntryNumeratorMinorUnits,
          snapshot.weightedAverageEntryDenominatorUnits,
          session.currencyDecimals,
        ),
      },
      {
        id: 'stop',
        labelHe: 'סטופ נוכחי',
        valueLtr: formatMinor(snapshot.activeProtectiveStopMinor, session.currencyDecimals),
      },
      {
        id: 'target',
        labelHe: 'יעד נוכחי',
        valueLtr: formatMinor(snapshot.activeTargetMinor, session.currencyDecimals),
      },
      {
        id: 'original-risk',
        labelHe: 'סיכון מקורי (1R)',
        valueLtr: formatMinor(snapshot.originalRiskMinor, session.currencyDecimals),
      },
      {
        id: 'current-risk',
        labelHe: 'סיכון נוכחי',
        valueLtr: formatMinor(snapshot.currentRiskMinor, session.currencyDecimals),
      },
      {
        id: 'commission',
        labelHe: 'עמלות מדומות',
        valueLtr: formatMinor(snapshot.totalCommissionMinor, session.currencyDecimals),
        detailHe: 'לפי מודל העמלות המוצמד בלבד',
      },
      {
        id: 'modeled-execution-cost',
        labelHe: 'עלויות ביצוע מדומות',
        valueLtr: formatMinor(snapshot.totalModeledExecutionCostMinor, session.currencyDecimals),
        detailHe: 'לפי הנחות המרווח וההחלקה המוצמדות',
      },
      {
        id: 'realized',
        labelHe: 'תוצאה ממומשת מדומה',
        valueLtr: formatMinor(snapshot.realizedNetMinor, session.currencyDecimals),
      },
      {
        id: 'unrealized',
        labelHe: 'תוצאה לא ממומשת לפי הסגירה הגלויה',
        valueLtr: formatMinor(snapshot.unrealizedAtCloseGrossMinor, session.currencyDecimals),
      },
    ],
    disclosureHe:
      'המספרים נגזרים מן הנר הגלוי האחרון ומהנחות הסימולטור. הם אינם שווי חשבון אמיתי ואינם הציון החינוכי.',
  };
}

export function buildPositionManagementPreview(
  session: PositionManagementSession,
  intent: PositionManagementMaterialIntent,
): PositionManagementPreviewView {
  const preview = previewPositionManagementIntent(session, intent);
  const comparisons: PositionManagementComparisonView[] = [
    {
      id: 'quantity',
      labelHe: 'כמות פתוחה',
      beforeLtr: `${preview.beforeOpenQuantityUnits}`,
      afterLtr: `${preview.afterOpenQuantityUnits}`,
    },
    {
      id: 'average-entry',
      labelHe: 'מחיר כניסה ממוצע',
      beforeLtr: formatWeightedAverage(
        preview.beforeWeightedAverageEntryNumeratorMinorUnits,
        preview.beforeWeightedAverageEntryDenominatorUnits,
        session.currencyDecimals,
      ),
      afterLtr: formatWeightedAverage(
        preview.afterWeightedAverageEntryNumeratorMinorUnits,
        preview.afterWeightedAverageEntryDenominatorUnits,
        session.currencyDecimals,
      ),
    },
    {
      id: 'projected-risk',
      labelHe: 'סיכון חזוי לאחר הפעולה',
      beforeLtr: formatMinor(preview.riskAssessment.originalRiskMinor, session.currencyDecimals),
      afterLtr: formatMinor(preview.riskAssessment.projectedRiskMinor, session.currencyDecimals),
    },
    {
      id: 'additional-commission',
      labelHe: 'עמלה נוספת משוערת',
      beforeLtr: '0.00',
      afterLtr: formatMinor(preview.estimatedAdditionalCommissionMinor, session.currencyDecimals),
    },
    {
      id: 'additional-modeled-cost',
      labelHe: 'עלות ביצוע נוספת משוערת',
      beforeLtr: '0.00',
      afterLtr: formatMinor(
        preview.estimatedAdditionalModeledExecutionCostMinor,
        session.currencyDecimals,
      ),
    },
  ];
  return {
    comparisons,
    hardErrorsHe: preview.riskAssessment.hardRejectionCodes.map((code) => riskLabels[code]),
    softWarningsHe: preview.riskAssessment.warningCodes.map((code) => riskLabels[code]),
    timingHe: `הפעולה נכתבת לאחר נר ${session.lastProcessedCandleIndex + 1} ותהיה זכאית רק בנר הבא.`,
  };
}

export function buildPendingPositionManagementAction(
  session: PositionManagementSession,
): PendingPositionManagementActionView | undefined {
  const pending = session.pendingAction;
  if (!pending) return undefined;
  const detail =
    pending.intent.kind === 'partial-exit' || pending.intent.kind === 'scale-in'
      ? ` · ${pending.intent.quantityUnits} יחידות`
      : pending.intent.kind === 'replace-stop' || pending.intent.kind === 'replace-target'
        ? ` · ${pending.intent.price.toFixed(session.currencyDecimals)}`
        : '';
  return {
    actionId: pending.submissionId,
    actionHe: `${positionManagementActionLabels[pending.intent.kind]}${detail}`,
    submittedAfterCandleLtr: String(pending.submittedAtCandleIndex + 1),
    firstEligibleCandleLtr: String(pending.eligibleCandleIndex + 1),
    cancellable: pending.eligibleCandleIndex > session.lastProcessedCandleIndex,
  };
}

export function buildManagementJournalEntries(
  session: PositionManagementSession,
): readonly ManagementJournalEntryView[] {
  return session.journal.map((entry, index) => ({
    entryId: entry.entryId,
    sequenceLtr: String(index + 1),
    candleLtr:
      entry.kind === 'observation' || entry.kind === 'action-rationale'
        ? String(entry.candleIndex + 1)
        : String(session.lastProcessedCandleIndex + 1),
    typeHe:
      entry.kind === 'observation'
        ? 'תצפית'
        : entry.kind === 'action-rationale'
          ? 'נימוק לפעולת ניהול'
          : 'תיקון',
    rationaleHe: entry.text,
    tagsHe: entry.evidenceTags.map((tag) => managementEvidenceTagLabels[tag]),
    ...(entry.kind === 'correction' ? { correctionOfLtr: entry.correctsEntryId } : {}),
    correctable: session.status === 'active',
  }));
}

function eventNumericDetail(event: PositionManagementEvent, decimals: number): string | undefined {
  if ('fill' in event) {
    return `${formatMinor(event.fill.priceMinor, decimals)} · ${event.fill.quantityUnits} units`;
  }
  if (event.type === 'protective-stop-replaced' || event.type === 'target-replaced') {
    return `${event.previousPriceTicks} ticks → ${event.priceTicks} ticks`;
  }
  return undefined;
}

export function buildManagementTimeline(
  session: PositionManagementSession,
): readonly ManagementTimelineEntryView[] {
  return session.events.map((event) => ({
    eventId: event.eventId,
    sequenceLtr: String(event.sequence),
    ...(event.candleIndex === undefined ? {} : { candleLtr: String(event.candleIndex + 1) }),
    occurredAtLtr: event.occurredAt,
    titleHe: eventLabels[event.type],
    ...(event.type === 'position-management-ambiguous'
      ? {
          detailHe:
            event.reason === 'stop-and-target-same-candle'
              ? 'הסטופ והיעד נגעו באותו נר ואין סדר תוך־נרי אמין.'
              : 'פעולה יזומה וסף פתיחה התנגשו בלי סדר אמין.',
        }
      : {}),
    ...(eventNumericDetail(event, session.currencyDecimals) === undefined
      ? {}
      : { numericDetailLtr: eventNumericDetail(event, session.currencyDecimals)! }),
  }));
}

export function buildManagementDebrief(
  session: PositionManagementSession,
): PositionManagementDebriefView | undefined {
  const debrief = session.debrief;
  if (!debrief) return undefined;
  return {
    processQualityHe:
      debrief.processQuality === 'coherent'
        ? 'הנימוקים, האזהרות וגבולות הראיה נשמרו באופן עקבי.'
        : debrief.processQuality === 'mixed'
          ? 'חלק מתהליך הניהול דורש בדיקה נוספת.'
          : 'נדרשת חזרה על תיעוד הנימוקים ואזהרות הסיכון.',
    assessments: debrief.processAssessment.map((assessment) => ({
      id: assessment.id,
      labelHe: assessmentLabels[assessment.id],
      resultHe:
        assessment.result === 'met'
          ? 'תועד'
          : assessment.result === 'review'
            ? 'לבדיקה'
            : 'לא נשמר',
      tone: assessment.result === 'met' ? 'neutral' : 'warning',
    })),
    accounting: [
      {
        id: 'original-risk',
        labelHe: 'סיכון מקורי (1R)',
        valueLtr: formatMinor(debrief.originalRiskMinor, session.currencyDecimals),
      },
      {
        id: 'gross-realized',
        labelHe: 'תוצאה ממומשת ברוטו',
        valueLtr: formatMinor(debrief.grossRealizedMinor, session.currencyDecimals),
      },
      {
        id: 'net-realized',
        labelHe: 'תוצאה ממומשת נטו לפי המודל',
        valueLtr: formatMinor(debrief.realizedNetMinor, session.currencyDecimals),
      },
      {
        id: 'remaining-quantity',
        labelHe: 'כמות שנותרה בסיום',
        valueLtr: `${debrief.finalOpenQuantityUnits} units`,
      },
    ],
    assumptionsHe: [...debrief.assumptionCodes],
    ambiguous: debrief.outcome === 'ambiguous',
  };
}

function minorToPrice(minor: number, decimals: number): number {
  return minor / 10 ** decimals;
}

/** Produces rationale-free chart marks from immutable management events. */
export function buildPositionManagementOverlays(
  session: PositionManagementSession,
  includeHistorical: boolean,
): readonly ExecutionChartOverlay[] {
  const position = session.handoff.position!;
  const openedAt = position.openedAtCandleIndex;
  const currentStop = minorToPrice(
    session.activeProtectiveStopTicks * session.priceTickMinor,
    session.currencyDecimals,
  );
  const currentTarget = minorToPrice(
    session.activeTargetTicks * session.priceTickMinor,
    session.currencyDecimals,
  );
  const stopReplacements = session.events.filter(
    (event): event is Extract<PositionManagementEvent, { type: 'protective-stop-replaced' }> =>
      event.type === 'protective-stop-replaced',
  );
  const targetReplacements = session.events.filter(
    (event): event is Extract<PositionManagementEvent, { type: 'target-replaced' }> =>
      event.type === 'target-replaced',
  );
  const currentStopFrom = stopReplacements.at(-1)?.candleIndex ?? openedAt;
  const currentTargetFrom = targetReplacements.at(-1)?.candleIndex ?? openedAt;
  const overlays: ExecutionChartOverlay[] = [];
  if (includeHistorical) {
    overlays.push(
      {
        id: `${session.sessionId}:original-stop`,
        kind: 'original-stop',
        labelHe: `סטופ מקורי ${position.protectiveStopPrice.toFixed(session.currencyDecimals)}`,
        price: position.protectiveStopPrice,
        visibleFromCandleIndex: openedAt,
        ...(stopReplacements[0]?.candleIndex === undefined
          ? {}
          : { visibleUntilCandleIndex: stopReplacements[0].candleIndex - 1 }),
      },
      {
        id: `${session.sessionId}:original-target`,
        kind: 'original-target',
        labelHe: `יעד מקורי ${position.targetPrice.toFixed(session.currencyDecimals)}`,
        price: position.targetPrice,
        visibleFromCandleIndex: openedAt,
        ...(targetReplacements[0]?.candleIndex === undefined
          ? {}
          : { visibleUntilCandleIndex: targetReplacements[0].candleIndex - 1 }),
      },
    );
    stopReplacements.slice(0, -1).forEach((event, index) => {
      overlays.push({
        id: `${session.sessionId}:replaced-stop:${event.eventId}`,
        kind: 'replaced-stop',
        labelHe: `סטופ קודם ${minorToPrice(event.priceTicks * session.priceTickMinor, session.currencyDecimals).toFixed(session.currencyDecimals)}`,
        price: minorToPrice(event.priceTicks * session.priceTickMinor, session.currencyDecimals),
        visibleFromCandleIndex: event.candleIndex!,
        visibleUntilCandleIndex: stopReplacements[index + 1]!.candleIndex! - 1,
      });
    });
    targetReplacements.slice(0, -1).forEach((event, index) => {
      overlays.push({
        id: `${session.sessionId}:replaced-target:${event.eventId}`,
        kind: 'replaced-target',
        labelHe: `יעד קודם ${minorToPrice(event.priceTicks * session.priceTickMinor, session.currencyDecimals).toFixed(session.currencyDecimals)}`,
        price: minorToPrice(event.priceTicks * session.priceTickMinor, session.currencyDecimals),
        visibleFromCandleIndex: event.candleIndex!,
        visibleUntilCandleIndex: targetReplacements[index + 1]!.candleIndex! - 1,
      });
    });
  }
  overlays.push(
    {
      id: `${session.sessionId}:current-stop`,
      kind: 'current-stop',
      labelHe: `סטופ פעיל ${currentStop.toFixed(session.currencyDecimals)}`,
      price: currentStop,
      visibleFromCandleIndex: currentStopFrom,
    },
    {
      id: `${session.sessionId}:current-target`,
      kind: 'current-target',
      labelHe: `יעד פעיל ${currentTarget.toFixed(session.currencyDecimals)}`,
      price: currentTarget,
      visibleFromCandleIndex: currentTargetFrom,
    },
  );
  const pending = session.pendingAction;
  if (pending?.intent.kind === 'replace-stop' || pending?.intent.kind === 'replace-target') {
    overlays.push({
      id: `${session.sessionId}:pending:${pending.submissionId}`,
      kind: pending.intent.kind === 'replace-stop' ? 'pending-stop' : 'pending-target',
      labelHe: `${pending.intent.kind === 'replace-stop' ? 'סטופ ממתין' : 'יעד ממתין'} ${pending.intent.price.toFixed(session.currencyDecimals)}`,
      price: pending.intent.price,
      visibleFromCandleIndex: pending.submittedAtCandleIndex,
    });
  }
  for (const event of session.events) {
    if (event.type === 'scale-in-filled') {
      overlays.push({
        id: event.fillId,
        kind: 'added-fill',
        labelHe: `מילוי הוספה ${formatMinor(event.fill.priceMinor, session.currencyDecimals)}`,
        price: minorToPrice(event.fill.priceMinor, session.currencyDecimals),
        candleIndex: event.fill.candleIndex,
        visibleFromCandleIndex: event.fill.candleIndex,
      });
    } else if (event.type === 'voluntary-exit-filled') {
      const submission = session.events.find(
        (candidate) =>
          candidate.type === 'management-action-submitted' &&
          candidate.submissionId === event.submissionId,
      );
      const full =
        submission?.type === 'management-action-submitted' &&
        submission.intent.kind === 'full-exit';
      overlays.push({
        id: event.fillId,
        kind: full ? 'full-exit' : 'partial-exit',
        labelHe: `${full ? 'יציאה מלאה' : 'יציאה חלקית'} ${formatMinor(event.fill.priceMinor, session.currencyDecimals)}`,
        price: minorToPrice(event.fill.priceMinor, session.currencyDecimals),
        candleIndex: event.fill.candleIndex,
        visibleFromCandleIndex: event.fill.candleIndex,
      });
    } else if (event.type === 'management-observation-recorded') {
      const candleIndex = event.candleIndex ?? session.lastProcessedCandleIndex;
      overlays.push({
        id: event.entryId,
        kind: 'journal-marker',
        labelHe: 'החלטת יומן',
        price: minorToPrice(session.lots[0]?.entryPriceMinor ?? 0, session.currencyDecimals),
        candleIndex,
        visibleFromCandleIndex: candleIndex,
      });
    } else if (event.type === 'position-closed-stop' || event.type === 'position-closed-target') {
      overlays.push({
        id: event.fillId,
        kind: 'full-exit',
        labelHe: `${event.type === 'position-closed-stop' ? 'יציאה בסטופ' : 'יציאה ביעד'} ${formatMinor(event.fill.priceMinor, session.currencyDecimals)}`,
        price: minorToPrice(event.fill.priceMinor, session.currencyDecimals),
        candleIndex: event.fill.candleIndex,
        visibleFromCandleIndex: event.fill.candleIndex,
      });
    } else if (event.type === 'position-management-ambiguous') {
      const candleIndex = event.candleIndex ?? session.lastProcessedCandleIndex;
      overlays.push({
        id: event.eventId,
        kind: 'ambiguous',
        labelHe: 'סדר אירועי הניהול אינו ניתן לקביעה מנתוני OHLCV',
        candleIndex,
        relevantPrices: [currentStop, currentTarget],
        visibleFromCandleIndex: candleIndex,
      });
    }
  }
  return overlays;
}
