import { getAuthToken } from '@usertour/helpers';
import { ElementSelectorPropsData, StepScreenshot } from '@usertour/types';
import { useEffect } from 'react';
import { ContentPlacementProvider } from '../../../components/content-placement';
import { ContentPlacementManual } from '../../../components/content-placement/content-placement-manual';
import { BuilderMode, useBuilderContext, useLauncherContext } from '../../../contexts';

export const LauncherPlacement = () => {
  const {
    isShowError,
    currentMode,
    selectorOutput,
    zIndex,
    currentContent,
    isWebBuilder,
    setCurrentMode,
  } = useBuilderContext();
  const { setLauncherTarget, launcherTarget } = useLauncherContext();

  const handleTargetChange = (element: ElementSelectorPropsData) => {
    setLauncherTarget((prev) =>
      prev
        ? {
            ...prev,
            element: { ...prev.element, ...element, type: 'manual' },
          }
        : undefined,
    );
  };

  const handleScreenChange = (screenshot: StepScreenshot) => {
    setLauncherTarget((prev) => (prev ? { ...prev, screenshot } : undefined));
  };

  const handleElementChange = () => {
    setCurrentMode({
      mode: BuilderMode.ELEMENT_SELECTOR,
      backMode: BuilderMode.LAUNCHER_TARGET,
    });
  };

  const handleSelectorOutput = () => {
    if (!selectorOutput || isWebBuilder) return;

    const elementData = {
      selectors: selectorOutput.target.selectors,
      content: selectorOutput.target.content,
      screenshot: selectorOutput.screenshot.mini,
      selectorsList: selectorOutput.target.selectorsList,
    };

    setLauncherTarget((prev) =>
      prev
        ? {
            ...prev,
            screenshot: { ...prev.screenshot, ...selectorOutput.screenshot },
            element: { ...prev.element, ...elementData },
          }
        : undefined,
    );
  };

  useEffect(() => {
    if (currentMode.mode === BuilderMode.LAUNCHER_TARGET) {
      handleSelectorOutput();
    }
  }, [currentMode, selectorOutput, isWebBuilder]);

  return (
    <ContentPlacementProvider
      isShowError={isShowError}
      zIndex={zIndex}
      target={launcherTarget?.element}
      screenshot={launcherTarget?.screenshot}
      onTargetChange={handleTargetChange}
      onChangeElement={handleElementChange}
      buildUrl={currentContent?.buildUrl}
      isWebBuilder={isWebBuilder}
      onScreenChange={handleScreenChange}
      token={getAuthToken()}
      subTitle="Show launcher on this element"
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
        </ContentPlacementTabs> */}
        <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
          <ContentPlacementManual />
        </div>
      </div>
    </ContentPlacementProvider>
  );
};

LauncherPlacement.displayName = 'LauncherPlacement';
