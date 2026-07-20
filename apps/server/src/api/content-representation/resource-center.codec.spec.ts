import { compileResourceCenter } from './resource-center.compile';
import { representationResourceCenter } from './resource-center.schema';
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

describe('action-block clickActions echo pool (RC A+B defect D1)', () => {
  // The action-block compile path must pass the resolvers through — without
  // them the echoActions pool never reaches compileActions, and an RC whose
  // action block carries a builder-authored run_javascript could not have ANY
  // tab edited via the API (tabs are a full-list replacement; the required
  // echo of that block was always rejected).
  const jsRule = { id: 'x1', type: 'javascript-evaluate', data: { value: 'alert("rc")' } };
  const poolIds = { ...(ids as object), echoActions: [jsRule] } as never;

  it('run_javascript echoed with the stored script is preserved on an action block', () => {
    const rep = tabs([
      {
        type: 'action',
        name: 'Do it',
        clickActions: [{ type: 'run_javascript', script: 'alert("rc")' }],
      },
    ]);
    const internal: any = compileResourceCenter(rep as never, undefined, poolIds);
    expect(internal.tabs[0].blocks[0].clickedActions).toEqual([jsRule]);
  });

  it('fresh run_javascript on an action block is still rejected', () => {
    const rep = tabs([
      {
        type: 'action',
        name: 'Do it',
        clickActions: [{ type: 'run_javascript', script: 'evil()' }],
      },
    ]);
    expect(thrownMessage(() => compileResourceCenter(rep as never, undefined, poolIds))).toMatch(
      /blocked for security/i,
    );
  });
});

describe('RC A+B fixes: label, tab merge, customCode gate, inherit placement', () => {
  it('content-list item label round-trips and survives an echo (was: silently shredded)', () => {
    const rep = tabs([
      {
        type: 'content-list',
        name: 'Guides',
        items: [{ content: 'c1', contentType: 'flow', label: 'Builder label' }],
      },
    ]);
    const internal: any = compileResourceCenter(rep as never, undefined, ids);
    expect(internal.tabs[0].blocks[0].contentItems[0].label).toBe('Builder label');
    const back: any = decompileResourceCenter(internal, idR);
    expect(back.tabs[0].blocks[0].items[0].label).toBe('Builder label');
    // echo the read-back through compile again — label still there
    const echoed: any = compileResourceCenter(back, internal, ids);
    expect(echoed.tabs[0].blocks[0].contentItems[0].label).toBe('Builder label');
  });

  it('an echoed tab id carries stored builder-only fields and the icon forward', () => {
    const existing = {
      tabs: [
        {
          id: 'tab1',
          name: 'Home',
          iconSource: 'builtin',
          iconType: 'home-line',
          builderTabFlag: true,
          blocks: [],
        },
      ],
    };
    const rep = { tabs: [{ id: 'tab1', name: 'Home renamed', blocks: [] }] };
    const internal: any = compileResourceCenter(rep as never, existing, ids);
    const tab = internal.tabs[0];
    expect(tab.name).toBe('Home renamed');
    expect(tab.builderTabFlag).toBe(true); // prev-spread keeps unknown stored fields
    expect(tab.iconSource).toBe('builtin'); // omitted icon no longer resets to none
    expect(tab.iconType).toBe('home-line');
  });

  it('live-chat customCode: fresh write rejected; echo of stored code kept; omit keeps', () => {
    const fresh = tabs([
      { type: 'live-chat', name: 'Chat', provider: 'custom', customCode: 'evil()' },
    ]);
    expect(thrownMessage(() => compileResourceCenter(fresh as never, undefined, ids))).toMatch(
      /blocked for security/i,
    );

    const existing = {
      tabs: [
        {
          id: 'tabX',
          name: 'Tab',
          blocks: [
            {
              id: 'lc1',
              type: 'live-chat',
              name: [{ type: 'paragraph', children: [{ text: 'Chat' }] }],
              liveChatProvider: 'custom',
              customLiveChatCode: 'openChat()',
            },
          ],
        },
      ],
    };
    const echo = {
      tabs: [
        {
          id: 'tabX',
          name: 'Tab',
          blocks: [
            {
              id: 'lc1',
              type: 'live-chat',
              name: 'Chat',
              provider: 'custom',
              customCode: 'openChat()',
            },
          ],
        },
      ],
    };
    const kept: any = compileResourceCenter(echo as never, existing, ids);
    expect(kept.tabs[0].blocks[0].customLiveChatCode).toBe('openChat()');

    const omit = {
      tabs: [
        {
          id: 'tabX',
          name: 'Tab',
          blocks: [{ id: 'lc1', type: 'live-chat', name: 'Chat', provider: 'custom' }],
        },
      ],
    };
    const keptToo: any = compileResourceCenter(omit as never, existing, ids);
    expect(keptToo.tabs[0].blocks[0].customLiveChatCode).toBe('openChat()');

    const edited = {
      tabs: [
        {
          id: 'tabX',
          name: 'Tab',
          blocks: [
            {
              id: 'lc1',
              type: 'live-chat',
              name: 'Chat',
              provider: 'custom',
              customCode: 'evil()',
            },
          ],
        },
      ],
    };
    expect(thrownMessage(() => compileResourceCenter(edited as never, existing, ids))).toMatch(
      /blocked for security/i,
    );
  });

  it("icon source 'inherit' is schema-legal on content-list items only", () => {
    const itemLevel = representationResourceCenter.safeParse({
      tabs: [
        {
          name: 'T',
          blocks: [
            {
              type: 'content-list',
              name: 'Guides',
              items: [{ content: 'c1', contentType: 'flow', icon: { source: 'inherit' } }],
            },
          ],
        },
      ],
    });
    expect(itemLevel.success).toBe(true);

    const tabLevel = representationResourceCenter.safeParse({
      tabs: [{ name: 'T', icon: { source: 'inherit' }, blocks: [] }],
    });
    expect(tabLevel.success).toBe(false);

    const blockLevel = representationResourceCenter.safeParse({
      tabs: [
        {
          name: 'T',
          blocks: [{ type: 'action', name: 'Go', icon: { source: 'inherit' }, clickActions: [] }],
        },
      ],
    });
    expect(blockLevel.success).toBe(false);
  });
});
