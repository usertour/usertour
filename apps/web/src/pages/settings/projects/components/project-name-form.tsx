'use client';

import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { updateProjectName } from '@usertour/gql';
import { Input } from '@usertour/input';
import { Separator } from '@usertour/separator';
import { Skeleton } from '@usertour/skeleton';
import { SettingsFormSection, useSettingsForm } from '@usertour/ui';
import * as z from 'zod';

const projectNameSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Project name must be at least 2 characters.' })
    .max(30, { message: 'Project name must not be longer than 30 characters.' }),
});

type ProjectNameValues = z.infer<typeof projectNameSchema>;

const ProjectNameFormSkeleton = () => (
  <div className="space-y-6">
    <div className="flex h-10 flex-row items-center justify-between">
      <Skeleton className="h-8 w-48" />
    </div>
    <Separator />
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
);

export const ProjectNameForm = () => {
  const { project, refetch, loading } = useAppContext();
  const [updateMutation] = useMutation(updateProjectName);
  const { t } = useTranslation();

  const state = useSettingsForm<ProjectNameValues>({
    schema: projectNameSchema,
    defaultValues: { name: project?.name ?? '' },
    submit: async ({ name }) => {
      if (!project?.id) {
        return;
      }
      await updateMutation({ variables: { projectId: project.id, name } });
      await refetch();
    },
    successMessage: t('settings.project.successToast'),
  });

  if (loading) {
    return <ProjectNameFormSkeleton />;
  }

  return (
    <SettingsFormSection
      title={t('settings.project.title')}
      state={state}
      submitLabel={t('settings.common.save')}
    >
      <FormField
        control={state.form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('settings.project.nameLabel')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('settings.project.namePlaceholder')}
                {...field}
                disabled={state.isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </SettingsFormSection>
  );
};

ProjectNameForm.displayName = 'ProjectNameForm';
