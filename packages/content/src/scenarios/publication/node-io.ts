import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { canonicalSerialize, type Sha256Checksum } from '@chartpath/historical-data';

import { parseTrustedReviewerRegistry } from './attestation-node.js';
import type { ReviewPacketArtifactBundle } from './review-packet.js';
import {
  buildReviewPacketArtifactIndex,
  serializeReviewPacketArtifactIndex,
} from './review-packet.js';
import type { ReviewEvidenceFileV1, TrustedReviewerRegistryV1 } from './types.js';

export const REVIEW_PACKET_OUTPUT_DIRECTORY = 'review-packets' as const;
export const SOURCE_PDF_PATH = 'docs/sources/technical-analysis-he-digital 2.pdf' as const;

export interface PublicationArtifactVerificationReport {
  readonly valid: boolean;
  readonly sourcePdf: {
    readonly path: typeof SOURCE_PDF_PATH;
    readonly expectedChecksum: Sha256Checksum;
    readonly actualChecksum?: Sha256Checksum;
    readonly sizeBytes?: number;
    readonly valid: boolean;
  };
  readonly evidenceFiles: readonly {
    readonly path: string;
    readonly expectedChecksum: Sha256Checksum;
    readonly actualChecksum?: Sha256Checksum;
    readonly expectedSizeBytes: number;
    readonly actualSizeBytes?: number;
    readonly valid: boolean;
  }[];
  readonly trackedArtifacts: readonly {
    readonly path: string;
    readonly expectedChecksum: Sha256Checksum;
    readonly actualChecksum?: Sha256Checksum;
    readonly valid: boolean;
  }[];
  readonly issues: readonly string[];
}

