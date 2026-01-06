import { ThemeColorPicker } from '@/components/molecules/theme/theme-color-picker';
import { ThemeTypesSettingsColor } from '@usertour/types';
import { Separator } from '@usertour-packages/separator';
import { generateStateColors } from '@usertour/helpers';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsBasicColor = () => {
  const { settings, setSettings, finalSettings, isViewOnly } = useThemeSettingsContext();

  const updateBrandColor = (data: Partial<ThemeTypesSettingsColor>) => {
    const { brandColor, mainColor } = settings;
    const newBrandBg = data.background ?? brandColor.background;
    const newBrandFg = data.color ?? brandColor.color;

    // Recalculate brand hover/active when background or text color changes
    if (data.background || data.color) {
      const { hover, active } = generateStateColors(newBrandBg, newBrandFg);
      data.autoHover = hover;
      data.autoActive = active;
    }

    // When brand background changes, also recalculate main hover/active
    if (data.background) {
      const mainStates = generateStateColors(mainColor.background, newBrandBg);
      setSettings((pre) => ({
        ...pre,
        brandColor: { ...brandColor, ...data },
        mainColor: { ...mainColor, autoHover: mainStates.hover, autoActive: mainStates.active },
      }));
    } else {
      setSettings((pre) => ({ ...pre, brandColor: { ...brandColor, ...data } }));
    }
  };

  const updateMainColor = (data: Partial<ThemeTypesSettingsColor>) => {
    const { mainColor, brandColor } = settings;
    if (data.background) {
      // Main hover/active: mix background with brand background color
      const { hover, active } = generateStateColors(data.background, brandColor.background);
      data.autoHover = hover;
      data.autoActive = active;
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
              disabled={isViewOnly}
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
              disabled={isViewOnly}
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
              disabled={isViewOnly}
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
              disabled={isViewOnly}
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
              disabled={isViewOnly}
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
              disabled={isViewOnly}
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
              disabled={isViewOnly}
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
              disabled={isViewOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

ThemeSettingsBasicColor.displayName = 'ThemeSettingsBasicColor';
