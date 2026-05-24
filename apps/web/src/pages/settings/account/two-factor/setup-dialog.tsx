import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/button';
import { Checkbox } from '@usertour/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour/dialog';
import {
  type TwoFactorSetupPayload,
  useConfirmTwoFactorSetupMutation,
  useStartTwoFactorSetupMutation,
} from '@usertour/hooks';
import { Input } from '@usertour/input';
import { SpinnerIcon } from '@usertour/icons';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import { downloadRecoveryCodes } from './download-codes';

type SetupStage = 'scan' | 'codes';

export interface SetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnabled: () => Promise<void> | void;
}

/**
 * Two-step "enable 2FA" wizard. Stage 1 fetches a fresh secret + QR code
 * and asks for the user's first TOTP. Stage 2 shows the recovery codes
 * with download/copy/finish buttons.
 */
export const SetupDialog = ({ open, onOpenChange, onEnabled }: SetupDialogProps) => {
  const { t } = useTranslation('ui');
  const { toast } = useToast();
  const start = useStartTwoFactorSetupMutation();
  const confirm = useConfirmTwoFactorSetupMutation();
  const confirmSavedId = useId();

  const [payload, setPayload] = useState<TwoFactorSetupPayload | null>(null);
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<SetupStage>('scan');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  const codesText = useMemo(() => recoveryCodes.join('\n'), [recoveryCodes]);

  const reset = () => {
    setPayload(null);
    setCode('');
    setStage('scan');
    setRecoveryCodes([]);
    setSavedConfirmed(false);
  };

  useEffect(() => {
    if (!open || payload) {
      return;
    }
    let cancelled = false;
    start
      .invoke()
      .then((result) => {
        if (!cancelled && result) {
          setPayload(result);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        toast({ variant: 'destructive', title: getErrorMessage(error) });
        onOpenChange(false);
      });
    return () => {
      cancelled = true;
    };
    // start.invoke / onOpenChange / toast are stable; intentionally not depended-on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payload]);

  const onVerify = async () => {
    if (!payload) {
      return;
    }
    try {
      const codes = await confirm.invoke(payload.secret, code.trim());
      if (codes) {
        setRecoveryCodes(codes);
        setStage('codes');
        await onEnabled();
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(codesText);
    toast({ title: t('twoFactor.setup.copiedToast') });
  };

  const onFinish = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('twoFactor.setup.title')}</DialogTitle>
          {/* Always render DialogDescription so Radix's aria-describedby
              stays stable across stage transitions; the codes stage uses
              the same intro copy as its body paragraph. */}
          <DialogDescription>
            {stage === 'scan'
              ? t('twoFactor.setup.step1Description')
              : t('twoFactor.setup.step3Description')}
          </DialogDescription>
        </DialogHeader>

        {stage === 'scan' && (
          <div className="space-y-4">
            {!payload && (
              <div className="flex items-center justify-center py-12">
                <SpinnerIcon className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {payload && (
              <>
                <div className="flex justify-center">
                  <img
                    src={payload.qrDataUri}
                    alt="QR code"
                    className="h-44 w-44 rounded border border-border bg-white p-2"
                  />
                </div>
                <details className="text-sm text-muted-foreground">
                  <summary className="cursor-pointer">{t('twoFactor.setup.manualEntry')}</summary>
                  <code className="mt-2 block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
                    {payload.secret}
                  </code>
                </details>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('twoFactor.setup.step2Title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('twoFactor.setup.step2Description')}
                  </p>
                  <Input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={t('twoFactor.setup.codePlaceholder')}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('twoFactor.setup.cancelButton')}
              </Button>
              <Button
                type="button"
                onClick={onVerify}
                disabled={!payload || confirm.loading || !code.trim()}
              >
                {confirm.loading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('twoFactor.setup.verifyButton')}
              </Button>
            </DialogFooter>
          </div>
        )}

        {stage === 'codes' && (
          <div className="space-y-4">
            {/* Header DialogDescription already shows step3Description; no
                duplicate paragraph in the body. */}
            <div className="grid grid-cols-2 gap-2 rounded border border-border bg-muted p-3 font-mono text-sm">
              {recoveryCodes.map((recoveryCode) => (
                <span key={recoveryCode}>{recoveryCode}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => downloadRecoveryCodes(recoveryCodes)}
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
              <Button type="button" disabled={!savedConfirmed} onClick={onFinish}>
                {t('twoFactor.setup.finishButton')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