function sha256Bytes(value: Uint8Array): Sha256Checksum {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function inside(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

export async function findRepositoryRoot(start = process.cwd()): Promise<string> {
  let cursor = resolve(start);
  while (true) {
    try {
      const workspace = await stat(join(cursor, 'pnpm-workspace.yaml'));
      if (workspace.isFile()) return cursor;
    } catch {
      // Continue toward the filesystem root.
    }
    const parent = dirname(cursor);
    if (parent === cursor) throw new Error('Unable to locate pnpm-workspace.yaml repository root.');
    cursor = parent;
  }
}

export async function readCanonicalJson(path: string): Promise<unknown> {
  const metadata = await lstat(path);
  if (!metadata.isFile() || metadata.isSymbolicLink())
    throw new TypeError(`Canonical JSON path must be a regular non-symlink file: ${path}`);
  const raw = await readFile(path, 'utf8');
  if (raw.startsWith('\ufeff')) throw new TypeError(`Canonical JSON cannot contain a BOM: ${path}`);
  const parsed = JSON.parse(raw) as unknown;
  const canonical = `${canonicalSerialize(parsed)}\n`;
  if (raw !== canonical)
    throw new TypeError(`JSON must use exact canonical-json-v1 encoding: ${path}`);
  return parsed;
}

export async function readTrustedReviewerRegistry(
  path: string,
  environment: 'production' | 'test' = 'production',
): Promise<TrustedReviewerRegistryV1> {
  return parseTrustedReviewerRegistry(await readCanonicalJson(path), environment);
}

export async function readCanonicalAttestations(directory: string): Promise<readonly unknown[]> {
  let entries;
  try {
    const metadata = await lstat(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink())
      throw new TypeError(`Attestation path must be a regular non-symlink directory: ${directory}`);
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const files = entries
    .filter((entry) => entry.name.endsWith('.json'))
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
  for (const entry of files)
    if (!entry.isFile() || entry.isSymbolicLink())
      throw new TypeError(
        `Attestation entry must be a regular non-symlink JSON file: ${entry.name}`,
      );
  return Promise.all(files.map((entry) => readCanonicalJson(join(directory, entry.name))));
}

export async function verifyEvidenceFiles(
  repositoryRoot: string,
  evidence: readonly ReviewEvidenceFileV1[],
): Promise<void> {
  const canonicalRoot = await realpath(repositoryRoot);
  for (const item of evidence) {
    if (isAbsolute(item.path))
      throw new TypeError(`Evidence path must be repository-relative: ${item.path}`);
    const target = resolve(canonicalRoot, item.path);
    if (!inside(canonicalRoot, target))
      throw new TypeError(`Evidence path escapes repository: ${item.path}`);
    const metadata = await lstat(target);
    if (!metadata.isFile() || metadata.isSymbolicLink())
      throw new TypeError(`Evidence must be a regular non-symlink file: ${item.path}`);
    const canonicalTarget = await realpath(target);
    if (!inside(canonicalRoot, canonicalTarget))
      throw new TypeError(`Evidence real path escapes repository: ${item.path}`);
    const bytes = await readFile(canonicalTarget);
    if (bytes.byteLength !== item.sizeBytes)
      throw new TypeError(`Evidence size mismatch for ${item.path}.`);
    if (sha256Bytes(bytes) !== item.checksum)
      throw new TypeError(`Evidence checksum mismatch for ${item.path}.`);
  }
}

async function inspectRegularRepositoryFile(
  canonicalRoot: string,
  repositoryRelativePath: string,
): Promise<{ readonly bytes?: Buffer; readonly issue?: string }> {
  if (isAbsolute(repositoryRelativePath))
    return { issue: `path must be repository-relative: ${repositoryRelativePath}` };
  const target = resolve(canonicalRoot, repositoryRelativePath);
  if (!inside(canonicalRoot, target))
    return { issue: `path escapes repository: ${repositoryRelativePath}` };
  try {
    const metadata = await lstat(target);
    if (!metadata.isFile() || metadata.isSymbolicLink())
      return { issue: `path must be a regular non-symlink file: ${repositoryRelativePath}` };
    const canonicalTarget = await realpath(target);
    if (!inside(canonicalRoot, canonicalTarget))
      return { issue: `real path escapes repository: ${repositoryRelativePath}` };
    return { bytes: await readFile(canonicalTarget) };
  } catch (error) {
    return {
      issue:
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? `file is missing: ${repositoryRelativePath}`
          : `cannot read ${repositoryRelativePath}: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

async function listTrackedFiles(
  canonicalRoot: string,
  directoryPath: string,
): Promise<{ readonly files: readonly string[]; readonly issues: readonly string[] }> {
  const files: string[] = [];
  const issues: string[] = [];
  async function visit(relativeDirectory: string): Promise<void> {
    const target = resolve(canonicalRoot, relativeDirectory);
    if (!inside(canonicalRoot, target)) {
      issues.push(`tracked artifact directory escapes repository: ${relativeDirectory}`);
      return;
    }
    let entries;
    try {
      const metadata = await lstat(target);
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
        issues.push(
          `tracked artifact path must be a regular non-symlink directory: ${relativeDirectory}`,
        );
        return;
      }
      entries = await readdir(target, { withFileTypes: true });
    } catch (error) {
      issues.push(
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? `tracked artifact directory is missing: ${relativeDirectory}`
          : `cannot inspect tracked artifact directory ${relativeDirectory}`,
      );
      return;
    }
    for (const entry of entries.sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    )) {
      const child = join(relativeDirectory, entry.name);
      if (entry.isSymbolicLink())
        issues.push(`tracked artifacts cannot contain symlinks: ${child}`);
      else if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) files.push(child);
      else issues.push(`tracked artifacts contain an unsupported entry: ${child}`);
    }
  }
  await visit(directoryPath);
  return { files, issues };
}

export async function verifyPublicationArtifacts(input: {
  readonly repositoryRoot: string;
  readonly outputDirectory?: string;
  readonly bundles: readonly ReviewPacketArtifactBundle[];
}): Promise<PublicationArtifactVerificationReport> {
  const canonicalRoot = await realpath(input.repositoryRoot);
  const outputDirectory = input.outputDirectory ?? REVIEW_PACKET_OUTPUT_DIRECTORY;
  const expectedSourceChecksums = new Set(
    input.bundles.flatMap((bundle) => {
      const value = bundle.packet.sourceProvenance as unknown;
      const sources = Array.isArray(value)
        ? (value as readonly { readonly sourcePdfChecksum: Sha256Checksum }[])
        : [value as { readonly sourcePdfChecksum: Sha256Checksum }];
      return sources.map((source) => source.sourcePdfChecksum);
    }),
  );
  const expectedSourceChecksum = [...expectedSourceChecksums][0];
  if (expectedSourceChecksums.size !== 1 || !expectedSourceChecksum)
    throw new TypeError('Review packets must pin one exact source PDF checksum.');
  const sourceInspection = await inspectRegularRepositoryFile(canonicalRoot, SOURCE_PDF_PATH);
  const sourceActualChecksum = sourceInspection.bytes
    ? sha256Bytes(sourceInspection.bytes)
    : undefined;
  const sourcePdf = {
    path: SOURCE_PDF_PATH,
    expectedChecksum: expectedSourceChecksum,
    ...(sourceActualChecksum ? { actualChecksum: sourceActualChecksum } : {}),
    ...(sourceInspection.bytes ? { sizeBytes: sourceInspection.bytes.byteLength } : {}),
    valid: sourceActualChecksum === expectedSourceChecksum,
  };

  const evidence = input.bundles
    .flatMap((bundle) => bundle.packet.evidenceFiles)
    .filter(
      (item, index, values) =>
        values.findIndex((candidate) => candidate.path === item.path) === index,
    )
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  const evidenceFiles = await Promise.all(
    evidence.map(async (item) => {
      const inspection = await inspectRegularRepositoryFile(canonicalRoot, item.path);
      const actualChecksum = inspection.bytes ? sha256Bytes(inspection.bytes) : undefined;
      const actualSizeBytes = inspection.bytes?.byteLength;
      return {
        path: item.path,
        expectedChecksum: item.checksum,
        ...(actualChecksum ? { actualChecksum } : {}),
        expectedSizeBytes: item.sizeBytes,
        ...(actualSizeBytes === undefined ? {} : { actualSizeBytes }),
        valid: actualChecksum === item.checksum && actualSizeBytes === item.sizeBytes,
        ...(inspection.issue ? { issue: inspection.issue } : {}),
      };
    }),
  );

  const index = buildReviewPacketArtifactIndex(input.bundles);
  const expectedArtifacts = new Map<string, string>([
    [`${outputDirectory}/index.canonical.jsonl`, serializeReviewPacketArtifactIndex(index)],
    ...input.bundles.flatMap(
      (bundle) =>
        [
          [`${outputDirectory}/${bundle.directoryName}/review-packet.canonical.jsonl`, bundle.json],
          [`${outputDirectory}/${bundle.directoryName}/review-packet.md`, bundle.markdown],
        ] as const,
    ),
  ]);
  const listing = await listTrackedFiles(canonicalRoot, outputDirectory);
  const actualPaths = new Set(listing.files);
  const trackedArtifacts = await Promise.all(
    [...expectedArtifacts]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(async ([path, expected]) => {
        const expectedBytes = new TextEncoder().encode(expected);
        const expectedChecksum = sha256Bytes(expectedBytes);
        const inspection = await inspectRegularRepositoryFile(canonicalRoot, path);
        const actualChecksum = inspection.bytes ? sha256Bytes(inspection.bytes) : undefined;
        return {
          path,
          expectedChecksum,
          ...(actualChecksum ? { actualChecksum } : {}),
          valid:
            inspection.bytes !== undefined && Buffer.from(expectedBytes).equals(inspection.bytes),
          ...(inspection.issue ? { issue: inspection.issue } : {}),
        };
      }),
  );
  const unexpectedPaths = listing.files.filter((path) => !expectedArtifacts.has(path));
  const missingPaths = [...expectedArtifacts.keys()].filter((path) => !actualPaths.has(path));
  const issues = [
    ...(sourceInspection.issue ? [`source PDF: ${sourceInspection.issue}`] : []),
    ...(sourcePdf.valid
      ? []
      : [
          `source PDF checksum mismatch: expected ${sourcePdf.expectedChecksum}; received ${sourcePdf.actualChecksum ?? 'missing'}`,
        ]),
    ...evidenceFiles.flatMap((item) =>
      item.valid
        ? []
        : [
            `evidence mismatch ${item.path}: expected ${item.expectedChecksum}/${item.expectedSizeBytes}; received ${item.actualChecksum ?? 'missing'}/${item.actualSizeBytes ?? 'missing'}`,
          ],
    ),
    ...trackedArtifacts.flatMap((item) =>
      item.valid
        ? []
        : [
            `tracked packet is stale ${item.path}: expected ${item.expectedChecksum}; received ${item.actualChecksum ?? 'missing'}`,
          ],
    ),
    ...listing.issues,
    ...missingPaths.map((path) => `tracked packet is missing: ${path}`),
    ...unexpectedPaths.map((path) => `unexpected tracked packet artifact: ${path}`),
  ];
  return Object.freeze({
    valid:
      sourcePdf.valid &&
      evidenceFiles.every((item) => item.valid) &&
      trackedArtifacts.every((item) => item.valid) &&
      listing.issues.length === 0 &&
      missingPaths.length === 0 &&
      unexpectedPaths.length === 0,
    sourcePdf,
    evidenceFiles: evidenceFiles.map(({ issue: _issue, ...item }) => {
      void _issue;
      return item;
    }),
    trackedArtifacts: trackedArtifacts.map(({ issue: _issue, ...item }) => {
      void _issue;
      return item;
    }),
    issues: [...new Set(issues)].sort(),
  });
}

export async function writeReviewPacketArtifacts(input: {
  readonly repositoryRoot: string;
  readonly outputDirectory: string;
  readonly bundles: readonly ReviewPacketArtifactBundle[];
}): Promise<{
  readonly indexPath: string;
  readonly index: ReturnType<typeof buildReviewPacketArtifactIndex>;
}> {
  const repositoryRoot = await realpath(input.repositoryRoot);
  const outputDirectory = resolve(repositoryRoot, input.outputDirectory);
  if (!inside(repositoryRoot, outputDirectory))
    throw new TypeError('Review packet output directory must remain inside the repository.');
  const index = buildReviewPacketArtifactIndex(input.bundles);
  for (const bundle of input.bundles) {
    const directory = resolve(outputDirectory, bundle.directoryName);
    if (!inside(outputDirectory, directory))
      throw new TypeError('Review packet directory escaped output root.');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'review-packet.canonical.jsonl'), bundle.json, {
      encoding: 'utf8',
      mode: 0o644,
    });
    await writeFile(join(directory, 'review-packet.md'), bundle.markdown, {
      encoding: 'utf8',
      mode: 0o644,
    });
  }
  await mkdir(outputDirectory, { recursive: true });
  const indexPath = join(outputDirectory, 'index.canonical.jsonl');
  await writeFile(indexPath, serializeReviewPacketArtifactIndex(index), {
    encoding: 'utf8',
    mode: 0o644,
  });
  return { indexPath, index };
}
