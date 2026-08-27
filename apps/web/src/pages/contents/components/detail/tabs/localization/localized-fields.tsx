import { ArrowRightIcon, KeyboardIcon, ResetIcon } from '@radix-ui/react-icons';
import {
  assignLocalizedLinkUrl,
  deepClone,
  formatElementPath,
  getErrorMessage,
  getLocalizableLinkUrl,
} from '@usertour/helpers';
import { useAws, useQueryOembedInfoLazyQuery } from '@usertour/hooks';
import { ImageEditIcon, RiSparkling2Line, SpinnerIcon } from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import type {
  ContentEditorButtonElement,
  ContentEditorElement,
  ContentEditorEmebedElement,
  ContentEditorImageElement,
  ContentEditorMultipleChoiceElement,
  ContentEditorRoot,
  ContentEditorTextElement,
} from '@usertour/types';
import { ContentEditorElementType } from '@usertour/types';
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useToast,
} from '@usertour/ui';
import Upload from 'rc-upload';
import { UploadRequestOption } from 'rc-upload/lib/interface';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocalizationView } from './localization-view';

export const toText = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

// ---------------------------------------------------------------------------
// Slate helpers — a working tree is a structural clone of its source tree
// (createLocalizedWorkingContents / createLocalizedWorkingVersionData
// guarantee it), so both can be walked with the same index paths.
// ---------------------------------------------------------------------------

export type SlateNode = {
  text?: unknown;
  children?: unknown;
} & Record<string, unknown>;

export interface SlateLeafPair {
  path: number[];
  sourceText: string;
  value: string;
}

export interface SlateLinkPair {
  path: number[];
  sourceUrl: string;
  value: string;
}

export interface SlateFieldPairs {
  leafPairs: SlateLeafPair[];
  linkPairs: SlateLinkPair[];
}

/**
 * One walk collects both editable field kinds, so the positional-alignment
 * convention (working tree = structural clone of the source tree) lives in
 * exactly one place. Link destinations read/write through the helpers' link
 * accessors so the `data` template (what delivery renders) and the `url`
 * field stay in agreement; dynamic (user-attribute chip) and empty
 * destinations yield no pair and stay source-managed.
 */
export const collectSlateFieldPairs = (
  sourceNodes: SlateNode[],
  workingNodes: SlateNode[],
): SlateFieldPairs => {
  const leafPairs: SlateLeafPair[] = [];
  const linkPairs: SlateLinkPair[] = [];
  const visit = (source: SlateNode[], working: SlateNode[], path: number[]): void => {
    source.forEach((sourceNode, index) => {
      if (!sourceNode || typeof sourceNode !== 'object') {
        return;
      }
      const workingNode = working?.[index];
      const nodePath = [...path, index];
      if (typeof sourceNode.text === 'string') {
        if (sourceNode.text !== '') {
          leafPairs.push({
            path: nodePath,
            sourceText: sourceNode.text,
            value: toText(workingNode?.text),
          });
        }
        return;
      }
      if (sourceNode.type === 'link') {
        const sourceUrl = getLocalizableLinkUrl(sourceNode);
        if (sourceUrl) {
          linkPairs.push({
            path: nodePath,
            sourceUrl,
            value: (workingNode ? getLocalizableLinkUrl(workingNode) : undefined) ?? '',
          });
        }
      }
      if (Array.isArray(sourceNode.children)) {
        visit(
          sourceNode.children as SlateNode[],
          (Array.isArray(workingNode?.children) ? workingNode.children : []) as SlateNode[],
          nodePath,
        );
      }
    });
  };
  visit(sourceNodes, workingNodes, []);
  return { leafPairs, linkPairs };
};

/** Leaf-only view for trees that never render links (block names). */
export const collectSlateLeafPairs = (
  sourceNodes: SlateNode[],
  workingNodes: SlateNode[],
): SlateLeafPair[] => {
  return collectSlateFieldPairs(sourceNodes, workingNodes).leafPairs;
};

const getSlateNodeAtPath = (nodes: SlateNode[], path: number[]): SlateNode | undefined => {
  let node: SlateNode | undefined = nodes[path[0]];
  for (const index of path.slice(1)) {
    if (!node || !Array.isArray(node.children)) {
      return undefined;
    }
    node = (node.children as SlateNode[])[index];
  }
  return node;
};

