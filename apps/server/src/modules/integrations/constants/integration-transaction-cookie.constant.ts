// Short-lived signed cookie holding the in-flight CRM OAuth transaction
// between the startIntegrationOAuth mutation and the provider's callback (ADR 0013 §2).
export const INTEGRATION_TX_COOKIE = '_ut_integration_tx';
