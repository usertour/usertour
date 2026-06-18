import { BUILDER_Z } from '@usertour/constants';
import { Input } from '@usertour/ui';
import { LauncherDataType } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { IconPicker } from '@/pages/contents/components/builder/components';
import { LauncherContentType } from '@/pages/contents/components/builder/launcher/components/launcher-content-type';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { FieldSection } from '@usertour/ui';

export const LauncherType = () => {
  const { updateData: updateLocalData, data: localData } = useLauncherEditor();
  const { t } = useTranslation();
  const sidebarZIndex = BUILDER_Z.panel;

  return (
    <FieldSection title={t('contentBuilder.launcher.appearance')}>
      <LauncherContentType
        type={localData.type}
        zIndex={sidebarZIndex}
        onChange={(value) => {
          updateLocalData({ type: value });
        }}
      />

      {localData.type === LauncherDataType.ICON && (
        <IconPicker
          type={localData.iconType}
          iconSource={localData.iconSource}
          iconUrl={localData.iconUrl}
          zIndex={sidebarZIndex}
          onChange={(updates) => {
            updateLocalData(updates);
          }}
        />
      )}

      {localData.type === LauncherDataType.BUTTON && (
        <Input
          variant="compact-muted"
          className="bg-surface dark:bg-surface-raised/50 shadow-none"
          value={localData.buttonText ?? ''}
          placeholder={t('contentBuilder.launcher.buttonText')}
          onChange={(event) => {
            updateLocalData({ buttonText: event.target.value || undefined });
          }}
        />
      )}
    </FieldSection>
  );
};

LauncherType.displayName = 'LauncherType';
