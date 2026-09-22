import type {
  AnnouncementData,
  ChecklistData,
  ContentEditorButtonElement,
  ContentEditorElement,
  ContentEditorEmebedElement,
  ContentEditorImageElement,
  ContentEditorMultipleChoiceElement,
  ContentEditorNPSElement,
  ContentEditorRoot,
  ContentEditorTextElement,
  ContentListItem,
  LauncherData,
  LocalizedFlowContent,
  ResourceCenterData,
  RulesCondition,
} from '@usertour/types';
import {
  AnnouncementDistribution,
  ChecklistCompletionOrder,
  ChecklistInitialDisplay,
  ContentActionsItemType,
  ContentDataType,
  ContentEditorElementType,
  LauncherActionType,
  LauncherIconSource,
  LauncherTriggerElement,
  LauncherTriggerEvent,
  ResourceCenterBlockType,
} from '@usertour/types';

import {
  applyContentsTranslationUnits,
  isHttpUrl,
  isTranslationUnitOptional,
  applyVersionDataTranslationUnits,
  blankLocalizedUnitClones,
  collectContentsDestinations,
  contentListDestination,
  isSafeDestinationUrl,
  isTranslatableText,
  linkDestination,
  LOCALIZED_UNITS_SCHEMA_VERSION,
  navigateDestination,
  readDestination,
  writeDestination,
  buildLocalizedFlowBackup,
  buildLocalizedFlowSavePayload,
  buildLocalizedVersionDataBackup,
  buildLocalizedVersionDataSavePayload,
  collectOutdatedUnitPaths,
  collectOutdatedVersionDataPaths,
  countMissingTranslations,
  countMissingVersionDataTranslations,
  createLocalizedWorkingContents,
  createLocalizedWorkingVersionData,
  extractContentsTranslationUnits,
  extractTranslatableUnits,
  extractVersionDataTranslationUnits,
  formatElementPath,
  matchTranslationByLocale,
  mergeLocalizedEditorContents,
  remapContentsTranslationIdentifiers,
  remapFlowTranslationIdentifiers,
  remapVersionDataTranslationIdentifiers,
  resolveUserLocaleCode,
  mergeLocalizedVersionData,
} from '../localization';
import { deepClone } from '../utils';

// Test-local link accessors over the destination store (the link's `data`
// template mirrored into `url`).
const getLocalizableLinkUrl = (node: unknown): string | undefined => {
  return node && typeof node === 'object' ? readDestination(linkDestination(node)) : undefined;
};
const assignLocalizedLinkUrl = (node: unknown, value: string): void => {
  writeDestination(linkDestination(node as object), value);
};

const wrapElements = (elements: ContentEditorElement[]): ContentEditorRoot[] => {
  return [
    {
      element: { type: ContentEditorElementType.GROUP },
      children: [
        {
          element: { type: ContentEditorElementType.COLUMN },
          children: elements.map((element) => ({ element, children: null })),
        },
      ],
    },
  ];
};

const createTextElement = (): ContentEditorTextElement => {
  return {
    type: ContentEditorElementType.TEXT,
    data: [
      {
        type: 'paragraph',
        children: [{ text: 'Hello ' }, { text: 'world', bold: true }],
      },
    ],
  };
};

const createButtonElement = (): ContentEditorButtonElement => {
  return {
    type: ContentEditorElementType.BUTTON,
    data: {
      text: 'Next',
      actions: [{ id: 'action-1' } as any],
    },
  };
};

const createNpsElement = (): ContentEditorNPSElement => {
  return {
    type: ContentEditorElementType.NPS,
    data: {
      cvid: 'question-1',
      name: 'How likely are you to recommend us?',
      lowLabel: 'Not likely',
      highLabel: 'Very likely',
    },
  };
};

const createChoiceElement = (): ContentEditorMultipleChoiceElement => {
  return {
    type: ContentEditorElementType.MULTIPLE_CHOICE,
    data: {
      cvid: 'question-2',
      name: 'Pick a color',
      options: [
        { label: 'Red', value: 'red', checked: false },
        { label: 'Blue', value: 'blue', checked: false },
      ],
      shuffleOptions: false,
      enableOther: false,
      allowMultiple: false,
    },
  };
};

const createImageElement = (): ContentEditorImageElement => {
  return {
    type: ContentEditorElementType.IMAGE,
    url: 'https://example.com/en.png',
  };
};

const createEmbedElement = (): ContentEditorEmebedElement => {
  return {
    type: ContentEditorElementType.EMBED,
    url: 'https://example.com/watch?v=en',
    parsedUrl: 'https://example.com/embed/en',
  };
};

const createSourceContents = (): ContentEditorRoot[] => {
  return wrapElements([
    createTextElement(),
    createButtonElement(),
    createNpsElement(),
    createChoiceElement(),
    createImageElement(),
    createEmbedElement(),
  ]);
};

const getElement = <T extends ContentEditorElement>(
  contents: ContentEditorRoot[],
  elementIndex: number,
): T => {
  return contents[0].children[0].children[elementIndex].element as T;
};

describe('extractTranslatableUnits', () => {
  it('collects every non-empty translatable text with its kind', () => {
    const units = extractTranslatableUnits(createSourceContents());
    const byPath = new Map(units.map((unit) => [unit.path, unit]));

    expect(byPath.get('0.0.0:text.0.0')?.text).toBe('Hello ');
    expect(byPath.get('0.0.0:text.0.1')?.text).toBe('world');
    expect(byPath.get('0.0.1:button.text')?.text).toBe('Next');
    expect(byPath.get('0.0.2:question.name')?.text).toBe('How likely are you to recommend us?');
    expect(byPath.get('0.0.2:question.lowLabel')?.text).toBe('Not likely');
    expect(byPath.get('0.0.3:question.options.1.label')?.text).toBe('Blue');
    expect(byPath.get('0.0.1:button.text')?.kind).toBe('text');
    expect(byPath.get('0.0.4:image.url')?.kind).toBe('media');
    expect(byPath.get('0.0.5:embed.url')?.kind).toBe('media');
    // Empty source fields (e.g. unset otherPlaceholder) never become units.
    expect(byPath.has('0.0.3:question.otherPlaceholder')).toBe(false);
  });
});

describe('createLocalizedWorkingContents', () => {
  it('blanks untranslated fields and keeps existing translations', () => {
    const source = createSourceContents();
    const working = createLocalizedWorkingContents(source, undefined);

    expect(getElement<ContentEditorTextElement>(working, 0).data[0].children[0].text).toBe('');
    expect(getElement<ContentEditorButtonElement>(working, 1).data.text).toBe('');

    getElement<ContentEditorButtonElement>(working, 1).data.text = 'Suivant';
    const rehydrated = createLocalizedWorkingContents(source, working);
    expect(getElement<ContentEditorButtonElement>(rehydrated, 1).data.text).toBe('Suivant');
    expect(getElement<ContentEditorNPSElement>(rehydrated, 2).data.name).toBe('');
  });

  it('preserves non-text properties from the source', () => {
    const source = createSourceContents();
    const working = createLocalizedWorkingContents(source, undefined);

    expect(getElement<ContentEditorButtonElement>(working, 1).data.actions).toEqual([
      { id: 'action-1' },
    ]);
    expect(getElement<ContentEditorNPSElement>(working, 2).data.cvid).toBe('question-1');
  });
});

describe('mergeLocalizedEditorContents', () => {
  it('donates translated text and falls back to source for untranslated fields', () => {
    const source = createSourceContents();
    const localized = createLocalizedWorkingContents(source, undefined);
    getElement<ContentEditorButtonElement>(localized, 1).data.text = 'Suivant';
    getElement<ContentEditorTextElement>(localized, 0).data[0].children[1].text = 'monde';

    const merged = mergeLocalizedEditorContents(source, localized);

    expect(getElement<ContentEditorButtonElement>(merged, 1).data.text).toBe('Suivant');
    const mergedText = getElement<ContentEditorTextElement>(merged, 0);
    expect(mergedText.data[0].children[0].text).toBe('Hello ');
    expect(mergedText.data[0].children[1].text).toBe('monde');
    expect(mergedText.data[0].children[1].bold).toBe(true);
    expect(getElement<ContentEditorNPSElement>(merged, 2).data.name).toBe(
      'How likely are you to recommend us?',
    );
  });

  it('takes structure and behavior from the source even when the translation drifted', () => {
    const source = createSourceContents();
    const localized = createLocalizedWorkingContents(source, undefined);
    const localizedButton = getElement<ContentEditorButtonElement>(localized, 1);
    localizedButton.data.text = 'Suivant';
    localizedButton.data.actions = [{ id: 'stale-action' } as any];

    const merged = mergeLocalizedEditorContents(source, localized);
    const mergedButton = getElement<ContentEditorButtonElement>(merged, 1);
    expect(mergedButton.data.text).toBe('Suivant');
    expect(mergedButton.data.actions).toEqual([{ id: 'action-1' }]);
  });

  it('ignores the whole translation when group arity no longer matches', () => {
    const source = createSourceContents();
    const localized = createLocalizedWorkingContents(source, undefined);
    getElement<ContentEditorButtonElement>(localized, 1).data.text = 'Suivant';
    localized.push(deepClone(localized[0]));

    const merged = mergeLocalizedEditorContents(source, localized);
    expect(getElement<ContentEditorButtonElement>(merged, 1).data.text).toBe('Next');
  });

  it('ignores a question translation whose cvid changed', () => {
    const source = createSourceContents();
    const localized = createLocalizedWorkingContents(source, undefined);
    const localizedNps = getElement<ContentEditorNPSElement>(localized, 2);
    localizedNps.data.name = 'Nous recommanderiez-vous ?';
    localizedNps.data.cvid = 'question-replaced';

    const merged = mergeLocalizedEditorContents(source, localized);
    expect(getElement<ContentEditorNPSElement>(merged, 2).data.name).toBe(
      'How likely are you to recommend us?',
    );
  });

  it('falls back per paragraph when slate leaf arity drifted', () => {
    const source = createSourceContents();
    const localized = createLocalizedWorkingContents(source, undefined);
    const localizedText = getElement<ContentEditorTextElement>(localized, 0);
    localizedText.data[0].children = [{ text: 'Bonjour le monde' }];

    const merged = mergeLocalizedEditorContents(source, localized);
    const mergedText = getElement<ContentEditorTextElement>(merged, 0);
    expect(mergedText.data[0].children[0].text).toBe('Hello ');
    expect(mergedText.data[0].children[1].text).toBe('world');
  });

  it('carries embed companions along with a donated embed url', () => {
    const source = createSourceContents();
    const localized = createLocalizedWorkingContents(source, undefined);
    const localizedEmbed = getElement<ContentEditorEmebedElement>(localized, 5);
    localizedEmbed.url = 'https://example.com/watch?v=fr';
    localizedEmbed.parsedUrl = 'https://example.com/embed/fr';

    const merged = mergeLocalizedEditorContents(source, localized);
    const mergedEmbed = getElement<ContentEditorEmebedElement>(merged, 5);
    expect(mergedEmbed.url).toBe('https://example.com/watch?v=fr');
    expect(mergedEmbed.parsedUrl).toBe('https://example.com/embed/fr');

    const untouched = mergeLocalizedEditorContents(
      source,
      createLocalizedWorkingContents(source, undefined),
    );
    expect(getElement<ContentEditorEmebedElement>(untouched, 5).parsedUrl).toBe(
      'https://example.com/embed/en',
    );
  });
});

describe('countMissingTranslations', () => {
  it('counts required units without a translation and ignores optional urls', () => {
    const source = createSourceContents();
    // Required units: 2 slate leaves + button text + nps (name/low/high) + choice (name + 2 labels) = 9.
    expect(countMissingTranslations(source, undefined)).toBe(9);

    const localized = createLocalizedWorkingContents(source, undefined);
    getElement<ContentEditorButtonElement>(localized, 1).data.text = 'Suivant';
    expect(countMissingTranslations(source, localized)).toBe(8);
  });
});

