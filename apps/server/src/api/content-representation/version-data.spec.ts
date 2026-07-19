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

  it('announcement: field-merge preserves untouched fields; a stored popupConfig echoes under every distribution', () => {
    // Simulates the builder-seeded default data (title + intro already present).
    const existing = {
      title: 'Seeded title',
      introContent: [],
      enableReadMore: false,
      readMoreLabel: 'Read more',
      detailContent: [],
      distribution: 'badge',
    };
    // Partial write: only the distribution changes; everything else must survive.
    const internal: any = compileVersionData(
      'announcement',
      { distribution: 'popup', popupConfig: { style: 'modal' } },
      existing,
      ids,
    );
    expect(internal.title).toBe('Seeded title');
    expect(internal.readMoreLabel).toBe('Read more');
    expect(internal.distribution).toBe('popup');
    expect(internal.popupConfig).toEqual({ style: 'modal' });

    const back: any = decompileVersionData('announcement', internal, idR);
    expect(back.title).toBe('Seeded title');
    expect(back.distribution).toBe('popup');
    expect(back.popupConfig).toEqual({ style: 'modal' });

    // Back to badge: the STORED config keeps echoing — hiding it made a written
    // popupConfig a ghost (invisible on read, resurfacing when distribution
    // later switched back to popup — announcement A+B, L2).
    const badge: any = compileVersionData('announcement', { distribution: 'badge' }, internal, ids);
    const backBadge: any = decompileVersionData('announcement', badge, idR);
    expect(backBadge.popupConfig).toEqual({ style: 'modal' });

    // With nothing stored, non-popup distributions still omit the key (no
    // invented default outside popup).
    const bare: any = decompileVersionData('announcement', { distribution: 'badge' }, idR);
    expect(bare.popupConfig).toBeUndefined();
  });

  it('announcement popup read-back carries the concrete default style when none is stored', () => {
    const back: any = decompileVersionData(
      'announcement',
      { title: 'x', distribution: 'popup' },
      idR,
    );
    // The runtime default is bubble — the read-back says so instead of leaving a hole.
    expect(back.popupConfig).toEqual({ style: 'bubble' });
  });
});
