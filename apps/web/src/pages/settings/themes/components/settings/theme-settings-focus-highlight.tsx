import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { ThemeSettingSlider } from '@/components/molecules/theme/theme-setting-slider';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsFocusHighlight = () => {
  const { settings, setSettings, finalSettings, isViewOnly } = useThemeSettingsContext();

  const updateFocusHighlight = (data: Partial<typeof settings.focusHighlight>) => {
    const { focusHighlight } = settings;
    setSettings((pre) => ({ ...pre, focusHighlight: { ...focusHighlight, ...data } }));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5">
        <div className="flex flex-col space-y-3">
          <ThemeSelectColor
            name="focus-highlight-color"
            text="Color"
            defaultColor={settings.focusHighlight?.color ?? 'Auto'}
            autoColor={finalSettings?.mainColor?.autoActive}
            isAutoColor={settings.focusHighlight?.color === 'Auto'}
            showAutoButton={true}
            onChange={(value: string) => {
              updateFocusHighlight({ color: value });
            }}
            disabled={isViewOnly}
          />
          <ThemeSettingSlider
            text="Opacity"
            name="focus-highlight-opacity"
            defaultValue={[settings.focusHighlight?.opacity ?? 100]}
            onValueChange={(value: number[]) => {
              updateFocusHighlight({ opacity: value[0] });
            }}
            disabled={isViewOnly}
          />
        </div>
      </div>
    </div>
  );
};

ThemeSettingsFocusHighlight.displayName = 'ThemeSettingsFocusHighlight';
