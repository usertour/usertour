import { compileVersionData } from './version-data.compile';
import { decompileVersionData } from './version-data.decompile';

const ids = { attributeId: (c: string) => c, eventId: (c: string) => c } as never;
const idR = { attributeCode: (i: string) => i, eventCode: (i: string) => i } as never;

describe('version-data builder settings round-trip', () => {
  it('launcher zIndex + tooltip.reference', () => {
    const rep = {
      style: 'icon',
      zIndex: 50,
      target: { selector: '.x' },
      tooltip: { reference: 'launcher', content: [] },
    };
    const internal: any = compileVersionData('launcher', rep, undefined, ids);
    expect(internal.zIndex).toBe(50);
    expect(internal.tooltip.reference).toBe('launcher');
    const back: any = decompileVersionData('launcher', internal, idR);
    expect(back.zIndex).toBe(50);
    expect(back.tooltip.reference).toBe('launcher');
  });

  it('launcher tooltip placement: side/align derive alignType:fixed so align takes effect', () => {
    // A launcher left in alignType:'auto' renders center regardless of align —
    // exposing alignType + deriving 'fixed' from a provided side/align makes the
    // authored direction actually render.
    const rep = {
      style: 'icon',
      target: { selector: '.x' },
      tooltip: { reference: 'target', placement: { side: 'right', align: 'start' }, content: [] },
    };
    const internal: any = compileVersionData('launcher', rep, undefined, ids);
    expect(internal.tooltip.alignment.side).toBe('right');
    expect(internal.tooltip.alignment.align).toBe('start');
    expect(internal.tooltip.alignment.alignType).toBe('fixed');
  });

  it('banner zIndex', () => {
    const rep = { placement: 'top-of-page', zIndex: 99, content: [] };
    const internal: any = compileVersionData('banner', rep, undefined, ids);
    expect(internal.zIndex).toBe(99);
    const back: any = decompileVersionData('banner', internal, idR);
    expect(back.zIndex).toBe(99);
  });
});
