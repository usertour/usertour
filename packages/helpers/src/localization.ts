import type {
  AnnouncementData,
  BannerData,
  ChecklistData,
  ContentEditorButtonElement,
  ContentEditorElement,
  ContentEditorEmebedElement,
  ContentEditorImageElement,
  ContentEditorMultipleChoiceElement,
  ContentEditorQuestionElement,
  ContentEditorRoot,
  LauncherData,
  ResourceCenterData,
} from '@usertour/types';
import { ContentDataType, ContentEditorElementType, UserAttributes } from '@usertour/types';

import { isQuestionElement } from './content-helper';
import { isArray } from './type-utils';
import { deepClone } from './utils';

/**
 * A localized editor tree is a structural clone of the source tree where
 * translatable text fields hold the translation, or an empty string when
 * untranslated. The walkers below pair a tree with a "partner" tree
 * positionally; wherever the partner's structure no longer matches (elements
 * added/removed/reordered, question cvid changed), the partner is treated as
 * absent for that subtree, so a drifted translation can never leak text into
 * the wrong node — it just falls back to untranslated.
 */

export interface TranslatableUnit {
  /** Positional address of the text within the tree: `g.c.e:field[...]`. */
  path: string;
  text: string;
  /** Optional units (image/embed URLs) may stay untranslated without counting as missing. */
  optional: boolean;
}

interface TranslatableFieldVisit {
  path: string;
  sourceText: string;
  /** Aligned partner text; undefined when the partner is absent or misaligned. */
  partnerText: string | undefined;
  optional: boolean;
  /** Writes into the walked tree (used by the clone-producing walks). */
  assign: (value: string) => void;
}

type TranslatableFieldVisitor = (visit: TranslatableFieldVisit) => void;

const toText = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const toPartnerText = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

/** Positional pairing is only trusted when both levels have the same arity. */
const alignChildren = <T>(children: T[] | undefined, expectedLength: number): T[] | undefined => {
  return isArray(children) && children.length === expectedLength ? children : undefined;
};

type SlateNode = {
  type?: string;
  text?: unknown;
  children?: unknown;
} & Record<string, unknown>;

const walkSlateNodes = (
  nodes: SlateNode[],
  partnerNodes: SlateNode[] | undefined,
  path: string,
  visitor: TranslatableFieldVisitor,
): void => {
  const aligned = isArray(partnerNodes) && partnerNodes.length === nodes.length;
  nodes.forEach((node, index) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    const partnerNode = aligned ? partnerNodes[index] : undefined;
    const nodePath = `${path}.${index}`;
    if (typeof node.text === 'string') {
      visitor({
        path: nodePath,
        sourceText: node.text,
        partnerText: toPartnerText(partnerNode?.text),
        optional: false,
        assign: (value) => {
          node.text = value;
        },
      });
      return;
    }
    if (isArray(node.children)) {
      const partnerChildren =
        partnerNode && partnerNode.type === node.type && isArray(partnerNode.children)
          ? (partnerNode.children as SlateNode[])
          : undefined;
      walkSlateNodes(node.children as SlateNode[], partnerChildren, nodePath, visitor);
    }
  });
};

type ScaleLikeData = {
  name?: string;
  lowLabel?: string;
  highLabel?: string;
};

type FreeTextData = {
  name?: string;
  placeholder?: string;
  buttonText?: string;
};

