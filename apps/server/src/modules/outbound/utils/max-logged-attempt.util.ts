/**
 * The highest attempt number a set of delivery rows records — the ONLY
 * correct way to resume numbering or budgets. Never use the row COUNT:
 * settle-write retries and stalled twin jobs insert duplicate rows (see the
 * OutboundLedgerService.recordAttempt doc), which inflate a count but not the
 * max.
 */
export const maxLoggedAttempt = (deliveries: Array<{ attempt: number }>): number =>
  deliveries.reduce((highest, delivery) => Math.max(highest, delivery.attempt), 0);
