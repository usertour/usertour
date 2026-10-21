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

  it('launcher target.placement positions the beacon on the target (L3) and round-trips', () => {
    const rep = {
      style: 'beacon',
      target: { selector: '.x', placement: { side: 'right', align: 'end', alignOffset: 8 } },
      tooltip: { content: [] },
    };
    const internal: any = compileVersionData('launcher', rep, undefined, ids);
    // Beacon position lands on target.alignment with alignType derived to fixed.
    expect(internal.target.alignment).toMatchObject({
      side: 'right',
      align: 'end',
      alignOffset: 8,
      alignType: 'fixed',
    });
    // element selector still compiled alongside.
    expect(internal.target.element).toBeDefined();
    const back: any = decompileVersionData('launcher', internal, idR);
    expect(back.target.placement).toEqual({ side: 'right', align: 'end', alignOffset: 8 });
  });

  it('auto-mode alignment (the seeded default) omits placement on read-back — no echo→fixed flip', () => {
    // DEFAULT_LAUNCHER_DATA seeds target/tooltip alignment {top,center,auto}.
    // A read-back that surfaced {top,center} would, when echoed, derive `fixed`
    // and silently pin an auto-centered launcher (launcher A+B finding). Compile
    // a target + tooltip against that seed WITHOUT authoring placement.
    const seededExisting = {
      type: 'icon',
      target: {
        element: undefined,
        alignment: {
          side: 'top',
          align: 'center',
          alignType: 'auto',
          sideOffset: 0,
          alignOffset: 0,
        },
      },
      tooltip: {
        alignment: {
          side: 'top',
          align: 'center',
          alignType: 'auto',
          sideOffset: 0,
          alignOffset: 0,
        },
        content: [],
      },
    };
    const internal: any = compileVersionData(
      'launcher',
      { target: { selector: '.x' }, tooltip: { content: [] } },
      seededExisting,
      ids,
    );
    expect(internal.target.alignment.alignType).toBe('auto'); // stayed auto
    const back: any = decompileVersionData('launcher', internal, idR);
    expect(back.target.placement).toBeUndefined();
    expect(back.tooltip.placement).toBeUndefined();
  });

  it('launcher dead tooltip settings are read-only: echo kept, change rejected (L2)', () => {
    const existing = {
      type: 'icon',
      tooltip: {
        settings: {
          dismissAfterFirstActivation: false,
          keepTooltipOpenWhenHovered: false,
          hideLauncherWhenTooltipIsDisplayed: false,
        },
      },
    };
    // Echo of the stored (false) value is accepted.
    const echoed: any = compileVersionData(
      'launcher',
      {
        tooltip: { settings: { keepOpenWhenHovered: false, hideLauncherWhenTooltipShown: false } },
      },
      existing,
      ids,
    );
    expect(echoed.tooltip.settings.keepTooltipOpenWhenHovered).toBe(false);
    // Changing either is rejected.
    const msg = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return (e as { getMessage?: (l: string) => string }).getMessage?.('en') ?? String(e);
      }
      throw new Error('expected throw');
    };
    expect(
      msg(() =>
        compileVersionData(
          'launcher',
          { tooltip: { settings: { keepOpenWhenHovered: true } } },
          existing,
          ids,
        ),
      ),
    ).toMatch(/read-only/i);
    expect(
      msg(() =>
        compileVersionData(
          'launcher',
          { tooltip: { settings: { hideLauncherWhenTooltipShown: true } } },
          existing,
          ids,
        ),
      ),
    ).toMatch(/read-only/i);
    // dismissAfterFirstActivation (the live one) is freely writable.
    const live: any = compileVersionData(
      'launcher',
      { tooltip: { settings: { dismissAfterFirstActivation: true } } },
      existing,
      ids,
    );
    expect(live.tooltip.settings.dismissAfterFirstActivation).toBe(true);
  });

  it('banner zIndex', () => {
    const rep = { placement: 'top-of-page', zIndex: 99, content: [] };
    const internal: any = compileVersionData('banner', rep, undefined, ids);
    expect(internal.zIndex).toBe(99);
    const back: any = decompileVersionData('banner', internal, idR);
    expect(back.zIndex).toBe(99);
  });

  it('embed shell: maps onto EmbedData, field-merges onto the seeded default, and reads back', () => {
    // DEFAULT_EMBED_DATA is what create seeds; a partial write must land on it.
    const seeded = { placement: 'immediately-after-element', allowUsersToDismiss: true };
    const internal: any = compileVersionData(
      'embed',
      { placement: 'cover-element', target: { selector: '#reports', text: 'Reports' }, zIndex: 7 },
      seeded,
      ids,
    );
    expect(internal).toMatchObject({
      placement: 'cover-element',
      allowUsersToDismiss: true, // preserved from the seed (field-merge)
      zIndex: 7,
      targetElement: { type: 'manual', customSelector: '#reports', content: 'Reports' },
    });

    const back: any = decompileVersionData('embed', internal, idR);
    expect(back).toEqual({
      placement: 'cover-element',
      target: { selector: '#reports', text: 'Reports' },
      allowDismiss: true,
      zIndex: 7,
    });

    // The remaining shell fields round-trip too; the shell never grows a body.
    const full: any = compileVersionData(
      'embed',
      {
        allowDismiss: false,
        maxContentWidth: 400,
        outerMargin: { top: 1, right: 2, bottom: 3, left: 4 },
      },
      internal,
      ids,
    );
    expect(decompileVersionData('embed', full, idR)).toEqual({
      placement: 'cover-element',
      target: { selector: '#reports', text: 'Reports' },
      allowDismiss: false,
      zIndex: 7,
      maxContentWidth: 400,
      outerMargin: { top: 1, right: 2, bottom: 3, left: 4 },
    });
  });

  it('embed shell rejects unknown keys and a placement outside the enum (E1017 with paths)', () => {
    const fail = (body: unknown) => {
      try {
        compileVersionData('embed', body, undefined, ids);
      } catch (e) {
        return String(e);
      }
      throw new Error('expected throw');
    };
    expect(fail({ placement: 'top-of-page' })).toMatch(/placement/);
    expect(fail({ containerTarget: { selector: '#x' } })).toMatch(/containerTarget/);
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
