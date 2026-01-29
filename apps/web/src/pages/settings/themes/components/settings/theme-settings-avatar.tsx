import { memo, useCallback } from 'react';

import { AvatarType } from '@usertour/types';

import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';

import { useThemeSettingsContext } from '../theme-settings-panel';
import { AvatarTypeSelector } from '../avatar-type';

export const ThemeSettingsAvatar = memo(() => {
  const { settings, setSettings, isViewOnly } = useThemeSettingsContext();

  // Update avatar settings
  const update = useCallback(
    (data: Partial<typeof settings.avatar>) => {
      const { avatar } = settings;
      setSettings((pre) => ({
        ...pre,
        avatar: { ...avatar, ...data },
      }));
    },
    [settings, setSettings],
  );

  // Handle avatar type change
  const handleAvatarChange = useCallback(
    (updates: { type: AvatarType; name?: string; url?: string }) => {
      update({
        type: updates.type,
        name: updates.name ?? '',
        url: updates.url ?? '',
      });
    },
    [update],
  );

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <div className="space-y-2">
          {/* <span className="block text-sm">Avatar type</span> */}
          <AvatarTypeSelector
            type={settings.avatar.type}
            name={settings.avatar.name}
            url={settings.avatar.url}
            disabled={isViewOnly}
            onChange={handleAvatarChange}
          />
        </div>
        <ThemeSettingInput
          text="Avatar size"
          name="avatar-size"
          defaultValue={String(settings.avatar.size)}
          onChange={(value: string) => {
            update({ size: Number(value) });
          }}
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
});

ThemeSettingsAvatar.displayName = 'ThemeSettingsAvatar';
