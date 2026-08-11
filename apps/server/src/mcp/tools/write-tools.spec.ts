import { buildWriteTools } from './write-tools';

describe('write-tools audit coverage tripwire', () => {
  // runWithAudit silently skips auditing when a write tool carries no `audit`
  // metadata — the boundary-capture guarantee would otherwise rest on review
  // discipline alone. A new write tool must declare its audit descriptor.
  it('every write tool declares complete audit metadata', () => {
    const tools = buildWriteTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      // Wrap in an object so a failure names the offending tool.
      expect({ name: tool.name, audit: tool.audit }).toEqual({
        name: tool.name,
        audit: expect.objectContaining({
          action: expect.stringMatching(/^(create|update|delete)$/),
          resourceType: expect.any(String),
          resourceId: expect.any(Function),
        }),
      });
    }
  });
});
