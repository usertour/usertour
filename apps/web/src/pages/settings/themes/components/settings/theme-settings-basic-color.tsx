import { ThemeColorPicker } from '@/components/molecules/theme/theme-color-picker';
import { ThemeTypesSettingsColor } from '@/types/theme-settings';
import { Separator } from '@usertour-ui/separator';
import { changeColor } from '@usertour-ui/ui-utils';
import { useThemeSettingsContext } from '.';

export const ThemeSettingsBasicColor = () => {
  const { settings, setSettings, finalSettings } = useThemeSettingsContext();

  const updateBrandColor = (data: Partial<ThemeTypesSettingsColor>) => {
    const { brandColor } = settings;
    if (data.background) {
      data.autoHover = changeColor(data.background, 20);
      data.autoActive = changeColor(data.background, 40);
    }
    setSettings((pre) => ({ ...pre, brandColor: { ...brandColor, ...data } }));
  };
  const updateMainColor = (data: Partial<ThemeTypesSettingsColor>) => {
    const { mainColor } = settings;
    if (data.background) {
      data.autoHover = changeColor(data.background, 20);
      data.autoActive = changeColor(data.background, 40);
    }
    setSettings((pre) => ({ ...pre, mainColor: { ...mainColor, ...data } }));
  };
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <div className="text-base">Brand colors</div>
        <div className="space-y-1">
          <div className="text-sm">Text</div>
          <div className="flex">
            <ThemeColorPicker
              defaultColor={settings.brandColor.color}
              onChange={(color: string) => {
                updateBrandColor({ color });
              }}
            />
          </div>
        </div>
        <div className="flex flex-row w-full">
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Background</div>
            <ThemeColorPicker
              defaultColor={settings.brandColor.background}
              className="rounded-r-none"
              onChange={(color: string) => {
                updateBrandColor({ background: color });
              }}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Hover</div>
            <ThemeColorPicker
              defaultColor={settings.brandColor.hover}
              className="rounded-none border-x-0"
              showAutoButton={true}
              isAutoColor={settings.brandColor.hover === 'Auto'}
              autoColor={finalSettings?.brandColor.hover}
              onChange={(color: string) => {
                updateBrandColor({ hover: color });
              }}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Click</div>
            <ThemeColorPicker
              defaultColor={settings.brandColor.active}
              className="rounded-l-none"
              showAutoButton={true}
              isAutoColor={settings.brandColor.active === 'Auto'}
              autoColor={finalSettings?.brandColor.active}
              onChange={(color: string) => {
                updateBrandColor({ active: color });
              }}
            />
          </div>
        </div>
      </div>
      <Separator />
      <div className="py-[15px] px-5 space-y-3">
        <div className="text-base">Main colors</div>
        <div className="space-y-1">
          <div className="text-sm">Text</div>
          <div className="flex">
            <ThemeColorPicker
              defaultColor={settings.mainColor.color}
              onChange={(color: string) => {
                updateMainColor({ color });
              }}
            />
          </div>
        </div>
        <div className="flex flex-row w-full">
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Background</div>
            <ThemeColorPicker
              defaultColor={settings.mainColor.background}
              onChange={(color: string) => {
                updateMainColor({ background: color });
              }}
              className="rounded-r-none"
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Hover</div>
            <ThemeColorPicker
              defaultColor={settings.mainColor.hover}
              showAutoButton={true}
              isAutoColor={settings.mainColor.hover === 'Auto'}
              autoColor={finalSettings?.mainColor.hover}
              onChange={(color: string) => {
                updateMainColor({ hover: color });
              }}
              className="rounded-none border-x-0"
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Click</div>
            <ThemeColorPicker
              defaultColor={settings.mainColor.active}
              showAutoButton={true}
              isAutoColor={settings.mainColor.active === 'Auto'}
              autoColor={finalSettings?.mainColor.active}
              onChange={(color: string) => {
                updateMainColor({ active: color });
              }}
              className="rounded-l-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

ThemeSettingsBasicColor.displayName = 'ThemeSettingsBasicColor';
