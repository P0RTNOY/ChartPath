import { expect, type Page, test } from '@playwright/test';

const CORRECT_EVIDENCE_SUFFIX = 'יש לנמק באמצעות הכלל שנקבע מראש';
const CORRECT_MANAGEMENT_REASON = 'ההחלטה נשענת על שילוב הקשר';

type CandidateKey =
  | 'candidate-01'
  | 'candidate-02'
  | 'candidate-03'
  | 'candidate-04'
  | 'candidate-07'
  | 'candidate-08'
  | 'candidate-09';

interface StoredAnalysis {
  readonly sessionId: string;
  readonly status: string;
  readonly chart?: { readonly scenarioId?: string };
  readonly steps: Readonly<
    Record<string, { readonly status?: string; readonly result?: { readonly score?: number } }>
  >;
}

interface StoredExecution {
  readonly sessionId: string;
  readonly status: string;
  readonly revision: number;
  readonly lastProcessedCandleIndex: number;
  readonly source: { readonly analysisSessionId: string };
  readonly events: readonly {
    readonly type: string;
    readonly candleIndex?: number;
    readonly fill?: { readonly gap?: boolean };
  }[];
  readonly workingOrder?: { readonly status?: string };
  readonly position?: {
    readonly status?: string;
    readonly ambiguityReason?: string;
    readonly exitFill?: { readonly gap?: boolean };
  };
  readonly debrief?: {
    readonly outcome?: string;
    readonly outcomeDeterminate?: boolean;
    readonly netSimulatedOutcome?: number;
  };
}

async function beginFreshGuest(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('onboarding-screen')).toBeVisible();
  await page.getByRole('button', { name: 'המשך כאורח' }).click();
  await page.getByRole('checkbox', { name: 'קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד' }).click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('radio', { name: '10 דקות ביום' }).click();
  await page.getByRole('button', { name: 'בנו לי מסלול' }).click();
  await expect(page.getByRole('heading', { name: 'המסלול שלי' })).toBeVisible();
}

async function creditState(page: Page) {
  return page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('chartpath:guest-learning-data:v1') ?? '{}') as {
      attempts?: readonly unknown[];
      projections?: unknown;
    };
    return { attempts: stored.attempts ?? [], projections: stored.projections ?? null };
  });
}

async function activeAnalysis(page: Page): Promise<StoredAnalysis | null> {
  return page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('chartpath:guest-learning-data:v1') ?? '{}') as {
      analysisSessions?: readonly StoredAnalysis[];
    };
    return stored.analysisSessions?.find(({ status }) => status === 'active') ?? null;
  });
}

async function finalizedAnalysis(page: Page, sessionId: string): Promise<StoredAnalysis | null> {
  return page.evaluate((id) => {
    const stored = JSON.parse(localStorage.getItem('chartpath:guest-learning-data:v1') ?? '{}') as {
      analysisSessions?: readonly StoredAnalysis[];
    };
    return stored.analysisSessions?.find(({ sessionId }) => sessionId === id) ?? null;
  }, sessionId);
}

async function executionFor(
  page: Page,
  analysisSessionId: string,
): Promise<StoredExecution | null> {
  return page.evaluate((id) => {
    const stored = JSON.parse(localStorage.getItem('chartpath:guest-learning-data:v1') ?? '{}') as {
      paperExecutionSessions?: readonly StoredExecution[];
    };
    return (
      stored.paperExecutionSessions?.find(({ source }) => source.analysisSessionId === id) ?? null
    );
  }, analysisSessionId);
}

async function enterQa(page: Page) {
  await page.goto('/historical-scenario-qa?developer=1');
  await expect(page.getByTestId('scenario-qa-gate')).toBeVisible();
  await expect(page.getByTestId('scenario-qa-enter')).toBeDisabled();
  await page.getByTestId('scenario-qa-ack').click();
  await page.getByTestId('scenario-qa-enter').click();
  await expect(page.getByTestId('scenario-qa-screen')).toBeVisible();
  await expect(page.getByTestId('scenario-qa-persistent-warning')).toContainText('ללא קרדיט');
  await expect(page.getByTestId('scenario-qa-persistent-warning')).toContainText('לא פורסם');
}

