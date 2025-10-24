import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { useAttributeListContext, useContentListContext } from '@usertour-packages/contexts';
import { getAuthToken } from '@usertour/helpers';
import { window } from '@usertour/helpers';
import { ElementSelectorPropsData, StepScreenshot } from '@usertour/types';
import {
  ContentPlacementActions,
  ContentPlacementProvider,
} from '../../../components/content-placement';
import { ContentPlacementManual } from '../../../components/content-placement';
import { BuilderMode, useBuilderContext } from '../../../contexts';

export const FlowPlacement = () => {
  const {
    isShowError,
    zIndex,
    currentStep,
    currentContent,
    isWebBuilder,
    updateCurrentStep,
    setCurrentMode,
    createNewStep,
    currentVersion,
  } = useBuilderContext();

  const { contents } = useContentListContext();
  const { attributeList } = useAttributeListContext();

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

  const handleElementChange = () => {
    setCurrentMode({
      mode: BuilderMode.ELEMENT_SELECTOR,
      backMode: BuilderMode.FLOW_STEP_DETAIL,
    });
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
      onChangeElement={handleElementChange}
      buildUrl={currentContent?.buildUrl}
      isWebBuilder={isWebBuilder}
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
        {/* <ContentPlacementTabs>
          <ContentPlacementTabsContent value="manual">
            <ContentPlacementManual />
          </ContentPlacementTabsContent>
          <ContentPlacementTabsContent value="auto">
            <ContentPlacementAuto />
          </ContentPlacementTabsContent>
          <ContentPlacementActions
            createStep={createNewStep}
            currentStep={currentStep || undefined}
            attributeList={attributeList}
            contents={contents}
            currentVersion={currentVersion}
          />
        </ContentPlacementTabs> */}
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
