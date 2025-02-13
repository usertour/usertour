import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { useThemeSettingsContext } from '.';

export const ThemeSettingsProgress = () => {
  const { settings, setSettings, finalSettings } = useThemeSettingsContext();
  const update = (data: Partial<typeof settings.progress>) => {
    const { progress } = settings;
    setSettings((pre) => ({
      ...pre,
      progress: { ...progress, ...data },
    }));
  };
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSelectColor
          text="Progress bar color"
          name="progress-bar-color"
          defaultColor={settings.progress.color}
          showAutoButton={true}
          isAutoColor={settings.progress.color === 'Auto'}
          autoColor={finalSettings?.brandColor.background}
          onChange={(value: string) => {
            update({ color: value });
          }}
        />
        <ThemeSettingInput
          text="Progress bar height"
          name="progress-bar-height"
          defaultValue={String(settings.progress.height)}
          onChange={(value: string) => {
            update({ height: Number(value) });
          }}
        />
      </div>
    </div>
  );
};

ThemeSettingsProgress.displayName = 'ThemeSettingsProgress';
