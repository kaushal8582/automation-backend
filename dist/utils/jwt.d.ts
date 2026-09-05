export type AccessTokenPayload = {
    sub: string;
    email: string;
    type: 'access';
};
export type RefreshTokenPayload = {
    sub: string;
    type: 'refresh';
    jti: string;
};
export declare function signAccessToken(userId: string, email: string): string;
export declare function signRefreshToken(userId: string): {
    token: string;
    jti: string;
};
export declare function verifyAccessToken(token: string): AccessTokenPayload;
export declare function verifyRefreshToken(token: string): RefreshTokenPayload;
export declare function getRefreshTokenTtlSeconds(): number;
//# sourceMappingURL=jwt.d.ts.map