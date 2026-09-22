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
import {
  ContentActionsItemType,
  ContentDataType,
  ContentEditorElementType,
  UserAttributes,
} from '@usertour/types';

import { serializeLinkTemplate } from './content';
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

/**
 * What a unit's value IS — the one property every consumer keys its behavior
 * on, so a new field only has to say which kind it is:
 *
 * - `text`: copy the user reads. Machine-translated, counted as missing while
 *   untranslated, stored exactly as sent (spaces between runs matter).
 * - `destination`: an href — a rich-text link, an image's click-through, a
 *   page-navigate action, a content-list entry's navigation. A localized page
 *   behind localized copy is per-locale content too, but no one translates a
 *   url: never machine-translated, blank means "keep the source", trimmed on
 *   save, any string the host can route (a relative path included).
 * - `media`: a src the SDK renders verbatim — image and embed urls. Like a
 *   destination, plus the absolute-http(s) bar: a bare word here is a silently
 *   broken image or iframe.
 */
export type TranslationUnitKind = 'text' | 'destination' | 'media';

/** Whether a unit may stay untranslated without counting as missing. */
export const isTranslationUnitOptional = (kind: TranslationUnitKind): boolean => {
  return kind !== 'text';
};

/**
 * WHICH value a unit is, independent of where it sits — the registry every
 * presentation keys on (the dashboard maps each to a row label). A walker
 * that emits a unit names its field here first, so a new field cannot reach
 * a consumer that has no idea how to show it: the dashboard's label table is
 * typed over this list and fails to compile until it says what to do.
 */
export const TRANSLATION_UNIT_FIELDS = [
  // Rich text
  'text',
  'fallback',
  'link.url',
  // Elements
  'button.text',
  'navigate.url',
  'image.url',
  'image.alt',
  'image.link.url',
  'embed.url',
  'question.name',
  'question.lowLabel',
  'question.highLabel',
  'question.placeholder',
  'question.buttonText',
  'question.otherPlaceholder',
  'question.option',
  // Version data
  'buttonText',
  'headerText',
  'title',
  'readMoreLabel',
  'tab.name',
  'block.name',
  'item.name',
  'item.description',
  'contentItem.label',
] as const;
export type TranslationUnitField = (typeof TRANSLATION_UNIT_FIELDS)[number];

/** The editor element a unit belongs to — what groups its rows on screen. */
export interface TranslationUnitElement {
  /** Element address in unit-path terms (`g.c.e`, prefixed inside version data). */
  path: string;
  type: ContentEditorElementType;
}

/**
 * The id-keyed container a version-data unit belongs to — a checklist task, a
 * resource-center block — named by what the author called it, so its rows
 * read as one thing on screen.
 */
export interface TranslationUnitGroup {
  path: string;
  title: string;
}

export interface TranslatableUnit {
  /** Positional address of the text within the tree: `g.c.e:field[...]`. */
  path: string;
  text: string;
  kind: TranslationUnitKind;
  field: TranslationUnitField;
}

