'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour-ui/form';
import { updateUser } from '@usertour-ui/gql';
import { Input } from '@usertour-ui/input';
import { Separator } from '@usertour-ui/separator';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useToast } from '@usertour-ui/use-toast';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const accountFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: 'Name must be at least 2 characters.',
    })
    .max(30, {
      message: 'Name must not be longer than 30 characters.',
    }),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export const AccountProfileForm = () => {
  const { userInfo: user, refetch } = useAppContext();
  const [updateMutation] = useMutation(updateUser);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { name: user?.name },
  });
  const { toast } = useToast();

  const onSubmit = async (data: AccountFormValues) => {
    if (!data.name) {
      return;
    }
    try {
      setIsLoading(true);
      await updateMutation({
        variables: {
          name: data.name,
          avatarUrl: '',
        },
      });
      await refetch();
      setIsLoading(false);
      toast({
        variant: 'success',
        title: 'The profile name has been successfully updated',
      });
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
      <div className="flex flex-row justify-between items-center h-10">
        <h3 className="text-2xl font-semibold tracking-tight">Profile</h3>
        {/* <p className="text-sm text-muted-foreground">
          Update your profile name.
        </p> */}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={form.watch('name') === user?.name}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </form>
      </Form>
    </div>
  );
};

AccountProfileForm.displayName = 'AccountProfileForm';
