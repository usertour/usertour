import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { getErrorMessage } from '@usertour/helpers';
import {
  useGetWebhookQuery,
  useQueryWebhookDeliveriesQuery,
  useRotateWebhookSecretMutation,
} from '@usertour/hooks';
import {
  ArrowLeftIcon,
  ArrowRightLeftIcon,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
} from '@usertour/icons';
import {
  Badge,
  Button,
  DestructiveConfirmDialog,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';

const DELIVERIES_PAGE_SIZE = 20;

const MASKED_SECRET = 'whsec_••••••••••••••••••••••••••••••••';

const SigningSecretSection = ({ webhookId, secret }: { webhookId: string; secret: string }) => {
  const [revealed, setRevealed] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const { isViewOnly } = useAppContext();
  const { invoke: rotateSecret, loading: isRotating } = useRotateWebhookSecretMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      toast({ variant: 'success', title: t('settings.webhooks.secret.copied') });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const handleRotate = async () => {
    try {
      const rotated = await rotateSecret(webhookId);
      if (rotated) {
        setRotateOpen(false);
        setRevealed(true);
        toast({ variant: 'success', title: t('settings.webhooks.secret.rotateSuccess') });
      } else {
        toast({ variant: 'destructive', title: t('settings.webhooks.secret.rotateFailure') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{t('settings.webhooks.secret.label')}</Label>
      <div className="flex items-center gap-2">
        <Input readOnly value={revealed ? secret : MASKED_SECRET} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => setRevealed((current) => !current)}
          title={t('settings.webhooks.secret.revealButton')}
        >
          {revealed ? <RiEyeOffLine className="h-4 w-4" /> : <RiEyeLine className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => void handleCopy()}
          title={t('settings.webhooks.secret.copyButton')}
        >
          <RiFileCopyLine className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={isViewOnly}
          onClick={() => setRotateOpen(true)}
          title={t('settings.webhooks.secret.rotateButton')}
        >
          <ArrowRightLeftIcon className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t('settings.webhooks.secret.hint')}</p>

      <DestructiveConfirmDialog
        title={t('settings.webhooks.secret.rotateConfirmTitle')}
        description={t('settings.webhooks.secret.rotateConfirmDescription')}
        confirmLabel={t('settings.webhooks.secret.rotateConfirmButton')}
        cancelLabel={t('settings.common.cancel')}
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        onConfirm={handleRotate}
        loading={isRotating}
      />
    </div>
  );
};

const DeliveriesSection = ({ webhookId }: { webhookId: string }) => {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { deliveries, pageInfo, loading } = useQueryWebhookDeliveriesQuery(webhookId, {
    first: DELIVERIES_PAGE_SIZE,
    after: cursor,
  });
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold">{t('settings.webhooks.deliveries.title')}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-44">{t('settings.webhooks.deliveries.columns.time')}</TableHead>
            <TableHead>{t('settings.webhooks.deliveries.columns.topic')}</TableHead>
            <TableHead className="w-24">
              {t('settings.webhooks.deliveries.columns.status')}
            </TableHead>
            <TableHead className="w-20">
              {t('settings.webhooks.deliveries.columns.attempt')}
            </TableHead>
            <TableHead className="w-24">
              {t('settings.webhooks.deliveries.columns.duration')}
            </TableHead>
            <TableHead>{t('settings.webhooks.deliveries.columns.error')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t('settings.webhooks.deliveries.empty')}
              </TableCell>
            </TableRow>
          )}
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell>{format(new Date(delivery.createdAt), 'PP pp')}</TableCell>
              <TableCell className="font-mono text-xs">{delivery.topic}</TableCell>
              <TableCell>
                {delivery.success ? (
                  <Badge variant="success">{delivery.responseStatus ?? 'OK'}</Badge>
                ) : (
                  <Badge variant="destructive">{delivery.responseStatus ?? 'ERR'}</Badge>
                )}
              </TableCell>
              <TableCell>{delivery.attempt}</TableCell>
              <TableCell>
                {delivery.durationMs != null ? `${delivery.durationMs}ms` : '—'}
              </TableCell>
              <TableCell className="truncate max-w-72 text-muted-foreground">
                {delivery.error ?? ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pageInfo?.hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setCursor(pageInfo.endCursor ?? undefined)}
        >
          {t('settings.webhooks.deliveries.loadMore')}
        </Button>
      )}
    </div>
  );
};

export const WebhookDetail = () => {
  const { settingSubType: webhookId, projectId } = useParams();
  const { webhook, loading } = useGetWebhookQuery(webhookId ?? '');
  const { t } = useTranslation();

  if (loading && !webhook) {
    return null;
  }

  if (!webhook) {
    return (
      <div className="max-w-3xl mx-auto py-8 text-muted-foreground">
        {t('settings.webhooks.notFound')}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col grow space-y-8 py-8">
      <div className="space-y-2">
        <Link
          to={`/project/${projectId}/settings/webhooks`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('settings.webhooks.backToList')}
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold truncate">{webhook.url}</h2>
          {webhook.enabled ? (
            <Badge variant="success">{t('settings.webhooks.statusEnabled')}</Badge>
          ) : (
            <Badge variant="secondary">{t('settings.webhooks.statusDisabled')}</Badge>
          )}
        </div>
        {webhook.description && (
          <p className="text-sm text-muted-foreground">{webhook.description}</p>
        )}
      </div>

      {webhook.secret && <SigningSecretSection webhookId={webhook.id} secret={webhook.secret} />}

      <DeliveriesSection webhookId={webhook.id} />
    </div>
  );
};

WebhookDetail.displayName = 'WebhookDetail';