export const setSlateLeafText = (nodes: SlateNode[], path: number[], text: string): void => {
  const node = getSlateNodeAtPath(nodes, path);
  if (node) {
    node.text = text;
  }
};

export const setSlateLinkUrl = (nodes: SlateNode[], path: number[], url: string): void => {
  const node = getSlateNodeAtPath(nodes, path);
  if (node && node.type === 'link') {
    assignLocalizedLinkUrl(node, url);
  }
};

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

export const FIELD_GRID = 'grid grid-cols-[8rem_1fr_1fr] items-start gap-3';

/** Amber "source changed" chip shared by rows and element sections. */
export const OutdatedChip = () => {
  const { t } = useTranslation();
  return (
    <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
      {t('contents.localization.sourceChanged')}
    </span>
  );
};

/**
 * Hover-revealed single-unit machine translation button, rendered inside the
 * translation input. Hidden when machine translation is unavailable.
 */
interface UnitTranslateButtonProps {
  sourceText: string;
  onTranslated: (value: string) => void;
}

const UnitTranslateButton = (props: UnitTranslateButtonProps) => {
  const { sourceText, onTranslated } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { translateText } = useLocalizationView();
  const [translating, setTranslating] = useState(false);

  if (!translateText) {
    return null;
  }

  const handleTranslate = async () => {
    if (translating) {
      return;
    }
    setTranslating(true);
    try {
      const translated = await translateText(sourceText);
      if (translated && translated.trim() !== '') {
        onTranslated(translated);
      } else {
        toast({
          variant: 'destructive',
          title: t('contents.localization.toast.translateFailure'),
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    } finally {
      setTranslating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'h-6 w-6 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100 group-focus-within/row:opacity-100',
        translating && 'opacity-100',
      )}
      aria-label={t('contents.localization.translateUnit')}
      onClick={() => void handleTranslate()}
    >
      {translating ? (
        <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RiSparkling2Line className="h-3.5 w-3.5" />
      )}
    </Button>
  );
};

export interface LocalizedFieldRowProps {
  label?: string;
  source: string;
  value: string;
  placeholder?: string;
  disabled: boolean;
  outdated?: boolean;
  /**
   * Reworking an outdated row is what its marker asks for — called on the
   * first edit (typing or per-row AI translate) so the owner removes the
   * row's path from the outdated set, which clears the dot, the section
   * chip and the card count together.
   */
  onOutdatedResolved?: () => void;
  onValueChange: (value: string) => void;
}

export const LocalizedFieldRow = (props: LocalizedFieldRowProps) => {
  const {
    label,
    source,
    value,
    placeholder,
    disabled,
    outdated,
    onOutdatedResolved,
    onValueChange,
  } = props;
  const { t } = useTranslation();
  const { showOnlyMissing, translateText } = useLocalizationView();

  const missing = value.trim() === '';
  if (showOnlyMissing && !missing) {
    return null;
  }

  const handleValueChange = (nextValue: string) => {
    if (outdated) {
      onOutdatedResolved?.();
    }
    onValueChange(nextValue);
  };

  return (
    <div className={FIELD_GRID}>
      <div className="pt-2 text-xs text-muted-foreground">{label}</div>
      <div className="min-h-9 whitespace-pre-wrap rounded-md bg-secondary px-3 py-2 text-sm">
        {source}
      </div>
      <div className="group/row relative">
        <Input
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(translateText && !disabled ? 'pr-14' : 'pr-8')}
          onChange={(event) => handleValueChange(event.target.value)}
        />
        <div className="absolute inset-y-0 right-2.5 flex items-center gap-1.5">
          {!disabled && (
            <UnitTranslateButton sourceText={source} onTranslated={handleValueChange} />
          )}
          {missing ? (
            <span
              title={t('contents.localization.statusUntranslated')}
              className="h-1.5 w-1.5 flex-none rounded-full bg-destructive/70"
            />
          ) : (
            outdated && (
              <span
                title={t('contents.localization.sourceChanged')}
                className="h-1.5 w-1.5 flex-none rounded-full bg-warning"
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

interface MediaActionButtonProps {
  tooltip: string;
  disabled: boolean;
  icon: ReactNode;
  onClick?: () => void;
}

const MediaActionButton = (props: MediaActionButtonProps) => {
  const { tooltip, disabled, icon, onClick } = props;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          disabled={disabled}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
};

/**
 * Shared shell for media-like url rows (link destination, embed url): label
 * with the outdated chip, read-only source cell, and a caller-provided
 * input/actions area. These rows skip the missing dot and machine translation
 * that text rows carry — keeping the original is the norm.
 */
interface UrlFieldRowProps {
  label: ReactNode;
  outdated: boolean;
  sourceUrl: ReactNode;
  children: ReactNode;
}

const UrlFieldRow = (props: UrlFieldRowProps) => {
  const { label, outdated, sourceUrl, children } = props;
  return (
    <div className={FIELD_GRID}>
      <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
        {label}
        {outdated && <OutdatedChip />}
      </div>
      <div className="min-h-9 break-all rounded-md bg-secondary px-3 py-2 text-sm">{sourceUrl}</div>
      <div className="flex flex-row items-center gap-1.5">{children}</div>
    </div>
  );
};

interface LocalizedLinkUrlRowProps {
  label: string;
  sourceUrl: string;
  value: string;
  disabled: boolean;
  outdated: boolean;
  onOutdatedResolved: () => void;
  onValueChange: (value: string) => void;
}

const LocalizedLinkUrlRow = (props: LocalizedLinkUrlRowProps) => {
  const { label, sourceUrl, value, disabled, outdated, onOutdatedResolved, onValueChange } = props;
  const { t } = useTranslation();

  const handleValueChange = (nextValue: string) => {
    if (outdated) {
      onOutdatedResolved();
    }
    onValueChange(nextValue);
  };

  return (
    <UrlFieldRow label={label} outdated={outdated} sourceUrl={sourceUrl}>
      <Input
        value={value}
        placeholder={t('contents.localization.image.usingOriginal')}
        disabled={disabled}
        onChange={(event) => handleValueChange(event.target.value)}
      />
      <MediaActionButton
        tooltip={t('contents.localization.image.useOriginal')}
        disabled={disabled || value === ''}
        icon={<ResetIcon className="h-4 w-4" />}
        onClick={() => handleValueChange('')}
      />
    </UrlFieldRow>
  );
};

export interface LocalizedElementSectionProps {
  label: string;
  outdated: boolean;
  children: ReactNode;
}

export const LocalizedElementSection = (props: LocalizedElementSectionProps) => {
  const { label, outdated, children } = props;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {outdated && <OutdatedChip />}
      </div>
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Per-element editors — each receives the source element (read-only), the
// aligned working element (holds the translation, '' = untranslated) and
// emits a full replacement working element.
// ---------------------------------------------------------------------------

interface LocalizedElementEditorProps {
  sourceElement: ContentEditorElement;
  workingElement: ContentEditorElement;
  label: string;
  /**
   * Field-path suffixes (walker unit paths minus the `<element>:` prefix,
   * e.g. 'text.0.0', 'button.text') whose source text drifted since the
   * translation was saved — rows match against it to flag the exact line.
   */
  outdatedFields: ReadonlySet<string>;
  /** Reports a reworked outdated field (same suffix space as outdatedFields). */
  onFieldResolved: (fieldPath: string) => void;
  disabled: boolean;
  onElementChange: (element: ContentEditorElement) => void;
}

const LocalizedTextElement = (props: LocalizedElementEditorProps) => {
  const {
    sourceElement,
    workingElement,
    label,
    outdatedFields,
    onFieldResolved,
    disabled,
    onElementChange,
  } = props;
  const { t } = useTranslation();
  const { showOnlyMissing } = useLocalizationView();
  const source = sourceElement as ContentEditorTextElement;
  const working = workingElement as ContentEditorTextElement;
  const sourceData = Array.isArray(source.data) ? (source.data as SlateNode[]) : [];
  const workingData = Array.isArray(working.data) ? (working.data as SlateNode[]) : [];
  const { leafPairs, linkPairs: allLinkPairs } = collectSlateFieldPairs(sourceData, workingData);
  const pairs = showOnlyMissing ? leafPairs.filter((pair) => pair.value.trim() === '') : leafPairs;
  // Link rows are never "untranslated" — keeping the original url is the norm.
  const linkPairs = showOnlyMissing ? [] : allLinkPairs;
  if (pairs.length === 0 && linkPairs.length === 0) {
    return null;
  }

  const applyDataEdit = (mutate: (nodes: SlateNode[]) => void) => {
    const nextData = deepClone(workingData);
    mutate(nextData);
    onElementChange({ ...working, data: nextData });
  };

  const handleLeafChange = (path: number[], text: string) => {
    applyDataEdit((nodes) => setSlateLeafText(nodes, path, text));
  };

  const handleLinkUrlChange = (path: number[], url: string) => {
    applyDataEdit((nodes) => setSlateLinkUrl(nodes, path, url));
  };

  return (
    <LocalizedElementSection label={label} outdated={outdatedFields.size > 0}>
      {pairs.map((pair) => (
        <LocalizedFieldRow
          key={pair.path.join('.')}
          source={pair.sourceText}
          value={pair.value}
          placeholder={pair.sourceText}
          disabled={disabled}
          outdated={outdatedFields.has(`text.${pair.path.join('.')}`)}
          onOutdatedResolved={() => onFieldResolved(`text.${pair.path.join('.')}`)}
          onValueChange={(text) => handleLeafChange(pair.path, text)}
        />
      ))}
      {linkPairs.map((pair) => {
        const fieldPath = `text.${pair.path.join('.')}:link.url`;
        return (
          <LocalizedLinkUrlRow
            key={fieldPath}
            label={t('contents.localization.field.linkUrl')}
            sourceUrl={pair.sourceUrl}
            value={pair.value}
            disabled={disabled}
            outdated={outdatedFields.has(fieldPath)}
            onOutdatedResolved={() => onFieldResolved(fieldPath)}
            onValueChange={(url) => handleLinkUrlChange(pair.path, url)}
          />
        );
      })}
    </LocalizedElementSection>
  );
};

const LocalizedButtonElement = (props: LocalizedElementEditorProps) => {
  const {
    sourceElement,
    workingElement,
    label,
    outdatedFields,
    onFieldResolved,
    disabled,
    onElementChange,
  } = props;
  const { showOnlyMissing } = useLocalizationView();
  const source = sourceElement as ContentEditorButtonElement;
  const working = workingElement as ContentEditorButtonElement;
  const sourceText = toText(source.data?.text);
  if (sourceText === '') {
    return null;
  }
  if (showOnlyMissing && toText(working.data?.text).trim() !== '') {
    return null;
  }
  return (
    <LocalizedElementSection label={label} outdated={outdatedFields.size > 0}>
      <LocalizedFieldRow
        source={sourceText}
        value={toText(working.data?.text)}
        placeholder={sourceText}
        disabled={disabled}
        outdated={outdatedFields.has('button.text')}
        onOutdatedResolved={() => onFieldResolved('button.text')}
        onValueChange={(text) => onElementChange({ ...working, data: { ...working.data, text } })}
      />
    </LocalizedElementSection>
  );
};

const LocalizedImageElement = (props: LocalizedElementEditorProps) => {
  const {
    sourceElement,
    workingElement,
    label,
    outdatedFields,
    onFieldResolved,
    disabled,
    onElementChange,
  } = props;
  const { t } = useTranslation();
  const { upload } = useAws();
  const { showOnlyMissing } = useLocalizationView();
  const source = sourceElement as ContentEditorImageElement;
  const working = workingElement as ContentEditorImageElement;
  const [remoteImageUrl, setRemoteImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Media rows are never "untranslated" — keeping the original is the norm.
  if (showOnlyMissing) {
    return null;
  }

  const handleImageUrlChange = (url: string) => {
    if (outdatedFields.has('image.url')) {
      onFieldResolved('image.url');
    }
    onElementChange({ ...working, url });
  };

  // The image's click-through link localizes like an inline text link;
  // dynamic or absent destinations show no row and stay source-managed.
  const sourceLinkUrl = getLocalizableLinkUrl(source.link);
  const handleLinkUrlChange = (url: string) => {
    const nextLink = { ...(working.link ?? {}) };
    assignLocalizedLinkUrl(nextLink, url);
    onElementChange({ ...working, link: nextLink });
  };

  const handleCustomUploadRequest = async (option: UploadRequestOption) => {
    setIsUploading(true);
    try {
      const url = await upload(option.file as File);
      handleImageUrlChange(url);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <LocalizedElementSection label={label} outdated={outdatedFields.size > 0}>
      <Popover>
        <div className={FIELD_GRID}>
          <div />
          <div className="rounded-md bg-secondary p-2">
            <img src={source.url} className="max-h-40 max-w-full rounded" />
          </div>
          <div className="flex flex-col gap-2">
            {isUploading ? (
              <div className="flex h-24 items-center justify-center">
                <SpinnerIcon className="h-8 w-8 animate-spin" />
              </div>
            ) : working.url ? (
              <img src={working.url} className="max-h-40 max-w-full rounded" />
            ) : (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                {t('contents.localization.image.usingOriginal')}
              </div>
            )}
            <div className="flex flex-row flex-wrap gap-1">
              <Upload
                accept="image/*"
                disabled={disabled}
                customRequest={(option) => {
                  void handleCustomUploadRequest(option as UploadRequestOption);
                }}
              >
                <Button
                  variant="ghost"
                  disabled={disabled}
                  className="h-auto w-auto p-1 text-primary hover:text-primary"
                >
                  <ImageEditIcon className="mx-1 fill-primary" />
                  {t('contents.localization.image.uploadImage')}
                </Button>
              </Upload>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  disabled={disabled}
                  className="h-auto w-auto p-1 text-primary hover:text-primary"
                >
                  <KeyboardIcon className="mx-1 fill-primary" />
                  {t('contents.localization.image.enterUrl')}
                </Button>
              </PopoverTrigger>
              <Button
                variant="ghost"
                disabled={disabled || working.url === ''}
                className="h-auto w-auto p-1 text-primary hover:text-primary"
                onClick={() => handleImageUrlChange('')}
              >
                <ResetIcon className="mx-1 fill-primary" />
                {t('contents.localization.image.useOriginal')}
              </Button>
            </div>
          </div>
        </div>
        <PopoverContent
          className="w-[400px] bg-background dark:bg-card"
          side="top"
          align="center"
          sideOffset={5}
        >
          <div className="flex flex-row space-x-2">
            <Input
              placeholder={t('contents.localization.image.enterUrl')}
              value={remoteImageUrl}
              onChange={(event) => setRemoteImageUrl(event.target.value)}
              className="w-80 bg-background dark:bg-card"
            />
            <Button
              className="h-9 flex-none py-1"
              variant="ghost"
              onClick={() => handleImageUrlChange(remoteImageUrl)}
            >
              <ArrowRightIcon className="mr-1" />
              {t('contents.localization.image.load')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {sourceLinkUrl ? (
        <LocalizedLinkUrlRow
          label={t('contents.localization.field.linkUrl')}
          sourceUrl={sourceLinkUrl}
          value={(working.link ? getLocalizableLinkUrl(working.link) : undefined) ?? ''}
          disabled={disabled}
          outdated={outdatedFields.has('image.link.url')}
          onOutdatedResolved={() => onFieldResolved('image.link.url')}
          onValueChange={handleLinkUrlChange}
        />
      ) : null}
    </LocalizedElementSection>
  );
};

const LocalizedEmbedElement = (props: LocalizedElementEditorProps) => {
  const {
    sourceElement,
    workingElement,
    label,
    outdatedFields,
    onFieldResolved,
    disabled,
    onElementChange,
  } = props;
  const { t } = useTranslation();
  const { showOnlyMissing } = useLocalizationView();
  const source = sourceElement as ContentEditorEmebedElement;
  const working = workingElement as ContentEditorEmebedElement;
  const { invoke: queryOembedInfo, loading: resolving } = useQueryOembedInfoLazyQuery();
  const [draftUrl, setDraftUrl] = useState<string>(toText(working.url));

  // Media rows are never "untranslated" — keeping the original is the norm.
  if (showOnlyMissing) {
    return null;
  }

  // The widget renders embeds from parsedUrl/oembed, so a translated URL has
  // to be resolved the same way the builder does before it can ship.
  const handleApplyUrl = async (url: string) => {
    if (outdatedFields.has('embed.url')) {
      onFieldResolved('embed.url');
    }
    if (url === '') {
      setDraftUrl('');
      onElementChange({ ...working, url: '', parsedUrl: undefined, oembed: undefined });
      return;
    }
    const oembed = await queryOembedInfo(url);
    onElementChange({ ...working, url, parsedUrl: url, oembed: oembed ?? undefined });
  };

  return (
    <UrlFieldRow label={label} outdated={outdatedFields.size > 0} sourceUrl={source.url}>
      <Input
        value={draftUrl}
        placeholder={t('contents.localization.image.usingOriginal')}
        disabled={disabled}
        onChange={(event) => setDraftUrl(event.target.value)}
      />
      <MediaActionButton
        tooltip={t('contents.localization.image.load')}
        disabled={disabled || resolving}
        icon={
          resolving ? (
            <SpinnerIcon className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRightIcon className="h-4 w-4" />
          )
        }
        onClick={() => void handleApplyUrl(draftUrl.trim())}
      />
      <MediaActionButton
        tooltip={t('contents.localization.image.useOriginal')}
        disabled={disabled || toText(working.url) === ''}
        icon={<ResetIcon className="h-4 w-4" />}
        onClick={() => void handleApplyUrl('')}
      />
    </UrlFieldRow>
  );
};

type QuestionFieldKey =
  | 'name'
  | 'lowLabel'
  | 'highLabel'
  | 'placeholder'
  | 'buttonText'
  | 'otherPlaceholder';

interface QuestionFieldDescriptor {
  key: QuestionFieldKey;
  labelKey: string;
}

const SCALE_LIKE_FIELDS: QuestionFieldDescriptor[] = [
  { key: 'name', labelKey: 'contents.localization.field.question' },
  { key: 'lowLabel', labelKey: 'contents.localization.field.lowLabel' },
  { key: 'highLabel', labelKey: 'contents.localization.field.highLabel' },
];

const FREE_TEXT_FIELDS: QuestionFieldDescriptor[] = [
  { key: 'name', labelKey: 'contents.localization.field.question' },
  { key: 'placeholder', labelKey: 'contents.localization.field.placeholder' },
  { key: 'buttonText', labelKey: 'contents.localization.field.buttonText' },
];

const MULTIPLE_CHOICE_FIELDS: QuestionFieldDescriptor[] = [
  { key: 'name', labelKey: 'contents.localization.field.question' },
  { key: 'buttonText', labelKey: 'contents.localization.field.buttonText' },
  { key: 'otherPlaceholder', labelKey: 'contents.localization.field.otherPlaceholder' },
];

type QuestionElementData = Record<string, unknown>;

const getElementData = (element: ContentEditorElement): QuestionElementData => {
  return ((element as { data?: QuestionElementData }).data ?? {}) as QuestionElementData;
};

const withElementData = (
  element: ContentEditorElement,
  patch: QuestionElementData,
): ContentEditorElement => {
  return { ...element, data: { ...getElementData(element), ...patch } } as ContentEditorElement;
};

interface LocalizedQuestionFieldsProps extends LocalizedElementEditorProps {
  fields: QuestionFieldDescriptor[];
}

const LocalizedQuestionFields = (props: LocalizedQuestionFieldsProps) => {
  const {
    sourceElement,
    workingElement,
    fields,
    label,
    outdatedFields,
    onFieldResolved,
    disabled,
    onElementChange,
  } = props;
  const { t } = useTranslation();
  const { showOnlyMissing } = useLocalizationView();
  const sourceData = getElementData(sourceElement);
  const workingData = getElementData(workingElement);

  const allSourceOptions =
    sourceElement.type === ContentEditorElementType.MULTIPLE_CHOICE &&
    Array.isArray((sourceElement as ContentEditorMultipleChoiceElement).data?.options)
      ? (sourceElement as ContentEditorMultipleChoiceElement).data.options
      : [];
  const workingOptions =
    workingElement.type === ContentEditorElementType.MULTIPLE_CHOICE
      ? ((workingElement as ContentEditorMultipleChoiceElement).data?.options ?? [])
      : [];

  const presentFields = fields.filter((field) => {
    if (toText(sourceData[field.key]) === '') {
      return false;
    }
    return !showOnlyMissing || toText(workingData[field.key]).trim() === '';
  });
  // Filtering must keep the original indices — option lookups and writes are
  // positional against the working options.
  const visibleOptions = allSourceOptions
    .map((option, optionIndex) => ({ option, optionIndex }))
    .filter(({ option, optionIndex }) => {
      if (toText(option.label) === '') {
        return false;
      }
      return !showOnlyMissing || toText(workingOptions[optionIndex]?.label).trim() === '';
    });
  if (presentFields.length === 0 && visibleOptions.length === 0) {
    return null;
  }

  const handleOptionLabelChange = (optionIndex: number, labelText: string) => {
    const nextOptions = workingOptions.map((option, index) =>
      index === optionIndex ? { ...option, label: labelText } : option,
    );
    onElementChange(withElementData(workingElement, { options: nextOptions }));
  };

  return (
    <LocalizedElementSection label={label} outdated={outdatedFields.size > 0}>
      {presentFields.map((field) => {
        const sourceText = toText(sourceData[field.key]);
        return (
          <LocalizedFieldRow
            key={field.key}
            label={t(field.labelKey)}
            source={sourceText}
            value={toText(workingData[field.key])}
            placeholder={sourceText}
            disabled={disabled}
            outdated={outdatedFields.has(`question.${field.key}`)}
            onOutdatedResolved={() => onFieldResolved(`question.${field.key}`)}
            onValueChange={(value) =>
              onElementChange(withElementData(workingElement, { [field.key]: value }))
            }
          />
        );
      })}
      {visibleOptions.map(({ option, optionIndex }) => {
        const sourceText = toText(option.label);
        return (
          <LocalizedFieldRow
            key={`option-${option.value}-${optionIndex}`}
            label={t('contents.localization.field.optionLabel', { index: optionIndex + 1 })}
            source={sourceText}
            value={toText(workingOptions[optionIndex]?.label)}
            placeholder={sourceText}
            disabled={disabled}
            outdated={outdatedFields.has(`question.options.${optionIndex}.label`)}
            onOutdatedResolved={() => onFieldResolved(`question.options.${optionIndex}.label`)}
            onValueChange={(value) => handleOptionLabelChange(optionIndex, value)}
          />
        );
      })}
    </LocalizedElementSection>
  );
};

const ELEMENT_LABEL_KEYS: Partial<Record<ContentEditorElementType, string>> = {
  [ContentEditorElementType.TEXT]: 'contents.localization.element.content',
  [ContentEditorElementType.IMAGE]: 'contents.localization.element.image',
  [ContentEditorElementType.EMBED]: 'contents.localization.element.video',
  [ContentEditorElementType.BUTTON]: 'contents.localization.element.button',
  [ContentEditorElementType.NPS]: 'contents.localization.element.nps',
  [ContentEditorElementType.STAR_RATING]: 'contents.localization.element.starRating',
  [ContentEditorElementType.SCALE]: 'contents.localization.element.scale',
  [ContentEditorElementType.SINGLE_LINE_TEXT]: 'contents.localization.element.singleLineText',
  [ContentEditorElementType.MULTI_LINE_TEXT]: 'contents.localization.element.multiLineText',
  [ContentEditorElementType.MULTIPLE_CHOICE]: 'contents.localization.element.multipleChoice',
};

interface LocalizedElementProps {
  sourceElement: ContentEditorElement;
  workingElement: ContentEditorElement | undefined;
  outdatedFields: ReadonlySet<string>;
  onFieldResolved: (fieldPath: string) => void;
  disabled: boolean;
  onElementChange: (element: ContentEditorElement) => void;
}

const LocalizedElement = (props: LocalizedElementProps) => {
  const {
    sourceElement,
    workingElement,
    outdatedFields,
    onFieldResolved,
    disabled,
    onElementChange,
  } = props;
  const { t } = useTranslation();
  const labelKey = ELEMENT_LABEL_KEYS[sourceElement.type];
  // A missing working counterpart means the working tree drifted from the
  // source tree, which the structural-clone invariant rules out — bail
  // defensively rather than render mismatched pairs.
  if (!labelKey || !workingElement || workingElement.type !== sourceElement.type) {
    return null;
  }
  const editorProps: LocalizedElementEditorProps = {
    sourceElement,
    workingElement,
    label: t(labelKey),
    outdatedFields,
    onFieldResolved,
    disabled,
    onElementChange,
  };

  switch (sourceElement.type) {
    case ContentEditorElementType.TEXT:
      return <LocalizedTextElement {...editorProps} />;
    case ContentEditorElementType.BUTTON:
      return <LocalizedButtonElement {...editorProps} />;
    case ContentEditorElementType.IMAGE:
      return <LocalizedImageElement {...editorProps} />;
    case ContentEditorElementType.EMBED:
      return <LocalizedEmbedElement {...editorProps} />;
    case ContentEditorElementType.NPS:
    case ContentEditorElementType.STAR_RATING:
    case ContentEditorElementType.SCALE:
      return <LocalizedQuestionFields {...editorProps} fields={SCALE_LIKE_FIELDS} />;
    case ContentEditorElementType.SINGLE_LINE_TEXT:
    case ContentEditorElementType.MULTI_LINE_TEXT:
      return <LocalizedQuestionFields {...editorProps} fields={FREE_TEXT_FIELDS} />;
    case ContentEditorElementType.MULTIPLE_CHOICE:
      return <LocalizedQuestionFields {...editorProps} fields={MULTIPLE_CHOICE_FIELDS} />;
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// Editor-tree renderer — walks a source tree and its aligned working clone,
// rendering one editor per translatable element. Reused by the flow step
// cards and by embedded trees inside version data.
// ---------------------------------------------------------------------------

const updateElementAt = (
  contents: ContentEditorRoot[],
  groupIndex: number,
  columnIndex: number,
  elementIndex: number,
  nextElement: ContentEditorElement,
): ContentEditorRoot[] => {
  return contents.map((group, gi) =>
    gi !== groupIndex
      ? group
      : {
          ...group,
          children: group.children.map((column, ci) =>
            ci !== columnIndex
              ? column
              : {
                  ...column,
                  children: column.children.map((item, ei) =>
                    ei !== elementIndex ? item : { ...item, element: nextElement },
                  ),
                },
          ),
        },
  );
};

/** The `outdatedUnitPaths` entries scoped to one element, minus its prefix. */
const collectElementOutdatedFields = (
  unitPaths: ReadonlySet<string> | undefined,
  elementKey: string,
): ReadonlySet<string> => {
  const fields = new Set<string>();
  if (!unitPaths) {
    return fields;
  }
  const prefix = `${elementKey}:`;
  for (const path of unitPaths) {
    if (path.startsWith(prefix)) {
      fields.add(path.slice(prefix.length));
    }
  }
  return fields;
};

export interface LocalizedEditorContentsProps {
  sourceContents: ContentEditorRoot[];
  workingContents: ContentEditorRoot[];
  outdatedUnitPaths: Set<string> | undefined;
  /** Prepended to element paths for outdated lookups when the tree is embedded in version data. */
  outdatedPathPrefix?: string;
  /** Removes a reworked unit path from the owner's outdated set. */
  onOutdatedResolved?: (unitPath: string) => void;
  disabled: boolean;
  onContentsChange: (contents: ContentEditorRoot[]) => void;
}

export const LocalizedEditorContents = (props: LocalizedEditorContentsProps) => {
  const {
    sourceContents,
    workingContents,
    outdatedUnitPaths,
    outdatedPathPrefix,
    onOutdatedResolved,
    disabled,
    onContentsChange,
  } = props;

  return (
    <>
      {sourceContents.map((group, groupIndex) =>
        (group.children ?? []).map((column, columnIndex) =>
          (column.children ?? []).map((item, elementIndex) => {
            const elementPath = formatElementPath(groupIndex, columnIndex, elementIndex);
            const outdatedKey = outdatedPathPrefix
              ? `${outdatedPathPrefix}/${elementPath}`
              : elementPath;
            const workingElement =
              workingContents[groupIndex]?.children?.[columnIndex]?.children?.[elementIndex]
                ?.element;
            return (
              <LocalizedElement
                key={elementPath}
                sourceElement={item.element}
                workingElement={workingElement}
                outdatedFields={collectElementOutdatedFields(outdatedUnitPaths, outdatedKey)}
                onFieldResolved={(fieldPath) => onOutdatedResolved?.(`${outdatedKey}:${fieldPath}`)}
                disabled={disabled}
                onElementChange={(nextElement) =>
                  onContentsChange(
                    updateElementAt(
                      workingContents,
                      groupIndex,
                      columnIndex,
                      elementIndex,
                      nextElement,
                    ),
                  )
                }
              />
            );
          }),
        ),
      )}
    </>
  );
};
