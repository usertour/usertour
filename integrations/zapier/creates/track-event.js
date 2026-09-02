'use strict';

const { environmentUrl, coerceAttributes } = require('../lib/api');

/**
 * Action: record a behavior event for a user — POST /v2/.../events. Unseen
 * users are created; an unknown event name registers a definition on first
 * use; built-in Usertour event names are refused server-side.
 */
const perform = async (z, bundle) => {
  const { projectId, environmentId, userId, companyId, name, attributes, occurredAt } =
    bundle.inputData;
  const eventAttributes = await coerceAttributes(z, bundle, 'eventDefinition', attributes);
  const response = await z.request({
    method: 'POST',
    url: environmentUrl(bundle, '/events'),
    body: {
      userId,
      name,
      ...(companyId ? { companyId } : {}),
      ...(Object.keys(eventAttributes).length ? { attributes: eventAttributes } : {}),
      ...(occurredAt ? { occurredAt } : {}),
    },
  });
  return response.data;
};

module.exports = {
  key: 'track_event',
  noun: 'Event',
  display: {
    label: 'Track Event',
    description:
      'Records an event for a user, usable in Usertour targeting, triggers, and analytics.',
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
        helpText: "The same ID you pass to `usertour.identify()`. Unseen users are created.",
      },
      {
        key: 'name',
        label: 'Event Name',
        type: 'string',
        required: true,
        helpText:
          'A code name: starts with a letter; letters, digits, and underscores only (e.g. `subscription_activated`). An unknown name creates the event definition; built-in Usertour event names are refused.',
      },
      {
        key: 'companyId',
        label: 'Company ID',
        type: 'string',
        helpText: 'Associates the event with an existing company (unknown ids are ignored).',
      },
      {
        key: 'attributes',
        label: 'Attributes',
        dict: true,
        helpText:
          'Event attribute values, sent as each attribute\'s declared type; unknown names register as text attributes on the event definition. Blank values are skipped.',
      },
      {
        key: 'occurredAt',
        label: 'Occurred At',
        type: 'datetime',
        helpText: 'When the event actually happened; defaults to now.',
      },
    ],
    perform,
    sample: {
      id: 'clx0example0event0id',
      object: 'event',
      codeName: 'subscription_activated',
      eventDefinitionId: 'clx0example0definition0id',
      createdAt: '2026-09-01T12:34:56.000Z',
      userId: 'user-1234',
      companyId: null,
      sessionId: null,
      contentId: null,
      versionId: null,
      attributes: { plan_name: 'plus', plan_price: 199 },
    },
  },
};
