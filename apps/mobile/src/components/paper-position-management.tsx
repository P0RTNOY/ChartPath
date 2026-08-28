import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import type { OhlcvCandle, PositionManagementSession } from '@chartpath/domain';
import {
  Badge,
  Button,
  Card,
  Heading,
  LtrText,
  UiText,
  useReducedMotion,
  useTheme,
} from '@chartpath/ui';

import { ManagementDebriefCard } from './management-debrief-card';
import { ManagementTimeline } from './management-timeline';
import { PositionManagementPanel } from './position-management-panel';
import { PositionManagementSummary } from './position-management-summary';
import { TradeManagementJournal } from './trade-management-journal';
import {
  buildManagementDebrief,
  buildManagementJournalEntries,
  buildManagementTimeline,
  buildPendingPositionManagementAction,
  buildPositionManagementPreview,
  buildPositionManagementSummary,
  parsePositionManagementIntent,
  positionManagementDraftView,
  type PositionManagementActionKind,
  type PositionManagementDraftView,
  type PositionManagementPreviewView,
} from '@/data/position-management';
import type { PaperExecutionAccessMode } from '@/data/paper-execution';
import { useLearning } from '@/state/learning';

function nextDraft(
  session: PositionManagementSession,
  kind: PositionManagementActionKind,
): PositionManagementDraftView {
  return {
    draftId: session.draft?.draftId ?? `management-draft:${session.sessionId}`,
    kind,
    ...(kind === 'partial-exit' || kind === 'scale-in' ? { quantity: '1' } : {}),
    ...(kind === 'replace-stop'
      ? {
          price: (
            (session.activeProtectiveStopTicks * session.priceTickMinor) /
            10 ** session.currencyDecimals
          ).toFixed(session.currencyDecimals),
        }
      : kind === 'replace-target'
        ? {
            price: (
              (session.activeTargetTicks * session.priceTickMinor) /
              10 ** session.currencyDecimals
            ).toFixed(session.currencyDecimals),
          }
        : {}),
    rationale: '',
    decisionBasis: 'new-visible-evidence',
    riskReviewed: false,
    evidenceTags: [],
  };
}

