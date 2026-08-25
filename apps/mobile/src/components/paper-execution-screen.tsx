import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';

import {
  createTradePlan,
  type EntryOrderType,
  type ExecutionEvent,
  type GeneratedChart,
  type PaperExecutionSession,
  type ProcessAssessmentItem,
  type TradePlanInput,
  type TradePlanValidationCode,
} from '@chartpath/domain';
import {
  Badge,
  Button,
  Card,
  Heading,
  LtrText,
  Screen,
  UiText,
  useReducedMotion,
  useTheme,
} from '@chartpath/ui';

import { ErrorState, LoadingState } from './app-state';
import { OhlcvChart, type ExecutionChartOverlay } from './ohlcv-chart';
import { TopBar } from './top-bar';
import {
  resolvePaperExecutionAnalysisSession,
  resolvePaperExecutionSession,
  type PaperExecutionAccessMode,
  type PaperExecutionReady,
} from '@/data/paper-execution';
import { useLearning } from '@/state/learning';

type NumericField = 'entry' | 'stop' | 'target' | 'account' | 'risk' | 'quantity';

interface TicketFields {
  readonly orderType: EntryOrderType;
  readonly entry: string;
  readonly stop: string;
  readonly target: string;
  readonly account: string;
  readonly risk: string;
  readonly quantity: string;
}

const issueLabels: Readonly<Record<TradePlanValidationCode, string>> = {
  DIRECTION_NOT_PERMITTED: 'כיוון התכנית אינו מותר בתרחיש הזה.',
  ORDER_TYPE_NOT_PERMITTED: 'סוג ההוראה אינו מותר בתרחיש הזה.',
  ENTRY_PRICE_MUST_BE_POSITIVE: 'מחיר הכניסה חייב להיות מספר חיובי.',
  ENTRY_PRICE_TICK_MISMATCH: 'מחיר הכניסה חייב להתאים לקפיצת המחיר של הסימולטור.',
  STOP_PRICE_MUST_BE_POSITIVE: 'מחיר העצירה חייב להיות מספר חיובי.',
  STOP_PRICE_TICK_MISMATCH: 'מחיר העצירה חייב להתאים לקפיצת המחיר של הסימולטור.',
  TARGET_PRICE_MUST_BE_POSITIVE: 'מחיר היעד חייב להיות מספר חיובי.',
  TARGET_PRICE_TICK_MISMATCH: 'מחיר היעד חייב להתאים לקפיצת המחיר של הסימולטור.',
  LONG_STOP_MUST_BE_BELOW_ENTRY: 'בתכנית לונג העצירה חייבת להיות מתחת לכניסה.',
  LONG_TARGET_MUST_BE_ABOVE_ENTRY: 'בתכנית לונג היעד חייב להיות מעל הכניסה.',
  SHORT_STOP_MUST_BE_ABOVE_ENTRY: 'בתרגול שורט העצירה חייבת להיות מעל הכניסה.',
  SHORT_TARGET_MUST_BE_BELOW_ENTRY: 'בתרגול שורט היעד חייב להיות מתחת לכניסה.',
  STOP_DISTANCE_MUST_BE_POSITIVE: 'מרחק הכניסה–עצירה חייב להיות גדול מאפס.',
  ACCOUNT_VALUE_MUST_BE_POSITIVE: 'שווי החשבון הדמיוני חייב להיות חיובי.',
  RISK_BUDGET_MUST_BE_POSITIVE: 'תקציב הסיכון לתרגיל חייב להיות חיובי.',
  RISK_BUDGET_EXCEEDS_ACCOUNT_VALUE: 'תקציב הסיכון גדול משווי החשבון הדמיוני.',
  QUANTITY_MUST_BE_POSITIVE: 'הכמות חייבת להיות מספר חיובי.',
  QUANTITY_INCREMENT_MISMATCH: 'הכמות חייבת להיות במספר יחידות שלמות.',
  ESTIMATED_RISK_EXCEEDS_BUDGET: 'הכמות חורגת מתקציב הסיכון לפי מודל העלויות.',
  PLAN_USES_FUTURE_CANDLE: 'התכנית מסתמכת על נר שלא היה גלוי בנקודת ההחלטה.',
  ANALYSIS_DID_NOT_SUPPORT_TRADE: 'הניתוח שנבדק הסתיים ב״אין עסקה״.',
  PLAN_DIRECTION_DIFFERS_FROM_ANALYSIS: 'הכיוון אינו תואם את מסקנת הניתוח.',
  ANALYSIS_REASONING_BYPASSED: 'חלק מן ההנמקה הנדרשת לא נשמר בתכנית.',
  DEVELOPMENT_SCENARIO_NO_COURSE_CREDIT: 'זהו תרחיש פיתוח ללא קרדיט למידה רגיל.',
};

const orderLabels: Readonly<Record<EntryOrderType, string>> = {
  market: 'שוק',
  limit: 'לימיט',
  stop: 'סטופ',
};

