import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { ModalPosition } from '@usertour/types';
import { useThemeSettingsContext } from '../theme-settings-panel';

const placementItems = [
  { name: 'Top Left', value: ModalPosition.LeftTop },
  { name: 'Top Right', value: ModalPosition.RightTop },
  { name: 'Bottom Left', value: ModalPosition.LeftBottom },
  { name: 'Bottom Right', value: ModalPosition.RightBottom },
  { name: 'Center', value: ModalPosition.Center },
];

export const ThemeSettingsBubble = () => {
  const { settings, setSettings, isViewOnly } = useThemeSettingsContext();

  // Update bubble settings
  const update = (data: Partial<typeof settings.bubble>) => {
    const { bubble } = settings;
    setSettings((pre) => ({
      ...pre,
      bubble: { ...bubble, ...data },
    }));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text="Width"
          name="bubble-width"
          defaultValue={String(settings.bubble.width)}
          onChange={(value: string) => {
            update({ width: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingSelect
          text="Placement"
          name="bubble-placement"
          items={placementItems}
          tooltip="Specifies the corner position where the speech bubble will appear."
          defaultValue={settings.bubble.placement.position}
          onValueChange={(value: string) => {
            update({
              placement: {
                ...settings.bubble.placement,
                position: value as ModalPosition,
              },
            });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Offset left"
          name="bubble-offset-x"
          tooltip="The horizontal distance in pixels from the browser window edge."
          defaultValue={String(settings.bubble.placement.positionOffsetX)}
          onChange={(value: string) => {
            update({
              placement: {
                ...settings.bubble.placement,
                positionOffsetX: Number(value),
              },
            });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Offset bottom"
          name="bubble-offset-y"
          defaultValue={String(settings.bubble.placement.positionOffsetY)}
          tooltip="The vertical distance in pixels from the browser window edge."
          onChange={(value: string) => {
            update({
              placement: {
                ...settings.bubble.placement,
                positionOffsetY: Number(value),
              },
            });
          }}
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
};

ThemeSettingsBubble.displayName = 'ThemeSettingsBubble';