const walkElementFields = (
  element: ContentEditorElement,
  partnerElement: ContentEditorElement | undefined,
  elementPath: string,
  visitor: TranslatableFieldVisitor,
): void => {
  const visitField = (
    fieldPath: string,
    sourceValue: unknown,
    partnerValue: unknown,
    optional: boolean,
    assign: (value: string) => void,
  ) => {
    visitor({
      path: `${elementPath}:${fieldPath}`,
      sourceText: toText(sourceValue),
      partnerText: toPartnerText(partnerValue),
      optional,
      assign,
    });
  };

  switch (element.type) {
    case ContentEditorElementType.TEXT: {
      if (!isArray(element.data)) {
        return;
      }
      const partnerTextElement = partnerElement as { data?: unknown } | undefined;
      walkSlateNodes(
        element.data as SlateNode[],
        isArray(partnerTextElement?.data) ? (partnerTextElement?.data as SlateNode[]) : undefined,
        `${elementPath}:text`,
        visitor,
      );
      return;
    }
    case ContentEditorElementType.BUTTON: {
      const buttonData = element.data;
      if (!buttonData) {
        return;
      }
      const partnerButton = partnerElement as ContentEditorButtonElement | undefined;
      visitField('button.text', buttonData.text, partnerButton?.data?.text, false, (value) => {
        buttonData.text = value;
      });
      return;
    }
    case ContentEditorElementType.IMAGE: {
      const imageElement = element;
      const partnerImage = partnerElement as ContentEditorImageElement | undefined;
      visitField('image.url', imageElement.url, partnerImage?.url, true, (value) => {
        imageElement.url = value;
      });
      return;
    }
    case ContentEditorElementType.EMBED: {
      const embedElement = element;
      const partnerEmbed = partnerElement as ContentEditorEmebedElement | undefined;
      const sourceUrl = toText(embedElement.url);
      visitField('embed.url', sourceUrl, partnerEmbed?.url, true, (value) => {
        embedElement.url = value;
      });
      // A donated embed URL must travel with the partner's resolved embed data,
      // otherwise the iframe would still point at the source-language media.
      if (partnerEmbed && embedElement.url !== sourceUrl && embedElement.url === partnerEmbed.url) {
        embedElement.parsedUrl = partnerEmbed.parsedUrl;
        embedElement.oembed = partnerEmbed.oembed;
      }
      return;
    }
    case ContentEditorElementType.NPS:
    case ContentEditorElementType.STAR_RATING:
    case ContentEditorElementType.SCALE: {
      const data = element.data as ScaleLikeData | undefined;
      if (!data) {
        return;
      }
      const partnerData = (partnerElement as { data?: ScaleLikeData } | undefined)?.data;
      visitField('question.name', data.name, partnerData?.name, false, (value) => {
        data.name = value;
      });
      visitField('question.lowLabel', data.lowLabel, partnerData?.lowLabel, false, (value) => {
        data.lowLabel = value;
      });
      visitField('question.highLabel', data.highLabel, partnerData?.highLabel, false, (value) => {
        data.highLabel = value;
      });
      return;
    }
    case ContentEditorElementType.SINGLE_LINE_TEXT:
    case ContentEditorElementType.MULTI_LINE_TEXT: {
      const data = element.data as FreeTextData | undefined;
      if (!data) {
        return;
      }
      const partnerData = (partnerElement as { data?: FreeTextData } | undefined)?.data;
      visitField('question.name', data.name, partnerData?.name, false, (value) => {
        data.name = value;
      });
      visitField(
        'question.placeholder',
        data.placeholder,
        partnerData?.placeholder,
        false,
        (value) => {
          data.placeholder = value;
        },
      );
      visitField(
        'question.buttonText',
        data.buttonText,
        partnerData?.buttonText,
        false,
        (value) => {
          data.buttonText = value;
        },
      );
      return;
    }
    case ContentEditorElementType.MULTIPLE_CHOICE: {
      const data = element.data;
      if (!data) {
        return;
      }
      const partnerData = (partnerElement as ContentEditorMultipleChoiceElement | undefined)?.data;
      visitField('question.name', data.name, partnerData?.name, false, (value) => {
        data.name = value;
      });
      visitField(
        'question.buttonText',
        data.buttonText,
        partnerData?.buttonText,
        false,
        (value) => {
          data.buttonText = value;
        },
      );
      visitField(
        'question.otherPlaceholder',
        data.otherPlaceholder,
        partnerData?.otherPlaceholder,
        false,
        (value) => {
          data.otherPlaceholder = value;
        },
      );
      const sourceOptions = isArray(data.options) ? data.options : [];
      const partnerOptions = alignChildren(partnerData?.options, sourceOptions.length);
      sourceOptions.forEach((option, optionIndex) => {
        if (!option) {
          return;
        }
        visitField(
          `question.options.${optionIndex}.label`,
          option.label,
          partnerOptions?.[optionIndex]?.label,
          false,
          (value) => {
            option.label = value;
          },
        );
      });
      return;
    }
    default:
      return;
  }
};