const eventLabels: Readonly<Record<ExecutionEvent['type'], string>> = {
  'session-created': 'נוצרה טיוטת ביצוע',
  'plan-replaced': 'התכנית נשמרה מחדש',
  'order-rejected': 'ההוראה נדחתה',
  'order-submitted': 'ההוראה הוגשה',
  'order-working': 'ההוראה ממתינה לביצוע',
  'order-filled': 'ההוראה מולאה',
  'position-opened': 'נפתחה פוזיציה מדומה',
  'position-closed-stop': 'הפוזיציה נסגרה בעצירה',
  'position-closed-target': 'הפוזיציה נסגרה ביעד',
  'execution-ambiguous': 'סדר האירועים אינו ניתן לקביעה',
  'order-cancelled': 'ההוראה בוטלה',
  'order-expired': 'ההוראה פגה בסוף ה־Replay',
  'execution-abandoned': 'סימולציית הביצוע הופסקה במפורש',
};

const assessmentLabels: Readonly<Record<ProcessAssessmentItem['id'], string>> = {
  'analysis-completed': 'הניתוח הושלם לפני התכנית',
  'direction-aligned': 'הכיוון נבדק מול מסקנת הניתוח',
  'entry-aligned': 'הכניסה תועדה בהתאם לניתוח',
  'invalidation-aligned': 'הביטול והעצירה נשמרו',
  'target-aligned': 'היעד נשמר כהערכה מותנית',
  'risk-calculable': 'הסיכון היה ניתן לחישוב מראש',
  'reasoning-preserved': 'ההנמקה הנדרשת לא נעקפה',
};

