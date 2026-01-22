'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import {
  EXTENSION_CONTENT_POPPER,
  EXTENSION_CONTENT_SIDEBAR,
  MESSAGE_CRX_OPEN_NEW_TARGET,
} from '@usertour-packages/constants';
import { OutlineInput } from '@usertour-packages/input';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { Separator } from '@usertour-packages/separator';
import {
  Align,
  ContentAlignmentData,
  ContentModalPlacementData,
  Side,
  StepContentType,
} from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import { ChangeEvent, Ref, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getThemeWidthByStepType } from '@usertour-packages/widget';
import { BuilderMode, useBuilderContext } from '../../contexts';
import { useCurrentTheme } from '../../hooks/use-current-theme';
import { useAutoSidebarPosition } from '../../hooks/use-auto-sidebar-position';
import { ContentAlignment } from '../../components/content-alignment';
import { ContentModal } from '../../components/content-modal';
import { ContentModalPlacement } from '../../components/content-modal-placement';
import { ContentPopper } from '../../components/content-popper';
import { ContentSettings, ContentSettingsData } from '../../components/content-settings';
import { ContentTheme } from '../../components/content-theme';
import { ContentWidth } from '../../components/content-width';
import { SidebarMini } from '../sidebar/sidebar-mini';
import {
  useAttributeListContext,
  useContentListContext,
  useThemeListContext,
} from '@usertour-packages/contexts';
import { postProxyMessageToWindow } from '../../utils/post-message';
import { ContentEditorRoot } from '@usertour-packages/shared-editor';
import { getErrorMessage, hasMissingRequiredData } from '@usertour/helpers';
import { PlusIcon, SpinnerIcon } from '@usertour-packages/icons';
import { useToast } from '@usertour-packages/use-toast';
import { ContentType } from '../../components/content-type';
import { FlowPlacement } from './components/flow-placement';
import {
  useAddContentStepMutation,
  useUpdateContentStepMutation,
} from '@usertour-packages/shared-hooks';
import { ContentBubble } from '../../components/content-bubble';

const FlowBuilderDetailHeader = () => {
  const { setCurrentMode, currentStep, currentContent, updateCurrentStep } = useBuilderContext();

  const handleBackup = () => {
    setCurrentMode({ mode: BuilderMode.FLOW });
  };

  const handleStepNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateCurrentStep((pre) => ({
      ...pre,
      name: e.target.value,
    }));
  };

  return (
    <CardHeader className="flex-none p-5 space-y-2">
      <CardTitle className="text-base truncate ...">{currentContent?.name}</CardTitle>
      <div className="flex">
        <Button
          variant="link"
          size="icon"
          onClick={handleBackup}
          className="mr-2 text-foreground w-6 h-8"
        >
          <ChevronLeftIcon className="h-6 w-6 " />
        </Button>
        <div className="grow text-base leading-8">
          <OutlineInput
            value={currentStep?.name}
            className="h-8 focus-visible:ring-0"
            onChange={handleStepNameChange}
          />
        </div>
      </div>
    </CardHeader>
  );
};

