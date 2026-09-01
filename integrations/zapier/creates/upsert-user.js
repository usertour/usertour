'use strict';

/**
 * Action: create or update a Usertour user — a straight mapping onto
 * PUT /v2/.../users/:externalId. Attributes come in as a Zapier dictionary
 * field and merge into the user's existing attributes; unknown attribute
 * names auto-create definitions server-side.
 */
const perform = async (z, bundle) => {
  const { projectId, environmentId, userId, attributes } = bundle.inputData;
  const response = await z.request({
    method: 'PUT',
    url:
      `${bundle.authData.serverUrl}/v2/projects/${projectId}` +
      `/environments/${environmentId}/users/${encodeURIComponent(userId)}`,
    body: { attributes: attributes || {} },
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
          'Attribute name → value pairs, merged into the user. Names must start with a letter and use only letters, digits, and underscores; unknown names create new attribute definitions.',
      },
    ],
    perform,
    sample: {
      id: 'clx0example0bizuser0id',
      object: 'user',
      userId: 'user-1234',
      createdAt: '2026-09-01T12:34:56.000Z',
      attributes: { email: 'ada@example.com', plan: 'pro' },
    },
  },
};
