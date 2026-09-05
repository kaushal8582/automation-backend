/**
 * Encrypts a social access token for MongoDB storage.
 * Format: v1.<iv_b64>.<authTag_b64>.<ciphertext_b64>
 */
export declare function encryptToken(plaintext: string): string;
/**
 * Decrypts a previously encrypted social access token.
 * Only call this immediately before an outbound Meta API request.
 */
export declare function decryptToken(payload: string): string;
/** Mask token for safe logging — never log full tokens. */
export declare function maskToken(token: string | undefined | null): string;
//# sourceMappingURL=encryption.d.ts.map