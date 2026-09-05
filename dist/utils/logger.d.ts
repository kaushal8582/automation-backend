/** Structured logger — never log tokens, secrets, or passwords. */
export declare function createLogger(scope: string): {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
};
//# sourceMappingURL=logger.d.ts.map