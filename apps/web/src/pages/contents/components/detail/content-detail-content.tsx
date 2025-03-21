import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useThemeListContext } from '@/contexts/theme-list-context';
import { useContentBuilder } from '@/hooks/useContentBuilder';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Badge } from '@usertour-ui/badge';
import { stepIsReachable } from '@usertour-ui/builder/src/utils/content-validate';
import { AddIcon, EditIcon, EyeNoneIcon, SpinnerIcon } from '@usertour-ui/icons';
import { GoogleFontCss, LoadingContainer } from '@usertour-ui/shared-components';
import { Tooltip, TooltipContent, TooltipTrigger } from '@usertour-ui/tooltip';
import { TooltipProvider } from '@usertour-ui/tooltip';
import {
  ChecklistData,
  ChecklistInitialDisplay,
  Content,
  ContentTypeName,
  ContentVersion,
  LauncherActionType,
  LauncherData,
  LauncherDataType,
  Step,
  Theme,
} from '@usertour-ui/types';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { ContentEditForm } from '../shared/content-edit-form';
import {
  ChecklistPreview,
  FlowPreview,
  LauncherPreview,
  ScaledPreviewContainer,
} from '../shared/content-preview';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@usertour-ui/button';

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
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Badge variant={'secondary'} className={className}>
      <span className="first-letter:uppercase">{children}</span>
    </Badge>
  );
};