const walkTranslatableFields = (
  contents: ContentEditorRoot[],
  partner: ContentEditorRoot[] | undefined,
  visitor: TranslatableFieldVisitor,
): void => {
  const partnerGroups = alignChildren(partner, contents.length);
  contents.forEach((group, groupIndex) => {
    if (!isArray(group?.children)) {
      return;
    }
    const partnerGroup = partnerGroups?.[groupIndex];
    const partnerColumns = alignChildren(partnerGroup?.children, group.children.length);
    group.children.forEach((column, columnIndex) => {
      if (!isArray(column?.children)) {
        return;
      }
      const partnerColumn = partnerColumns?.[columnIndex];
      const partnerItems = alignChildren(partnerColumn?.children, column.children.length);
      column.children.forEach((item, elementIndex) => {
        const element = item?.element;
        if (!element) {
          return;
        }
        let partnerElement = partnerItems?.[elementIndex]?.element;
        if (partnerElement?.type !== element.type) {
          partnerElement = undefined;
        }
        if (partnerElement && isQuestionElement(element)) {
          const sourceCvid = (element as ContentEditorQuestionElement).data?.cvid;
          const partnerCvid = (partnerElement as ContentEditorQuestionElement).data?.cvid;
          if (sourceCvid !== partnerCvid) {
            partnerElement = undefined;
          }
        }
        walkElementFields(
          element,
          partnerElement,
          formatElementPath(groupIndex, columnIndex, elementIndex),
          visitor,
        );
      });
    });
  });
};

/** Positional element address shared by unit paths and outdated markers. */
export const formatElementPath = (
  groupIndex: number,
  columnIndex: number,
  elementIndex: number,
): string => {
  return `${groupIndex}.${columnIndex}.${elementIndex}`;
};

type LocalizedTextFallback = 'source' | 'empty';

const createApplyVisitor = (fallback: LocalizedTextFallback): TranslatableFieldVisitor => {
  return (visit) => {
    const translated =
      visit.partnerText !== undefined && visit.partnerText !== '' ? visit.partnerText : undefined;
    const value = translated ?? (fallback === 'source' ? visit.sourceText : '');
    if (value !== visit.sourceText) {
      visit.assign(value);
    }
  };
};

const createMissingCountVisitor = (count: { missing: number }): TranslatableFieldVisitor => {
  return (visit) => {
    if (visit.optional || visit.sourceText === '') {
      return;
    }
    if (visit.partnerText === undefined || visit.partnerText === '') {
      count.missing += 1;
    }
  };
};

const createOutdatedVisitor = (outdated: Set<string>): TranslatableFieldVisitor => {
  return (visit) => {
    if (visit.sourceText === '') {
      return;
    }
    if (visit.partnerText !== visit.sourceText) {
      outdated.add(visit.path);
    }
  };
};

const applyLocalizedText = (
  source: ContentEditorRoot[] | undefined,
  localized: ContentEditorRoot[] | undefined,
  fallback: LocalizedTextFallback,
): ContentEditorRoot[] => {
  const clone = deepClone(source ?? []);
  walkTranslatableFields(clone, localized, createApplyVisitor(fallback));
  return clone;
};

/**
 * Delivery-side merge: source tree stays the authority for structure and
 * behavior; the localized tree only donates non-empty text. Untranslated or
 * misaligned fields fall back to the source text.
 */
