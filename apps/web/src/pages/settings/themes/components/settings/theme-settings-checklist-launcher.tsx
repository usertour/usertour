import { ThemeColorPicker } from '@/components/molecules/theme/theme-color-picker';
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

export const ThemeSettingsChecklistLauncher = () => {
  const { settings, setSettings, finalSettings } = useThemeSettingsContext();

  // Update launcher settings
  const update = (data: Partial<typeof settings.checklistLauncher>) => {
    const { checklistLauncher } = settings;
    setSettings((pre) => ({
      ...pre,
      checklistLauncher: { ...checklistLauncher, ...data },
    }));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text="Height"
          name="checklist-launcher-height"
          defaultValue={String(settings.checklistLauncher.height)}
          tooltip="The height in pixels of the checklist launcher"
          onChange={(value: string) => {
            update({ height: Number(value) });
          }}
        />
        <ThemeSettingInput
          text="Border radius"
          name="checklist-launcher-border-radius"
          defaultValue={String(settings.checklistLauncher.borderRadius)}
          onChange={(value: string) => {
            update({
              borderRadius: Number(value),
            });
          }}
        />{' '}
        <ThemeSettingSelect
          text="Font weight"
          name="checklist-launcher-font-weight"
          defaultValue={String(settings.checklistLauncher.fontWeight)}
          onValueChange={(value: string) => {
            update({ fontWeight: Number(value) });
          }}
        />
        <ThemeSettingSelect
          text="Placement"
          name="checklist-launcher-placement"
          items={placementItems}
          tooltip="Controls which corner the checklist launcher should be placed at."
          defaultValue={settings.checklistLauncher.placement.position}
          onValueChange={(value: string) => {
            update({
              placement: {
                ...settings.checklistLauncher.placement,
                position: value as ModalPosition,
              },
            });
          }}
        />
        <ThemeSettingInput
          text="Offset right"
          name="checklist-launcher-offset-x"
          tooltip="How far in pixels from the horizontal edge of the browser window the checklist launcher should be positioned."
          defaultValue={String(settings.checklistLauncher.placement.positionOffsetX)}
          onChange={(value: string) => {
            update({
              placement: {
                ...settings.checklistLauncher.placement,
                positionOffsetX: Number(value),
              },
            });
          }}
        />
        <ThemeSettingInput
          text="Offset bottom"
          name="checklist-launcher-offset-y"
          defaultValue={String(settings.checklistLauncher.placement.positionOffsetY)}
          tooltip="How far in pixels from the vertical edge of the browser window the checklist launcher should be positioned."
          onChange={(value: string) => {
            update({
              placement: {
                ...settings.checklistLauncher.placement,
                positionOffsetY: Number(value),
              },
            });
          }}
        />{' '}
        <div className="space-y-1">
          <div className="text-sm">Font color</div>
          <div className="flex">
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.color.color}
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.color.color === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.color.color}
              onChange={(color: string) => {
                update({
                  color: { ...settings.checklistLauncher.color, color },
                });
              }}
            />
          </div>
        </div>
        <div className="flex flex-row w-full">
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Background</div>
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.color.background}
              className="rounded-r-none"
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.color.background === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.color.background}
              onChange={(color: string) => {
                update({
                  color: {
                    ...settings.checklistLauncher.color,
                    background: color,
                  },
                });
              }}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Hover</div>
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.color.hover}
              className="rounded-none border-x-0"
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.color.hover === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.color.hover}
              onChange={(color: string) => {
                update({
                  color: {
                    ...settings.checklistLauncher.color,
                    hover: color,
                  },
                });
              }}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Active</div>
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.color.active}
              className="rounded-l-none"
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.color.active === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.color.active}
              onChange={(color: string) => {
                update({
                  color: {
                    ...settings.checklistLauncher.color,
                    active: color,
                  },
                });
              }}
            />
          </div>
        </div>{' '}
        <div className="space-y-1">
          <div className="text-sm">Counter font color</div>
          <div className="flex">
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.counter.color}
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.counter.color === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.counter.color}
              onChange={(color: string) => {
                update({
                  counter: { ...settings.checklistLauncher.counter, color },
                });
              }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm">Counter background color</div>
          <div className="flex">
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.counter.background}
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.counter.background === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.counter.background}
              onChange={(color: string) => {
                update({
                  counter: {
                    ...settings.checklistLauncher.counter,
                    background: color,
                  },
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

ThemeSettingsChecklistLauncher.displayName = 'ThemeSettingsChecklistLauncher';
