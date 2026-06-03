'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  OutlineInput,
  ScrollArea,
  Separator,
} from '@usertour/ui';
import { EXTENSION_CONTENT_POPPER, EXTENSION_CONTENT_SIDEBAR } from '@usertour/constants';
import {
  Align,
  ContentAlignmentData,
  ContentModalPlacementData,
  Side,
  StepContentType,
} from '@usertour/types';
import { cn } from '@usertour/tailwind';
import { ChangeEvent, Ref, useCallback, useMemo, useRef } from 'react';
import { getThemeWidthByStepType } from '@usertour/widget';
import {
  useBuilderConfig,
  useBuilderContentRef,
  useBuilderStore,
  useProjectId,
} from '@/pages/contents/components/builder/core';
import { useFlowEditor } from '@/pages/contents/components/builder/flow/use-flow-editor';
import { useSeedStepFromRoute } from '@/pages/contents/components/builder/flow/use-seed-step-from-route';
import { useActionsSaveGate } from '@/pages/contents/components/builder/hooks/use-actions-save-gate';
import { useCurrentTheme } from '@/pages/contents/components/builder/hooks/use-current-theme';
import { useAutoSidebarPosition } from '@/pages/contents/components/builder/hooks/use-auto-sidebar-position';
import { collectStepActions } from '@/pages/contents/components/builder/utils/collect-step-actions';
import { ContentAlignment } from '@/pages/contents/components/builder/components/content-alignment';
import { ContentModal } from '@/pages/contents/components/builder/components/content-modal';
import { ContentModalPlacement } from '@/pages/contents/components/builder/components/content-modal-placement';
import { ContentPopper } from '@/pages/contents/components/builder/components/content-popper';
import {
  ContentSettings,
  ContentSettingsData,
} from '@/pages/contents/components/builder/components/content-settings';
import { ContentTheme } from '@/pages/contents/components/builder/components/content-theme';
import { ContentWidth } from '@/pages/contents/components/builder/components/content-width';
import { SidebarMini } from '@/pages/contents/components/builder/components/sidebar/sidebar-mini';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { useThemeList } from '@/hooks/use-theme-list';
import { ContentEditorRoot } from '@usertour/editor';
import { hasMissingRequiredData } from '@usertour/helpers';
import { PlusIcon } from '@usertour/icons';
import { ContentType } from '@/pages/contents/components/builder/components/content-type';
import { FlowPlacement } from '@/pages/contents/components/builder/flow/components/flow-placement';
import { ContentBubble } from '@/pages/contents/components/builder/components/content-bubble';

const FlowBuilderDetailHeader = () => {
  const currentContent = useBuilderStore((state) => state.currentContent);
  const { currentStep, updateCurrentStep, exitToFlow } = useFlowEditor();

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
          onClick={exitToFlow}
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
  const { zIndex } = useBuilderConfig();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const projectId = useProjectId();
  const { currentStep, updateCurrentStep } = useFlowEditor();
  const { themeList } = useThemeList();

  // Get the effective theme for the current step (step > version > default)
  const effectiveTheme = useCurrentTheme({ fallbackToDefault: true });

  // Get the default width from theme based on step type
  const defaultWidth = useMemo(() => {
    if (!currentStep) return 300;
    return getThemeWidthByStepType(currentStep.type, effectiveTheme?.settings);
  }, [currentStep?.type, effectiveTheme?.settings]);

  const handleEditTheme = useCallback(() => {
    // The theme to edit is the step's explicit override, else the version's
    // theme. No explicit themeId → nothing to edit (don't fall back to default).
    const themeId = currentStep?.themeId || currentVersion?.themeId;
    if (!themeId) {
      return;
    }
    const url = `/project/${projectId}/settings/theme/${themeId}`;
    window.open(url, '_blank');
  }, [currentStep?.themeId, currentVersion?.themeId, projectId]);

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
  const contentRef = useBuilderContentRef();
  const { currentStep, setIsShowError, exitToFlow } = useFlowEditor();
  const setCurrentVersion = useBuilderStore((state) => state.setCurrentVersion);
  const actionsGate = useActionsSaveGate();

  // Commit the edited step into the currentVersion draft, then return to the
  // flow overview. Persistence is the auto-save FSM's job (it writes the whole
  // version via addContentSteps and re-baselines from the response) — no
  // per-step mutation, no re-fetch. A step without an id is appended; the
  // server creates it on the next save and the re-baseline carries its id back.
  const handleSave = useCallback(() => {
    if (!currentStep) {
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
    // Validate every action list across the step before commit: target
    // placement ("When target element is clicked") + each element's
    // data.actions (button, multi-choice, NPS, scale, star-rating) — block
    // here so the chip's red state actually gates the save.
    const stepActionLists = collectStepActions(currentStep);
    if (!actionsGate(...stepActionLists)) {
      return;
    }

    let height = 0;
    if (contentRef.current) {
      height = contentRef.current.getBoundingClientRect().height;
    }
    const step = {
      ...currentStep,
      screenshot: { mini: '', full: '' },
      setting: { ...currentStep.setting, height },
    };
    setCurrentVersion((prev) => {
      if (!prev) {
        return prev;
      }
      const steps = prev.steps ?? [];
      // Locate by cvid (front-end id, always present) not server id — a
      // not-yet-saved new step has a cvid but no id.
      const exists = steps.some((existing) => existing.cvid === step.cvid);
      const nextSteps = exists
        ? steps.map((existing) => (existing.cvid === step.cvid ? step : existing))
        : [...steps, step];
      return { ...prev, steps: nextSteps };
    });
    exitToFlow();
  }, [currentStep, contentRef, actionsGate, setIsShowError, setCurrentVersion, exitToFlow]);

  return (
    <CardFooter className="flex-none p-5">
      <Button className="w-full h-10" onClick={handleSave}>
        Save
      </Button>
    </CardFooter>
  );
};

const FlowBuilderDetailEmbed = () => {
  const { zIndex } = useBuilderConfig();
  const contentRef = useBuilderContentRef();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const currentContent = useBuilderStore((state) => state.currentContent);
  const projectId = useProjectId();
  const { currentStep, currentIndex, updateCurrentStep, createNewStep } = useFlowEditor();
  const { contents } = useContentList();
  const { attributeList } = useAttributeList();
  const theme = useCurrentTheme({ fallbackToDefault: true });
  const triggerRef = useRef<SVGSVGElement>(null);

  const handleContentChange = (value: ContentEditorRoot[]) => {
    updateCurrentStep((pre) => ({ ...pre, data: value }));
  };

  const centerClasses =
    'w-auto h-6 left-[50%] top-[50%] z-50 grid translate-x-[-50%] translate-y-[-50%]';

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
  useSeedStepFromRoute();
  const ref = useRef<HTMLDivElement>(null);
  const { zIndex } = useBuilderConfig();
  const position = useBuilderStore((state) => state.position);

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
