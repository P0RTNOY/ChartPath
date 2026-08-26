import { lstat, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalSerialize } from '@chartpath/historical-data';

import {
  assertOnlyArguments,
  optionalArgument,
  parseArguments,
  requiredArgument,
} from './cli-arguments.js';
import { findRepositoryRoot, readCanonicalJson } from './node-io.js';
import {
  createReviewerOnboardingProposal,
  parseReviewerOnboardingProposal,
  parseReviewerOnboardingProposalMaterial,
  reviewerOnboardingMaterialProofBytes,
  reviewerRegistryChecksum,
} from './reviewer-governance.js';
import {
  buildReviewerGovernanceStatusMatrix,
  listReviewerAuthorizationRequirements,
  validateReviewerOnboardingProposal,
  validateReviewerRevocationProposal,
  verifyReviewerPublicKeyFingerprint,
} from './reviewer-governance-node.js';
import { PRODUCTION_TRUSTED_REVIEWER_REGISTRY } from './trusted-reviewers.js';
import { PUBLICATION_REVIEW_SCOPES } from './types.js';

interface ReviewerGovernanceCliReaders {
  readonly readJson: (repositoryRelativePath: string) => Promise<unknown>;
  readonly readDirectory: (repositoryRelativePath: string) => Promise<readonly unknown[]>;
}

