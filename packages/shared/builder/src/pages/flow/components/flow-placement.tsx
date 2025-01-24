import {
  ContentPlacementActions,
  ContentPlacementProvider,
} from "../../../components/content-placement";
import { BuilderMode, useBuilderContext } from "../../../contexts";
import { ContentPlacementManual } from "../../../components/content-placement";
import {
  ContentVersion,
  ElementSelectorPropsData,
  Step,
  StepScreenshot,
} from "@usertour-ui/types";
import { defaultStep, getAuthToken } from "@usertour-ui/shared-utils";
import { createValue1 } from "@usertour-ui/shared-editor";
import {
  useAttributeListContext,
  useContentListContext,
} from "@usertour-ui/contexts";

export const FlowPlacement = () => {
  const {
    isShowError,
    zIndex,
    currentStep,
    currentContent,
    isWebBuilder,
    updateCurrentStep,
    setCurrentMode,
    createStep,
    currentVersion,
  } = useBuilderContext();

  const { contents } = useContentListContext();
  const { attributeList } = useAttributeListContext();

  const handleTargetChange = (target: ElementSelectorPropsData) => {
    updateCurrentStep((pre) => ({
      ...pre,
      target: { ...pre.target, ...target, type: "manual" },
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

  const createNewStep = (currentVersion: ContentVersion, sequence: number) => {
    const step: Step = {
      ...defaultStep,
      type: "tooltip",
      name: "Untitled",
      data: createValue1,
      sequence,
    };
    return createStep(currentVersion, step);
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
        <h1 className="text-sm">Placement</h1>
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

FlowPlacement.displayName = "FlowPlacement";
