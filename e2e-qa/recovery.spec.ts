import { expect, type Page, test } from '@playwright/test';

const STORAGE_KEY = 'chartpath:guest-learning-data:v1';
const PASSPHRASE = 'ChartPath journal recovery!';

async function beginFreshGuest(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('onboarding-screen')).toBeVisible();
  await page.getByRole('button', { name: 'המשך כאורח' }).click();
  await page.getByRole('checkbox', { name: 'קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד' }).click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('radio', { name: '10 דקות ביום' }).click();
  await page.getByRole('button', { name: 'בנו לי מסלול' }).click();
  await expect(page.getByRole('heading', { name: 'המסלול שלי' })).toBeVisible();
}

async function launchInternalManagement(page: Page) {
  await page.goto('/historical-scenario-qa?developer=1');
  await expect(page.getByTestId('scenario-qa-gate')).toBeVisible();
  await page.getByTestId('scenario-qa-ack').click();
  await page.getByTestId('scenario-qa-enter').click();
  await expect(page.getByTestId('scenario-qa-persistent-warning')).toContainText('ללא קרדיט');
  if ((await page.getByTestId('scenario-qa-start-candidate-10').count()) === 0) {
    await page.getByTestId('scenario-qa-select-candidate-10').click();
  }
  await page.getByTestId('scenario-qa-start-candidate-10').click();
  await page.waitForURL(/\/paper-execution\?[^#]*analysisSessionId=[^&]+&qa=1/u);
  await expect(page.getByTestId('paper-management-screen')).toBeVisible();
  const boundary = page.getByTestId('internal-qa-boundary');
  await expect(boundary).toContainText('פנימי');
  await expect(boundary).toContainText('לא פורסם');
  await expect(boundary).toContainText('ללא קרדיט');
}

async function internalManagementCount(page: Page) {
  return page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) ?? '{}') as {
      positionManagementSessions?: readonly unknown[];
    };
    return stored.positionManagementSessions?.length ?? 0;
  }, STORAGE_KEY);
}

test('journal recovery requires explicit sensitive opt-in and still excludes internal no-credit QA state', async ({
  page,
}) => {
  await beginFreshGuest(page);
  await launchInternalManagement(page);
  expect(await internalManagementCount(page)).toBe(1);

  await page.goto('/data-recovery');
  await expect(page.getByTestId('recovery-center')).toBeVisible();
  await page.getByTestId('recovery-export-password').fill(PASSPHRASE);
  await page.getByTestId('recovery-export-category-position-management-sessions').click();
  const consent = page.getByTestId('recovery-export-consent-position-management-sessions');
  await expect(consent).toBeVisible();
  await expect(consent).not.toBeChecked();
  await expect(page.getByTestId('recovery-export-create')).toBeDisabled();

  await consent.click();
  await expect(consent).toBeChecked();
  await expect(page.getByTestId('recovery-export-create')).toBeEnabled();
  await page.getByTestId('recovery-export-create').click();

  const summary = page.getByTestId('recovery-export-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('כולל טקסט יומן וניהול פוזיציה');
  const managementCountRow = summary.getByText('נכללו סשני ניהול ויומן:', {
    exact: true,
  });
  await expect(managementCountRow.locator('..')).toContainText('0');
  expect(await internalManagementCount(page)).toBe(1);
});
