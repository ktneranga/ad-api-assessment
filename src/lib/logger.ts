export class Logger {
  constructor(private requestId: string) {}

  // Log informational messages
  log(message: string, data?: Record<string, unknown>): void {
    console.log(`[${this.requestId}] ${message}`, data || '');
  }

  // Log error messages
  error(message: string, error?: unknown): void {
    console.error(`[${this.requestId}] ${message}`, error || '');
  }
}
