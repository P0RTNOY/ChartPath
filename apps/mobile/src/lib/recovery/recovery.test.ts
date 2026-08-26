/// <reference types="node" />

jest.mock('@noble/hashes/utils.js', () => ({
  bytesToHex: (bytes: Uint8Array) => Buffer.from(bytes).toString('hex'),
  utf8ToBytes: (value: string) => Uint8Array.from(Buffer.from(value, 'utf8')),
}));
jest.mock('@noble/hashes/sha2.js', () => ({
  sha256: (bytes: Uint8Array) => {
    const { createHash } = jest.requireActual<typeof import('node:crypto')>('node:crypto');
    return Uint8Array.from(createHash('sha256').update(bytes).digest());
  },
}));
jest.mock('@noble/hashes/scrypt.js', () => ({
  scryptAsync: async (
    password: Uint8Array,
    salt: Uint8Array,
    options: { N: number; r: number; p: number; dkLen: number; maxmem: number },
  ) => {
    const { scrypt } = jest.requireActual<typeof import('node:crypto')>('node:crypto');
    return await new Promise<Uint8Array>((resolve, reject) =>
      scrypt(
        password,
        salt,
        options.dkLen,
        { N: options.N, r: options.r, p: options.p, maxmem: options.maxmem },
        (error, key) => (error ? reject(error) : resolve(Uint8Array.from(key))),
      ),
    );
  },
}));

import { createEmptySnapshot } from '../persistence/migrations';
import type { PersistenceSnapshot } from '../persistence/types';
import {
  decryptRecoveryBundle,
  encryptRecoveryPayload,
  parseRecoveryBundleEnvelope,
} from './crypto';
import { canonicalJsonText } from './encoding';
import { nodeRecoveryCryptoProvider } from './node-provider';
import { createRecoveryPayload } from './payload';
import { RecoveryAuthenticationError, RecoveryBundleError } from './types';
import type { RecoveryCryptoProvider } from './types';
import { parseRecoveryPayload } from './validation';

const NOW = '2026-08-26T12:00:00.000Z';
const PASSPHRASE = 'correct horse battery staple';

function snapshot(): PersistenceSnapshot {
  return createEmptySnapshot('content-v8', NOW);
}

function payload() {
  return createRecoveryPayload(snapshot(), {
    appVersion: '0.1.0',
    bundleId: 'recovery-test-bundle',
    createdAt: NOW,
  });
}

function mutatedBundle(
  bundleText: string,
  mutate: (envelope: Record<string, unknown>) => void,
): string {
  const envelope = JSON.parse(bundleText) as Record<string, unknown>;
  mutate(envelope);
  return canonicalJsonText(envelope);
}

