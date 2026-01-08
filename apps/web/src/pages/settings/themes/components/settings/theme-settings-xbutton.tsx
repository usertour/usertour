import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsXbutton = () => {
  const { settings, setSettings, finalSettings, isViewOnly } = useThemeSettingsContext();
  const update = (data: Partial<typeof settings.xbutton>) => {
    const { xbutton } = settings;
    setSettings((pre) => ({
      ...pre,
      xbutton: { ...xbutton, ...data },
    }));
  };
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSelectColor
          name="xbutton-color"
          defaultColor={settings.xbutton.color}
          showAutoButton={true}
          isAutoColor={settings.xbutton.color === 'Auto'}
          autoColor={finalSettings?.mainColor.color}
          onChange={(value: string) => {
            update({ color: value });
          }}
          text="Color"
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
};

ThemeSettingsXbutton.displayName = 'ThemeSettingsXbutton';
