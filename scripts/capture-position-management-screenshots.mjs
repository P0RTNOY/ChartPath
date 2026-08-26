import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

const baseURL =
  process.env.CHARTPATH_QA_BASE_URL ?? process.env.CHARTPATH_BASE_URL ?? 'http://127.0.0.1:4174';
const outputDirectory = join(process.cwd(), 'docs', 'screenshots');
const storageKey = 'chartpath:guest-learning-data:v1';
const fixedNow = '2026-08-25T12:00:00.000Z';
const phone = { width: 390, height: 844 };
const tablet = { width: 1024, height: 768 };
const managementCandidates = {
  'long-2-0': {
    candidateKey: 'candidate-10',
  },
  'long-2-1': {
    candidateKey: 'candidate-11',
  },
};

async function stabilizeRuntime(context) {
  await context.addInitScript((isoTimestamp) => {
    const NativeDate = Date;
    const fixedTimestamp = NativeDate.parse(isoTimestamp);
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
  }, fixedNow);
}

async function createContext(browser, storageState, viewport = phone) {
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
  page.setDefaultNavigationTimeout(120_000);
  await page.goto(baseURL);
  await page.getByRole('button', { name: 'המשך כאורח' }).click();
  await page.getByRole('checkbox', { name: 'קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד' }).click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('radio', { name: '10 דקות ביום' }).click();
  await page.getByRole('button', { name: 'בנו לי מסלול' }).click();
  await page.getByRole('heading', { name: 'המסלול שלי' }).waitFor();
}

async function launchManagedOpen(page, variant = 'long-2-0') {
  await page.goto(`${baseURL}/historical-scenario-qa?developer=1`);
  await page.getByTestId('scenario-qa-gate').waitFor();
  await page.getByTestId('scenario-qa-ack').click();
  await page.getByTestId('scenario-qa-enter').click();
  const control = managementCandidates[variant];
  const startTestId = `scenario-qa-start-${control.candidateKey}`;
  if ((await page.getByTestId(startTestId).count()) === 0) {
    await page.getByTestId(`scenario-qa-select-${control.candidateKey}`).click();
  }
  await page.getByTestId(startTestId).click();
  await page.waitForURL(/\/paper-execution\?[^#]*analysisSessionId=[^&]+/);
  await page.getByTestId('paper-management-dashboard').waitFor();
}

async function managementState(page) {
  return page.evaluate((key) => {
    const parsed = JSON.parse(globalThis.localStorage.getItem(key) ?? '{}');
    return parsed.positionManagementSessions?.at(-1);
  }, storageKey);
}

async function prepareAction(page, kind, { quantity, level } = {}) {
  await page.getByTestId(`paper-management-action-${kind}`).click();
  if (quantity !== undefined) {
    await page.getByTestId('paper-management-input-quantity').fill(quantity);
  }
  if (level !== undefined) await page.getByTestId('paper-management-input-level').fill(level);
  await page
    .getByTestId('paper-management-input-rationale')
    .fill('פעולת סימולטור מתועדת לפי הראיות הגלויות בלבד וללא שימוש בתוצאה עתידית.');
  await page.getByTestId('paper-management-basis-predefined-plan').click();
  await page.getByTestId('paper-management-risk-reviewed').click();
  for (const tag of ['predefined-plan', 'risk-budget', 'uncertainty-recorded']) {
    await page.getByTestId(`paper-management-tag-${tag}`).click();
  }
  await page.getByTestId('paper-management-risk-comparison').waitFor();
}

async function submitPreparedAction(page) {
  const before = await managementState(page);
  await page.getByTestId('paper-management-confirm').click();
  const warning = page.getByTestId('paper-management-warning-confirmation');
  if (await warning.isVisible()) await warning.click();
  await page.getByTestId('paper-management-submit').click();
  await page.waitForFunction(
    ({ key, revision }) => {
      const parsed = JSON.parse(globalThis.localStorage.getItem(key) ?? '{}');
      return parsed.positionManagementSessions?.at(-1)?.revision > revision;
    },
    { key: storageKey, revision: before.revision },
  );
  await page.getByTestId('paper-management-pending').waitFor();
}

async function submitAction(page, kind, options) {
  await prepareAction(page, kind, options);
  await submitPreparedAction(page);
}

async function advanceOne(page) {
  const before = await managementState(page);
  await page.getByTestId('paper-advance-one').click();
  await page.waitForFunction(
    ({ key, revision }) => {
      const parsed = JSON.parse(globalThis.localStorage.getItem(key) ?? '{}');
      return parsed.positionManagementSessions?.at(-1)?.revision > revision;
    },
    { key: storageKey, revision: before.revision },
  );
  return managementState(page);
}

async function advanceUntil(page, predicate, maximumCandles = 24) {
  for (let count = 0; count < maximumCandles; count += 1) {
    const current = await managementState(page);
    if (predicate(current)) return current;
    await advanceOne(page);
  }
  throw new Error('The management replay did not reach the requested capture state.');
}

async function hideToolingOverlays(page) {
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
}

async function captureAt(page, locator, filename) {
  await locator.waitFor();
  await locator.evaluate((node) => node.scrollIntoView({ block: 'center' }));
  await page.evaluate('document.fonts.ready');
  await hideToolingOverlays(page);
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    path: join(outputDirectory, filename),
  });
}

