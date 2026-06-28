import { compileStartRules } from './rules.compile';

// current_url needs no id resolution; stub the resolvers.
const r = { attributeId: (c: string) => c, eventId: (c: string) => c } as any;
const when = [{ type: 'current_url', includes: ['*'] }] as any;
const freq = (mode: string, every?: object) =>
  (compileStartRules({ when, frequency: { mode, ...(every ? { every } : {}) } } as any, r) as any)
    .autoStartRulesSetting.frequency;

describe('compileStartRules — frequency.every defaults', () => {
  it('unlimited: synthesizes the window (duration/unit) but NOT times — runtime ignores times for unlimited', () => {
    const f = freq('unlimited');
    expect(f.frequency).toBe('unlimited');
    expect(f.every.duration).toBeDefined();
    expect(f.every.unit).toBeDefined();
    expect(f.every.times).toBeUndefined();
  });

  it('multiple: synthesizes times (the count cap it actually uses)', () => {
    expect(freq('multiple').every.times).toBeDefined();
  });

  it('once: no every synthesized at all', () => {
    expect(freq('once').every).toBeUndefined();
  });

  it('unlimited + caller-provided every.times → respected, not dropped', () => {
    expect(freq('unlimited', { times: 5, duration: 3, unit: 'days' }).every.times).toBe(5);
  });
});
