import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { ModalPosition } from '@usertour-packages/types';
import { useThemeSettingsContext } from '../theme-settings-panel';

const placementItems = [
  { name: 'Top Left', value: ModalPosition.LeftTop },
  { name: 'Top Right', value: ModalPosition.RightTop },
  { name: 'Bottom Left', value: ModalPosition.LeftBottom },
  { name: 'Bottom Right', value: ModalPosition.RightBottom },
  { name: 'Center', value: ModalPosition.Center },
];

const textDecorationItems = [
  { name: 'None (no line-through)', value: 'none' },
  { name: 'Line-through', value: 'line-through' },
];

export const ThemeSettingsChecklist = () => {
  const { settings, setSettings, finalSettings } = useThemeSettingsContext();

  // Update checklist settings
  const update = (data: Partial<typeof settings.checklist>) => {
    const { checklist } = settings;
    setSettings((pre) => ({
      ...pre,
      checklist: { ...checklist, ...data },
    }));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text="Width"
          name="checklist-width"
          defaultValue={String(settings.checklist.width)}
          tooltip="The width in pixels of the checklist"
          onChange={(value: string) => {
            update({ width: Number(value) });
          }}
        />
        <ThemeSettingSelect
          text="Placement"
          name="checklist-placement"
          items={placementItems}
          tooltip="Controls which corner the checklist should be placed at."
          defaultValue={settings.checklist.placement.position}
          onValueChange={(value: string) => {
            update({
              placement: {
                ...settings.checklist.placement,
                position: value as ModalPosition,
              },
            });
          }}
        />
        <ThemeSettingInput
          text="Offset right"
          name="checklist-offset-x"
          tooltip="How far in pixels from the horizontal edge of the browser window the checklist should be positioned."
          defaultValue={String(settings.checklist.placement.positionOffsetX)}
          onChange={(value: string) => {
            update({
              placement: {
                ...settings.checklist.placement,
                positionOffsetX: Number(value),
              },
            });
          }}
        />
        <ThemeSettingInput
          text="Offset bottom"
          name="checklist-offset-y"
          defaultValue={String(settings.checklist.placement.positionOffsetY)}
          tooltip="How far in pixels from the vertical edge of the browser window the checklist should be positioned."
          onChange={(value: string) => {
            update({
              placement: {
                ...settings.checklist.placement,
                positionOffsetY: Number(value),
              },
            });
          }}
        />
        <ThemeSettingInput
          text="Z-index"
          name="checklist-z-index"
          disableUnit={true}
          placeholder="Auto"
          tooltip="How high on the web page's z axis the checklist should appear. Leave empty to use Usertour's default behavior."
          defaultValue={settings.checklist.zIndex ? String(settings.checklist.zIndex) : ''}
          onChange={(value: string) => {
            const numValue = value === '' ? undefined : Number(value);
            update({ zIndex: numValue });
          }}
        />
        <ThemeSelectColor
          text="Checkmark color"
          name="checklist-checkmark-color"
          defaultColor={settings.checklist.checkmarkColor}
          showAutoButton={true}
          isAutoColor={settings.checklist.checkmarkColor === 'Auto'}
          autoColor={finalSettings?.checklist.checkmarkColor}
          onChange={(value: string) => {
            update({ checkmarkColor: value });
          }}
        />
        <ThemeSettingSelect
          text="Completed task text decoration"
          name="checklist-completed-task-text-decoration"
          items={textDecorationItems}
          tooltip="Controls the text decoration of the completed task."
          defaultValue={settings.checklist.completedTaskTextDecoration ?? 'none'}
          vertical={true}
          onValueChange={(value: string) => {
            update({
              completedTaskTextDecoration: value,
            });
          }}
        />
      </div>
    </div>
  );
};

ThemeSettingsChecklist.displayName = 'ThemeSettingsChecklist';
