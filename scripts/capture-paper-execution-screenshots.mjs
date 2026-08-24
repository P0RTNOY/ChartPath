import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

const baseURL = process.env.CHARTPATH_BASE_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = join(process.cwd(), 'docs', 'screenshots');
const fixedNow = '2026-08-24T12:00:00.000Z';

async function stabilizeClock(context) {
  await context.addInitScript((isoTimestamp) => {
    const NativeDate = Date;
    const fixedTimestamp = NativeDate.parse(isoTimestamp);
    class FixedDate extends NativeDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixedTimestamp);
          return;
        }
        super(...args);
      }

      static now() {
        return fixedTimestamp;
      }
    }
    Object.setPrototypeOf(FixedDate, NativeDate);
    globalThis.Date = FixedDate;
  }, fixedNow);
}

async function completeOnboarding(page) {
  await page.goto(baseURL);
  await page.getByRole('button', { name: 'המשך כאורח' }).click();
  await page
    .getByRole('checkbox', {
      name: 'קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד',
    })
    .click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('radio', { name: '10 דקות ביום' }).click();
  await page.getByRole('button', { name: 'בנו לי מסלול' }).click();
  await page.getByRole('heading', { name: 'המסלול שלי' }).waitFor();
}

async function submitSelections(page, labels) {
  for (const label of labels) {
    await page.getByRole('checkbox', { name: label, exact: true }).click();
  }
  await page.getByRole('button', { name: /הגשת השלב/ }).click();
}

async function createFinalizedHistoricalAnalysis(page) {
  await completeOnboarding(page);
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await page.getByTestId('historical-replay-entry').getByRole('button').click();
  await page.getByTestId('historical-session-disclosure').waitFor();
  await page.getByRole('button', { name: 'לנקודת ההחלטה' }).click();
  await page.getByText('73/73', { exact: true }).waitFor();

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
  await page.getByTestId('paper-execution-launch').waitFor();
  return page.evaluate(() => {
    const parsed = JSON.parse(
      globalThis.localStorage.getItem('chartpath:guest-learning-data:v1') ?? '{}',
    );
    return parsed.analysisSessions.find(
      (session) => session.status === 'finalized' && session.chart?.kind === 'historical',
    ).sessionId;
  });
}

async function openPaperExecution(page, analysisSessionId) {
  await page.goto(`${baseURL}/paper-execution?analysisSessionId=${analysisSessionId}`);
  await page.getByTestId('paper-execution-screen').waitFor();
  await page.getByTestId('paper-execution-ticket').waitFor();
}

async function fillTicket(page, { orderType, entry, stop, target }) {
  await page.getByTestId(`paper-order-type-${orderType}`).click();
  await page.getByTestId('paper-input-entry').fill(entry);
  await page.getByTestId('paper-input-stop').fill(stop);
  await page.getByTestId('paper-input-target').fill(target);
  await page.getByTestId('paper-input-account').fill('10000');
  await page.getByTestId('paper-input-risk').fill('100');
  await page.getByTestId('paper-input-quantity').fill('10');
}

async function submitOrder(page) {
  await page.getByRole('checkbox', { name: 'אישור הבנת מגבלות הסימולטור' }).click();
  await page.getByTestId('paper-submit-order').click();
  await page.getByTestId('paper-submit-order').waitFor({ state: 'detached' });
}

async function executionState(page) {
  return page.evaluate(() => {
    const parsed = JSON.parse(
      globalThis.localStorage.getItem('chartpath:guest-learning-data:v1') ?? '{}',
    );
    return parsed.paperExecutionSessions.at(-1);
  });
}

async function advanceTo(page, targetCandleIndex) {
  let session = await executionState(page);
  while (session.lastProcessedCandleIndex < targetCandleIndex) {
    const nextIndex = session.lastProcessedCandleIndex + 1;
    await page.getByTestId('paper-advance-one').click();
    await page.waitForFunction(
      ({ key, index }) => {
        const parsed = JSON.parse(globalThis.localStorage.getItem(key) ?? '{}');
        return parsed.paperExecutionSessions?.at(-1)?.lastProcessedCandleIndex === index;
      },
      { key: 'chartpath:guest-learning-data:v1', index: nextIndex },
    );
    session = await executionState(page);
  }
}

async function waitForFonts(page) {
  await page.evaluate('document.fonts.ready');
}

async function capture(page, filename) {
  await waitForFonts(page);
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
    path: join(outputDirectory, filename),
  });
}

async function captureAt(page, locator, filename) {
  await locator.scrollIntoViewIfNeeded();
  await capture(page, filename);
}