// Create a custom hook for theme handling
const useThemeHandler = (version: ContentVersion, themeId?: string) => {
  const { themeList } = useThemeListContext();
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

// Simplified ContentDetailContentStep
const ContentDetailContentStep = ({
  currentStep,
  index,
  currentVersion,
  onEdit,
  disabled,
}: ContentDetailContentStepProps) => {
  const currentTheme = useThemeHandler(currentVersion, currentStep.themeId);
  const [contentRect, setContentRect] = useState<DOMRect | null>(null);
  const [scale, setScale] = useState<number>(1);
  const height =
    contentRect?.height && contentRect?.width && contentRect?.height > contentRect?.width
      ? contentRect?.height * scale
      : undefined;

  if (!currentStep || !currentTheme) return null;

  const isHidddenStep = currentStep.type === 'hidden';

  return (
    <>
      <GoogleFontCss settings={currentTheme.settings} />
      <div className="flex flex-row p-4 px-8 shadow bg-white rounded-lg space-x-8" key={index}>
        {!isHidddenStep && (
          <div
            className="w-40 h-32 flex flex-none items-center [&_*]:pointer-events-none pointer-events-none"
            style={{
              height: height ? `${height}px` : undefined,
            }}
          >
            <ScaledPreviewContainer
              className="origin-[left_center]"
              maxWidth={160}
              maxHeight={600}
              onContentRectChange={(contentRect, scale) => {
                setContentRect(contentRect);
                setScale(scale);
              }}
            >
              <FlowPreview currentTheme={currentTheme} currentStep={currentStep} />
            </ScaledPreviewContainer>
          </div>
        )}
        {isHidddenStep && (
          <div className="w-40 h-32 flex  flex-none items-center justify-center">
            <EyeNoneIcon className="w-8 h-8" />
          </div>
        )}
        <div className="grow flex flex-col relative space-y-1 min-w-80	">
          <div className="flex flex-row space-x-1 items-center right-0 top-0 absolute">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={'ghost'} size={'icon'} onClick={onEdit} disabled={disabled}>
                    <EditIcon className="w-4 h-4 cursor-pointer" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="font-bold flex flex-row space-x-1 items-center	">
            {index + 1}. {currentStep.name}
          </div>
          <div className="text-sm space-x-1">
            <ContentBadge>{currentStep.type}</ContentBadge>
            {!isHidddenStep && (
              <>
                <ContentBadge>width: {currentStep.setting.width}px</ContentBadge>
                <ContentBadge>height: {Math.floor(currentStep.setting.height)}px</ContentBadge>
                <ContentBadge>theme: {currentTheme.name}</ContentBadge>
              </>
            )}
          </div>
          {!isHidddenStep && (
            <div className="flex flex-row space-x-1">
              <ContentBadge>
                {!currentStep.setting.skippable && 'not skippable'}
                {currentStep.setting.skippable && 'skippable'}
              </ContentBadge>
              {currentStep.setting.enabledBackdrop && <ContentBadge>backdrop enabled</ContentBadge>}
              {!currentStep.setting.enabledBackdrop && (
                <ContentBadge>backdrop disabled</ContentBadge>
              )}
            </div>
          )}
          {!stepIsReachable(currentVersion.steps as Step[], currentStep) && (
            <div className="text-xs flex flex-row items-center text-warning space-x-1 pt-2">
              <ExclamationTriangleIcon className="h-3 w-3" />
              <span>
                Step is not reachable from the start step. Add a button, trigger that links to this
                step, or delete it in the builder.
              </span>
            </div>
          )}
          <div className="text-xs	 absolute right-0 bottom-0 text-muted-foreground">
            Last edited at{' '}
            {currentStep.updatedAt && format(new Date(currentStep.updatedAt), 'PPpp')}
          </div>
        </div>
      </div>
    </>
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
  const currentTheme = useThemeHandler(currentVersion);
  const data = currentVersion.data as LauncherData;

  if (!currentVersion || !currentTheme) return null;

  return (
    <>
      <GoogleFontCss settings={currentTheme.settings} />
      <div className="flex flex-row p-4 px-8 shadow bg-white rounded-lg space-x-8">
        <div className="w-40 h-32 flex  flex-none items-center justify-center">
          <LauncherPreview currentTheme={currentTheme} currentVersion={currentVersion} />
        </div>
        <div className="grow flex flex-col relative space-y-1 min-w-80	">
          <div className="flex flex-row space-x-1 items-center right-0 top-0 absolute">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={'ghost'} size={'icon'} onClick={onEdit} disabled={disabled}>
                    <EditIcon className="w-4 h-4 cursor-pointer" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="font-bold flex flex-row space-x-1 items-center	max-w-4/5	truncate ...">
            {content.name}
          </div>
          <div className="text-sm space-x-1">
            <ContentBadge>{data.type}</ContentBadge>
            <ContentBadge>target element: {data.target.element?.customSelector}</ContentBadge>
            <ContentBadge>target alignment: {data.target.alignment.alignType}</ContentBadge>
            <ContentBadge>theme: {currentTheme.name}</ContentBadge>
          </div>
          <div className="flex flex-row space-x-1">
            {data.type === LauncherDataType.ICON && data.iconType && (
              <ContentBadge>iconType: {data.iconType}</ContentBadge>
            )}
            <ContentBadge>
              {data.behavior.actionType === LauncherActionType.PERFORM_ACTION
                ? 'Perform action'
                : 'Show tooltip'}
            </ContentBadge>
          </div>
          <div className="text-xs	 absolute right-0 bottom-0 text-muted-foreground">
            Last edited at{' '}
            {currentVersion.updatedAt && format(new Date(currentVersion.updatedAt), 'PPpp')}
          </div>
        </div>
      </div>
    </>
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
  const currentTheme = useThemeHandler(currentVersion);
  const data = currentVersion.data as ChecklistData;
  const [contentRect, setContentRect] = useState<DOMRect | null>(null);
  const [scale, setScale] = useState<number>(1);
  const height =
    contentRect?.height && contentRect?.width && contentRect?.height > contentRect?.width
      ? contentRect?.height * scale
      : undefined;

  if (!currentVersion || !currentTheme) return null;

  return (
    <>
      <GoogleFontCss settings={currentTheme.settings} />
      <div className="flex flex-row p-4 px-8 shadow bg-white rounded-lg space-x-8">
        <div
          className="w-40 h-32 flex flex-none items-center [&_*]:pointer-events-none pointer-events-none"
          style={{
            height: height ? `${height}px` : undefined,
          }}
        >
          <ScaledPreviewContainer
            className="origin-[left_center]"
            maxWidth={160}
            maxHeight={600}
            onContentRectChange={(contentRect, scale) => {
              setContentRect(contentRect);
              setScale(scale);
            }}
          >
            <ChecklistPreview currentTheme={currentTheme} currentVersion={currentVersion} />
          </ScaledPreviewContainer>
        </div>
        <div className="grow flex flex-col relative space-y-1 min-w-80	">
          <div className="flex flex-row space-x-1 items-center right-0 top-0 absolute">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={'ghost'} size={'icon'} onClick={onEdit} disabled={disabled}>
                    <EditIcon className="w-4 h-4 cursor-pointer" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="font-bold flex flex-row space-x-1 items-center	max-w-4/5	truncate ...">
            {content.name}
          </div>
          <div className="text-sm flex flex-row flex-wrap gap-1">
            <ContentBadge>launcher button text: {data.buttonText}</ContentBadge>
            <ContentBadge>
              initial display: {data.initialDisplay === ChecklistInitialDisplay.BUTTON && 'button'}
              {data.initialDisplay === ChecklistInitialDisplay.EXPANDED && 'expanded'}
            </ContentBadge>
            <ContentBadge>Task completion order: {data.completionOrder}</ContentBadge>
            {data.preventDismissChecklist && (
              <ContentBadge>Prevent users from dismissing checklist</ContentBadge>
            )}
            {!data.preventDismissChecklist && (
              <ContentBadge>Allow users to dismiss checklist</ContentBadge>
            )}
            <ContentBadge>theme: {currentTheme.name}</ContentBadge>
            <ContentBadge>items: {data.items.length}</ContentBadge>
          </div>
          <div className="text-xs	 absolute right-0 bottom-0 text-muted-foreground">
            Last edited at{' '}
            {currentVersion.updatedAt && format(new Date(currentVersion.updatedAt), 'PPpp')}
          </div>
        </div>
      </div>
    </>
  );
};

export const ContentDetailContent = () => {
  const { version } = useContentVersionContext();
  const { content, contentType } = useContentDetailContext();
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
      {state.isLoading && (
        <LoadingContainer>
          <SpinnerIcon className="mr-2 h-4 w-4 animate-spin text-primary" />
        </LoadingContainer>
      )}
      <div className="flex flex-col space-y-6 grow">
        {contentType === ContentTypeName.FLOWS &&
          version.steps?.map((step, index) => (
            <ContentDetailContentStep
              onEdit={() => openBuilder(content, contentType)}
              currentStep={step}
              index={index}
              key={index}
              currentVersion={version}
              disabled={isViewOnly}
            />
          ))}
        {contentType === ContentTypeName.LAUNCHERS && content && (
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
        {showAddButton && (
          <Button
            onClick={() => openBuilder(content, contentType)}
            className="flex py-8 shadow bg-white rounded-lg justify-center cursor-pointer w-auto h-auto hover:bg-white "
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
