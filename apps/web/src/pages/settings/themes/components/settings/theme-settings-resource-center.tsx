import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import type { ResourceCenterPlacement } from '@usertour/types';
import { useThemeSettingsContext } from '../theme-settings-panel';

const placementItems = [
  { name: 'Top Left', value: 'top-left' },
  { name: 'Top Right', value: 'top-right' },
  { name: 'Bottom Left', value: 'bottom-left' },
  { name: 'Bottom Right', value: 'bottom-right' },
];

export const ThemeSettingsResourceCenter = () => {
  const { settings, setSettings, isViewOnly } = useThemeSettingsContext();

  const rc = settings.resourceCenter;
  if (!rc) return null;

  const update = (data: Partial<typeof rc>) => {
    setSettings((pre) => ({
      ...pre,
      resourceCenter: { ...rc, ...data },
    }));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingSelect
          text="Placement"
          name="rc-placement"
          items={placementItems}
          tooltip="Controls which corner the resource center panel should appear at."
          defaultValue={rc.placement}
          onValueChange={(value: string) => {
            update({ placement: value as ResourceCenterPlacement });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Offset X"
          name="rc-offset-x"
          tooltip="Horizontal offset from the edge of the viewport in pixels."
          defaultValue={String(rc.offsetX)}
          onChange={(value: string) => {
            update({ offsetX: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Offset Y"
          name="rc-offset-y"
          tooltip="Vertical offset from the edge of the viewport in pixels."
          defaultValue={String(rc.offsetY)}
          onChange={(value: string) => {
            update({ offsetY: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Normal width"
          name="rc-normal-width"
          tooltip="The default width of the resource center panel."
          defaultValue={String(rc.normalWidth)}
          onChange={(value: string) => {
            update({ normalWidth: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Large width"
          name="rc-large-width"
          tooltip="The expanded width used for larger block types."
          defaultValue={String(rc.largeWidth)}
          onChange={(value: string) => {
            update({ largeWidth: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Transition duration"
          name="rc-transition-duration"
          tooltip="The duration of the panel open/close animation in milliseconds."
          defaultValue={String(rc.transitionDuration)}
          onChange={(value: string) => {
            update({ transitionDuration: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Z-index"
          name="rc-z-index"
          disableUnit={true}
          placeholder="Auto"
          tooltip="Controls the z-index of the resource center. Leave empty for default."
          defaultValue={rc.zIndex ? String(rc.zIndex) : ''}
          onChange={(value: string) => {
            const numValue = value === '' ? undefined : Number(value);
            update({ zIndex: numValue });
          }}
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
};

ThemeSettingsResourceCenter.displayName = 'ThemeSettingsResourceCenter';
