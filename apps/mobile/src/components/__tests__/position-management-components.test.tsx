import { fireEvent, render } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';
import type { PositionManagementSession } from '@chartpath/domain';

import { ManagementDebriefCard } from '../management-debrief-card';
import { ManagementTimeline } from '../management-timeline';
import { PositionManagementPanel } from '../position-management-panel';
import { PositionManagementSummary } from '../position-management-summary';
import { TradeManagementJournal } from '../trade-management-journal';
import {
  buildPositionManagementOverlays,
  parsePositionManagementIntent,
  type PositionManagementDraftView,
} from '@/data/position-management';

describe('position management presentation', () => {
  it('normalizes a raw historical close to the pinned tick grid for scale-in intent', () => {
    expect(
      parsePositionManagementIntent(
        {
          draftId: 'scale-in-2',
          kind: 'scale-in',
          quantity: '2',
          rationale: 'ראיה גלויה',
          decisionBasis: 'new-visible-evidence',
          riskReviewed: true,
          evidenceTags: ['visible-price-evidence', 'risk-budget'],
        },
        106.136,
        { currencyDecimals: 2, priceTickMinor: 1 },
      ),
    ).toEqual({
      ok: true,
      intent: { kind: 'scale-in', quantityUnits: 2, estimatedEntryPrice: 106.14 },
    });
  });

  it('renders authoritative position values in explicit LTR containers', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="dark" reducedMotion textScale={1.3}>
        <PositionManagementSummary
          summary={{
            statusHe: 'פתוחה',
            statusTone: 'success',
            metrics: [
              { id: 'quantity', labelHe: 'הכמות הנוכחית', valueLtr: '10 units' },
              { id: 'average-entry', labelHe: 'מחיר כניסה ממוצע', valueLtr: '104.25' },
              { id: 'original-risk', labelHe: 'סיכון מקורי (1R)', valueLtr: '125.00' },
              { id: 'current-risk', labelHe: 'סיכון נוכחי', valueLtr: '80.00' },
            ],
            disclosureHe: 'חשבונאות סימולטור ניטרלית, לא המלצה.',
          }}
        />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByTestId('paper-management-position-summary')).toBeTruthy();
    expect(screen.getByText('104.25')).toHaveStyle({ writingDirection: 'ltr' });
    expect(screen.getByText('80.00')).toHaveStyle({ writingDirection: 'ltr' });
  });

  it('enables authored scale-in quantity 2 after rationale and confirmations', async () => {
    let draft: PositionManagementDraftView = {
      draftId: 'draft-1',
      kind: 'scale-in',
      quantity: '2',
      rationale: '',
      decisionBasis: 'new-visible-evidence',
      riskReviewed: true,
      evidenceTags: ['visible-price-evidence'],
    };
    const onChangeDraft = jest.fn((next: PositionManagementDraftView) => {
      draft = next;
    });
    const onSubmit = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <PositionManagementPanel
          allowedActions={['partial-exit', 'scale-in', 'replace-stop']}
          draft={draft}
          onCancelPending={jest.fn()}
          onChangeDraft={onChangeDraft}
          onSelectAction={jest.fn()}
          onSubmit={onSubmit}
          preview={{
            comparisons: [
              { id: 'quantity', labelHe: 'כמות', beforeLtr: '10', afterLtr: '12' },
              { id: 'risk', labelHe: 'סיכון נוכחי', beforeLtr: '80.00', afterLtr: '110.00' },
            ],
            hardErrorsHe: [],
            softWarningsHe: ['הסיכון החזוי גבוה מן הסיכון המקורי.'],
            timingHe: 'הפעולה תהיה זכאית רק בפתיחת הנר הבא.',
          }}
        />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByTestId('paper-management-submit').props.accessibilityState.disabled).toBe(
      true,
    );
    await fireEvent.changeText(
      screen.getByTestId('paper-management-input-rationale'),
      'הוספה מתועדת לאחר אישור מבני גלוי.',
    );
    expect(onChangeDraft).toHaveBeenCalledWith({
      ...draft,
      rationale: 'הוספה מתועדת לאחר אישור מבני גלוי.',
    });

    await screen.rerender(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <PositionManagementPanel
          allowedActions={['partial-exit', 'scale-in', 'replace-stop']}
          draft={draft}
          onCancelPending={jest.fn()}
          onChangeDraft={onChangeDraft}
          onSelectAction={jest.fn()}
          onSubmit={onSubmit}
          preview={{
            comparisons: [],
            hardErrorsHe: [],
            softWarningsHe: ['הסיכון החזוי גבוה מן הסיכון המקורי.'],
            timingHe: 'הפעולה תהיה זכאית רק בפתיחת הנר הבא.',
          }}
        />
      </ChartPathThemeProvider>,
    );
    await fireEvent.press(screen.getByTestId('paper-management-warning-confirmation'));
    await fireEvent.press(screen.getByTestId('paper-management-confirm'));
    await fireEvent.press(screen.getByTestId('paper-management-submit'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('blocks hard-rejected actions and describes one pending action without journal text', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <PositionManagementPanel
          allowedActions={['scale-in']}
          draft={{
            draftId: 'draft-hard',
            kind: 'scale-in',
            quantity: '500',
            rationale: 'בדיקת גבול קשיח.',
            decisionBasis: 'risk-reduction',
            riskReviewed: true,
            evidenceTags: ['risk-budget'],
          }}
          onCancelPending={jest.fn()}
          onChangeDraft={jest.fn()}
          onSelectAction={jest.fn()}
          onSubmit={jest.fn()}
          preview={{
            comparisons: [],
            hardErrorsHe: ['הפעולה חורגת מגבול הסיכון הקשיח.'],
            softWarningsHe: [],
            timingHe: 'אין פעולה זכאית.',
          }}
        />
      </ChartPathThemeProvider>,
    );
    expect(screen.getByTestId('paper-management-hard-error')).toBeTruthy();
    expect(screen.getByTestId('paper-management-submit').props.accessibilityState.disabled).toBe(
      true,
    );

    const onCancel = jest.fn();
    await screen.rerender(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <PositionManagementPanel
          allowedActions={[]}
          onCancelPending={onCancel}
          onChangeDraft={jest.fn()}
          onSelectAction={jest.fn()}
          onSubmit={jest.fn()}
          pending={{
            actionId: 'submission-1',
            actionHe: 'הפחתת 2 יחידות',
            submittedAfterCandleLtr: '64',
            firstEligibleCandleLtr: '65',
            cancellable: true,
          }}
        />
      </ChartPathThemeProvider>,
    );
    expect(screen.getByLabelText('פעולת ניהול ממתינה')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toContain('סיבה פרטית שאינה מוצגת');
    await fireEvent.press(screen.getByTestId('paper-management-cancel-pending'));
    expect(onCancel).toHaveBeenCalledWith('submission-1');
  });

  it('renders append-only journal corrections, ordered timeline, and process-first debrief', async () => {
    const onCorrect = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <TradeManagementJournal
          entries={[
            {
              entryId: 'journal-1',
              sequenceLtr: '1',
              candleLtr: '64',
              typeHe: 'תצפית',
              rationaleHe: 'נר גלוי נסגר ליד הרמה.',
              tagsHe: ['אי־ודאות'],
              correctable: true,
            },
          ]}
          onCorrect={onCorrect}
        />
        <ManagementTimeline
          entries={[
            {
              eventId: 'event-1',
              sequenceLtr: '1',
              candleLtr: '64',
              occurredAtLtr: '2026-08-25T08:00:00.000Z',
              titleHe: 'נוצר סשן ניהול',
            },
          ]}
        />
        <ManagementDebriefCard
          debrief={{
            processQualityHe: 'הנימוקים והסיכון תועדו לפני הפעולות.',
            assessments: [
              {
                id: 'future-evidence',
                labelHe: 'לא נעשה שימוש בנתוני עתיד',
                resultHe: 'תועד',
                tone: 'neutral',
              },
            ],
            accounting: [{ id: 'realized', labelHe: 'תוצאה ממומשת מדומה', valueLtr: '-20.00' }],
            assumptionsHe: ['מילוי פעולה מרצון בפתיחת הנר הבא.'],
            ambiguous: false,
          }}
        />
      </ChartPathThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId('management-journal-correct-journal-1'));
    expect(onCorrect).toHaveBeenCalledWith('journal-1');
    expect(screen.getByTestId('management-timeline-event-event-1')).toBeTruthy();
    expect(screen.getByText('תחקיר ניהול — התהליך אינו ציון רווח')).toBeTruthy();
    expect(screen.getByText('-20.00')).toHaveStyle({ writingDirection: 'ltr' });
  });

  it('builds cutoff-ordered management overlays without exposing journal prose', () => {
    const session = {
      sessionId: 'management-overlay',
      currencyDecimals: 2,
      priceTickMinor: 1,
      activeProtectiveStopTicks: 10_200,
      activeTargetTicks: 11_200,
      lastProcessedCandleIndex: 68,
      handoff: {
        position: {
          openedAtCandleIndex: 64,
          protectiveStopPrice: 103,
          targetPrice: 112,
        },
      },
      lots: [{ entryPriceMinor: 10_600 }],
      events: [
        {
          type: 'protective-stop-replaced',
          eventId: 'replace-1',
          sequence: 1,
          candleIndex: 65,
          previousPriceTicks: 10_300,
          priceTicks: 10_250,
        },
        {
          type: 'protective-stop-replaced',
          eventId: 'replace-2',
          sequence: 2,
          candleIndex: 67,
          previousPriceTicks: 10_250,
          priceTicks: 10_200,
        },
        {
          type: 'management-observation-recorded',
          eventId: 'journal-event',
          entryId: 'journal-secret',
          sequence: 3,
          candleIndex: 68,
          text: 'טקסט יומן פרטי שאסור להציג במקרא',
          evidenceTags: [],
        },
      ],
    } as unknown as PositionManagementSession;

    const overlays = buildPositionManagementOverlays(session, true);
    expect(overlays).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'original-stop',
          visibleFromCandleIndex: 64,
          visibleUntilCandleIndex: 64,
        }),
        expect.objectContaining({
          kind: 'replaced-stop',
          visibleFromCandleIndex: 65,
          visibleUntilCandleIndex: 66,
        }),
        expect.objectContaining({ kind: 'current-stop', visibleFromCandleIndex: 67 }),
        expect.objectContaining({ kind: 'journal-marker', labelHe: 'החלטת יומן' }),
      ]),
    );
    expect(JSON.stringify(overlays)).not.toContain('טקסט יומן פרטי');
  });
});