interface TranslatableFieldVisit {
  path: string;
  sourceText: string;
  /** Aligned partner text; undefined when the partner is absent or misaligned. */
  partnerText: string | undefined;
  kind: TranslationUnitKind;
  field: TranslationUnitField;
  /** Values a field label interpolates (an option's index, a chip's attribute). */
  fieldArgs?: Record<string, string>;
  element?: TranslationUnitElement;
  group?: TranslationUnitGroup;
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

/**
 * Whether a source text is something to translate. Whitespace-only text is not:
 * rich text splits "**Save** *now*" into three runs, the middle one a lone
 * space. A translation cannot BE whitespace-only either (blank means "keep the
 * source"), so counting such a run as a unit left it permanently "missing".
 * Delivery falls back to the source for it, so the space still renders.
 */
export const isTranslatableText = (sourceText: string): boolean => {
  return sourceText.trim() !== '';
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

// ---------------------------------------------------------------------------
// Destinations — one concept, three stores.
//
// A destination is authored as a rich-text template (user-attribute chips
// allowed) that delivery serializes through the shared link-template grammar.
// Where that template lives differs by carrier: a rich-text link node and an
// image's click-through keep it in `data` and mirror the plain string into
// `url` for url-only readers; a page-navigate action keeps it in its `value`;
// a resource-center content-list entry in `navigateUrl`. The store describes
// the location so the rules — which destinations localize, how a translated
// one is written, how an unreadable one is carried — are written once.
// ---------------------------------------------------------------------------

export interface DestinationStore {
  container: Record<string, unknown>;
  /** The rich-text template — the authority delivery renders from. */
  templateKey: string;
  /** A plain-string mirror some readers consult instead of the template. */
  urlKey?: string;
}

/** A rich-text link node, or an image element's `link` object. */
export const linkDestination = (link: object): DestinationStore => {
  return { container: link as Record<string, unknown>, templateKey: 'data', urlKey: 'url' };
};

/** The `data` of a page-navigate action (`{ value, openType }`). */
export const navigateDestination = (actionData: object): DestinationStore => {
  return { container: actionData as Record<string, unknown>, templateKey: 'value' };
};

/** A resource-center content-list entry (`{ navigateUrl, navigateOpenType }`). */
export const contentListDestination = (contentItem: object): DestinationStore => {
  return { container: contentItem as Record<string, unknown>, templateKey: 'navigateUrl' };
};

/**
 * The single-string destination of a store: its template when present — read
 * with the SAME grammar delivery renders with — else the plain mirror.
 * Undefined — not localizable — when the template contains user-attribute
 * chips: such a destination has no one string a translator could safely
 * replace.
 */
export const readDestination = (store: DestinationStore): string | undefined => {
  const template = store.container[store.templateKey];
  if (isArray(template)) {
    return serializeLinkTemplate(template, () => undefined);
  }
  return store.urlKey ? toText(store.container[store.urlKey]) : '';
};

/**
 * The destination as a url checker should see it: a dynamic template has its
 * user-attribute chips stood in for by a placeholder, so `javascript:{{x}}`
 * cannot hide behind the chip that makes the walkers skip it.
 */
const readDestinationForValidation = (store: DestinationStore): string => {
  const template = store.container[store.templateKey];
  if (isArray(template)) {
    return serializeLinkTemplate(template, () => 'attribute') ?? '';
  }
  return store.urlKey ? toText(store.container[store.urlKey]) : '';
};

/**
 * Writes a localized destination into every store a reader may consult.
 * Trimmed: a whitespace-only value must collapse to the '' keep-original
 * sentinel instead of shipping as a self-link href.
 */
export const writeDestination = (store: DestinationStore, value: string): void => {
  const url = value.trim();
  store.container[store.templateKey] = [{ type: 'paragraph', children: [{ text: url }] }];
  if (store.urlKey) {
    store.container[store.urlKey] = url;
  }
};

/** The working-copy opaque-destination handler: inherit the stored value verbatim. */
const inheritStoredDestination = (
  store: DestinationStore,
  partnerStore: DestinationStore | undefined,
): void => {
  if (!partnerStore) {
    return;
  }
  const template = partnerStore.container[partnerStore.templateKey];
  const url = partnerStore.urlKey ? partnerStore.container[partnerStore.urlKey] : undefined;
  if (template === undefined && url === undefined) {
    return;
  }
  store.container[store.templateKey] = isArray(template) ? deepClone(template) : template;
  if (store.urlKey) {
    store.container[store.urlKey] = url;
  }
};

/**
 * The one rule every destination write clears, source and translation alike:
 * a path the host routes (relative, or absolute over http(s)), or a mail /
 * phone link. A scheme that runs code or smuggles a document (`javascript:`,
 * `data:`, `vbscript:`, …) is refused — the value lands verbatim in an href.
 * The scheme is read the way a browser reads it — the WHATWG parser strips
 * tabs, newlines and leading control characters, so `java\tscript:` IS
 * `javascript:` — never by pattern-matching the text. A value that does not
 * parse at all is refused too. Blank passes: it means "keep the original".
 */
const SAFE_DESTINATION_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const RELATIVE_DESTINATION_BASE = 'https://relative.invalid/';

export const isSafeDestinationUrl = (value: string): boolean => {
  const url = value.trim();
  if (url === '') {
    return true;
  }
  try {
    return SAFE_DESTINATION_SCHEMES.has(new URL(url, RELATIVE_DESTINATION_BASE).protocol);
  } catch {
    return false;
  }
};

interface WalkOptions {
  /** Suppress link handling entirely (block names — delivery never renders a link url there). */
  omitLinkUnits?: boolean;
  /**
   * Emit a unit for an empty (but still static) destination too. The
   * translation-applier walks a WORKING tree, where a localizable destination
   * was blanked to '' — without this its unit path would stop being
   * addressable and an imported url for it would be silently dropped.
   */
  includeEmptyLinkUnits?: boolean;
  /**
   * Called for a destination that emits no unit (dynamic chip template, or an
   * empty/absent destination). Working-copy builds use it to carry the stored
   * row's destination into the clone, so a save can only overwrite what this
   * session could actually read — without it, making a destination dynamic
   * would erase its stored translation on the next unrelated save. Delivery
   * merges pass no handler: an unreadable destination stays source-managed
   * (the stored value is preserved but dormant, and revives when the source
   * destination becomes a plain non-empty string again).
   */
  onOpaqueDestination?: (
    store: DestinationStore,
    partnerStore: DestinationStore | undefined,
  ) => void;
  /**
   * Visit dynamic destinations too, chips stood in for by a placeholder —
   * for url validation, which must see every destination, translatable or
   * not. Never used by a walk that writes.
   */
  dynamicDestinationsAsPlaceholders?: boolean;
}

/**
 * The one visit every destination goes through, whatever its store: a plain
 * non-empty destination travels as a `destination` unit — swappable like
 * media urls, untranslated keeps the source; anything else is opaque.
 */
const visitDestination = (
  store: DestinationStore,
  partnerStore: DestinationStore | undefined,
  path: string,
  field: TranslationUnitField,
  visitor: TranslatableFieldVisitor,
  opts: WalkOptions,
): void => {
  const sourceUrl = readDestination(store);
  if (sourceUrl || (sourceUrl === '' && opts.includeEmptyLinkUnits)) {
    visitor({
      path,
      sourceText: sourceUrl,
      partnerText: partnerStore ? readDestination(partnerStore) : undefined,
      kind: 'destination',
      field,
      assign: (value) => writeDestination(store, value),
    });
    return;
  }
  if (sourceUrl === undefined && opts.dynamicDestinationsAsPlaceholders) {
    visitor({
      path,
      sourceText: readDestinationForValidation(store),
      partnerText: undefined,
      kind: 'destination',
      field,
      assign: () => undefined,
    });
    return;
  }
  opts.onOpaqueDestination?.(store, partnerStore);
};

type ActionLike = { type?: unknown; data?: unknown };

const isNavigateAction = (action: unknown): action is ActionLike & { data: object } => {
  const candidate = action as ActionLike | null | undefined;
  return (
    candidate?.type === ContentActionsItemType.PAGE_NAVIGATE &&
    Boolean(candidate.data) &&
    typeof candidate.data === 'object'
  );
};

const navigateActionsOf = (actions: unknown): (ActionLike & { data: object })[] => {
  return isArray(actions) ? actions.filter(isNavigateAction) : [];
};

/**
 * Action lists ride on every clickable thing — buttons, questions, checklist
 * tasks, launchers, resource-center blocks. The only action whose payload is
 * per-locale content is page-navigate (its destination); the rest carry
 * nothing a translator could change. Navigates pair by their order among the
 * list's navigates, not by action id: the builder mints ids but the API
 * representation has none to echo, so a write there re-mints every id and an
 * id-keyed translation would silently detach. Order is unambiguous by the
 * builder's own rule — a navigate is a singleton per list (the action schema's
 * `repeatable` defaults to false; only run-javascript repeats), so there is
 * never a second one to confuse it with.
 */
const walkActions = (
  actions: unknown,
  partnerActions: unknown,
  pathPrefix: string,
  visitor: TranslatableFieldVisitor,
  opts: WalkOptions,
): void => {
  const partnerNavigates = navigateActionsOf(partnerActions);
  navigateActionsOf(actions).forEach((action, index) => {
    const partnerAction = partnerNavigates[index];
    visitDestination(
      navigateDestination(action.data),
      partnerAction ? navigateDestination(partnerAction.data) : undefined,
      `${pathPrefix}.${index}:navigate.url`,
      'navigate.url',
      visitor,
      opts,
    );
  });
};

const walkSlateNodes = (
  nodes: SlateNode[],
  partnerNodes: SlateNode[] | undefined,
  path: string,
  visitor: TranslatableFieldVisitor,
  opts: WalkOptions = {},
  leafField: TranslationUnitField = 'text',
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
        kind: 'text',
        field: leafField,
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
      walkSlateNodes(
        node.children as SlateNode[],
        partnerChildren,
        nodePath,
        visitor,
        opts,
        leafField,
      );
    }
    // A user-attribute chip renders its fallback whenever the attribute is
    // unset — copy the user reads, in the source language unless translated.
    if (node.type === 'user-attribute') {
      const partnerChip = partnerNode?.type === 'user-attribute' ? partnerNode : undefined;
      visitor({
        path: `${nodePath}:fallback`,
        sourceText: toText(node.fallback),
        partnerText: toPartnerText(partnerChip?.fallback),
        kind: 'text',
        field: 'fallback',
        fieldArgs: { attribute: toText(node.attrCode) },
        assign: (value) => {
          node.fallback = value;
        },
      });
    }
    // Inline links: the destination is per-locale content too (a localized
    // page behind localized anchor text).
    if (node.type === 'link' && !opts.omitLinkUnits) {
      const partnerLink = partnerNode?.type === 'link' ? partnerNode : undefined;
      visitDestination(
        linkDestination(node),
        partnerLink ? linkDestination(partnerLink) : undefined,
        `${nodePath}:link.url`,
        'link.url',
        visitor,
        opts,
      );
    }
  });
};

