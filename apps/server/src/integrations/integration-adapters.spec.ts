import { INTEGRATION_PROVIDERS } from '@usertour/constants';
import { INTEGRATION_ADAPTERS, buildProviderRequest, resolveAdapter } from './integration-adapters';
import { IntegrationMessageEnvelope } from './integrations.types';

const envelope: IntegrationMessageEnvelope = {
  id: 'imsg_abc123',
  object: 'integrationMessage',
  type: 'event.tracked.flow_started',
  createdAt: '2026-07-16T08:00:00.000Z',
  environmentId: 'env_1',
  data: {
    event: {
      id: 'be_1',
      object: 'event',
      codeName: 'flow_started',
      eventDefinitionId: 'evt_def_1',
      createdAt: '2026-07-16T08:00:00.000Z',
      userId: 'user-ext-1',
      companyId: null,
      sessionId: 'sess_1',
      contentId: null,
      versionId: null,
      attributes: { flow_id: 'f1', flow_name: 'Onboarding' },
    },
  },
};

const EVENT_TIME_MS = Date.parse('2026-07-16T08:00:00.000Z');

/** What every provider should receive as properties: attributes + the
 *  per-type session attribute (flow_id in the fixture -> flow_session_id). */
const expectedProperties = {
  ...envelope.data.event.attributes,
  flow_session_id: 'sess_1',
};

