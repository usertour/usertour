import { cn } from '@usertour-packages/tailwind';
import { useAppContext } from '@/contexts/app-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useContentVersionUpdate } from '@/hooks/use-content-version-update';
import { useContentVersionTheme } from '@/hooks/use-content-version-theme';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useThemeListContext } from '@/contexts/theme-list-context';
import { useLazyQuery } from '@apollo/client';
import { queryOembedInfo } from '@usertour-packages/gql';
import { useAws } from '@usertour-packages/builder/src/hooks/use-aws';
import { ContentEditor } from '@usertour-packages/shared-editor';
import { buildConfig } from '@usertour/helpers';
import {
  AnnouncementBoostedConfig,
  AnnouncementBoostedType,
  AnnouncementData,
  AnnouncementDistribution,
  ContentEditorElementType,
  DEFAULT_ANNOUNCEMENT_DATA,
  RulesCondition,
  Theme,
} from '@usertour/types';
import type { ContentEditorRoot, ContentOmbedInfo } from '@usertour/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Switch } from '@usertour-packages/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import {
  BadgeDistributionIcon,
  ModelIcon,
  RiMessageFill,
  RiNotificationOffFill,
  RiRocketFill,
  RiLayoutTop2Fill,
} from '@usertour-packages/icons';
import { CalendarIcon, CubeIcon } from '@radix-ui/react-icons';
import { Calendar } from '@usertour-packages/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { Button } from '@usertour-packages/button';
import { format, parseISO } from 'date-fns';
import { TimePicker } from '@/components/molecules/time-picker';
import {
  ContentDetailAutoStartRules,
  ContentDetailAutoStartRulesType,
} from './content-detail-autostart-rules';

// ============================================================================
// Constants
// ============================================================================

const ANNOUNCEMENT_ELEMENT_TYPES = [
  ContentEditorElementType.TEXT,
  ContentEditorElementType.BUTTON,
  ContentEditorElementType.IMAGE,
  ContentEditorElementType.EMBED,
];

const DISTRIBUTION_OPTIONS = [
  {
    value: AnnouncementDistribution.SILENT,
    label: 'Silent',
    description: 'Appears in resource center without notification',
    icon: RiNotificationOffFill,
  },
  {
    value: AnnouncementDistribution.BADGE,
    label: 'Badge',
    description: 'Shows an unread badge on the resource center',
    icon: BadgeDistributionIcon,
  },
  {
    value: AnnouncementDistribution.BOOSTED,
    label: 'Boosted',
    description: 'Proactively shown to the user via pop-out, modal, or toast',
    icon: RiRocketFill,
    iconClassName: 'rotate-[30deg]',
  },
] as const;

const BOOSTED_TYPE_OPTIONS = [
  {
    value: AnnouncementBoostedType.POPOUT,
    label: 'Pop-out',
    description: 'Appears near the resource center launcher',
    icon: RiMessageFill,
  },
  {
    value: AnnouncementBoostedType.MODAL,
    label: 'Modal',
    description: 'Centered overlay dialog',
    icon: ModelIcon,
  },
  {
    value: AnnouncementBoostedType.TOAST,
    label: 'Toast',
    description: 'Slide-in notification at the corner',
    icon: RiLayoutTop2Fill,
  },
] as const;

const DEFAULT_BOOSTED_CONFIG: AnnouncementBoostedConfig = {
  type: AnnouncementBoostedType.POPOUT,
  modalWidth: 480,
  toastWidth: 360,
  toastAutoDismiss: null,
};

// ============================================================================
// Boosted Settings
// ============================================================================

