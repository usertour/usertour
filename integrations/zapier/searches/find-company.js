'use strict';

const { environmentUrl } = require('../lib/api');

/**
 * Search: find a company by its external ID. A miss returns an empty list —
 * Zapier's not-found convention, and what its "find or create" pairing with
 * the Create or Update Company action expects.
 */
const perform = async (z, bundle) => {
  const { projectId, environmentId, companyId } = bundle.inputData;
  const response = await z.request({
    url: environmentUrl(bundle, `/companies/${encodeURIComponent(companyId)}`),
    skipThrowForStatus: true,
  });
  // Only a definite 404 means "not found" — anything else (auth failure,
  // transient 5xx) must fail the step, or a find-or-create Zap would fall
  // through to create and overwrite existing attributes.
  if (response.status === 404) {
    return [];
  }
  response.throwForStatus();
  return [response.data];
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
      id: 'company-42',
      object: 'company',
      createdAt: '2026-09-01T12:34:56.000Z',
      attributes: { name: 'Example Corp', plan: 'pro' },
    },
  },
};
