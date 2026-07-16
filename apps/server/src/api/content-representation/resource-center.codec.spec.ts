import { compileResourceCenter } from './resource-center.compile';
import { decompileResourceCenter } from './resource-center.decompile';

const ids = { attributeId: (c: string) => c, eventId: (c: string) => c } as never;
const idR = { attributeCode: (i: string) => i, eventCode: (i: string) => i } as never;

const tabs = (blocks: unknown[]) => ({ tabs: [{ name: 'Tab', blocks }] });

// Domain errors (BaseError) keep Error.message EMPTY — the text lives in
// messageDict — so `toThrow(/pattern/)` can't match; read getMessage instead.
const thrownMessage = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as { getMessage: (locale: string) => string }).getMessage('en');
  }
  return '';
};

describe('resource-center block codec: announcement + unknown-block honesty', () => {
  it('announcement block round-trips (name, icon, single instance)', () => {
    const rep = {
      tabs: [
        {
          name: 'News',
          blocks: [
            {
              type: 'announcement',
              name: "What's new",
              icon: { source: 'builtin', type: 'notification-line' },
            },
          ],
        },
      ],
    };
    const internal: any = compileResourceCenter(rep as never, undefined, ids);
    const block = internal.tabs[0].blocks[0];
    expect(block.type).toBe('announcement');
    expect(block.iconSource).toBe('builtin');
    expect(block.iconType).toBe('notification-line');

    const back: any = decompileResourceCenter(internal, idR);
    expect(back.tabs[0].blocks[0]).toMatchObject({
      type: 'announcement',
      name: "What's new",
      icon: { source: 'builtin', type: 'notification-line' },
    });
  });

  it('rejects a second announcement block — even across tabs', () => {
    const rep = {
      tabs: [
        { name: 'A', blocks: [{ type: 'announcement', name: 'News' }] },
        { name: 'B', blocks: [{ type: 'announcement', name: 'More news' }] },
      ],
    };
    expect(thrownMessage(() => compileResourceCenter(rep as never, undefined, ids))).toMatch(
      /ONE announcement block/,
    );
  });

  it('an UNKNOWN stored block type decompiles as `unsupported`, never as an editable impostor', () => {
    // The old default arm mislabeled anything unrecognized as live-chat; a
    // read-modify-write of the (full-replacement) block list then destroyed the
    // original. The honest marker is what prevents that.
    const internal = {
      tabs: [
        {
          name: 'Tab',
          blocks: [{ id: 'b1', type: 'hologram', someFutureField: 42 }],
        },
      ],
    };
    const back: any = decompileResourceCenter(internal, idR);
    const block = back.tabs[0].blocks[0];
    expect(block.type).toBe('unsupported');
    expect(block.id).toBe('b1');
    expect(block.note).toContain('"hologram"');
  });

  it('echoing an `unsupported` block back (with its id) preserves the stored block verbatim', () => {
    const stored = {
      tabs: [
        {
          id: 't1',
          name: 'Tab',
          blocks: [{ id: 'b1', type: 'hologram', someFutureField: 42, onlyShowBlock: false }],
        },
      ],
    };
    const echoed = {
      tabs: [
        {
          id: 't1',
          name: 'Tab',
          blocks: [{ id: 'b1', type: 'unsupported', note: 'whatever the read-back said' }],
        },
      ],
    };
    const internal: any = compileResourceCenter(echoed as never, stored, ids);
    expect(internal.tabs[0].blocks[0]).toEqual(stored.tabs[0].blocks[0]);
  });

  it('AUTHORING a new `unsupported` block (no stored original) is rejected', () => {
    expect(
      thrownMessage(() =>
        compileResourceCenter(
          tabs([{ type: 'unsupported', note: 'invented' }]) as never,
          undefined,
          ids,
        ),
      ),
    ).toMatch(/echo-only/);
  });
});
