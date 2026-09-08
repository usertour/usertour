export const ACCESS_TOKEN_COOKIE = '_ut_access';
export const REFRESH_TOKEN_COOKIE = '_ut_refresh';
export const UID_COOKIE = '_ut_uid';
// Short-lived signed cookie holding the in-flight OIDC SSO transaction
// (state / nonce / PKCE verifier) between initiate and callback.
export const SSO_TX_COOKIE = '_ut_sso_tx';
// Short-lived signed cookie holding the in-flight CRM OAuth transaction
// between the startCrmOAuth mutation and the provider's callback (ADR 0013 §2).
export const CRM_TX_COOKIE = '_ut_crm_tx';