export const mergeLocalizedEditorContents = (
  source: ContentEditorRoot[] | undefined,
  localized: ContentEditorRoot[] | undefined,
): ContentEditorRoot[] => {
  return applyLocalizedText(source, localized, 'source');
};

/**
 * Editor-side working copy: a clone of the source tree where translatable
 * fields hold the existing translation or an empty string, ready to be edited
 * and saved back as the localized tree.
 */
export const createLocalizedWorkingContents = (
  source: ContentEditorRoot[] | undefined,
  localized: ContentEditorRoot[] | undefined,
): ContentEditorRoot[] => {
  return applyLocalizedText(source, localized, 'empty');
};

/** All non-empty translatable texts of a tree, in walk order. */
export const extractTranslatableUnits = (
  contents: ContentEditorRoot[] | undefined,
): TranslatableUnit[] => {
  const units: TranslatableUnit[] = [];
  walkTranslatableFields(contents ?? [], undefined, (visit) => {
    if (visit.sourceText !== '') {
      units.push({ path: visit.path, text: visit.sourceText, optional: visit.optional });
    }
  });
  return units;
};

/** Required units of the source tree that have no aligned, non-empty translation. */
export const countMissingTranslations = (
  source: ContentEditorRoot[] | undefined,
  localized: ContentEditorRoot[] | undefined,
): number => {
  const count = { missing: 0 };
  walkTranslatableFields(source ?? [], localized, createMissingCountVisitor(count));
  return count.missing;
};

/**
 * Unit paths whose source text drifted since the translation was saved
 * (`backup` is the source snapshot taken at save time), so the editor can
 * flag the exact rows. Callers should skip rows that were never saved — an
 * absent backup flags everything.
 */
export const collectOutdatedUnitPaths = (
  source: ContentEditorRoot[] | undefined,
  backup: ContentEditorRoot[] | undefined,
): Set<string> => {
  const outdated = new Set<string>();
  walkTranslatableFields(source ?? [], backup, createOutdatedVisitor(outdated));
  return outdated;
};

// ---------------------------------------------------------------------------
// Version-data localization — non-flow content types keep their translatable
// text in `version.data` instead of steps. The same clone/merge discipline
// applies: the localized payload is a structural clone of the data object,
// translatable fields hold the translation or '' when untranslated, and
// id-keyed collections (checklist items, resource-center tabs/blocks) donate
// by id so reordering can never misalign a translation.
// ---------------------------------------------------------------------------

/** Prefixes a nested walk so its unit paths stay unique inside version data. */
const withPathPrefix = (
  prefix: string,
  visitor: TranslatableFieldVisitor,
): TranslatableFieldVisitor => {
  return (visit) => visitor({ ...visit, path: `${prefix}/${visit.path}` });
};

const visitTextField = (
  visitor: TranslatableFieldVisitor,
  path: string,
  sourceValue: unknown,
  partnerValue: unknown,
  assign: (value: string) => void,
): void => {
  visitor({
    path,
    sourceText: toText(sourceValue),
    partnerText: toPartnerText(partnerValue),
    optional: false,
    assign,
  });
};

const walkEmbeddedContents = (
  prefix: string,
  contents: unknown,
  partnerContents: unknown,
  visitor: TranslatableFieldVisitor,
): void => {
  if (!isArray(contents)) {
    return;
  }
  walkTranslatableFields(
    contents as ContentEditorRoot[],
    isArray(partnerContents) ? (partnerContents as ContentEditorRoot[]) : undefined,
    withPathPrefix(prefix, visitor),
  );
};

