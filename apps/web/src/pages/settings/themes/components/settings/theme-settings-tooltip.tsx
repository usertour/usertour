import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsTooltip = () => {
  const { settings, setSettings, isViewOnly } = useThemeSettingsContext();
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
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Notch size"
          name="tooltip-notch-size"
          defaultValue={String(settings.tooltip.notchSize)}
          onChange={(value: string) => {
            update({ notchSize: Number(value) });
          }}
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
};

ThemeSettingsTooltip.displayName = 'ThemeSettingsTooltip';
