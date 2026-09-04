import { Types } from 'mongoose';
import { SocialAccount, type ISocialAccountDocument } from '../models/social-account.model.js';
import { AppError } from '../middlewares/error-handler.js';
import { decryptToken, encryptToken, maskToken } from '../utils/encryption.js';
import { createLogger } from '../utils/logger.js';
import type { SocialAccountStatus, SocialPlatform } from '../types/domain.js';

const logger = createLogger('meta-token-service');

export class MetaTokenService {
  encryptAccessToken(rawToken: string): string {
    return encryptToken(rawToken);
  }

  decryptAccessToken(encrypted: string): string {
    return decryptToken(encrypted);
  }

  async getDecryptedAccessToken(userId: string, socialAccountId: string): Promise<string> {
    if (!Types.ObjectId.isValid(socialAccountId)) {
      throw new AppError('Invalid social account id', 400, 'INVALID_SOCIAL_ACCOUNT_ID');
    }

    const account = await SocialAccount.findOne({ _id: socialAccountId, userId }).select(
      '+accessTokenEncrypted',
    );
    if (!account) {
      throw new AppError('Social account not found', 404, 'SOCIAL_ACCOUNT_NOT_FOUND');
    }

    if (account.status === 'revoked' || account.status === 'expired') {
      throw new AppError(
        'Social account requires reconnect',
        401,
        'META_TOKEN_EXPIRED',
        { status: account.status },
      );
    }

    try {
      const token = this.decryptAccessToken(account.accessTokenEncrypted);
      logger.info('Decrypted social token for API use', {
        socialAccountId,
        platform: account.platform,
        token: maskToken(token),
      });
      return token;
    } catch {
      await this.markAccountStatus(account, 'error');
      throw new AppError('Failed to decrypt social access token', 500, 'TOKEN_DECRYPT_FAILED');
    }
  }

  async markAccountStatus(
    account: ISocialAccountDocument,
    status: SocialAccountStatus,
  ): Promise<void> {
    account.status = status;
    await account.save();
  }

  async markReconnectRequired(
    userId: string,
    socialAccountId: string,
    status: Extract<SocialAccountStatus, 'expired' | 'revoked' | 'error'> = 'expired',
  ): Promise<void> {
    await SocialAccount.updateOne({ _id: socialAccountId, userId }, { $set: { status } });
  }

  assertPlatform(account: ISocialAccountDocument, platform: SocialPlatform): void {
    if (account.platform !== platform) {
      throw new AppError('Social account platform mismatch', 400, 'PLATFORM_MISMATCH');
    }
  }
}

export const metaTokenService = new MetaTokenService();
