'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { useTeamMemberLimit } from '@/hooks/use-plan-limits';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  SettingsDialogForm,
  useSettingsForm,
} from '@usertour/ui';
import { useInviteTeamMemberMutation } from '@usertour/hooks';
import { TeamMemberRole } from '@usertour/types';
import { z } from 'zod';
import { MemberRoleFields, memberRoleFieldsSchema } from './member-role-fields';

interface MemberInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful invite — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const schema = memberRoleFieldsSchema.extend({
  name: z.string().max(20).min(1),
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  name: '',
  email: '',
  role: TeamMemberRole.EDITOR,
  allowedEnvironmentIds: [],
};

export const MemberInviteDialog = (props: MemberInviteDialogProps) => {
  const { open, onOpenChange, onSubmit } = props;
  const { invoke } = useInviteTeamMemberMutation();
  const { project } = useAppContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canUseMore: canInviteMembers } = useTeamMemberLimit();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues,
    submit: async ({ name, email, role, allowedEnvironmentIds }) => {
      const success = await invoke(
        project?.id as string,
        name,
        email,
        role,
        role === TeamMemberRole.EDITOR ? allowedEnvironmentIds : undefined,
      );
      if (!success) {
        throw new Error(t('settings.team.invite.failure'));
      }
      onSubmit?.(true);
      onOpenChange(false);
    },
  });
  useEffect(() => {
    if (open) {
      state.form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!canInviteMembers) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('settings.team.invite.title')}</DialogTitle>
          </DialogHeader>
          <Alert className="bg-primary/10 border-primary/5">
            <AlertCircle className="h-4 w-4 !text-primary" />
            <AlertTitle>{t('settings.team.invite.limitTitle')}</AlertTitle>
            <AlertDescription>
              {t('settings.team.invite.limitDescriptionPrefix')}
              <Button
                variant="link"
                className="p-0 h-auto font-normal inline"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/project/${project?.id}/settings/billing`);
                }}
              >
                {t('settings.team.invite.upgradeInline')}
              </Button>
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate(`/project/${project?.id}/settings/billing`);
              }}
            >
              {t('settings.team.invite.upgradeButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <SettingsDialogForm
      title={t('settings.team.invite.title')}
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      submitLabel={t('settings.team.invite.submit')}
      cancelLabel={t('settings.common.cancel')}
      contentClassName="max-w-xl"
    >
      <div className="space-y-4">
        <FormField
          control={state.form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.team.invite.nameLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('settings.team.invite.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={state.form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.team.invite.emailLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('settings.team.invite.emailPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <MemberRoleFields
          roleLabel={t('settings.team.invite.roleLabel')}
          rolePlaceholder={t('settings.team.invite.rolePlaceholder')}
        />
      </div>
    </SettingsDialogForm>
  );
};

MemberInviteDialog.displayName = 'MemberInviteDialog';
