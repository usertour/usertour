import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@usertour/ui';
import { useRegenerateRecoveryCodesMutation } from '@usertour/hooks';
import { SpinnerIcon } from '@usertour/icons';
import { getErrorMessage } from '@usertour/helpers';
import { CodeField } from './code-field';
import { downloadRecoveryCodes } from './download-codes';

export interface RegenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Step-up confirmation followed by a new batch of recovery codes. The
 * codes are revealed in-dialog and the user must acknowledge they've
 * saved them before the dialog will close.
 */
export const RegenerateDialog = (props: RegenerateDialogProps) => {
  const { open, onOpenChange } = props;
  const { t } = useTranslation('ui');
  const { toast } = useToast();
  const regenerate = useRegenerateRecoveryCodesMutation();
  const confirmSavedId = useId();

  const [code, setCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  const codesText = useMemo(() => (newCodes ?? []).join('\n'), [newCodes]);

  const reset = () => {
    setCode('');
    setUseRecoveryCode(false);
    setNewCodes(null);
    setSavedConfirmed(false);
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      return;
    }
    try {
      const codes = await regenerate.invoke(code.trim(), useRecoveryCode);
      if (codes) {
        setNewCodes(codes);
      } else {
        // Malformed-but-not-erroring response (server returned without
        // the `recoveryCodes` field). Without an explicit toast the
        // spinner would just stop with no feedback.
        toast({ variant: 'destructive', title: t('twoFactor.regenerate.noCodesReturned') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const onCopy = async () => {
    // Clipboard write can reject on Safari / non-secure contexts / when
    // browser policy blocks. Catch it so the user isn't told the codes
    // were copied when they weren't — the server has already invalidated
    // the previous batch, so trusting a false success here is permanent
    // backup-code loss.
    try {
      await navigator.clipboard.writeText(codesText);
      toast({ title: t('twoFactor.setup.copiedToast') });
    } catch {
      toast({ variant: 'destructive', title: t('twoFactor.setup.copyFailedToast') });
    }
  };

  // Single close path for both the codes-stage Finish button and the
  // scan-stage Cancel button. Radix's Dialog only re-fires its own
  // `onOpenChange` for user-initiated events (Esc, click-outside),
  // never for an externally-controlled `open` prop flip — so calling
  // `props.onOpenChange(false)` from a button bypasses the wrapper
  // that runs `reset()`. Without resetting, `newCodes` survives across
  // re-opens and shows the already-revoked codes batch.
  const close = () => {
    onOpenChange(false);
    reset();
  };

  // Once `newCodes` has been minted, the server has already invalidated
  // the previous batch — closing the dialog without explicit acknowledgement
  // means the user loses their only copy of any working recovery code.
  // Block Esc / click-outside while codes are on screen; the "Finish"
  // button (gated by `savedConfirmed`) is the only legitimate exit.
  const isShowingCodes = newCodes !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isShowingCodes) {
          return;
        }
        onOpenChange(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(event) => {
          if (isShowingCodes) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (isShowingCodes) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('twoFactor.regenerate.title')}</DialogTitle>
          <DialogDescription>{t('twoFactor.regenerate.description')}</DialogDescription>
        </DialogHeader>
        {!newCodes && (
          <>
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
              <Button variant="outline" onClick={close}>
                {t('twoFactor.setup.cancelButton')}
              </Button>
              <Button onClick={handleSubmit} disabled={regenerate.loading || !code.trim()}>
                {regenerate.loading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('twoFactor.regenerate.confirmButton')}
              </Button>
            </DialogFooter>
          </>
        )}
        {newCodes && (
          <>
            <p className="text-sm text-muted-foreground">{t('twoFactor.setup.step3Description')}</p>
            <div className="grid grid-cols-2 gap-2 rounded border border-border bg-muted p-3 font-mono text-sm">
              {newCodes.map((recoveryCode) => (
                <span key={recoveryCode}>{recoveryCode}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => downloadRecoveryCodes(newCodes)}
              >
                {t('twoFactor.setup.downloadButton')}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={onCopy}>
                {t('twoFactor.setup.copyButton')}
              </Button>
            </div>
            <label htmlFor={confirmSavedId} className="flex items-center gap-2 text-sm">
              <Checkbox
                id={confirmSavedId}
                checked={savedConfirmed}
                onCheckedChange={(checked) => setSavedConfirmed(checked === true)}
              />
              <span>{t('twoFactor.setup.confirmSaved')}</span>
            </label>
            <DialogFooter>
              <Button disabled={!savedConfirmed} onClick={close}>
                {t('twoFactor.setup.finishButton')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