// ---------------------------------------------------------------------------
// Stored-row schema versions — a saved VersionOnLocalization row is a
// structural clone of the source, so every field that was not yet a unit when
// the row was written holds the SOURCE value verbatim, not a translation.
// Once such a field becomes a unit, readers would mistake the clone for a
// deliberate translator pin (a value equal to the source is a legitimate pin,
// so it cannot be told apart by comparison). Each version below names the
// stores that became units with it; the deploy-time backfill blanks exactly
// those stores on rows stamped below that version — never on rows at or
// above it, whose values a translator wrote — and the server stamps the
// current version on every localized write.
// ---------------------------------------------------------------------------

/** Version 1: rich-text link nodes and image click-through links. */
const LOCALIZED_LINKS_SCHEMA_VERSION = 1;
/** Version 2: page-navigate actions, content-list navigation, image alt, chip fallback. */
const LOCALIZED_DESTINATIONS_AND_ATTRIBUTES_SCHEMA_VERSION = 2;

export const LOCALIZED_UNITS_SCHEMA_VERSION = LOCALIZED_DESTINATIONS_AND_ATTRIBUTES_SCHEMA_VERSION;

const blankStoredDestination = (store: DestinationStore): boolean => {
  const mirrorBlank = store.urlKey === undefined || store.container[store.urlKey] === '';
  if (mirrorBlank && readDestination(store) === '') {
    return false;
  }
  writeDestination(store, '');
  return true;
};

