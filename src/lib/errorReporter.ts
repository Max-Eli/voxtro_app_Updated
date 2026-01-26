/**
 * Error Reporter Utility
 * Sends errors to the report-error Edge Function for logging and webhook notifications
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://nzqzmvsrsfynatxojuil.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cXptdnNyc2Z5bmF0eG9qdWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTQwNzIsImV4cCI6MjA4NDU5MDA3Mn0.avKeLENuqO2nKbaGnaZKHkD1uhp6HMk_Jlsr-GHSwqs";

export type ErrorSeverity = 'warning' | 'error' | 'critical';
export type ErrorType = 'frontend' | 'api' | 'edge_function' | 'webhook' | 'email' | 'auth';

interface ReportErrorOptions {
  type: ErrorType;
  source: string;
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  severity?: ErrorSeverity;
}

/**
 * Report an error to the error monitoring system
 * This logs the error and sends notifications to configured webhooks
 */
export async function reportError(options: ReportErrorOptions): Promise<void> {
  const { type, source, message, stack, metadata, severity = 'error' } = options;

  // Always log to console
  console.error(`[${type.toUpperCase()}] ${source}:`, message, metadata || '');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/report-error`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error_type: type,
        error_source: source,
        error_message: message,
        error_stack: stack,
        metadata: {
          ...metadata,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          timestamp: new Date().toISOString(),
        },
        severity,
      }),
    });

    if (!response.ok) {
      console.error('[ErrorReporter] Failed to report error:', await response.text());
    }
  } catch (e) {
    // Don't throw - we don't want error reporting to cause more errors
    console.error('[ErrorReporter] Failed to send error report:', e);
  }
}

/**
 * Create an error reporter for a specific component/module
 * Usage: const report = createErrorReporter('MyComponent');
 *        report.error('Something went wrong', { userId: '123' });
 */
export function createErrorReporter(source: string, type: ErrorType = 'frontend') {
  return {
    warning: (message: string, metadata?: Record<string, unknown>) =>
      reportError({ type, source, message, metadata, severity: 'warning' }),

    error: (message: string, metadata?: Record<string, unknown>) =>
      reportError({ type, source, message, metadata, severity: 'error' }),

    critical: (message: string, metadata?: Record<string, unknown>) =>
      reportError({ type, source, message, metadata, severity: 'critical' }),

    fromError: (error: Error, metadata?: Record<string, unknown>) =>
      reportError({
        type,
        source,
        message: error.message,
        stack: error.stack,
        metadata,
        severity: 'error',
      }),
  };
}

/**
 * Global error handler - can be attached to window.onerror
 */
export function setupGlobalErrorHandler(): void {
  if (typeof window === 'undefined') return;

  // Handle uncaught errors
  window.onerror = (message, source, lineno, colno, error) => {
    reportError({
      type: 'frontend',
      source: source || 'unknown',
      message: String(message),
      stack: error?.stack,
      metadata: { lineno, colno },
      severity: 'error',
    });
    return false; // Let the default handler run too
  };

  // Handle unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason;
    reportError({
      type: 'frontend',
      source: 'UnhandledPromiseRejection',
      message: error?.message || String(error),
      stack: error?.stack,
      severity: 'error',
    });
  };
}