const AnnouncementBoostedSettings = ({
  config,
  onChange,
  disabled,
}: {
  config?: AnnouncementBoostedConfig;
  onChange: (config: AnnouncementBoostedConfig) => void;
  disabled?: boolean;
}) => {
  const current = config ?? DEFAULT_BOOSTED_CONFIG;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Type</span>
        <Select
          value={current.type}
          onValueChange={(value: string) =>
            onChange({ ...current, type: value as AnnouncementBoostedType })
          }
          disabled={disabled}
        >
          <SelectTrigger className="justify-start flex h-8">
            {(() => {
              const selected = BOOSTED_TYPE_OPTIONS.find((o) => o.value === current.type);
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
            {BOOSTED_TYPE_OPTIONS.map((option) => {
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

      {current.type === AnnouncementBoostedType.MODAL && (
        <div className="space-y-1.5">
          <Label htmlFor="boosted-modal-width" className="text-sm">
            Width (px)
          </Label>
          <Input
            id="boosted-modal-width"
            type="number"
            value={current.modalWidth ?? 480}
            onChange={(e) => onChange({ ...current, modalWidth: Number(e.target.value) || 480 })}
            disabled={disabled}
          />
        </div>
      )}

      {current.type === AnnouncementBoostedType.TOAST && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="boosted-toast-width" className="text-sm">
              Width (px)
            </Label>
            <Input
              id="boosted-toast-width"
              type="number"
              value={current.toastWidth ?? 360}
              onChange={(e) => onChange({ ...current, toastWidth: Number(e.target.value) || 360 })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="boosted-toast-dismiss" className="text-sm">
              Auto-dismiss (seconds)
            </Label>
            <Input
              id="boosted-toast-dismiss"
              type="number"
              placeholder="No auto-dismiss"
              value={current.toastAutoDismiss ?? ''}
              onChange={(e) =>
                onChange({
                  ...current,
                  toastAutoDismiss: e.target.value ? Number(e.target.value) : null,
                })
              }
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// Left Column: Settings
// ============================================================================

const AnnouncementSettingsColumn = () => {
  const { version } = useContentVersionContext();
  const { content } = useContentDetailContext();
  const { isViewOnly } = useAppContext();
  const { debouncedUpdateVersion, saveVersionData, saveVersionTheme } = useContentVersionUpdate();
  const { themeList } = useThemeListContext();

  const config = buildConfig(version?.config);
  const announcementData = (version?.data ?? DEFAULT_ANNOUNCEMENT_DATA) as AnnouncementData;

  // Use a ref to hold the latest data to avoid stale closures in callbacks
  const dataRef = useRef(announcementData);
  dataRef.current = announcementData;

  const handleAutoStartRulesDataChange = useCallback(
    (enabled: boolean, conditions: RulesCondition[], setting: any) => {
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
      const newData = { ...dataRef.current, distribution };
      if (distribution === AnnouncementDistribution.BOOSTED && !newData.boostedConfig) {
        newData.boostedConfig = { ...DEFAULT_BOOSTED_CONFIG };
      }
      saveVersionData(newData);
    },
    [saveVersionData],
  );

  const handleBoostedConfigChange = useCallback(
    (config: AnnouncementBoostedConfig) => {
      const newData = { ...dataRef.current, boostedConfig: config };
      saveVersionData(newData);
    },
    [saveVersionData],
  );

  const publishDate = announcementData.publishTime ? parseISO(announcementData.publishTime) : null;

  // Local state for the publish time picker — only save on popover close
  const [localPublishDate, setLocalPublishDate] = useState<Date | null>(publishDate);
  const localPublishDateRef = useRef(localPublishDate);
  localPublishDateRef.current = localPublishDate;

  const handlePublishDateChange = useCallback((date: Date | undefined) => {
    if (!date) {
      setLocalPublishDate(null);
      return;
    }
    const current = localPublishDateRef.current ?? new Date();
    date.setHours(current.getHours(), current.getMinutes(), 0, 0);
    setLocalPublishDate(date);
  }, []);

  const handlePublishTimeChange = useCallback((date: Date) => {
    const current = localPublishDateRef.current ?? new Date();
    current.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setLocalPublishDate(new Date(current));
  }, []);

  const handlePublishPopoverChange = useCallback(
    (open: boolean) => {
      if (open) {
        // Sync local state when opening
        setLocalPublishDate(publishDate);
      } else {
        // Save on close
        const newPublishTime = localPublishDateRef.current?.toISOString() ?? null;
        if (newPublishTime !== dataRef.current.publishTime) {
          saveVersionData({ ...dataRef.current, publishTime: newPublishTime });
        }
      }
    },
    [publishDate, saveVersionData],
  );

  const handleThemeChange = useCallback(
    (themeId: string) => saveVersionTheme(themeId),
    [saveVersionTheme],
  );

  if (!version || !content) return null;

  return (
    <div className="flex flex-col space-y-6 flex-none w-[420px]">
      {/* Auto-start rules */}
      <div className="px-4 py-6 space-y-3 shadow bg-white rounded-lg">
        <ContentDetailAutoStartRules
          defaultConditions={config.autoStartRules}
          defaultEnabled={config.enabledAutoStartRules}
          setting={config.autoStartRulesSetting}
          name="Only show announcement if..."
          onDataChange={handleAutoStartRulesDataChange}
          content={content}
          type={ContentDetailAutoStartRulesType.START_RULES}
          showIfCompleted={false}
          showFrequency={false}
          showAtLeast={true}
          showWait={false}
          showPriority={false}
          disabled={isViewOnly}
          featureTooltip={
            <>
              Show the announcement if the user matches the given condition. If the user doesn't
              match the condition, the announcement will not be displayed. Example: Show the
              announcement if the user is a new user, or set current page condition matches /* to
              display on all pages. <br />
            </>
          }
        />
      </div>

      {/* Theme selector */}
      <div className="px-4 py-4 space-y-3 shadow bg-white rounded-lg">
        <span className="text-sm font-semibold">Theme</span>
        <Select
          value={version.themeId ?? ''}
          onValueChange={handleThemeChange}
          disabled={isViewOnly}
        >
          <SelectTrigger className="justify-start flex h-9">
            <CubeIcon className="flex-none mr-2" />
            <div className="grow text-left">
              <SelectValue placeholder="Select theme" />
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
      <div className="px-4 py-4 space-y-3 shadow bg-white rounded-lg">
        <span className="text-sm font-semibold">Distribution</span>
        <div className="space-y-4">
          <Select
            value={announcementData.distribution}
            onValueChange={handleDistributionChange}
            disabled={isViewOnly}
          >
            <SelectTrigger className="justify-start flex h-8">
              {(() => {
                const selected = DISTRIBUTION_OPTIONS.find(
                  (o) => o.value === announcementData.distribution,
                );
                if (!selected) return <SelectValue />;
                const Icon = selected.icon;
                const iconCls = 'iconClassName' in selected ? selected.iconClassName : undefined;
                return (
                  <>
                    <Icon size={16} className={cn('text-current flex-none', iconCls)} />
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
              {DISTRIBUTION_OPTIONS.map((option) => {
                const Icon = option.icon;
                const iconCls = 'iconClassName' in option ? option.iconClassName : undefined;
                return (
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    <div className="flex flex-col">
                      <div className="flex flex-row space-x-1 items-center">
                        <Icon size={16} className={cn('text-current', iconCls)} />
                        <span className="text-xs font-bold">{option.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {announcementData.distribution === AnnouncementDistribution.BOOSTED && (
            <AnnouncementBoostedSettings
              config={announcementData.boostedConfig}
              onChange={handleBoostedConfigChange}
              disabled={isViewOnly}
            />
          )}
        </div>
      </div>

      {/* Announcement time */}
      <div className="px-4 py-4 space-y-3 shadow bg-white rounded-lg">
        <span className="text-sm font-semibold">Announcement time</span>
        <Popover onOpenChange={handlePublishPopoverChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal h-9',
                !publishDate && 'text-muted-foreground',
              )}
              disabled={isViewOnly}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {publishDate ? format(publishDate, 'PPP HH:mm') : 'Immediately'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              <div className="border-r">
                <Calendar
                  mode="single"
                  selected={localPublishDate ?? undefined}
                  onSelect={handlePublishDateChange}
                  initialFocus
                />
              </div>
              <div className="relative self-stretch" style={{ width: 130 }}>
                <div className="absolute inset-0 py-2 px-1">
                  <TimePicker value={localPublishDate} onChange={handlePublishTimeChange} />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

// ============================================================================
// Right Column: Content Editor
// ============================================================================

const AnnouncementContentColumn = () => {
  const { version } = useContentVersionContext();
  const { isViewOnly } = useAppContext();
  const { attributeList } = useAttributeListContext();
  const { upload } = useAws();
  const [queryOembed] = useLazyQuery(queryOembedInfo);
  const { project } = useAppContext();

  const announcementData = (version?.data ?? DEFAULT_ANNOUNCEMENT_DATA) as AnnouncementData;
  const { debouncedSaveVersionData } = useContentVersionUpdate();
  const { globalStyle } = useContentVersionTheme();

  // Use a ref to hold the latest data for stable callbacks
  const dataRef = useRef(announcementData);
  dataRef.current = announcementData;

  const handleCustomUploadRequest = useCallback(
    (file: File): Promise<string> => upload(file),
    [upload],
  );

  const getOembedInfo = useCallback(
    async (url: string): Promise<ContentOmbedInfo> => {
      const resp = { html: '', width: 0, height: 0 };
      const ret = await queryOembed({ variables: { url } });
      if (ret?.data?.queryOembedInfo) {
        return ret.data.queryOembedInfo;
      }
      return resp;
    },
    [queryOembed],
  );

  // Local state for text inputs to keep them responsive during debounced saves
  const [localTitle, setLocalTitle] = useState(announcementData.title);
  const [localReadMoreLabel, setLocalReadMoreLabel] = useState(announcementData.readMoreLabel);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalTitle(e.target.value);
      debouncedSaveVersionData({ ...dataRef.current, title: e.target.value });
    },
    [debouncedSaveVersionData],
  );

  const handleIntroContentChange = useCallback(
    (value: ContentEditorRoot[]) => {
      if (JSON.stringify(value) === JSON.stringify(dataRef.current.introContent)) return;
      const newData = { ...dataRef.current, introContent: value };
      debouncedSaveVersionData(newData);
    },
    [debouncedSaveVersionData],
  );

  const handleEnableReadMoreChange = useCallback(
    (checked: boolean) => {
      const newData = { ...dataRef.current, enableReadMore: checked };
      debouncedSaveVersionData(newData);
    },
    [debouncedSaveVersionData],
  );

  const handleReadMoreLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalReadMoreLabel(e.target.value);
      debouncedSaveVersionData({ ...dataRef.current, readMoreLabel: e.target.value });
    },
    [debouncedSaveVersionData],
  );

  const handleDetailContentChange = useCallback(
    (value: ContentEditorRoot[]) => {
      if (JSON.stringify(value) === JSON.stringify(dataRef.current.detailContent)) return;
      const newData = { ...dataRef.current, detailContent: value };
      debouncedSaveVersionData(newData);
    },
    [debouncedSaveVersionData],
  );

  // Apply theme CSS variables to the content editor wrappers
  const introEditorRef = useRef<HTMLDivElement>(null);
  const detailEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (globalStyle) {
      if (introEditorRef.current) introEditorRef.current.style.cssText = globalStyle;
      if (detailEditorRef.current) detailEditorRef.current.style.cssText = globalStyle;
    }
  }, [globalStyle]);

  const projectId = project?.id ?? '';

  // Memoize initial values to prevent unnecessary re-renders
  const initialIntroContent = useMemo(() => announcementData.introContent, []);
  const initialDetailContent = useMemo(() => announcementData.detailContent, []);

  if (!version) return null;

  return (
    <div className="flex flex-col space-y-6 grow">
      {/* Title */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Title</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={localTitle}
            onChange={handleTitleChange}
            placeholder="Enter announcement title"
            disabled={isViewOnly}
          />
        </CardContent>
      </Card>

      {/* Intro Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Intro content</CardTitle>
          <p className="text-xs text-muted-foreground">
            Displayed in the resource center announcement list.
          </p>
        </CardHeader>
        <CardContent>
          <div
            ref={introEditorRef}
            className="border rounded-md p-3 min-h-[120px] usertour-widget-root"
          >
            <ContentEditor
              zIndex={10002}
              customUploadRequest={handleCustomUploadRequest}
              initialValue={initialIntroContent}
              onValueChange={handleIntroContentChange}
              projectId={projectId}
              attributes={attributeList}
              enabledElementTypes={ANNOUNCEMENT_ELEMENT_TYPES}
              getOembedInfo={getOembedInfo}
            />
          </div>
        </CardContent>
      </Card>

      {/* Read More */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Read more</CardTitle>
            <Switch
              checked={announcementData.enableReadMore}
              onCheckedChange={handleEnableReadMoreChange}
              disabled={isViewOnly}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enable a detail page that users can navigate to from the announcement list.
          </p>
        </CardHeader>
        {announcementData.enableReadMore && (
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="announcement-read-more-label" className="text-sm">
                Button label
              </Label>
              <Input
                id="announcement-read-more-label"
                value={localReadMoreLabel}
                onChange={handleReadMoreLabelChange}
                placeholder="Read more"
                disabled={isViewOnly}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Detail content</span>
              <div
                ref={detailEditorRef}
                className="border rounded-md p-3 min-h-[120px] usertour-widget-root"
              >
                <ContentEditor
                  zIndex={10003}
                  customUploadRequest={handleCustomUploadRequest}
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
  const { version } = useContentVersionContext();
  const { content } = useContentDetailContext();

  if (!version || !content) return null;

  return (
    <div className="flex flex-row space-x-8 justify-center max-w-screen-xl mx-auto w-full items-start">
      <AnnouncementSettingsColumn />
      <AnnouncementContentColumn />
    </div>
  );
};

ContentDetailAnnouncementEditor.displayName = 'ContentDetailAnnouncementEditor';
