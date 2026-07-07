import { ArrowRightIcon, KeyboardIcon, ResetIcon } from '@radix-ui/react-icons';
import { deepClone, formatElementPath, getErrorMessage } from '@usertour/helpers';
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

export const collectSlateLeafPairs = (
  sourceNodes: SlateNode[],
  workingNodes: SlateNode[],
  path: number[] = [],
): SlateLeafPair[] => {
  const pairs: SlateLeafPair[] = [];
  sourceNodes.forEach((sourceNode, index) => {
    if (!sourceNode || typeof sourceNode !== 'object') {
      return;
    }
    const workingNode = workingNodes?.[index];
    const nodePath = [...path, index];
    if (typeof sourceNode.text === 'string') {
      if (sourceNode.text !== '') {
        pairs.push({
          path: nodePath,
          sourceText: sourceNode.text,
          value: toText(workingNode?.text),
        });
      }
      return;
    }
    if (Array.isArray(sourceNode.children)) {
      pairs.push(
        ...collectSlateLeafPairs(
          sourceNode.children as SlateNode[],
          (Array.isArray(workingNode?.children) ? workingNode.children : []) as SlateNode[],
          nodePath,
        ),
      );
    }
  });
  return pairs;
};

export const setSlateLeafText = (nodes: SlateNode[], path: number[], text: string): void => {
  let node: SlateNode | undefined = nodes[path[0]];
  for (const index of path.slice(1)) {
    if (!node || !Array.isArray(node.children)) {
      return;
    }
    node = (node.children as SlateNode[])[index];
  }
  if (node) {
    node.text = text;
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
  onValueChange: (value: string) => void;
}

export const LocalizedFieldRow = (props: LocalizedFieldRowProps) => {
  const { label, source, value, placeholder, disabled, outdated, onValueChange } = props;
  const { t } = useTranslation();
  const { showOnlyMissing, translateText } = useLocalizationView();

  const missing = value.trim() === '';
  if (showOnlyMissing && !missing) {
    return null;
  }

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
          onChange={(event) => onValueChange(event.target.value)}
        />
        <div className="absolute inset-y-0 right-2.5 flex items-center gap-1.5">
          {!disabled && <UnitTranslateButton sourceText={source} onTranslated={onValueChange} />}
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
  outdated: boolean;
  disabled: boolean;
  onElementChange: (element: ContentEditorElement) => void;
}

const LocalizedTextElement = (props: LocalizedElementEditorProps) => {
  const { sourceElement, workingElement, label, outdated, disabled, onElementChange } = props;
  const { showOnlyMissing } = useLocalizationView();
  const source = sourceElement as ContentEditorTextElement;
  const working = workingElement as ContentEditorTextElement;
  const sourceData = Array.isArray(source.data) ? (source.data as SlateNode[]) : [];
  const workingData = Array.isArray(working.data) ? (working.data as SlateNode[]) : [];
  const allPairs = collectSlateLeafPairs(sourceData, workingData);
  const pairs = showOnlyMissing ? allPairs.filter((pair) => pair.value.trim() === '') : allPairs;
  if (pairs.length === 0) {
    return null;
  }

  const handleLeafChange = (path: number[], text: string) => {
    const nextData = deepClone(workingData);
    setSlateLeafText(nextData, path, text);
    onElementChange({ ...working, data: nextData });
  };

  return (
    <LocalizedElementSection label={label} outdated={outdated}>
      {pairs.map((pair) => (
        <LocalizedFieldRow
          key={pair.path.join('.')}
          source={pair.sourceText}
          value={pair.value}
          placeholder={pair.sourceText}
          disabled={disabled}
          onValueChange={(text) => handleLeafChange(pair.path, text)}
        />
      ))}
    </LocalizedElementSection>
  );
};

const LocalizedButtonElement = (props: LocalizedElementEditorProps) => {
  const { sourceElement, workingElement, label, outdated, disabled, onElementChange } = props;
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
    <LocalizedElementSection label={label} outdated={outdated}>
      <LocalizedFieldRow
        source={sourceText}
        value={toText(working.data?.text)}
        placeholder={sourceText}
        disabled={disabled}
        onValueChange={(text) => onElementChange({ ...working, data: { ...working.data, text } })}
      />
    </LocalizedElementSection>
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

const LocalizedImageElement = (props: LocalizedElementEditorProps) => {
  const { sourceElement, workingElement, label, outdated, disabled, onElementChange } = props;
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
    onElementChange({ ...working, url });
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
    <Popover>
      <div className={FIELD_GRID}>
        <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          {label}
          {outdated && <OutdatedChip />}
        </div>
        <div className="flex items-center rounded-md bg-secondary px-3 py-1.5">
          <img src={source.url} className="h-10 max-w-full rounded object-contain" />
        </div>
        <div className="flex min-h-9 items-center gap-2">
          {isUploading ? (
            <SpinnerIcon className="h-5 w-5 animate-spin" />
          ) : working.url ? (
            <img src={working.url} className="h-10 max-w-40 rounded object-contain" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {t('contents.localization.image.usingOriginal')}
            </span>
          )}
          <div className="ml-auto flex flex-none items-center">
            <Upload
              accept="image/*"
              disabled={disabled}
              customRequest={(option) => {
                void handleCustomUploadRequest(option as UploadRequestOption);
              }}
            >
              <MediaActionButton
                tooltip={t('contents.localization.image.uploadImage')}
                disabled={disabled}
                icon={<ImageEditIcon className="h-4 w-4 fill-current" />}
              />
            </Upload>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                disabled={disabled}
                title={t('contents.localization.image.enterUrl')}
              >
                <KeyboardIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <MediaActionButton
              tooltip={t('contents.localization.image.useOriginal')}
              disabled={disabled || working.url === ''}
              icon={<ResetIcon className="h-4 w-4" />}
              onClick={() => handleImageUrlChange('')}
            />
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
  );
};

const LocalizedEmbedElement = (props: LocalizedElementEditorProps) => {
  const { sourceElement, workingElement, label, outdated, disabled, onElementChange } = props;
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
    if (url === '') {
      setDraftUrl('');
      onElementChange({ ...working, url: '', parsedUrl: undefined, oembed: undefined });
      return;
    }
    const oembed = await queryOembedInfo(url);
    onElementChange({ ...working, url, parsedUrl: url, oembed: oembed ?? undefined });
  };

  return (
    <div className={FIELD_GRID}>
      <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
        {label}
        {outdated && <OutdatedChip />}
      </div>
      <div className="min-h-9 break-all rounded-md bg-secondary px-3 py-2 text-sm">
        {source.url}
      </div>
      <div className="flex flex-row items-center gap-1.5">
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
      </div>
    </div>
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
  const { sourceElement, workingElement, fields, label, outdated, disabled, onElementChange } =
    props;
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
    <LocalizedElementSection label={label} outdated={outdated}>
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
  outdated: boolean;
  disabled: boolean;
  onElementChange: (element: ContentEditorElement) => void;
}

const LocalizedElement = (props: LocalizedElementProps) => {
  const { sourceElement, workingElement, outdated, disabled, onElementChange } = props;
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
    outdated,
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

export interface LocalizedEditorContentsProps {
  sourceContents: ContentEditorRoot[];
  workingContents: ContentEditorRoot[];
  outdatedElementPaths: Set<string> | undefined;
  /** Prepended to element paths for outdated lookups when the tree is embedded in version data. */
  outdatedPathPrefix?: string;
  disabled: boolean;
  onContentsChange: (contents: ContentEditorRoot[]) => void;
}

export const LocalizedEditorContents = (props: LocalizedEditorContentsProps) => {
  const {
    sourceContents,
    workingContents,
    outdatedElementPaths,
    outdatedPathPrefix,
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
                outdated={outdatedElementPaths?.has(outdatedKey) ?? false}
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
