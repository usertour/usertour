'use client';

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
import { resetUserPassword } from '@usertour-packages/gql';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { ResetPasswordSuccess } from '@/pages/authentication/components/reset-password-success';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@usertour-packages/card';
import { SpinnerIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour-packages/utils';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const formSchema = z.object({
  email: z
    .string({
      required_error: 'Please input an valid email.',
    })
    .email(),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  email: '',
};

export const ResetPassword = () => {
  const [mutation] = useMutation(resetUserPassword);
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  async function onSubmit(formData: FormValues) {
    try {
      setIsLoading(true);
      const { data } = await mutation({ variables: formData });
      setIsLoading(false);
      if (data.resetUserPassword.success) {
        setSuccess(true);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      setIsLoading(false);
    }
  }

  return (
    <>
      {success && <ResetPasswordSuccess />}
      {!success && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl  font-semibold tracking-tight">
                  Welcome back!
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Enter your email address, and we'll send you an email with a link to reset your
                  password.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
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
                </div>
              </CardContent>
              <CardFooter className="flex flex-col">
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                  Reset password
                </Button>
                <div className="pt-4 text-center text-sm text-muted-foreground">
                  <Link
                    to="/auth/signin"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Back to sign in
                  </Link>{' '}
                </div>
                <div className="pt-4 text-center text-sm text-muted-foreground">
                  No account yet?{' '}
                  <Link
                    to="/auth/signup"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Sign up for a free trial
                  </Link>{' '}
                </div>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </>
  );
};

ResetPassword.displayName = 'ResetPassword';
