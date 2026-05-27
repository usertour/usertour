import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { ApiCopyButton } from './api-copy-button';

interface ApiKeyDialogProps {
  token: string;
  title?: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApiKeyDialog = (props: ApiKeyDialogProps) => {
  const { token, title, description, open, onOpenChange } = props;
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? t('settings.api.columns.key')}</DialogTitle>
          <DialogDescription>
            {description ?? t('settings.api.keyDialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">{t('settings.api.columns.key')}</span>
          <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
            <code className="text-sm flex-1">{token}</code>
            <ApiCopyButton token={token} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
