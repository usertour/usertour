import { useAppContext } from '@/contexts/app-context';
import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentLocalizations } from '@/hooks/use-content-localizations';
import { useContentVersion } from '@/hooks/use-content-version';
import { useLocalizationList } from '@/hooks/use-localization-list';
import { resolveEditableVersionId } from '@/utils/content';
import { useCreateContentVersionMutation, useQueryOembedInfoLazyQuery } from '@usertour/hooks';
import {
  type LocalizedEmbedResolutions,
  applyContentsTranslationUnits,
  applyVersionDataTranslationUnits,
  buildLocalizedFlowSavePayload,
  buildLocalizedVersionDataSavePayload,
  collectOutdatedUnitPaths,
  collectOutdatedVersionDataPaths,
  createLocalizedWorkingContents,
  createLocalizedWorkingVersionData,
  extractContentsTranslationUnits,
  extractVersionDataTranslationUnits,
  mergeLocalizedEditorContents,
  mergeLocalizedVersionData,
} from '@usertour/helpers';
import { RiArrowLeftLine, RiArrowRightLine } from '@usertour/icons';
import type {
  AnnouncementData,
  BannerData,
  ChecklistData,
  Content,
  ContentEditorRoot,
  ContentVersion,
  LauncherData,
  Localization,
  LocalizedFlowContent,
  ResourceCenterData,
  Step,
  VersionOnLocalization,
} from '@usertour/types';
import { ContentDataType } from '@usertour/types';
import { Badge, Checkbox, TooltipProvider } from '@usertour/ui';
import { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { LocalizedEditorContents } from './localized-fields';
import { LocalizationPreviewDialog } from './localization-preview-dialog';
import { LocalizationTransferActions } from './localization-transfer-actions';
import { MachineTranslationButton, useUnitTranslateText } from './machine-translation-button';
import {
  LocalizationGroupCard,
  LocalizationViewProvider,
  countMissingUnits,
} from './localization-view';
import { type LocalizationSaveState, useLocalizationAutosave } from './use-localization-autosave';
import {
  AnnouncementLocalizationSections,
  BannerLocalizationSections,
  ChecklistLocalizationSections,
  LauncherLocalizationSections,
  ResourceCenterLocalizationSections,
} from './version-data-sections';

// ---------------------------------------------------------------------------
// Shared editor chrome — locale heading, enabled badge, save indicator and
// the language pair.
// ---------------------------------------------------------------------------

interface LocalizationEditorShellProps {
  localization: Localization;
  contentLocalization: VersionOnLocalization | undefined;
  saveState: LocalizationSaveState;
  sourceLocaleName: string;
  /** Untranslated units across the whole content, shown next to the filter. */
  missingCount: number;
  /** Per-row machine translation; null when unavailable. */
  translateText: ((sourceText: string) => Promise<string | null>) | null;
  /** Right-side header actions (export/import). */
  actions?: ReactNode;
  children: ReactNode;
}

const LocalizationEditorShell = (props: LocalizationEditorShellProps) => {
  const {
    localization,
    contentLocalization,
    saveState,
    sourceLocaleName,
    missingCount,
    translateText,
    actions,
    children,
  } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);

  const viewValue = useMemo(
    () => ({ showOnlyMissing, translateText }),
    [showOnlyMissing, translateText],
  );

  return (
    <LocalizationViewProvider value={viewValue}>
      <TooltipProvider>
        <div className="flex justify-center space-x-8 px-6 py-8 xl:px-8">
          <div className="mx-auto flex max-w-screen-xl grow flex-col space-y-6">
            {/* Identity row: locale name, delivery status and the language
                pair. Actions live on the toolbar row below, so long locale
                names get the full width; every text segment still truncates
                ("Chinese (Simplified, People's Republic of China)" is real). */}
            <div className="flex flex-row items-center space-x-2">
              <RiArrowLeftLine
                className="h-4 w-4 flex-none cursor-pointer"
                onClick={() => {
                  navigate(location.pathname.replace(`/${localization.locale}`, ''));
                }}
              />
              <h3 className="min-w-0 truncate text-lg font-medium" title={localization.name}>
                {localization.name}
              </h3>
              {contentLocalization?.enabled ? (
                <Badge variant="success" className="flex-none">
                  {t('contents.localization.status.enabled')}
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex-none">
                  {t('contents.localization.status.disabled')}
                </Badge>
              )}
              <span className="flex min-w-0 items-center gap-1 pl-2 text-sm text-muted-foreground">
                <span className="max-w-[12rem] truncate">{sourceLocaleName}</span>
                <RiArrowRightLine className="h-3.5 w-3.5 flex-none" />
                <span className="max-w-[12rem] truncate" title={localization.name}>
                  {localization.name}
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {/* Toolbar row: the view filter anchors the left, the save
                  indicator and actions the right. */}
              <div className="flex flex-row items-center">
                <label
                  htmlFor="show-only-missing"
                  className="flex w-fit cursor-pointer items-center gap-2 px-4 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Checkbox
                    id="show-only-missing"
                    checked={showOnlyMissing}
                    onCheckedChange={(checked) => setShowOnlyMissing(checked === true)}
                    // The default hairline vanishes against the page's gray shell.
                    className="border-muted-foreground/40 bg-background"
                  />
                  {t('contents.localization.onlyUntranslated')}
                  <span className="-ml-1">({missingCount})</span>
                </label>
                <div className="ml-auto flex flex-none items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {saveState === 'saving' && t('contents.localization.saving')}
                  </span>
                  {actions}
                </div>
              </div>
              {children}
            </div>
          </div>
        </div>
      </TooltipProvider>
    </LocalizationViewProvider>
  );
};

