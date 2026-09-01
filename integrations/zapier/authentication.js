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
        'Create one in Usertour under **Settings → API** (see https://docs.usertour.io/api-reference-v2/authentication). The token needs the **Webhooks: manage** scope for triggers, plus **Users: write** if you use the user actions, and must include the environments you want to connect.',
    },
  ],
  test,
  connectionLabel: (z, bundle) => bundle.inputData.tokenName || 'Usertour',
};