export function PaperPositionManagement({
  accessMode,
  lastVisibleCandle,
  replayLastCandleIndex,
  session,
}: {
  readonly accessMode: PaperExecutionAccessMode;
  readonly lastVisibleCandle: OhlcvCandle;
  readonly replayLastCandleIndex: number;
  readonly session: PositionManagementSession;
}) {
  const learning = useLearning();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const hydratedEditId = useRef<string | undefined>(undefined);
  const [draft, setDraft] = useState<PositionManagementDraftView>(() =>
    positionManagementDraftView(session),
  );
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session.draft || hydratedEditId.current === session.draft.lastEditId) return;
    hydratedEditId.current = session.draft.lastEditId;
    setDraft(positionManagementDraftView(session));
  }, [session]);

  const parsed = useMemo(
    () => parsePositionManagementIntent(draft, lastVisibleCandle.close, session),
    [draft, lastVisibleCandle.close, session],
  );
  const preview = useMemo<PositionManagementPreviewView | undefined>(() => {
    if (draft.kind === 'journal-only') {
      return {
        comparisons: [],
        hardErrorsHe: [],
        softWarningsHe: [],
        timingHe: 'התצפית תישמר ביומן בנקודת החשיפה הנוכחית ללא פעולת מחיר.',
      };
    }
    if (!parsed.ok) {
      return {
        comparisons: [],
        hardErrorsHe: [parsed.messageHe],
        softWarningsHe: [],
        timingHe: 'הפעולה לא תוגש עד לתיקון השדות.',
      };
    }
    try {
      return buildPositionManagementPreview(session, parsed.intent);
    } catch {
      return {
        comparisons: [],
        hardErrorsHe: ['הפעולה אינה תקינה ביחס לפוזיציה ולהרשאות התרחיש.'],
        softWarningsHe: [],
        timingHe: 'הפעולה לא תוגש.',
      };
    }
  }, [draft.kind, parsed, session]);

  const summary = useMemo(
    () => buildPositionManagementSummary(session, lastVisibleCandle),
    [lastVisibleCandle, session],
  );
  const journal = useMemo(() => buildManagementJournalEntries(session), [session]);
  const timeline = useMemo(() => buildManagementTimeline(session), [session]);
  const debrief = useMemo(() => buildManagementDebrief(session), [session]);
  const pending = buildPendingPositionManagementAction(session);
  const allowedActions: readonly PositionManagementActionKind[] = [
    ...session.authority.permittedActionKinds,
    'journal-only',
  ];

  const submit = async () => {
    setWorking(true);
    setMessage(null);
    try {
      if (draft.kind === 'journal-only') {
        const entryId = `management-journal:${session.sessionId}:${session.revision + 1}`;
        if (draft.correctsEntryId) {
          await learning.correctPositionManagementJournal(
            session.sessionId,
            entryId,
            draft.correctsEntryId,
            draft.rationale,
            draft.evidenceTags,
            accessMode,
          );
        } else {
          await learning.recordPositionManagementObservation(
            session.sessionId,
            entryId,
            draft.rationale,
            draft.evidenceTags,
            accessMode,
          );
        }
        setDraft(nextDraft(session, 'journal-only'));
        return;
      }
      if (!parsed.ok) throw new Error(parsed.messageHe);
      const saved = await learning.savePositionManagementDraft(
        session.sessionId,
        parsed.intent,
        draft.rationale,
        {
          decisionBasis: draft.decisionBasis,
          riskReviewed: draft.riskReviewed,
          evidenceTags: draft.evidenceTags,
        },
        accessMode,
      );
      if (!saved.draft) throw new Error('טיוטת הניהול לא נשמרה.');
      await learning.submitPositionManagementDraft(
        saved.sessionId,
        `management-submit:${saved.sessionId}:${saved.draft.lastEditId}`,
        saved.draft.riskAssessment.warningCodes,
        accessMode,
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'לא ניתן להגיש את פעולת הניהול.');
    } finally {
      setWorking(false);
    }
  };

  const cancelPending = async (submissionId: string) => {
    setWorking(true);
    setMessage(null);
    try {
      await learning.cancelPendingPositionManagementAction(
        session.sessionId,
        submissionId,
        `management-cancel:${session.sessionId}:${submissionId}`,
        accessMode,
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'לא ניתן לבטל את הפעולה הממתינה.');
    } finally {
      setWorking(false);
    }
  };

  const advance = async () => {
    setWorking(true);
    setMessage(null);
    try {
      await learning.advancePositionManagementSession(session.sessionId, 1, accessMode);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'לא ניתן לחשוף את הנר הבא.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={{ gap: theme.spacing.lg }} testID="paper-management-dashboard">
      <Card variant="accent">
        <View style={{ gap: 7 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Badge tone="warning">סימולטור ניהול סינתטי</Badge>
            <Badge tone="neutral">ללא קרדיט</Badge>
          </View>
          <Heading level={2}>ניהול פוזיציה מדומה</Heading>
          <LtrText
            color="textMuted"
            testID={`paper-management-processed-candle-${session.lastProcessedCandleIndex}`}
            variant="caption"
          >
            {`processed candle #${session.lastProcessedCandleIndex}`}
          </LtrText>
          <UiText>
            פעולות ניהול, מילויים ועלויות הן הנחות דטרמיניסטיות לצורכי למידה. הן אינן כלל מסחר או
            המלצה.
          </UiText>
        </View>
      </Card>

      <PositionManagementSummary summary={summary} />

      {session.status === 'active' ? (
        <PositionManagementPanel
          allowedActions={allowedActions}
          draft={draft}
          key={`${session.sessionId}:${session.revision}`}
          onCancelPending={(submissionId) => void cancelPending(submissionId)}
          onChangeDraft={setDraft}
          onSelectAction={(kind) => setDraft(nextDraft(session, kind))}
          onSubmit={() => void submit()}
          pending={pending}
          preview={preview}
          working={working}
        />
      ) : undefined}

      {message ? (
        <UiText accessibilityLiveRegion="polite" color="danger">
          {message}
        </UiText>
      ) : undefined}

      {session.status === 'active' && session.lastProcessedCandleIndex < replayLastCandleIndex ? (
        <Card variant="outlined">
          <View style={{ gap: 8 }}>
            <UiText color="textMuted" variant="caption">
              כל נר וכל פעולה מעובדים פעם אחת לפי הסדר. טעינה מחדש אינה יוצרת מילוי או עלות נוספים.
              {reducedMotion ? ' מצב תנועה מופחת פעיל; המעבר מיידי.' : ''}
            </UiText>
            <Button
              disabled={working}
              fullWidth
              onPress={() => void advance()}
              testID="paper-advance-one"
            >
              {working ? 'מעבדים את הנר…' : 'חשיפת הנר הבא'}
            </Button>
          </View>
        </Card>
      ) : undefined}

      <TradeManagementJournal
        entries={journal}
        onCorrect={(entryId) =>
          setDraft({ ...nextDraft(session, 'journal-only'), correctsEntryId: entryId })
        }
      />
      <ManagementTimeline entries={timeline} />
      {debrief ? <ManagementDebriefCard debrief={debrief} /> : undefined}
    </View>
  );
}
