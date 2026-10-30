'use client';

import { CardContent, ScrollArea } from '@usertour/ui';
import { StepContentType } from '@usertour/types';
import { getStepTypesForContentType } from '@usertour/constants';
import { useBuilderStore, useProjectId } from '@/pages/contents/components/builder/core';
import { ContentTheme } from '@/pages/contents/components/builder/components/content-theme';
import { ContentType } from '@/pages/contents/components/builder/components/content-type';
import {
  FlowBuilderDetailFooter,
  FlowBuilderDetailHeader,
} from '@/pages/contents/components/builder/flow/flow-detail';
import { useFlowEditor } from '@/pages/contents/components/builder/flow/use-flow-editor';
import { useSeedStepFromRoute } from '@/pages/contents/components/builder/flow/use-seed-step-from-route';
import { useThemeList } from '@/hooks/use-theme-list';

// An inline step has no popup geometry: its placement, width and dismiss
// button are the shell's. What is left per step is its kind (inline / hidden) and an
// optional theme override, like a flow step's.
const EmbedBuilderDetailBody = () => {
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const currentContent = useBuilderStore((state) => state.currentContent);
  const projectId = useProjectId();
  const { currentStep, updateCurrentStep } = useFlowEditor();
  const { themeList } = useThemeList();

  const editThemeId = currentStep?.themeId || currentVersion?.themeId;
  const editThemeUrl = editThemeId
    ? `/project/${projectId}/settings/theme/${editThemeId}`
    : undefined;

  const handleThemeChange = (value: string | null) => {
    updateCurrentStep((previous) => ({ ...previous, themeId: value }));
  };

  const handleContentTypeChange = (type: string) => {
    updateCurrentStep((previous) => ({ ...previous, type }));
  };

  if (!currentStep) {
    return <></>;
  }

  return (
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full ">
        <div className="flex-col space-y-6 p-4">
          <ContentType
            type={currentStep.type}
            onChange={handleContentTypeChange}
            options={getStepTypesForContentType(currentContent?.type)}
          />
          {currentStep.type !== StepContentType.HIDDEN && (
            <ContentTheme
              themeList={themeList}
              editUrl={editThemeUrl}
              themeId={currentStep.themeId}
              onChange={handleThemeChange}
            />
          )}
        </div>
      </ScrollArea>
    </CardContent>
  );
};

// Step-detail content inside the persistent panel; the canvas is a separate
// route-driven layer (EmbedStepCanvas).
export const EmbedBuilderDetail = () => {
  useSeedStepFromRoute();

  return (
    <>
      <FlowBuilderDetailHeader />
      <EmbedBuilderDetailBody />
      <FlowBuilderDetailFooter />
    </>
  );
};

EmbedBuilderDetail.displayName = 'EmbedBuilderDetail';