async function withManagedPage(
  browser,
  storageState,
  work,
  { variant = 'long-2-0', viewport = phone, configure } = {},
) {
  const context = await createContext(browser, storageState, viewport);
  try {
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(120_000);
    if (configure) await configure(page);
    await launchManagedOpen(page, variant);
    await work(page);
  } finally {
    await context.close();
  }
}

async function captureMatrix(browser, storageState) {
  await withManagedPage(browser, storageState, async (page) => {
    await captureAt(
      page,
      page.getByTestId('paper-management-position-summary'),
      'position-management-open-dashboard-light-phone.png',
    );
  });

  await withManagedPage(browser, storageState, async (page) => {
    await captureAt(
      page,
      page.getByRole('heading', { name: 'פעולת ניהול חדשה' }),
      'position-management-action-selector-light-phone.png',
    );
  });

  await withManagedPage(browser, storageState, async (page) => {
    await prepareAction(page, 'partial-exit', { quantity: '4' });
    await page.getByTestId('paper-management-confirm').click();
    await captureAt(
      page,
      page.getByTestId('paper-management-review'),
      'position-management-partial-confirmation-light-phone.png',
    );
  });

  await withManagedPage(browser, storageState, async (page) => {
    await prepareAction(page, 'scale-in', { quantity: '2' });
    await captureAt(
      page,
      page.getByTestId('paper-management-risk-comparison'),
      'position-management-scale-in-risk-light-phone.png',
    );
  });

  await withManagedPage(browser, storageState, async (page) => {
    await prepareAction(page, 'replace-stop', { level: '104' });
    await captureAt(
      page,
      page.getByTestId('paper-management-risk-comparison'),
      'position-management-stop-replacement-light-phone.png',
    );
  });

  await withManagedPage(browser, storageState, async (page) => {
    await submitAction(page, 'partial-exit', { quantity: '4' });
    await captureAt(
      page,
      page.getByTestId('paper-management-pending'),
      'position-management-pending-action-light-phone.png',
    );
  });

  await withManagedPage(browser, storageState, async (page) => {
    await submitAction(page, 'partial-exit', { quantity: '4' });
    await advanceOne(page);
    await captureAt(
      page,
      page.getByTestId('paper-management-journal'),
      'position-management-journal-timeline-light-phone.png',
    );
  });

  await withManagedPage(browser, storageState, async (page) => {
    await submitAction(page, 'replace-stop', { level: '104' });
    await advanceOne(page);
    await page.getByRole('button', { name: 'הצגת רמות ניהול קודמות, מוסתרות כעת' }).click();
    await captureAt(
      page,
      page.getByTestId('paper-management-chart'),
      'position-management-chart-overlays-light-phone.png',
    );
  });

  await withManagedPage(browser, storageState, async (page) => {
    await submitAction(page, 'partial-exit', { quantity: '4' });
    await advanceOne(page);
    await advanceUntil(page, ({ status }) => status === 'closed-target');
    await captureAt(
      page,
      page.getByRole('heading', { name: 'תחקיר ניהול דטרמיניסטי' }),
      'position-management-process-debrief-light-phone.png',
    );
  });

  await withManagedPage(
    browser,
    storageState,
    async (page) => {
      await submitAction(page, 'partial-exit', { quantity: '4' });
      await advanceOne(page);
      await captureAt(
        page,
        page.getByTestId('paper-management-ambiguous'),
        'position-management-ambiguity-light-phone.png',
      );
    },
    { variant: 'long-2-1' },
  );

  await withManagedPage(
    browser,
    storageState,
    async (page) => {
      await captureAt(
        page,
        page.getByTestId('paper-management-position-summary'),
        'position-management-dark-phone.png',
      );
    },
    {
      configure: async (page) => {
        await page.goto(`${baseURL}/settings`);
        await page.getByRole('radio', { name: 'כהה' }).click();
      },
    },
  );

  await withManagedPage(
    browser,
    storageState,
    async (page) => {
      await captureAt(
        page,
        page
          .getByTestId('paper-management-dashboard')
          .getByText(/מצב תנועה מופחת פעיל; המעבר מיידי/),
        'position-management-large-reduced-phone.png',
      );
    },
    {
      configure: async (page) => {
        await page.goto(`${baseURL}/settings`);
        await page.getByRole('radio', { name: 'גדול מאוד' }).click();
        await page.getByRole('switch', { name: 'הפחתת תנועה' }).click();
      },
    },
  );

  await withManagedPage(
    browser,
    storageState,
    async (page) => {
      await captureAt(
        page,
        page.getByTestId('paper-management-position-summary'),
        'position-management-light-tablet.png',
      );
    },
    { viewport: tablet },
  );
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
try {
  const setupContext = await createContext(browser);
  const setupPage = await setupContext.newPage();
  await completeOnboarding(setupPage);
  const storageState = await setupContext.storageState();
  await setupContext.close();
  await captureMatrix(browser, storageState);
} finally {
  await browser.close();
}
