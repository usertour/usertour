import { EXTENSION_SIDEBAR_MAIN } from '@usertour/constants';
import { Input } from '@usertour/ui';
import { LauncherDataType } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { IconPicker } from '@/pages/contents/components/builder/components';
import { LauncherContentType } from '@/pages/contents/components/builder/launcher/components/launcher-content-type';
import { useBuilderConfig } from '@/pages/contents/components/builder/core';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

export const LauncherType = () => {
  const { updateData: updateLocalData, data: localData } = useLauncherEditor();
  const { zIndex } = useBuilderConfig();
  const { t } = useTranslation();
  const sidebarZIndex = zIndex + EXTENSION_SIDEBAR_MAIN;

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
