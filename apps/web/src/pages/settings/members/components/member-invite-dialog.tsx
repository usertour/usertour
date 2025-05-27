'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { useMemberContext } from '@/contexts/member-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription, AlertTitle } from '@usertour-ui/alert';
import { Button } from '@usertour-ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour-ui/form';
import { Input } from '@usertour-ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour-ui/select';
import {
  useGetSubscriptionByProjectIdQuery,
  useInviteTeamMemberMutation,
} from '@usertour-ui/shared-hooks';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { PlanType, Subscription, TeamMemberRole } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { AlertCircle } from 'lucide-react';
import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please input your Member name.',
    })
    .max(20)
    .min(1),
  email: z
    .string({
      required_error: 'Please input your Member email.',
    })
    .email(),
  role: z.string({
    required_error: 'Please select your Member role.',
  }),
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
  const { members = [] } = useMemberContext();
  const { globalConfig } = useAppContext();
  const navigate = useNavigate();

  const { subscription } = useGetSubscriptionByProjectIdQuery(project?.id as string) as {
    subscription: Subscription | null;
  };

  const planType: PlanType = subscription?.planType ?? PlanType.HOBBY;

  const canInviteMembers = useMemo(() => {
    if (globalConfig?.isSelfHostedMode) {
      return true;
    }
    return (
      (planType === PlanType.STARTER && members.length < 3) ||
      (planType === PlanType.GROWTH && members.length < 10) ||
      planType === PlanType.BUSINESS
    );
  }, [planType, members.length, globalConfig?.isSelfHostedMode]);

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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <Alert className="bg-primary/10 border-primary/5">
            <AlertCircle className="h-4 w-4 !text-primary" />
            <AlertTitle>Maximum team members reached</AlertTitle>
            <AlertDescription>
              You have reached the maximum number of members allowed on your current plan. To add
              more members, you'll have to{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-normal inline"
                onClick={() => {
                  onClose();
                  navigate(`/project/${project?.id}/settings/billing`);
                }}
              >
                Upgrade your plan
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
              Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <div>
              <div className="space-y-4 py-2 pb-4 pt-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Member name" {...field} />
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Member email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={TeamMemberRole.ADMIN}>Admin</SelectItem>
                              <SelectItem value={TeamMemberRole.VIEWER}>Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

MemberInviteDialog.displayName = 'MemberInviteDialog';
