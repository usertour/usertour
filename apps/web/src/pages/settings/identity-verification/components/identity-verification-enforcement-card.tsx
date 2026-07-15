import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from '@usertour/ui';
import { useSetRequireIdentityVerificationMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';

export interface IdentityVerificationEnforcementCardProps {
  environmentId: string;
  requireIdentityVerification: boolean;
  /** At least one active signing secret exists — required before enforcing. */
  hasActiveSecret: boolean;
}

// Header-row toggle (label + description left, switch right) mirroring the SSO
// enforcement card, so it reads as one of the standard Settings sections.
export const IdentityVerificationEnforcementCard = (
  props: IdentityVerificationEnforcementCardProps,
) => {
  const { environmentId, requireIdentityVerification, hasActiveSecret } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { invoke: setRequired, loading: saving } = useSetRequireIdentityVerificationMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const persist = async (next: boolean) => {
    try {
      await setRequired(environmentId, next);
      toast({
        variant: 'success',
        title: next
          ? t('settings.identityVerification.enforcement.enabledToast')
          : t('settings.identityVerification.enforcement.disabledToast'),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const handleToggle = (next: boolean) => {
    if (next) {
      // Enabling rejects every unsigned non-anonymous identify — confirm first.
      setConfirmOpen(true);
      return;
    }
    void persist(false);
  };

  // Enforcement can only be turned ON with an active secret; it can always be
  // turned OFF. Anti-lockout keeps an enforced environment from losing its
  // last one.
  const needsSecret = !requireIdentityVerification && !hasActiveSecret;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h3 className="text-xl font-medium tracking-tight">
          {t('settings.identityVerification.enforcement.title')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('settings.identityVerification.enforcement.description')}
        </p>
      </div>
      <div className="shrink-0 pt-2">
        {needsSecret ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-not-allowed">
                  <Switch
                    checked={false}
                    disabled
                    onCheckedChange={() => undefined}
                    className="shrink-0 data-[state=unchecked]:bg-input pointer-events-none"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {t('settings.identityVerification.enforcement.needsSecret')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Switch
            checked={requireIdentityVerification}
            disabled={saving}
            onCheckedChange={handleToggle}
            className="shrink-0 data-[state=unchecked]:bg-input"
          />
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings.identityVerification.enforcement.enableConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.identityVerification.enforcement.enableConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void persist(true);
              }}
            >
              {t('settings.identityVerification.enforcement.enableConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

IdentityVerificationEnforcementCard.displayName = 'IdentityVerificationEnforcementCard';
