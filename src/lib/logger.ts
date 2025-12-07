export class Logger {
  constructor(private requestId: string) {}

  log(message: string, data?: Record<string, unknown>): void {
    console.log(`[${this.requestId}] ${message}`, data || '');
  }

  error(message: string, error?: unknown): void {
    console.error(`[${this.requestId}] ${message}`, error || '');
  }
}
