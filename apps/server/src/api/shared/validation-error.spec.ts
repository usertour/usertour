import { ValidationError } from '@/common/errors/errors';

// The MCP tool surface renders ONLY the message string (no structured issues),
// so the aggregate message must carry each issue's path — without it a schema
// error in a large payload is unlocatable (checklist A+B round, defect D2).
describe('ValidationError.fromIssues — message carries paths', () => {
  it('prefixes each issue message with its path', () => {
    const err = ValidationError.fromIssues([
      { rule: 'schema', path: 'data.items[0].name', message: 'expected string' },
      { rule: 'schema', message: 'no path on this one' },
    ]);
    expect(err.getMessage('en')).toBe('data.items[0].name: expected string | no path on this one');
  });
});