interface LocalizationMainProps {
  content: Content;
  version: ContentVersion;
  localization: Localization;
  defaultLocalization: Localization | undefined;
  contentLocalization: VersionOnLocalization | undefined;
  /** Save target, resolved at flush time — see useLocalizationSaveTarget. */
  resolveTargetVersionId: () => Promise<string>;
}

const useSourceLocaleName = (defaultLocalization: Localization | undefined): string => {
  const { t } = useTranslation();
  return defaultLocalization?.name ?? t('contents.localization.sourceLabel');
};

// CSV import can swap embed URLs, and the widget renders embeds from
// parsedUrl/oembed rather than the raw url — so every imported embed URL is
// resolved the same way the per-row load button does. URLs that fail to
// resolve still import: the stale source resolution is dropped by the
// applier, and the embed renders empty until resolved from its row.
const useImportedEmbedResolutions = () => {
  const { invoke: queryOembedInfo } = useQueryOembedInfoLazyQuery();
  return useCallback(
    async (translations: ReadonlyMap<string, string>): Promise<LocalizedEmbedResolutions> => {
      const urls = new Set<string>();
      translations.forEach((value, unitPath) => {
        const url = value.trim();
        if (unitPath.endsWith(':embed.url') && url !== '') {
          urls.add(url);
        }
      });
      const entries = await Promise.all(
        [...urls].map(async (url) => {
          try {
            const oembed = await queryOembedInfo(url);
            return [url, { parsedUrl: url, oembed: oembed ?? undefined }] as const;
          } catch (_) {
            return undefined;
          }
        }),
      );
      return new Map(
        entries.filter((entry): entry is NonNullable<typeof entry> => entry !== undefined),
      );
    },
    [queryOembedInfo],
  );
};

// ---------------------------------------------------------------------------
// Flow editor — one card per step, translations keyed by step cvid.
// ---------------------------------------------------------------------------

type TranslatableStep = Step & { cvid: string };

