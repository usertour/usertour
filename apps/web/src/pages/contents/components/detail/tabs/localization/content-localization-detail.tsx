import { useAppContext } from '@/contexts/app-context';
import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentLocalizations } from '@/hooks/use-content-localizations';
import { useContentVersion } from '@/hooks/use-content-version';
import { useLocalizationList } from '@/hooks/use-localization-list';
import { isVersionPublished, resolveEditableVersionId } from '@/utils/content';
import { getErrorMessage } from '@usertour/helpers';
import { useCreateContentVersionMutation } from '@usertour/hooks';
import {
  applyContentsTranslationUnits,
  applyVersionDataTranslationUnits,
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
import { Badge, Checkbox, TooltipProvider, useToast } from '@usertour/ui';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
            <div className="flex flex-row items-center space-x-2">
              <RiArrowLeftLine
                className="h-4 w-4 flex-none cursor-pointer"
                onClick={() => {
                  navigate(location.pathname.replace(`/${localization.locale}`, ''));
                }}
              />
              {/* Official locale display names run long ("Chinese (Simplified,
                  People's Republic of China)") — every text segment truncates so
                  the header stays one line at any name length. */}
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
              <div className="!ml-auto flex flex-none items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {saveState === 'saving' && t('contents.localization.saving')}
                  {saveState === 'saved' && t('contents.localization.saved')}
                </span>
                {actions}
              </div>
            </div>
            <div className="flex flex-col gap-4">
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
}

const useSourceLocaleName = (defaultLocalization: Localization | undefined): string => {
  const { t } = useTranslation();
  return defaultLocalization?.name ?? t('contents.localization.sourceLabel');
};

// ---------------------------------------------------------------------------
// Flow editor — one card per step, translations keyed by step cvid.
// ---------------------------------------------------------------------------

type TranslatableStep = Step & { cvid: string };

const FlowLocalizationMain = (props: LocalizationMainProps) => {
  const { content, version, localization, defaultLocalization, contentLocalization } = props;
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

  const [working, setWorking] = useState<LocalizedFlowContent>(() => {
    const localized = (contentLocalization?.localized ?? undefined) as
      | LocalizedFlowContent
      | undefined;
    const initial: LocalizedFlowContent = {};
    for (const step of steps) {
      initial[step.cvid] = createLocalizedWorkingContents(
        step.data as ContentEditorRoot[],
        localized?.[step.cvid],
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
    const backup = (contentLocalization?.backup ?? undefined) as LocalizedFlowContent | undefined;
    const map = new Map<string, Set<string>>();
    if (!backup) {
      return map;
    }
    for (const step of steps) {
      const stepBackup = backup[step.cvid];
      if (stepBackup) {
        map.set(step.cvid, collectOutdatedUnitPaths(step.data as ContentEditorRoot[], stepBackup));
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
    versionId: version.id,
    localizationId: localization.id,
    enabled: contentLocalization?.enabled ?? false,
    buildBackup: () => Object.fromEntries(stepsRef.current.map((step) => [step.cvid, step.data])),
  });

  const handleStepContentsChange = useCallback(
    (cvid: string, nextContents: ContentEditorRoot[]) => {
      setWorking((previous) => {
        const next = { ...previous, [cvid]: nextContents };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
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

  const handleImportTranslations = useCallback(
    (translations: ReadonlyMap<string, string>) => {
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
            );
          }
        }
        scheduleSave(next);
        return next;
      });
    },
    [steps, scheduleSave],
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
  const { content, version, localization, defaultLocalization, contentLocalization } = props;
  const { isViewOnly } = useAppContext();
  const sourceLocaleName = useSourceLocaleName(defaultLocalization);

  const disabled = isViewOnly;
  const sourceData = version.data ?? {};

  const [workingData, setWorkingData] = useState<unknown>(() =>
    createLocalizedWorkingVersionData(
      content.type,
      sourceData,
      contentLocalization?.localized ?? undefined,
    ),
  );

  // Same mount-time snapshot rationale as the flow editor.
  const [outdatedPaths, setOutdatedPaths] = useState<Set<string>>(() => {
    const backup = contentLocalization?.backup;
    if (!backup || Object.keys(backup).length === 0) {
      return new Set<string>();
    }
    return collectOutdatedVersionDataPaths(content.type, sourceData, backup);
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
    versionId: version.id,
    localizationId: localization.id,
    enabled: contentLocalization?.enabled ?? false,
    buildBackup: () => version.data ?? {},
  });

  const handleDataChange = useCallback(
    (data: unknown) => {
      setWorkingData(data);
      scheduleSave(data);
    },
    [scheduleSave],
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

  const handleImportTranslations = useCallback(
    (translations: ReadonlyMap<string, string>) => {
      setWorkingData((previous: unknown) => {
        const next = applyVersionDataTranslationUnits(
          content.type,
          sourceData,
          previous,
          translations,
        );
        scheduleSave(next);
        return next;
      });
    },
    [content.type, sourceData, scheduleSave],
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

interface ContentLocalizationDetailProps {
  locateCode: string;
}

export const ContentLocalizationDetail = (props: ContentLocalizationDetailProps) => {
  const { locateCode } = props;
  const { contentId } = useContentDetailUI();
  const { isViewOnly } = useAppContext();
  const { content, refetch: refetchContent } = useContentDetail(contentId);
  const { version } = useContentVersion(content?.editedVersionId);
  const { localizationList } = useLocalizationList();
  const { contentLocalizationList, loading } = useContentLocalizations(version?.id);
  const { invoke: createContentVersion } = useCreateContentVersionMutation();
  const { toast } = useToast();

  const localization = localizationList?.find((item) => item.locale === locateCode);
  const defaultLocalization = localizationList?.find((item) => item.isDefault);

  // Opening the translation editor on a published version forks a draft
  // first — the same behavior as "Edit in builder" — so translations always
  // land on the draft and ship through the normal publish flow. The fork
  // carries every translation row over (copyVersionLocalizations, keyed by
  // cvid) and the server reuses an existing draft, so re-entry can't stack
  // drafts. The editor stays unmounted until the refetched content points at
  // the draft.
  //
  // Forking is a write, so its condition must match "the editor will actually
  // mount": view-only members can't fork (no write capability) and read the
  // published translations in place instead, and a dead-end URL (unknown
  // locale, tracker) must not mint a draft as a side effect.
  const needsFork = Boolean(
    !isViewOnly &&
      content &&
      content.type !== ContentDataType.TRACKER &&
      localization &&
      version?.id &&
      isVersionPublished(content, version.id),
  );
  const forkingRef = useRef(false);
  useEffect(() => {
    if (!needsFork || forkingRef.current || !content || !version?.id) {
      return;
    }
    forkingRef.current = true;
    resolveEditableVersionId(content, version.id, createContentVersion)
      .then(() => refetchContent())
      .catch((error) => {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
      })
      .finally(() => {
        forkingRef.current = false;
      });
  }, [needsFork, content, version?.id, createContentVersion, refetchContent, toast]);

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
    needsFork ||
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
    />
  );
};

ContentLocalizationDetail.displayName = 'ContentLocalizationDetail';
