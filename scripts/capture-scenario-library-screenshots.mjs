import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

const baseURL =
  process.env.CHARTPATH_QA_BASE_URL ?? process.env.CHARTPATH_BASE_URL ?? 'http://127.0.0.1:4174';
const outputDirectory = join(process.cwd(), 'docs', 'screenshots');
const storageKey = 'chartpath:guest-learning-data:v1';
const correctEvidenceSuffix = 'יש לנמק באמצעות הכלל שנקבע מראש';
const correctManagementReason = 'ההחלטה נשענת על שילוב הקשר';
const selectedTarget = process.env.CHARTPATH_SCREENSHOT_TARGET;

async function stabilizeRuntime(context) {
  await context.addInitScript(() => {
    const NativeDate = Date;
    const fixedTimestamp = NativeDate.parse('2026-08-25T12:00:00.000Z');
    class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedTimestamp]));
      }
      static now() {
        return fixedTimestamp;
      }
    }
    Object.setPrototypeOf(FixedDate, NativeDate);
    globalThis.Date = FixedDate;
    let seed = 0x43504154;
    Math.random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
  });
}

async function newContext(browser, storageState, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'he-IL',
    storageState,
    viewport,
  });
  await stabilizeRuntime(context);
  return context;
}

async function completeOnboarding(page) {
  await page.goto(baseURL);
  await page.getByRole('button', { name: 'המשך כאורח' }).click();
  await page.getByRole('checkbox', { name: 'קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד' }).click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('radio', { name: '10 דקות ביום' }).click();
  await page.getByRole('button', { name: 'בנו לי מסלול' }).click();
  await page.getByRole('heading', { name: 'המסלול שלי' }).waitFor();
}

async function startCandidate(page, key) {
  await page.goto(`${baseURL}/historical-scenario-qa?developer=1`);
  await page.getByTestId('scenario-qa-gate').waitFor();
  await page.getByTestId('scenario-qa-ack').click();
  await page.getByTestId('scenario-qa-enter').click();
  await page.getByTestId(`scenario-qa-select-${key}`).click();
  await page.getByTestId(`scenario-qa-start-${key}`).click();
  await page.waitForURL(/\/analysis\?sessionId=/);
  await page.getByTestId('guided-analysis-session').waitFor();
  return new globalThis.URL(page.url()).searchParams.get('sessionId');
}

async function assertHistoricalScenarioIdentity(page, sessionId, scenarioId, scenarioVersion) {
  const identity = await page.evaluate(
    ({ key, id }) => {
      const stored = JSON.parse(globalThis.localStorage.getItem(key) ?? '{}');
      const session = stored.analysisSessions?.find((item) => item.sessionId === id);
      return session?.chart?.kind === 'historical'
        ? {
            scenarioId: session.chart.scenarioId,
            scenarioVersion: session.chart.scenarioVersion,
          }
        : undefined;
    },
    { key: storageKey, id: sessionId },
  );
  if (identity?.scenarioId !== scenarioId || identity.scenarioVersion !== scenarioVersion) {
    throw new Error(
      `Screenshot scenario identity mismatch: expected ${scenarioId}@${scenarioVersion}, received ${identity?.scenarioId ?? 'missing'}@${identity?.scenarioVersion ?? 'missing'}.`,
    );
  }
}

async function chooseEvidence(page) {
  const radios = page.getByTestId('capstone-interaction').getByRole('radio');
  for (let index = 0; index < (await radios.count()); index += 1) {
    const option = radios.nth(index);
    const label = await option.getAttribute('aria-label');
    if (label?.includes(correctEvidenceSuffix)) {
      await option.click();
      return;
    }
  }
  throw new Error('The active scenario step has no evidence-before-outcome option.');
}

