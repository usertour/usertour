export const QUEUE_INTEGRATION_DELIVERY = 'integration-delivery';
export const QUEUE_INTEGRATION_RECONCILE = 'integrationReconcile';
/** CRM full-sync pages (ADR 0013 §7): one job per provider page, self-chaining. */
export const QUEUE_OBJECT_SYNC = 'object-sync';
/** Hourly scan that starts the daily full sync for stale mappings. */
export const QUEUE_OBJECT_SYNC_CRON = 'objectSyncCron';
