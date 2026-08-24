import { expect, type Page, test } from '@playwright/test';

interface PersistedPaperExecution {
  readonly sessionId: string;
  readonly status: string;
  readonly revision: number;
  readonly lastProcessedCandleIndex: number;
  readonly events: readonly {
    readonly eventId: string;
    readonly type: string;
    readonly candleIndex?: number;
  }[];
  readonly workingOrder?: {
    readonly status?: string;
    readonly fill?: { readonly candleIndex?: number };
  };
  readonly position?: {
    readonly status?: string;
    readonly openedAtCandleIndex?: number;
    readonly closedAtCandleIndex?: number;
    readonly ambiguityReason?: string;
    readonly exitFill?: {
      readonly candleIndex?: number;
      readonly referencePrice?: number;
      readonly gap?: boolean;
    };
  };
  readonly debrief?: {
    readonly outcome?: string;
    readonly outcomeDeterminate?: boolean;
  };
}

interface LearningCreditState {
  readonly attempts: readonly unknown[];
  readonly projections: unknown;
}

async function beginFreshGuest(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('onboarding-screen')).toBeVisible();
  await page.getByRole('button', { name: 'המשך כאורח' }).click();
  await page
    .getByRole('checkbox', {
      name: 'קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד',
    })
    .click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('radio', { name: '10 דקות ביום' }).click();
  await page.getByRole('button', { name: 'בנו לי מסלול' }).click();
  await expect(page.getByRole('heading', { name: 'המסלול שלי' })).toBeVisible();
}

async function submitSelections(page: Page, labels: readonly string[]) {
  for (const label of labels) {
    await page.getByRole('checkbox', { name: label, exact: true }).click();
  }
  await page.getByRole('button', { name: /הגשת השלב/ }).click();
}

async function completeHistoricalAnalysis(page: Page): Promise<string> {
  await beginFreshGuest(page);
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await page.getByTestId('historical-replay-entry').getByRole('button').click();
  await expect(page.getByTestId('historical-session-disclosure')).toBeVisible();
  await page.getByRole('button', { name: 'לנקודת ההחלטה' }).click();
  await expect(page.getByTestId('guided-analysis-session')).toContainText('73/73');

  await submitSelections(page, ['המגמה השבועית עולה', 'הרעיון הוא מכירה בחסר נגד המגמה']);
  await submitSelections(page, ['מועמד לשלושה שיאים', 'שפל ביניים נצפה']);
  await submitSelections(page, ['תמיכה שבועית 82.7', 'אזור קו צוואר 88']);
  await submitSelections(page, ['ראש וכתפיים אפשרי']);
  await submitSelections(page, ['סגירה יומית מתחת ל־88']);
  await submitSelections(page, ['טריגר כניסה תאורטי 87.8']);
  await submitSelections(page, ['ביטול תוקף מעל הכתף הימנית', 'הוראת עצירה אפשרית 98.6']);

  await page.getByRole('textbox', { name: 'סיכון חשבון' }).fill('600');
  await page.getByRole('textbox', { name: 'סיכון ליחידה' }).fill('11');
  await page.getByRole('textbox', { name: 'מספר יחידות' }).fill('54');
  await page.getByRole('button', { name: /הגשת השלב/ }).click();
  await page.getByRole('textbox', { name: 'מכפיל סיכון' }).fill('0.48');
  await page.getByRole('button', { name: /הגשת השלב/ }).click();
  await page.getByRole('radio', { name: 'אין עסקה ואין פוזיציה לניהול' }).click();
  await page.getByRole('checkbox', { name: 'לא נפתחה פוזיציה לאחר הפסילה' }).click();
  await page.getByRole('button', { name: /הגשת השלב/ }).click();
  await submitSelections(page, [
    'ההקשר נבדק לפני התבנית',
    'המכשול והיחס נבדקו מראש',
    'איכות התהליך נפרדת מן התוצאה',
  ]);

  await page.getByRole('button', { name: 'סיום מפורש של הניתוח' }).click();
  await page.getByRole('button', { name: 'אישור וסיום' }).click();
  await expect(page.getByTestId('guided-analysis-debrief').last()).toBeVisible();
  await expect(page.getByTestId('paper-execution-launch')).toBeVisible();

  const analysisSessionId = await page.evaluate(() => {
    const parsed = JSON.parse(localStorage.getItem('chartpath:guest-learning-data:v1') ?? '{}') as {
      analysisSessions?: readonly {
        sessionId?: string;
        status?: string;
        chart?: { kind?: string };
      }[];
    };
    return parsed.analysisSessions?.find(
      ({ status, chart }) => status === 'finalized' && chart?.kind === 'historical',
    )?.sessionId;
  });
  expect(analysisSessionId).toBeTruthy();
  return analysisSessionId!;
}

async function launchPaperExecution(page: Page) {
  await page.getByTestId('paper-execution-launch').click();
  await page.waitForURL(/\/paper-execution\?analysisSessionId=/);
  await expect(page.getByTestId('paper-execution-screen')).toBeVisible();
  await expect(page.getByTestId('paper-execution-ticket')).toBeVisible();
}

async function fillTicket(
  page: Page,
  values: {
    readonly orderType: 'market' | 'limit' | 'stop';
    readonly entry: string;
    readonly stop: string;
    readonly target: string;
    readonly account?: string;
    readonly risk?: string;
    readonly quantity?: string;
  },
) {
  await page.getByTestId(`paper-order-type-${values.orderType}`).click();
  await page.getByTestId('paper-input-entry').fill(values.entry);
  await page.getByTestId('paper-input-stop').fill(values.stop);
  await page.getByTestId('paper-input-target').fill(values.target);
  await page.getByTestId('paper-input-account').fill(values.account ?? '10000');
  await page.getByTestId('paper-input-risk').fill(values.risk ?? '100');
  await page.getByTestId('paper-input-quantity').fill(values.quantity ?? '10');
  await expect(page.getByRole('checkbox', { name: 'אישור הבנת מגבלות הסימולטור' })).toBeEnabled();
}

