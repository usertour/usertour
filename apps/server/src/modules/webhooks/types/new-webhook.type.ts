/** An endpoint to subscribe — what WebhooksService.create takes. */
export type NewWebhook = {
  environmentId: string;
  url: string;
  topics: string[];
  enabled?: boolean;
  description?: string;
};
