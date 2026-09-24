/** The fields of an endpoint to change — what WebhooksService.update takes. */
export type WebhookChanges = {
  id: string;
  url?: string;
  topics?: string[];
  enabled?: boolean;
  description?: string;
};
