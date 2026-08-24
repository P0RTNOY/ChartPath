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

async function openHistoricalEntry(page) {
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await page.getByTestId('historical-replay-entry').waitFor();
}

async function startHistoricalReplay(page) {
  await page.getByTestId('historical-replay-entry').getByRole('button').click();
  await page.getByTestId('guided-analysis-session').waitFor();
  await page.getByTestId('historical-session-disclosure').waitFor();
}

async function submitSelections(page, labels) {
  for (const label of labels) {
    await page.getByRole('checkbox', { name: label, exact: true }).click();
  }
  await page.getByRole('button', { name: /הגשת השלב/ }).click();
  await page.getByText('נשמר במכשיר').waitFor();
}

async function completeFromLevel(page) {
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
}

async function waitForFonts(page) {
  await page.evaluate('document.fonts.ready');
}

async function captureFullPage(page, filename) {
  await waitForFonts(page);
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
    path: join(outputDirectory, filename),
  });
}

async function captureViewportAt(page, locator, filename) {
  await locator.scrollIntoViewIfNeeded();
  await waitForFonts(page);
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    path: join(outputDirectory, filename),
  });
}

async function capturePhone(browser) {
  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'he-IL',
    viewport: { width: 390, height: 844 },
  });
  await stabilizeClock(context);
  const page = await context.newPage();
  await completeOnboarding(page);
  await openHistoricalEntry(page);
  await captureViewportAt(
    page,
    page.getByTestId('historical-replay-entry'),
    'historical-replay-entry-light-phone.png',
  );

  await startHistoricalReplay(page);
  await captureFullPage(page, 'historical-replay-blind-before-decision-light-phone.png');

  await page.getByRole('button', { name: /עוד.*4.*נרות/ }).click();
  await page.getByText('28/73', { exact: true }).waitFor();
  await captureViewportAt(
    page,
    page.getByTestId('guided-analysis-chart-notebook'),
    'historical-replay-mid-light-phone.png',
  );

  await submitSelections(page, ['המגמה השבועית עולה', 'הרעיון הוא מכירה בחסר נגד המגמה']);
  await submitSelections(page, ['מועמד לשלושה שיאים', 'שפל ביניים נצפה']);
  await page.getByRole('button', { name: 'הנר הבא' }).click();
  await page.getByText('29/73', { exact: true }).waitFor();
  await page.goto(`${baseURL}/home`);
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await page.getByTestId('historical-analysis-resume-card').waitFor();
  await page.getByTestId('historical-analysis-resume-card').getByRole('button').first().click();
  await page.getByTestId('guided-analysis-session').waitFor();
  await page.getByText('29/73', { exact: true }).waitFor();
  await captureViewportAt(
    page,
    page.getByTestId('capstone-interaction'),
    'historical-replay-resumed-light-phone.png',
  );
  await captureViewportAt(
    page,
    page.getByTestId('historical-session-disclosure'),
    'historical-replay-provenance-status-light-phone.png',
  );

  await page.getByRole('button', { name: 'לנקודת ההחלטה' }).click();
  await page.getByText('73/73', { exact: true }).waitFor();
  await completeFromLevel(page);
  await page.getByRole('heading', { name: /השלבים הוגשו/ }).waitFor();
  await page.getByRole('button', { name: 'סיום מפורש של הניתוח' }).click();
  await page.getByRole('button', { name: 'אישור וסיום' }).click();
  await page.getByTestId('guided-analysis-debrief').last().waitFor();
  const reveal = page.getByTestId('historical-replay-reveal');
  await reveal.waitFor();
  await captureViewportAt(page, reveal, 'historical-replay-final-reveal-light-phone.png');
  await captureViewportAt(
    page,
    page.getByRole('heading', { name: 'ציון תהליך' }),
    'historical-replay-debrief-light-phone.png',
  );

  await page.getByRole('button', { name: 'היסטוריית ניתוחים' }).click();
  await page.getByTestId('analysis-history-screen').waitFor();
  await captureFullPage(page, 'historical-replay-history-light-phone.png');

  await page.goto(`${baseURL}/settings`);
  await page.getByRole('radio', { name: 'כהה' }).click();
  await page.getByRole('radio', { name: 'גדול מאוד' }).click();
  await page.getByRole('switch', { name: 'הפחתת תנועה' }).click();
  await page.goto(`${baseURL}/lab`);
  await page.getByTestId('historical-replay-entry').waitFor();
  await startHistoricalReplay(page);
  await captureFullPage(page, 'historical-replay-dark-very-large-reduced-phone.png');
  await context.close();
}

async function captureTablet(browser) {
  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'he-IL',
    viewport: { width: 1024, height: 768 },
  });
  await stabilizeClock(context);
  const page = await context.newPage();
  await completeOnboarding(page);
  await openHistoricalEntry(page);
  await startHistoricalReplay(page);
  await captureFullPage(page, 'historical-replay-light-tablet.png');
  await context.close();
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
try {
  await capturePhone(browser);
  await captureTablet(browser);
} finally {
  await browser.close();
}