async function startCandidate(page: Page, key: CandidateKey): Promise<string> {
  await enterQa(page);
  const card = page.getByTestId(`scenario-qa-candidate-${key}`);
  await expect(card).toContainText('התשובה מוסתרת');
  await expect(card).not.toContainText(/לונג|שורט|אי־עסקה/);
  await page.getByTestId(`scenario-qa-select-${key}`).click();
  await expect(page.getByTestId('scenario-qa-revealed-detail')).toHaveCount(0);
  await page.getByTestId(`scenario-qa-start-${key}`).click();
  await page.waitForURL(/\/analysis\?sessionId=/);
  await expect(page.getByTestId('guided-analysis-session')).toBeVisible();
  await expect(page.getByTestId('historical-session-disclosure')).toContainText(
    /ללא[^]*XP[^]*רגיל/,
  );
  await expect(page.getByTestId('guided-analysis-session')).toContainText('64/64');
  await expect.poll(() => activeAnalysis(page)).not.toBeNull();
  const active = await activeAnalysis(page);
  expect(active?.sessionId).toBeTruthy();
  return active!.sessionId;
}

async function chooseEvidenceBeforeOutcome(page: Page) {
  const interaction = page.getByTestId('capstone-interaction');
  const radios = interaction.getByRole('radio');
  const count = await radios.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = radios.nth(index);
    const label = await candidate.getAttribute('aria-label');
    if (label?.includes(CORRECT_EVIDENCE_SUFFIX)) {
      await candidate.click();
      return;
    }
  }
  throw new Error('No evidence-before-outcome option was exposed for the active workflow step.');
}

async function completeCandidateAnalysis(
  page: Page,
  decision: 'trade' | 'no-trade',
): Promise<void> {
  for (let stepIndex = 0; stepIndex < 11; stepIndex += 1) {
    if (stepIndex === 9) {
      await page
        .getByTestId('capstone-interaction')
        .getByRole('radio', { name: decision === 'trade' ? 'עסקה לפי התכנית' : 'אי־עסקה' })
        .click();
      await page
        .getByTestId('capstone-interaction')
        .getByRole('checkbox', { name: new RegExp(CORRECT_MANAGEMENT_REASON) })
        .click();
    } else {
      await chooseEvidenceBeforeOutcome(page);
    }
    await page.getByRole('button', { name: 'הגשת השלב', exact: true }).click();
    await expect
      .poll(async () => {
        const session = await activeAnalysis(page);
        return Object.values(session?.steps ?? {}).filter(({ status }) => status === 'submitted')
          .length;
      })
      .toBe(stepIndex + 1);
  }
}

async function finalizeCandidate(page: Page, sessionId: string) {
  await page.getByRole('button', { name: 'סיום מפורש של הניתוח' }).click();
  await expect(page.getByLabel('אישור סיום הניתוח')).toBeVisible();
  await page.getByRole('button', { name: 'אישור וסיום' }).click();
  await expect(page.getByTestId('guided-analysis-debrief').last()).toBeVisible();
  await expect(page.getByTestId('guided-analysis-debrief').last()).toContainText('100%');
  await expect
    .poll(async () => (await finalizedAnalysis(page, sessionId))?.status)
    .toBe('finalized');
}

async function launchPaper(page: Page) {
  await expect(page.getByTestId('paper-execution-launch')).toBeVisible();
  await page.getByTestId('paper-execution-launch').click();
  await page.waitForURL(/\/paper-execution\?analysisSessionId=/);
  await expect(page.getByTestId('paper-execution-ticket')).toBeVisible();
}

async function submitPlan(
  page: Page,
  plan: {
    readonly orderType: 'market' | 'limit' | 'stop';
    readonly entry: string;
    readonly stop: string;
    readonly target: string;
  },
) {
  await page.getByTestId(`paper-order-type-${plan.orderType}`).click();
  await page.getByTestId('paper-input-entry').fill(plan.entry);
  await page.getByTestId('paper-input-stop').fill(plan.stop);
  await page.getByTestId('paper-input-target').fill(plan.target);
  await page.getByTestId('paper-input-account').fill('100000');
  await page.getByTestId('paper-input-risk').fill('1000');
  await page.getByTestId('paper-input-quantity').fill('10');
  const confirmation = page.getByRole('checkbox', {
    name: 'אישור הבנת מגבלות הסימולטור',
  });
  await expect(confirmation).toBeEnabled();
  await confirmation.click();
  await page.getByTestId('paper-submit-order').click();
  await expect(page.getByTestId('paper-submit-order')).toHaveCount(0);
}

