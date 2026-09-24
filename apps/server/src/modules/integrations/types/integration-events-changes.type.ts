/** Timeline events of a sync provider — what IntegrationsService.updateSyncEvents takes. */
export type IntegrationEventsChanges = {
  id: string;
  enabled?: boolean;
  /** Event codeNames to send; validated against SYNC_TIMELINE_EVENTS in the service. */
  codeNames?: string[];
};
