/** Structured logger — never log tokens, secrets, or passwords. */
export function createLogger(scope: string) {
  return {
    info(message: string, meta: Record<string, unknown> = {}): void {
      console.log(JSON.stringify({ level: 'info', scope, message, ...meta }));
    },
    warn(message: string, meta: Record<string, unknown> = {}): void {
      console.warn(JSON.stringify({ level: 'warn', scope, message, ...meta }));
    },
    error(message: string, meta: Record<string, unknown> = {}): void {
      console.error(JSON.stringify({ level: 'error', scope, message, ...meta }));
    },
  };
}
