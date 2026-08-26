import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

const execFileAsync = promisify(execFile);

interface PreflightReport {
  readonly schemaVersion: number;
  readonly status: string;
  readonly eligible: boolean;
  readonly summaryStatuses: readonly string[];
  readonly gates: readonly {
    readonly gateId: string;
    readonly category: string;
    readonly status: string;
  }[];
  readonly blockers: readonly {
    readonly code: string;
    readonly category: string;
    readonly gateId: string;
  }[];
  readonly sideEffects: readonly unknown[];
}

async function publicationPreflight(): Promise<PreflightReport> {
  const { stdout } = await execFileAsync(
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
    { cwd: process.cwd(), maxBuffer: 4 * 1024 * 1024 },
  );
  const serialized = stdout
    .trim()
    .split('\n')
    .findLast((line) => line.trim().startsWith('{'));
  if (!serialized) throw new Error('Publication preflight produced no canonical JSON report.');
  return JSON.parse(serialized) as PreflightReport;
}

test('missing external reviews remain a categorized, side-effect-free publication NO-GO', async ({}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'Pixel 7 Chromium',
    'The command-level preflight is browser-independent and runs once.',
  );
  const report = await publicationPreflight();
  expect(report).toMatchObject({
    schemaVersion: 2,
    status: 'PUBLICATION_NO_GO',
    eligible: false,
    sideEffects: [],
  });
  expect(report.summaryStatuses).toEqual(
    expect.arrayContaining([
      'MACHINE_GATES_CLOSED',
      'NATIVE_VERIFICATION_PARTIAL',
      'EXTERNAL_REVIEW_PENDING',
      'INTERNAL_REVIEW_BUILD_READY',
      'PUBLICATION_NO_GO',
    ]),
  );
  expect(new Set(report.gates.map(({ category }) => category))).toEqual(
    new Set([
      'machine',
      'native-runtime',
      'accessibility',
      'physical-device',
      'human-review',
      'licensing',
      'distribution',
    ]),
  );
  expect(report.blockers.filter(({ code }) => code === 'REVIEW_SCOPE_MISSING')).toHaveLength(8);
  expect(report.gates).toContainEqual(
    expect.objectContaining({
      gateId: 'ordinary-catalog-isolation',
      category: 'machine',
      status: 'passed',
    }),
  );
});
