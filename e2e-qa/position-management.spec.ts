import { expect, type Page, test } from '@playwright/test';

const STORAGE_KEY = 'chartpath:guest-learning-data:v1';
const MANAGEMENT_CANDIDATES = {
  'long-2-0': {
    candidateKey: 'candidate-10',
  },
  'long-2-1': {
    candidateKey: 'candidate-11',
  },
  'short-2-0': {
    candidateKey: 'candidate-12',
  },
} as const;

type ManagementVariant = keyof typeof MANAGEMENT_CANDIDATES;
type ManagementAction =
  'full-exit' | 'partial-exit' | 'scale-in' | 'replace-stop' | 'replace-target';

interface StoredManagementSession {
  readonly sessionId: string;
  readonly revision: number;
  readonly status: string;
  readonly lastProcessedCandleIndex: number;
  readonly openQuantityUnits: number;
  readonly source: {
    readonly analysisSessionId: string;
    readonly scenarioVersion: string;
    readonly learningCredit: string;
  };
  readonly pendingAction?: { readonly intent?: { readonly kind?: string } };
  readonly draft?: {
    readonly riskAssessment?: { readonly hardRejectionCodes?: readonly string[] };
  };
  readonly events: readonly {
    readonly type: string;
    readonly fill?: { readonly gap?: boolean };
  }[];
  readonly accounting: { readonly realizedNetMinor: number };
  readonly debrief?: {
    readonly outcome: string;
    readonly processQuality: string;
    readonly realizedNetMinor: number;
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

async function enterQa(page: Page) {
  await page.goto('/historical-scenario-qa?developer=1');
  await expect(page.getByTestId('scenario-qa-gate')).toBeVisible();
  await page.getByTestId('scenario-qa-ack').click();
  await page.getByTestId('scenario-qa-enter').click();
  await expect(page.getByTestId('scenario-qa-persistent-warning')).toContainText('ללא קרדיט');
}

async function latestManagement(page: Page): Promise<StoredManagementSession | null> {
  return page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) ?? '{}') as {
      positionManagementSessions?: readonly StoredManagementSession[];
    };
    return stored.positionManagementSessions?.at(-1) ?? null;
  }, STORAGE_KEY);
}

async function creditState(page: Page) {
  return page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) ?? '{}') as {
      attempts?: readonly unknown[];
      projections?: unknown;
    };
    return { attempts: stored.attempts ?? [], projections: stored.projections ?? null };
  }, STORAGE_KEY);
}

async function sourceAnalysis(page: Page, session: StoredManagementSession) {
  return page.evaluate(
    ({ key, id }) => {
      const stored = JSON.parse(localStorage.getItem(key) ?? '{}') as {
        analysisSessions?: readonly { readonly sessionId: string }[];
      };
      return stored.analysisSessions?.find(({ sessionId }) => sessionId === id) ?? null;
    },
    { key: STORAGE_KEY, id: session.source.analysisSessionId },
  );
}

