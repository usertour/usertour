/** Inbound cohort sync switch and options — what IntegrationsService.updateInbound takes. */
export type IntegrationInboundChanges = {
  id: string;
  enabled?: boolean;
  /** Empty string clears the override (back to distinct_id matching). */
  userIdProperty?: string;
};
