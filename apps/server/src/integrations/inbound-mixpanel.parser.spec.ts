import {
  generateInboundToken,
  hashInboundToken,
  buildInboundUrl,
  INBOUND_TOKEN_PREFIX,
} from './inbound-token';
import {
  INBOUND_MAX_MEMBERS,
  InboundParseError,
  parseMixpanelWebhook,
} from './inbound-mixpanel.parser';

describe('inbound token', () => {
  it('mints prefixed, unique, hashable tokens', () => {
    const first = generateInboundToken();
    const second = generateInboundToken();
    expect(first).toMatch(new RegExp(`^${INBOUND_TOKEN_PREFIX}[0-9a-f]{64}$`));
    expect(first).not.toBe(second);
    expect(hashInboundToken(first)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInboundToken(first)).toBe(hashInboundToken(first));
    expect(hashInboundToken(first)).not.toBe(hashInboundToken(second));
  });

  it('builds the receive URL without doubling slashes', () => {
    expect(buildInboundUrl('https://api.example.com/', 'mixpanel', 'utin_x')).toBe(
      'https://api.example.com/inbound/mixpanel/utin_x',
    );
  });
});

describe('parseMixpanelWebhook', () => {
  // The real wire format nests everything but `action` inside `parameters`
  // (members and page_info included) — the builder mirrors that.
  const body = (
    overrides: {
      action?: string;
      members?: unknown[];
      page_info?: Record<string, unknown>;
      parameters?: Record<string, unknown>;
    } = {},
  ) => ({
    action: overrides.action ?? 'add_members',
    parameters: {
      mixpanel_project_id: '42',
      mixpanel_cohort_id: '777',
      mixpanel_cohort_name: 'Power users',
      mixpanel_session_id: 'sess-abc',
      page_info: overrides.page_info ?? { total_pages: 1, page_count: 1 },
      members: overrides.members ?? [
        { mixpanel_distinct_id: 'u1', email: 'u1@example.com', plan: 'pro' },
        { mixpanel_distinct_id: 'u2' },
      ],
      ...(overrides.parameters ?? {}),
    },
  });

  it('maps the three actions onto the engine vocabulary', () => {
    expect(parseMixpanelWebhook(body({ action: 'members' }), 'int_1').action).toBe('replace');
    expect(parseMixpanelWebhook(body({ action: 'add_members' }), 'int_1').action).toBe('add');
    expect(parseMixpanelWebhook(body({ action: 'remove_members' }), 'int_1').action).toBe('remove');
    expect(() => parseMixpanelWebhook(body({ action: 'nonsense' }), 'int_1')).toThrow(
      InboundParseError,
    );
  });

  it('extracts identities via distinct_id by default and DISCARDS other properties', () => {
    const batch = parseMixpanelWebhook(body(), 'int_1');
    expect(batch.source).toEqual({ cohortId: '777', cohortName: 'Power users' });
    expect(batch.memberExternalIds).toEqual(['u1', 'u2']);
    expect(batch.unresolvedCount).toBe(0);
    // Nothing but ids escapes: the batch carries no member objects at all.
    expect(JSON.stringify(batch)).not.toContain('example.com');
    expect(JSON.stringify(batch)).not.toContain('pro');
  });

  it('honors the userIdProperty override and counts members missing it', () => {
    const batch = parseMixpanelWebhook(
      body({
        members: [
          { mixpanel_distinct_id: 'device-1', user_id: 'real-1' },
          { mixpanel_distinct_id: 'device-2' }, // property not exported for this one
        ],
      }),
      'int_1',
      'user_id',
    );
    expect(batch.memberExternalIds).toEqual(['real-1']);
    expect(batch.unresolvedCount).toBe(1);
  });

  it('treats every spelling of the default distinct id as the default path', () => {
    // The UI placeholder says "distinct_id" — a literal-minded customer must
    // not end up with 100% unresolved members.
    for (const spelling of ['mixpanel_distinct_id', 'distinct_id', '$distinct_id']) {
      const batch = parseMixpanelWebhook(body(), 'int_1', spelling);
      expect(batch.memberExternalIds).toEqual(['u1', 'u2']);
    }
  });

  it('rejects prototype-chain action names instead of treating them as adds', () => {
    expect(() => parseMixpanelWebhook(body({ action: 'constructor' }), 'int_1')).toThrow(
      InboundParseError,
    );
    expect(() => parseMixpanelWebhook(body({ action: 'toString' }), 'int_1')).toThrow(
      InboundParseError,
    );
  });

  it('tolerates top-level (unnested) keys — parameters and members alike', () => {
    const flat = {
      action: 'add_members',
      mixpanel_cohort_id: 999,
      mixpanel_cohort_name: 'Flat',
      members: [{ mixpanel_distinct_id: 'u9' }],
    };
    const batch = parseMixpanelWebhook(flat, 'int_1');
    expect(batch.source).toEqual({ cohortId: '999', cohortName: 'Flat' });
    expect(batch.memberExternalIds).toEqual(['u9']);
  });

  it('carries the paging round for replace actions', () => {
    const batch = parseMixpanelWebhook(
      body({ action: 'members', page_info: { total_pages: 3, page_count: 2 } }),
      'int_1',
    );
    expect(batch.round).toEqual({ sessionId: 'sess-abc', page: 2, totalPages: 3 });
    expect(parseMixpanelWebhook(body(), 'int_1').round).toBeUndefined();
  });

  it('rejects a missing cohort id and an oversized member list', () => {
    expect(() =>
      parseMixpanelWebhook(body({ parameters: { mixpanel_cohort_id: undefined } }), 'int_1'),
    ).toThrow(InboundParseError);
    expect(() =>
      parseMixpanelWebhook(
        body({
          members: new Array(INBOUND_MAX_MEMBERS + 1).fill({ mixpanel_distinct_id: 'u' }),
        }),
        'int_1',
      ),
    ).toThrow(InboundParseError);
  });
});
