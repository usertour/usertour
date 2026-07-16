import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@usertour/ui';
import { RiFileCopyLine } from '@usertour/icons';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';

export interface SigningSecretDialogProps {
  secret: string;
  title?: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SigningSecretDialog = (props: SigningSecretDialogProps) => {
  const { secret, title, description, open, onOpenChange } = props;
  const { t } = useTranslation();
  const copy = useCopyWithToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title ?? t('settings.identityVerification.secrets.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {description ?? t('settings.identityVerification.secrets.dialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
          <code className="text-sm flex-1 break-all">{secret}</code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => copy(secret, t('settings.identityVerification.secrets.copiedToast'))}
          >
            <RiFileCopyLine className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

SigningSecretDialog.displayName = 'SigningSecretDialog';
