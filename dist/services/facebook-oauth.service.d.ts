import type { PublicSocialAccount } from './social-account.service.js';
export declare function buildFacebookConnectUrl(userId: string): Promise<{
    authorizationUrl: string;
    redirectUri: string;
    state: string;
}>;
export declare function handleFacebookOAuthCallback(input: {
    code?: string;
    state?: string;
    error?: string;
    errorReason?: string;
    errorDescription?: string;
}): Promise<{
    redirectUrl: string;
}>;
export declare function listFacebookAccounts(userId: string): Promise<PublicSocialAccount[]>;
//# sourceMappingURL=facebook-oauth.service.d.ts.map