async function createCaptureContext(browser, storageState, viewport) {
  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'he-IL',
    storageState,
    viewport,
  });
  await stabilizeClock(context);
  return context;
}

async function captureRequiredStates(browser, storageState, analysisSessionId) {
  const phone = { width: 390, height: 844 };

  const ticketContext = await createCaptureContext(browser, storageState, phone);
  const ticketPage = await ticketContext.newPage();
  await openPaperExecution(ticketPage, analysisSessionId);
  await captureAt(
    ticketPage,
    ticketPage.getByTestId('paper-execution-ticket'),
    'paper-execution-ticket-light-phone.png',
  );
  await ticketContext.close();

  const workingContext = await createCaptureContext(browser, storageState, phone);
  const workingPage = await workingContext.newPage();
  await openPaperExecution(workingPage, analysisSessionId);
  await fillTicket(workingPage, {
    orderType: 'limit',
    entry: '110.50',
    stop: '111.50',
    target: '108',
  });
  await submitOrder(workingPage);
  await captureAt(
    workingPage,
    workingPage.getByText('ההוראה ממתינה לביצוע').last(),
    'paper-execution-working-light-phone.png',
  );
  await workingContext.close();

  const marketContext = await createCaptureContext(browser, storageState, phone);
  const marketPage = await marketContext.newPage();
  await openPaperExecution(marketPage, analysisSessionId);
  await fillTicket(marketPage, {
    orderType: 'market',
    entry: '108',
    stop: '109.50',
    target: '107',
  });
  await submitOrder(marketPage);
  await advanceTo(marketPage, 73);
  await captureAt(
    marketPage,
    marketPage.getByText('נפתחה פוזיציה מדומה').last(),
    'paper-execution-open-light-phone.png',
  );
  await advanceTo(marketPage, 85);
  await marketPage.getByTestId('paper-execution-debrief').waitFor();
  await captureAt(
    marketPage,
    marketPage.getByTestId('paper-execution-debrief'),
    'paper-execution-debrief-light-phone.png',
  );
  await marketContext.close();

  const ambiguityContext = await createCaptureContext(browser, storageState, phone);
  const ambiguityPage = await ambiguityContext.newPage();
  await openPaperExecution(ambiguityPage, analysisSessionId);
  await fillTicket(ambiguityPage, {
    orderType: 'market',
    entry: '108',
    stop: '108.20',
    target: '107.90',
  });
  await submitOrder(ambiguityPage);
  await advanceTo(ambiguityPage, 73);
  await ambiguityPage.getByTestId('paper-execution-ambiguous').waitFor();
  await captureAt(
    ambiguityPage,
    ambiguityPage.getByTestId('paper-execution-ambiguous'),
    'paper-execution-ambiguous-light-phone.png',
  );
  await ambiguityContext.close();

  const darkContext = await createCaptureContext(browser, storageState, phone);
  const darkPage = await darkContext.newPage();
  await darkPage.goto(`${baseURL}/settings`);
  await darkPage.getByRole('radio', { name: 'כהה' }).click();
  await openPaperExecution(darkPage, analysisSessionId);
  await capture(darkPage, 'paper-execution-dark-phone.png');
  await darkContext.close();

  const accessibleContext = await createCaptureContext(browser, storageState, phone);
  const accessiblePage = await accessibleContext.newPage();
  await accessiblePage.goto(`${baseURL}/settings`);
  await accessiblePage.getByRole('radio', { name: 'גדול מאוד' }).click();
  await accessiblePage.getByRole('switch', { name: 'הפחתת תנועה' }).click();
  await openPaperExecution(accessiblePage, analysisSessionId);
  await capture(accessiblePage, 'paper-execution-large-reduced-phone.png');
  await accessibleContext.close();

  const tabletContext = await createCaptureContext(browser, storageState, {
    width: 1024,
    height: 768,
  });
  const tabletPage = await tabletContext.newPage();
  await openPaperExecution(tabletPage, analysisSessionId);
  await capture(tabletPage, 'paper-execution-light-tablet.png');
  await tabletContext.close();
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
try {
  const setupContext = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'he-IL',
    viewport: { width: 390, height: 844 },
  });
  await stabilizeClock(setupContext);
  const setupPage = await setupContext.newPage();
  const analysisSessionId = await createFinalizedHistoricalAnalysis(setupPage);
  const storageState = await setupContext.storageState();
  await setupContext.close();
  await captureRequiredStates(browser, storageState, analysisSessionId);
} finally {
  await browser.close();
}
