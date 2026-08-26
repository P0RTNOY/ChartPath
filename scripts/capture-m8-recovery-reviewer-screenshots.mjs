import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { createCipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

const productionBaseURL = process.env.CHARTPATH_WEB_BASE_URL ?? 'http://127.0.0.1:4173';
const qaBaseURL = process.env.CHARTPATH_QA_BASE_URL ?? 'http://127.0.0.1:4174';
const outputDirectory = join(process.cwd(), 'docs', 'screenshots');
const passphrase = 'ChartPath recovery 2026!';
const fixedTimestamp = '2026-08-26T12:00:00.000Z';

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`;
}

function recoverySettingsBundle() {
  const material = {
    format: 'chartpath-recovery-payload',
    payloadVersion: 1,
    bundleId: 'recovery-m8-visual-settings',
    createdAt: fixedTimestamp,
    source: {
      appVersion: '0.1.0',
      contentVersion: 'content-v8',
      persistenceSchemaVersion: 6,
      projectorVersion: 1,
    },
    includedCategories: ['settings'],
    data: {
      settings: {
        theme: 'dark',
        reducedMotion: true,
        hapticsEnabled: true,
        textScale: 'extra-large',
        dailyGoalMinutes: 15,
      },
    },
    counts: {
      settings: 1,
      attempts: 0,
      analysisSessions: 0,
      paperExecutionSessions: 0,
      positionManagementSessions: 0,
      quarantineRecords: {
        analysisSessions: 0,
        paperExecutionSessions: 0,
        positionManagementSessions: 0,
        total: 0,
      },
    },
    privacy: {
      containsPositionManagementAndJournalText: false,
      containsQuarantinePayloads: false,
      sensitiveCategories: [],
    },
  };
  const payload = {
    ...material,
    payloadChecksum: `sha256:${createHash('sha256').update(canonicalJson(material)).digest('hex')}`,
  };
  const plaintext = Buffer.from(`${canonicalJson(payload)}\n`, 'utf8');
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const key = scryptSync(Buffer.from(passphrase.normalize('NFC'), 'utf8'), salt, 32, {
    N: 32_768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  const header = {
    format: 'chartpath-recovery',
    envelopeVersion: 1,
    suite: 'scrypt-rfc7914-n32768-r8-p1-aes-256-gcm-v1',
    encoding: 'canonical-json-v1',
    kdf: {
      algorithm: 'scrypt',
      saltBase64: salt.toString('base64'),
      N: 32_768,
      r: 8,
      p: 1,
      dkLen: 32,
    },
    aead: {
      algorithm: 'AES-256-GCM',
      nonceBase64: nonce.toString('base64'),
      tagLength: 16,
    },
    ciphertextByteLength: plaintext.byteLength,
  };
  const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(`ChartPath\0RecoveryBundle\0v1\0${canonicalJson(header)}\n`, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const envelope = {
    ...header,
    ciphertextBase64: ciphertext.toString('base64'),
    tagBase64: cipher.getAuthTag().toString('base64'),
  };
  key.fill(0);
  plaintext.fill(0);
  return `${canonicalJson(envelope)}\n`;
}

function tamperedBundle(bundleText) {
  const envelope = JSON.parse(bundleText);
  envelope.ciphertextBase64 = `${envelope.ciphertextBase64[0] === 'A' ? 'B' : 'A'}${envelope.ciphertextBase64.slice(1)}`;
  return `${canonicalJson(envelope)}\n`;
}

async function stabilizedContext(browser, options = {}) {
  const context = await browser.newContext({
    colorScheme: options.colorScheme ?? 'light',
    deviceScaleFactor: 1,
    locale: 'he-IL',
    reducedMotion: options.reducedMotion ?? 'no-preference',
    storageState: options.storageState,
    viewport: options.viewport ?? { width: 390, height: 844 },
  });
  await context.addInitScript((timestamp) => {
    const NativeDate = Date;
    const fixed = NativeDate.parse(timestamp);
    class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixed]));
      }
      static now() {
        return fixed;
      }
    }
    Object.setPrototypeOf(FixedDate, NativeDate);
    globalThis.Date = FixedDate;
    let seed = 0x4d385043;
    Math.random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
  }, fixedTimestamp);
  return context;
}

async function completeOnboarding(page, baseURL) {
  await page.goto(baseURL);
  await page.getByTestId('onboarding-screen').waitFor();
  await page.getByRole('button', { name: 'המשך כאורח' }).click();
  await page.getByRole('checkbox', { name: 'קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד' }).click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('radio', { name: '10 דקות ביום' }).click();
  await page.getByRole('button', { name: 'בנו לי מסלול' }).click();
  await page.getByRole('heading', { name: 'המסלול שלי' }).waitFor();
}

async function capture(page, locator, filename) {
  await locator.waitFor();
  await locator.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    path: join(outputDirectory, filename),
  });
}

async function withPage(browser, options, work) {
  const context = await stabilizedContext(browser, options);
  try {
    await work(await context.newPage());
  } finally {
    await context.close();
  }
}

async function chooseRecoveryFile(page, bundleText, name) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('recovery-import-pick').click();
  await (
    await chooser
  ).setFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(bundleText, 'utf8'),
  });
  await page.getByTestId('recovery-import-file').waitFor();
}

async function previewRecovery(page, bundleText) {
  await chooseRecoveryFile(page, bundleText, 'chartpath-m8-recovery.json');
  await page.getByTestId('recovery-import-password').fill(passphrase);
  await page.getByTestId('recovery-import-preview').click();
  await page.getByTestId('recovery-import-summary').waitFor();
}

async function enterReviewerMode(page) {
  await page.goto(`${qaBaseURL}/historical-scenario-qa?developer=1`);
  await page.getByTestId('scenario-qa-gate').waitFor();
  await page.getByTestId('scenario-qa-ack').click();
  await page.getByTestId('scenario-qa-enter').click();
  await page.getByTestId('scenario-qa-persistent-warning').waitFor();
}

async function revealCandidate(page, candidateKey) {
  await enterReviewerMode(page);
  await page.getByTestId(`scenario-qa-select-${candidateKey}`).click();
  await page.getByTestId(`scenario-qa-reveal-${candidateKey}`).click();
  await page.getByTestId('scenario-qa-review-packet').waitFor();
}

async function startBlindCandidate(page, candidateKey) {
  await enterReviewerMode(page);
  await page.getByTestId(`scenario-qa-select-${candidateKey}`).click();
  await page.getByTestId(`scenario-qa-start-${candidateKey}`).click();
  await page.waitForURL(/\/analysis\?[^#]*sessionId=[^&]+/u);
  const chart = page.getByRole('img', { name: /תרשים נרות היסטורי מוסתר זהות/ });
  await chart.waitFor();
  const accessibleName = (await chart.getAttribute('aria-label')) ?? '';
  if (!/48[^]*נרות גלויים/u.test(accessibleName)) {
    throw new Error(`Blind chart exposed an unexpected visible-candle summary: ${accessibleName}`);
  }
  if (
    /internal-|double-top|תרחיש שורט|אי־עסקה|Generated fixture|\d{4}-\d{2}-\d{2}/u.test(
      accessibleName,
    )
  ) {
    throw new Error(`Blind chart accessibility summary leaked hidden metadata: ${accessibleName}`);
  }
}

function publicationPreflightReport() {
  const result = spawnSync(
    'pnpm',
    [
      '--silent',
      'release:preflight',
      '--',
      '--dry-run',
      '--candidate',
      'publication-candidate-long-v1',
      '--scenario-id',
      'internal-long-range-breakout',
      '--scenario-version',
      '2.1.0',
      '--dataset-id',
      'internal-long-range-breakout-dataset',
      '--dataset-version',
      '2.0.0',
      '--dataset-checksum',
      'sha256:f927f4758ad81c6bdc1b2da7c5d4948af21ea930a0094db2ac9d49ee69e7f7d2',
      '--as-of',
      fixedTimestamp,
    ],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  if (result.status !== 0)
    throw new Error(`Publication preflight failed to execute: ${result.stderr}`);
  const jsonLine = result.stdout
    .trim()
    .split('\n')
    .findLast((line) => line.trim().startsWith('{'));
  if (!jsonLine) throw new Error('Publication preflight produced no JSON report.');
  return JSON.parse(jsonLine);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function capturePreflight(page) {
  const report = publicationPreflightReport();
  const categories = report.gates
    .map(
      (gate) =>
        `<li><bdi>${escapeHtml(gate.category)}</bdi><strong>${escapeHtml(gate.status)}</strong><span>${escapeHtml(gate.detail ?? '')}</span></li>`,
    )
    .join('');
  const summaries = report.summaryStatuses
    .map((status) => `<span class="summary">${escapeHtml(status)}</span>`)
    .join('');
  await page.setContent(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#edf4f6;color:#09283a;font-family:Arial,sans-serif}
    main{padding:24px;display:grid;gap:16px}.panel{background:#fff;border:2px solid #a7bec8;border-radius:20px;padding:18px}
    h1{font-size:28px;margin:0 0 10px}.status{display:inline-block;background:#ffe0dc;color:#8c2020;border-radius:999px;padding:8px 13px;font-weight:800}
    .summaries{display:flex;gap:7px;flex-wrap:wrap}.summary{background:#e2edf1;border-radius:999px;padding:6px 9px;font:700 11px ui-monospace,monospace;direction:ltr}
    ul{display:grid;gap:9px;padding:0;list-style:none}li{display:grid;grid-template-columns:1fr auto;gap:5px 12px;border-bottom:1px solid #d4e1e5;padding-bottom:9px}
    bdi{font:700 13px ui-monospace,monospace;color:#31556a;text-align:left}strong{color:#962828}li span{grid-column:1/-1;font-size:14px;line-height:1.4;direction:ltr;text-align:left}
  </style></head><body><main><section class="panel"><span class="status">${escapeHtml(report.status)}</span>
    <h1>בדיקת קידום יבשה: חסמים נשמרו</h1><p>ללא כתיבה, ללא אישור מדומה וללא פרסום.</p><div class="summaries">${summaries}</div></section>
    <section class="panel"><ul>${categories}</ul></section></main></body></html>`);
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
    path: join(outputDirectory, 'm8-publication-preflight-categorized-no-go-browser.png'),
  });
}

