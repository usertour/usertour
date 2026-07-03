import { useAppContext } from '@/contexts/app-context';
import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersion } from '@/hooks/use-content-version';
import { useContentVersionUpdate } from '@/hooks/use-content-version-update';
import { useDefaultTheme, useThemeList } from '@/hooks/use-theme-list';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { isVersionPublished } from '@/utils/content';
import { useOembedInfo } from '@/pages/contents/components/builder/hooks/use-oembed-info';
import { useAws } from '@usertour/hooks';
import { ContentEditor, type ContentEditorRoot } from '@usertour/editor';
import { buildConfig, convertSettings, convertToCssVars } from '@usertour/helpers';
import { cn } from '@usertour/tailwind';
import {
  AnnouncementData,
  AnnouncementDistribution,
  AnnouncementPopupConfig,
  AnnouncementPopupStyle,
  ContentActionsItemType,
  ContentEditorElementType,
  RulesCondition,
  RulesType,
  Theme,
} from '@usertour/types';
import { DEFAULT_ANNOUNCEMENT_DATA, DEFAULT_POPUP_CONFIG } from '@usertour/constants';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DateTimePicker,
  ErrorTooltip,
  ErrorTooltipAnchor,
  ErrorTooltipContent,
  Input,
  Label,
  QuestionTooltip,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@usertour/ui';
import {
  BadgeDistributionIcon,
  ModelIcon,
  RiMessageFill,
  RiNotification2Fill,
  RiNotificationOffFill,
  RiPaletteFill,
} from '@usertour/icons';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ContentDetailAutoStartRules,
  ContentDetailAutoStartRulesType,
} from './content-detail-autostart-rules';

// Announcements are gated by user/segment/time conditions only — there is no
// page/element context for a resource-center surface.
// No TIME: announcement visibility is gated server-side (isVisibleByAutoStartRules),
// which has no time evaluator, and scheduledAt already covers "show from" timing.
// Offering TIME here would silently hide the announcement until an "end time"
// feature exists to make it meaningful.
const ANNOUNCEMENT_FILTER_ITEMS = [RulesType.USER_ATTR, RulesType.SEGMENT];

// Inline content editing is limited to these element types.
const ANNOUNCEMENT_ELEMENT_TYPES = [
  ContentEditorElementType.TEXT,
  ContentEditorElementType.BUTTON,
  ContentEditorElementType.IMAGE,
  ContentEditorElementType.EMBED,
];

// Button actions offered in announcement content. The default set also includes
// "Dismiss flow" and "Go to step", which are meaningless here (an announcement
// isn't a flow and has no steps), so drop both and keep the other three.
const ANNOUNCEMENT_ACTION_ITEMS = [
  ContentActionsItemType.FLOW_START,
  ContentActionsItemType.PAGE_NAVIGATE,
  ContentActionsItemType.JAVASCRIPT_EVALUATE,
];

// ============================================================================
// Shared data draft
// ============================================================================

// The announcement `data` JSON is edited from both columns (distribution on the
// left, title/intro/read-more on the right). Routing every edit through one
// optimistic draft + one debounced save makes concurrent field edits merge into
// a single source, instead of racing as whole-blob overwrites of the `data`
// column where a stale snapshot reverts another field.
interface AnnouncementDraftContextValue {
  data: AnnouncementData;
  patchData: (partial: Partial<AnnouncementData>) => void;
}

const AnnouncementDraftContext = createContext<AnnouncementDraftContextValue | null>(null);

const useAnnouncementDraft = () => {
  const draft = useContext(AnnouncementDraftContext);
  if (!draft) {
    throw new Error('useAnnouncementDraft must be used within ContentDetailAnnouncementEditor');
  }
  return draft;
};

// ============================================================================
// Popup Settings (only when distribution is POPUP)
// ============================================================================

export interface AnnouncementPopupSettingsProps {
  config?: AnnouncementPopupConfig;
  onChange: (config: AnnouncementPopupConfig) => void;
  disabled?: boolean;
}

