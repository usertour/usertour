import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import {
  ThemeSelectFont,
  ThemeSelectFontType,
} from '@/components/molecules/theme/theme-select-font';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { fontItems } from '@/utils/webfonts';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsFont = () => {
  const { settings, setSettings, finalSettings, isViewOnly } = useThemeSettingsContext();
  const update = (data: Partial<typeof settings.font>) => {
    const { font } = settings;
    setSettings((pre) => ({
      ...pre,
      font: { ...font, ...data },
    }));
  };
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 ">
        <div className="flex flex-col space-y-3">
          <div className="text-sm">Font family</div>
          <ThemeSelectFont
            items={fontItems}
            defaultValue={settings.font.fontFamily}
            onSelect={(item: ThemeSelectFontType) => {
              update({ fontFamily: item.name });
            }}
            disabled={isViewOnly}
          />
          <ThemeSettingInput
            text="Font size"
            name="font-size"
            defaultValue={String(settings.font.fontSize)}
            onChange={(value: string) => {
              update({ fontSize: Number(value) });
            }}
            disabled={isViewOnly}
          />
          <ThemeSettingInput
            text="Line height"
            name="line-height"
            defaultValue={String(settings.font.lineHeight)}
            onChange={(value: string) => {
              update({ lineHeight: Number(value) });
            }}
            disabled={isViewOnly}
          />
          <ThemeSettingSelect
            text="Font weight (normal)"
            name="font-weight-normal"
            defaultValue={String(settings.font.fontWeightNormal)}
            onValueChange={(value: string) => {
              update({ fontWeightNormal: Number(value) });
            }}
            disabled={isViewOnly}
          />
          <ThemeSettingSelect
            text="Font weight (bold)"
            defaultValue={String(settings.font.fontWeightBold)}
            onValueChange={(value: string) => {
              update({ fontWeightBold: Number(value) });
            }}
            name="font-weight-bold"
            disabled={isViewOnly}
          />
          <ThemeSettingInput
            text="Header 1 font size"
            name="font-size-header-1"
            defaultValue={String(settings.font.h1FontSize)}
            onChange={(value: string) => {
              update({ h1FontSize: Number(value) });
            }}
            disabled={isViewOnly}
          />
          <ThemeSettingInput
            text="Header 2 font size"
            name="font-size-header-2"
            defaultValue={String(settings.font.h2FontSize)}
            onChange={(value: string) => {
              update({ h2FontSize: Number(value) });
            }}
            disabled={isViewOnly}
          />
          <ThemeSelectColor
            name="link-color"
            defaultColor={settings.font.linkColor}
            showAutoButton={true}
            isAutoColor={settings.font.linkColor === 'Auto'}
            autoColor={finalSettings?.brandColor.background}
            onChange={(value: string) => {
              update({ linkColor: value });
            }}
            text="Link color"
            disabled={isViewOnly}
          />
        </div>
      </div>
    </div>
  );
};

ThemeSettingsFont.displayName = 'ThemeSettingsFont';
