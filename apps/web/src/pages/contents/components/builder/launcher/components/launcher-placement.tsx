import { getAuthToken } from '@usertour/helpers';
import { ElementSelectorPropsData, StepScreenshot } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { ContentPlacementProvider } from '@/pages/contents/components/builder/components/content-placement';
import { ContentPlacementManual } from '@/pages/contents/components/builder/components/content-placement/content-placement-manual';
import { useBuilderConfig, useBuilderStore } from '@/pages/contents/components/builder/core';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

export const LauncherPlacement = () => {
  const { zIndex } = useBuilderConfig();
  const isShowError = useBuilderStore((state) => state.isShowError);
  const currentContent = useBuilderStore((state) => state.currentContent);
  const { setLauncherTarget, launcherTarget } = useLauncherEditor();
  const { t } = useTranslation();

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

  return (
    <ContentPlacementProvider
      isShowError={isShowError}
      zIndex={zIndex}
      target={launcherTarget?.element}
      screenshot={launcherTarget?.screenshot}
      onTargetChange={handleTargetChange}
      buildUrl={currentContent?.buildUrl}
      onScreenChange={handleScreenChange}
      token={getAuthToken()}
      subTitle={t('contentBuilder.launcher.placementSubtitle')}
    >
      <FieldSection title={t('contentBuilder.launcher.placement')}>
        <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
          <ContentPlacementManual />
        </div>
      </FieldSection>
    </ContentPlacementProvider>
  );
};

LauncherPlacement.displayName = 'LauncherPlacement';
