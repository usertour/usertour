'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@usertour-packages/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { SpinnerIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Skeleton } from '@usertour-packages/skeleton';
import { useToast } from '@usertour-packages/use-toast';
import { getErrorMessage } from '@usertour/helpers';
import { useGlobalConfigQuery, useSetupSystemAdminMutation } from '@usertour-packages/shared-hooks';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import * as z from 'zod';

const setupAdminFormSchema = z
  .object({
    name: z.string().min(2, 'Please enter your name.').max(50),
    email: z.string().email('Please enter a valid email.'),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(160),
    confirmPassword: z.string().min(8, 'Please confirm your password.').max(160),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type SetupAdminFormValues = z.infer<typeof setupAdminFormSchema>;

const defaultValues: SetupAdminFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const SetupAdmin = () => {
  const { data: globalConfig, loading: globalConfigLoading } = useGlobalConfigQuery();
  const { invoke, loading } = useSetupSystemAdminMutation();
  const { toast } = useToast();

  const form = useForm<SetupAdminFormValues>({
    resolver: zodResolver(setupAdminFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const onSubmit = async (values: SetupAdminFormValues) => {
    try {
      const data = await invoke({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  if (!globalConfigLoading && globalConfig?.needsSystemAdminSetup === false) {
    return <Navigate to="/auth/signin" replace />;
  }

  if (globalConfigLoading) {
    return (
      <Card>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Set up admin account
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            This will be the first System Admin account for your self-hosted instance.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Set up admin account
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              This will be the first System Admin account for your self-hosted instance.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
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
                    <Input placeholder="Enter your email" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="Create a password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input placeholder="Confirm your password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full" type="submit" disabled={loading}>
              {loading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              Create admin account
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};

SetupAdmin.displayName = 'SetupAdmin';

export { SetupAdmin };
