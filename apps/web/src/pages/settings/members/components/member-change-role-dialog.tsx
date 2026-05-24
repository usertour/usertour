'use client';

import { CaretSortIcon } from '@radix-ui/react-icons';
import { SpinnerIcon } from '@usertour/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@usertour/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { useChangeTeamMemberRoleMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import type { TeamMember } from '@usertour/types';
import { TeamMemberRole } from '@usertour/types';
import { useToast } from '@usertour/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

// Owner is granted via the transfer-ownership flow, not this dialog.
const ROLE_OPTIONS = [
  { value: TeamMemberRole.ADMIN, i18nKey: 'settings.team.roles.admin' },
  { value: TeamMemberRole.VIEWER, i18nKey: 'settings.team.roles.viewer' },
] as const;

interface MemberChangeRoleDialogProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  data: TeamMember;
  projectId: string;
}

const formSchema = z.object({
  role: z.string({
    required_error: 'Please select your Member role.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export const MemberChangeRoleDialog = (props: MemberChangeRoleDialogProps) => {
  const { isOpen, onSuccess, onCancel, data, projectId } = props;
  const { invoke } = useChangeTeamMemberRoleMutation();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: data.role,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [form, isOpen]);

  async function handleOnSubmit({ role }: FormValues) {
    setIsLoading(true);
    try {
      if (!data.userId) {
        showError('Project ID or User ID is missing.');
        return;
      }
      const success = await invoke(projectId, data.userId, role);
      if (!success) {
        showError('Change role failed.');
      }
      onSuccess();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onCancel()}>
      <DialogContent aria-describedby={undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.team.changeRole.title')}</DialogTitle>
            </DialogHeader>
            <div>
              <div className="space-y-4 py-2 pb-4 pt-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => {
                      const selected = ROLE_OPTIONS.find((option) => option.value === field.value);
                      return (
                        <FormItem>
                          <FormLabel>{t('settings.team.changeRole.roleLabel')}</FormLabel>
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
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onCancel}>
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.team.changeRole.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

MemberChangeRoleDialog.displayName = 'MemberChangeRoleDialog';
