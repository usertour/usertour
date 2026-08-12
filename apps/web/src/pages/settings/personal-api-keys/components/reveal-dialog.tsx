import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@usertour/ui';
import { CopyIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';

interface RevealDialogProps {
  /** The plaintext token (`utp_…`). Shown exactly once after creation. */
  token: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * One-time reveal of a freshly-created personal API token. The secret is
 * hashed at rest, so it can never be retrieved again — the title/description
 * make that explicit. Self-contained on purpose (no imports from
 * `settings/api/`, which sunsets with the env-scoped keys page).
 */
export const RevealDialog = (props: RevealDialogProps) => {
  const { token, open, onOpenChange } = props;
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleCopy = async () => {
    // Native clipboard API directly so we can detect failure. A falsely
    // successful copy here can permanently lose access — the token is shown
    // only once and is not retrievable afterwards.
    try {
      await navigator.clipboard.writeText(token);
      toast({ title: t('settings.personalApiKeys.copied') });
    } catch {
      toast({ variant: 'destructive', title: t('settings.personalApiKeys.copyFailed') });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('settings.personalApiKeys.revealTitle')}</DialogTitle>
          <DialogDescription>{t('settings.personalApiKeys.revealDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            {t('settings.personalApiKeys.columns.key')}
          </span>
          <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
            <code className="text-sm flex-1 break-all">{token}</code>
            <Button variant="ghost" size="icon" onClick={handleCopy} disabled={!token}>
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

RevealDialog.displayName = 'RevealDialog';
