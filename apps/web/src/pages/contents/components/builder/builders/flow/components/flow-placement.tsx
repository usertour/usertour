import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour/ui';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '../../../hooks/use-content-list';
import { getAuthToken } from '@usertour/helpers';
import { window } from '@usertour/helpers';
import { ElementSelectorPropsData, StepScreenshot } from '@usertour/types';
import {
  ContentPlacementActions,
  ContentPlacementProvider,
} from '../../../components/content-placement';
import { ContentPlacementManual } from '../../../components/content-placement';
import { useBuilderConfig, useBuilderStore } from '../../../core';
import { useFlowEditor } from '../use-flow-editor';

export const FlowPlacement = () => {
  const { zIndex } = useBuilderConfig();
  const currentContent = useBuilderStore((state) => state.currentContent);
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const { isShowError, currentStep, updateCurrentStep, createNewStep } = useFlowEditor();

  const { contents } = useContentList();
  const { attributeList } = useAttributeList();

  const handleTargetChange = (target: ElementSelectorPropsData) => {
    updateCurrentStep((pre) => ({
      ...pre,
      target: { ...pre.target, ...target, type: 'manual' },
    }));
  };

  const handleScreenChange = (screenshot: StepScreenshot) => {
    updateCurrentStep((pre) => ({
      ...pre,
      screenshot,
    }));
  };

  const handleAboutPlacement = () => {
    window?.open(
      'https://docs.usertour.io/building-experiences/creating-your-first-flow#tooltip-placement-tooltips-only',
      '_blank',
    );
  };

  return (
    <ContentPlacementProvider
      isShowError={isShowError}
      zIndex={zIndex}
      target={currentStep?.target}
      screenshot={currentStep?.screenshot}
      onTargetChange={handleTargetChange}
      buildUrl={currentContent?.buildUrl}
      onScreenChange={handleScreenChange}
      token={getAuthToken()}
      subTitle="Show tooltip on this element"
    >
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-sm">Placement </h1>
          <Button variant="link" onClick={handleAboutPlacement} className="p-0 h-full">
            About placement
            <OpenInNewWindowIcon className="ml-1" />
          </Button>
        </div>
        <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
          <ContentPlacementManual />
          <ContentPlacementActions
            createStep={createNewStep}
            currentStep={currentStep || undefined}
            attributeList={attributeList}
            contents={contents}
            currentVersion={currentVersion}
          />
        </div>
      </div>
    </ContentPlacementProvider>
  );
};

FlowPlacement.displayName = 'FlowPlacement';
