import { ThemeColorPicker } from '@/components/molecules/theme/theme-color-picker';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSlider } from '@/components/molecules/theme/theme-setting-slider';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsLauncherIcons = () => {
  const { settings, setSettings, finalSettings, isViewOnly } = useThemeSettingsContext();
  const update = (data: Partial<typeof settings.launcherIcon>) => {
    const { launcherIcon } = settings;
    setSettings((pre) => ({
      ...pre,
      launcherIcon: { ...launcherIcon, ...data },
    }));
  };
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text="Size"
          name="size"
          defaultValue={String(settings.launcherIcon.size)}
          onChange={(value: string) => {
            update({ size: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <div className="flex flex-row w-full">
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Color</div>
            <ThemeColorPicker
              defaultColor={settings.launcherIcon.color.color}
              showAutoButton={true}
              isAutoColor={settings.launcherIcon.color.color === 'Auto'}
              autoColor={finalSettings?.launcherIcon.color.color}
              onChange={(value: string) => {
                update({
                  color: { ...settings.launcherIcon.color, color: value },
                });
              }}
              className="rounded-r-none"
              disabled={isViewOnly}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Hover</div>
            <ThemeColorPicker
              defaultColor={settings.launcherIcon.color.hover}
              showAutoButton={true}
              isAutoColor={settings.launcherIcon.color.hover === 'Auto'}
              autoColor={finalSettings?.launcherIcon.color.hover}
              onChange={(value: string) => {
                update({
                  color: { ...settings.launcherIcon.color, hover: value },
                });
              }}
              className="rounded-none border-x-0"
              disabled={isViewOnly}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Click</div>
            <ThemeColorPicker
              defaultColor={settings.launcherIcon.color.active}
              showAutoButton={true}
              isAutoColor={settings.launcherIcon.color.active === 'Auto'}
              autoColor={finalSettings?.launcherIcon.color.active}
              onChange={(value: string) => {
                update({
                  color: { ...settings.launcherIcon.color, active: value },
                });
              }}
              className="rounded-l-none"
              disabled={isViewOnly}
            />
          </div>
        </div>
        <ThemeSettingSlider
          text="Opacity"
          name="icon-opacity"
          defaultValue={[settings.launcherIcon.opacity]}
          onValueChange={(value: number[]) => {
            update({ opacity: value[0] });
          }}
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
};

ThemeSettingsLauncherIcons.displayName = 'ThemeSettingsLauncherIcons';