function inside(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

async function repositoryReaders(repositoryRoot: string): Promise<ReviewerGovernanceCliReaders> {
  const root = await realpath(repositoryRoot);
  const safeTarget = async (repositoryRelativePath: string): Promise<string> => {
    if (isAbsolute(repositoryRelativePath))
      throw new TypeError(
        `Governance input path must be repository-relative: ${repositoryRelativePath}`,
      );
    const target = resolve(root, repositoryRelativePath);
    if (!inside(root, target))
      throw new TypeError(`Governance input path escapes repository: ${repositoryRelativePath}`);
    const canonical = await realpath(target);
    if (!inside(root, canonical))
      throw new TypeError(
        `Governance input real path escapes repository: ${repositoryRelativePath}`,
      );
    return canonical;
  };
  const readJson = async (path: string): Promise<unknown> =>
    readCanonicalJson(await safeTarget(path));
  const readDirectory = async (path: string): Promise<readonly unknown[]> => {
    let directory: string;
    try {
      directory = await safeTarget(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const metadata = await lstat(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink())
      throw new TypeError(`Governance input must be a regular non-symlink directory: ${path}`);
    const entries = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.name.endsWith('.json'))
      .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
    for (const entry of entries)
      if (!entry.isFile() || entry.isSymbolicLink())
        throw new TypeError(`Governance input entry must be a regular JSON file: ${entry.name}`);
    return Promise.all(entries.map((entry) => readJson(`${path}/${entry.name}`)));
  };
  return { readJson, readDirectory };
}

export async function runReviewerGovernanceCommand(
  arguments_: readonly string[],
  readers?: ReviewerGovernanceCliReaders,
): Promise<unknown> {
  const argumentsMap = parseArguments(arguments_);
  assertOnlyArguments(argumentsMap, [
    '--action',
    '--as-of',
    '--material',
    '--proof',
    '--proposal',
    '--public-key',
    '--onboarding-dir',
    '--revocation-dir',
  ]);
  const action = requiredArgument(argumentsMap, '--action');
  const io = readers ?? (await repositoryReaders(await findRepositoryRoot()));
  if (action === 'requirements')
    return {
      schemaVersion: 1,
      trustGranted: false,
      requiredScopes: PUBLICATION_REVIEW_SCOPES,
      requirements: listReviewerAuthorizationRequirements(),
      productionRegistryChecksum: reviewerRegistryChecksum(PRODUCTION_TRUSTED_REVIEWER_REGISTRY),
    };
  if (action === 'prepare-onboarding') {
    const parsed = parseReviewerOnboardingProposalMaterial(
      await io.readJson(requiredArgument(argumentsMap, '--material')),
    );
    if (!parsed.ok)
      return {
        schemaVersion: 1,
        created: false,
        status: 'invalid-material',
        trustGranted: false,
        issues: parsed.issues,
      };
    return {
      schemaVersion: 1,
      created: false,
      status: 'unsigned-possession-proof-required',
      trustGranted: false,
      proposalMaterial: parsed.value,
      signingBytesBase64: Buffer.from(reviewerOnboardingMaterialProofBytes(parsed.value)).toString(
        'base64',
      ),
    };
  }
  if (action === 'verify-fingerprint') {
    const publicKeyPath = argumentsMap.get('--public-key');
    const proposalPath = argumentsMap.get('--proposal');
    if (
      (typeof publicKeyPath === 'string' && typeof proposalPath === 'string') ||
      (typeof publicKeyPath !== 'string' && typeof proposalPath !== 'string')
    )
      throw new TypeError(
        'Fingerprint verification requires exactly one of --public-key or --proposal.',
      );
    if (typeof publicKeyPath === 'string')
      return {
        schemaVersion: 1,
        source: 'public-key-material',
        fingerprint: verifyReviewerPublicKeyFingerprint(await io.readJson(publicKeyPath)),
      };
    const parsed = parseReviewerOnboardingProposal(await io.readJson(proposalPath as string));
    if (!parsed.ok)
      return {
        schemaVersion: 1,
        source: 'onboarding-proposal',
        proposalId: parsed.id,
        fingerprint: {
          schemaVersion: 1,
          keyId: 'invalid-key',
          algorithm: 'Ed25519',
          structurallyValid: false,
          canonicalPublicKey: false,
          fingerprintMatches: false,
          valid: false,
          trustGranted: false,
          issues: parsed.issues,
        },
      };
    return {
      schemaVersion: 1,
      source: 'onboarding-proposal',
      proposalId: parsed.value.proposalId,
      fingerprint: verifyReviewerPublicKeyFingerprint(parsed.value.publicKey),
    };
  }
  if (action === 'create-onboarding') {
    const created = createReviewerOnboardingProposal({
      material: await io.readJson(requiredArgument(argumentsMap, '--material')),
      possessionProof: await io.readJson(requiredArgument(argumentsMap, '--proof')),
    });
    if (!created.ok)
      return {
        schemaVersion: 1,
        created: false,
        trustGranted: false,
        issues: created.issues,
      };
    const asOf = requiredArgument(argumentsMap, '--as-of');
    return {
      schemaVersion: 1,
      created: true,
      trustGranted: false,
      proposal: created.value,
      validation: validateReviewerOnboardingProposal({
        proposal: created.value,
        registry: PRODUCTION_TRUSTED_REVIEWER_REGISTRY,
        asOf,
      }),
    };
  }
  if (action === 'validate-onboarding') {
    const proposal = await io.readJson(requiredArgument(argumentsMap, '--proposal'));
    return validateReviewerOnboardingProposal({
      proposal,
      registry: PRODUCTION_TRUSTED_REVIEWER_REGISTRY,
      asOf: requiredArgument(argumentsMap, '--as-of'),
    });
  }
  if (action === 'validate-revocation') {
    const proposal = await io.readJson(requiredArgument(argumentsMap, '--proposal'));
    return validateReviewerRevocationProposal({
      proposal,
      registry: PRODUCTION_TRUSTED_REVIEWER_REGISTRY,
      asOf: requiredArgument(argumentsMap, '--as-of'),
    });
  }
  if (action === 'status') {
    const onboardingDirectory = optionalArgument(
      argumentsMap,
      '--onboarding-dir',
      'reviewer-onboarding-proposals',
    );
    const revocationDirectory = optionalArgument(
      argumentsMap,
      '--revocation-dir',
      'reviewer-revocation-proposals',
    );
    const [onboardingProposals, revocationProposals] = await Promise.all([
      io.readDirectory(onboardingDirectory),
      io.readDirectory(revocationDirectory),
    ]);
    return buildReviewerGovernanceStatusMatrix({
      registry: PRODUCTION_TRUSTED_REVIEWER_REGISTRY,
      onboardingProposals,
      revocationProposals,
      asOf: requiredArgument(argumentsMap, '--as-of'),
    });
  }
  throw new TypeError(`Unknown reviewer-governance action: ${action}`);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  console.log(canonicalSerialize(await runReviewerGovernanceCommand(process.argv.slice(2))));
}