const blankStoredText = (record: Record<string, unknown>, key: string): boolean => {
  if (typeof record[key] !== 'string' || record[key] === '') {
    return false;
  }
  record[key] = '';
  return true;
};

/** Blanks the stores a record holds that became units with `version`. */
const blankStoresIntroducedIn = (version: number, record: Record<string, unknown>): boolean => {
  switch (version) {
    case LOCALIZED_LINKS_SCHEMA_VERSION: {
      if (record.type === 'link' && isArray(record.children)) {
        return blankStoredDestination(linkDestination(record));
      }
      if (
        record.type === ContentEditorElementType.IMAGE &&
        record.link &&
        typeof record.link === 'object'
      ) {
        return blankStoredDestination(linkDestination(record.link));
      }
      return false;
    }
    case LOCALIZED_DESTINATIONS_AND_ATTRIBUTES_SCHEMA_VERSION: {
      if (isNavigateAction(record)) {
        return blankStoredDestination(navigateDestination(record.data));
      }
      if (typeof record.contentId === 'string' && isArray(record.navigateUrl)) {
        return blankStoredDestination(contentListDestination(record));
      }
      if (record.type === ContentEditorElementType.IMAGE) {
        return blankStoredText(record, 'alt');
      }
      if (record.type === 'user-attribute') {
        return blankStoredText(record, 'fallback');
      }
      return false;
    }
    default:
      return false;
  }
};

/**
 * Deploy-time normalization of a row stamped `storedSchemaVersion`: blanks
 * every store that became a unit in a later version to the '' keep-original
 * sentinel, so readers see "no override" instead of resurrecting the clone
 * once the source drifts. Generic deep walk — `localized` payloads are flow
 * cvid-maps or version-data objects, both embedding editor trees at
 * type-specific spots. Returns whether anything changed. Idempotent.
 */
export const blankLocalizedUnitClones = (value: unknown, storedSchemaVersion: number): boolean => {
  let changed = false;
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }
    const record = node as Record<string, unknown>;
    for (
      let version = storedSchemaVersion + 1;
      version <= LOCALIZED_UNITS_SCHEMA_VERSION;
      version += 1
    ) {
      changed = blankStoresIntroducedIn(version, record) || changed;
    }
    for (const child of Object.values(record)) {
      visit(child);
    }
  };
  visit(value);
  return changed;
};

type ScaleLikeData = {
  name?: string;
  lowLabel?: string;
  highLabel?: string;
  actions?: unknown;
};

type FreeTextData = {
  name?: string;
  placeholder?: string;
  buttonText?: string;
  actions?: unknown;
};

