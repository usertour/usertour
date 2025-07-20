import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsModal = () => {
  const { settings, setSettings } = useThemeSettingsContext();
  const update = (data: Partial<typeof settings.modal>) => {
    const { modal } = settings;
    setSettings((pre) => ({
      ...pre,
      modal: { ...modal, ...data },
    }));
  };
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text="Width"
          name="modal-width"
          defaultValue={String(settings.modal.width)}
          onChange={(value: string) => {
            update({ width: Number(value) });
          }}
        />
        <ThemeSettingInput
          text="Padding"
          name="modal-padding"
          defaultValue={String(settings.modal.padding)}
          onChange={(value: string) => {
            update({ padding: Number(value) });
          }}
        />
      </div>
    </div>
  );
};

ThemeSettingsModal.displayName = 'ThemeSettingsModal';
