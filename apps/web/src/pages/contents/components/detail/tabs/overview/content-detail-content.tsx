import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useThemeList } from '@/hooks/use-theme-list';
import { useContentBuilder } from '@/hooks/use-content-builder';
import { getStepId } from '@/utils/content';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersion } from '@/hooks/use-content-version';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  ScaledPreviewContainer,
  Button,
  Card,
} from '@usertour/ui';
import { stepIsReachable } from '@/pages/contents/components/builder/utils/content-validate';
import { AddIcon, EditIcon, EyeNoneIcon } from '@usertour/icons';
import { GoogleFontCss } from '@usertour/business-components';
import {
  BannerData,
  BannerEmbedPlacement,
  ChecklistData,
  ChecklistInitialDisplay,
  Content,
  ContentTypeName,
  ContentVersion,
  LauncherActionType,
  LauncherData,
  LauncherDataType,
  ResourceCenterData,
  Step,
  Theme,
  ThemeTypesSetting,
} from '@usertour/types';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentEditForm } from '../../../shared/content-edit-form';
import {
  BannerPreviewContent,
  ChecklistPreview,
  FlowPreview,
  LauncherPreview,
  ResourceCenterPreview,
} from '../../../shared/content-preview';
import { useAppContext } from '@/contexts/app-context';
import { cn } from '@usertour/tailwind';

interface ContentDetailContentStepProps {
  currentStep: Step;
  index: number;
  currentVersion: ContentVersion;
  onEdit: () => void;
  disabled: boolean;
}

const ContentBadge = ({
  children,
  className,
  textClassName,
}: {
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}) => {
  return (
    <Badge variant={'secondary'} className={className}>
      <span className={cn('first-letter:uppercase max-w-40 truncate inline-block', textClassName)}>
        {children}
      </span>
    </Badge>
  );
};

// Custom hook for theme handling
const useThemeHandler = (version: ContentVersion, themeId?: string | null) => {
  const { themeList } = useThemeList();
  const [currentTheme, setCurrentTheme] = useState<Theme | undefined>();

  useEffect(() => {
    if (!themeList?.length) return;

    let theme: Theme | undefined;
    if (themeId) {
      theme = themeList.find((item) => item.id === themeId);
    } else if (version?.themeId) {
      theme = themeList.find((item) => item.id === version.themeId);
    }

    theme && setCurrentTheme(theme);
  }, [themeList, version, themeId]);

  return currentTheme;
};

// Custom hook for scaled preview state management
const useScaledPreview = () => {
  const [contentRect, setContentRect] = useState<DOMRect | null>(null);
  const [scale, setScale] = useState<number>(1);
  const height =
    contentRect?.height && contentRect?.width && contentRect?.height > contentRect?.width
      ? contentRect?.height * scale
      : undefined;

  return { contentRect, scale, height, setContentRect, setScale };
};

// Reusable scaled preview wrapper component
interface ScaledPreviewWrapperProps {
  children: React.ReactNode;
  height?: number;
  onContentRectChange: (contentRect: DOMRect, scale: number) => void;
}

const ScaledPreviewWrapper = ({
  children,
  height,
  onContentRectChange,
}: ScaledPreviewWrapperProps) => {
  return (
    <div
      className="w-40 h-32 flex flex-none items-center [&_*]:pointer-events-none pointer-events-none"
      {...({ inert: '' } as any)}
      style={{ height: height ? `${height}px` : undefined }}
    >
      <ScaledPreviewContainer
        className="origin-[left_center]"
        maxWidth={160}
        maxHeight={600}
        onContentRectChange={onContentRectChange}
      >
        {children}
      </ScaledPreviewContainer>
    </div>
  );
};

// Reusable content preview card component
interface ContentPreviewCardProps {
  themeSettings: ThemeTypesSetting;
  title: string;
  badges: React.ReactNode;
  updatedAt?: string;
  onEdit: () => void;
  disabled: boolean;
  leftContent: React.ReactNode;
  warning?: React.ReactNode;
}

