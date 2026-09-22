import { ArrowRightIcon, KeyboardIcon, ResetIcon } from '@radix-ui/react-icons';
import {
  type LocalizationTranslationUnit,
  type LocalizedEmbedResolutions,
  getErrorMessage,
} from '@usertour/helpers';
import { useAws, useQueryOembedInfoLazyQuery } from '@usertour/hooks';
import { ImageEditIcon, RiSparkling2Line, SpinnerIcon } from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import type { ContentEditorEmebedElement, ResourceCenterData } from '@usertour/types';
import { ContentDataType } from '@usertour/types';
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
import { Fragment, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  LocalizationGroupCard,
  countMissingUnits,
  countOutdatedPaths,
  isUnitMissing,
  useLocalizationView,
} from './localization-view';
import { ELEMENT_LABEL_KEYS, FIELD_LABEL_KEYS } from './localized-unit-labels';
import { isUnusableDestinationUrl, isUnusableMediaUrl } from './translation-unit-changes';

// ---------------------------------------------------------------------------
// The page renders FROM the unit list the walkers emit — the same list the
// missing count, the CSV exchange, machine translation and the API read.
// A unit is a row; its `kind` and `field` pick the row's shape and label,
// its `element` groups it under an element section. Nothing here knows the
// content types' data shapes: an edit is a unit change the owner applies
// through the translation applier.
// ---------------------------------------------------------------------------

/** An edit to one unit: a new value, or null to clear it back to untranslated. */
export interface LocalizedUnitChange {
  path: string;
  value: string | null;
  /** A swapped embed url travels with the resolution the preview renders from. */
  embedResolution?: Pick<ContentEditorEmebedElement, 'parsedUrl' | 'oembed'>;
}

/** The applier's resolution map for one change. */
export const toEmbedResolutions = (
  change: LocalizedUnitChange,
): LocalizedEmbedResolutions | undefined => {
  if (!change.embedResolution || change.value === null) {
    return undefined;
  }
  return new Map([[change.value.trim(), change.embedResolution]]);
};

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

const FIELD_GRID = 'grid grid-cols-[8rem_1fr_1fr] items-start gap-3';

