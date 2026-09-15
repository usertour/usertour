'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsDialogForm, useSettingsForm } from '@usertour/ui';
import { useChangeTeamMemberRoleMutation } from '@usertour/hooks';
import { type TeamMember, TeamMemberRole } from '@usertour/types';
import { z } from 'zod';
import { MemberRoleFields, memberRoleFieldsSchema } from './member-role-fields';

interface MemberChangeRoleDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TeamMember;
  /** Called only after a successful change — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const schema = memberRoleFieldsSchema;

type FormValues = z.infer<typeof schema>;

const valuesOf = (data: TeamMember): FormValues => ({
  role: data.role,
  allowedEnvironmentIds: data.allowedEnvironmentIds ?? [],
});

export const MemberChangeRoleDialog = (props: MemberChangeRoleDialogProps) => {
  const { projectId, open, onOpenChange, data, onSubmit } = props;
  const { invoke } = useChangeTeamMemberRoleMutation();
  const { t } = useTranslation();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: valuesOf(data),
    submit: async ({ role, allowedEnvironmentIds }) => {
      if (!data.userId) {
        // A bare `return` here would land in useSettingsForm's success
        // path — success toast + form reset, dialog stays open. Treat
        // it as an outright failure instead so the user sees what's
        // happening.
        throw new Error(t('settings.team.changeRole.failure'));
      }
      const success = await invoke(
        projectId,
        data.userId,
        role,
        role === TeamMemberRole.EDITOR ? allowedEnvironmentIds : undefined,
      );
      if (!success) {
        throw new Error(t('settings.team.changeRole.failure'));
      }
      onSubmit?.(true);
      onOpenChange(false);
    },
  });
  const role = state.form.watch('role');

  useEffect(() => {
    if (open) {
      state.form.reset(valuesOf(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data.role, data.allowedEnvironmentIds]);

  return (
    <SettingsDialogForm
      title={t('settings.team.changeRole.title')}
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      submitLabel={t('settings.team.changeRole.submit')}
      cancelLabel={t('settings.common.cancel')}
    >
      <div className="space-y-4">
        <MemberRoleFields
          control={state.form.control}
          role={role}
          roleLabel={t('settings.team.changeRole.roleLabel')}
          rolePlaceholder={t('settings.team.changeRole.rolePlaceholder')}
        />
      </div>
    </SettingsDialogForm>
  );
};

MemberChangeRoleDialog.displayName = 'MemberChangeRoleDialog';
