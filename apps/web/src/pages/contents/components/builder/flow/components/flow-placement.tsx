import { Button } from '@usertour/ui';
import { RiExternalLinkLine } from '@usertour/icons';
import { useTranslation } from 'react-i18next';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { getAuthToken } from '@usertour/helpers';
import { window } from '@usertour/helpers';
import { ElementSelectorPropsData, StepScreenshot } from '@usertour/types';
import {
  ContentPlacementActions,
  ContentPlacementProvider,
} from '@/pages/contents/components/builder/components/content-placement';
import { ContentPlacementManual } from '@/pages/contents/components/builder/components/content-placement';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { useFlowEditor } from '@/pages/contents/components/builder/flow/use-flow-editor';

export const FlowPlacement = () => {
  const { t } = useTranslation();
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
      target={currentStep?.target}
      screenshot={currentStep?.screenshot}
      onTargetChange={handleTargetChange}
      buildUrl={currentContent?.buildUrl}
      onScreenChange={handleScreenChange}
      token={getAuthToken()}
      subTitle={t('contentBuilder.flow.showTooltipOnElement')}
    >
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-sm">{t('contentBuilder.flow.placement')}</h1>
          <Button variant="link" onClick={handleAboutPlacement} className="p-0 h-full">
            {t('contentBuilder.flow.aboutPlacement')}
            <RiExternalLinkLine className="ml-1 h-4 w-4 opacity-70" />
          </Button>
        </div>
        <div className="flex flex-col bg-surface dark:bg-surface/50 p-3.5 rounded-lg space-y-6 mt-2">
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
