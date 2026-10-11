/** Where a sync run stands. The keys are the wire strings. */
export const IntegrationSyncRunStatus = {
  running: 'running',
  succeeded: 'succeeded',
  failed: 'failed',
} as const;

export type IntegrationSyncRunStatus = keyof typeof IntegrationSyncRunStatus;
