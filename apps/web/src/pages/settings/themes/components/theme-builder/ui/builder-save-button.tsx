import { CheckIcon } from '@radix-ui/react-icons';

interface Props {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  disabled?: boolean;
}

export function BuilderSaveButton({ hasUnsavedChanges, isSaving, onSave, disabled }: Props) {
  if (disabled) return null;

  if (!hasUnsavedChanges && !isSaving) {
    return (
      <span className="inline-flex h-7.5 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground">
        <CheckIcon className="h-3.5 w-3.5" />
        Saved
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving}
      className="inline-flex h-7.5 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {isSaving ? 'Saving…' : 'Save'}
    </button>
  );
}