async function advanceOnce(page: Page, analysisSessionId: string) {
  const before = await executionFor(page, analysisSessionId);
  expect(before).not.toBeNull();
  await page.getByTestId('paper-advance-one').click();
  await expect
    .poll(async () => (await executionFor(page, analysisSessionId))?.revision)
    .toBeGreaterThan(before!.revision);
}

async function advanceToTerminal(page: Page, analysisSessionId: string) {
  for (let count = 0; count < 32; count += 1) {
    const session = await executionFor(page, analysisSessionId);
    if (!session || !['working', 'open'].includes(session.status)) return session;
    await advanceOnce(page, analysisSessionId);
  }
  return executionFor(page, analysisSessionId);
}

test('QA gate requires acknowledgement and starts a blind candidate without revealing identity or granting credit', async ({
  page,
}) => {
  await beginFreshGuest(page);
  const before = await creditState(page);
  await startCandidate(page, 'candidate-02');
  await expect(page.getByTestId('historical-replay-reveal')).toHaveCount(0);
  expect(await creditState(page)).toEqual(before);
});

test('only the three selected candidates expose local reviewer packets after the explicit QA reveal', async ({
  page,
}) => {
  await beginFreshGuest(page);
  const selected = [
    ['candidate-04', 'publication-candidate-no-trade-v1'],
    ['candidate-11', 'publication-candidate-long-v1'],
    ['candidate-12', 'publication-candidate-short-v1'],
  ] as const;

  for (const [key, candidateId] of selected) {
    await enterQa(page);
    await expect(page.getByTestId(`scenario-qa-candidate-${key}`)).not.toContainText(candidateId);
    await page.getByTestId(`scenario-qa-select-${key}`).click();
    await expect(page.getByTestId('scenario-qa-review-packet')).toHaveCount(0);
    await page.getByTestId(`scenario-qa-reveal-${key}`).click();
    const packet = page.getByTestId('scenario-qa-review-packet');
    await expect(packet).toContainText(candidateId);
    await expect(packet).toContainText(
      `review-packets/${candidateId}/review-packet.canonical.jsonl`,
    );
    await expect(packet).toContainText(/נדרשות[^]*8[^]*סקירות חתומות/);
    await expect(packet).toContainText('אינה אישור לפרסום');
  }
});

test('authored long candidate reaches its deterministic target while process score remains 100%', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await beginFreshGuest(page);
  const creditBefore = await creditState(page);
  const sessionId = await startCandidate(page, 'candidate-02');
  await completeCandidateAnalysis(page, 'trade');
  await finalizeCandidate(page, sessionId);
  await launchPaper(page);
  await submitPlan(page, { orderType: 'market', entry: '106.14', stop: '103', target: '112' });
  const execution = await advanceToTerminal(page, sessionId);
  expect(execution).toMatchObject({
    status: 'closed',
    position: { status: 'closed-target' },
    debrief: { outcome: 'target', outcomeDeterminate: true },
  });
  await expect(page.getByTestId('paper-execution-debrief')).toBeVisible();
  expect(await creditState(page)).toEqual(creditBefore);
});

test('authored short candidate reaches its deterministic target', async ({ page }) => {
  test.setTimeout(180_000);
  await beginFreshGuest(page);
  const sessionId = await startCandidate(page, 'candidate-07');
  await completeCandidateAnalysis(page, 'trade');
  await finalizeCandidate(page, sessionId);
  await launchPaper(page);
  await submitPlan(page, { orderType: 'market', entry: '94.96', stop: '97', target: '88' });
  expect(await advanceToTerminal(page, sessionId)).toMatchObject({
    status: 'closed',
    position: { status: 'closed-target' },
    debrief: { outcome: 'target', outcomeDeterminate: true },
  });
});

test('correct no-trade candidate finalizes without exposing a contradictory paper CTA', async ({
  page,
}) => {
  await beginFreshGuest(page);
  const creditBefore = await creditState(page);
  const sessionId = await startCandidate(page, 'candidate-04');
  await completeCandidateAnalysis(page, 'no-trade');
  await finalizeCandidate(page, sessionId);
  await expect(page.getByText('תועדה נכון גם החלטה לא לפעול.')).toBeVisible();
  await expect(page.getByTestId('paper-execution-launch')).toHaveCount(0);
  expect(await creditState(page)).toEqual(creditBefore);
});