const FlowBuilderDetailBody = () => {
  const { zIndex, currentStep, updateCurrentStep, currentTheme, projectId, webHost, isWebBuilder } =
    useBuilderContext();
  const { themeList } = useThemeListContext();

  // Get the effective theme for the current step (step > version > default)
  const effectiveTheme = useCurrentTheme({ fallbackToDefault: true });

  // Get the default width from theme based on step type
  const defaultWidth = useMemo(() => {
    if (!currentStep) return 300;
    return getThemeWidthByStepType(currentStep.type, effectiveTheme?.settings);
  }, [currentStep?.type, effectiveTheme?.settings]);

  const handleEditTheme = useCallback(() => {
    if (!currentStep || !currentTheme) {
      return false;
    }
    const url = `/project/${projectId}/settings/theme/${currentStep.themeId || currentTheme.id}`;
    if (isWebBuilder) {
      return window.open(url, '_blank');
    }
    postProxyMessageToWindow({
      kind: MESSAGE_CRX_OPEN_NEW_TARGET,
      url: `${webHost}${url}`,
    });
  }, [currentStep, currentTheme]);

  const handleAlignmentChange = (value: ContentAlignmentData) => {
    updateCurrentStep((pre) => ({
      ...pre,
      setting: { ...pre.setting, ...value },
    }));
  };

  const handlePositionChange = (value: ContentModalPlacementData) => {
    updateCurrentStep((pre) => ({
      ...pre,
      setting: { ...pre.setting, ...value },
    }));
  };

  const handleSettingsChange = (value: ContentSettingsData) => {
    updateCurrentStep((pre) => ({
      ...pre,
      setting: { ...pre.setting, ...value },
    }));
  };

  const handleThemeChange = (value: string | undefined) => {
    updateCurrentStep((pre) => ({
      ...pre,
      themeId: value,
    }));
  };

  const handleWidthChange = useCallback(
    (width: number | undefined) => {
      updateCurrentStep((pre) => ({
        ...pre,
        setting: { ...pre.setting, width },
      }));
    },
    [updateCurrentStep],
  );

  const handleContentTypeChange = (type: string) => {
    updateCurrentStep((pre) => ({
      ...pre,
      type,
    }));
  };

  if (!currentStep) {
    return <></>;
  }

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full ">
        <div className="flex-col space-y-6 p-4">
          <>
            <ContentType
              type={currentStep.type}
              zIndex={zIndex}
              onChange={handleContentTypeChange}
            />
            {currentStep.type !== StepContentType.HIDDEN && (
              <>
                <ContentTheme
                  themeList={themeList}
                  onEdited={handleEditTheme}
                  zIndex={zIndex}
                  themeId={currentStep.themeId}
                  onChange={handleThemeChange}
                />
                <Separator />
                <ContentWidth
                  type={currentStep.type as 'tooltip' | 'modal' | 'bubble'}
                  width={currentStep.setting.width}
                  defaultWidth={defaultWidth}
                  onChange={handleWidthChange}
                />
              </>
            )}
            {currentStep.type === StepContentType.TOOLTIP && <FlowPlacement />}
            {currentStep.type === StepContentType.TOOLTIP && (
              <ContentAlignment
                initialValue={{
                  side: currentStep.setting.side as Side,
                  align: currentStep.setting.align as Align,
                  alignType: currentStep.setting.alignType as 'auto' | 'fixed',
                  sideOffset: currentStep.setting.sideOffset,
                  alignOffset: currentStep.setting.alignOffset,
                }}
                onChange={handleAlignmentChange}
              />
            )}
            {currentStep.type === StepContentType.MODAL && (
              <ContentModalPlacement
                data={
                  {
                    position: currentStep.setting.position,
                    positionOffsetX: currentStep.setting.positionOffsetX,
                    positionOffsetY: currentStep.setting.positionOffsetY,
                  } as ContentModalPlacementData
                }
                onChange={handlePositionChange}
              />
            )}
            {currentStep.type !== StepContentType.HIDDEN && (
              <>
                <Separator />
                <ContentSettings
                  data={{
                    enabledBackdrop: currentStep.setting.enabledBackdrop,
                    skippable: currentStep.setting.skippable,
                    enabledBlockTarget: currentStep.setting.enabledBlockTarget,
                    explicitCompletionStep: currentStep.setting.explicitCompletionStep,
                  }}
                  onChange={handleSettingsChange}
                  type={currentStep.type}
                />
              </>
            )}
          </>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const FlowBuilderDetailFooter = () => {
  const {
    setCurrentMode,
    currentIndex,
    currentStep,
    fetchContentAndVersion,
    currentVersion,
    setIsShowError,
    contentRef,
  } = useBuilderContext();
  const [backupStepData] = useState(currentStep);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { invoke: addContentStep } = useAddContentStepMutation();
  const { invoke: updateContentStep } = useUpdateContentStepMutation();
  const { toast } = useToast();

  const handleSave = useCallback(async () => {
    if (!currentStep || !backupStepData) {
      return;
    }
    if (currentStep.type !== StepContentType.HIDDEN && hasMissingRequiredData(currentStep.data)) {
      return;
    }
    if (
      currentStep.type === StepContentType.TOOLTIP &&
      ((currentStep.target?.type === 'auto' && !currentStep.target?.selectors) ||
        (currentStep.target?.type === 'manual' && !currentStep.target?.customSelector))
    ) {
      setIsShowError(true);
      return;
    }
    try {
      let height = 0;
      if (contentRef.current) {
        const rect = contentRef.current?.getBoundingClientRect();
        height = rect.height;
      }
      setIsLoading(true);
      // const screenshot =
      //   currentStep.type == "tooltip"
      //     ? await uploadScreenshot(currentStep, backupStepData)
      //     : { mini: "", full: "" };
      const step = {
        ...currentStep,
        screenshot: { mini: '', full: '' },
        setting: { ...currentStep.setting, height },
      };
      if (!step.id) {
        if (!currentVersion?.id) {
          return toast({
            variant: 'destructive',
            title: 'Failed to create step!',
          });
        }
        const createdStep = await addContentStep({ ...step, versionId: currentVersion.id });
        if (createdStep && currentVersion?.contentId) {
          await fetchContentAndVersion(currentVersion?.contentId, currentVersion?.id);
        } else {
          return toast({
            variant: 'destructive',
            title: 'Failed to create step!',
          });
        }
      } else {
        const { id, createdAt, updatedAt, cvid, themeId, ...restUpdates } = step;
        // Convert undefined themeId to null so it can be properly sent to the backend
        // GraphQL will ignore undefined values, so we need to explicitly set null
        const updates = {
          ...restUpdates,
          themeId: themeId === undefined ? null : themeId,
        };
        const updatedStep = await updateContentStep(step.id, updates);
        if (updatedStep && currentVersion?.contentId) {
          await fetchContentAndVersion(currentVersion?.contentId, currentVersion?.id);
        } else {
          return toast({
            variant: 'destructive',
            title: 'Failed to create step!',
          });
        }
      }
    } catch (error) {
      return toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
    setIsLoading(false);
    setCurrentMode({ mode: BuilderMode.FLOW });
  }, [currentStep, currentIndex, backupStepData, contentRef]);

  return (
    <CardFooter className="flex-none p-5">
      <Button className="w-full h-10" disabled={isLoading} onClick={handleSave}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </CardFooter>
  );
};

const FlowBuilderDetailEmbed = () => {
  const {
    zIndex,
    currentStep,
    updateCurrentStep,
    currentVersion,
    contentRef,
    currentIndex,
    selectorOutput,
    currentContent,
    projectId,
    createNewStep,
  } = useBuilderContext();
  const { contents } = useContentListContext();
  const { attributeList } = useAttributeListContext();
  const theme = useCurrentTheme({ fallbackToDefault: true });
  const triggerRef = useRef<SVGSVGElement>(null);

  const handleContentChange = (value: ContentEditorRoot[]) => {
    updateCurrentStep((pre) => ({ ...pre, data: value }));
  };

  const centerClasses =
    'w-auto h-6 left-[50%] top-[50%] z-50 grid translate-x-[-50%] translate-y-[-50%]';

  useEffect(() => {
    if (selectorOutput) {
      const { target, screenshot } = selectorOutput;
      updateCurrentStep((pre) => ({
        ...pre,
        screenshot,
        target: {
          ...pre.target,
          selectors: target.selectors,
          content: target.content,
          selectorsList: target.selectorsList,
        },
      }));
    }
  }, [selectorOutput]);

  if (!currentStep || !theme || !projectId) {
    return <></>;
  }

  if (currentStep.type === StepContentType.TOOLTIP) {
    return (
      <>
        <PlusIcon width={24} height={24} ref={triggerRef} className={cn('fixed', centerClasses)} />
        <ContentPopper
          ref={contentRef as Ref<HTMLDivElement> | undefined}
          theme={theme}
          currentIndex={currentIndex}
          attributeList={attributeList}
          currentContent={currentContent}
          contents={contents}
          triggerRef={triggerRef}
          zIndex={zIndex + EXTENSION_CONTENT_POPPER}
          projectId={projectId}
          currentStep={currentStep}
          currentVersion={currentVersion}
          onChange={handleContentChange}
          createStep={createNewStep}
        />
      </>
    );
  }

  if (currentStep.type === StepContentType.MODAL) {
    return (
      <ContentModal
        theme={theme}
        ref={contentRef as Ref<HTMLDivElement> | undefined}
        attributeList={attributeList}
        projectId={projectId}
        contents={contents}
        zIndex={zIndex}
        currentIndex={currentIndex}
        currentStep={currentStep}
        currentVersion={currentVersion}
        onChange={handleContentChange}
        createStep={createNewStep}
        currentContent={currentContent}
      />
    );
  }

  if (currentStep.type === StepContentType.BUBBLE) {
    return (
      <ContentBubble
        theme={theme}
        ref={contentRef as Ref<HTMLDivElement> | undefined}
        attributeList={attributeList}
        projectId={projectId}
        contents={contents}
        zIndex={zIndex}
        currentIndex={currentIndex}
        currentStep={currentStep}
        currentVersion={currentVersion}
        onChange={handleContentChange}
        createStep={createNewStep}
        currentContent={currentContent}
      />
    );
  }

  return <></>;
};

export const FlowBuilderDetail = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { zIndex, position } = useBuilderContext();

  // Auto-adjust sidebar position when content position overlaps
  useAutoSidebarPosition();

  return (
    <>
      <div
        className={cn('w-80 h-screen p-2 fixed top-0', position === 'left' ? 'left-0' : 'right-0')}
        style={{ zIndex: zIndex + EXTENSION_CONTENT_SIDEBAR }}
        ref={ref}
      >
        <SidebarMini container={ref} />
        <Card className="h-full flex flex-col bg-background-800">
          <FlowBuilderDetailHeader />
          <FlowBuilderDetailBody />
          <FlowBuilderDetailFooter />
        </Card>
      </div>
      <FlowBuilderDetailEmbed />
    </>
  );
};

FlowBuilderDetail.displayName = 'FlowBuilderDetail';
