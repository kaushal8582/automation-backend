/** Structured logger — never log tokens, secrets, or passwords. */
export function createLogger(scope) {
    return {
        info(message, meta = {}) {
            console.log(JSON.stringify({ level: 'info', scope, message, ...meta }));
        },
        warn(message, meta = {}) {
            console.warn(JSON.stringify({ level: 'warn', scope, message, ...meta }));
        },
        error(message, meta = {}) {
            console.error(JSON.stringify({ level: 'error', scope, message, ...meta }));
        },
    };
}
//# sourceMappingURL=logger.js.map