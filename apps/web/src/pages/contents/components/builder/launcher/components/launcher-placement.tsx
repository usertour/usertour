import { getAuthToken } from '@usertour/helpers';
import { ElementSelectorPropsData, StepScreenshot } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { ContentPlacementProvider } from '@/pages/contents/components/builder/components/content-placement';
import { ContentPlacementManual } from '@/pages/contents/components/builder/components/content-placement/content-placement-manual';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { FieldSection } from '@usertour/ui';

export const LauncherPlacement = () => {
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
      target={launcherTarget?.element}
      screenshot={launcherTarget?.screenshot}
      onTargetChange={handleTargetChange}
      buildUrl={currentContent?.buildUrl}
      onScreenChange={handleScreenChange}
      token={getAuthToken()}
      subTitle={t('contentBuilder.launcher.placementSubtitle')}
    >
      <FieldSection title={t('contentBuilder.launcher.placement')}>
        <div className="flex flex-col bg-surface p-3.5 rounded-lg space-y-6 mt-2">
          <ContentPlacementManual />
        </div>
      </FieldSection>
    </ContentPlacementProvider>
  );
};

LauncherPlacement.displayName = 'LauncherPlacement';