async function submitPaperOrder(page: Page) {
  await page.getByRole('checkbox', { name: 'אישור הבנת מגבלות הסימולטור' }).click();
  await page.getByTestId('paper-submit-order').click();
  await expect(page.getByTestId('paper-submit-order')).toHaveCount(0);
  await expect(page.getByTestId('paper-execution-events')).toContainText('ההוראה ממתינה לביצוע');
}

async function persistedExecution(page: Page): Promise<PersistedPaperExecution | null> {
  return page.evaluate(() => {
    const parsed = JSON.parse(localStorage.getItem('chartpath:guest-learning-data:v1') ?? '{}') as {
      paperExecutionSessions?: readonly PersistedPaperExecution[];
    };
    return parsed.paperExecutionSessions?.at(-1) ?? null;
  });
}

async function learningCredit(page: Page): Promise<LearningCreditState> {
  return page.evaluate(() => {
    const parsed = JSON.parse(localStorage.getItem('chartpath:guest-learning-data:v1') ?? '{}') as {
      attempts?: readonly unknown[];
      projections?: unknown;
    };
    return { attempts: parsed.attempts ?? [], projections: parsed.projections ?? null };
  });
}

async function advanceTo(page: Page, targetCandleIndex: number) {
  let execution = await persistedExecution(page);
  while (execution && execution.lastProcessedCandleIndex < targetCandleIndex) {
    const nextIndex = execution.lastProcessedCandleIndex + 1;
    await page.getByTestId('paper-advance-one').click();
    await expect
      .poll(async () => (await persistedExecution(page))?.lastProcessedCandleIndex)
      .toBe(nextIndex);
    execution = await persistedExecution(page);
  }
}

test('market paper order opens on the next candle and closes at an adverse gap stop with a deterministic debrief', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await completeHistoricalAnalysis(page);
  const creditBefore = await learningCredit(page);
  await launchPaperExecution(page);
  await fillTicket(page, {
    orderType: 'market',
    entry: '108',
    stop: '109.50',
    target: '107',
  });
  await submitPaperOrder(page);

  await advanceTo(page, 73);
  await expect(page.getByTestId('paper-execution-events')).toContainText('נפתחה פוזיציה מדומה');
  expect(await persistedExecution(page)).toMatchObject({
    status: 'open',
    lastProcessedCandleIndex: 73,
    position: { status: 'open', openedAtCandleIndex: 73 },
  });

  await advanceTo(page, 85);
  await expect(page.getByTestId('paper-execution-debrief')).toBeVisible();
  const closed = await persistedExecution(page);
  expect(closed).toMatchObject({
    status: 'closed',
    lastProcessedCandleIndex: 85,
    position: {
      status: 'closed-stop',
      closedAtCandleIndex: 85,
      exitFill: { candleIndex: 85, referencePrice: 109.53, gap: true },
    },
    debrief: { outcome: 'protective-stop', outcomeDeterminate: true },
  });
  expect(closed?.events.filter(({ type }) => type === 'order-filled')).toHaveLength(1);
  expect(closed?.events.filter(({ type }) => type === 'position-closed-stop')).toHaveLength(1);
  expect(await learningCredit(page)).toEqual(creditBefore);
});

test('working short limit order resumes exactly after reload without duplicate events or credit', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await completeHistoricalAnalysis(page);
  const creditBefore = await learningCredit(page);
  await launchPaperExecution(page);
  await fillTicket(page, {
    orderType: 'limit',
    entry: '110.50',
    stop: '111.50',
    target: '108',
  });
  await submitPaperOrder(page);
  await advanceTo(page, 73);

  const beforeReload = await persistedExecution(page);
  expect(beforeReload).toMatchObject({
    status: 'working',
    lastProcessedCandleIndex: 73,
    workingOrder: { status: 'working' },
  });
  expect(beforeReload?.events.filter(({ type }) => type === 'order-filled')).toHaveLength(0);

  await page.reload();
  await expect(page.getByTestId('paper-execution-screen')).toBeVisible();
  await expect(page.getByTestId('paper-execution-events')).toContainText('ההוראה ממתינה לביצוע');
  expect(await persistedExecution(page)).toEqual(beforeReload);
  expect(await learningCredit(page)).toEqual(creditBefore);
});

test('same-candle stop and target touch ends explicitly as ambiguous and never chooses a favorable outcome', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await completeHistoricalAnalysis(page);
  const creditBefore = await learningCredit(page);
  await launchPaperExecution(page);
  await fillTicket(page, {
    orderType: 'market',
    entry: '108',
    stop: '108.20',
    target: '107.90',
  });
  await submitPaperOrder(page);
  await advanceTo(page, 73);

  await expect(page.getByTestId('paper-execution-ambiguous')).toBeVisible();
  const ambiguous = await persistedExecution(page);
  expect(ambiguous).toMatchObject({
    status: 'ambiguous',
    lastProcessedCandleIndex: 73,
    position: {
      status: 'ambiguous',
      closedAtCandleIndex: 73,
      ambiguityReason: 'stop-and-target-same-candle',
    },
    debrief: { outcome: 'ambiguous', outcomeDeterminate: false },
  });
  expect(ambiguous?.position?.exitFill).toBeUndefined();
  expect(ambiguous?.events.filter(({ type }) => type === 'execution-ambiguous')).toHaveLength(1);
  expect(ambiguous?.events.some(({ type }) => type === 'position-closed-target')).toBe(false);
  expect(await learningCredit(page)).toEqual(creditBefore);
});
