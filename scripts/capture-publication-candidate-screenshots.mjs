import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

const baseURL = process.env.CHARTPATH_QA_BASE_URL ?? 'http://127.0.0.1:4174';
const outputDirectory = join(process.cwd(), 'docs', 'screenshots');

async function stabilizeRuntime(context) {
  await context.addInitScript(() => {
    const NativeDate = Date;
    const fixedTimestamp = NativeDate.parse('2026-08-26T12:00:00.000Z');
    class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedTimestamp]));
      }
      static now() {
        return fixedTimestamp;
      }
    }
    Object.setPrototypeOf(FixedDate, NativeDate);
    globalThis.Date = FixedDate;
    let seed = 0x4d375043;
    Math.random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
  });
}

async function newContext(browser, storageState, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'he-IL',
    storageState,
    viewport,
  });
  await stabilizeRuntime(context);
  return context;
}

async function completeOnboarding(page) {
  await page.goto(baseURL);
  await page.getByRole('button', { name: 'המשך כאורח' }).click();
  await page.getByRole('checkbox', { name: 'קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד' }).click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('radio', { name: '10 דקות ביום' }).click();
  await page.getByRole('button', { name: 'בנו לי מסלול' }).click();
  await page.getByRole('heading', { name: 'המסלול שלי' }).waitFor();
}

async function enterQa(page) {
  await page.goto(`${baseURL}/historical-scenario-qa?developer=1`);
  await page.getByTestId('scenario-qa-gate').waitFor();
  await page.getByTestId('scenario-qa-ack').click();
  await page.getByTestId('scenario-qa-enter').click();
  await page.getByTestId('scenario-qa-candidate-list').waitFor();
}

async function revealCandidate(page, key) {
  await enterQa(page);
  await page.getByTestId(`scenario-qa-select-${key}`).click();
  await page.getByTestId(`scenario-qa-reveal-${key}`).click();
  await page.getByTestId('scenario-qa-review-packet').waitFor();
}

async function capture(page, locator, filename) {
  await locator.waitFor();
  await locator.evaluate((node) => node.scrollIntoView({ block: 'center' }));
  await page.evaluate('document.fonts.ready');
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    path: join(outputDirectory, filename),
  });
}

async function withPage(browser, storageState, work, viewport) {
  const context = await newContext(browser, storageState, viewport);
  try {
    await work(await context.newPage());
  } finally {
    await context.close();
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
      '2026-08-26T12:00:00.000Z',
    ],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`Publication preflight failed to execute: ${result.stderr}`);
  }
  const jsonLine = result.stdout
    .trim()
    .split('\n')
    .findLast((line) => line.trim().startsWith('{'));
  if (!jsonLine) throw new Error('Publication preflight produced no JSON report.');
  return JSON.parse(jsonLine);
}

async function capturePreflight(page) {
  const report = publicationPreflightReport();
  const blockerRows = report.blockers
    .map((blocker) => `<li><bdi>${blocker.code}</bdi><span>${blocker.detail}</span></li>`)
    .join('');
  await page.setContent(`<!doctype html>
    <html lang="he" dir="rtl">
      <head><meta charset="utf-8"><style>
        *{box-sizing:border-box}body{margin:0;background:#f2f7f8;color:#08263b;font-family:Arial,sans-serif}
        main{padding:26px;display:grid;gap:18px}.eyebrow{color:#9b2c2c;font-weight:800}.panel{background:#fff;border:2px solid #a8bec7;border-radius:20px;padding:20px}
        h1{font-size:30px;margin:0 0 10px}.status{display:inline-block;background:#ffe1dd;color:#8e1f1f;border-radius:999px;padding:8px 14px;font-weight:800}
        p{font-size:17px;line-height:1.55}ul{display:grid;gap:10px;padding:0;list-style:none}li{display:grid;gap:5px;border-bottom:1px solid #d7e2e6;padding:0 0 10px}
        bdi{direction:ltr;text-align:left;font:700 13px ui-monospace,monospace;color:#31556a}span{font-size:15px;line-height:1.4}
      </style></head><body><main>
        <div class="eyebrow">ראיית חסם · בדיקת קידום יבשה בלבד</div>
        <section class="panel"><span class="status">${report.status}</span><h1>מועמד הפרסום אינו ניתן לקידום</h1>
        <p>הבדיקה דטרמיניסטית, ללא כתיבה וללא פרסום. זוהו <bdi>${report.blockers.length}</bdi> חסמים; אישורי אדם ורישוי לא הומצאו.</p>
        <p><bdi>${report.candidateId}</bdi></p></section>
        <section class="panel"><ul>${blockerRows}</ul></section>
      </main></body></html>`);
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
    path: join(outputDirectory, 'm7-publication-preflight-no-go-blockers-browser.png'),
  });
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
try {
  const setup = await newContext(browser);
  const setupPage = await setup.newPage();
  await completeOnboarding(setupPage);
  const storageState = await setup.storageState();
  await setup.close();

  await withPage(browser, storageState, async (page) => {
    await enterQa(page);
    await capture(
      page,
      page.getByTestId('scenario-qa-candidate-list'),
      'm7-publication-candidate-selection-browser.png',
    );
  });

  for (const [key, name] of [
    ['candidate-11', 'long'],
    ['candidate-12', 'short'],
    ['candidate-04', 'no-trade'],
  ]) {
    await withPage(browser, storageState, async (page) => {
      await revealCandidate(page, key);
      await capture(
        page,
        page.getByTestId('scenario-qa-review-packet'),
        `m7-publication-candidate-${name}-reviewer-browser.png`,
      );
    });
  }

  await withPage(browser, storageState, async (page) => {
    await page.goto(`${baseURL}/settings`);
    await page.getByRole('radio', { name: 'גדול מאוד' }).click();
    await page.getByRole('switch', { name: 'הפחתת תנועה' }).click();
    await revealCandidate(page, 'candidate-11');
    await capture(
      page,
      page.getByTestId('scenario-qa-review-packet'),
      'm7-publication-candidate-largest-text-reduced-motion-browser.png',
    );
  });

  await withPage(browser, storageState, async (page) => {
    await page.goto(`${baseURL}/settings`);
    await page.getByRole('radio', { name: 'כהה' }).click();
    await revealCandidate(page, 'candidate-12');
    await capture(
      page,
      page.getByTestId('scenario-qa-review-packet'),
      'm7-publication-candidate-dark-browser.png',
    );
  });

  await withPage(
    browser,
    storageState,
    async (page) => {
      await revealCandidate(page, 'candidate-04');
      await capture(
        page,
        page.getByTestId('scenario-qa-review-packet'),
        'm7-publication-candidate-tablet-browser.png',
      );
    },
    { width: 1024, height: 768 },
  );

  await withPage(browser, storageState, (page) => capturePreflight(page));
} finally {
  await browser.close();
}