function numberValue(value: string): number {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function price(value: number): string {
  return value.toFixed(2);
}

function defaultFields(resolution: PaperExecutionReady): TicketFields {
  const reference = resolution.candles[resolution.source.decisionCandleIndex]?.close ?? 100;
  const direction = resolution.source.permittedDirections[0] ?? 'short';
  return {
    orderType: 'market',
    entry: price(reference),
    stop: price(
      direction === 'long'
        ? Math.floor(reference * 0.98 * 100) / 100
        : Math.ceil(reference * 1.02 * 100) / 100,
    ),
    target: price(
      direction === 'long'
        ? Math.ceil(reference * 1.03 * 100) / 100
        : Math.floor(reference * 0.97 * 100) / 100,
    ),
    account: '100000',
    risk: '600',
    quantity: '10',
  };
}

function fieldsFromSession(session: PaperExecutionSession): TicketFields {
  const entry =
    session.plan.entryIntent.type === 'market'
      ? session.plan.entryIntent.estimatedEntryPrice
      : session.plan.entryIntent.type === 'limit'
        ? session.plan.entryIntent.limitPrice
        : session.plan.entryIntent.triggerPrice;
  return {
    orderType: session.plan.entryIntent.type,
    entry: price(entry),
    stop: price(session.plan.protectiveStopPrice),
    target: price(session.plan.targetPrice),
    account: String(session.plan.fictionalAccountValue),
    risk: String(session.plan.intendedRiskAmount),
    quantity: String(session.plan.quantity),
  };
}

function planFromFields(
  fields: TicketFields,
  resolution: PaperExecutionReady,
  planId: string,
): TradePlanInput {
  const entry = numberValue(fields.entry);
  return {
    planId,
    direction: resolution.source.permittedDirections[0] ?? 'short',
    entryIntent:
      fields.orderType === 'market'
        ? { type: 'market', estimatedEntryPrice: entry }
        : fields.orderType === 'limit'
          ? { type: 'limit', limitPrice: entry }
          : { type: 'stop', triggerPrice: entry },
    protectiveStopPrice: numberValue(fields.stop),
    targetPrice: numberValue(fields.target),
    fictionalAccountValue: numberValue(fields.account),
    intendedRiskAmount: numberValue(fields.risk),
    quantity: numberValue(fields.quantity),
    authoredAtCandleIndex: resolution.source.decisionCandleIndex,
    processEvidence: resolution.analysisProcessEvidence,
  };
}

function chartAtCursor(resolution: PaperExecutionReady, cursor: number): GeneratedChart {
  const candles = resolution.candles.filter(({ index }) => index <= cursor);
  return {
    spec: {
      id: `paper:${resolution.source.scenarioId}`,
      seed: 0,
      generatorVersion: 'paper-execution-visible-prefix-v1',
      candleCount: candles.length,
      timeframe: '1H',
      scenario: 'ambiguous',
      basePrice: candles[0]?.open ?? 100,
      baseVolume: 1_000,
      volatility: 0,
      noise: 0,
      decisionCandleIndex: resolution.source.decisionCandleIndex,
    },
    candles,
    annotations: [],
  };
}

function overlaysFor(session: PaperExecutionSession): readonly ExecutionChartOverlay[] {
  const overlays: ExecutionChartOverlay[] = [
    {
      id: `${session.sessionId}:planned-entry`,
      kind: 'planned-entry',
      labelHe: `כניסה מתוכננת ${price(session.plan.plannedEntryPrice)}`,
      price: session.plan.plannedEntryPrice,
      visibleFromCandleIndex: session.source.decisionCandleIndex,
    },
    {
      id: `${session.sessionId}:stop`,
      kind: 'protective-stop',
      labelHe: `עצירה מגינה ${price(session.plan.protectiveStopPrice)}`,
      price: session.plan.protectiveStopPrice,
      visibleFromCandleIndex: session.source.decisionCandleIndex,
    },
    {
      id: `${session.sessionId}:target`,
      kind: 'target',
      labelHe: `יעד מותנה ${price(session.plan.targetPrice)}`,
      price: session.plan.targetPrice,
      visibleFromCandleIndex: session.source.decisionCandleIndex,
    },
  ];
  if (session.workingOrder?.status === 'working') {
    overlays.push({
      id: `${session.sessionId}:working`,
      kind: 'working-order',
      labelHe: `הוראת ${orderLabels[session.plan.entryIntent.type]} ממתינה`,
      price: session.plan.plannedEntryPrice,
      visibleFromCandleIndex: session.source.decisionCandleIndex,
    });
  }
  const entry = session.position?.entryFill ?? session.workingOrder?.fill;
  if (entry) {
    overlays.push({
      id: `${session.sessionId}:fill`,
      kind: 'fill',
      labelHe: `מילוי בפועל ${price(entry.price)}`,
      price: entry.price,
      candleIndex: entry.candleIndex,
      visibleFromCandleIndex: entry.candleIndex,
    });
  }
  if (session.position?.status === 'open') {
    overlays.push({
      id: `${session.sessionId}:position`,
      kind: 'open-position',
      labelHe: 'פוזיציה מדומה פתוחה',
      entryPrice: session.position.entryFill.price,
      startCandleIndex: session.position.openedAtCandleIndex,
      visibleFromCandleIndex: session.position.openedAtCandleIndex,
    });
  }
  if (session.position?.exitFill) {
    overlays.push({
      id: `${session.sessionId}:exit`,
      kind: 'exit',
      labelHe: `יציאה מדומה ${price(session.position.exitFill.price)}`,
      price: session.position.exitFill.price,
      candleIndex: session.position.exitFill.candleIndex,
      visibleFromCandleIndex: session.position.exitFill.candleIndex,
    });
  }
  if (session.position?.status === 'ambiguous') {
    overlays.push({
      id: `${session.sessionId}:ambiguous`,
      kind: 'ambiguous',
      labelHe: 'סדר העצירה והיעד אינו ידוע מנתוני OHLCV',
      candleIndex: session.position.closedAtCandleIndex ?? session.lastProcessedCandleIndex,
      relevantPrices: [session.position.protectiveStopPrice, session.position.targetPrice],
      visibleFromCandleIndex:
        session.position.closedAtCandleIndex ?? session.lastProcessedCandleIndex,
    });
  }
  return overlays;
}

function eventDetail(event: ExecutionEvent): string | undefined {
  if ('fill' in event) return `${price(event.fill.price)} · ${event.fill.quantity} יח׳`;
  if (event.type === 'execution-ambiguous') {
    return event.reason === 'stop-and-target-same-candle'
      ? 'העצירה והיעד נגעו באותו נר; סדר התנועה אינו ידוע.'
      : 'הכניסה והיציאה נגעו באותו נר; סדר התנועה אינו ידוע.';
  }
  return undefined;
}

function NumericInput({
  field,
  label,
  value,
  editable,
  onChange,
  onBlur,
}: {
  readonly field: NumericField;
  readonly label: string;
  readonly value: string;
  readonly editable: boolean;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexGrow: 1, gap: 6, minWidth: 150 }}>
      <UiText variant="label">{label}</UiText>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        keyboardType="decimal-pad"
        onBlur={onBlur}
        onChangeText={onChange}
        placeholder="0"
        placeholderTextColor={theme.colors.textMuted}
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          color: theme.colors.text,
          direction: 'ltr',
          fontSize: 18,
          fontVariant: ['tabular-nums'],
          minHeight: 52,
          paddingHorizontal: 12,
          textAlign: 'left',
          writingDirection: 'ltr',
        }}
        testID={`paper-input-${field}`}
        value={value}
      />
    </View>
  );
}