async function completeSteps(page, sessionId, decision, count = 11) {
  for (let index = 0; index < count; index += 1) {
    if (index === 9) {
      await page
        .getByTestId('capstone-interaction')
        .getByRole('radio', { name: decision === 'trade' ? 'עסקה לפי התכנית' : 'אי־עסקה' })
        .click();
      await page
        .getByTestId('capstone-interaction')
        .getByRole('checkbox', { name: new RegExp(correctManagementReason) })
        .click();
    } else {
      await chooseEvidence(page);
    }
    await page.getByRole('button', { name: 'הגשת השלב', exact: true }).click();
    await page.waitForFunction(
      ({ key, id, expected }) => {
        const stored = JSON.parse(globalThis.localStorage.getItem(key) ?? '{}');
        const session = stored.analysisSessions?.find((item) => item.sessionId === id);
        return (
          Object.values(session?.steps ?? {}).filter((step) => step.status === 'submitted')
            .length === expected
        );
      },
      { key: storageKey, id: sessionId, expected: index + 1 },
    );
  }
}

async function finalize(page) {
  await page.getByRole('button', { name: 'סיום מפורש של הניתוח' }).click();
  await page.getByRole('button', { name: 'אישור וסיום' }).click();
  await page.getByTestId('guided-analysis-debrief').last().waitFor();
}

async function fillPlan(page, { orderType, entry, stop, target }) {
  await page.getByTestId('paper-execution-launch').click();
  await page.waitForURL(/\/paper-execution\?analysisSessionId=/);
  await page.getByTestId('paper-execution-ticket').waitFor();
  await page.getByTestId(`paper-order-type-${orderType}`).click();
  await page.getByTestId('paper-input-entry').fill(entry);
  await page.getByTestId('paper-input-stop').fill(stop);
  await page.getByTestId('paper-input-target').fill(target);
  await page.getByTestId('paper-input-account').fill('100000');
  await page.getByTestId('paper-input-risk').fill('1000');
  await page.getByTestId('paper-input-quantity').fill('10');
}

async function submitPlan(page) {
  await page.getByRole('checkbox', { name: 'אישור הבנת מגבלות הסימולטור' }).click();
  await page.getByTestId('paper-submit-order').click();
  await page.getByTestId('paper-submit-order').waitFor({ state: 'detached' });
}

async function execution(page, analysisSessionId) {
  return page.evaluate(
    ({ key, id }) => {
      const stored = JSON.parse(globalThis.localStorage.getItem(key) ?? '{}');
      return stored.paperExecutionSessions?.find(
        (session) => session.source.analysisSessionId === id,
      );
    },
    { key: storageKey, id: analysisSessionId },
  );
}

async function advanceUntil(page, analysisSessionId, predicate) {
  for (let count = 0; count < 32; count += 1) {
    const before = await execution(page, analysisSessionId);
    if (predicate(before)) return before;
    const revision = before.revision;
    await page.getByTestId('paper-advance-one').click();
    await page.waitForFunction(
      ({ key, id, priorRevision }) => {
        const stored = JSON.parse(globalThis.localStorage.getItem(key) ?? '{}');
        return stored.paperExecutionSessions?.find(
          (session) => session.source.analysisSessionId === id && session.revision > priorRevision,
        );
      },
      { key: storageKey, id: analysisSessionId, priorRevision: revision },
    );
  }
  throw new Error(`Execution for ${analysisSessionId} did not reach the requested state.`);
}

async function captureAt(page, locator, filename) {
  await locator.waitFor();
  await locator.evaluate((node) => node.scrollIntoView({ block: 'center' }));
  await page.evaluate('document.fonts.ready');
  await page.evaluate(() => {
    for (const node of globalThis.document.querySelectorAll('div')) {
      if (!node.textContent?.includes('React does not recognize')) continue;
      let overlay = node;
      while (
        overlay.parentElement &&
        !['fixed', 'sticky'].includes(globalThis.getComputedStyle(overlay).position)
      ) {
        overlay = overlay.parentElement;
      }
      if (['fixed', 'sticky'].includes(globalThis.getComputedStyle(overlay).position)) {
        overlay.style.display = 'none';
      }
    }
  });
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    path: join(outputDirectory, filename),
  });
}