const walkChecklistFields = (
  data: ChecklistData,
  partner: ChecklistData | undefined,
  visitor: TranslatableFieldVisitor,
): void => {
  visitTextField(visitor, 'buttonText', data.buttonText, partner?.buttonText, (value) => {
    data.buttonText = value;
  });
  walkEmbeddedContents('content', data.content, partner?.content, visitor);
  if (!isArray(data.items)) {
    return;
  }
  const partnerItems = isArray(partner?.items) ? partner.items : [];
  for (const item of data.items) {
    if (!item?.id) {
      continue;
    }
    const partnerItem = partnerItems.find((candidate) => candidate?.id === item.id);
    visitTextField(visitor, `items.${item.id}:name`, item.name, partnerItem?.name, (value) => {
      item.name = value;
    });
    visitTextField(
      visitor,
      `items.${item.id}:description`,
      item.description,
      partnerItem?.description,
      (value) => {
        item.description = value;
      },
    );
  }
};

const walkLauncherFields = (
  data: LauncherData,
  partner: LauncherData | undefined,
  visitor: TranslatableFieldVisitor,
): void => {
  visitTextField(visitor, 'buttonText', data.buttonText, partner?.buttonText, (value) => {
    data.buttonText = value;
  });
  walkEmbeddedContents('tooltip', data.tooltip?.content, partner?.tooltip?.content, visitor);
};

const walkBannerFields = (
  data: BannerData,
  partner: BannerData | undefined,
  visitor: TranslatableFieldVisitor,
): void => {
  walkEmbeddedContents('contents', data.contents, partner?.contents, visitor);
};

const walkAnnouncementFields = (
  data: AnnouncementData,
  partner: AnnouncementData | undefined,
  visitor: TranslatableFieldVisitor,
): void => {
  visitTextField(visitor, 'title', data.title, partner?.title, (value) => {
    data.title = value;
  });
  visitTextField(visitor, 'readMoreLabel', data.readMoreLabel, partner?.readMoreLabel, (value) => {
    data.readMoreLabel = value;
  });
  walkEmbeddedContents('introContent', data.introContent, partner?.introContent, visitor);
  walkEmbeddedContents('detailContent', data.detailContent, partner?.detailContent, visitor);
};

const walkResourceCenterFields = (
  data: ResourceCenterData,
  partner: ResourceCenterData | undefined,
  visitor: TranslatableFieldVisitor,
): void => {
  visitTextField(visitor, 'buttonText', data.buttonText, partner?.buttonText, (value) => {
    data.buttonText = value;
  });
  visitTextField(visitor, 'headerText', data.headerText, partner?.headerText, (value) => {
    data.headerText = value;
  });
  if (!isArray(data.tabs)) {
    return;
  }
  // Blocks are matched by id across ALL partner tabs so a block moved to
  // another tab keeps its translation.
  const partnerTabs = isArray(partner?.tabs) ? partner.tabs : [];
  const partnerBlocksById = new Map(
    partnerTabs
      .flatMap((tab) => (isArray(tab?.blocks) ? tab.blocks : []))
      .filter((block) => block?.id)
      .map((block) => [block.id, block]),
  );
  for (const tab of data.tabs) {
    if (!tab?.id) {
      continue;
    }
    const partnerTab = partnerTabs.find((candidate) => candidate?.id === tab.id);
    visitTextField(visitor, `tabs.${tab.id}:name`, tab.name, partnerTab?.name, (value) => {
      tab.name = value;
    });
    if (!isArray(tab.blocks)) {
      continue;
    }
    for (const block of tab.blocks) {
      if (!block?.id) {
        continue;
      }
      const partnerBlock = partnerBlocksById.get(block.id);
      const blockPath = `tabs.${tab.id}.blocks.${block.id}`;
      // Rich-text block labels (name: RichTextNode[]) are user-visible;
      // plain-string names (rich-text / divider blocks) are builder-only
      // labels and stay untranslated.
      if (isArray(block.name)) {
        walkSlateNodes(
          block.name as SlateNode[],
          isArray(partnerBlock?.name) ? (partnerBlock.name as SlateNode[]) : undefined,
          `${blockPath}:name`,
          visitor,
        );
      }
      const blockContent = (block as { content?: unknown }).content;
      const partnerBlockContent = (partnerBlock as { content?: unknown } | undefined)?.content;
      walkEmbeddedContents(`${blockPath}.content`, blockContent, partnerBlockContent, visitor);
    }
  }
};

