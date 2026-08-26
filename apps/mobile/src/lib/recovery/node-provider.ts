/// <reference types="node" />

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import type { RecoveryCryptoProvider } from './types';

const provider: RecoveryCryptoProvider = {
  providerId: 'node:crypto:aes-256-gcm',
  async randomBytes(byteLength) {
    return Uint8Array.from(randomBytes(byteLength));
  },
  async encryptAes256Gcm({ key, nonce, plaintext, additionalData }) {
    const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
    cipher.setAAD(additionalData);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return {
      ciphertext: Uint8Array.from(ciphertext),
      tag: Uint8Array.from(cipher.getAuthTag()),
    };
  },
  async decryptAes256Gcm({ key, nonce, ciphertext, tag, additionalData }) {
    const decipher = createDecipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
    decipher.setAAD(additionalData);
    decipher.setAuthTag(tag);
    return Uint8Array.from(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
  },
};

export const nodeRecoveryCryptoProvider: RecoveryCryptoProvider = Object.freeze(provider);
