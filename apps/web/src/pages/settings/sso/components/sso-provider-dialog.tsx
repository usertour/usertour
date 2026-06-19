'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RiFileCopyLine } from '@usertour/icons';
import {
  Button,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  SettingsDialogForm,
  useSettingsForm,
} from '@usertour/ui';
import {
  type SsoProvider,
  useCreateOidcSsoProviderMutation,
  useUpdateSsoProviderMutation,
} from '@usertour/hooks';
import { useAppContext } from '@/contexts/app-context';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
import { z } from 'zod';

const SectionHeading = ({ title }: { title: string }) => (
  <h4 className="pt-2 text-sm font-semibold">{title}</h4>
);

interface SsoProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit mode; absent → create mode. */
  provider?: SsoProvider;
  /** Called after a successful create/update — consumers refetch here. */
  onSubmit?: () => void;
}

const schema = z.object({
  name: z.string().min(1).max(60),
  issuer: z.string().url(),
  clientId: z.string().min(1),
  // Optional so an edit can leave it blank to keep the stored secret; create
  // is validated in the submit handler.
  clientSecret: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export const SsoProviderDialog = (props: SsoProviderDialogProps) => {
  const { open, onOpenChange, provider, onSubmit } = props;
  const { project, globalConfig } = useAppContext();
  const { t } = useTranslation();
  const copy = useCopyWithToast();
  const { invoke: create } = useCreateOidcSsoProviderMutation();
  const { invoke: update } = useUpdateSsoProviderMutation();
  const isEdit = Boolean(provider);

  const defaultValues: FormValues = {
    name: provider?.name ?? '',
    issuer: provider?.issuer ?? '',
    clientId: provider?.clientId ?? '',
    clientSecret: '',
  };

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues,
    submit: async (values) => {
      if (isEdit && provider) {
        await update(provider.id, {
          name: values.name,
          issuer: values.issuer,
          clientId: values.clientId,
          ...(values.clientSecret ? { clientSecret: values.clientSecret } : {}),
        });
      } else {
        if (!values.clientSecret) {
          throw new Error(t('settings.sso.form.clientSecretRequired'));
        }
        await create(project?.id as string, {
          name: values.name,
          issuer: values.issuer,
          clientId: values.clientId,
          clientSecret: values.clientSecret,
        });
      }
      onSubmit?.();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      state.form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider?.id]);

  // One fixed redirect URI for every provider — known up front, so it can be
  // shown (and copied) in the create form, not just on edit. Built from the
  // server-authoritative apiUrl (globalConfig) so the copied value is exactly
  // the redirect_uri the backend sends to the IdP (no VITE_API_URL drift).
  const callbackUrl = `${globalConfig?.apiUrl ?? ''}/api/auth/sso/callback`;

  return (
    <SettingsDialogForm
      title={isEdit ? t('settings.sso.form.editTitle') : t('settings.sso.form.createTitle')}
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      submitLabel={isEdit ? t('settings.common.save') : t('settings.sso.form.create')}
      cancelLabel={t('settings.common.cancel')}
      contentClassName="max-w-xl"
    >
      <div className="space-y-4 px-0.5">
        <FormField
          control={state.form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.sso.form.nameLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('settings.sso.form.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SectionHeading title={t('settings.sso.form.idpSection')} />
        <FormField
          control={state.form.control}
          name="issuer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.sso.form.issuerLabel')}</FormLabel>
              <FormControl>
                <Input placeholder="https://example.okta.com" {...field} />
              </FormControl>
              <FormDescription>{t('settings.sso.form.issuerHelp')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={state.form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.sso.form.clientIdLabel')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={state.form.control}
          name="clientSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.sso.form.clientSecretLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={isEdit ? t('settings.sso.form.clientSecretKeep') : ''}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SectionHeading title={t('settings.sso.form.spSection')} />
        <FormItem>
          <FormLabel>{t('settings.sso.form.callbackUrlLabel')}</FormLabel>
          <FormControl>
            <div className="flex gap-2">
              <Input
                readOnly
                value={callbackUrl}
                onFocus={(event) => event.target.select()}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => copy(callbackUrl, t('settings.sso.form.callbackUrlCopied'))}
              >
                <RiFileCopyLine className="h-4 w-4" />
              </Button>
            </div>
          </FormControl>
          <FormDescription>{t('settings.sso.form.callbackUrlHelp')}</FormDescription>
        </FormItem>
      </div>
    </SettingsDialogForm>
  );
};

SsoProviderDialog.displayName = 'SsoProviderDialog';
