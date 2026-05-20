'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApolloClient } from '@apollo/client';
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
import { Input } from '@usertour/input';
import { Switch } from '@usertour/switch';
import { RiSparklingFill, SpinnerIcon } from '@usertour/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour/tooltip';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import {
  TwoFactorSetupPayload,
  useConfirmTwoFactorSetupMutation,
  useDisableTwoFactorMutation,
  useRegenerateRecoveryCodesMutation,
  useStartTwoFactorSetupMutation,
} from '@usertour/hooks';
import { getUserInfo } from '@usertour/gql';
import { useAppContext } from '@/contexts/app-context';

type SetupStage = 'scan' | 'codes';

const downloadCodes = (codes: string[]) => {
  const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'usertour-2fa-recovery-codes.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const AccountTwoFactorForm = () => {
  const { t } = useTranslation('ui');
  const { userInfo, globalConfig } = useAppContext();
  const apollo = useApolloClient();
  const { toast } = useToast();
  const disable = useDisableTwoFactorMutation();

  const enabled = !!userInfo?.twoFactorEnabled;
  const requireByInstance = !!globalConfig?.require2FA;
  // In self-host mode the entire 2FA feature is license-gated, and the
  // check is per-user: instance license OR any of the user's projects'
  // licenses can grant the entitlement. If a covering license lapses,
  // enrolled users keep their `twoFactorEnabled=true` flag but the MFA
  // challenge is suppressed server-side — we show the existing state
  // truthfully and let admins deal with the license.
  const featureAvailable = userInfo?.twoFactorAvailable !== false;

  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  const refreshMe = async () => {
    apollo.cache.evict({ fieldName: 'me' });
    apollo.cache.gc();
    await apollo.refetchQueries({ include: [getUserInfo] }).catch(() => undefined);
  };

  const handleDisableConfirm = async (code: string, isRecoveryCode: boolean) => {
    await disable.invoke(code, isRecoveryCode);
    toast({ variant: 'success', title: t('twoFactor.disable.title') });
    await refreshMe();
  };

  const switchControl =
    enabled && requireByInstance ? (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-not-allowed">
              <Switch
                checked
                disabled
                onCheckedChange={() => undefined}
                className="shrink-0 data-[state=unchecked]:bg-input pointer-events-none"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{t('twoFactor.enforcedTooltip')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      <Switch
        checked={enabled}
        disabled={!enabled && !featureAvailable}
        onCheckedChange={(next) => {
          if (next && !enabled) {
            setSetupOpen(true);
          } else if (!next && enabled) {
            setDisableOpen(true);
          }
        }}
        className="shrink-0 data-[state=unchecked]:bg-input"
      />
    );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="flex items-center gap-1.5 text-xl font-semibold tracking-tight">
            {t('twoFactor.title')}
            {!featureAvailable && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger className="inline-flex cursor-default">
                    <RiSparklingFill className="h-5 w-5 text-indigo-500" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {t('twoFactor.licenseRequired')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{t('twoFactor.description')}</p>
        </div>
        <div className="shrink-0 pt-2">{switchControl}</div>
      </div>

      {enabled && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm font-medium">{t('twoFactor.recoveryCodes.title')}</div>
          <Button variant="outline" onClick={() => setRegenOpen(true)}>
            {t('twoFactor.regenerateButton')}
          </Button>
        </div>
      )}

      <SetupDialog open={setupOpen} onOpenChange={setSetupOpen} onEnabled={refreshMe} />
      <StepUpDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        title={t('twoFactor.disable.title')}
        description={t('twoFactor.disable.description')}
        confirmLabel={t('twoFactor.disable.confirmButton')}
        onConfirm={handleDisableConfirm}
      />
      <RegenerateDialog open={regenOpen} onOpenChange={setRegenOpen} />
    </div>
  );
};

AccountTwoFactorForm.displayName = 'AccountTwoFactorForm';

// ---------------------------------------------------------------------------
// Setup wizard dialog (logged-in path)
// ---------------------------------------------------------------------------

interface SetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnabled: () => Promise<void> | void;
}

const SetupDialog = ({ open, onOpenChange, onEnabled }: SetupDialogProps) => {
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
          {stage === 'scan' && (
            <DialogDescription>{t('twoFactor.setup.step1Description')}</DialogDescription>
          )}
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
            <p className="text-sm text-muted-foreground">{t('twoFactor.setup.step3Description')}</p>
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
                onClick={() => downloadCodes(recoveryCodes)}
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

// ---------------------------------------------------------------------------
// Step-up dialog (Disable)
// ---------------------------------------------------------------------------

interface StepUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: (code: string, isRecoveryCode: boolean) => Promise<void>;
}

const StepUpDialog = ({
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

interface CodeFieldProps {
  useRecoveryCode: boolean;
  code: string;
  onCodeChange: (value: string) => void;
  onToggleMode: () => void;
}

const CodeField = ({ useRecoveryCode, code, onCodeChange, onToggleMode }: CodeFieldProps) => {
  const { t } = useTranslation('ui');
  const inputId = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {useRecoveryCode
          ? t('twoFactor.codeLabel.recoveryCode')
          : t('twoFactor.codeLabel.authenticator')}
      </label>
      <Input
        id={inputId}
        autoFocus
        inputMode={useRecoveryCode ? 'text' : 'numeric'}
        autoComplete="one-time-code"
        placeholder={
          useRecoveryCode
            ? t('twoFactor.verify.recoveryCodePlaceholder')
            : t('twoFactor.setup.codePlaceholder')
        }
        value={code}
        onChange={(event) => onCodeChange(event.target.value)}
      />
      <button
        type="button"
        onClick={onToggleMode}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
      >
        {useRecoveryCode
          ? t('twoFactor.verify.useAuthenticatorLink')
          : t('twoFactor.verify.useRecoveryCodeLink')}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Regenerate dialog — step-up + show new codes
// ---------------------------------------------------------------------------

interface RegenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RegenerateDialog = ({ open, onOpenChange }: RegenerateDialogProps) => {
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
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(codesText);
    toast({ title: t('twoFactor.setup.copiedToast') });
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>
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
                onClick={() => downloadCodes(newCodes)}
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
              <Button disabled={!savedConfirmed} onClick={() => onOpenChange(false)}>
                {t('twoFactor.setup.finishButton')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