const AnnouncementPopupSettings = (props: AnnouncementPopupSettingsProps) => {
  const { config, onChange, disabled } = props;
  const { t } = useTranslation();
  const current = config ?? DEFAULT_POPUP_CONFIG;

  const styleOptions = useMemo(
    () => [
      {
        value: AnnouncementPopupStyle.BUBBLE,
        label: t('contents.overview.announcement.popup.styleBubble.label'),
        description: t('contents.overview.announcement.popup.styleBubble.description'),
        icon: RiMessageFill,
      },
      {
        value: AnnouncementPopupStyle.MODAL,
        label: t('contents.overview.announcement.popup.styleModal.label'),
        description: t('contents.overview.announcement.popup.styleModal.description'),
        icon: ModelIcon,
      },
    ],
    [t],
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-sm font-medium">
          {t('contents.overview.announcement.popup.style')}
        </span>
        <Select
          value={current.style}
          onValueChange={(value: string) =>
            onChange({ ...current, style: value as AnnouncementPopupStyle })
          }
          disabled={disabled}
        >
          <SelectTrigger className="justify-start flex h-8">
            {(() => {
              const selected = styleOptions.find((option) => option.value === current.style);
              if (!selected) return <SelectValue />;
              const Icon = selected.icon;
              return (
                <>
                  <Icon size={16} className="text-muted-foreground flex-none" />
                  <div className="grow text-left ml-2">
                    <SelectValue asChild>
                      <span>{selected.label}</span>
                    </SelectValue>
                  </div>
                </>
              );
            })()}
          </SelectTrigger>
          <SelectContent>
            {styleOptions.map((option) => {
              const Icon = option.icon;
              return (
                <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                  <div className="flex flex-col">
                    <div className="flex flex-row space-x-1 items-center">
                      <Icon size={16} className="text-current" />
                      <span className="text-xs font-bold">{option.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// ============================================================================
// Left Column: Settings
// ============================================================================

const AnnouncementSettingsColumn = () => {
  const { t } = useTranslation();
  const { contentId } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { version } = useContentVersion(content?.editedVersionId);
  const { isViewOnly } = useAppContext();
  const { debouncedUpdateVersion, saveVersionTheme, saveVersionScheduledAt } =
    useContentVersionUpdate();
  const { themeList } = useThemeList();
  const defaultTheme = useDefaultTheme();
  const { data, patchData } = useAnnouncementDraft();

  const config = buildConfig(version?.config, content?.type);

  // Mirror the builder's theme defaulting (sidebar-theme). Announcements have no
  // builder, so without this their version keeps an empty themeId. The stored
  // themeId isn't rendered today — the resource center supplies its own theme —
  // but future self-rendering announcement formats resolve it like flows do, so
  // persist the project default when none is set. Guarded per version id so an
  // in-flight save doesn't trigger a second write before the version refetches.
  //
  // Skip when the current version is published: saveVersionTheme would fork it
  // into a draft, so merely viewing a published themeless announcement would
  // create a spurious "unpublished changes" draft. Like the builder, only write
  // the default onto an already-editable draft — a real edit forks first, then
  // this fills the themeId on that draft.
  const assignedDefaultThemeFor = useRef<string | null>(null);
  useEffect(() => {
    if (isViewOnly || !content || !version?.id || version.themeId || !defaultTheme) {
      return;
    }
    if (isVersionPublished(content, version.id)) {
      return;
    }
    if (assignedDefaultThemeFor.current === version.id) {
      return;
    }
    assignedDefaultThemeFor.current = version.id;
    saveVersionTheme(defaultTheme.id);
  }, [isViewOnly, content, version?.id, version?.themeId, defaultTheme, saveVersionTheme]);

  const distributionOptions = useMemo(
    () => [
      {
        value: AnnouncementDistribution.SILENT,
        label: t('contents.overview.announcement.distribution.silent.label'),
        description: t('contents.overview.announcement.distribution.silent.description'),
        icon: RiNotificationOffFill,
      },
      {
        value: AnnouncementDistribution.BADGE,
        label: t('contents.overview.announcement.distribution.badge.label'),
        description: t('contents.overview.announcement.distribution.badge.description'),
        icon: BadgeDistributionIcon,
      },
      {
        value: AnnouncementDistribution.POPUP,
        label: t('contents.overview.announcement.distribution.popup.label'),
        description: t('contents.overview.announcement.distribution.popup.description'),
        icon: RiNotification2Fill,
      },
    ],
    [t],
  );

  const handleAutoStartRulesDataChange = useCallback(
    (enabled: boolean, conditions: RulesCondition[], setting: any) => {
      // Unlike a tracker (where empty conditions are an invalid, unpublishable
      // state), an announcement with no "Only show if..." conditions is the
      // valid "show to everyone" state. So persist an empty set instead of
      // cancelling — clearing all conditions must actually broaden visibility.
      const newConfig = {
        ...config,
        enabledAutoStartRules: enabled,
        autoStartRules: conditions,
        autoStartRulesSetting: setting,
      };
      debouncedUpdateVersion(newConfig);
    },
    [config, debouncedUpdateVersion],
  );

  const handleDistributionChange = useCallback(
    (value: string) => {
      patchData({ distribution: value as AnnouncementDistribution });
    },
    [patchData],
  );

  const handlePopupConfigChange = useCallback(
    (popupConfig: AnnouncementPopupConfig) => {
      patchData({ popupConfig });
    },
    [patchData],
  );

  const handleScheduledAtChange = useCallback(
    (next: Date | undefined) => saveVersionScheduledAt(next ?? null),
    [saveVersionScheduledAt],
  );

  const handleThemeChange = useCallback(
    (themeId: string) => saveVersionTheme(themeId),
    [saveVersionTheme],
  );

  const scheduledDate = version?.scheduledAt ? new Date(version.scheduledAt) : undefined;

  if (!version || !content) return null;

  return (
    <div className="flex flex-col space-y-6 flex-none w-[420px]">
      {/* Auto-start rules */}
      <Card>
        <CardContent className="pt-6">
          <ContentDetailAutoStartRules
            defaultConditions={config.autoStartRules}
            defaultEnabled={config.enabledAutoStartRules}
            setting={config.autoStartRulesSetting}
            name={t('contents.overview.announcement.onlyShowIf')}
            onDataChange={handleAutoStartRulesDataChange}
            content={content}
            type={ContentDetailAutoStartRulesType.START_RULES}
            showIfCompleted={false}
            showFrequency={false}
            showAtLeast={true}
            showWait={false}
            showPriority={false}
            disabled={isViewOnly}
            filterItems={ANNOUNCEMENT_FILTER_ITEMS}
            featureTooltip={t('contents.overview.announcement.onlyShowIfTooltip')}
          />
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Announcement time */}
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-sm font-semibold">
                {t('contents.overview.announcement.time')}
              </span>
              <QuestionTooltip className="ml-1" contentClassName="max-w-sm">
                {t('contents.overview.announcement.timeTooltip')}
              </QuestionTooltip>
            </div>
            <DateTimePicker
              value={scheduledDate}
              onChange={handleScheduledAtChange}
              placeholder={t('contents.overview.announcement.immediately')}
              disabled={isViewOnly}
              className="w-full"
            />
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-sm font-semibold">
                {t('contents.overview.announcement.theme')}
              </span>
              <QuestionTooltip className="ml-1" contentClassName="max-w-sm">
                {t('contents.overview.announcement.themeTooltip')}
              </QuestionTooltip>
            </div>
            <Select
              value={version.themeId ?? ''}
              onValueChange={handleThemeChange}
              disabled={isViewOnly}
            >
              <SelectTrigger className="justify-start flex h-9">
                <RiPaletteFill size={16} className="flex-none mr-2 text-muted-foreground" />
                <div className="grow text-left">
                  <SelectValue placeholder={t('contents.overview.announcement.themePlaceholder')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {themeList?.map((theme: Theme) => (
                  <SelectItem value={theme.id} key={theme.id}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Distribution */}
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-sm font-semibold">
                {t('contents.overview.announcement.distribution.label')}
              </span>
              <QuestionTooltip className="ml-1" contentClassName="max-w-sm">
                {t('contents.overview.announcement.distribution.tooltip')}
              </QuestionTooltip>
            </div>
            <Select
              value={data.distribution}
              onValueChange={handleDistributionChange}
              disabled={isViewOnly}
            >
              <SelectTrigger className="justify-start flex h-8">
                {(() => {
                  const selected = distributionOptions.find(
                    (option) => option.value === data.distribution,
                  );
                  if (!selected) return <SelectValue />;
                  const Icon = selected.icon;
                  return (
                    <>
                      <Icon size={16} className="text-muted-foreground flex-none" />
                      <div className="grow text-left ml-2">
                        <SelectValue asChild>
                          <span>{selected.label}</span>
                        </SelectValue>
                      </div>
                    </>
                  );
                })()}
              </SelectTrigger>
              <SelectContent>
                {distributionOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                      <div className="flex flex-col">
                        <div className="flex flex-row space-x-1 items-center">
                          <Icon size={16} className="text-current" />
                          <span className="text-xs font-bold">{option.label}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Popup presentation (only for POPUP level) */}
          {data.distribution === AnnouncementDistribution.POPUP && (
            <AnnouncementPopupSettings
              config={data.popupConfig}
              onChange={handlePopupConfigChange}
              disabled={isViewOnly}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// Right Column: Content Editor
// ============================================================================

const AnnouncementContentColumn = () => {
  const { t } = useTranslation();
  const { contentId } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { version } = useContentVersion(content?.editedVersionId);
  const { isViewOnly, project } = useAppContext();
  const { attributeList } = useAttributeList();
  const { upload } = useAws();
  const { themeList } = useThemeList();
  const getOembedInfo = useOembedInfo();

  const { data, patchData } = useAnnouncementDraft();

  // Mirror the draft into a ref for the synchronous content-editor change
  // guards below (the editor re-emits identical content on mount/refocus).
  const dataRef = useRef(data);
  dataRef.current = data;

  // Derive the theme's global CSS variables so the inline editors render the
  // announcement content with the selected theme's styling.
  const theme = useMemo(
    () => themeList?.find((item) => item.id === version?.themeId),
    [themeList, version?.themeId],
  );
  const globalStyle = useMemo(
    () => (theme?.settings ? convertToCssVars(convertSettings(theme.settings), 'tooltip') : ''),
    [theme?.settings],
  );

  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      patchData({ title: event.target.value });
    },
    [patchData],
  );

  const handleIntroContentChange = useCallback(
    (value: ContentEditorRoot[]) => {
      if (JSON.stringify(value) === JSON.stringify(dataRef.current.introContent)) return;
      patchData({ introContent: value });
    },
    [patchData],
  );

  const handleEnableReadMoreChange = useCallback(
    (checked: boolean) => {
      patchData({ enableReadMore: checked });
    },
    [patchData],
  );

  const handleReadMoreLabelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      patchData({ readMoreLabel: event.target.value });
    },
    [patchData],
  );

  const handleDetailContentChange = useCallback(
    (value: ContentEditorRoot[]) => {
      if (JSON.stringify(value) === JSON.stringify(dataRef.current.detailContent)) return;
      patchData({ detailContent: value });
    },
    [patchData],
  );

  // Apply the theme CSS variables to the content editor wrappers.
  const introEditorRef = useRef<HTMLDivElement>(null);
  const detailEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!globalStyle) return;
    // Pair the themed background with the themed foreground (and the heading /
    // typography vars) that .usertour-widget-root applies. Applying only the
    // foreground over the admin's own surface makes text unreadable when the
    // theme's colors don't match the app's light/dark mode (e.g. a light theme's
    // dark text on the dark editor). The theme guarantees fg/bg contrast, so
    // pairing them keeps content legible on the surface it'll render on.
    const themedStyle = `${globalStyle};background-color: hsl(var(--usertour-background));`;
    if (introEditorRef.current) introEditorRef.current.style.cssText = themedStyle;
    if (detailEditorRef.current) detailEditorRef.current.style.cssText = themedStyle;
  }, [globalStyle, data.enableReadMore]);

  const projectId = project?.id ?? '';

  // ContentEditor is uncontrolled — it reads `initialValue` only when it mounts,
  // so pass the live draft rather than a first-mount snapshot. The detail editor
  // unmounts/remounts with the Read-more toggle; a frozen snapshot would remount
  // with stale content and then clobber saved edits when the user resumes typing.

  if (!version) return null;

  return (
    <div className="flex flex-col space-y-6 grow min-w-[560px]">
      {/* Content: Title + Intro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('contents.overview.announcement.content')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center">
              <Label className="text-sm">{t('contents.overview.announcement.title')}</Label>
              <QuestionTooltip className="ml-1" contentClassName="max-w-sm">
                {t('contents.overview.announcement.titleTooltip')}
              </QuestionTooltip>
            </div>
            <ErrorTooltip open={!data.title?.trim()}>
              <ErrorTooltipAnchor asChild>
                <Input
                  value={data.title}
                  onChange={handleTitleChange}
                  placeholder={t('contents.overview.announcement.titlePlaceholder')}
                  disabled={isViewOnly}
                />
              </ErrorTooltipAnchor>
              <ErrorTooltipContent side="right" align="center">
                {t('contents.overview.announcement.titleRequired')}
              </ErrorTooltipContent>
            </ErrorTooltip>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center">
              <Label className="text-sm">{t('contents.overview.announcement.intro')}</Label>
              <QuestionTooltip className="ml-1" contentClassName="max-w-sm">
                {t('contents.overview.announcement.introTooltip')}
              </QuestionTooltip>
            </div>
            <div
              ref={introEditorRef}
              className="border rounded-md p-3 min-h-[120px] usertour-widget-root"
            >
              <ContentEditor
                zIndex={10002}
                customUploadRequest={upload}
                initialValue={data.introContent}
                onValueChange={handleIntroContentChange}
                projectId={projectId}
                attributes={attributeList}
                enabledElementTypes={ANNOUNCEMENT_ELEMENT_TYPES}
                actionItems={ANNOUNCEMENT_ACTION_ITEMS}
                getOembedInfo={getOembedInfo}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Read More */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CardTitle className="text-base">
                {t('contents.overview.announcement.readMore')}
              </CardTitle>
              <QuestionTooltip className="ml-1" contentClassName="max-w-sm">
                {t('contents.overview.announcement.readMoreTooltip')}
              </QuestionTooltip>
            </div>
            <Switch
              checked={data.enableReadMore}
              onCheckedChange={handleEnableReadMoreChange}
              disabled={isViewOnly}
              className="data-[state=unchecked]:bg-input"
            />
          </div>
        </CardHeader>
        {data.enableReadMore && (
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center">
                <Label htmlFor="announcement-read-more-label" className="text-sm">
                  {t('contents.overview.announcement.readMoreButtonLabel')}
                </Label>
                <QuestionTooltip className="ml-1" contentClassName="max-w-sm">
                  {t('contents.overview.announcement.readMoreButtonLabelTooltip')}
                </QuestionTooltip>
              </div>
              <Input
                id="announcement-read-more-label"
                value={data.readMoreLabel}
                onChange={handleReadMoreLabelChange}
                placeholder={t('contents.overview.announcement.readMoreButtonLabelPlaceholder')}
                disabled={isViewOnly}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center">
                <span className="text-sm font-medium">
                  {t('contents.overview.announcement.detailContent')}
                </span>
                <QuestionTooltip className="ml-1" contentClassName="max-w-sm">
                  {t('contents.overview.announcement.detailContentTooltip')}
                </QuestionTooltip>
              </div>
              <div
                ref={detailEditorRef}
                className={cn('border rounded-md p-3 min-h-[120px] usertour-widget-root')}
              >
                <ContentEditor
                  zIndex={10003}
                  customUploadRequest={upload}
                  initialValue={data.detailContent}
                  onValueChange={handleDetailContentChange}
                  projectId={projectId}
                  attributes={attributeList}
                  enabledElementTypes={ANNOUNCEMENT_ELEMENT_TYPES}
                  actionItems={ANNOUNCEMENT_ACTION_ITEMS}
                  getOembedInfo={getOembedInfo}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ContentDetailAnnouncementEditor = () => {
  const { contentId } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { version } = useContentVersion(content?.editedVersionId);
  const { debouncedSaveVersionData } = useContentVersionUpdate();

  // Optimistic draft of the announcement `data` blob, owned here and shared with
  // both columns. Every edit merges into this one source and saves through a
  // single debounced call, so concurrent field edits can't overwrite each other
  // with stale whole-blob snapshots. `null` until the first edit — until then
  // reads fall through to the server version. The whole detail subtree remounts
  // per contentId (route key), so a fresh draft starts for each announcement.
  const [draftData, setDraftData] = useState<AnnouncementData | null>(null);
  const serverData = (version?.data as AnnouncementData) ?? DEFAULT_ANNOUNCEMENT_DATA;

  // Mirror the draft in a ref so patchData merges successive edits from the ref
  // rather than inside the setDraftData updater — the updater must stay pure
  // (StrictMode double-invokes it, which would double-fire the debounced save).
  // patchData is the only writer of draftData, so the ref stays in sync.
  const draftRef = useRef<AnnouncementData | null>(draftData);

  const patchData = useCallback(
    (partial: Partial<AnnouncementData>) => {
      const next = { ...(draftRef.current ?? serverData), ...partial };
      draftRef.current = next;
      setDraftData(next);
      debouncedSaveVersionData(next);
    },
    [debouncedSaveVersionData, serverData],
  );

  const draft = useMemo<AnnouncementDraftContextValue>(
    () => ({ data: draftData ?? serverData, patchData }),
    [draftData, serverData, patchData],
  );

  if (!version || !content) return null;

  return (
    <AnnouncementDraftContext.Provider value={draft}>
      <div className="flex flex-row space-x-8 justify-center max-w-screen-xl mx-auto w-full items-start">
        <AnnouncementSettingsColumn />
        <AnnouncementContentColumn />
      </div>
    </AnnouncementDraftContext.Provider>
  );
};

ContentDetailAnnouncementEditor.displayName = 'ContentDetailAnnouncementEditor';
