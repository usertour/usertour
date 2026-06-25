import { AttributeBizType } from '@/attributes/models/attribute.model';

import { buildCompileResolversFrom, buildDecompileResolversFrom } from './attribute-resolvers';

// Regression: a codeName can exist for user / company / membership (the built-in
// `signed_up_at` / `first_seen_at` / `last_seen_at` / `name`). The condition type
// (user_/company_/membership_attribute) picks the scope; resolution must be by
// scope, not last-write-wins — otherwise an attribute-gated condition resolves to
// the wrong attribute and silently never matches at runtime.
describe('attribute resolvers — scope-aware codeName ↔ id', () => {
  const attributes = [
    { id: 'user-signed-up', codeName: 'signed_up_at', bizType: AttributeBizType.USER },
    { id: 'company-signed-up', codeName: 'signed_up_at', bizType: AttributeBizType.COMPANY },
    { id: 'mem-role', codeName: 'role', bizType: AttributeBizType.MEMBERSHIP },
    { id: 'event-signed-up', codeName: 'signed_up_at', bizType: AttributeBizType.EVENT },
  ];
  const events = [{ id: 'evt-1', codeName: 'purchase' }];

  describe('compile (code → id)', () => {
    const r = buildCompileResolversFrom(attributes, events);

    it('resolves a colliding codeName by scope', () => {
      expect(r.attributeId('signed_up_at', 'user')).toBe('user-signed-up');
      expect(r.attributeId('signed_up_at', 'company')).toBe('company-signed-up');
    });

    it('defaults to the user scope', () => {
      expect(r.attributeId('signed_up_at')).toBe('user-signed-up');
    });

    it('resolves the membership scope', () => {
      expect(r.attributeId('role', 'membership')).toBe('mem-role');
    });

    it('keeps event attributes on their own resolver (not the scoped map)', () => {
      expect(r.eventAttributeId?.('signed_up_at')).toBe('event-signed-up');
    });

    it('falls back to the raw code when unknown', () => {
      expect(r.attributeId('does_not_exist', 'user')).toBe('does_not_exist');
    });
  });

  describe('decompile (id → code + scope)', () => {
    const r = buildDecompileResolversFrom(attributes, events);

    it('maps an id to its codeName and scope', () => {
      expect(r.attributeCode('company-signed-up')).toBe('signed_up_at');
      expect(r.attributeScope('company-signed-up')).toBe('company');
      expect(r.attributeScope('user-signed-up')).toBe('user');
      expect(r.attributeScope('mem-role')).toBe('membership');
    });

    it('defaults the scope to user for an unknown id', () => {
      expect(r.attributeScope('does_not_exist')).toBe('user');
    });
  });

  it('round-trips a company attribute (decompile → compile) without becoming user', () => {
    const dec = buildDecompileResolversFrom(attributes, events);
    const comp = buildCompileResolversFrom(attributes, events);
    const id = 'company-signed-up';
    // A builder-authored company attribute decompiles to (code, scope), which must
    // compile back to the SAME company id — not the colliding user one.
    expect(comp.attributeId(dec.attributeCode(id), dec.attributeScope(id))).toBe(id);
  });
});
