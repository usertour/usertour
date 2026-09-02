'use strict';

const { environmentUrl, coerceAttributes } = require('../lib/api');

/**
 * Action: create or update a Usertour user — a straight mapping onto
 * PUT /v2/.../users/:externalId. Attributes come in as a Zapier dictionary
 * field, are sent as their declared types, and merge into the user's existing
 * attributes; unknown attribute names auto-create definitions server-side.
 */
const perform = async (z, bundle) => {
  const { projectId, environmentId, userId, attributes } = bundle.inputData;
  const response = await z.request({
    method: 'PUT',
    url: environmentUrl(bundle, `/users/${encodeURIComponent(userId)}`),
    body: { attributes: await coerceAttributes(z, bundle, 'user', attributes) },
  });
  return response.data;
};

module.exports = {
  key: 'upsert_user',
  noun: 'User',
  display: {
    label: 'Create or Update User',
    description:
      'Creates a user (or updates an existing one) by their user ID, setting attributes you can target content with.',
  },
  operation: {
    inputFields: [
      {
        key: 'projectId',
        label: 'Project',
        type: 'string',
        required: true,
        dynamic: 'project_list.id.name',
        altersDynamicFields: true,
      },
      {
        key: 'environmentId',
        label: 'Environment',
        type: 'string',
        required: true,
        dynamic: 'environment_list.id.name',
      },
      {
        key: 'userId',
        label: 'User ID',
        type: 'string',
        required: true,
        helpText:
          'The same ID you pass to `usertour.identify()` — matching it is what links this user to your product.',
      },
      {
        key: 'attributes',
        label: 'Attributes',
        dict: true,
        helpText:
          'Attribute name → value pairs, merged into the user. Values are sent as the attribute\'s declared type (number, true/false, text); names must start with a letter and use only letters, digits, and underscores. Unknown names create new text attributes. Blank values are skipped.',
      },
    ],
    perform,
    sample: {
      id: 'user-1234',
      object: 'user',
      createdAt: '2026-09-01T12:34:56.000Z',
      attributes: { email: 'ada@example.com', plan: 'pro' },
    },
  },
};
