import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const baseURL = process.env.CHARTPATH_BASE_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = join(process.cwd(), 'docs', 'screenshots');

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

async function startAnalysis(page) {
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await page.getByRole('button', { name: 'התחלת ניתוח חדש' }).click();
  await page.getByTestId('guided-analysis-session').waitFor();
}

async function submitSelections(page, labels) {
  for (const label of labels) {
    await page.getByRole('checkbox', { name: label, exact: true }).click();
  }
  await page.getByRole('button', { name: /הגשת השלב/ }).click();
  await page.getByText('נשמר במכשיר').waitFor();
}

async function capturePhone(browser) {
  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'he-IL',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await completeOnboarding(page);
  await startAnalysis(page);
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'guided-analysis-start-light-phone.png'),
  });

  await submitSelections(page, ['המגמה השבועית עולה', 'הרעיון הוא מכירה בחסר נגד המגמה']);
  await submitSelections(page, ['מועמד לשלושה שיאים', 'שפל ביניים נצפה']);
  await page.getByRole('button', { name: 'כלי מחברת נקודה' }).click();
  await page.getByRole('button', { name: 'סימון מדויק לפי נר ומחיר' }).click();
  await page.getByRole('textbox', { name: 'מספר הנר במחברת' }).fill('12');
  await page.getByRole('textbox', { name: 'מחיר במחברת' }).fill('88');
  await page.getByRole('button', { name: 'החלת הנר והמחיר במחברת' }).click();
  await page.getByTestId('guided-analysis-chart-notebook').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: join(outputDirectory, 'guided-analysis-chart-drawing-light-phone.png'),
  });
  await page.getByTestId('capstone-interaction').scrollIntoViewIfNeeded();
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'guided-analysis-mid-session-light-phone.png'),
  });

  await page.goto(`${baseURL}/home`);
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await page.getByRole('button', { name: 'המשך הניתוח' }).click();
  await page.getByTestId('guided-analysis-session').waitFor();
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'guided-analysis-resumed-light-phone.png'),
  });

  await submitSelections(page, ['תמיכה שבועית 82.7', 'אזור קו צוואר 88']);
  await submitSelections(page, ['ראש וכתפיים אפשרי']);
  await submitSelections(page, ['סגירה יומית מתחת ל־88']);
  await submitSelections(page, ['טריגר כניסה תאורטי 87.8']);
  await submitSelections(page, ['ביטול תוקף מעל הכתף הימנית', 'הוראת עצירה אפשרית 98.6']);
  await page.getByRole('textbox', { name: 'סיכון חשבון' }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: join(outputDirectory, 'guided-analysis-position-size-light-phone.png'),
  });

  await page.getByRole('textbox', { name: 'סיכון חשבון' }).fill('600');
  await page.getByRole('textbox', { name: 'סיכון ליחידה' }).fill('11');
  await page.getByRole('textbox', { name: 'מספר יחידות' }).fill('54');
  await page.getByRole('button', { name: /הגשת השלב/ }).click();
  await page.getByRole('textbox', { name: 'מכפיל סיכון' }).fill('0.48');
  await page.getByRole('button', { name: /הגשת השלב/ }).click();
  await page.getByRole('radio', { name: 'אין עסקה ואין פוזיציה לניהול' }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: join(outputDirectory, 'guided-analysis-no-trade-decision-light-phone.png'),
  });

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
  await page.getByTestId('guided-analysis-debrief').last().waitFor();
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'guided-analysis-debrief-light-phone.png'),
  });

  await page.getByRole('button', { name: 'היסטוריית ניתוחים' }).click();
  await page.getByTestId('analysis-history-screen').waitFor();
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'guided-analysis-history-light-phone.png'),
  });

  await page.goto(`${baseURL}/settings`);
  await page.getByRole('radio', { name: 'כהה' }).click();
  await page.getByRole('radio', { name: 'גדול מאוד' }).click();
  await page.getByRole('switch', { name: 'הפחתת תנועה' }).click();
  await page.goto(`${baseURL}/lab`);
  await page.getByRole('button', { name: 'התחלת ניתוח חדש' }).click();
  await page.getByTestId('guided-analysis-session').waitFor();
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'guided-analysis-dark-large-reduced-phone.png'),
  });
  await context.close();
}

async function captureTablet(browser) {
  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'he-IL',
    viewport: { width: 1024, height: 768 },
  });
  const page = await context.newPage();
  await completeOnboarding(page);
  await startAnalysis(page);
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'guided-analysis-light-tablet.png'),
  });
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
