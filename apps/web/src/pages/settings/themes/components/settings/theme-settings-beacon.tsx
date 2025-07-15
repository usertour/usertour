import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsBeacon = () => {
  const { settings, setSettings, finalSettings } = useThemeSettingsContext();
  const update = (data: Partial<typeof settings.launcherBeacon>) => {
    const { launcherBeacon } = settings;
    setSettings((pre) => ({
      ...pre,
      launcherBeacon: { ...launcherBeacon, ...data },
    }));
  };
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSelectColor
          text="Beacon color"
          name="beacon-color"
          defaultColor={settings.launcherBeacon.color}
          showAutoButton={true}
          isAutoColor={settings.launcherBeacon.color === 'Auto'}
          autoColor={finalSettings?.launcherBeacon.color}
          onChange={(value: string) => {
            update({ color: value });
          }}
        />
        <ThemeSettingInput
          text="Beacon size"
          name="beacon-size"
          defaultValue={String(settings.launcherBeacon.size)}
          onChange={(value: string) => {
            update({ size: Number(value) });
          }}
        />
      </div>
    </div>
  );
};

ThemeSettingsBeacon.displayName = 'ThemeSettingsBeacon';
