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
  ContentEditorRootColumn,
  LauncherData,
  LocalizedFlowContent,
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
  /**
   * EMBED url fields only: installs freshly resolved embed data alongside an
   * assigned URL — the widget renders embeds from parsedUrl/oembed, not the
   * raw url.
   */
  applyEmbedResolution?: (
    resolution: Pick<ContentEditorEmebedElement, 'parsedUrl' | 'oembed'>,
  ) => void;
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
      visitor({
        path: `${elementPath}:embed.url`,
        sourceText: sourceUrl,
        partnerText: toPartnerText(partnerEmbed?.url),
        optional: true,
        assign: (value) => {
          if (value !== embedElement.url) {
            // Resolution data belongs to the URL it was fetched for — a
            // stale oembed surviving a swap would render the wrong media.
            embedElement.parsedUrl = undefined;
            embedElement.oembed = undefined;
          }
          embedElement.url = value;
        },
        applyEmbedResolution: (resolution) => {
          embedElement.parsedUrl = resolution.parsedUrl;
          embedElement.oembed = resolution.oembed;
        },
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

/** Collects the paths whose aligned translation is non-empty. */
const createTranslatedPathCollector = (translated: Set<string>): TranslatableFieldVisitor => {
  return (visit) => {
    if (visit.partnerText !== undefined && visit.partnerText !== '') {
      translated.add(visit.path);
    }
  };
};

const createOutdatedVisitor = (
  outdated: Set<string>,
  translated: ReadonlySet<string>,
): TranslatableFieldVisitor => {
  return (visit) => {
    if (visit.sourceText === '' || !translated.has(visit.path)) {
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
 * (`backup` is the source snapshot taken at save time) AND that hold a
 * translation. A drift warning asks the translator to re-review an existing
 * translation — untranslated fields (e.g. added since the last save) stay
 * plain "missing" instead of doubling as outdated. Callers should skip rows
 * that were never saved — an absent backup flags every translated field.
 */
export const collectOutdatedUnitPaths = (
  source: ContentEditorRoot[] | undefined,
  backup: ContentEditorRoot[] | undefined,
  localized: ContentEditorRoot[] | undefined,
): Set<string> => {
  const translated = new Set<string>();
  walkTranslatableFields(source ?? [], localized, createTranslatedPathCollector(translated));
  const outdated = new Set<string>();
  walkTranslatableFields(source ?? [], backup, createOutdatedVisitor(outdated, translated));
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
      walkContentListItemLabels(blockPath, block, partnerBlock, visitor);
    }
  }
};

type ContentListItemLike = { contentId?: string; label?: string };

/**
 * Content-list entries can carry a display-name override (the referenced
 * content's admin name itself never localizes); items donate by contentId
 * so reordering the list can never misalign a translation.
 */
const walkContentListItemLabels = (
  blockPath: string,
  block: unknown,
  partnerBlock: unknown,
  visitor: TranslatableFieldVisitor,
): void => {
  const contentItems = (block as { contentItems?: unknown }).contentItems;
  if (!isArray(contentItems)) {
    return;
  }
  const partnerRaw = (partnerBlock as { contentItems?: unknown } | undefined)?.contentItems;
  const partnerItems = isArray(partnerRaw) ? (partnerRaw as ContentListItemLike[]) : [];
  for (const contentItem of contentItems as ContentListItemLike[]) {
    if (!contentItem?.contentId) {
      continue;
    }
    const partnerItem = partnerItems.find(
      (candidate) => candidate?.contentId === contentItem.contentId,
    );
    visitTextField(
      visitor,
      `${blockPath}.contentItems.${contentItem.contentId}:label`,
      contentItem.label,
      partnerItem?.label,
      (value) => {
        contentItem.label = value;
      },
    );
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
 * saved. Same contract as collectOutdatedUnitPaths — drift only flags
 * translated fields, and callers skip rows that were never saved.
 */
export const collectOutdatedVersionDataPaths = (
  contentType: string,
  source: unknown,
  backup: unknown,
  localized: unknown,
): Set<string> => {
  const translated = new Set<string>();
  walkVersionDataFields(contentType, source, localized, createTranslatedPathCollector(translated));
  const outdated = new Set<string>();
  walkVersionDataFields(contentType, source, backup, createOutdatedVisitor(outdated, translated));
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

/** Freshly resolved embed data keyed by the translated URL it was fetched for. */
export type LocalizedEmbedResolutions = ReadonlyMap<
  string,
  Pick<ContentEditorEmebedElement, 'parsedUrl' | 'oembed'>
>;

/**
 * Imported cells only ever add or replace a translation: empty cells keep
 * the existing value, unknown paths are ignored. An imported embed URL drops
 * the previous URL's resolution data and installs the caller-provided one —
 * without it the embed renders empty until resolved from its editor row.
 */
const createTranslationApplier = (
  translations: ReadonlyMap<string, string>,
  embedResolutions?: LocalizedEmbedResolutions,
): TranslatableFieldVisitor => {
  return (visit) => {
    const value = translations.get(visit.path);
    if (typeof value === 'string' && value.trim() !== '') {
      visit.assign(value);
      const resolution = embedResolutions?.get(value.trim());
      if (resolution && visit.applyEmbedResolution) {
        visit.applyEmbedResolution(resolution);
      }
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
  embedResolutions?: LocalizedEmbedResolutions,
): ContentEditorRoot[] => {
  const working = applyLocalizedText(source, localized, 'empty');
  walkTranslatableFields(
    working,
    undefined,
    createTranslationApplier(translations, embedResolutions),
  );
  return working;
};

export const applyVersionDataTranslationUnits = <T>(
  contentType: string,
  source: T,
  localized: unknown,
  translations: ReadonlyMap<string, string>,
  embedResolutions?: LocalizedEmbedResolutions,
): T => {
  const working = createLocalizedWorkingVersionData(contentType, source, localized);
  walkVersionDataFields(
    contentType,
    working,
    undefined,
    createTranslationApplier(translations, embedResolutions),
  );
  return working;
};

// ---------------------------------------------------------------------------
// Save payloads — a session may only overwrite what it was able to read.
//
// The working copy inherits only translations that positionally align with
// the current source; anything else in the stored row (subtrees the source
// structure outgrew, steps/items/tabs/blocks that were removed) is invisible
// in the editor. A wholesale save built from the working copy alone would
// silently erase all of it on the first unrelated keystroke. The builders
// below start from the working copy and graft back every stored fragment the
// session could not read — unless the translator retranslated inside that
// fragment (any non-empty field), in which case the new translation takes
// over wholesale. Preserved fragments stay misaligned, so readers (which
// align defensively) never deliver them; they simply revive if the source
// structure is restored.
// ---------------------------------------------------------------------------

const createTranslationProbe = (): {
  state: { found: boolean };
  visitor: TranslatableFieldVisitor;
} => {
  const state = { found: false };
  const visitor: TranslatableFieldVisitor = (visit) => {
    if (visit.sourceText !== '') {
      state.found = true;
    }
  };
  return { state, visitor };
};

const elementHasTranslations = (element: ContentEditorElement): boolean => {
  const probe = createTranslationProbe();
  walkElementFields(element, undefined, '', probe.visitor);
  return probe.state.found;
};

const columnHasTranslations = (column: ContentEditorRootColumn): boolean => {
  if (!isArray(column?.children)) {
    return false;
  }
  return column.children.some((item) => item?.element && elementHasTranslations(item.element));
};

const groupHasTranslations = (group: ContentEditorRoot): boolean => {
  if (!isArray(group?.children)) {
    return false;
  }
  return group.children.some((column) => columnHasTranslations(column));
};

const contentsHaveTranslations = (contents: ContentEditorRoot[]): boolean => {
  return contents.some((group) => groupHasTranslations(group));
};

const slateNodesHaveTranslations = (nodes: SlateNode[]): boolean => {
  const probe = createTranslationProbe();
  walkSlateNodes(nodes, undefined, '', probe.visitor);
  return probe.state.found;
};

/** Grafts stored slate subtrees the arity drift made unreadable; returns the array to keep. */
const graftSlateNodes = (working: SlateNode[], stored: SlateNode[] | undefined): SlateNode[] => {
  if (!isArray(stored)) {
    return working;
  }
  if (stored.length !== working.length) {
    return slateNodesHaveTranslations(working) ? working : deepClone(stored);
  }
  working.forEach((node, index) => {
    if (!node || typeof node !== 'object' || !isArray(node.children)) {
      return;
    }
    const storedNode = stored[index];
    const storedChildren =
      storedNode && storedNode.type === node.type && isArray(storedNode.children)
        ? (storedNode.children as SlateNode[])
        : undefined;
    node.children = graftSlateNodes(node.children as SlateNode[], storedChildren);
  });
  return working;
};

const graftElementTranslations = (
  element: ContentEditorElement,
  storedElement: ContentEditorElement,
): void => {
  if (element.type === ContentEditorElementType.TEXT) {
    const workingData = (element as { data?: unknown }).data;
    const storedData = (storedElement as { data?: unknown }).data;
    if (isArray(workingData)) {
      (element as { data: unknown }).data = graftSlateNodes(
        workingData as SlateNode[],
        isArray(storedData) ? (storedData as SlateNode[]) : undefined,
      );
    }
    return;
  }
  if (element.type === ContentEditorElementType.MULTIPLE_CHOICE) {
    const data = (element as ContentEditorMultipleChoiceElement).data;
    const storedData = (storedElement as ContentEditorMultipleChoiceElement).data;
    const options = isArray(data?.options) ? data.options : undefined;
    const storedOptions = storedData?.options;
    if (!options || !isArray(storedOptions) || storedOptions.length === options.length) {
      return;
    }
    const optionsHaveTranslations = options.some((option) => toText(option?.label) !== '');
    if (!optionsHaveTranslations) {
      data.options = deepClone(storedOptions);
    }
  }
};

/** Mutates `working` (a payload-owned clone) in place; returns the tree to keep. */
const graftContentsTranslations = (
  working: ContentEditorRoot[],
  stored: ContentEditorRoot[] | undefined,
): ContentEditorRoot[] => {
  if (!isArray(stored) || stored.length === 0) {
    return working;
  }
  const storedGroups = alignChildren(stored, working.length);
  if (!storedGroups) {
    return contentsHaveTranslations(working) ? working : deepClone(stored);
  }
  working.forEach((group, groupIndex) => {
    if (!isArray(group?.children)) {
      return;
    }
    const storedGroup = storedGroups[groupIndex];
    const storedColumns = alignChildren(storedGroup?.children, group.children.length);
    if (!storedColumns) {
      if (isArray(storedGroup?.children) && !groupHasTranslations(group)) {
        group.children = deepClone(storedGroup.children);
      }
      return;
    }
    group.children.forEach((column, columnIndex) => {
      if (!isArray(column?.children)) {
        return;
      }
      const storedColumn = storedColumns[columnIndex];
      const storedItems = alignChildren(storedColumn?.children, column.children.length);
      if (!storedItems) {
        if (isArray(storedColumn?.children) && !columnHasTranslations(column)) {
          column.children = deepClone(storedColumn.children);
        }
        return;
      }
      column.children.forEach((item, elementIndex) => {
        const element = item?.element;
        const storedElement = storedItems[elementIndex]?.element;
        if (!element || !storedElement) {
          return;
        }
        let aligned = storedElement.type === element.type;
        if (aligned && isQuestionElement(element)) {
          aligned =
            (element as ContentEditorQuestionElement).data?.cvid ===
            (storedElement as ContentEditorQuestionElement).data?.cvid;
        }
        if (!aligned) {
          if (!elementHasTranslations(element)) {
            item.element = deepClone(storedElement);
          }
          return;
        }
        graftElementTranslations(element, storedElement);
      });
    });
  });
  return working;
};

/**
 * Save payload for a flow translation map. Steps no longer on the version
 * (removed, or stripped of data) keep their stored entry verbatim, so a
 * restore or undo in the builder revives their translations.
 */
export const buildLocalizedFlowSavePayload = (
  working: LocalizedFlowContent,
  stored: LocalizedFlowContent | undefined,
): LocalizedFlowContent => {
  const payload: LocalizedFlowContent = {};
  if (stored) {
    for (const [cvid, contents] of Object.entries(stored)) {
      if (!(cvid in working)) {
        payload[cvid] = deepClone(contents);
      }
    }
  }
  for (const [cvid, contents] of Object.entries(working)) {
    payload[cvid] = graftContentsTranslations(deepClone(contents), stored?.[cvid]);
  }
  return payload;
};

const graftEmbeddedContents = (
  container: Record<string, unknown>,
  key: string,
  storedContents: unknown,
): void => {
  const workingContents = container[key];
  if (isArray(workingContents)) {
    container[key] = graftContentsTranslations(
      workingContents as ContentEditorRoot[],
      isArray(storedContents) ? (storedContents as ContentEditorRoot[]) : undefined,
    );
    return;
  }
  if (isArray(storedContents)) {
    // The source dropped this tree entirely — nothing was readable here, so
    // the stored translations survive for a potential revival.
    container[key] = deepClone(storedContents);
  }
};

const graftChecklistTranslations = (working: ChecklistData, stored: ChecklistData): void => {
  graftEmbeddedContents(working as unknown as Record<string, unknown>, 'content', stored.content);
  if (!isArray(working.items) || !isArray(stored.items)) {
    return;
  }
  const knownItemIds = new Set(working.items.map((item) => item?.id).filter(Boolean));
  for (const storedItem of stored.items) {
    if (storedItem?.id && !knownItemIds.has(storedItem.id)) {
      working.items.push(deepClone(storedItem));
    }
  }
};

const graftLauncherTranslations = (working: LauncherData, stored: LauncherData): void => {
  if (working.tooltip && typeof working.tooltip === 'object') {
    graftEmbeddedContents(
      working.tooltip as unknown as Record<string, unknown>,
      'content',
      stored.tooltip?.content,
    );
  }
};

const graftAnnouncementTranslations = (
  working: AnnouncementData,
  stored: AnnouncementData,
): void => {
  const container = working as unknown as Record<string, unknown>;
  graftEmbeddedContents(container, 'introContent', stored.introContent);
  graftEmbeddedContents(container, 'detailContent', stored.detailContent);
};

/** List entries the source no longer has keep their stored label for a revival. */
const graftContentListItemLabels = (block: unknown, storedBlock: unknown): void => {
  const workingItems = (block as { contentItems?: unknown }).contentItems;
  const storedRaw = (storedBlock as { contentItems?: unknown }).contentItems;
  if (!isArray(workingItems) || !isArray(storedRaw)) {
    return;
  }
  const knownIds = new Set(
    (workingItems as ContentListItemLike[]).map((item) => item?.contentId).filter(Boolean),
  );
  for (const storedItem of storedRaw as ContentListItemLike[]) {
    if (storedItem?.contentId && !knownIds.has(storedItem.contentId)) {
      (workingItems as ContentListItemLike[]).push(deepClone(storedItem));
    }
  }
};

const graftResourceCenterTranslations = (
  working: ResourceCenterData,
  stored: ResourceCenterData,
): void => {
  if (!isArray(working.tabs) || !isArray(stored.tabs)) {
    return;
  }
  const workingTabs = working.tabs;
  const storedTabs = stored.tabs;
  const workingTabIds = new Set(workingTabs.map((tab) => tab?.id).filter(Boolean));
  const workingBlockIds = new Set(
    workingTabs
      .flatMap((tab) => (isArray(tab?.blocks) ? tab.blocks : []))
      .map((block) => block?.id)
      .filter(Boolean),
  );
  const storedBlocksById = new Map(
    storedTabs
      .flatMap((tab) => (isArray(tab?.blocks) ? tab.blocks : []))
      .filter((block) => block?.id)
      .map((block) => [block.id, block]),
  );

  for (const tab of workingTabs) {
    if (!isArray(tab?.blocks)) {
      continue;
    }
    for (const block of tab.blocks) {
      if (!block?.id) {
        continue;
      }
      const storedBlock = storedBlocksById.get(block.id);
      if (!storedBlock) {
        continue;
      }
      if (isArray(block.name)) {
        block.name = graftSlateNodes(
          block.name as SlateNode[],
          isArray(storedBlock.name) ? (storedBlock.name as SlateNode[]) : undefined,
        ) as typeof block.name;
      }
      graftEmbeddedContents(
        block as unknown as Record<string, unknown>,
        'content',
        (storedBlock as { content?: unknown }).content,
      );
      graftContentListItemLabels(block, storedBlock);
    }
  }

  // Tabs the source no longer has survive wholesale (their blocks included);
  // removed blocks whose tab survives go back into that tab.
  for (const storedTab of storedTabs) {
    if (!storedTab?.id) {
      continue;
    }
    if (!workingTabIds.has(storedTab.id)) {
      workingTabs.push(deepClone(storedTab));
      continue;
    }
    if (!isArray(storedTab.blocks)) {
      continue;
    }
    const targetTab = workingTabs.find((tab) => tab?.id === storedTab.id);
    if (!targetTab || !isArray(targetTab.blocks)) {
      continue;
    }
    for (const storedBlock of storedTab.blocks) {
      if (storedBlock?.id && !workingBlockIds.has(storedBlock.id)) {
        targetTab.blocks.push(deepClone(storedBlock));
      }
    }
  }
};

/**
 * Save payload for a version-data translation: the working copy plus every
 * stored fragment the session could not read (drifted embedded trees,
 * removed id-keyed items/tabs/blocks) grafted back. Returns a fresh object;
 * neither input is mutated.
 */
export const buildLocalizedVersionDataSavePayload = <T>(
  contentType: string,
  working: T,
  stored: unknown,
): T => {
  const payload = deepClone(working);
  if (!payload || typeof payload !== 'object' || !stored || typeof stored !== 'object') {
    return payload;
  }
  switch (contentType) {
    case ContentDataType.CHECKLIST:
      graftChecklistTranslations(payload as unknown as ChecklistData, stored as ChecklistData);
      break;
    case ContentDataType.LAUNCHER:
      graftLauncherTranslations(payload as unknown as LauncherData, stored as LauncherData);
      break;
    case ContentDataType.BANNER:
      graftEmbeddedContents(
        payload as unknown as Record<string, unknown>,
        'contents',
        (stored as BannerData).contents,
      );
      break;
    case ContentDataType.ANNOUNCEMENT:
      graftAnnouncementTranslations(
        payload as unknown as AnnouncementData,
        stored as AnnouncementData,
      );
      break;
    case ContentDataType.RESOURCE_CENTER:
      graftResourceCenterTranslations(
        payload as unknown as ResourceCenterData,
        stored as ResourceCenterData,
      );
      break;
    default:
      break;
  }
  return payload;
};

// ---------------------------------------------------------------------------
// Duplicate support — duplicating a content regenerates question cvids and
// checklist item ids on the source (the copy must not share analytics
// identities with the original), which would orphan a copied translation:
// the walkers pair questions by cvid and items by id. The translation is a
// structural clone of the pre-duplicate source and the duplicate is a
// shape-preserving map of it, so the regenerated identifiers are written
// into the translation by position. Levels whose arity already drifted are
// left untouched — they were unreadable before the duplicate too.
// ---------------------------------------------------------------------------

/** Returns a fresh tree with the duplicate's question cvids; inputs are not mutated. */
export const remapContentsTranslationIdentifiers = (
  duplicated: ContentEditorRoot[] | undefined,
  localized: ContentEditorRoot[] | undefined,
): ContentEditorRoot[] | undefined => {
  if (!isArray(duplicated) || !isArray(localized)) {
    return localized;
  }
  const result = deepClone(localized);
  const resultGroups = alignChildren(result, duplicated.length);
  if (!resultGroups) {
    return result;
  }
  duplicated.forEach((group, groupIndex) => {
    if (!isArray(group?.children)) {
      return;
    }
    const resultColumns = alignChildren(resultGroups[groupIndex]?.children, group.children.length);
    if (!resultColumns) {
      return;
    }
    group.children.forEach((column, columnIndex) => {
      if (!isArray(column?.children)) {
        return;
      }
      const resultItems = alignChildren(
        resultColumns[columnIndex]?.children,
        column.children.length,
      );
      if (!resultItems) {
        return;
      }
      column.children.forEach((item, elementIndex) => {
        const element = item?.element;
        const resultElement = resultItems[elementIndex]?.element;
        if (!element || !resultElement || element.type !== resultElement.type) {
          return;
        }
        if (isQuestionElement(element)) {
          const questionData = (resultElement as ContentEditorQuestionElement).data;
          const duplicatedCvid = (element as ContentEditorQuestionElement).data?.cvid;
          if (questionData && duplicatedCvid) {
            questionData.cvid = duplicatedCvid;
          }
        }
      });
    });
  });
  return result;
};

/** Same remap over a whole flow translation map, keyed by the duplicate's steps. */
export const remapFlowTranslationIdentifiers = (
  duplicatedSteps: { cvid?: string | null; data?: unknown }[],
  localized: unknown,
): unknown => {
  if (!localized || typeof localized !== 'object') {
    return localized;
  }
  const result = deepClone(localized) as LocalizedFlowContent;
  for (const step of duplicatedSteps) {
    if (!step.cvid || !result[step.cvid]) {
      continue;
    }
    const remapped = remapContentsTranslationIdentifiers(
      isArray(step.data) ? (step.data as ContentEditorRoot[]) : undefined,
      result[step.cvid],
    );
    if (remapped) {
      result[step.cvid] = remapped;
    }
  }
  return result;
};

/** Version-data remap: checklist item ids by position, question cvids in embedded trees. */
export const remapVersionDataTranslationIdentifiers = (
  contentType: string,
  duplicatedData: unknown,
  localized: unknown,
): unknown => {
  if (!localized || typeof localized !== 'object' || !duplicatedData) {
    return localized;
  }
  if (contentType === ContentDataType.CHECKLIST) {
    const duplicated = duplicatedData as ChecklistData;
    const result = deepClone(localized) as ChecklistData;
    const remappedContent = remapContentsTranslationIdentifiers(
      isArray(duplicated.content) ? duplicated.content : undefined,
      isArray(result.content) ? result.content : undefined,
    );
    if (remappedContent) {
      result.content = remappedContent;
    }
    if (isArray(duplicated.items) && isArray(result.items)) {
      const items = alignChildren(result.items, duplicated.items.length);
      if (items) {
        duplicated.items.forEach((item, index) => {
          if (item?.id && items[index]) {
            items[index].id = item.id;
          }
        });
      }
    }
    return result;
  }
  if (contentType === ContentDataType.LAUNCHER) {
    const duplicated = duplicatedData as LauncherData;
    const result = deepClone(localized) as LauncherData;
    if (result.tooltip && typeof result.tooltip === 'object') {
      const remappedContent = remapContentsTranslationIdentifiers(
        isArray(duplicated.tooltip?.content) ? duplicated.tooltip.content : undefined,
        isArray(result.tooltip.content) ? result.tooltip.content : undefined,
      );
      if (remappedContent) {
        result.tooltip.content = remappedContent;
      }
    }
    return result;
  }
  // The other types are duplicated verbatim (tab/block ids survive), so
  // their translations copy over unchanged.
  return localized;
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
