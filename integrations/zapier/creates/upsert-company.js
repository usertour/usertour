'use strict';

const { environmentUrl, coerceAttributes } = require('../lib/api');

/**
 * Action: create or update a Usertour company — the mirror of the user
 * action, onto PUT /v2/.../companies/:externalId.
 */
const perform = async (z, bundle) => {
  const { projectId, environmentId, companyId, attributes } = bundle.inputData;
  const response = await z.request({
    method: 'PUT',
    url: environmentUrl(bundle, `/companies/${encodeURIComponent(companyId)}`),
    body: { attributes: await coerceAttributes(z, bundle, 'company', attributes) },
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
          'Attribute name → value pairs, merged into the company. Values are sent as the attribute\'s declared type (number, true/false, text); names must start with a letter and use only letters, digits, and underscores. Unknown names create new text attributes. Blank values are skipped.',
      },
    ],
    perform,
    sample: {
      id: 'company-42',
      object: 'company',
      createdAt: '2026-09-01T12:34:56.000Z',
      attributes: { name: 'Example Corp', plan: 'pro' },
    },
  },
};
