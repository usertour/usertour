import { useAppContext } from '@/contexts/app-context';
import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersion } from '@/hooks/use-content-version';
import { useContentVersionUpdate } from '@/hooks/use-content-version-update';
import { useThemeList } from '@/hooks/use-theme-list';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useOembedInfo } from '@/pages/contents/components/builder/hooks/use-oembed-info';
import { useAws } from '@usertour/hooks';
import { ContentEditor, type ContentEditorRoot } from '@usertour/editor';
import { buildConfig, convertSettings, convertToCssVars } from '@usertour/helpers';
import { cn } from '@usertour/tailwind';
import {
  AnnouncementData,
  AnnouncementDistribution,
  ContentEditorElementType,
  DEFAULT_ANNOUNCEMENT_DATA,
  RulesCondition,
  RulesType,
  Theme,
} from '@usertour/types';
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
import { BadgeDistributionIcon, RiNotificationOffFill, RiPaletteFill } from '@usertour/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ContentDetailAutoStartRules,
  ContentDetailAutoStartRulesType,
} from './content-detail-autostart-rules';

// Announcements are gated by user/segment/time conditions only — there is no
// page/element context for a resource-center surface.
const ANNOUNCEMENT_FILTER_ITEMS = [RulesType.USER_ATTR, RulesType.SEGMENT, RulesType.TIME];

// Inline content editing is limited to these element types.
const ANNOUNCEMENT_ELEMENT_TYPES = [
  ContentEditorElementType.TEXT,
  ContentEditorElementType.BUTTON,
  ContentEditorElementType.IMAGE,
  ContentEditorElementType.EMBED,
];

// ============================================================================
// Left Column: Settings
// ============================================================================

const AnnouncementSettingsColumn = () => {
  const { t } = useTranslation();
  const { contentId } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { version } = useContentVersion(content?.editedVersionId);
  const { isViewOnly } = useAppContext();
  const { debouncedUpdateVersion, saveVersionData, saveVersionTheme, saveVersionScheduledAt } =
    useContentVersionUpdate();
  const { themeList } = useThemeList();

  const config = buildConfig(version?.config, content?.type);
  const announcementData = (version?.data ?? DEFAULT_ANNOUNCEMENT_DATA) as AnnouncementData;

  // Hold the latest data in a ref to avoid stale closures in callbacks.
  const dataRef = useRef(announcementData);
  dataRef.current = announcementData;

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
    ],
    [t],
  );

  const handleAutoStartRulesDataChange = useCallback(
    (enabled: boolean, conditions: RulesCondition[], setting: any) => {
      if (conditions.length === 0) {
        debouncedUpdateVersion.cancel();
        return;
      }
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
      const distribution = value as AnnouncementDistribution;
      saveVersionData({ ...dataRef.current, distribution });
    },
    [saveVersionData],
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
              value={announcementData.distribution}
              onValueChange={handleDistributionChange}
              disabled={isViewOnly}
            >
              <SelectTrigger className="justify-start flex h-8">
                {(() => {
                  const selected = distributionOptions.find(
                    (option) => option.value === announcementData.distribution,
                  );
                  if (!selected) return <SelectValue />;
                  const Icon = selected.icon;
                  return (
                    <>
                      <Icon size={16} className="text-current flex-none" />
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

  const announcementData = (version?.data ?? DEFAULT_ANNOUNCEMENT_DATA) as AnnouncementData;
  const { debouncedSaveVersionData } = useContentVersionUpdate();

  // Hold the latest data in a ref for stable callbacks.
  const dataRef = useRef(announcementData);
  dataRef.current = announcementData;

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

  // Local state keeps the UI responsive during debounced saves.
  const [localTitle, setLocalTitle] = useState(announcementData.title);
  const [localReadMoreLabel, setLocalReadMoreLabel] = useState(announcementData.readMoreLabel);
  const [localEnableReadMore, setLocalEnableReadMore] = useState(announcementData.enableReadMore);

  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setLocalTitle(event.target.value);
      debouncedSaveVersionData({ ...dataRef.current, title: event.target.value });
    },
    [debouncedSaveVersionData],
  );

  const handleIntroContentChange = useCallback(
    (value: ContentEditorRoot[]) => {
      if (JSON.stringify(value) === JSON.stringify(dataRef.current.introContent)) return;
      debouncedSaveVersionData({ ...dataRef.current, introContent: value });
    },
    [debouncedSaveVersionData],
  );

  const handleEnableReadMoreChange = useCallback(
    (checked: boolean) => {
      setLocalEnableReadMore(checked);
      debouncedSaveVersionData({ ...dataRef.current, enableReadMore: checked });
    },
    [debouncedSaveVersionData],
  );

  const handleReadMoreLabelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setLocalReadMoreLabel(event.target.value);
      debouncedSaveVersionData({ ...dataRef.current, readMoreLabel: event.target.value });
    },
    [debouncedSaveVersionData],
  );

  const handleDetailContentChange = useCallback(
    (value: ContentEditorRoot[]) => {
      if (JSON.stringify(value) === JSON.stringify(dataRef.current.detailContent)) return;
      debouncedSaveVersionData({ ...dataRef.current, detailContent: value });
    },
    [debouncedSaveVersionData],
  );

  // Apply the theme CSS variables to the content editor wrappers.
  const introEditorRef = useRef<HTMLDivElement>(null);
  const detailEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!globalStyle) return;
    if (introEditorRef.current) introEditorRef.current.style.cssText = globalStyle;
    if (detailEditorRef.current) detailEditorRef.current.style.cssText = globalStyle;
  }, [globalStyle, localEnableReadMore]);

  const projectId = project?.id ?? '';

  // Memoize initial editor values so re-renders don't reset the editor state.
  const initialIntroContent = useMemo(() => announcementData.introContent, []);
  const initialDetailContent = useMemo(() => announcementData.detailContent, []);

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
            <ErrorTooltip open={!localTitle.trim()}>
              <ErrorTooltipAnchor asChild>
                <Input
                  value={localTitle}
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
                initialValue={initialIntroContent}
                onValueChange={handleIntroContentChange}
                projectId={projectId}
                attributes={attributeList}
                enabledElementTypes={ANNOUNCEMENT_ELEMENT_TYPES}
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
              checked={localEnableReadMore}
              onCheckedChange={handleEnableReadMoreChange}
              disabled={isViewOnly}
              className="data-[state=unchecked]:bg-input"
            />
          </div>
        </CardHeader>
        {localEnableReadMore && (
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
                value={localReadMoreLabel}
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
                  initialValue={initialDetailContent}
                  onValueChange={handleDetailContentChange}
                  projectId={projectId}
                  attributes={attributeList}
                  enabledElementTypes={ANNOUNCEMENT_ELEMENT_TYPES}
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

  if (!version || !content) return null;

  return (
    <div className="flex flex-row space-x-8 justify-center max-w-screen-xl mx-auto w-full items-start">
      <AnnouncementSettingsColumn />
      <AnnouncementContentColumn />
    </div>
  );
};

ContentDetailAnnouncementEditor.displayName = 'ContentDetailAnnouncementEditor';
