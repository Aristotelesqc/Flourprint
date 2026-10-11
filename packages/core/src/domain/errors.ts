/**
 * Structured error shared by the engine, the CLI and the UI.
 * `code` and `details` are stable data that clients localize; `message` is English developer
 * text and is never shown to users as-is (ADR 0009).
 */
export interface DomainError<C extends string = string, D = unknown> {
  readonly code: C;
  readonly message: string;
  readonly details?: D;
}

export const domainError = <C extends string, D>(
  code: C,
  message: string,
  details?: D,
): DomainError<C, D> => (details === undefined ? { code, message } : { code, message, details });
