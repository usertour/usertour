'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/button';
import { useDisableTwoFactorMutation } from '@usertour/hooks';
import { RiSparklingFill } from '@usertour/icons';
import { Switch } from '@usertour/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour/tooltip';
import { useToast } from '@usertour/use-toast';
import { useAppContext } from '@/contexts/app-context';
import { RegenerateDialog } from './regenerate-dialog';
import { SetupDialog } from './setup-dialog';
import { StepUpDialog } from './step-up-dialog';
import { useRefreshMe } from './use-refresh-me';

export const AccountTwoFactor = () => {
  const { t } = useTranslation('ui');
  const { userInfo, globalConfig } = useAppContext();
  const { toast } = useToast();
  const disable = useDisableTwoFactorMutation();
  const refreshMe = useRefreshMe();

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

AccountTwoFactor.displayName = 'AccountTwoFactor';
