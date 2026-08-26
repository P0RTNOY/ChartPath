import { createHash, generateKeyPairSync } from 'node:crypto';
import { chmod, lstat, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import type { Sha256Checksum } from '@chartpath/historical-data';

export interface GeneratedReviewerPublicKeyV1 {
  readonly schemaVersion: 1;
  readonly algorithm: 'Ed25519';
  readonly publicKeySpkiDerBase64: string;
  readonly publicKeyFingerprint: Sha256Checksum;
  readonly privateKeyOutputPath: string;
  readonly privateKeyFormat: 'PKCS8-PEM';
  readonly privateKeyPermissions: '0600';
}

function inside(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

/**
 * Generates a reviewer-controlled Ed25519 private key without returning or printing private bytes.
 * The destination must be an absolute, new file beneath an existing directory outside the repo.
 */
export async function generateReviewerKeyMaterial(input: {
  readonly repositoryRoot: string;
  readonly privateKeyOutputPath: string;
}): Promise<GeneratedReviewerPublicKeyV1> {
  if (!isAbsolute(input.privateKeyOutputPath))
    throw new TypeError('Private-key output path must be absolute.');
  const repositoryRoot = await realpath(input.repositoryRoot);
  const outputParent = await realpath(dirname(input.privateKeyOutputPath));
  const outputPath = resolve(outputParent, basename(input.privateKeyOutputPath));
  if (inside(repositoryRoot, outputPath))
    throw new TypeError('Private-key output path must be outside the repository.');
  try {
    await lstat(outputPath);
    throw new TypeError('Private-key output path already exists; refusing to overwrite it.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privatePem = privateKey.export({ format: 'pem', type: 'pkcs8' });
  await writeFile(outputPath, privatePem, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await chmod(outputPath, 0o600);
  const publicDer = publicKey.export({ format: 'der', type: 'spki' });
  return Object.freeze({
    schemaVersion: 1,
    algorithm: 'Ed25519',
    publicKeySpkiDerBase64: publicDer.toString('base64'),
    publicKeyFingerprint: `sha256:${createHash('sha256').update(publicDer).digest('hex')}`,
    privateKeyOutputPath: outputPath,
    privateKeyFormat: 'PKCS8-PEM',
    privateKeyPermissions: '0600',
  });
}