test('working authored limit order reloads byte-for-byte and expires unfilled', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await beginFreshGuest(page);
  const sessionId = await startCandidate(page, 'candidate-09');
  await completeCandidateAnalysis(page, 'trade');
  await finalizeCandidate(page, sessionId);
  await launchPaper(page);
  await submitPlan(page, { orderType: 'limit', entry: '100', stop: '102', target: '90' });
  await advanceOnce(page, sessionId);
  const beforeReload = await executionFor(page, sessionId);
  expect(beforeReload).toMatchObject({ status: 'working', workingOrder: { status: 'working' } });
  await page.reload();
  await expect(page.getByTestId('paper-execution-screen')).toBeVisible();
  expect(await executionFor(page, sessionId)).toEqual(beforeReload);
  const completed = await advanceToTerminal(page, sessionId);
  expect(completed).toMatchObject({
    status: 'completed',
    workingOrder: { status: 'expired' },
  });
  expect(completed?.events.some(({ type }) => type === 'order-expired')).toBe(true);
});

test('authored stop order preserves adverse opening-gap evidence', async ({ page }) => {
  test.setTimeout(180_000);
  await beginFreshGuest(page);
  const sessionId = await startCandidate(page, 'candidate-08');
  await completeCandidateAnalysis(page, 'trade');
  await finalizeCandidate(page, sessionId);
  await launchPaper(page);
  await submitPlan(page, { orderType: 'stop', entry: '90', stop: '97', target: '82' });
  const execution = await advanceToTerminal(page, sessionId);
  expect(execution).toMatchObject({ status: 'closed', debrief: { outcome: 'target' } });
  expect(execution?.events.some(({ type }) => type === 'order-filled')).toBe(true);
  expect(
    execution?.events.some(({ type, fill }) => type === 'order-filled' && fill?.gap === true),
  ).toBe(true);
});

test('authored same-candle scenario is ambiguous and never invents a favorable sequence', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await beginFreshGuest(page);
  const sessionId = await startCandidate(page, 'candidate-03');
  await completeCandidateAnalysis(page, 'trade');
  await finalizeCandidate(page, sessionId);
  await launchPaper(page);
  await submitPlan(page, { orderType: 'stop', entry: '114', stop: '113.5', target: '114.8' });
  const execution = await advanceToTerminal(page, sessionId);
  expect(execution).toMatchObject({
    status: 'ambiguous',
    position: { status: 'ambiguous' },
    debrief: { outcome: 'ambiguous', outcomeDeterminate: false },
  });
  expect(execution?.events.some(({ type }) => type === 'position-closed-target')).toBe(false);
  await expect(page.getByTestId('paper-execution-ambiguous')).toBeVisible();
});

test('identical 100% process grades survive both profitable and adverse authored outcomes', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await beginFreshGuest(page);
  const winningId = await startCandidate(page, 'candidate-02');
  await completeCandidateAnalysis(page, 'trade');
  await finalizeCandidate(page, winningId);
  await launchPaper(page);
  await submitPlan(page, { orderType: 'market', entry: '106.14', stop: '103', target: '112' });
  const winningExecution = await advanceToTerminal(page, winningId);
  expect(winningExecution?.debrief?.outcome).toBe('target');
  await page.goto('/historical-scenario-qa?developer=1');

  const losingId = await startCandidate(page, 'candidate-01');
  await completeCandidateAnalysis(page, 'trade');
  await finalizeCandidate(page, losingId);
  await launchPaper(page);
  await submitPlan(page, { orderType: 'market', entry: '105.04', stop: '104.9', target: '112' });
  const losingExecution = await advanceToTerminal(page, losingId);
  expect(losingExecution?.debrief?.outcome).toBe('protective-stop');

  const winning = await finalizedAnalysis(page, winningId);
  const losing = await finalizedAnalysis(page, losingId);
  const score = (analysis: StoredAnalysis | null) =>
    Object.values(analysis?.steps ?? {}).reduce(
      (total, step) => total + (step.result?.score ?? 0),
      0,
    ) / 11;
  expect(score(winning)).toBe(1);
  expect(score(losing)).toBe(1);
  expect(winningExecution?.debrief?.netSimulatedOutcome).toBeGreaterThan(0);
  expect(losingExecution?.debrief?.netSimulatedOutcome).toBeLessThan(0);
});
