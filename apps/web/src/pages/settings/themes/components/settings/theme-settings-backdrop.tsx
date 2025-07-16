import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { ThemeSettingSlider } from '@/components/molecules/theme/theme-setting-slider';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsBackdrop = () => {
  const { settings, setSettings } = useThemeSettingsContext();

  const updateBackdrop = (data: Partial<typeof settings.backdrop>) => {
    const { backdrop } = settings;
    setSettings((pre) => ({ ...pre, backdrop: { ...backdrop, ...data } }));
  };

  const updateBackdropHighlight = (data: Partial<typeof settings.backdrop.highlight>) => {
    const { backdrop } = settings;
    setSettings((pre) => ({
      ...pre,
      backdrop: { ...backdrop, highlight: { ...backdrop.highlight, ...data } },
    }));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 ">
        <div className="flex flex-col space-y-3">
          <ThemeSelectColor
            name="backdrop-color"
            defaultColor={settings.backdrop.color}
            onChange={(value: string) => {
              updateBackdrop({ color: value });
            }}
            text="Backdrop color"
          />
          <ThemeSettingSlider
            text="Backdrop opacity"
            name="backdrop-opacity"
            defaultValue={[settings.backdrop.opacity]}
            onValueChange={(value: number[]) => {
              updateBackdrop({ opacity: value[0] });
            }}
          />
          <ThemeSettingSelect
            text="Highlight type"
            defaultValue={settings.backdrop.highlight.type}
            name="backdrop-highlight-type"
            onValueChange={(value: string) => {
              updateBackdropHighlight({ type: value });
            }}
            items={[
              { name: 'OutSide', value: 'outside' },
              { name: 'InSide', value: 'inside' },
            ]}
          />

          <ThemeSettingInput
            text="Highlight radius"
            defaultValue={String(settings.backdrop.highlight.radius)}
            onChange={(value: string) => {
              updateBackdropHighlight({ radius: Number(value) });
            }}
            name="backdrop-highlight-radius"
          />

          <ThemeSettingInput
            text="Highlight spread"
            name="backdrop-highlight-spread"
            defaultValue={String(settings.backdrop.highlight.spread)}
            onChange={(value: string) => {
              updateBackdropHighlight({ spread: Number(value) });
            }}
          />
          <ThemeSelectColor
            text="Highlight color"
            defaultColor={settings.backdrop.highlight.color}
            onChange={(value: string) => {
              updateBackdropHighlight({ color: value });
            }}
            name="backdrop-highlight-color"
          />
          <ThemeSettingSlider
            text="Highlight opacity"
            name="backdrop-highlight-opacity"
            defaultValue={[settings.backdrop.highlight.opacity]}
            onValueChange={(value: number[]) => {
              updateBackdropHighlight({ opacity: value[0] });
            }}
          />
        </div>
      </div>
    </div>
  );
};

ThemeSettingsBackdrop.displayName = 'ThemeSettingsBackdrop';
