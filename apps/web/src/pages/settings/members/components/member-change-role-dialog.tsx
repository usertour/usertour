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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FacetedMultiSelect,
  FormDescription,
  SettingsDialogForm,
  useSettingsForm,
} from '@usertour/ui';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { useChangeTeamMemberRoleMutation } from '@usertour/hooks';
import { type TeamMember, TeamMemberRole } from '@usertour/types';
import { z } from 'zod';

// Owner is granted via the transfer-ownership flow, not this dialog.
const ROLE_OPTIONS = [
  { value: TeamMemberRole.ADMIN, i18nKey: 'settings.team.roles.admin' },
  { value: TeamMemberRole.VIEWER, i18nKey: 'settings.team.roles.viewer' },
] as const;

interface MemberChangeRoleDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TeamMember;
  /** Called only after a successful change — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const schema = z.object({
  role: z.string(),
  environmentIds: z.array(z.string()).min(1, 'Select at least one environment'),
});

type FormValues = z.infer<typeof schema>;

export const MemberChangeRoleDialog = (props: MemberChangeRoleDialogProps) => {
  const { projectId, open, onOpenChange, data, onSubmit } = props;
  const { invoke } = useChangeTeamMemberRoleMutation();
  const { t } = useTranslation();
  const { environmentList } = useEnvironmentList();

  // null restriction = every environment selected in the picker.
  const initialEnvironmentIds = () =>
    data.allowedEnvironmentIds ?? (environmentList ?? []).map((env) => env.id);

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: { role: data.role, environmentIds: initialEnvironmentIds() },
    submit: async ({ role, environmentIds }) => {
      if (!data.userId) {
        // A bare `return` here would land in useSettingsForm's success
        // path — success toast + form reset, dialog stays open. Treat
        // it as an outright failure instead so the user sees what's
        // happening.
        throw new Error(t('settings.team.changeRole.failure'));
      }
      // Full selection clears the restriction (null = all, includes future envs).
      const restriction =
        environmentIds.length === (environmentList?.length ?? 0) ? null : environmentIds;
      const success = await invoke(projectId, data.userId, role, restriction);
      if (!success) {
        throw new Error(t('settings.team.changeRole.failure'));
      }
      onSubmit?.(true);
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      state.form.reset({ role: data.role, environmentIds: initialEnvironmentIds() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data.role, data.allowedEnvironmentIds, environmentList]);

  return (
    <SettingsDialogForm
      title={t('settings.team.changeRole.title')}
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      submitLabel={t('settings.team.changeRole.submit')}
      cancelLabel={t('settings.common.cancel')}
    >
      <FormField
        control={state.form.control}
        name="role"
        render={({ field }) => {
          const selected = ROLE_OPTIONS.find((option) => option.value === field.value);
          return (
            <FormItem>
              <FormLabel>{t('settings.team.changeRole.roleLabel')}</FormLabel>
              {/* modal={false}: parent Dialog already traps focus;
                  skipping the dropdown's own trap avoids the
                  aria-hidden conflict on the still-focused trigger. */}
              <DropdownMenu modal={false}>
                <FormControl>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {selected
                        ? t(selected.i18nKey)
                        : t('settings.team.changeRole.rolePlaceholder')}
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
              <FormMessage />
            </FormItem>
          );
        }}
      />
      <FormField
        control={state.form.control}
        name="environmentIds"
        render={({ field }) => (
          <FormItem className="mt-4">
            <FormLabel>{t('settings.team.invite.environmentsLabel')}</FormLabel>
            <FormControl>
              {/* Block wrapper: the select is an inline-flex button and would
                  otherwise share a line with the (inline) form label. */}
              <div>
                <FacetedMultiSelect
                  label={t('settings.team.invite.environmentsSelect')}
                  options={(environmentList ?? []).map((env) => ({
                    label: env.name,
                    value: env.id,
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                />
              </div>
            </FormControl>
            <FormDescription>{t('settings.team.invite.environmentsHelp')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </SettingsDialogForm>
  );
};

MemberChangeRoleDialog.displayName = 'MemberChangeRoleDialog';