const ContentPreviewCard = ({
  themeSettings,
  title,
  badges,
  updatedAt,
  onEdit,
  disabled,
  leftContent,
  warning,
}: ContentPreviewCardProps) => {
  const { t } = useTranslation();
  return (
    <>
      <GoogleFontCss settings={themeSettings} />
      <Card className="flex flex-row p-4 px-8 space-x-8">
        {leftContent}

        <div className="grow flex flex-col relative space-y-1 min-w-80">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={'ghost'}
                  size={'icon'}
                  onClick={onEdit}
                  disabled={disabled}
                  className="right-0 top-0 absolute"
                >
                  <EditIcon className="w-4 h-4 cursor-pointer" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('contents.overview.previewCard.edit')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="font-bold max-w-80 truncate">{title}</div>

          <div className="text-sm flex flex-row flex-wrap gap-1">{badges}</div>

          {warning}

          {updatedAt && (
            <div className="text-xs absolute right-0 bottom-0 text-muted-foreground">
              {t('contents.overview.previewCard.lastEdited', {
                date: format(new Date(updatedAt), 'PPpp'),
              })}
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

// Simplified ContentDetailContentStep
const ContentDetailContentStep = ({
  currentStep,
  index,
  currentVersion,
  onEdit,
  disabled,
}: ContentDetailContentStepProps) => {
  const { t } = useTranslation();
  const currentTheme = useThemeHandler(currentVersion, currentStep.themeId);
  const { height, setContentRect, setScale } = useScaledPreview();

  if (!currentStep || !currentTheme) return null;

  const isHiddenStep = currentStep.type === 'hidden';

  const leftContent = isHiddenStep ? (
    <div className="w-40 h-32 flex flex-none items-center justify-center">
      <EyeNoneIcon className="w-8 h-8" />
    </div>
  ) : (
    <ScaledPreviewWrapper
      height={height}
      onContentRectChange={(rect, scale) => {
        setContentRect(rect);
        setScale(scale);
      }}
    >
      <FlowPreview
        currentTheme={currentTheme}
        currentStep={currentStep}
        currentVersion={currentVersion}
        currentStepIndex={index}
      />
    </ScaledPreviewWrapper>
  );

  const badges = (
    <>
      <ContentBadge>{currentStep.type}</ContentBadge>
      {!isHiddenStep && (
        <>
          <ContentBadge>
            {t('contents.overview.step.width', {
              value:
                currentStep.setting.width !== undefined
                  ? `${currentStep.setting.width}px`
                  : t('contents.overview.step.auto'),
            })}
          </ContentBadge>
          <ContentBadge>
            {t('contents.overview.step.height', {
              value: `${Math.floor(currentStep.setting.height)}px`,
            })}
          </ContentBadge>
          <ContentBadge>
            {t('contents.overview.step.theme', { name: currentTheme.name ?? '' })}
          </ContentBadge>
          <ContentBadge>
            {!currentStep.setting.skippable && t('contents.overview.step.notSkippable')}
            {currentStep.setting.skippable && t('contents.overview.step.skippable')}
          </ContentBadge>
          {currentStep.setting.enabledBackdrop && (
            <ContentBadge>{t('contents.overview.step.backdropEnabled')}</ContentBadge>
          )}
          {!currentStep.setting.enabledBackdrop && (
            <ContentBadge>{t('contents.overview.step.backdropDisabled')}</ContentBadge>
          )}
        </>
      )}
    </>
  );

  const warning = !stepIsReachable(currentVersion.steps as Step[], currentStep) ? (
    <div className="text-xs flex flex-row items-center text-warning space-x-1 pt-2">
      <ExclamationTriangleIcon className="h-3 w-3" />
      <span>{t('contents.overview.step.unreachableWarning')}</span>
    </div>
  ) : undefined;

  return (
    <div key={index}>
      <ContentPreviewCard
        themeSettings={currentTheme.settings}
        title={`${index + 1}. ${currentStep.name ?? ''}`}
        badges={badges}
        updatedAt={currentStep.updatedAt}
        onEdit={onEdit}
        disabled={disabled}
        leftContent={leftContent}
        warning={warning}
      />
    </div>
  );
};

interface LauncherContentPreviewProps {
  currentVersion: ContentVersion;
  content: Content;
  onEdit: () => void;
  disabled: boolean;
}

// Simplified LauncherContentPreview
const LauncherContentPreview = ({
  currentVersion,
  content,
  onEdit,
  disabled,
}: LauncherContentPreviewProps) => {
  const { t } = useTranslation();
  const currentTheme = useThemeHandler(currentVersion);
  const data = currentVersion.data as LauncherData;
  const { height, setContentRect, setScale } = useScaledPreview();

  if (!currentVersion || !currentTheme) return null;

  const leftContent = (
    <ScaledPreviewWrapper
      height={height}
      onContentRectChange={(rect, scale) => {
        setContentRect(rect);
        setScale(scale);
      }}
    >
      <LauncherPreview currentTheme={currentTheme} currentVersion={currentVersion} />
    </ScaledPreviewWrapper>
  );

  const badges = (
    <>
      <ContentBadge>{data.type}</ContentBadge>
      <ContentBadge>
        {t('contents.overview.launcher.targetElement', {
          value: data.target.element?.customSelector
            ? data.target.element.customSelector
            : t('contents.overview.launcher.notSet'),
        })}
      </ContentBadge>
      <ContentBadge>
        {t('contents.overview.launcher.targetAlignment', {
          value: data.target.alignment.alignType,
        })}
      </ContentBadge>
      <ContentBadge>
        {t('contents.overview.launcher.theme', { name: currentTheme.name ?? '' })}
      </ContentBadge>
      {data.type === LauncherDataType.ICON && data.iconType && (
        <ContentBadge>
          {t('contents.overview.launcher.iconType', { value: data.iconType })}
        </ContentBadge>
      )}
      <ContentBadge>
        {data.behavior.actionType === LauncherActionType.PERFORM_ACTION
          ? t('contents.overview.launcher.performAction')
          : t('contents.overview.launcher.showTooltip')}
      </ContentBadge>
    </>
  );

  return (
    <ContentPreviewCard
      themeSettings={currentTheme.settings}
      title={content.name ?? ''}
      badges={badges}
      updatedAt={currentVersion.updatedAt}
      onEdit={onEdit}
      disabled={disabled}
      leftContent={leftContent}
    />
  );
};

interface ChecklistContentPreviewProps {
  currentVersion: ContentVersion;
  content: Content;
  onEdit: () => void;
  disabled: boolean;
}

// Simplified ChecklistContentPreview
const ChecklistContentPreview = ({
  currentVersion,
  content,
  onEdit,
  disabled,
}: ChecklistContentPreviewProps) => {
  const { t } = useTranslation();
  const currentTheme = useThemeHandler(currentVersion);
  const data = currentVersion.data as ChecklistData;
  const { height, setContentRect, setScale } = useScaledPreview();

  if (!currentVersion || !currentTheme) return null;

  const leftContent = (
    <ScaledPreviewWrapper
      height={height}
      onContentRectChange={(rect, scale) => {
        setContentRect(rect);
        setScale(scale);
      }}
    >
      <ChecklistPreview currentTheme={currentTheme} currentVersion={currentVersion} />
    </ScaledPreviewWrapper>
  );

  const badges = (
    <>
      <ContentBadge>
        {t('contents.overview.checklist.launcherButtonText', { value: data.buttonText ?? '' })}
      </ContentBadge>
      <ContentBadge>
        {t('contents.overview.checklist.initialDisplay', {
          value:
            data.initialDisplay === ChecklistInitialDisplay.BUTTON
              ? t('contents.overview.checklist.initialDisplayButton')
              : data.initialDisplay === ChecklistInitialDisplay.EXPANDED
                ? t('contents.overview.checklist.initialDisplayExpanded')
                : '',
        })}
      </ContentBadge>
      <ContentBadge>
        {t('contents.overview.checklist.completionOrder', { value: data.completionOrder })}
      </ContentBadge>
      {data.preventDismissChecklist && (
        <ContentBadge>{t('contents.overview.checklist.preventDismiss')}</ContentBadge>
      )}
      {!data.preventDismissChecklist && (
        <ContentBadge>{t('contents.overview.checklist.allowDismiss')}</ContentBadge>
      )}
      <ContentBadge>
        {t('contents.overview.checklist.theme', { name: currentTheme.name ?? '' })}
      </ContentBadge>
      <ContentBadge>
        {t('contents.overview.checklist.items', { count: data.items.length })}
      </ContentBadge>
    </>
  );

  return (
    <ContentPreviewCard
      themeSettings={currentTheme.settings}
      title={content.name ?? ''}
      badges={badges}
      updatedAt={currentVersion.updatedAt}
      onEdit={onEdit}
      disabled={disabled}
      leftContent={leftContent}
    />
  );
};

interface BannerContentPreviewProps {
  currentVersion: ContentVersion;
  content: Content;
  onEdit: () => void;
  disabled: boolean;
}

const BannerContentPreview = ({
  currentVersion,
  content,
  onEdit,
  disabled,
}: BannerContentPreviewProps) => {
  const { t } = useTranslation();
  const currentTheme = useThemeHandler(currentVersion);
  const data = currentVersion.data as BannerData;
  const { height, setContentRect, setScale } = useScaledPreview();

  if (!currentVersion || !currentTheme) return null;

  const leftContent = (
    <ScaledPreviewWrapper
      height={height}
      onContentRectChange={(rect, scale) => {
        setContentRect(rect);
        setScale(scale);
      }}
    >
      <BannerPreviewContent
        currentTheme={currentTheme}
        currentVersion={currentVersion}
        previewClassName="justify-start"
      />
    </ScaledPreviewWrapper>
  );

  const placementRequiresElement =
    data.embedPlacement === BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT ||
    data.embedPlacement === BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT ||
    data.embedPlacement === BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT ||
    data.embedPlacement === BannerEmbedPlacement.IMMEDIATELY_AFTER_ELEMENT;
  const placementLabelMap: Record<BannerEmbedPlacement, string> = {
    [BannerEmbedPlacement.TOP_OF_PAGE]: t('contents.overview.banner.placement.topOfPage'),
    [BannerEmbedPlacement.BOTTOM_OF_PAGE]: t('contents.overview.banner.placement.bottomOfPage'),
    [BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT]: t(
      'contents.overview.banner.placement.topOfContainerElement',
    ),
    [BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT]: t(
      'contents.overview.banner.placement.bottomOfContainerElement',
    ),
    [BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT]: t(
      'contents.overview.banner.placement.immediatelyBeforeElement',
    ),
    [BannerEmbedPlacement.IMMEDIATELY_AFTER_ELEMENT]: t(
      'contents.overview.banner.placement.immediatelyAfterElement',
    ),
  };
  const bannerBadgeTextClassName = 'max-w-64';

  const badges = (
    <>
      <ContentBadge textClassName={bannerBadgeTextClassName}>
        {t('contents.overview.banner.showBannerAt', {
          placement: placementLabelMap[data.embedPlacement] ?? data.embedPlacement,
        })}
      </ContentBadge>
      {placementRequiresElement && (
        <ContentBadge textClassName={bannerBadgeTextClassName}>
          {t('contents.overview.banner.targetElement', {
            value: data.containerElement?.customSelector
              ? data.containerElement.customSelector
              : t('contents.overview.banner.notSet'),
          })}
        </ContentBadge>
      )}
      {data.stickToTopOfViewport && (
        <ContentBadge textClassName={bannerBadgeTextClassName}>
          {t('contents.overview.banner.stickToTopOfViewport')}
        </ContentBadge>
      )}
      <ContentBadge textClassName={bannerBadgeTextClassName}>
        {data.allowUsersToDismissEmbed
          ? t('contents.overview.banner.allowDismiss')
          : t('contents.overview.banner.preventDismiss')}
      </ContentBadge>
      <ContentBadge textClassName={bannerBadgeTextClassName}>
        {data.animateWhenEmbedAppears
          ? t('contents.overview.banner.animateOnAppear')
          : t('contents.overview.banner.noEnterAnimation')}
      </ContentBadge>
      {data.overlayEmbedOverAppContent && (
        <ContentBadge textClassName={bannerBadgeTextClassName}>
          {t('contents.overview.banner.overlayOverAppContent')}
        </ContentBadge>
      )}
      <ContentBadge textClassName={bannerBadgeTextClassName}>
        {t('contents.overview.banner.theme', { name: currentTheme.name ?? '' })}
      </ContentBadge>
    </>
  );

  return (
    <ContentPreviewCard
      themeSettings={currentTheme.settings}
      title={content.name ?? ''}
      badges={badges}
      updatedAt={currentVersion.updatedAt}
      onEdit={onEdit}
      disabled={disabled}
      leftContent={leftContent}
    />
  );
};

interface ResourceCenterContentPreviewProps {
  currentVersion: ContentVersion;
  content: Content;
  onEdit: () => void;
  disabled: boolean;
}

const ResourceCenterContentPreview = ({
  currentVersion,
  content,
  onEdit,
  disabled,
}: ResourceCenterContentPreviewProps) => {
  const { t } = useTranslation();
  const currentTheme = useThemeHandler(currentVersion);
  const data = currentVersion.data as ResourceCenterData;
  const { height, setContentRect, setScale } = useScaledPreview();

  if (!currentVersion || !currentTheme) return null;

  const leftContent = (
    <ScaledPreviewWrapper
      height={height}
      onContentRectChange={(rect, scale) => {
        setContentRect(rect);
        setScale(scale);
      }}
    >
      <ResourceCenterPreview currentTheme={currentTheme} currentVersion={currentVersion} />
    </ScaledPreviewWrapper>
  );

  const badges = (
    <>
      <ContentBadge>
        {t('contents.overview.resourceCenter.launcherButtonText', { value: data.buttonText ?? '' })}
      </ContentBadge>
      <ContentBadge>
        {t('contents.overview.resourceCenter.headerText', { value: data.headerText ?? '' })}
      </ContentBadge>
      <ContentBadge>
        {t('contents.overview.resourceCenter.tabs', { count: data.tabs?.length ?? 0 })}
      </ContentBadge>
      <ContentBadge>
        {t('contents.overview.resourceCenter.theme', { name: currentTheme.name ?? '' })}
      </ContentBadge>
    </>
  );

  return (
    <ContentPreviewCard
      themeSettings={currentTheme.settings}
      title={content.name ?? ''}
      badges={badges}
      updatedAt={currentVersion.updatedAt}
      onEdit={onEdit}
      disabled={disabled}
      leftContent={leftContent}
    />
  );
};

export const ContentDetailContent = () => {
  const { contentId, contentType } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { version } = useContentVersion(content?.editedVersionId);
  const [state, setState] = useState({
    isOpenedInstall: false,
    open: false,
    isLoading: false,
  });
  const { openBuilder } = useContentBuilder();
  const { isViewOnly } = useAppContext();

  if (!version || !content || !contentType) return null;

  const showAddButton = contentType === ContentTypeName.FLOWS;

  return (
    <>
      <div className="flex flex-col space-y-6 grow">
        {contentType === ContentTypeName.FLOWS &&
          version.steps?.map((step, index) => (
            <ContentDetailContentStep
              onEdit={() => openBuilder(content, contentType, getStepId(step, index))}
              currentStep={step}
              index={index}
              key={index}
              currentVersion={version}
              disabled={isViewOnly}
            />
          ))}
        {contentType === ContentTypeName.LAUNCHERS && content && version.data && (
          <LauncherContentPreview
            currentVersion={version}
            content={content}
            onEdit={() => openBuilder(content, contentType)}
            disabled={isViewOnly}
          />
        )}
        {contentType === ContentTypeName.CHECKLISTS && content && version.data && (
          <ChecklistContentPreview
            currentVersion={version}
            content={content}
            onEdit={() => openBuilder(content, contentType)}
            disabled={isViewOnly}
          />
        )}
        {contentType === ContentTypeName.BANNERS && content && version.data && (
          <BannerContentPreview
            currentVersion={version}
            content={content}
            onEdit={() => openBuilder(content, contentType)}
            disabled={isViewOnly}
          />
        )}
        {contentType === ContentTypeName.RESOURCE_CENTERS && content && version.data && (
          <ResourceCenterContentPreview
            currentVersion={version}
            content={content}
            onEdit={() => openBuilder(content, contentType)}
            disabled={isViewOnly}
          />
        )}
        {showAddButton && (
          <Button
            onClick={() => openBuilder(content, contentType)}
            className="py-8 rounded-lg bg-card cursor-pointer w-auto h-auto hover:bg-card shadow"
            disabled={isViewOnly}
          >
            <AddIcon width={40} height={40} className="text-primary" />
          </Button>
        )}
        <ContentEditForm
          content={content}
          onOpenChange={(open) => setState((prev) => ({ ...prev, open }))}
          open={state.open}
        />
      </div>
    </>
  );
};

ContentDetailContent.displayName = 'ContentDetailContent';
