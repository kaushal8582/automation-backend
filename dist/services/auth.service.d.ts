import { type PublicUser } from '../models/user.model.js';
import type { LoginInput, RegisterInput } from '../validators/auth.validator.js';
export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};
export type AuthResult = {
    user: PublicUser;
    tokens: AuthTokens;
};
export declare function registerUser(input: RegisterInput): Promise<AuthResult>;
export declare function loginUser(input: LoginInput): Promise<AuthResult>;
export declare function refreshSession(refreshToken: string): Promise<AuthTokens>;
export declare function logoutSession(refreshToken: string | undefined): Promise<void>;
export declare function getCurrentUser(userId: string): Promise<PublicUser>;
//# sourceMappingURL=auth.service.d.ts.map