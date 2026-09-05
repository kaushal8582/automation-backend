import type { PublicSocialAccount } from './social-account.service.js';
export declare function buildInstagramConnectUrl(userId: string, reconnectAccountId?: string): Promise<{
    authorizationUrl: string;
    redirectUri: string;
    state: string;
}>;
export declare function handleInstagramOAuthCallback(input: {
    code?: string;
    state?: string;
    error?: string;
    errorReason?: string;
    errorDescription?: string;
}): Promise<{
    redirectUrl: string;
}>;
export declare function listInstagramAccounts(userId: string): Promise<PublicSocialAccount[]>;
//# sourceMappingURL=instagram-oauth.service.d.ts.map