import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { useThemeSettingsContext } from '.';

export const ThemeSettingsTooltip = () => {
  const { settings, setSettings } = useThemeSettingsContext();
  const update = (data: Partial<typeof settings.tooltip>) => {
    const { tooltip } = settings;
    setSettings((pre) => ({
      ...pre,
      tooltip: { ...tooltip, ...data },
    }));
  };
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text="Width"
          name="tooltip-width"
          defaultValue={String(settings.tooltip.width)}
          onChange={(value: string) => {
            update({ width: Number(value) });
          }}
        />
        <ThemeSettingInput
          text="Notch size"
          name="tooltip-notch-size"
          defaultValue={String(settings.tooltip.notchSize)}
          onChange={(value: string) => {
            update({ notchSize: Number(value) });
          }}
        />
      </div>
    </div>
  );
};

ThemeSettingsTooltip.displayName = 'ThemeSettingsTooltip';