const walkVersionDataFields = (
  contentType: string,
  data: unknown,
  partner: unknown,
  visitor: TranslatableFieldVisitor,
): void => {
  if (!data || typeof data !== 'object') {
    return;
  }
  switch (contentType) {
    case ContentDataType.CHECKLIST:
      walkChecklistFields(data as ChecklistData, partner as ChecklistData | undefined, visitor);
      return;
    case ContentDataType.LAUNCHER:
      walkLauncherFields(data as LauncherData, partner as LauncherData | undefined, visitor);
      return;
    case ContentDataType.BANNER:
      walkBannerFields(data as BannerData, partner as BannerData | undefined, visitor);
      return;
    case ContentDataType.ANNOUNCEMENT:
      walkAnnouncementFields(
        data as AnnouncementData,
        partner as AnnouncementData | undefined,
        visitor,
      );
      return;
    case ContentDataType.RESOURCE_CENTER:
      walkResourceCenterFields(
        data as ResourceCenterData,
        partner as ResourceCenterData | undefined,
        visitor,
      );
      return;
    default:
      return;
  }
};

/** Content types whose translatable text lives in `version.data` (flow's lives in steps). */
export const isVersionDataLocalizable = (contentType: string): boolean => {
  return (
    contentType === ContentDataType.CHECKLIST ||
    contentType === ContentDataType.LAUNCHER ||
    contentType === ContentDataType.BANNER ||
    contentType === ContentDataType.ANNOUNCEMENT ||
    contentType === ContentDataType.RESOURCE_CENTER
  );
};

/**
 * Delivery-side merge for `version.data`: the source object stays the
 * authority for structure and behavior; the localized clone only donates
 * non-empty text.
 */
export const mergeLocalizedVersionData = <T>(
  contentType: string,
  source: T,
  localized: unknown,
): T => {
  const clone = deepClone(source);
  walkVersionDataFields(contentType, clone, localized, createApplyVisitor('source'));
  return clone;
};

/**
 * Editor-side working copy of `version.data`: translatable fields hold the
 * existing translation or an empty string, ready to be edited and saved back
 * as the localized payload.
 */
export const createLocalizedWorkingVersionData = <T>(
  contentType: string,
  source: T,
  localized: unknown,
): T => {
  const clone = deepClone(source);
  walkVersionDataFields(contentType, clone, localized, createApplyVisitor('empty'));
  return clone;
};

/** Required version-data units that have no aligned, non-empty translation. */
export const countMissingVersionDataTranslations = (
  contentType: string,
  source: unknown,
  localized: unknown,
): number => {
  const count = { missing: 0 };
  walkVersionDataFields(contentType, source, localized, createMissingCountVisitor(count));
  return count.missing;
};

/**
 * Version-data paths whose source text drifted since the translation was
 * saved. Same contract as collectOutdatedUnitPaths — skip rows that were
 * never saved.
 */
export const collectOutdatedVersionDataPaths = (
  contentType: string,
  source: unknown,
  backup: unknown,
): Set<string> => {
  const outdated = new Set<string>();
  walkVersionDataFields(contentType, source, backup, createOutdatedVisitor(outdated));
  return outdated;
};

// ---------------------------------------------------------------------------
// Translation exchange — flat source/translation pairs over the same walks,
// for export/import round-trips (CSV/XLIFF). Paths are the walker's unit
// paths, so a row exported from a version applies back onto the same version;
// rows whose path no longer matches simply don't apply.
// ---------------------------------------------------------------------------

