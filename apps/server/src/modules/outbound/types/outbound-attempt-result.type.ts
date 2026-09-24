export interface OutboundAttemptResult {
  attempt: number;
  success: boolean;
  responseStatus?: number | null;
  responseBody?: string | null;
  error?: string | null;
  durationMs?: number | null;
  /** True when this attempt exhausts the retry budget — a failure then marks the message FAILED. */
  final: boolean;
}
