import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { Separator } from '@usertour-ui/separator';
import { useThemeSettingsContext } from '.';
import { ThemeSettingsButton } from './theme-settings-button';

export const ThemeSettingsButtons = () => {
  const { settings, setSettings } = useThemeSettingsContext();
  const update = (data: Partial<typeof settings.buttons>) => {
    const { buttons } = settings;
    setSettings((pre) => ({
      ...pre,
      buttons: { ...buttons, ...data },
    }));
  };
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text="Height"
          name="button-height"
          defaultValue={String(settings.buttons.height)}
          onChange={(value: string) => {
            update({ height: Number(value) });
          }}
        />
        <ThemeSettingInput
          text="Min width"
          name="button-min-width"
          defaultValue={String(settings.buttons.minWidth)}
          onChange={(value: string) => {
            update({ minWidth: Number(value) });
          }}
        />
        <ThemeSettingInput
          text="Border radius"
          name="button-border-radius"
          defaultValue={String(settings.buttons.borderRadius)}
          onChange={(value: string) => {
            update({ borderRadius: Number(value) });
          }}
        />
        <ThemeSettingInput
          text="Horizontal padding"
          name="button-px"
          defaultValue={String(settings.buttons.px ?? 4)}
          onChange={(value: string) => {
            update({ px: Number(value) });
          }}
        />
      </div>
      <Separator />
      <ThemeSettingsButton text="Primary button" name="primary" />
      <Separator />
      <ThemeSettingsButton text="Secondary button" name="secondary" />
    </div>
  );
};

ThemeSettingsButtons.displayName = 'ThemeSettingsButtons';
