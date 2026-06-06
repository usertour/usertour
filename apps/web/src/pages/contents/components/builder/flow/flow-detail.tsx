'use client';

import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  EditableTitle,
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
import { Ref, useCallback, useMemo, useRef, useState } from 'react';
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
import { SidebarControls } from '@/pages/contents/components/builder/flow/sidebar-controls';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { useThemeList } from '@/hooks/use-theme-list';
import { ContentEditorRoot } from '@usertour/editor';
import { hasMissingRequiredData } from '@usertour/helpers';
import { PlusIcon, RiArrowLeftSLine, RiMenuFoldLine, RiMenuUnfoldLine } from '@usertour/icons';
import { useTranslation } from 'react-i18next';
import { ContentType } from '@/pages/contents/components/builder/components/content-type';
import { FlowPlacement } from '@/pages/contents/components/builder/flow/components/flow-placement';
import { ContentBubble } from '@/pages/contents/components/builder/components/content-bubble';

interface FlowBuilderDetailHeaderProps {
  isLeft: boolean;
  onSwitchSide: () => void;
  onCollapse: () => void;
}

const FlowBuilderDetailHeader = (props: FlowBuilderDetailHeaderProps) => {
  const { isLeft, onSwitchSide, onCollapse } = props;
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
      <div className="flex items-center gap-2">
        <CardTitle className="grow truncate text-sm font-semibold">
          {currentContent?.name}
        </CardTitle>
        <SidebarControls isLeft={isLeft} onSwitchSide={onSwitchSide} onCollapse={onCollapse} />
      </div>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={exitToFlow}
          className="mr-1.5 size-7 shrink-0 rounded-md text-slate-600 hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <EditableTitle
          value={currentStep?.name ?? ''}
          onRename={handleStepRename}
          className="min-w-0 flex-1 text-base font-semibold"
        />
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
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full ">
        <div className="flex-col space-y-6 p-4">
          <>
            <ContentType type={currentStep.type} onChange={handleContentTypeChange} />
            {currentStep.type !== StepContentType.HIDDEN && (
              <>
                <ContentTheme
                  themeList={themeList}
                  onEdited={handleEditTheme}
                  zIndex={zIndex}
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
    <CardFooter className="flex-none border-t border-border/50 p-4">
      <Button className="w-full h-10" onClick={handleSave}>
        {t('contentBuilder.common.save')}
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
  const setPosition = useBuilderStore((state) => state.setPosition);
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation();
  const isLeft = position === 'left';

  // Auto-adjust sidebar position when content position overlaps
  useAutoSidebarPosition();

  return (
    <>
      <div
        ref={ref}
        style={{ zIndex: zIndex + EXTENSION_CONTENT_SIDEBAR }}
        className={cn(
          'fixed top-[18px] bottom-[18px] w-[312px] transition-transform duration-300 ease-in-out',
          isLeft ? 'left-[18px]' : 'right-[18px]',
          collapsed && (isLeft ? '-translate-x-[420px]' : 'translate-x-[420px]'),
        )}
      >
        <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background-900 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <FlowBuilderDetailHeader
            isLeft={isLeft}
            onSwitchSide={() => setPosition(isLeft ? 'right' : 'left')}
            onCollapse={() => setCollapsed(true)}
          />
          <FlowBuilderDetailBody />
          <FlowBuilderDetailFooter />
        </Card>
      </div>
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{ zIndex: zIndex + EXTENSION_CONTENT_SIDEBAR }}
          title={t('contentBuilder.common.expandPanel')}
          className={cn(
            'fixed top-[22px] grid size-9 place-items-center rounded-xl border border-border bg-background-900 text-muted-foreground shadow-[0_6px_16px_rgba(15,23,42,0.08)] hover:bg-muted hover:text-foreground',
            isLeft ? 'left-[18px]' : 'right-[18px]',
          )}
        >
          {isLeft ? (
            <RiMenuUnfoldLine className="h-[18px] w-[18px]" />
          ) : (
            <RiMenuFoldLine className="h-[18px] w-[18px]" />
          )}
        </button>
      )}
      <FlowBuilderDetailEmbed />
    </>
  );
};

FlowBuilderDetail.displayName = 'FlowBuilderDetail';
