import { Label } from '@usertour-ui/label';
import { HelpTooltip } from '@usertour-ui/shared-components';
import { Switch } from '@usertour-ui/switch';
import { useState } from 'react';

export type ContentSettingsData = {
  enabledBackdrop: boolean;
  skippable: boolean;
  enabledBlockTarget: boolean;
};

export interface ContentSettingsProps {
  data: ContentSettingsData;
  type: string;
  onChange: (value: ContentSettingsData) => void;
}

export const ContentSettings = (props: ContentSettingsProps) => {
  const { data: initialValue, onChange, type } = props;
  const [data, setData] = useState<ContentSettingsData>(initialValue);

  const update = (fn: (pre: ContentSettingsData) => ContentSettingsData) => {
    setData((pre) => {
      const v = fn(pre);
      onChange(v);
      return v;
    });
  };

  const handleBackdrop = (checked: boolean) => {
    update((pre) => ({ ...pre, enabledBackdrop: checked }));
  };
  const handleSkippable = (checked: boolean) => {
    update((pre) => ({ ...pre, skippable: checked }));
  };

  const handleBlockTarget = (checked: boolean) => {
    update((pre) => ({ ...pre, enabledBlockTarget: checked }));
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm">Settings</h1>
      <div className="flex flex-col  bg-background-700 p-3.5 rounded-lg space-y-6">
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="skippable" className="flex flex-col space-y-1">
            <span className="font-normal">skippable</span>
          </Label>
          <Switch
            id="skippable"
            className="data-[state=unchecked]:bg-input"
            checked={data.skippable}
            onCheckedChange={handleSkippable}
          />
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex space-x-2 grow">
              <Label htmlFor="enable-backdrop" className="flex space-y-1">
                <span className="font-normal">Add backdrop</span>
              </Label>
              <HelpTooltip>
                {type === 'tooltip' &&
                  'Adds a semi-transparent layer on top of your app, which only reveals the tooltip and the target element. Use this to force users to interact with the target element.'}
                {type === 'modal' &&
                  'Adds a semi-transparent layer on top of your app, which only reveals the modal.'}
              </HelpTooltip>
            </div>
            <Switch
              id="enable-backdrop"
              className="data-[state=unchecked]:bg-input"
              checked={data.enabledBackdrop}
              onCheckedChange={handleBackdrop}
            />
          </div>
          {data.enabledBackdrop && type === 'tooltip' && (
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="enable-block-target" className="flex flex-col space-y-1">
                <span className="font-normal">Block tooltip target clicks</span>
              </Label>
              <Switch
                id="enable-block-target"
                className="data-[state=unchecked]:bg-input"
                checked={data.enabledBlockTarget}
                onCheckedChange={handleBlockTarget}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
ContentSettings.displayName = 'ContentSettings';
