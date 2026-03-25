import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsResourceCenterBadge = () => {
  const { settings, setSettings, isViewOnly } = useThemeSettingsContext();

  const badge = settings.resourceCenterUnreadBadge;
  if (!badge) return null;

  const update = (data: Partial<typeof badge>) => {
    setSettings((pre) => ({
      ...pre,
      resourceCenterUnreadBadge: { ...badge, ...data },
    }));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSelectColor
          text="Background color"
          name="rc-badge-bg-color"
          defaultColor={badge.backgroundColor}
          onChange={(value: string) => {
            update({ backgroundColor: value });
          }}
          disabled={isViewOnly}
        />
        <ThemeSelectColor
          text="Text color"
          name="rc-badge-text-color"
          defaultColor={badge.textColor}
          onChange={(value: string) => {
            update({ textColor: value });
          }}
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
};

ThemeSettingsResourceCenterBadge.displayName = 'ThemeSettingsResourceCenterBadge';
