'use client';

import { Label } from '@usertour-packages/label';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { Switch } from '@usertour-packages/switch';

import { useBannerContext } from '../../../contexts';

const SETTINGS_ITEMS: readonly {
  key:
    | 'overlayEmbedOverAppContent'
    | 'stickToTopOfViewport'
    | 'allowUsersToDismissEmbed'
    | 'animateWhenEmbedAppears';
  label: string;
  tooltip: string;
}[] = [
  {
    key: 'overlayEmbedOverAppContent',
    label: 'Overlay over content',
    tooltip:
      'Controls whether the banner floats above page content or takes up space and pushes it down.',
  },
  {
    key: 'stickToTopOfViewport',
    label: 'Stick to top',
    tooltip: 'Makes the banner stay visible at the top while scrolling instead of scrolling away.',
  },
  {
    key: 'allowUsersToDismissEmbed',
    label: 'Allow dismiss',
    tooltip: 'Adds an X button so users can permanently dismiss the banner.',
  },
  {
    key: 'animateWhenEmbedAppears',
    label: 'Animate on appear',
    tooltip: 'Slides the banner in with an animation instead of appearing instantly.',
  },
];

export const BannerSettings = () => {
  const { localData, updateLocalData } = useBannerContext();

  if (!localData) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h1 className="text-sm">Settings</h1>
      <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-2">
        {SETTINGS_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between space-x-2">
            <Label htmlFor={item.key} className="flex flex-row space-x-1 font-normal">
              <span>{item.label}</span>
              <QuestionTooltip>{item.tooltip}</QuestionTooltip>
            </Label>
            <Switch
              id={item.key}
              className="data-[state=unchecked]:bg-input"
              checked={localData[item.key]}
              onCheckedChange={(checked) => updateLocalData({ [item.key]: checked })}
              aria-label={item.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

BannerSettings.displayName = 'BannerSettings';