describe('encrypted RecoveryBundle', () => {
  it('round-trips canonical payloads with the pinned scrypt and AES-GCM suite', async () => {
    const original = payload();
    const encrypted = await encryptRecoveryPayload(
      original,
      PASSPHRASE,
      nodeRecoveryCryptoProvider,
    );
    const envelope = parseRecoveryBundleEnvelope(encrypted.bundleBytes);

    expect(envelope.kdf).toMatchObject({ algorithm: 'scrypt', N: 32_768, r: 8, p: 1, dkLen: 32 });
    expect(envelope.aead).toMatchObject({ algorithm: 'AES-256-GCM', tagLength: 16 });
    expect(encrypted.bundleDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(encrypted.bundleText).not.toContain('payloadChecksum');
    expect(encrypted.bundleText).not.toContain('dailyGoalMinutes');
    expect(encrypted.bundleText).not.toContain(original.bundleId);

    const decrypted = await decryptRecoveryBundle(
      encrypted.bundleBytes,
      PASSPHRASE,
      nodeRecoveryCryptoProvider,
    );
    expect(decrypted.payload).toEqual(original);
    expect(decrypted.bundleDigest).toBe(encrypted.bundleDigest);
    expect(Object.isFrozen(decrypted.payload)).toBe(true);
    expect(Object.isFrozen(decrypted.payload.data.settings)).toBe(true);
  });

  it('uses the same public error for a wrong password and authenticated-data tampering', async () => {
    const encrypted = await encryptRecoveryPayload(
      payload(),
      PASSPHRASE,
      nodeRecoveryCryptoProvider,
    );
    const tampered = mutatedBundle(encrypted.bundleText, (envelope) => {
      const aead = envelope.aead as Record<string, unknown>;
      const nonce = String(aead.nonceBase64);
      aead.nonceBase64 = `${nonce[0] === 'A' ? 'B' : 'A'}${nonce.slice(1)}`;
    });

    let wrongPassword: unknown;
    let modified: unknown;
    try {
      await decryptRecoveryBundle(
        encrypted.bundleText,
        'this password is definitely wrong',
        nodeRecoveryCryptoProvider,
      );
    } catch (error) {
      wrongPassword = error;
    }
    try {
      await decryptRecoveryBundle(tampered, PASSPHRASE, nodeRecoveryCryptoProvider);
    } catch (error) {
      modified = error;
    }
    expect(wrongPassword).toBeInstanceOf(RecoveryAuthenticationError);
    expect(modified).toBeInstanceOf(RecoveryAuthenticationError);
    expect((modified as RecoveryBundleError).code).toBe(
      (wrongPassword as RecoveryBundleError).code,
    );
    expect((modified as Error).message).toBe((wrongPassword as Error).message);
  });

  it('does not log secrets or failure details', async () => {
    const encrypted = await encryptRecoveryPayload(
      payload(),
      PASSPHRASE,
      nodeRecoveryCryptoProvider,
    );
    const spies = [
      jest.spyOn(console, 'log').mockImplementation(),
      jest.spyOn(console, 'info').mockImplementation(),
      jest.spyOn(console, 'warn').mockImplementation(),
      jest.spyOn(console, 'error').mockImplementation(),
    ];
    try {
      await expect(
        decryptRecoveryBundle(
          encrypted.bundleText,
          'this password is definitely wrong',
          nodeRecoveryCryptoProvider,
        ),
      ).rejects.toBeInstanceOf(RecoveryAuthenticationError);
      expect(spies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });

  it('zeroes derived keys and plaintext byte buffers after provider calls', async () => {
    const keys: Uint8Array[] = [];
    const plaintexts: Uint8Array[] = [];
    const decryptedPlaintexts: Uint8Array[] = [];
    const observingProvider: RecoveryCryptoProvider = {
      ...nodeRecoveryCryptoProvider,
      async encryptAes256Gcm(input) {
        keys.push(input.key);
        plaintexts.push(input.plaintext);
        return nodeRecoveryCryptoProvider.encryptAes256Gcm(input);
      },
      async decryptAes256Gcm(input) {
        keys.push(input.key);
        const plaintext = await nodeRecoveryCryptoProvider.decryptAes256Gcm(input);
        decryptedPlaintexts.push(plaintext);
        return plaintext;
      },
    };
    const encrypted = await encryptRecoveryPayload(payload(), PASSPHRASE, observingProvider);
    await decryptRecoveryBundle(encrypted.bundleText, PASSPHRASE, observingProvider);
    for (const bytes of [...keys, ...plaintexts, ...decryptedPlaintexts])
      expect(bytes.every((byte) => byte === 0)).toBe(true);
  });

  it('rejects non-canonical, unknown, unsupported, and oversized envelopes before KDF work', async () => {
    const encrypted = await encryptRecoveryPayload(
      payload(),
      PASSPHRASE,
      nodeRecoveryCryptoProvider,
    );
    expect(() => parseRecoveryBundleEnvelope(` ${encrypted.bundleText}`)).toThrow(
      'not canonical JSON',
    );
    expect(() =>
      parseRecoveryBundleEnvelope(
        mutatedBundle(encrypted.bundleText, (envelope) => {
          envelope.unknown = true;
        }),
      ),
    ).toThrow(RecoveryBundleError);
    expect(() =>
      parseRecoveryBundleEnvelope(
        mutatedBundle(encrypted.bundleText, (envelope) => {
          envelope.envelopeVersion = 2;
        }),
      ),
    ).toThrow(RecoveryBundleError);
    expect(() =>
      parseRecoveryBundleEnvelope(
        mutatedBundle(encrypted.bundleText, (envelope) => {
          envelope.ciphertextByteLength = 8 * 1024 * 1024 + 1;
        }),
      ),
    ).toThrow(expect.objectContaining({ code: 'RECOVERY_FORMAT_INVALID' }));
  });

  it('requires strong canonical passwords', async () => {
    await expect(
      encryptRecoveryPayload(payload(), 'too-short', nodeRecoveryCryptoProvider),
    ).rejects.toMatchObject({ code: 'RECOVERY_PASSPHRASE_INVALID' });
    await expect(
      encryptRecoveryPayload(payload(), `${'a'.repeat(14)}e\u0301`, nodeRecoveryCryptoProvider),
    ).rejects.toMatchObject({ code: 'RECOVERY_PASSPHRASE_INVALID' });
  });
});

describe('RecoveryPayload privacy and validation', () => {
  it('defaults to portable settings and attempts without disclaimer acceptance or sensitive state', () => {
    const result = payload();
    expect(result.includedCategories).toEqual(['settings', 'attempts']);
    expect(result.data.settings).toEqual({
      theme: 'system',
      reducedMotion: false,
      hapticsEnabled: true,
      textScale: 'system',
      dailyGoalMinutes: 10,
    });
    expect(result.data.settings).not.toHaveProperty('disclaimerVersionAccepted');
    expect(result.data).not.toHaveProperty('analysisSessions');
    expect(result.data).not.toHaveProperty('paperExecutionSessions');
    expect(result.data).not.toHaveProperty('positionManagementSessions');
    expect(result.data).not.toHaveProperty('quarantineRecords');
    expect(result.privacy).toEqual({
      containsPositionManagementAndJournalText: false,
      containsQuarantinePayloads: false,
      sensitiveCategories: [],
    });
  });

  it('requires exact opt-in for management and quarantine categories', () => {
    expect(() =>
      createRecoveryPayload(snapshot(), {
        appVersion: '0.1.0',
        bundleId: 'sensitive-test-bundle',
        createdAt: NOW,
        categories: ['position-management-sessions'],
      }),
    ).toThrow(expect.objectContaining({ code: 'RECOVERY_SENSITIVE_CONSENT_REQUIRED' }));
    const included = createRecoveryPayload(snapshot(), {
      appVersion: '0.1.0',
      bundleId: 'sensitive-test-bundle',
      createdAt: NOW,
      categories: ['position-management-sessions', 'quarantine-records'],
      sensitiveCategoryConsents: ['position-management-sessions', 'quarantine-records'],
    });
    expect(included.privacy.sensitiveCategories).toEqual([
      'position-management-sessions',
      'quarantine-records',
    ]);
  });

  it('filters internal no-credit management and quarantine material even with opt-in', () => {
    const source = snapshot();
    const withInternalState = {
      ...source,
      positionManagementSessions: [
        { sessionId: 'internal-management', source: { learningCredit: 'none' } },
      ],
      quarantinedPositionManagementSessions: [
        {
          quarantineId: 'internal-quarantine',
          reason: 'internal QA',
          payloadJson: '{"source":{"learningCredit":"none"}}',
          quarantinedAt: NOW,
        },
      ],
    } as unknown as PersistenceSnapshot;
    const result = createRecoveryPayload(withInternalState, {
      appVersion: '0.1.0',
      bundleId: 'internal-filter-bundle',
      createdAt: NOW,
      categories: ['position-management-sessions', 'quarantine-records'],
      sensitiveCategoryConsents: ['position-management-sessions', 'quarantine-records'],
    });
    expect(result.data.positionManagementSessions).toEqual([]);
    expect(result.data.quarantineRecords?.positionManagementSessions).toEqual([]);
  });

  it('strictly rejects unknown nested fields, count drift, and checksum drift', () => {
    const valid = payload();
    const unknown = structuredClone(valid) as unknown as Record<string, unknown>;
    (unknown.source as Record<string, unknown>).unknown = true;
    expect(() => parseRecoveryPayload(unknown)).toThrow(RecoveryBundleError);

    const drift = structuredClone(valid) as unknown as Record<string, unknown>;
    (drift.counts as Record<string, unknown>).attempts = 1;
    expect(() => parseRecoveryPayload(drift)).toThrow('counts do not match');

    const checksum = structuredClone(valid) as unknown as Record<string, unknown>;
    checksum.payloadChecksum = `sha256:${'0'.repeat(64)}`;
    expect(() => parseRecoveryPayload(checksum)).toThrow('checksum mismatch');
  });

  it('rejects shared references, accessors, sparse arrays, and prototype keys', () => {
    const valid = structuredClone(payload()) as unknown as Record<string, unknown>;
    const shared: Record<string, unknown> = {};
    valid.counts = shared;
    valid.privacy = shared;
    expect(() => parseRecoveryPayload(valid)).toThrow('shared object reference');

    const accessor = structuredClone(payload()) as unknown as Record<string, unknown>;
    Object.defineProperty(accessor, 'payloadChecksum', { get: () => 'x', enumerable: true });
    expect(() => parseRecoveryPayload(accessor)).toThrow('cannot be an accessor');

    const sparse = structuredClone(payload()) as unknown as Record<string, unknown>;
    const attempts = new Array(1);
    (sparse.data as Record<string, unknown>).attempts = attempts;
    expect(() => parseRecoveryPayload(sparse)).toThrow('dense plain array');

    const prototypeKey = JSON.parse('{"__proto__":true}') as Record<string, unknown>;
    expect(() => parseRecoveryPayload(prototypeKey)).toThrow('forbidden key');
  });
});
