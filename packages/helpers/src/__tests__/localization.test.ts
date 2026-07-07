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
  collectOutdatedElementPaths,
  collectOutdatedVersionDataPaths,
  countMissingTranslations,
  countMissingVersionDataTranslations,
  createLocalizedWorkingContents,
  createLocalizedWorkingVersionData,
  extractTranslatableUnits,
  formatElementPath,
  matchTranslationByLocale,
  mergeLocalizedEditorContents,
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

describe('collectOutdatedElementPaths', () => {
  it('flags elements whose source text changed since the backup snapshot', () => {
    const source = createSourceContents();
    const backup = deepClone(source);
    expect(collectOutdatedElementPaths(source, backup).size).toBe(0);

    getElement<ContentEditorButtonElement>(source, 1).data.text = 'Continue';
    const outdated = collectOutdatedElementPaths(source, backup);
    expect(outdated).toEqual(new Set([formatElementPath(0, 0, 1)]));
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
    expect(outdated).toEqual(new Set(['items.item-2']));
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
