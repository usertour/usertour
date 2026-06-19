'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretSortIcon } from '@radix-ui/react-icons';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { apiUrl } from '@/utils/env';
import { z } from 'zod';

const ROLE_OPTIONS = [
  { value: 'ADMIN', i18nKey: 'settings.sso.roles.admin' },
  { value: 'VIEWER', i18nKey: 'settings.sso.roles.viewer' },
] as const;

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
  defaultRole: z.enum(['ADMIN', 'VIEWER']),
  // Comma / whitespace separated; empty = trust the IdP.
  allowedDomains: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const parseDomains = (value: string | undefined): string[] =>
  (value ?? '')
    .split(/[\s,]+/)
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

export const SsoProviderDialog = (props: SsoProviderDialogProps) => {
  const { open, onOpenChange, provider, onSubmit } = props;
  const { project } = useAppContext();
  const { t } = useTranslation();
  const { invoke: create } = useCreateOidcSsoProviderMutation();
  const { invoke: update } = useUpdateSsoProviderMutation();
  const isEdit = Boolean(provider);

  const defaultValues: FormValues = {
    name: provider?.name ?? '',
    issuer: provider?.issuer ?? '',
    clientId: provider?.clientId ?? '',
    clientSecret: '',
    defaultRole: provider?.defaultRole ?? 'ADMIN',
    allowedDomains: (provider?.allowedDomains ?? []).join(', '),
  };

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues,
    submit: async (values) => {
      const allowedDomains = parseDomains(values.allowedDomains);
      if (isEdit && provider) {
        await update(provider.id, {
          name: values.name,
          issuer: values.issuer,
          clientId: values.clientId,
          defaultRole: values.defaultRole,
          allowedDomains,
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
          defaultRole: values.defaultRole,
          allowedDomains,
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

  const callbackUrl = provider ? `${apiUrl}/api/auth/sso/${provider.id}/callback` : '';

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
      <div className="space-y-4">
        {isEdit && (
          <FormItem>
            <FormLabel>{t('settings.sso.form.callbackUrlLabel')}</FormLabel>
            <FormControl>
              <Input readOnly value={callbackUrl} onFocus={(event) => event.target.select()} />
            </FormControl>
            <FormDescription>{t('settings.sso.form.callbackUrlHelp')}</FormDescription>
          </FormItem>
        )}
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
        <FormField
          control={state.form.control}
          name="defaultRole"
          render={({ field }) => {
            const selected = ROLE_OPTIONS.find((option) => option.value === field.value);
            return (
              <FormItem>
                <FormLabel>{t('settings.sso.form.defaultRoleLabel')}</FormLabel>
                {/* modal={false}: parent Dialog already traps focus. */}
                <DropdownMenu modal={false}>
                  <FormControl>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                      >
                        {selected ? t(selected.i18nKey) : ''}
                        <CaretSortIcon className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                  </FormControl>
                  <DropdownMenuContent
                    align="start"
                    className="w-[--radix-dropdown-menu-trigger-width]"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onSelect={() => field.onChange(option.value)}
                      >
                        {t(option.i18nKey)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <FormDescription>{t('settings.sso.form.defaultRoleHelp')}</FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={state.form.control}
          name="allowedDomains"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.sso.form.allowedDomainsLabel')}</FormLabel>
              <FormControl>
                <Input placeholder="acme.com, acme.io" {...field} />
              </FormControl>
              <FormDescription>{t('settings.sso.form.allowedDomainsHelp')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SettingsDialogForm>
  );
};

SsoProviderDialog.displayName = 'SsoProviderDialog';
