import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();
const emptyToUndefined = (value) => {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === 'string' && value.trim() === '')
        return undefined;
    return value;
};
function parseFrontendOrigins(raw) {
    const origins = raw
        .split(',')
        .map((part) => part.trim().replace(/\/$/, ''))
        .filter(Boolean);
    const unique = [];
    for (const origin of origins) {
        try {
            // Validate each entry is a full URL origin
            const url = new URL(origin);
            const normalized = url.origin;
            if (!unique.includes(normalized))
                unique.push(normalized);
        }
        catch {
            // ignore invalid — validated below
        }
    }
    return unique;
}
const envSchema = z
    .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5001),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    // Comma-separated allowed. First = primary (OAuth redirects).
    // Example: http://localhost:3000,https://app.mastplayer.in
    FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),
    BACKEND_URL: z.string().url(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    TOKEN_ENCRYPTION_KEY: z
        .string()
        .regex(/^[0-9a-fA-F]{64}$/, 'TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
    // Preferred names (matching your other project)
    R2_ENDPOINT: z.preprocess(emptyToUndefined, z.string().url().optional()),
    R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
    R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
    R2_BUCKET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    R2_PUBLIC_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    // Legacy aliases
    R2_ACCOUNT_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    R2_BUCKET_NAME: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    R2_PUBLIC_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    MEDIA_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(524288000),
    META_APP_ID: z.preprocess(emptyToUndefined, z.string().optional()),
    META_APP_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    INSTAGRAM_APP_ID: z.preprocess(emptyToUndefined, z.string().optional()),
    INSTAGRAM_APP_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    INSTAGRAM_OAUTH_SCOPES: z
        .string()
        .default('instagram_business_basic,instagram_business_content_publish'),
    INSTAGRAM_REDIRECT_URI: z.preprocess(emptyToUndefined, z.string().url().optional()),
    FACEBOOK_APP_ID: z.preprocess(emptyToUndefined, z.string().optional()),
    FACEBOOK_APP_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    FACEBOOK_REDIRECT_URI: z.preprocess(emptyToUndefined, z.string().url().optional()),
    // Required for Facebook Login for Business (replaces scope= in OAuth URL)
    FACEBOOK_CONFIG_ID: z.preprocess(emptyToUndefined, z.string().optional()),
    FACEBOOK_OAUTH_SCOPES: z
        .string()
        .default('pages_manage_posts,pages_read_engagement,pages_show_list'),
    META_GRAPH_API_VERSION: z.string().default('v26.0'),
    IG_MEDIA_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
    IG_MEDIA_POLL_MAX_ATTEMPTS: z.coerce.number().int().positive().default(36),
    PUBLISH_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
})
    .superRefine((data, ctx) => {
    const origins = parseFrontendOrigins(data.FRONTEND_URL);
    if (origins.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['FRONTEND_URL'],
            message: 'FRONTEND_URL must be one or more comma-separated absolute URLs (e.g. http://localhost:3000,https://app.example.com)',
        });
    }
    const bucket = data.R2_BUCKET ?? data.R2_BUCKET_NAME;
    if (!bucket) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['R2_BUCKET'],
            message: 'R2_BUCKET (or R2_BUCKET_NAME) is required',
        });
    }
    const endpoint = data.R2_ENDPOINT ?? (data.R2_ACCOUNT_ID
        ? `https://${data.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined);
    if (!endpoint) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['R2_ENDPOINT'],
            message: 'R2_ENDPOINT (or R2_ACCOUNT_ID) is required',
        });
    }
})
    .transform((data) => {
    const bucket = (data.R2_BUCKET ?? data.R2_BUCKET_NAME);
    const endpoint = data.R2_ENDPOINT ?? `https://${data.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const publicBaseUrl = data.R2_PUBLIC_URL ?? data.R2_PUBLIC_BASE_URL;
    const frontendUrls = parseFrontendOrigins(data.FRONTEND_URL);
    const frontendUrl = frontendUrls[0];
    return {
        ...data,
        FRONTEND_URL: frontendUrl,
        FRONTEND_URLS: frontendUrls,
        R2_BUCKET: bucket,
        R2_ENDPOINT: endpoint,
        R2_PUBLIC_URL: publicBaseUrl,
    };
});
function loadEnv() {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const details = parsed.error.flatten().fieldErrors;
        console.error('Invalid environment configuration:', details);
        throw new Error('Invalid environment configuration');
    }
    return parsed.data;
}
export const env = loadEnv();
/** True if request Origin is an allowed frontend. */
export function isAllowedFrontendOrigin(origin) {
    if (!origin)
        return false;
    const normalized = origin.replace(/\/$/, '');
    return env.FRONTEND_URLS.includes(normalized);
}
//# sourceMappingURL=env.js.map