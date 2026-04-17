import type { BannerAnimationTiming } from '@usertour/types';
import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { useThemeSettingsContext } from '../theme-settings-panel';

const animationTimingItems = [
  { name: 'Smooth', value: 'smooth' },
  { name: 'Snappy', value: 'snappy' },
  { name: 'Gentle', value: 'gentle' },
  { name: 'Linear', value: 'linear' },
];

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
      <div className="py-4 px-5 space-y-3">
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
        <ThemeSettingInput
          text="Padding"
          name="banner-padding"
          defaultValue={String(prevBanner.padding)}
          onChange={(value: string) => {
            update({ padding: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Animation duration"
          name="banner-animation-duration"
          tooltip="The banner reveal animation duration in milliseconds."
          defaultValue={String(prevBanner.animationDuration)}
          onChange={(value: string) => {
            update({ animationDuration: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingSelect
          text="Animation style"
          name="banner-animation-timing"
          items={animationTimingItems}
          tooltip="The easing curve for the banner reveal animation."
          vertical
          defaultValue={prevBanner.animationTiming}
          onValueChange={(value: string) => {
            update({ animationTiming: value as BannerAnimationTiming });
          }}
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
};

ThemeSettingsBanner.displayName = 'ThemeSettingsBanner';
