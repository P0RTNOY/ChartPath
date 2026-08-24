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

async function answerExercise(page, answers, nextLabel) {
  for (const answer of answers) {
    await page
      .getByRole('radio', { name: answer, exact: true })
      .or(page.getByRole('checkbox', { name: answer, exact: true }))
      .click();
  }
  await page.getByRole('button', { name: 'בדיקת התשובה' }).click();
  await page.getByRole('heading', { name: 'הבחנה מדויקת' }).waitFor();
  await page.getByRole('button', { name: nextLabel }).click();
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

  await page.getByRole('button', { name: 'התחילו את השיעור' }).click();
  await page.getByRole('heading', { name: 'תרחישים, לא נבואות' }).waitFor();
  await page.screenshot({ fullPage: true, path: join(outputDirectory, 'lesson-light-phone.png') });

  await page.getByRole('button', { name: 'התחילו את השיעור' }).click();
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

  await page.getByRole('button', { name: 'לתרגיל הבא' }).click();
  await answerExercise(
    page,
    ['הנר האחרון נסגר ב־102.4.', 'מחזור הנר היה 1.3 מיליון יחידות.', 'הטווח נמשך 18 נרות יומיים.'],
    'לתרגיל הבא',
  );
  await answerExercise(
    page,
    [
      'כל עוד נשמר אזור 98–100 ונוצר שפל גבוה, התרחיש החיובי נשאר אפשרי; סגירה מתחת ל־98 מבטלת אותו ומחזירה לבחינת תרחיש יורד.',
    ],
    'לתרגיל הבא',
  );
  await answerExercise(
    page,
    [
      'אין מספיק ראיות להעריך את הטענה בחלון ההחלטה.',
      'הבהירות נוצרה רק לאחר חשיפת התוצאה',
      'לא הוגדר כלל זיהוי ואישור מראש',
    ],
    'לתרגיל הבא',
  );
  await answerExercise(
    page,
    [
      'המקרה מיועד לתרגול תהליך, לא כהמלצה.',
      'קיימת אפשרות להפסד ולביצוע שונה מהמתוכנן.',
      'התנאי ונקודת הביטול נכתבו לפני חשיפת התוצאה.',
      'איכות התהליך נבדקה בנפרד מתוצאת המחיר.',
    ],
    'סיכום',
  );
  await page.goto(`${baseURL}/lesson/lesson-u01-chart-data`);
  await page.getByRole('heading', { name: 'לקרוא את הנתונים לפני התבנית' }).waitFor();
  await page.getByRole('button', { name: 'התחילו את השיעור' }).click();
  await page.getByText(/מקמו על הנר העולה/).waitFor();
  await page.screenshot({
    fullPage: true,
    path: join(outputDirectory, 'interactive-chart-light-phone.png'),
  });

  await page.goto(`${baseURL}/settings`);
  await page.getByRole('heading', { name: 'הגדרות' }).waitFor();
  await page.getByRole('radio', { name: 'כהה' }).click();
  await page.getByRole('radio', { name: 'גדול מאוד' }).click();
  await page.getByRole('switch', { name: 'הפחתת תנועה' }).click();
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
