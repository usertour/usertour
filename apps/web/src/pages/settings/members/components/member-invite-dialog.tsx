'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CaretSortIcon } from '@radix-ui/react-icons';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

// Owner can't be granted via invite — only Admin / Viewer.
const ROLE_OPTIONS = [
  { value: TeamMemberRole.ADMIN, i18nKey: 'settings.team.roles.admin' },
  { value: TeamMemberRole.VIEWER, i18nKey: 'settings.team.roles.viewer' },
] as const;

interface MemberInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful invite — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const schema = z.object({
  name: z.string().max(20).min(1),
  email: z.string().email(),
  role: z.string(),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  name: '',
  email: '',
  role: TeamMemberRole.ADMIN,
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
    submit: async ({ name, email, role }) => {
      const success = await invoke(project?.id as string, name, email, role);
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
        <FormField
          control={state.form.control}
          name="role"
          render={({ field }) => {
            const selected = ROLE_OPTIONS.find((option) => option.value === field.value);
            return (
              <FormItem>
                <FormLabel>{t('settings.team.invite.roleLabel')}</FormLabel>
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
                        {selected ? t(selected.i18nKey) : t('settings.team.invite.rolePlaceholder')}
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
      </div>
    </SettingsDialogForm>
  );
};

MemberInviteDialog.displayName = 'MemberInviteDialog';
