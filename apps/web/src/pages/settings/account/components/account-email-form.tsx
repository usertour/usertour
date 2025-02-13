'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour-ui/form';
import { updateEmail } from '@usertour-ui/gql';
import { Input } from '@usertour-ui/input';
import { Separator } from '@usertour-ui/separator';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useToast } from '@usertour-ui/use-toast';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const accountFormSchema = z.object({
  email: z
    .string()
    .min(2, {
      message: 'Password must be at least 6 characters.',
    })
    .max(30, {
      message: 'Password must not be longer than 30 characters.',
    }),
  password: z
    .string()
    .min(2, {
      message: 'Password must be at least 6 characters.',
    })
    .max(30, {
      message: 'Password must not be longer than 30 characters.',
    }),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export const AccountEmailForm = () => {
  const { userInfo: user, refetch } = useAppContext();
  const [updateMutation] = useMutation(updateEmail);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { email: user?.email, password: '' },
  });
  const { toast } = useToast();

  const onSubmit = async (data: AccountFormValues) => {
    if (!data.email) {
      return;
    }
    try {
      setIsLoading(true);
      const ret = await updateMutation({
        variables: {
          email: data.email,
          password: data.password,
        },
      });
      setIsLoading(false);
      if (ret.data?.changeEmail?.id) {
        await refetch();
        toast({
          variant: 'success',
          title: 'Modified email successfully',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">Change email</h3>
        {/* <p className="text-sm text-muted-foreground">
          Update your login email.
        </p> */}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} />
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
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={form.watch('email') === user?.email}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </form>
      </Form>
    </div>
  );
};

AccountEmailForm.displayName = 'AccountEmailForm';