function ExecutionDebriefCard({ session }: { readonly session: PaperExecutionSession }) {
  const theme = useTheme();
  const debrief = session.debrief;
  if (!debrief) return null;
  return (
    <View style={{ gap: theme.spacing.md }} testID="paper-execution-debrief">
      <Card variant="accent">
        <View style={{ gap: theme.spacing.sm }}>
          <Badge tone="neutral">תחקיר תהליך — לא ציון רווח</Badge>
          <Heading level={2}>תחקיר ביצוע דטרמיניסטי</Heading>
          <UiText>
            {debrief.processQuality === 'coherent'
              ? 'התכנית נשמרה באופן עקבי לפי שדותיה.'
              : 'נדרשת חזרה על התאמת התכנית לניתוח ועל ההנמקה שנשמרה.'}
          </UiText>
          <UiText color="textMuted" variant="caption">
            התוצאה המדומה אינה משנה את ציון הניתוח ואינה מלמדת על תוצאה עתידית.
          </UiText>
        </View>
      </Card>

      <Card variant="outlined">
        <View style={{ gap: 8 }}>
          <Heading level={3}>איכות התהליך</Heading>
          {debrief.processAssessment.map((item) => (
            <View
              key={item.id}
              style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            >
              <Badge tone={item.result === 'met' ? 'neutral' : 'warning'}>
                {item.result === 'met' ? 'תועד' : item.result === 'review' ? 'לבדיקה' : 'לא תאם'}
              </Badge>
              <UiText style={{ flex: 1 }} variant="bodySmall">
                {assessmentLabels[item.id]}
              </UiText>
            </View>
          ))}
        </View>
      </Card>

      <Card variant="outlined">
        <View style={{ gap: 8 }}>
          <Heading level={3}>תכנית מול ביצוע</Heading>
          <LtrText variant="numeric">{`Entry ${price(debrief.entryPrice)}${debrief.exitPrice === undefined ? '' : ` · Exit ${price(debrief.exitPrice)}`}`}</LtrText>
          <LtrText color="textMuted" variant="numeric">
            {`Commissions ${price(debrief.totalCommissions)} · modeled spread/slippage ${price(debrief.modeledSpreadAndSlippage)}`}
          </LtrText>
          {debrief.riskMultiple !== undefined ? (
            <LtrText
              color="textMuted"
              variant="numeric"
            >{`R ${debrief.riskMultiple.toFixed(2)}`}</LtrText>
          ) : undefined}
          <UiText color="textMuted" variant="caption">
            המספרים הם תוצאת המודל בלבד. הם אינם P&amp;L של חשבון אמיתי ואינם הציון החינוכי.
          </UiText>
        </View>
      </Card>

      {debrief.outcome === 'ambiguous' ? (
        <Card testID="paper-execution-ambiguous" variant="outlined">
          <View style={{ gap: 8 }}>
            <Badge tone="warning">תוצאה עמומה</Badge>
            <Heading level={3}>אין רצף תוך־נרי אמין</Heading>
            <UiText>
              אותו נר נגע ביותר מסף רלוונטי. נתוני OHLCV אינם מגלים איזה מחיר הופיע קודם, ולכן
              הסימולטור לא בחר תוצאה רווחית או הפסדית.
            </UiText>
          </View>
        </Card>
      ) : undefined}
    </View>
  );
}

