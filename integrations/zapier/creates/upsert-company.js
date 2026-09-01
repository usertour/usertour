'use strict';

/**
 * Action: create or update a Usertour company — the mirror of the user
 * action, onto PUT /v2/.../companies/:externalId.
 */
const perform = async (z, bundle) => {
  const { projectId, environmentId, companyId, attributes } = bundle.inputData;
  const response = await z.request({
    method: 'PUT',
    url:
      `${bundle.authData.serverUrl}/v2/projects/${projectId}` +
      `/environments/${environmentId}/companies/${encodeURIComponent(companyId)}`,
    body: { attributes: attributes || {} },
  });
  return response.data;
};

module.exports = {
  key: 'upsert_company',
  noun: 'Company',
  display: {
    label: 'Create or Update Company',
    description:
      'Creates a company (or updates an existing one) by its company ID, setting attributes you can target content with.',
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
        key: 'companyId',
        label: 'Company ID',
        type: 'string',
        required: true,
        helpText: 'The same ID you pass to `usertour.group()` — your own identifier for the company.',
      },
      {
        key: 'attributes',
        label: 'Attributes',
        dict: true,
        helpText:
          'Attribute name → value pairs, merged into the company. Names must start with a letter and use only letters, digits, and underscores.',
      },
    ],
    perform,
    sample: {
      id: 'clx0example0bizcompany0id',
      object: 'company',
      companyId: 'company-42',
      createdAt: '2026-09-01T12:34:56.000Z',
      attributes: { name: 'Example Corp', plan: 'pro' },
    },
  },
};
