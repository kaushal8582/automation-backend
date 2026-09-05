export type OAuthStatePayload = {
    userId: string;
    reconnectAccountId?: string;
};
/** @deprecated alias — kept for backwards compat */
export type InstagramOAuthStatePayload = OAuthStatePayload;
export declare function createOAuthState(payload: OAuthStatePayload): Promise<string>;
export declare function consumeOAuthState(state: string): Promise<OAuthStatePayload | null>;
export declare function createFacebookOAuthState(payload: OAuthStatePayload): Promise<string>;
export declare function consumeFacebookOAuthState(state: string): Promise<OAuthStatePayload | null>;
//# sourceMappingURL=oauth-state.service.d.ts.map