/**
 * Centralized Backend Error Sanitizer
 * 
 * Prevents database queries, internal SQL exceptions, stack traces,
 * and low-level runtime errors from leaking to users/clients, while
 * preserving human-readable domain validation errors.
 */

const SENSITIVE_PATTERNS = [
  /sqlite/i,
  /\bsql\b/i,
  /drizzle/i,
  /constraint/i,
  /foreign key/i,
  /unique constraint/i,
  /select\s+/i,
  /insert\s+/i,
  /update\s+/i,
  /delete\s+/i,
  /from\s+/i,
  /where\s+/i,
  /syntaxerror/i,
  /typeerror/i,
  /referenceerror/i,
  /econnrefused/i,
  /failed to fetch/i,
  /node_modules/i,
  /at\s+async\s+/i,
];

export function sanitizeServerError(err: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return fallbackMessage;

  const rawMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : String(err);
  const trimmed = rawMessage.trim();

  // Log raw technical details on the backend for debugging
  console.error('[ServerError]:', err);

  if (!trimmed) return fallbackMessage;

  // Mask database / internal system error details
  const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(trimmed));
  if (isSensitive) {
    return fallbackMessage;
  }

  return trimmed;
}