/** Amber "source changed" chip shared by rows and element sections. */
const OutdatedChip = () => {
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

// ---------------------------------------------------------------------------
// Rows — one per unit kind (text / destination / media), the two media
// elements with their own affordances (image upload, embed resolution).
// Each receives the unit, its outdated flag, and reports a unit change.
// ---------------------------------------------------------------------------

interface UnitRowProps {
  unit: LocalizationTranslationUnit;
  label: string | undefined;
  disabled: boolean;
  outdated: boolean;
  /**
   * Reworking an outdated row is what its marker asks for — called on the
   * first edit (typing or per-row AI translate) so the owner removes the
   * row's path from the outdated set, which clears the dot, the section
   * chip and the card count together.
   */
  onOutdatedResolved: (unitPath: string) => void;
  onUnitChange: (change: LocalizedUnitChange) => void;
}

/** Text row: source cell, translation input, missing / outdated dot, per-row AI translate. */
const TextUnitRow = (props: UnitRowProps) => {
  const { unit, label, disabled, outdated, onOutdatedResolved, onUnitChange } = props;
  const { t } = useTranslation();
  const { translateText } = useLocalizationView();
  const value = unit.translatedText;
  const missing = value.trim() === '';

  const handleValueChange = (nextValue: string) => {
    if (outdated) {
      onOutdatedResolved(unit.path);
    }
    // A blank translation IS untranslated — clear rather than store blanks.
    onUnitChange({ path: unit.path, value: nextValue.trim() === '' ? null : nextValue });
  };

  return (
    <div className={FIELD_GRID}>
      <div className="pt-2 text-xs text-muted-foreground">{label}</div>
      <div className="min-h-9 whitespace-pre-wrap rounded-md bg-secondary px-3 py-2 text-sm">
        {unit.sourceText}
      </div>
      <div className="group/row relative">
        <Input
          value={value}
          placeholder={unit.sourceText}
          disabled={disabled}
          className={cn(translateText && !disabled ? 'pr-14' : 'pr-8')}
          onChange={(event) => handleValueChange(event.target.value)}
        />
        <div className="absolute inset-y-0 right-2.5 flex items-center gap-1.5">
          {!disabled && (
            <UnitTranslateButton sourceText={unit.sourceText} onTranslated={handleValueChange} />
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

/**
 * Shared shell for url rows (destinations, embed urls): label with the
 * outdated chip, read-only source cell, and a caller-provided input/actions
 * area. These rows skip the missing dot and machine translation that text
 * rows carry — keeping the original is the norm.
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

/**
 * Destination row: where a click goes. Any string the host can route is a
 * valid destination (a relative path included), so there is no url bar here —
 * unlike media urls, which the SDK renders verbatim into src.
 */
const DestinationUnitRow = (props: UnitRowProps) => {
  const { unit, label, disabled, outdated, onOutdatedResolved, onUnitChange } = props;
  const { t } = useTranslation();

  const handleValueChange = (nextValue: string) => {
    if (outdated) {
      onOutdatedResolved(unit.path);
    }
    onUnitChange({ path: unit.path, value: nextValue.trim() === '' ? null : nextValue });
  };

  return (
    <UrlFieldRow label={label} outdated={outdated} sourceUrl={unit.sourceText}>
      <Input
        value={unit.translatedText}
        placeholder={t('contents.localization.image.usingOriginal')}
        disabled={disabled}
        aria-invalid={isUnusableDestinationUrl(unit.translatedText)}
        onChange={(event) => handleValueChange(event.target.value)}
      />
      <MediaActionButton
        tooltip={t('contents.localization.image.useOriginal')}
        disabled={disabled || unit.translatedText === ''}
        icon={<ResetIcon className="h-4 w-4" />}
        onClick={() => handleValueChange('')}
      />
    </UrlFieldRow>
  );
};

/** Image row: source preview, localized preview, upload / enter url / use original. */
const ImageUnitRow = (props: UnitRowProps) => {
  const { unit, disabled, outdated, onOutdatedResolved, onUnitChange } = props;
  const { t } = useTranslation();
  const { upload } = useAws();
  const [remoteImageUrl, setRemoteImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleUrlChange = (url: string) => {
    if (outdated) {
      onOutdatedResolved(unit.path);
    }
    onUnitChange({ path: unit.path, value: url.trim() === '' ? null : url });
  };

  const handleCustomUploadRequest = async (option: UploadRequestOption) => {
    setIsUploading(true);
    try {
      const url = await upload(option.file as File);
      handleUrlChange(url);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Popover>
      <div className={FIELD_GRID}>
        <div />
        <div className="rounded-md bg-secondary p-2">
          <img src={unit.sourceText} className="max-h-40 max-w-full rounded" />
        </div>
        <div className="flex flex-col gap-2">
          {isUploading ? (
            <div className="flex h-24 items-center justify-center">
              <SpinnerIcon className="h-8 w-8 animate-spin" />
            </div>
          ) : unit.translatedText ? (
            <img src={unit.translatedText} className="max-h-40 max-w-full rounded" />
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
              disabled={disabled || unit.translatedText === ''}
              className="h-auto w-auto p-1 text-primary hover:text-primary"
              onClick={() => handleUrlChange('')}
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
            aria-invalid={isUnusableMediaUrl(remoteImageUrl)}
            onChange={(event) => setRemoteImageUrl(event.target.value)}
            className="w-80 bg-background dark:bg-card"
          />
          <Button
            className="h-9 flex-none py-1"
            variant="ghost"
            disabled={isUnusableMediaUrl(remoteImageUrl)}
            onClick={() => handleUrlChange(remoteImageUrl.trim())}
          >
            <ArrowRightIcon className="mr-1" />
            {t('contents.localization.image.load')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * Embed row. The widget renders embeds from parsedUrl/oembed, so a swapped
 * url is resolved here for THIS session's preview; a save sends only the
 * url, and the server resolves what it stores.
 */
const EmbedUnitRow = (props: UnitRowProps) => {
  const { unit, label, disabled, outdated, onOutdatedResolved, onUnitChange } = props;
  const { t } = useTranslation();
  const { invoke: queryOembedInfo, loading: resolving } = useQueryOembedInfoLazyQuery();
  const [draftUrl, setDraftUrl] = useState<string>(unit.translatedText);

  const handleApplyUrl = async (url: string) => {
    if (outdated) {
      onOutdatedResolved(unit.path);
    }
    if (url === '') {
      setDraftUrl('');
      onUnitChange({ path: unit.path, value: null });
      return;
    }
    const oembed = await queryOembedInfo(url);
    onUnitChange({
      path: unit.path,
      value: url,
      embedResolution: { parsedUrl: url, oembed: oembed ?? undefined },
    });
  };

  return (
    <UrlFieldRow label={label} outdated={outdated} sourceUrl={unit.sourceText}>
      <Input
        value={draftUrl}
        placeholder={t('contents.localization.image.usingOriginal')}
        disabled={disabled}
        aria-invalid={isUnusableMediaUrl(draftUrl)}
        onChange={(event) => setDraftUrl(event.target.value)}
      />
      <MediaActionButton
        tooltip={t('contents.localization.image.load')}
        disabled={disabled || resolving || isUnusableMediaUrl(draftUrl)}
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
        disabled={disabled || unit.translatedText === ''}
        icon={<ResetIcon className="h-4 w-4" />}
        onClick={() => void handleApplyUrl('')}
      />
    </UrlFieldRow>
  );
};

/** Picks a row by the unit's kind and field. */
const LocalizedUnitRow = (props: UnitRowProps) => {
  const { unit } = props;
  if (unit.field === 'image.url') {
    return <ImageUnitRow {...props} />;
  }
  if (unit.field === 'embed.url') {
    return <EmbedUnitRow {...props} />;
  }
  if (unit.kind === 'destination') {
    return <DestinationUnitRow {...props} />;
  }
  return <TextUnitRow {...props} />;
};

// ---------------------------------------------------------------------------
// Unit list — rows in walk order, under the container they belong to (a
// checklist task, a resource-center block) and the element they belong to,
// when they have one. The missing-only filter keeps untranslated text;
// destinations and media are never "untranslated" (keeping the original is
// the norm).
// ---------------------------------------------------------------------------

interface UnitGroup {
  key: string;
  element: LocalizationTranslationUnit['element'];
  units: LocalizationTranslationUnit[];
}

interface UnitContainer {
  key: string;
  group: LocalizationTranslationUnit['group'];
  units: LocalizationTranslationUnit[];
}

/** Consecutive units sharing a key, in walk order. */
const groupConsecutive = <T,>(
  units: LocalizationTranslationUnit[],
  keyOf: (unit: LocalizationTranslationUnit) => string,
  make: (unit: LocalizationTranslationUnit, key: string) => T,
  unitsOf: (group: T) => LocalizationTranslationUnit[],
  keyOfGroup: (group: T) => string,
): T[] => {
  const groups: T[] = [];
  for (const unit of units) {
    const key = keyOf(unit);
    const last = groups[groups.length - 1];
    if (last && keyOfGroup(last) === key) {
      unitsOf(last).push(unit);
    } else {
      groups.push(make(unit, key));
    }
  }
  return groups;
};

const groupUnitsByElement = (units: LocalizationTranslationUnit[]): UnitGroup[] => {
  return groupConsecutive(
    units,
    (unit) => unit.element?.path ?? `unit:${unit.path}`,
    (unit, key) => ({ key, element: unit.element, units: [unit] }),
    (group) => group.units,
    (group) => group.key,
  );
};

const groupUnitsByContainer = (units: LocalizationTranslationUnit[]): UnitContainer[] => {
  return groupConsecutive(
    units,
    (unit) => unit.group?.path ?? `unit:${unit.path}`,
    (unit, key) => ({ key, group: unit.group, units: [unit] }),
    (container) => container.units,
    (container) => container.key,
  );
};

export interface LocalizedUnitListProps {
  units: LocalizationTranslationUnit[];
  outdatedPaths: ReadonlySet<string> | undefined;
  onOutdatedResolved: (unitPath: string) => void;
  disabled: boolean;
  onUnitChange: (change: LocalizedUnitChange) => void;
}

export const LocalizedUnitList = (props: LocalizedUnitListProps) => {
  const { units, outdatedPaths, onOutdatedResolved, disabled, onUnitChange } = props;
  const { t } = useTranslation();
  const { showOnlyMissing } = useLocalizationView();
  const visible = showOnlyMissing ? units.filter(isUnitMissing) : units;

  const renderRow = (unit: LocalizationTranslationUnit) => {
    const labelKey = FIELD_LABEL_KEYS[unit.field];
    return (
      <LocalizedUnitRow
        key={unit.path}
        unit={unit}
        label={labelKey ? t(labelKey, unit.fieldArgs) : undefined}
        disabled={disabled}
        outdated={outdatedPaths?.has(unit.path) ?? false}
        onOutdatedResolved={onOutdatedResolved}
        onUnitChange={onUnitChange}
      />
    );
  };

  const renderElementGroups = (groupUnits: LocalizationTranslationUnit[]) =>
    groupUnitsByElement(groupUnits).map((group) => {
      const elementLabelKey = group.element ? ELEMENT_LABEL_KEYS[group.element.type] : undefined;
      if (!group.element || !elementLabelKey) {
        return group.units.map((unit) => renderRow(unit));
      }
      const outdated = group.units.some((unit) => outdatedPaths?.has(unit.path));
      // An embed's section IS its row: label the row with the element name.
      if (group.units.length === 1 && group.units[0].field === 'embed.url') {
        const unit = group.units[0];
        return (
          <LocalizedUnitRow
            key={unit.path}
            unit={unit}
            label={t(elementLabelKey)}
            disabled={disabled}
            outdated={outdated}
            onOutdatedResolved={onOutdatedResolved}
            onUnitChange={onUnitChange}
          />
        );
      }
      return (
        <div key={group.key} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t(elementLabelKey)}</span>
            {outdated && <OutdatedChip />}
          </div>
          {group.units.map((unit) => renderRow(unit))}
        </div>
      );
    });

  return (
    <>
      {groupUnitsByContainer(visible).map((container) =>
        container.group?.title ? (
          <div key={container.key} className="flex flex-col gap-2">
            <span className="text-sm font-medium">{container.group.title}</span>
            {renderElementGroups(container.units)}
          </div>
        ) : (
          <Fragment key={container.key}>{renderElementGroups(container.units)}</Fragment>
        ),
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Version-data sections — cards per content type, each a path filter over the
// flat unit list. Titles are the only thing read from the source data (a
// resource center's tab names).
// ---------------------------------------------------------------------------

interface UnitSection {
  key: string;
  title: string;
  matchesPath: (path: string) => boolean;
}

const describeVersionDataSections = (
  contentType: string,
  sourceData: unknown,
  t: (key: string) => string,
): UnitSection[] => {
  const general = t('contents.localization.section.general');
  switch (contentType) {
    case ContentDataType.CHECKLIST:
      return [
        {
          key: 'general',
          title: general,
          matchesPath: (path) => path === 'buttonText' || path.startsWith('content/'),
        },
        {
          key: 'tasks',
          title: t('contents.localization.section.tasks'),
          matchesPath: (path) => path.startsWith('items.'),
        },
      ];
    case ContentDataType.ANNOUNCEMENT:
      return [
        {
          key: 'general',
          title: general,
          matchesPath: (path) => path === 'title' || path === 'readMoreLabel',
        },
        {
          key: 'intro',
          title: t('contents.localization.section.introContent'),
          matchesPath: (path) => path.startsWith('introContent/'),
        },
        {
          key: 'detail',
          title: t('contents.localization.section.detailContent'),
          matchesPath: (path) => path.startsWith('detailContent/'),
        },
      ];
    case ContentDataType.RESOURCE_CENTER: {
      const tabs = (sourceData as ResourceCenterData | undefined)?.tabs;
      return [
        {
          key: 'general',
          title: general,
          matchesPath: (path) => path === 'buttonText' || path === 'headerText',
        },
        ...(Array.isArray(tabs) ? tabs : []).map((tab) => {
          const namePrefix = `tabs.${tab.id}:`;
          const blocksPrefix = `tabs.${tab.id}.`;
          return {
            key: `tab:${tab.id}`,
            title: tab.name,
            matchesPath: (path: string) =>
              path.startsWith(namePrefix) || path.startsWith(blocksPrefix),
          };
        }),
      ];
    }
    default:
      return [{ key: 'general', title: general, matchesPath: () => true }];
  }
};

export interface VersionDataLocalizationSectionsProps {
  contentType: string;
  sourceData: unknown;
  units: LocalizationTranslationUnit[];
  outdatedPaths: Set<string>;
  onOutdatedResolved: (unitPath: string) => void;
  disabled: boolean;
  onUnitChange: (change: LocalizedUnitChange) => void;
}

export const VersionDataLocalizationSections = (props: VersionDataLocalizationSectionsProps) => {
  const {
    contentType,
    sourceData,
    units,
    outdatedPaths,
    onOutdatedResolved,
    disabled,
    onUnitChange,
  } = props;
  const { t } = useTranslation();
  return (
    <>
      {describeVersionDataSections(contentType, sourceData, t).map((section) => {
        const sectionUnits = units.filter((unit) => section.matchesPath(unit.path));
        if (sectionUnits.length === 0) {
          return null;
        }
        return (
          <LocalizationGroupCard
            key={section.key}
            title={section.title}
            missingCount={countMissingUnits(sectionUnits)}
            outdatedCount={countOutdatedPaths(outdatedPaths, section.matchesPath)}
          >
            <LocalizedUnitList
              units={sectionUnits}
              outdatedPaths={outdatedPaths}
              onOutdatedResolved={onOutdatedResolved}
              disabled={disabled}
              onUnitChange={onUnitChange}
            />
          </LocalizationGroupCard>
        );
      })}
    </>
  );
};