describe('collectOutdatedUnitPaths', () => {
  it('flags drifted units only when they hold a translation', () => {
    const source = createSourceContents();
    const backup = deepClone(source);
    const localized = createLocalizedWorkingContents(source, undefined);
    getElement<ContentEditorButtonElement>(localized, 1).data.text = 'Suivant';
    expect(collectOutdatedUnitPaths(source, backup, localized).size).toBe(0);

    getElement<ContentEditorButtonElement>(source, 1).data.text = 'Continue';
    const outdated = collectOutdatedUnitPaths(source, backup, localized);
    expect(outdated).toEqual(new Set([`${formatElementPath(0, 0, 1)}:button.text`]));
  });

  it('never flags untranslated units — drift warnings are for existing translations', () => {
    const source = createSourceContents();
    const backup = deepClone(source);
    // The whole tree drifted relative to backup, but nothing is translated:
    // every field stays plain "missing", not outdated.
    getElement<ContentEditorButtonElement>(source, 1).data.text = 'Continue';
    expect(collectOutdatedUnitPaths(source, backup, undefined).size).toBe(0);
    expect(
      collectOutdatedUnitPaths(source, backup, createLocalizedWorkingContents(source, undefined))
        .size,
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Inline link destinations — the url travels as a `destination` unit:
// swappable per locale, untranslated keeps the source url.
// ---------------------------------------------------------------------------

const createLinkTextElement = (): ContentEditorTextElement => {
  return {
    type: ContentEditorElementType.TEXT,
    data: [
      {
        type: 'paragraph',
        children: [
          { text: 'See ' },
          {
            type: 'link',
            url: 'https://example.com/en/post',
            openType: 'new',
            children: [{ text: 'the forum post' }],
          },
          { text: '.' },
        ],
      },
    ],
  };
};

describe('link url localization', () => {
  it('extracts the link url as a destination unit alongside its anchor text', () => {
    const units = extractTranslatableUnits(wrapElements([createLinkTextElement()]));
    const byPath = new Map(units.map((unit) => [unit.path, unit]));
    expect(byPath.get('0.0.0:text.0.1.0')?.text).toBe('the forum post');
    expect(byPath.get('0.0.0:text.0.1:link.url')).toMatchObject({
      text: 'https://example.com/en/post',
      kind: 'destination',
    });
  });

  it('donates a translated url into both stores and keeps behavior from the source', () => {
    const source = wrapElements([createLinkTextElement()]);
    const localized = createLocalizedWorkingContents(source, undefined);
    const localizedLink = getElement<ContentEditorTextElement>(localized, 0).data[0].children[1];
    // Untranslated working copies blank the url like any other unit.
    expect(getLocalizableLinkUrl(localizedLink)).toBe('');
    assignLocalizedLinkUrl(localizedLink, 'https://example.com/cs/post');
    localizedLink.children[0].text = 'příspěvek na fóru';

    const merged = mergeLocalizedEditorContents(source, localized);
    const mergedLink = getElement<ContentEditorTextElement>(merged, 0).data[0].children[1];
    // Both destination stores swap: the raw url and the `data` template the
    // delivery pass (replaceUserAttr) recomputes the url from.
    expect(mergedLink.url).toBe('https://example.com/cs/post');
    expect(mergedLink.data).toEqual([
      { type: 'paragraph', children: [{ text: 'https://example.com/cs/post' }] },
    ]);
    expect(mergedLink.children[0].text).toBe('příspěvek na fóru');
    expect(mergedLink.openType).toBe('new');
  });

  it('reads the destination from the data template when the url field is empty', () => {
    // Builder link-panel shape: the destination lives in `data`, url is ''.
    const element = createLinkTextElement();
    const link = (element.data[0] as { children: any[] }).children[1];
    link.url = '';
    link.data = [{ type: 'paragraph', children: [{ text: 'https://example.com/en/post' }] }];
    const source = wrapElements([element]);

    const units = extractTranslatableUnits(source);
    expect(units.find((unit) => unit.path === '0.0.0:text.0.1:link.url')?.text).toBe(
      'https://example.com/en/post',
    );

    const localized = createLocalizedWorkingContents(source, undefined);
    const localizedLink = getElement<ContentEditorTextElement>(localized, 0).data[0].children[1];
    assignLocalizedLinkUrl(localizedLink, 'https://example.com/cs/post');
    const merged = mergeLocalizedEditorContents(source, localized);
    const mergedLink = getElement<ContentEditorTextElement>(merged, 0).data[0].children[1];
    expect(mergedLink.url).toBe('https://example.com/cs/post');
    expect(mergedLink.data).toEqual([
      { type: 'paragraph', children: [{ text: 'https://example.com/cs/post' }] },
    ]);
  });

  it('emits no unit for a dynamic destination (user-attribute chip in the template)', () => {
    const element = createLinkTextElement();
    const link = (element.data[0] as { children: any[] }).children[1];
    link.data = [
      {
        type: 'paragraph',
        children: [
          { text: 'https://example.com/user/' },
          { type: 'user-attribute', attrCode: 'user_id', fallback: '', children: [{ text: '' }] },
        ],
      },
    ];
    const source = wrapElements([element]);

    const units = extractTranslatableUnits(source);
    expect(units.some((unit) => unit.path === '0.0.0:text.0.1:link.url')).toBe(false);

    // The working copy leaves the dynamic link untouched — it stays source-managed.
    const working = createLocalizedWorkingContents(source, undefined);
    const workingLink = getElement<ContentEditorTextElement>(working, 0).data[0].children[1];
    expect(workingLink.data).toEqual(link.data);
    expect(workingLink.url).toBe('https://example.com/en/post');
  });

  it('falls back to the source url when the link is untranslated', () => {
    const source = wrapElements([createLinkTextElement()]);
    const merged = mergeLocalizedEditorContents(
      source,
      createLocalizedWorkingContents(source, undefined),
    );
    expect(getElement<ContentEditorTextElement>(merged, 0).data[0].children[1].url).toBe(
      'https://example.com/en/post',
    );
  });

  it('never counts the url as missing but does flag drift on a swapped url', () => {
    const source = wrapElements([createLinkTextElement()]);
    // Required: the two plain leaves + the anchor leaf = 3; the url is optional.
    expect(countMissingTranslations(source, undefined)).toBe(3);

    const backup = deepClone(source);
    const localized = createLocalizedWorkingContents(source, undefined);
    assignLocalizedLinkUrl(
      getElement<ContentEditorTextElement>(localized, 0).data[0].children[1],
      'https://example.com/cs/post',
    );
    getElement<ContentEditorTextElement>(source, 0).data[0].children[1].url =
      'https://example.com/en/post-v2';
    expect(collectOutdatedUnitPaths(source, backup, localized)).toEqual(
      new Set(['0.0.0:text.0.1:link.url']),
    );
  });

  it('keeps a stored url identical to the source as a deliberate pin (survives reload and source drift)', () => {
    const source = wrapElements([createLinkTextElement()]);
    const localized = createLocalizedWorkingContents(source, undefined);
    assignLocalizedLinkUrl(
      getElement<ContentEditorTextElement>(localized, 0).data[0].children[1],
      'https://example.com/en/post',
    );

    // Reload: the working copy keeps the pin instead of blanking it.
    const working = createLocalizedWorkingContents(source, localized);
    expect(
      getLocalizableLinkUrl(getElement<ContentEditorTextElement>(working, 0).data[0].children[1]),
    ).toBe('https://example.com/en/post');

    // The source moves on; the pinned locale stays where it was pinned.
    getElement<ContentEditorTextElement>(source, 0).data[0].children[1].url =
      'https://example.com/en/post-v2';
    const merged = mergeLocalizedEditorContents(source, localized);
    expect(getElement<ContentEditorTextElement>(merged, 0).data[0].children[1].url).toBe(
      'https://example.com/en/post',
    );
  });

  it('keeps a media url pinned to the source value as an override', () => {
    const source = wrapElements([createImageElement()]);
    const localized = createLocalizedWorkingContents(source, undefined);
    // Deliberate pin: the translator enters the source's exact url so this
    // locale keeps today's image when the source later swaps.
    getElement<ContentEditorImageElement>(localized, 0).url = 'https://example.com/en.png';

    const working = createLocalizedWorkingContents(source, localized);
    expect(getElement<ContentEditorImageElement>(working, 0).url).toBe(
      'https://example.com/en.png',
    );

    getElement<ContentEditorImageElement>(source, 0).url = 'https://example.com/en-v2.png';
    const merged = mergeLocalizedEditorContents(source, localized);
    expect(getElement<ContentEditorImageElement>(merged, 0).url).toBe('https://example.com/en.png');
  });

  it('deploy backfill blanks legacy clone destinations so an edited source url never resurrects', () => {
    const source = wrapElements([createLinkTextElement()]);
    // A row saved before link units existed: a structural clone whose link
    // node still carries the source destination verbatim.
    const legacy = deepClone(source);
    const legacyText = getElement<ContentEditorTextElement>(legacy, 0);
    legacyText.data[0].children[0].text = '';
    legacyText.data[0].children[1].children[0].text = 'příspěvek na fóru';
    legacyText.data[0].children[2].text = '';

    expect(blankLocalizedUnitClones(legacy, 0)).toBe(true);
    // Idempotent: a second pass finds nothing left to blank.
    expect(blankLocalizedUnitClones(legacy, 0)).toBe(false);

    const blankedLink = getElement<ContentEditorTextElement>(legacy, 0).data[0].children[1];
    expect(getLocalizableLinkUrl(blankedLink)).toBe('');

    // The author retires the old destination — the locale follows the source
    // instead of resurrecting the clone, and the anchor translation delivers.
    getElement<ContentEditorTextElement>(source, 0).data[0].children[1].url =
      'https://example.com/en/post-v2';
    const merged = mergeLocalizedEditorContents(source, legacy);
    const mergedLink = getElement<ContentEditorTextElement>(merged, 0).data[0].children[1];
    expect(mergedLink.url).toBe('https://example.com/en/post-v2');
    expect(mergedLink.children[0].text).toBe('příspěvek na fóru');
  });

  it('deploy backfill blanks legacy image click-through links too', () => {
    const image = createImageElement();
    image.link = { url: 'https://example.com/en/pricing' };
    const legacy = wrapElements([image]);
    expect(blankLocalizedUnitClones(legacy, 0)).toBe(true);
    expect(getLocalizableLinkUrl(getElement<ContentEditorImageElement>(legacy, 0).link)).toBe('');
    expect(blankLocalizedUnitClones(legacy, 0)).toBe(false);
  });

  it('round-trips the url through the translation exchange', () => {
    const source = wrapElements([createLinkTextElement()]);
    const units = extractContentsTranslationUnits(source, undefined);
    expect(units.find((unit) => unit.path === '0.0.0:text.0.1:link.url')).toMatchObject({
      sourceText: 'https://example.com/en/post',
      translatedText: '',
      kind: 'destination',
    });

    const applied = applyContentsTranslationUnits(
      source,
      undefined,
      new Map([['0.0.0:text.0.1:link.url', 'https://example.com/cs/post']]),
    );
    expect(getElement<ContentEditorTextElement>(applied, 0).data[0].children[1].url).toBe(
      'https://example.com/cs/post',
    );
  });

  it('trims assigned destinations; a whitespace-only value collapses to the keep-original sentinel', () => {
    const link: Record<string, unknown> = { type: 'link', children: [{ text: 'go' }] };
    assignLocalizedLinkUrl(link, '  https://example.com/cs/post ');
    expect(link.url).toBe('https://example.com/cs/post');
    assignLocalizedLinkUrl(link, '   ');
    expect(link.url).toBe('');
    expect(getLocalizableLinkUrl(link)).toBe('');
  });

  it('preserves a stored translation when the source link goes dynamic, and revives it after', () => {
    const source = wrapElements([createLinkTextElement()]);
    const stored = createLocalizedWorkingContents(source, undefined);
    assignLocalizedLinkUrl(
      getElement<ContentEditorTextElement>(stored, 0).data[0].children[1],
      'https://example.com/cs/post',
    );

    // The author adds a user-attribute chip to the destination.
    const chipTemplate = [
      {
        type: 'paragraph',
        children: [
          { text: 'https://example.com/user/' },
          { type: 'user-attribute', attrCode: 'user_id', fallback: '', children: [{ text: '' }] },
        ],
      },
    ];
    getElement<ContentEditorTextElement>(source, 0).data[0].children[1].data = chipTemplate;

    // The working copy carries the stored destination even though no unit is
    // readable, so an unrelated save cannot erase it.
    const working = createLocalizedWorkingContents(source, stored);
    const workingLink = getElement<ContentEditorTextElement>(working, 0).data[0].children[1];
    expect(workingLink.url).toBe('https://example.com/cs/post');

    const payload = buildLocalizedFlowSavePayload({ 'step-1': working }, { 'step-1': stored });
    const savedLink = getElement<ContentEditorTextElement>(payload['step-1'], 0).data[0]
      .children[1];
    expect(savedLink.url).toBe('https://example.com/cs/post');

    // Dormant while dynamic: delivery keeps the source's chip template.
    const merged = mergeLocalizedEditorContents(source, payload['step-1']);
    expect(getElement<ContentEditorTextElement>(merged, 0).data[0].children[1].data).toEqual(
      chipTemplate,
    );

    // The author removes the chip — the stored translation delivers again.
    getElement<ContentEditorTextElement>(source, 0).data[0].children[1].data = [
      { type: 'paragraph', children: [{ text: 'https://example.com/en/post' }] },
    ];
    const revived = mergeLocalizedEditorContents(source, payload['step-1']);
    expect(getElement<ContentEditorTextElement>(revived, 0).data[0].children[1].url).toBe(
      'https://example.com/cs/post',
    );
  });

  it('parks a stored translation while the source destination is cleared — no ghost delivery, no loss', () => {
    const source = wrapElements([createLinkTextElement()]);
    const stored = createLocalizedWorkingContents(source, undefined);
    assignLocalizedLinkUrl(
      getElement<ContentEditorTextElement>(stored, 0).data[0].children[1],
      'https://example.com/cs/post',
    );

    // The author clears the destination in the link panel: the template
    // empties, the stale url field stays behind (the panel never writes url).
    const clearedTemplate = [{ type: 'paragraph', children: [{ text: '' }] }];
    getElement<ContentEditorTextElement>(source, 0).data[0].children[1].data = clearedTemplate;

    // No unit: the row disappears from the exchange instead of exporting a
    // value that no longer has a source counterpart.
    const units = extractContentsTranslationUnits(source, stored);
    expect(units.some((unit) => unit.path === '0.0.0:text.0.1:link.url')).toBe(false);

    // No ghost delivery: the merge keeps the cleared source template.
    const merged = mergeLocalizedEditorContents(source, stored);
    expect(getElement<ContentEditorTextElement>(merged, 0).data[0].children[1].data).toEqual(
      clearedTemplate,
    );

    // Preserved through a save, and delivering again once the source is restored.
    const working = createLocalizedWorkingContents(source, stored);
    const payload = buildLocalizedFlowSavePayload({ 'step-1': working }, { 'step-1': stored });
    getElement<ContentEditorTextElement>(source, 0).data[0].children[1].data = [
      { type: 'paragraph', children: [{ text: 'https://example.com/en/post' }] },
    ];
    const revived = mergeLocalizedEditorContents(source, payload['step-1']);
    expect(getElement<ContentEditorTextElement>(revived, 0).data[0].children[1].url).toBe(
      'https://example.com/cs/post',
    );
  });

  it('reads link templates with the delivery grammar (no divergence on non-canonical shapes)', () => {
    // A top-level text leaf is ignored by delivery (it only reads each top
    // node's immediate children) — localization must see the same nothing,
    // not a phantom destination.
    expect(
      getLocalizableLinkUrl({ type: 'link', url: 'STALE', data: [{ text: 'https://x.io' }] }),
    ).toBe('');
    // A chip nested deeper than delivery reads is ignored, not "dynamic".
    expect(
      getLocalizableLinkUrl({
        type: 'link',
        data: [{ children: [{ children: [{ type: 'user-attribute', attrCode: 'plan' }] }] }],
      }),
    ).toBe('');
    // A chip where delivery would substitute it makes the destination dynamic.
    expect(
      getLocalizableLinkUrl({
        type: 'link',
        data: [{ children: [{ type: 'user-attribute', attrCode: 'plan' }] }],
      }),
    ).toBeUndefined();
  });

  it('localizes the image click-through link like an inline link', () => {
    const image = createImageElement();
    image.link = { url: 'https://example.com/en/pricing' };
    const source = wrapElements([image]);

    const units = extractTranslatableUnits(source);
    expect(units.find((unit) => unit.path === '0.0.0:image.link.url')).toMatchObject({
      text: 'https://example.com/en/pricing',
      kind: 'destination',
    });

    const localized = createLocalizedWorkingContents(source, undefined);
    const localizedImage = getElement<ContentEditorImageElement>(localized, 0);
    expect(getLocalizableLinkUrl(localizedImage.link)).toBe('');
    assignLocalizedLinkUrl(localizedImage.link, 'https://example.com/fr/pricing');

    const merged = mergeLocalizedEditorContents(source, localized);
    const mergedLink = getElement<ContentEditorImageElement>(merged, 0).link;
    // Both stores swap — delivery recomputes the click-through url from `data`.
    expect(mergedLink?.url).toBe('https://example.com/fr/pricing');
    expect(mergedLink?.data).toEqual([
      { type: 'paragraph', children: [{ text: 'https://example.com/fr/pricing' }] },
    ]);
  });

  it('emits no image link unit for a dynamic click-through destination', () => {
    const image = createImageElement();
    image.link = {
      url: 'https://example.com/en/pricing',
      data: [{ children: [{ type: 'user-attribute', attrCode: 'plan' }] }],
    };
    const source = wrapElements([image]);
    const units = extractTranslatableUnits(source);
    expect(units.some((unit) => unit.path === '0.0.0:image.link.url')).toBe(false);
  });

  it('emits no link units inside resource-center block names (delivery never renders them)', () => {
    const data: ResourceCenterData = {
      tabs: [
        {
          id: 'tab-1',
          name: 'Help',
          blocks: [
            {
              id: 'block-1',
              type: ResourceCenterBlockType.ACTION,
              name: [
                {
                  type: 'paragraph',
                  children: [
                    { text: 'Read ' },
                    {
                      type: 'link',
                      url: 'https://example.com/en/post',
                      children: [{ text: 'this' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as unknown as ResourceCenterData;

    const units = extractVersionDataTranslationUnits(ContentDataType.RESOURCE_CENTER, data, null);
    expect(units.some((unit) => unit.path.includes(':link.url'))).toBe(false);
    // The name's text leaves still translate.
    expect(units.some((unit) => unit.path.startsWith('tabs.tab-1.blocks.block-1:name'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Version-data walkers (non-flow content types)
// ---------------------------------------------------------------------------

const createChecklistData = (): ChecklistData => {
  return {
    buttonText: 'Get Started',
    initialDisplay: ChecklistInitialDisplay.EXPANDED,
    completionOrder: ChecklistCompletionOrder.ANY,
    preventDismissChecklist: false,
    autoDismissChecklist: false,
    content: wrapElements([createButtonElement()]),
    items: [
      {
        id: 'item-1',
        name: 'Invite your team',
        description: 'Bring a teammate in',
        isCompleted: false,
        clickedActions: [],
        completeConditions: [],
        onlyShowTask: false,
        onlyShowTaskConditions: [],
      },
      {
        id: 'item-2',
        name: 'Create a flow',
        isCompleted: false,
        clickedActions: [],
        completeConditions: [],
        onlyShowTask: false,
        onlyShowTaskConditions: [],
      },
    ],
  };
};

describe('version-data localization (checklist)', () => {
  it('round-trips working copy and merge with id-keyed items', () => {
    const source = createChecklistData();
    const working = createLocalizedWorkingVersionData(ContentDataType.CHECKLIST, source, undefined);
    expect(working.buttonText).toBe('');
    expect(working.items[0].name).toBe('');

    working.buttonText = 'Commencer';
    working.items[0].name = 'Invitez votre équipe';

    const merged = mergeLocalizedVersionData(ContentDataType.CHECKLIST, source, working);
    expect(merged.buttonText).toBe('Commencer');
    expect(merged.items[0].name).toBe('Invitez votre équipe');
    // Untranslated fields fall back to source text.
    expect(merged.items[0].description).toBe('Bring a teammate in');
    expect(merged.items[1].name).toBe('Create a flow');
    // Behavior fields always come from the source.
    expect(merged.completionOrder).toBe(ChecklistCompletionOrder.ANY);
  });

  it('follows a reordered item by id instead of position', () => {
    const source = createChecklistData();
    const working = createLocalizedWorkingVersionData(ContentDataType.CHECKLIST, source, undefined);
    working.items[0].name = 'Invitez votre équipe';

    const reordered = deepClone(source);
    reordered.items.reverse();
    const merged = mergeLocalizedVersionData(ContentDataType.CHECKLIST, reordered, working);
    const invitedItem = merged.items.find((item) => item.id === 'item-1');
    expect(invitedItem?.name).toBe('Invitez votre équipe');
  });

  it('counts missing translations across plain fields and embedded trees', () => {
    const source = createChecklistData();
    // buttonText + embedded button text + item-1 name/description + item-2 name = 5.
    expect(countMissingVersionDataTranslations(ContentDataType.CHECKLIST, source, undefined)).toBe(
      5,
    );

    const working = createLocalizedWorkingVersionData(ContentDataType.CHECKLIST, source, undefined);
    working.buttonText = 'Commencer';
    expect(countMissingVersionDataTranslations(ContentDataType.CHECKLIST, source, working)).toBe(4);
  });

  it('flags outdated paths against the backup snapshot', () => {
    const source = createChecklistData();
    const backup = deepClone(source);
    const localized = createLocalizedWorkingVersionData(
      ContentDataType.CHECKLIST,
      source,
      undefined,
    );
    localized.items[1].name = 'Cree ton premier flow';
    expect(
      collectOutdatedVersionDataPaths(ContentDataType.CHECKLIST, source, backup, localized).size,
    ).toBe(0);

    source.items[1].name = 'Create your first flow';
    const outdated = collectOutdatedVersionDataPaths(
      ContentDataType.CHECKLIST,
      source,
      backup,
      localized,
    );
    expect(outdated).toEqual(new Set(['items.item-2:name']));
    // The drifted-but-untranslated item stays plain missing.
    expect(
      collectOutdatedVersionDataPaths(ContentDataType.CHECKLIST, source, backup, undefined).size,
    ).toBe(0);
  });
});

const createResourceCenterData = (): ResourceCenterData => {
  return {
    buttonText: 'Help',
    headerText: 'How can we help?',
    tabs: [
      {
        id: 'tab-1',
        name: 'Home',
        iconSource: LauncherIconSource.NONE,
        iconType: '',
        blocks: [
          {
            id: 'block-1',
            name: [{ text: 'Contact support' }],
            type: ResourceCenterBlockType.ACTION,
            iconSource: LauncherIconSource.NONE,
            iconType: '',
            clickedActions: [],
            onlyShowBlock: false,
            onlyShowBlockConditions: [],
          },
          {
            id: 'block-2',
            name: [{ text: 'Guides' }],
            type: ResourceCenterBlockType.SUB_PAGE,
            iconSource: LauncherIconSource.NONE,
            iconType: '',
            content: wrapElements([createTextElement()]),
            onlyShowBlock: false,
            onlyShowBlockConditions: [],
          },
        ],
      },
    ],
  };
};

describe('version-data localization (resource center)', () => {
  it('translates header, tab names, block labels and embedded content', () => {
    const source = createResourceCenterData();
    const working = createLocalizedWorkingVersionData(
      ContentDataType.RESOURCE_CENTER,
      source,
      undefined,
    );
    working.headerText = 'Comment pouvons-nous aider ?';
    working.tabs[0].name = 'Accueil';
    (working.tabs[0].blocks[0].name as Array<{ text: string }>)[0].text = 'Contacter le support';

    const merged = mergeLocalizedVersionData(ContentDataType.RESOURCE_CENTER, source, working);
    expect(merged.headerText).toBe('Comment pouvons-nous aider ?');
    expect(merged.buttonText).toBe('Help');
    expect(merged.tabs[0].name).toBe('Accueil');
    expect((merged.tabs[0].blocks[0].name as Array<{ text: string }>)[0].text).toBe(
      'Contacter le support',
    );
  });

  it('keeps a translated block matched by id when it moves to another tab', () => {
    const source = createResourceCenterData();
    const working = createLocalizedWorkingVersionData(
      ContentDataType.RESOURCE_CENTER,
      source,
      undefined,
    );
    (working.tabs[0].blocks[0].name as Array<{ text: string }>)[0].text = 'Contacter le support';

    const restructured = deepClone(source);
    const [actionBlock] = restructured.tabs[0].blocks.splice(0, 1);
    restructured.tabs.push({
      id: 'tab-2',
      name: 'More',
      iconSource: LauncherIconSource.NONE,
      iconType: '',
      blocks: [actionBlock],
    });

    const merged = mergeLocalizedVersionData(
      ContentDataType.RESOURCE_CENTER,
      restructured,
      working,
    );
    const movedBlock = merged.tabs[1].blocks[0];
    expect((movedBlock.name as Array<{ text: string }>)[0].text).toBe('Contacter le support');
  });
});

describe('version-data localization (announcement)', () => {
  it('translates title, read-more label and both content trees', () => {
    const source: AnnouncementData = {
      title: 'New dashboard',
      introContent: wrapElements([createButtonElement()]),
      enableReadMore: true,
      readMoreLabel: 'Read more',
      detailContent: wrapElements([createTextElement()]),
      distribution: AnnouncementDistribution.BADGE,
    };
    const working = createLocalizedWorkingVersionData(
      ContentDataType.ANNOUNCEMENT,
      source,
      undefined,
    );
    working.title = 'Nouveau tableau de bord';
    working.readMoreLabel = 'En savoir plus';

    const merged = mergeLocalizedVersionData(ContentDataType.ANNOUNCEMENT, source, working);
    expect(merged.title).toBe('Nouveau tableau de bord');
    expect(merged.readMoreLabel).toBe('En savoir plus');
    expect(merged.enableReadMore).toBe(true);
    expect(merged.distribution).toBe(AnnouncementDistribution.BADGE);
  });
});

describe('matchTranslationByLocale', () => {
  const translations = [
    { localization: { code: 'fr' } },
    { localization: { code: 'zh-CN' } },
    { localization: { code: 'de-DE' } },
  ];

  it('prefers an exact case-insensitive match', () => {
    expect(matchTranslationByLocale(translations, 'ZH-cn')?.localization.code).toBe('zh-CN');
  });

  it('falls back to the primary language subtag', () => {
    expect(matchTranslationByLocale(translations, 'fr-CA')?.localization.code).toBe('fr');
    expect(matchTranslationByLocale(translations, 'de')?.localization.code).toBe('de-DE');
  });

  it('returns undefined when nothing matches', () => {
    expect(matchTranslationByLocale(translations, 'ja')).toBeUndefined();
  });
});

describe('resolveUserLocaleCode', () => {
  it('returns the explicit locale_code attribute', () => {
    expect(resolveUserLocaleCode({ locale_code: 'fr' })).toBe('fr');
  });

  it('returns null when the attribute is absent or empty — the locale is never guessed', () => {
    expect(resolveUserLocaleCode({})).toBeNull();
    expect(resolveUserLocaleCode({ locale_code: '  ' })).toBeNull();
    expect(resolveUserLocaleCode(null)).toBeNull();
  });
});

describe('translation exchange (extract/apply units)', () => {
  it('round-trips editor-tree translations through flat units', () => {
    const source = createSourceContents();
    const units = extractContentsTranslationUnits(source, undefined);
    const buttonUnit = units.find((unit) => unit.path === '0.0.1:button.text');
    expect(buttonUnit).toMatchObject({ sourceText: 'Next', translatedText: '' });

    const applied = applyContentsTranslationUnits(
      source,
      undefined,
      new Map([
        ['0.0.1:button.text', 'Suivant'],
        ['0.0.0:text.0.1', 'monde'],
      ]),
    );
    expect(getElement<ContentEditorButtonElement>(applied, 1).data.text).toBe('Suivant');
    expect(getElement<ContentEditorTextElement>(applied, 0).data[0].children[1].text).toBe('monde');

    const reExported = extractContentsTranslationUnits(source, applied);
    expect(reExported.find((unit) => unit.path === '0.0.1:button.text')?.translatedText).toBe(
      'Suivant',
    );
  });

  it('keeps existing translations for unknown paths and empty cells', () => {
    const source = createSourceContents();
    const existing = applyContentsTranslationUnits(
      source,
      undefined,
      new Map([['0.0.1:button.text', 'Suivant']]),
    );

    const applied = applyContentsTranslationUnits(
      source,
      existing,
      new Map([
        ['0.0.1:button.text', '  '],
        ['9.9.9:button.text', 'stale'],
        ['0.0.2:question.name', 'Nous recommanderiez-vous ?'],
      ]),
    );
    expect(getElement<ContentEditorButtonElement>(applied, 1).data.text).toBe('Suivant');
    expect(getElement<ContentEditorNPSElement>(applied, 2).data.name).toBe(
      'Nous recommanderiez-vous ?',
    );
  });

  it('round-trips version-data translations through flat units', () => {
    const source = createChecklistData();
    const units = extractVersionDataTranslationUnits(ContentDataType.CHECKLIST, source, undefined);
    expect(units.find((unit) => unit.path === 'items.item-1:name')?.sourceText).toBe(
      'Invite your team',
    );

    const applied = applyVersionDataTranslationUnits(
      ContentDataType.CHECKLIST,
      source,
      undefined,
      new Map([
        ['buttonText', 'Commencer'],
        ['items.item-1:name', 'Invitez votre équipe'],
      ]),
    );
    expect(applied.buttonText).toBe('Commencer');
    expect(applied.items[0].name).toBe('Invitez votre équipe');
    // Untouched fields stay untranslated in the working clone.
    expect(applied.items[1].name).toBe('');
  });
});

// The editor's real save entry — the per-tree grafts are exercised through it.
const buildContentsSavePayload = (
  working: ContentEditorRoot[],
  stored: ContentEditorRoot[],
): ContentEditorRoot[] => {
  return buildLocalizedFlowSavePayload({ 'step-1': working }, { 'step-1': stored })['step-1'];
};

describe('save payloads (a session may only overwrite what it was able to read)', () => {
  it('keeps stored translations for a column the source outgrew, and revives them on revert', () => {
    const source = createSourceContents();
    const stored = createLocalizedWorkingContents(source, undefined);
    getElement<ContentEditorButtonElement>(stored, 1).data.text = 'Suivant';

    // The author adds one element to the column — the stored column no longer aligns.
    const grown = deepClone(source);
    grown[0].children[0].children.push({ element: createButtonElement(), children: null });
    const working = createLocalizedWorkingContents(grown, stored);
    expect(getElement<ContentEditorButtonElement>(working, 1).data.text).toBe('');

    // The untouched working copy must not erase the stored column on save.
    const payload = buildContentsSavePayload(working, stored);
    expect(payload[0].children[0].children).toHaveLength(6);
    expect(getElement<ContentEditorButtonElement>(payload, 1).data.text).toBe('Suivant');

    // Reverting the source realigns the preserved column through the normal merge.
    const merged = mergeLocalizedEditorContents(source, payload);
    expect(getElement<ContentEditorButtonElement>(merged, 1).data.text).toBe('Suivant');
  });

  it('hands the fragment over once the translator retranslates inside it', () => {
    const source = createSourceContents();
    const stored = createLocalizedWorkingContents(source, undefined);
    getElement<ContentEditorButtonElement>(stored, 1).data.text = 'Suivant';

    const grown = deepClone(source);
    grown[0].children[0].children.push({ element: createButtonElement(), children: null });
    const working = createLocalizedWorkingContents(grown, stored);
    getElement<ContentEditorButtonElement>(working, 1).data.text = 'Weiter';

    const payload = buildContentsSavePayload(working, stored);
    expect(payload[0].children[0].children).toHaveLength(7);
    expect(getElement<ContentEditorButtonElement>(payload, 1).data.text).toBe('Weiter');
  });

  it('does not resurrect a translation the translator cleared on an aligned field', () => {
    const source = createSourceContents();
    const stored = createLocalizedWorkingContents(source, undefined);
    getElement<ContentEditorButtonElement>(stored, 1).data.text = 'Suivant';

    const working = createLocalizedWorkingContents(source, stored);
    getElement<ContentEditorButtonElement>(working, 1).data.text = '';

    const payload = buildContentsSavePayload(working, stored);
    expect(getElement<ContentEditorButtonElement>(payload, 1).data.text).toBe('');
  });

  it('keeps map entries for steps the version no longer has', () => {
    const source = createSourceContents();
    const goneStep = createLocalizedWorkingContents(source, undefined);
    getElement<ContentEditorButtonElement>(goneStep, 1).data.text = 'Suivant';
    const stored: LocalizedFlowContent = { 'step-gone': goneStep };
    const working: LocalizedFlowContent = {
      'step-live': createLocalizedWorkingContents(source, undefined),
    };

    const payload = buildLocalizedFlowSavePayload(working, stored);
    expect(payload['step-gone']).toEqual(goneStep);
    expect(payload['step-live']).toBeDefined();
  });

  it('preserves choice option labels across option-arity drift', () => {
    const source = createSourceContents();
    const stored = createLocalizedWorkingContents(source, undefined);
    const storedChoice = getElement<ContentEditorMultipleChoiceElement>(stored, 3);
    storedChoice.data.options[0].label = 'Rouge';
    storedChoice.data.options[1].label = 'Bleu';

    const grown = deepClone(source);
    getElement<ContentEditorMultipleChoiceElement>(grown, 3).data.options.push({
      label: 'Green',
      value: 'green',
      checked: false,
    });
    const working = createLocalizedWorkingContents(grown, stored);
    const workingChoice = getElement<ContentEditorMultipleChoiceElement>(working, 3);
    expect(workingChoice.data.options.map((option) => option.label)).toEqual(['', '', '']);

    const payload = buildContentsSavePayload(working, stored);
    const payloadChoice = getElement<ContentEditorMultipleChoiceElement>(payload, 3);
    expect(payloadChoice.data.options.map((option) => option.label)).toEqual(['Rouge', 'Bleu']);

    const merged = mergeLocalizedEditorContents(source, payload);
    expect(getElement<ContentEditorMultipleChoiceElement>(merged, 3).data.options[0].label).toBe(
      'Rouge',
    );
  });

  it('preserves slate subtrees across node-arity drift', () => {
    const source = createSourceContents();
    const stored = createLocalizedWorkingContents(source, undefined);
    getElement<ContentEditorTextElement>(stored, 0).data[0].children[1].text = 'monde';

    const grown = deepClone(source);
    getElement<ContentEditorTextElement>(grown, 0).data[0].children.push({ text: '!' });
    const working = createLocalizedWorkingContents(grown, stored);
    expect(getElement<ContentEditorTextElement>(working, 0).data[0].children[1].text).toBe('');

    const payload = buildContentsSavePayload(working, stored);
    expect(getElement<ContentEditorTextElement>(payload, 0).data[0].children).toHaveLength(2);

    const merged = mergeLocalizedEditorContents(source, payload);
    expect(getElement<ContentEditorTextElement>(merged, 0).data[0].children[1].text).toBe('monde');
  });

  it('checklist: removed items survive the save and revive by id', () => {
    const source = createChecklistData();
    const stored = createLocalizedWorkingVersionData(ContentDataType.CHECKLIST, source, undefined);
    stored.items[0].name = 'Invitez votre équipe';

    const shrunk = deepClone(source);
    shrunk.items = shrunk.items.filter((item) => item.id !== 'item-1');
    const working = createLocalizedWorkingVersionData(ContentDataType.CHECKLIST, shrunk, stored);

    const payload = buildLocalizedVersionDataSavePayload(
      ContentDataType.CHECKLIST,
      working,
      stored,
    );
    expect(
      payload.items.some((item) => item.id === 'item-1' && item.name === 'Invitez votre équipe'),
    ).toBe(true);

    const merged = mergeLocalizedVersionData(ContentDataType.CHECKLIST, source, payload);
    expect(merged.items.find((item) => item.id === 'item-1')?.name).toBe('Invitez votre équipe');
  });

  it('resource center: a removed block rejoins its tab and revives by id', () => {
    const source = createResourceCenterData();
    const stored = createLocalizedWorkingVersionData(
      ContentDataType.RESOURCE_CENTER,
      source,
      undefined,
    );
    (stored.tabs[0].blocks[1].name as { text: string }[])[0].text = 'Guides FR';

    const shrunk = deepClone(source);
    shrunk.tabs[0].blocks = shrunk.tabs[0].blocks.filter((block) => block.id !== 'block-2');
    const working = createLocalizedWorkingVersionData(
      ContentDataType.RESOURCE_CENTER,
      shrunk,
      stored,
    );

    const payload = buildLocalizedVersionDataSavePayload(
      ContentDataType.RESOURCE_CENTER,
      working,
      stored,
    );
    expect(payload.tabs[0].blocks.some((block) => block.id === 'block-2')).toBe(true);

    const merged = mergeLocalizedVersionData(ContentDataType.RESOURCE_CENTER, source, payload);
    const revived = merged.tabs[0].blocks.find((block) => block.id === 'block-2');
    expect((revived?.name as { text: string }[])[0].text).toBe('Guides FR');
  });
});

describe('whitespace-only text runs (formatting splits "**Save** *now*" around a lone space)', () => {
  const formatted = (): ContentEditorRoot[] =>
    wrapElements([
      {
        type: ContentEditorElementType.TEXT,
        data: [
          {
            type: 'paragraph',
            children: [{ text: 'Save', bold: true }, { text: ' ' }, { text: 'now', italic: true }],
          },
        ],
      } as ContentEditorTextElement,
    ]);

  it('are not units, so a fully translated sentence is not left "missing"', () => {
    const source = formatted();
    const units = extractContentsTranslationUnits(source, undefined);
    expect(units.map((unit) => unit.sourceText)).toEqual(['Save', 'now']);
    expect(extractTranslatableUnits(source).map((unit) => unit.text)).toEqual(['Save', 'now']);

    const localized = applyContentsTranslationUnits(
      source,
      undefined,
      new Map(units.map((unit) => [unit.path, `${unit.sourceText}-fr`])),
    );
    expect(countMissingTranslations(source, localized)).toBe(0);
    // Their paths are positional, so skipping the space renumbers nothing.
    expect(units.map((unit) => unit.path)).toEqual(['0.0.0:text.0.0', '0.0.0:text.0.2']);
  });

  it('still render: delivery keeps the source space between the translated runs', () => {
    const source = formatted();
    const units = extractContentsTranslationUnits(source, undefined);
    const localized = applyContentsTranslationUnits(
      source,
      undefined,
      new Map(units.map((unit) => [unit.path, `${unit.sourceText}-fr`])),
    );
    const delivered = mergeLocalizedEditorContents(source, localized);
    const runs = (delivered[0].children[0].children[0].element as ContentEditorTextElement).data[0]
      .children as { text: string }[];
    expect(runs.map((run) => run.text)).toEqual(['Save-fr', ' ', 'now-fr']);
  });

  it('isTranslatableText draws the line', () => {
    expect(isTranslatableText('Save')).toBe(true);
    expect(isTranslatableText(' Save ')).toBe(true);
    expect(isTranslatableText('')).toBe(false);
    expect(isTranslatableText(' \n\u00a0')).toBe(false);
  });
});

describe('source snapshots (the backup saved alongside a translation)', () => {
  it('snapshots every current step', () => {
    const first = wrapElements([createTextElement()]);
    const second = wrapElements([createButtonElement()]);
    expect(
      buildLocalizedFlowBackup(
        [
          { cvid: 'step-1', data: first },
          { cvid: 'step-2', data: second },
        ],
        undefined,
      ),
    ).toEqual({ 'step-1': first, 'step-2': second });
  });

  it('re-snapshots current steps and keeps the stored snapshot of removed ones', () => {
    const current = wrapElements([createTextElement()]);
    const staleSnapshot = wrapElements([createButtonElement()]);
    const removedSnapshot = wrapElements([createNpsElement()]);
    expect(
      buildLocalizedFlowBackup([{ cvid: 'step-1', data: current }], {
        'step-1': staleSnapshot,
        'step-removed': removedSnapshot,
      }),
    ).toEqual({ 'step-1': current, 'step-removed': removedSnapshot });
  });

  it('snapshots version data, defaulting an absent body to an empty object', () => {
    const data = { buttonText: 'Get started' };
    expect(buildLocalizedVersionDataBackup(data)).toBe(data);
    expect(buildLocalizedVersionDataBackup(undefined)).toEqual({});
    expect(buildLocalizedVersionDataBackup(null)).toEqual({});
  });
});

describe('imported embed URLs (resolution travels with the swap)', () => {
  const importedUrl = 'https://example.com/watch?v=fr';

  it('drops the stale source resolution and installs the provided one', () => {
    const source = createSourceContents();
    const applied = applyContentsTranslationUnits(
      source,
      undefined,
      new Map([['0.0.5:embed.url', importedUrl]]),
      new Map([
        [
          importedUrl,
          { parsedUrl: importedUrl, oembed: { html: '<iframe fr />', width: 640, height: 360 } },
        ],
      ]),
    );
    const embed = getElement<ContentEditorEmebedElement>(applied, 5);
    expect(embed.url).toBe(importedUrl);
    expect(embed.parsedUrl).toBe(importedUrl);
    expect(embed.oembed?.html).toBe('<iframe fr />');

    // Delivery donates the fresh resolution alongside the URL.
    const merged = mergeLocalizedEditorContents(source, applied);
    const mergedEmbed = getElement<ContentEditorEmebedElement>(merged, 5);
    expect(mergedEmbed.parsedUrl).toBe(importedUrl);
    expect(mergedEmbed.oembed?.html).toBe('<iframe fr />');
  });

  it('never ships the source media data when no resolution is available', () => {
    const source = createSourceContents();
    const applied = applyContentsTranslationUnits(
      source,
      undefined,
      new Map([['0.0.5:embed.url', importedUrl]]),
    );
    const embed = getElement<ContentEditorEmebedElement>(applied, 5);
    expect(embed.url).toBe(importedUrl);
    expect(embed.parsedUrl).toBeUndefined();
    expect(embed.oembed).toBeUndefined();

    // The merge must not resurrect the source-language media either.
    const merged = mergeLocalizedEditorContents(source, applied);
    const mergedEmbed = getElement<ContentEditorEmebedElement>(merged, 5);
    expect(mergedEmbed.url).toBe(importedUrl);
    expect(mergedEmbed.parsedUrl).toBeUndefined();
    expect(mergedEmbed.oembed).toBeUndefined();
  });
});

describe('clearing a unit (null — distinct from a blank value, which keeps)', () => {
  const translatedUrl = 'https://example.com/watch?v=fr';

  const unitsOf = (source: ContentEditorRoot[], localized: ContentEditorRoot[]) => {
    return new Map(
      extractContentsTranslationUnits(source, localized).map((unit) => [
        unit.path,
        unit.translatedText,
      ]),
    );
  };

  it('clears text, an image url and an embed url back to untranslated, leaving other units alone', () => {
    const source = createSourceContents();
    const translated = applyContentsTranslationUnits(
      source,
      undefined,
      new Map([
        ['0.0.1:button.text', 'Suivant'],
        ['0.0.2:question.name', 'Nous recommanderiez-vous ?'],
        ['0.0.4:image.url', 'https://example.com/fr.png'],
        ['0.0.5:embed.url', translatedUrl],
      ]),
      new Map([
        [
          translatedUrl,
          { parsedUrl: translatedUrl, oembed: { html: '<iframe fr />', width: 640, height: 360 } },
        ],
      ]),
    );

    const cleared = applyContentsTranslationUnits(
      source,
      translated,
      new Map([
        ['0.0.1:button.text', null],
        ['0.0.4:image.url', null],
        ['0.0.5:embed.url', null],
      ]),
    );
    const units = unitsOf(source, cleared);
    expect(units.get('0.0.1:button.text')).toBe('');
    expect(units.get('0.0.4:image.url')).toBe('');
    expect(units.get('0.0.5:embed.url')).toBe('');
    expect(units.get('0.0.2:question.name')).toBe('Nous recommanderiez-vous ?');

    // The cleared embed must not keep the translated url's resolution, and
    // delivery falls back to the source media.
    const embed = getElement<ContentEditorEmebedElement>(cleared, 5);
    expect(embed.parsedUrl).toBeUndefined();
    expect(embed.oembed).toBeUndefined();
    const sourceEmbed = getElement<ContentEditorEmebedElement>(source, 5);
    const merged = getElement<ContentEditorEmebedElement>(
      mergeLocalizedEditorContents(source, cleared),
      5,
    );
    expect(merged.url).toBe(sourceEmbed.url);
  });

  it('clears a link override back to the keep-original sentinel', () => {
    const source = wrapElements([createLinkTextElement()]);
    const path = '0.0.0:text.0.1:link.url';
    const overridden = applyContentsTranslationUnits(
      source,
      undefined,
      new Map([[path, 'https://example.com/cs/post']]),
    );
    const cleared = applyContentsTranslationUnits(source, overridden, new Map([[path, null]]));
    expect(getElement<ContentEditorTextElement>(cleared, 0).data[0].children[1].url).toBe('');
    expect(unitsOf(source, cleared).get(path)).toBe('');
  });
});

describe('unit kinds (shared by the server and the dashboard)', () => {
  it('only text counts as missing while untranslated', () => {
    expect(isTranslationUnitOptional('text')).toBe(false);
    expect(isTranslationUnitOptional('destination')).toBe(true);
    expect(isTranslationUnitOptional('media')).toBe(true);
  });

  it('accepts only absolute http(s) urls', () => {
    expect(isHttpUrl('https://example.com/a.png')).toBe(true);
    expect(isHttpUrl('http://localhost:3000/a.png')).toBe(true);
    expect(isHttpUrl('exam')).toBe(false);
    expect(isHttpUrl('/uploads/a.png')).toBe(false);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('duplicate identifier remapping', () => {
  it('question cvids regenerated by a duplicate follow into the copied translation', () => {
    const source = createSourceContents();
    const stored = createLocalizedWorkingContents(source, undefined);
    getElement<ContentEditorNPSElement>(stored, 2).data.name = 'Recommanderiez-vous ?';

    // A duplicate keeps the shape but regenerates question cvids.
    const duplicated = deepClone(source);
    getElement<ContentEditorNPSElement>(duplicated, 2).data.cvid = 'question-1-copy';
    getElement<ContentEditorMultipleChoiceElement>(duplicated, 3).data.cvid = 'question-2-copy';

    // Without the remap the copied translation is orphaned on question elements.
    const orphaned = mergeLocalizedEditorContents(duplicated, stored);
    expect(getElement<ContentEditorNPSElement>(orphaned, 2).data.name).toBe(
      'How likely are you to recommend us?',
    );

    const remapped = remapContentsTranslationIdentifiers(duplicated, stored);
    expect(getElement<ContentEditorNPSElement>(remapped ?? [], 2).data.cvid).toBe(
      'question-1-copy',
    );
    const merged = mergeLocalizedEditorContents(duplicated, remapped);
    expect(getElement<ContentEditorNPSElement>(merged, 2).data.name).toBe('Recommanderiez-vous ?');
  });

  it('link destination overrides ride through a duplicate untouched (links have no ids to remap)', () => {
    const source = wrapElements([createLinkTextElement(), createNpsElement()]);
    const stored = createLocalizedWorkingContents(source, undefined);
    assignLocalizedLinkUrl(
      getElement<ContentEditorTextElement>(stored, 0).data[0].children[1],
      'https://example.com/cs/post',
    );

    // A duplicate keeps the shape but regenerates question cvids; links carry
    // no identifiers, so they align purely by position.
    const duplicated = deepClone(source);
    getElement<ContentEditorNPSElement>(duplicated, 1).data.cvid = 'question-1-copy';

    const remapped = remapContentsTranslationIdentifiers(duplicated, stored);
    const merged = mergeLocalizedEditorContents(duplicated, remapped);
    expect(
      getLocalizableLinkUrl(getElement<ContentEditorTextElement>(merged, 0).data[0].children[1]),
    ).toBe('https://example.com/cs/post');
  });

  it('remaps a whole flow translation map by step cvid', () => {
    const source = createSourceContents();
    const stored = createLocalizedWorkingContents(source, undefined);
    getElement<ContentEditorNPSElement>(stored, 2).data.name = 'Recommanderiez-vous ?';

    const duplicated = deepClone(source);
    getElement<ContentEditorNPSElement>(duplicated, 2).data.cvid = 'question-1-copy';

    const remapped = remapFlowTranslationIdentifiers([{ cvid: 'step-1', data: duplicated }], {
      'step-1': stored,
    }) as LocalizedFlowContent;
    expect(getElement<ContentEditorNPSElement>(remapped['step-1'], 2).data.cvid).toBe(
      'question-1-copy',
    );
  });

  it('checklist item ids regenerated by a duplicate follow into the copied translation', () => {
    const source = createChecklistData();
    const stored = createLocalizedWorkingVersionData(ContentDataType.CHECKLIST, source, undefined);
    stored.items[0].name = 'Invitez votre équipe';

    const duplicated = deepClone(source);
    duplicated.items[0].id = 'item-1-copy';
    duplicated.items[1].id = 'item-2-copy';

    const remapped = remapVersionDataTranslationIdentifiers(
      ContentDataType.CHECKLIST,
      duplicated,
      stored,
    ) as ChecklistData;
    expect(remapped.items[0].id).toBe('item-1-copy');

    const merged = mergeLocalizedVersionData(ContentDataType.CHECKLIST, duplicated, remapped);
    expect(merged.items.find((item) => item.id === 'item-1-copy')?.name).toBe(
      'Invitez votre équipe',
    );
  });
});

describe('resource center content-list item labels', () => {
  const createListData = (): ResourceCenterData => ({
    buttonText: 'Help',
    headerText: 'How can we help?',
    tabs: [
      {
        id: 'tab-1',
        name: 'Home',
        iconSource: LauncherIconSource.NONE,
        iconType: '',
        blocks: [
          {
            id: 'block-list',
            name: [{ text: 'Guides' }],
            type: ResourceCenterBlockType.CONTENT_LIST,
            onlyShowBlock: false,
            onlyShowBlockConditions: [],
            iconSource: LauncherIconSource.NONE,
            iconType: '',
            flowIconSource: LauncherIconSource.NONE,
            flowIconType: '',
            checklistIconSource: LauncherIconSource.NONE,
            checklistIconType: '',
            showSearchField: false,
            contentItems: [
              {
                contentId: 'flow-1',
                contentType: 'flow',
                label: 'Getting started',
                onlyShowItem: false,
                onlyShowItemConditions: [],
              },
              {
                contentId: 'flow-2',
                contentType: 'flow',
                onlyShowItem: false,
                onlyShowItemConditions: [],
              },
            ],
          },
        ],
      },
    ],
  });

  const LABEL_PATH = 'tabs.tab-1.blocks.block-list.contentItems.flow-1:label';

  it('exposes labeled entries as units and skips label-less ones', () => {
    const source = createListData();
    const units = extractVersionDataTranslationUnits(
      ContentDataType.RESOURCE_CENTER,
      source,
      undefined,
    );
    const labelUnit = units.find((unit) => unit.path === LABEL_PATH);
    expect(labelUnit?.sourceText).toBe('Getting started');
    expect(units.some((unit) => unit.path.includes('flow-2'))).toBe(false);
  });

  it('merges a translated label by contentId, surviving reordering', () => {
    const source = createListData();
    const working = createLocalizedWorkingVersionData(
      ContentDataType.RESOURCE_CENTER,
      source,
      undefined,
    );
    const workingItems = (working.tabs[0].blocks[0] as { contentItems: ContentListItem[] })
      .contentItems;
    expect(workingItems[0].label).toBe('');
    workingItems[0].label = 'Premiers pas';

    const reordered = deepClone(source);
    (reordered.tabs[0].blocks[0] as { contentItems: ContentListItem[] }).contentItems.reverse();

    const merged = mergeLocalizedVersionData(ContentDataType.RESOURCE_CENTER, reordered, working);
    const mergedItems = (merged.tabs[0].blocks[0] as { contentItems: ContentListItem[] })
      .contentItems;
    expect(mergedItems.find((item) => item.contentId === 'flow-1')?.label).toBe('Premiers pas');
    expect(mergedItems.find((item) => item.contentId === 'flow-2')?.label).toBeUndefined();
  });

  it("keeps a removed entry's label in the save payload and revives it", () => {
    const source = createListData();
    const stored = createLocalizedWorkingVersionData(
      ContentDataType.RESOURCE_CENTER,
      source,
      undefined,
    );
    (stored.tabs[0].blocks[0] as { contentItems: ContentListItem[] }).contentItems[0].label =
      'Premiers pas';

    const shrunk = deepClone(source);
    const shrunkBlock = shrunk.tabs[0].blocks[0] as { contentItems: ContentListItem[] };
    shrunkBlock.contentItems = shrunkBlock.contentItems.filter(
      (item) => item.contentId !== 'flow-1',
    );
    const working = createLocalizedWorkingVersionData(
      ContentDataType.RESOURCE_CENTER,
      shrunk,
      stored,
    );

    const payload = buildLocalizedVersionDataSavePayload(
      ContentDataType.RESOURCE_CENTER,
      working,
      stored,
    );
    const payloadItems = (payload.tabs[0].blocks[0] as { contentItems: ContentListItem[] })
      .contentItems;
    expect(payloadItems.some((item) => item.contentId === 'flow-1')).toBe(true);

    const merged = mergeLocalizedVersionData(ContentDataType.RESOURCE_CENTER, source, payload);
    const revived = (
      merged.tabs[0].blocks[0] as { contentItems: ContentListItem[] }
    ).contentItems.find((item) => item.contentId === 'flow-1');
    expect(revived?.label).toBe('Premiers pas');
  });
});

// ---------------------------------------------------------------------------
// Navigate destinations — one concept, three stores. A page-navigate action
// (buttons, questions, checklist tasks, launchers, resource-center blocks) and
// a content-list entry's own navigation localize under the rules inline links
// established: destination unit, opaque when dynamic, paired by id.
// ---------------------------------------------------------------------------

const urlTemplate = (url: string) => [{ type: 'paragraph', children: [{ text: url }] }];

const createNavigateAction = (id: string, url: string): RulesCondition => {
  return {
    id,
    type: ContentActionsItemType.PAGE_NAVIGATE,
    data: { openType: 'same', value: urlTemplate(url) },
  };
};

const createDismissAction = (id: string): RulesCondition => {
  return { id, type: ContentActionsItemType.FLOW_DISMIS, data: {} };
};

/** The n-th navigate's destination in an action list (how the walkers pair them). */
const readNavigateUrl = (
  actions: RulesCondition[] | undefined,
  ordinal = 0,
): string | undefined => {
  const action = actions?.filter(
    (candidate) => candidate.type === ContentActionsItemType.PAGE_NAVIGATE,
  )[ordinal];
  return action ? readDestination(navigateDestination(action.data)) : undefined;
};

const createCtaButton = (): ContentEditorButtonElement => {
  return {
    type: ContentEditorElementType.BUTTON,
    data: {
      text: 'Try it',
      actions: [
        createDismissAction('dismiss-1'),
        createNavigateAction('navigate-1', 'https://example.com/en/mcp'),
      ],
    },
  };
};

const createLauncherData = (): LauncherData => {
  return {
    type: 'icon',
    iconType: 'question',
    buttonText: 'Help',
    target: { element: undefined, screenshot: undefined, alignment: {} as never },
    behavior: {
      triggerElement: LauncherTriggerElement.LAUNCHER,
      actionType: LauncherActionType.PERFORM_ACTION,
      triggerEvent: LauncherTriggerEvent.CLICKED,
      actions: [createNavigateAction('navigate-1', 'https://example.com/en/help')],
    },
    tooltip: {
      reference: 'launcher',
      element: undefined,
      alignment: {} as never,
      width: 300,
      settings: {} as never,
      content: [],
    },
  } as unknown as LauncherData;
};

describe('navigate destinations (one concept, three stores)', () => {
  const CTA_PATH = '0.0.0:button.actions.0:navigate.url';

  it('localizes a button navigate by its order among navigates, leaving the rest of the action to the source', () => {
    const source = wrapElements([createCtaButton()]);
    const units = extractTranslatableUnits(source);
    expect(units.find((unit) => unit.path === CTA_PATH)).toMatchObject({
      text: 'https://example.com/en/mcp',
      kind: 'destination',
    });
    expect(units).toHaveLength(2);

    const localized = createLocalizedWorkingContents(source, undefined);
    const localizedActions = getElement<ContentEditorButtonElement>(localized, 0).data.actions;
    expect(readNavigateUrl(localizedActions)).toBe('');
    const localizedAction = localizedActions.find(
      (action) => action.type === ContentActionsItemType.PAGE_NAVIGATE,
    );
    writeDestination(navigateDestination(localizedAction!.data), 'https://example.com/cs/mcp');

    // The source reorders its actions and re-mints every id (what an API
    // write does) — the navigate still pairs, by position among navigates.
    const rewritten = deepClone(source);
    const rewrittenActions = getElement<ContentEditorButtonElement>(rewritten, 0).data.actions;
    rewrittenActions.reverse();
    for (const action of rewrittenActions) {
      action.id = `fresh-${action.type}`;
    }
    const merged = mergeLocalizedEditorContents(rewritten, localized);
    const mergedAction = getElement<ContentEditorButtonElement>(merged, 0).data.actions.find(
      (action) => action.type === ContentActionsItemType.PAGE_NAVIGATE,
    );
    expect(mergedAction?.data.value).toEqual(urlTemplate('https://example.com/cs/mcp'));
    expect(mergedAction?.data.openType).toBe('same');
    expect(countMissingTranslations(source, localized)).toBe(1);
  });

  it('localizes question actions, checklist task actions, launcher actions and resource-center action blocks', () => {
    const nps = createNpsElement();
    nps.data.actions = [createNavigateAction('navigate-1', 'https://example.com/en/review')];
    expect(
      extractTranslatableUnits(wrapElements([nps])).find(
        (unit) => unit.path === '0.0.0:question.actions.0:navigate.url',
      )?.kind,
    ).toBe('destination');

    const checklist = createChecklistData();
    checklist.items[0].clickedActions = [
      createNavigateAction('navigate-1', 'https://example.com/en/invite'),
    ];
    const checklistPath = 'items.item-1:clickedActions.0:navigate.url';
    const checklistWorking = createLocalizedWorkingVersionData(
      ContentDataType.CHECKLIST,
      checklist,
      undefined,
    );
    expect(readNavigateUrl(checklistWorking.items[0].clickedActions)).toBe('');
    const checklistApplied = applyVersionDataTranslationUnits(
      ContentDataType.CHECKLIST,
      checklist,
      undefined,
      new Map([[checklistPath, 'https://example.com/cs/invite']]),
    );
    const checklistMerged = mergeLocalizedVersionData(
      ContentDataType.CHECKLIST,
      checklist,
      checklistApplied,
    );
    expect(readNavigateUrl(checklistMerged.items[0].clickedActions)).toBe(
      'https://example.com/cs/invite',
    );

    const launcher = createLauncherData();
    const launcherPath = 'behavior.actions.0:navigate.url';
    expect(
      extractVersionDataTranslationUnits(ContentDataType.LAUNCHER, launcher, undefined).find(
        (unit) => unit.path === launcherPath,
      )?.sourceText,
    ).toBe('https://example.com/en/help');
    const launcherMerged = mergeLocalizedVersionData(
      ContentDataType.LAUNCHER,
      launcher,
      applyVersionDataTranslationUnits(
        ContentDataType.LAUNCHER,
        launcher,
        undefined,
        new Map([[launcherPath, 'https://example.com/cs/help']]),
      ),
    );
    expect(readNavigateUrl(launcherMerged.behavior.actions)).toBe('https://example.com/cs/help');

    const resourceCenter = createResourceCenterData();
    (resourceCenter.tabs[0].blocks[0] as { clickedActions: RulesCondition[] }).clickedActions = [
      createNavigateAction('navigate-1', 'https://example.com/en/support'),
    ];
    const blockPath = 'tabs.tab-1.blocks.block-1:clickedActions.0:navigate.url';
    const resourceCenterMerged = mergeLocalizedVersionData(
      ContentDataType.RESOURCE_CENTER,
      resourceCenter,
      applyVersionDataTranslationUnits(
        ContentDataType.RESOURCE_CENTER,
        resourceCenter,
        undefined,
        new Map([[blockPath, 'https://example.com/cs/support']]),
      ),
    );
    expect(
      readNavigateUrl(
        (resourceCenterMerged.tabs[0].blocks[0] as { clickedActions: RulesCondition[] })
          .clickedActions,
      ),
    ).toBe('https://example.com/cs/support');
  });

  it("localizes a content-list entry's own navigation by contentId", () => {
    const source = createResourceCenterData();
    source.tabs[0].blocks.push({
      id: 'block-list',
      name: [{ text: 'Guides' }],
      type: ResourceCenterBlockType.CONTENT_LIST,
      onlyShowBlock: false,
      onlyShowBlockConditions: [],
      iconSource: LauncherIconSource.NONE,
      iconType: '',
      flowIconSource: LauncherIconSource.NONE,
      flowIconType: '',
      checklistIconSource: LauncherIconSource.NONE,
      checklistIconType: '',
      showSearchField: false,
      contentItems: [
        {
          contentId: 'flow-1',
          contentType: 'flow',
          navigateUrl: urlTemplate('https://example.com/en/app/settings'),
          navigateOpenType: 'new',
          onlyShowItem: false,
          onlyShowItemConditions: [],
        },
        {
          contentId: 'flow-2',
          contentType: 'flow',
          onlyShowItem: false,
          onlyShowItemConditions: [],
        },
      ],
    });
    const itemPath = 'tabs.tab-1.blocks.block-list.contentItems.flow-1:navigate.url';
    const units = extractVersionDataTranslationUnits(
      ContentDataType.RESOURCE_CENTER,
      source,
      undefined,
    );
    expect(units.find((unit) => unit.path === itemPath)).toMatchObject({
      sourceText: 'https://example.com/en/app/settings',
      kind: 'destination',
    });
    // An entry without navigation has nothing to localize.
    expect(units.some((unit) => unit.path.includes('flow-2:navigate'))).toBe(false);

    const merged = mergeLocalizedVersionData(
      ContentDataType.RESOURCE_CENTER,
      source,
      applyVersionDataTranslationUnits(
        ContentDataType.RESOURCE_CENTER,
        source,
        undefined,
        new Map([[itemPath, 'https://example.com/cs/app/settings']]),
      ),
    );
    const mergedItem = (merged.tabs[0].blocks[2] as { contentItems: ContentListItem[] })
      .contentItems[0];
    expect(readDestination(contentListDestination(mergedItem))).toBe(
      'https://example.com/cs/app/settings',
    );
    expect(mergedItem.navigateOpenType).toBe('new');
  });

  it('treats a dynamic navigate destination as opaque: no unit, stored value carried, revived later', () => {
    const source = wrapElements([createCtaButton()]);
    const stored = createLocalizedWorkingContents(source, undefined);
    const storedAction = getElement<ContentEditorButtonElement>(stored, 0).data.actions.find(
      (action) => action.id === 'navigate-1',
    );
    writeDestination(navigateDestination(storedAction!.data), 'https://example.com/cs/mcp');

    const chipTemplate = [
      {
        type: 'paragraph',
        children: [
          { text: 'https://example.com/' },
          {
            type: 'user-attribute',
            attrCode: 'locale_code',
            fallback: 'en',
            children: [{ text: '' }],
          },
          { text: '/mcp' },
        ],
      },
    ];
    const sourceAction = getElement<ContentEditorButtonElement>(source, 0).data.actions.find(
      (action) => action.id === 'navigate-1',
    );
    sourceAction!.data.value = chipTemplate;

    expect(extractTranslatableUnits(source).some((unit) => unit.path === CTA_PATH)).toBe(false);
    const working = createLocalizedWorkingContents(source, stored);
    expect(readNavigateUrl(getElement<ContentEditorButtonElement>(working, 0).data.actions)).toBe(
      'https://example.com/cs/mcp',
    );
    const merged = mergeLocalizedEditorContents(source, stored);
    expect(
      getElement<ContentEditorButtonElement>(merged, 0).data.actions.find(
        (action) => action.id === 'navigate-1',
      )?.data.value,
    ).toEqual(chipTemplate);

    sourceAction!.data.value = urlTemplate('https://example.com/en/mcp');
    const revived = mergeLocalizedEditorContents(source, stored);
    expect(readNavigateUrl(getElement<ContentEditorButtonElement>(revived, 0).data.actions)).toBe(
      'https://example.com/cs/mcp',
    );
  });

  it('drops the override with the navigate it belonged to, and pairs a re-added one by position', () => {
    const source = wrapElements([createCtaButton()]);
    const stored = applyContentsTranslationUnits(
      source,
      undefined,
      new Map([[CTA_PATH, 'https://example.com/cs/mcp']]),
    );

    const shrunk = deepClone(source);
    getElement<ContentEditorButtonElement>(shrunk, 0).data.actions = [
      createDismissAction('dismiss-1'),
    ];
    // No navigate, no unit — and nothing parks in the payload for it.
    expect(extractTranslatableUnits(shrunk).some((unit) => unit.path === CTA_PATH)).toBe(false);
    const working = createLocalizedWorkingContents(shrunk, stored);
    const payload = buildContentsSavePayload(working, stored);
    expect(
      readNavigateUrl(getElement<ContentEditorButtonElement>(payload, 0).data.actions),
    ).toBeUndefined();

    // A navigate added back is the list's first navigate again: the stored
    // row (untouched by that save) still pairs with it.
    const restored = mergeLocalizedEditorContents(source, stored);
    expect(readNavigateUrl(getElement<ContentEditorButtonElement>(restored, 0).data.actions)).toBe(
      'https://example.com/cs/mcp',
    );
  });
});

describe('destination url rule (shared by the version write and the translation write)', () => {
  it('accepts routes the host can handle and mail / phone links', () => {
    expect(isSafeDestinationUrl('/fr/mcp')).toBe(true);
    expect(isSafeDestinationUrl('settings?tab=1')).toBe(true);
    expect(isSafeDestinationUrl('#pricing')).toBe(true);
    expect(isSafeDestinationUrl('https://example.com/cs/post')).toBe(true);
    expect(isSafeDestinationUrl('HTTP://example.com')).toBe(true);
    expect(isSafeDestinationUrl('mailto:support@example.com')).toBe(true);
    expect(isSafeDestinationUrl('tel:+420123456789')).toBe(true);
    expect(isSafeDestinationUrl('')).toBe(true);
  });

  it('refuses schemes that run code or carry a document', () => {
    expect(isSafeDestinationUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeDestinationUrl(' JavaScript:alert(1)')).toBe(false);
    expect(isSafeDestinationUrl('data:text/html,<script>')).toBe(false);
    expect(isSafeDestinationUrl('vbscript:msgbox')).toBe(false);
    expect(isSafeDestinationUrl('file:///etc/passwd')).toBe(false);
  });

  it('reads the scheme the way a browser does — whitespace and control characters cannot hide it', () => {
    expect(isSafeDestinationUrl('java\tscript:alert(1)')).toBe(false);
    expect(isSafeDestinationUrl('\u0001javascript:alert(1)')).toBe(false);
    expect(isSafeDestinationUrl('javascript\n:alert(1)')).toBe(false);
    // Not a url at all (the builder's untouched placeholder) is not a safe one.
    expect(isSafeDestinationUrl('https://')).toBe(false);
  });

  it('collects every destination of a tree for a url check, chips stood in for', () => {
    const button = createCtaButton();
    const navigate = button.data.actions.find(
      (action) => action.type === ContentActionsItemType.PAGE_NAVIGATE,
    );
    navigate!.data.value = [
      {
        type: 'paragraph',
        children: [
          { text: 'https://example.com/' },
          {
            type: 'user-attribute',
            attrCode: 'locale_code',
            fallback: '',
            children: [{ text: '' }],
          },
        ],
      },
    ];
    const image = createImageElement();
    image.link = { url: '/pricing' };
    const destinations = collectContentsDestinations(
      wrapElements([createLinkTextElement(), button, image]),
    );
    expect(destinations).toEqual([
      { path: '0.0.0:text.0.1:link.url', value: 'https://example.com/en/post' },
      { path: '0.0.1:button.actions.0:navigate.url', value: 'https://example.com/attribute' },
      { path: '0.0.2:image.link.url', value: '/pricing' },
    ]);
    // The dynamic navigate is still no translation unit.
    expect(
      extractTranslatableUnits(wrapElements([button])).some((unit) =>
        unit.path.endsWith(':navigate.url'),
      ),
    ).toBe(false);
  });
});

describe('container groups', () => {
  it('names a checklist task and a resource-center block on every unit they own', () => {
    const checklist = createChecklistData();
    checklist.items[0].clickedActions = [
      createNavigateAction('nav', 'https://example.com/en/invite'),
    ];
    const checklistUnits = extractVersionDataTranslationUnits(
      ContentDataType.CHECKLIST,
      checklist,
      undefined,
    );
    const taskUnits = checklistUnits.filter((unit) => unit.path.startsWith('items.item-1'));
    expect(taskUnits).toHaveLength(3);
    for (const unit of taskUnits) {
      expect(unit.group).toEqual({ path: 'items.item-1', title: 'Invite your team' });
    }
    expect(checklistUnits.find((unit) => unit.path === 'buttonText')?.group).toBeUndefined();

    const resourceCenter = createResourceCenterData();
    const blockUnits = extractVersionDataTranslationUnits(
      ContentDataType.RESOURCE_CENTER,
      resourceCenter,
      undefined,
    ).filter((unit) => unit.path.startsWith('tabs.tab-1.blocks.block-2'));
    expect(blockUnits.length).toBeGreaterThan(1);
    for (const unit of blockUnits) {
      expect(unit.group).toEqual({ path: 'tabs.tab-1.blocks.block-2', title: 'Guides' });
    }
    // Units of an embedded tree carry both the block and their element.
    expect(blockUnits.find((unit) => unit.path.includes('.content/'))?.element?.type).toBe(
      ContentEditorElementType.TEXT,
    );
  });
});

// ---------------------------------------------------------------------------
// Text the walkers used to skip: a user-attribute chip's fallback (rendered
// whenever the attribute is unset) and an image's alt text.
// ---------------------------------------------------------------------------

describe('chip fallback and image alt text', () => {
  const createGreetingElement = (): ContentEditorTextElement => {
    return {
      type: ContentEditorElementType.TEXT,
      data: [
        {
          type: 'paragraph',
          children: [
            { text: 'Hi ' },
            {
              type: 'user-attribute',
              attrCode: 'first_name',
              fallback: 'there',
              children: [{ text: '' }],
            },
            { text: '!' },
          ],
        },
      ],
    };
  };

  it('translates a chip fallback as text, keeping the attribute binding from the source', () => {
    const source = wrapElements([createGreetingElement()]);
    const units = extractTranslatableUnits(source);
    expect(units.find((unit) => unit.path === '0.0.0:text.0.1:fallback')).toMatchObject({
      text: 'there',
      kind: 'text',
    });
    // Hi + fallback + ! — the chip's empty text child is not a unit.
    expect(countMissingTranslations(source, undefined)).toBe(3);

    const merged = mergeLocalizedEditorContents(
      source,
      applyContentsTranslationUnits(
        source,
        undefined,
        new Map([['0.0.0:text.0.1:fallback', 'du']]),
      ),
    );
    const chip = getElement<ContentEditorTextElement>(merged, 0).data[0].children[1];
    expect(chip.fallback).toBe('du');
    expect(chip.attrCode).toBe('first_name');
  });

  it('translates an image alt text', () => {
    const image = createImageElement();
    image.alt = 'The new dashboard';
    const source = wrapElements([image]);
    expect(
      extractTranslatableUnits(source).find((unit) => unit.path === '0.0.0:image.alt'),
    ).toMatchObject({
      text: 'The new dashboard',
      kind: 'text',
    });
    const merged = mergeLocalizedEditorContents(
      source,
      applyContentsTranslationUnits(
        source,
        undefined,
        new Map([['0.0.0:image.alt', 'Der neue Dashboard']]),
      ),
    );
    expect(getElement<ContentEditorImageElement>(merged, 0).alt).toBe('Der neue Dashboard');
  });

  it('emits nothing for an empty fallback or a missing alt', () => {
    const element = createGreetingElement();
    (element.data[0] as { children: Array<Record<string, unknown>> }).children[1].fallback = '';
    const units = extractTranslatableUnits(wrapElements([element, createImageElement()]));
    expect(units.some((unit) => unit.path.endsWith(':fallback'))).toBe(false);
    expect(units.some((unit) => unit.path.endsWith(':image.alt'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Stored-row schema versions — each generation of units blanks only the
// stores it introduced, on rows stamped before it.
// ---------------------------------------------------------------------------

describe('stored-row schema versions', () => {
  const createStoredRow = () => {
    const image = createImageElement();
    image.alt = 'The new dashboard';
    image.link = { url: 'https://example.com/en/pricing' };
    const source = wrapElements([createLinkTextElement(), createCtaButton(), image]);
    // A structural clone with a translator's link override on top — what a
    // version-1 row looks like once the newer stores exist in the source.
    const row = deepClone(source);
    assignLocalizedLinkUrl(
      getElement<ContentEditorTextElement>(row, 0).data[0].children[1],
      'https://example.com/cs/post',
    );
    return row;
  };

  it('is at its second generation', () => {
    expect(LOCALIZED_UNITS_SCHEMA_VERSION).toBe(2);
  });

  it('a version-1 row keeps its link overrides and gets only the newer stores blanked', () => {
    const row = createStoredRow();
    expect(blankLocalizedUnitClones(row, 1)).toBe(true);
    expect(blankLocalizedUnitClones(row, 1)).toBe(false);

    expect(
      getLocalizableLinkUrl(getElement<ContentEditorTextElement>(row, 0).data[0].children[1]),
    ).toBe('https://example.com/cs/post');
    expect(getLocalizableLinkUrl(getElement<ContentEditorImageElement>(row, 2).link)).toBe(
      'https://example.com/en/pricing',
    );
    expect(readNavigateUrl(getElement<ContentEditorButtonElement>(row, 1).data.actions)).toBe('');
    expect(getElement<ContentEditorImageElement>(row, 2).alt).toBe('');
  });

  it('a version-0 row gets every generation blanked', () => {
    const row = createStoredRow();
    expect(blankLocalizedUnitClones(row, 0)).toBe(true);
    expect(
      getLocalizableLinkUrl(getElement<ContentEditorTextElement>(row, 0).data[0].children[1]),
    ).toBe('');
    expect(getLocalizableLinkUrl(getElement<ContentEditorImageElement>(row, 2).link)).toBe('');
    expect(readNavigateUrl(getElement<ContentEditorButtonElement>(row, 1).data.actions)).toBe('');
  });

  it('a current row is left alone', () => {
    const row = createStoredRow();
    expect(blankLocalizedUnitClones(row, LOCALIZED_UNITS_SCHEMA_VERSION)).toBe(false);
  });

  it('blanks version-data stores too: task actions, content-list navigation, chip fallbacks', () => {
    const row = createChecklistData();
    row.items[0].clickedActions = [
      createNavigateAction('navigate-1', 'https://example.com/en/invite'),
    ];
    (row.content as ContentEditorRoot[])[0].children[0].children.push({
      element: {
        type: ContentEditorElementType.TEXT,
        data: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'user-attribute',
                attrCode: 'first_name',
                fallback: 'there',
                children: [{ text: '' }],
              },
            ],
          },
        ],
      },
      children: null,
    });
    expect(blankLocalizedUnitClones(row, 1)).toBe(true);
    expect(readNavigateUrl(row.items[0].clickedActions)).toBe('');
    expect(
      getElement<ContentEditorTextElement>(row.content as ContentEditorRoot[], 1).data[0]
        .children[0].fallback,
    ).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Unit coverage registry — every carrier of per-locale content, populated.
// A field that becomes a unit is registered here; one that silently stops
// being walked shows up as a missing path. Keep it exhaustive.
// ---------------------------------------------------------------------------

describe('unit coverage registry', () => {
  it('editor trees: every element type, every action slot', () => {
    const text = createLinkTextElement();
    (text.data[0] as { children: unknown[] }).children.push({
      type: 'user-attribute',
      attrCode: 'first_name',
      fallback: 'there',
      children: [{ text: '' }],
    });
    const image = createImageElement();
    image.alt = 'The new dashboard';
    image.link = { url: 'https://example.com/en/pricing' };
    const nps = createNpsElement();
    nps.data.actions = [createNavigateAction('nav', 'https://example.com/en/nps')];
    const choice = createChoiceElement();
    choice.data.buttonText = 'Submit';
    choice.data.otherPlaceholder = 'Other…';
    choice.data.actions = [createNavigateAction('nav', 'https://example.com/en/choice')];
    const contents = wrapElements([
      text,
      createCtaButton(),
      image,
      createEmbedElement(),
      nps,
      {
        type: ContentEditorElementType.STAR_RATING,
        data: {
          cvid: 'q-star',
          name: 'Rate us',
          lowRange: 1,
          highRange: 5,
          lowLabel: 'Bad',
          highLabel: 'Great',
          actions: [createNavigateAction('nav', 'https://example.com/en/star')],
        },
      },
      {
        type: ContentEditorElementType.SCALE,
        data: {
          cvid: 'q-scale',
          name: 'Effort',
          lowRange: 1,
          highRange: 7,
          lowLabel: 'Low',
          highLabel: 'High',
          actions: [createNavigateAction('nav', 'https://example.com/en/scale')],
        },
      },
      {
        type: ContentEditorElementType.SINGLE_LINE_TEXT,
        data: {
          cvid: 'q-single',
          name: 'Your name',
          placeholder: 'Name',
          buttonText: 'Send',
          required: false,
          actions: [createNavigateAction('nav', 'https://example.com/en/single')],
        },
      },
      {
        type: ContentEditorElementType.MULTI_LINE_TEXT,
        data: {
          cvid: 'q-multi',
          name: 'Feedback',
          placeholder: 'Tell us',
          buttonText: 'Send',
          required: false,
          actions: [createNavigateAction('nav', 'https://example.com/en/multi')],
        },
      },
      choice,
    ]);

    const paths = extractTranslatableUnits(contents).map((unit) => `${unit.kind} ${unit.path}`);
    expect(paths).toEqual([
      'text 0.0.0:text.0.0',
      'text 0.0.0:text.0.1.0',
      'destination 0.0.0:text.0.1:link.url',
      'text 0.0.0:text.0.2',
      'text 0.0.0:text.0.3:fallback',
      'text 0.0.1:button.text',
      'destination 0.0.1:button.actions.0:navigate.url',
      'media 0.0.2:image.url',
      'text 0.0.2:image.alt',
      'destination 0.0.2:image.link.url',
      'media 0.0.3:embed.url',
      'text 0.0.4:question.name',
      'text 0.0.4:question.lowLabel',
      'text 0.0.4:question.highLabel',
      'destination 0.0.4:question.actions.0:navigate.url',
      'text 0.0.5:question.name',
      'text 0.0.5:question.lowLabel',
      'text 0.0.5:question.highLabel',
      'destination 0.0.5:question.actions.0:navigate.url',
      'text 0.0.6:question.name',
      'text 0.0.6:question.lowLabel',
      'text 0.0.6:question.highLabel',
      'destination 0.0.6:question.actions.0:navigate.url',
      'text 0.0.7:question.name',
      'text 0.0.7:question.placeholder',
      'text 0.0.7:question.buttonText',
      'destination 0.0.7:question.actions.0:navigate.url',
      'text 0.0.8:question.name',
      'text 0.0.8:question.placeholder',
      'text 0.0.8:question.buttonText',
      'destination 0.0.8:question.actions.0:navigate.url',
      'text 0.0.9:question.name',
      'text 0.0.9:question.buttonText',
      'text 0.0.9:question.otherPlaceholder',
      'text 0.0.9:question.options.0.label',
      'text 0.0.9:question.options.1.label',
      'destination 0.0.9:question.actions.0:navigate.url',
    ]);
  });

  it('version data: every plain field, embedded tree and action slot per content type', () => {
    const checklist = createChecklistData();
    checklist.items[0].clickedActions = [
      createNavigateAction('nav', 'https://example.com/en/invite'),
    ];
    expect(
      extractVersionDataTranslationUnits(ContentDataType.CHECKLIST, checklist, undefined).map(
        (unit) => `${unit.kind} ${unit.path}`,
      ),
    ).toEqual([
      'text buttonText',
      'text content/0.0.0:button.text',
      'text items.item-1:name',
      'text items.item-1:description',
      'destination items.item-1:clickedActions.0:navigate.url',
      'text items.item-2:name',
    ]);

    const launcher = createLauncherData();
    launcher.tooltip.content = wrapElements([createTextElement()]);
    expect(
      extractVersionDataTranslationUnits(ContentDataType.LAUNCHER, launcher, undefined).map(
        (unit) => `${unit.kind} ${unit.path}`,
      ),
    ).toEqual([
      'text buttonText',
      'destination behavior.actions.0:navigate.url',
      'text tooltip/0.0.0:text.0.0',
      'text tooltip/0.0.0:text.0.1',
    ]);

    const announcement: AnnouncementData = {
      title: 'New dashboard',
      introContent: wrapElements([createTextElement()]),
      enableReadMore: true,
      readMoreLabel: 'Read more',
      detailContent: wrapElements([createCtaButton()]),
      distribution: AnnouncementDistribution.BADGE,
    };
    expect(
      extractVersionDataTranslationUnits(ContentDataType.ANNOUNCEMENT, announcement, undefined).map(
        (unit) => `${unit.kind} ${unit.path}`,
      ),
    ).toEqual([
      'text title',
      'text readMoreLabel',
      'text introContent/0.0.0:text.0.0',
      'text introContent/0.0.0:text.0.1',
      'text detailContent/0.0.0:button.text',
      'destination detailContent/0.0.0:button.actions.0:navigate.url',
    ]);

    const resourceCenter = createResourceCenterData();
    (resourceCenter.tabs[0].blocks[0] as { clickedActions: RulesCondition[] }).clickedActions = [
      createNavigateAction('nav', 'https://example.com/en/support'),
    ];
    resourceCenter.tabs[0].blocks.push({
      id: 'block-list',
      name: [{ text: 'Guides' }],
      type: ResourceCenterBlockType.CONTENT_LIST,
      onlyShowBlock: false,
      onlyShowBlockConditions: [],
      iconSource: LauncherIconSource.NONE,
      iconType: '',
      flowIconSource: LauncherIconSource.NONE,
      flowIconType: '',
      checklistIconSource: LauncherIconSource.NONE,
      checklistIconType: '',
      showSearchField: false,
      contentItems: [
        {
          contentId: 'flow-1',
          contentType: 'flow',
          label: 'Getting started',
          navigateUrl: urlTemplate('https://example.com/en/app'),
          onlyShowItem: false,
          onlyShowItemConditions: [],
        },
      ],
    });
    expect(
      extractVersionDataTranslationUnits(
        ContentDataType.RESOURCE_CENTER,
        resourceCenter,
        undefined,
      ).map((unit) => `${unit.kind} ${unit.path}`),
    ).toEqual([
      'text buttonText',
      'text headerText',
      'text tabs.tab-1:name',
      'text tabs.tab-1.blocks.block-1:name.0',
      'destination tabs.tab-1.blocks.block-1:clickedActions.0:navigate.url',
      'text tabs.tab-1.blocks.block-2:name.0',
      'text tabs.tab-1.blocks.block-2.content/0.0.0:text.0.0',
      'text tabs.tab-1.blocks.block-2.content/0.0.0:text.0.1',
      'text tabs.tab-1.blocks.block-list:name.0',
      'text tabs.tab-1.blocks.block-list.contentItems.flow-1:label',
      'destination tabs.tab-1.blocks.block-list.contentItems.flow-1:navigate.url',
    ]);
  });
});
