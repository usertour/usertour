'use client';

import { BUILDER_Z } from '@usertour/constants';
import {
  Button,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  EditableTitle,
  ScrollArea,
  Separator,
  useToast,
} from '@usertour/ui';
import {
  Align,
  ContentAlignmentData,
  ContentModalPlacementData,
  Side,
  StepContentType,
} from '@usertour/types';
import { cn } from '@usertour/tailwind';
import { Ref, useCallback, useMemo, useState } from 'react';
import { getThemeWidthByStepType } from '@usertour/widget';
import {
  useBuilderContentRef,
  useBuilderStore,
  useProjectId,
} from '@/pages/contents/components/builder/core';
import { useFlowEditor } from '@/pages/contents/components/builder/flow/use-flow-editor';
import { getStepId } from '@/utils/content';
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
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { useThemeList } from '@/hooks/use-theme-list';
import { ContentEditorRoot } from '@usertour/editor';
import { hasMissingRequiredData } from '@usertour/helpers';
import { PlusIcon, RiArrowLeftSLine } from '@usertour/icons';
import { useTranslation } from 'react-i18next';
import { ContentType } from '@/pages/contents/components/builder/components/content-type';
import { FlowPlacement } from '@/pages/contents/components/builder/flow/components/flow-placement';
import { ContentBubble } from '@/pages/contents/components/builder/components/content-bubble';

const FlowBuilderDetailHeader = () => {
  const currentContent = useBuilderStore((state) => state.currentContent);
  const { currentStep, updateCurrentStep, exitToFlow } = useFlowEditor();

  const handleStepRename = async (name: string) => {
    updateCurrentStep((pre) => ({
      ...pre,
      name,
    }));
  };

  return (
    <CardHeader className="flex-none space-y-2 border-b border-border/50 px-5 py-4">
      <CardTitle className="truncate pr-16 text-sm font-medium">{currentContent?.name}</CardTitle>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={exitToFlow}
          className="mr-1.5 size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <EditableTitle
          value={currentStep?.name ?? ''}
          onRename={handleStepRename}
          className="min-w-0 flex-1 text-base font-medium"
        />
      </div>
    </CardHeader>
  );
};

const FlowBuilderDetailBody = () => {
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

  // The theme to edit is the step's explicit override, else the version's
  // theme. No explicit themeId → no link (don't fall back to default).
  const editThemeId = currentStep?.themeId || currentVersion?.themeId;
  const editThemeUrl = editThemeId
    ? `/project/${projectId}/settings/theme/${editThemeId}`
    : undefined;

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

  const handleThemeChange = (value: string | null) => {
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
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full ">
        <div className="flex-col space-y-6 p-4">
          <>
            <ContentType type={currentStep.type} onChange={handleContentTypeChange} />
            {currentStep.type !== StepContentType.HIDDEN && (
              <>
                <ContentTheme
                  themeList={themeList}
                  editUrl={editThemeUrl}
                  themeId={currentStep.themeId}
                  onChange={handleThemeChange}
                />
                <Separator className="bg-border/50" />
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
                <Separator className="bg-border/50" />
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
  const { toast } = useToast();
  const setCurrentVersion = useBuilderStore((state) => state.setCurrentVersion);
  const actionsGate = useActionsSaveGate();
  const { t } = useTranslation();

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
      // Surface why the save didn't go through instead of a silent dead button.
      // setIsShowError reddens the blocks that read it (button / question); image
      // and embed editors don't, so the toast is what tells the user in those cases.
      setIsShowError(true);
      toast({
        variant: 'destructive',
        title: 'Fill in required fields before saving',
        description:
          'A block is missing required content (e.g. a button label, or an image / embed URL).',
      });
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
      if (exists) {
        return {
          ...prev,
          steps: steps.map((existing) => (existing.cvid === step.cvid ? step : existing)),
        };
      }
      // A brand-new step commits at its recorded sequence (the slot it was
      // created for), NOT the end. While it sits in the edit buffer, a goto-step
      // action inside it (e.g. an NPS "go to new step") can spawn later steps
      // straight into the version; appending here would drop this step BEHIND
      // them — the reported "new step lands before the current modal" bug.
      const at = Math.min(step.sequence ?? steps.length, steps.length);
      const nextSteps = [...steps];
      nextSteps.splice(at, 0, step);
      return {
        ...prev,
        steps: nextSteps.map((existing, index) => ({ ...existing, sequence: index })),
      };
    });
    exitToFlow();
  }, [currentStep, contentRef, actionsGate, setIsShowError, setCurrentVersion, exitToFlow, toast]);

  return (
    <CardFooter className="flex-none border-t border-border/50 p-4">
      <Button className="w-full h-10" onClick={handleSave}>
        {t('contentBuilder.common.save')}
      </Button>
    </CardFooter>
  );
};