async function withPage(browser, storageState, work, viewport) {
  const context = await newContext(browser, storageState, viewport);
  try {
    await work(await context.newPage());
  } finally {
    await context.close();
  }
}

async function captureBlindShort(browser, storageState) {
  await withPage(browser, storageState, async (page) => {
    const sessionId = await startCandidate(page, 'candidate-07');
    await assertHistoricalScenarioIdentity(page, sessionId, 'internal-short-double-top', '1.0.0');
    await captureAt(
      page,
      page.getByTestId('guided-analysis-responsive-layout'),
      'scenario-blind-short-light-phone.png',
    );
  });
}

async function captureSelectedCandidateDecision(
  browser,
  storageState,
  { key, scenarioIdentity, decision, filename, viewport },
) {
  await withPage(
    browser,
    storageState,
    async (page) => {
      await page.goto(`${baseURL}/historical-scenario-qa?developer=1`);
      await page.getByTestId('scenario-qa-gate').waitFor();
      await page.getByTestId('scenario-qa-ack').click();
      await page.getByTestId('scenario-qa-enter').click();
      await page.getByTestId(`scenario-qa-select-${key}`).click();
      await page.getByTestId(`scenario-qa-reveal-${key}`).click();
      const detail = page.getByTestId('scenario-qa-revealed-detail');
      const identity = detail.getByText(scenarioIdentity, { exact: true });
      const decisionLabel = detail.getByText(decision, { exact: true });
      await identity.waitFor();
      await decisionLabel.waitFor();
      await captureAt(page, decisionLabel, filename);
    },
    viewport,
  );
}

