import { expect, type Page, test } from '@playwright/test';

import { createEmptySnapshot } from '../apps/mobile/src/lib/persistence/migrations';
import { exportRecoveryBundle } from '../apps/mobile/src/lib/recovery/crypto';
import { nodeRecoveryCryptoProvider } from '../apps/mobile/src/lib/recovery/node-provider';

const STORAGE_KEY = 'chartpath:guest-learning-data:v1';
const PASSPHRASE = 'ChartPath recovery 2026!';
const FIXED_NOW = '2026-08-26T12:00:00.000Z';

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

async function openRecovery(page: Page) {
  await page.goto('/data-recovery');
  await expect(page.getByTestId('recovery-center')).toBeVisible();
  await expect(page.getByTestId('recovery-bundle-panel')).toBeVisible();
}

async function storedSnapshotText(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

async function portableSettingsBundle() {
  const source = createEmptySnapshot('content-v8', FIXED_NOW);
  const snapshot = {
    ...source,
    settings: {
      ...source.settings,
      dailyGoalMinutes: 15,
      reducedMotion: true,
      textScale: 'extra-large' as const,
      theme: 'dark' as const,
    },
  };
  return exportRecoveryBundle({
    snapshot,
    options: {
      appVersion: '0.1.0',
      bundleId: 'recovery-e2e-portable-settings',
      createdAt: FIXED_NOW,
    },
    passphrase: PASSPHRASE,
    cryptoProvider: nodeRecoveryCryptoProvider,
  });
}

async function chooseImportBundle(page: Page, text: string, name = 'chartpath-recovery.json') {
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('recovery-import-pick').click();
  await (
    await chooser
  ).setFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(text, 'utf8'),
  });
  await expect(page.getByTestId('recovery-import-file')).toHaveText(name);
}

async function previewImport(page: Page, bundleText: string) {
  await chooseImportBundle(page, bundleText);
  await page.getByTestId('recovery-import-password').fill(PASSPHRASE);
  await page.getByTestId('recovery-import-preview').click();
  await expect(page.getByTestId('recovery-import-summary')).toBeVisible();
  await expect(page.getByTestId('recovery-bundle-message')).toHaveText(
    'הבדיקה היבשה הושלמה. דבר לא נכתב למאגר.',
  );
}

