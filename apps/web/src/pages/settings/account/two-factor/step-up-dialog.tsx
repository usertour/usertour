import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour/dialog';
import { SpinnerIcon } from '@usertour/icons';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import { CodeField } from './code-field';

export interface StepUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: (code: string, isRecoveryCode: boolean) => Promise<void>;
}

/**
 * Generic "prove you have 2FA" dialog used by Disable. Accepts a TOTP or
 * a recovery code (toggle inside `CodeField`).
 */
export const StepUpDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: StepUpDialogProps) => {
  const { t } = useTranslation('ui');
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!code.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(code.trim(), useRecoveryCode);
      onOpenChange(false);
      setCode('');
      setUseRecoveryCode(false);
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <CodeField
          useRecoveryCode={useRecoveryCode}
          code={code}
          onCodeChange={setCode}
          onToggleMode={() => {
            setUseRecoveryCode((current) => !current);
            setCode('');
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('twoFactor.setup.cancelButton')}
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || !code.trim()}>
            {submitting && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