async function launchManagedOpen(page: Page, variant: ManagementVariant) {
  await enterQa(page);
  const control = MANAGEMENT_CANDIDATES[variant];
  const startTestId = `scenario-qa-start-${control.candidateKey}`;
  if ((await page.getByTestId(startTestId).count()) === 0) {
    await page.getByTestId(`scenario-qa-select-${control.candidateKey}`).click();
  }
  await page.getByTestId(startTestId).click();
  await page.waitForURL(/\/paper-execution\?[^#]*analysisSessionId=[^&]+/);
  await expect(page.getByTestId('paper-management-screen')).toBeVisible();
  await expect(page.getByTestId('paper-management-dashboard')).toBeVisible();
  const management = await latestManagement(page);
  expect(management).toMatchObject({ status: 'active', source: { learningCredit: 'none' } });
  return management!;
}

async function waitForManagementRevision(page: Page, priorRevision: number) {
  await expect
    .poll(async () => (await latestManagement(page))?.revision ?? -1)
    .toBeGreaterThan(priorRevision);
  return (await latestManagement(page))!;
}

async function selectCoherentEvidence(page: Page) {
  await page.getByTestId('paper-management-basis-predefined-plan').click();
  await page.getByTestId('paper-management-risk-reviewed').click();
  for (const tag of ['predefined-plan', 'risk-budget', 'uncertainty-recorded']) {
    await page.getByTestId(`paper-management-tag-${tag}`).click();
  }
}

async function prepareAction(
  page: Page,
  kind: ManagementAction,
  options: { readonly quantity?: string; readonly level?: string } = {},
) {
  await page.getByTestId(`paper-management-action-${kind}`).click();
  if (options.quantity !== undefined) {
    await page.getByTestId('paper-management-input-quantity').fill(options.quantity);
  }
  if (options.level !== undefined) {
    await page.getByTestId('paper-management-input-level').fill(options.level);
  }
  await page
    .getByTestId('paper-management-input-rationale')
    .fill('פעולת סימולטור מתועדת לפי הראיות הגלויות בלבד וללא שימוש בתוצאה עתידית.');
  await selectCoherentEvidence(page);
  await expect(page.getByTestId('paper-management-risk-comparison')).toBeVisible();
}

async function submitPreparedAction(page: Page) {
  const before = await latestManagement(page);
  expect(before).not.toBeNull();
  await page.getByTestId('paper-management-confirm').click();
  const warning = page.getByTestId('paper-management-warning-confirmation');
  if (await warning.isVisible()) await warning.click();
  await expect(page.getByTestId('paper-management-submit')).toBeEnabled();
  await page.getByTestId('paper-management-submit').click();
  const submitted = await waitForManagementRevision(page, before!.revision);
  await expect(page.getByTestId('paper-management-pending')).toBeVisible();
  return submitted;
}

async function submitAction(
  page: Page,
  kind: ManagementAction,
  options: { readonly quantity?: string; readonly level?: string } = {},
) {
  await prepareAction(page, kind, options);
  return submitPreparedAction(page);
}

async function advanceManagement(page: Page) {
  const before = await latestManagement(page);
  expect(before).not.toBeNull();
  await page.getByTestId('paper-advance-one').click();
  return waitForManagementRevision(page, before!.revision);
}

async function advanceUntil(
  page: Page,
  predicate: (session: StoredManagementSession) => boolean,
  maximumCandles = 32,
) {
  for (let count = 0; count < maximumCandles; count += 1) {
    const current = await latestManagement(page);
    expect(current).not.toBeNull();
    if (predicate(current!)) return current!;
    await advanceManagement(page);
  }
  throw new Error(
    'The position-management replay did not reach the requested deterministic state.',
  );
}

async function completeNoTradeCandidate(page: Page) {
  const correctEvidenceSuffix = 'יש לנמק באמצעות הכלל שנקבע מראש';
  await enterQa(page);
  await page.getByTestId('scenario-qa-select-candidate-04').click();
  await page.getByTestId('scenario-qa-start-candidate-04').click();
  await page.waitForURL(/\/analysis\?sessionId=/);
  for (let stepIndex = 0; stepIndex < 11; stepIndex += 1) {
    const interaction = page.getByTestId('capstone-interaction');
    if (stepIndex === 9) {
      await interaction.getByRole('radio', { name: 'אי־עסקה' }).click();
      await interaction.getByRole('checkbox', { name: /ההחלטה נשענת על שילוב הקשר/ }).click();
    } else {
      const radios = interaction.getByRole('radio');
      let selected = false;
      for (let index = 0; index < (await radios.count()); index += 1) {
        const radio = radios.nth(index);
        if ((await radio.getAttribute('aria-label'))?.includes(correctEvidenceSuffix)) {
          await radio.click();
          selected = true;
          break;
        }
      }
      expect(selected).toBe(true);
    }
    await page.getByRole('button', { name: 'הגשת השלב', exact: true }).click();
  }
  await page.getByRole('button', { name: 'סיום מפורש של הניתוח' }).click();
  await page.getByRole('button', { name: 'אישור וסיום' }).click();
  await expect(page.getByTestId('guided-analysis-debrief').last()).toBeVisible();
}

test.beforeEach(async ({ page }) => beginFreshGuest(page));

test('partial exit is filled before the remaining long position reaches its final target', async ({
  page,
}) => {
  await launchManagedOpen(page, 'long-2-0');
  await submitAction(page, 'partial-exit', { quantity: '4' });
  const partial = await advanceManagement(page);
  expect(partial).toMatchObject({ status: 'active', openQuantityUnits: 6 });
  expect(partial.events.some(({ type }) => type === 'voluntary-exit-filled')).toBe(true);
  const terminal = await advanceUntil(page, ({ status }) => status === 'closed-target', 20);
  expect(terminal).toMatchObject({ status: 'closed-target', openQuantityUnits: 0 });
  await expect(page.getByTestId('paper-management-debrief')).toBeVisible();
});

test('a full voluntary close becomes terminal exactly once', async ({ page }) => {
  await launchManagedOpen(page, 'long-2-0');
  await submitAction(page, 'full-exit');
  const closed = await advanceManagement(page);
  expect(closed).toMatchObject({ status: 'closed-voluntary', openQuantityUnits: 0 });
  expect(closed.events.filter(({ type }) => type === 'voluntary-exit-filled')).toHaveLength(1);
  await expect(page.getByTestId('paper-management-debrief')).toBeVisible();
});

test('a valid scale-in increases open quantity within the bound', async ({ page }) => {
  await launchManagedOpen(page, 'long-2-0');
  await submitAction(page, 'scale-in', { quantity: '2' });
  const scaled = await advanceManagement(page);
  expect(scaled).toMatchObject({ status: 'active', openQuantityUnits: 12 });
  expect(scaled.events.some(({ type }) => type === 'scale-in-filled')).toBe(true);
});

test('an over-risk scale-in is rejected before submission', async ({ page }) => {
  await launchManagedOpen(page, 'long-2-0');
  await prepareAction(page, 'scale-in', { quantity: '11' });
  const hardErrors = page.getByTestId('paper-management-hard-error');
  await expect(hardErrors).toHaveCount(2);
  await expect(hardErrors).toContainText([
    'הפעולה חורגת מגבול הסיכון הקשיח של התרחיש.',
    'הכמות לאחר ההוספה חורגת מגבול הכמות של התרחיש.',
  ]);
  await expect(page.getByTestId('paper-management-submit')).toBeDisabled();
  expect((await latestManagement(page))?.pendingAction).toBeUndefined();
});

test('a protective stop replacement is pending first and applied on the next candle', async ({
  page,
}) => {
  await launchManagedOpen(page, 'long-2-0');
  const pending = await submitAction(page, 'replace-stop', { level: '104' });
  expect(pending.pendingAction?.intent?.kind).toBe('replace-stop');
  const applied = await advanceManagement(page);
  expect(applied.pendingAction).toBeUndefined();
  expect(applied.events.some(({ type }) => type === 'protective-stop-replaced')).toBe(true);
});

test('reload preserves a pending management action byte-for-byte', async ({ page }) => {
  await launchManagedOpen(page, 'long-2-0');
  await submitAction(page, 'replace-target', { level: '113' });
  const beforeReload = await latestManagement(page);
  await page.reload();
  await expect(page.getByTestId('paper-management-pending')).toBeVisible();
  expect(await latestManagement(page)).toEqual(beforeReload);
});

test('reload preserves the untouched managed-open aggregate byte-for-byte', async ({ page }) => {
  const beforeReload = await launchManagedOpen(page, 'long-2-0');
  await page.reload();
  await expect(page.getByTestId('paper-management-dashboard')).toBeVisible();
  expect(await latestManagement(page)).toEqual(beforeReload);
});

test('a short stop replacement is processed before the later adverse gap', async ({ page }) => {
  await launchManagedOpen(page, 'short-2-0');
  await submitAction(page, 'replace-stop', { level: '96' });
  const terminal = await advanceUntil(page, ({ status }) => status === 'closed-stop', 4);
  const replacementIndex = terminal.events.findIndex(
    ({ type }) => type === 'protective-stop-replaced',
  );
  const stopIndex = terminal.events.findIndex(({ type }) => type === 'position-closed-stop');
  expect(replacementIndex).toBeGreaterThanOrEqual(0);
  expect(stopIndex).toBeGreaterThan(replacementIndex);
  expect(terminal.events.some(({ fill }) => fill?.gap)).toBe(true);
});

test('same-candle management uncertainty ends in an explicit ambiguity state', async ({ page }) => {
  await launchManagedOpen(page, 'long-2-1');
  await submitAction(page, 'partial-exit', { quantity: '4' });
  const ambiguous = await advanceManagement(page);
  expect(ambiguous.status).toBe('ambiguous');
  await expect(page.getByTestId('paper-management-ambiguous')).toBeVisible();
  await expect(page.getByTestId('paper-management-debrief')).toBeVisible();
});

test('a correct no-trade analysis never exposes paper or management controls', async ({ page }) => {
  test.setTimeout(180_000);
  await completeNoTradeCandidate(page);
  await expect(page.getByTestId('paper-execution-launch')).toHaveCount(0);
  await expect(page.getByTestId('paper-management-screen')).toHaveCount(0);
  await expect(page.getByTestId('paper-management-action-selector')).toHaveCount(0);
});

test('profitable management cannot mutate the finalized analysis grade', async ({ page }) => {
  const management = await launchManagedOpen(page, 'long-2-0');
  const analysisBefore = await sourceAnalysis(page, management);
  await submitAction(page, 'partial-exit', { quantity: '4' });
  await advanceManagement(page);
  const terminal = await advanceUntil(page, ({ status }) => status === 'closed-target', 20);
  expect(terminal.accounting.realizedNetMinor).not.toBe(0);
  expect(await sourceAnalysis(page, terminal)).toEqual(analysisBefore);
  await expect(page.getByTestId('paper-management-debrief')).toContainText(
    'רווח או הפסד מדומים אינם משנים את ציון הניתוח',
  );
});

test('management remains internal, visibly no-credit, and isolated from learner projections', async ({
  page,
}) => {
  const creditBefore = await creditState(page);
  await launchManagedOpen(page, 'long-2-0');
  await expect(page.getByTestId('paper-management-dashboard')).toContainText('ללא קרדיט');
  await submitAction(page, 'full-exit');
  await advanceManagement(page);
  expect(await creditState(page)).toEqual(creditBefore);
});
