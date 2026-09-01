import { parseAmplitudeWebhook } from './inbound-amplitude.parser';
import { INBOUND_MAX_MEMBERS, InboundParseError } from './inbound-mixpanel.parser';

describe('parseAmplitudeWebhook', () => {
  const body = (overrides: Record<string, unknown> = {}) => ({
    cohort_name: 'Power users',
    cohort_id: '7khm89cz',
    in_cohort: true,
    computed_time: '1692206763',
    message_id: 'msg-1::enter::0',
    users: [
      { user_id: 'u1', user_properties: { email: 'u1@example.com', plan: 'pro' } },
      { user_id: 'u2' },
    ],
    ...overrides,
  });

  it('maps in_cohort onto the engine vocabulary and never emits a round', () => {
    const entered = parseAmplitudeWebhook(body(), 'int_1');
    expect(entered.action).toBe('add');
    expect(entered.round).toBeUndefined();
    expect(entered.source).toEqual({ cohortId: '7khm89cz', cohortName: 'Power users' });
    expect(parseAmplitudeWebhook(body({ in_cohort: false }), 'int_1').action).toBe('remove');
    expect(() => parseAmplitudeWebhook(body({ in_cohort: undefined }), 'int_1')).toThrow(
      InboundParseError,
    );
  });

  it('extracts identities via user_id and DISCARDS other properties', () => {
    const batch = parseAmplitudeWebhook(body(), 'int_1');
    expect(batch.memberExternalIds).toEqual(['u1', 'u2']);
    expect(batch.unresolvedCount).toBe(0);
    expect(JSON.stringify(batch)).not.toContain('example.com');
    expect(JSON.stringify(batch)).not.toContain('pro');
  });

  it('honors the userIdProperty override and counts users missing it', () => {
    const batch = parseAmplitudeWebhook(
      body({ users: [{ user_id: 'amp-1', external_ref: 'real-1' }, { user_id: 'amp-2' }] }),
      'int_1',
      'external_ref',
    );
    expect(batch.memberExternalIds).toEqual(['real-1']);
    expect(batch.unresolvedCount).toBe(1);
    // The magic value user_id spells the default path explicitly.
    expect(parseAmplitudeWebhook(body(), 'int_1', 'user_id').memberExternalIds).toEqual([
      'u1',
      'u2',
    ]);
  });

  it('rejects a missing cohort id and an oversized user list; tolerates absent users', () => {
    expect(() => parseAmplitudeWebhook(body({ cohort_id: '' }), 'int_1')).toThrow(
      InboundParseError,
    );
    expect(() =>
      parseAmplitudeWebhook(
        body({ users: new Array(INBOUND_MAX_MEMBERS + 1).fill({ user_id: 'u' }) }),
        'int_1',
      ),
    ).toThrow(InboundParseError);
    const empty = parseAmplitudeWebhook(body({ users: undefined }), 'int_1');
    expect(empty.memberExternalIds).toEqual([]);
    expect(empty.unresolvedCount).toBe(0);
  });
});
