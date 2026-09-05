import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const VERSION = 'v1';
function getEncryptionKey() {
    const raw = env.TOKEN_ENCRYPTION_KEY;
    if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
        throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(raw, 'hex');
}
/**
 * Encrypts a social access token for MongoDB storage.
 * Format: v1.<iv_b64>.<authTag_b64>.<ciphertext_b64>
 */
export function encryptToken(plaintext) {
    if (!plaintext) {
        throw new Error('Cannot encrypt empty token');
    }
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [
        VERSION,
        iv.toString('base64url'),
        authTag.toString('base64url'),
        ciphertext.toString('base64url'),
    ].join('.');
}
/**
 * Decrypts a previously encrypted social access token.
 * Only call this immediately before an outbound Meta API request.
 */
export function decryptToken(payload) {
    const parts = payload.split('.');
    if (parts.length !== 4 || parts[0] !== VERSION) {
        throw new Error('Invalid encrypted token format');
    }
    const [, ivB64, tagB64, dataB64] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivB64, 'base64url');
    const authTag = Buffer.from(tagB64, 'base64url');
    const ciphertext = Buffer.from(dataB64, 'base64url');
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid encrypted token components');
    }
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
}
/** Mask token for safe logging — never log full tokens. */
export function maskToken(token) {
    if (!token)
        return '[empty]';
    if (token.length <= 8)
        return '****';
    return `${token.slice(0, 4)}…${token.slice(-4)}`;
}
//# sourceMappingURL=encryption.js.map