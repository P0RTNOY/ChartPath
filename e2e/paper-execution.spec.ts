import { expect, type Page, test } from '@playwright/test';

async function beginFreshGuest(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'המשך כאורח' }).click();
  await page.getByRole('checkbox', { name: 'קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד' }).click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('radio', { name: '10 דקות ביום' }).click();
  await page.getByRole('button', { name: 'בנו לי מסלול' }).click();
  await expect(page.getByRole('heading', { name: 'המסלול שלי' })).toBeVisible();
}

test('production export keeps hypothetical paper mechanics behind the explicit development QA boundary', async ({
  page,
}) => {
  await beginFreshGuest(page);
  await page.goto('/paper-execution?analysisSessionId=missing-session&qa=1');

  await expect(page.getByRole('heading', { name: 'לא הצלחנו לטעון את הנתונים' })).toBeVisible();
  await expect(page.getByText(/סשן ביצוע או ניהול.*אינו זמין בגרסת ייצור/)).toBeVisible();
  await expect(page.getByTestId('paper-execution-screen')).toHaveCount(0);
  await expect(page.getByTestId('paper-execution-ticket')).toHaveCount(0);
});

test('ordinary production route cannot manufacture a paper session without an eligible analysis', async ({
  page,
}) => {
  await beginFreshGuest(page);
  await page.goto('/paper-execution?analysisSessionId=missing-session');

  await expect(page.getByTestId('paper-execution-screen')).toHaveCount(0);
  await expect(page.getByTestId('paper-execution-ticket')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'תרגול הביצוע אינו זמין' })).toBeVisible();
});
