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
  LocalizedFlowContent,
  ResourceCenterData,
} from '@usertour/types';
import {
  AnnouncementDistribution,
  ChecklistCompletionOrder,
  ChecklistInitialDisplay,
  ContentDataType,
  ContentEditorElementType,
  LauncherIconSource,
  ResourceCenterBlockType,
} from '@usertour/types';

import {
  applyContentsTranslationUnits,
  applyVersionDataTranslationUnits,
  buildLocalizedFlowSavePayload,
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
  it('collects every non-empty translatable text with optional flags', () => {
    const units = extractTranslatableUnits(createSourceContents());
    const byPath = new Map(units.map((unit) => [unit.path, unit]));

    expect(byPath.get('0.0.0:text.0.0')?.text).toBe('Hello ');
    expect(byPath.get('0.0.0:text.0.1')?.text).toBe('world');
    expect(byPath.get('0.0.1:button.text')?.text).toBe('Next');
    expect(byPath.get('0.0.2:question.name')?.text).toBe('How likely are you to recommend us?');
    expect(byPath.get('0.0.2:question.lowLabel')?.text).toBe('Not likely');
    expect(byPath.get('0.0.3:question.options.1.label')?.text).toBe('Blue');
    expect(byPath.get('0.0.4:image.url')?.optional).toBe(true);
    expect(byPath.get('0.0.5:embed.url')?.optional).toBe(true);
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
  it('flags the units whose source text changed since the backup snapshot', () => {
    const source = createSourceContents();
    const backup = deepClone(source);
    expect(collectOutdatedUnitPaths(source, backup).size).toBe(0);

    getElement<ContentEditorButtonElement>(source, 1).data.text = 'Continue';
    const outdated = collectOutdatedUnitPaths(source, backup);
    expect(outdated).toEqual(new Set([`${formatElementPath(0, 0, 1)}:button.text`]));
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
    expect(collectOutdatedVersionDataPaths(ContentDataType.CHECKLIST, source, backup).size).toBe(0);

    source.items[1].name = 'Create your first flow';
    const outdated = collectOutdatedVersionDataPaths(ContentDataType.CHECKLIST, source, backup);
    expect(outdated).toEqual(new Set(['items.item-2:name']));
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
