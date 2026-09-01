'use strict';

/**
 * Custom auth: a Usertour API token (Settings → API), validated against
 * GET /v2/me — the projectless introspection route added for integration
 * platforms. `serverUrl` supports self-hosted instances; the default is
 * Usertour Cloud.
 */
const test = async (z, bundle) => {
  const response = await z.request({ url: `${bundle.authData.serverUrl}/v2/me` });
  return response.data;
};

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'serverUrl',
      label: 'Server URL',
      type: 'string',
      required: true,
      default: 'https://api.usertour.io',
      helpText:
        'Usertour Cloud uses the default. Self-hosted? Enter your instance API URL (the same host your SDK talks to). See https://docs.usertour.io/api-reference-v2/introduction.',
    },
    {
      key: 'apiToken',
      label: 'API Token',
      type: 'password',
      required: true,
      helpText:
        'Create one in Usertour under **Settings → API** (see https://docs.usertour.io/api-reference-v2/authentication). Scopes: **Webhooks: manage** for triggers, **Events: read** for the Event Tracked trigger, **Users: read/write** and **Companies: read/write** for the actions and searches you use — and include the environments you want to connect.',
    },
  ],
  test,
  connectionLabel: (z, bundle) => bundle.inputData.tokenName || 'Usertour',
};
