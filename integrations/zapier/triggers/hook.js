'use strict';

/**
 * Factory for the REST-hook triggers. Each trigger is one webhook topic:
 * subscribing creates an ordinary Usertour webhook aimed at Zapier's target
 * URL (so delivery rides the standard pipeline — retries, circuit breaker,
 * message log), and unsubscribing deletes it.
 *
 * The delivered body is the public webhook envelope
 * `{ id, object, type, createdAt, environmentId, data }`; the trigger output
 * spreads `data` to the top level so Zap fields read naturally.
 */

const scopedInputFields = [
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
    helpText: 'Events from this environment fire the Zap.',
  },
];

const webhooksUrl = (bundle) =>
  `${bundle.authData.serverUrl}/v2/projects/${bundle.inputData.projectId}` +
  `/environments/${bundle.inputData.environmentId}/webhooks`;

const subscribe = (topic) => async (z, bundle) => {
  const response = await z.request({
    method: 'POST',
    url: webhooksUrl(bundle),
    body: {
      url: bundle.targetUrl,
      topics: [topic],
      description: 'Managed by Zapier — deleting this webhook breaks the Zap.',
    },
  });
  return response.data;
};

const unsubscribe = async (z, bundle) => {
  await z.request({
    method: 'DELETE',
    url: `${webhooksUrl(bundle)}/${bundle.subscribeData.id}`,
    // A 404 means the webhook is already gone (deleted in the dashboard) —
    // the Zap is turning off either way.
    skipThrowForStatus: true,
  });
  return { id: bundle.subscribeData.id };
};

const perform = (z, bundle) => {
  const envelope = bundle.cleanedRequest;
  const { data, ...meta } = envelope;
  return [{ ...meta, ...data }];
};

/**
 * Build one REST-hook trigger.
 * @param {object} spec { key, noun, label, description, topic, sample }
 */
const hookTrigger = (spec) => ({
  key: spec.key,
  noun: spec.noun,
  display: { label: spec.label, description: spec.description },
  operation: {
    type: 'hook',
    inputFields: scopedInputFields,
    performSubscribe: subscribe(spec.topic),
    performUnsubscribe: unsubscribe,
    perform,
    // The editor's test step shows this sample; live payloads replace it the
    // moment the first real event arrives.
    performList: async () => [spec.sample],
    sample: spec.sample,
  },
});

module.exports = { hookTrigger };
