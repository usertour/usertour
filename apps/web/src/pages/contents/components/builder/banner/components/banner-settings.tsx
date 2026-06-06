'use client';

import { Label, QuestionTooltip, Switch } from '@usertour/ui';
import { useTranslation } from 'react-i18next';

import { useBannerEditor } from '@/pages/contents/components/builder/banner/use-banner-editor';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

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
    <FieldSection title={t('contentBuilder.banner.settings')}>
      <div className="flex flex-col bg-slate-50 p-3.5 rounded-lg space-y-2">
        {SETTINGS_ITEMS.map((item) => {
          const label = t(`contentBuilder.banner.settingsItems.${item.i18n}`);
          return (
            <div key={item.key} className="flex items-center justify-between space-x-2">
              <Label htmlFor={item.key} className="flex flex-row space-x-1 font-normal">
                <span>{label}</span>
                <QuestionTooltip>
                  {t(`contentBuilder.banner.settingsItems.${item.i18n}Tooltip`)}
                </QuestionTooltip>
              </Label>
              <Switch
                className="data-[state=unchecked]:bg-input"
                id={item.key}
                checked={localData[item.key]}
                onCheckedChange={(checked) => updateLocalData({ [item.key]: checked })}
                aria-label={label}
              />
            </div>
          );
        })}
      </div>
    </FieldSection>
  );
};

BannerSettings.displayName = 'BannerSettings';
