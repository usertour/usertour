'use client';

import { CaretSortIcon } from '@radix-ui/react-icons';
import { SpinnerIcon } from '@usertour/icons';
import { useAppContext } from '@/contexts/app-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription, AlertTitle } from '@usertour/alert';
import { Button } from '@usertour/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@usertour/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { Input } from '@usertour/input';
import { useInviteTeamMemberMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { TeamMemberRole } from '@usertour/types';
import { useTeamMemberLimit } from '@/hooks/use-plan-limits';
import { useToast } from '@usertour/use-toast';
import { AlertCircle } from 'lucide-react';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

// Owner can't be granted via invite — only Admin / Viewer.
const ROLE_OPTIONS = [
  { value: TeamMemberRole.ADMIN, i18nKey: 'settings.team.roles.admin' },
  { value: TeamMemberRole.VIEWER, i18nKey: 'settings.team.roles.viewer' },
] as const;

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  name: z.string().max(20).min(1),
  email: z.string().email(),
  role: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  name: '',
  email: '',
  role: TeamMemberRole.ADMIN,
};

export const MemberInviteDialog = ({ onClose, isOpen }: InviteDialogProps) => {
  const { invoke } = useInviteTeamMemberMutation();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { project } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canUseMore: canInviteMembers } = useTeamMemberLimit();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [form, isOpen]);

  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const success = await invoke(
        project?.id as string,
        formValues.name,
        formValues.email,
        formValues.role,
      );
      if (!success) {
        showError('Create Member failed.');
      }
      onClose();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  if (!canInviteMembers) {
    return (
      <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
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
                  onClose();
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
                onClose();
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
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-xl" aria-describedby={undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.team.invite.title')}</DialogTitle>
            </DialogHeader>
            <div>
              <div className="space-y-4 py-2 pb-4 pt-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.team.invite.nameLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('settings.team.invite.namePlaceholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.team.invite.emailLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('settings.team.invite.emailPlaceholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => {
                      const selected = ROLE_OPTIONS.find((option) => option.value === field.value);
                      return (
                        <FormItem>
                          <FormLabel>{t('settings.team.invite.roleLabel')}</FormLabel>
                          {/* modal={false}: parent Dialog already traps
                              focus; skipping the dropdown's own trap
                              avoids the aria-hidden conflict on the
                              still-focused trigger button. */}
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
                                    : t('settings.team.invite.rolePlaceholder')}
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
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.team.invite.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

MemberInviteDialog.displayName = 'MemberInviteDialog';
