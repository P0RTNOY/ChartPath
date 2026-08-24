import { expect, type Page, test } from '@playwright/test';

async function beginFreshGuest(page: Page, dailyGoal = 10) {
  await page.goto('/');
  await expect(page.getByTestId('onboarding-screen')).toBeVisible();

  await page.getByRole('button', { name: 'המשך כאורח' }).click();
  await page
    .getByRole('checkbox', {
      name: 'קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד',
    })
    .click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('radio', { name: `${dailyGoal} דקות ביום` }).click();
  await page.getByRole('button', { name: 'בנו לי מסלול' }).click();
  await expect(page.getByRole('heading', { name: 'המסלול שלי' })).toBeVisible();
}

async function answerExercise(page: Page, answers: readonly string[], nextLabel: string) {
  for (const answer of answers) {
    await page
      .getByRole('radio', { name: answer, exact: true })
      .or(page.getByRole('checkbox', { name: answer, exact: true }))
      .click();
  }
  await page.getByRole('button', { name: 'בדיקת התשובה' }).click();
  await expect(page.getByRole('heading', { name: 'הבחנה מדויקת' })).toBeVisible();
  await page.getByRole('button', { name: nextLabel }).click();
}

test('fresh Hebrew guest completes the first lesson and keeps progress after reload', async ({
  page,
}) => {
  await beginFreshGuest(page, 15);
  await page.goto('/learn/lesson-u01-chart-data');
  await expect(page.getByRole('heading', { name: 'השיעור עדיין נעול' })).toBeVisible();
  await expect(page.getByText(/מקמו על הנר העולה/)).toHaveCount(0);
  await page.goto('/home');
  await page.getByRole('button', { name: 'התחילו את השיעור' }).click();
  await expect(page.getByRole('heading', { name: 'תרחישים, לא נבואות' })).toBeVisible();
  await page.getByRole('button', { name: 'התחילו את השיעור' }).click();

  await answerExercise(page, ['לתאר מבנה ותרחיש מותנה, בלי להבטיח כיוון או תוצאה.'], 'לתרגיל הבא');
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

  await expect(page.getByText('שיעור הושלם', { exact: true })).toBeVisible();
  await expect(page.getByText('5/5', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'חזרה למסלול' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'המסלול שלי' })).toBeVisible();

  await page.goto('/lesson/lesson-u00-scenarios');
  await expect(page.getByRole('button', { name: 'תרגול מחדש' })).toBeVisible();
});

test('glossary search and accessibility preferences work without an account', async ({ page }) => {
  await beginFreshGuest(page);

  await page.getByRole('tab', { name: 'מילון' }).click();
  const search = page.getByRole('textbox', { name: 'חיפוש במילון בעברית או באנגלית' });
  await search.fill('Breakout');
  await expect(page.getByText('פריצה', { exact: true }).first()).toBeVisible();

  await page.getByRole('tab', { name: 'הגדרות' }).click();
  await page.getByRole('radio', { name: 'כהה' }).click();
  await page.getByRole('radio', { name: 'גדול מאוד' }).click();
  await page.getByRole('switch', { name: 'הפחתת תנועה' }).click();

  await expect(page.getByRole('radio', { name: 'כהה' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'גדול מאוד' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'הפחתת תנועה' })).toBeChecked();

  await page.reload();
  await expect(page.getByRole('radio', { name: 'כהה' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'גדול מאוד' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'הפחתת תנועה' })).toBeChecked();
});