const walkElementFields = (
  element: ContentEditorElement,
  partnerElement: ContentEditorElement | undefined,
  elementPath: string,
  outerVisitor: TranslatableFieldVisitor,
  opts: WalkOptions = {},
): void => {
  // Every unit of an element carries the element, so rows group under it.
  const visitor: TranslatableFieldVisitor = (visit) => {
    outerVisitor({ ...visit, element: { path: elementPath, type: element.type } });
  };
  // Element fields are addressed by their field id (`<element>:<field>`).
  const visitField = (
    field: TranslationUnitField,
    sourceValue: unknown,
    partnerValue: unknown,
    kind: TranslationUnitKind,
    assign: (value: string) => void,
  ) => {
    visitor({
      path: `${elementPath}:${field}`,
      sourceText: toText(sourceValue),
      partnerText: toPartnerText(partnerValue),
      kind,
      field,
      assign,
    });
  };
  const visitActions = (fieldPath: string, actions: unknown, partnerActions: unknown) => {
    walkActions(actions, partnerActions, `${elementPath}:${fieldPath}`, visitor, opts);
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
        opts,
      );
      return;
    }
    case ContentEditorElementType.BUTTON: {
      const buttonData = element.data;
      if (!buttonData) {
        return;
      }
      const partnerButton = partnerElement as ContentEditorButtonElement | undefined;
      visitField('button.text', buttonData.text, partnerButton?.data?.text, 'text', (value) => {
        buttonData.text = value;
      });
      visitActions('button.actions', buttonData.actions, partnerButton?.data?.actions);
      return;
    }
    case ContentEditorElementType.IMAGE: {
      const imageElement = element;
      const partnerImage = partnerElement as ContentEditorImageElement | undefined;
      visitField('image.url', imageElement.url, partnerImage?.url, 'media', (value) => {
        imageElement.url = value;
      });
      visitField('image.alt', imageElement.alt, partnerImage?.alt, 'text', (value) => {
        imageElement.alt = value;
      });
      // The click-through link is the same store an inline text link is.
      const imageLink = imageElement.link;
      if (imageLink && typeof imageLink === 'object') {
        const partnerLink =
          partnerImage?.link && typeof partnerImage.link === 'object'
            ? partnerImage.link
            : undefined;
        visitDestination(
          linkDestination(imageLink),
          partnerLink ? linkDestination(partnerLink) : undefined,
          `${elementPath}:image.link.url`,
          'image.link.url',
          visitor,
          opts,
        );
      }
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
        kind: 'media',
        field: 'embed.url',
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
      visitField('question.name', data.name, partnerData?.name, 'text', (value) => {
        data.name = value;
      });
      visitField('question.lowLabel', data.lowLabel, partnerData?.lowLabel, 'text', (value) => {
        data.lowLabel = value;
      });
      visitField('question.highLabel', data.highLabel, partnerData?.highLabel, 'text', (value) => {
        data.highLabel = value;
      });
      visitActions('question.actions', data.actions, partnerData?.actions);
      return;
    }
    case ContentEditorElementType.SINGLE_LINE_TEXT:
    case ContentEditorElementType.MULTI_LINE_TEXT: {
      const data = element.data as FreeTextData | undefined;
      if (!data) {
        return;
      }
      const partnerData = (partnerElement as { data?: FreeTextData } | undefined)?.data;
      visitField('question.name', data.name, partnerData?.name, 'text', (value) => {
        data.name = value;
      });
      visitField(
        'question.placeholder',
        data.placeholder,
        partnerData?.placeholder,
        'text',
        (value) => {
          data.placeholder = value;
        },
      );
      visitField(
        'question.buttonText',
        data.buttonText,
        partnerData?.buttonText,
        'text',
        (value) => {
          data.buttonText = value;
        },
      );
      visitActions('question.actions', data.actions, partnerData?.actions);
      return;
    }
    case ContentEditorElementType.MULTIPLE_CHOICE: {
      const data = element.data;
      if (!data) {
        return;
      }
      const partnerData = (partnerElement as ContentEditorMultipleChoiceElement | undefined)?.data;
      visitField('question.name', data.name, partnerData?.name, 'text', (value) => {
        data.name = value;
      });
      visitField(
        'question.buttonText',
        data.buttonText,
        partnerData?.buttonText,
        'text',
        (value) => {
          data.buttonText = value;
        },
      );
      visitField(
        'question.otherPlaceholder',
        data.otherPlaceholder,
        partnerData?.otherPlaceholder,
        'text',
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
        visitor({
          path: `${elementPath}:question.options.${optionIndex}.label`,
          sourceText: toText(option.label),
          partnerText: toPartnerText(partnerOptions?.[optionIndex]?.label),
          kind: 'text',
          field: 'question.option',
          fieldArgs: { index: String(optionIndex + 1) },
          assign: (value) => {
            option.label = value;
          },
        });
      });
      visitActions('question.actions', data.actions, partnerData?.actions);
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
  opts: WalkOptions = {},
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
          opts,
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

/**
 * The aligned partner value that counts as a translation: any non-empty
 * string, INCLUDING one identical to the source — that's a deliberate pin
 * (the locale keeps this value when the source later changes). Rows saved
 * before link units existed carried the source destination verbatim as a
 * structural clone; those are normalized to '' by the deploy-time backfill
 * (blankLocalizedUnitClones), never re-guessed here by comparing
 * against the live source — the live source drifts, and the comparison would
 * resurrect retired urls or erase pins.
 */
const resolveTranslatedText = (visit: TranslatableFieldVisit): string | undefined => {
  const value = visit.partnerText;
  return value === undefined || value === '' ? undefined : value;
};

const createApplyVisitor = (fallback: LocalizedTextFallback): TranslatableFieldVisitor => {
  return (visit) => {
    const value = resolveTranslatedText(visit) ?? (fallback === 'source' ? visit.sourceText : '');
    if (value !== visit.sourceText) {
      visit.assign(value);
    }
  };
};

/**
 * Working-copy walks ('empty') inherit opaque destinations from the stored
 * row so a save can't erase them; delivery merges ('source') leave them
 * source-managed (preserved but dormant).
 */
const applyWalkOptions = (fallback: LocalizedTextFallback): WalkOptions => {
  return fallback === 'empty' ? { onOpaqueDestination: inheritStoredDestination } : {};
};

