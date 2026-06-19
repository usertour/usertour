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
  SettingsFormSection,
  useSettingsForm,
} from '@usertour/ui';
import { type ProjectSsoSettings, useUpdateProjectSsoSettingsMutation } from '@usertour/hooks';
import * as z from 'zod';

const ROLE_OPTIONS = [
  { value: 'ADMIN', i18nKey: 'settings.sso.roles.admin' },
  { value: 'VIEWER', i18nKey: 'settings.sso.roles.viewer' },
] as const;

const parseDomains = (value: string | undefined): string[] =>
  (value ?? '')
    .split(/[\s,]+/)
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

const schema = z.object({
  defaultRole: z.enum(['ADMIN', 'VIEWER']),
  // Comma / whitespace separated; empty = trust the IdP.
  allowedDomains: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SsoProvisioningCardProps {
  projectId: string;
  /** Loaded settings — the card is only mounted once these are present. */
  settings: ProjectSsoSettings;
  onChanged: () => void;
}

export const SsoProvisioningCard = (props: SsoProvisioningCardProps) => {
  const { projectId, settings, onChanged } = props;
  const { t } = useTranslation();
  const { invoke: updateSettings } = useUpdateProjectSsoSettingsMutation();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: {
      defaultRole: settings.defaultRole,
      allowedDomains: settings.allowedDomains.join(', '),
    },
    submit: async (values) => {
      await updateSettings(projectId, {
        defaultRole: values.defaultRole,
        allowedDomains: parseDomains(values.allowedDomains),
      });
      onChanged();
    },
    successMessage: t('settings.sso.settings.savedToast'),
  });

  return (
    <SettingsFormSection
      title={t('settings.sso.settings.provisioningTitle')}
      description={t('settings.sso.settings.provisioningDescription')}
      submitLabel={t('settings.common.save')}
      state={state}
    >
      <FormField
        control={state.form.control}
        name="defaultRole"
        render={({ field }) => {
          const selected = ROLE_OPTIONS.find((option) => option.value === field.value);
          return (
            <FormItem>
              <FormLabel>{t('settings.sso.form.defaultRoleLabel')}</FormLabel>
              <DropdownMenu>
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
    </SettingsFormSection>
  );
};

SsoProvisioningCard.displayName = 'SsoProvisioningCard';
