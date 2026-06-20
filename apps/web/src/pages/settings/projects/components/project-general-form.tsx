'use client';

import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  LoadingButton,
  Separator,
  Skeleton,
  useSettingsForm,
  useToast,
} from '@usertour/ui';
import { useUpdateProjectMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { ImageUploadWidget } from '@/components/upload';
import * as z from 'zod';

const MAX_LOGO_BYTES = 1024 * 1024; // 1MB

const projectNameSchema = z.object({
  name: z.string().min(2).max(30),
});

type ProjectNameValues = z.infer<typeof projectNameSchema>;

const ProjectGeneralFormSkeleton = () => (
  <div className="space-y-6">
    <div className="flex h-10 flex-row items-center justify-between">
      <Skeleton className="h-8 w-48" />
    </div>
    <Separator />
    <div className="space-y-8">
      <Skeleton className="h-32 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
);

export const ProjectGeneralForm = () => {
  const { project, loading } = useAppContext();
  const { invoke: updateProject } = useUpdateProjectMutation();
  const { t } = useTranslation();
  const { toast } = useToast();

  const state = useSettingsForm<ProjectNameValues>({
    schema: projectNameSchema,
    defaultValues: { name: project?.name ?? '' },
    submit: async ({ name }) => {
      if (!project?.id) {
        return;
      }
      // updateProject's response carries { id, name, logoUrl }; Apollo's
      // normalized cache auto-merges into the Project entity, so AppContext
      // re-emits without a manual refetch.
      await updateProject(project.id, { name });
    },
    successMessage: t('settings.project.successToast'),
  });

  // The logo is uploaded + persisted immediately (like an avatar) rather than
  // waiting for the name's Save — `url` is '' when the user removes it.
  const handleLogoChange = async (url: string) => {
    if (!project?.id) {
      return;
    }
    try {
      await updateProject(project.id, { logoUrl: url || null });
      toast({
        variant: 'success',
        title: url
          ? t('settings.project.logo.uploadedToast')
          : t('settings.project.logo.removedToast'),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  if (loading) {
    return <ProjectGeneralFormSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex h-10 flex-row items-center">
          <h3 className="text-xl font-medium tracking-tight">{t('settings.project.title')}</h3>
        </div>
      </div>
      <Separator />
      {/* Logo — immediate upload, kept outside the name form so its buttons
          don't submit it. */}
      <div className="space-y-1.5">
        <h4 className="text-sm font-medium text-foreground">{t('settings.project.logo.title')}</h4>
        <ImageUploadWidget
          layout="inline"
          value={project?.logoUrl}
          onChange={handleLogoChange}
          description={t('settings.project.logo.description')}
          maxSizeBytes={MAX_LOGO_BYTES}
        />
      </div>
      {/* Name — saved explicitly via the Save button. */}
      <Form {...state.form}>
        <form onSubmit={state.onSubmit} className="space-y-8">
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
          <LoadingButton type="submit" loading={state.isSubmitting} disabled={state.isPristine}>
            {t('settings.common.save')}
          </LoadingButton>
        </form>
      </Form>
    </div>
  );
};

ProjectGeneralForm.displayName = 'ProjectGeneralForm';
