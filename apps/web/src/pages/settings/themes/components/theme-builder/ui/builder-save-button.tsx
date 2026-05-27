import { RiCheckLine } from '@usertour/icons';
import { useTranslation } from 'react-i18next';

export interface BuilderSaveButtonProps {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  disabled?: boolean;
}

export const BuilderSaveButton = (props: BuilderSaveButtonProps) => {
  const { hasUnsavedChanges, isSaving, onSave, disabled } = props;
  const { t } = useTranslation();
  if (disabled) return null;

  if (!hasUnsavedChanges && !isSaving) {
    return (
      <span className="inline-flex h-7.5 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground">
        <RiCheckLine className="h-3.5 w-3.5" />
        {t('themeBuilder.chrome.saved')}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving}
      className="inline-flex h-7.5 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {isSaving ? t('themeBuilder.chrome.saving') : t('themeBuilder.chrome.save')}
    </button>
  );
};