const FlowLocalizationMain = (props: LocalizationMainProps) => {
  const {
    content,
    version,
    localization,
    defaultLocalization,
    contentLocalization,
    resolveTargetVersionId,
  } = props;
  const { isViewOnly } = useAppContext();
  const sourceLocaleName = useSourceLocaleName(defaultLocalization);

  const disabled = isViewOnly;

  const steps = useMemo(
    () =>
      (version.steps ?? []).filter((step): step is TranslatableStep =>
        Boolean(step.cvid && step.data),
      ),
    [version.steps],
  );

  // The stored row as loaded at mount — the graft base for every save: a
  // save may only overwrite what this session could read, so fragments the
  // working copy couldn't align (drifted subtrees, removed steps) ride along
  // on each payload instead of being erased (buildLocalizedFlowSavePayload).
  const [storedLocalized] = useState(
    () => (contentLocalization?.localized ?? undefined) as LocalizedFlowContent | undefined,
  );
  const [storedBackup] = useState(
    () => (contentLocalization?.backup ?? undefined) as LocalizedFlowContent | undefined,
  );

  const [working, setWorking] = useState<LocalizedFlowContent>(() => {
    const initial: LocalizedFlowContent = {};
    for (const step of steps) {
      initial[step.cvid] = createLocalizedWorkingContents(
        step.data as ContentEditorRoot[],
        storedLocalized?.[step.cvid],
      );
    }
    return initial;
  });

  // Snapshot the outdated markers once per mount: every autosave rewrites
  // `backup` to the current source, so a live computation would clear all
  // markers on the first keystroke — before the translator reviewed them.
  // Reworking a row removes just its path (resolveStepOutdated below), so
  // the row dot, section chip and card count retire together as the
  // translator works through the list.
  const [outdatedByStep, setOutdatedByStep] = useState<Map<string, Set<string>>>(() => {
    const map = new Map<string, Set<string>>();
    if (!storedBackup) {
      return map;
    }
    for (const step of steps) {
      const stepBackup = storedBackup[step.cvid];
      if (stepBackup) {
        map.set(
          step.cvid,
          collectOutdatedUnitPaths(
            step.data as ContentEditorRoot[],
            stepBackup,
            storedLocalized?.[step.cvid],
          ),
        );
      }
    }
    return map;
  });

  const resolveStepOutdated = useCallback((cvid: string, unitPath: string) => {
    setOutdatedByStep((previous) => {
      const stepPaths = previous.get(cvid);
      if (!stepPaths?.has(unitPath)) {
        return previous;
      }
      const nextStepPaths = new Set(stepPaths);
      nextStepPaths.delete(unitPath);
      const next = new Map(previous);
      next.set(cvid, nextStepPaths);
      return next;
    });
  }, []);

  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const { saveState, scheduleSave } = useLocalizationAutosave({
    resolveTargetVersionId,
    localizationId: localization.id,
    enabled: contentLocalization?.enabled ?? false,
    buildBackup: () => {
      const current = Object.fromEntries(stepsRef.current.map((step) => [step.cvid, step.data]));
      if (!storedBackup) {
        return current;
      }
      // Steps the payload preserves but the version no longer has keep their
      // old source snapshot, so drift detection still works if they revive.
      const preserved = Object.entries(storedBackup).filter(([cvid]) => !(cvid in current));
      return { ...Object.fromEntries(preserved), ...current };
    },
  });

  const handleStepContentsChange = useCallback(
    (cvid: string, nextContents: ContentEditorRoot[]) => {
      setWorking((previous) => {
        const next = { ...previous, [cvid]: nextContents };
        scheduleSave(buildLocalizedFlowSavePayload(next, storedLocalized));
        return next;
      });
    },
    [scheduleSave, storedLocalized],
  );

  // Export/import addresses flow units as `steps/<cvid>/<unit path>`.
  const buildTransferUnits = useCallback(
    () =>
      steps.flatMap((step) =>
        extractContentsTranslationUnits(step.data as ContentEditorRoot[], working[step.cvid]).map(
          (unit) => ({ ...unit, path: `steps/${step.cvid}/${unit.path}` }),
        ),
      ),
    [steps, working],
  );

  const stepStats = useMemo(() => {
    const stats = new Map<string, { missing: number; outdated: number }>();
    for (const step of steps) {
      const units = extractContentsTranslationUnits(
        step.data as ContentEditorRoot[],
        working[step.cvid],
      );
      stats.set(step.cvid, {
        missing: countMissingUnits(units),
        outdated: outdatedByStep.get(step.cvid)?.size ?? 0,
      });
    }
    return stats;
  }, [steps, working, outdatedByStep]);
  const missingCount = useMemo(
    () => [...stepStats.values()].reduce((sum, stat) => sum + stat.missing, 0),
    [stepStats],
  );

  const translateText = useUnitTranslateText({
    versionId: version.id,
    localizationId: localization.id,
    disabled,
  });

  // Delivery-shape clone for the preview dialog: every translatable step gets
  // the working translations merged in, untouched steps pass through.
  const buildLocalizedVersion = useCallback(
    (): ContentVersion => ({
      ...version,
      steps: (version.steps ?? []).map((step) =>
        step.cvid && step.data
          ? {
              ...step,
              data: mergeLocalizedEditorContents(
                step.data as ContentEditorRoot[],
                working[step.cvid],
              ),
            }
          : step,
      ),
    }),
    [version, working],
  );

  const resolveImportedEmbeds = useImportedEmbedResolutions();
  const handleImportTranslations = useCallback(
    async (translations: ReadonlyMap<string, string>) => {
      const embedResolutions = await resolveImportedEmbeds(translations);
      setWorking((previous) => {
        const next: LocalizedFlowContent = { ...previous };
        for (const step of steps) {
          const prefix = `steps/${step.cvid}/`;
          const stepTranslations = new Map<string, string>();
          translations.forEach((value, key) => {
            if (key.startsWith(prefix)) {
              stepTranslations.set(key.slice(prefix.length), value);
            }
          });
          if (stepTranslations.size > 0) {
            next[step.cvid] = applyContentsTranslationUnits(
              step.data as ContentEditorRoot[],
              previous[step.cvid],
              stepTranslations,
              embedResolutions,
            );
          }
        }
        scheduleSave(buildLocalizedFlowSavePayload(next, storedLocalized));
        return next;
      });
    },
    [steps, scheduleSave, storedLocalized, resolveImportedEmbeds],
  );

  return (
    <LocalizationEditorShell
      localization={localization}
      contentLocalization={contentLocalization}
      saveState={saveState}
      sourceLocaleName={sourceLocaleName}
      missingCount={missingCount}
      translateText={translateText}
      actions={
        <>
          <LocalizationPreviewDialog
            contentType={content.type}
            localizationName={localization.name}
            localeCode={localization.code}
            buildLocalizedVersion={buildLocalizedVersion}
          />
          <MachineTranslationButton
            versionId={version.id}
            localizationId={localization.id}
            disabled={disabled}
            buildUnits={buildTransferUnits}
            onApply={handleImportTranslations}
          />
          <LocalizationTransferActions
            contentName={content.name ?? ''}
            localeCode={localization.code}
            importDisabled={disabled}
            buildUnits={buildTransferUnits}
            onImport={handleImportTranslations}
          />
        </>
      }
    >
      {steps.map((step, index) => {
        const stats = stepStats.get(step.cvid) ?? { missing: 0, outdated: 0 };
        return (
          <LocalizationGroupCard
            key={step.cvid}
            title={`${index + 1}. ${step.name}`}
            missingCount={stats.missing}
            outdatedCount={stats.outdated}
          >
            <LocalizedEditorContents
              sourceContents={(step.data ?? []) as ContentEditorRoot[]}
              workingContents={working[step.cvid] ?? []}
              outdatedUnitPaths={outdatedByStep.get(step.cvid)}
              onOutdatedResolved={(unitPath) => resolveStepOutdated(step.cvid, unitPath)}
              disabled={disabled}
              onContentsChange={(contents) => handleStepContentsChange(step.cvid, contents)}
            />
          </LocalizationGroupCard>
        );
      })}
    </LocalizationEditorShell>
  );
};