async function captureMatrix(browser, storageState) {
  await withPage(browser, storageState, async (page) => {
    await page.goto(`${baseURL}/historical-scenarios`);
    await page.getByTestId('scenario-library-empty').waitFor();
    await captureAt(
      page,
      page.getByTestId('scenario-library-empty'),
      'scenario-library-empty-light-phone.png',
    );
  });

  await withPage(
    browser,
    storageState,
    async (page) => {
      await page.goto(`${baseURL}/historical-scenarios`);
      await page.getByTestId('scenario-library-empty').waitFor();
      await captureAt(
        page,
        page.getByTestId('scenario-library-empty'),
        'scenario-library-empty-light-tablet.png',
      );
    },
    { width: 1024, height: 768 },
  );

  await withPage(browser, storageState, async (page) => {
    await startCandidate(page, 'candidate-02');
    await captureAt(
      page,
      page.getByTestId('guided-analysis-responsive-layout'),
      'scenario-guided-long-light-phone.png',
    );
  });

  await captureBlindShort(browser, storageState);

  await withPage(browser, storageState, async (page) => {
    const sessionId = await startCandidate(page, 'candidate-04');
    await completeSteps(page, sessionId, 'no-trade', 9);
    await page.getByRole('radio', { name: 'אי־עסקה' }).click();
    await page
      .getByTestId('capstone-interaction')
      .getByRole('checkbox', { name: new RegExp(correctManagementReason) })
      .click();
    await captureAt(
      page,
      page.getByTestId('capstone-interaction'),
      'scenario-no-trade-decision-light-phone.png',
    );
  });

  await withPage(browser, storageState, async (page) => {
    const sessionId = await startCandidate(page, 'candidate-04');
    await completeSteps(page, sessionId, 'no-trade');
    await finalize(page);
    await captureAt(
      page,
      page.getByText('תועדה נכון גם החלטה לא לפעול.'),
      'scenario-no-trade-debrief-light-phone.png',
    );
  });

  await withPage(browser, storageState, async (page) => {
    const sessionId = await startCandidate(page, 'candidate-02');
    await completeSteps(page, sessionId, 'trade');
    await finalize(page);
    await fillPlan(page, { orderType: 'market', entry: '106.14', stop: '103', target: '112' });
    await captureAt(
      page,
      page.getByTestId('paper-execution-confirmation'),
      'scenario-trade-plan-confirmation-light-phone.png',
    );
  });

  await withPage(browser, storageState, async (page) => {
    const sessionId = await startCandidate(page, 'candidate-09');
    await completeSteps(page, sessionId, 'trade');
    await finalize(page);
    await fillPlan(page, { orderType: 'limit', entry: '100', stop: '102', target: '90' });
    await submitPlan(page);
    await captureAt(
      page,
      page.getByText('ההוראה ממתינה לביצוע').last(),
      'scenario-working-order-light-phone.png',
    );
  });

  await withPage(browser, storageState, async (page) => {
    const sessionId = await startCandidate(page, 'candidate-03');
    await completeSteps(page, sessionId, 'trade');
    await finalize(page);
    await fillPlan(page, { orderType: 'stop', entry: '114', stop: '113.5', target: '114.8' });
    await submitPlan(page);
    await advanceUntil(page, sessionId, (session) => session.status === 'ambiguous');
    await captureAt(
      page,
      page.getByTestId('paper-execution-ambiguous'),
      'scenario-ambiguity-light-phone.png',
    );
  });

  await withPage(browser, storageState, async (page) => {
    await page.goto(`${baseURL}/historical-scenario-qa?developer=1`);
    await page.getByTestId('scenario-qa-ack').click();
    await page.getByTestId('scenario-qa-enter').click();
    await page.getByTestId('scenario-qa-select-candidate-06').click();
    await page.getByTestId('scenario-qa-reveal-candidate-06').click();
    await captureAt(
      page,
      page.getByTestId('scenario-qa-blockers'),
      'scenario-qa-publication-blockers-light-phone.png',
    );
  });

  await withPage(browser, storageState, async (page) => {
    await page.goto(`${baseURL}/settings`);
    await page.getByRole('radio', { name: 'כהה' }).click();
    await page.goto(`${baseURL}/historical-scenarios`);
    await captureAt(
      page,
      page.getByTestId('scenario-library-empty'),
      'scenario-library-empty-dark-phone.png',
    );
  });

  await withPage(browser, storageState, async (page) => {
    await page.goto(`${baseURL}/settings`);
    await page.getByRole('radio', { name: 'גדול מאוד' }).click();
    await page.getByRole('switch', { name: 'הפחתת תנועה' }).click();
    await startCandidate(page, 'candidate-02');
    await captureAt(
      page,
      page.getByTestId('historical-session-disclosure'),
      'scenario-guided-large-reduced-phone.png',
    );
  });
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
try {
  const setup = await newContext(browser);
  const setupPage = await setup.newPage();
  await completeOnboarding(setupPage);
  const storageState = await setup.storageState();
  await setup.close();
  if (selectedTarget === undefined) await captureMatrix(browser, storageState);
  else if (selectedTarget === 'scenario-blind-short-light-phone') {
    await captureBlindShort(browser, storageState);
  } else if (selectedTarget === 'm7-publication-candidate-long-decision-browser') {
    await captureSelectedCandidateDecision(browser, storageState, {
      key: 'candidate-11',
      scenarioIdentity: 'internal-long-range-breakout@2.1.0',
      decision: 'תרחיש לונג',
      filename: 'm7-publication-candidate-long-decision-browser.png',
    });
  } else if (selectedTarget === 'm7-publication-candidate-short-decision-browser') {
    await captureSelectedCandidateDecision(browser, storageState, {
      key: 'candidate-12',
      scenarioIdentity: 'internal-short-double-top@2.0.0',
      decision: 'תרחיש שורט',
      filename: 'm7-publication-candidate-short-decision-browser.png',
      viewport: { width: 430, height: 932 },
    });
  } else {
    throw new Error(`Unknown screenshot target: ${selectedTarget}`);
  }
} finally {
  await browser.close();
}
