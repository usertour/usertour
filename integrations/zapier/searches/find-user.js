'use strict';

const { environmentUrl } = require('../lib/api');

/**
 * Search: find a user by their external ID. A miss returns an empty list —
 * Zapier's not-found convention, and what its "find or create" pairing with
 * the Create or Update User action expects.
 */
const perform = async (z, bundle) => {
  const { projectId, environmentId, userId } = bundle.inputData;
  const response = await z.request({
    url: environmentUrl(bundle, `/users/${encodeURIComponent(userId)}`),
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
  key: 'find_user',
  noun: 'User',
  display: {
    label: 'Find User',
    description: 'Finds a user by their user ID.',
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
        helpText: 'The same ID you pass to `usertour.identify()`.',
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
