import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsBanner = () => {
  const { settings, setSettings, finalSettings, isViewOnly } = useThemeSettingsContext();

  const update = (data: Partial<typeof settings.banner>) => {
    const prevBanner = settings.banner;
    setSettings((pre) => ({
      ...pre,
      banner: { ...prevBanner, ...data } as typeof pre.banner,
    }));
  };

  const prevBanner = settings.banner;

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSelectColor
          text="Background color"
          name="banner-background-color"
          defaultColor={prevBanner.backgroundColor.background ?? 'Auto'}
          showAutoButton={true}
          isAutoColor={prevBanner.backgroundColor.background === 'Auto'}
          autoColor={finalSettings?.banner.backgroundColor.background}
          onChange={(value: string) => {
            update({
              backgroundColor: {
                ...prevBanner.backgroundColor,
                background: value,
              },
              textColor: prevBanner.textColor,
            });
          }}
          disabled={isViewOnly}
        />
        <ThemeSelectColor
          text="Text color"
          name="banner-text-color"
          defaultColor={prevBanner.textColor.color ?? 'Auto'}
          showAutoButton={true}
          isAutoColor={prevBanner.textColor.color === 'Auto'}
          autoColor={finalSettings?.banner.textColor.color}
          onChange={(value: string) => {
            update({
              backgroundColor: prevBanner.backgroundColor,
              textColor: {
                ...prevBanner.textColor,
                color: value,
              },
            });
          }}
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
};

ThemeSettingsBanner.displayName = 'ThemeSettingsBanner';
