import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import type {
  ResourceCenterLauncherIconType,
  ResourceCenterLauncherTextMode,
} from '@usertour/types';
import { useThemeSettingsContext } from '../theme-settings-panel';

const iconTypeItems = [
  { name: 'Default question mark', value: 'default-question-mark' },
  { name: 'Plaintext question mark', value: 'plaintext-question-mark' },
  { name: 'Custom', value: 'custom' },
];

const textModeItems = [
  { name: 'Active checklist text', value: 'active-checklist-text' },
  { name: 'Resource center text', value: 'resource-center-text' },
  { name: 'No text', value: 'no-text' },
];

export const ThemeSettingsResourceCenterLauncher = () => {
  const { settings, setSettings, isViewOnly } = useThemeSettingsContext();

  const launcher = settings.resourceCenterLauncherButton;
  if (!launcher) return null;

  const update = (data: Partial<typeof launcher>) => {
    setSettings((pre) => ({
      ...pre,
      resourceCenterLauncherButton: { ...launcher, ...data },
    }));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingSelect
          text="Icon type"
          name="rc-launcher-icon-type"
          items={iconTypeItems}
          tooltip="The icon displayed in the launcher button."
          vertical
          defaultValue={launcher.iconType}
          onValueChange={(value: string) => {
            update({ iconType: value as ResourceCenterLauncherIconType });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Height"
          name="rc-launcher-height"
          tooltip="The height of the launcher button in pixels."
          defaultValue={String(launcher.height)}
          onChange={(value: string) => {
            update({ height: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Image height"
          name="rc-launcher-image-height"
          tooltip="The height of the icon image inside the launcher button."
          defaultValue={String(launcher.imageHeight)}
          onChange={(value: string) => {
            update({ imageHeight: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Border radius"
          name="rc-launcher-border-radius"
          tooltip="The border radius of the launcher button. Leave blank for a round launcher."
          placeholder="Round"
          defaultValue={launcher.borderRadius == null ? '' : String(launcher.borderRadius)}
          onChange={(value: string) => {
            update({ borderRadius: value.trim() === '' ? null : Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingSelect
          text="Text mode"
          name="rc-launcher-text-mode"
          items={textModeItems}
          tooltip="Controls what text is shown next to the launcher icon."
          vertical
          defaultValue={launcher.textMode}
          onValueChange={(value: string) => {
            update({ textMode: value as ResourceCenterLauncherTextMode });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingSelect
          text="Show remaining tasks"
          name="rc-launcher-show-remaining-tasks"
          items={[
            { name: 'Show', value: 'true' },
            { name: 'Hide', value: 'false' },
          ]}
          tooltip="Whether to show the number of remaining checklist tasks."
          defaultValue={String(launcher.showRemainingTasks)}
          onValueChange={(value: string) => {
            update({ showRemainingTasks: value === 'true' });
          }}
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
};

ThemeSettingsResourceCenterLauncher.displayName = 'ThemeSettingsResourceCenterLauncher';
