/**
 * Catalog of scopes a personal API token can be granted. `labelKey` resolves
 * via i18n (`settings.personalApiKeys.scopes.*`). Used by both the create
 * dialog's checkbox list and the list page's scope badges.
 */
export interface ApiTokenScopeOption {
  value: string;
  labelKey: string;
}

export const API_TOKEN_SCOPE_OPTIONS: readonly ApiTokenScopeOption[] = [
  { value: 'content:read', labelKey: 'settings.personalApiKeys.scopes.content' },
  { value: 'content:create', labelKey: 'settings.personalApiKeys.scopes.contentCreate' },
  { value: 'content:update', labelKey: 'settings.personalApiKeys.scopes.contentUpdate' },
  { value: 'content:delete', labelKey: 'settings.personalApiKeys.scopes.contentDelete' },
  { value: 'content:publish', labelKey: 'settings.personalApiKeys.scopes.contentPublish' },
  { value: 'theme:read', labelKey: 'settings.personalApiKeys.scopes.themes' },
  { value: 'user:read', labelKey: 'settings.personalApiKeys.scopes.users' },
  { value: 'company:read', labelKey: 'settings.personalApiKeys.scopes.companies' },
  { value: 'session:read', labelKey: 'settings.personalApiKeys.scopes.sessions' },
  { value: 'attribute:read', labelKey: 'settings.personalApiKeys.scopes.attributes' },
  { value: 'event:read', labelKey: 'settings.personalApiKeys.scopes.events' },
  { value: 'analytics:read', labelKey: 'settings.personalApiKeys.scopes.analytics' },
];

const SCOPE_LABEL_KEY_INDEX: Record<string, string> = Object.fromEntries(
  API_TOKEN_SCOPE_OPTIONS.map((option) => [option.value, option.labelKey]),
);

/**
 * i18n key for a scope value, or `undefined` for unknown scopes (the caller
 * should fall back to rendering the raw value).
 */
export const getScopeLabelKey = (value: string): string | undefined => SCOPE_LABEL_KEY_INDEX[value];
