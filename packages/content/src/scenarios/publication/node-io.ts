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
