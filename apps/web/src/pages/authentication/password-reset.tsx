'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';

import { Icons } from '@/components/atoms/icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@usertour-packages/card';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour-packages/utils';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useResetUserPasswordByCodeMutation } from '@usertour-packages/shared-hooks';

const formSchema = z.object({
  password: z
    .string({
      required_error: 'Please input your password.',
    })
    .max(20)
    .min(8),
  repassword: z
    .string({
      required_error: 'Please input your password again.',
    })
    .max(20)
    .min(8),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  password: '',
  repassword: '',
};

export const PasswordReset = () => {
  const { invoke: resetPassword } = useResetUserPasswordByCodeMutation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { code } = useParams();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  async function onSubmit(formData: FormValues) {
    const { password, repassword } = formData;
    if (password !== repassword) {
      return toast({
        variant: 'destructive',
        title: 'The passwords entered twice are inconsistent.',
      });
    }
    if (!code) {
      return toast({
        variant: 'destructive',
        title: 'Reset code is missing.',
      });
    }
    try {
      setIsLoading(true);
      const result = await resetPassword(code, password);
      setIsLoading(false);
      if (result?.success) {
        return navigate('/auth/signin');
      }
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl  font-semibold tracking-tight">
              Reset your password
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              So, you forgot your password? No biggie, it happens to all of us Just pick a new one
              below.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input placeholder="Pick a strong password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="repassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repeat New password</FormLabel>
                    <FormControl>
                      <Input placeholder="Try the same password again" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Change password
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};

PasswordReset.displayName = 'PasswordReset';