export function PaperExecutionScreen({
  analysisSessionId,
  accessMode = 'ordinary',
}: {
  readonly analysisSessionId: string;
  readonly accessMode?: PaperExecutionAccessMode;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const learning = useLearning();
  const [fields, setFields] = useState<TicketFields | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const createStarted = useRef(false);
  const hydratedExecutionId = useRef<string | null>(null);
  const draftSaveQueue = useRef<Promise<unknown>>(Promise.resolve());

  const analysis = learning.snapshot?.analysisSessions.find(
    ({ sessionId }) => sessionId === analysisSessionId,
  );
  const execution = learning.snapshot?.paperExecutionSessions.find(
    ({ source }) => source.analysisSessionId === analysisSessionId,
  );
  const analysisResolution = analysis
    ? resolvePaperExecutionAnalysisSession(analysis, undefined, { accessMode })
    : undefined;
  const resolution =
    execution && learning.snapshot
      ? resolvePaperExecutionSession(execution, learning.snapshot.analysisSessions, undefined, {
          accessMode,
        })
      : analysisResolution;

  useEffect(() => {
    if (!execution || hydratedExecutionId.current === execution.sessionId) return;
    hydratedExecutionId.current = execution.sessionId;
    setFields(fieldsFromSession(execution));
  }, [execution]);

  useEffect(() => {
    if (
      execution ||
      createStarted.current ||
      resolution?.status !== 'ready' ||
      typeof learning.createOrResumePaperExecutionSession !== 'function'
    )
      return;
    createStarted.current = true;
    const initialFields = defaultFields(resolution);
    setFields(initialFields);
    setWorking(true);
    void learning
      .createOrResumePaperExecutionSession(
        analysisSessionId,
        planFromFields(initialFields, resolution, `paper-plan:${analysisSessionId}`),
        accessMode,
      )
      .catch((reason: unknown) => {
        createStarted.current = false;
        setMessage(reason instanceof Error ? reason.message : 'לא ניתן ליצור תרגול ביצוע.');
      })
      .finally(() => setWorking(false));
  }, [accessMode, analysisSessionId, execution, learning, resolution]);

  const preview = useMemo(() => {
    if (!fields || resolution?.status !== 'ready') return undefined;
    const plan = planFromFields(
      fields,
      resolution,
      execution?.plan.planId ?? `paper-plan:${analysisSessionId}`,
    );
    return createTradePlan(plan, resolution.source, execution?.costModel);
  }, [analysisSessionId, execution, fields, resolution]);

  if (learning.status === 'loading') return <LoadingState label="טוענים תרגול ביצוע…" />;
  if (learning.status === 'error' || !learning.snapshot) {
    return (
      <ErrorState
        message={learning.error ?? 'לא ניתן לטעון את תרגול הביצוע.'}
        onRetry={() => void learning.reload()}
      />
    );
  }
  if (!analysis || !resolution || resolution.status !== 'ready') {
    return (
      <Screen
        contentContainerStyle={{ gap: theme.spacing.xl }}
        scroll
        testID="paper-execution-recovery"
      >
        <TopBar back subtitle="שחזור מוגן" title="תרגול הביצוע אינו זמין" />
        <Card variant="outlined">
          <Heading level={2}>המקור המוצמד לא אומת</Heading>
          <UiText color="textMuted">
            {resolution && resolution.status !== 'ready'
              ? resolution.message
              : 'סשן הניתוח הסופי אינו זמין. לא הוחלף מקור ולא הוצמד checksum אחר.'}
          </UiText>
        </Card>
        <Button onPress={() => router.back()}>חזרה לתחקיר הניתוח</Button>
      </Screen>
    );
  }
  if (!fields || !execution || !preview) {
    return <LoadingState label={message ?? 'מכינים טיוטת ביצוע מקומית…'} />;
  }

  const editable = execution.status === 'draft';
  const errors = preview.validationIssues.filter(({ severity }) => severity === 'error');
  const warnings = preview.validationIssues.filter(({ severity }) => severity === 'warning');
  const cursor = execution.lastProcessedCandleIndex;
  const chart = chartAtCursor(resolution, cursor);
  const overlays = overlaysFor(execution);
  const wide = width >= 980;
  const canAdvance =
    ['working', 'open'].includes(execution.status) &&
    cursor < resolution.executionBoundary.lastCandleIndex;
  const direction = resolution.source.permittedDirections[0] ?? 'short';
  const directionHe = direction === 'long' ? 'לונג' : 'שורט';
  const hypotheticalMechanics = resolution.mode === 'hypothetical-mechanics';

  const persistDraft = (nextFields: TicketFields) => {
    if (!editable) return;
    const nextPlan = planFromFields(nextFields, resolution, execution.plan.planId);
    draftSaveQueue.current = draftSaveQueue.current
      .catch(() => undefined)
      .then(() => learning.savePaperExecutionPlan(execution.sessionId, nextPlan, accessMode))
      .catch((reason: unknown) => {
        setMessage(reason instanceof Error ? reason.message : 'השמירה המקומית של התכנית נכשלה.');
      });
  };

  const updateField = (field: NumericField, value: string) => {
    if (!editable) return;
    setFields((current) => (current ? { ...current, [field]: value } : current));
    setConfirmed(false);
  };
  const updateOrderType = (orderType: EntryOrderType) => {
    if (!editable) return;
    const next = { ...fields, orderType };
    setFields(next);
    setConfirmed(false);
    persistDraft(next);
  };
  const savePlan = async (): Promise<PaperExecutionSession> => {
    const next = planFromFields(fields, resolution, execution.plan.planId);
    return learning.savePaperExecutionPlan(execution.sessionId, next, accessMode);
  };
  const submit = async () => {
    setWorking(true);
    setMessage(null);
    try {
      await draftSaveQueue.current;
      const saved = await savePlan();
      await learning.submitPaperExecutionSession(
        saved.sessionId,
        `paper-submit:${saved.sessionId}:${saved.revision}`,
        accessMode,
      );
      setConfirmed(false);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'לא ניתן להגיש את הוראת הנייר.');
    } finally {
      setWorking(false);
    }
  };
  const advance = async () => {
    setWorking(true);
    setMessage(null);
    try {
      const advanced = await learning.advancePaperExecutionSession(
        execution.sessionId,
        1,
        accessMode,
      );
      if (
        advanced.lastProcessedCandleIndex === resolution.executionBoundary.lastCandleIndex &&
        advanced.status === 'working'
      ) {
        await learning.completePaperExecutionReplay(advanced.sessionId, accessMode);
      }
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'לא ניתן לחשוף את הנר הבא.');
    } finally {
      setWorking(false);
    }
  };
  const cancel = async () => {
    setWorking(true);
    try {
      await learning.cancelPaperExecutionOrder(
        execution.sessionId,
        `paper-cancel:${execution.sessionId}:${execution.revision}`,
        accessMode,
      );
      setConfirmCancel(false);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'לא ניתן לבטל את ההוראה.');
    } finally {
      setWorking(false);
    }
  };
  const abandon = async () => {
    setWorking(true);
    try {
      await learning.abandonPaperExecutionSession(
        execution.sessionId,
        `paper-abandon:${execution.sessionId}:${execution.revision}`,
      );
      setConfirmAbandon(false);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'לא ניתן להפסיק את הסימולציה.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen
      accessibilityLabel="תרגול ביצוע על נייר"
      contentContainerStyle={{ gap: theme.spacing.xl }}
      scroll
      testID="paper-execution-screen"
    >
      <TopBar back subtitle="סימולציה דטרמיניסטית · ללא כסף אמיתי" title="ביצוע על נייר" />

      <Card variant="accent">
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Badge tone={hypotheticalMechanics ? 'warning' : 'success'}>
              {hypotheticalMechanics ? 'הניתוח קבע: אין עסקה' : `הניתוח קבע: ${directionHe}`}
            </Badge>
            <Badge tone="neutral">
              {hypotheticalMechanics ? 'מצב QA — מכניקה היפותטית' : 'ביצוע תואם לניתוח'}
            </Badge>
            <Badge tone="neutral">ללא XP או קרדיט</Badge>
          </View>
          <Heading level={1}>מהתכנית לאירועי ביצוע מדומים</Heading>
          <UiText>
            {hypotheticalMechanics
              ? `זהו כלי QA מפורש לבדיקת מכניקת ${directionHe} היפותטית. התכנית אינה משנה את מסקנת הניתוח שנבדק ותסומן כלא־תואמת ל״אין עסקה״.`
              : `אפשר לתעד תכנית ${directionHe} התואמת למסקנת הניתוח. תוצאת הסימולטור אינה משנה את ציון הניתוח.`}
          </UiText>
          <UiText color="textMuted" variant="caption">
            {resolution.learnerDisclosureHebrew}
          </UiText>
        </View>
      </Card>

      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: wide ? 'row' : 'column',
          gap: theme.spacing.lg,
        }}
        testID="paper-execution-responsive-layout"
      >
        <View
          style={{
            flex: wide ? 1.15 : undefined,
            gap: theme.spacing.md,
            width: wide ? undefined : '100%',
          }}
        >
          <OhlcvChart
            allowAccessibleDataTable
            chart={chart}
            cutoffCandleIndex={cursor}
            executionOverlays={overlays}
            testID="paper-execution-chart"
            ticker={resolution.content.dataset.manifest.displaySymbol}
          />
          <Card variant="subtle">
            <UiText color="textMuted" variant="caption">
              כרונולוגיית הגרף ומספריו מוצגים משמאל לימין. נחשפים רק נרות עד cursor {cursor + 1}.
              {reducedMotion ? ' מצב תנועה מופחת פעיל; המעבר מיידי.' : ''}
            </UiText>
          </Card>
        </View>

        <View
          style={{
            flex: wide ? 1 : undefined,
            gap: theme.spacing.md,
            width: wide ? undefined : '100%',
          }}
        >
          <Card testID="paper-execution-ticket" variant="outlined">
            <View style={{ gap: theme.spacing.lg }}>
              <View style={{ gap: 8 }}>
                <Heading level={2}>1. כוונת ההוראה</Heading>
                <UiText color="textMuted" variant="bodySmall">
                  {`הכיוון המותר בתרחיש הוא ${directionHe} בלבד. זו הרשאת סימולטור, לא המלצה.`}
                </UiText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {resolution.source.permittedEntryOrderTypes.map((orderType) => {
                    const selected = fields.orderType === orderType;
                    return (
                      <Pressable
                        accessibilityLabel={`הוראת ${orderLabels[orderType]}`}
                        accessibilityRole="radio"
                        accessibilityState={{ disabled: !editable, selected }}
                        disabled={!editable}
                        key={orderType}
                        onPress={() => updateOrderType(orderType)}
                        style={{
                          backgroundColor: selected
                            ? theme.colors.primarySoft
                            : theme.colors.surface,
                          borderColor: selected ? theme.colors.primary : theme.colors.borderStrong,
                          borderRadius: theme.radii.md,
                          borderWidth: selected ? 2 : 1,
                          minHeight: 48,
                          minWidth: 96,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }}
                        testID={`paper-order-type-${orderType}`}
                      >
                        <UiText
                          align="center"
                          color={selected ? 'primary' : 'text'}
                          variant="label"
                        >
                          {orderLabels[orderType]}
                        </UiText>
                      </Pressable>
                    );
                  })}
                </View>
                <UiText color="textMuted" variant="caption">
                  הנחת סימולטור v1: שוק זכאי לביצוע בפתיחת הנר הבא; לימיט וסטופ נבדקים לפי טווחי
                  OHLCV בלבד.
                </UiText>
              </View>

              <View style={{ gap: 8 }}>
                <Heading level={2}>2. גבולות התכנית</Heading>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <NumericInput
                    editable={editable}
                    field="entry"
                    label={
                      fields.orderType === 'market'
                        ? 'מחיר ייחוס להערכה'
                        : fields.orderType === 'limit'
                          ? 'מחיר לימיט'
                          : 'מחיר טריגר סטופ'
                    }
                    onChange={(value) => updateField('entry', value)}
                    onBlur={() => persistDraft(fields)}
                    value={fields.entry}
                  />
                  <NumericInput
                    editable={editable}
                    field="stop"
                    label="עצירה מגינה"
                    onChange={(value) => updateField('stop', value)}
                    onBlur={() => persistDraft(fields)}
                    value={fields.stop}
                  />
                  <NumericInput
                    editable={editable}
                    field="target"
                    label="יעד מותנה"
                    onChange={(value) => updateField('target', value)}
                    onBlur={() => persistDraft(fields)}
                    value={fields.target}
                  />
                </View>
                {fields.orderType === 'market' ? (
                  <UiText color="warning" variant="caption">
                    המחיר הבא אינו ידוע. מחיר הייחוס משמש לחישוב מוקדם בלבד; מילוי השוק ייקבע מפתיחת
                    הנר הבא והעלויות.
                  </UiText>
                ) : undefined}
              </View>

              <View style={{ gap: 8 }}>
                <Heading level={2}>3. סיכון וכמות</Heading>
                <UiText color="textMuted" variant="bodySmall">
                  החשבון ותקציב הסיכון דמיוניים. האחוז המחושב הוא אריתמטיקה בלבד ואינו המלצה על
                  שיעור סיכון.
                </UiText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <NumericInput
                    editable={editable}
                    field="account"
                    label="שווי חשבון דמיוני"
                    onChange={(value) => updateField('account', value)}
                    onBlur={() => persistDraft(fields)}
                    value={fields.account}
                  />
                  <NumericInput
                    editable={editable}
                    field="risk"
                    label="תקציב סיכון לתרגיל"
                    onChange={(value) => updateField('risk', value)}
                    onBlur={() => persistDraft(fields)}
                    value={fields.risk}
                  />
                  <NumericInput
                    editable={editable}
                    field="quantity"
                    label="כמות יחידות"
                    onChange={(value) => updateField('quantity', value)}
                    onBlur={() => persistDraft(fields)}
                    value={fields.quantity}
                  />
                </View>
              </View>
            </View>
          </Card>

          <Card testID="paper-plan-validation" variant={errors.length ? 'outlined' : 'subtle'}>
            <View style={{ gap: 8 }}>
              <Heading level={3}>בדיקת התכנית</Heading>
              <LtrText variant="numeric">{`Entry est. ${price(preview.estimatedEntryFillPrice)} · Stop ${price(preview.protectiveStopPrice)} · Target ${price(preview.targetPrice)}`}</LtrText>
              <LtrText
                color="textMuted"
                variant="numeric"
              >{`Risk/unit ${price(preview.riskPerUnit)} · total risk ${price(preview.estimatedTotalRisk)} · costs ${price(preview.estimatedExecutionCosts)}`}</LtrText>
              {preview.plannedRewardToRisk !== undefined ? (
                <LtrText
                  color="textMuted"
                  variant="numeric"
                >{`Planned R ${preview.plannedRewardToRisk.toFixed(2)}`}</LtrText>
              ) : undefined}
              {errors.map((issue) => (
                <UiText
                  key={`${issue.code}:${issue.field}`}
                  accessibilityLiveRegion="polite"
                  color="danger"
                  variant="bodySmall"
                >
                  {issueLabels[issue.code]}
                </UiText>
              ))}
              {warnings.map((issue) => (
                <UiText key={`${issue.code}:${issue.field}`} color="warning" variant="caption">
                  {issueLabels[issue.code]}
                </UiText>
              ))}
            </View>
          </Card>

          {editable ? (
            <Card testID="paper-execution-confirmation" variant="accent">
              <View style={{ gap: theme.spacing.sm }}>
                <Heading level={3}>4. בדיקה ואישור מפורש</Heading>
                <UiText>
                  הוראת {orderLabels[fields.orderType]} {directionHe}, עצירה {fields.stop}, יעד{' '}
                  {fields.target}, כמות {fields.quantity} יחידות דמיוניות.
                </UiText>
                <Pressable
                  accessibilityLabel="אישור הבנת מגבלות הסימולטור"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: confirmed, disabled: errors.length > 0 }}
                  disabled={errors.length > 0}
                  onPress={() => setConfirmed((value) => !value)}
                  style={{
                    alignItems: 'center',
                    borderColor: confirmed ? theme.colors.primary : theme.colors.borderStrong,
                    borderRadius: theme.radii.md,
                    borderWidth: confirmed ? 2 : 1,
                    flexDirection: 'row',
                    gap: 10,
                    minHeight: 52,
                    padding: 10,
                  }}
                >
                  <LtrText color={confirmed ? 'primary' : 'textMuted'} variant="label">
                    {confirmed ? '☑' : '☐'}
                  </LtrText>
                  <UiText style={{ flex: 1 }} variant="bodySmall">
                    אני מבין/ה שזהו מודל דטרמיניסטי על נתונים שנוצרו, לא ביצוע ברוקר ולא המלצה
                    למסחר.
                  </UiText>
                </Pressable>
                <Button
                  disabled={!confirmed || errors.length > 0 || working}
                  fullWidth
                  onPress={() => void submit()}
                  testID="paper-submit-order"
                >
                  {working ? 'שומר ומגיש…' : 'הגשת הוראת נייר'}
                </Button>
              </View>
            </Card>
          ) : undefined}

          {message ? (
            <UiText accessibilityLiveRegion="polite" color="danger">
              {message}
            </UiText>
          ) : undefined}

          {!editable ? (
            <Card variant="outlined">
              <View style={{ gap: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Badge tone={execution.status === 'ambiguous' ? 'warning' : 'neutral'}>
                    {eventLabels[execution.events.at(-1)?.type ?? 'session-created']}
                  </Badge>
                  <LtrText
                    color="textMuted"
                    variant="numeric"
                  >{`cursor ${cursor + 1}/${resolution.executionBoundary.lastCandleIndex + 1}`}</LtrText>
                </View>
                <UiText color="textMuted" variant="caption">
                  כל נר נחשף ומעובד פעם אחת. לחיצה חוזרת או טעינה מחדש אינן יוצרות מילוי נוסף.
                </UiText>
                {canAdvance ? (
                  <Button
                    disabled={working}
                    fullWidth
                    onPress={() => void advance()}
                    testID="paper-advance-one"
                  >
                    {working ? 'מעבד את הנר…' : 'חשיפת הנר הבא'}
                  </Button>
                ) : undefined}
                {execution.status === 'working' ? (
                  <Button
                    onPress={() => setConfirmCancel(true)}
                    variant="secondary"
                    testID="paper-cancel-order"
                  >
                    בקשת ביטול ההוראה
                  </Button>
                ) : undefined}
                {['working', 'open'].includes(execution.status) ? (
                  <Button onPress={() => setConfirmAbandon(true)} variant="danger">
                    הפסקת סימולציה מפורשת
                  </Button>
                ) : undefined}
              </View>
            </Card>
          ) : undefined}
        </View>
      </View>

      {confirmCancel ? (
        <Card accessibilityLabel="אישור ביטול הוראת נייר" variant="outlined">
          <View style={{ gap: 8 }}>
            <Heading level={3}>לבטל את ההוראה הממתינה?</Heading>
            <UiText>הביטול יישמר כאירוע. תכנית שהוגשה לא תיערך מחדש.</UiText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button onPress={() => setConfirmCancel(false)} variant="ghost">
                חזרה
              </Button>
              <Button disabled={working} onPress={() => void cancel()} variant="danger">
                אישור ביטול
              </Button>
            </View>
          </View>
        </Card>
      ) : undefined}

      {confirmAbandon ? (
        <Card
          accessibilityLabel="אישור הפסקת סימולציית ביצוע"
          testID="paper-abandon-confirmation"
          variant="outlined"
        >
          <View style={{ gap: 8 }}>
            <Heading level={3}>להפסיק את הסימולציה?</Heading>
            <UiText>האירועים שכבר נוצרו יישמרו. לא ניתן למחוק בשקט הוראה או פוזיציה שנפתחו.</UiText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button onPress={() => setConfirmAbandon(false)} variant="ghost">
                חזרה
              </Button>
              <Button disabled={working} onPress={() => void abandon()} variant="danger">
                אישור הפסקה
              </Button>
            </View>
          </View>
        </Card>
      ) : undefined}

      <Card testID="paper-execution-events" variant="subtle">
        <View style={{ gap: 8 }}>
          <Heading level={2}>ציר אירועים דטרמיניסטי</Heading>
          {execution.events.map((event) => (
            <View
              key={event.eventId}
              style={{
                borderBottomColor: theme.colors.border,
                borderBottomWidth: 1,
                gap: 3,
                paddingVertical: 7,
              }}
            >
              <UiText variant="label">{eventLabels[event.type]}</UiText>
              <LtrText
                color="textMuted"
                variant="caption"
              >{`#${event.sequence}${event.candleIndex === undefined ? '' : ` · candle ${event.candleIndex + 1}`} · ${event.occurredAt}`}</LtrText>
              {eventDetail(event) ? (
                <LtrText color="textMuted" variant="caption">
                  {eventDetail(event)}
                </LtrText>
              ) : undefined}
            </View>
          ))}
        </View>
      </Card>

      <ExecutionDebriefCard session={execution} />

      <Card variant="outlined">
        <View style={{ gap: 7 }}>
          <Badge tone="neutral">הנחת סימולטור v1</Badge>
          <Heading level={3}>מה המודל מניח</Heading>
          <UiText color="textMuted" variant="bodySmall">
            שוק: פתיחת הנר הבא. לימיט: מחיר הלימיט ללא שיפור. סטופ: מחיר פתיחה שלילי בפער. נגיעה
            בעצירה וביעד באותו נר מסתיימת בעמימות. אין מילויים חלקיים, ספר פקודות או אומדן נזילות.
          </UiText>
          <LtrText
            color="textMuted"
            variant="caption"
          >{`${execution.executionPolicy.version} · ${execution.costModel.version} · spread ${execution.costModel.spreadBps} bps · slippage ${execution.costModel.slippageBps} bps`}</LtrText>
        </View>
      </Card>

      <Card variant="subtle">
        <UiText variant="label">מקור פדגוגי נפרד מהנחות הסימולטור</UiText>
        {resolution.content.scenario.educationalSourceReferences.map((reference) => (
          <LtrText
            key={`${reference.sourceId}:${reference.pageStart}:${reference.pageEnd}:${reference.section}`}
            color="textMuted"
            variant="caption"
          >
            {`${reference.sourceId} · PDF ${reference.pageStart}–${reference.pageEnd} · ${reference.section}`}
          </LtrText>
        ))}
        <UiText color="textMuted" variant="caption">
          מסקנת היישום נבדקת מול רובריקה שנקבעה מראש. כללי המילוי המדויקים שלמעלה הם הנחות תוכנה, לא
          דוקטרינת המקור.
        </UiText>
      </Card>
    </Screen>
  );
}
