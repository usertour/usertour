import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { ModalBackdropClickBehavior } from '@usertour/types';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsModal = () => {
  const { settings, setSettings, isViewOnly } = useThemeSettingsContext();
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
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Padding"
          name="modal-padding"
          defaultValue={String(settings.modal.padding)}
          onChange={(value: string) => {
            update({ padding: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingSelect
          text="Modal backdrop click behavior"
          name="modal-backdrop-click-behavior"
          defaultValue={
            settings.modal?.backdropClickBehavior ?? ModalBackdropClickBehavior.DO_NOTHING
          }
          items={[
            { value: ModalBackdropClickBehavior.DO_NOTHING, name: 'Do nothing' },
            { value: ModalBackdropClickBehavior.DISMISS_FLOW, name: 'Dismiss flow' },
          ]}
          onValueChange={(value: string) => {
            update({ backdropClickBehavior: value as ModalBackdropClickBehavior });
          }}
          disabled={isViewOnly}
          vertical
          tooltip="Controls the action when users click the backdrop area outside the modal."
        />
      </div>
    </div>
  );
};

ThemeSettingsModal.displayName = 'ThemeSettingsModal';
