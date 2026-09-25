import { useDeleteThemeMutation } from '@usertour/hooks';
import { Theme } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { localizeDefinitionReferenceError } from '@/utils/definition-references';
import { DefinitionDeleteGate } from '@/components/definition-references';

interface ThemeDeleteDialogProps {
  data: Theme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const ThemeDeleteDialog = (props: ThemeDeleteDialogProps) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const { invoke: deleteTheme } = useDeleteThemeMutation();
  const { t } = useTranslation();

  return (
    <DefinitionDeleteGate
      kind="theme"
      id={data.id}
      name={data.name}
      open={open}
      onOpenChange={onOpenChange}
    >
      <DestructiveConfirmDialog
        title={t('settings.common.deleteConfirm.title', {
          resource: t('settings.themes.deleteResource'),
        })}
        description={t('settings.themes.deleteDescription')}
        confirmLabel={t('settings.common.deleteConfirm.confirm', {
          resource: t('settings.themes.deleteResource'),
        })}
        cancelLabel={t('settings.common.cancel')}
        open={open}
        onOpenChange={onOpenChange}
        invoke={() =>
          deleteTheme(data.id).catch((error) => {
            throw localizeDefinitionReferenceError(error, t);
          })
        }
        successToast={t('settings.themes.deleteSuccess')}
        failureToast={t('settings.themes.deleteFailure')}
        onSettled={onSubmit}
      />
    </DefinitionDeleteGate>
  );
};

ThemeDeleteDialog.displayName = 'ThemeDeleteDialog';