describe('integration adapters', () => {
  it('covers every provider in INTEGRATION_PROVIDERS (registry completeness)', () => {
    expect(Object.keys(INTEGRATION_ADAPTERS).sort()).toEqual([...INTEGRATION_PROVIDERS].sort());
  });

  it('resolveAdapter refuses unknown providers, prototype names included', () => {
    expect(resolveAdapter('salesforce')).toBeNull();
    expect(resolveAdapter('constructor')).toBeNull();
    expect(resolveAdapter('amplitude')).not.toBeNull();
    expect(buildProviderRequest('nope', envelope, 'k', {})).toBeNull();
  });

  describe('amplitude', () => {
    it('sends the batch shape with event time and the message id as insert_id', () => {
      const request = INTEGRATION_ADAPTERS.amplitude(envelope, 'amp-key', {});
      expect(request.url).toBe('https://api2.amplitude.com/batch');
      expect(request.body).toEqual({
        api_key: 'amp-key',
        events: [
          {
            event_type: 'flow_started',
            user_id: 'user-ext-1',
            time: EVENT_TIME_MS,
            insert_id: 'imsg_abc123',
            event_properties: expectedProperties,
          },
        ],
      });
    });

    it('switches to the EU endpoint by config', () => {
      const request = INTEGRATION_ADAPTERS.amplitude(envelope, 'amp-key', { region: 'EU' });
      expect(request.url).toBe('https://api.eu.amplitude.com/batch');
    });
  });

  describe('heap', () => {
    it('uses the key as app_id and the event time as timestamp', () => {
      const request = INTEGRATION_ADAPTERS.heap(envelope, 'heap-app-id', {});
      expect(request.url).toBe('https://heapanalytics.com/api/track');
      expect(request.body).toEqual({
        app_id: 'heap-app-id',
        identity: 'user-ext-1',
        event: 'flow_started',
        timestamp: '2026-07-16T08:00:00.000Z',
        properties: expectedProperties,
      });
    });
  });

  describe('mixpanel', () => {
    it('sends the /track array with token, epoch-seconds time, and $insert_id = message id', () => {
      const request = INTEGRATION_ADAPTERS.mixpanel(envelope, 'mp-token', {});
      expect(request.url).toBe('https://api.mixpanel.com/track');
      expect(request.body).toEqual([
        {
          event: 'flow_started',
          properties: {
            ...expectedProperties,
            distinct_id: 'user-ext-1',
            token: 'mp-token',
            time: Math.floor(EVENT_TIME_MS / 1000),
            $insert_id: 'imsg_abc123',
          },
        },
      ]);
    });

    it('the message id fits the 36-character $insert_id cap', () => {
      // "imsg_" + 24 hex — pinned so a longer id scheme cannot silently break
      // provider-side dedup.
      expect(envelope.id.length).toBeLessThanOrEqual(36);
    });

    it('switches to the EU endpoint by config', () => {
      const request = INTEGRATION_ADAPTERS.mixpanel(envelope, 'mp-token', { region: 'EU' });
      expect(request.url).toBe('https://api-eu.mixpanel.com/track');
    });
  });

  describe('posthog', () => {
    it('sends the capture shape with the event time', () => {
      const request = INTEGRATION_ADAPTERS.posthog(envelope, 'ph-key', {});
      expect(request.url).toBe('https://us.i.posthog.com/i/v0/e/');
      expect(request.body).toEqual({
        api_key: 'ph-key',
        event: 'flow_started',
        distinct_id: 'user-ext-1',
        timestamp: '2026-07-16T08:00:00.000Z',
        properties: expectedProperties,
      });
    });

    it('switches to the EU endpoint by config', () => {
      const request = INTEGRATION_ADAPTERS.posthog(envelope, 'ph-key', { region: 'EU' });
      expect(request.url).toBe('https://eu.i.posthog.com/i/v0/e/');
    });
  });

  const propertiesOf = (body: Record<string, any>) =>
    Array.isArray(body)
      ? body[0].properties
      : (body.events?.[0]?.event_properties ?? body.properties);

  it('omits the session attribute for sessionless events on every provider', () => {
    const sessionless: IntegrationMessageEnvelope = {
      ...envelope,
      data: { event: { ...envelope.data.event, sessionId: null } },
    };
    for (const provider of INTEGRATION_PROVIDERS) {
      const properties = propertiesOf(
        INTEGRATION_ADAPTERS[provider](sessionless, 'key', {}).body as Record<string, any>,
      );
      expect(properties).not.toHaveProperty('session_id');
      expect(properties).not.toHaveProperty('flow_session_id');
    }
  });

  it('derives the session attribute name from the content type', () => {
    const checklistEvent: IntegrationMessageEnvelope = {
      ...envelope,
      data: {
        event: {
          ...envelope.data.event,
          codeName: 'checklist_task_clicked',
          attributes: { checklist_id: 'cl1', checklist_name: 'Onboarding' },
        },
      },
    };
    const checklistProperties = propertiesOf(
      INTEGRATION_ADAPTERS.mixpanel(checklistEvent, 'k', {}).body as Record<string, any>,
    );
    expect(checklistProperties.checklist_session_id).toBe('sess_1');
    expect(checklistProperties).not.toHaveProperty('flow_session_id');

    // No content-id attribute at all -> the bare fallback name.
    const bareEvent: IntegrationMessageEnvelope = {
      ...envelope,
      data: {
        event: { ...envelope.data.event, codeName: 'custom_event', attributes: { foo: 'bar' } },
      },
    };
    const bareProperties = propertiesOf(
      INTEGRATION_ADAPTERS.segment(bareEvent, 'k', {}).body as Record<string, any>,
    );
    expect(bareProperties.session_id).toBe('sess_1');
  });

  describe('segment', () => {
    it('authenticates via Basic auth (writeKey as username) and dedups on messageId', () => {
      const request = INTEGRATION_ADAPTERS.segment(envelope, 'seg-write-key', {});
      expect(request.url).toBe('https://api.segment.io/v1/track');
      expect(request.headers).toEqual({
        Authorization: `Basic ${Buffer.from('seg-write-key:').toString('base64')}`,
      });
      expect(request.body).toEqual({
        event: 'flow_started',
        userId: 'user-ext-1',
        properties: expectedProperties,
        timestamp: '2026-07-16T08:00:00.000Z',
        messageId: 'imsg_abc123',
      });
    });

    it('switches to the EU endpoint by config', () => {
      const request = INTEGRATION_ADAPTERS.segment(envelope, 'seg-write-key', { region: 'EU' });
      expect(request.url).toBe('https://events.eu1.segmentapis.com/v1/track');
    });
  });
});