await mkdir(outputDirectory, { recursive: true });
const bundle = recoverySettingsBundle();
const browser = await chromium.launch();
if (process.argv.includes('--preflight-only')) {
  try {
    await withPage(browser, {}, (page) => capturePreflight(page));
  } finally {
    await browser.close();
  }
  process.exit(0);
}
try {
  const productionSetup = await stabilizedContext(browser);
  const productionSetupPage = await productionSetup.newPage();
  await completeOnboarding(productionSetupPage, productionBaseURL);
  const productionStorage = await productionSetup.storageState();
  await productionSetup.close();

  const qaSetup = await stabilizedContext(browser);
  const qaSetupPage = await qaSetup.newPage();
  await completeOnboarding(qaSetupPage, qaBaseURL);
  const qaStorage = await qaSetup.storageState();
  await qaSetup.close();

  await withPage(browser, { storageState: productionStorage }, async (page) => {
    await page.goto(`${productionBaseURL}/data-recovery`);
    await capture(
      page,
      page.getByTestId('recovery-privacy'),
      'm8-recovery-privacy-phone-browser.png',
    );
    await capture(
      page,
      page.getByTestId('recovery-export'),
      'm8-recovery-export-default-phone-browser.png',
    );
  });

  await withPage(browser, { storageState: productionStorage }, async (page) => {
    await page.goto(`${productionBaseURL}/data-recovery`);
    await previewRecovery(page, bundle);
    await capture(
      page,
      page.getByTestId('recovery-import-summary'),
      'm8-recovery-import-dry-run-phone-browser.png',
    );
    await page.getByTestId('recovery-import-request-confirm').click();
    await capture(
      page,
      page.getByTestId('recovery-import-confirmation'),
      'm8-recovery-import-explicit-confirmation-phone-browser.png',
    );
  });

  await withPage(browser, { storageState: productionStorage }, async (page) => {
    await page.goto(`${productionBaseURL}/data-recovery`);
    await chooseRecoveryFile(page, tamperedBundle(bundle), 'chartpath-m8-tampered.json');
    await page.getByTestId('recovery-import-password').fill(passphrase);
    await page.getByTestId('recovery-import-preview').click();
    await capture(
      page,
      page.getByTestId('recovery-bundle-message'),
      'm8-recovery-tamper-rejected-phone-browser.png',
    );
  });

  await withPage(
    browser,
    { storageState: productionStorage, reducedMotion: 'reduce' },
    async (page) => {
      await page.goto(`${productionBaseURL}/settings`);
      await page.getByRole('radio', { name: 'גדול מאוד' }).click();
      await page.getByRole('switch', { name: 'הפחתת תנועה' }).click();
      await page.goto(`${productionBaseURL}/data-recovery`);
      await capture(
        page,
        page.getByTestId('recovery-export'),
        'm8-recovery-largest-text-reduced-motion-browser.png',
      );
    },
  );

  await withPage(
    browser,
    { colorScheme: 'dark', storageState: productionStorage },
    async (page) => {
      await page.goto(`${productionBaseURL}/settings`);
      await page.getByRole('radio', { name: 'כהה' }).click();
      await page.goto(`${productionBaseURL}/data-recovery`);
      await capture(
        page,
        page.getByTestId('recovery-import'),
        'm8-recovery-dark-phone-browser.png',
      );
    },
  );

  await withPage(
    browser,
    { storageState: productionStorage, viewport: { width: 1024, height: 768 } },
    async (page) => {
      await page.goto(`${productionBaseURL}/data-recovery`);
      await previewRecovery(page, bundle);
      await capture(
        page,
        page.getByTestId('recovery-import-summary'),
        'm8-recovery-import-tablet-browser.png',
      );
    },
  );

  await withPage(browser, { storageState: qaStorage }, async (page) => {
    await page.goto(`${qaBaseURL}/historical-scenario-qa?developer=1`);
    await capture(
      page,
      page.getByTestId('scenario-qa-gate'),
      'm8-reviewer-acknowledgement-gate-browser.png',
    );
  });

  for (const [candidateKey, name] of [
    ['candidate-11', 'long'],
    ['candidate-12', 'short'],
    ['candidate-04', 'no-trade'],
  ]) {
    await withPage(browser, { storageState: qaStorage }, async (page) => {
      await revealCandidate(page, candidateKey);
      await capture(
        page,
        page.getByTestId('scenario-qa-review-packet'),
        `m8-reviewer-${name}-packet-browser.png`,
      );
    });
  }

  for (const [candidateKey, name] of [
    ['candidate-04', 'candidate-04'],
    ['candidate-07', 'candidate-07'],
  ]) {
    await withPage(browser, { storageState: qaStorage }, async (page) => {
      await startBlindCandidate(page, candidateKey);
      await capture(
        page,
        page.getByTestId('guided-analysis-chart-notebook'),
        `m8-accessible-blind-chart-${name}-browser.png`,
      );
    });
  }

  await withPage(browser, { storageState: qaStorage }, async (page) => {
    await enterReviewerMode(page);
    await page.getByTestId('scenario-qa-select-candidate-10').click();
    await page.getByTestId('scenario-qa-start-candidate-10').click();
    await page.waitForURL(/\/paper-execution\?[^#]*analysisSessionId=[^&]+&qa=1/u);
    await page.goto(`${qaBaseURL}/data-recovery`);
    await page.getByTestId('recovery-export-category-position-management-sessions').click();
    await page.getByTestId('recovery-export-consent-position-management-sessions').click();
    await page.getByTestId('recovery-export-password').fill(passphrase);
    await page.getByTestId('recovery-export-create').click();
    await capture(
      page,
      page.getByTestId('recovery-export-summary'),
      'm8-recovery-journal-opt-in-internal-excluded-browser.png',
    );
  });

  await withPage(browser, {}, (page) => capturePreflight(page));
} finally {
  await browser.close();
}