// ---------------------------------------------------------------------------
// Version-data editor — checklist / launcher / banner / announcement /
// resource center keep their translatable text in version.data.
// ---------------------------------------------------------------------------

const VersionDataLocalizationMain = (props: LocalizationMainProps) => {
  const {
    content,
    version,
    localization,
    defaultLocalization,
    contentLocalization,
    resolveTargetVersionId,
  } = props;
  const { isViewOnly } = useAppContext();
  const sourceLocaleName = useSourceLocaleName(defaultLocalization);

  const disabled = isViewOnly;
  const sourceData = version.data ?? {};

  // Same graft base as the flow editor: fragments of the stored row this
  // session couldn't read must survive every save (see
  // buildLocalizedVersionDataSavePayload).
  const [storedLocalizedData] = useState<unknown>(
    () => contentLocalization?.localized ?? undefined,
  );

  const [workingData, setWorkingData] = useState<unknown>(() =>
    createLocalizedWorkingVersionData(content.type, sourceData, storedLocalizedData),
  );

  // Same mount-time snapshot rationale as the flow editor.
  const [outdatedPaths, setOutdatedPaths] = useState<Set<string>>(() => {
    const backup = contentLocalization?.backup;
    if (!backup || Object.keys(backup).length === 0) {
      return new Set<string>();
    }
    return collectOutdatedVersionDataPaths(content.type, sourceData, backup, storedLocalizedData);
  });

  const resolveOutdated = useCallback((unitPath: string) => {
    setOutdatedPaths((previous) => {
      if (!previous.has(unitPath)) {
        return previous;
      }
      const next = new Set(previous);
      next.delete(unitPath);
      return next;
    });
  }, []);

  const { saveState, scheduleSave } = useLocalizationAutosave({
    resolveTargetVersionId,
    localizationId: localization.id,
    enabled: contentLocalization?.enabled ?? false,
    buildBackup: () => version.data ?? {},
  });

  const handleDataChange = useCallback(
    (data: unknown) => {
      setWorkingData(data);
      scheduleSave(buildLocalizedVersionDataSavePayload(content.type, data, storedLocalizedData));
    },
    [scheduleSave, content.type, storedLocalizedData],
  );

  const units = useMemo(
    () => extractVersionDataTranslationUnits(content.type, sourceData, workingData),
    [content.type, sourceData, workingData],
  );
  const missingCount = useMemo(() => countMissingUnits(units), [units]);
  const buildTransferUnits = useCallback(() => units, [units]);

  const translateText = useUnitTranslateText({
    versionId: version.id,
    localizationId: localization.id,
    disabled,
  });

  // Delivery-shape clone for the preview dialog.
  const buildLocalizedVersion = useCallback(
    (): ContentVersion => ({
      ...version,
      data: mergeLocalizedVersionData(content.type, sourceData, workingData),
    }),
    [version, content.type, sourceData, workingData],
  );

  const resolveImportedEmbeds = useImportedEmbedResolutions();
  const handleImportTranslations = useCallback(
    async (translations: ReadonlyMap<string, string>) => {
      const embedResolutions = await resolveImportedEmbeds(translations);
      setWorkingData((previous: unknown) => {
        const next = applyVersionDataTranslationUnits(
          content.type,
          sourceData,
          previous,
          translations,
          embedResolutions,
        );
        scheduleSave(buildLocalizedVersionDataSavePayload(content.type, next, storedLocalizedData));
        return next;
      });
    },
    [content.type, sourceData, scheduleSave, storedLocalizedData, resolveImportedEmbeds],
  );

  const sections = (() => {
    const sectionProps = {
      units,
      outdatedPaths,
      onOutdatedResolved: resolveOutdated,
      disabled,
      onDataChange: handleDataChange,
    };
    switch (content.type) {
      case ContentDataType.CHECKLIST:
        return (
          <ChecklistLocalizationSections
            sourceData={sourceData as ChecklistData}
            workingData={workingData as ChecklistData}
            {...sectionProps}
          />
        );
      case ContentDataType.LAUNCHER:
        return (
          <LauncherLocalizationSections
            sourceData={sourceData as LauncherData}
            workingData={workingData as LauncherData}
            {...sectionProps}
          />
        );
      case ContentDataType.BANNER:
        return (
          <BannerLocalizationSections
            sourceData={sourceData as BannerData}
            workingData={workingData as BannerData}
            {...sectionProps}
          />
        );
      case ContentDataType.ANNOUNCEMENT:
        return (
          <AnnouncementLocalizationSections
            sourceData={sourceData as AnnouncementData}
            workingData={workingData as AnnouncementData}
            {...sectionProps}
          />
        );
      case ContentDataType.RESOURCE_CENTER:
        return (
          <ResourceCenterLocalizationSections
            sourceData={sourceData as ResourceCenterData}
            workingData={workingData as ResourceCenterData}
            {...sectionProps}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <LocalizationEditorShell
      localization={localization}
      contentLocalization={contentLocalization}
      saveState={saveState}
      sourceLocaleName={sourceLocaleName}
      missingCount={missingCount}
      translateText={translateText}
      actions={
        <>
          <LocalizationPreviewDialog
            contentType={content.type}
            localizationName={localization.name}
            localeCode={localization.code}
            buildLocalizedVersion={buildLocalizedVersion}
          />
          <MachineTranslationButton
            versionId={version.id}
            localizationId={localization.id}
            disabled={disabled}
            buildUnits={buildTransferUnits}
            onApply={handleImportTranslations}
          />
          <LocalizationTransferActions
            contentName={content.name ?? ''}
            localeCode={localization.code}
            importDisabled={disabled}
            buildUnits={buildTransferUnits}
            onImport={handleImportTranslations}
          />
        </>
      }
    >
      {sections}
    </LocalizationEditorShell>
  );
};

// ---------------------------------------------------------------------------
// Route entry
// ---------------------------------------------------------------------------

/**
 * Resolves the version a translation write lands on, forking lazily: the
 * editor mounts on the content's edited version even when that version is
 * published, and only the first actual write forks a draft
 * (resolveEditableVersionId → createContentVersion, translation rows cloned
 * by copyVersionLocalizations) — the same write-time model as the detail
 * page's config saves and the localization table's enable toggle. Merely
 * viewing translations never mints a draft, and neither does publishing
 * from this page.
 *
 * Resolution re-checks the latest content on every flush: a publish that
 * happens mid-session (the publish button lives on this very page) turns
 * the bound version published, so the next write forks from it — and forks
 * again from that draft if it too gets published. The fork result is cached
 * to skip the round trip on later flushes; concurrent flushes may both call
 * createContentVersion, which the server serializes into one draft (row
 * lock + draft reuse).
 *
 * A fork repoints content.editedVersionId, but the mounted editor
 * deliberately does NOT follow (see the version pin below) — the draft is a
 * verbatim clone (steps keyed by cvid, identical data), so the working
 * copy, unit paths and outdated snapshot all stay valid. refetchContent
 * runs in the background so the rest of the app repoints at the draft.
 */
const useLocalizationSaveTarget = (
  content: Content | null | undefined,
  versionId: string | undefined,
  refetchContent: () => Promise<unknown>,
): (() => Promise<string>) => {
  const { invoke: createContentVersion } = useCreateContentVersionMutation();
  const contentRef = useRef(content);
  contentRef.current = content;
  // Keyed by the pinned version so a content switch can't reuse a stale fork.
  const forkedRef = useRef<{ base: string; forked: string } | null>(null);

  return useCallback(async (): Promise<string> => {
    const currentContent = contentRef.current;
    if (!versionId || !currentContent) {
      throw new Error('Missing version or content');
    }
    const bound = forkedRef.current?.base === versionId ? forkedRef.current.forked : versionId;
    const editableVersionId = await resolveEditableVersionId(
      currentContent,
      bound,
      createContentVersion,
    );
    if (editableVersionId !== bound) {
      forkedRef.current = { base: versionId, forked: editableVersionId };
      void refetchContent();
    }
    return editableVersionId;
  }, [versionId, createContentVersion, refetchContent]);
};

interface ContentLocalizationDetailProps {
  locateCode: string;
}

export const ContentLocalizationDetail = (props: ContentLocalizationDetailProps) => {
  const { locateCode } = props;
  const { contentId } = useContentDetailUI();
  const { content, refetch: refetchContent } = useContentDetail(contentId);

  // Pin the version the editor opened on. A save-triggered fork (see
  // useLocalizationSaveTarget) repoints content.editedVersionId at the new
  // draft, and following it would remount the editor mid-edit — dropping the
  // working copy and the mount-time outdated snapshot, and blanking the page
  // for a frame. The draft is a verbatim clone of the pinned version, so
  // rendering source texts from the pin while saving to the draft stays
  // consistent. Navigating to another content re-pins.
  const pinRef = useRef<{ contentId: string; versionId: string } | null>(null);
  if (content?.editedVersionId && pinRef.current?.contentId !== content.id) {
    pinRef.current = { contentId: content.id, versionId: content.editedVersionId };
  }
  const pinnedVersionId = pinRef.current?.versionId;

  const { version } = useContentVersion(pinnedVersionId);
  const { localizationList } = useLocalizationList();
  const { contentLocalizationList, loading } = useContentLocalizations(version?.id);
  const resolveTargetVersionId = useLocalizationSaveTarget(content, version?.id, refetchContent);

  const localization = localizationList?.find((item) => item.locale === locateCode);
  const defaultLocalization = localizationList?.find((item) => item.isDefault);

  // First-load gating only — a background refetch flips `loading` while the
  // list stays populated, and unmounting the editor then would drop unsaved
  // translation state. Loaded is tracked per version id: while the query is
  // skipped (version not resolved yet) `loading` is false without any fetch
  // having happened, and treating that as loaded would mount the editor with
  // an empty translation list, hiding every saved translation.
  const loadedVersionIdRef = useRef<string | null>(null);
  if (version?.id && !loading) {
    loadedVersionIdRef.current = version.id;
  }

  if (
    !content ||
    !version?.id ||
    !localization ||
    (loading && loadedVersionIdRef.current !== version.id)
  ) {
    return <></>;
  }
  if (content.type === ContentDataType.TRACKER) {
    return <></>;
  }

  const contentLocalization = contentLocalizationList.find(
    (row) => row.localizationId === localization.id,
  );
  const MainComponent =
    content.type === ContentDataType.FLOW ? FlowLocalizationMain : VersionDataLocalizationMain;

  return (
    <MainComponent
      // Remount on locale / version switch so working state re-initializes.
      key={`${version.id}:${localization.id}`}
      content={content}
      version={version}
      localization={localization}
      defaultLocalization={defaultLocalization}
      contentLocalization={contentLocalization}
      resolveTargetVersionId={resolveTargetVersionId}
    />
  );
};

ContentLocalizationDetail.displayName = 'ContentLocalizationDetail';