export const FlowBuilderDetailEmbed = () => {
  const contentRef = useBuilderContentRef();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const currentContent = useBuilderStore((state) => state.currentContent);
  const projectId = useProjectId();
  const { currentStep, currentIndex, updateCurrentStep, createNewStep } = useFlowEditor();
  const { contents } = useContentList();
  const { attributeList } = useAttributeList();
  const theme = useCurrentTheme({ fallbackToDefault: true });
  // Anchor the tooltip preview via a callback ref + state so mounting the
  // stand-in triggers a re-render: ContentPopper returns null while
  // triggerRef.current is null, and a plain useRef wouldn't re-render once it
  // populates — leaving the tooltip blank after a step-type switch until some
  // later unrelated render.
  const [triggerEl, setTriggerEl] = useState<SVGSVGElement | null>(null);
  const triggerRef = useMemo(() => ({ current: triggerEl }), [triggerEl]);

  const handleContentChange = (value: ContentEditorRoot[]) => {
    updateCurrentStep((pre) => ({ ...pre, data: value }));
  };

  const centerClasses =
    'w-auto h-6 left-[50%] top-[50%] z-50 grid translate-x-[-50%] translate-y-[-50%]';

  if (!currentStep || !theme || !projectId) {
    return <></>;
  }

  // The preview widgets seed their editor state from currentStep once
  // (uncontrolled: useState(currentStep.data) + initialValue). Returning to the
  // overview leaves the previous step in the store, so a remounted Embed's first
  // frame still carries the stale step — the editor inits from it before the
  // route seed swaps in the real step. Key the widget by the step's stable id so
  // it remounts (and re-initializes) once currentStep becomes the clicked step.
  const stepKey = getStepId(currentStep, currentIndex);

  if (currentStep.type === StepContentType.TOOLTIP) {
    return (
      <>
        <PlusIcon
          width={24}
          height={24}
          ref={setTriggerEl}
          className={cn('fixed', centerClasses)}
        />
        <ContentPopper
          key={stepKey}
          ref={contentRef as Ref<HTMLDivElement> | undefined}
          theme={theme}
          currentIndex={currentIndex}
          attributeList={attributeList}
          currentContent={currentContent}
          contents={contents}
          triggerRef={triggerRef}
          zIndex={BUILDER_Z.canvas}
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
    // zIndex 0 = page base layer: the editor's element / action popovers (EDITOR_*)
    // must float above the modal, so its Popper sits below them — unlike the
    // tooltip popper, which uses BUILDER_Z.canvas.
    return (
      <ContentModal
        key={stepKey}
        theme={theme}
        ref={contentRef as Ref<HTMLDivElement> | undefined}
        attributeList={attributeList}
        projectId={projectId}
        contents={contents}
        zIndex={0}
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
    // zIndex 0 — page base layer, see the ContentModal note above.
    return (
      <ContentBubble
        key={stepKey}
        theme={theme}
        ref={contentRef as Ref<HTMLDivElement> | undefined}
        attributeList={attributeList}
        projectId={projectId}
        contents={contents}
        zIndex={0}
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

// Step-detail content. The floating panel chrome (and the canvas preview, via
// FlowBuilderDetailEmbed) are rendered by the flow router; this is just what
// goes inside the persistent shell.
export const FlowBuilderDetail = () => {
  useSeedStepFromRoute();
  // Auto-adjust sidebar position when content position overlaps
  useAutoSidebarPosition();

  return (
    <>
      <FlowBuilderDetailHeader />
      <FlowBuilderDetailBody />
      <FlowBuilderDetailFooter />
    </>
  );
};

FlowBuilderDetail.displayName = 'FlowBuilderDetail';
