'use client';

import { useTranslation } from 'react-i18next';

import { useBannerEditor } from '@/pages/contents/components/builder/banner/use-banner-editor';
import { BooleanField, SettingsCard } from '@/pages/contents/components/builder/shared/fields';

const SETTINGS_ITEMS: readonly {
  key:
    | 'overlayEmbedOverAppContent'
    | 'stickToTopOfViewport'
    | 'allowUsersToDismissEmbed'
    | 'animateWhenEmbedAppears';
  i18n: 'overlay' | 'stickToTop' | 'allowDismiss' | 'animate';
}[] = [
  { key: 'overlayEmbedOverAppContent', i18n: 'overlay' },
  { key: 'stickToTopOfViewport', i18n: 'stickToTop' },
  { key: 'allowUsersToDismissEmbed', i18n: 'allowDismiss' },
  { key: 'animateWhenEmbedAppears', i18n: 'animate' },
];

export const BannerSettings = () => {
  const { data: localData, updateData: updateLocalData } = useBannerEditor();
  const { t } = useTranslation();

  return (
    <SettingsCard title={t('contentBuilder.banner.settings')}>
      {SETTINGS_ITEMS.map((item) => (
        <BooleanField
          key={item.key}
          label={t(`contentBuilder.banner.settingsItems.${item.i18n}`)}
          tooltip={t(`contentBuilder.banner.settingsItems.${item.i18n}Tooltip`)}
          checked={localData[item.key]}
          onChange={(checked) => updateLocalData({ [item.key]: checked })}
        />
      ))}
    </SettingsCard>
  );
};

BannerSettings.displayName = 'BannerSettings';