const createMissingCountVisitor = (count: { missing: number }): TranslatableFieldVisitor => {
  return (visit) => {
    if (isTranslationUnitOptional(visit.kind) || !isTranslatableText(visit.sourceText)) {
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
    if (resolveTranslatedText(visit) !== undefined) {
      translated.add(visit.path);
    }
  };
};

const createOutdatedVisitor = (
  outdated: Set<string>,
  translated: ReadonlySet<string>,
): TranslatableFieldVisitor => {
  return (visit) => {
    if (!isTranslatableText(visit.sourceText) || !translated.has(visit.path)) {
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
  walkTranslatableFields(
    clone,
    localized,
    createApplyVisitor(fallback),
    applyWalkOptions(fallback),
  );
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

/** All translatable texts of a tree (see isTranslatableText), in walk order. */
export const extractTranslatableUnits = (
  contents: ContentEditorRoot[] | undefined,
): TranslatableUnit[] => {
  const units: TranslatableUnit[] = [];
  walkTranslatableFields(contents ?? [], undefined, (visit) => {
    if (isTranslatableText(visit.sourceText)) {
      units.push({
        path: visit.path,
        text: visit.sourceText,
        kind: visit.kind,
        field: visit.field,
      });
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
  return (visit) =>
    visitor({
      ...visit,
      path: `${prefix}/${visit.path}`,
      element: visit.element
        ? { ...visit.element, path: `${prefix}/${visit.element.path}` }
        : undefined,
    });
};

/** Stamps every unit of a container walk with the container it belongs to. */
const withGroup = (
  group: TranslationUnitGroup,
  visitor: TranslatableFieldVisitor,
): TranslatableFieldVisitor => {
  return (visit) => visitor({ ...visit, group: visit.group ?? group });
};

/** The plain text of a rich-text label (a resource-center block name). */
const richTextToPlainText = (nodes: unknown): string => {
  if (!isArray(nodes)) {
    return '';
  }
  let text = '';
  for (const node of nodes as SlateNode[]) {
    if (!node || typeof node !== 'object') {
      continue;
    }
    if (typeof node.text === 'string') {
      text += node.text;
    } else if (isArray(node.children)) {
      text += richTextToPlainText(node.children);
    }
  }
  return text.trim();
};

const visitTextField = (
  visitor: TranslatableFieldVisitor,
  path: string,
  field: TranslationUnitField,
  sourceValue: unknown,
  partnerValue: unknown,
  assign: (value: string) => void,
): void => {
  visitor({
    path,
    sourceText: toText(sourceValue),
    partnerText: toPartnerText(partnerValue),
    kind: 'text',
    field,
    assign,
  });
};

const walkEmbeddedContents = (
  prefix: string,
  contents: unknown,
  partnerContents: unknown,
  visitor: TranslatableFieldVisitor,
  opts: WalkOptions = {},
): void => {
  if (!isArray(contents)) {
    return;
  }
  walkTranslatableFields(
    contents as ContentEditorRoot[],
    isArray(partnerContents) ? (partnerContents as ContentEditorRoot[]) : undefined,
    withPathPrefix(prefix, visitor),
    opts,
  );
};

const walkChecklistFields = (
  data: ChecklistData,
  partner: ChecklistData | undefined,
  visitor: TranslatableFieldVisitor,
  opts: WalkOptions = {},
): void => {
  visitTextField(
    visitor,
    'buttonText',
    'buttonText',
    data.buttonText,
    partner?.buttonText,
    (value) => {
      data.buttonText = value;
    },
  );
  walkEmbeddedContents('content', data.content, partner?.content, visitor, opts);
  if (!isArray(data.items)) {
    return;
  }
  const partnerItems = isArray(partner?.items) ? partner.items : [];
  for (const item of data.items) {
    if (!item?.id) {
      continue;
    }
    const partnerItem = partnerItems.find((candidate) => candidate?.id === item.id);
    const itemPath = `items.${item.id}`;
    const itemVisitor = withGroup({ path: itemPath, title: toText(item.name) }, visitor);
    visitTextField(
      itemVisitor,
      `${itemPath}:name`,
      'item.name',
      item.name,
      partnerItem?.name,
      (value) => {
        item.name = value;
      },
    );
    visitTextField(
      itemVisitor,
      `${itemPath}:description`,
      'item.description',
      item.description,
      partnerItem?.description,
      (value) => {
        item.description = value;
      },
    );
    walkActions(
      item.clickedActions,
      partnerItem?.clickedActions,
      `${itemPath}:clickedActions`,
      itemVisitor,
      opts,
    );
  }
};

const walkLauncherFields = (
  data: LauncherData,
  partner: LauncherData | undefined,
  visitor: TranslatableFieldVisitor,
  opts: WalkOptions = {},
): void => {
  visitTextField(
    visitor,
    'buttonText',
    'buttonText',
    data.buttonText,
    partner?.buttonText,
    (value) => {
      data.buttonText = value;
    },
  );
  walkActions(
    data.behavior?.actions,
    partner?.behavior?.actions,
    'behavior.actions',
    visitor,
    opts,
  );
  walkEmbeddedContents('tooltip', data.tooltip?.content, partner?.tooltip?.content, visitor, opts);
};

const walkBannerFields = (
  data: BannerData,
  partner: BannerData | undefined,
  visitor: TranslatableFieldVisitor,
  opts: WalkOptions = {},
): void => {
  walkEmbeddedContents('contents', data.contents, partner?.contents, visitor, opts);
};

const walkAnnouncementFields = (
  data: AnnouncementData,
  partner: AnnouncementData | undefined,
  visitor: TranslatableFieldVisitor,
  opts: WalkOptions = {},
): void => {
  visitTextField(visitor, 'title', 'title', data.title, partner?.title, (value) => {
    data.title = value;
  });
  visitTextField(
    visitor,
    'readMoreLabel',
    'readMoreLabel',
    data.readMoreLabel,
    partner?.readMoreLabel,
    (value) => {
      data.readMoreLabel = value;
    },
  );
  walkEmbeddedContents('introContent', data.introContent, partner?.introContent, visitor, opts);
  walkEmbeddedContents('detailContent', data.detailContent, partner?.detailContent, visitor, opts);
};

const walkResourceCenterFields = (
  data: ResourceCenterData,
  partner: ResourceCenterData | undefined,
  visitor: TranslatableFieldVisitor,
  opts: WalkOptions = {},
): void => {
  visitTextField(
    visitor,
    'buttonText',
    'buttonText',
    data.buttonText,
    partner?.buttonText,
    (value) => {
      data.buttonText = value;
    },
  );
  visitTextField(
    visitor,
    'headerText',
    'headerText',
    data.headerText,
    partner?.headerText,
    (value) => {
      data.headerText = value;
    },
  );
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
    visitTextField(
      visitor,
      `tabs.${tab.id}:name`,
      'tab.name',
      tab.name,
      partnerTab?.name,
      (value) => {
        tab.name = value;
      },
    );
    if (!isArray(tab.blocks)) {
      continue;
    }
    for (const block of tab.blocks) {
      if (!block?.id) {
        continue;
      }
      const partnerBlock = partnerBlocksById.get(block.id);
      const blockPath = `tabs.${tab.id}.blocks.${block.id}`;
      const blockVisitor = withGroup(
        { path: blockPath, title: richTextToPlainText(block.name) },
        visitor,
      );
      // Rich-text block labels (name: RichTextNode[]) are user-visible;
      // plain-string names (rich-text / divider blocks) are builder-only
      // labels and stay untranslated. Link units are suppressed here:
      // delivery serializes a block name to plain text (serializeBlockName)
      // and never renders a link url, so a unit would be a phantom — CSV rows
      // whose translation can't ever show anywhere.
      if (isArray(block.name)) {
        walkSlateNodes(
          block.name as SlateNode[],
          isArray(partnerBlock?.name) ? (partnerBlock.name as SlateNode[]) : undefined,
          `${blockPath}:name`,
          blockVisitor,
          { ...opts, omitLinkUnits: true },
          'block.name',
        );
      }
      const blockContent = (block as { content?: unknown }).content;
      const partnerBlockContent = (partnerBlock as { content?: unknown } | undefined)?.content;
      walkEmbeddedContents(
        `${blockPath}.content`,
        blockContent,
        partnerBlockContent,
        blockVisitor,
        opts,
      );
      walkActions(
        (block as { clickedActions?: unknown }).clickedActions,
        (partnerBlock as { clickedActions?: unknown } | undefined)?.clickedActions,
        `${blockPath}:clickedActions`,
        blockVisitor,
        opts,
      );
      walkContentListItems(blockPath, block, partnerBlock, blockVisitor, opts);
    }
  }
};

type ContentListItemLike = { contentId?: string; label?: string };

/**
 * Content-list entries can carry a display-name override (the referenced
 * content's admin name itself never localizes) and a navigation destination
 * of their own; items donate by contentId so reordering the list can never
 * misalign a translation.
 */
const walkContentListItems = (
  blockPath: string,
  block: unknown,
  partnerBlock: unknown,
  visitor: TranslatableFieldVisitor,
  opts: WalkOptions,
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
    const itemPath = `${blockPath}.contentItems.${contentItem.contentId}`;
    visitTextField(
      visitor,
      `${itemPath}:label`,
      'contentItem.label',
      contentItem.label,
      partnerItem?.label,
      (value) => {
        contentItem.label = value;
      },
    );
    visitDestination(
      contentListDestination(contentItem),
      partnerItem ? contentListDestination(partnerItem) : undefined,
      `${itemPath}:navigate.url`,
      'navigate.url',
      visitor,
      opts,
    );
  }
};

const walkVersionDataFields = (
  contentType: string,
  data: unknown,
  partner: unknown,
  visitor: TranslatableFieldVisitor,
  opts: WalkOptions = {},
): void => {
  if (!data || typeof data !== 'object') {
    return;
  }
  switch (contentType) {
    case ContentDataType.CHECKLIST:
      walkChecklistFields(
        data as ChecklistData,
        partner as ChecklistData | undefined,
        visitor,
        opts,
      );
      return;
    case ContentDataType.LAUNCHER:
      walkLauncherFields(data as LauncherData, partner as LauncherData | undefined, visitor, opts);
      return;
    case ContentDataType.BANNER:
      walkBannerFields(data as BannerData, partner as BannerData | undefined, visitor, opts);
      return;
    case ContentDataType.ANNOUNCEMENT:
      walkAnnouncementFields(
        data as AnnouncementData,
        partner as AnnouncementData | undefined,
        visitor,
        opts,
      );
      return;
    case ContentDataType.RESOURCE_CENTER:
      walkResourceCenterFields(
        data as ResourceCenterData,
        partner as ResourceCenterData | undefined,
        visitor,
        opts,
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
  walkVersionDataFields(
    contentType,
    clone,
    localized,
    createApplyVisitor('source'),
    applyWalkOptions('source'),
  );
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
  walkVersionDataFields(
    contentType,
    clone,
    localized,
    createApplyVisitor('empty'),
    applyWalkOptions('empty'),
  );
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

/**
 * True iff the value parses as an absolute http(s) URL. The bar every
 * user-supplied media URL must clear before it is stored: the SDK and the
 * builder render these verbatim into src on customers' pages, so a bare word
 * or a relative path becomes a silently broken image/iframe the author only
 * discovers in the browser.
 */
export const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export interface LocalizationTranslationUnit {
  path: string;
  sourceText: string;
  translatedText: string;
  /**
   * Destinations and media urls travel in the exchange so a CSV round-trip
   * can swap them, but they are not text: machine translation and missing
   * counts key off the kind (see TranslationUnitKind).
   */
  kind: TranslationUnitKind;
  field: TranslationUnitField;
  fieldArgs?: Record<string, string>;
  element?: TranslationUnitElement;
  group?: TranslationUnitGroup;
}

const createTranslationUnitCollector = (
  units: LocalizationTranslationUnit[],
): TranslatableFieldVisitor => {
  return (visit) => {
    if (!isTranslatableText(visit.sourceText)) {
      return;
    }
    units.push({
      path: visit.path,
      sourceText: visit.sourceText,
      translatedText: resolveTranslatedText(visit) ?? '',
      kind: visit.kind,
      field: visit.field,
      ...(visit.fieldArgs ? { fieldArgs: visit.fieldArgs } : {}),
      ...(visit.element ? { element: visit.element } : {}),
      ...(visit.group ? { group: visit.group } : {}),
    });
  };
};

/** Freshly resolved embed data keyed by the translated URL it was fetched for. */
export type LocalizedEmbedResolutions = ReadonlyMap<
  string,
  Pick<ContentEditorEmebedElement, 'parsedUrl' | 'oembed'>
>;

/**
 * Unit path → what to do with it: a non-blank string adds or replaces the
 * translation, `null` clears it (text falls back to untranslated; a media or
 * link url falls back to the source's), and a blank string keeps whatever is
 * stored — a caller echoing a unit back empty must not erase it.
 */
export type TranslationUnitChanges = ReadonlyMap<string, string | null>;

/**
 * Unknown paths are ignored. A changed embed URL drops the previous URL's
 * resolution data and installs the caller-provided one — without it the embed
 * renders empty until resolved from its editor row.
 */
const createTranslationApplier = (
  translations: TranslationUnitChanges,
  embedResolutions?: LocalizedEmbedResolutions,
): TranslatableFieldVisitor => {
  return (visit) => {
    const value = translations.get(visit.path);
    if (value === null) {
      visit.assign('');
      return;
    }
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

/** A destination as a url checker sees it (see collectContentsDestinations). */
export interface DestinationValue {
  path: string;
  value: string;
}

const createDestinationCollector = (destinations: DestinationValue[]): TranslatableFieldVisitor => {
  return (visit) => {
    if (visit.kind === 'destination' && visit.sourceText !== '') {
      destinations.push({ path: visit.path, value: visit.sourceText });
    }
  };
};

/**
 * Every destination of a tree — plain and dynamic alike (chips stood in for
 * by a placeholder) — for a url check. The same walk the translation write
 * validates with, so a source write and a translated write agree on what a
 * destination is and where one can sit.
 */
export const collectContentsDestinations = (
  contents: ContentEditorRoot[] | undefined,
): DestinationValue[] => {
  const destinations: DestinationValue[] = [];
  walkTranslatableFields(contents ?? [], undefined, createDestinationCollector(destinations), {
    dynamicDestinationsAsPlaceholders: true,
  });
  return destinations;
};

export const collectVersionDataDestinations = (
  contentType: string,
  data: unknown,
): DestinationValue[] => {
  const destinations: DestinationValue[] = [];
  walkVersionDataFields(contentType, data, undefined, createDestinationCollector(destinations), {
    dynamicDestinationsAsPlaceholders: true,
  });
  return destinations;
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
  translations: TranslationUnitChanges,
  embedResolutions?: LocalizedEmbedResolutions,
): ContentEditorRoot[] => {
  const working = applyLocalizedText(source, localized, 'empty');
  walkTranslatableFields(
    working,
    undefined,
    createTranslationApplier(translations, embedResolutions),
    { includeEmptyLinkUnits: true },
  );
  return working;
};

export const applyVersionDataTranslationUnits = <T>(
  contentType: string,
  source: T,
  localized: unknown,
  translations: TranslationUnitChanges,
  embedResolutions?: LocalizedEmbedResolutions,
): T => {
  const working = createLocalizedWorkingVersionData(contentType, source, localized);
  walkVersionDataFields(
    contentType,
    working,
    undefined,
    createTranslationApplier(translations, embedResolutions),
    { includeEmptyLinkUnits: true },
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

/**
 * Source snapshot saved alongside a flow translation map — what later reads
 * diff against the live source to flag drifted translations. Every current
 * step is re-snapshotted; steps the version no longer has keep their stored
 * snapshot, so drift detection still works if they revive.
 */
export const buildLocalizedFlowBackup = (
  steps: ReadonlyArray<{ cvid: string; data?: unknown }>,
  storedBackup: LocalizedFlowContent | undefined,
): LocalizedFlowContent => {
  const current = Object.fromEntries(
    steps.map((step) => [step.cvid, step.data]),
  ) as LocalizedFlowContent;
  if (!storedBackup) {
    return current;
  }
  const preserved = Object.entries(storedBackup).filter(([cvid]) => !(cvid in current));
  return { ...Object.fromEntries(preserved), ...current };
};

/** Source snapshot saved alongside a version-data translation. */
export const buildLocalizedVersionDataBackup = (sourceData: unknown): unknown => {
  return sourceData ?? {};
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
