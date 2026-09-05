import { type ISocialAccountDocument } from '../models/social-account.model.js';
import type { SocialAccountStatus, SocialPlatform } from '../types/domain.js';
export declare class MetaTokenService {
    encryptAccessToken(rawToken: string): string;
    decryptAccessToken(encrypted: string): string;
    getDecryptedAccessToken(userId: string, socialAccountId: string): Promise<string>;
    markAccountStatus(account: ISocialAccountDocument, status: SocialAccountStatus): Promise<void>;
    markReconnectRequired(userId: string, socialAccountId: string, status?: Extract<SocialAccountStatus, 'expired' | 'revoked' | 'error'>): Promise<void>;
    assertPlatform(account: ISocialAccountDocument, platform: SocialPlatform): void;
}
export declare const metaTokenService: MetaTokenService;
//# sourceMappingURL=meta-token.service.d.ts.map