import { ElementIcon, RiSettings3Line } from '@usertour/icons';
import { useTranslation } from 'react-i18next';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { FieldSection, SurfaceCard } from '@usertour/ui';

export const LauncherTargetPreview = () => {
  const { gotoLauncherTarget } = useLauncherEditor();
  const { t } = useTranslation();

  return (
    <FieldSection title={t('contentBuilder.launcher.target')}>
      <SurfaceCard
        onClick={gotoLauncherTarget}
        className="flex flex-row items-center justify-between cursor-pointer"
      >
        <div className="flex flex-row space-x-1 items-center">
          <ElementIcon className="h-4 w-4" />
          <span className="text-sm">{t('contentBuilder.launcher.targetSetting')}</span>
        </div>
        <RiSettings3Line className="h-4 w-4 opacity-70" />
      </SurfaceCard>
    </FieldSection>
  );
};

LauncherTargetPreview.displayName = 'LauncherTargetPreview';
