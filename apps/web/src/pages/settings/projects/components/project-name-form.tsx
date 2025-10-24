'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { updateProjectName } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { Separator } from '@usertour-packages/separator';
import { Skeleton } from '@usertour-packages/skeleton';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const projectNameFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: 'Company name must be at least 2 characters.',
    })
    .max(30, {
      message: 'Company name must not be longer than 30 characters.',
    }),
});

type ProjectNameFormValues = z.infer<typeof projectNameFormSchema>;

// Skeleton component that matches the form structure
const ProjectNameFormSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-row justify-between items-center h-10">
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const form = useForm<ProjectNameFormValues>({
    resolver: zodResolver(projectNameFormSchema),
    defaultValues: { name: project?.name },
  });
  const { toast } = useToast();

  const onSubmit = async (data: ProjectNameFormValues) => {
    if (!data.name || !project?.id) {
      return;
    }
    try {
      setIsLoading(true);
      await updateMutation({
        variables: {
          projectId: project.id,
          name: data.name,
        },
      });
      await refetch();
      toast({
        variant: 'success',
        title: 'The company name has been successfully updated',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormDisabled = isLoading || form.watch('name') === project?.name;

  if (loading) {
    return <ProjectNameFormSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-row justify-between items-center h-10">
        <h3 className="text-2xl font-semibold tracking-tight">Company Name</h3>
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your Company name" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isFormDisabled}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </Form>
    </div>
  );
};

ProjectNameForm.displayName = 'ProjectNameForm';
