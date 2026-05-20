import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { Button } from '@usertour/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { Input } from '@usertour/input';
import { SpinnerIcon } from '@usertour/icons';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import { useActiveUserProjectMutation, useCreateOwnedProjectMutation } from '@usertour/hooks';
import { Project } from '@usertour/types';
import { useAppContext } from '@/contexts/app-context';
import { AuthCard } from './authentication/components/auth-card';

// /select-project is the destination for any authenticated user whose
// AppContext.project resolves to null — either zero memberships (admin
// hasn't assigned a project, or the only one was removed) or memberships
// exist but none is `actived` (residual data inconsistency, race on
// transfer, etc.). The page surfaces the ambiguity instead of having the
// server silently bootstrap or pick a project on the user's behalf.
export const SelectProject = () => {
  const { projects, userInfo } = useAppContext();

  if (!userInfo?.id) {
    return null;
  }

  if (projects.length === 0) {
    return <EmptyState />;
  }

  return <ListPicker projects={projects} userId={userInfo.id} />;
};

SelectProject.displayName = 'SelectProject';

// Switching accounts is an explicit action — it must not resume the current
// /select-project URL. signOutAndRedirect tears down the session and hard-loads
// a clean sign-in (no ?next) so the next account lands on its own default
// instead of being stranded on the picker. Done via the shared sign-out helper
// rather than the generic next/redirect logic, which stays untouched.
const SwitchAccountButton = () => {
  const { t } = useTranslation('ui');
  const { signOutAndRedirect } = useAppContext();

  return (
    <button
      type="button"
      onClick={() => signOutAndRedirect()}
      className="pt-4 text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-primary cursor-pointer"
    >
      {t('auth.selectProject.signOut')}
    </button>
  );
};

SwitchAccountButton.displayName = 'SelectProject.SwitchAccountButton';

const EmptyState = () => {
  const { t } = useTranslation('ui');
  const { toast } = useToast();
  const { invoke: createProject } = useCreateOwnedProjectMutation();

  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string({ required_error: t('auth.selectProject.empty.nameRequired') })
          .trim()
          .min(1, { message: t('auth.selectProject.empty.nameRequired') })
          .max(80),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
    mode: 'onChange',
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await createProject(values.name);
      if (result?.id) {
        // Land on root so LandingRedirect picks the newly active env.
        window.location.assign('/');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <AuthCard
          title={t('auth.selectProject.empty.title')}
          description={t('auth.selectProject.empty.description')}
          footer={
            <>
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.selectProject.empty.createButton')}
              </Button>
              <SwitchAccountButton />
            </>
          }
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.selectProject.empty.nameLabel')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('auth.selectProject.empty.namePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </AuthCard>
      </form>
    </Form>
  );
};

EmptyState.displayName = 'SelectProject.EmptyState';

interface ListPickerProps {
  projects: Project[];
  userId: string;
}

const ListPicker = ({ projects, userId }: ListPickerProps) => {
  const { t } = useTranslation('ui');
  const { toast } = useToast();
  const { invoke: activate, loading } = useActiveUserProjectMutation();

  const handlePick = async (projectId: string | undefined) => {
    if (!projectId) {
      return;
    }
    try {
      await activate(userId, projectId);
      window.location.assign('/');
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <AuthCard
      title={t('auth.selectProject.list.title')}
      description={t('auth.selectProject.list.description')}
      footer={<SwitchAccountButton />}
    >
      <div className="grid gap-2">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => handlePick(project.id)}
            disabled={loading}
            className="flex w-full items-center justify-between rounded-md border border-transparent bg-muted/30 px-4 py-3 text-left hover:bg-muted hover:border-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="truncate font-medium">{project.name}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {project.role}
            </span>
          </button>
        ))}
      </div>
    </AuthCard>
  );
};

ListPicker.displayName = 'SelectProject.ListPicker';