export interface LocalizationTranslationUnit {
  path: string;
  sourceText: string;
  translatedText: string;
  /**
   * Media URLs (image/embed) travel in the exchange so a CSV round-trip can
   * swap them, but they are not text: machine translation and missing counts
   * must skip optional units.
   */
  optional: boolean;
}

const createTranslationUnitCollector = (
  units: LocalizationTranslationUnit[],
): TranslatableFieldVisitor => {
  return (visit) => {
    if (visit.sourceText === '') {
      return;
    }
    units.push({
      path: visit.path,
      sourceText: visit.sourceText,
      translatedText: visit.partnerText ?? '',
      optional: visit.optional,
    });
  };
};

/**
 * Imported cells only ever add or replace a translation: empty cells keep
 * the existing value, unknown paths are ignored.
 */
const createTranslationApplier = (
  translations: ReadonlyMap<string, string>,
): TranslatableFieldVisitor => {
  return (visit) => {
    const value = translations.get(visit.path);
    if (typeof value === 'string' && value.trim() !== '') {
      visit.assign(value);
    }
  };
};

export const extractContentsTranslationUnits = (
  source: ContentEditorRoot[] | undefined,
  localized: ContentEditorRoot[] | undefined,
): LocalizationTranslationUnit[] => {
  const units: LocalizationTranslationUnit[] = [];
  walkTranslatableFields(source ?? [], localized, createTranslationUnitCollector(units));
  return units;
};

export const extractVersionDataTranslationUnits = (
  contentType: string,
  source: unknown,
  localized: unknown,
): LocalizationTranslationUnit[] => {
  const units: LocalizationTranslationUnit[] = [];
  walkVersionDataFields(contentType, source, localized, createTranslationUnitCollector(units));
  return units;
};

export const applyContentsTranslationUnits = (
  source: ContentEditorRoot[] | undefined,
  localized: ContentEditorRoot[] | undefined,
  translations: ReadonlyMap<string, string>,
): ContentEditorRoot[] => {
  const working = applyLocalizedText(source, localized, 'empty');
  walkTranslatableFields(working, undefined, createTranslationApplier(translations));
  return working;
};

export const applyVersionDataTranslationUnits = <T>(
  contentType: string,
  source: T,
  localized: unknown,
  translations: ReadonlyMap<string, string>,
): T => {
  const working = createLocalizedWorkingVersionData(contentType, source, localized);
  walkVersionDataFields(contentType, working, undefined, createTranslationApplier(translations));
  return working;
};

// ---------------------------------------------------------------------------
// Locale matching
// ---------------------------------------------------------------------------

export interface LocaleTranslationCandidate {
  localization: { code: string };
}

/**
 * The locale a user should be served in: their explicit locale_code
 * attribute when set, else null — meaning the authored source. The locale
 * is never auto-detected (e.g. from the browser): content annotates the
 * customer's app, so the right language is the one the app renders in,
 * which only the customer knows — and delivery must stay a pure function
 * of the user data they control.
 */
export const resolveUserLocaleCode = (userAttributes: unknown): string | null => {
  const attributes = userAttributes as Record<string, unknown> | null | undefined;
  const explicit = attributes?.[UserAttributes.LOCALE_CODE];
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    return explicit;
  }
  return null;
};

/**
 * Pick the translation for a user's locale: exact code match first
 * (case-insensitive), then primary language subtag (`fr-CA` matches `fr`).
 */
export const matchTranslationByLocale = <T extends LocaleTranslationCandidate>(
  translations: T[],
  localeCode: string,
): T | undefined => {
  const normalize = (code: string) => code.trim().toLowerCase();
  const normalized = normalize(localeCode);
  const exact = translations.find(
    (translation) => normalize(translation.localization.code) === normalized,
  );
  if (exact) {
    return exact;
  }
  const primarySubtag = normalized.split('-')[0];
  return translations.find(
    (translation) => normalize(translation.localization.code).split('-')[0] === primarySubtag,
  );
};
