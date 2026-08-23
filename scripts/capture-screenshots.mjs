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
  await page.getByRole('button', { name: 'בניית המסלול שלי' }).click();
  await page.getByRole('heading', { name: 'המסלול שלי' }).waitFor();
}

async function capturePhone(browser) {
  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'he-IL',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(baseURL);
  await page.getByTestId('onboarding-screen').waitFor();
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'onboarding-light-phone.png'),
  });

  await completeOnboarding(page);
  await page.screenshot({ fullPage: true, path: join(outputDirectory, 'home-light-phone.png') });

  await page.getByRole('button', { name: 'התחלת השיעור' }).click();
  await page.getByRole('heading', { name: 'תרחישים, לא נבואות' }).waitFor();
  await page.screenshot({ fullPage: true, path: join(outputDirectory, 'lesson-light-phone.png') });

  await page.getByRole('button', { name: 'התחלת השיעור' }).click();
  await page
    .getByText('לתאר מבנה ותרחיש מותנה, בלי להבטיח כיוון או תוצאה.', { exact: true })
    .click();
  await page.getByRole('button', { name: 'בדיקת התשובה' }).click();
  const feedbackHeading = page.getByRole('heading', { name: 'הבחנה מדויקת' });
  await feedbackHeading.waitFor();
  await feedbackHeading.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: join(outputDirectory, 'exercise-feedback-light-phone.png'),
  });

  await page.goto(`${baseURL}/settings`);
  await page.getByRole('heading', { name: 'הגדרות' }).waitFor();
  await page.getByRole('radio', { name: 'כהה' }).click();
  await page.getByRole('radio', { name: 'ענק' }).click();
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'settings-dark-large-phone.png'),
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
  await page.screenshot({ fullPage: true, path: join(outputDirectory, 'home-light-tablet.png') });
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