test('recovery export is explicit, encrypted, privacy-minimal, and does not mutate learning state', async ({
  page,
}) => {
  await beginFreshGuest(page);
  const before = await storedSnapshotText(page);
  await openRecovery(page);

  await expect(page.getByTestId('recovery-export-category-settings')).toBeChecked();
  await expect(page.getByTestId('recovery-export-category-attempts')).toBeChecked();
  await expect(
    page.getByTestId('recovery-export-category-position-management-sessions'),
  ).not.toBeChecked();
  await expect(
    page.getByTestId('recovery-export-consent-position-management-sessions'),
  ).toHaveCount(0);

  await page.getByTestId('recovery-export-password').fill(PASSPHRASE);
  await page.getByTestId('recovery-export-create').click();
  const summary = page.getByTestId('recovery-export-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('נכללו הגדרות:');
  await expect(summary).toContainText('נכללו ניסיונות:');
  await expect(summary).not.toContainText('כולל טקסט יומן וניהול פוזיציה');
  await expect(summary.getByText(/^sha256:[0-9a-f]{64}$/u)).toBeVisible();
  await expect(page.getByTestId('recovery-bundle-message')).toContainText('הקובץ המוצפן נוצר');
  expect(await storedSnapshotText(page)).toBe(before);
});

test('recovery import dry-run reports exact additions without writing before explicit confirmation', async ({
  page,
}) => {
  const bundle = await portableSettingsBundle();
  await beginFreshGuest(page);
  const before = await storedSnapshotText(page);
  await openRecovery(page);
  await previewImport(page, bundle.bundleText);

  const summary = page.getByTestId('recovery-import-summary');
  await expect(summary).toContainText('אין התנגשויות חוסמות');
  await expect(page.getByTestId('recovery-import-category-settings')).toBeChecked();
  await expect(page.getByTestId('recovery-import-category-attempts')).toBeChecked();
  await expect(page.getByTestId('recovery-import-request-confirm')).toBeVisible();
  await expect(page.getByTestId('recovery-import-confirmation')).toHaveCount(0);
  expect(await storedSnapshotText(page)).toBe(before);
});

test('recovery round trip applies only after separate confirmation and survives reload', async ({
  page,
}) => {
  const bundle = await portableSettingsBundle();
  await beginFreshGuest(page);
  const before = JSON.parse((await storedSnapshotText(page)) ?? '{}') as {
    attempts?: readonly unknown[];
    settings?: { readonly disclaimerVersionAccepted?: string | null };
  };
  await openRecovery(page);
  await previewImport(page, bundle.bundleText);

  await expect(page.getByTestId('recovery-import-category-settings')).toBeChecked();
  await expect(page.getByTestId('recovery-import-request-confirm')).toBeVisible();
  await page.getByTestId('recovery-import-request-confirm').click();
  await expect(page.getByTestId('recovery-import-confirmation')).toBeVisible();
  await page.getByTestId('recovery-import-apply').click();
  await expect
    .poll(async () => {
      const message = await page.getByTestId('recovery-bundle-message').textContent();
      const stored = JSON.parse((await storedSnapshotText(page)) ?? '{}') as {
        settings?: unknown;
      };
      return { message, settings: stored.settings };
    })
    .toMatchObject({
      message: expect.stringContaining('היבוא הושלם'),
      settings: expect.objectContaining({ theme: 'dark' }),
    });

  await expect
    .poll(async () => {
      const stored = JSON.parse((await storedSnapshotText(page)) ?? '{}') as {
        settings?: {
          dailyGoalMinutes?: number;
          reducedMotion?: boolean;
          textScale?: string;
          theme?: string;
        };
      };
      return stored.settings;
    })
    .toMatchObject({
      dailyGoalMinutes: 15,
      reducedMotion: true,
      textScale: 'extra-large',
      theme: 'dark',
    });

  await page.reload();
  await expect(page.getByTestId('recovery-center')).toBeVisible();
  const after = JSON.parse((await storedSnapshotText(page)) ?? '{}') as {
    attempts?: readonly unknown[];
    settings?: { readonly disclaimerVersionAccepted?: string | null };
  };
  expect(after.attempts).toEqual(before.attempts);
  expect(after.settings?.disclaimerVersionAccepted).toBe(
    before.settings?.disclaimerVersionAccepted,
  );
  await page.goto('/settings');
  await expect(page.getByRole('radio', { name: 'כהה' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'גדול מאוד' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'הפחתת תנועה' })).toBeChecked();
});

test('tampered recovery bundle is rejected without a preview or partial mutation', async ({
  page,
}) => {
  const bundle = await portableSettingsBundle();
  const envelope = JSON.parse(bundle.bundleText) as { ciphertextBase64: string };
  envelope.ciphertextBase64 = `${envelope.ciphertextBase64[0] === 'A' ? 'B' : 'A'}${envelope.ciphertextBase64.slice(1)}`;
  const tampered = `${JSON.stringify(envelope)}\n`;

  await beginFreshGuest(page);
  const before = await storedSnapshotText(page);
  await openRecovery(page);
  await chooseImportBundle(page, tampered, 'chartpath-recovery-tampered.json');
  await page.getByTestId('recovery-import-password').fill(PASSPHRASE);
  await page.getByTestId('recovery-import-preview').click();

  await expect(page.getByTestId('recovery-bundle-message')).toHaveText(
    'הסיסמה שגויה או שהקובץ שונה. לא בוצע יבוא.',
  );
  await expect(page.getByTestId('recovery-import-summary')).toHaveCount(0);
  await expect(page.getByTestId('recovery-import-confirmation')).toHaveCount(0);
  expect(await storedSnapshotText(page)).toBe(before);
});
