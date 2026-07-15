import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { EyeOpenIcon } from '@radix-ui/react-icons';
import { Delete2Icon, RiFileCopyLine } from '@usertour/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DestructiveConfirmDialog,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from '@usertour/ui';
import {
  type SigningSecret,
  useCreateSigningSecretMutation,
  useGetSigningSecretLazyQuery,
  useRevokeSigningSecretMutation,
} from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useAppContext } from '@/contexts/app-context';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
import { SigningSecretDialog } from './signing-secret-dialog';

/** Steady-state secret plus one rotation slot (ADR 0008) */
const MAX_ACTIVE_SIGNING_SECRETS = 2;

interface SecretEntryProps {
  signingSecret: SigningSecret;
  environmentId: string;
  label: string;
  /** The rotating-out (previous) secret: shows the badge, hint, and revoke. */
  isPrevious?: boolean;
}

const SecretEntry = (props: SecretEntryProps) => {
  const { signingSecret, environmentId, label, isPrevious = false } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const copy = useCopyWithToast();
  const { isViewOnly } = useAppContext();
  const { invoke: fetchSigningSecret, loading: isSecretLoading } = useGetSigningSecretLazyQuery();
  const { invoke: revokeSigningSecret, loading: isRevoking } = useRevokeSigningSecretMutation();
  const [revealOpen, setRevealOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [fullSecret, setFullSecret] = useState('');

  const handleCopy = async () => {
    const secret = await fetchSigningSecret(environmentId, signingSecret.id);
    if (secret) {
      copy(secret, t('settings.identityVerification.secrets.copiedToast'));
    }
  };

  const handleReveal = async () => {
    setRevealOpen(true);
    const secret = await fetchSigningSecret(environmentId, signingSecret.id);
    if (secret) {
      setFullSecret(secret);
    }
  };

  const handleRevoke = async () => {
    try {
      const success = await revokeSigningSecret(environmentId, signingSecret.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.identityVerification.secrets.revokeSuccess'),
        });
        setRevokeOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: t('settings.identityVerification.secrets.revokeFailure'),
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {isPrevious && (
          <Badge variant="secondary">
            {t('settings.identityVerification.secrets.rotatingOutBadge')}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input readOnly value={signingSecret.secret} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => void handleCopy()}
          title={t('settings.identityVerification.secrets.copyButton')}
        >
          <RiFileCopyLine className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => void handleReveal()}
          title={t('settings.identityVerification.secrets.revealButton')}
        >
          <EyeOpenIcon className="h-4 w-4" />
        </Button>
        {isPrevious && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 text-destructive hover:text-destructive"
            disabled={isViewOnly}
            onClick={() => setRevokeOpen(true)}
            title={t('settings.identityVerification.secrets.revokeButton')}
          >
            <Delete2Icon className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {t('settings.identityVerification.secrets.createdAt')}{' '}
        {format(new Date(signingSecret.createdAt), 'PP')} ·{' '}
        {t('settings.identityVerification.secrets.lastUsedAt')}{' '}
        {signingSecret.lastUsedAt
          ? format(new Date(signingSecret.lastUsedAt), 'PPp')
          : t('settings.identityVerification.secrets.neverUsed')}
      </p>
      {isPrevious && (
        <p className="text-sm text-muted-foreground">
          {t('settings.identityVerification.secrets.rotatingOutHint')}
        </p>
      )}

      <DestructiveConfirmDialog
        title={t('settings.identityVerification.secrets.revokeConfirmTitle')}
        description={t('settings.identityVerification.secrets.revokeConfirmDescription')}
        confirmLabel={t('settings.identityVerification.secrets.revokeConfirmAction')}
        cancelLabel={t('settings.common.cancel')}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onConfirm={handleRevoke}
        loading={isRevoking}
      />
      <SigningSecretDialog
        secret={fullSecret}
        open={revealOpen}
        onOpenChange={(open) => {
          setRevealOpen(open);
          if (!open) {
            setFullSecret('');
          }
        }}
        description={
          isSecretLoading ? t('settings.identityVerification.secrets.dialogLoading') : undefined
        }
      />
    </div>
  );
};

export interface SigningSecretCardProps {
  environmentId: string;
  signingSecrets: SigningSecret[];
}

/**
 * Single-secret mental model over the dual-slot data model: one "current"
 * secret plus a Rotate action; the second slot surfaces only mid-rotation as
 * a "previous secret" entry with its own revoke.
 */
export const SigningSecretCard = (props: SigningSecretCardProps) => {
  const { environmentId, signingSecrets } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isViewOnly } = useAppContext();
  const { invoke: createSigningSecret, loading: isCreating } = useCreateSigningSecretMutation();
  const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  // Newest first: index 0 is the current secret, index 1 rotates out.
  const orderedSecrets = [...signingSecrets].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
  const currentSecret = orderedSecrets[0];
  const previousSecret = orderedSecrets[1];
  const isRotating = orderedSecrets.length >= MAX_ACTIVE_SIGNING_SECRETS;

  const handleCreate = async () => {
    try {
      const signingSecret = await createSigningSecret(environmentId);
      if (signingSecret) {
        setCreatedSecret(signingSecret.secret);
      } else {
        toast({
          variant: 'destructive',
          title: t('settings.identityVerification.secrets.createFailure'),
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const actionButton = currentSecret ? (
    <Button
      type="button"
      variant="outline"
      disabled={isRotating || isCreating || isViewOnly}
      onClick={() => setRotateConfirmOpen(true)}
    >
      {t('settings.identityVerification.secrets.rotateButton')}
    </Button>
  ) : (
    <Button type="button" disabled={isCreating || isViewOnly} onClick={() => void handleCreate()}>
      {t('settings.identityVerification.secrets.generateButton')}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Label className="text-base">
          {t('settings.identityVerification.secrets.sectionTitle')}
        </Label>
        {isRotating ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-not-allowed">{actionButton}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {t('settings.identityVerification.secrets.finishRotationTooltip')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          actionButton
        )}
      </div>

      {currentSecret ? (
        <div className="space-y-5">
          <SecretEntry
            signingSecret={currentSecret}
            environmentId={environmentId}
            label={t('settings.identityVerification.secrets.currentLabel')}
          />
          {previousSecret && (
            <SecretEntry
              signingSecret={previousSecret}
              environmentId={environmentId}
              label={t('settings.identityVerification.secrets.previousLabel')}
              isPrevious
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('settings.identityVerification.secrets.empty')}
        </p>
      )}

      <AlertDialog open={rotateConfirmOpen} onOpenChange={setRotateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings.identityVerification.secrets.rotateConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.identityVerification.secrets.rotateConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRotateConfirmOpen(false);
                void handleCreate();
              }}
            >
              {t('settings.identityVerification.secrets.rotateConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SigningSecretDialog
        secret={createdSecret ?? ''}
        title={t('settings.identityVerification.secrets.dialogCreatedTitle')}
        open={createdSecret !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedSecret(null);
          }
        }}
      />
    </div>
  );
};

SigningSecretCard.displayName = 'SigningSecretCard';
