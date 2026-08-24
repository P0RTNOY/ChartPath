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

async function completeTrendline(page) {
  await page.getByRole('button', { name: 'כלי קו מגמה' }).click();
  await page.getByRole('button', { name: 'סימון מדויק לפי נר ומחיר' }).click();
  await page.getByRole('textbox', { name: 'מספר הנר במעבדה' }).fill('21');
  await page.getByRole('textbox', { name: 'מחיר במעבדה' }).fill('105.938');
  await page.getByRole('button', { name: 'החלת הנר והמחיר' }).click();
  await page.getByRole('button', { name: 'לחלון ההחלטה' }).click();
  await page.getByRole('textbox', { name: 'מספר הנר במעבדה' }).fill('56');
  await page.getByRole('textbox', { name: 'מחיר במעבדה' }).fill('115.0526');
  await page.getByRole('button', { name: 'החלת הנר והמחיר' }).click();
  await page.getByRole('button', { name: 'השוואת הניתוח' }).click();
  await page.getByTestId('workbench-feedback').waitFor();
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
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await page.getByTestId('workbench-chart').waitFor();
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'workbench-light-phone.png'),
  });

  await completeTrendline(page);
  await page.getByTestId('workbench-chart').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: join(outputDirectory, 'workbench-feedback-light-phone.png'),
  });

  await page.goto(`${baseURL}/settings`);
  await page.getByRole('radio', { name: 'כהה' }).click();
  await page.getByRole('radio', { name: 'גדול מאוד' }).click();
  await page.getByRole('switch', { name: 'הפחתת תנועה' }).click();
  await page.goto(`${baseURL}/lab`);
  await page.getByTestId('workbench-chart').waitFor();
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'workbench-dark-large-reduced-phone.png'),
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
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await page.getByTestId('workbench-chart').waitFor();
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'workbench-light-tablet.png'),
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
