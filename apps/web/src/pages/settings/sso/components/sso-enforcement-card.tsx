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
import { useUpdateProjectSsoSettingsMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';

interface SsoEnforcementCardProps {
  projectId: string;
  requireSso: boolean;
  /** At least one active provider exists — required before SSO can be enforced. */
  hasActiveProvider: boolean;
  onChanged: () => void;
}

// Header-row toggle (label + description left, switch right) mirroring the 2FA
// settings card, so it reads as one of the standard Settings sections.
export const SsoEnforcementCard = (props: SsoEnforcementCardProps) => {
  const { projectId, requireSso, hasActiveProvider, onChanged } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { invoke: updateSettings, loading: saving } = useUpdateProjectSsoSettingsMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const persist = async (next: boolean) => {
    try {
      await updateSettings(projectId, { requireSso: next });
      onChanged();
      toast({
        variant: 'success',
        title: next
          ? t('settings.sso.settings.enabledToast')
          : t('settings.sso.settings.disabledToast'),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const handleToggle = (next: boolean) => {
    if (next) {
      // Enabling locks out non-SSO login for members — confirm first.
      setConfirmOpen(true);
      return;
    }
    void persist(false);
  };

  // Enforcement can only be turned ON with an active provider; it can always be
  // turned OFF. Anti-lockout keeps an enforced project from losing its last one.
  const needsProvider = !requireSso && !hasActiveProvider;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h3 className="text-xl font-medium tracking-tight">
          {t('settings.sso.settings.requireTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('settings.sso.settings.requireDescription')}
        </p>
      </div>
      <div className="shrink-0 pt-2">
        {needsProvider ? (
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
                {t('settings.sso.settings.requireNeedsProvider')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Switch
            checked={requireSso}
            disabled={saving}
            onCheckedChange={handleToggle}
            className="shrink-0 data-[state=unchecked]:bg-input"
          />
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.sso.settings.enableConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.sso.settings.enableConfirmDescription')}
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
              {t('settings.sso.settings.enableConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

SsoEnforcementCard.displayName = 'SsoEnforcementCard';
