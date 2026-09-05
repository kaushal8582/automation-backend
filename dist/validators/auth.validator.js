import { z } from 'zod';
export const registerSchema = z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(128),
    timezone: z.string().trim().min(1).max(64).optional().default('UTC'),
});
export const loginSchema = z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(1).max(128),
});
//# sourceMappingURL=auth.validator.js.map