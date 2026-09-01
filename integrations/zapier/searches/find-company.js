'use strict';

/**
 * Search: find a company by its external ID. A miss returns an empty list —
 * Zapier's not-found convention, and what its "find or create" pairing with
 * the Create or Update Company action expects.
 */
const perform = async (z, bundle) => {
  const { projectId, environmentId, companyId } = bundle.inputData;
  const response = await z.request({
    url:
      `${bundle.authData.serverUrl}/v2/projects/${projectId}` +
      `/environments/${environmentId}/companies/${encodeURIComponent(companyId)}`,
    skipThrowForStatus: true,
  });
  return response.status === 200 ? [response.data] : [];
};

module.exports = {
  key: 'find_company',
  noun: 'Company',
  display: {
    label: 'Find Company',
    description: 'Finds a company by its company ID.',
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
